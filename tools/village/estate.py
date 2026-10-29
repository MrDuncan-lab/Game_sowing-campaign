"""The estate: the player's house as one big picture for the House screen, drawn from the same kit and the same
homestead() as the village (pieces.py), only larger. Written into src/art/village/estate.ts:

    python3 estate.py            # rewrite src/art/village/estate.ts and preview-estate.html (export.py runs it too)

The scene is 360 x 210 (ES_VIEW). Parts are separate strings, so the game stacks them: `back` (the evening sky, the
far hills, two birches, the ground and the path), one of `houses` (levels 1..5), the yard `items` the farm owns,
`front` (the near grass and low pole fences at the corners). Items stand left and right of the yard the house takes
at its widest (level 5), so nothing ever covers the house. Every gradient and pattern is in `defs`, with ids starting
`es-`, so the picture can share a page with the village. Ink is the village's: classes k, kf, kn coloured by --vk.
"""
import json, math, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import hy as H
import pieces as Q
import neigh as NB
import villageg as G
from hy import Hy, PAL, D, SD, fmt, mix, dark, light

OUT = os.path.join(HERE, '..', '..', 'src', 'art', 'village', 'estate.ts')
W, HH = 360, 210
VIEW = f'0 0 {W} {HH}'
# the house: its centre x, the ground line it stands on, its scale (the village draws it at 1.25 on a 362 wide view)
HX, HY, HS = 208, 163, 1.45
CREST = 138               # the near ground's crest behind the house
ITEMS = ('hive', 'greenhouse', 'scarecrow', 'barrel', 'meteo', 'compost', 'antonovka')


def crest(x):
    return CREST + 3.2 * math.sin(x * .021 + .8) + 1.6 * math.sin(x * .057 + 2.1) - .02 * (x - 180)


def far_crest(x):
    return 112 + 3 * math.sin(x / W * 2 * math.pi * .9 + .4) + 1.4 * math.sin(x / W * 2 * math.pi * 2.3 + .2) + .02 * (x - 180)


def mid_crest(x):
    return 126 + 2.4 * math.sin(x * .03 + 1.7) + 1.2 * math.sin(x * .09)


# ---------------------------------------------------------------- the surroundings
def poplar(r, x, y, h):
    """a Kuban poplar: a tall narrow crown on a short pale trunk"""
    P = r.P
    r.shadow([(x - 3, y), (x + h * .3, y - 1), (x + h * .36, y + 3), (x, y + 4)], .6)
    r.shape([(x - 1.4, y), (x + 1.4, y), (x + 1, y - h * .3), (x - 1, y - h * .3)], P['birch'], .5)
    if r.winter:
        r.lines([[(x, y - h * .3), (x + (k - 2) * 2.4, y - h * (.55 + .1 * (k % 3)))] for k in range(5)] + [[(x, y - h * .3), (x, y - h)]], .6, color=P['logs_s'])
        return
    r.blob(x + .6, y - h * .64, h * .13, h * .38, P['leaf_d'], 0, n=12, ink=False)
    r.blob(x, y - h * .65, h * .12, h * .37, P['leaf'], .6, n=12, bumps=6, cls='lf')
    r.blob(x - h * .03, y - h * .76, h * .05, h * .16, P['leaf_h'], 0, n=8, ink=False, cls='lh')


def hata(r, cx, y, s=1.0):
    """a whitewashed Kuban house (хата) with a thatched or red roof, far off"""
    P = r.P
    w, h = 22 * s, 11 * s
    x = cx - w / 2
    Q.quad(r, x, y - h, x + w, y, '#f4efe2', .5 * s)
    r.shape([(x - 3 * s, y - h), (cx, y - h - 9 * s), (x + w + 3 * s, y - h)], '#c9a04a' if int(cx) % 2 else P['iron_r'], .5 * s)
    for k in (.3, .7):
        Q.quad(r, x + w * k - 2 * s, y - h * .7, x + w * k + 2 * s, y - h * .3, P['blue'], .3 * s)


def _kuban_far(r):
    """the steppe: a low flat horizon, a grain elevator and a stanitsa far off, rows of poplars, sunflower and
    melon strips, a river with reeds"""
    P = r.P
    w = r.winter
    flat = lambda x: 118 + 1.6 * math.sin(x * .02 + .4)
    top = [(x, flat(x)) for x in range(-6, W + 7, 6)]
    r.add(f'<path d="{D(top + [(W + 6, 220), (-6, 220)])}" fill="{P["far1"]}" class="es-far1"/>')
    r.line(top, .55, op=.55)
    # the elevator: tall pale towers
    ex = 120
    for k in range(3):
        Q.quad(r, ex + k * 5, flat(ex) - 22, ex + k * 5 + 4.4, flat(ex) + 1, mix(P['far2'], P['white'], .5), .35, iop=.6)
    Q.quad(r, ex - 2, flat(ex) - 28, ex + 4, flat(ex) - 20, mix(P['far2'], P['white'], .4), .35)
    # poplar rows along the horizon
    for x0, x1 in ((-6, 60), (170, 230), (300, 366)):
        for x in range(x0, x1, 7):
            hh = 14 + 3 * math.sin(x * 1.3)
            r.blob(x, flat(x) - hh * .55, 2.4, hh * .5, P['forest'], .3, n=8, ink=not w, cls='es-forest')
    mid = [(x, mid_crest(x) + 2) for x in range(-6, W + 7, 6)]
    r.add(f'<path d="{D(mid + [(W + 6, 220), (-6, 220)])}" fill="{P["far2"]}" class="es-far2"/>')
    if not w:
        strips = [(-6, 60, '#e7c34a'), (60, 120, light(P['leaf'], .18)), (120, 186, '#d9c46a'), (186, 250, light(P['leaf'], .05)), (250, 366, '#e7c34a')]
        for x0, x1, c in strips:
            pts = [(x, mid_crest(x) + 2) for x in range(x0, x1 + 1, 6)] + [(x1, mid_crest(x1) + 10), (x0, mid_crest(x0) + 10)]
            r.add(f'<path d="{D(pts)}" fill="{c}" opacity=".85" class="es-strip"/>')
        # sunflower heads in the yellow strips, striped melons in the green one
        r.dots([(x, mid_crest(x) + 4 + (k % 2) * 3, .9, .9) for k, x in enumerate(range(-4, 58, 4))] + [(x, mid_crest(x) + 4 + (k % 2) * 3, .9, .9) for k, x in enumerate(range(252, 364, 4))], '#6b4a1f')
        r.dots([(x, mid_crest(x) + 6 + (k % 2) * 2, 1.6, 1.1) for k, x in enumerate(range(190, 248, 7))], '#3f7a3a', .25)
    r.line(mid, .5, op=.5)
    # a river with reeds at the foot of the slope
    river = [(x, mid_crest(x) + 11 + 1.2 * math.sin(x * .05)) for x in range(-6, W + 7, 8)]
    r.add(f'<path d="{D([(x, y - 1.6) for x, y in river] + [(x, y + 1.6) for x, y in river[::-1]])}" fill="{P["water"] if not w else P["snow_s"]}" opacity=".85"/>')
    if not w:
        r.lines([[(x, y - 1), (x + (k % 3 - 1) * .8, y - 5)] for k, (x, y) in enumerate(river[1::2])], .5, color=dark(P['straw'], .25))
    for x in (292, 316, 340):
        hata(r, x, mid_crest(x) + 7, .5)


def _altai_far(r):
    """the mountains: snowy peaks far off, ridges of cedar forest nearer, a river in the valley, rocks"""
    P = r.P
    w = r.winter
    peaks = [(-6, 96), (30, 62), (64, 84), (104, 48), (150, 80), (190, 58), (232, 86), (276, 52), (318, 78), (366, 60)]
    pts = H.catmull(peaks, 4)
    far = mix(P['far1'], '#9fb2c8', .55)
    r.add(f'<path d="{D(pts + [(W + 6, 220), (-6, 220)])}" fill="{far}" class="es-far1"/>')
    r.line(pts, .5, op=.5)
    caps = []
    for (x, y) in peaks[1:-1]:
        caps.append(D([(x - 9, y + 12), (x - 4, y + 7), (x, y), (x + 4, y + 7), (x + 10, y + 12), (x + 4, y + 10), (x, y + 13), (x - 4, y + 10)]))
    r.add(f'<path d="{"".join(caps)}" fill="#f6f8fb" opacity=".95"/>')
    ridge = [(x, 108 + 6 * math.sin(x * .03 + 1) + 3 * math.sin(x * .09)) for x in range(-6, W + 7, 6)]
    r.add(f'<path d="{D(ridge + [(W + 6, 220), (-6, 220)])}" fill="{mix(P["far1"], P["forest"], .35)}" class="es-far1"/>')
    trees = []
    for x in range(-6, W + 8, 4):
        hh = 10 + 4 * math.sin(x * .9) + 2 * math.sin(x * 2.1)
        y = 108 + 6 * math.sin(x * .03 + 1) + 3 * math.sin(x * .09) + 5
        trees.append(D([(x - 3, y), (x - 1, y - hh * .55), (x - 2, y - hh * .55), (x, y - hh), (x + 2, y - hh * .55), (x + 1, y - hh * .55), (x + 3, y)]))
    r.add(f'<path d="{"".join(trees)}" fill="{P["spruce"]}" class="kf es-forest" stroke-width=".35" stroke-opacity=".5"/>')
    mid = [(x, mid_crest(x)) for x in range(-6, W + 7, 6)]
    r.add(f'<path d="{D(mid + [(W + 6, 220), (-6, 220)])}" fill="{P["far2"]}" class="es-far2"/>')
    r.line(mid, .5, op=.5)
    river = [(x, mid_crest(x) + 7 + 1.6 * math.sin(x * .04)) for x in range(-6, W + 7, 8)]
    r.add(f'<path d="{D([(x, y - 2) for x, y in river] + [(x, y + 2) for x, y in river[::-1]])}" fill="{mix(P["water"], "#7fc4d9", .4) if not w else P["snow_s"]}" opacity=".9"/>')
    if not w:
        r.lines([[(x - 3, y - .4), (x + 3, y - .6)] for x, y in river[2::3]], .5, color='#e6f3fb')
    r.dots([(x, mid_crest(x) + 12, 3 + (k % 3), 1.8 + (k % 2)) for k, x in enumerate((24, 70, 128, 240, 300, 344))], mix(P['grey_s'], P['plaster'], .3), .35)


FAR = {}


def back(r, region='chernozem'):
    P = r.P
    w = r.winter
    r.add(f'<rect width="{W}" height="{HH}" fill="url(#es-sky)"/>')
    sx, sy = (60, 96) if not w else (54, 100)
    r.add(f'<circle cx="{sx}" cy="{sy}" r="80" fill="url(#es-sun)"/>')
    r.add(f'<circle cx="{sx}" cy="{sy}" r="{10 if not w else 8.4}" fill="{P["sun"]}"/>')
    if w:
        r.add('<path d="M300 26a8 8 0 1 0 5.4 13.4a6.2 6.2 0 1 1-5.4-13.4Z" fill="#fbf3e2" opacity=".9"/>')
        r.add(''.join(f'<circle cx="{x}" cy="{y}" r=".8" fill="#fff" opacity=".8"/>' for x, y in [(250, 18), (332, 52), (206, 34), (282, 62), (160, 14), (126, 40), (346, 20)]))
    for cx, cy, sw in ((196, 40, .9), (318, 70, .7), (118, 24, .55)):
        G.cloud(r, cx, cy, sw)
    if not w:
        r.add(''.join(f'<path d="M{x - 4} {y}q2-2 4 0q2-2 4 0" class="k" stroke-width=".55" opacity=".7"/>' for x, y in ((150, 62), (162, 56), (174, 64))))
    FAR[region](r)
    r.add(f'<rect x="-6" y="96" width="{W + 12}" height="50" fill="url(#es-haze)" opacity=".38"/>')
    # the near ground: lit at its crest, deeper toward the foot, an ink line and a sunlit rim along the crest
    near = [(x, crest(x)) for x in range(-6, W + 7, 6)]
    band = [(x, y - 11) for x, y in near] + [(x, y + 1) for x, y in near[::-1]]
    r.add(f'<path d="{D(band[::2])}" fill="url(#es-ao)"/>')
    r.add(f'<path d="{D(near + [(W + 6, 220), (-6, 220)])}" fill="url(#es-ground)"/>')
    r.add(f'<path d="{D(near, False)}" class="kn" stroke="{light(G.hill_fill(P, "F"), .45)}" stroke-width="1.6" opacity=".7" transform="translate(0 1.4)"/>')
    r.line(near[::2], 1.0, op=.85)
    # two trees: at home a tall birch at the left edge and a smaller one behind the house on the right; on the
    # Kuban poplars and an apricot, in the Altai a cedar and a larch
    if region == 'kuban':
        r.group(lambda: poplar(r, 0, 0, 96), 14, 152, 'es-tree')
        r.group(lambda: H.apple(r, 0, 0, 40), 272, 140, 'es-tree')
    elif region == 'altai':
        r.group(lambda: H.spruce(r, 0, 0, 92), 16, 154, 'es-tree')
        r.group(lambda: H.spruce(r, 0, 0, 52), 274, 140, 'es-tree')
    else:
        birch_at(r, 14, 152, 92)
        birch_at(r, 272, 140, 54, lean=-.02)
    # the trodden path from the bottom edge up to the house: to the gate of the front garden, and along the front
    # to the porch at the right
    path = [(198, 214), (194, 203), (191, 192), (194, 180), (206, 171), (228, 166), (247, 163)]
    widths = [22, 19, 15, 12, 10, 9, 8]
    L, R = G.ribbon(H.catmull(path, 6), [widths[min(len(widths) - 1, int(i / 6))] for i in range(len(H.catmull(path, 6)))], .4, 7)
    poly = L + R[::-1]
    if not w:
        r.add(f'<path d="{D(poly)}" class="kn" stroke="{mix(P["g2"], P["road"], .5)}" stroke-width="4" opacity=".35"/>')
        r.add(f'<path d="{D(r.jit(poly, amp=.3, step=8))}" class="k" stroke-width="1" stroke-dasharray="9 5 3 7 14 6" opacity=".45"/>')
        r.add(f'<path d="{D(poly)}" fill="{light(P["road"], .1)}"/>')
        c = H.catmull(path, 6)
        r.lines([[(x - 2.4, y) for x, y in c[:-10]], [(x + 2.4, y) for x, y in c[:-10]]], .5, color=P['rut'], op=.5)
        tf = []
        for edge in (L, R):
            for i in range(2, len(edge), 3):
                x, y = edge[i]
                tf += [[(x - 1.2, y + .6), (x - 1.8, y - 2.6)], [(x, y + .6), (x + .2, y - 3.2)], [(x + 1.2, y + .6), (x + 2, y - 2.4)]]
        r.lines(tf, .5, color=dark(P['g3'], .3), op=.8)
    else:
        r.add(f'<path d="{D(poly)}" fill="{P["road"]}" opacity=".9"/>')
        r.add(f'<path d="{D(L, False)}{D(R, False)}" class="kn" stroke="#ffffff" stroke-width="2" opacity=".95"/>')
        c = H.catmull(path, 6)
        r.lines([[(x - 2.2, y) for x, y in c[:-8]], [(x + 2.2, y) for x, y in c[:-8]]], .5, color=P['rut'], op=.6)
    # grass, or little drifts, over the ground
    import random
    rng = random.Random(3)
    tf = []
    for i in range(46):
        x = rng.uniform(4, W - 4)
        y = rng.uniform(crest(x) + 8, HH - 6)
        if w:
            tf.append([(x - 2, y), (x + 2, y - .3)])
        else:
            tf += [[(x - 1.5, y), (x - 2, y - 3)], [(x, y), (x, y - 3.8)], [(x + 1.6, y), (x + 2.1, y - 2.8)]]
    r.lines(tf, .45, color=P['snow_s'] if w else dark(P['g3'], .35), op=.65)


def _home_far(r):
    P = r.P
    w = r.winter
    # the far ridge with the forest's edge, a water tower; the nearer slope with field strips and a far roofline
    top = [(x, far_crest(x)) for x in range(-6, W + 7, 6)]
    r.add(f'<path d="{D(top + [(W + 6, 220), (-6, 220)])}" fill="{P["far1"]}" class="es-far1"/>')
    trees = []
    for x in range(-6, W + 8, 5):
        if 96 < x < 226:
            continue
        hh = 9 + 5 * math.sin(x * .7) + 3 * math.sin(x * 1.9)
        y = far_crest(x) + 4
        trees.append(D([(x - 3.6, y), (x - 1.3, y - hh * .6), (x - 2.5, y - hh * .6), (x, y - hh), (x + 2.5, y - hh * .6), (x + 1.3, y - hh * .6), (x + 3.6, y)]))
    r.add(f'<path d="{"".join(trees)}" fill="{P["forest"]}" class="kf es-forest" stroke-width=".35" stroke-opacity=".5"/>')
    if w:
        caps = []
        for x in range(-6, W + 8, 5):
            if 96 < x < 226:
                continue
            hh = 9 + 5 * math.sin(x * .7) + 3 * math.sin(x * 1.9)
            y = far_crest(x) + 4
            caps.append(D([(x - 1.1, y - hh * .62), (x, y - hh + 1), (x + 1.1, y - hh * .62)]))
        r.add(f'<path d="{"".join(caps)}" fill="{P["snow"]}" opacity=".85"/>')
    r.line(top, .55, op=.55)
    H.water_tower(r, 150, far_crest(150) + 5, .7)
    mid = [(x, mid_crest(x)) for x in range(-6, W + 7, 6)]
    r.add(f'<path d="{D(mid + [(W + 6, 220), (-6, 220)])}" fill="{P["far2"]}" class="es-far2"/>')
    if not w:
        strips = [(-6, 40, P['straw']), (40, 92, light(P['leaf'], .18)), (92, 150, light(P['far2'], .12)), (150, 212, light(P['straw'], .3)), (212, 270, P['soil_l']), (270, 366, light(P['leaf'], .18))]
        for x0, x1, c in strips:
            pts = [(x, mid_crest(x) + 2) for x in range(x0, x1 + 1, 6)] + [(x1, mid_crest(x1) + 10), (x0, mid_crest(x0) + 10)]
            r.add(f'<path d="{D(pts)}" fill="{c}" opacity=".8" class="es-strip"/>')
    else:
        r.lines([[(x, mid_crest(x) + 2 + k * 2.6) for x in range(-6, W + 7, 12)] for k in range(1, 4)], .4, color=P['snow_s'], op=.6)
    r.line(mid, .5, op=.5)
    # a far roofline on the slope: the village beyond the farm, in the haze
    for x, roof, fr in ((292, 'tes', 'blue'), (318, 'iron_r', 'white'), (340, 'iron_g', 'green')):
        Q.izba_c(r, x, mid_crest(x) + 7, .2, roof=roof, frame=P[fr], porch=False, lit=w, chimney=False)


FAR.update(chernozem=_home_far, kuban=_kuban_far, altai=_altai_far)


def birch_at(r, x, y, h, lean=0.0):
    """A birch in a group of its own: autumn's season class turns its leaves gold (ES_SEASON_CSS)."""
    r.group(lambda: H.birch(r, 0, 0, h, lean), x, y, 'es-tree')


# ---------------------------------------------------------------- the things in the yard
def hive(r, x, y, k):
    """A beehive (улей): a painted plank box on a stand, a little gabled roof, the entrance slot, bees about."""
    P = r.P
    r.shadow([(x - 6 * k, y), (x + 14 * k, y - 1 * k), (x + 18 * k, y + 3 * k), (x - 4 * k, y + 3.4 * k)], .7)
    r.lines([[(x - 6 * k, y), (x - 5 * k, y - 5 * k)], [(x + 6 * k, y), (x + 5 * k, y - 5 * k)]], .9 * k)
    Q.quad(r, x - 7.6 * k, y - 6.4 * k, x + 7.6 * k, y - 4.8 * k, P['logs_s'], .5 * k)
    body = '#e7c25a' if not r.winter else '#d9b357'
    Q.quad(r, x - 7 * k, y - 18.4 * k, x + 7 * k, y - 6.4 * k, body, .7 * k)
    r.shape([(x + 7 * k, y - 6.4 * k), (x + 10 * k, y - 7.8 * k), (x + 10 * k, y - 19.8 * k), (x + 7 * k, y - 18.4 * k)], dark(body, .22), .55 * k, shade=True)
    r.lines([[(x - 7 * k, y - 12.4 * k), (x + 7 * k, y - 12.4 * k)]], .4 * k, op=.6)
    r.lines([[(x - 7 * k + 14 * k * i / 4, y - 6.6 * k), (x - 7 * k + 14 * k * i / 4, y - 12.2 * k)] for i in (1, 2, 3)] + [[(x - 7 * k + 14 * k * i / 4, y - 12.6 * k), (x - 7 * k + 14 * k * i / 4, y - 18.2 * k)] for i in (1, 2, 3)], .3 * k, op=.35)
    r.rim([(x - 7.4 * k, y - 7 * k), (x - 7.4 * k, y - 18 * k)], .7 * k)
    Q.quad(r, x - 3 * k, y - 9.2 * k, x + 3 * k, y - 8 * k, '#3a2a1f', .2 * k)
    Q.quad(r, x - 4.6 * k, y - 8 * k, x + 4.6 * k, y - 7.2 * k, P['logs'], .3 * k)
    roof = [(x - 9.4 * k, y - 18 * k), (x, y - 24.4 * k), (x + 9.4 * k, y - 18 * k)]
    r.shape([(x + 9.4 * k, y - 18 * k), (x + 12.4 * k, y - 19.4 * k), (x + 2.6 * k, y - 25.6 * k), (x, y - 24.4 * k)], P['tes_s'], .5 * k, shade=True)
    r.shape(roof, P['tes'], .7 * k)
    if r.winter:
        r.shape([(x - 9.6 * k, y - 18.4 * k), (x, y - 25 * k), (x + 2.6 * k, y - 26.2 * k), (x + 12.6 * k, y - 19.8 * k), (x + 6 * k, y - 20.6 * k), (x, y - 22 * k)], P['snow'], .45 * k)
    else:
        for i, (bx, by) in enumerate(((x + 9 * k, y - 26 * k), (x - 9 * k, y - 22 * k))):
            r.add(f'<g transform="translate({fmt(bx)} {fmt(by)})"><g class="bee" style="animation-delay:{-i * 1.1:.1f}s">'
                  f'<ellipse rx="{fmt(1.3 * k)}" ry="{fmt(1 * k)}" fill="#f2c94c" class="kf" stroke-width="{fmt(.3 * k)}"/>'
                  f'<path d="M{fmt(-.2 * k)} {fmt(-1 * k)}l{fmt(-.6 * k)} {fmt(-1.4 * k)}M{fmt(.4 * k)} {fmt(-1 * k)}l{fmt(.6 * k)} {fmt(-1.4 * k)}" class="kn" stroke="#ffffff" stroke-width="{fmt(.6 * k)}" opacity=".8"/></g></g>')
        r.see([(x - 11 * k, y - 28 * k), (x + 11 * k, y)])


def greenhouse(r, x, y, k):
    """A glass greenhouse: a white frame with a gable roof, the panes catching the sky, tomatoes and green rows
    inside; in winter it sleeps under snow, the glass frosted."""
    P = r.P
    w, hw, hr, dd = 34 * k, 13 * k, 9 * k, 12 * k
    x0, x1 = x - w / 2 - dd * .3, x + w / 2 - dd * .3
    dy = dd * .42
    glass, glass_s = ('#d9eef0', '#c2dfe2') if not r.winter else ('#e7eef6', '#d3dceb')
    r.shadow([(x1, y), (x1 + dd, y - dy), (x1 + dd + 22 * k, y - dy + 7 * k), (x1 + 14 * k, y + 6 * k), (x0 + 4 * k, y + 4 * k)], .7)
    Q.quad(r, x0 - 1 * k, y - 2.6 * k, x1 + 1 * k, y + .6 * k, P['brick'], .5 * k)
    r.shape([(x1 + 1 * k, y + .6 * k), (x1 + dd + 1 * k, y - dy + .6 * k), (x1 + dd + 1 * k, y - dy - 2.6 * k), (x1 + 1 * k, y - 2.6 * k)], P['brick_s'], .4 * k)
    by = y - 2.6 * k
    side = [(x1, by), (x1 + dd, by - dy), (x1 + dd, by - hw - dy), (x1, by - hw)]
    r.shape(side, glass_s, .6 * k, op=.92)
    rs = [(x1 + 1 * k, by - hw), (x0 + w / 2, by - hw - hr), (x0 + w / 2 + dd, by - hw - hr - dy), (x1 + 1 * k + dd, by - hw - dy)]
    r.shape(rs, glass, .6 * k, op=.92)
    fac = [(x0, by), (x1, by), (x1, by - hw), (x0 + w / 2, by - hw - hr), (x0, by - hw)]
    r.shape(fac, glass, .9 * k + .1, op=.9)
    if not r.winter:
        # inside: green rows with red tomatoes
        r.dots([(x0 + w * (i + .5) / 6, by - 3 * k - (i % 2) * 1.2 * k, 2.6 * k, 3.4 * k) for i in range(6)], P['leaf'], .3 * k, cls='lf', op=.95)
        r.dots([(x0 + w * (i + .5) / 6 + .8 * k, by - 4.6 * k - (i % 2) * 1.2 * k, .8 * k, .8 * k) for i in range(0, 6, 2)], P['apple'], .2 * k)
        r.dots([(x0 + w * (i + .5) / 6 - .6 * k, by - 7 * k, .7 * k, .7 * k) for i in range(1, 6, 2)], P['apple'], .2 * k)
    else:
        r.dots([(x0 + w * (i + .5) / 6, by - 1.6 * k, 2.6 * k, 1.2 * k) for i in range(6)], P['snow'], op=.8)
    # the frame: white glazing bars, the door in the middle
    fr = P['white']
    bars = [[(x0 + w * i / 6, by), (x0 + w * i / 6, by - hw - (hr * (1 - abs(i / 6 - .5) * 2)))] for i in range(1, 6)]
    bars += [[(x0, by - hw * .5), (x1, by - hw * .5)], [(x0, by - hw), (x1, by - hw)]]
    bars += [[(x1 + dd * i / 3, by - dy * i / 3), (x1 + dd * i / 3, by - hw - dy * i / 3)] for i in (1, 2)]
    bars += [[(rs[0][0] + (rs[1][0] - rs[0][0]) * t, rs[0][1] + (rs[1][1] - rs[0][1]) * t), (rs[0][0] + (rs[1][0] - rs[0][0]) * t + dd, rs[0][1] + (rs[1][1] - rs[0][1]) * t - dy)] for t in (.33, .66)]
    r.lines(bars, 1.4 * k, color=P['ink'], op=.55)
    r.lines(bars, .8 * k, color=fr)
    dx = x0 + w / 2
    Q.quad(r, dx - 3.4 * k, by - 10 * k, dx + 3.4 * k, by, mix(glass, fr, .3), .5 * k)
    r.line([(dx + 2 * k, by - 5 * k), (dx + 2 * k, by - 4.2 * k)], .7 * k, color=P['grey_s'], jitter=False)
    # the sky in the glass
    r.add(f'<path d="{D([(x0 + 1.6 * k, by - hw * .55), (x0 + 6 * k, by - hw - hr * .3), (x0 + 9 * k, by - hw - hr * .45), (x0 + 1.6 * k, by - 3 * k)])}" fill="#ffffff" opacity=".55"/>')
    r.rim([(x0 - .4, by - 1), (x0 - .4, by - hw)], .7 * k)
    if r.winter:
        r.shape([(x0 - 1 * k, by - hw - .5 * k), (x0 + w / 2, by - hw - hr - 1.2 * k), (x0 + w / 2 + dd, by - hw - hr - dy - 1.2 * k), (x1 + 2 * k + dd, by - hw - dy - .4 * k), (x1 + 6 * k, by - hw - 3 * k), (x0 + w / 2, by - hw - hr + 2.6 * k), (x0 + 4 * k, by - hw + .6 * k)], P['snow'], .5 * k)
        r.blob(x, y + .8, w * .62, 2.2 * k, P['snow'], .4 * k, n=12, wob=.06)


def scarecrow(r, x, y, k):
    """A scarecrow in a red shirt with straw at the cuffs, a hat and a face; a crow keeping its distance."""
    P = r.P
    r.shadow([(x - 3 * k, y), (x + 20 * k, y - 1 * k), (x + 24 * k, y + 3 * k), (x, y + 3.4 * k)], .6)
    r.line([(x, y + .5), (x, y - 30 * k)], 1.4 * k, color=P['logs_s'])
    r.line([(x, y + .5), (x, y - 30 * k)], .5 * k, color=P['logs'], jitter=False)
    r.line([(x - 13 * k, y - 22.4 * k), (x + 13 * k, y - 23.4 * k)], 1.2 * k, color=P['logs_s'])
    straw = P['straw']
    for sd in (-1, 1):
        r.lines([[(x + sd * 12.6 * k, y - 23 * k), (x + sd * 15.6 * k, y - (21.4 + d) * k)] for d in (-1.6, 0, 1.6)], .7 * k, color=dark(straw, .15))
    shirt = '#c0533c' if not r.winter else '#b04c38'
    r.shape([(x - 12 * k, y - 21 * k), (x - 12 * k, y - 25 * k), (x - 4 * k, y - 26 * k), (x + 4 * k, y - 26 * k), (x + 12 * k, y - 25.6 * k), (x + 12 * k, y - 21.6 * k), (x + 5 * k, y - 22 * k), (x + 6 * k, y - 11 * k), (x - 6 * k, y - 11 * k), (x - 5 * k, y - 22 * k)], shirt, .7 * k)
    r.lines([[(x - 4.6 * k, y - 17 * k), (x + 4.8 * k, y - 17.4 * k)], [(x - 5 * k, y - 13.6 * k), (x + 5.4 * k, y - 13.8 * k)], [(x - 1 * k, y - 25.6 * k), (x - .4 * k, y - 11.4 * k)]], .5 * k, color=dark(shirt, .3), op=.7)
    r.lines([[(x - 5 * k + i * 2.5 * k, y - 11 * k), (x - 5.6 * k + i * 2.6 * k, y - 8 * k)] for i in range(5)], .6 * k, color=dark(straw, .1))
    r.shape([(x - 2.4 * k, y - 26 * k), (x + 2.4 * k, y - 26 * k), (x, y - 23 * k)], light(shirt, .2), .3 * k)
    r.blob(x, y - 30 * k, 4.2 * k, 4.4 * k, '#efd79a', .6 * k, n=10, wob=.04)
    r.dots([(x - 1.5 * k, y - 30.6 * k, .5 * k, .6 * k), (x + 1.5 * k, y - 30.6 * k, .5 * k, .6 * k)], P['ink'])
    r.add(f'<path d="M{fmt(x - 1.8 * k)} {fmt(y - 28.4 * k)}q{fmt(1.8 * k)} {fmt(1.4 * k)} {fmt(3.6 * k)} 0" class="k" stroke-width="{fmt(.45 * k)}"/>')
    hat = mix(P['grey_s'], P['logs_s'], .4)
    r.shape([(x - 7.4 * k, y - 32.6 * k), (x + 7.4 * k, y - 33 * k), (x + 4.2 * k, y - 34 * k), (x + 3.6 * k, y - 38.4 * k), (x - 3.4 * k, y - 38.2 * k), (x - 4.2 * k, y - 34 * k)], hat, .6 * k)
    r.line([(x - 4 * k, y - 34.2 * k), (x + 4 * k, y - 34.4 * k)], .8 * k, color=P['accent'] if not r.winter else dark(P['accent'], .1), jitter=False)
    if r.winter:
        r.shape([(x - 3.8 * k, y - 38.6 * k), (x + 3.8 * k, y - 38.8 * k), (x + 3 * k, y - 40.4 * k), (x - 3 * k, y - 40.2 * k)], P['snow'], .3 * k)
        r.blob(x - 6 * k, y - 25.8 * k, 5 * k, 1 * k, P['snow'], .25 * k, n=7)
        r.blob(x + 6.4 * k, y - 26.2 * k, 5 * k, 1 * k, P['snow'], .25 * k, n=7)
    else:
        # a crow on the ground, at a respectful distance
        cx, cy = x + 16 * k, y - .4 * k
        r.blob(cx, cy - 2.4 * k, 3 * k, 1.9 * k, '#3a3640', .35 * k, n=8, rot=-.2)
        r.blob(cx - 2.8 * k, cy - 4 * k, 1.3 * k, 1.2 * k, '#3a3640', .3 * k, n=7)
        r.shape([(cx - 4 * k, cy - 4.2 * k), (cx - 5.6 * k, cy - 3.8 * k), (cx - 4 * k, cy - 3.4 * k)], '#e0a23a', .2 * k)
        r.lines([[(cx, cy - .8 * k), (cx - .4 * k, cy + .4 * k)], [(cx + 1 * k, cy - .8 * k), (cx + 1.2 * k, cy + .4 * k)]], .4 * k)


def barrel(r, x, y, k):
    """The rain barrel: oak staves with iron hoops, water to the brim, a watering can by it."""
    P = r.P
    r.shadow([(x - 6 * k, y), (x + 14 * k, y - 1 * k), (x + 18 * k, y + 3 * k), (x - 4 * k, y + 3.6 * k)], .7)
    staves = [(x - 8 * k, y), (x - 9.2 * k, y - 10 * k), (x - 8 * k, y - 20 * k), (x + 8 * k, y - 20 * k), (x + 9.2 * k, y - 10 * k), (x + 8 * k, y)]
    r.shape(staves, P['logs'], .9 * k)
    r.shape([(x, y), (x + 8 * k, y), (x + 9.2 * k, y - 10 * k), (x + 8 * k, y - 20 * k), (x, y - 20 * k)], P['logs_s'], 0, ink=False, shade=True, op=.6)
    r.lines([[(x + dx * k, y - 1 * k), (x + dx * 1.05 * k, y - 19 * k)] for dx in (-4.5, 0, 4.5)], .35 * k, op=.5)
    for yy in (-4.5, -15.5):
        r.line([(x - 9 * k, y + yy * k), (x + 9 * k, y + yy * k)], 1.5 * k, color=P['grey_s'], jitter=False)
        r.line([(x - 9 * k, y + (yy - .8) * k), (x + 9 * k, y + (yy - .8) * k)], .35 * k, op=.7, jitter=False)
    r.rim([(x - 8.6 * k, y - 2 * k), (x - 9.4 * k, y - 10 * k), (x - 8.4 * k, y - 18 * k)], .8 * k)
    if r.winter:
        r.blob(x, y - 20.6 * k, 8.8 * k, 2.6 * k, P['snow'], .5 * k, n=10, wob=.04)
    else:
        r.blob(x, y - 20 * k, 7.8 * k, 2.1 * k, P['water'], .5 * k, n=10, wob=.02)
        r.line([(x - 4 * k, y - 20.4 * k), (x, y - 21 * k)], .5 * k, color='#ffffff', op=.8, jitter=False)
        # the watering can, its spout to the right
        wx = x + 15 * k
        can = '#6f9a7f'
        r.shape([(wx - 4 * k, y), (wx + 4 * k, y), (wx + 3.6 * k, y - 7 * k), (wx - 3.6 * k, y - 7 * k)], can, .5 * k)
        r.lines([[(wx + 3.6 * k, y - 5.6 * k), (wx + 9 * k, y - 10 * k)]], .9 * k, color=dark(can, .3))
        r.shape([(wx + 9.6 * k, y - 11.4 * k), (wx + 7.6 * k, y - 9.4 * k), (wx + 9 * k, y - 8.6 * k), (wx + 10.6 * k, y - 10.4 * k)], can, .35 * k)
        r.add(f'<path d="M{fmt(wx - 2 * k)} {fmt(y - 7 * k)}Q{fmt(wx)} {fmt(y - 11 * k)} {fmt(wx + 2.4 * k)} {fmt(y - 7 * k)}" class="k" stroke-width="{fmt(.6 * k)}"/>')


def meteo(r, x, y, k):
    """The weather mast: a pole with the cup anemometer and the vane at the top, a little louvred box half way up,
    a rain gauge at its foot."""
    P = r.P
    r.shadow([(x - 4 * k, y), (x + 26 * k, y - 2 * k), (x + 30 * k, y + 3 * k), (x - 2 * k, y + 3.4 * k)], .6)
    r.lines([[(x - 6 * k, y), (x, y - 14 * k), (x + 6 * k, y)]], .6 * k)
    r.line([(x, y + .5), (x, y - 56 * k)], 1.1 * k, jitter=False)
    r.line([(x - .3 * k, y - 1), (x - .3 * k, y - 55 * k)], .4 * k, color='#fff4d6', op=.6, jitter=False)
    # the louvred box on an arm
    bx0, bx1, bt, bb = x + 1 * k, x + 11 * k, y - 34 * k, y - 25 * k
    r.line([(x, y - 27 * k), (bx0 + 1, y - 27 * k)], .7 * k, jitter=False)
    r.shape([(bx1, bb), (bx1 + 3.4 * k, bb - 1.4 * k), (bx1 + 3.4 * k, bt - 1.4 * k), (bx1, bt)], dark(P['white'], .2), .5 * k, shade=True)
    Q.quad(r, bx0, bt, bx1, bb, P['white'], .7 * k)
    r.lines([[(bx0 + .8, bt + (bb - bt) * i / 5), (bx1 - .8, bt + (bb - bt) * i / 5 + .8 * k)] for i in range(1, 5)], .3 * k, op=.6)
    r.shape([(bx0 - 1.2 * k, bt), (bx1 + 4.4 * k, bt - 1.8 * k), (bx1 + 2.6 * k, bt - 4 * k), (bx0, bt - 2.4 * k)], P['white'], .5 * k)
    if r.winter:
        r.shape([(bx0 - 1.2 * k, bt - .4 * k), (bx1 + 4.4 * k, bt - 2.2 * k), (bx1 + 2.6 * k, bt - 5 * k), (bx0, bt - 3.4 * k)], P['snow'], .35 * k)
    # the vane, the cups
    r.add(f'<g transform="translate({fmt(x)} {fmt(y - 49 * k)})"><path class="vane k" d="M{fmt(-7 * k)} 0H{fmt(7 * k)}M{fmt(4 * k)} {fmt(-2.2 * k)}L{fmt(7 * k)} 0L{fmt(4 * k)} {fmt(2.2 * k)}M{fmt(-7 * k)} 0l{fmt(2.4 * k)} {fmt(-3 * k)}M{fmt(-7 * k)} 0l{fmt(2.4 * k)} {fmt(3 * k)}" stroke-width="{fmt(.9 * k)}"/></g>')

    def cups():
        r.lines([[(-6 * k, 0), (6 * k, 0)], [(0, -6 * k), (0, 6 * k)]], .6 * k)
        r.dots([(6 * k, 0, 1.7 * k, 1.4 * k), (-6 * k, 0, 1.7 * k, 1.4 * k), (0, 6 * k, 1.7 * k, 1.4 * k), (0, -6 * k, 1.7 * k, 1.4 * k)], P['white'], .4 * k)
    r.group(cups, x, y - 57 * k, 'cups')
    r.see([(x - 9 * k, y - 64 * k), (x + 15 * k, y)])
    # the rain gauge
    gx = x - 9 * k
    Q.quad(r, gx - 2.2 * k, y - 9 * k, gx + 2.2 * k, y, P['grey'], .5 * k)
    r.ellipse(gx, y - 9 * k, 2.2 * k, .8 * k, dark(P['grey'], .3))
    if r.winter:
        r.blob(gx, y - 9.6 * k, 2.4 * k, .8 * k, P['snow'], .2 * k, n=6)


def compost(r, x, y, k):
    """The compost box: a slatted bin of boards with the dark heap showing over it, a fork stuck in."""
    P = r.P
    w, h, dd = 20 * k, 10 * k, 8 * k
    x0 = x - w / 2
    dy = dd * .42
    r.shadow([(x0 + w, y), (x0 + w + dd, y - dy), (x0 + w + dd + 14 * k, y - dy + 5 * k), (x0 + w + 8 * k, y + 4 * k), (x0 + 3 * k, y + 3 * k)], .6)
    # the heap first, behind the front boards
    heap = P['soil'] if not r.winter else P['snow']
    r.shape([(x0 + 1 * k, y - h + 1 * k), (x0 + 4 * k, y - h - 4 * k), (x0 + w * .5, y - h - 5.4 * k), (x0 + w - 2 * k, y - h - 3.6 * k), (x0 + w + dd - 1 * k, y - h - dy - 1 * k), (x0 + w, y - h + 1 * k)], heap, .6 * k, curve=True)
    if not r.winter:
        r.dots([(x0 + w * .3, y - h - 2.6 * k, 1.2 * k, .6 * k), (x0 + w * .7, y - h - 3 * k, 1.4 * k, .6 * k)], P['leaf_s'], cls='lf')
        r.dots([(x0 + w * .52, y - h - 3.8 * k, .9 * k, .5 * k)], '#e08a3a')
    side = [(x0 + w, y), (x0 + w + dd, y - dy), (x0 + w + dd, y - h - dy), (x0 + w, y - h)]
    r.shape(side, P['logs_s'], .6 * k, shade=True)
    Q.quad(r, x0, y - h, x0 + w, y, P['logs'], .8 * k)
    r.lines([[(x0 + .5, y - h * i / 3), (x0 + w - .5, y - h * i / 3)] for i in (1, 2)], .5 * k, color=dark(P['logs'], .4))
    r.lines([[(x0 + w, y - h * i / 3), (x0 + w + dd, y - h * i / 3 - dy)] for i in (1, 2)], .4 * k, op=.6)
    for px in (x0, x0 + w - 1.6 * k):
        Q.quad(r, px, y - h - 1.4 * k, px + 1.6 * k, y + .4 * k, P['logs_s'], .4 * k)
    r.rim([(x0 - .4, y - 1), (x0 - .4, y - h)], .6 * k)
    # the fork
    r.line([(x0 + w * .72, y - h - 3 * k), (x0 + w * .92, y - h - 17 * k)], .8 * k, color=P['logs_s'])
    r.lines([[(x0 + w * .72 + dx * k, y - h - 3 * k), (x0 + w * .72 + dx * k - .4 * k, y - h + .6 * k)] for dx in (-1.2, 0, 1.2)], .45 * k, color=P['grey_s'])
    if r.winter:
        r.blob(x0 + w / 2 + dd * .4, y - h - 1.6 * k, w * .56, 1.4 * k, P['snow'], .3 * k, n=9)


ITEM_AT = {   # where each thing stands: (x, ground y, scale); all clear of the house at every level
    'greenhouse': (44, 160, 1.3),
    'hive': (16, 192, 1.15),
    'compost': (52, 201, 1.15),
    'scarecrow': (303, 178, 1.1),
    'meteo': (340, 172, 1.15),
    'barrel': (319, 201, 1.05),
    'antonovka': (98, 200, 1.0),
}
ITEM_FN = {'hive': hive, 'greenhouse': greenhouse, 'scarecrow': scarecrow, 'barrel': barrel, 'meteo': meteo, 'compost': compost, 'antonovka': lambda r, x, y, k: NB.antonovka(r, x, y, k)}


def front(r):
    """The near edge: grass over the bottom (drifts in winter) and low pole fences at the corners."""
    P = r.P
    w = r.winter
    for x0, x1 in ((-4, 72), (288, 366)):
        posts = [(x0 + (x1 - x0) * i / 5, 208 - .6 * math.sin(i * 1.7)) for i in range(6)]
        r.lines([[(x, yy - 3.4) for x, yy in posts], [(x, yy - 6.8) for x, yy in posts]], 1.5, color=P['ink'])
        r.lines([[(x, yy - 3.4) for x, yy in posts], [(x, yy - 6.8) for x, yy in posts]], .8, color=light(P['grey'], .1))
        for x, yy in posts:
            Q.quad(r, x - 1.2, yy - 9.4, x + 1.2, yy + 2, P['grey_s'], .6)
            if w:
                r.blob(x, yy - 10, 1.6, .8, P['snow'], .2, n=6)
        if w:
            r.blob((x0 + x1) / 2, 210, (x1 - x0) * .55, 3, P['snow'], .4, n=12, wob=.06)
    if not w:
        tf = []
        for i in range(52):
            x = 2 + i * 6.9 + 2 * math.sin(i * 2.3)
            if 176 < x < 214:
                continue
            y = 209.5
            hh = 4 + 1.6 * math.sin(i * 1.3)
            tf += [[(x - 1.5, y), (x - 2.6, y - hh * .8)], [(x, y), (x + .3, y - hh)], [(x + 1.6, y), (x + 2.8, y - hh * .7)]]
        r.lines(tf, .55, color=dark(P['g4'], .3), op=.85)
        r.dots([(x, 205.6 + (i % 2), 1.2, 1.0) for i, x in enumerate((8, 31, 63, 96, 129, 151, 230, 262, 296, 318, 347))], P['white'], .2)
        r.dots([(x, 206.4, 1.1, .9) for x in (20, 82, 140, 248, 309, 336)], P['coat4'], .2)


# ---------------------------------------------------------------- the drawings
def es_ids(svg):
    return svg.replace('url(#vh', 'url(#es-vh')


def defs(season):
    P = PAL[season]
    base = G.defs(season)
    keep = ''.join(re.findall(r'<(?:pattern|radialGradient) id="vh[HSG]".*?</(?:pattern|radialGradient)>', base))
    keep = keep.replace('id="vh', 'id="es-vh')
    g = G.hill_fill(P, 'F')
    lo = dark(g, .14) if season != 'winter' else mix(g, '#8796c6', .22)
    return keep + ''.join([
        f'<linearGradient id="es-sky" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="{CREST}"><stop offset="0" stop-color="{P["sky0"]}"/><stop offset=".55" stop-color="{P["sky1"]}"/><stop offset="1" stop-color="{P["sky2"]}"/></linearGradient>',
        f'<radialGradient id="es-sun"><stop offset="0" stop-color="{P["glow"]}" stop-opacity=".95"/><stop offset=".3" stop-color="{P["glow"]}" stop-opacity=".4"/><stop offset="1" stop-color="{P["glow"]}" stop-opacity="0"/></radialGradient>',
        f'<linearGradient id="es-haze" x1="0" y1="0" x2="0" y2="1"><stop offset=".2" stop-color="{P["haze"]}" stop-opacity=".85"/><stop offset="1" stop-color="{P["haze"]}" stop-opacity="0"/></linearGradient>',
        f'<linearGradient id="es-ao" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{P["ao"]}" stop-opacity="0"/><stop offset="1" stop-color="{P["ao"]}" stop-opacity=".2"/></linearGradient>',
        f'<linearGradient id="es-ground" gradientUnits="userSpaceOnUse" x1="0" y1="{CREST - 8}" x2="0" y2="{HH + 10}"><stop offset="0" stop-color="{light(g, .14)}" class="es-g0"/><stop offset="1" stop-color="{lo}" class="es-g1"/></linearGradient>',
    ])


def tidy(svg):
    return G.flat_opacity(re.sub(r'>\s+<', '><', es_ids(svg)))


def drawing(season):
    """One season's estate: every part drawn with its own renderer, so changing one never moves another."""
    def part(fn, seed):
        r = Hy(season, seed=seed)
        fn(r)
        return tidy(''.join(r.out))
    houses = [part(lambda r, lv=lv: Q.homestead(r, HX, HY, HS, lit=r.winter, level=lv), 30 + lv) for lv in range(1, 8)]
    # the camp on an expedition (v3 §3.4): three levels in the same place as the house
    camps = [part(lambda r, lv=lv: Q.camp(r, HX, HY, HS, lit=r.winter, level=lv), 70 + lv) for lv in range(1, 4)]
    items = {k: part(lambda r, k=k: ITEM_FN[k](r, *ITEM_AT[k]), 50 + i) for i, k in enumerate(ITEMS)}
    # the house under construction, stages 1..3 (drawn over the house and the yard items, under the front)
    scaffold = [part(lambda r, st=st: Q.scaffold(r, HX, HY, HS, st), 60 + st) for st in (1, 2, 3)]
    # the backdrop by region: home (and Заречье) under birches; the Kuban steppe; the Altai mountains
    backs = {'kuban': part(lambda r: back(r, 'kuban'), 22), 'altai': part(lambda r: back(r, 'altai'), 23)}
    return dict(defs=tidy(defs(season)), back=part(back, 21), backs=backs, houses=houses, camps=camps, items=items, scaffold=scaffold, front=part(front, 41))


def boxes():
    """The drawn extent of every house level and every item (summer), to check that nothing meets."""
    out = {}
    for lv in range(1, 8):
        r = Hy('summer', seed=30 + lv)
        out[f'house{lv}'] = r.capture(lambda: Q.homestead(r, HX, HY, HS, lit=False, level=lv))[1]
    for k in ITEMS:
        r = Hy('summer', seed=50)
        out[k] = r.capture(lambda: ITEM_FN[k](r, *ITEM_AT[k]))[1]
    return out


def season_css():
    """Spring and autumn recolour the summer estate: the ground, the far slopes, the leaves of the trees and beds."""
    P = PAL['summer']
    g = G.hill_fill(P, 'F')
    o = []
    for sn, tint, t in (('0', '#b4d07c', .2), ('2', '#c9b062', .45)):
        gg = mix(g, tint, t)
        o.append(f'.estate-v.season-{sn} .es-g0{{stop-color:{light(gg, .14)}}}.estate-v.season-{sn} .es-g1{{stop-color:{dark(gg, .14)}}}'
                 f'.estate-v.season-{sn} .es-far2{{fill:{mix(P["far2"], tint, t)}}}.estate-v.season-{sn} .es-far1{{fill:{mix(P["far1"], tint, t * .6)}}}')
    leaf, leaf_h, leaf_s = P['leaf'], P['leaf_h'], P['leaf_s']
    o.append(f'.estate-v.season-2 .es-tree [fill="{leaf}"],.estate-v.season-2 .lf{{fill:#d9a845}}'
             f'.estate-v.season-2 .es-tree [fill="{leaf_h}"],.estate-v.season-2 .lh{{fill:#ecc965}}'
             f'.estate-v.season-2 .es-tree [fill="{leaf_s}"]{{fill:#b8832f}}.estate-v.season-2 .es-forest{{fill:#6f7a4e}}'
             f'.estate-v.season-2 .es-strip{{fill:#d8c27c}}')
    o.append(f'.estate-v.season-0 .es-tree [fill="{leaf}"],.estate-v.season-0 .lf{{fill:#9cc45e}}'
             f'.estate-v.season-0 .es-tree [fill="{leaf_h}"],.estate-v.season-0 .lh{{fill:#cfe58f}}')
    return ''.join(o)


def classes(dr):
    """The classes the drawing uses, for the game's CSS."""
    txt = dr['defs'] + dr['back'] + ''.join(dr['houses']) + ''.join(dr['camps']) + ''.join(dr['items'].values()) + ''.join(dr['scaffold']) + dr['front']
    cs = set()
    for m in re.findall(r'class="([^"]*)"', txt):
        cs.update(m.split())
    return sorted(cs)


# the ink and the moving parts, for the preview page (the game has its own copy in CSS)
STYLE = ('.estate-v{--vk:#3a2a1f}.estate-v.season-3{--vk:#33283a}'
         '.estate-v .k{fill:none;stroke:var(--vk);stroke-linecap:round;stroke-linejoin:round}'
         '.estate-v .kn{fill:none;stroke-linecap:round;stroke-linejoin:round}'
         '.estate-v .kf{stroke:var(--vk);stroke-linejoin:round}'
         '.estate-v .smoke .pf{fill:#f4efe6;stroke:#a79a86;stroke-width:.6;opacity:.85}'
         '.estate-v .smoke .pf1{transform:translate(4px,-9px)}.estate-v .smoke .pf2{transform:translate(8px,-19px)}')


def write(out=OUT, preview=True):
    dr = {'summer': drawing('summer'), 'winter': drawing('winter')}
    css = season_css()
    src = ['// The estate for the House screen: the player\'s house at its level in its yard, drawn by the same generator as',
           '// the village (tools/village, python3 estate.py or export.py): edit the generator, not this file.',
           '// Stack: back (or backs[region] on an expedition), one of houses (level 1..7) or camps (1..3), the items the farm owns, the scaffold while the house is being built',
           '// (stages 1..3), front. Ids in defs start with es-; ink',
           '// classes k, kf, kn want .estate-v { --vk } rules; spring and autumn recolour summer with ES_SEASON_CSS.',
           f'export const ES_VIEW = {json.dumps(VIEW)};',
           "export type ESItem = 'hive' | 'greenhouse' | 'scarecrow' | 'barrel' | 'meteo' | 'compost' | 'antonovka';",
           'export interface ESDrawing { defs: string; back: string; backs: { kuban: string; altai: string }; houses: string[]; camps: string[]; items: Record<ESItem, string>; scaffold: string[]; front: string }',
           f'export const ES_SUMMER: ESDrawing = {json.dumps(dr["summer"], ensure_ascii=False)};',
           f'export const ES_WINTER: ESDrawing = {json.dumps(dr["winter"], ensure_ascii=False)};',
           f'export const ES_SEASON_CSS = {json.dumps(css)};',
           '']
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'w', encoding='utf-8').write('\n'.join(src))
    if preview:
        cells = []
        for lv in range(7):
            for sn, d in (('season-1', dr['summer']), ('season-0', dr['summer']), ('season-2', dr['summer']), ('season-3', dr['winter'])):
                svg = (f'<svg viewBox="{VIEW}" width="360" height="210"><defs>{d["defs"]}</defs>{d["back"]}{d["houses"][lv]}'
                       f'{"".join(d["items"].values())}{d["front"]}</svg>')
                cells.append(f'<div class="estate-v {sn}" style="display:inline-block;margin:3px;line-height:0">{svg}</div>')
            cells.append('<br>')
        for lv in range(3):
            for sn, d in (('season-1', dr['summer']), ('season-3', dr['winter'])):
                svg = (f'<svg viewBox="{VIEW}" width="360" height="210"><defs>{d["defs"]}</defs>{d["backs"]["altai" if lv == 1 else "kuban"]}{d["camps"][lv]}'
                       f'{"".join(d["items"].values())}{d["front"]}</svg>')
                cells.append(f'<div class="estate-v {sn}" style="display:inline-block;margin:3px;line-height:0">{svg}</div>')
        cells.append('<br>')
        for lv in (0, 2, 4):
            for st in range(3):
                for sn, d in (('season-1', dr['summer']), ('season-3', dr['winter'])):
                    svg = (f'<svg viewBox="{VIEW}" width="360" height="210"><defs>{d["defs"]}</defs>{d["back"]}{d["houses"][lv]}'
                           f'{"".join(d["items"].values())}{d["scaffold"][st]}{d["front"]}</svg>')
                    cells.append(f'<div class="estate-v {sn}" style="display:inline-block;margin:3px;line-height:0">{svg}</div>')
            cells.append('<br>')
        html = (f'<!doctype html><meta charset="utf-8"><style>body{{margin:0;background:#888}}{STYLE}{css}</style>' + ''.join(cells))
        open(os.path.join(HERE, 'preview-estate.html'), 'w', encoding='utf-8').write(html)
    return dr


if __name__ == '__main__':
    dr = write()
    print('wrote', OUT, {s: len(json.dumps(d)) for s, d in dr.items()}, 'classes:', ' '.join(classes(dr['summer'])), '|', ' '.join(classes(dr['winter'])))
    for k, b in boxes().items():
        print(k, [round(v, 1) for v in b])
