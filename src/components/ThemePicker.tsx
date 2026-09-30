import { memo, useCallback } from "react";
import { useThemePref } from "../hooks/useLocalPref";
import { THEMES, themeDef, type ThemeId } from "../lib/themes";

const SystemThumb = memo(function SystemThumb() {
  return (
    <span className="theme-thumb theme-thumb--system" aria-hidden="true">
      <span className="theme-thumb-pane theme-thumb-pane--light">
        <span className="theme-thumb-bar" />
      </span>
      <span className="theme-thumb-pane theme-thumb-pane--dark">
        <span className="theme-thumb-bar" />
      </span>
    </span>
  );
});

/** Miniature of CupGauge — same silhouette, metal, and half-full pour. */
const CoffeeThumb = memo(function CoffeeThumb() {
  return (
    <span className="theme-thumb theme-thumb--coffee" aria-hidden="true">
      <span className="theme-thumb-glow" />
      <svg className="theme-thumb-cup" viewBox="0 0 120 116" fill="none">
        <defs>
          <linearGradient id="coffee-thumb-metal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#5C5C64" />
            <stop offset="0.18" stopColor="#D4D4DA" />
            <stop offset="0.34" stopColor="#F7F7FA" />
            <stop offset="0.52" stopColor="#9A9AA3" />
            <stop offset="0.7" stopColor="#E8E8ED" />
            <stop offset="1" stopColor="#4E4E56" />
          </linearGradient>
          <linearGradient id="coffee-thumb-brew" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7A4420" />
            <stop offset="1" stopColor="#251006" />
          </linearGradient>
          <linearGradient id="coffee-thumb-rim" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8E8E97" />
            <stop offset="0.4" stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#6E6E77" />
          </linearGradient>
          <radialGradient id="coffee-thumb-crema" cx="0.5" cy="0.45" r="0.55">
            <stop offset="0" stopColor="#E2B06A" />
            <stop offset="1" stopColor="#8A5524" />
          </radialGradient>
          <clipPath id="coffee-thumb-body">
            <path d="M20 26 L100 26 L88 92 Q86 102 76 102 L44 102 Q34 102 32 92 Z" />
          </clipPath>
        </defs>

        <ellipse cx="60" cy="108" rx="34" ry="5" fill="rgba(0,0,0,0.45)" />
        <g clipPath="url(#coffee-thumb-body)">
          <rect x="16" y="20" width="88" height="90" fill="url(#coffee-thumb-metal)" />
          <rect x="16" y="58" width="88" height="48" fill="url(#coffee-thumb-brew)" />
          <rect x="28" y="20" width="8" height="90" fill="rgba(255,255,255,0.28)" />
          <rect x="78" y="20" width="5" height="90" fill="rgba(255,255,255,0.16)" />
        </g>
        <ellipse cx="60" cy="58" rx="30" ry="5" fill="url(#coffee-thumb-crema)" />
        <ellipse cx="60" cy="26" rx="40" ry="8.5" fill="url(#coffee-thumb-rim)" />
        <ellipse cx="60" cy="26" rx="32" ry="6" fill="#120D09" />
        <ellipse cx="60" cy="26" rx="40" ry="8.5" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" fill="none" />
      </svg>
    </span>
  );
});

function ThemeThumb({ id }: { id: ThemeId }) {
  return id === "coffee" ? <CoffeeThumb /> : <SystemThumb />;
}

/** Settings control for the active theme — preview cards in a radiogroup. */
export const ThemePicker = memo(function ThemePicker() {
  const { theme, setTheme } = useThemePref();

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
      if (delta === 0) return;
      e.preventDefault();
      const i = THEMES.findIndex((t) => t.id === theme);
      const next = THEMES[(i + delta + THEMES.length) % THEMES.length];
      if (next) setTheme(next.id);
    },
    [theme, setTheme],
  );

  return (
    <div className="settings-row settings-row--stacked">
      <div className="settings-copy">
        <span className="settings-label" id="pref-theme-label">
          Theme
        </span>
        <p className="settings-hint">{themeDef(theme).hint}</p>
        <div className="theme-picker" role="radiogroup" aria-labelledby="pref-theme-label" onKeyDown={onKeyDown}>
          {THEMES.map((t) => {
            const selected = t.id === theme;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                className={`theme-option${selected ? " is-selected" : ""}`}
                onClick={() => setTheme(t.id)}
                title={t.hint}
              >
                <ThemeThumb id={t.id} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});
