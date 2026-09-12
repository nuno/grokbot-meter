import type { GrokStatus, WeeklyStatus } from "../types";

// Re-export types for convenience — single import surface
export type { GrokStatus, WeeklyStatus, GrokAgent } from "../types";

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

export function fetchWeeklyStatus(): Promise<WeeklyStatus> {
  const api = getApi();
  if (!api) return Promise.reject(new Error("API unavailable"));
  return api.weeklyStatus();
}

export function fetchIsVisible(): Promise<boolean> {
  const api = getApi();
  if (!api?.isVisible) return Promise.resolve(true);
  return api.isVisible();
}

export function subscribeShowAbout(cb: () => void): Unsubscribe | undefined {
  return getApi()?.onShowAbout(cb);
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

export function setContentHeight(height: number): void {
  void getApi()?.setContentHeight?.(height);
}

export function quit(): void {
  void getApi()?.quit();
}

/** `bundle-analyzable-paths` friendly: static interval constant, not magic number in hooks. */
export function getPollInterval(): number {
  return POLL_INTERVAL_MS;
}
