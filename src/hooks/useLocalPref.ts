import { useCallback, useSyncExternalStore } from "react";
import {
  PREFS_CHANGED_EVENT,
  type PrefKey,
  getRedactEmail,
  getShowOnDemand,
  setRedactEmail,
  setShowOnDemand,
  REDACT_EMAIL_KEY,
  SHOW_ON_DEMAND_KEY,
} from "../lib/prefs";

/**
 * localStorage-backed boolean pref.
 * useSyncExternalStore (not useEffect+useState) so React Activity hide/show
 * re-subscribes and re-reads on become-visible — Settings toggles stay in sync
 * with WeeklyCard without a manual remount sync.
 */
function subscribePref(key: PrefKey, onStoreChange: () => void): () => void {
  const onPrefs = (e: Event) => {
    const detail = (e as CustomEvent<{ key?: string }>).detail;
    if (!detail?.key || detail.key === key) onStoreChange();
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === key || e.key === null) onStoreChange();
  };
  window.addEventListener(PREFS_CHANGED_EVENT, onPrefs);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(PREFS_CHANGED_EVENT, onPrefs);
    window.removeEventListener("storage", onStorage);
  };
}

function useBoolPref(
  key: PrefKey,
  read: () => boolean,
  write: (v: boolean) => void,
): [boolean, (next: boolean) => void, () => void] {
  const value = useSyncExternalStore(
    (onStoreChange) => subscribePref(key, onStoreChange),
    read,
    read,
  );

  const set = useCallback(
    (next: boolean) => {
      write(next);
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
