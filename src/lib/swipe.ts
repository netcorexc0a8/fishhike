/** Ширина кнопки «Удалить», которая открывается свайпом влево. */
export const SWIPE_ACTION_W = 88;
/** Сдвиг, после которого жест считается горизонтальным (или вертикальным — тогда это прокрутка). */
export const SWIPE_SLOP = 8;

/** Куда сдвинуть карточку во время жеста: только влево, с «резиной» за шириной кнопки. */
export function dragOffset(base: number, dx: number, w = SWIPE_ACTION_W): number {
  const x = Math.min(0, base + dx);
  if (x >= -w) return x;
  return -w - (-x - w) / 3;
}

/** Открыть или закрыть после отпускания: по половине ширины или по быстрому взмаху. */
export function settle(offset: number, velocity: number, w = SWIPE_ACTION_W): boolean {
  if (velocity < -0.4) return true;
  if (velocity > 0.4) return false;
  return offset < -w / 2;
}
