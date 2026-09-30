/** Voltaic is 120 BPM and the kick sits ~75ms after each file-time downbeat. */
export const FPS = 30;
export const BPM = 120;
export const OFFSET = 2;
export const BEAT = 15;
export const BAR = 60;
export const DURATION = 900;

/** Absolute frames of the downbeats the edit is cut on. */
export const DB = {
  logo: 2,
  title: 62,
  menu: 122,
  coffee: 242,
  drop: 482,
  themeDark: 542,
  themeCoffee: 602,
  today: 662,
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
