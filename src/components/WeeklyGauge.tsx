import { memo } from "react";
import { useThemePref } from "../hooks/useLocalPref";
import { CupGauge } from "./coffee/CupGauge";
import { NoSpendLimitMark } from "./coffee/OnDemand";
import { CupGlyph, StepTrack } from "./coffee/StepTrack";

const DAY_MS = 86_400_000;
const DAY_NODES = ["1", "2", "3", "4", "5", "6", "7"];
const LEVEL_NODES = [
  <CupGlyph key="light" scale={0.6} />,
  <CupGlyph key="normal" scale={1} />,
  <CupGlyph key="heavy" scale={1.4} />,
];
/* Drink sizes, as on the kiosk's "nível de café" rail. */
const LEVEL_LABELS = ["small", "regular", "large"] as const;

type Props = {
  pct: number;
  hasPercent: boolean;
  tone: "default" | "warn" | "critical";
  resetAt: number | null;
  /** On-demand is enabled but the account has no cap — Coffee marks it by the cup. */
  noSpendLimit?: boolean;
};

function usageLevelIndex(pct: number): number {
  if (pct < 50) return 0;
  if (pct < 80) return 1;
  return 2;
}

/** 0-based position in the 7-day window; null when the reset date is unknown. */
function elapsedDayIndex(resetAt: number | null): number | null {
  if (resetAt == null || !Number.isFinite(resetAt)) return null;
  const daysLeft = Math.ceil((resetAt - Date.now()) / DAY_MS);
  if (!Number.isFinite(daysLeft)) return null;
  return Math.min(6, Math.max(0, 7 - daysLeft));
}

/**
 * The weekly meter, in whichever form the active theme wants: a bar for the
 * flat themes, the filling cup for Coffee. Both carry the same meter semantics.
 */
export const WeeklyGauge = memo(function WeeklyGauge({
  pct,
  hasPercent,
  tone,
  resetAt,
  noSpendLimit = false,
}: Props) {
  const { theme } = useThemePref();
  const toneClass = tone === "default" ? "" : ` is-${tone}`;
  const meterProps = {
    role: "meter" as const,
    "aria-valuemin": 0,
    "aria-valuemax": 100,
    "aria-valuenow": hasPercent ? pct : 0,
    "aria-label": "Weekly included usage",
  };

  if (theme === "coffee") {
    const dayIndex = elapsedDayIndex(resetAt);
    return (
      <div className={`cup-gauge${hasPercent ? "" : " is-empty"}${toneClass}`}>
        {noSpendLimit ? <NoSpendLimitMark /> : null}
        <div className="cup-stage" {...meterProps}>
          <span className="cup-glow" aria-hidden="true" />
          <CupGauge pct={hasPercent ? pct : 0} />
        </div>
        {/* Decorative restatement of the meter value and the "Resets in" line. */}
        <div className="cup-tracks" aria-hidden="true">
          <StepTrack
            title="usage level"
            nodes={LEVEL_NODES}
            activeIndex={hasPercent ? usageLevelIndex(pct) : -1}
            labels={LEVEL_LABELS}
          />
          {dayIndex != null ? (
            <StepTrack title="days to reset" nodes={DAY_NODES} activeIndex={dayIndex} />
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={`meter${hasPercent ? "" : " is-empty"}${toneClass}`} {...meterProps}>
      <div className="meter-fill" style={{ width: `${pct}%` }} />
    </div>
  );
});
