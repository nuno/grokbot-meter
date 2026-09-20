import { useEffect, useState } from "react";
import type { WeeklyPctSample } from "../types";
import { fetchWeeklyPctHistory } from "../lib/api";
import { PREVIEW_WEEKLY_CHART, previewWeeklyPctHistory } from "../lib/previewMocks";

/** Loads local weekly-% samples; refreshes when weekly snapshot updates. */
export function useWeeklyPctHistory(
  weeklyUpdatedAt: number | null,
  livePct: number | null = null,
): WeeklyPctSample[] {
  const [points, setPoints] = useState<WeeklyPctSample[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetchWeeklyPctHistory()
      .then((next) => {
        if (cancelled) return;
        setPoints(previewWeeklyPctHistory(next, livePct));
      })
      .catch(() => {
        if (cancelled) return;
        setPoints(previewWeeklyPctHistory([], livePct));
      });
    return () => {
      cancelled = true;
    };
  }, [weeklyUpdatedAt, livePct]);

  if (PREVIEW_WEEKLY_CHART && points.length < 2) {
    return previewWeeklyPctHistory([], livePct);
  }
  return points;
}
