import { memo } from "react";

export const EyeOffIcon = memo(function EyeOffIcon() {
  return (
    <svg className="redact-icon" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M1.7 7C3 4.4 4.95 3 7 3C9.05 3 11 4.4 12.3 7C11 9.6 9.05 11 7 11C4.95 11 3 9.6 1.7 7Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="7" r="1.9" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2.5 2.5L11.5 11.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
});
