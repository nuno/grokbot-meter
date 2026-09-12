import { writeFileSync } from "fs";
import { deflateSync } from "zlib";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../build/icons");

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type);
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])));
  return Buffer.concat([len, typeB, data, crcB]);
}

function encodePng(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    rgba.copy(raw, row + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * Menu-bar template Bot face.
 * Tuned vs header SVG: optically zoomed, fatter eye punches, slightly less tilt —
 * soft AA on the outer disc only; eyes bias toward fully clear so they don't mud into gray.
 */
function sampleAt(px, py, size) {
  // Zoom ~12% so the face fills the 18px tile (less empty ring).
  const zoom = 1.12;
  const mid = size / 2;
  const sx = mid + (px + 0.5 - mid) / zoom;
  const sy = mid + (py + 0.5 - mid) / zoom;
  const x = (sx / size) * 24;
  const y = (sy / size) * 24;

  const dist2 = (cx, cy) => {
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy;
  };

  // Soft disc edge (r≈10.6 in zoomed space reads larger)
  const discR = 10.6;
  const dDisc = Math.sqrt(dist2(12, 12));
  if (dDisc > discR + 0.55) return 0;
  let discCov = 1;
  if (dDisc > discR - 0.55) {
    discCov = 1 - (dDisc - (discR - 0.55)) / 1.1;
    discCov = Math.max(0, Math.min(1, discCov));
  }

  // Eye: rounded capsule, fatter + clearer than header SVG for 18px
  const eyeCov = (ecx, ecy, rotDeg) => {
    const rad = (-rotDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = x - ecx;
    const dy = y - ecy;
    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;
    const hw = 1.7; // was ~1.35 — punch wider
    const hh = 3.05; // slightly taller
    const rr = 1.55;
    const ax = Math.abs(lx);
    const ay = Math.abs(ly);
    // distance outside rounded rect (0 = inside)
    let od = 0;
    if (ax <= hw - rr && ay <= hh) od = 0;
    else if (ay <= hh - rr && ax <= hw) od = 0;
    else {
      const cx = Math.max(ax - (hw - rr), 0);
      const cy = Math.max(ay - (hh - rr), 0);
      od = Math.sqrt(cx * cx + cy * cy) - rr;
    }
    // Bias: fully clear inside + 0.35px fringe, hard cut — avoids muddy gray eyes
    if (od <= 0) return 1;
    if (od >= 0.45) return 0;
    return 1 - od / 0.45;
  };

  // Optical center a touch high; milder tilt so slits read at tiny size
  const eL = eyeCov(9.15, 12.85, 11);
  const eR = eyeCov(14.85, 12.85, -11);
  const eye = Math.max(eL, eR);
  // Punch eyes out of disc
  return discCov * (1 - eye);
}

function renderTemplate(size, samples = 6) {
  const rgba = Buffer.alloc(size * size * 4);
  const step = 1 / samples;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sum = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          sum += sampleAt(x + (sx + 0.5) * step - 0.5, y + (sy + 0.5) * step - 0.5, size);
        }
      }
      const a = Math.round((sum / (samples * samples)) * 255);
      const i = (y * size + x) * 4;
      rgba[i] = 0;
      rgba[i + 1] = 0;
      rgba[i + 2] = 0;
      rgba[i + 3] = a;
    }
  }
  return rgba;
}

function renderPreview(size, bg = [230, 230, 230]) {
  const tmpl = renderTemplate(size, 6);
  const rgba = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const a = tmpl[i * 4 + 3] / 255;
    rgba[i * 4] = Math.round(bg[0] * (1 - a));
    rgba[i * 4 + 1] = Math.round(bg[1] * (1 - a));
    rgba[i * 4 + 2] = Math.round(bg[2] * (1 - a));
    rgba[i * 4 + 3] = 255;
  }
  return rgba;
}

/** Menu-bar style preview: white template on navy (like Focus/status tint). */
function renderNavyPreview(size) {
  const tmpl = renderTemplate(size, 6);
  const rgba = Buffer.alloc(size * size * 4);
  const navy = [28, 56, 120];
  for (let i = 0; i < size * size; i++) {
    const a = tmpl[i * 4 + 3] / 255;
    rgba[i * 4] = Math.round(navy[0] * (1 - a) + 255 * a);
    rgba[i * 4 + 1] = Math.round(navy[1] * (1 - a) + 255 * a);
    rgba[i * 4 + 2] = Math.round(navy[2] * (1 - a) + 255 * a);
    rgba[i * 4 + 3] = 255;
  }
  return rgba;
}

for (const size of [18, 36]) {
  const name = size === 18 ? "tray.png" : "tray@2x.png";
  writeFileSync(join(outDir, name), encodePng(size, renderTemplate(size, 7)));
  console.log("wrote", name);
}
writeFileSync(join(outDir, "tray-preview@2x.png"), encodePng(72, renderPreview(72)));
writeFileSync(join(outDir, "tray-preview-navy.png"), encodePng(72, renderNavyPreview(72)));
console.log("wrote previews");
