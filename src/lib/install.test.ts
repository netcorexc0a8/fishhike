import { describe, expect, it } from 'vitest';
import { detectPlatform, isIpad } from './install';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IPAD_DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';
const WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36';

describe('определение платформы', () => {
  it('iPhone и iPad (включая iPadOS с «десктопным» UA)', () => {
    expect(detectPlatform(IPHONE, 5)).toBe('ios');
    expect(detectPlatform(IPAD_DESKTOP_UA, 5)).toBe('ios');
    expect(isIpad(IPAD_DESKTOP_UA, 5)).toBe(true);
    expect(isIpad(IPHONE, 5)).toBe(false);
  });

  it('Mac без сенсора — компьютер', () => {
    expect(detectPlatform(IPAD_DESKTOP_UA, 0)).toBe('desktop');
  });

  it('Android и Windows', () => {
    expect(detectPlatform(ANDROID, 5)).toBe('android');
    expect(detectPlatform(WIN, 0)).toBe('desktop');
  });
});
