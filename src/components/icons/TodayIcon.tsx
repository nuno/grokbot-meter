import { memo } from "react";

export const TodayIcon = memo(function TodayIcon() {
  return (
    <svg className="card-label-icon today" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.2" opacity="0.9" />
      <path d="M7 4.2V7l2.2 1.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7" cy="7" r="1.15" fill="currentColor" opacity="0.9" />
    </svg>
  );
});
