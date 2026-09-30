/** Local UI prefs only — not Cursor/Grok account settings. */

import { DEFAULT_THEME, isThemeId, type ThemeId } from "./themes";

export const REDACT_EMAIL_KEY = "grokbar:redactEmail";
export const SHOW_ON_DEMAND_KEY = "grokbar:showOnDemand";
export const THEME_KEY = "grokbar:theme";
/** Removed in v0.2.x — orphan key ignored; cleared once if present. */
const LEGACY_SHOW_WEEKLY_TREND_KEY = "grokbar:showWeeklyTrend";
export const PREFS_CHANGED_EVENT = "grokbar:prefs";

export type PrefKey = typeof REDACT_EMAIL_KEY | typeof SHOW_ON_DEMAND_KEY | typeof THEME_KEY;

function clearLegacyPrefs(): void {
  try {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(LEGACY_SHOW_WEEKLY_TREND_KEY) != null) {
      window.localStorage.removeItem(LEGACY_SHOW_WEEKLY_TREND_KEY);
    }
  } catch {
    /* ignore */
  }
}
clearLegacyPrefs();

function readFlag(key: string, defaultOn: boolean): boolean {
  try {
    if (typeof window === "undefined") return defaultOn;
    const raw = window.localStorage.getItem(key);
    if (raw === null) return defaultOn;
    // Stored as "0" = off, anything else (incl. "1") = on.
    return raw !== "0";
  } catch {
    return defaultOn;
  }
}

function notifyChanged(key: PrefKey): void {
  try {
    window.dispatchEvent(new CustomEvent(PREFS_CHANGED_EVENT, { detail: { key } }));
  } catch {
    /* ignore */
  }
}

function writeFlag(key: PrefKey, on: boolean): void {
  try {
    window.localStorage.setItem(key, on ? "1" : "0");
  } catch {
    /* ignore quota / private mode */
  }
  notifyChanged(key);
}

function readRaw(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: PrefKey, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore quota / private mode */
  }
  notifyChanged(key);
}

/** Default ON: redact unless explicitly "0". */
export function getRedactEmail(): boolean {
  return readFlag(REDACT_EMAIL_KEY, true);
}

export function setRedactEmail(redact: boolean): void {
  writeFlag(REDACT_EMAIL_KEY, redact);
}

/** Default ON: show on-demand row (meter or No spend limit) unless explicitly "0". */
export function getShowOnDemand(): boolean {
  return readFlag(SHOW_ON_DEMAND_KEY, true);
}

export function setShowOnDemand(show: boolean): void {
  writeFlag(SHOW_ON_DEMAND_KEY, show);
}

/** Unknown theme ids fall back to System rather than leaving the app unstyled. */
export function getTheme(): ThemeId {
  const raw = readRaw(THEME_KEY);
  return isThemeId(raw) ? raw : DEFAULT_THEME;
}

export function setTheme(id: ThemeId): void {
  writeRaw(THEME_KEY, id);
}
