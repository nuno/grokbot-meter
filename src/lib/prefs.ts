/** Local UI prefs only — not Cursor/Grok account settings. */

export const REDACT_EMAIL_KEY = "grokbar:redactEmail";
export const SHOW_ON_DEMAND_KEY = "grokbar:showOnDemand";
export const SHOW_WEEKLY_TREND_KEY = "grokbar:showWeeklyTrend";
export const PREFS_CHANGED_EVENT = "grokbar:prefs";

export type PrefKey = typeof REDACT_EMAIL_KEY | typeof SHOW_ON_DEMAND_KEY | typeof SHOW_WEEKLY_TREND_KEY;

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

/** Default ON: show labeled weekly trend when ≥2 samples exist. */
export function getShowWeeklyTrend(): boolean {
  return readFlag(SHOW_WEEKLY_TREND_KEY, true);
}

export function setShowWeeklyTrend(show: boolean): void {
  writeFlag(SHOW_WEEKLY_TREND_KEY, show);
}
