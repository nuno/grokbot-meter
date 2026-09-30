import type {FC} from "react";
import {AbsoluteFill, Easing, interpolate} from "remotion";
import {DB, beatPulse, downbeatPulse} from "./beats";
import {BotMark, Cup, DayRail, Steam, UsageRail, blinkAt} from "./components";
import {clamp, impactScale, lerp, pop} from "./motion";

const ui = "Inter, sans-serif";
const display = "Outfit, sans-serif";

type Tone = "coffee" | "light" | "dark";

function toneAt(frame: number): Tone {
  if (frame >= DB.settings && frame < DB.themeDark) return "light";
  if (frame >= DB.themeDark && frame < DB.themeCoffee) return "dark";
  return "coffee";
}

const AGENTS = [
  {name: "ClipToGo · UX/UI Research", count: 5, time: "09:14 PM"},
  {name: "Research Bot", count: 4, time: "06:54 PM"},
  {name: "Deploy Watcher", count: 3, time: "04:54 PM"},
];

export const Demo: FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const pulse = downbeatPulse(frame, 14);
  const windowIn = pop(frame, fps, DB.open, {damping: 13, stiffness: 120, mass: 0.72});
  const windowOut = interpolate(frame, [736, 776], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const showWindow = frame >= DB.open - 4 && windowOut < 0.98;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{background: "#07070a"}} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 42%, rgba(255,226,196,${0.16 + pulse * 0.12}) 0%, rgba(62,214,76,${0.035 + pulse * 0.04}) 26%, rgba(7,7,10,0) 68%)`,
        }}
      />
      <Tray frame={frame} fps={fps} dim={windowOut} />
      {showWindow ? <AppWindow frame={frame} fps={fps} open={windowIn} out={windowOut} /> : null}
      <Cursor frame={frame} />
      <EndCard frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};

const Tray: FC<{frame: number; fps: number; dim: number}> = ({frame, fps, dim}) => {
  const bar = pop(frame, fps, DB.tray, {damping: 14, stiffness: 140, mass: 0.6});
  const pill = pop(frame, fps, DB.pill, {damping: 9, stiffness: 170, mass: 0.45});
  const n = Math.round(
    interpolate(frame, [DB.pill, DB.open - 6], [0, 68], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    }),
  );
  const pressed = frame >= DB.open - 4 && frame < DB.open + 6;
  const caption = interpolate(frame, [DB.open, DB.open + 18], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const beat = beatPulse(frame, 6);

  return (
    <div style={{position: "absolute", left: 0, right: 0, top: 28, display: "flex", flexDirection: "column", alignItems: "center", opacity: (1 - dim) * clamp(bar, 0, 1), transform: `translateY(${(1 - bar) * -36}px)`}}>
      <div style={{fontFamily: ui, fontSize: 13, letterSpacing: "0.22em", fontWeight: 700, color: "#8d8d96", marginBottom: 10, opacity: caption}}>
        MENU BAR
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          height: 64,
          padding: "0 18px 0 10px",
          borderRadius: 999,
          background: "#141418",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: `0 16px 40px rgba(0,0,0,0.45), 0 0 ${18 + beat * 16}px rgba(62,214,76,0.18)`,
          transform: `scale(${(0.7 + 0.3 * clamp(pill, 0, 1)) * (pressed ? 0.94 : 1) * (1 + beat * 0.035)})`,
        }}
      >
        <BotMark size={40} blink={blinkAt(frame)} />
        <div style={{display: "flex", flexDirection: "column", lineHeight: 1}}>
          <span style={{fontFamily: ui, fontSize: 11, letterSpacing: "0.16em", color: "#8d8d96", fontWeight: 700}}>WEEKLY</span>
          <span style={{fontFamily: display, fontWeight: 800, fontSize: 28, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums", marginTop: 3}}>{n}%</span>
        </div>
      </div>
      <div style={{marginTop: 12, fontFamily: ui, fontSize: 20, color: "#c8c8d0", opacity: caption * clamp(pop(frame, fps, DB.pill + 8), 0, 1)}}>
        Weekly usage, one glance in the menu bar.
      </div>
    </div>
  );
};

const Cursor: FC<{frame: number}> = ({frame}) => {
  if (frame < 78 || frame > 156) return null;
  const t = interpolate(frame, [78, 114], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.4, 0, 0.2, 1)});
  const x = lerp(1280, 988, t);
  const y = lerp(420, 74, t);
  const click = frame >= 116 && frame < 128 ? (frame - 116) / 12 : -1;
  return (
    <>
      {click >= 0 ? (
        <div
          style={{
            position: "absolute",
            left: 996,
            top: 78,
            width: 18 + click * 70,
            height: 18 + click * 70,
            marginLeft: -(9 + click * 35),
            marginTop: -(9 + click * 35),
            borderRadius: 99,
            border: "2px solid rgba(62,214,76,0.9)",
            opacity: 1 - click,
          }}
        />
      ) : null}
      <svg width="32" height="32" viewBox="0 0 24 24" style={{position: "absolute", left: x, top: y, filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.55))"}}>
        <path d="M5 3.2 L5.2 18.2 L9.4 14.4 L12.6 20.2 L15 19 L11.8 13.2 L17.2 12.8 Z" fill="#fff" stroke="#1a1a1e" strokeWidth="1.2" />
      </svg>
    </>
  );
};

const AppWindow: FC<{frame: number; fps: number; open: number; out: number}> = ({frame, fps, open, out}) => {
  const tone = toneAt(frame);
  const view = frame < DB.today ? "weekly" : frame < DB.settings ? "today" : "settings";
  const local = frame - (tone === "light" ? DB.settings : tone === "dark" ? DB.themeDark : DB.themeCoffee);
  const whip = view === "settings" && local >= 0 && local < 8 ? (8 - local) * 1.1 : 0;
  const bg = tone === "light" ? "#f3f4f6" : tone === "dark" ? "#1c1c1e" : "#0e0e12";
  const fg = tone === "light" ? "#1c1c1e" : "#f5f5f7";
  const scale = 0.86 + 0.14 * clamp(open, 0, 1.08);
  const beat = beatPulse(frame, 5);

  return (
    <div
      style={{
        position: "absolute",
        left: 560,
        top: 168,
        width: 800,
        height: 820,
        borderRadius: 28,
        background: bg,
        color: fg,
        border: `1px solid ${tone === "light" ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)"}`,
        boxShadow: "0 40px 90px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12)",
        overflow: "hidden",
        opacity: clamp(open, 0, 1) * (1 - out),
        transform: `translateY(${(1 - clamp(open, 0, 1)) * 46 - out * 24}px) scale(${scale * (1 + beat * 0.008)})`,
        transformOrigin: "50% 0%",
        filter: whip > 0.4 ? `blur(${whip}px)` : undefined,
      }}
    >
      {tone === "coffee" ? (
        <div style={{position: "absolute", left: 28, right: 28, top: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)"}} />
      ) : null}
      <WindowHeader frame={frame} fps={fps} tone={tone} view={view} />
      {view === "weekly" ? <WeeklyBody frame={frame} fps={fps} /> : null}
      {view === "today" ? <TodayBody frame={frame} fps={fps} /> : null}
      {view === "settings" ? <SettingsBody frame={frame} fps={fps} tone={tone} /> : null}
      {view !== "settings" ? <Footer tone={tone} frame={frame} /> : null}
    </div>
  );
};

const WindowHeader: FC<{frame: number; fps: number; tone: Tone; view: string}> = ({frame, fps, tone, view}) => {
  const gear = pop(frame, fps, DB.settings, {damping: 8, stiffness: 180, mass: 0.4});
  const fg = tone === "light" ? "#1c1c1e" : "#f5f5f7";
  const muted = tone === "light" ? "rgba(60,60,67,0.55)" : "#8d8d96";
  const chipBg = tone === "light" ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)";
  return (
    <div style={{height: 64, display: "flex", alignItems: "center", padding: "0 18px", gap: 10, color: fg}}>
      {view === "settings" ? (
        <div style={{display: "flex", alignItems: "center", gap: 12, fontFamily: ui, fontSize: 18}}>
          <span style={{padding: "6px 12px", borderRadius: 10, background: chipBg, border: `1px solid ${tone === "light" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.14)"}`}}>‹ Back</span>
          <span style={{fontWeight: 750}}>Settings</span>
        </div>
      ) : (
        <div style={{display: "flex", alignItems: "center", gap: 8, fontFamily: ui, fontWeight: 750, fontSize: 20}}>
          <BotMark size={26} />
          GrokBot Meter
        </div>
      )}
      <div style={{flex: 1}} />
      {view !== "settings" ? (
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: chipBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: muted,
            transform: `scale(${frame >= DB.settings - 8 && frame < DB.settings + 10 ? 0.86 + clamp(gear, 0, 1) * 0.2 : 1})`,
            border: frame >= DB.settings - 10 && frame < DB.settings ? "1px solid #3ed64c" : "1px solid transparent",
          }}
        >
          <Gear />
        </div>
      ) : null}
      <div style={{width: 34, height: 34, borderRadius: 10, background: chipBg, display: "flex", alignItems: "center", justifyContent: "center", color: muted, fontSize: 18}}>×</div>
    </div>
  );
};

const Gear: FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
    <circle cx="8" cy="8" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
    <path d="M8 1.6 V3.2 M8 12.8 V14.4 M1.6 8 H3.2 M12.8 8 H14.4 M3.2 3.2 L4.4 4.4 M11.6 11.6 L12.8 12.8 M12.8 3.2 L11.6 4.4 M4.4 11.6 L3.2 12.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const WeeklyBody: FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const fillT = interpolate(frame, [DB.fill, 390], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const bump = frame > 390 && frame < 422 ? Math.sin(((frame - 390) / 32) * Math.PI) * 1.6 : 0;
  const pct = 68 * fillT + bump;
  const shown = Math.round(clamp(pct, 0, 100));
  const rail = interpolate(frame, [300, 380], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const cupIn = pop(frame, fps, DB.open + 8, {damping: 11, stiffness: 130, mass: 0.6});
  const dayStarts = [DB.fill, 240, 290, 340, 386];
  let day = 1;
  let dayAt = dayStarts[0];
  dayStarts.forEach((at, i) => {
    if (frame >= at) {
      day = i + 1;
      dayAt = at;
    }
  });
  const level = pct < 34 ? "small" : pct < 62 ? "regular" : "large";
  const resets = day <= 2 ? "6d" : day === 3 ? "4d" : "3d";
  const wobble = Math.sin(frame * 0.33) * 0.4 + beatPulse(frame, 6) * 0.9;

  return (
    <div style={{padding: "4px 28px 0", height: 690}}>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-end"}}>
        <div>
          <div style={{display: "flex", alignItems: "center", gap: 8, color: "#8d8d96", letterSpacing: "0.16em", fontFamily: ui, fontSize: 14, fontWeight: 700}}>
            <Cal /> WEEKLY
          </div>
          <div style={{fontFamily: display, fontWeight: 800, fontSize: 92, letterSpacing: "-0.05em", lineHeight: 0.9, fontVariantNumeric: "tabular-nums", marginTop: 4, transform: `scale(${impactScale(frame, DB.open, 0.04)})`}}>
            {shown}%
          </div>
          <div style={{marginTop: 8, fontFamily: ui, fontSize: 20, color: "#d0d0d6", fontWeight: 600}}>Resets in {resets}</div>
        </div>
        <div style={{fontFamily: ui, fontSize: 16, color: "#7d7d88", textAlign: "right", maxWidth: 180, lineHeight: 1.35}}>
          The cup fills to your weekly usage.
        </div>
      </div>
      <div style={{position: "relative", height: 300, marginTop: 6, transform: `translateY(${(1 - cupIn) * 36}px) scale(${0.9 + 0.1 * clamp(cupIn, 0, 1)})`}}>
        <div style={{position: "absolute", left: "50%", top: 10, width: 280, height: 270, marginLeft: -140}}>
          <div style={{position: "absolute", inset: -20, background: "radial-gradient(ellipse at center, rgba(255,255,255,0.22), transparent 68%)"}} />
          <Steam frame={frame} strength={clamp((pct - 12) / 40, 0, 1)} />
          <Cup uid="demo" pct={pct} wobble={wobble} sheen={frame * 1.3} />
        </div>
      </div>
      <div style={{opacity: rail, display: "flex", flexDirection: "column", gap: 8, alignItems: "center"}}>
        <UsageRail frame={frame} width={720} reveal={rail} puck={clamp(pct / 100, 0, 1)} active={level} />
        <DayRail frame={frame} fps={fps} width={720} reveal={rail} active={day} activeAt={dayAt} />
      </div>
    </div>
  );
};

const Cal: FC = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
    <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" fill="none" strokeWidth="1.4" />
    <path d="M2 6.5 H14 M5 2 V4.5 M11 2 V4.5" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

const TodayBody: FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const head = pop(frame, fps, DB.today, {damping: 12, stiffness: 150, mass: 0.5});
  const counts = AGENTS.map((a, i) =>
    Math.round(
      interpolate(frame, [DB.today + 8 + i * 6, DB.today + 46 + i * 4], [0, a.count], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    ),
  );
  const total = counts.reduce((s, n) => s + n, 0);
  return (
    <div style={{padding: "0 22px", opacity: clamp(head, 0, 1), transform: `translateY(${(1 - clamp(head, 0, 1)) * 28}px)`}}>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0 8px 8px"}}>
        <div style={{fontFamily: ui, letterSpacing: "0.16em", fontSize: 14, fontWeight: 700, color: "#b5b5bd"}}>TODAY</div>
        <div style={{fontFamily: display, fontWeight: 800, fontSize: 36, fontVariantNumeric: "tabular-nums"}}>
          {total}
          <span style={{fontFamily: ui, fontSize: 16, marginLeft: 6, color: "#9a9aa4", fontWeight: 600}}>msg</span>
        </div>
      </div>
      <div style={{padding: "0 8px 10px", fontFamily: ui, fontSize: 18, color: "#c8c8d0"}}>{total} messages · 3 agents</div>
      {AGENTS.map((a, i) => {
        const s = pop(frame, fps, DB.today + 6 + i * 7, {damping: 10, stiffness: 160, mass: 0.45});
        const badge = pop(frame, fps, DB.today + 16 + i * 7, {damping: 8, stiffness: 200, mass: 0.35});
        return (
          <div key={a.name} style={{height: 72, display: "flex", alignItems: "center", gap: 14, margin: "0 8px", borderTop: "1px solid #1e1e24", fontFamily: ui, opacity: clamp(s, 0, 1), transform: `translateX(${(1 - clamp(s, 0, 1)) * 36}px)`}}>
            <div style={{width: 10, height: 10, borderRadius: 99, background: "#3ed64c", boxShadow: "0 0 8px #3ed64c"}} />
            <div style={{flex: 1, fontSize: 22, fontWeight: 650}}>{a.name}</div>
            <div style={{minWidth: 32, height: 28, padding: "0 8px", borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg,#62e070,#2fbe3e)", color: "#0b2a10", fontWeight: 800, transform: `scale(${0.5 + 0.5 * clamp(badge, 0, 1.1)})`}}>
              {counts[i]}
            </div>
            <div style={{width: 96, textAlign: "right", color: "#9a9aa4", fontSize: 15, fontVariantNumeric: "tabular-nums"}}>{a.time}</div>
          </div>
        );
      })}
      <div style={{padding: "16px 8px 6px", fontFamily: ui, fontSize: 12, letterSpacing: "0.14em", color: "#7d7d88", fontWeight: 700}}>RECENT</div>
      <RecentRow frame={frame} fps={fps} name="QA Pass" date="Sep 23" at={DB.today + 36} />
      <div style={{marginTop: 18, padding: "0 8px", fontFamily: ui, fontSize: 16, color: "#8d8d96"}}>Official Grok Bot meters only.</div>
    </div>
  );
};

const RecentRow: FC<{frame: number; fps: number; name: string; date: string; at: number}> = ({frame, fps, name, date, at}) => {
  const s = pop(frame, fps, at, {damping: 12, stiffness: 140, mass: 0.5});
  return (
    <div style={{height: 56, display: "flex", alignItems: "center", gap: 14, margin: "0 8px", fontFamily: ui, opacity: clamp(s, 0, 1), transform: `translateX(${(1 - s) * 24}px)`}}>
      <div style={{width: 10, height: 10, borderRadius: 99, background: "#5c5c66"}} />
      <div style={{flex: 1, fontSize: 20, color: "#c8c8d0"}}>{name}</div>
      <div style={{color: "#8d8d96", fontSize: 16}}>{date}</div>
    </div>
  );
};

const SettingsBody: FC<{frame: number; fps: number; tone: Tone}> = ({frame, fps, tone}) => {
  const intro = pop(frame, fps, DB.settings, {damping: 11, stiffness: 150, mass: 0.5});
  const muted = tone === "light" ? "rgba(60,60,67,0.62)" : "#9a9aa4";
  const fg = tone === "light" ? "#1c1c1e" : "#f5f5f7";
  const bar = pop(frame, fps, tone === "dark" ? DB.themeDark : DB.settings, {damping: 12, stiffness: 140, mass: 0.5});
  const cup = pop(frame, fps, DB.themeCoffee, {damping: 10, stiffness: 150, mass: 0.5});
  return (
    <div style={{padding: "8px 36px 0", opacity: clamp(intro, 0, 1)}}>
      <div style={{fontFamily: ui, fontSize: 28, fontWeight: 750, color: fg}}>Theme</div>
      <div style={{marginTop: 6, fontFamily: ui, fontSize: 18, color: muted}}>
        {tone === "coffee" ? "The cup fills to your weekly usage." : "Follows the macOS light and dark appearance."}
      </div>
      <div
        style={{
          marginTop: 22,
          height: 300,
          borderRadius: 20,
          background: tone === "light" ? "rgba(255,255,255,0.72)" : tone === "dark" ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.03)",
          border: `1px solid ${tone === "light" ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)"}`,
          padding: "22px 28px",
          transform: `translateX(${(1 - clamp(tone === "coffee" ? cup : bar, 0, 1)) * 40}px)`,
        }}
      >
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "baseline"}}>
          <span style={{fontFamily: ui, letterSpacing: "0.14em", fontSize: 13, fontWeight: 700, color: muted}}>WEEKLY</span>
          <span style={{fontFamily: display, fontWeight: 800, fontSize: 54, letterSpacing: "-0.04em"}}>68%</span>
        </div>
        {tone === "coffee" ? (
          <div style={{position: "relative", height: 190}}>
            <div style={{position: "absolute", left: "50%", top: 0, width: 180, height: 180, marginLeft: -90, transform: `scale(${0.8 + 0.2 * clamp(cup, 0, 1)})`}}>
              <Steam frame={frame} strength={0.7} />
              <Cup uid="settings" pct={68} wobble={Math.sin(frame * 0.3) * 0.35} sheen={frame} />
            </div>
          </div>
        ) : (
          <div style={{marginTop: 28}}>
            <div style={{height: 16, borderRadius: 99, background: tone === "light" ? "rgba(120,120,128,0.16)" : "rgba(255,255,255,0.12)", overflow: "hidden"}}>
              <div style={{width: `${68 * clamp(bar, 0, 1)}%`, height: "100%", borderRadius: 99, background: tone === "light" ? "linear-gradient(90deg,#007AFF,#4da2ff)" : "linear-gradient(90deg,#0A84FF,#7cc0ff)", boxShadow: "0 0 16px rgba(10,132,255,0.45)"}} />
            </div>
            <div style={{marginTop: 18, fontFamily: ui, fontSize: 20, fontWeight: 600}}>Resets in 3d</div>
            <div style={{marginTop: 16, fontFamily: ui, fontSize: 16, color: muted}}>System appearance. No cup.</div>
          </div>
        )}
      </div>
      <div style={{display: "flex", justifyContent: "center", gap: 18, marginTop: 22}}>
        <ThemeChip title="System" selected={tone !== "coffee"} frame={frame} fps={fps} at={DB.settings} tone={tone} />
        <ThemeChip title="Coffee" selected={tone === "coffee"} frame={frame} fps={fps} at={DB.themeCoffee} tone={tone} />
      </div>
    </div>
  );
};

const ThemeChip: FC<{title: string; selected: boolean; frame: number; fps: number; at: number; tone: Tone}> = ({title, selected, frame, fps, at, tone}) => {
  const intro = pop(frame, fps, at, {damping: 10, stiffness: 160, mass: 0.45});
  const float = Math.sin((frame + (title === "Coffee" ? 20 : 0)) / 11) * 6;
  const border = selected ? "#3ed64c" : tone === "light" ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.16)";
  return (
    <div
      style={{
        width: 280,
        height: 92,
        borderRadius: 18,
        border: `2px solid ${border}`,
        background: tone === "light" ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.04)",
        boxShadow: selected ? "0 0 0 4px rgba(62,214,76,0.16)" : "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        fontFamily: ui,
        fontWeight: 700,
        fontSize: 22,
        color: tone === "light" ? "#1c1c1e" : "#f5f5f7",
        transform: `translateY(${float + (1 - clamp(intro, 0, 1)) * 24}px) scale(${(0.94 + 0.06 * clamp(intro, 0, 1)) * (selected ? impactScale(frame, at, 0.05) : 1)})`,
      }}
    >
      {title === "Coffee" ? (
        <div style={{width: 36, height: 34}}>
          <Cup uid={`chip-${title}`} pct={50} sheen={12} />
        </div>
      ) : (
        <div style={{width: 46, height: 28, borderRadius: 6, overflow: "hidden", display: "flex"}}>
          <div style={{flex: 1, background: "#f2f2f4"}} />
          <div style={{flex: 1, background: "#2a2a2e"}} />
        </div>
      )}
      {title}
    </div>
  );
};

const Footer: FC<{tone: Tone; frame: number}> = ({tone, frame}) => {
  const aboutHot = frame > DB.today && frame < DB.settings ? 0 : frame >= 748 && frame < DB.end ? 1 : 0;
  const bg = tone === "light" ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)";
  const border = tone === "light" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.12)";
  const color = tone === "light" ? "#3a3a3c" : "#c8c8d0";
  const labels = ["About", "Refresh", "Quit"] as const;
  return (
    <div style={{position: "absolute", left: 18, right: 18, bottom: 16, display: "flex", gap: 10}}>
      {labels.map((label) => (
        <div
          key={label}
          style={{
            flex: 1,
            height: 40,
            borderRadius: 12,
            background: bg,
            border: `1px solid ${label === "About" && aboutHot ? "rgba(62,214,76,0.7)" : border}`,
            color: label === "About" && aboutHot ? "#3ed64c" : color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: ui,
            fontSize: 16,
            fontWeight: 600,
            transform: label === "About" && aboutHot ? "scale(1.04)" : undefined,
          }}
        >
          {label}
        </div>
      ))}
    </div>
  );
};

const EndCard: FC<{frame: number; fps: number}> = ({frame, fps}) => {
  if (frame < 760) return null;
  const enter = pop(frame, fps, DB.end, {damping: 11, stiffness: 130, mass: 0.55});
  const title = pop(frame, fps, DB.end + 8, {damping: 12, stiffness: 150, mass: 0.5});
  const url = pop(frame, fps, DB.end + 18, {damping: 13, stiffness: 120, mass: 0.5});
  const breathe = 1 + Math.sin(frame / 16) * 0.012;
  const ring = clamp(pop(frame, fps, DB.end, {damping: 16, stiffness: 70, mass: 0.8}), 0, 1);
  return (
    <AbsoluteFill style={{opacity: clamp(enter, 0, 1), pointerEvents: "none"}}>
      <div style={{position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: `scale(${breathe})`}}>
        <div style={{position: "relative", width: 200, height: 200, transform: `scale(${0.6 + 0.4 * enter})`}}>
          <svg width={200} height={200} style={{position: "absolute", inset: 0}}>
            <circle cx={100} cy={100} r={88} fill="none" stroke="#3ed64c" strokeWidth={2.5} strokeLinecap="round" strokeDasharray={553} strokeDashoffset={553 * (1 - ring)} />
          </svg>
          <div style={{position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center"}}>
            <BotMark size={140} blink={blinkAt(frame)} />
          </div>
        </div>
        <div style={{marginTop: 22, textAlign: "center", opacity: clamp(title, 0, 1), transform: `translateY(${(1 - title) * 18}px)`}}>
          <div style={{fontFamily: display, fontWeight: 800, fontSize: 84, letterSpacing: "-0.045em", lineHeight: 0.95}}>GrokBot Meter</div>
          <div style={{height: 3, margin: "12px auto 0", width: 280, borderRadius: 99, background: "#3ed64c", transform: `scaleX(${clamp(title, 0, 1)})`, boxShadow: "0 0 12px #3ed64c"}} />
          <div style={{marginTop: 14, fontFamily: ui, fontSize: 24, color: "#b5b5bd"}}>menu bar meters for Grok Bot</div>
        </div>
        <div style={{marginTop: 22, display: "flex", gap: 12, alignItems: "center", opacity: clamp(url, 0, 1)}}>
          <span style={{fontFamily: ui, fontWeight: 800, letterSpacing: "0.14em", fontSize: 16, color: "#3ed64c", border: "1px solid rgba(62,214,76,0.5)", borderRadius: 999, padding: "6px 12px"}}>MIT</span>
          <span style={{fontFamily: ui, fontSize: 20, color: "#d0d0d6"}}>open source</span>
        </div>
        <div style={{marginTop: 16, fontFamily: ui, fontSize: 32, fontWeight: 650, letterSpacing: "-0.02em", opacity: clamp(url, 0, 1), transform: `translateY(${(1 - url) * 10}px)`}}>
          github.com/nuno/grokbot-meter
        </div>
      </div>
      <div style={{position: "absolute", left: 0, right: 0, bottom: 28, textAlign: "center", fontFamily: ui, fontSize: 15, color: "#6e6e78", opacity: clamp(url, 0, 1)}}>
        Music: Voltaic by Kevin MacLeod (incompetech.com) · CC BY 4.0
      </div>
    </AbsoluteFill>
  );
};
