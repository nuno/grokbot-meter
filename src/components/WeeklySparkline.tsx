import { memo, useMemo } from "react";
import type { WeeklyPctSample } from "../types";
import { clampPercent } from "../lib/format";

type Props = {
  points: readonly WeeklyPctSample[];
};

function meterTone(pct: number): "default" | "warn" | "critical" {
  if (pct >= 95) return "critical";
  if (pct >= 80) return "warn";
  return "default";
}

const W = 320;
const H = 36;
const PAD_X = 8;
const PAD_Y = 5;

function sparklinePath(points: readonly WeeklyPctSample[]): {
  line: string;
  area: string;
  lastX: number;
  lastY: number;
  firstPct: number;
  lastPct: number;
} | null {
  if (points.length < 2) return null;
  const pcts = points.map((p) => clampPercent(p.pct));
  const n = pcts.length;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;
  const coords = pcts.map((pct, i) => {
    const x = PAD_X + (i / (n - 1)) * innerW;
    const y = PAD_Y + innerH - (pct / 100) * innerH;
    return { x, y, pct };
  });
  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  const first = coords[0]!;
  const last = coords[coords.length - 1]!;
  const area = `${line} L${last.x.toFixed(1)} ${H} L${first.x.toFixed(1)} ${H} Z`;
  return {
    line,
    area,
    lastX: last.x,
    lastY: last.y,
    firstPct: first.pct,
    lastPct: last.pct,
  };
}

/**
 * Nested under the Weekly meter.
 * Soft area + start/end % + “Included usage · this period”.
 * Renders nothing until ≥2 samples.
 */
export const WeeklySparkline = memo(function WeeklySparkline({ points }: Props) {
  const spark = useMemo(() => sparklinePath(points), [points]);
  if (!spark) return null;
  const tone = meterTone(spark.lastPct);
  const toneClass = tone === "default" ? "" : ` is-${tone}`;
  const startLabel = `${Math.round(spark.firstPct)}%`;
  const endLabel = `${Math.round(spark.lastPct)}%`;

  return (
    <div className="weekly-trend">
      <svg
        className={`weekly-spark${toneClass}`}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Included usage this period, from ${startLabel} to ${endLabel}`}
      >
        <path className="weekly-spark-area" d={spark.area} />
        <path className="weekly-spark-line" d={spark.line} />
        <circle className="weekly-spark-dot" cx={spark.lastX} cy={spark.lastY} r={3.2} />
      </svg>
      <div className="weekly-trend-ends" aria-hidden="true">
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
      <p className="weekly-trend-caption">Included usage · this period</p>
    </div>
  );
});
