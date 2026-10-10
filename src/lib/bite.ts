import { moonInfo, moonPhase, moonTransitHour } from './moon';
import { periodForHour, type SolunarEvent } from './astro';

// Эвристика индекса клёва 0..10 по часам.
// Учитывает солунарные периоды (кульминации и восход/заход Луны),
// утреннюю и вечернюю зорьку, тренд и уровень давления, ветер, осадки и фазу Луны.
// Это не научная модель — ориентир, который легко подкрутить.

export interface HourInput {
  time: Date;
  pressure: number; // гПа
  pressure3hAgo: number | null;
  wind: number; // м/с
  precipitation: number; // мм/ч
  /** Абсолютное время начала часа (UTC, мс) — для точных солунарных периодов. */
  utcMs?: number;
}

export interface DaySun {
  sunrise: Date;
  sunset: Date;
}

export interface HourScore {
  time: Date;
  score: number;
  period: 'major' | 'minor' | null;
}

const hoursOf = (d: Date) => d.getHours() + d.getMinutes() / 60;

function circDist(a: number, b: number): number {
  const d = Math.abs(a - b) % 24;
  return d > 12 ? 24 - d : d;
}

/** Запасной расчёт без координат: кульминация оценивается по фазе (точность ±1 ч и хуже). */
export function solunarPeriodApprox(time: Date): 'major' | 'minor' | null {
  const { phase } = moonInfo(time);
  const transit = moonTransitHour(phase);
  const h = hoursOf(time);
  // Главные периоды: кульминация и нижняя кульминация, ±1 ч.
  if (circDist(h, transit) <= 1 || circDist(h, transit + 12) <= 1) return 'major';
  // Второстепенные: восход и заход Луны (≈ кульминация ± 6,2 ч), ±0,5 ч.
  if (circDist(h, transit + 6.2) <= 0.5 || circDist(h, transit - 6.2) <= 0.5) return 'minor';
  return null;
}

export function scoreHour(input: HourInput, sun: DaySun | null, events?: SolunarEvent[]): HourScore {
  let s = 5;
  const period =
    events && input.utcMs !== undefined ? periodForHour(input.utcMs, events) : solunarPeriodApprox(input.time);
  if (period === 'major') s += 2.5;
  if (period === 'minor') s += 1.2;

  if (sun) {
    const h = hoursOf(input.time);
    if (Math.abs(h - hoursOf(sun.sunrise)) <= 1.5 || Math.abs(h - hoursOf(sun.sunset)) <= 1.5) s += 1.5;
    if (h < hoursOf(sun.sunrise) - 2 || h > hoursOf(sun.sunset) + 2) s -= 1; // глубокая ночь
  }

  if (input.pressure3hAgo !== null) {
    const trend = input.pressure - input.pressure3hAgo;
    if (trend < -1.5) s -= 1.5;
    else if (trend > 2) s -= 0.5;
    else if (Math.abs(trend) < 1) s += 0.5;
  }
  if (input.pressure < 1000) s -= 1;
  if (input.pressure > 1028) s -= 0.5;

  const w = input.wind;
  if (w >= 1 && w <= 5) s += 0.5;
  else if (w > 12) s -= 3;
  else if (w > 8) s -= 1.5;

  const p = input.precipitation;
  if (p > 0.1 && p <= 1) s += 0.3;
  else if (p > 2) s -= 1;

  const phase = moonPhase(input.time);
  const nearSyzygy = Math.min(phase, Math.abs(phase - 0.5), 1 - phase) < 0.07;
  if (nearSyzygy) s += 0.5;

  return { time: input.time, score: Math.round(Math.max(0, Math.min(10, s)) * 10) / 10, period };
}

export interface BiteWindow {
  start: Date;
  end: Date;
  peak: number;
}

/** Лучшие непрерывные окна, где индекс ≥ порога. */
export function bestWindows(hours: HourScore[], threshold = 7): BiteWindow[] {
  const out: BiteWindow[] = [];
  let cur: BiteWindow | null = null;
  for (const h of hours) {
    if (h.score >= threshold) {
      const end = new Date(h.time.getTime() + 3_600_000);
      if (cur) {
        cur.end = end;
        cur.peak = Math.max(cur.peak, h.score);
      } else cur = { start: h.time, end, peak: h.score };
    } else if (cur) {
      out.push(cur);
      cur = null;
    }
  }
  if (cur) out.push(cur);
  return out.sort((a, b) => b.peak - a.peak);
}

export function verdict(score: number): string {
  if (score >= 8) return 'Отличный клёв';
  if (score >= 6.5) return 'Хороший клёв';
  if (score >= 5) return 'Средний клёв';
  if (score >= 3.5) return 'Слабый клёв';
  return 'Клёва почти нет';
}
