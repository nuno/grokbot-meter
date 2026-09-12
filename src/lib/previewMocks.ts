import type { GrokAgent, OnDemandSpend, WeeklyStatus } from "../types";

/** Flip off (or delete this file) when the long-list preview is done. */
export const PREVIEW_LONG_AGENT_LIST = false;

/**
 * Local UI preview only — does not enable on-demand on the account or call spend APIs.
 * Flip to false when done reviewing the On-demand row.
 */
export const PREVIEW_ONDEMAND_SPEND = false;

/** Sample shaped like Grok Bot spendLimitUsage → OnDemandSpend ($12.40 / $50.00). */
export const PREVIEW_ONDEMAND_SAMPLE: OnDemandSpend = {
  usedCents: 1240,
  limitCents: 5000,
  resetTimestampMs: Date.now() + 12 * 24 * 60 * 60 * 1000,
};

export function previewWeeklyWithOnDemand(weekly: WeeklyStatus | null): WeeklyStatus | null {
  if (!PREVIEW_ONDEMAND_SPEND) return weekly;
  if (!weekly) {
    return {
      signedIn: true,
      includedLimitZero: false,
      usagePercent: 42,
      nextResetAt: Date.now() + 3 * 24 * 60 * 60 * 1000,
      currentPeriodStart: null,
      upgradeLabel: null,
      sandTrial: false,
      sandTrialExpiresAt: null,
      hasNonZeroIncludedLimit: true,
      hasAvailableUsage: true,
      accountEmail: null,
      error: null,
      onDemand: PREVIEW_ONDEMAND_SAMPLE,
    };
  }
  return { ...weekly, onDemand: PREVIEW_ONDEMAND_SAMPLE };
}


const NAMES = [
  "ClipToGo - UX/UI Research",
  "hey dev",
  "Research Bot",
  "Deploy Watcher",
  "Inbox Triage",
  "Calendar Sync",
  "Docs Summarizer",
  "PR Reviewer",
  "Nightly Digest",
  "Support Desk",
  "Metrics Scout",
  "Release Notes",
];

/** Extra mock rows so Today scrolls and the window hits PANEL_MAX_HEIGHT. */
export function previewPadAgents(agents: readonly GrokAgent[]): {
  agents: GrokAgent[];
  todayMessageCount: number;
  todayAgentCount: number;
} {
  const now = Date.now();
  const extras: GrokAgent[] = NAMES.map((name, i) => ({
    id: `preview-mock-${i}`,
    name,
    title: "Preview mock",
    lastActivityAt: now - (i + 1) * 3_600_000,
    todayMessages: i < 6 ? (i % 5) + 1 : 0,
  }));
  const merged = [...agents, ...extras.filter((e) => !agents.some((a) => a.name === e.name))];
  // Ensure at least ~14 rows for scroll preview
  while (merged.length < 14) {
    const i = merged.length;
    merged.push({
      id: `preview-mock-pad-${i}`,
      name: `Mock agent ${i + 1}`,
      title: "Preview mock",
      lastActivityAt: now - i * 7_200_000,
      todayMessages: i % 3 === 0 ? 2 : 0,
    });
  }
  const todayMessageCount = merged.reduce((n, a) => n + (a.todayMessages > 0 ? a.todayMessages : 0), 0);
  const todayAgentCount = merged.filter((a) => a.todayMessages > 0).length;
  return { agents: merged, todayMessageCount, todayAgentCount };
}
