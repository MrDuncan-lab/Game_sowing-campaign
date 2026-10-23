# Seamless atlas-page paper for the main screen: 512x512, wraps on both axes (all filters use mode='wrap').
# python3 tools/map/paper-tile.py src/assets/atlas-paper.webp
import sys, numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import gaussian_filter
N = 512
rng = np.random.default_rng(11)
def field(sigma, amp):
    f = gaussian_filter(rng.standard_normal((N, N)), sigma, mode='wrap')
    return f / (np.abs(f).max() + 1e-9) * amp
lum = field(34, .016) + field(9, .016) + field(1.8, .018) + field(.6, .026)
base = np.array([242, 231, 203], float) / 255
img = base * (1 + lum[..., None])
# fibres: short pale and dark hairs, drawn on a 3x3 canvas and folded back so they wrap
fib = Image.new('L', (N * 3, N * 3), 0); dr = ImageDraw.Draw(fib)
dark = Image.new('L', (N * 3, N * 3), 0); dd = ImageDraw.Draw(dark)
for i in range(520):
    x, y = rng.uniform(N, 2 * N), rng.uniform(N, 2 * N)
    a = rng.uniform(0, np.pi); l = rng.uniform(4, 16); c = rng.uniform(.25, 1)
    pts = [(x + np.cos(a) * t * l + rng.normal(0, .6), y + np.sin(a) * t * l + rng.normal(0, .6)) for t in np.linspace(0, 1, 5)]
    (dr if i % 4 else dd).line(pts, fill=int(255 * c), width=1)
def fold(im):
    a = np.asarray(im.filter(ImageFilter.GaussianBlur(.5)), float) / 255
    out = np.zeros((N, N))
    for j in range(3):
        for k in range(3): out += a[j * N:(j + 1) * N, k * N:(k + 1) * N]
    return np.clip(out, 0, 1)
img = img * (1 + .07 * fold(fib)[..., None]) * (1 - .13 * fold(dark)[..., None])
# a few faint foxing specks
for _ in range(14):
    cx, cy, r = rng.uniform(0, N), rng.uniform(0, N), rng.uniform(1.5, 5)
    yy, xx = np.mgrid[0:N, 0:N]
    dx = np.minimum(np.abs(xx - cx), N - np.abs(xx - cx)); dy = np.minimum(np.abs(yy - cy), N - np.abs(yy - cy))
    img *= 1 - (.05 * np.exp(-(dx ** 2 + dy ** 2) / (2 * r * r)))[..., None] * np.array([.6, .9, 1.4])
Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).save(sys.argv[1], quality=80, method=6)
