import { app } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import type { WeeklyPctSample } from "../shared/types";

const MAX_POINTS = 200;
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const DEDUPE_MS = 15 * 60 * 1000;

function historyPath(): string {
  return join(app.getPath("userData"), "weekly-pct-history.json");
}

function clampPct(pct: number): number {
  return Math.min(100, Math.max(0, pct));
}

function loadPoints(): WeeklyPctSample[] {
  const path = historyPath();
  if (!existsSync(path)) return [];
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
    if (!Array.isArray(raw)) return [];
    const out: WeeklyPctSample[] = [];
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const t = typeof o.t === "number" ? o.t : NaN;
      const pct = typeof o.pct === "number" ? o.pct : NaN;
      if (!Number.isFinite(t) || !Number.isFinite(pct)) continue;
      out.push({ t, pct: clampPct(pct) });
    }
    return out;
  } catch {
    return [];
  }
}

function savePoints(points: WeeklyPctSample[]): void {
  const path = historyPath();
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(points), "utf8");
  } catch {
    /* ignore disk errors — chart just stays empty */
  }
}

function prune(points: WeeklyPctSample[], now: number): WeeklyPctSample[] {
  const cutoff = now - MAX_AGE_MS;
  let next = points.filter((p) => p.t >= cutoff);
  if (next.length > MAX_POINTS) next = next.slice(-MAX_POINTS);
  return next;
}

/** Append a local weekly-% sample from an existing GetSandUsageStatus fetch. */
export function recordWeeklyPctSample(pct: number): void {
  if (!Number.isFinite(pct)) return;
  const now = Date.now();
  const nextPct = clampPct(pct);
  let points = loadPoints();
  const last = points[points.length - 1];
  if (last && Math.abs(last.pct - nextPct) < 0.05 && now - last.t < DEDUPE_MS) {
    return;
  }
  points.push({ t: now, pct: nextPct });
  points = prune(points, now);
  savePoints(points);
}

export function getWeeklyPctHistory(): WeeklyPctSample[] {
  return prune(loadPoints(), Date.now());
}
