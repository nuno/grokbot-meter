import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  composeWindowsTrayBitmap,
  cropToOpaque,
  normalizeTrayLabel,
  supportsWindowsAcrylic,
  trayDevicePixels,
  type TrayBitmapSource,
} from "./winTrayBitmap.ts";

function opaqueCount(buf: Buffer): number {
  let n = 0;
  for (let i = 3; i < buf.length; i += 4) if (buf[i] > 0) n++;
  return n;
}

function alphaMask(buf: Buffer): Buffer {
  const out = Buffer.alloc(buf.length / 4);
  for (let i = 0; i < out.length; i++) out[i] = buf[i * 4 + 3];
  return out;
}

function assertInk(buf: Buffer, dark: boolean): void {
  const channel = dark ? 255 : 0;
  for (let i = 0; i < buf.length; i += 4) {
    const b = buf[i] ?? 0;
    const g = buf[i + 1] ?? 0;
    const r = buf[i + 2] ?? 0;
    const a = buf[i + 3] ?? 0;
    if (a === 0) {
      assert.equal(r, 0);
      assert.equal(g, 0);
      assert.equal(b, 0);
    } else {
      assert.equal(r, Math.round((channel * a) / 255));
      assert.equal(g, Math.round((channel * a) / 255));
      assert.equal(b, Math.round((channel * a) / 255));
    }
  }
}

function rowHasInk(buf: Buffer, size: number, y0: number, y1: number): boolean {
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < size; x++) {
      if ((buf[(y * size + x) * 4 + 3] ?? 0) > 0) return true;
    }
  }
  return false;
}

function solidSource(width: number, height: number): TrayBitmapSource {
  const bgra = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) bgra[i * 4 + 3] = 255;
  return { bgra, width, height };
}

describe("normalizeTrayLabel", () => {
  it("strips the Mac menu-bar thin space", () => {
    assert.equal(normalizeTrayLabel("\u200942%"), "42%");
    assert.equal(normalizeTrayLabel("  7 "), "7");
    assert.equal(normalizeTrayLabel(undefined), "");
    assert.equal(normalizeTrayLabel("\u2009"), "");
  });
});

describe("trayDevicePixels", () => {
  it("maps display scale to a 16px tray slot", () => {
    assert.equal(trayDevicePixels(1), 16);
    assert.equal(trayDevicePixels(1.25), 20);
    assert.equal(trayDevicePixels(1.5), 24);
    assert.equal(trayDevicePixels(2), 32);
    assert.equal(trayDevicePixels(0), 16);
    assert.equal(trayDevicePixels(Number.NaN), 16);
    assert.equal(trayDevicePixels(8), 64);
  });
});

describe("supportsWindowsAcrylic", () => {
  it("is Windows 11 22H2 and newer only", () => {
    assert.equal(supportsWindowsAcrylic("win32", "10.0.22621"), true);
    assert.equal(supportsWindowsAcrylic("win32", "10.0.26100"), true);
    assert.equal(supportsWindowsAcrylic("win32", "10.0.22000"), false);
    assert.equal(supportsWindowsAcrylic("win32", "10.0.19045"), false);
    assert.equal(supportsWindowsAcrylic("darwin", "10.0.22621"), false);
    assert.equal(supportsWindowsAcrylic("linux", "6.12.94"), false);
  });
});

describe("cropToOpaque", () => {
  it("drops the transparent right gutter", () => {
    const width = 6;
    const height = 2;
    const bgra = new Uint8Array(width * height * 4);
    bgra[3] = 255;
    bgra[7] = 200;
    const cropped = cropToOpaque(bgra, width, height);
    assert.ok(cropped);
    assert.equal(cropped.width, 2);
    assert.equal(cropped.height, 1);
    assert.equal(cropped.bgra[3], 255);
    assert.equal(cropped.bgra[7], 200);
  });

  it("returns null when every pixel is clear", () => {
    assert.equal(cropToOpaque(new Uint8Array(16), 2, 2), null);
  });
});

describe("composeWindowsTrayBitmap", () => {
  it("draws the weekly label and a mark, ignoring the Mac thin space", () => {
    const plain = composeWindowsTrayBitmap({ size: 16, title: "42%", dark: true, source: null });
    const padded = composeWindowsTrayBitmap({ size: 16, title: "\u200942%", dark: true, source: null });
    assert.equal(plain.length, 16 * 16 * 4);
    assert.deepEqual(plain, padded);
    assertInk(plain, true);
    assert.ok(opaqueCount(plain) > 20);
    assert.equal(plain[3], 0);
    assert.ok(rowHasInk(plain, 16, 0, 8));
    assert.ok(rowHasInk(plain, 16, 10, 16));
  });

  it("keeps 100% in the icon instead of dropping the percent sign", () => {
    const withPercent = composeWindowsTrayBitmap({ size: 16, title: "100%", dark: true, source: null });
    const without = composeWindowsTrayBitmap({ size: 16, title: "100", dark: true, source: null });
    assert.ok(opaqueCount(withPercent) > opaqueCount(without));
  });

  it("uses black ink on a light taskbar and the same coverage", () => {
    const dark = composeWindowsTrayBitmap({ size: 24, title: "7%", dark: true, source: null });
    const light = composeWindowsTrayBitmap({ size: 24, title: "7%", dark: false, source: null });
    assertInk(dark, true);
    assertInk(light, false);
    assert.deepEqual(alphaMask(dark), alphaMask(light));
    assert.notDeepEqual(dark, light);
  });

  it("changes the icon when the percent changes", () => {
    const a = composeWindowsTrayBitmap({ size: 32, title: "1%", dark: true, source: null });
    const b = composeWindowsTrayBitmap({ size: 32, title: "2%", dark: true, source: null });
    assert.notDeepEqual(a, b);
    assert.equal(a.length, 32 * 32 * 4);
  });

  it("falls back to the mark when there is no label", () => {
    const icon = composeWindowsTrayBitmap({ size: 16, title: undefined, dark: false, source: null });
    assertInk(icon, false);
    const n = opaqueCount(icon);
    assert.ok(n > 10);
    assert.ok(n < 16 * 16);
    assert.equal(icon[3], 0);
  });

  it("recolors a template instead of the procedural mark", () => {
    const procedural = composeWindowsTrayBitmap({ size: 16, title: undefined, dark: true, source: null });
    const filled = composeWindowsTrayBitmap({
      size: 16,
      title: undefined,
      dark: true,
      source: solidSource(4, 4),
    });
    assert.ok(opaqueCount(filled) > opaqueCount(procedural));
    assertInk(filled, true);
  });

  it("does not throw on a long count", () => {
    const icon = composeWindowsTrayBitmap({ size: 16, title: "123456789", dark: true, source: null });
    assert.equal(icon.length, 16 * 16 * 4);
    assert.ok(opaqueCount(icon) > 0);
  });
});
