# Country roads drawn as ribbons, not strokes: a road is wide where it is near and thin far away, with a darker
# rim, two wheel ruts, a strip of grass between them where it is wide, pebbles and grass tufts on its verges.
# Branches are ribbons of their own that start inside the main road, so all the rims are drawn first and all
# the surfaces over them: where two roads meet, they merge into one surface.
import math, re

NUM = r'-?\d+(?:\.\d+)?'


def parse(d):
    """Absolute M/L/C path data into a list of segments: ('L', p0, p1) or ('C', p0, c1, c2, p1)."""
    toks = re.findall(r'[MLC]|' + NUM, d)
    segs, i, cur, cmd = [], 0, None, None
    while i < len(toks):
        t = toks[i]
        if t in 'MLC':
            cmd = t
            i += 1
            continue
        if cmd == 'M':
            cur = (float(toks[i]), float(toks[i + 1])); i += 2; cmd = 'L'
        elif cmd == 'L':
            p = (float(toks[i]), float(toks[i + 1])); i += 2
            segs.append(('L', cur, p)); cur = p
        elif cmd == 'C':
            c1 = (float(toks[i]), float(toks[i + 1])); c2 = (float(toks[i + 2]), float(toks[i + 3])); p = (float(toks[i + 4]), float(toks[i + 5])); i += 6
            segs.append(('C', cur, c1, c2, p)); cur = p
    return segs


def bez(p0, c1, c2, p1, t):
    u = 1 - t
    return (u ** 3 * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t ** 3 * p1[0],
            u ** 3 * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t ** 3 * p1[1])


def sample(d, step=2.5):
    """Points along the path about `step` apart."""
    pts = []
    for s in parse(d):
        if s[0] == 'L':
            p0, p1 = s[1], s[2]
            n = max(1, int(math.dist(p0, p1) / step))
            for k in range(n):
                t = k / n
                pts.append((p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t))
        else:
            p0, c1, c2, p1 = s[1:]
            est = math.dist(p0, c1) + math.dist(c1, c2) + math.dist(c2, p1)
            n = max(2, int(est / step))
            for k in range(n):
                pts.append(bez(p0, c1, c2, p1, k / n))
    last = parse(d)[-1]
    pts.append(last[-1])
    # drop near-duplicates
    out = [pts[0]]
    for p in pts[1:]:
        if math.dist(p, out[-1]) > .4:
            out.append(p)
    return out


def normals(pts):
    ns = []
    for i in range(len(pts)):
        a = pts[max(0, i - 1)]; b = pts[min(len(pts) - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy) or 1
        ns.append((-dy / L, dx / L))
    return ns


def offset(pts, ns, ws, k):
    return [(p[0] + n[0] * w * k, p[1] + n[1] * w * k) for p, n, w in zip(pts, ns, ws)]


def path_of(p, close=False):
    d = 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in p)
    return d + (' Z' if close else '')


def ribbon(pts, ws):
    ns = normals(pts)
    left = offset(pts, ns, ws, .5)
    right = offset(pts, ns, ws, -.5)
    return path_of(left + right[::-1], True), ns


def rnd(i, seed=7):
    """A cheap deterministic noise in [0, 1)."""
    h = (i * 374761393 + seed * 668265263) & 0xffffffff
    h = ((h ^ (h >> 13)) * 1274126177) & 0xffffffff
    return ((h ^ (h >> 16)) & 0xffffffff) / 4294967296


class Road:
    def __init__(self, d, width, taper=None):
        """width(y) -> road width; taper: (start factor, end factor) along the road for branches."""
        self.pts = sample(d)
        n = len(self.pts)
        self.ws = []
        for i, (x, y) in enumerate(self.pts):
            w = width(y)
            if taper:
                t = i / max(1, n - 1)
                w *= taper[0] + (taper[1] - taper[0]) * t
            self.ws.append(w)
        self.shape, self.ns = ribbon(self.pts, self.ws)

    def rim(self, col):
        # the rim shows as a band just outside the surface; it is drawn under every surface
        return f'<path d="{self.shape}" fill="{col}" stroke="{col}" stroke-width="2.2" stroke-linejoin="round"/>'

    def surface(self, col, light):
        o = f'<path d="{self.shape}" fill="{col}"/>'
        # a lighter, sun-worn crown down the middle
        crown, _ = ribbon(self.pts, [w * .46 for w in self.ws])
        o += f'<path d="{crown}" fill="{light}" opacity=".55"/>'
        return o

    def ruts(self, col, grass, seed=1):
        o = ''
        for k in (-.27, .27):
            p = offset(self.pts, self.ns, self.ws, k)
            # the ruts break now and then, like real ones washed out by rain
            segs, cur = [], []
            for i, q in enumerate(p):
                if rnd(i // 9, seed + int(k * 100)) < .12 and cur:
                    segs.append(cur); cur = []
                cur.append(q)
            segs.append(cur)
            for sg in segs:
                if len(sg) < 3:
                    continue
                w0 = self.ws[min(len(self.ws) - 1, p.index(sg[0]))]
                o += f'<path d="{path_of(sg)}" fill="none" stroke="{col}" stroke-width="{max(.7, w0 * .085):.2f}" stroke-linecap="round" opacity=".9"/>'
        # where the road is wide enough a strip of grass runs between the ruts
        cur, out = [], []
        for i, (q, w) in enumerate(zip(self.pts, self.ws)):
            if w > 12 and rnd(i // 6, seed + 5) > .25:
                cur.append((q, w))
            elif cur:
                out.append(cur); cur = []
        out.append(cur)
        for sg in out:
            if len(sg) < 4:
                continue
            o += f'<path d="{path_of([q for q, _ in sg])}" fill="none" stroke="{grass}" stroke-width="{max(.8, sg[0][1] * .09):.2f}" stroke-linecap="round" stroke-dasharray="3 2.4" opacity=".8"/>'
        return o

    def verges(self, tuft, pebble, seed=3):
        o = ''
        for i in range(0, len(self.pts), 7):
            r = rnd(i, seed)
            w = self.ws[i]
            side = 1 if r < .5 else -1
            p, n = self.pts[i], self.ns[i]
            if r < .55:
                x, y = p[0] + n[0] * side * (w * .5 + 1.2), p[1] + n[1] * side * (w * .5 + 1.2)
                s = .55 + w / 40
                o += (f'<path d="M{x:.1f} {y:.1f} q{1.2 * s:.1f} {-4 * s:.1f} {2.4 * s:.1f} 0 q{1.2 * s:.1f} {-4.6 * s:.1f} {2.4 * s:.1f} 0" '
                      f'fill="none" stroke="{tuft}" stroke-width="{.7 + w / 60:.2f}" stroke-linecap="round"/>')
            elif r > .8 and w > 7:
                x, y = p[0] + n[0] * side * w * .36, p[1] + n[1] * side * w * .36
                o += f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{.6 + w / 26:.2f}" ry="{.35 + w / 50:.2f}" fill="{pebble}"/>'
        return o


def network(main, branches, width):
    """All the roads of the village: the main one and its branches, drawn as one merged surface."""
    roads = [Road(main, width)] + [Road(d, lambda y: width(y) * .62, (1.0, .7)) for d in branches]
    rim, top, light, rut, grass, tuft, pebble = '#b8976a', '#e8d3a3', '#f6ead0', '#c2a06a', '#9fbe6c', '#5f8f3e', '#bfa47a'
    o = ''.join(r.rim(rim) for r in roads)
    o += ''.join(r.surface(top, light) for r in roads)
    o += ''.join(r.ruts(rut, grass, i + 1) for i, r in enumerate(roads))
    o += ''.join(r.verges(tuft, pebble, i + 3) for i, r in enumerate(roads))
    return o, roads[0]
