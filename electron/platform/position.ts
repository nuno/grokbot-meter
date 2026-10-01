export type Rect = { x: number; y: number; width: number; height: number };

export type TrayPlacement = {
  gap: number;
  sideMargin: number;
  topMargin: number;
  bottomMargin: number;
  /**
   * macOS menubar: when the tray sits above the work area, do not push the
   * popover down away from the icon.
   */
  clampToTrayTop: boolean;
};

/** macOS: tray is in the menubar — keep the gap minimal so the window sits flush under it. */
export const macTrayPlacement: TrayPlacement = {
  gap: 0,
  sideMargin: 8,
  topMargin: 0,
  bottomMargin: 8,
  clampToTrayTop: true,
};

/** Windows/Linux: taskbar gap can be larger. Used by the Windows stub. */
export const winTrayPlacement: TrayPlacement = {
  gap: 6,
  sideMargin: 8,
  topMargin: 8,
  bottomMargin: 8,
  clampToTrayTop: false,
};

/** Pure popover anchor. Screen lookup stays in the platform modules. */
export function placeWindowNearTray(input: {
  tray: Rect;
  window: { width: number; height: number };
  workArea: Rect;
  placement: TrayPlacement;
}): { x: number; y: number } {
  const { tray: bounds, window: size, workArea: area, placement } = input;
  const GAP = placement.gap;
  const SIDE_MARGIN = placement.sideMargin;
  const TOP_MARGIN = placement.topMargin;
  const BOTTOM_MARGIN = placement.bottomMargin;
  const w = size.width;
  const h = size.height;
  let x = bounds.x + bounds.width / 2 - w / 2;
  let y = bounds.y + bounds.height + GAP;
  if (bounds.y > area.y + area.height - 80) y = bounds.y - h - GAP;
  const maxX = Math.max(area.x + SIDE_MARGIN, area.x + area.width - w - SIDE_MARGIN);
  const maxY = Math.max(area.y + TOP_MARGIN, area.y + area.height - h - BOTTOM_MARGIN);
  x = Math.max(area.x + SIDE_MARGIN, Math.min(maxX, x));
  y = Math.max(area.y + TOP_MARGIN, Math.min(maxY, y));
  if (placement.clampToTrayTop && bounds.y < area.y) {
    y = Math.min(y, bounds.y + bounds.height + GAP);
  }
  return { x: Math.round(x), y: Math.round(y) };
}
