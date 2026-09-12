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

/** Coverage 0..1 of Bot face silhouette (disc+head opaque, eye slits clear). Matches GrokMark2Icon 24 viewBox. */
function coverageAt(px, py, size) {
  // map pixel center into viewBox 0..24
  const x = ((px + 0.5) / size) * 24;
  const y = ((py + 0.5) / size) * 24;

  const inCircle = (cx, cy, r) => {
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy <= r * r;
  };

  // Eye slit: rounded rect in local space after inverse rotate
  const inEye = (ecx, ecy, rotDeg) => {
    const rad = (-rotDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = x - ecx;
    const dy = y - ecy;
    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;
    // rect: width 2.35, height 5.1, rx 1.175 — slightly fattened for menu-bar readability
    const hw = 1.35; // half-width (~2.7 vs 2.35)
    const hh = 2.7; // half-height (~5.4 vs 5.1)
    const rr = 1.25;
    const ax = Math.abs(lx);
    const ay = Math.abs(ly);
    if (ax <= hw - rr && ay <= hh) return true;
    if (ay <= hh - rr && ax <= hw) return true;
    const cx = Math.max(ax - (hw - rr), 0);
    const cy = Math.max(ay - (hh - rr), 0);
    return cx * cx + cy * cy <= rr * rr;
  };

  const disc = inCircle(12, 12, 11);
  if (!disc) return 0;
  // Eyes punch through (transparent)
  if (inEye(9.325, 13.45, 14) || inEye(14.675, 13.45, -14)) return 0;
  return 1;
}

function renderTemplate(size, samples = 4) {
  const rgba = Buffer.alloc(size * size * 4);
  const step = 1 / samples;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sum = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          sum += coverageAt(x + (sx + 0.5) * step - 0.5, y + (sy + 0.5) * step - 0.5, size);
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

/** Preview: black mark on light gray so eyes show in screenshots. */
function renderPreview(size) {
  const tmpl = renderTemplate(size, 4);
  const rgba = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const a = tmpl[i * 4 + 3] / 255;
    const bg = 230;
    const v = Math.round(bg * (1 - a));
    rgba[i * 4] = v;
    rgba[i * 4 + 1] = v;
    rgba[i * 4 + 2] = v;
    rgba[i * 4 + 3] = 255;
  }
  return rgba;
}

for (const size of [18, 36]) {
  const name = size === 18 ? "tray.png" : "tray@2x.png";
  writeFileSync(join(outDir, name), encodePng(size, renderTemplate(size, 5)));
  console.log("wrote", name);
}
writeFileSync(join(outDir, "tray-preview@2x.png"), encodePng(72, renderPreview(72)));
console.log("wrote tray-preview@2x.png");
