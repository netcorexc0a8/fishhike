import { describe, expect, it } from 'vitest';
import { periodForHour, solunarEvents } from './astro';
import { moonPhase, moonPhaseMean } from './moon';

const MOSCOW = { lat: 55.75, lon: 37.62 };
const from = new Date(Date.UTC(2026, 9, 10, 0, 0));
const to = new Date(Date.UTC(2026, 9, 13, 0, 0));

describe('солунарные события', () => {
  const events = solunarEvents(MOSCOW.lat, MOSCOW.lon, from, to);
  const of = (k: string) => events.filter((e) => e.kind === k).map((e) => e.at.getTime());

  it('кульминации идут с интервалом лунных суток (~24 ч 50 мин)', () => {
    const t = of('transit');
    expect(t.length).toBeGreaterThanOrEqual(4);
    for (let i = 1; i < t.length; i++) {
      const h = (t[i] - t[i - 1]) / 3_600_000;
      expect(h).toBeGreaterThan(24.2);
      expect(h).toBeLessThan(25.6);
    }
  });

  it('нижняя кульминация примерно посередине между верхними', () => {
    const t = of('transit');
    const a = of('antitransit');
    const mid = a.find((x) => x > t[1] && x < t[2])!;
    const frac = (mid - t[1]) / (t[2] - t[1]);
    expect(frac).toBeGreaterThan(0.45);
    expect(frac).toBeLessThan(0.55);
  });

  it('на средних широтах Луна восходит и заходит почти каждые сутки', () => {
    expect(of('rise').length).toBeGreaterThanOrEqual(4);
    expect(of('set').length).toBeGreaterThanOrEqual(4);
  });

  it('час, в который приходится кульминация, попадает в главный период', () => {
    const t = of('transit')[2];
    const hourStart = Math.floor(t / 3_600_000) * 3_600_000;
    expect(periodForHour(hourStart, events)).toBe('major');
    // За 3 часа до кульминации главного периода уже нет.
    expect(periodForHour(hourStart - 3 * 3_600_000, events)).not.toBe('major');
  });

  it('около новолуния 10.10.2026 верхняя кульминация близка к местному полудню', () => {
    // В новолуние Луна идёт рядом с Солнцем, кульминация ~12:00 местного солнечного времени (UTC+2,5 ч для 37,6° в.д.).
    const t = of('transit').find((x) => x >= Date.UTC(2026, 9, 10) && x < Date.UTC(2026, 9, 11))!;
    const solarHour = (new Date(t).getUTCHours() + new Date(t).getUTCMinutes() / 60 + MOSCOW.lon / 15) % 24;
    expect(Math.abs(solarHour - 12)).toBeLessThan(1.5);
  });
});

describe('фаза Луны', () => {
  it('астрономический расчёт согласуется с оценкой по среднему месяцу (±1,5 суток)', () => {
    for (let d = 0; d < 60; d += 7) {
      const t = new Date(Date.UTC(2026, 0, 1 + d));
      let diff = Math.abs(moonPhase(t) - moonPhaseMean(t));
      diff = Math.min(diff, 1 - diff);
      expect(diff * 29.53).toBeLessThan(1.5);
    }
  });
});
