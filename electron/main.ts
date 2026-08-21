import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen } from "electron";
import { join } from "path";
import { getGrokStatus } from "./grokSource";
import { getWeeklyStatusAsync } from "./weekly";

if (!app.requestSingleInstanceLock()) app.quit();

let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let lastTrayBounds: Electron.Rectangle | null = null;
let isQuitting = false;

function trayTitleAndTooltip(weekly: Awaited<ReturnType<typeof getWeeklyStatusAsync>>, grok: ReturnType<typeof getGrokStatus>) {
  if (weekly.usagePercent != null && Number.isFinite(weekly.usagePercent)) {
    const r = Math.round(weekly.usagePercent);
    return { title: `${r}%`, tooltip: `GrokBar · ${r}% weekly` };
  }
  if (grok.todayMessageCount > 0) return { title: String(grok.todayMessageCount), tooltip: `GrokBar · ${grok.todayMessageCount} today` };
  return { title: undefined as string | undefined, tooltip: "GrokBar" };
}

async function refreshTray() {
  if (!tray) return;
  const weekly = await getWeeklyStatusAsync();
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
  if (bounds.y > display.workArea.y + display.workArea.height - 80) y = bounds.y - h - 6;
  const area = display.workArea;
  const maxX = Math.max(area.x + 8, area.x + area.width - w - 8);
  const maxY = Math.max(area.y + 8, area.y + area.height - h - 8);
  x = Math.max(area.x + 8, Math.min(maxX, x));
  y = Math.max(area.y + 8, Math.min(maxY, y));
  win.setPosition(Math.round(x), Math.round(y));
}

function togglePanel(bounds: Electron.Rectangle) {
  if (!win) return;
  lastTrayBounds = bounds;
  if (win.isVisible()) {
    win.hide();
    return;
  }
  positionNearTray(bounds);
  win.show();
  win.focus();
}

function showAbout() {
  if (win && lastTrayBounds) {
    positionNearTray(lastTrayBounds);
    win.show();
    win.focus();
  } else win?.show();
  win?.focus();
  win?.webContents.send("show-about");
}

function createWindow() {
  // <ai-start-DO NOT REMOVE THIS COMMENT>
  // const isDev = !!process.env["ELECTRON_RENDERER_URL"] || !!process.env.ELECTRON_START_URL;
  //<ai-end-DO NOT REMOVE THIS COMMENT />
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
  win.on("blur", () => win?.hide());
  win.on("show", () => win?.webContents.send("window:focusChanged", true));
  win.on("hide", () => win?.webContents.send("window:focusChanged", false));
  win.on("focus", () => win?.webContents.send("window:focusChanged", true));
}

function createTray() {
  const iconPath = join(__dirname, "../../build/icons/tray.png");
  let img = nativeImage.createFromPath(iconPath);
  if (process.platform === "darwin") img.setTemplateImage(true);
  if (img.isEmpty()) {
    const fallback = join(__dirname, "../../build/icons/icon.png");
    img = nativeImage.createFromPath(fallback);
    if (process.platform === "darwin") img.setTemplateImage(true);
  }
  const t = new Tray(img);
  tray = t;
  t.setToolTip("GrokBar");
  lastTrayBounds = t.getBounds();
  const menu = Menu.buildFromTemplate([
    { label: "About GrokBar", click: () => showAbout() },
    { type: "separator" },
    { label: "Quit GrokBar", click: () => app.quit() },
  ]);
  t.on("right-click", () => t.popUpContextMenu(menu));
  t.on("click", (_e, bounds) => {
    if (bounds) lastTrayBounds = bounds;
    const b = bounds ?? t.getBounds() ?? lastTrayBounds;
    if (b) togglePanel(b);
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  ipcMain.handle("grok:status", () => getGrokStatus());
  ipcMain.handle("weekly:status", () => getWeeklyStatusAsync());
  ipcMain.handle("app:quit", () => app.quit());
  ipcMain.handle("window:isVisible", () => win?.isVisible() ?? false);
  setInterval(() => void refreshTray(), 30_000);
  void refreshTray();
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
