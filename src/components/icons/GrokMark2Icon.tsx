import { memo } from "react";

export const GrokMark2Icon = memo(function GrokMark2Icon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="10.5" cy="13.5" r="8" fill="currentColor" />
      <line x1="16" y1="6.5" x2="21" y2="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="21" cy="2" r="2" fill="currentColor" />
      <rect x="7.5" y="11" width="2.2" height="5" rx="1.1" fill="var(--panel-bg, #fff)" transform="rotate(8 8.6 13.5)" />
      <rect x="11.5" y="11" width="2.2" height="5" rx="1.1" fill="var(--panel-bg, #fff)" transform="rotate(-8 12.6 13.5)" />
    </svg>
  );
});
