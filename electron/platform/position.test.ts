import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { macTrayPlacement, placeWindowNearTray, winTrayPlacement } from "./position.ts";

const WINDOW = { width: 380, height: 260 };

describe("placeWindowNearTray", () => {
  it("keeps the macOS popover flush under a menubar icon", () => {
    const at = placeWindowNearTray({
      tray: { x: 1200, y: 0, width: 40, height: 24 },
      window: WINDOW,
      workArea: { x: 0, y: 25, width: 1440, height: 800 },
      placement: macTrayPlacement,
    });
    assert.deepEqual(at, { x: 1030, y: 24 });
  });

  it("uses the larger Windows gap and top margin without the menubar clamp", () => {
    const at = placeWindowNearTray({
      tray: { x: 1200, y: 0, width: 40, height: 24 },
      window: WINDOW,
      workArea: { x: 0, y: 25, width: 1440, height: 800 },
      placement: winTrayPlacement,
    });
    assert.deepEqual(at, { x: 1030, y: 33 });
  });

  it("flips above a bottom tray and clamps to the side margin", () => {
    const at = placeWindowNearTray({
      tray: { x: 100, y: 860, width: 40, height: 40 },
      window: WINDOW,
      workArea: { x: 0, y: 0, width: 1440, height: 900 },
      placement: macTrayPlacement,
    });
    assert.deepEqual(at, { x: 8, y: 600 });
  });

  it("clamps a right-edge tray inside the work area", () => {
    const at = placeWindowNearTray({
      tray: { x: 1400, y: 25, width: 30, height: 22 },
      window: WINDOW,
      workArea: { x: 0, y: 25, width: 1440, height: 800 },
      placement: macTrayPlacement,
    });
    assert.deepEqual(at, { x: 1052, y: 47 });
  });

  it("rounds fractional coordinates", () => {
    const at = placeWindowNearTray({
      tray: { x: 10.6, y: 100.4, width: 0, height: 0 },
      window: { width: 0, height: 0 },
      workArea: { x: 0, y: 0, width: 500, height: 500 },
      placement: macTrayPlacement,
    });
    assert.deepEqual(at, { x: 11, y: 100 });
  });
});
