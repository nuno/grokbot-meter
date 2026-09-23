#!/usr/bin/env python3
"""
Generate GrokBar packaging icons from the in-app GrokMark2Icon geometry.

Canonical source of truth (React):
  src/components/icons/GrokMark2Icon.tsx
  — charcoal disc #2C2C2E + soft head #E8E8ED + two tilted dark eye slots.
  No antenna, no purple chart, no outline-only pause-slit mark.

Outputs (under build/icons/):
  icon-source.png   1024×1024 master (kept for regeneration)
  icon.png          512×512
  icon@2x.png       1024×1024
  32x32.png, 64x64.png, 128x128.png, 128x128@2x.png, grok-256.png
  icon.icns         macOS multi-size
  icon.ico          Windows multi-size
  tray.png / tray@2x.png  menu-bar template (black silhouette + eye punches)

Run: python3 scripts/gen-packaging-icons.py
"""
from __future__ import annotations

import math
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "build" / "icons"

CHARCOAL = (44, 44, 46, 255)      # #2C2C2E
SOFT = (232, 232, 237, 255)       # #E8E8ED
TRANSPARENT = (0, 0, 0, 0)
BLACK = (0, 0, 0, 255)


def rounded_rect_mask(size: int, cx: float, cy: float, w: float, h: float, rx: float, rot_deg: float, supersample: int = 4) -> Image.Image:
    """Anti-aliased filled rounded-rect rotated about (cx, cy), in viewBox units → size px."""
    ss = supersample
    big = size * ss
    scale = big / 24.0
    img = Image.new("L", (big, big), 0)
    draw = ImageDraw.Draw(img)
    # Draw axis-aligned rounded rect in local space, then rotate
    hw, hh = w / 2, h / 2
    # Local box centered at origin in viewBox units
    local = Image.new("L", (big, big), 0)
    ld = ImageDraw.Draw(local)
    # Place rect so its geometric center is at (cx, cy) after rotation about that center.
    # SVG: rect at (x,y) with size wxh, transform rotate(deg cx_rot cy_rot)
    # For GrokMark2 eyes, rotation pivot equals visual center of the rect.
    left = (cx - hw) * scale
    top = (cy - hh) * scale
    right = (cx + hw) * scale
    bottom = (cy + hh) * scale
    r = rx * scale
    ld.rounded_rectangle([left, top, right, bottom], radius=r, fill=255)
    # Rotate around pivot (cx, cy)
    local = local.rotate(-rot_deg, resample=Image.Resampling.BICUBIC, center=(cx * scale, cy * scale))
    return local.resize((size, size), Image.Resampling.LANCZOS)


def render_mark(size: int) -> Image.Image:
    """Full-color soft Bot face matching GrokMark2Icon viewBox 0..24."""
    ss = 4
    big = size * ss
    scale = big / 24.0
    img = Image.new("RGBA", (big, big), CHARCOAL)  # fill canvas with charcoal (macOS mask will squircle)
    draw = ImageDraw.Draw(img)

    # Soft head circle cx=12 cy=13.2 r=8.6
    cx, cy, r = 12 * scale, 13.2 * scale, 8.6 * scale
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=SOFT)

    img = img.resize((size, size), Image.Resampling.LANCZOS)

    # Eyes — SVG rects rotated ±14° about their centers
    # Left: x=8.15 y=10.9 w=2.35 h=5.1 rx=1.175  rotate(14 9.325 13.45)
    # Right: x=13.5 y=10.9 w=2.35 h=5.1 rx=1.175 rotate(-14 14.675 13.45)
    left_mask = rounded_rect_mask(size, 9.325, 13.45, 2.35, 5.1, 1.175, 14)
    right_mask = rounded_rect_mask(size, 14.675, 13.45, 2.35, 5.1, 1.175, -14)
    eyes = Image.new("RGBA", (size, size), TRANSPARENT)
    eyes_px = eyes.load()
    lm = left_mask.load()
    rm = right_mask.load()
    for y in range(size):
        for x in range(size):
            a = max(lm[x, y], rm[x, y])
            if a:
                eyes_px[x, y] = (CHARCOAL[0], CHARCOAL[1], CHARCOAL[2], a)
    out = Image.alpha_composite(img, eyes)
    return out


def render_template_face(face_size: int, pad_right: int) -> Image.Image:
    """Menu-bar template: black filled soft head with transparent eye punches + right gutter."""
    # Head circle from soft-head geometry, slightly zoomed for menu-bar legibility
    # Use soft-head disc as the silhouette (not the outer charcoal) so tray reads as a face.
    ss = 8
    big = face_size * ss
    scale = big / 24.0
    zoom = 1.08
    mid = big / 2

    def map_xy(px: float, py: float) -> tuple[float, float]:
        # px,py in face pixel space 0..face_size
        sx = mid + ((px + 0.5) * ss - mid) / zoom
        sy = mid + ((py + 0.5) * ss - mid) / zoom
        return sx / scale, sy / scale  # viewBox units

    rgba = Image.new("RGBA", (face_size, face_size), TRANSPARENT)
    px = rgba.load()

    # Pre-render eye masks at face_size for punch-out
    left_mask = rounded_rect_mask(face_size, 9.325, 13.45, 2.35 * 1.05, 5.1 * 1.05, 1.175, 14, supersample=8)
    right_mask = rounded_rect_mask(face_size, 14.675, 13.45, 2.35 * 1.05, 5.1 * 1.05, 1.175, -14, supersample=8)
    lm, rm = left_mask.load(), right_mask.load()

    for y in range(face_size):
        for x in range(face_size):
            # Multi-sample coverage of soft head circle (12, 13.2, 8.6)
            cov = 0.0
            samples = 5
            step = 1.0 / samples
            for sy in range(samples):
                for sx in range(samples):
                    vx, vy = map_xy(x + (sx + 0.5) * step - 0.5, y + (sy + 0.5) * step - 0.5)
                    dx, dy = vx - 12.0, vy - 13.2
                    if dx * dx + dy * dy <= 8.6 * 8.6:
                        cov += 1.0
            cov /= samples * samples
            if cov <= 0:
                continue
            eye = max(lm[x, y], rm[x, y]) / 255.0
            a = int(round(cov * (1.0 - eye) * 255))
            if a > 0:
                px[x, y] = (0, 0, 0, a)

    if pad_right <= 0:
        return rgba
    w = face_size + pad_right
    out = Image.new("RGBA", (w, face_size), TRANSPARENT)
    out.paste(rgba, (0, 0))
    return out


def write_icns(master_1024: Path, dest: Path) -> None:
    iconset = Path(tempfile.mkdtemp(prefix="grokbar-iconset-")) / "GrokBar.iconset"
    iconset.mkdir(parents=True)
    # Standard iconset names
    mapping = {
        "icon_16x16.png": 16,
        "diana.k@example.org": 32,
        "icon_32x32.png": 32,
        "ivan.p@example.net": 64,
        "icon_128x128.png": 128,
        "mark@example.com": 256,
        "icon_256x256.png": 256,
        "wendy.h@example.net": 512,
        "icon_512x512.png": 512,
        "walt.e@example.net": 1024,
    }
    im = Image.open(master_1024).convert("RGBA")
    for name, sz in mapping.items():
        im.resize((sz, sz), Image.Resampling.LANCZOS).save(iconset / name, format="PNG")
    subprocess.check_call(["iconutil", "-c", "icns", str(iconset), "-o", str(dest)])
    shutil.rmtree(iconset.parent)


def write_ico(master_1024: Path, dest: Path) -> None:
    # Pillow: pass master + sizes= so all frames are embedded.
    # append_images + sizes= together often collapses to a single 16x16.
    im = Image.open(master_1024).convert("RGBA")
    sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    im.save(dest, format="ICO", sizes=sizes)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    master = render_mark(1024)
    master_path = OUT / "icon-source.png"
    master.save(master_path)
    print("wrote", master_path.relative_to(ROOT))

    sizes = {
        "icon.png": 512,
        "icon@2x.png": 1024,
        "32x32.png": 32,
        "64x64.png": 64,
        "128x128.png": 128,
        "128x128@2x.png": 256,
        "grok-256.png": 256,
    }
    for name, sz in sizes.items():
        path = OUT / name
        master.resize((sz, sz), Image.Resampling.LANCZOS).save(path)
        print("wrote", path.relative_to(ROOT), f"{sz}x{sz}")

    icns = OUT / "icon.icns"
    write_icns(master_path, icns)
    print("wrote", icns.relative_to(ROOT))

    ico = OUT / "icon.ico"
    write_ico(master_path, ico)
    print("wrote", ico.relative_to(ROOT))

    # Tray templates — same face family, menu-bar template compatible
    for face, pad, name in [(18, 4, "tray.png"), (36, 8, "tray@2x.png")]:
        t = render_template_face(face, pad)
        path = OUT / name
        t.save(path)
        print("wrote", path.relative_to(ROOT), f"{t.size[0]}x{t.size[1]}")

    print("done — canonical geometry from GrokMark2Icon.tsx")


if __name__ == "__main__":
    main()
