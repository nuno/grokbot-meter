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

const CoffeeThumb = memo(function CoffeeThumb() {
  return (
    <span className="theme-thumb theme-thumb--coffee" aria-hidden="true">
      <span className="theme-thumb-glow" />
      <svg className="theme-thumb-cup" viewBox="0 0 32 30" fill="none">
        <ellipse cx="16" cy="7.2" rx="10.2" ry="3.1" fill="#C8C8D0" />
        <path d="M6.6 7.4 9.4 25.2c.4 1.6 6.6 2.4 13.2 0L25.4 7.4" fill="url(#thumb-metal)" />
        <path d="M9.2 11.2 11 23.4c.3 1.1 5 1.7 10 0L22.8 11.2" fill="url(#thumb-coffee)" />
        <ellipse cx="16" cy="11.2" rx="6.8" ry="2" fill="#8A5524" />
        <defs>
          <linearGradient id="thumb-metal" x1="16" y1="7" x2="16" y2="27">
            <stop stopColor="#8A8A92" />
            <stop offset="0.45" stopColor="#E8E8EC" />
            <stop offset="1" stopColor="#5C5C64" />
          </linearGradient>
          <linearGradient id="thumb-coffee" x1="16" y1="11" x2="16" y2="24">
            <stop stopColor="#7A4420" />
            <stop offset="1" stopColor="#251006" />
          </linearGradient>
        </defs>
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
