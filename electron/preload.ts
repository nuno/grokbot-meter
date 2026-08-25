import { contextBridge, ipcRenderer } from "electron";
import type { GrokStatus, WeeklyStatus } from "../shared/types";

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
  hideWindow: () => ipcRenderer.invoke("window:hide"),
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
      hideWindow: () => Promise<void>;
    };
  }
}
