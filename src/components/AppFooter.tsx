import { memo } from "react";

type Props = {
  onAbout: () => void;
};

export const AppFooter = memo(function AppFooter({ onAbout }: Props) {
  return (
    <footer className="footer footer-row">
      <span>Local Grok Bot activity</span>
      <button type="button" className="footer-btn" onClick={onAbout}>
        About
      </button>
    </footer>
  );
});
