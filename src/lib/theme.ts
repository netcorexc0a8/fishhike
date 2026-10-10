import { useSyncExternalStore } from 'react';

// Тема оформления: «как в системе», светлая или тёмная.
// Хранится в localStorage (а не в IndexedDB), чтобы применять её синхронно
// до первой отрисовки — без вспышки другой темы. Тот же ключ читает скрипт в index.html.

export type ThemeMode = 'system' | 'light' | 'dark';
export const THEME_KEY = 'fishhike-theme';
const BAR = { dark: '#0B1220', light: '#EEF2EF' } as const;

const listeners = new Set<() => void>();

function read(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

let mode: ThemeMode = typeof window === 'undefined' ? 'system' : read();

export function applyTheme(m: ThemeMode): void {
  const root = document.documentElement;
  if (m === 'system') delete root.dataset.theme;
  else root.dataset.theme = m;
  // Цвет строки состояния: при ручном выборе — обе meta в цвет выбранной темы.
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  metas.forEach((meta) => {
    const media = meta.media.includes('light') ? 'light' : 'dark';
    meta.content = m === 'system' ? BAR[media] : BAR[m];
  });
}

export function setTheme(m: ThemeMode): void {
  mode = m;
  try {
    if (m === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, m);
  } catch {
    /* приватный режим — тема действует до перезагрузки */
  }
  applyTheme(m);
  listeners.forEach((l) => l());
}

/** Следующий режим для кнопки-переключателя: система → светлая → тёмная → система. */
export const nextTheme = (m: ThemeMode): ThemeMode => (m === 'system' ? 'light' : m === 'light' ? 'dark' : 'system');

export const THEME_LABEL: Record<ThemeMode, string> = { system: 'как в системе', light: 'светлая', dark: 'тёмная' };

export function useTheme(): ThemeMode {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => mode,
    () => 'system',
  );
}
