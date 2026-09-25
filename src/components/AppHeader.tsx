import { memo } from "react";
import { GrokMark2Icon } from "./icons";

type Props = {
  onClose: () => void;
  onSettings: () => void;
};

export const AppHeader = memo(function AppHeader({ onClose, onSettings }: Props) {
  return (
    <header className="header header-row">
      <h1 className="title">
        <GrokMark2Icon className="title-icon" />
        GrokBot Meter
      </h1>
      <div className="header-actions">
        <button
          type="button"
          className="icon-btn"
          onClick={onSettings}
          aria-label="Settings"
          title="Settings"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M5.7 1.4h2.6l.35 1.35a4.4 4.4 0 0 1 1.05.6l1.35-.45 1.3 2.25-1 .95c.05.24.08.48.08.73s-.03.49-.08.73l1 .95-1.3 2.25-1.35-.45a4.4 4.4 0 0 1-1.05.6L8.3 12.6H5.7l-.35-1.35a4.4 4.4 0 0 1-1.05-.6l-1.35.45-1.3-2.25 1-.95A4.6 4.6 0 0 1 2.57 7c0-.25.03-.49.08-.73l-1-.95 1.3-2.25 1.35.45c.3-.26.66-.46 1.05-.6L5.7 1.4Z"
              stroke="currentColor"
              strokeWidth="1.15"
              strokeLinejoin="round"
            />
            <circle cx="7" cy="7" r="1.85" stroke="currentColor" strokeWidth="1.15" />
          </svg>
        </button>
        <button
          type="button"
          className="close-btn"
          onClick={onClose}
          aria-label="Close"
          title="Close (Esc)"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>
  );
});
