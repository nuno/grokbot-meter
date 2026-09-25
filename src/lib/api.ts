import type { GrokStatus, WeeklyStatus, PanelHeightMode, LoginItemSettings } from "../types";

// Re-export types for convenience — single import surface
export type { GrokStatus, WeeklyStatus, OnDemandSpend, GrokAgent, PanelHeightMode, LoginItemSettings } from "../types";

export type Api = NonNullable<Window["api"]>;
export type Unsubscribe = () => void;

const POLL_INTERVAL_MS = 15_000;

/** Safe accessor — avoids repeated `window.api?.` optional chains and centralizes availability check. */
export function getApi(): Api | undefined {
  return window.api;
}

/** Typed wrappers with consistent error handling — `async-parallel` caller can start both together. */
export function fetchGrokStatus(): Promise<GrokStatus> {
  const api = getApi();
  if (!api) return Promise.reject(new Error("API unavailable"));
  return api.grokStatus();
}

/** `force` skips the main-process weekly cache (Refresh button). */
export function fetchWeeklyStatus(force = false): Promise<WeeklyStatus> {
  const api = getApi();
  if (!api) return Promise.reject(new Error("API unavailable"));
  return api.weeklyStatus(force);
}

export function fetchGrokBotVersion(): Promise<string | null> {
  const api = getApi();
  if (!api?.grokBotVersion) return Promise.resolve(null);
  return api.grokBotVersion();
}

export function fetchAppVersion(): Promise<string> {
  const api = getApi();
  if (!api?.getVersion) return Promise.resolve("0.0.0");
  return api.getVersion();
}

export function fetchIsVisible(): Promise<boolean> {
  const api = getApi();
  if (!api?.isVisible) return Promise.resolve(true);
  return api.isVisible();
}

export function fetchLoginItem(): Promise<LoginItemSettings> {
  const api = getApi();
  if (!api?.getLoginItem) return Promise.resolve({ openAtLogin: false, supported: false });
  return api.getLoginItem();
}

export function setLoginItem(openAtLogin: boolean): Promise<LoginItemSettings> {
  const api = getApi();
  if (!api?.setLoginItem) return Promise.resolve({ openAtLogin: false, supported: false });
  return api.setLoginItem(openAtLogin);
}

export function subscribeShowAbout(cb: () => void): Unsubscribe | undefined {
  return getApi()?.onShowAbout(cb);
}

export function subscribeShowSettings(cb: () => void): Unsubscribe | undefined {
  return getApi()?.onShowSettings?.(cb);
}

export function subscribeFocusChanged(cb: (visible: boolean) => void): Unsubscribe | undefined {
  return getApi()?.onFocusChanged(cb);
}

export function subscribeEscapePressed(cb: () => void): Unsubscribe | undefined {
  return getApi()?.onEscapePressed(cb);
}

export function subscribeWeeklyUpdated(cb: (weekly: WeeklyStatus) => void): Unsubscribe | undefined {
  return getApi()?.onWeeklyUpdated?.(cb);
}

export function hideWindow(): void {
  void getApi()?.hideWindow();
}


export function setContentHeight(height: number, mode: PanelHeightMode = "main"): void {
  void getApi()?.setContentHeight?.(height, mode);
}

export function quit(): void {
  void getApi()?.quit();
}

/** `bundle-analyzable-paths` friendly: static interval constant, not magic number in hooks. */
export function getPollInterval(): number {
  return POLL_INTERVAL_MS;
}
