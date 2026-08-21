import { memo } from "react";

type Props = {
  onAbout: () => void;
  onQuit: () => void;
};

export const AppFooter = memo(function AppFooter({ onAbout, onQuit }: Props) {
  return (
    <footer className="footer footer-row">
      <button type="button" className="footer-btn" onClick={onAbout}>
        About
      </button>
      <span>Local Grok Bot activity</span>
      <button type="button" className="footer-btn" onClick={onQuit}>
        Quit
      </button>
    </footer>
  );
});
