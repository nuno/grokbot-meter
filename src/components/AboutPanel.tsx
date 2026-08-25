import { memo } from "react";
import { GrokMark2Icon } from "./icons";

type Props = {
  onBack: () => void;
};

export const AboutPanel = memo(function AboutPanel({ onBack }: Props) {
  return (
    <div className="panel">
      <header className="header header-row">
        <button type="button" className="back" onClick={onBack} title="Back (Esc)">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M7.5 9L4.5 6 7.5 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>
      </header>
      <section className="card about">
        <div className="about-header">
          <div className="about-icon" aria-hidden="true">
            <GrokMark2Icon className="about-mark" />
          </div>
          <div className="about-titleblock">
            <h2>Grok Bot Bar</h2>
            <p className="tagline">Menu bar stats for Grok Bot.</p>
          </div>
        </div>
        <div className="about-divider" role="separator" />
        <div className="about-body">
          <p>Unofficial companion app. Not affiliated with, endorsed by, or a product of Cursor or xAI.</p>
          <p className="legal">Grok Bot and Cursor are trademarks of their respective owners.</p>
        </div>
        <div className="about-divider" role="separator" />
        <div className="about-footer">
          <p>Built by Grok Bot.</p>
          <p className="legal">© 2026 Nuno Costa</p>
        </div>
      </section>
    </div>
  );
});
