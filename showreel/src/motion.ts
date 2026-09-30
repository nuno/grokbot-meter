import {Easing, interpolate, spring} from "remotion";

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function pop(
  frame: number,
  fps: number,
  delay: number,
  config: {damping: number; stiffness: number; mass: number} = {damping: 12, stiffness: 160, mass: 0.55},
) {
  if (frame < delay) return 0;
  return spring({frame: frame - delay, fps, config});
}

/** 0→1 entrance, then 0→1 exit. Opacity is enter * (1 - exit). */
export function presence(frame: number, enterAt: number, enterDur: number, exitAt: number, exitDur: number) {
  const enter =
    enterDur <= 0
      ? frame >= enterAt
        ? 1
        : 0
      : interpolate(frame, [enterAt, enterAt + enterDur], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        });
  const exit =
    exitDur <= 0
      ? 0
      : interpolate(frame, [exitAt, exitAt + exitDur], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.in(Easing.quad),
        });
  const visible = frame >= enterAt && frame <= exitAt + exitDur;
  return {enter, exit, opacity: enter * (1 - exit), visible};
}

/** Scale that anticipates, then slams past 1 and settles. `hit` is the impact frame. */
export function impactScale(frame: number, hit: number, amount = 0.16) {
  const d = frame - hit;
  if (d < -6) return 1;
  if (d < 0) return 1 - ((d + 6) / 6) * amount * 0.7;
  const t = Math.min(d / 18, 1);
  return 1 + amount * Math.exp(-3.1 * t) * Math.cos(t * 8.2);
}
