import { memo } from "react";

type Props = {
  onAbout: () => void;
  onQuit: () => void;
};

export const AppFooter = memo(function AppFooter({ onAbout, onQuit }: Props) {
  return (
    <footer className="footer footer-row">
      <button type="button" className="footer-btn" onClick={onAbout} title="About GrokBar">
        About
      </button>
      <span>Local Grok Bot activity</span>
      <button
        type="button"
        className="footer-btn footer-btn--quiet"
        onClick={onQuit}
        aria-label="Quit GrokBar"
        title="Quit GrokBar (⌘Q)"
      >
        Quit
      </button>
    </footer>
  );
});
