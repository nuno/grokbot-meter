// Module-level cache — `js-cache-function-results`, `js-hoist-regexp` principles
const lastSeenCache = new Map<string, string>();
const MAX_LAST_SEEN_CACHE = 500;

export function formatLastSeen(ms: number): string {
  if (!ms) return "—";
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const cacheKey = `${ms}:${startToday}`;
  const cached = lastSeenCache.get(cacheKey);
  if (cached !== undefined) return cached;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "—";
  const startYesterday = startToday - 86_400_000;
  let result: string;
  if (ms >= startToday) {
    result = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } else if (ms >= startYesterday) {
    result = "yesterday";
  } else {
    result = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  if (lastSeenCache.size >= MAX_LAST_SEEN_CACHE) {
    const firstKey = lastSeenCache.keys().next().value;
    if (firstKey !== undefined) lastSeenCache.delete(firstKey);
  }
  lastSeenCache.set(cacheKey, result);
  return result;
}

export function agentLabel(agent: { name: string; id: string }): string {
  const name = agent.name.trim();
  return name || agent.id;
}

export function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

type ResetClock = {
  /** Whole days still ahead. 0 once under 24h remain, and when the reset is already due. */
  days: number;
  /** Hours left after those whole days. */
  hours: number;
  /** Minutes left after whole hours. Used only when under an hour remains. */
  minutes: number;
  due: boolean;
};

/**
 * One breakdown for the "Resets in" line and the Coffee days rail, so the two
 * cannot drift. `now` is injectable for tests; callers omit it.
 */
export function resetClock(nextResetAt: number, now: number): ResetClock | null {
  if (!Number.isFinite(nextResetAt) || !Number.isFinite(now)) return null;
  const ms = nextResetAt - now;
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, due: true };
  const totalMinutes = Math.max(1, Math.round(ms / 60_000));
  const totalHours = Math.floor(totalMinutes / 60);
  return {
    days: Math.floor(totalHours / 24),
    hours: totalHours % 24,
    minutes: totalMinutes % 60,
    due: false,
  };
}

export function formatResetsIn(nextResetAt: number | null | undefined, now = Date.now()): string {
  if (nextResetAt == null || !Number.isFinite(nextResetAt)) return "Resets in —";
  const clock = resetClock(nextResetAt, now);
  if (!clock) return "Resets in —";
  if (clock.due) return "Resets soon";
  if (clock.days >= 1) {
    return clock.hours > 0 ? `Resets in ${clock.days}d ${clock.hours}h` : `Resets in ${clock.days}d`;
  }
  if (clock.hours >= 1) return `Resets in ${clock.hours}h`;
  return `Resets in ${clock.minutes}m`;
}

/**
 * 0-based position on the 7-day rail. A full week remaining lights day 1;
 * under 24h left, or a reset already due, lights day 7. Whole days come from
 * resetClock, so the node stays put while "Resets in" still shows that day.
 */
export function elapsedDayIndex(resetAt: number | null, now = Date.now()): number | null {
  if (resetAt == null || !Number.isFinite(resetAt)) return null;
  const clock = resetClock(resetAt, now);
  if (!clock) return null;
  return Math.min(6, Math.max(0, 7 - clock.days));
}

export function redactEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  if (at <= 0) return "***";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1).trim();
  if (!domain) return `${local[0] ?? "*"}***@***`;
  const dot = domain.lastIndexOf(".");
  const maskedLocal = (local[0] ?? "*") + "***";
  const maskedDomain = (domain[0] ?? "*") + "***" + (dot > 0 ? domain.slice(dot) : "");
  return `${maskedLocal}@${maskedDomain}`;
}

export function formatUpdatedAt(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "Updated —";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "Updated —";
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `Updated ${time}`;
}

/** Cents → `$X.XX` (2 decimal places). */
export function formatCentsUsd(cents: number): string {
  if (!Number.isFinite(cents)) return "$—";
  return `$${(cents / 100).toFixed(2)}`;
}

