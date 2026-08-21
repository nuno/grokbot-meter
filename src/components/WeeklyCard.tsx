import { memo, useMemo } from "react";
import type { WeeklyStatus } from "../types";
import { clampPercent } from "../lib/format";
import { weeklyLines } from "../lib/weekly";
import { WeeklyIcon } from "./icons";

type Props = {
  weekly: WeeklyStatus | null;
};

export const WeeklyCard = memo(function WeeklyCard({ weekly }: Props) {
  const hasPercent = typeof weekly?.usagePercent === "number";
  const meterPct = hasPercent ? clampPercent(weekly!.usagePercent as number) : 0;
  const pctLabel = hasPercent ? `${Math.round(meterPct)}%` : "—";
  const lines = useMemo(() => weeklyLines(weekly), [weekly]);
  const meterFillStyle = useMemo(() => ({ width: `${meterPct}%` }), [meterPct]);

  return (
    <section className="card">
      <div className="card-head">
        <span className="card-label">
          <WeeklyIcon /> Weekly
        </span>
        <span className="card-pct">{pctLabel}</span>
      </div>
      <div
        className={`meter${hasPercent ? "" : " is-empty"}`}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={hasPercent ? meterPct : 0}
      >
        <div className="meter-fill" style={meterFillStyle} />
      </div>
      {lines.map((line) => (
        <p key={line} className="muted">
          {line}
        </p>
      ))}
      {weekly?.accountEmail ? <p className="muted">{weekly.accountEmail}</p> : null}
    </section>
  );
});
