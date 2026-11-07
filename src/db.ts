import Dexie, { type EntityTable } from 'dexie';
import { SEED_CHECKLISTS, SEED_RECIPES } from './seed';

// Локальное офлайн-хранилище. Все записи имеют updatedAt — пригодится для синхронизации с Firestore.

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
  createdAt: number;
  updatedAt: number;
}

export interface Recipe {
  id: string;
  title: string;
  minutes: number;
  servings: number;
  ingredients: string[];
  steps: string[];
  tags: string[];
  builtin: boolean;
  createdAt: number;
  updatedAt: number;
}

/** Запись в журнале улова. Фото хранится как data URL (WebP/JPEG), чтобы попадать в резервную копию как есть. */
export interface Catch {
  id: string;
  species: string;
  weightKg: number | null;
  lengthCm: number | null;
  caughtAt: number;
  placeName: string;
  lat: number | null;
  lon: number | null;
  /** Снасти и приманки: «спиннинг», «джиг». */
  tags: string[];
  note: string;
  photo: string | null;
  createdAt: number;
  updatedAt: number;
}

/** Точка трека: координаты, время (мс) и точность GPS в метрах. */
export interface TrackPoint {
  lat: number;
  lon: number;
  t: number;
  acc: number;
}

/**
 * Записанный маршрут. segments — отрезки движения: пауза или долгий перерыв в сигнале
 * начинают новый отрезок, чтобы на карте не было прямой через весь перерыв.
 */
export interface Track {
  id: string;
  name: string;
  startedAt: number;
  /** null — запись ещё идёт. */
  endedAt: number | null;
  segments: TrackPoint[][];
  distanceM: number;
  /** Время в движении без пауз, мс. */
  movingMs: number;
  createdAt: number;
  updatedAt: number;
}

export interface Place {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  createdAt: number;
}

export interface Setting {
  key: string;
  value: string;
}

export interface ForecastCache {
  placeId: string;
  fetchedAt: number;
  json: string;
}

export const db = new Dexie('fishhike') as Dexie & {
  checklists: EntityTable<Checklist, 'id'>;
  recipes: EntityTable<Recipe, 'id'>;
  places: EntityTable<Place, 'id'>;
  settings: EntityTable<Setting, 'key'>;
  forecasts: EntityTable<ForecastCache, 'placeId'>;
  catches: EntityTable<Catch, 'id'>;
  tracks: EntityTable<Track, 'id'>;
};

db.version(1).stores({
  checklists: 'id, updatedAt',
  recipes: 'id, title, updatedAt',
  places: 'id, createdAt',
  settings: 'key',
  forecasts: 'placeId',
});

// v2: журнал улова.
db.version(2).stores({
  catches: 'id, caughtAt, species, updatedAt',
});

// v3: записанные треки.
db.version(3).stores({
  tracks: 'id, startedAt, updatedAt',
});

db.on('populate', async (tx) => {
  const now = Date.now();
  await tx.table('checklists').bulkAdd(SEED_CHECKLISTS.map((c, i) => ({ ...c, createdAt: now - i, updatedAt: now - i })));
  await tx.table('recipes').bulkAdd(SEED_RECIPES.map((r) => ({ ...r, builtin: true, createdAt: now, updatedAt: now })));
});

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export async function getSetting(key: string): Promise<string | undefined> {
  return (await db.settings.get(key))?.value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.settings.put({ key, value });
}
