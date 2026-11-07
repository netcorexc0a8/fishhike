// Подложка карты. По умолчанию — OpenStreetMap: открывается из России и не требует ключа.
// Можно заменить при сборке переменной VITE_TILE_URL (шаблон вида https://…/{z}/{x}/{y}.png),
// тогда же — VITE_TILE_ATTRIBUTION.

const DEFAULT_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const DEFAULT_ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright">участники OpenStreetMap</a>';

function env(name: string): string | undefined {
  const e =
    (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ??
    (typeof process !== 'undefined' ? process.env : undefined);
  return e?.[name];
}

export function tileUrl(): string {
  const v = env('VITE_TILE_URL')?.trim();
  return v && /^https:\/\/.+\{z\}.+\{x\}.+\{y\}/.test(v) ? v : DEFAULT_URL;
}

export const tileAttribution = () => env('VITE_TILE_ATTRIBUTION')?.trim() || DEFAULT_ATTRIBUTION;

/** Для service worker'а: адреса плиток с того же хоста кэшируются для офлайна. */
export function tilesPattern(): RegExp {
  const host = new URL(tileUrl().replace(/\{[a-z]\}/g, 'a')).host.replace(/^a\./, '');
  return new RegExp(`^https://([a-z0-9-]+\\.)?${host.replace(/\./g, '\\.')}/`);
}
