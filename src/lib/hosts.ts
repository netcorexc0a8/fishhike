// Источники погоды с перебором адресов.
// Основной адрес Open-Meteo из части российских сетей недоступен, поэтому пробуем
// по очереди несколько адресов. Ответивший запоминается на 6 часов и пробуется первым.
// Списки можно переопределить при сборке: VITE_FORECAST_HOSTS / VITE_GEOCODER_HOSTS (через запятую).

export type HostKind = 'forecast' | 'geocoder';

const DEFAULTS: Record<HostKind, string[]> = {
  forecast: ['https://api.open-meteo.com', 'https://historical-forecast-api.open-meteo.com'],
  geocoder: ['https://geocoding-api.open-meteo.com'],
};

const STICKY_MS = 6 * 3_600_000;
export const ATTEMPT_TIMEOUT_MS = 7_000;

function fromEnv(kind: HostKind): string[] | null {
  // В приложении — import.meta.env (Vite), в vite.config — process.env (сборка service worker'а).
  const env =
    (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ??
    (typeof process !== 'undefined' ? process.env : undefined);
  const name = kind === 'forecast' ? 'VITE_FORECAST_HOSTS' : 'VITE_GEOCODER_HOSTS';
  const raw: string | undefined = env?.[name];
  if (!raw) return null;
  const list = raw
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter((s) => /^https:\/\//.test(s));
  return list.length ? list : null;
}

export function hostList(kind: HostKind): string[] {
  return fromEnv(kind) ?? DEFAULTS[kind];
}

const key = (kind: HostKind) => `fishhike-host-${kind}`;

function readSticky(kind: HostKind): string | null {
  try {
    const v = JSON.parse(localStorage.getItem(key(kind)) ?? 'null') as { host: string; at: number } | null;
    return v && Date.now() - v.at < STICKY_MS ? v.host : null;
  } catch {
    return null;
  }
}

function writeSticky(kind: HostKind, host: string) {
  try {
    localStorage.setItem(key(kind), JSON.stringify({ host, at: Date.now() }));
  } catch {
    /* нет localStorage */
  }
}

/** Порядок попыток: запомненный рабочий адрес, затем остальные по списку. */
export function orderedHosts(kind: HostKind, list = hostList(kind)): string[] {
  const sticky = readSticky(kind);
  return sticky && list.includes(sticky) ? [sticky, ...list.filter((h) => h !== sticky)] : list;
}

export class AllHostsFailed extends Error {
  constructor(public readonly attempts: { host: string; reason: string }[]) {
    super('Источник погоды недоступен');
  }
}

/**
 * GET `pathAndQuery` на первом ответившем адресе. Каждой попытке — свой таймаут:
 * заблокированный адрес часто не отвечает вовсе, а не возвращает ошибку.
 * Ответ 4xx (ошибка в запросе) не перебирается дальше — он будет таким же везде.
 */
export async function fetchJson<T>(kind: HostKind, pathAndQuery: string, signal?: AbortSignal): Promise<{ data: T; host: string }> {
  const attempts: { host: string; reason: string }[] = [];
  for (const host of orderedHosts(kind)) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const ctrl = new AbortController();
    const onAbort = () => ctrl.abort();
    signal?.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => ctrl.abort(), ATTEMPT_TIMEOUT_MS);
    try {
      const res = await fetch(host + pathAndQuery, { signal: ctrl.signal });
      if (res.status >= 400 && res.status < 500 && res.status !== 403 && res.status !== 429) {
        throw new Error(`Источник погоды отклонил запрос: ${res.status}`);
      }
      if (!res.ok) {
        attempts.push({ host, reason: `HTTP ${res.status}` });
        continue;
      }
      const data = (await res.json()) as T;
      writeSticky(kind, host);
      return { data, host };
    } catch (e) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      if (e instanceof Error && e.message.startsWith('Источник погоды отклонил')) throw e;
      attempts.push({ host, reason: ctrl.signal.aborted ? 'таймаут' : 'нет соединения' });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }
  throw new AllHostsFailed(attempts);
}

/** Регулярное выражение для кэша service worker'а — все адреса обоих видов. */
export function hostsPattern(): RegExp {
  const all = [...new Set([...hostList('forecast'), ...hostList('geocoder')])];
  const esc = all.map((h) => h.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'));
  return new RegExp(`^(${esc.join('|')})/`);
}
