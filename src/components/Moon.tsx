import { useId } from 'react';
import type { MoonInfo } from '../lib/moon';

// Моря и кратеры (доли радиуса от центра) — узнаваемый рисунок видимой стороны Луны.
// [x, y, rx, ry, поворот°]
const MARIA: [number, number, number, number, number][] = [
  [-0.26, -0.34, 0.27, 0.2, -20], // Море Дождей
  [0.1, -0.3, 0.17, 0.15, 10], // Море Ясности
  [0.34, -0.06, 0.2, 0.14, 30], // Море Спокойствия
  [0.56, -0.36, 0.1, 0.08, 0], // Море Кризисов
  [-0.5, 0.06, 0.24, 0.36, 15], // Океан Бурь
  [0.26, 0.3, 0.13, 0.17, -15], // Море Изобилия
  [-0.12, 0.38, 0.14, 0.09, 5], // Море Облаков
];
const CRATERS: [number, number, number][] = [
  [-0.1, 0.66, 0.07], // Тихо
  [-0.42, -0.02, 0.05], // Коперник
  [0.62, 0.22, 0.05],
  [0.02, 0.06, 0.04],
];

/**
 * Луна по фазе: освещённая часть строится как полукруг по лимбу + полуэллипс терминатора
 * (полуось r·|cos 2πφ|). Тёмная сторона подсвечена пепельным светом, чтобы диск читался
 * и в новолуние.
 */
export function Moon({ info, size = 64 }: { info: MoonInfo; size?: number }) {
  const uid = useId().replace(/:/g, '');
  const pad = size * 0.12;
  const c = size / 2;
  const r = c - pad;
  const { phase, illumination } = info;
  const waxing = phase < 0.5;
  const k = Math.cos(2 * Math.PI * phase); // 1 — новолуние, -1 — полнолуние
  const rx = Math.abs(k) * r;
  const limbSweep = waxing ? 1 : 0; // растущая освещена справа
  const termSweep = waxing ? (k > 0 ? 0 : 1) : k > 0 ? 1 : 0;
  const lit = `M ${c} ${c - r} A ${r} ${r} 0 0 ${limbSweep} ${c} ${c + r} A ${rx || 0.001} ${r} 0 0 ${termSweep} ${c} ${c - r} Z`;
  const pct = Math.round(illumination * 100);
  const hx = waxing ? 0.65 : 0.35; // блик смещён к освещённому краю

  const maria = (fill: string, opacity: number) => (
    <g filter={`url(#soft${uid})`} opacity={opacity}>
      {MARIA.map(([x, y, ex, ey, rot], i) => (
        <ellipse
          key={i}
          cx={c + x * r}
          cy={c + y * r}
          rx={ex * r}
          ry={ey * r}
          transform={`rotate(${rot} ${c + x * r} ${c + y * r})`}
          fill={fill}
        />
      ))}
    </g>
  );
  const craters = CRATERS.map(([x, y, rr], i) => (
    <g key={i}>
      <circle cx={c + x * r} cy={c + y * r} r={rr * r} fill="#C8B68A" opacity="0.7" />
      <circle cx={c + x * r - rr * r * 0.25} cy={c + y * r - rr * r * 0.25} r={rr * r * 0.55} fill="#FFF6DC" opacity="0.55" />
    </g>
  ));

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${info.name}, освещено ${pct}%`}>
      <defs>
        <radialGradient id={`lit${uid}`} cx={hx} cy="0.4" r="0.75">
          <stop offset="0" stopColor="#FFF8E6" />
          <stop offset="0.6" stopColor="#F1E4C1" />
          <stop offset="1" stopColor="#D9C89C" />
        </radialGradient>
        <radialGradient id={`dark${uid}`} cx={1 - hx} cy="0.4" r="0.8">
          <stop offset="0" style={{ stopColor: 'var(--moon-shade-1)' }} />
          <stop offset="1" style={{ stopColor: 'var(--moon-shade-2)' }} />
        </radialGradient>
        <radialGradient id={`glow${uid}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.7" stopColor="#F4E9CC" stopOpacity="0.35" />
          <stop offset="1" stopColor="#F4E9CC" stopOpacity="0" />
        </radialGradient>
        <filter id={`soft${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={Math.max(0.6, r * 0.06)} />
        </filter>
        <clipPath id={`clip${uid}`}>
          <path d={lit} />
        </clipPath>
      </defs>

      {illumination > 0.03 && <circle cx={c} cy={c} r={c} fill={`url(#glow${uid})`} opacity={0.3 + illumination * 0.7} />}

      {/* Тёмная сторона в пепельном свете */}
      <circle cx={c} cy={c} r={r} fill={`url(#dark${uid})`} />
      {maria('var(--moon-maria)', 0.35)}
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--moon-edge)" strokeWidth={Math.max(1, size / 64)} />

      {/* Освещённая часть */}
      <g clipPath={`url(#clip${uid})`}>
        <circle cx={c} cy={c} r={r} fill={`url(#lit${uid})`} />
        {maria('#BBA97E', 0.6)}
        {craters}
      </g>
    </svg>
  );
}
