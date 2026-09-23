import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen } from "electron";
import { join } from "path";
import { existsSync, unlinkSync } from "fs";
import { getGrokStatus } from "./grokSource";
import { getGrokBotVersion } from "./grokBotApp";
import { getWeeklyStatusAsync, type WeeklyStatus } from "./weekly";
import type { PanelHeightMode } from "../shared/types";

if (!app.requestSingleInstanceLock()) app.quit();

let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let lastTrayBounds: Electron.Rectangle | null = null;
let isQuitting = false;
/** Swallow the tray click that caused a blur-hide, so the extra doesn't immediately reopen. */
let ignoreTrayClickUntil = 0;
/** When set, next setPanelContentHeight reveals the window (avoids About height flash). */
let pendingReveal: "about" | "settings" | null = null;
let lastMainHeight = 260;
let lastAboutHeight = 372;
/** Last official weekly snapshot — tray paint interval never fetches; only this + local grok. */
let lastWeekly: WeeklyStatus | null = null;
let weeklyRefreshTimer: ReturnType<typeof setTimeout> | null = null;

const TRAY_PAINT_MS = 30_000;
const WEEKLY_IDLE_MS = 3 * 60_000;
const WEEKLY_HIGH_USAGE_MS = 10 * 60_000;

const PANEL_WIDTH = 380;
const PANEL_MIN_HEIGHT = 260;
const PANEL_MAX_HEIGHT = 520;

function isOverlayMode(mode: PanelHeightMode): boolean {
  return mode === "about" || mode === "settings";
}

function normalizeHeightMode(mode?: PanelHeightMode): PanelHeightMode {
  if (mode === "about" || mode === "settings") return mode;
  return "main";
}

function setPanelContentHeight(contentHeight: number, mode: PanelHeightMode = "main") {
  if (!win || !Number.isFinite(contentHeight)) return;
  const nextH = Math.round(Math.min(PANEL_MAX_HEIGHT, Math.max(PANEL_MIN_HEIGHT, contentHeight)));
  if (isOverlayMode(mode)) lastAboutHeight = nextH;
  else lastMainHeight = nextH;
  const { width: curW, height: curH } = win.getContentBounds();
  const visible = win.isVisible();
  // Footer/header About/Settings: never shrink a visible window (content swap at main height).
  const skipShrink = isOverlayMode(mode) && visible && curH > nextH + 1;
  // Tray About pending: apply final height once, then show — one visible size.
  if ((pendingReveal === "about" || pendingReveal === "settings") && mode === pendingReveal) {
    if (!(curW === PANEL_WIDTH && curH === nextH)) {
      win.setContentSize(PANEL_WIDTH, nextH);
    }
    pendingReveal = null;
    if (lastTrayBounds) positionNearTray(lastTrayBounds);
    if (!win.isVisible()) {
      win.show();
      win.focus();
    }
    return;
  }
  if (!skipShrink && !(curW === PANEL_WIDTH && curH === nextH)) {
    win.setContentSize(PANEL_WIDTH, nextH);
  }
}

function trayTitleAndTooltip(weekly: WeeklyStatus, grok: ReturnType<typeof getGrokStatus>) {
  // Thin space (U+2009) before the label — pairs with right-padded tray.png for icon↔% gap.
  const gap = "\u2009";
  if (weekly.usagePercent != null && Number.isFinite(weekly.usagePercent)) {
    const r = Math.round(weekly.usagePercent);
    return { title: `${gap}${r}%`, tooltip: `GrokBar · ${r}% weekly` };
  }
  if (grok.todayMessageCount > 0) {
    return {
      title: gap + String(grok.todayMessageCount),
      tooltip: `GrokBar · ${grok.todayMessageCount} today`,
    };
  }
  return { title: undefined as string | undefined, tooltip: "GrokBar" };
}

function weeklyRefreshIntervalMs(weekly: WeeklyStatus | null): number {
  const pct = weekly?.usagePercent;
  if (pct != null && Number.isFinite(pct) && pct >= 80) return WEEKLY_HIGH_USAGE_MS;
  return WEEKLY_IDLE_MS;
}

function paintTrayFromCache() {
  if (!tray || !lastWeekly) return;
  const grok = getGrokStatus();
  const { title, tooltip } = trayTitleAndTooltip(lastWeekly, grok);
  tray.setToolTip(tooltip);
  if (process.platform === "darwin") tray.setTitle(title ?? "");
}

function applyWeeklyToTray(weekly: WeeklyStatus) {
  lastWeekly = weekly;
  if (!tray) return;
  const grok = getGrokStatus();
  const { title, tooltip } = trayTitleAndTooltip(weekly, grok);
  tray.setToolTip(tooltip);
  if (process.platform === "darwin") tray.setTitle(title ?? "");
  // Keep an open popover on the same official snapshot as the tray.
  win?.webContents.send("weekly:updated", weekly);
}

function scheduleWeeklyRefresh() {
  if (weeklyRefreshTimer) clearTimeout(weeklyRefreshTimer);
  weeklyRefreshTimer = setTimeout(() => {
    void refreshTray(true);
  }, weeklyRefreshIntervalMs(lastWeekly));
}

/** forceWeekly=true hits GetSandUsageStatus (via getWeeklyStatusAsync; cache still applies).
 *  forceWeekly=false only repaints from lastWeekly + local getGrokStatus. */
async function refreshTray(forceWeekly = false) {
  if (!tray) return;
  if (forceWeekly || !lastWeekly) {
    const weekly = await getWeeklyStatusAsync();
    applyWeeklyToTray(weekly);
    scheduleWeeklyRefresh();
    return;
  }
  paintTrayFromCache();
}

function positionNearTray(bounds: Electron.Rectangle) {
  if (!win) return;
  const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
  const w = win.getBounds().width;
  const h = win.getBounds().height;
  const isMac = process.platform === "darwin";
  // macOS: tray is in the menubar — keep gap minimal so window sits flush under the menubar
  // Windows/Linux: taskbar gap can be larger
  const GAP = isMac ? 0 : 6;
  const SIDE_MARGIN = 8;
  const TOP_MARGIN = isMac ? 0 : 8;
  const BOTTOM_MARGIN = 8;
  let x = bounds.x + bounds.width / 2 - w / 2;
  let y = bounds.y + bounds.height + GAP;
  if (bounds.y > display.workArea.y + display.workArea.height - 80) y = bounds.y - h - GAP;
  const area = display.workArea;
  const maxX = Math.max(area.x + SIDE_MARGIN, area.x + area.width - w - SIDE_MARGIN);
  const maxY = Math.max(area.y + TOP_MARGIN, area.y + area.height - h - BOTTOM_MARGIN);
  x = Math.max(area.x + SIDE_MARGIN, Math.min(maxX, x));
  y = Math.max(area.y + TOP_MARGIN, Math.min(maxY, y));
  // On macOS ensure we never push the popover down away from the menubar when the tray is at the top
  if (isMac && bounds.y < area.y) {
    y = Math.min(y, bounds.y + bounds.height + GAP);
  }
  win.setPosition(Math.round(x), Math.round(y));
}

function cursorOverTray(): boolean {
  if (!tray) return false;
  const p = screen.getCursorScreenPoint();
  const b = tray.getBounds();
  return p.x >= b.x && p.x < b.x + b.width && p.y >= b.y && p.y < b.y + b.height;
}

function togglePanel(bounds: Electron.Rectangle) {
  if (!win) return;
  lastTrayBounds = bounds;
  // Do not clear: a double-click's second mouse-up must stay swallowed until the window expires.
  if (Date.now() < ignoreTrayClickUntil) return;
  if (win.isVisible()) {
    win.hide();
    return;
  }
  // Reopen at last measured height so first paint doesn't jump from PANEL_MIN_HEIGHT.
  win.setContentSize(PANEL_WIDTH, lastMainHeight);
  positionNearTray(bounds);
  win.show();
  win.focus();
}

function showAbout() {
  if (!win) return;
  if (lastTrayBounds) positionNearTray(lastTrayBounds);
  // Already open (footer): just flip content — do NOT hide/fade/shrink (bad UX).
  if (win.isVisible()) {
    win.webContents.send("show-about");
    win.focus();
    return;
  }
  // From tray (hidden): flip to About while still hidden; show only after
  // about-mode measure so the first visible frame is the final height (no jump).
  pendingReveal = "about";
  win.webContents.send("show-about");
  setTimeout(() => {
    if (pendingReveal !== "about" || !win) return;
    pendingReveal = null;
    win.setContentSize(PANEL_WIDTH, lastAboutHeight);
    if (lastTrayBounds) positionNearTray(lastTrayBounds);
    win.show();
    win.focus();
  }, 500);
}

function showSettings() {
  if (!win) return;
  if (lastTrayBounds) positionNearTray(lastTrayBounds);
  if (win.isVisible()) {
    win.webContents.send("show-settings");
    win.focus();
    return;
  }
  // Hidden tray open: reveal after settings-mode measure (same as About).
  pendingReveal = "settings";
  win.webContents.send("show-settings");
  setTimeout(() => {
    if (pendingReveal !== "settings" || !win) return;
    pendingReveal = null;
    win.setContentSize(PANEL_WIDTH, lastMainHeight);
    if (lastTrayBounds) positionNearTray(lastTrayBounds);
    win.show();
    win.focus();
  }, 500);
}

function createWindow() {
  // <ai-start-DO NOT REMOVE THIS COMMENT>
  // const isDev = !!process.env["ELECTRON_RENDERER_URL"] || !!process.env.ELECTRON_START_URL;
  //<ai-end-DO NOT REMOVE THIS COMMENT />
  win = new BrowserWindow({
    width: PANEL_WIDTH,
    height: PANEL_MIN_HEIGHT,
    useContentSize: true,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: true,
    backgroundColor: "#00000000",
    vibrancy: "popover",
    visualEffectState: "active",
    roundedCorners: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  if (process.platform === "darwin" && app.dock) app.dock.hide();

  if (!app.isPackaged && process.env["ELECTRON_RENDERER_URL"]) win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  else if (process.env.ELECTRON_START_URL) win.loadURL(process.env.ELECTRON_START_URL);
  else win.loadFile(join(__dirname, "../renderer/index.html"));

  win.on("close", (e) => {
    if (isQuitting) return;
    e.preventDefault();
    win?.hide();
  });
  win.on("blur", () => {
    if (!win?.isVisible()) return;
    win.hide();
    // Only arm when the extra itself caused the blur (mousedown on tray).
    // Click-away / Esc / Cmd-Tab must not eat the next tray open.
    // 1s covers mouse-up and a double-click; do not clear on consume.
    if (cursorOverTray()) ignoreTrayClickUntil = Date.now() + 1000;
  });
  win.on("show", () => {
    win?.webContents.send("window:focusChanged", true);
    void refreshTray(true);
  });
  win.on("hide", () => win?.webContents.send("window:focusChanged", false));
  win.on("focus", () => win?.webContents.send("window:focusChanged", true));

  // Electron doesn't hide frameless popovers on Esc out-of-the-box — handle in main so it works
  // even when webContents isn't focused. Forward to renderer so About can close first.
  // Note: before-input-event has no DOM target info, so input-field guard is done in renderer
  // via document.activeElement check. Main only filters modifier combos to avoid hijacking
  // system shortcuts (Cmd+Esc etc.).
  win.webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown" || input.key !== "Escape") return;
    if (input.control || input.meta || input.alt) return;
    win?.webContents.send("escape-pressed");
    event.preventDefault();
  });
}

/** Tray PNGs: dev uses repo build/icons; packaged uses extraResources → Contents/Resources. */
function trayIconPath(file: string): string {
  if (app.isPackaged) return join(process.resourcesPath, file);
  return join(__dirname, "../../build/icons", file);
}

function createTray() {
  // Prefer 1x name so macOS/Electron can pick tray@2x.png beside it when present.
  let img = nativeImage.createFromPath(trayIconPath("tray.png"));
  if (img.isEmpty()) {
    img = nativeImage.createFromPath(trayIconPath("tray@2x.png"));
  }
  if (img.isEmpty()) {
    img = nativeImage.createFromPath(trayIconPath("icon.png"));
  }
  if (process.platform === "darwin" && !img.isEmpty()) img.setTemplateImage(true);
  if (img.isEmpty()) {
    console.error("[grokbar] tray icon missing — checked", trayIconPath("tray.png"));
  }
  const t = new Tray(img);
  tray = t;
  t.setToolTip("GrokBar");
  lastTrayBounds = t.getBounds();
  // No item icons — macOS status menus are text-only; role:"quit" added a bogus glyph.
  const menu = Menu.buildFromTemplate([
    { label: "About GrokBar", click: () => showAbout() },
    { label: "Settings…", click: () => showSettings() },
    { type: "separator" },
    { label: "Quit GrokBar", accelerator: "Command+Q", click: () => app.quit() },
  ]);
  t.on("right-click", () => t.popUpContextMenu(menu));
  t.on("click", (_e, bounds) => {
    if (bounds) lastTrayBounds = bounds;
    const b = bounds ?? t.getBounds() ?? lastTrayBounds;
    if (b) togglePanel(b);
  });
}

app.whenReady().then(() => {
  // Orphan from removed weekly spark — stop leaving unused samples on disk.
  try {
    const hist = join(app.getPath("userData"), "weekly-pct-history.json");
    if (existsSync(hist)) unlinkSync(hist);
  } catch {
    /* ignore */
  }
  createWindow();
  createTray();
  ipcMain.handle("grok:status", () => getGrokStatus());
  ipcMain.handle("app:grokBotVersion", () => getGrokBotVersion());
  ipcMain.handle("weekly:status", async () => {
    const weekly = await getWeeklyStatusAsync();
    applyWeeklyToTray(weekly);
    return weekly;
  });
  ipcMain.handle("show-about", () => { showAbout(); });
  ipcMain.handle("app:quit", () => app.quit());
  ipcMain.handle("window:isVisible", () => win?.isVisible() ?? false);
  ipcMain.handle("window:hide", () => { win?.hide(); });
  ipcMain.on("window:setContentHeight-sync", (event, height: number, mode?: PanelHeightMode) => {
    setPanelContentHeight(Number(height), normalizeHeightMode(mode));
    event.returnValue = true;
  });
  ipcMain.handle("window:setContentHeight", (_e, height: number, mode?: PanelHeightMode) => {
    setPanelContentHeight(Number(height), normalizeHeightMode(mode));
  });
  ipcMain.handle("settings:getLoginItem", () => {
    if (process.platform !== "darwin") return { openAtLogin: false, supported: false };
    const s = app.getLoginItemSettings();
    return { openAtLogin: Boolean(s.openAtLogin), supported: true };
  });
  ipcMain.handle("settings:setLoginItem", (_e, openAtLogin: boolean) => {
    if (process.platform !== "darwin") return { openAtLogin: false, supported: false };
    app.setLoginItemSettings({ openAtLogin: Boolean(openAtLogin) });
    const s = app.getLoginItemSettings();
    return { openAtLogin: Boolean(s.openAtLogin), supported: true };
  });
  setInterval(() => void refreshTray(false), TRAY_PAINT_MS);
  void refreshTray(true);
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", () => {});
app.on("activate", () => {
  if (win) {
    if (lastTrayBounds) positionNearTray(lastTrayBounds);
    win.show();
  }
});
