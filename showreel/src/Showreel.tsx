import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {DB} from "./beats";
import {Demo} from "./demo";
import {clamp} from "./motion";

const CAM = [
  {f: 0, s: 1.03, y: 12, b: 0},
  {f: 24, s: 1, y: 0, b: 0},
  {f: 110, s: 1.02, y: -6, b: 0},
  {f: 122, s: 1.05, y: 6, b: 3},
  {f: 142, s: 1, y: 0, b: 0},
  {f: 280, s: 1.045, y: -16, b: 0},
  {f: 400, s: 1.01, y: -4, b: 0},
  {f: 422, s: 1.03, y: 4, b: 2.5},
  {f: 444, s: 1, y: 0, b: 0},
  {f: 542, s: 1.03, y: 0, b: 2.5},
  {f: 562, s: 1, y: 0, b: 0},
  {f: 770, s: 1.02, y: 4, b: 0},
  {f: 796, s: 1, y: 0, b: 1.5},
  {f: 816, s: 1, y: 0, b: 0},
  {f: 899, s: 1.02, y: -6, b: 0},
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
    y: a.y + (b.y - a.y) * e,
    b: a.b + (b.b - a.b) * t,
  };
}

export const Showreel = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cam = sampleCam(frame);
  const shake = frame >= DB.open && frame < DB.open + 8 ? Math.sin((frame - DB.open) * 1.6) * (8 - (frame - DB.open)) * 0.4 : 0;

  return (
    <AbsoluteFill style={{background: "#07070a", fontFamily: "Outfit, Inter, sans-serif", color: "#f5f5f7", overflow: "hidden"}}>
      <Audio src={staticFile("voltaic-30.mp3")} />
      <AbsoluteFill
        style={{
          transform: `translateY(${cam.y + shake}px) scale(${cam.s})`,
          filter: cam.b > 0.4 ? `blur(${cam.b}px)` : undefined,
        }}
      >
        <Demo frame={frame} fps={fps} />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at center, transparent 46%, rgba(0,0,0,0.58) 100%)",
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile("grain.png")})`,
          backgroundSize: "160px 160px",
          opacity: 0.08,
          mixBlendMode: "overlay",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
