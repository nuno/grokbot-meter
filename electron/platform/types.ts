import type { BrowserWindow, NativeImage, Rectangle, Tray } from "electron";
import type { LoginItemSettings } from "../../shared/types";

export type TrayClickHandlers = {
  /** Left click. `bounds` is the tray icon rect from Electron when it provides one. */
  onClick: (bounds: Rectangle | undefined) => void;
  showAbout: () => void;
  showSettings: () => void;
};

/**
 * OS-specific tray, popover anchoring, and quit.
 * `mac.ts` is the menu-bar app. `win.ts` is a stub for the later tray proof of concept.
 */
export interface PlatformSeam {
  /** Menu-bar title. Windows tray text is not implemented yet. */
  applyTrayLabel(tray: Tray, title: string | undefined): void;
  /** Template image on macOS. No-op elsewhere. */
  prepareTrayImage(image: NativeImage): void;
  positionWindow(win: BrowserWindow | null, trayBounds: Rectangle): void;
  /** Extra BrowserWindow options. Mac sets vibrancy; the Windows stub adds none. */
  browserWindowOverrides(): { vibrancy?: "popover"; visualEffectState?: "active" };
  /** Dock hide on macOS. No-op elsewhere. */
  afterWindowCreated(): void;
  /** Tray click and context menu, including Quit. */
  bindTray(tray: Tray, handlers: TrayClickHandlers): void;
  /** `app` `before-quit`. */
  noteQuitting(): void;
  /** Close hides the popover until quit. */
  shouldHideInsteadOfQuit(): boolean;
  getLoginItem(): LoginItemSettings;
  setLoginItem(openAtLogin: boolean): LoginItemSettings;
}
