"""Cuts a phone render (green screen on a white background) into a transparent WebP for the website hero.
usage: python scripts/cutout-phone.py <render.png|webp> <out.webp>
Prints the screen hole as % insets of the cropped image, for .screen in src/site/stage/stage.module.css.
"""
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

src, out = sys.argv[1], sys.argv[2]
rgb = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
h, w, _ = rgb.shape
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]


def region(mask: np.ndarray, seed: tuple[int, int]) -> np.ndarray:
    """Pixels of `mask` connected to `seed` (x, y), so stray matches elsewhere are ignored."""
    labels, _ = ndimage.label(mask)
    return labels == labels[seed[1], seed[0]]


# Background: near-white pixels connected to the corner, plus a soft edge so the outline isn't jagged.
bg = region(rgb.min(-1) > 226, (0, 0))
ring = ~bg & (np.asarray(Image.fromarray(bg.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(5))) > 0)
alpha = np.where(bg, 0.0, 1.0)
edge_a = np.clip((250 - rgb.min(-1)) / 90, 0, 1)
alpha[ring] = edge_a[ring]

# Screen: green pixels connected to the centre; edge pixels get partial alpha and lose their green tint.
greenness = g - np.maximum(r, b)
screen = region(greenness > 60, (w // 2, h // 2))
near = np.asarray(Image.fromarray(screen.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(7))) > 0
spill = near & ~screen
alpha[screen] = 0
alpha[spill] = np.minimum(alpha[spill], 1 - np.clip(greenness[spill] / 170, 0, 1))
g = np.where(near, np.minimum(g, np.maximum(r, b)), g)

# Un-mix the soft background edge from white so it doesn't leave a light halo on the blue backdrop.
a = np.maximum(alpha, 1e-3)[..., None]
out_rgb = np.stack([r, g, b], -1)
out_rgb = np.where(ring[..., None], (out_rgb - (1 - a) * 255) / a, out_rgb)
rgba = np.dstack([np.clip(out_rgb, 0, 255), alpha * 255]).astype(np.uint8)

# Crop to the phone and report the screen hole.
ys, xs = np.nonzero(alpha > 0.02)
y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
Image.fromarray(rgba[y0:y1, x0:x1]).save(out, "WEBP", quality=92, method=6)
sy, sx = np.nonzero(screen[y0:y1, x0:x1])
ch, cw = y1 - y0, x1 - x0
print(f"{out}: {cw}x{ch}  ratio {cw / ch:.4f}")
print(f"screen inset: top {100 * sy.min() / ch:.2f}% right {100 * (cw - sx.max() - 1) / cw:.2f}% "
      f"bottom {100 * (ch - sy.max() - 1) / ch:.2f}% left {100 * sx.min() / cw:.2f}%")
# Corner radius: how far in from the screen's left edge the top row of green starts.
top_row = sx[sy == sy.min()]
print(f"screen corner radius ~ {100 * (top_row.min() - sx.min()) / cw:.2f}% of width")
