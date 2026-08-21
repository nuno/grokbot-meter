import { memo } from "react";

export const WeeklyIcon = memo(function WeeklyIcon() {
  return (
    <svg className="card-label-icon weekly" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="2.5" y="3" width="9" height="8.5" rx="1.4" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2.5 6 H11.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4.8 2.3 V4 M9.2 2.3 V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
});
