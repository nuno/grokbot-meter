import { memo, useCallback, useMemo, useState } from "react";
import type { WeeklyStatus } from "../types";
import { clampPercent, formatUpdatedAt, redactEmail } from "../lib/format";
import { weeklyLines } from "../lib/weekly";
import { EyeIcon, EyeOffIcon, WeeklyIcon } from "./icons";

type Props = {
  weekly: WeeklyStatus | null;
  updatedAt?: number | null;
};

const REDACT_STORAGE_KEY = "grokbar:redactEmail";

function meterTone(pct: number): "default" | "warn" | "critical" {
  if (pct >= 95) return "critical";
  if (pct >= 80) return "warn";
  return "default";
}

export const WeeklyCard = memo(function WeeklyCard({ weekly, updatedAt = null }: Props) {
  const hasPercent = typeof weekly?.usagePercent === "number";
  const meterPct = hasPercent ? clampPercent(weekly!.usagePercent as number) : 0;
  const pctLabel = hasPercent ? `${Math.round(meterPct)}%` : "—";
  const tone = hasPercent ? meterTone(meterPct) : "default";
  const lines = useMemo(() => weeklyLines(weekly), [weekly]);
  const meterFillStyle = useMemo(() => ({ width: `${meterPct}%` }), [meterPct]);
  const updatedLabel = weekly ? formatUpdatedAt(updatedAt) : "Updated —";
  const [isRedacted, setIsRedacted] = useState(() => {
    try {
      // Default ON: missing key => redacted; only show email when explicitly "0".
      return typeof window === "undefined" || window.localStorage.getItem(REDACT_STORAGE_KEY) !== "0";
    } catch {
      return true;
    }
  });
  const toggleRedacted = useCallback(() => {
    setIsRedacted((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(REDACT_STORAGE_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }, []);

  const toneClass = tone === "default" ? "" : ` is-${tone}`;

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
      >
        <div className="meter-fill" style={meterFillStyle} />
      </div>
      {lines.map((line) => (
        <p key={line} className="muted">
          {line}
        </p>
      ))}
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
