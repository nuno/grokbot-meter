import { app, Menu, type Tray } from "electron";
import { moveWindowNearTray } from "./anchor";
import { winTrayPlacement } from "./position";
import type { PlatformSeam, TrayClickHandlers } from "./types";

let quitting = false;

/**
 * Thin stub. Same tray menu and hide-on-close policy as the previous shared
 * non-darwin path. The Windows tray proof of concept replaces this module
 * (notification-area label, right-click Quit / Open). No tray title yet.
 */
function trayMenu(handlers: TrayClickHandlers) {
  return Menu.buildFromTemplate([
    { label: "About GrokBot Meter", click: () => handlers.showAbout() },
    { label: "Settings…", click: () => handlers.showSettings() },
    { type: "separator" },
    { label: "Quit GrokBot Meter", accelerator: "Command+Q", click: () => app.quit() },
  ]);
}

export const winPlatform: PlatformSeam = {
  applyTrayLabel() {
    // Weekly % in the notification area is the tray proof of concept.
  },
  prepareTrayImage() {},
  positionWindow(win, bounds) {
    moveWindowNearTray(win, bounds, winTrayPlacement);
  },
  browserWindowOverrides() {
    return {};
  },
  afterWindowCreated() {},
  bindTray(tray: Tray, handlers) {
    const menu = trayMenu(handlers);
    tray.on("right-click", () => tray.popUpContextMenu(menu));
    tray.on("click", (_event, bounds) => handlers.onClick(bounds));
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
