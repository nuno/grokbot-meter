import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen } from "electron";
import { join } from "path";
import { getGrokStatus } from "./grokSource";
import { getWeeklyStatusAsync } from "./weekly";

if (!app.requestSingleInstanceLock()) app.quit();

let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let lastTrayBounds: Electron.Rectangle | null = null;
let isQuitting = false;
/** Swallow the tray click that caused a blur-hide, so the extra doesn't immediately reopen. */
let ignoreTrayClickUntil = 0;

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
  win.on("blur", () => {
    if (!win?.isVisible()) return;
    win.hide();
    // Only arm when the extra itself caused the blur (mousedown on tray).
    // Click-away / Esc / Cmd-Tab must not eat the next tray open.
    // 1s covers mouse-up and a double-click; do not clear on consume.
    if (cursorOverTray()) ignoreTrayClickUntil = Date.now() + 1000;
  });
  win.on("show", () => win?.webContents.send("window:focusChanged", true));
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
    { label: "Quit GrokBar", role: "quit" },
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
  ipcMain.handle("window:hide", () => { win?.hide(); });
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
