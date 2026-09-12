import { memo } from "react";

/**
 * Grok Bot mark — soft head + two eye slits (matches Grok Bot.app icon language).
 * Fixed brand colors so it stays legible on light and dark vibrancy.
 */
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
      {/* Charcoal disc */}
      <circle cx="12" cy="12" r="11" fill="#2C2C2E" />
      {/* Soft head — slightly low so eyes sit in the optical center */}
      <circle cx="12" cy="13.2" r="8.6" fill="#E8E8ED" />
      {/* Eye slits — tilted toward each other like the app icon */}
      <rect
        x="8.15"
        y="10.9"
        width="2.35"
        height="5.1"
        rx="1.175"
        fill="#2C2C2E"
        transform="rotate(14 9.325 13.45)"
      />
      <rect
        x="13.5"
        y="10.9"
        width="2.35"
        height="5.1"
        rx="1.175"
        fill="#2C2C2E"
        transform="rotate(-14 14.675 13.45)"
      />
    </svg>
  );
});
