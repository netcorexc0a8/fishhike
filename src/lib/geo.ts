import type { TrackPoint } from '../db';
import { plural } from './format';

// Геометрия треков: расстояния, фильтр шумных GPS-точек, форматирование.

const R = 6_371_000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Расстояние по дуге большого круга, метры. */
export function distance(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Точки грубее этого не пишем: в лесу и у воды GPS иногда «прыгает» на сотни метров. */
export const MAX_ACCURACY_M = 50;
/** Ближе этого к предыдущей точке — стоим на месте, точку не пишем. */
export const MIN_STEP_M = 5;
/** Перерыв в сигнале дольше этого начинает новый отрезок (телефон в кармане, приложение свёрнуто). */
export const GAP_MS = 2 * 60_000;
/** Скорость выше этой между соседними точками — выброс GPS (пешком и на лодке так не бывает). */
export const MAX_SPEED_MS = 25;

export type PointVerdict = 'accept' | 'skip' | 'new-segment';

/** Что делать с новой точкой относительно последней записанной. */
export function judgePoint(prev: TrackPoint | undefined, p: TrackPoint): PointVerdict {
  if (!(p.acc <= MAX_ACCURACY_M)) return 'skip';
  if (!prev) return 'accept';
  const dt = p.t - prev.t;
  if (dt <= 0) return 'skip';
  if (dt > GAP_MS) return 'new-segment';
  const d = distance(prev, p);
  if (d < MIN_STEP_M) return 'skip';
  if (d / (dt / 1000) > MAX_SPEED_MS) return 'skip';
  return 'accept';
}

export function segmentDistance(seg: TrackPoint[]): number {
  let d = 0;
  for (let i = 1; i < seg.length; i++) d += distance(seg[i - 1], seg[i]);
  return d;
}

export function trackStats(segments: TrackPoint[][]): { distanceM: number; movingMs: number } {
  let distanceM = 0;
  let movingMs = 0;
  for (const s of segments) {
    distanceM += segmentDistance(s);
    if (s.length > 1) movingMs += s[s.length - 1].t - s[0].t;
  }
  return { distanceM, movingMs };
}

export const pointCount = (segments: TrackPoint[][]) => segments.reduce((n, s) => n + s.length, 0);

/** 850 → «850 м»; 3420 → «3,4 км». */
export function fmtDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} м`;
  return `${(Math.round(m / 100) / 10).toString().replace('.', ',')} км`;
}

/** 5 100 000 → «1 ч 25 мин»; 720 000 → «12 мин». */
export function fmtDuration(ms: number): string {
  const min = Math.floor(ms / 60_000);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h} ч ${m} мин` : `${m} мин`;
}

/** «1,8 км · 42 мин» */
export const fmtTrackLine = (t: { distanceM: number; movingMs: number }) => `${fmtDistance(t.distanceM)} · ${fmtDuration(t.movingMs)}`;

const nameFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** «Трек 7 нояб., 06:40» */
export const defaultTrackName = (ts: number) => `Трек ${nameFmt.format(new Date(ts))}`;

/** «3 трека» */
export const fmtTrackCount = (n: number) => `${n} ${plural(n, 'трек', 'трека', 'треков')}`;
