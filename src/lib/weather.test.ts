import { describe, expect, it } from 'vitest';
import { bestWindows, scoreHour } from './bite';
import { buildForecast, deserializeForecast, serializeForecast, windDirName } from './weather';
import { findStopWords } from './moderation';

function fakeResponse() {
  const time: string[] = [];
  for (let d = 10; d <= 11; d++) for (let h = 0; h < 24; h++) time.push(`2026-10-${d}T${String(h).padStart(2, '0')}:00`);
  const n = time.length;
  return {
    hourly: {
      time,
      temperature_2m: Array(n).fill(9),
      pressure_msl: Array(n).fill(1018),
      wind_speed_10m: Array(n).fill(3),
      wind_direction_10m: Array(n).fill(315),
      precipitation: Array(n).fill(0),
      cloud_cover: Array(n).fill(40),
    },
    daily: {
      time: ['2026-10-10', '2026-10-11'],
      sunrise: ['2026-10-10T07:05', '2026-10-11T07:07'],
      sunset: ['2026-10-10T18:10', '2026-10-11T18:07'],
    },
  };
}

describe('прогноз', () => {
  it('разбивает часы по дням и считает индексы 0..10', () => {
    const f = buildForecast(fakeResponse(), 0);
    expect(f.days).toHaveLength(2);
    expect(f.days[0].hours).toHaveLength(24);
    for (const s of f.days[0].scores) {
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(10);
    }
    expect(f.days[0].dayScore).toBeGreaterThan(0);
  });

  it('дни дальше недели помечаются как ориентировочные', () => {
    const raw = fakeResponse();
    const extra = 9;
    for (let d = 0; d < extra; d++) {
      const day = `2026-10-${12 + d}`;
      raw.daily.time.push(day);
      raw.daily.sunrise.push(`${day}T07:10`);
      raw.daily.sunset.push(`${day}T18:00`);
    }
    const f = buildForecast(raw, 0);
    expect(f.days.map((d) => d.approx)).toEqual([...Array(7).fill(false), ...Array(4).fill(true)]);
  });

  it('с координатами считает восход, заход и кульминацию Луны по местному времени', () => {
    const raw = { ...fakeResponse(), latitude: 55.75, longitude: 37.62, utc_offset_seconds: 3 * 3600 };
    const f = buildForecast(raw, 0);
    const m = f.days[0].moon!;
    expect(m.transit).toBeInstanceOf(Date);
    // Новолуние: кульминация около местного полудня (МСК = UTC+3, солнечный полдень ~12:30).
    const h = m.transit!.getHours() + m.transit!.getMinutes() / 60;
    expect(h).toBeGreaterThan(11);
    expect(h).toBeLessThan(15);
    expect(f.days[0].scores.some((s) => s.period === 'major')).toBe(true);
  });

  it('штормовой ветер и падение давления снижают индекс', () => {
    const t = new Date('2026-10-10T12:00');
    const calm = scoreHour({ time: t, pressure: 1018, pressure3hAgo: 1018, wind: 3, precipitation: 0 }, null);
    const storm = scoreHour({ time: t, pressure: 1002, pressure3hAgo: 1006, wind: 14, precipitation: 4 }, null);
    expect(storm.score).toBeLessThan(calm.score - 3);
  });

  it('окна клёва склеиваются из соседних часов', () => {
    const base = new Date('2026-10-10T00:00').getTime();
    const hours = [3, 8, 8, 4, 9, 3].map((score, i) => ({ time: new Date(base + i * 3_600_000), score, period: null }));
    const w = bestWindows(hours);
    expect(w).toHaveLength(2);
    expect(w[0].peak).toBe(9);
    expect(w[1].end.getTime() - w[1].start.getTime()).toBe(2 * 3_600_000);
  });

  it('кэш переживает сериализацию с датами', () => {
    const f = buildForecast(fakeResponse(), 123);
    const back = deserializeForecast(serializeForecast(f));
    expect(back.days[0].date).toBeInstanceOf(Date);
    expect(back.days[1].scores[5].time.getTime()).toBe(f.days[1].scores[5].time.getTime());
    expect(back.fetchedAt).toBe(123);
  });

  it('румбы ветра', () => {
    expect(windDirName(0)).toBe('С');
    expect(windDirName(315)).toBe('СЗ');
    expect(windDirName(-90)).toBe('З');
  });
});

describe('модерация', () => {
  it('ловит стоп-слова и пропускает обычный текст', () => {
    expect(findStopWords('Уха из окуня на костре')).toEqual([]);
    expect(findStopWords('какой-то мудак съел уху')).toHaveLength(1);
  });
});
