import { writeFileSync } from "fs";
import { deflateSync } from "zlib";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../build/icons");

/** Extra transparent columns to the right of the face before tray.setTitle text. */
const PAD_RIGHT_1X = 4;

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

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    rgba.copy(raw, row + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
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

  const discR = 10.6;
  const dDisc = Math.sqrt(dist2(12, 12));
  if (dDisc > discR + 0.55) return 0;
  let discCov = 1;
  if (dDisc > discR - 0.55) {
    discCov = 1 - (dDisc - (discR - 0.55)) / 1.1;
    discCov = Math.max(0, Math.min(1, discCov));
  }

  const eyeCov = (ecx, ecy, rotDeg) => {
    const rad = (-rotDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = x - ecx;
    const dy = y - ecy;
    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;
    const hw = 1.7;
    const hh = 3.05;
    const rr = 1.55;
    const ax = Math.abs(lx);
    const ay = Math.abs(ly);
    let od = 0;
    if (ax <= hw - rr && ay <= hh) od = 0;
    else if (ay <= hh - rr && ax <= hw) od = 0;
    else {
      const cx = Math.max(ax - (hw - rr), 0);
      const cy = Math.max(ay - (hh - rr), 0);
      od = Math.sqrt(cx * cx + cy * cy) - rr;
    }
    if (od <= 0) return 1;
    if (od >= 0.45) return 0;
    return 1 - od / 0.45;
  };

  const eL = eyeCov(9.15, 12.85, 11);
  const eR = eyeCov(14.85, 12.85, -11);
  const eye = Math.max(eL, eR);
  return discCov * (1 - eye);
}

function renderFace(size, samples = 7) {
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

/** Face left-aligned + transparent right gutter before setTitle. */
function withRightPad(faceRgba, faceSize, padRight) {
  const w = faceSize + padRight;
  const h = faceSize;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < faceSize; x++) {
      const si = (y * faceSize + x) * 4;
      const di = (y * w + x) * 4;
      out[di] = faceRgba[si];
      out[di + 1] = faceRgba[si + 1];
      out[di + 2] = faceRgba[si + 2];
      out[di + 3] = faceRgba[si + 3];
    }
  }
  return { rgba: out, width: w, height: h };
}

for (const faceSize of [18, 36]) {
  const pad = faceSize === 18 ? PAD_RIGHT_1X : PAD_RIGHT_1X * 2;
  const face = renderFace(faceSize, 7);
  const { rgba, width, height } = withRightPad(face, faceSize, pad);
  const name = faceSize === 18 ? "tray.png" : "tray@2x.png";
  writeFileSync(join(outDir, name), encodePng(width, height, rgba));
  console.log("wrote", name, `${width}x${height}`);
}
