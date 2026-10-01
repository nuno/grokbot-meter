import { app, Menu, nativeImage, nativeTheme, screen, type BrowserWindow, type NativeImage, type Tray } from "electron";
import { release } from "node:os";
import { moveWindowNearTray } from "./anchor";
import { winTrayPlacement } from "./position";
import type { PlatformSeam, TrayClickHandlers } from "./types";
import {
  composeWindowsTrayBitmap,
  cropToOpaque,
  supportsWindowsAcrylic,
  trayDevicePixels,
  type TrayBitmapSource,
} from "./winTrayBitmap";

let quitting = false;
let source: TrayBitmapSource | null = null;
let boundTray: Tray | null = null;
let popup: BrowserWindow | null = null;
let lastTitle: string | undefined;
let listenersOn = false;

/**
 * Windows notification area.
 *
 * `tray.setTitle` is macOS-only, so the weekly label (the same string the Mac
 * menu bar shows) is drawn into the icon. The tooltip stays the shared
 * `GrokBot Meter · N% weekly` string set by the main process. Left click
 * toggles the popup; anchoring is `winTrayPlacement`. Right click is a native
 * menu: Open, About, Settings, Quit. Open at login stays unsupported.
 *
 * Windows 11 22H2+ uses acrylic for the flyout. Older Windows gets a solid
 * light/dark fill. Icon ink follows the system light/dark theme.
 */
function acrylicOn(): boolean {
  return supportsWindowsAcrylic(process.platform, release());
}

function popupChrome(): { backgroundMaterial?: "acrylic"; backgroundColor?: string } {
  if (process.platform !== "win32") return {};
  if (acrylicOn()) return { backgroundMaterial: "acrylic" };
  return { backgroundColor: nativeTheme.shouldUseDarkColors ? "#202020" : "#F3F3F3" };
}

function applyPopupChrome(win: BrowserWindow): void {
  if (process.platform !== "win32") return;
  if (acrylicOn()) {
    win.setBackgroundMaterial("acrylic");
    return;
  }
  win.setBackgroundColor(nativeTheme.shouldUseDarkColors ? "#202020" : "#F3F3F3");
}

function captureSource(image: NativeImage): TrayBitmapSource | null {
  if (image.isEmpty()) return null;
  const scales = image.getScaleFactors();
  const scale = scales.length > 0 ? Math.max(...scales) : 1;
  const { width, height } = image.getSize(scale);
  if (width < 1 || height < 1) return null;
  const raw = image.toBitmap({ scaleFactor: scale });
  if (raw.length < width * height * 4) return null;
  return cropToOpaque(raw, width, height);
}

function devicePixels(tray?: Tray | null): number {
  try {
    const bounds = tray?.getBounds();
    const display =
      bounds && bounds.width > 0 && bounds.height > 0
        ? screen.getDisplayNearestPoint({
            x: bounds.x + bounds.width / 2,
            y: bounds.y + bounds.height / 2,
          })
        : screen.getPrimaryDisplay();
    return trayDevicePixels(display.scaleFactor);
  } catch {
    return 16;
  }
}

function trayImage(title: string | undefined, pixels: number): NativeImage {
  const bitmap = composeWindowsTrayBitmap({
    size: pixels,
    title,
    dark: nativeTheme.shouldUseDarkColors,
    source,
  });
  return nativeImage.createFromBitmap(bitmap, { width: pixels, height: pixels });
}

function paintTray(tray: Tray, title: string | undefined): void {
  lastTitle = title;
  tray.setImage(trayImage(title, devicePixels(tray)));
}

function repaint(): void {
  if (boundTray) {
    try {
      paintTray(boundTray, lastTitle);
    } catch (err) {
      console.error("[GrokBot Meter] tray label failed", err);
    }
  }
  if (popup) applyPopupChrome(popup);
}

function ensureListeners(): void {
  if (listenersOn) return;
  listenersOn = true;
  nativeTheme.on("updated", repaint);
  screen.on("display-metrics-changed", repaint);
}

function trayMenu(handlers: TrayClickHandlers) {
  return Menu.buildFromTemplate([
    { label: "&Open GrokBot Meter", click: () => handlers.onOpen() },
    { label: "&About GrokBot Meter", click: () => handlers.showAbout() },
    { label: "&Settings", click: () => handlers.showSettings() },
    { type: "separator" },
    { label: "&Quit GrokBot Meter", click: () => app.quit() },
  ]);
}

export const winPlatform: PlatformSeam = {
  applyTrayLabel(tray, title) {
    try {
      paintTray(tray, title);
    } catch (err) {
      console.error("[GrokBot Meter] tray label failed", err);
    }
  },
  prepareTrayImage(image) {
    try {
      source = captureSource(image);
      return trayImage(undefined, devicePixels(null));
    } catch (err) {
      console.error("[GrokBot Meter] tray icon failed", err);
      return image;
    }
  },
  positionWindow(win, bounds) {
    moveWindowNearTray(win, bounds, winTrayPlacement);
  },
  browserWindowOverrides() {
    return popupChrome();
  },
  afterWindowCreated(win) {
    popup = win;
    applyPopupChrome(win);
  },
  bindTray(tray, handlers) {
    boundTray = tray;
    ensureListeners();
    const menu = trayMenu(handlers);
    tray.on("right-click", () => tray.popUpContextMenu(menu));
    tray.on("click", (_event, bounds) => handlers.onClick(bounds));
    try {
      paintTray(tray, lastTitle);
    } catch (err) {
      console.error("[GrokBot Meter] tray icon failed", err);
    }
  },
  noteQuitting() {
    quitting = true;
  },
  shouldHideInsteadOfQuit() {
    return !quitting;
  },
  getLoginItem() {
    return { openAtLogin: false, supported: false };
  },
  setLoginItem() {
    return { openAtLogin: false, supported: false };
  },
};
