import { memo, useCallback } from "react";
import { useThemePref } from "../hooks/useLocalPref";
import { THEMES, themeDef } from "../lib/themes";

/** Settings control for the active theme — swatch pills in a radiogroup. */
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
                <span className="theme-swatch" aria-hidden="true">
                  {t.swatch.map((color) => (
                    <span key={color} style={{ background: color }} />
                  ))}
                </span>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});
