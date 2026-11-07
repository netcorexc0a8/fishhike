import { describe, expect, it } from 'vitest';
import type { Catch } from '../db';
import {
  fmtAmount,
  fmtMonth,
  fmtSummaryLine,
  fromLocalInput,
  groupByMonth,
  normalizeSpecies,
  parseAmount,
  speciesInUse,
  speciesPhoto,
  summarize,
  toLocalInput,
} from './catches';

const c = (id: string, species: string, at: Date, weightKg: number | null = null): Catch => ({
  id, species, weightKg, lengthCm: null, caughtAt: at.getTime(), placeName: '', lat: null, lon: null,
  tags: [], note: '', photo: null, createdAt: 0, updatedAt: 0,
});

describe('журнал улова', () => {
  it('разбирает вес и длину с запятой', () => {
    expect(parseAmount('4,2')).toBe(4.2);
    expect(parseAmount(' 1 250 ')).toBe(1250);
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('0')).toBeNaN();
    expect(parseAmount('-1')).toBeNaN();
    expect(parseAmount('много')).toBeNaN();
  });

  it('пишет числа по-русски', () => {
    expect(fmtAmount(4.2)).toBe('4,2');
    expect(fmtAmount(5)).toBe('5');
    expect(fmtAmount(0.355)).toBe('0,36');
  });

  it('приводит вид к одному написанию', () => {
    expect(normalizeSpecies('  щУКА ')).toBe('Щука');
    expect(normalizeSpecies('  ')).toBe('');
  });

  it('находит фото вида без учёта регистра и «ё»', () => {
    expect(speciesPhoto('щука')).toBeTruthy();
    expect(speciesPhoto('Лещ')).toBeTruthy();
    expect(speciesPhoto('Ёрш')).toBeUndefined();
  });

  it('группирует по месяцам, новые сверху, и считает сводку', () => {
    const list = [
      c('a', 'Щука', new Date(2026, 10, 4, 7, 40), 4.2),
      c('b', 'Судак', new Date(2026, 9, 19, 18, 15), 3.8),
      c('c', 'Окунь', new Date(2026, 10, 2, 16, 30), 0.4),
      c('d', 'Окунь', new Date(2026, 10, 2, 17, 0)),
    ];
    const g = groupByMonth(list);
    expect(g.map((x) => x.key)).toEqual(['2026-11', '2026-10']);
    expect(g[0].items.map((x) => x.id)).toEqual(['a', 'd', 'c']);
    expect(g[0].label).toBe('Ноябрь 2026');
    expect(fmtSummaryLine(g[0].summary)).toBe('3 рыбы · 4,6 кг');
    expect(fmtSummaryLine(summarize([list[3]]))).toBe('1 рыба');
    expect(summarize(list).record?.id).toBe('a');
    expect(speciesInUse(list)).toEqual(['Окунь', 'Судак', 'Щука']);
  });

  it('название месяца без «г.»', () => {
    expect(fmtMonth(new Date(2026, 0, 15).getTime())).toBe('Январь 2026');
  });

  it('дата для поля ввода туда и обратно', () => {
    const t = new Date(2026, 10, 4, 7, 40).getTime();
    expect(toLocalInput(t)).toBe('2026-11-04T07:40');
    expect(fromLocalInput(toLocalInput(t))).toBe(t);
    expect(fromLocalInput('')).toBeNull();
  });
});
