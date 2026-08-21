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
let isQuitting = false;

function ignoreBlurBriefly() {
  ignoreBlurUntil = Date.now() + 500;
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
  const weekly = await getWeeklyStatusAsync();
  const grok = getGrokStatus();
  const { title, tooltip } = trayTitleAndTooltip(weekly, grok);
  tray.setToolTip(tooltip);
  if (process.platform === "darwin") tray.setTitle(title ?? "");
}

function positionNearTray(bounds: Electron.Rectangle) {
  if (!win) return;
  // Guard against off-screen / stale bounds (seen y:-1080) — fallback to primary display center top
  const allDisplays = screen.getAllDisplays();
  const hasValidBounds = bounds.width > 0 && bounds.height > 0 && Math.abs(bounds.x) < 10000 && Math.abs(bounds.y) < 10000;
  let display = hasValidBounds ? screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y }) : screen.getPrimaryDisplay();
  // If nearest display is still far, use primary
  if (hasValidBounds) {
    const d = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
    const dist = Math.hypot(d.bounds.x - bounds.x, d.bounds.y - bounds.y);
    if (dist > 2000) display = screen.getPrimaryDisplay();
  } else {
    display = screen.getPrimaryDisplay();
  }
  const w = win.getBounds().width;
  const h = win.getBounds().height;
  let x: number;
  let y: number;
  if (hasValidBounds) {
    x = bounds.x + bounds.width / 2 - w / 2;
    y = bounds.y + bounds.height + 6;
    if (bounds.y > display.workArea.y + display.workArea.height - 80) y = bounds.y - h - 6;
  } else {
    // Center at top of primary display
    x = display.workArea.x + display.workArea.width / 2 - w / 2;
    y = display.workArea.y + 8;
  }
  const area = display.workArea;
  const maxX = Math.max(area.x + 8, area.x + area.width - w - 8);
  const maxY = Math.max(area.y + 8, area.y + area.height - h - 8);
  x = Math.max(area.x + 8, Math.min(maxX, x));
  y = Math.max(area.y + 8, Math.min(maxY, y));
  win.setPosition(Math.round(x), Math.round(y));
}

function togglePanel(bounds: Electron.Rectangle) {
  if (!win) {
    console.log("[toggle] no win");
    return;
  }
  lastTrayBounds = bounds;
  ignoreBlurBriefly();
  const visible = win.isVisible();
  console.log(`[toggle] click bounds=${JSON.stringify(bounds)} visible=${visible} ignoreUntil=${ignoreBlurUntil} lastHide=${lastBlurHide}`);
  if (visible) {
    console.log("[toggle] -> hide");
    win.hide();
    return;
  }
  console.log("[toggle] -> show");
  positionNearTray(bounds);
  console.log(`[toggle] positioned at ${JSON.stringify(win.getBounds())} display=${JSON.stringify(screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y }).bounds)}`);
  win.setVisibleOnAllWorkspaces(true);
  win.setAlwaysOnTop(true, "floating");
  win.show();
  win.focus();
  win.moveTop();
  console.log(`[toggle] after show visible=${win.isVisible()}`);
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
      preload: join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  if (process.platform === "darwin" && app.dock) app.dock.hide();

  if (process.env.ELECTRON_START_URL) win.loadURL(process.env.ELECTRON_START_URL);
  else win.loadFile(join(__dirname, "../renderer/index.html"));

  win.on("close", (e) => {
    if (isQuitting) return;
    e.preventDefault();
    win?.hide();
  });
  win.on("blur", () => {
    console.log(`[blur] blurShouldHide=${blurShouldHide()} ignoreUntil=${ignoreBlurUntil}`);
    if (!blurShouldHide()) {
      console.log("[blur] ignored");
      return;
    }
    console.log("[blur] -> hide");
    win?.hide();
    markBlurHide();
  });
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
  tray = new Tray(img);
  tray.setToolTip("GrokBar");
  lastTrayBounds = tray.getBounds();
  const menu = Menu.buildFromTemplate([
    { label: "About GrokBar", click: () => showAbout() },
    { type: "separator" },
    { label: "Quit GrokBar", click: () => app.quit() },
  ]);
  // Tauri parity: showMenuOnLeftClick false — only right-click shows menu
  tray.on("right-click", () => {
    console.log("[tray] right-click");
    tray.popUpContextMenu(menu);
  });
  const handleClick = (e: unknown, bounds: Electron.Rectangle | undefined) => {
    console.log(`[tray] click bounds=${JSON.stringify(bounds)} getBounds=${JSON.stringify(tray.getBounds())}`);
    if (bounds) lastTrayBounds = bounds;
    const b = bounds ?? tray?.getBounds() ?? lastTrayBounds;
    console.log(`[tray] using bounds ${JSON.stringify(b)}`);
    if (b) togglePanel(b);
    else {
      console.log("[tray] no bounds, using fallback");
      togglePanel({ x: 0, y: 0, width: 0, height: 0 } as Electron.Rectangle);
    }
  };
  tray.on("click", handleClick as never);
  tray.on("double-click", handleClick as never);
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
