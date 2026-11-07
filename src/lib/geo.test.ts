import { describe, expect, it } from 'vitest';
import { distance, fmtDistance, fmtDuration, GAP_MS, judgePoint, trackStats } from './geo';

const pt = (lat: number, lon: number, t: number, acc = 10) => ({ lat, lon, t, acc });

describe('distance', () => {
  it('один градус широты ≈ 111 км', () => {
    expect(distance({ lat: 55, lon: 37 }, { lat: 56, lon: 37 })).toBeCloseTo(111_195, -2);
  });
  it('ноль для одной точки', () => {
    expect(distance({ lat: 55, lon: 37 }, { lat: 55, lon: 37 })).toBe(0);
  });
});

describe('judgePoint', () => {
  const a = pt(55.75, 37.6, 0);
  it('первая точная точка принимается, грубая — нет', () => {
    expect(judgePoint(undefined, a)).toBe('accept');
    expect(judgePoint(undefined, pt(55.75, 37.6, 0, 120))).toBe('skip');
  });
  it('стоим на месте — пропуск', () => {
    expect(judgePoint(a, pt(55.75001, 37.6, 5000))).toBe('skip');
  });
  it('шаг 20 м за 10 с — принимается', () => {
    expect(judgePoint(a, pt(55.75018, 37.6, 10_000))).toBe('accept');
  });
  it('скачок на километр за секунду — выброс', () => {
    expect(judgePoint(a, pt(55.76, 37.6, 1000))).toBe('skip');
  });
  it('долгий перерыв — новый отрезок', () => {
    expect(judgePoint(a, pt(55.76, 37.6, GAP_MS + 1000))).toBe('new-segment');
  });
});

describe('trackStats', () => {
  it('считает расстояние и время по отрезкам, без пауз', () => {
    const s1 = [pt(55, 37, 0), pt(55.001, 37, 60_000)];
    const s2 = [pt(55.01, 37, 600_000), pt(55.011, 37, 660_000)];
    const { distanceM, movingMs } = trackStats([s1, s2]);
    expect(distanceM).toBeCloseTo(222, 0);
    expect(movingMs).toBe(120_000);
  });
});

describe('форматирование', () => {
  it('расстояние', () => {
    expect(fmtDistance(850.4)).toBe('850 м');
    expect(fmtDistance(3420)).toBe('3,4 км');
    expect(fmtDistance(12_000)).toBe('12 км');
  });
  it('длительность', () => {
    expect(fmtDuration(720_000)).toBe('12 мин');
    expect(fmtDuration(5_100_000)).toBe('1 ч 25 мин');
  });
});
