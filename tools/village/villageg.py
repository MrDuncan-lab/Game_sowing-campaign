# The Chernozem village for the game itself, in the hybrid style chosen on 26.10 (see hy.py): six hills above the
# field, the same places the game knows (houses to tap, order bubbles, the payment cart's road, the kids at the
# gate), drawn with ink and hatching, a low evening sun on the left, haze between the far hills; winter at dusk with
# snow on the roofs and lit windows.
#
# Everything that depends on the game is either a class the game switches on (the lab, the gifts, the empty lots)
# or an anchor the game draws at (order bubbles, the payment cart, the kids at the gate, the flock).
import json, math, os, random, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import hy as H
import pieces as Q
import roads5
from hy import Hy, PAL, D, SD, fmt, mix, dark, light

W = 362
VH = 1240                 # the village's full height; every hill runs on to VH + 40 under the field
BOTTOM = VH + 40
SEASONS = ('summer', 'winter')

HILLS = {
    'A': dict(xs=[-10, 40, 100, 160, 220, 280, 330, 372], ys=[138, 124, 132, 120, 130, 122, 134, 128], rate=0.0, ink=.7),
    'B': dict(xs=[-10, 60, 130, 200, 270, 330, 372], ys=[272, 262, 270, 260, 268, 260, 268], rate=0.0, ink=.8),
    'C': dict(xs=[-10, 50, 120, 190, 260, 320, 372], ys=[416, 404, 412, 402, 412, 404, 414], rate=0.0, ink=.9),
    'D': dict(xs=[-10, 70, 150, 230, 300, 372], ys=[566, 556, 564, 554, 562, 556], rate=0.06, ink=.95),
    'E': dict(xs=[-10, 60, 140, 220, 290, 372], ys=[724, 714, 722, 712, 720, 714], rate=0.26, ink=1.05),
    'F': dict(xs=[-10, 80, 170, 250, 320, 372], ys=[884, 874, 880, 870, 878, 872], rate=0.52, ink=1.15),
}
ORDER = ['A', 'B', 'C', 'D', 'E', 'F']


def hill_fill(P, k):
    """Each hill a step nearer: from the hazy far green to the deep near one."""
    return {'A': mix(P['far2'], P['g1'], .35), 'B': P['g1'], 'C': mix(P['g1'], P['g2'], .5), 'D': P['g2'], 'E': P['g3'], 'F': P['g4']}[k]


def smooth(xs, ys):
    d = f'M{xs[0]} {ys[0]}'
    for i in range(1, len(xs)):
        mx = (xs[i - 1] + xs[i]) / 2
        d += f' C{mx} {ys[i - 1]} {mx} {ys[i]} {xs[i]} {ys[i]}'
    return d


def sample(xs, ys):
    out = []
    for i in range(1, len(xs)):
        x0, y0, x1, y1 = xs[i - 1], ys[i - 1], xs[i], ys[i]
        mx = (x0 + x1) / 2
        for k in range(16):
            t = k / 16
            bx = (1 - t) ** 3 * x0 + 3 * (1 - t) ** 2 * t * mx + 3 * (1 - t) * t ** 2 * mx + t ** 3 * x1
            by = (1 - t) ** 3 * y0 + 3 * (1 - t) ** 2 * t * y0 + 3 * (1 - t) * t ** 2 * y1 + t ** 3 * y1
            out.append((bx, by))
    out.append((xs[-1], ys[-1]))
    return out


SAMPLES = {k: sample(v['xs'], v['ys']) for k, v in HILLS.items()}


def crest_at(key, x):
    s = SAMPLES[key]
    for (ax, ay), (bx, by) in zip(s, s[1:]):
        if ax <= x <= bx:
            return ay + (by - ay) * (x - ax) / max(bx - ax, 1e-6)
    return s[-1][1]


def hill_path(key):
    h = HILLS[key]
    return smooth(h['xs'], h['ys']) + f' L372 {BOTTOM} L-10 {BOTTOM} Z'


# ---------------------------------------------------------------- the roads (village coordinates)
MAIN = ('M181 1290 L181 1240 C181 1214 188 1192 206 1166 C222 1142 220 1116 204 1094 C190 1074 190 1050 200 1026 '
        'C210 1002 214 976 208 950 C202 924 200 904 204 878 C207 856 198 836 194 812 C190 788 192 762 190 732 '
        'C188 710 184 698 182 686 C180 664 180 640 178 616 C176 594 178 574 176 552 C174 530 174 506 172 482 '
        'C170 458 174 436 176 412 C178 394 182 384 186 376')
BRANCHES = [
    'M200 1040 C192 1036 186 1030 172 1022',          # to the porch
    'M206 1110 C232 1100 262 1080 286 1056',          # to the barn
    'M206 1170 C170 1176 120 1176 82 1164',           # to the lab
    'M194 846 C160 850 120 852 96 858',               # the street: to the left yard
    'M196 840 C250 836 310 826 390 812',              # the road out of the village, to the map
    'M182 694 C150 698 112 704 76 712',               # round the square: the bakery
    'M182 694 C214 698 252 704 292 712',              # and the restaurant
    'M174 520 C150 524 124 530 100 538',              # up the far hills: the orphanage
    'M176 512 C204 516 228 522 252 530',              # the izbas
    'M150 372 C126 348 104 312 92 282 C86 266 80 250 76 240',   # past the council to the windmill
]
OPEN_END = {4}            # the road out runs off the picture: no free end to narrow
SQUARE = [(76, 700), (110, 686), (150, 680), (196, 678), (246, 682), (286, 692), (296, 704), (262, 714), (214, 718), (160, 718), (112, 714)]
WELL_PATCH = [(160, 700), (184, 692), (212, 694), (220, 704), (196, 710), (166, 708)]


def road_width(y):
    t = max(0.0, min(1.0, (y - 376) / (BOTTOM - 376)))
    return 5 + 25 * t ** 1.3


def _taper(t, end=.3, floor=.35):
    return floor + (1 - floor) * min(1.0, (1 - t) / end)


def ribbon(pts, ws, wobble, seed):
    rng = random.Random(seed)
    ph = [rng.uniform(0, 6.28) for _ in range(4)]
    n = len(pts)
    L, R, acc = [], [], 0.0
    for i, (x, y) in enumerate(pts):
        a, b = pts[max(0, i - 1)], pts[min(n - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        d = math.hypot(dx, dy) or 1
        nx, ny = -dy / d, dx / d
        if i:
            acc += math.dist(pts[i - 1], pts[i])
        u = acc / 34
        e1 = wobble * (math.sin(u + ph[0]) + .5 * math.sin(u * 2.7 + ph[1]))
        e2 = wobble * (math.sin(u * .9 + ph[2]) + .5 * math.sin(u * 2.3 + ph[3]))
        w = ws[i] / 2
        L.append((x + nx * (w + e1), y + ny * (w + e1)))
        R.append((x - nx * (w + e2), y - ny * (w + e2)))
    return L, R


def area(poly):
    return sum(poly[i - 1][0] * poly[i][1] - poly[i][0] * poly[i - 1][1] for i in range(len(poly))) / 2


def road_shapes():
    """Centre lines, width profiles and outlines of every road; all outlines wind the same way, so their union
    fills as one surface."""
    out = []
    pts = roads5.sample(MAIN, 4)
    n = len(pts)
    ws = [road_width(y) * (_taper(i / (n - 1), .04, .55)) for i, (x, y) in enumerate(pts)]
    out.append(dict(k='main', c=pts, ws=ws))
    for i, d in enumerate(BRANCHES):
        p = roads5.sample(d, 4)
        m = len(p)
        base = road_width(p[0][1]) * .58
        if i in OPEN_END:
            w = [base * (1 - .15 * j / (m - 1)) for j in range(m)]
        else:
            w = [base * (1 - .25 * j / (m - 1)) * _taper(j / (m - 1)) for j in range(m)]
        out.append(dict(k=f'b{i}', c=p, ws=w))
    for i, sh in enumerate(out):
        L, R = ribbon(sh['c'], sh['ws'], .7 if sh['k'] == 'main' else .5, 3 + i)
        poly = L + R[::-1]
        if area(poly) < 0:
            poly = poly[::-1]
        sh.update(L=L, R=R, o=poly)
    return out


def square_poly():
    p = H.catmull(SQUARE, 5, closed=True)
    return p if area(p) > 0 else p[::-1]


def roads_svg(season):
    """The one road network, in village coordinates; every hill shows it cut by its own outline. The hills show it
    through <use>, where the page's class rules do not reach: its ink is written out as plain attributes."""
    ink = PAL[season]['ink']
    svg = _roads(season)
    return (svg.replace('class="kn"', 'fill="none" stroke-linecap="round" stroke-linejoin="round"')
               .replace('class="kf"', f'stroke="{ink}" stroke-linejoin="round"')
               .replace('class="k"', f'fill="none" stroke="{ink}" stroke-linecap="round" stroke-linejoin="round"'))


def _roads(season):
    r = Hy(season, seed=21)
    P = r.P
    w = r.winter
    shapes = road_shapes()
    outlines = [sh['o'] for sh in shapes]
    if not w:
        outlines.append(square_poly())
    allo = ''.join(D(o) for o in outlines)
    worn = mix(P['g2'], P['road'], .5) if not w else P['snow_s']
    # a worn halo round the edges (two soft strokes instead of a blur)
    if not w:
        r.add(f'<path d="{allo}" class="kn" stroke="{worn}" stroke-width="7" opacity=".22"/>')
        r.add(f'<path d="{allo}" class="kn" stroke="{worn}" stroke-width="3.6" opacity=".38"/>')
        # a broken ink edge, half hidden by the fill
        ink = ''.join(D(r.jit(o, amp=.3, step=8)) for o in outlines)
        r.add(f'<path d="{ink}" class="k" stroke-width="1.15" stroke-dasharray="9 5 3 7 14 6" opacity=".5"/>')
    else:
        r.add(f'<path d="{allo}" class="kn" stroke="{worn}" stroke-width="3" opacity=".3"/>')
    r.add(f'<path d="{allo}" fill="url(#vhR)"/>')
    if w:
        # trodden snow round the well; soft snow banks along the roads
        r.add(f'<path d="{SD(WELL_PATCH)}" fill="{P["road"]}" opacity=".9"/>')
        edges = [[(x, y) for x, y in e if -10 <= x <= W + 10] for sh in shapes for e in (sh['L'], sh['R'])]
        edges = [e for e in edges if len(e) > 1]
        r.add(f'<path d="{"".join(D(e, False) for e in edges)}" class="kn" stroke="{P["snow_s"]}" stroke-width="1.6" opacity=".55" transform="translate(0 .9)"/>')
        r.add(f'<path d="{"".join(D(e, False) for e in edges)}" class="kn" stroke="#ffffff" stroke-width="2.2" opacity=".95"/>')
        main = shapes[0]
        r.lines([[(x + off, y) for x, y in main['c'] if y < 1240] for off in (-2.6, 2.6)], .5, color=P['rut'], op=.7)
        return ''.join(r.out)
    # grass creeping over the edges
    tf = []
    for sh in shapes + [dict(k='sq', L=square_poly(), R=[])]:
        for edge in (sh['L'], sh['R']):
            step = 6 if sh['k'] == 'main' else 7
            acc = 0.0
            for i in range(1, len(edge)):
                (x0, y0), (x1, y1) = edge[i - 1], edge[i]
                acc += math.hypot(x1 - x0, y1 - y0)
                if acc < step:
                    continue
                acc = r.rng.uniform(-2, 2)
                if not (0 <= x1 <= W):
                    continue
                hgt = r.rng.uniform(2.0, 3.8) * (1.15 if sh['k'] == 'main' else 1) * (.7 if y1 < 500 else 1)
                for dx, dh, lean in ((-1.3, .75, -.5), (0, 1, .1), (1.4, .7, .6)):
                    tf.append([(x1 + dx, y1 + .8), (x1 + dx + lean * 1.6, y1 + .8 - dh * hgt)])
    r.lines(tf, .5, color=dark(P['g3'], .3), op=.8)
    # wear on the main road: two ruts, the grass strip between them, puddles; a trodden line along the paths
    main = shapes[0]
    c, ws = main['c'], main['ws']
    n = len(c)
    ruts = []
    for off in (-.23, .23):
        pts = []
        for i in range(n):
            if ws[i] < 9:
                continue
            a, b = c[max(0, i - 1)], c[min(n - 1, i + 1)]
            dx, dy = b[0] - a[0], b[1] - a[1]
            d = math.hypot(dx, dy) or 1
            pts.append((c[i][0] - dy / d * off * ws[i], c[i][1] + dx / d * off * ws[i]))
        ruts.append(pts)
    r.lines(ruts, .8, color=P['rut'], op=.9)
    r.lines([[p for p, ww in zip(c, ws) if ww > 13]], 1.4, color=P['strip'], op=.55)
    for px, py, rx in [(196, 1006, 5), (210, 1140, 7)]:
        r.ellipse(px, py, rx, rx * .32, P['water'], op=.75)
        r.add(f'<path d="M{fmt(px - rx * .6)} {fmt(py - .4)}q{fmt(rx * .4)}-1 {fmt(rx * .9)} 0" class="kn" stroke="#fff" stroke-width=".6" opacity=".8"/>')
    r.lines([sh['c'][3:-5] for sh in shapes[1:] if len(sh['c']) > 10 and sh['k'] != 'b4'], .5, color=P['rut'], op=.5)
    # a few stones on the square
    r.dots([(x, y, 2.2, 1.0) for x, y in [(98, 704), (126, 710), (150, 690), (232, 708), (262, 694), (140, 714), (270, 708), (118, 694)]], dark(P['road'], .12), op=.8)
    return ''.join(r.out)


# ---------------------------------------------------------------- pieces: what stands where
POPS = []
ANCHORS = {}


def fronts(layer, x):
    i = ORDER.index(layer)
    return [(k, crest_at(k, x)) for k in ORDER[i + 1:]]


def pop(r, layer, key, x, base, draw, label, cls='', cond=None):
    """A building that stands up (scaleY) once it is out from behind the hill in front and under the sky strip.
    draw() paints it at the origin (its base at y = 0); `cond` names a class of the village root that must be on
    for it to show at all. Returns the height it stands to."""
    svg, b = r.capture(draw)
    h = max(8.0, -b[1])
    fr = fronts(layer, x)
    if r.season == 'summer':
        POPS.append((layer, key, x, base, h))
    f = ';'.join(f'{kk}:{y:.1f}' for kk, y in fr)
    c = ' '.join(filter(None, ['spot-g', cls, f'vc vc-{cond}' if cond else '']))
    r.add(f'<g class="{c}" data-k="{key}" role="button" tabindex="-1" aria-label="{label}" transform="translate({fmt(x)} {fmt(base)})">'
          f'<g class="pop" data-l="{layer}" data-b="{fmt(base)}" data-h="{fmt(h)}" data-f="{f}">{svg}</g></g>')
    return h


def anchor(name, layer, x, y):
    ANCHORS[name] = {'l': layer, 'x': round(x, 1), 'y': round(y, 1)}


def tree(r, x, y, draw):
    """A tree that springs up from its foot (the game finds it by .tree and its parent's translate)."""
    r.group(draw, x, y, 'tree')


def birch(r, x, y, h, lean=0.0):
    tree(r, x, y, lambda: H.birch(r, 0, 0, h, lean))


def apple(r, x, y, h):
    tree(r, x, y, lambda: H.apple(r, 0, 0, h))


def spruce(r, x, y, h):
    tree(r, x, y, lambda: H.spruce(r, 0, 0, h))


def lilac(r, x, y, w):
    tree(r, x, y, lambda: H.lilac(r, 0, 0, w))


def ground(r, key):
    """A hill: lit at its crest, deeper towards its foot; a sunlit rim and an ink line along the crest; a soft
    shade on the hill behind, just over this crest; grass; the roads, cut by its own outline."""
    P = r.P
    h = HILLS[key]
    fill = hill_fill(P, key)
    top = min(h['ys'])
    lo = dark(fill, .14) if not r.winter else mix(fill, '#8796c6', .22)
    d = hill_path(key)
    r.add(f'<defs><linearGradient id="vhg-{key}" x1="0" x2="0" gradientUnits="userSpaceOnUse" y1="{top - 12}" y2="{top + 150}">'
          f'<stop offset="0" stop-color="{light(fill, .14)}" class="hg0"/><stop offset="1" stop-color="{lo}" class="hg1"/></linearGradient>'
          f'<clipPath id="vhc-{key}"><path d="{d}"/></clipPath></defs>')
    crest = SAMPLES[key]
    if key != 'A':
        band = [(x, y - 13) for x, y in crest] + [(x, y + 1) for x, y in crest[::-1]]
        r.add(f'<path d="{D(band[::2])}" fill="url(#vhAO)"/>')
        r.add(f'<path d="{D(band[::2])}" fill="url(#vhH)" opacity=".12"/>')
    r.add(f'<path class="hill" d="{d}" fill="url(#vhg-{key})"/>')
    r.add(f'<path d="{smooth(h["xs"], h["ys"])}" class="kn" stroke="{light(fill, .45)}" stroke-width="1.6" opacity=".7" transform="translate(0 1.4)"/>')
    r.line(crest[::2], h['ink'], op=.85)
    # grass (summer) or little drifts (winter) over the hill
    nxt = ORDER[ORDER.index(key) + 1] if key != 'F' else None
    rng = random.Random(ord(key))
    tf = []
    for i in range(26 if key != 'A' else 10):
        x = rng.uniform(4, W - 4)
        y0 = crest_at(key, x) + 9
        y1 = (crest_at(nxt, x) - 4) if nxt else BOTTOM - 70
        if y1 <= y0:
            continue
        y = rng.uniform(y0, y1)
        if r.winter:
            tf.append([(x - 2, y), (x + 2, y - .3)])
        else:
            for dx, dh in ((-1.5, 3), (0, 3.8), (1.6, 2.8)):
                tf.append([(x + dx, y), (x + dx * 1.3, y - dh)])
    r.lines(tf, .4, color=(P['snow_s'] if r.winter else dark(P['g3'], .35)), op=.65)
    r.add(f'<g clip-path="url(#vhc-{key})"><use href="#v-roads"/></g>')


def flowers_hill(r, key, n, seed):
    if r.winter:
        return
    P = r.P
    rng = random.Random(seed)
    nxt = ORDER[ORDER.index(key) + 1] if key != 'F' else None
    es = {P['white']: [], P['coat4']: [], P['lilac']: [], P['blue']: []}
    cols = list(es)
    for i in range(n):
        x = rng.uniform(6, W - 6)
        y0 = crest_at(key, x) + 12
        y1 = (crest_at(nxt, x) - 6) if nxt else BOTTOM - 80
        if y1 > y0:
            es[cols[i % 4]].append((x, rng.uniform(y0, y1), 1.2, 1.0))
    for c, e in es.items():
        r.dots(e, c, .2)


def haze(r, y0, y1, op):
    r.add(f'<rect x="-10" y="{y0}" width="{W + 20}" height="{y1 - y0}" fill="url(#vhHz)" opacity="{op}"/>')


# ---------------------------------------------------------------- the far fields (hill A)
def far_fields(r):
    """Patchwork on the far slope: rows of fields sharing their borders, widening a little toward the viewer,
    a shelter belt along one border, haystacks and grazing cows."""
    P = r.P
    w = r.winter
    offs = [6, 16, 29, 47]

    def hb(k, x):
        return crest_at('A', x) + offs[k] + 1.1 * math.sin(x * .045 + k * 1.7)

    def bx(x, k):
        return x + (x - 180) * .07 * k

    rows = [[-30, 26, 78, 124, 172, 230, 280, 334, 400],
            [-30, 14, 64, 118, 160, 212, 266, 318, 400],
            [-30, 40, 98, 150, 206, 258, 304, 400]]
    crops = ['wheat', 'meadow', 'fallow', 'young', 'stubble', 'sun', 'meadow', 'wheat', 'young', 'fallow', 'stubble', 'meadow', 'wheat', 'sun', 'young', 'fallow', 'wheat', 'meadow', 'stubble', 'young', 'wheat', 'fallow', 'meadow', 'young']
    col = {'wheat': P['straw'], 'meadow': light(P['far2'], .1), 'fallow': P['soil_l'], 'young': light(P['leaf'], .18),
           'stubble': light(P['straw'], .3), 'sun': mix(P['coat4'], P['leaf'], .35)}
    ci = 0
    rows_lines = []
    for k, xs in enumerate(rows):
        for j in range(len(xs) - 1):
            xa, xb2 = xs[j], xs[j + 1]
            n = 8
            top = [(bx(xa + (xb2 - xa) * i / n, k), hb(k, bx(xa + (xb2 - xa) * i / n, k))) for i in range(n + 1)]
            bot = [(bx(xa + (xb2 - xa) * i / n, k + 1), hb(k + 1, bx(xa + (xb2 - xa) * i / n, k + 1))) for i in range(n, -1, -1)]
            crop = crops[ci % len(crops)]
            ci += 1
            if not w:
                fc = col[crop]
                cls = ' class="fld"' if crop in ('young', 'meadow') else ''
                r.add(f'<path d="{D(top + bot)}" fill="{fc}"{cls}/>')
                if crop in ('wheat', 'young', 'stubble', 'fallow'):
                    m = 5 if k < 2 else 7
                    rows_lines.append((dark(fc, .28), [[(top[i][0] + (bot[n - i][0] - top[i][0]) * q / m, top[i][1] + (bot[n - i][1] - top[i][1]) * q / m) for i in range(0, n + 1, 2)] for q in range(1, m)]))
                elif crop == 'sun':
                    rows_lines.append((dark(fc, .3), [[(top[0][0] + (top[n][0] - top[0][0]) * q / 9, top[0][1] + (top[n][1] - top[0][1]) * q / 9),
                                                       (bot[n][0] + (bot[0][0] - bot[n][0]) * q / 9, bot[n][1] + (bot[0][1] - bot[n][1]) * q / 9)] for q in range(1, 9)]))
            else:
                fc = mix(P['snow'], P['snow_s'], .08 + .1 * ((ci * 7) % 3) / 2)
                r.add(f'<path d="{D(top + bot)}" fill="{fc}"/>')
                if crop in ('stubble', 'fallow', 'wheat'):
                    rows_lines.append((P['snow_s'], [[(top[i][0] + (bot[n - i][0] - top[i][0]) * q / 5, top[i][1] + (bot[n - i][1] - top[i][1]) * q / 5) for i in range(0, n + 1, 2)] for q in range(1, 5)]))
    for c, ls in rows_lines:
        r.lines(ls, .3 if not w else .4, color=c, op=.55)
    bc = P['ink'] if not w else P['snow_s']
    r.lines([[(x, hb(k, x)) for x in range(-6, W + 7, 8)] for k in range(1, 4)], .4, color=bc, op=.45 if not w else .8)
    r.lines([[(bx(x, k), hb(k, bx(x, k))), (bx(x, k + 1), hb(k + 1, bx(x, k + 1)))] for k, xs in enumerate(rows) for x in xs[1:-1]], .35, color=bc, op=.4 if not w else .7)
    # a shelter belt along the second border, with gaps
    rng = random.Random(9)
    back, front, hi, stems = [], [], [], []
    for x in list(range(-4, 128, 5)) + list(range(236, 366, 5)):
        if rng.random() < .12:
            continue
        y = hb(1, x)
        hh = rng.uniform(4.5, 6.5)
        if not w:
            back.append((x + .8, y - hh * .55 + .6, hh * .62, hh * .55))
            front.append((x, y - hh * .6, hh * .58, hh * .52))
            hi.append((x - hh * .2, y - hh * .78, hh * .25, hh * .2))
        else:
            back.append((x, y - hh * .62, hh * .6, hh * .55))
            stems.append([(x, y), (x + .2, y - hh * .9)])
            for a in (-.7, .1, .8):
                stems.append([(x, y - hh * .45), (x + math.sin(a) * hh * .5, y - hh * .45 - math.cos(a) * hh * .5)])
    if not w:
        r.dots(back, P['leaf_d'])
        r.dots(front, P['forest'], .35, cls='lf2')
        r.dots(hi, light(P['leaf'], .1))
    else:
        r.dots(back, mix(P['logs_s'], P['snow_s'], .55), op=.45)
        r.lines(stems, .35, color=mix(P['logs_s'], P['ink'], .3), op=.75)
    H.haystack(r, 52, hb(2, 52) - 2, .5)
    H.haystack(r, 312, hb(2, 312) - 1, .45)
    if not w:
        H.cow(r, 196, hb(1, 196) + 9, .6)
        H.cow(r, 214, hb(1, 214) + 11, .55)


# ---------------------------------------------------------------- the six hills
def hill_A(r):
    P = r.P
    ground(r, 'A')
    far_fields(r)
    for x, hgt in ((112, 22), (124, 26), (276, 24), (290, 20)):
        birch(r, x, crest_at('A', x) + 74, hgt)
    pop(r, 'A', 'mill', 74, 240, lambda: Q.windmill(r, 0, 0, 1.0), 'Мельница на дальнем холме')
    for key, x, base, roof, frame in (('farhouse', 150, 236, 'tes', 'blue'), ('farhouse2', 198, 232, 'iron_r', 'white'), ('farhouse3', 246, 240, 'iron_g', 'green')):
        H.garden(r, [(x - 30, base - 26), (x - 2, base - 27), (x, base - 19), (x - 31, base - 18)], rows=3)
        pop(r, 'A', key, x, base, lambda roof=roof, frame=frame, x=x: (
            Q.izba_c(r, 0, 0, .36, roof=roof, frame=P[frame], porch=False, lit=r.winter, smoke_on=(x == 198) or None),
            H.palisade(r, -18, 18, 4, .4)), 'Дом на дальнем холме')
    pop(r, 'A', 'lot-tower', 306, 246, lambda: Q.lot(r, 0, 0, 40, 18), 'Участок на вырост')
    anchor('flock', 'A', 290, 182)
    haze(r, 96, 262, .32)


def hill_B(r):
    P = r.P
    ground(r, 'B')
    flowers_hill(r, 'B', 10, 2)
    apple(r, 20, 372, 34)
    birch(r, 102, 380, 40)
    spruce(r, 352, 356, 46)
    spruce(r, 338, 352, 30)
    h = pop(r, 'B', 'lot-school', 60, 392, lambda: Q.lot(r, 0, 0, 50, 22), 'Участок на вырост')
    h = pop(r, 'B', 'council', 186, 394, lambda: Q.council_c(r, 0, 0, 1.0, lit=r.winter), 'Сельсовет')
    anchor('bubble-council', 'B', 214, 394 - h - 2)
    birch(r, 258, 400, 38)
    h = pop(r, 'B', 'college', 312, 398, lambda: Q.college(r, 0, 0, .74, lit=r.winter), 'Агроколледж')
    anchor('bubble-college', 'B', 318, 398 - h - 4)
    lilac(r, 132, 404, 13)
    lilac(r, 244, 408, 12)
    if not r.winter:
        H.person(r, 112, 404, 1.0, coat=P['coat3'], kind='woman', scarf=P['white'])
        H.person(r, 120, 405, 1.0, coat=P['coat1'], kind='woman', scarf=P['coat4'])
        H.bicycle(r, 262, 410, .9)
    else:
        H.person(r, 116, 405, 1.0, coat=P['coat2'], kind='woman', scarf=P['coat4'])
    haze(r, 250, 420, .1)


def hill_C(r):
    P = r.P
    ground(r, 'C')
    flowers_hill(r, 'C', 12, 3)
    spruce(r, 16, 470, 44)
    birch(r, 148, 470, 46)
    apple(r, 214, 472, 40)
    H.garden(r, [(272, 470), (362, 466), (364, 494), (270, 498)], rows=4)
    H.garden(r, [(146, 508), (204, 506), (208, 532), (144, 534)], rows=4, crop='cabbage')
    H.palisade(r, 144, 210, 538, .5)
    h = pop(r, 'C', 'orphanage', 86, 542, lambda: Q.orphanage(r, 0, 0, .78, lit=r.winter), 'Интернат «Солнышко»')
    anchor('bubble-orphanage', 'C', 66, 542 - h - 2)
    pop(r, 'C', 'izba1', 250, 536, lambda: (Q.izba_c(r, 0, 0, .78, roof='tes', frame=P['blue'], lit=r.winter, smoke_on=True),
                                            H.palisade(r, -38, 40, 7, .5, gate=(14, 24))), 'Дом соседей')
    pop(r, 'C', 'izba2', 334, 548, lambda: (Q.izba_c(r, 0, 0, .7, roof='iron_r', frame=P['white'], shutters=True, lit=r.winter),
                                            H.palisade(r, -34, 34, 6, .46)), 'Дом соседей')
    if not r.winter:
        Q.chick(r, 206, 552, 1.0, 1, 0)
        Q.chick(r, 214, 555, 1.0, -1, .7)
        Q.chick(r, 222, 551, 1.0, 1, 1.4)
        H.goat(r, 132, 552, 1.0)
        H.yoke(r, 188, 540, 1.0)
    else:
        H.person(r, 186, 540, 1.0, coat=P['coat3'], kind='man', pose='walk')
    lilac(r, 150, 552, 14)


def hill_D(r):
    P = r.P
    ground(r, 'D')
    flowers_hill(r, 'D', 10, 4)
    apple(r, 150, 612, 46)
    birch(r, 222, 606, 50)
    birch(r, 22, 640, 54)
    birch(r, 344, 636, 50, lean=-.02)
    spruce(r, 364, 668, 58)
    h = pop(r, 'D', 'bakery', 58, 714, lambda: Q.bakery(r, 0, 0, .85, lit=r.winter), 'Пекарня «Колосок»')
    anchor('bubble-bakery', 'D', 44, 714 - h + 2)
    pop(r, 'D', 'board', 128, 692, lambda: Q.board_c(r, 0, 0, 1.35), 'Доска объявлений: заказы деревни')
    pop(r, 'D', 'well', 184, 698, lambda: Q.well_c(r, 0, 0, .95), 'Колодец')
    pop(r, 'D', 'palych', 236, 698, lambda: Q.palych(r, 0, 0, 1.5), 'Палыч на лавке')
    h = pop(r, 'D', 'restaurant', 312, 712, lambda: Q.restaurant(r, 0, 0, .8, lit=r.winter), 'Ресторан «Печь»')
    anchor('bubble-restaurant', 'D', 318, 712 - h - 2)
    if not r.winter:
        H.yoke(r, 158, 708, 1.1)
        H.bicycle(r, 98, 712, 1.0)
        Q.chick(r, 112, 722, 1.0, -1, .3)
        Q.chick(r, 120, 724, 1.0, 1, 1.1)
    else:
        H.person(r, 206, 708, 1.1, coat=P['coat2'], scarf=P['coat4'])
        H.sled(r, 112, 718, 1.0)
    pop(r, 'D', 'fair', 250, 722, lambda: Q.fair_stall(r, 0, 0, 1.1), 'Рынок')
    # a woman with a basket crosses the square and back
    stroll = r.capture(lambda: (H.person(r, 0, 0, 1.3, coat=P['coat2'], kind='woman', pose='walk', scarf=P['coat4']),
                                r.blob(4.6, -6.5, 2.6, 1.8, P['straw'], .4, n=8, wob=.04)))[0]
    r.add(f'<g class="stroll"><g class="stroll-face">{stroll}</g></g>')


def hill_E(r):
    P = r.P
    ground(r, 'E')
    flowers_hill(r, 'E', 14, 5)
    birch(r, 24, 782, 52)
    apple(r, 226, 770, 44)
    birch(r, 346, 774, 50)
    lilac(r, 300, 762, 15)
    H.garden(r, [(214, 786), (262, 784), (266, 808), (212, 810)], rows=4)
    if not r.winter:
        H.scarecrow(r, 240, 806, .9)
    pop(r, 'E', 'lot', 146, 790, lambda: Q.lot(r, 0, 0, 50, 24), 'Участок на вырост')
    pop(r, 'E', 'hay', 286, 800, lambda: H.haystack(r, 0, 0, 1.1), 'Стог')
    if not r.winter:
        Q.laundry(r, 108, 140, 846, 26)
    pop(r, 'E', 'izba3', 62, 860, lambda: (Q.izba_c(r, 0, 0, 1.0, roof='iron_g', frame=P['green'], shutters=False, lit=r.winter, smoke_on=True),
                                           H.palisade(r, -54, 58, 9, .75, gate=(34, 50))), 'Дом соседей')
    if not r.winter:
        Q.chick(r, 124, 870, 1.1, 1, .2)
        Q.chick(r, 132, 873, 1.1, -1, 1.0)
        H.dog(r, 150, 874, 1.0)
    else:
        H.snowman(r, 134, 872, 1.1)
        H.dog(r, 150, 874, 1.0)
    pop(r, 'E', 'signpost', 324, 852, lambda: Q.signpost(r, 0, 0, 1.0), 'Указатель: карта ферм')


def hill_F(r):
    P = r.P
    ground(r, 'F')
    flowers_hill(r, 'F', 16, 6)
    for i, x in enumerate([28, 88, 286, 334]):
        birch(r, x, crest_at('F', x) + 26, 50 + (i % 3) * 5)
    lilac(r, 150, 930, 16)
    lilac(r, 250, 934, 14)
    pop(r, 'F', 'meteo', 346, 976, lambda: Q.meteo(r, 0, 0, 1.05), 'Метеостанция', cond='meteo')
    H.woodpile(r, 14, 1062, 1.3)
    pop(r, 'F', 'house', 116, 1052, lambda: Q.homestead(r, 0, 0, 1.25, lit=r.winter), 'Ваша усадьба')
    pop(r, 'F', 'barn', 294, 1046, lambda: Q.barn(r, 0, 0, 1.05), 'Амбар')
    if not r.winter:
        Q.chick(r, 330, 1084, 1.25, 1, 0)
        Q.chick(r, 340, 1088, 1.25, -1, .8)
        Q.chick(r, 348, 1082, 1.25, 1, 1.5)
        H.cat(r, 182, 1060, 1.2)
    else:
        H.woodcutter(r, 56, 1070, 1.2)
    H.dog(r, 236, 1066, 1.1)
    pop(r, 'F', 'lab', 66, 1158, lambda: Q.lab(r, 0, 0, 1.0, lit=r.winter), 'Лаборатория', cond='lab')
    pop(r, 'F', 'lot-lab', 64, 1150, lambda: Q.lot(r, 0, 0, 46, 22), 'Место под лабораторию', cond='nolab')
    pop(r, 'F', 'hives', 298, 1118, lambda: Q.hives_c(r, 0, 0, 3), 'Пасека', cond='hives')
    # the neighbours' gifts in the front yard: each stands once the neighbour is a friend
    pop(r, 'F', 'g-council', 242, 1112, lambda: Q.honor_board(r, 0, 0, .9), 'Доска почёта: подарок сельсовета', cond='g-council')
    pop(r, 'F', 'g-restaurant', 152, 1130, lambda: Q.gazebo(r, 0, 0, .85), 'Беседка с самоваром: подарок ресторана', cond='g-restaurant')
    pop(r, 'F', 'g-bakery', 336, 1158, lambda: Q.oven(r, 0, 0, 1.15), 'Печь во дворе: подарок пекарни', cond='g-bakery')
    if not r.winter:
        H.flowers(r, 200, 232, 1128, 1136, 6)
        H.flowers(r, 90, 124, 1200, 1208, 6)
    else:
        H.sled(r, 236, 1178, 1.1)
        H.person(r, 230, 1176, 1.1, coat=P['coat1'], kind='kid', scarf=P['coat4'])
    pop(r, 'F', 'g-orphanage', 142, 1196, lambda: Q.swing(r, 0, 0, 1.2), 'Качели: подарок интерната', cond='g-orphanage')
    pop(r, 'F', 'g-college', 296, 1194, lambda: Q.desk(r, 0, 0, 1.0), 'Учебный стол: подарок колледжа', cond='g-college')
    # the fence with the gate down to the field; sunflowers along it; a bush the kids hide in
    H.palisade(r, -6, 368, 1216, .9, gate=(162, 200))
    pop(r, 'F', 'gate', 181, 1218, lambda: (r.add('<rect x="-22" y="-18" width="44" height="20" fill="#fff" fill-opacity="0"/>'), r.see([(-22, -18), (22, 2)])), 'Калитка: вниз, к полю', 'gate')
    lilac(r, 236, 1214, 15)
    anchor('kids', 'F', 236, 1210)
    if not r.winter:
        for x in (14, 50, 116, 262, 352):
            Q.sunflower(r, x, 1219, 22 + (x % 3) * 3)


# ---------------------------------------------------------------- the sky and the far forest
def cloud(r, cx, cy, sw):
    P = r.P
    base = '#ffffff' if not r.winter else '#cfd2e6'
    for k in range(5):
        dx = (k - 2) * 9 * sw
        dyy = -(5 if k in (1, 3) else (8 if k == 2 else 0)) * sw
        r.blob(cx + dx, cy + dyy, 9 * sw, 6.5 * sw, base, 0, n=12, wob=.06, ink=False, op=.92)
    r.add(f'<ellipse cx="{fmt(cx)}" cy="{fmt(cy + 4 * sw)}" rx="{fmt(24 * sw)}" ry="{fmt(3.2 * sw)}" fill="{P["glow"]}" opacity=".55"/>')
    r.add(f'<path d="M{fmt(cx - 26 * sw)} {fmt(cy + 3 * sw)}Q{fmt(cx - 18 * sw)} {fmt(cy - 9 * sw)} {fmt(cx - 6 * sw)} {fmt(cy - 9 * sw)}Q{fmt(cx)} {fmt(cy - 16 * sw)} {fmt(cx + 8 * sw)} {fmt(cy - 10 * sw)}" class="k" stroke-width=".5" opacity=".45"/>')


def far_crest(x):
    return 106 + 4 * math.sin(x / W * 2 * math.pi * .8 + .3) + 1.6 * math.sin(x / W * 2 * math.pi * 2.1 + .6) - .03 * (x - 180)


def sky_layer(r):
    P = r.P
    w = r.winter
    r.add(f'<rect width="{W}" height="{BOTTOM}" fill="url(#vhSky)"/>')
    sx, sy = (60, 92) if not w else (54, 98)
    r.add(f'<circle cx="{sx}" cy="{sy}" r="95" fill="url(#vhSun)"/>')
    r.add(f'<circle cx="{sx}" cy="{sy}" r="{12 if not w else 10}" fill="{P["sun"]}"/>')
    if w:
        r.add('<path d="M300 30a9 9 0 1 0 6 15a7 7 0 1 1-6-15Z" fill="#fbf3e2" opacity=".9"/>')
        r.add(''.join(f'<circle cx="{x}" cy="{y}" r=".8" fill="#fff" opacity=".8"/>' for x, y in [(250, 20), (330, 56), (205, 36), (282, 70), (160, 16), (120, 44)]))
    # clouds lit from below float to and fro; birds wheel in slow circles
    for i, (cx, cy, sw) in enumerate([(210, 46, 1.0), (316, 74, .8), (124, 30, .6), (30, 62, .5)]):
        svg = r.capture(lambda cx=cx, cy=cy, sw=sw: cloud(r, cx, cy, sw))[0]
        r.add(f'<g class="drift" style="animation-delay:{-i * 9}s;animation-duration:{38 + i * 7}s">{svg}</g>')
    if not w:
        r.add(''.join(f'<g transform="translate({x} {y})"><g class="wheel-bird" style="animation-delay:{-i * 2.1}s;animation-duration:{9 + i * 2}s">'
                      f'<path d="M-4 0q2-2 4 0q2-2 4 0" class="k" stroke-width=".55" opacity=".7"/></g></g>' for i, (x, y) in enumerate([(150, 66), (162, 60), (174, 68)])))
    # the far ridge with the edge of the forest; a water tower on it
    top = [(x, far_crest(x)) for x in range(-6, W + 7, 6)]
    r.add(f'<path d="{D(top + [(W + 6, 300), (-6, 300)])}" fill="{P["far1"]}"/>')
    trees = []
    rng = random.Random(4)
    for x in range(-6, W + 8, 5):
        if 104 < x < 236:
            continue
        hh = 10 + 6 * math.sin(x * .7) + rng.uniform(0, 4)
        y = far_crest(x) + 4
        trees.append(D([(x - 3.8, y), (x - 1.4, y - hh * .6), (x - 2.6, y - hh * .6), (x, y - hh), (x + 2.6, y - hh * .6), (x + 1.4, y - hh * .6), (x + 3.8, y)]))
    r.add(f'<path d="{"".join(trees)}" fill="{P["forest"]}" class="kf" stroke-width=".35" stroke-opacity=".5"/>')
    if w:
        caps = []
        rng = random.Random(4)
        for x in range(-6, W + 8, 5):
            if 104 < x < 236:
                continue
            hh = 10 + 6 * math.sin(x * .7) + rng.uniform(0, 4)
            y = far_crest(x) + 4
            caps.append(D([(x - 1.2, y - hh * .62), (x, y - hh + 1), (x + 1.2, y - hh * .62)]))
        r.add(f'<path d="{"".join(caps)}" fill="{P["snow"]}" opacity=".85"/>')
    r.line(top, .6, op=.6)
    H.water_tower(r, 312, far_crest(312) + 6, .9)


# ---------------------------------------------------------------- the whole village, one season
def defs(season):
    P = PAL[season]
    hc = P['ink'] if season == 'summer' else '#5b6a9a'
    return ''.join([
        f'<pattern id="vhH" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V3" stroke="{hc}" stroke-width=".5"/></pattern>',
        f'<pattern id="vhS" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="3" fill="{P["shade_tone"]}" opacity=".42"/><path d="M0 0V3" stroke="{hc}" stroke-width=".5"/></pattern>',
        f'<radialGradient id="vhG"><stop offset="0" stop-color="{P["win"]}" stop-opacity=".9"/><stop offset="1" stop-color="{P["win"]}" stop-opacity="0"/></radialGradient>',
        f'<linearGradient id="vhR" gradientUnits="userSpaceOnUse" x1="0" y1="360" x2="0" y2="1280"><stop offset="0" stop-color="{light(P["road"], .2)}"/><stop offset="1" stop-color="{P["road"]}"/></linearGradient>',
        f'<linearGradient id="vhSky" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="132"><stop offset="0" stop-color="{P["sky0"]}"/><stop offset=".55" stop-color="{P["sky1"]}"/><stop offset="1" stop-color="{P["sky2"]}"/></linearGradient>',
        f'<radialGradient id="vhSun"><stop offset="0" stop-color="{P["glow"]}" stop-opacity=".95"/><stop offset=".3" stop-color="{P["glow"]}" stop-opacity=".4"/><stop offset="1" stop-color="{P["glow"]}" stop-opacity="0"/></radialGradient>',
        f'<linearGradient id="vhHz" x1="0" y1="0" x2="0" y2="1"><stop offset=".2" stop-color="{P["haze"]}" stop-opacity=".85"/><stop offset="1" stop-color="{P["haze"]}" stop-opacity="0"/></linearGradient>',
        f'<linearGradient id="vhAO" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{P["ao"]}" stop-opacity="0"/><stop offset="1" stop-color="{P["ao"]}" stop-opacity=".2"/></linearGradient>',
    ])


def layers(season='summer'):
    if season == 'summer':
        POPS.clear()
    out = []
    r = Hy(season, seed=11)
    sky_layer(r)
    out.append(('sky', 0.0, ''.join(r.out)))
    for k, fn in (('A', hill_A), ('B', hill_B), ('C', hill_C), ('D', hill_D), ('E', hill_E), ('F', hill_F)):
        r.out = []
        fn(r)
        out.append((k, HILLS[k]['rate'], ''.join(r.out)))
    return out


def season_css():
    """Spring and autumn are the summer drawing recoloured: the hills' gradients and the leaves."""
    P = PAL['summer']
    o = []
    for k in ORDER:
        f = hill_fill(P, k)
        for sn, tint, t in (('0', '#b4d07c', .2), ('2', '#c9b062', .45)):
            g = mix(f, tint, t)
            o.append(f'.village.season-{sn} .v-lay[data-k="{k}"] .hg0{{stop-color:{light(g, .14)}}}'
                     f'.village.season-{sn} .v-lay[data-k="{k}"] .hg1{{stop-color:{dark(g, .14)}}}')
    o.append('.village.season-2 .lf{fill:#d9a845}.village.season-2 .lh{fill:#ecc965}.village.season-2 .lf2{fill:#a7823e}.village.season-2 .fld{fill:#d8c27c}')
    o.append('.village.season-0 .lf{fill:#9cc45e}.village.season-0 .lh{fill:#cfe58f}')
    return ''.join(o)


def cart_path():
    """The cart's way, from the council down to the gate, as points with the length run so far."""
    pts = roads5.sample(MAIN, 3)[::-1]
    pts = [p for p in pts if p[1] <= 1214]
    out, run = [], 0.0
    for i, p in enumerate(pts):
        if i:
            run += math.dist(p, pts[i - 1])
        out += [round(p[0], 1), round(p[1], 1), round(run, 1)]
    return out


def crests():
    return {k: [[round(x, 1), round(y, 1)] for x, y in SAMPLES[k][::4]] for k in ORDER}


# the ink classes the drawing uses; the game has them in village.css, the preview page carries its own copy
STYLE = ('.village{--vk:#3a2a1f}.village.season-3{--vk:#33283a}'
         '.village .k{fill:none;stroke:var(--vk);stroke-linecap:round;stroke-linejoin:round}'
         '.village .kn{fill:none;stroke-linecap:round;stroke-linejoin:round}'
         '.village .kf{stroke:var(--vk);stroke-linejoin:round}')
