import type { GrokAgent } from "../types";

/** Flip off (or delete this file) when the long-list preview is done. */
export const PREVIEW_LONG_AGENT_LIST = false;

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
