// Фаза Луны по средней длине синодического месяца.
// Точность ±0,5 суток — достаточно для бытового прогноза клёва.

export const SYNODIC_MONTH = 29.530588853; // суток
const REF_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14); // известное новолуние
const DAY_MS = 86_400_000;

export interface MoonInfo {
  /** Доля цикла: 0 — новолуние, 0.5 — полнолуние. */
  phase: number;
  /** Освещённая доля диска, 0..1. */
  illumination: number;
  /** Возраст Луны в сутках. */
  age: number;
  waxing: boolean;
  name: string;
}

export function moonPhase(date: Date): number {
  const days = (date.getTime() - REF_NEW_MOON) / DAY_MS;
  const p = (days / SYNODIC_MONTH) % 1;
  return p < 0 ? p + 1 : p;
}

export function moonInfo(date: Date): MoonInfo {
  const phase = moonPhase(date);
  const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  return {
    phase,
    illumination,
    age: phase * SYNODIC_MONTH,
    waxing: phase < 0.5,
    name: phaseName(phase),
  };
}

export function phaseName(phase: number): string {
  // Границы — половина суток вокруг ключевых точек в долях цикла.
  const e = 1.2 / SYNODIC_MONTH;
  if (phase < e || phase > 1 - e) return 'Новолуние';
  if (Math.abs(phase - 0.25) < e) return 'Первая четверть';
  if (Math.abs(phase - 0.5) < e) return 'Полнолуние';
  if (Math.abs(phase - 0.75) < e) return 'Последняя четверть';
  if (phase < 0.25) return 'Растущий серп';
  if (phase < 0.5) return 'Растущая луна';
  if (phase < 0.75) return 'Убывающая луна';
  return 'Убывающий серп';
}

/**
 * Приблизительное время верхней кульминации Луны (часы, местное солнечное время).
 * Луна кульминирует около полудня в новолуние и сдвигается на ~50 мин в сутки.
 */
export function moonTransitHour(phase: number): number {
  return (12 + phase * 24.84) % 24;
}
