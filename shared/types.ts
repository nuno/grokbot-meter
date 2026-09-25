export type GrokAgent = {
  id: string;
  name: string;
  title: string;
  lastActivityAt: number;
  todayMessages: number;
};

export type GrokStatus = {
  found: boolean;
  paths: string[];
  agentCount: number;
  todayAgentCount: number;
  todayMessageCount: number;
  agents: GrokAgent[];
};

export type OnDemandSpend = {
  usedCents: number;
  limitCents: number;
  resetTimestampMs: number | null;
};

export type WeeklyStatus = {
  signedIn: boolean;
  includedLimitZero: boolean;
  usagePercent: number | null;
  nextResetAt: number | null;
  currentPeriodStart: string | null;
  upgradeLabel: string | null;
  sandTrial: boolean;
  sandTrialExpiresAt: number | null;
  hasNonZeroIncludedLimit: boolean | null;
  hasAvailableUsage: boolean | null;
  accountEmail: string | null;
  onDemand: OnDemandSpend | null;
  error: string | null;
};

/** WeeklyStatus.error values that are safe to show verbatim (others collapse to "Can't load weekly"). */
export const WEEKLY_NOTICE = {
  keychainDenied: "Keychain access denied · reopen app to retry",
  openGrokBot: "Open Grok Bot to refresh sign-in",
} as const;

export function isWeeklyNotice(error: string | null | undefined): boolean {
  return error === WEEKLY_NOTICE.keychainDenied || error === WEEKLY_NOTICE.openGrokBot;
}

/** Electron panel resize mode — main vs overlay panels (About / Settings). */
export type PanelHeightMode = "main" | "about" | "settings";

export type LoginItemSettings = {
  openAtLogin: boolean;
  supported: boolean;
};
