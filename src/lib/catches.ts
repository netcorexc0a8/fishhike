import type { Catch } from '../db';
import pike from '../assets/fish/pike.webp';
import zander from '../assets/fish/zander.webp';
import perch from '../assets/fish/perch.webp';
import bream from '../assets/fish/bream.webp';
import { plural } from './format';

// Журнал улова: виды рыб, разбор чисел, группировка по месяцам, сводка.

/** Частые виды — подсказки в поле «Вид». Можно вписать и любой другой. */
export const SPECIES = [
  'Щука',
  'Судак',
  'Окунь',
  'Лещ',
  'Плотва',
  'Карась',
  'Карп',
  'Сазан',
  'Сом',
  'Жерех',
  'Голавль',
  'Язь',
  'Налим',
  'Форель',
  'Хариус',
  'Ёрш',
  'Краснопёрка',
  'Линь',
];

export interface SpeciesPhoto {
  src: string;
  author: string;
  license: string;
  source: string;
}

// Снимки видов с Wikimedia Commons — показываются, если у записи нет своего фото.
const SPECIES_PHOTOS: Record<string, SpeciesPhoto> = {
  щука: {
    src: pike,
    author: 'SpinfisherCRO',
    license: 'CC BY-SA 4.0',
    source: 'https://commons.wikimedia.org/wiki/File:Northern_pike_caught_on_a_lure_in_lake_Finzula,_Croatia.jpg',
  },
  судак: {
    src: zander,
    author: 'eLNuko',
    license: 'общественное достояние',
    source: 'https://commons.wikimedia.org/wiki/File:Sander_lucioperca_1.jpg',
  },
  окунь: {
    src: perch,
    author: 'Nervurax Fishing',
    license: 'CC0',
    source: 'https://commons.wikimedia.org/wiki/File:Perca_fluviatilis_yerres_river_22-10-17.jpg',
  },
  лещ: {
    src: bream,
    author: 'Grand-Duc',
    license: 'CC BY-SA 3.0 DE',
    source: 'https://commons.wikimedia.org/wiki/File:Abramis_brama_-_2010-09-24_HBP.jpg',
  },
};

export const speciesPhoto = (species: string): SpeciesPhoto | undefined =>
  SPECIES_PHOTOS[species.trim().toLowerCase().replace('ё', 'е')];

/** «Щука» из «  щука », с заглавной буквы. */
export function normalizeSpecies(s: string): string {
  const t = s.trim().replace(/\s+/g, ' ');
  return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : '';
}

/**
 * Число из поля ввода: принимает запятую и точку, пробелы. Пустое — null.
 * Отрицательные, нули и мусор — NaN (ошибка формы).
 */
export function parseAmount(s: string): number | null {
  const t = s.replace(/\s/g, '').replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : NaN;
}

/** 4.2 → «4,2»; 5 → «5»; 0.35 → «0,35». */
export function fmtAmount(n: number): string {
  const r = Math.round(n * 100) / 100;
  return String(r).replace('.', ',');
}

const monthFmt = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' });
const dayFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
const timeFmt = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });

/** «4 нояб.» */
export const fmtCatchDay = (ts: number) => dayFmt.format(new Date(ts));
export const fmtCatchTime = (ts: number) => timeFmt.format(new Date(ts));

/** «Ноябрь 2026» (без «г.»). */
export function fmtMonth(ts: number): string {
  const s = monthFmt.format(new Date(ts)).replace(/\s*г\.?$/, '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export interface CatchSummary {
  count: number;
  totalKg: number;
  /** Самая тяжёлая рыба; null, если ни у одной записи нет веса. */
  record: Catch | null;
}

export function summarize(list: Catch[]): CatchSummary {
  let totalKg = 0;
  let record: Catch | null = null;
  for (const c of list) {
    if (c.weightKg == null) continue;
    totalKg += c.weightKg;
    if (!record || c.weightKg > (record.weightKg ?? 0)) record = c;
  }
  return { count: list.length, totalKg, record };
}

export interface CatchMonth {
  key: string;
  label: string;
  items: Catch[];
  summary: CatchSummary;
}

/** Группы по месяцам, новые сверху; внутри месяца — по времени поимки, новые сверху. */
export function groupByMonth(list: Catch[]): CatchMonth[] {
  const sorted = [...list].sort((a, b) => b.caughtAt - a.caughtAt);
  const groups: CatchMonth[] = [];
  for (const c of sorted) {
    const d = new Date(c.caughtAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) {
      g = { key, label: fmtMonth(c.caughtAt), items: [], summary: { count: 0, totalKg: 0, record: null } };
      groups.push(g);
    }
    g.items.push(c);
  }
  for (const g of groups) g.summary = summarize(g.items);
  return groups;
}

/** «3 рыбы · 6,1 кг» */
export function fmtSummaryLine(s: CatchSummary): string {
  const fish = `${s.count} ${plural(s.count, 'рыба', 'рыбы', 'рыб')}`;
  return s.totalKg > 0 ? `${fish} · ${fmtAmount(s.totalKg)} кг` : fish;
}

/** Виды, которые встречаются в журнале, по частоте. */
export function speciesInUse(list: Catch[]): string[] {
  const n = new Map<string, number>();
  for (const c of list) n.set(c.species, (n.get(c.species) ?? 0) + 1);
  return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru')).map(([s]) => s);
}

/** Значение для <input type="datetime-local"> в местном времени. */
export function toLocalInput(ts: number): string {
  const d = new Date(ts);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function fromLocalInput(s: string): number | null {
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? t : null;
}
