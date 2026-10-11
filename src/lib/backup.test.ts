import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { backupFileName, createBackup, parseBackup, restoreBackup } from './backup';

async function reset() {
  db.close();
  await db.delete();
  await db.open(); // заполнит стартовые данные
}

describe('резервная копия', () => {
  beforeEach(reset);

  it('переносит данные на «чистый» телефон', async () => {
    const now = Date.now();
    await db.checklists.add({ id: 'my', title: 'Зимняя', items: [{ id: 'i1', text: 'Бур', done: true }], createdAt: now, updatedAt: now });
    await db.recipes.add({ id: 'r1', title: 'Щука', minutes: 30, servings: 2, ingredients: ['щука'], steps: ['жарить'], tags: [], builtin: false, createdAt: now, updatedAt: now });
    await db.places.add({ id: 'p1', name: 'Сенеж', region: 'МО', lat: 56.2, lon: 36.9, createdAt: now });
    await db.settings.put({ key: 'placeId', value: 'p1' });
    // Отметили пункт в стартовом списке — изменение тоже должно переехать.
    const seed = (await db.checklists.get('seed-day'))!;
    await db.checklists.put({ ...seed, items: seed.items.map((i, n) => ({ ...i, done: n === 0 })), updatedAt: now + 5 });

    const file = JSON.stringify(await createBackup());

    await reset(); // «новый телефон»
    const r = await restoreBackup(parseBackup(file));

    expect(await db.checklists.get('my')).toMatchObject({ title: 'Зимняя' });
    expect(await db.recipes.get('r1')).toMatchObject({ title: 'Щука', builtin: false });
    expect(await db.places.get('p1')).toMatchObject({ name: 'Сенеж' });
    expect((await db.settings.get('placeId'))?.value).toBe('p1');
    expect((await db.checklists.get('seed-day'))!.items[0].done).toBe(true);
    expect(r.added).toBe(3);
    expect(r.updated).toBe(1);
  });

  it('не затирает более свежие правки и не удаляет записи', async () => {
    const file = JSON.stringify(await createBackup());
    const seed = (await db.checklists.get('seed-day'))!;
    await db.checklists.put({ ...seed, title: 'Свежее имя', updatedAt: seed.updatedAt + 1000 });
    await db.checklists.add({ id: 'local', title: 'Только тут', items: [], createdAt: 1, updatedAt: 1 });

    await restoreBackup(parseBackup(file));
    expect((await db.checklists.get('seed-day'))!.title).toBe('Свежее имя');
    expect(await db.checklists.get('local')).toBeTruthy();
  });

  it('повторное восстановление ничего не дублирует', async () => {
    const file = JSON.stringify(await createBackup());
    const before = await db.checklists.count();
    const r = await restoreBackup(parseBackup(file));
    expect(await db.checklists.count()).toBe(before);
    expect(r.added + r.updated).toBe(0);
  });

  it('отклоняет чужие и повреждённые файлы, отбрасывает битые записи', () => {
    expect(() => parseBackup('не json')).toThrow(/повреждён/);
    expect(() => parseBackup('{"app":"other","data":{}}')).toThrow(/не резервная копия/);
    expect(() => parseBackup('{"app":"fishhike","version":99,"data":{}}')).toThrow(/новой версией/);
    const b = parseBackup(
      JSON.stringify({ app: 'fishhike', version: 1, data: { places: [{ id: 'x', name: 'A', lat: 999, lon: 0 }, { id: 'y', name: 'B', lat: 55, lon: 37 }] } }),
    );
    expect(b.data.places.map((p) => p.id)).toEqual(['y']);
  });

  it('имя файла с датой', () => {
    expect(backupFileName(new Date(2026, 9, 12))).toBe('fishhike-backup-2026-10-12.json');
  });
});
