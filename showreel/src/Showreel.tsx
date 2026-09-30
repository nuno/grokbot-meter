import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {DB} from "./beats";
import {Burst} from "./components";
import {clamp} from "./motion";
import {CoffeeScene, ColdOpen, EndScene, MenuScene, ThemeScene, TodayScene} from "./scenes";

const CAM = [
  {f: 0, s: 1.02, x: 0, y: 0, b: 0},
  {f: 2, s: 1.07, x: 0, y: 0, b: 1.5},
  {f: 20, s: 1, x: 0, y: 0, b: 0},
  {f: 100, s: 1.03, x: 0, y: -6, b: 0},
  {f: 116, s: 1.08, x: 0, y: -24, b: 8},
  {f: 132, s: 1, x: 0, y: 0, b: 0},
  {f: 214, s: 1.04, x: -16, y: 8, b: 0},
  {f: 234, s: 1.1, x: 0, y: 16, b: 7},
  {f: 252, s: 1, x: 0, y: 0, b: 0},
  {f: 430, s: 1.05, x: 0, y: -12, b: 0},
  {f: 470, s: 1.12, x: 0, y: -26, b: 2},
  {f: 488, s: 1, x: 0, y: 0, b: 0},
  {f: 648, s: 1.03, x: 0, y: 0, b: 0},
  {f: 662, s: 1.06, x: -8, y: 0, b: 6},
  {f: 678, s: 1, x: 0, y: 0, b: 0},
  {f: 766, s: 1.04, x: 0, y: 8, b: 0},
  {f: 786, s: 1, x: 0, y: 0, b: 2},
  {f: 808, s: 1, x: 0, y: 0, b: 0},
  {f: 899, s: 1.03, x: 0, y: -8, b: 0},
];

function sampleCam(frame: number) {
  let i = 0;
  while (i < CAM.length - 1 && CAM[i + 1].f <= frame) i++;
  const a = CAM[i];
  const b = CAM[Math.min(i + 1, CAM.length - 1)];
  const span = Math.max(1, b.f - a.f);
  const t = clamp((frame - a.f) / span, 0, 1);
  const e = t * t * (3 - 2 * t);
  return {
    s: a.s + (b.s - a.s) * e,
    x: a.x + (b.x - a.x) * e,
    y: a.y + (b.y - a.y) * e,
    b: a.b + (b.b - a.b) * t,
  };
}

function shake(frame: number) {
  const hits = [DB.logo, DB.title, DB.coffee, DB.drop, DB.themeDark, DB.themeCoffee, DB.today, DB.end];
  let x = 0;
  let y = 0;
  for (const h of hits) {
    const d = frame - h;
    if (d < 0 || d >= 12) continue;
    const mag = h === DB.drop ? 14 : h === DB.logo ? 9 : 5;
    const a = mag * (1 - d / 12);
    x += Math.sin(d * 1.8 + h) * a;
    y += Math.cos(d * 2.15 + h) * a * 0.5;
  }
  if (frame >= 458 && frame < DB.drop) {
    const a = (frame - 458) / (DB.drop - 458);
    x += Math.sin(frame * 1.5) * a * 5;
    y += Math.cos(frame * 1.8) * a * 2.4;
  }
  return {x, y};
}

const FLASHES: {f: number; a: number; color: string}[] = [
  {f: DB.logo, a: 0.62, color: "#fff"},
  {f: DB.drop, a: 0.78, color: "#fff"},
  {f: DB.themeDark, a: 0.28, color: "#d7e8ff"},
  {f: DB.themeCoffee, a: 0.34, color: "#e7ffe9"},
  {f: DB.today, a: 0.22, color: "#fff"},
  {f: DB.end, a: 0.4, color: "#fff4e4"},
];

export const Showreel = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cam = sampleCam(frame);
  const sk = shake(frame);
  const driftX = Math.sin(frame / 95) * 5;
  const driftY = Math.cos(frame / 120) * 3;
  const blur = cam.b;
  const flash = FLASHES.reduce((acc, hit) => {
    const d = frame - hit.f;
    if (d < 0 || d > 6) return acc;
    const a = hit.a * (1 - d / 6);
    return a > acc.a ? {a, color: hit.color} : acc;
  }, {a: 0, color: "#fff"});

  return (
    <AbsoluteFill style={{background: "#050507", fontFamily: "Outfit, Inter, sans-serif", color: "#f5f5f7"}}>
      <Audio src={staticFile("voltaic-30.mp3")} />
      <AbsoluteFill
        style={{
          transform: `translate(${cam.x + sk.x + driftX}px, ${cam.y + sk.y + driftY}px) scale(${cam.s})`,
          filter: blur > 0.35 ? `blur(${blur}px)` : undefined,
        }}
      >
        <ColdOpen frame={frame} fps={fps} />
        <MenuScene frame={frame} fps={fps} />
        <CoffeeScene frame={frame} fps={fps} />
        <ThemeScene frame={frame} fps={fps} />
        <TodayScene frame={frame} fps={fps} />
        <EndScene frame={frame} fps={fps} />
      </AbsoluteFill>

      <Burst frame={frame} at={DB.logo} x={960} y={470} />
      <Burst frame={frame} at={DB.drop} x={960} y={520} color="#ffffff" />
      <Burst frame={frame} at={DB.end} x={960} y={430} />

      {FLASHES.map((hit) => {
        const d = frame - hit.f;
        if (d < 0 || d > 9) return null;
        const t = d / 9;
        const x = -30 + t * 150;
        return (
          <div
            key={hit.f}
            style={{
              position: "absolute",
              top: "46%",
              left: `${x}%`,
              width: "38%",
              height: 10,
              background: "linear-gradient(90deg, transparent, #fff, #d8ffdf, transparent)",
              filter: "blur(2px)",
              opacity: Math.sin(Math.min(t, 1) * Math.PI) * 0.85,
              transform: "rotate(-8deg)",
              mixBlendMode: "screen",
            }}
          />
        );
      })}

      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at center, transparent 42%, rgba(0,0,0,0.55) 100%)",
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile("grain.png")})`,
          backgroundSize: "160px 160px",
          opacity: 0.09,
          mixBlendMode: "overlay",
          pointerEvents: "none",
        }}
      />
      {flash.a > 0.01 ? (
        <AbsoluteFill style={{background: flash.color, opacity: flash.a, pointerEvents: "none", mixBlendMode: "screen"}} />
      ) : null}
    </AbsoluteFill>
  );
};
