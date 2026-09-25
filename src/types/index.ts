import type { GrokStatus, WeeklyStatus, PanelHeightMode, LoginItemSettings } from "../../shared/types";

export type { GrokAgent, GrokStatus, WeeklyStatus, OnDemandSpend, PanelHeightMode, LoginItemSettings } from "../../shared/types";
export { isWeeklyNotice } from "../../shared/types";

declare global {
  interface Window {
    api: {
      grokStatus: () => Promise<GrokStatus>;
      weeklyStatus: (force?: boolean) => Promise<WeeklyStatus>;
      isVisible: () => Promise<boolean>;
      onShowAbout: (cb: () => void) => () => void;
      onShowSettings: (cb: () => void) => () => void;
      onFocusChanged: (cb: (visible: boolean) => void) => () => void;
      onEscapePressed: (cb: () => void) => () => void;
      onWeeklyUpdated: (cb: (weekly: WeeklyStatus) => void) => () => void;
      quit: () => Promise<void>;
      openSponsors: () => Promise<void>;
      hideWindow: () => Promise<void>;
      setContentHeight: (height: number, mode?: PanelHeightMode) => void;
      grokBotVersion: () => Promise<string | null>;
      getVersion: () => Promise<string>;
      getLoginItem: () => Promise<LoginItemSettings>;
      setLoginItem: (openAtLogin: boolean) => Promise<LoginItemSettings>;
    };
  }
}
