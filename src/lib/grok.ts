import type { GrokAgent, GrokStatus } from "../types";

// Single source for empty list identity — prevents `[]` recreation (`rerender-memo-with-default-value`)
export const EMPTY_AGENTS: readonly GrokAgent[] = [];

// Pure selectors — no hooks, easily testable, keep App.tsx thin
export function selectAgents(status: GrokStatus | null): readonly GrokAgent[] {
  return status?.agents ?? EMPTY_AGENTS;
}

export function selectTodayStats(status: GrokStatus | null) {
  return {
    todayMessageCount: status?.todayMessageCount ?? 0,
    todayAgentCount: status?.todayAgentCount ?? 0,
  };
}

export function selectIsLoading(status: GrokStatus | null, error: string | null): boolean {
  return status === null && !error;
}

/** Agents with activity today — list must match todayAgentCount. */
export function selectTodayAgents(agents: readonly GrokAgent[]): readonly GrokAgent[] {
  return agents.filter((a) => a.todayMessages > 0);
}

/** Idle agents for the empty-today Recent section (cap 8). */
export function selectRecentAgents(agents: readonly GrokAgent[], cap = 8): readonly GrokAgent[] {
  return agents.filter((a) => a.todayMessages === 0).slice(0, cap);
}

/** Never surface raw IPC/filesystem errors in the Today card. */
export function calmTodayError(error: string | null): string | null {
  return error ? "Can't load today" : null;
}
