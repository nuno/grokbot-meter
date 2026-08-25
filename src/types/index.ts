import type { GrokStatus, WeeklyStatus } from "../../shared/types";

export type { GrokAgent, GrokStatus, WeeklyStatus } from "../../shared/types";

declare global {
  interface Window {
    api: {
      grokStatus: () => Promise<GrokStatus>;
      weeklyStatus: () => Promise<WeeklyStatus>;
      isVisible: () => Promise<boolean>;
      showAbout: () => Promise<void>;
      onShowAbout: (cb: () => void) => () => void;
      onFocusChanged: (cb: (visible: boolean) => void) => () => void;
      onEscapePressed: (cb: () => void) => () => void;
      quit: () => Promise<void>;
      hideWindow: () => Promise<void>;
    };
  }
}
