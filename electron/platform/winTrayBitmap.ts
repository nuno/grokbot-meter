/**
 * Notification-area icon pixels.
 *
 * Windows has no tray title (Electron `setTitle` is macOS-only). The same short
 * label the menu bar shows on Mac — `42%`, or today's count — is drawn into a
 * square icon, with the bot mark above it. Ink is white on a dark taskbar and
 * black on a light one. The buffer is premultiplied BGRA, alpha in the fourth
 * byte, which matches `nativeImage.toBitmap()` / `createFromBitmap()` on
 * little-endian desktops.
 */

export type Rgb = { r: number; g: number; b: number };

export type TrayBitmapSource = {
  bgra: Uint8Array;
  width: number;
  height: number;
};

type Glyph = { w: number; h: number; rows: string[] };

/** 3×5 digits and a 5×5 percent, so `100%` fits a 16px tray slot. */
const GLYPHS: Record<string, Glyph> = {
  "0": { w: 3, h: 5, rows: ["###", "#.#", "#.#", "#.#", "###"] },
  "1": { w: 3, h: 5, rows: [".#.", "##.", ".#.", ".#.", "###"] },
  "2": { w: 3, h: 5, rows: ["###", "..#", "###", "#..", "###"] },
  "3": { w: 3, h: 5, rows: ["###", "..#", "###", "..#", "###"] },
  "4": { w: 3, h: 5, rows: ["#.#", "#.#", "###", "..#", "..#"] },
  "5": { w: 3, h: 5, rows: ["###", "#..", "###", "..#", "###"] },
  "6": { w: 3, h: 5, rows: ["###", "#..", "###", "#.#", "###"] },
  "7": { w: 3, h: 5, rows: ["###", "..#", "..#", "..#", "..#"] },
  "8": { w: 3, h: 5, rows: ["###", "#.#", "###", "#.#", "###"] },
  "9": { w: 3, h: 5, rows: ["###", "#.#", "###", "..#", "###"] },
  "%": { w: 5, h: 5, rows: ["##...", "##...", "..#..", "...##", "...##"] },
};

/** Device pixels for a 16px notification icon at `scaleFactor` (1, 1.25, 1.5, 2, …). */
export function trayDevicePixels(scaleFactor: number): number {
  const scale = Number.isFinite(scaleFactor) && scaleFactor > 0 ? scaleFactor : 1;
  return Math.min(64, Math.max(16, Math.round(16 * scale)));
}

/** Mac menu-bar titles use a thin space before the label. The icon does not. */
export function normalizeTrayLabel(title: string | undefined): string {
  if (!title) return "";
  return title.replace(/[\u2009\u00a0\s]+/g, "");
}

export function trayInk(dark: boolean): Rgb {
  return dark ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 };
}

/** Drop transparent padding (the Mac template's right gutter) before scaling. */
export function cropToOpaque(bgra: Uint8Array, width: number, height: number): TrayBitmapSource | null {
  if (width < 1 || height < 1 || bgra.length < width * height * 4) return null;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (bgra[(y * width + x) * 4 + 3] < 16) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX || maxY < minY) return null;
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const out = new Uint8Array(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    const src = ((y + minY) * width + minX) * 4;
    out.set(bgra.subarray(src, src + cw * 4), y * cw * 4);
  }
  return { bgra: out, width: cw, height: ch };
}

/** Windows 11 22H2 (build 22621) is the first build Electron acrylic/mica supports. */
export function supportsWindowsAcrylic(platform: string, osRelease: string): boolean {
  if (platform !== "win32") return false;
  const build = Number(osRelease.split(".")[2]);
  return Number.isFinite(build) && build >= 22621;
}

export function composeWindowsTrayBitmap(options: {
  size: number;
  title: string | undefined;
  dark: boolean;
  source?: TrayBitmapSource | null;
}): Buffer {
  const size = Math.max(1, Math.round(options.size));
  const buf = Buffer.alloc(size * size * 4);
  const color = trayInk(options.dark);
  const fitted = fitLabel(normalizeTrayLabel(options.title), size);
  const mark = markRect(size, fitted);
  if (mark) {
    if (options.source) blitSource(buf, size, mark, options.source, color);
    else drawProceduralMark(buf, size, mark, color);
  }
  if (fitted) drawLabel(buf, size, fitted, color);
  return buf;
}

type FittedLabel = { text: string; scale: number; gap: number; width: number; height: number };

function fitLabel(label: string, size: number): FittedLabel | null {
  const known = label.replace(/[^0-9%]/g, "");
  if (!known) return null;
  const maxWidth = Math.max(1, size - 2);
  const preferred = size >= 30 ? 2 : 1;
  const scales = preferred === 1 ? [1] : [preferred, 1];
  for (const scale of scales) {
    const variants = known.endsWith("%") ? [known, known.slice(0, -1)] : [known];
    for (const text of variants) {
      if (!text) continue;
      const gaps = scale > 1 ? [scale, 1, 0] : [1, 0];
      for (const gap of gaps) {
        const width = measure(text, scale, gap);
        if (width > 0 && width <= maxWidth) {
          return { text, scale, gap, width, height: 5 * scale };
        }
      }
    }
  }
  let text = known.replace(/%/g, "");
  while (text.length > 1 && measure(text, 1, 0) > maxWidth) text = text.slice(0, -1);
  const width = measure(text, 1, 0);
  if (!text || width <= 0 || width > maxWidth) return null;
  return { text, scale: 1, gap: 0, width, height: 5 };
}

function markRect(size: number, fitted: FittedLabel | null): { x: number; y: number; size: number } | null {
  if (!fitted) {
    const pad = Math.max(1, Math.round(size * 0.08));
    const mark = size - pad * 2;
    if (mark < 4) return null;
    return { x: pad, y: pad, size: mark };
  }
  const pad = 1;
  const between = Math.max(1, fitted.scale);
  const mark = size - pad * 2 - fitted.height - between;
  if (mark < 6) return null;
  return { x: Math.floor((size - mark) / 2), y: pad, size: mark };
}

function measure(text: string, scale: number, gap: number): number {
  let width = 0;
  let n = 0;
  for (const ch of text) {
    const glyph = GLYPHS[ch];
    if (!glyph) continue;
    if (n) width += gap;
    width += glyph.w * scale;
    n++;
  }
  return width;
}

function drawLabel(buf: Buffer, size: number, fitted: FittedLabel, color: Rgb): void {
  const between = Math.max(1, fitted.scale);
  const mark = markRect(size, fitted);
  const textY = mark ? mark.y + mark.size + between : Math.floor((size - fitted.height) / 2);
  let x = Math.floor((size - fitted.width) / 2);
  let drawn = 0;
  for (const ch of fitted.text) {
    const glyph = GLYPHS[ch];
    if (!glyph) continue;
    if (drawn) x += fitted.gap;
    for (let row = 0; row < glyph.h; row++) {
      const line = glyph.rows[row] ?? "";
      for (let col = 0; col < glyph.w; col++) {
        if (line[col] !== "#") continue;
        for (let sy = 0; sy < fitted.scale; sy++) {
          for (let sx = 0; sx < fitted.scale; sx++) {
            setPremul(buf, size, x + col * fitted.scale + sx, textY + row * fitted.scale + sy, color, 255);
          }
        }
      }
    }
    x += glyph.w * fitted.scale;
    drawn++;
  }
}

function drawProceduralMark(
  buf: Buffer,
  size: number,
  mark: { x: number; y: number; size: number },
  color: Rgb,
): void {
  const box = mark.size;
  const cx = mark.x + box / 2;
  const cy = mark.y + box / 2 + box * 0.04;
  const radius = box * 0.46;
  for (let y = Math.floor(cy - radius - 1); y <= Math.ceil(cy + radius + 1); y++) {
    for (let x = Math.floor(cx - radius - 1); x <= Math.ceil(cx + radius + 1); x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let alpha = 0;
      if (dist <= radius - 0.5) alpha = 255;
      else if (dist < radius + 0.5) alpha = Math.round((radius + 0.5 - dist) * 255);
      if (alpha > 0) setPremul(buf, size, x, y, color, alpha);
    }
  }
  const eyeW = Math.max(1, Math.round(box * 0.12));
  const eyeH = Math.max(2, Math.round(box * 0.28));
  const eyeY = Math.round(cy - eyeH / 2);
  punchRect(buf, size, Math.round(cx - box * 0.16 - eyeW / 2), eyeY, eyeW, eyeH);
  punchRect(buf, size, Math.round(cx + box * 0.16 - eyeW / 2), eyeY, eyeW, eyeH);
}

function blitSource(
  buf: Buffer,
  destSize: number,
  mark: { x: number; y: number; size: number },
  source: TrayBitmapSource,
  color: Rgb,
): void {
  const { bgra, width: sw, height: sh } = source;
  if (sw < 1 || sh < 1) return;
  const aspect = sw / sh;
  let dw = mark.size;
  let dh = mark.size;
  if (aspect > 1) dh = Math.max(1, Math.round(mark.size / aspect));
  else dw = Math.max(1, Math.round(mark.size * aspect));
  const ox = mark.x + Math.floor((mark.size - dw) / 2);
  const oy = mark.y + Math.floor((mark.size - dh) / 2);
  for (let y = 0; y < dh; y++) {
    const sy0 = Math.floor((y * sh) / dh);
    const sy1 = Math.min(sh, Math.max(sy0 + 1, Math.floor(((y + 1) * sh) / dh)));
    for (let x = 0; x < dw; x++) {
      const sx0 = Math.floor((x * sw) / dw);
      const sx1 = Math.min(sw, Math.max(sx0 + 1, Math.floor(((x + 1) * sw) / dw)));
      let acc = 0;
      let n = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          acc += bgra[(sy * sw + sx) * 4 + 3];
          n++;
        }
      }
      const alpha = n ? Math.round(acc / n) : 0;
      if (alpha > 0) setPremul(buf, destSize, ox + x, oy + y, color, alpha);
    }
  }
}

function punchRect(buf: Buffer, size: number, x0: number, y0: number, w: number, h: number): void {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) clearPixel(buf, size, x, y);
  }
}

function setPremul(buf: Buffer, size: number, x: number, y: number, color: Rgb, alpha: number): void {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const a = Math.max(0, Math.min(255, alpha));
  const i = (y * size + x) * 4;
  buf[i] = Math.round((color.b * a) / 255);
  buf[i + 1] = Math.round((color.g * a) / 255);
  buf[i + 2] = Math.round((color.r * a) / 255);
  buf[i + 3] = a;
}

function clearPixel(buf: Buffer, size: number, x: number, y: number): void {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (y * size + x) * 4;
  buf[i] = 0;
  buf[i + 1] = 0;
  buf[i + 2] = 0;
  buf[i + 3] = 0;
}
