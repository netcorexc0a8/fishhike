import type { MoonInfo } from '../lib/moon';

/** Диск Луны с тенью по фазе. Терминатор — эллипс с полуосью r·cos(2πφ). */
export function Moon({ info, size = 56 }: { info: MoonInfo; size?: number }) {
  const r = size / 2 - 2;
  const c = size / 2;
  const { phase } = info;
  const k = Math.cos(2 * Math.PI * phase); // 1 — новолуние, -1 — полнолуние
  const rx = Math.abs(k) * r;
  // Тёмная часть: в растущей фазе тень слева, в убывающей — справа.
  const shadowSide = phase < 0.5 ? 0 : 1; // 0 — левая полуокружность
  // Серп: терминатор на освещённой стороне; горбатая луна — на теневой.
  const termSweep = k > 0 ? (phase < 0.5 ? 0 : 1) : phase < 0.5 ? 1 : 0;
  const d = `M ${c} ${c - r} A ${r} ${r} 0 0 ${shadowSide} ${c} ${c + r} A ${rx} ${r} 0 0 ${termSweep} ${c} ${c - r} Z`;
  const pct = Math.round(info.illumination * 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${info.name}, освещено ${pct}%`}>
      <circle cx={c} cy={c} r={r} fill="var(--moon)" />
      <path d={d} fill="var(--moon-dark)" />
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--line-2)" strokeWidth="1.5" />
    </svg>
  );
}
