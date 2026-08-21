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
  error: string | null;
};

declare global {
  interface Window {
    api?: {
      grokStatus: () => Promise<GrokStatus>;
      weeklyStatus: () => Promise<WeeklyStatus>;
      isVisible: () => Promise<boolean>;
      onShowAbout: (cb: () => void) => () => void;
      onFocusChanged: (cb: (visible: boolean) => void) => () => void;
    };
  }
}
