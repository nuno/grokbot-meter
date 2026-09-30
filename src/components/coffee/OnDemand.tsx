import { memo } from "react";
import type { OnDemandSpend } from "../../types";
import { useThemePref } from "../../hooks/useLocalPref";
import { formatCentsUsd } from "../../lib/format";

type Props = {
  onDemand: OnDemandSpend | null;
  tone: "default" | "warn" | "critical";
};

/**
 * The kiosk prints the card balance in the top-right corner ("0,00 € CRÉDITO"),
 * so Coffee puts on-demand spend there instead of in a row below the meter.
 * Renders nothing in the flat themes — they keep the row.
 */
export const OnDemandReadout = memo(function OnDemandReadout({ onDemand, tone }: Props) {
  const { theme } = useThemePref();
  if (theme !== "coffee" || !onDemand) return null;

  return (
    <span className="kiosk-credit">
      <span className={`kiosk-credit-value${tone === "default" ? "" : ` is-${tone}`}`}>
        {formatCentsUsd(onDemand.usedCents)}
        <span className="kiosk-credit-limit"> / {formatCentsUsd(onDemand.limitCents)}</span>
      </span>
      <span className="kiosk-credit-caption">On-demand</span>
    </span>
  );
});

/**
 * Stands in for the kiosk's crossed-out cup ("sem copo") beside the drink:
 * an option the machine cannot offer. Here it means no on-demand cap is set,
 * so there is no second meter to draw.
 */
export const NoSpendLimitMark = memo(function NoSpendLimitMark() {
  return (
    <span className="cup-aside" title="No on-demand spend limit set">
      <span className="cup-aside-mark">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path
            d="M11 5.2H7.6a1.9 1.9 0 0 0 0 3.8h2.8a1.9 1.9 0 0 1 0 3.8H6.6"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path d="M9 3.4v11.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <path className="cup-aside-slash" d="M3.4 14.6 14.6 3.4" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
      <span className="cup-aside-label">no spend limit</span>
    </span>
  );
});
