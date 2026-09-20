import type { GrokStatus, WeeklyStatus, WeeklyPctSample, PanelHeightMode, LoginItemSettings } from "../../shared/types";

export type { GrokAgent, GrokStatus, WeeklyStatus, WeeklyPctSample, OnDemandSpend, PanelHeightMode, LoginItemSettings } from "../../shared/types";

declare global {
  interface Window {
    api: {
      grokStatus: () => Promise<GrokStatus>;
      weeklyStatus: () => Promise<WeeklyStatus>;
      weeklyPctHistory: () => Promise<WeeklyPctSample[]>;
      isVisible: () => Promise<boolean>;
      showAbout: () => Promise<void>;
      onShowAbout: (cb: () => void) => () => void;
      onShowSettings: (cb: () => void) => () => void;
      onFocusChanged: (cb: (visible: boolean) => void) => () => void;
      onEscapePressed: (cb: () => void) => () => void;
      onWeeklyUpdated: (cb: (weekly: WeeklyStatus) => void) => () => void;
      quit: () => Promise<void>;
      hideWindow: () => Promise<void>;
      setContentHeight: (height: number, mode?: PanelHeightMode) => void;
      grokBotVersion: () => Promise<string | null>;
      getLoginItem: () => Promise<LoginItemSettings>;
      setLoginItem: (openAtLogin: boolean) => Promise<LoginItemSettings>;
    };
  }
}
