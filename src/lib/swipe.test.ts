import { describe, expect, it } from 'vitest';
import { dragOffset, settle, SWIPE_ACTION_W as W } from './swipe';

describe('dragOffset', () => {
  it('не уводит карточку вправо', () => {
    expect(dragOffset(0, 40)).toBe(0);
    expect(dragOffset(-W, 200)).toBe(0);
  });
  it('идёт за пальцем в пределах кнопки', () => {
    expect(dragOffset(0, -30)).toBe(-30);
    expect(dragOffset(-W, 20)).toBe(-W + 20);
  });
  it('тянется с сопротивлением за шириной кнопки', () => {
    expect(dragOffset(0, -W - 30)).toBe(-W - 10);
  });
});

describe('settle', () => {
  it('открывает после половины ширины', () => {
    expect(settle(-W / 2 - 1, 0)).toBe(true);
    expect(settle(-W / 2 + 1, 0)).toBe(false);
  });
  it('учитывает быстрый взмах', () => {
    expect(settle(-10, -0.8)).toBe(true);
    expect(settle(-80, 0.8)).toBe(false);
  });
});
