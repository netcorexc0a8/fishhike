import { db, type Catch, type Checklist, type Place, type Recipe, type Track, type TrackPoint } from '../db';
import { trackStats } from './geo';
import { THEME_KEY } from './theme';

// Резервная копия всех пользовательских данных в один JSON-файл.
// Перенос на другой телефон: «Сохранить копию» → отправить файл себе → «Восстановить из файла».
// Кэш прогнозов не сохраняется — он пересчитается при первом открытии.

export const BACKUP_APP = 'fishhike';
/** 2 — журнал улова (вместе с фото), 3 — треки. Копии прежних версий читаются как раньше. */
export const BACKUP_VERSION = 3;

export interface Backup {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  data: {
    checklists: Checklist[];
    recipes: Recipe[];
    places: Place[];
    catches: Catch[];
    tracks: Track[];
    placeId: string | null;
    theme: string | null;
  };
}

export interface ImportResult {
  added: number;
  updated: number;
  skipped: number;
}

export async function createBackup(now = new Date()): Promise<Backup> {
  let theme: string | null = null;
  try {
    theme = localStorage.getItem(THEME_KEY);
  } catch {
    /* нет localStorage */
  }
  const [checklists, recipes, places, catches, tracks, placeSetting] = await Promise.all([
    db.checklists.toArray(),
    db.recipes.toArray(),
    db.places.toArray(),
    db.catches.toArray(),
    db.tracks.toArray(),
    db.settings.get('placeId'),
  ]);
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    data: { checklists, recipes, places, catches, tracks, placeId: placeSetting?.value ?? null, theme },
  };
}

export function backupFileName(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `fishhike-backup-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const strArr = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr);

function validChecklist(c: unknown): c is Checklist {
  return (
    isObj(c) &&
    isStr(c.id) &&
    isStr(c.title) &&
    isNum(c.updatedAt) &&
    Array.isArray(c.items) &&
    c.items.every((i) => isObj(i) && isStr(i.id) && isStr(i.text) && typeof i.done === 'boolean')
  );
}

function validRecipe(r: unknown): r is Recipe {
  return (
    isObj(r) &&
    isStr(r.id) &&
    isStr(r.title) &&
    isNum(r.minutes) &&
    isNum(r.servings) &&
    isNum(r.updatedAt) &&
    strArr(r.ingredients) &&
    strArr(r.steps) &&
    strArr(r.tags)
  );
}

function validPlace(p: unknown): p is Place {
  return isObj(p) && isStr(p.id) && isStr(p.name) && isNum(p.lat) && isNum(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180;
}

const numOrNull = (v: unknown) => (isNum(v) ? v : null);

function validCatch(c: unknown): c is Catch {
  return (
    isObj(c) &&
    isStr(c.id) &&
    isStr(c.species) &&
    c.species.trim() !== '' &&
    isNum(c.caughtAt) &&
    isNum(c.updatedAt) &&
    (c.photo == null || (isStr(c.photo) && c.photo.startsWith('data:image/')))
  );
}

const validPoint = (p: unknown): p is TrackPoint =>
  isObj(p) && isNum(p.lat) && isNum(p.lon) && isNum(p.t) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180;

function validTrack(t: unknown): t is Track {
  return isObj(t) && isStr(t.id) && isNum(t.startedAt) && isNum(t.updatedAt) && Array.isArray(t.segments) && t.segments.every(Array.isArray);
}

function normTrack(t: Track): Track {
  const segments = t.segments
    .map((s) => (s as unknown[]).filter(validPoint).map((p) => ({ lat: p.lat, lon: p.lon, t: p.t, acc: isNum(p.acc) ? p.acc : 0 })))
    .filter((s) => s.length > 0);
  const last = segments.at(-1)?.at(-1);
  return {
    id: t.id,
    name: isStr(t.name) && t.name.trim() ? t.name : 'Трек',
    startedAt: t.startedAt,
    // Незавершённая в копии запись на другом телефоне уже не продолжится.
    endedAt: isNum(t.endedAt) ? t.endedAt : (last?.t ?? t.startedAt),
    segments,
    ...trackStats(segments),
    createdAt: isNum(t.createdAt) ? t.createdAt : t.updatedAt,
    updatedAt: t.updatedAt,
  };
}

/** Разбирает и проверяет файл. Бросает Error с понятным текстом. */
export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('Файл повреждён или это не резервная копия FishHike.');
  }
  if (!isObj(raw) || raw.app !== BACKUP_APP || !isObj(raw.data)) {
    throw new Error('Это не резервная копия FishHike.');
  }
  if (!isNum(raw.version) || raw.version > BACKUP_VERSION) {
    throw new Error('Копия создана более новой версией приложения. Обновите FishHike и попробуйте снова.');
  }
  const d = raw.data;
  const arr = (v: unknown) => (Array.isArray(v) ? v : []);
  return {
    app: BACKUP_APP,
    version: raw.version,
    exportedAt: isStr(raw.exportedAt) ? raw.exportedAt : '',
    data: {
      checklists: arr(d.checklists)
        .filter(validChecklist)
        .map((c) => ({ ...c, createdAt: isNum(c.createdAt) ? c.createdAt : c.updatedAt })),
      recipes: arr(d.recipes)
        .filter(validRecipe)
        .map((r) => ({ ...r, builtin: r.builtin === true, createdAt: isNum(r.createdAt) ? r.createdAt : r.updatedAt })),
      places: arr(d.places)
        .filter(validPlace)
        .map((p) => ({ ...p, region: isStr(p.region) ? p.region : '', createdAt: isNum(p.createdAt) ? p.createdAt : Date.now() })),
      catches: arr(d.catches)
        .filter(validCatch)
        .map((c) => ({
          id: c.id,
          species: c.species,
          weightKg: numOrNull(c.weightKg),
          lengthCm: numOrNull(c.lengthCm),
          caughtAt: c.caughtAt,
          placeName: isStr(c.placeName) ? c.placeName : '',
          lat: numOrNull(c.lat),
          lon: numOrNull(c.lon),
          tags: strArr(c.tags) ? c.tags : [],
          note: isStr(c.note) ? c.note : '',
          photo: isStr(c.photo) ? c.photo : null,
          createdAt: isNum(c.createdAt) ? c.createdAt : c.updatedAt,
          updatedAt: c.updatedAt,
        })),
      tracks: arr(d.tracks).filter(validTrack).map(normTrack),
      placeId: isStr(d.placeId) ? d.placeId : null,
      theme: d.theme === 'light' || d.theme === 'dark' ? d.theme : null,
    },
  };
}

/**
 * Слияние с текущими данными: новые записи добавляются, существующие (по id) заменяются,
 * если в копии они новее. Ничего не удаляется — восстановление безопасно повторять.
 */
export async function restoreBackup(b: Backup): Promise<ImportResult> {
  const res: ImportResult = { added: 0, updated: 0, skipped: 0 };

  await db.transaction('rw', [db.checklists, db.recipes, db.places, db.catches, db.tracks, db.settings], async () => {
    // Стартовые записи (seed-*), которые на этом телефоне не трогали, всегда уступают копии:
    // они созданы при первом запуске и «новее» по времени, хотя правок в них нет.
    const pristine = (cur: { id: string; createdAt: number; updatedAt: number }) =>
      cur.id.startsWith('seed-') && cur.updatedAt === cur.createdAt;
    const mergeByUpdated = async <T extends { id: string; createdAt: number; updatedAt: number }>(
      table: { get(id: string): Promise<T | undefined>; put(v: T): Promise<unknown> },
      rows: T[],
    ) => {
      for (const row of rows) {
        const cur = await table.get(row.id);
        if (!cur) {
          await table.put(row);
          res.added++;
        } else if (row.updatedAt > cur.updatedAt || (pristine(cur) && row.updatedAt !== row.createdAt)) {
          await table.put(row);
          res.updated++;
        } else res.skipped++;
      }
    };
    await mergeByUpdated<Checklist>(db.checklists, b.data.checklists);
    await mergeByUpdated<Recipe>(db.recipes, b.data.recipes);
    await mergeByUpdated<Catch>(db.catches, b.data.catches);
    await mergeByUpdated<Track>(db.tracks, b.data.tracks);

    for (const p of b.data.places) {
      if (await db.places.get(p.id)) res.skipped++;
      else {
        await db.places.put(p);
        res.added++;
      }
    }
    if (b.data.placeId && (await db.places.get(b.data.placeId))) {
      await db.settings.put({ key: 'placeId', value: b.data.placeId });
    }
  });

  if (b.data.theme) {
    try {
      localStorage.setItem(THEME_KEY, b.data.theme);
    } catch {
      /* нет localStorage */
    }
  }
  return res;
}

/**
 * Отдаёт файл пользователю. На телефонах — системное «Поделиться» (AirDrop, Telegram, «Файлы»):
 * в установленном PWA на iOS обычное скачивание работает ненадёжно. Иначе — скачивание.
 * Возвращает 'shared' | 'downloaded' | 'cancelled'.
 */
export async function deliverBackup(b: Backup): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const name = backupFileName(new Date(b.exportedAt || Date.now()));
  const json = JSON.stringify(b, null, 2);
  const file = new File([json], name, { type: 'application/json' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  const touch = (navigator.maxTouchPoints ?? 0) > 0;
  if (touch && nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'Резервная копия FishHike' });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      // NotAllowedError и пр. — падаем на скачивание
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
