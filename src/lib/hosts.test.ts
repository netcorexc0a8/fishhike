import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AllHostsFailed, fetchJson, hostList, hostsPattern, orderedHosts } from './hosts';

// Простое хранилище вместо localStorage (в node его нет).
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const [direct, spare] = hostList('forecast');

describe('перебор адресов погоды', () => {
  it('по умолчанию — основной и запасной адреса Open-Meteo', () => {
    expect(direct).toBe('https://api.open-meteo.com');
    expect(spare).toBe('https://historical-forecast-api.open-meteo.com');
    expect(hostList('geocoder')).toEqual(['https://geocoding-api.open-meteo.com']);
  });

  it('если основной адрес недоступен — берёт запасной и запоминает его', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      calls.push(url);
      if (url.startsWith(direct)) throw new TypeError('Failed to fetch');
      return ok({ v: 1 });
    });
    const r = await fetchJson<{ v: number }>('forecast', '/v1/forecast?x=1');
    expect(r).toEqual({ data: { v: 1 }, host: spare });
    expect(calls).toEqual([`${direct}/v1/forecast?x=1`, `${spare}/v1/forecast?x=1`]);
    expect(orderedHosts('forecast')[0]).toBe(spare);
  });

  it('зависший адрес отбрасывается по таймауту', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', (url: string, init: RequestInit) =>
      url.startsWith(spare)
        ? Promise.resolve(ok({ v: 2 }))
        : new Promise((_, rej) => init.signal!.addEventListener('abort', () => rej(new DOMException('a', 'AbortError')))),
    );
    const p = fetchJson('forecast', '/v1/forecast');
    await vi.advanceTimersByTimeAsync(7_000);
    await expect(p).resolves.toMatchObject({ host: spare });
  });

  it('5xx — пробует следующий, 400 — сразу ошибка (запрос неверный везде)', async () => {
    vi.stubGlobal('fetch', async (url: string) => (url.startsWith(direct) ? new Response('', { status: 502 }) : ok({ v: 3 })));
    await expect(fetchJson('forecast', '/v1/forecast')).resolves.toMatchObject({ host: spare });

    store.clear();
    let n = 0;
    vi.stubGlobal('fetch', async () => {
      n++;
      return new Response('', { status: 400 });
    });
    await expect(fetchJson('forecast', '/v1/forecast')).rejects.toThrow(/отклонил/);
    expect(n).toBe(1);
  });

  it('все адреса недоступны — понятная ошибка со списком причин', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch');
    });
    const e = await fetchJson('geocoder', '/v1/search').catch((x) => x);
    expect(e).toBeInstanceOf(AllHostsFailed);
    expect((e as AllHostsFailed).attempts).toHaveLength(hostList('geocoder').length);
  });

  it('отмена пользователем не перебирает остальные адреса', async () => {
    const ctrl = new AbortController();
    let n = 0;
    vi.stubGlobal('fetch', (_: string, init: RequestInit) => {
      n++;
      ctrl.abort();
      return Promise.reject(init.signal!.aborted ? new DOMException('a', 'AbortError') : new Error('x'));
    });
    await expect(fetchJson('forecast', '/v1/forecast', ctrl.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(n).toBe(1);
  });

  it('кэш service worker покрывает все адреса', () => {
    const re = hostsPattern();
    expect(re.test('https://historical-forecast-api.open-meteo.com/v1/forecast?a=1')).toBe(true);
    expect(re.test('https://geocoding-api.open-meteo.com/v1/search')).toBe(true);
    expect(re.test('https://evil.example/v1/forecast')).toBe(false);
  });
});
