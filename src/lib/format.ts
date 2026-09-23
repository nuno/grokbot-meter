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

export function formatResetsIn(nextResetAt: number | null | undefined): string {
  if (nextResetAt == null || !Number.isFinite(nextResetAt)) return "Resets in —";
  const ms = nextResetAt - Date.now();
  if (ms <= 0) return "Resets soon";
  const totalMinutes = Math.max(1, Math.round(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remH = hours % 24;
    return remH > 0 ? `Resets in ${days}d ${remH}h` : `Resets in ${days}d`;
  }
  if (hours >= 1) return `Resets in ${hours}h`;
  return `Resets in ${totalMinutes}m`;
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

