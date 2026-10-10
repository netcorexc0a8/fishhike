import { describe, expect, it } from 'vitest';
import { moonInfo, moonPhase } from './moon';

describe('moon', () => {
  it('новолуние 2024-04-08 (солнечное затмение) — фаза около 0', () => {
    const p = moonPhase(new Date(Date.UTC(2024, 3, 8, 18, 21)));
    expect(Math.min(p, 1 - p)).toBeLessThan(0.02);
  });

  it('полнолуние 2025-09-07 (лунное затмение) — освещённость ~100%', () => {
    const m = moonInfo(new Date(Date.UTC(2025, 8, 7, 18, 9)));
    expect(m.illumination).toBeGreaterThan(0.98);
    expect(m.name).toBe('Полнолуние');
  });

  it('фаза всегда в диапазоне [0, 1)', () => {
    for (let y = 1990; y < 2040; y += 3) {
      const p = moonPhase(new Date(Date.UTC(y, 5, 1)));
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(1);
    }
  });
});
