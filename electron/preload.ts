import { contextBridge, ipcRenderer } from "electron";

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

const api = {
  grokStatus: (): Promise<GrokStatus> => ipcRenderer.invoke("grok:status"),
  weeklyStatus: (): Promise<WeeklyStatus> => ipcRenderer.invoke("weekly:status"),
  isVisible: (): Promise<boolean> => ipcRenderer.invoke("window:isVisible"),
  showAbout: () => ipcRenderer.invoke("show-about"),
  onShowAbout: (cb: () => void) => {
    const h = () => cb();
    ipcRenderer.on("show-about", h);
    return () => ipcRenderer.removeListener("show-about", h);
  },
  onFocusChanged: (cb: (visible: boolean) => void) => {
    const h = (_: unknown, v: boolean) => cb(v);
    ipcRenderer.on("window:focusChanged", h);
    return () => ipcRenderer.removeListener("window:focusChanged", h);
  },
  quit: () => ipcRenderer.invoke("app:quit"),
};

type ApiType = typeof api & {
  quit: () => Promise<void>;
};

contextBridge.exposeInMainWorld("api", api as typeof window.api);

declare global {
  interface Window {
    api: {
      grokStatus: () => Promise<GrokStatus>;
      weeklyStatus: () => Promise<WeeklyStatus>;
      isVisible: () => Promise<boolean>;
      showAbout: () => Promise<void>;
      onShowAbout: (cb: () => void) => () => void;
      onFocusChanged: (cb: (visible: boolean) => void) => () => void;
      quit: () => Promise<void>;
    };
  }
}
