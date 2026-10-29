"""Remove stray bits left from cutting a portrait out of a sheet: anything not joined to the figure itself (a sliver
of the next person, a 1 px line along the cut). Pieces smaller than 2 % of the figure are cleared.
python3 tools/portraits/strays.py src/assets/portraits/<id>.webp ..."""
import sys
from collections import deque
from PIL import Image

def clean(path, thr=40):
    im = Image.open(path).convert('RGBA'); w, h = im.size
    a = im.getchannel('A'); px = a.load()
    seen = bytearray(w * h); comps = []
    for y in range(h):
        for x in range(w):
            if px[x, y] > thr and not seen[y * w + x]:
                q = deque([(x, y)]); seen[y * w + x] = 1; pts = []
                while q:
                    cx, cy = q.popleft(); pts.append((cx, cy))
                    for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                        if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and px[nx, ny] > thr:
                            seen[ny * w + nx] = 1; q.append((nx, ny))
                comps.append(pts)
    if len(comps) < 2: return print(path.rsplit('/', 1)[-1], 'clean')
    comps.sort(key=len, reverse=True)
    main = len(comps[0]); gone = 0
    for c in comps[1:]:
        if len(c) < 0.02 * main:
            for x, y in c: px[x, y] = 0
            gone += len(c)
    # faint pixels hugging a cleared piece (alpha ≤ thr) go too, so no ghost line stays
    im.putalpha(a); im.save(path, 'WEBP', quality=86, method=6)
    print(path.rsplit('/', 1)[-1], f'removed {len(comps) - 1} pieces, {gone} px')

for p in sys.argv[1:]: clean(p)
