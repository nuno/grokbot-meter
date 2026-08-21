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
