import { useEffect, useState, useCallback, useRef } from "react";
import type { GrokStatus, WeeklyStatus } from "../types";
import { fetchGrokStatus, fetchWeeklyStatus, fetchIsVisible, getPollInterval, subscribeFocusChanged, subscribeWeeklyUpdated } from "../lib/api";


function weeklyFetchFailed(reason: unknown): WeeklyStatus {
  const raw =
    reason instanceof Error
      ? reason.message
      : typeof reason === "string"
        ? reason
        : "";
  const error = (raw.trim() || "Can't load weekly").slice(0, 160);
  return {
    signedIn: false,
    includedLimitZero: false,
    usagePercent: null,
    nextResetAt: null,
    currentPeriodStart: null,
    upgradeLabel: null,
    sandTrial: false,
    sandTrialExpiresAt: null,
    hasNonZeroIncludedLimit: null,
    hasAvailableUsage: null,
    accountEmail: null,
    onDemand: null,
    error,
  };
}

type Result = {
  status: GrokStatus | null;
  weekly: WeeklyStatus | null;
  weeklyUpdatedAt: number | null;
  error: string | null;
  refreshing: boolean;
  refresh: () => Promise<void>;
};

export function useGrokPolling(onWindowHide?: () => void): Result {
  const [status, setStatus] = useState<GrokStatus | null>(null);
  const [weekly, setWeekly] = useState<WeeklyStatus | null>(null);
  const [weeklyUpdatedAt, setWeeklyUpdatedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const cancelledRef = useRef(false);

  // Stable hide callback — avoids effect re-subscription (`rerender-dependencies` prefers primitives/stable refs)
  const handleHide = useCallback(() => {
    onWindowHide?.();
  }, [onWindowHide]);

  const applyWeekly = useCallback((next: WeeklyStatus | null) => {
    setWeekly(next);
    if (next) setWeeklyUpdatedAt(Date.now());
  }, []);

  const refreshingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    try {
      const [grokResult, weeklyResult] = await Promise.allSettled([
        fetchGrokStatus(),
        fetchWeeklyStatus(true),
      ]);
      if (cancelledRef.current) return;
      if (grokResult.status === "fulfilled") {
        setStatus(grokResult.value);
        setError(null);
      } else {
        const err = grokResult.reason;
        setError(err instanceof Error ? err.message : String(err));
      }
      if (weeklyResult.status === "fulfilled") {
        applyWeekly(weeklyResult.value);
      } else {
        applyWeekly(weeklyFetchFailed(weeklyResult.reason));
      }
    } finally {
      refreshingRef.current = false;
      if (!cancelledRef.current) setRefreshing(false);
    }
  }, [applyWeekly]);

  useEffect(() => {
    cancelledRef.current = false;
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
          setWeeklyUpdatedAt(Date.now());
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setWeekly(weeklyFetchFailed(err));
          setWeeklyUpdatedAt(Date.now());
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
      setWeeklyUpdatedAt(Date.now());
    });

    return () => {
      cancelled = true;
      cancelledRef.current = true;
      stopPolling();
      unlistenFocus?.();
      unlistenWeekly?.();
    };
  }, [handleHide]);

  return { status, weekly, weeklyUpdatedAt, error, refreshing, refresh };
}
