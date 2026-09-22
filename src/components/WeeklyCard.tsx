import { memo, useMemo } from "react";
import type { WeeklyPctSample, WeeklyStatus } from "../types";
import { clampPercent, formatCentsUsd, formatUpdatedAt, redactEmail } from "../lib/format";
import { weeklyLines } from "../lib/weekly";
import { useRedactEmail, useShowOnDemand } from "../hooks/useLocalPref";
import { EyeIcon, EyeOffIcon, WeeklyIcon } from "./icons";
import { WeeklySparkline } from "./WeeklySparkline";

type Props = {
  weekly: WeeklyStatus | null;
  updatedAt?: number | null;
  trendPoints?: readonly WeeklyPctSample[];
  showTrend?: boolean;
  isLoading?: boolean;
};

function meterTone(pct: number): "default" | "warn" | "critical" {
  if (pct >= 95) return "critical";
  if (pct >= 80) return "warn";
  return "default";
}

export const WeeklyCard = memo(function WeeklyCard({
  weekly,
  updatedAt = null,
  trendPoints = [],
  showTrend = false,
  isLoading = false,
}: Props) {
  const hasPercent = typeof weekly?.usagePercent === "number";
  const meterPct = hasPercent ? clampPercent(weekly!.usagePercent as number) : 0;
  const pctLabel = hasPercent ? `${Math.round(meterPct)}%` : "—";
  const tone = hasPercent ? meterTone(meterPct) : "default";
  const lines = useMemo(() => weeklyLines(weekly), [weekly]);
  const meterFillStyle = useMemo(() => ({ width: `${meterPct}%` }), [meterPct]);
  const updatedLabel = weekly ? formatUpdatedAt(updatedAt) : "Updated —";
  const { show: showOnDemandPref } = useShowOnDemand();
  const onDemand = showOnDemandPref ? (weekly?.onDemand ?? null) : null;
  const onDemandPct = useMemo(() => {
    if (!onDemand || !(onDemand.limitCents > 0)) return 0;
    return clampPercent((onDemand.usedCents / onDemand.limitCents) * 100);
  }, [onDemand]);
  const onDemandTone = onDemand ? meterTone(onDemandPct) : "default";
  const onDemandFillStyle = useMemo(() => ({ width: `${onDemandPct}%` }), [onDemandPct]);
  const onDemandLabel = useMemo(() => {
    if (!onDemand) return null;
    return `${formatCentsUsd(onDemand.usedCents)} / ${formatCentsUsd(onDemand.limitCents)}`;
  }, [onDemand]);
  const { redacted: isRedacted, toggle: toggleRedacted } = useRedactEmail();

  const toneClass = tone === "default" ? "" : ` is-${tone}`;
  const onDemandToneClass = onDemandTone === "default" ? "" : ` is-${onDemandTone}`;

  if (isLoading) {
    return (
      <section className="card">
        <div className="card-head">
          <span className="card-label">
            <WeeklyIcon /> Weekly
          </span>
          <span className="card-pct">—</span>
        </div>
        <div className="weekly-skeleton" aria-busy="true" aria-label="Loading weekly">
          <div className="weekly-skeleton-meter" />
          <div className="weekly-skeleton-row" />
          <div className="weekly-skeleton-row short" />
        </div>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="card-head">
        <span className="card-label">
          <WeeklyIcon /> Weekly
        </span>
        <span className={`card-pct${toneClass}`}>{pctLabel}</span>
      </div>
      <div
        className={`meter${hasPercent ? "" : " is-empty"}${toneClass}`}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={hasPercent ? meterPct : 0}
        aria-label="Weekly included usage"
      >
        <div className="meter-fill" style={meterFillStyle} />
      </div>
      {showTrend ? <WeeklySparkline points={trendPoints} /> : null}
      {lines.map((line) => (
        <p key={line} className="muted">
          {line}
        </p>
      ))}
      {showOnDemandPref ? (
        onDemand && onDemandLabel ? (
          <div className="ondemand">
            <div className="ondemand-head">
              <span className="ondemand-label">On-demand</span>
              <span className={`ondemand-value${onDemandToneClass}`}>{onDemandLabel}</span>
            </div>
            <div
              className={`meter meter-thin${onDemandToneClass}`}
              role="meter"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={onDemandPct}
              aria-label="On-demand spend"
            >
              <div className="meter-fill" style={onDemandFillStyle} />
            </div>
          </div>
        ) : (
          <div className="ondemand ondemand--empty">
            <div className="ondemand-head">
              <span className="ondemand-label">On-demand</span>
              <span className="ondemand-empty">No spend limit</span>
            </div>
          </div>
        )
      ) : null}
      <p className="muted updated-line">{updatedLabel}</p>
      {weekly?.accountEmail ? (
        <p className="muted weekly-email">
          <span className="weekly-email-text">{isRedacted ? redactEmail(weekly.accountEmail) : weekly.accountEmail}</span>
          <button
            type="button"
            className="weekly-email-toggle"
            aria-label={isRedacted ? "Show email" : "Hide email"}
            aria-pressed={isRedacted}
            title={isRedacted ? "Show email" : "Hide email"}
            onClick={toggleRedacted}
          >
            {isRedacted ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </p>
      ) : null}
    </section>
  );
});
