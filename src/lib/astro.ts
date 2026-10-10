import { Body, Observer, SearchHourAngle, SearchRiseSet } from 'astronomy-engine';

// Точные моменты для солунарной теории по координатам места (astronomy-engine, офлайн):
// - верхняя и нижняя кульминации Луны — центры главных периодов;
// - восход и заход Луны — центры второстепенных периодов.
// Все моменты — абсолютные (UTC) Date.

export type SolunarKind = 'transit' | 'antitransit' | 'rise' | 'set';

export interface SolunarEvent {
  kind: SolunarKind;
  at: Date;
}

const DAY_MS = 86_400_000;

export function solunarEvents(lat: number, lon: number, from: Date, to: Date): SolunarEvent[] {
  const obs = new Observer(lat, lon, 0);
  const start = new Date(from.getTime() - DAY_MS);
  const end = new Date(to.getTime() + DAY_MS);
  const out: SolunarEvent[] = [];

  // Кульминации: часовой угол 0 (верхняя) и 12 (нижняя). Лунные сутки ≈ 24 ч 50 мин.
  for (const [ha, kind] of [
    [0, 'transit'],
    [12, 'antitransit'],
  ] as const) {
    let t = start;
    for (let guard = 0; guard < 40 && t < end; guard++) {
      const ev = SearchHourAngle(Body.Moon, obs, ha, t);
      if (ev.time.date > end) break;
      out.push({ kind, at: ev.time.date });
      t = ev.time.AddDays(0.5).date;
    }
  }

  // Восход (+1) и заход (−1). В высоких широтах Луна может не всходить — тогда null.
  for (const [dir, kind] of [
    [1, 'rise'],
    [-1, 'set'],
  ] as const) {
    let t = start;
    for (let guard = 0; guard < 40 && t < end; guard++) {
      const ev = SearchRiseSet(Body.Moon, obs, dir, t, 2);
      if (!ev || ev.date > end) break;
      out.push({ kind, at: ev.date });
      t = ev.AddDays(0.5).date;
    }
  }

  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** Главные периоды — ±1 ч от кульминаций, второстепенные — ±30 мин от восхода/захода. */
export const PERIOD_HALF_MS: Record<SolunarKind, number> = {
  transit: 3_600_000,
  antitransit: 3_600_000,
  rise: 1_800_000,
  set: 1_800_000,
};

/** Солунарный период, на который приходится середина часового интервала [startUtc, startUtc+1ч). */
export function periodForHour(startUtcMs: number, events: SolunarEvent[]): 'major' | 'minor' | null {
  const mid = startUtcMs + 1_800_000;
  let minor = false;
  for (const e of events) {
    if (Math.abs(mid - e.at.getTime()) <= PERIOD_HALF_MS[e.kind]) {
      if (e.kind === 'transit' || e.kind === 'antitransit') return 'major';
      minor = true;
    }
  }
  return minor ? 'minor' : null;
}
