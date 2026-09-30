/**
 * Theme registry. A theme is a `data-theme` value on <html> plus a token block
 * in App.css — everything else (coffee.css, CupGauge) hangs off that attribute.
 */

export type ThemeId = "system" | "coffee";

export type ThemeDef = {
  id: ThemeId;
  label: string;
  hint: string;
  /** Panel ceiling in px. Coffee's cup gauge needs more room than the flat layout. */
  maxPanelHeight: number;
};

export const DEFAULT_THEME: ThemeId = "system";

export const THEMES: readonly ThemeDef[] = [
  {
    id: "system",
    label: "System",
    hint: "Follows the macOS light and dark appearance.",
    maxPanelHeight: 520,
  },
  {
    id: "coffee",
    label: "Coffee",
    hint: "The cup fills to your weekly usage.",
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
