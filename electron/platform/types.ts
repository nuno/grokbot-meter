import type { BrowserWindow, NativeImage, Rectangle, Tray } from "electron";
import type { LoginItemSettings } from "../../shared/types";

export type TrayClickHandlers = {
  /** Left click. `bounds` is the tray icon rect from Electron when it provides one. */
  onClick: (bounds: Rectangle | undefined) => void;
  /** Right-click Open. Shows the popup and does not hide it when it is already visible. */
  onOpen: () => void;
  showAbout: () => void;
  showSettings: () => void;
};

export type PlatformWindowChrome = {
  vibrancy?: "popover";
  visualEffectState?: "active";
  /** Windows 11 transient flyout. Ignored on older Windows and on macOS. */
  backgroundMaterial?: "acrylic";
  /** Solid fill when acrylic is unavailable. */
  backgroundColor?: string;
};

/**
 * OS-specific tray, popover anchoring, and quit.
 * `mac.ts` is the menu-bar app. `win.ts` is the notification-area app.
 */
export interface PlatformSeam {
  /**
   * Menu-bar title on macOS. On Windows the same string is drawn into the
   * notification icon, because `Tray.setTitle` is macOS-only.
   */
  applyTrayLabel(tray: Tray, title: string | undefined): void;
  /**
   * Template image on macOS. On Windows, a light/dark notification icon.
   * Returns the image the tray should install.
   */
  prepareTrayImage(image: NativeImage): NativeImage;
  positionWindow(win: BrowserWindow | null, trayBounds: Rectangle): void;
  /** Extra BrowserWindow options. Mac sets vibrancy. Windows sets acrylic or a solid fill. */
  browserWindowOverrides(): PlatformWindowChrome;
  /** Dock hide on macOS. Windows applies the flyout material. */
  afterWindowCreated(win: BrowserWindow): void;
  /** Tray click and context menu, including Quit. */
  bindTray(tray: Tray, handlers: TrayClickHandlers): void;
  /** `app` `before-quit`. */
  noteQuitting(): void;
  /** Close hides the popover until quit. */
  shouldHideInsteadOfQuit(): boolean;
  getLoginItem(): LoginItemSettings;
  setLoginItem(openAtLogin: boolean): LoginItemSettings;
}
