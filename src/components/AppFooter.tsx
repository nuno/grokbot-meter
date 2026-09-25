import { memo } from "react";

type Props = {
  onAbout: () => void;
  onRefresh: () => void;
  onQuit: () => void;
  refreshing?: boolean;
};

export const AppFooter = memo(function AppFooter({
  onAbout,
  onRefresh,
  onQuit,
  refreshing = false,
}: Props) {
  return (
    <footer className="footer footer-row">
      <button type="button" className="footer-btn" onClick={onAbout} title="About GrokBot Meter">
        About
      </button>
      <button
        type="button"
        className={`footer-btn${refreshing ? " is-busy" : ""}`}
        onClick={onRefresh}
        disabled={refreshing}
        aria-busy={refreshing}
        aria-label={refreshing ? "Refreshing" : "Refresh status"}
        title={refreshing ? "Refreshing…" : "Refresh"}
      >
        {refreshing ? "…" : "Refresh"}
      </button>
      <button
        type="button"
        className="footer-btn footer-btn--quiet"
        onClick={onQuit}
        aria-label="Quit GrokBot Meter"
        title="Quit GrokBot Meter (⌘Q)"
      >
        Quit
      </button>
    </footer>
  );
});
