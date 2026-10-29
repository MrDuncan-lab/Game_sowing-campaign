"""Soften the straight cut lines left where a portrait was cut out of a sheet of several people.

Some painted portraits end in a vertical line at a shoulder or an elbow (the cut between two people on the sheet).
In a scene the figure stands at full height and that line shows as a chopped-off arm. For each side the script finds
such a line — many rows whose outermost opaque pixel sits in the same column — and fades the alpha of those rows over
FEATHER px inward, so the arm melts away instead of ending in a ruler-straight edge. The silhouette elsewhere is left
as painted. Run once per new portrait: python3 tools/portraits/feather.py src/assets/portraits/<id>.webp ...
"""
import sys
from collections import Counter
from PIL import Image

FEATHER_FRAC = 0.045      # ramp width as a share of the image width (≈35 px at 768)
MIN_RUN_FRAC = 0.08       # a side counts as cut when this share of the rows ends in one column

def edges(alpha, w, h, thr=128):
    left, right = [None] * h, [None] * h
    px = alpha.load()
    for y in range(h):
        xs = [x for x in range(w) if px[x, y] > thr]
        if xs: left[y], right[y] = xs[0], xs[-1]
    return left, right

def cut_column(cols, h):
    c = Counter(x for x in cols if x is not None)
    if not c: return None
    # a cut is a column (±1 px) that many rows share
    best, n = None, 0
    for x in c:
        k = c[x] + c.get(x - 1, 0) + c.get(x + 1, 0)
        if k > n: best, n = x, k
    return best if n >= MIN_RUN_FRAC * h else None

def feather(path):
    im = Image.open(path).convert('RGBA'); w, h = im.size
    a = im.getchannel('A'); left, right = edges(a, w, h)
    K = max(8, round(FEATHER_FRAC * w))
    px = a.load(); done = []
    for side, cols in (('left', left), ('right', right)):
        xc = cut_column(cols, h)
        if xc is None: continue
        rows = 0
        for y in range(h):
            e = cols[y]
            if e is None or abs(e - xc) > 1: continue
            rows += 1
            for i in range(K):
                x = e + i if side == 'left' else e - i
                if 0 <= x < w: px[x, y] = round(px[x, y] * (i + 1) / (K + 1))
        done.append(f'{side}@{xc} ({rows} rows)')
    if done:
        im.putalpha(a)
        im.save(path, 'WEBP', quality=86, method=6)
    print(path.rsplit('/', 1)[-1], ', '.join(done) or 'no straight cut')

for p in sys.argv[1:]: feather(p)
