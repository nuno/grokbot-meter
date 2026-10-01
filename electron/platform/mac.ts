import { app, Menu, type Tray } from "electron";
import { moveWindowNearTray } from "./anchor";
import { macTrayPlacement } from "./position";
import type { PlatformSeam, TrayClickHandlers } from "./types";

let quitting = false;

function trayMenu(handlers: TrayClickHandlers) {
  // No item icons — macOS status menus are text-only; role:"quit" added a bogus glyph.
  return Menu.buildFromTemplate([
    { label: "About GrokBot Meter", click: () => handlers.showAbout() },
    { label: "Settings…", click: () => handlers.showSettings() },
    { type: "separator" },
    { label: "Quit GrokBot Meter", accelerator: "Command+Q", click: () => app.quit() },
  ]);
}

export const macPlatform: PlatformSeam = {
  applyTrayLabel(tray, title) {
    tray.setTitle(title ?? "");
  },
  prepareTrayImage(image) {
    if (!image.isEmpty()) image.setTemplateImage(true);
    return image;
  },
  positionWindow(win, bounds) {
    moveWindowNearTray(win, bounds, macTrayPlacement);
  },
  browserWindowOverrides() {
    return { vibrancy: "popover", visualEffectState: "active" };
  },
  afterWindowCreated() {
    if (app.dock) app.dock.hide();
  },
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
    const s = app.getLoginItemSettings();
    return { openAtLogin: Boolean(s.openAtLogin), supported: true };
  },
  setLoginItem(openAtLogin) {
    app.setLoginItemSettings({ openAtLogin: Boolean(openAtLogin) });
    const s = app.getLoginItemSettings();
    return { openAtLogin: Boolean(s.openAtLogin), supported: true };
  },
};
