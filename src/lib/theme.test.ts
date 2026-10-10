import { describe, expect, it } from 'vitest';
import { nextTheme } from './theme';

describe('переключатель темы', () => {
  it('ходит по кругу: система → светлая → тёмная → система', () => {
    expect(nextTheme('system')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('system');
  });
});
