import { memo, useEffect, useState } from "react";
import { fetchAppVersion, fetchGrokBotVersion, openSponsors } from "../lib/api";
import { GrokMark2Icon } from "./icons";

type Props = {
  onBack: () => void;
};

export const AboutPanel = memo(function AboutPanel({ onBack }: Props) {
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [grokBotVersion, setGrokBotVersion] = useState<string | null>(null);
  const [grokBotVersionLoaded, setGrokBotVersionLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchAppVersion()
      .then((v) => {
        if (!cancelled) setAppVersion(v);
      })
      .catch(() => {
        if (!cancelled) setAppVersion(null);
      });
    void fetchGrokBotVersion()
      .then((v) => {
        if (!cancelled) {
          setGrokBotVersion(v);
          setGrokBotVersionLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGrokBotVersion(null);
          setGrokBotVersionLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Always reserve the same second version line so About height doesn't jump after open.
  const grokBotLine = !grokBotVersionLoaded
    ? "Grok Bot …"
    : grokBotVersion
      ? `Grok Bot ${grokBotVersion}`
      : "Grok Bot — not installed";

  const versionLine = appVersion ? `Version ${appVersion}` : "Version …";

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
            <h2>GrokBot Meter</h2>
            <p className="tagline">Menu bar stats for Grok Bot.</p>
            <p className="about-version">{versionLine}</p>
            <p className={`about-version${!grokBotVersionLoaded ? " is-pending" : ""}`}>{grokBotLine}</p>
          </div>
        </div>
        <div className="about-divider" role="separator" />
        <div className="about-body">
          <p>Unofficial companion app. Not affiliated with, endorsed by, or a product of Cursor or xAI.</p>
          <p className="about-trust">Uses official Grok Bot meters only.</p>
          <p className="legal">Grok Bot and Cursor are trademarks of their respective owners.</p>
        </div>
        <div className="about-divider" role="separator" />
        <div className="about-footer">
          <p>Independent project · built with Grok Bot.</p>
          <button type="button" className="about-sponsor" onClick={() => void openSponsors()}>
            Sponsor
          </button>
          <p className="legal">© 2026 Nuno Costa</p>
        </div>
      </section>
    </div>
  );
});
