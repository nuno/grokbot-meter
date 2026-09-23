/** Local UI prefs only — not Cursor/Grok account settings. */

export const REDACT_EMAIL_KEY = "grokbar:redactEmail";
export const SHOW_ON_DEMAND_KEY = "grokbar:showOnDemand";
/** Removed in v0.2.x — orphan key ignored; cleared once if present. */
const LEGACY_SHOW_WEEKLY_TREND_KEY = "grokbar:showWeeklyTrend";
export const PREFS_CHANGED_EVENT = "grokbar:prefs";

export type PrefKey = typeof REDACT_EMAIL_KEY | typeof SHOW_ON_DEMAND_KEY;

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

function writeFlag(key: PrefKey, on: boolean): void {
  try {
    window.localStorage.setItem(key, on ? "1" : "0");
  } catch {
    /* ignore quota / private mode */
  }
  try {
    window.dispatchEvent(new CustomEvent(PREFS_CHANGED_EVENT, { detail: { key } }));
  } catch {
    /* ignore */
  }
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
