import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen } from "electron";
import { join } from "path";
import { getGrokStatus } from "./grokSource";
import { getWeeklyStatus, getWeeklyStatusAsync } from "./weekly";

if (!app.requestSingleInstanceLock()) app.quit();

let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let lastTrayBounds: Electron.Rectangle | null = null;
let ignoreBlurUntil = 0;
let lastBlurHide = 0;

function ignoreBlurBriefly() {
  ignoreBlurUntil = Date.now() + 200;
}
function blurShouldHide() {
  return Date.now() >= ignoreBlurUntil;
}
function markBlurHide() {
  lastBlurHide = Date.now();
}
function recentlyHiddenByBlur() {
  return Date.now() - lastBlurHide < 250;
}

function trayTitleAndTooltip(weekly: ReturnType<typeof getWeeklyStatus>, grok: ReturnType<typeof getGrokStatus>) {
  if (weekly.usagePercent != null && Number.isFinite(weekly.usagePercent)) {
    const r = Math.round(weekly.usagePercent);
    return { title: `${r}%`, tooltip: `GrokBar · ${r}% weekly` };
  }
  if (grok.todayMessageCount > 0) return { title: String(grok.todayMessageCount), tooltip: `GrokBar · ${grok.todayMessageCount} today` };
  return { title: undefined as string | undefined, tooltip: "GrokBar" };
}

async function refreshTray() {
  if (!tray) return;
  const weekly = await getWeeklyStatusAsync().catch(() => getWeeklyStatus());
  const grok = getGrokStatus();
  const { title, tooltip } = trayTitleAndTooltip(weekly, grok);
  tray.setToolTip(tooltip);
  if (process.platform === "darwin") tray.setTitle(title ?? "");
}

function positionNearTray(bounds: Electron.Rectangle) {
  if (!win) return;
  const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
  const w = win.getBounds().width;
  const h = win.getBounds().height;
  let x = bounds.x + bounds.width / 2 - w / 2;
  let y = bounds.y + bounds.height + 6;
  const area = display.workArea;
  if (bounds.y > area.y + area.height - 80) y = bounds.y - h - 6;
  const maxX = Math.max(area.x + 8, area.x + area.width - w - 8);
  const maxY = Math.max(area.y + 8, area.y + area.height - h - 8);
  x = Math.max(area.x + 8, Math.min(maxX, x));
  y = Math.max(area.y + 8, Math.min(maxY, y));
  win.setPosition(Math.round(x), Math.round(y));
}

function togglePanel(bounds: Electron.Rectangle) {
  if (!win) return;
  lastTrayBounds = bounds;
  ignoreBlurBriefly();
  if (win.isVisible() || recentlyHiddenByBlur()) {
    win.hide();
    return;
  }
  positionNearTray(bounds);
  win.show();
  win.focus();
}

function showAbout() {
  if (win && lastTrayBounds) {
    ignoreBlurBriefly();
    positionNearTray(lastTrayBounds);
    win.show();
    win.focus();
  } else win?.show();
  win?.focus();
  win?.webContents.send("show-about");
}

function createWindow() {
  win = new BrowserWindow({
    width: 380,
    height: 520,
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
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  if (process.platform === "darwin" && app.dock) app.dock.hide();

  if (process.env.ELECTRON_START_URL) win.loadURL(process.env.ELECTRON_START_URL);
  else win.loadFile(join(__dirname, "../renderer/index.html"));

  win.on("close", (e) => {
    e.preventDefault();
    win?.hide();
  });
  win.on("blur", () => {
    if (!blurShouldHide()) return;
    win?.hide();
    markBlurHide();
  });
  win.on("show", () => win?.webContents.send("window:focusChanged", true));
  win.on("hide", () => win?.webContents.send("window:focusChanged", false));
  win.on("focus", () => win?.webContents.send("window:focusChanged", true));
}

function createTray() {
  const iconPath = join(__dirname, "../../src-tauri/icons/tray.png");
  let img = nativeImage.createFromPath(iconPath);
  if (process.platform === "darwin") img.setTemplateImage(true);
  if (img.isEmpty()) {
    const fallback = join(__dirname, "../../src-tauri/icons/icon.png");
    img = nativeImage.createFromPath(fallback);
    if (process.platform === "darwin") img.setTemplateImage(true);
  }
  tray = new Tray(img);
  tray.setToolTip("GrokBar");
  lastTrayBounds = tray.getBounds();
  const menu = Menu.buildFromTemplate([
    { label: "About GrokBar", click: () => showAbout() },
    { type: "separator" },
    { label: "Quit GrokBar", click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
  tray.on("click", (_e, bounds) => {
    if (bounds) lastTrayBounds = bounds;
    const b = bounds ?? tray?.getBounds() ?? lastTrayBounds;
    if (b) togglePanel(b);
  });
  setInterval(() => {
    if (tray) lastTrayBounds = tray.getBounds();
  }, 1000);
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  ipcMain.handle("grok:status", () => getGrokStatus());
  ipcMain.handle("weekly:status", () => getWeeklyStatusAsync());
  ipcMain.handle("window:isVisible", () => win?.isVisible() ?? false);
  setInterval(() => void refreshTray(), 30_000);
  void refreshTray();
});

app.on("window-all-closed", () => {});
app.on("activate", () => {
  if (win) {
    if (lastTrayBounds) positionNearTray(lastTrayBounds);
    win.show();
  }
});
