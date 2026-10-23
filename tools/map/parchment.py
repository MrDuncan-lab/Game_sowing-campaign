# Aged parchment for the region map: 1600x1200, folded in four, darker burnt edges, stains and fibres.
# python3 tools/map/parchment.py out.png
import sys, numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter
W, H = 1600, 1200
rng = np.random.default_rng(7)
def field(sigma, amp):
    f = gaussian_filter(rng.standard_normal((H, W)), sigma)
    return f / (np.abs(f).max() + 1e-9) * amp
lum = field(220, .07) + field(70, .05) + field(18, .025) + field(2.2, .018) + field(.8, .012)
yy, xx = np.mgrid[0:H, 0:W]
# distance to the edge, broken by noise: the edges went brown with age
d = np.minimum(np.minimum(xx, W - 1 - xx), np.minimum(yy, H - 1 - yy)).astype(float)
d = d + field(30, 26) + field(6, 6)
edge = np.exp(-np.clip(d, 0, None) / 70.0)
corner = np.exp(-(np.minimum(np.hypot(xx, yy), np.minimum(np.hypot(W - xx, yy), np.minimum(np.hypot(xx, H - yy), np.hypot(W - xx, H - yy))))) / 260.0)
# a few tea stains and one ring
stain = np.zeros((H, W))
for cx, cy, r, a, ring in [(1250, 330, 120, .06, .6), (420, 900, 200, .05, 0), (1010, 980, 70, .05, .8), (240, 250, 150, .035, 0)]:
    rr = np.hypot(xx - cx, yy - cy) + field(25, 30)
    stain += a * np.exp(-(rr / r) ** 2)
    stain += a * ring * np.exp(-((rr - r) / 6.0) ** 2)
# folds: the map was folded in four
fold = np.zeros((H, W))
for pos, axis in [(W // 2, 1), (H // 2, 0)]:
    c = xx if axis else yy
    wob = field(40, 4)
    dist = c - pos + wob
    fold += .07 * np.exp(-(dist / 2.2) ** 2) - .04 * np.exp(-((dist - 5) / 3) ** 2) + .025 * np.tanh(dist / 60)
base = np.array([240, 223, 180], float) / 255
dark = np.array([150, 104, 55], float) / 255
k = np.clip(edge * .85 + corner * .35 + stain, 0, 1)[..., None]
img = base * (1 + lum[..., None] - fold[..., None]) * (1 - k) + dark * k * (1 + lum[..., None])
# fibres
fib = Image.new('L', (W, H), 0)
from PIL import ImageDraw
dr = ImageDraw.Draw(fib)
for i in range(900):
    x, y = rng.uniform(0, W), rng.uniform(0, H)
    a = rng.uniform(0, np.pi); L = rng.uniform(6, 26)
    pts = [(x + np.cos(a) * t + rng.normal(0, .8), y + np.sin(a) * t + rng.normal(0, .8)) for t in np.linspace(0, L, 6)]
    dr.line(pts, fill=int(rng.uniform(20, 70)), width=1)
f = gaussian_filter(np.asarray(fib, float) / 255, .6)[..., None]
img = img * (1 - .12 * f)
img = np.clip(img, 0, 1)
Image.fromarray((img * 255).astype(np.uint8)).save(sys.argv[1] if len(sys.argv) > 1 else 'parchment.png')
