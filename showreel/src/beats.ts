/** Voltaic is 120 BPM and the kick sits ~75ms after each file-time downbeat. */
export const FPS = 30;
export const BPM = 120;
export const OFFSET = 2;
export const BEAT = 15;
export const BAR = 60;
export const DURATION = 900;

/** Absolute frames of the downbeats the demo is cut on. */
export const DB = {
  tray: 2,
  pill: 62,
  open: 122,
  fill: 190,
  today: 422,
  settings: 542,
  themeDark: 602,
  themeCoffee: 662,
  end: 782,
} as const;

export function beatPulse(frame: number, decay = 6): number {
  const x = frame - OFFSET;
  if (x < 0) return 0;
  const m = x % BEAT;
  return m < decay ? 1 - m / decay : 0;
}

export function downbeatPulse(frame: number, decay = 9): number {
  const x = frame - OFFSET;
  if (x < 0) return 0;
  const m = x % BAR;
  return m < decay ? 1 - m / decay : 0;
}
