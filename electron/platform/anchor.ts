import { screen, type BrowserWindow, type Rectangle } from "electron";
import { placeWindowNearTray, type TrayPlacement } from "./position";

export function moveWindowNearTray(
  win: BrowserWindow | null,
  bounds: Rectangle,
  placement: TrayPlacement,
): void {
  if (!win) return;
  const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
  const { width, height } = win.getBounds();
  const next = placeWindowNearTray({
    tray: bounds,
    window: { width, height },
    workArea: display.workArea,
    placement,
  });
  win.setPosition(next.x, next.y);
}
