// Установка PWA.
// Ни один браузер не разрешает сайту установить себя без действия пользователя:
// - Chromium (Android Chrome, Edge, Samsung Internet, десктопный Chrome) присылает событие
//   beforeinstallprompt — сохраняем его и по нажатию нашей кнопки вызываем системный диалог;
// - Safari на iOS/iPadOS API не даёт — остаётся инструкция «Поделиться → На экран Домой».

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type Platform = 'ios' | 'android' | 'desktop';

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Вызывается до монтирования React — событие может прийти очень рано. */
export function initInstallCapture(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // не показываем мини-баннер Chrome — у нас свой экран
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    emit();
  });
}

export function subscribeInstall(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export const canPromptInstall = () => deferred !== null;
export const wasInstalledNow = () => installed;

/** Показывает системный диалог установки. true — пользователь согласился. */
export async function promptInstall(): Promise<boolean> {
  const e = deferred;
  if (!e) return false;
  deferred = null; // событие одноразовое
  emit();
  await e.prompt();
  const { outcome } = await e.userChoice;
  return outcome === 'accepted';
}

export function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    nav.standalone === true
  );
}

export function detectPlatform(ua = navigator.userAgent, maxTouchPoints = navigator.maxTouchPoints ?? 0): Platform {
  // iPadOS 13+ представляется как Mac, но с сенсорным экраном.
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

export const isIpad = (ua = navigator.userAgent, maxTouchPoints = navigator.maxTouchPoints ?? 0) =>
  /iPad/i.test(ua) || (/Macintosh/i.test(ua) && maxTouchPoints > 1);
