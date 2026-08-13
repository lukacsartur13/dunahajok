"""
PXL — offline zone inspection renders.

A software rasteriser, deliberately: this runs in the *build*, before the model
has ever reached a browser, and its job is to answer "is the split right?"
against the design renders without a GPU, a headless browser or a DCC app in
the loop. It is not a preview of what the site will look like — the real thing
is validated in the browser, in `PHASE_2_5_REPORT.md`.

Colours are the reference colourway from the design imagery, so a preview can
be held up against `assets/source/pxl/pxl-side-20240719.jpg` directly.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np

try:
    from PIL import Image
except ModuleNotFoundError:                                # pragma: no cover
    Image = None

#: sRGB, matching the reference renders rather than the linear values the
#: exported materials carry.
ZONE_COLOUR = {
    "hull_primary": (0.53, 0.58, 0.55),
    "hull_lower": (0.09, 0.09, 0.10),
    "hull_accent": (0.14, 0.14, 0.15),
    "transom_black": (0.12, 0.12, 0.13),
    "deck_main": (0.30, 0.31, 0.31),
    "deck_trim": (0.53, 0.58, 0.55),
    "console_body": (0.16, 0.17, 0.21),
    "console_trim": (0.24, 0.25, 0.28),
    "helm_wheel": (0.13, 0.13, 0.14),
    "rails": (0.78, 0.42, 0.19),
    "motor": (0.11, 0.11, 0.12),
    "motor_trim": (0.30, 0.30, 0.31),
    "accessory_cockpit_cover": (0.34, 0.36, 0.35),
}

VIEWS = {
    #        yaw°, pitch°
    "side": (0, 0),
    "bow_3q": (-38, 16),
    "stern_3q": (140, 18),
    "top_3q": (-30, 55),
}


def _basis(yaw: float, pitch: float) -> np.ndarray:
    cy, sy = np.cos(np.deg2rad(yaw)), np.sin(np.deg2rad(yaw))
    cp, sp = np.cos(np.deg2rad(pitch)), np.sin(np.deg2rad(pitch))
    ry = np.array([[cy, -sy, 0.0], [sy, cy, 0.0], [0.0, 0.0, 1.0]])
    rp = np.array([[1.0, 0.0, 0.0], [0.0, cp, -sp], [0.0, sp, cp]])
    m = rp @ ry
    return np.array([m[0], m[2], -m[1]])


def _render(items: list[tuple[str, np.ndarray]], yaw: float, pitch: float,
            size: int = 1280):
    tris = np.concatenate([t for _, t in items])
    colours = np.concatenate([
        np.tile(np.asarray(ZONE_COLOUR.get(n, (1.0, 0.0, 0.6))), (t.shape[0], 1))
        for n, t in items
    ])
    basis = _basis(yaw, pitch)
    centre = (tris.reshape(-1, 3).min(0) + tris.reshape(-1, 3).max(0)) / 2
    view = (tris - centre) @ basis.T

    lo = view.reshape(-1, 3).min(0)
    hi = view.reshape(-1, 3).max(0)
    span = max(hi[0] - lo[0], hi[1] - lo[1]) * 1.06
    w = int(size * (hi[0] - lo[0]) / span) + 10
    h = int(size * (hi[1] - lo[1]) / span) + 10
    scale = size / span

    x = (view[:, :, 0] - lo[0]) * scale + 5
    y = h - ((view[:, :, 1] - lo[1]) * scale + 5)
    z = view[:, :, 2]

    normal = np.cross(tris[:, 1] - tris[:, 0], tris[:, 2] - tris[:, 0])
    length = np.linalg.norm(normal, axis=1, keepdims=True)
    normal = np.divide(normal, length, out=np.zeros_like(normal), where=length > 1e-12)
    nv = normal @ basis.T
    key = np.array([0.30, 0.42, 0.85]); key /= np.linalg.norm(key)
    lam = np.clip(nv @ key, 0.0, 1.0)
    fill = np.clip(nv[:, 1] * 0.5 + 0.5, 0.0, 1.0)
    shade = (0.24 + 0.62 * lam ** 0.85 + 0.16 * fill)[:, None]
    facing = nv[:, 2] > 0                         # cull what points away

    img = np.ones((h, w, 3), np.float32)
    zbuf = np.full((h, w), -1e30, np.float32)
    for i in np.argsort(z.mean(1)):
        if not facing[i]:
            continue
        x0, x1, x2 = x[i]
        y0, y1, y2 = y[i]
        ax0 = max(int(min(x0, x1, x2)), 0); ax1 = min(int(max(x0, x1, x2)) + 2, w)
        ay0 = max(int(min(y0, y1, y2)), 0); ay1 = min(int(max(y0, y1, y2)) + 2, h)
        if ax0 >= ax1 or ay0 >= ay1:
            continue
        gx, gy = np.meshgrid(np.arange(ax0, ax1) + 0.5, np.arange(ay0, ay1) + 0.5)
        det = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2)
        if abs(det) < 1e-12:
            continue
        w0 = ((y1 - y2) * (gx - x2) + (x2 - x1) * (gy - y2)) / det
        w1 = ((y2 - y0) * (gx - x2) + (x0 - x2) * (gy - y2)) / det
        w2 = 1.0 - w0 - w1
        inside = (w0 >= -1e-6) & (w1 >= -1e-6) & (w2 >= -1e-6)
        if not inside.any():
            continue
        depth = w0 * z[i, 0] + w1 * z[i, 1] + w2 * z[i, 2]
        tile = zbuf[ay0:ay1, ax0:ax1]
        inside &= depth > tile
        if not inside.any():
            continue
        tile[inside] = depth[inside]
        img[ay0:ay1, ax0:ax1][inside] = colours[i] * shade[i]
    return Image.fromarray((np.clip(img, 0, 1) ** (1 / 1.05) * 255).astype(np.uint8))


def write_previews(items: list[tuple[str, np.ndarray]], out_dir: Path) -> None:
    if Image is None:
        print("  previews skipped — Pillow not installed")
        return
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, (yaw, pitch) in VIEWS.items():
        path = out_dir / f"PXL.zones.{name}.png"
        _render(items, yaw, pitch).save(path)
        print(f"  preview  {path.name}")
