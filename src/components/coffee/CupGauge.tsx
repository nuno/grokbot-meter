import { memo } from "react";

const TOP = 26;
const BOTTOM = 102;
/** Cup tapers from rx 40 at the rim to rx 28 at the base. */
const HALF_TOP = 40;
const HALF_BOTTOM = 28;

type Props = {
  /** 0–100. Drives the coffee level; the surface ellipse narrows as it drops. */
  pct: number;
};

/**
 * Brushed-metal capsule cup whose coffee level is the weekly percentage.
 * Level/surface animate through CSS transitions on the SVG geometry
 * properties (see .cup-coffee / .cup-crema in themes/coffee.css).
 */
export const CupGauge = memo(function CupGauge({ pct }: Props) {
  const level = TOP + (1 - pct / 100) * (BOTTOM - TOP);
  const progress = (level - TOP) / (BOTTOM - TOP);
  const surfaceHalf = HALF_TOP - progress * (HALF_TOP - HALF_BOTTOM) - 5;
  // An empty cup is empty — no sliver of coffee or crema resting on the base.
  const empty = pct <= 0.5;

  return (
    <svg className="cup" viewBox="0 0 120 116" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="cup-metal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5C5C64" />
          <stop offset="0.16" stopColor="#CFCFD6" />
          <stop offset="0.3" stopColor="#F4F4F7" />
          <stop offset="0.5" stopColor="#A9A9B2" />
          <stop offset="0.68" stopColor="#E4E4E9" />
          <stop offset="0.86" stopColor="#8A8A92" />
          <stop offset="1" stopColor="#4E4E56" />
        </linearGradient>
        <linearGradient id="cup-coffee" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7A4420" />
          <stop offset="1" stopColor="#251006" />
        </linearGradient>
        <linearGradient id="cup-rim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8E8E97" />
          <stop offset="0.35" stopColor="#FFFFFF" />
          <stop offset="0.7" stopColor="#B4B4BC" />
          <stop offset="1" stopColor="#6E6E77" />
        </linearGradient>
        <radialGradient id="cup-crema" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#D9A263" />
          <stop offset="1" stopColor="#8A5524" />
        </radialGradient>
        <radialGradient id="cup-shadow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgba(0, 0, 0, 0.75)" />
          <stop offset="1" stopColor="rgba(0, 0, 0, 0)" />
        </radialGradient>
        <clipPath id="cup-body">
          <path d="M20 26 L100 26 L88 92 Q86 102 76 102 L44 102 Q34 102 32 92 Z" />
        </clipPath>
      </defs>

      <ellipse cx="60" cy="106" rx="38" ry="7" fill="url(#cup-shadow)" />

      <g clipPath="url(#cup-body)">
        <rect x="16" y="20" width="88" height="90" fill="url(#cup-metal)" />
        <rect
          className="cup-coffee"
          x="16"
          y={level}
          width="88"
          height={empty ? 0 : BOTTOM - level + 4}
          fill="url(#cup-coffee)"
          opacity="0.94"
        />
        {[28, 36, 44, 52, 60, 68, 76, 84, 92].map((x) => (
          <rect key={x} x={x} y="20" width="1.6" height="90" fill="rgba(255, 255, 255, 0.10)" />
        ))}
        <rect x="30" y="20" width="7" height="90" fill="rgba(255, 255, 255, 0.22)" />
        <rect x="80" y="20" width="4" height="90" fill="rgba(255, 255, 255, 0.14)" />
      </g>

      <ellipse
        className="cup-crema"
        cx="60"
        cy={level}
        rx={surfaceHalf}
        ry="4.2"
        fill="url(#cup-crema)"
        opacity={empty ? 0 : 1}
      />
      <path
        d="M20 26 L100 26 L88 92 Q86 102 76 102 L44 102 Q34 102 32 92 Z"
        stroke="rgba(255, 255, 255, 0.35)"
        strokeWidth="0.8"
        fill="none"
      />
      <ellipse cx="60" cy="26" rx="40" ry="8.5" fill="url(#cup-rim)" />
      <ellipse cx="60" cy="26" rx="33" ry="6.4" fill="#120D09" />
      <ellipse cx="60" cy="26" rx="40" ry="8.5" stroke="rgba(255, 255, 255, 0.55)" strokeWidth="0.7" fill="none" />
    </svg>
  );
});
