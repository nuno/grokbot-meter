import type {CSSProperties, FC, ReactNode} from "react";
import {beatPulse} from "./beats";
import {clamp, pop} from "./motion";

export const BotMark: FC<{size?: number; blink?: number; look?: number; style?: CSSProperties}> = ({
  size = 64,
  blink = 1,
  look = 0,
  style,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden>
    <circle cx="12" cy="12" r="11" fill="#2C2C2E" />
    <circle cx="12" cy="13.2" r="8.6" fill="#E8E8ED" />
    <g style={{transform: `translate(${look}px, 0px) scale(1, ${blink})`, transformOrigin: "12px 13.45px"}}>
      <rect x="8.15" y="10.9" width="2.35" height="5.1" rx="1.175" fill="#2C2C2E" transform="rotate(14 9.325 13.45)" />
      <rect x="13.5" y="10.9" width="2.35" height="5.1" rx="1.175" fill="#2C2C2E" transform="rotate(-14 14.675 13.45)" />
    </g>
  </svg>
);

export function blinkAt(frame: number) {
  for (const c of [48, 214, 430, 760, 868]) {
    const d = frame - c;
    if (d >= 0 && d < 7) {
      const t = d / 7;
      return t < 0.45 ? 1 - (t / 0.45) * 0.92 : ((t - 0.45) / 0.55) * 0.92 + 0.08;
    }
  }
  return 1;
}

type CupProps = {uid: string; pct: number; wobble?: number; sheen?: number};

export const Cup: FC<CupProps> = ({uid, pct, wobble = 0, sheen = 0}) => {
  const top = 26;
  const bottom = 102;
  const clamped = clamp(pct, 0, 100);
  const level = top + (1 - clamped / 100) * (bottom - top);
  const progress = (level - top) / (bottom - top);
  const surfaceHalf = 40 - progress * (40 - 28) - 5;
  const empty = clamped <= 0.5;
  const metal = `${uid}-metal`;
  const brew = `${uid}-brew`;
  const rim = `${uid}-rim`;
  const crema = `${uid}-crema`;
  const shadow = `${uid}-shadow`;
  const body = `${uid}-body`;
  const sheenX = 22 + (sheen % 68);

  return (
    <svg viewBox="0 0 120 116" width="100%" height="100%" aria-hidden>
      <defs>
        <linearGradient id={metal} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5C5C64" />
          <stop offset="0.16" stopColor="#CFCFD6" />
          <stop offset="0.3" stopColor="#F4F4F7" />
          <stop offset="0.5" stopColor="#A9A9B2" />
          <stop offset="0.68" stopColor="#E4E4E9" />
          <stop offset="0.86" stopColor="#8A8A92" />
          <stop offset="1" stopColor="#4E4E56" />
        </linearGradient>
        <linearGradient id={brew} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7A4420" />
          <stop offset="1" stopColor="#251006" />
        </linearGradient>
        <linearGradient id={rim} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8E8E97" />
          <stop offset="0.35" stopColor="#FFFFFF" />
          <stop offset="0.7" stopColor="#B4B4BC" />
          <stop offset="1" stopColor="#6E6E77" />
        </linearGradient>
        <radialGradient id={crema} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#E2B06A" />
          <stop offset="1" stopColor="#8A5524" />
        </radialGradient>
        <radialGradient id={shadow} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgba(0,0,0,0.72)" />
          <stop offset="1" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <clipPath id={body}>
          <path d="M20 26 L100 26 L88 92 Q86 102 76 102 L44 102 Q34 102 32 92 Z" />
        </clipPath>
      </defs>

      <ellipse cx="60" cy="108" rx="38" ry="7" fill={`url(#${shadow})`} />
      <g clipPath={`url(#${body})`}>
        <rect x="16" y="20" width="88" height="90" fill={`url(#${metal})`} />
        <rect
          x="16"
          y={level}
          width="88"
          height={empty ? 0 : bottom - level + 4}
          fill={`url(#${brew})`}
          opacity={0.96}
        />
        {[28, 36, 44, 52, 60, 68, 76, 84, 92].map((x) => (
          <rect key={x} x={x} y="20" width="1.5" height="90" fill="rgba(255,255,255,0.1)" />
        ))}
        <rect x="30" y="20" width="7" height="90" fill="rgba(255,255,255,0.22)" />
        <rect x={sheenX} y="20" width="9" height="90" fill="rgba(255,255,255,0.28)" />
        <rect x="80" y="20" width="4" height="90" fill="rgba(255,255,255,0.14)" />
      </g>
      <ellipse
        cx="60"
        cy={level + wobble * 0.4}
        rx={Math.max(8, surfaceHalf)}
        ry={4.2 + wobble}
        fill={`url(#${crema})`}
        opacity={empty ? 0 : 1}
      />
      <path d="M20 26 L100 26 L88 92 Q86 102 76 102 L44 102 Q34 102 32 92 Z" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" fill="none" />
      <ellipse cx="60" cy="26" rx="40" ry="8.5" fill={`url(#${rim})`} />
      <ellipse cx="60" cy="26" rx="33" ry="6.4" fill="#120D09" />
      <ellipse cx="60" cy="26" rx="40" ry="8.5" stroke="rgba(255,255,255,0.55)" strokeWidth="0.7" fill="none" />
    </svg>
  );
};

export const Steam: FC<{frame: number; strength?: number}> = ({frame, strength = 1}) => {
  if (strength <= 0.02) return null;
  return (
    <div style={{position: "absolute", left: 0, right: 0, top: -30, height: 180, pointerEvents: "none"}}>
      {Array.from({length: 8}, (_, i) => {
        const cycle = 84;
        const t = ((frame * 0.9 + i * (cycle / 8)) % cycle) / cycle;
        const x = 50 + Math.sin(t * Math.PI * 2 + i * 1.3) * (10 + i) + (i - 3.5) * 6;
        const y = 78 - t * 170;
        const o = Math.sin(t * Math.PI) * 0.55 * strength;
        const s = 0.45 + t * 1.35;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: y,
              width: 26,
              height: 26,
              marginLeft: -13,
              borderRadius: 99,
              background: "radial-gradient(circle, rgba(255,255,255,0.9), rgba(255,255,255,0) 70%)",
              opacity: o,
              transform: `scale(${s})`,
            }}
          />
        );
      })}
    </div>
  );
};

const CupGlyph: FC<{h: number}> = ({h}) => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
    <path d={`M3 3.2 H13 L11.6 ${3.2 + h} Q11 ${5 + h} 9.2 ${5 + h} H6.8 Q5 ${5 + h} 4.4 ${3.2 + h} Z`} fill="currentColor" />
  </svg>
);

export const UsageRail: FC<{
  frame: number;
  width: number;
  reveal: number;
  puck: number;
  active: "small" | "regular" | "large";
}> = ({frame, width, reveal, puck, active}) => {
  const pulse = beatPulse(frame, 7);
  const nodes: {id: "small" | "regular" | "large"; h: number}[] = [
    {id: "small", h: 5},
    {id: "regular", h: 7.2},
    {id: "large", h: 9.2},
  ];
  return (
    <div style={{width, fontFamily: "Inter, sans-serif"}}>
      <div style={{textAlign: "center", letterSpacing: "0.16em", fontSize: 13, fontWeight: 650, color: "#8d8d96", marginBottom: 10}}>
        USAGE LEVEL
      </div>
      <div style={{position: "relative", height: 54}}>
        <div
          style={{
            position: "absolute",
            left: 22,
            right: 22,
            top: 22,
            height: 3,
            borderRadius: 99,
            background: "linear-gradient(90deg, rgba(62,214,76,0.9) 0%, rgba(62,214,76,0.85) 42%, rgba(255,165,31,0.9) 74%, rgba(232,50,60,0.95) 100%)",
            transform: `scaleX(${reveal})`,
            transformOrigin: "left center",
          }}
        />
        <div style={{display: "flex", justifyContent: "space-between", position: "relative"}}>
          {nodes.map((n) => {
            const on = n.id === active;
            return (
              <div
                key={n.id}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 99,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: on ? "rgba(62,214,76,0.16)" : "#121216",
                  border: `2px solid ${on ? "#3ed64c" : "#3c3c46"}`,
                  color: on ? "#3ed64c" : "#8a8a94",
                  boxShadow: on ? `0 0 ${14 + pulse * 12}px rgba(62,214,76,0.65)` : "none",
                  transform: `scale(${on ? 1 + pulse * 0.08 : 1})`,
                }}
              >
                <CupGlyph h={n.h} />
              </div>
            );
          })}
        </div>
        <div
          style={{
            position: "absolute",
            top: 12,
            left: `${puck * 100}%`,
            width: 22,
            height: 22,
            marginLeft: -11,
            borderRadius: 99,
            background: "#3ed64c",
            boxShadow: `0 0 ${12 + pulse * 16}px #3ed64c`,
            transform: `scale(${reveal})`,
          }}
        />
      </div>
      <div style={{display: "flex", justifyContent: "space-between", marginTop: 6, color: "#8d8d96", fontSize: 16}}>
        {nodes.map((n) => (
          <span key={n.id} style={{width: 90, textAlign: n.id === "small" ? "left" : n.id === "large" ? "right" : "center", color: n.id === active ? "#3ed64c" : "#8d8d96", fontWeight: n.id === active ? 700 : 500}}>
            {n.id}
          </span>
        ))}
      </div>
    </div>
  );
};

export const DayRail: FC<{
  frame: number;
  fps: number;
  width: number;
  reveal: number;
  active: number;
  activeAt: number;
}> = ({frame, fps, width, reveal, active, activeAt}) => {
  const sprung = pop(frame, fps, activeAt, {damping: 9, stiffness: 180, mass: 0.4});
  return (
    <div style={{width, fontFamily: "Inter, sans-serif"}}>
      <div style={{textAlign: "center", letterSpacing: "0.16em", fontSize: 13, fontWeight: 650, color: "#8d8d96", marginBottom: 10}}>
        DAY
      </div>
      <div style={{position: "relative", height: 48}}>
        <div
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            top: 22,
            height: 2,
            background: "#3a3a44",
            transform: `scaleX(${reveal})`,
            transformOrigin: "left center",
          }}
        />
        <div style={{display: "flex", justifyContent: "space-between", position: "relative"}}>
          {Array.from({length: 7}, (_, i) => {
            const n = i + 1;
            const on = n === active;
            const done = n < active;
            const scale = on ? 0.7 + 0.3 * Math.max(sprung, 0) : 1;
            return (
              <div
                key={n}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 99,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: 700,
                  fontSize: 16,
                  background: on ? "rgba(62,214,76,0.18)" : done ? "rgba(62,214,76,0.08)" : "#121216",
                  border: `2px solid ${on || done ? "#3ed64c" : "#3c3c46"}`,
                  color: on || done ? "#3ed64c" : "#7d7d88",
                  boxShadow: on ? "0 0 16px rgba(62,214,76,0.7)" : "none",
                  transform: `scale(${scale})`,
                }}
              >
                {n}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const Letters: FC<{
  text: string;
  frame: number;
  fps: number;
  at: number;
  stagger?: number;
  size: number;
  weight?: number;
  color?: string;
  tracking?: string;
  font?: string;
}> = ({text, frame, fps, at, stagger = 2, size, weight = 800, color = "#fff", tracking = "-0.045em", font = "Outfit, sans-serif"}) => (
  <span style={{display: "inline-flex", fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: tracking, color, lineHeight: 0.9}}>
    {text.split("").map((ch, i) => {
      const s = pop(frame, fps, at + i * stagger, {damping: 11, stiffness: 180, mass: 0.4});
      const o = clamp(s, 0, 1);
      return (
        <span
          key={`${ch}-${i}`}
          style={{
            display: "inline-block",
            opacity: o,
            transform: `translateY(${(1 - s) * 64}px) rotate(${(1 - s) * (i % 2 === 0 ? -7 : 6)}deg) scale(${0.72 + 0.28 * s})`,
            filter: o < 0.98 ? `blur(${(1 - o) * 8}px)` : undefined,
            whiteSpace: "pre",
          }}
        >
          {ch}
        </span>
      );
    })}
  </span>
);

export const Burst: FC<{frame: number; at: number; x: number; y: number; color?: string}> = ({frame, at, x, y, color = "#3ed64c"}) => {
  const d = frame - at;
  if (d < 0 || d > 18) return null;
  const t = d / 18;
  return (
    <div style={{position: "absolute", inset: 0, pointerEvents: "none"}}>
      {Array.from({length: 14}, (_, i) => {
        const ang = (i / 14) * Math.PI * 2 + 0.2;
        const dist = 30 + t * 280 * (0.7 + (i % 3) * 0.18);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + Math.cos(ang) * dist,
              top: y + Math.sin(ang) * dist,
              width: i % 2 === 0 ? 8 : 5,
              height: i % 2 === 0 ? 8 : 14,
              borderRadius: 99,
              background: i % 4 === 0 ? "#fff" : color,
              opacity: 1 - t,
              transform: `rotate(${ang}rad)`,
            }}
          />
        );
      })}
    </div>
  );
};

export const GlassPanel: FC<{
  tone: "coffee" | "light" | "dark";
  style?: CSSProperties;
  children: ReactNode;
}> = ({tone, style, children}) => {
  const palette = {
    coffee: {bg: "rgba(16,16,19,0.94)", border: "rgba(255,255,255,0.08)", color: "#f5f5f7", shadow: "0 50px 100px rgba(0,0,0,0.55)"},
    light: {bg: "rgba(255,255,255,0.9)", border: "rgba(0,0,0,0.06)", color: "#1c1c1e", shadow: "0 40px 80px rgba(40,70,120,0.16)"},
    dark: {bg: "rgba(46,46,50,0.82)", border: "rgba(255,255,255,0.14)", color: "#f5f5f7", shadow: "0 40px 90px rgba(0,0,0,0.45)"},
  }[tone];
  return (
    <div
      style={{
        position: "absolute",
        borderRadius: 32,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        boxShadow: `${palette.shadow}, inset 0 1px 0 rgba(255,255,255,0.12)`,
        color: palette.color,
        overflow: "hidden",
        ...style,
      }}
    >
      {tone === "coffee" ? (
        <div style={{position: "absolute", left: 32, right: 32, top: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)"}} />
      ) : null}
      {children}
    </div>
  );
};
