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

  it('переносит журнал улова вместе с фото', async () => {
    const now = Date.now();
    const photo = 'data:image/webp;base64,UklGRg==';
    await db.catches.add({
      id: 'c1', species: 'Щука', weightKg: 4.2, lengthCm: 78, caughtAt: now - 1000, placeName: 'р. Ока',
      lat: 54.9, lon: 37.4, tags: ['джиг'], note: 'у бровки', photo, createdAt: now, updatedAt: now,
    });
    const file = JSON.stringify(await createBackup());

    await reset();
    const r = await restoreBackup(parseBackup(file));
    expect(await db.catches.get('c1')).toMatchObject({ species: 'Щука', weightKg: 4.2, photo, tags: ['джиг'] });
    expect(r.added).toBe(1);
  });

  it('читает старые копии без улова и отбрасывает битые записи улова', () => {
    const old = parseBackup(JSON.stringify({ app: 'fishhike', version: 1, data: {} }));
    expect(old.data.catches).toEqual([]);
    expect(old.data.tracks).toEqual([]);
    const b = parseBackup(
      JSON.stringify({
        app: 'fishhike',
        version: 2,
        data: {
          catches: [
            { id: 'ok', species: 'Окунь', caughtAt: 1, updatedAt: 1, weightKg: 'много' },
            { id: 'no-species', species: ' ', caughtAt: 1, updatedAt: 1 },
            { id: 'bad-photo', species: 'Лещ', caughtAt: 1, updatedAt: 1, photo: 'javascript:alert(1)' },
          ],
        },
      }),
    );
    expect(b.data.catches.map((c) => c.id)).toEqual(['ok']);
    expect(b.data.catches[0]).toMatchObject({ weightKg: null, tags: [], photo: null, placeName: '' });
  });

  it('переносит треки и пересчитывает их длину', async () => {
    const now = Date.now();
    const seg = [
      { lat: 55, lon: 37, t: now - 120_000, acc: 8 },
      { lat: 55.001, lon: 37, t: now - 60_000, acc: 8 },
    ];
    await db.tracks.add({ id: 't1', name: 'Утро на Оке', startedAt: now - 120_000, endedAt: now - 60_000, segments: [seg], distanceM: 111, movingMs: 60_000, createdAt: now, updatedAt: now });
    const file = JSON.stringify(await createBackup());
    await reset();
    await restoreBackup(parseBackup(file));
    expect(await db.tracks.get('t1')).toMatchObject({ name: 'Утро на Оке', movingMs: 60_000 });

    const b = parseBackup(
      JSON.stringify({
        app: 'fishhike',
        version: 3,
        data: { tracks: [{ id: 'x', startedAt: 5, updatedAt: 5, endedAt: null, distanceM: 1e9, segments: [[{ lat: 999, lon: 0, t: 1 }, { lat: 55, lon: 37, t: 9 }]] }, { id: 'bad', startedAt: 1, updatedAt: 1, segments: 'нет' }] },
      }),
    );
    expect(b.data.tracks.map((t) => t.id)).toEqual(['x']);
    expect(b.data.tracks[0]).toMatchObject({ endedAt: 9, distanceM: 0, name: 'Трек' });
    expect(b.data.tracks[0].segments[0]).toHaveLength(1);
  });

  it('имя файла с датой', () => {
    expect(backupFileName(new Date(2026, 9, 12))).toBe('fishhike-backup-2026-10-12.json');
  });
});
