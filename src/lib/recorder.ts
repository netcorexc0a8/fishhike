import { useSyncExternalStore } from 'react';
import { db, uid, type TrackPoint } from '../db';
import { defaultTrackName, judgePoint, trackStats } from './geo';

// Запись трека. Один экземпляр на всё приложение: запись не прерывается при переходе между вкладками.
//
// Ограничение браузера: в фоне (свёрнутое приложение, погасший экран) телефон не отдаёт координаты,
// особенно на iOS. Поэтому на время записи просим не гасить экран (Screen Wake Lock), а перерыв
// в сигнале дольше двух минут начинает новый отрезок — на карте не будет прямой через весь перерыв.

export type RecorderStatus = 'idle' | 'recording' | 'paused';

export interface RecorderState {
  status: RecorderStatus;
  trackId: string | null;
  startedAt: number | null;
  segments: TrackPoint[][];
  distanceM: number;
  movingMs: number;
  /** Последняя позиция, даже если в трек она не попала (грубая, на паузе). */
  position: TrackPoint | null;
  error: string | null;
  /** Удалось ли запретить гасить экран. */
  awake: boolean;
}

const IDLE: RecorderState = {
  status: 'idle',
  trackId: null,
  startedAt: null,
  segments: [],
  distanceM: 0,
  movingMs: 0,
  position: null,
  error: null,
  awake: false,
};

let state: RecorderState = IDLE;
const listeners = new Set<() => void>();
let watchId: number | null = null;
let lock: { release(): Promise<void> } | null = null;
let lastSave = 0;
const SAVE_EVERY_MS = 10_000;

function set(patch: Partial<RecorderState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export const getRecorder = () => state;

export function useRecorder(): RecorderState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getRecorder,
    getRecorder,
  );
}

async function save(final = false) {
  if (!state.trackId) return;
  lastSave = Date.now();
  const segments = state.segments.filter((s) => s.length > 0);
  await db.tracks.update(state.trackId, {
    segments,
    distanceM: state.distanceM,
    movingMs: state.movingMs,
    updatedAt: Date.now(),
    ...(final ? { endedAt: segments.at(-1)?.at(-1)?.t ?? Date.now() } : {}),
  });
}

async function keepAwake() {
  const wl = (navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<{ release(): Promise<void> }> } }).wakeLock;
  if (!wl || lock) return;
  try {
    lock = await wl.request('screen');
    set({ awake: true });
    (lock as unknown as EventTarget).addEventListener?.('release', () => {
      lock = null;
      set({ awake: false });
    });
  } catch {
    set({ awake: false });
  }
}

function releaseAwake() {
  lock?.release().catch(() => {});
  lock = null;
  set({ awake: false });
}

// Система снимает блокировку экрана, когда приложение уходит в фон, — возвращаем её при возврате.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.status === 'recording') keepAwake();
  });
}

const GEO_ERRORS: Record<number, string> = {
  1: 'Нет доступа к геопозиции. Разрешите его в настройках браузера, чтобы писать трек.',
  2: 'Телефон не может определить позицию. Выйдите на открытое место.',
  3: 'Позиция определяется слишком долго. Запись продолжается, ждём сигнал.',
};

function onPosition(pos: GeolocationPosition) {
  const p: TrackPoint = {
    lat: pos.coords.latitude,
    lon: pos.coords.longitude,
    t: pos.timestamp || Date.now(),
    acc: Math.round(pos.coords.accuracy),
  };
  if (state.status !== 'recording') {
    set({ position: p, error: null });
    return;
  }
  const segments = state.segments.slice();
  const cur = segments.at(-1) ?? [];
  // Первая точка нового отрезка сравнивается только по точности: за паузу могли уйти далеко.
  const verdict = judgePoint(cur.at(-1), p);
  if (verdict === 'skip') {
    set({ position: p, error: null });
    return;
  }
  if (verdict === 'new-segment' && cur.length > 0) segments.push([p]);
  else segments[Math.max(0, segments.length - 1)] = [...cur, p];
  set({ segments, position: p, error: null, ...trackStats(segments) });
  if (Date.now() - lastSave > SAVE_EVERY_MS) save();
}

function onError(e: GeolocationPositionError) {
  set({ error: GEO_ERRORS[e.code] ?? 'Не удалось определить позицию.' });
}

function watch() {
  if (watchId != null) return;
  watchId = navigator.geolocation.watchPosition(onPosition, onError, {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 30_000,
  });
}

function unwatch() {
  if (watchId != null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
}

export async function startTrack(): Promise<void> {
  if (state.status !== 'idle') return;
  if (!('geolocation' in navigator)) {
    set({ error: 'Этот браузер не умеет определять позицию.' });
    return;
  }
  const now = Date.now();
  const id = uid();
  await db.tracks.add({
    id,
    name: defaultTrackName(now),
    startedAt: now,
    endedAt: null,
    segments: [],
    distanceM: 0,
    movingMs: 0,
    createdAt: now,
    updatedAt: now,
  });
  set({ ...IDLE, status: 'recording', trackId: id, startedAt: now, segments: [[]] });
  lastSave = now;
  watch();
  keepAwake();
}

export async function pauseTrack(): Promise<void> {
  if (state.status !== 'recording') return;
  set({ status: 'paused' });
  releaseAwake();
  await save();
}

export function resumeTrack(): void {
  if (state.status !== 'paused') return;
  const segments = state.segments.at(-1)?.length ? [...state.segments, []] : state.segments;
  set({ status: 'recording', segments });
  watch();
  keepAwake();
}

/** Завершает запись. Возвращает id трека или null, если не записалось ни одной точки (трек удаляется). */
export async function stopTrack(): Promise<string | null> {
  if (state.status === 'idle' || !state.trackId) return null;
  unwatch();
  releaseAwake();
  const id = state.trackId;
  const empty = state.segments.every((s) => s.length === 0);
  if (empty) await db.tracks.delete(id);
  else await save(true);
  set({ ...IDLE });
  return empty ? null : id;
}

/**
 * Трек, запись которого оборвалась (закрыли вкладку, телефон выключился), завершаем по последней точке.
 * Пустые такие треки удаляем.
 */
export async function finalizeOrphans(): Promise<void> {
  if (state.status !== 'idle') return;
  const open = await db.tracks.filter((t) => t.endedAt == null).toArray();
  for (const t of open) {
    const last = t.segments.at(-1)?.at(-1);
    if (!last) await db.tracks.delete(t.id);
    else await db.tracks.update(t.id, { endedAt: last.t, updatedAt: Date.now() });
  }
}
