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
};

db.version(1).stores({
  checklists: 'id, updatedAt',
  recipes: 'id, title, updatedAt',
  places: 'id, createdAt',
  settings: 'key',
  forecasts: 'placeId',
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
