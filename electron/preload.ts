import { contextBridge, ipcRenderer } from "electron";
import type { GrokStatus, WeeklyStatus, PanelHeightMode, LoginItemSettings } from "../shared/types";

const api = {
  grokStatus: (): Promise<GrokStatus> => ipcRenderer.invoke("grok:status"),
  weeklyStatus: (force = false): Promise<WeeklyStatus> => ipcRenderer.invoke("weekly:status", force),
  isVisible: (): Promise<boolean> => ipcRenderer.invoke("window:isVisible"),
  onShowAbout: (cb: () => void) => {
    const h = () => cb();
    ipcRenderer.on("show-about", h);
    return () => ipcRenderer.removeListener("show-about", h);
  },
  onShowSettings: (cb: () => void) => {
    const h = () => cb();
    ipcRenderer.on("show-settings", h);
    return () => ipcRenderer.removeListener("show-settings", h);
  },
  onFocusChanged: (cb: (visible: boolean) => void) => {
    const h = (_: unknown, v: boolean) => cb(v);
    ipcRenderer.on("window:focusChanged", h);
    return () => ipcRenderer.removeListener("window:focusChanged", h);
  },
  onEscapePressed: (cb: () => void) => {
    const h = () => cb();
    ipcRenderer.on("escape-pressed", h);
    return () => ipcRenderer.removeListener("escape-pressed", h);
  },
  onWeeklyUpdated: (cb: (weekly: WeeklyStatus) => void) => {
    const h = (_: unknown, weekly: WeeklyStatus) => cb(weekly);
    ipcRenderer.on("weekly:updated", h);
    return () => ipcRenderer.removeListener("weekly:updated", h);
  },
  quit: () => ipcRenderer.invoke("app:quit"),
  hideWindow: () => ipcRenderer.invoke("window:hide"),
  setContentHeight: (height: number, mode: PanelHeightMode = "main") => {
    // sendSync so useLayoutEffect can resize before paint (footer About flash).
    ipcRenderer.sendSync("window:setContentHeight-sync", height, mode);
  },
  grokBotVersion: (): Promise<string | null> => ipcRenderer.invoke("app:grokBotVersion"),
  getVersion: (): Promise<string> => ipcRenderer.invoke("app:getVersion"),
  getLoginItem: (): Promise<LoginItemSettings> => ipcRenderer.invoke("settings:getLoginItem"),
  setLoginItem: (openAtLogin: boolean): Promise<LoginItemSettings> =>
    ipcRenderer.invoke("settings:setLoginItem", openAtLogin),
};

contextBridge.exposeInMainWorld("api", api as typeof window.api);

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
      hideWindow: () => Promise<void>;
      setContentHeight: (height: number, mode?: PanelHeightMode) => void;
      grokBotVersion: () => Promise<string | null>;
      getVersion: () => Promise<string>;
      getLoginItem: () => Promise<LoginItemSettings>;
      setLoginItem: (openAtLogin: boolean) => Promise<LoginItemSettings>;
    };
  }
}
