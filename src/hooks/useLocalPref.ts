import { useCallback, useEffect, useState } from "react";
import {
  PREFS_CHANGED_EVENT,
  type PrefKey,
  getRedactEmail,
  getShowOnDemand,
  getShowWeeklyTrend,
  setRedactEmail,
  setShowOnDemand,
  setShowWeeklyTrend,
  REDACT_EMAIL_KEY,
  SHOW_ON_DEMAND_KEY,
  SHOW_WEEKLY_TREND_KEY,
} from "../lib/prefs";

function useBoolPref(
  key: PrefKey,
  read: () => boolean,
  write: (v: boolean) => void,
): [boolean, (next: boolean) => void, () => void] {
  const [value, setValue] = useState(read);

  useEffect(() => {
    const sync = () => setValue(read());
    const onPrefs = (e: Event) => {
      const detail = (e as CustomEvent<{ key?: string }>).detail;
      if (!detail?.key || detail.key === key) sync();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === key || e.key === null) sync();
    };
    window.addEventListener(PREFS_CHANGED_EVENT, onPrefs);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(PREFS_CHANGED_EVENT, onPrefs);
      window.removeEventListener("storage", onStorage);
    };
  }, [key, read]);

  const set = useCallback(
    (next: boolean) => {
      write(next);
      setValue(next);
    },
    [write],
  );

  const toggle = useCallback(() => set(!value), [set, value]);

  return [value, set, toggle];
}

/** Syncs with Settings + WeeklyCard via localStorage + same-tab custom event. */
export function useRedactEmail() {
  const [redacted, setRedacted, toggle] = useBoolPref(REDACT_EMAIL_KEY, getRedactEmail, setRedactEmail);
  return { redacted, setRedacted, toggle };
}

/** When false, WeeklyCard hides on-demand even if API/mock data exists. */
export function useShowOnDemand() {
  const [show, setShow, toggle] = useBoolPref(SHOW_ON_DEMAND_KEY, getShowOnDemand, setShowOnDemand);
  return { show, setShow, toggle };
}

/** When false, labeled weekly trend spark under the meter is hidden. */
export function useShowWeeklyTrend() {
  const [show, setShow, toggle] = useBoolPref(SHOW_WEEKLY_TREND_KEY, getShowWeeklyTrend, setShowWeeklyTrend);
  return { show, setShow, toggle };
}
