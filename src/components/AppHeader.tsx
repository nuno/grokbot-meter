import { memo } from "react";
import { GrokMark2Icon } from "./icons";

type Props = {
  onClose: () => void;
};

export const AppHeader = memo(function AppHeader({ onClose }: Props) {
  return (
    <header className="header header-row">
      <h1 className="title">
        <GrokMark2Icon className="title-icon" />
        GrokBar
      </h1>
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
    </header>
  );
});
