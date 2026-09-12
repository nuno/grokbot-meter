import { useEffect, useState, useCallback } from "react";
import type { GrokStatus, WeeklyStatus } from "../types";
import { fetchGrokStatus, fetchWeeklyStatus, fetchIsVisible, getPollInterval, subscribeFocusChanged, subscribeWeeklyUpdated } from "../lib/api";

type Result = {
  status: GrokStatus | null;
  weekly: WeeklyStatus | null;
  error: string | null;
};

export function useGrokPolling(onWindowHide?: () => void): Result {
  const [status, setStatus] = useState<GrokStatus | null>(null);
  const [weekly, setWeekly] = useState<WeeklyStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Stable hide callback — avoids effect re-subscription (`rerender-dependencies` prefers primitives/stable refs)
  const handleHide = useCallback(() => {
    onWindowHide?.();
  }, [onWindowHide]);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let polling = false;

    const loadGrok = () => {
      void fetchGrokStatus()
        .then((next) => {
          if (cancelled) return;
          setStatus(next);
          setError(null);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : String(err));
        });
    };

    const loadWeekly = () => {
      void fetchWeeklyStatus()
        .then((next) => {
          if (cancelled) return;
          setWeekly(next);
        })
        .catch(() => {
          if (cancelled) return;
          setWeekly(null);
        });
    };

    // Initial + on-open: both. Interval while open: local grok only.
    const loadBoth = () => {
      loadGrok();
      loadWeekly();
    };

    const stopPolling = () => {
      if (timer !== undefined) {
        window.clearInterval(timer);
        timer = undefined;
      }
      polling = false;
    };

    const startPolling = () => {
      if (timer !== undefined) return;
      timer = window.setInterval(loadGrok, getPollInterval());
      polling = true;
    };

    const applyVisible = (visible: boolean) => {
      if (cancelled) return;
      if (visible) {
        if (!polling) {
          loadBoth();
          startPolling();
        }
      } else {
        stopPolling();
        handleHide();
      }
    };

    const syncVisible = () => {
      fetchIsVisible()
        .then((v) => applyVisible(v))
        .catch(() => {});
    };

    loadBoth();
    syncVisible();

    const unlistenFocus = subscribeFocusChanged(() => syncVisible());
    const unlistenWeekly = subscribeWeeklyUpdated((next) => {
      if (cancelled) return;
      setWeekly(next);
    });

    return () => {
      cancelled = true;
      stopPolling();
      unlistenFocus?.();
      unlistenWeekly?.();
    };
  }, [handleHide]);

  return { status, weekly, error };
}
