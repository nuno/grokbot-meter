import type {FC, ReactNode} from "react";
import {AbsoluteFill, Easing, interpolate} from "remotion";
import {DB, beatPulse, downbeatPulse} from "./beats";
import {BotMark, Cup, DayRail, GlassPanel, Letters, Steam, UsageRail, blinkAt} from "./components";
import {clamp, impactScale, lerp, pop, presence} from "./motion";

const ui = "Inter, sans-serif";
const display = "Outfit, sans-serif";

export const ColdOpen: FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const p = presence(frame, 0, 0, 104, 20);
  if (!p.visible) return null;
  const pulse = downbeatPulse(frame, 16);
  const blur = p.exit * 16;
  const scale = (1 + p.exit * 0.18) * impactScale(frame, DB.logo, 0.2);
  const titleScale = impactScale(frame, DB.title, 0.08);
  return (
    <AbsoluteFill
      style={{
        opacity: p.opacity,
        filter: blur > 0.4 ? `blur(${blur}px)` : undefined,
        transform: `translateY(${-p.exit * 50}px) scale(${scale})`,
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 42%, rgba(255,236,214,${0.16 + pulse * 0.28}) 0%, rgba(62,214,76,${0.04 + pulse * 0.1}) 26%, #07070a 68%)`,
        }}
      />
      <div style={{position: "absolute", left: 0, right: 0, top: 250, display: "flex", flexDirection: "column", alignItems: "center"}}>
        <div style={{position: "relative", width: 220, height: 220}}>
          <svg width={220} height={220} style={{position: "absolute", inset: 0}}>
            <circle
              cx={110}
              cy={110}
              r={100}
              fill="none"
              stroke="#3ed64c"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray={628}
              strokeDashoffset={628 * (1 - clamp(pop(frame, fps, DB.logo, {damping: 14, stiffness: 80, mass: 0.8}), 0, 1))}
              opacity={0.85}
              style={{filter: "drop-shadow(0 0 8px #3ed64c)"}}
            />
          </svg>
          <div style={{position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", filter: `drop-shadow(0 18px 30px rgba(0,0,0,0.45))`}}>
            <BotMark size={168} blink={blinkAt(frame)} look={Math.sin(frame / 20) * 0.35} />
          </div>
        </div>
        <div style={{marginTop: 36, transform: `scale(${titleScale})`, textAlign: "center"}}>
          <Letters text="GrokBot Meter" frame={frame} fps={fps} at={46} stagger={1.4} size={104} />
          <div style={{marginTop: 22, opacity: clamp(pop(frame, fps, 78, {damping: 16, stiffness: 90, mass: 0.6}), 0, 1)}}>
            <span style={{fontFamily: ui, fontSize: 22, letterSpacing: "0.28em", textTransform: "uppercase", color: "#9a9aa4", fontWeight: 600}}>
              macOS menu bar meters
            </span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const MenuScene: FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const p = presence(frame, 108, 14, 226, 18);
  if (!p.visible) return null;
  const land = pop(frame, fps, 108, {damping: 16, stiffness: 70, mass: 0.9});
  const bar = pop(frame, fps, 114, {damping: 13, stiffness: 150, mass: 0.55});
  const fly = pop(frame, fps, 176, {damping: 13, stiffness: 70, mass: 0.85});
  const appear = pop(frame, fps, 132, {damping: 9, stiffness: 180, mass: 0.42});
  const n = Math.round(
    interpolate(frame, [140, 228], [0, 23], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    }),
  );
  const cx = lerp(1688, 960, fly);
  const cy = lerp(30, 500, fly);
  const sc = lerp(1, 4.5, fly) * (0.4 + 0.6 * clamp(appear, 0, 1));
  const beat = beatPulse(frame, 6);
  const drift = Math.sin(frame / 70) * 24;
  const headlineOut = interpolate(frame, [168, 188], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const click = frame >= 166 && frame < 186 ? (frame - 166) / 20 : -1;

  return (
    <AbsoluteFill
      style={{
        opacity: p.opacity,
        filter: p.exit > 0.02 ? `blur(${p.exit * 14}px)` : undefined,
        transform: `translateY(${(1 - p.enter) * 40 - p.exit * 30}px) scale(${1.06 - land * 0.06 + p.exit * 0.04})`,
      }}
    >
      <AbsoluteFill style={{background: "#163e86", overflow: "hidden"}}>
        <div style={{position: "absolute", width: 1500, height: 900, left: -180 + drift, top: 280, borderRadius: "50%", background: "radial-gradient(circle, #8fd0ff 0%, rgba(143,208,255,0) 68%)"}} />
        <div style={{position: "absolute", width: 1200, height: 780, right: -220 - drift * 0.4, top: -160, borderRadius: "50%", background: "radial-gradient(circle, #f6e2b8 0%, rgba(246,226,184,0) 66%)"}} />
        <div style={{position: "absolute", width: 1700, height: 520, left: -200 + drift * 0.5, bottom: -160, borderRadius: "50%", background: "#12367a", transform: "rotate(-8deg)"}} />
        <div style={{position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255,255,255,0.2), transparent 32%, rgba(6,24,68,0.28))"}} />
      </AbsoluteFill>

      <div
        style={{
          position: "absolute",
          left: 120,
          top: 300,
          opacity: 1 - headlineOut,
          transform: `translateX(${-headlineOut * 80}px)`,
        }}
      >
        <div style={{fontFamily: display, fontWeight: 800, fontSize: 92, letterSpacing: "-0.045em", color: "#102033", lineHeight: 0.92}}>
          <Letters text="One glance" frame={frame} fps={fps} at={126} stagger={1.5} size={92} color="#102033" />
        </div>
        <div style={{marginTop: 8}}>
          <Letters text="away." frame={frame} fps={fps} at={142} stagger={1.6} size={92} color="#128a32" />
        </div>
        <div style={{marginTop: 22, opacity: clamp(pop(frame, fps, 150), 0, 1), fontFamily: ui, fontSize: 28, color: "rgba(16,32,51,0.72)", fontWeight: 500}}>
          Weekly usage for Grok Bot, in the menu bar.
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 58,
          transform: `translateY(${(1 - bar) * -70}px)`,
          background: "rgba(255,255,255,0.72)",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          display: "flex",
          alignItems: "center",
          padding: "0 22px",
          gap: 18,
          fontFamily: ui,
          color: "rgba(20,20,24,0.86)",
          fontSize: 16,
          fontWeight: 500,
          backdropFilter: "blur(16px)",
        }}
      >
        <BotMark size={22} />
        <span style={{fontWeight: 750, letterSpacing: "-0.02em"}}>GrokBot Meter</span>
        {["File", "Edit", "View", "Window"].map((item) => (
          <span key={item} style={{opacity: 0.78}}>
            {item}
          </span>
        ))}
        <div style={{flex: 1}} />
        <span style={{opacity: 0.7, fontVariantNumeric: "tabular-nums"}}>Wed 11:42</span>
      </div>

      {click >= 0 ? (
        <div
          style={{
            position: "absolute",
            left: 1688,
            top: 30,
            width: 20 + click * 90,
            height: 20 + click * 90,
            marginLeft: -(10 + click * 45),
            marginTop: -(10 + click * 45),
            borderRadius: 99,
            border: "2px solid rgba(18,138,50,0.8)",
            opacity: 1 - click,
          }}
        />
      ) : null}

      {[8, 4].map((back) => {
        const flyBack = pop(frame - back, fps, 176, {damping: 13, stiffness: 70, mass: 0.85});
        if (flyBack < 0.08 || flyBack > 0.94) return null;
        const x = lerp(1688, 960, flyBack);
        const y = lerp(30, 500, flyBack);
        const s = lerp(1, 4.5, flyBack);
        return (
          <div key={back} style={{position: "absolute", left: x - 93, top: y - 24, transform: `scale(${s})`, transformOrigin: "center center", opacity: 0.16, filter: "blur(1.5px)"}}>
            <PillBody n={n} labelOpacity={0} />
          </div>
        );
      })}

      <div
        style={{
          position: "absolute",
          left: cx - 93,
          top: cy - 24,
          width: 186,
          height: 48,
          transform: `scale(${sc * (1 + beat * 0.045)})`,
          transformOrigin: "center center",
          opacity: clamp(appear, 0, 1),
        }}
      >
        <PillBody n={n} labelOpacity={clamp(fly, 0, 1)} />
      </div>
    </AbsoluteFill>
  );
};

const PillBody: FC<{n: number; labelOpacity: number}> = ({n, labelOpacity}) => (
  <div
    style={{
      width: 186,
      height: 48,
      borderRadius: 999,
      background: "#121216",
      color: "white",
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "0 14px 0 8px",
      boxShadow: "0 16px 40px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.06)",
      position: "relative",
    }}
  >
    <BotMark size={32} />
    <div style={{display: "flex", flexDirection: "column", lineHeight: 1}}>
      <span style={{fontFamily: ui, fontSize: 8, letterSpacing: "0.16em", color: "#9a9aa3", fontWeight: 650, opacity: labelOpacity}}>WEEKLY</span>
      <span style={{fontFamily: display, fontWeight: 800, fontSize: 20, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums"}}>{n}%</span>
    </div>
  </div>
);


export const CoffeeScene: FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const p = presence(frame, 226, 14, 468, 16);
  if (!p.visible) return null;
  const slam = pop(frame, fps, DB.coffee, {damping: 11, stiffness: 130, mass: 0.65});
  const cupIn = pop(frame, fps, DB.coffee + 10, {damping: 10, stiffness: 120, mass: 0.7});
  const fillT = interpolate(frame, [268, 436], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const settle = frame > 436 && frame < 468 ? Math.sin(((frame - 436) / 32) * Math.PI) * 1.8 : 0;
  const pct = 23 + (68 - 23) * fillT + settle + beatPulse(frame, 5) * (frame < 450 ? 0.6 : 0);
  const rail = interpolate(frame, [360, 430], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const dayStarts = [268, 312, 356, 400, 442];
  let day = 1;
  let dayAt = dayStarts[0];
  dayStarts.forEach((at, i) => {
    if (frame >= at) {
      day = i + 1;
      dayAt = at;
    }
  });
  const level = pct < 40 ? "small" : pct < 72 ? "regular" : "large";
  const aside = pop(frame, fps, 330, {damping: 9, stiffness: 160, mass: 0.45});
  const wobble = Math.sin(frame * 0.32) * 0.45 + beatPulse(frame, 6) * 1.1;
  const blur = (1 - p.enter) * 8 + p.exit * 12;
  const resets = day <= 2 ? "6d" : day === 3 ? "4d" : "3d";

  return (
    <AbsoluteFill style={{opacity: p.opacity, filter: blur > 0.4 ? `blur(${blur}px)` : undefined}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(90% 70% at 70% 38%, rgba(255,214,170,${0.16 + beatPulse(frame) * 0.1}) 0%, rgba(62,214,76,0.05) 28%, #07070a 70%)`,
        }}
      />
      <GlassPanel
        tone="coffee"
        style={{
          left: 240,
          top: 90,
          width: 1440,
          height: 900,
          overflow: "visible",
          transform: `translateY(${(1 - slam) * 80}px) rotate(${(1 - slam) * -2.4}deg) scale(${0.9 + slam * 0.1})`,
          opacity: clamp(slam + 0.2, 0, 1),
        }}
      >
        <div style={{position: "absolute", left: 80, top: 78}}>
          <div style={{display: "flex", alignItems: "center", gap: 10, color: "#8d8d96", letterSpacing: "0.18em", fontFamily: ui, fontSize: 16, fontWeight: 700}}>
            <CalIcon />
            WEEKLY
          </div>
          <div
            style={{
              marginTop: 8,
              fontFamily: display,
              fontWeight: 800,
              fontSize: 168,
              letterSpacing: "-0.05em",
              lineHeight: 0.86,
              fontVariantNumeric: "tabular-nums",
              transform: `scale(${impactScale(frame, DB.coffee, 0.06)})`,
              textShadow: `0 0 ${18 + beatPulse(frame) * 16}px rgba(62,214,76,0.25)`,
            }}
          >
            {Math.round(pct)}%
          </div>
          <div style={{marginTop: 18, fontFamily: ui, fontSize: 28, color: "#d0d0d6", fontWeight: 600}}>Resets in {resets}</div>
          <div style={{marginTop: 8, fontFamily: ui, fontSize: 18, color: "#7d7d88"}}>Updated 11:40 AM</div>
          <div
            style={{
              marginTop: 36,
              display: "flex",
              alignItems: "center",
              gap: 14,
              opacity: clamp(aside, 0, 1),
              transform: `translateY(${(1 - aside) * 16}px) scale(${0.9 + 0.1 * clamp(aside, 0, 1)})`,
            }}
          >
            <div style={{width: 54, height: 54, borderRadius: 99, border: "1.5px solid rgba(180,190,220,0.45)", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03))", position: "relative"}}>
              <CupGlyphSmall />
              <div style={{position: "absolute", width: 46, height: 2, background: "#e8323c", transform: "rotate(-42deg)"}} />
            </div>
            <div style={{fontFamily: ui, fontSize: 18, color: "#8d8d96", width: 90, lineHeight: 1.25}}>no spend limit</div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 900,
            top: 24,
            width: 500,
            height: 480,
            transform: `translateY(${(1 - cupIn) * 90}px) scale(${0.84 + cupIn * 0.16}) rotate(${(1 - cupIn) * -6}deg)`,
          }}
        >
          <div style={{position: "absolute", left: 40, right: 40, top: 40, bottom: 0, background: "radial-gradient(ellipse at center, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.05) 42%, transparent 70%)"}} />
          <Steam frame={frame} strength={clamp((pct - 18) / 40, 0, 1)} />
          <Cup uid="hero" pct={pct} wobble={wobble} sheen={frame * 1.4} />
        </div>

        <div style={{position: "absolute", left: 90, right: 90, bottom: 54, display: "flex", flexDirection: "column", gap: 18, opacity: rail}}>
          <UsageRail frame={frame} width={1260} reveal={rail} puck={clamp(pct / 100, 0, 1)} active={level} />
          <DayRail frame={frame} fps={fps} width={1260} reveal={rail} active={day} activeAt={dayAt} />
        </div>
      </GlassPanel>
    </AbsoluteFill>
  );
};

const CalIcon: FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
    <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" fill="none" strokeWidth="1.4" />
    <path d="M2 6.5 H14 M5 2 V4.5 M11 2 V4.5" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

const CupGlyphSmall: FC = () => (
  <svg width="22" height="22" viewBox="0 0 16 16" aria-hidden>
    <path d="M3 3.2 H13 L11.6 10 Q11 12 9.2 12 H6.8 Q5 12 4.4 10 Z" fill="#d7d7de" />
  </svg>
);

type Tone = "light" | "dark" | "coffee";

export const ThemeScene: FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const p = presence(frame, 470, 12, 648, 16);
  if (!p.visible) return null;
  const tone: Tone = frame < DB.themeDark ? "light" : frame < DB.themeCoffee ? "dark" : "coffee";
  const phaseStart = tone === "light" ? DB.drop : tone === "dark" ? DB.themeDark : DB.themeCoffee;
  const slam = pop(frame, fps, phaseStart, {damping: 9, stiffness: 170, mass: 0.48});
  const local = frame - phaseStart;
  const whip = local < 8 ? (8 - local) * 1.4 : 0;
  const bg =
    tone === "light"
      ? "linear-gradient(180deg, #f4f7fb 0%, #dfe7f2 100%)"
      : tone === "dark"
        ? "linear-gradient(180deg, #323236 0%, #1a1a1e 100%)"
        : "radial-gradient(100% 80% at 50% 0%, #191920 0%, #07070a 62%)";
  const fg = tone === "light" ? "#1c1c1e" : "#f5f5f7";
  const muted = tone === "light" ? "rgba(60,60,67,0.62)" : "#9a9aa4";
  const bar = pop(frame, fps, phaseStart + 2, {damping: 12, stiffness: 140, mass: 0.5});
  const chipFloat = (i: number) => Math.sin((frame + i * 22) / 11) * 8;

  return (
    <AbsoluteFill
      style={{
        opacity: p.opacity,
        background: bg,
        color: fg,
        filter: whip > 0.4 || p.exit > 0.05 ? `blur(${whip + p.exit * 10}px)` : undefined,
        transform: `scale(${1 + (1 - p.enter) * 0.08})`,
      }}
    >
      <div style={{position: "absolute", top: 36, left: 48, display: "flex", gap: 14, alignItems: "center", fontFamily: ui, fontSize: 22, opacity: clamp(slam, 0, 1)}}>
        <span style={{padding: "8px 16px", borderRadius: 12, border: `1px solid ${tone === "light" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.16)"}`, background: tone === "light" ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.06)"}}>‹ Back</span>
        <span style={{fontWeight: 750}}>Settings</span>
      </div>

      <GlassPanel
        tone={tone === "coffee" ? "coffee" : tone}
        style={{
          left: 470,
          top: 110,
          width: 980,
          height: 560,
          transform: `translateX(${(1 - slam) * 90}px) scale(${0.94 + clamp(slam, 0, 1) * 0.06})`,
          opacity: clamp(slam + 0.15, 0, 1),
        }}
      >
        <div style={{padding: "36px 48px"}}>
          <div style={{display: "flex", justifyContent: "space-between", alignItems: "baseline"}}>
            <span style={{fontFamily: ui, letterSpacing: "0.16em", fontSize: 16, fontWeight: 700, color: muted}}>WEEKLY</span>
            <span style={{fontFamily: display, fontWeight: 800, fontSize: 72, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums"}}>68%</span>
          </div>
          {tone === "coffee" ? (
            <div style={{position: "relative", height: 360, marginTop: 10}}>
              <div style={{position: "absolute", left: "50%", top: 10, width: 280, height: 270, transform: `translateX(-50%) scale(${0.86 + clamp(slam, 0, 1) * 0.14})`}}>
                <Steam frame={frame} strength={0.8} />
                <Cup uid="theme" pct={68} wobble={Math.sin(frame * 0.3) * 0.4} sheen={frame * 1.6} />
              </div>
              <div style={{position: "absolute", left: 0, bottom: 20, fontFamily: ui, fontSize: 20, color: muted, maxWidth: 280}}>
                The cup fills to your weekly usage.
              </div>
            </div>
          ) : (
            <div style={{marginTop: 28}}>
              <div style={{height: 18, borderRadius: 99, background: tone === "light" ? "rgba(120,120,128,0.16)" : "rgba(255,255,255,0.12)", overflow: "hidden"}}>
                <div style={{width: `${68 * clamp(bar, 0, 1)}%`, height: "100%", borderRadius: 99, background: tone === "light" ? "linear-gradient(90deg,#007AFF,#4da2ff)" : "linear-gradient(90deg,#0A84FF,#7cc0ff)", boxShadow: "0 0 18px rgba(10,132,255,0.55)"}} />
              </div>
              <div style={{marginTop: 22, fontFamily: ui, fontSize: 26, fontWeight: 600}}>Resets in 3d</div>
              <div style={{marginTop: 28, height: 1, background: tone === "light" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.1)"}} />
              <div style={{marginTop: 22, display: "flex", justifyContent: "space-between", fontFamily: ui, fontSize: 22}}>
                <span style={{letterSpacing: "0.12em", fontSize: 15, fontWeight: 700, color: muted}}>ON-DEMAND</span>
                <span>No spend limit</span>
              </div>
              <div style={{marginTop: 36, fontFamily: ui, fontSize: 18, color: muted}}>Updated 11:40 AM</div>
            </div>
          )}
        </div>
      </GlassPanel>

      <div style={{position: "absolute", left: 0, right: 0, top: 700, display: "flex", justifyContent: "center", gap: 28}}>
        <ThemeChip title="System" selected={tone !== "coffee"} frame={frame} fps={fps} at={DB.drop} float={chipFloat(0)} tone={tone}>
          <SystemThumb />
        </ThemeChip>
        <ThemeChip title="Coffee" selected={tone === "coffee"} frame={frame} fps={fps} at={DB.themeCoffee} float={chipFloat(1)} tone={tone}>
          <div style={{width: 92, height: 88, margin: "0 auto"}}>
            <Cup uid="chip" pct={52} sheen={20} />
          </div>
        </ThemeChip>
      </div>
    </AbsoluteFill>
  );
};

const ThemeChip: FC<{
  title: string;
  selected: boolean;
  frame: number;
  fps: number;
  at: number;
  float: number;
  tone: Tone;
  children: ReactNode;
}> = ({title, selected, frame, fps, at, float, tone, children}) => {
  const intro = pop(frame, fps, at, {damping: 10, stiffness: 150, mass: 0.5});
  const selectPop = selected ? impactScale(frame, at, 0.08) : 1;
  const border = selected ? "#3ed64c" : tone === "light" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.16)";
  const bg = tone === "light" ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.05)";
  return (
    <div
      style={{
        width: 340,
        height: 210,
        borderRadius: 24,
        border: `2px solid ${border}`,
        background: bg,
        boxShadow: selected ? "0 0 0 4px rgba(62,214,76,0.18), 0 20px 40px rgba(0,0,0,0.18)" : "0 16px 30px rgba(0,0,0,0.12)",
        transform: `translateY(${float + (1 - clamp(intro, 0, 1)) * 40}px) rotate(${float * 0.15}deg) scale(${(0.92 + 0.08 * clamp(intro, 0, 1)) * selectPop})`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        color: tone === "light" ? "#1c1c1e" : "#f5f5f7",
      }}
    >
      <div style={{height: 110, display: "flex", alignItems: "center"}}>{children}</div>
      <div style={{fontFamily: ui, fontWeight: 700, fontSize: 22}}>{title}</div>
    </div>
  );
};

const SystemThumb: FC = () => (
  <div style={{width: 168, height: 96, borderRadius: 12, overflow: "hidden", display: "flex", boxShadow: "0 8px 16px rgba(0,0,0,0.18)"}}>
    <div style={{flex: 1, background: "#f4f5f7", display: "flex", alignItems: "flex-end", padding: 10}}>
      <div style={{height: 8, width: "80%", borderRadius: 99, background: "linear-gradient(90deg,#007AFF 70%, rgba(120,120,128,0.2) 70%)"}} />
    </div>
    <div style={{flex: 1, background: "#2c2c30", display: "flex", alignItems: "flex-end", padding: 10}}>
      <div style={{height: 8, width: "80%", borderRadius: 99, background: "linear-gradient(90deg,#0A84FF 70%, rgba(255,255,255,0.15) 70%)"}} />
    </div>
  </div>
);

const AGENTS = [
  {name: "Research Bot", count: 5, time: "09:14 PM"},
  {name: "Deploy Watcher", count: 6, time: "06:54 PM"},
  {name: "Design Notes", count: 4, time: "04:54 PM"},
];

const RECENT = [
  {name: "QA Pass", date: "Sep 23"},
  {name: "Clip Notes", date: "Sep 3"},
];

export const TodayScene: FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const p = presence(frame, 648, 14, 766, 20);
  if (!p.visible) return null;
  const panel = pop(frame, fps, DB.today, {damping: 12, stiffness: 140, mass: 0.6});
  const counts = AGENTS.map((a, i) =>
    Math.round(
      interpolate(frame, [676 + i * 8, 748 + i * 6], [0, a.count], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    ),
  );
  const total = counts.reduce((s, n) => s + n, 0);
  const caption = interpolate(frame, [706, 736], [100, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});

  return (
    <AbsoluteFill
      style={{
        opacity: p.opacity,
        filter: p.exit > 0.04 ? `blur(${p.exit * 12}px)` : undefined,
        transform: `translateY(${(1 - p.enter) * 24 - p.exit * 20}px)`,
      }}
    >
      <AbsoluteFill style={{background: "radial-gradient(80% 60% at 50% 18%, #16161c 0%, #07070a 70%)"}} />
      <WhipText frame={frame} at={668} text="menu bar meters" y={150} />
      <WhipText frame={frame} at={736} text="official data" y={150} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 300,
          textAlign: "center",
          fontFamily: ui,
          fontSize: 28,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#d7d7de",
          fontWeight: 650,
          clipPath: `inset(0 ${caption}% 0 0)`,
        }}
      >
        menu bar meters · official data
      </div>

      <GlassPanel
        tone="coffee"
        style={{
          left: 390,
          top: 370,
          width: 1140,
          height: 640,
          transform: `translateY(${(1 - panel) * 60}px) scale(${0.94 + clamp(panel, 0, 1) * 0.06})`,
          opacity: clamp(panel + 0.1, 0, 1),
        }}
      >
        <div style={{padding: "28px 36px 10px", display: "flex", alignItems: "center", justifyContent: "space-between"}}>
          <div style={{display: "flex", alignItems: "center", gap: 10, letterSpacing: "0.16em", fontFamily: ui, fontSize: 16, fontWeight: 700, color: "#b5b5bd"}}>
            <ClockIcon /> TODAY
          </div>
          <div style={{fontFamily: display, fontWeight: 800, fontSize: 42, fontVariantNumeric: "tabular-nums"}}>
            {total}
            <span style={{fontSize: 20, marginLeft: 6, color: "#9a9aa4", fontFamily: ui, fontWeight: 600}}>msg</span>
          </div>
        </div>
        <div style={{padding: "0 36px 8px", fontFamily: ui, fontSize: 20, color: "#c8c8d0"}}>{total} messages · 3 agents</div>
        <div style={{margin: "8px 28px 0", height: 1, background: "#1e1e24"}} />
        {AGENTS.map((a, i) => {
          const s = pop(frame, fps, 674 + i * 7, {damping: 10, stiffness: 160, mass: 0.45});
          const badge = pop(frame, fps, 690 + i * 7, {damping: 8, stiffness: 200, mass: 0.35});
          return (
            <div
              key={a.name}
              style={{
                margin: "0 28px",
                height: 78,
                display: "flex",
                alignItems: "center",
                gap: 16,
                borderBottom: "1px solid #1e1e24",
                fontFamily: ui,
                transform: `translateX(${(1 - clamp(s, 0, 1)) * 50}px)`,
                opacity: clamp(s, 0, 1),
              }}
            >
              <div style={{width: 12, height: 12, borderRadius: 99, background: "#3ed64c", boxShadow: "0 0 10px #3ed64c"}} />
              <div style={{flex: 1, fontSize: 26, fontWeight: 650}}>{a.name}</div>
              <div
                style={{
                  minWidth: 36,
                  height: 32,
                  padding: "0 10px",
                  borderRadius: 99,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(180deg,#62e070,#2fbe3e)",
                  color: "#0b2a10",
                  fontWeight: 800,
                  fontVariantNumeric: "tabular-nums",
                  transform: `scale(${0.4 + 0.6 * clamp(badge, 0, 1.15)})`,
                }}
              >
                {counts[i]}
              </div>
              <div style={{width: 110, textAlign: "right", color: "#9a9aa4", fontSize: 18, fontVariantNumeric: "tabular-nums"}}>{a.time}</div>
            </div>
          );
        })}
        <div style={{padding: "16px 36px 6px", fontFamily: ui, fontSize: 14, letterSpacing: "0.14em", color: "#7d7d88", fontWeight: 700}}>RECENT</div>
        {RECENT.map((r, i) => {
          const s = pop(frame, fps, 730 + i * 8, {damping: 12, stiffness: 140, mass: 0.5});
          return (
            <div key={r.name} style={{margin: "0 28px", height: 58, display: "flex", alignItems: "center", gap: 16, borderTop: i === 0 ? "none" : "1px solid #1e1e24", fontFamily: ui, opacity: clamp(s, 0, 1), transform: `translateX(${(1 - s) * 30}px)`}}>
              <div style={{width: 12, height: 12, borderRadius: 99, background: "#5c5c66"}} />
              <div style={{flex: 1, fontSize: 22, color: "#c8c8d0"}}>{r.name}</div>
              <div style={{color: "#8d8d96", fontSize: 18}}>{r.date}</div>
            </div>
          );
        })}
      </GlassPanel>
    </AbsoluteFill>
  );
};

const WhipText: FC<{frame: number; at: number; text: string; y: number}> = ({frame, at, text, y}) => {
  const d = frame - at;
  if (d < 0 || d > 26) return null;
  const t = interpolate(d, [0, 22], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic)});
  const x = lerp(-1100, 1500, t);
  const o = Math.sin(Math.min(t, 1) * Math.PI);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        fontFamily: display,
        fontWeight: 800,
        fontSize: 132,
        letterSpacing: "-0.05em",
        whiteSpace: "nowrap",
        color: "white",
        opacity: o,
        filter: `blur(${Math.sin(t * Math.PI) * 6}px)`,
        textTransform: "lowercase",
      }}
    >
      {text}
    </div>
  );
};

const ClockIcon: FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
    <circle cx="8" cy="8" r="6" stroke="currentColor" fill="none" strokeWidth="1.4" />
    <path d="M8 4.8 V8 L10.2 9.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export const EndScene: FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const p = presence(frame, 768, 14, 900, 1);
  if (!p.visible) return null;
  const bot = pop(frame, fps, DB.end, {damping: 9, stiffness: 120, mass: 0.6});
  const title = pop(frame, fps, 794, {damping: 11, stiffness: 150, mass: 0.5});
  const sub = pop(frame, fps, 808, {damping: 14, stiffness: 120, mass: 0.55});
  const meta = pop(frame, fps, 820, {damping: 12, stiffness: 140, mass: 0.5});
  const url = pop(frame, fps, 832, {damping: 13, stiffness: 130, mass: 0.5});
  const breathe = 1 + Math.sin(frame / 16) * 0.012;
  const ring = clamp(pop(frame, fps, DB.end, {damping: 16, stiffness: 60, mass: 0.9}), 0, 1);
  const pulse = downbeatPulse(frame, 12);

  return (
    <AbsoluteFill style={{opacity: p.opacity}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 46%, rgba(255,228,196,${0.18 + pulse * 0.16}) 0%, rgba(62,214,76,0.06) 30%, #07070a 70%)`,
        }}
      />
      {Array.from({length: 12}, (_, i) => {
        const t = ((frame * 0.35 + i * 18) % 220) / 220;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 180 + ((i * 157) % 1560),
              top: 980 - t * 1100,
              width: 3,
              height: 3,
              borderRadius: 99,
              background: "rgba(255,255,255,0.45)",
              opacity: Math.sin(t * Math.PI) * 0.45,
            }}
          />
        );
      })}
      <div style={{position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: `translateY(${(1 - p.enter) * 28}px) scale(${breathe})`}}>
        <div style={{position: "relative", width: 230, height: 230, transform: `scale(${0.6 + 0.4 * bot})`}}>
          <svg width={230} height={230} style={{position: "absolute", inset: 0}}>
            <circle cx={115} cy={115} r={104} fill="none" stroke="#3ed64c" strokeWidth={2.5} strokeLinecap="round" strokeDasharray={654} strokeDashoffset={654 * (1 - ring)} opacity={0.9} style={{filter: "drop-shadow(0 0 8px #3ed64c)"}} />
          </svg>
          <div style={{position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center"}}>
            <BotMark size={168} blink={blinkAt(frame)} look={Math.sin(frame / 24) * 0.3} />
          </div>
        </div>
        <div style={{marginTop: 28, transform: `translateY(${(1 - title) * 28}px)`, opacity: clamp(title, 0, 1)}}>
          <div style={{fontFamily: display, fontWeight: 800, fontSize: 92, letterSpacing: "-0.045em", lineHeight: 0.95}}>GrokBot Meter</div>
          <div style={{height: 3, marginTop: 10, borderRadius: 99, background: "#3ed64c", transform: `scaleX(${clamp(title, 0, 1)})`, transformOrigin: "left", boxShadow: "0 0 12px #3ed64c"}} />
        </div>
        <div style={{marginTop: 18, opacity: clamp(sub, 0, 1), transform: `translateY(${(1 - sub) * 16}px)`, fontFamily: ui, fontSize: 26, color: "#b5b5bd"}}>
          menu bar meters for Grok Bot
        </div>
        <div style={{marginTop: 26, display: "flex", gap: 14, alignItems: "center", opacity: clamp(meta, 0, 1), transform: `translateY(${(1 - meta) * 14}px)`}}>
          <span style={{fontFamily: ui, fontWeight: 800, fontSize: 18, letterSpacing: "0.14em", color: "#3ed64c", border: "1px solid rgba(62,214,76,0.55)", borderRadius: 999, padding: "6px 12px"}}>MIT</span>
          <span style={{fontFamily: ui, fontSize: 22, color: "#d0d0d6"}}>open source</span>
        </div>
        <div style={{marginTop: 18, opacity: clamp(url, 0, 1), transform: `translateY(${(1 - url) * 12}px)`, fontFamily: ui, fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em"}}>
          github.com/nuno/grokbot-meter
        </div>
      </div>
      <div style={{position: "absolute", left: 0, right: 0, bottom: 36, textAlign: "center", fontFamily: ui, fontSize: 16, color: "#6e6e78", opacity: clamp(url, 0, 1)}}>
        Music: Voltaic by Kevin MacLeod (incompetech.com) · CC BY 4.0
      </div>
    </AbsoluteFill>
  );
};
