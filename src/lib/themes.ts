/**
 * Theme registry. A theme is a `data-theme` value on <html> plus a token block
 * in App.css — everything else (break.css, CupGauge) hangs off that attribute.
 */

export type ThemeId = "system" | "break";

export type ThemeDef = {
  id: ThemeId;
  label: string;
  hint: string;
  /** Settings swatch — panel, accent, brand. */
  swatch: readonly [string, string, string];
  /** Panel ceiling in px. Break's cup gauge needs more room than the flat layout. */
  maxPanelHeight: number;
};

export const DEFAULT_THEME: ThemeId = "system";

export const THEMES: readonly ThemeDef[] = [
  {
    id: "system",
    label: "System",
    hint: "Follows the macOS light and dark appearance.",
    swatch: ["#F2F2F7", "#1C1C1E", "#007AFF"],
    maxPanelHeight: 520,
  },
  {
    id: "break",
    label: "Break",
    hint: "Coffee kiosk — the cup fills to your weekly usage.",
    swatch: ["#0A0A0C", "#3ED64C", "#E6197A"],
    maxPanelHeight: 640,
  },
];

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}

export function themeDef(id: ThemeId): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]!;
}

/** Called from main.tsx before render, and on every change — keep it idempotent. */
export function applyTheme(id: ThemeId): void {
  try {
    document.documentElement.dataset.theme = id;
  } catch {
    /* ignore — no document in non-browser contexts */
  }
}
