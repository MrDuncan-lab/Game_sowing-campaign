"""The game's own buildings and props in the hybrid style (hy.py): what the concept corner did not have — the mill,
the college, the orphanage, the bakery, the restaurant, the barn, the lab, the met station, the neighbours' gifts.

Every piece here takes its CENTRE x and its base y, so villageg.py can stand it where the game expects it.
Moving parts carry the classes village.css animates: sails, cups, vane, flagw, sway, swing, fire, bubbling, bee,
nod, peck, wash.
"""
import math
from hy import (Hy, PAL, D, SD, fmt, mix, dark, light, catmull, roof_cap, window, izba, izba_long, shop, council,
                banya, smoke, birch, apple, spruce, lilac, palisade, well_crane, notice_board, bench, beehives, person,
                chicken, goat, cow, dog, cat, bicycle, sled, snowman, haystack, garden, scarecrow, woodpile, flowers,
                tufts, yoke, woodcutter)


# ---------------------------------------------------------------- the hybrid pieces by their centre
def izba_c(r, cx, y, s=1.0, **kw):
    izba(r, cx - 45 * s, y, s, **kw)


def izba_long_c(r, cx, y, s=1.0, **kw):
    izba_long(r, cx - 63 * s, y, s, **kw)


def well_c(r, cx, y, s=1.0):
    well_crane(r, cx - 12 * s, y, s)


def board_c(r, cx, y, s=1.0):
    notice_board(r, cx - 10 * s, y, s)
    # one notice pinned in rowan red: the village's orders are here
    r.blob(cx - 6.5 * s, y - 19.2 * s, .8 * s, .8 * s, r.P['accent'], .2, n=6, wob=.02)


def hives_c(r, cx, y, n=3):
    beehives(r, cx - (11 * n - 3) / 2, y, n)
    r.add(f'<circle class="bee" cx="{fmt(cx + 2)}" cy="{fmt(y - 16)}" r="1.1" fill="#f2c94c" stroke="{r.P["ink"]}" stroke-width=".35"/>')


# ---------------------------------------------------------------- small helpers for the customers' buildings
def quad(r, x0, y0, x1, y1, fill, w=.5, **kw):
    """An upright rectangle from its top-left (x0, y0) to its bottom-right (x1, y1)."""
    r.shape([(x0, y1), (x1, y1), (x1, y0), (x0, y0)], fill, w, **kw)


def sign_text(r, x, y, label, size, fill, width=None, weight=800):
    """Letters on a sign board, centred at x with the baseline at y; `width` fits them to that length whatever the
    font (the game sets its own)."""
    tl = f' textLength="{fmt(width)}" lengthAdjust="spacingAndGlyphs"' if width else ''
    r.add(f'<text x="{fmt(x)}" y="{fmt(y)}" text-anchor="middle" font-size="{fmt(size)}" font-weight="{weight}" fill="{fill}"{tl}>{label}</text>')
    hw = (width or size * .62 * len(label)) / 2
    r.see([(x - hw, y - size * .8), (x + hw, y + size * .2)])


def sash(r, wx, wy, ww, wh, s, lit, frame=None, cross=True, arch=False):
    """A plain sash window centred at (wx, wy): a frame, the glass, a cross of glazing bars, the sky in it by day and
    the lamp in it at dusk."""
    P = r.P
    frame = frame or P['white']
    f = 1.5 * s
    top = wy - wh / 2
    if arch:
        r.shape([(wx - ww / 2 - f, wy + wh / 2 + f)] + [(wx + math.cos(a) * (ww / 2 + f), top + ww * .1 - math.sin(a) * (ww / 2 + f) * .7) for a in [math.pi * (1 - k / 6) for k in range(7)]] + [(wx + ww / 2 + f, wy + wh / 2 + f)],
                frame, .5 * s + .1)
        glass = [(wx - ww / 2, wy + wh / 2)] + [(wx + math.cos(a) * ww / 2, top + ww * .1 - math.sin(a) * ww / 2 * .7) for a in [math.pi * (1 - k / 6) for k in range(7)]] + [(wx + ww / 2, wy + wh / 2)]
    else:
        quad(r, wx - ww / 2 - f, top - f, wx + ww / 2 + f, wy + wh / 2 + f, frame, .5 * s + .1)
        glass = [(wx - ww / 2, wy + wh / 2), (wx + ww / 2, wy + wh / 2), (wx + ww / 2, top), (wx - ww / 2, top)]
    r.shape(glass, P['win'] if lit else P['glass'], .45 * s + .05)
    if not lit:
        r.add(f'<path d="{D([(wx - ww / 2 + .4, top + .4), (wx + ww * .1, top + .4), (wx - ww / 2 + .4, wy + wh * .05)])}" fill="#fff" opacity=".45"/>')
    if cross:
        r.lines([[(wx, top), (wx, wy + wh / 2)], [(wx - ww / 2, wy - wh * .1), (wx + ww / 2, wy - wh * .1)]], .35 * s + .05, op=.8)
    if lit:
        r.ellipse(wx, wy, ww * 1.5, wh * 1.1, P['win'], op=.2, blur=True)


def side_wall(r, x, y, Hw, Dd, fill, s, lines=0):
    """The shaded side wall running back to the right of a facade whose right corner stands at (x, y)."""
    dy = Dd * .42
    r.shape([(x, y), (x + Dd, y - dy), (x + Dd, y - Hw - dy), (x, y - Hw)], fill, 1.0 * s + .2, shade=True)
    if lines:
        r.lines([[(x, y - Hw * i / lines), (x + Dd, y - Hw * i / lines - dy)] for i in range(1, lines)], .3 * s + .05, op=.4)


def hip_roof(r, x, y, Wb, Hw, Dd, Rf, inset, col, col_s, s, ov=4.0, seams=12):
    """A hipped iron roof over a facade from x to x + Wb at the eaves height y - Hw: its front slope with seams and
    the hip at the right going back into the picture. Returns the front slope's corners."""
    P = r.P
    dy = Dd * .42
    ov *= s
    front = [(x - ov, y - Hw + 1), (x + Wb + ov, y - Hw + 1), (x + Wb - inset, y - Hw - Rf), (x + inset, y - Hw - Rf)]
    hip = [(x + Wb + ov, y - Hw + 1), (x + Wb + ov + Dd, y - Hw - dy + 1), (x + Wb - inset + Dd * .5, y - Hw - Rf - dy * .5), (x + Wb - inset, y - Hw - Rf)]
    r.shape(hip, col_s, 1.0 * s + .2, shade=True)
    r.shape(front, col, 1.2 * s + .2)
    mid = x + Wb / 2
    r.lines([[(x - ov + (Wb + 2 * ov) * i / seams, y - Hw + 1), (x - ov + (Wb + 2 * ov) * i / seams + (mid - (x - ov + (Wb + 2 * ov) * i / seams)) * (2 * inset / Wb), y - Hw - Rf + 1)] for i in range(1, seams)],
            .3 * s + .1, color=dark(col, .38), op=.45)
    r.rim([front[0], front[3]], .9 * s)
    if r.winter:
        r.shape([(x - ov + 2, y - Hw - 2), (x + inset, y - Hw - Rf - 1.5), (x + Wb - inset, y - Hw - Rf - 1.5), (x + Wb + ov - 2, y - Hw - 2),
                 (x + Wb - inset * .8, y - Hw - Rf * .45), (x + Wb * .55, y - Hw - Rf * .35), (x + inset * 1.2, y - Hw - Rf * .5)], P['snow'], .8 * s)
        r.shape([(x + Wb - inset + .5, y - Hw - Rf - 1.2), (x + Wb - inset + Dd * .5, y - Hw - Rf - dy * .5 - 1), (x + Wb + ov + Dd - 2, y - Hw - dy - 1), (x + Wb + ov, y - Hw - 2), (x + Wb - inset * .7, y - Hw - Rf * .5)], P['snow'], .6 * s)
    return front


def chimney_box(r, cx, cy, w, h, s, col=None, cap=True):
    """A plain brick chimney standing on a roof at (cx, cy) (its foot), snow on its cap in winter."""
    P = r.P
    col = col or P['brick']
    quad(r, cx - w / 2, cy - h, cx + w / 2, cy, col, .7 * s)
    r.shape([(cx + w / 2, cy), (cx + w / 2 + w * .3, cy - w * .2), (cx + w / 2 + w * .3, cy - h - w * .2), (cx + w / 2, cy - h)], dark(col, .25), .5 * s, shade=True)
    if cap:
        quad(r, cx - w / 2 - .8 * s, cy - h - 1.6 * s, cx + w / 2 + w * .3 + .6 * s, cy - h, dark(col, .2), .5 * s)
    if r.winter:
        r.blob(cx + w * .15, cy - h - 2 * s, w * .7, 1.2 * s, P['snow'], .35 * s, n=8, wob=.04)


def tricolour(r, x, y, h, s=1.0, fw=17.0, fh=11.0):
    """A tall flagpole with the Russian flag, white, blue and red, waving (class flagw moves it as one cloth)."""
    P = r.P
    r.shadow([(x - 1.5 * s, y), (x + 16 * s, y - 1 * s), (x + 19 * s, y + 2.4 * s), (x, y + 2.6 * s)], .6)
    r.line([(x, y), (x, y - h)], 1.5 * s, jitter=False)
    r.line([(x - .35 * s, y - 1), (x - .35 * s, y - h + 1)], .5 * s, color='#fff4d6', op=.7, jitter=False)
    r.blob(x, y - h - 1.2 * s, 1.3 * s, 1.3 * s, '#e9b44c', .35 * s, n=7, wob=.02)
    n = 9
    top = [(fw * s * u, -1.6 * s * math.sin(math.pi * 2.1 * u) * (.25 + .75 * u)) for u in [k / (n - 1) for k in range(n)]]

    def edge(t):
        return [(px, py + t * fh * s * (1 - .1 * px / (fw * s))) for px, py in top]
    bands = []
    for k, col in enumerate(('#f8f6f0', '#2f5fae', '#cf3a2c')):
        e0, e1 = edge(k / 3), edge((k + 1) / 3)
        bands.append(f'<path d="{SD(e0, False)}L{SD(e1[::-1], False)[1:]}Z" fill="{col}"/>')
    e0, e1 = edge(0), edge(1)
    bands.append(f'<path d="{SD(e0, False)}L{SD(e1[::-1], False)[1:]}Z" class="k" stroke-width="{fmt(.55 * s)}"/>')
    bands.append(f'<path d="{SD([(px, py + fh * s * .5) for px, py in top][2:6], False)}" class="kn" stroke="#ffffff" stroke-width="{fmt(.5 * s)}" opacity=".35"/>')
    r.add(f'<g transform="translate({fmt(x + .5 * s)} {fmt(y - h + .6 * s)})"><g class="flagw">{"".join(bands)}</g></g>')
    r.see([(x - 1.5 * s, y - h - 3 * s), (x + fw * s + 1, y)])


def kid_book(r, x, y, s=1.0, coat=None, bag=None, f=1):
    """A student: a kid in a jacket with a book under the arm or a briefcase in hand."""
    P = r.P
    person(r, x, y, s, coat=coat or P['coat1'], kind='man')
    if bag:
        r.line([(x + f * 2.6 * s, y - 7 * s), (x + f * 3.4 * s, y - 4.6 * s)], .5 * s, jitter=False)
        quad(r, x + f * 2 * s - 2.2 * s, y - 4.8 * s, x + f * 2 * s + 2.4 * s, y - 1.2 * s, bag, .35 * s)
    else:
        r.shape([(x - f * 2.8 * s, y - 9.6 * s), (x - f * 4.6 * s, y - 9 * s), (x - f * 4.2 * s, y - 5.4 * s), (x - f * 2.4 * s, y - 6 * s)], P['accent'], .3 * s)


# ---------------------------------------------------------------- moving bits
def flag(r, x, y, h=14, s=1.0):
    r.line([(x, y), (x, y - h * s)], .9 * s)
    r.add(f'<g transform="translate({fmt(x)} {fmt(y - h * s + .5)})"><path class="flagw kf" d="{SD([(0, 0), (5 * s, -1.4 * s), (10 * s, .4 * s), (8 * s, 3 * s), (10 * s, 5.8 * s), (5 * s, 4.2 * s), (0, 6 * s)], False)}Z" fill="{r.P["accent"]}" stroke-width=".55"/></g>')
    r.see([(x, y - h * s - 1), (x + 10 * s, y)])


def sunflower(r, x, y, h):
    P = r.P
    r.line([(x, y), (x + .6, y - h)], .9, color=P['leaf_s'], jitter=False)
    r.blob(x - 3, y - h * .5, 3.2, 1.4, P['leaf'], .3, n=7, cls='lf')
    r.blob(x + 3, y - h * .32, 2.8, 1.2, P['leaf'], .3, n=7, cls='lf')

    def head():
        petals = [(math.cos(2 * math.pi * i / 10) * 3.6, math.sin(2 * math.pi * i / 10) * 3.4, 1.9, 1.9) for i in range(10)]
        r.dots(petals, P['coat4'], .25)
        r.blob(0, 0, 2.4, 2.4, P['soil'], .3, n=7, wob=.03)
    r.group(head, x + .6, y - h, 'nod', style=f'animation-delay:{-(x % 7) * .4:.1f}s')


def chick(r, x, y, s=1.0, f=1, delay=0.0):
    r.group(lambda: chicken(r, 0, 0, s, f), x, y, 'peck', style=f'animation-delay:{-delay:.1f}s')


def laundry(r, x0, x1, y, h):
    P = r.P
    r.line([(x0, y), (x0, y - h)], .7)
    r.line([(x1, y + 2), (x1, y - h + 2)], .7)
    r.add(f'<path d="M{fmt(x0)} {fmt(y - h + 1)}Q{fmt((x0 + x1) / 2)} {fmt(y - h + 6)} {fmt(x1)} {fmt(y - h + 3)}" class="k" stroke-width=".35"/>')
    cols = [P['white'], P['coat4'], P['blue'], P['white'], P['coat2']]
    for i in range(5):
        t = (i + .6) / 5.6
        lx = x0 + (x1 - x0) * t
        ly = y - h + 1 + 4.6 * 4 * t * (1 - t) + 2 * t
        r.group(lambda c=cols[i]: r.shape([(0, 0), (4.4, .3), (4.6, 7), (-.2, 6.6)], c, .3), lx, ly, 'wash', style=f'animation-delay:{-i * .5:.1f}s')


def smoke_top(r, x, y, s=1.0):
    smoke(r, x, y, s)


# ---------------------------------------------------------------- the mill on the far hill
def windmill(r, cx, y, s=1.0):
    """A post mill (столбовка): a plank body on a trestle, a tail pole to turn it, four lattice sails."""
    P = r.P
    r.shadow([(cx - 6 * s, y), (cx + 30 * s, y - 3 * s), (cx + 40 * s, y + 5 * s), (cx - 2 * s, y + 6 * s)], .8)
    for x0, x1, op in ((-6, -1, .7), (6, 1, .7), (-13, -3, 1), (13, 3, 1)):
        r.line([(cx + x0 * s, y), (cx + x1 * s, y - 17 * s)], 1.0 * s, op=op)
    r.shape([(cx - 1.8 * s, y - 13 * s), (cx + 1.8 * s, y - 13 * s), (cx + 1.8 * s, y - 22 * s), (cx - 1.8 * s, y - 22 * s)], P['logs_s'], .6 * s)
    # the tail pole goes down to the ground at the back
    tail = [(cx + 6 * s, y - 24 * s), (cx + 27 * s, y - 1 * s)]
    r.line(tail, 1.9 * s)
    r.line(tail, 1.0 * s, color=P['grey'], jitter=False)
    Wf, Hb, Dd = 22 * s, 26 * s, 12 * s
    dy = Dd * .42
    bx, by = cx - 11 * s, y - 20 * s
    r.shape([(bx + Wf, by), (bx + Wf + Dd, by - dy), (bx + Wf + Dd, by - Hb - dy), (bx + Wf, by - Hb)], P['grey_s'], .9 * s, shade=True)
    r.shape([(bx, by), (bx + Wf, by), (bx + Wf, by - Hb), (bx, by - Hb)], P['grey'], 1.0 * s + .1)
    r.lines([[(bx + Wf * i / 6, by - .5), (bx + Wf * i / 6, by - Hb + .5)] for i in range(1, 6)], .3 * s, op=.45)
    r.rim([(bx - .6, by - 1), (bx - .6, by - Hb)], .8 * s)
    rs = [(bx + Wf + 2 * s, by - Hb), (bx + Wf / 2, by - Hb - 13 * s), (bx + Wf / 2 + Dd, by - Hb - 13 * s - dy), (bx + Wf + 2 * s + Dd, by - Hb - dy)]
    r.shape(rs, P['tes_s'], .9 * s, shade=True)
    if r.winter:
        roof_cap(r, rs, s * .7)
    r.shape([(bx - 2 * s, by - Hb), (bx + Wf / 2, by - Hb - 13 * s), (bx + Wf + 2 * s, by - Hb)], P['grey'], .9 * s)
    # a door and the ladder from it
    r.shape([(bx + Wf * .58, by), (bx + Wf * .86, by), (bx + Wf * .86, by - 11 * s), (bx + Wf * .58, by - 11 * s)], P['logs_s'], .5 * s)
    lx0, lx1 = bx + Wf * .6, bx + Wf * .84
    r.lines([[(lx0, by), (lx0 + 7 * s, y)], [(lx1, by), (lx1 + 7 * s, y)]] + [[(lx0 + 7 * s * k / 5, by + 20 * s * k / 5), (lx1 + 7 * s * k / 5, by + 20 * s * k / 5)] for k in range(1, 5)], .45 * s)
    hx, hy = bx + Wf / 2, by - Hb + 2 * s

    def sails():
        R0, R1, wd = 6 * s, 31 * s, 6.4 * s
        for a in (20, 110, 200, 290):
            t = math.radians(a)
            ux, uy = math.cos(t), math.sin(t)
            nx, ny = -uy, ux
            p = lambda rr, ww: (ux * rr + nx * ww, uy * rr + ny * ww)
            r.shape([p(R0, 0), p(R1, 0), p(R1, wd), p(R0, wd)], light(P['white'], .1), .45 * s, op=.9)
            r.lines([[p(R0 + (R1 - R0) * k / 6, 0), p(R0 + (R1 - R0) * k / 6, wd)] for k in range(1, 6)] + [[p(R0, wd / 2), p(R1, wd / 2)]], .3 * s, op=.7)
            r.line([(0, 0), p(R1 + 2 * s, 0)], .9 * s, jitter=False)
        r.blob(0, 0, 2.2 * s, 2.2 * s, P['logs_s'], .5 * s, n=7, wob=.03)
    r.group(sails, hx, hy, 'sails')


# ---------------------------------------------------------------- public buildings
def council_c(r, cx, y, s=1.0, lit=False):
    """The village council (сельсовет): the one official building — a symmetric ochre facade with white trims under
    a hipped green roof, a portico of four columns with a pediment and a clock, the sign over the columns, the
    tricolour on the roof, a notice board by the steps. Returns the roof line's top for the order bubble."""
    P = r.P
    Wb, Hw, Dd, Rf = 104 * s, 31 * s, 18 * s, 15 * s
    dy = Dd * .42
    x = cx - Wb / 2
    mx = x + Wb / 2
    wall = '#e2c27c' if not r.winter else '#d9b977'
    wall_s = dark(wall, .24)
    trim = P['white']
    r.shadow([(x + Wb, y), (x + Wb + Dd, y - dy), (x + Wb + Dd + 40 * s, y - dy + 13 * s), (x + Wb + 26 * s, y + 11 * s), (x + 10 * s, y + 7 * s)])
    side_wall(r, x + Wb, y, Hw, Dd, wall_s, s)
    sash(r, x + Wb + Dd * .5, y - Hw * .52 - dy * .5, 6 * s, 11 * s, s * .8, lit, trim)
    # the facade: plinth, wall, a white cornice, white corner pilasters
    quad(r, x, y - Hw, x + Wb, y, wall, 1.2 * s + .2)
    quad(r, x, y - 5 * s, x + Wb, y, mix(P['grey'], wall, .3), .7 * s)
    r.lines([[(x + 1, y - 2.5 * s), (x + Wb - 1, y - 2.5 * s)]], .3 * s, op=.4)
    for px in (x, x + Wb - 3.4 * s):
        quad(r, px, y - Hw, px + 3.4 * s, y - 5 * s, trim, .45 * s)
    quad(r, x - 1.5 * s, y - Hw - 1 * s, x + Wb + 1.5 * s, y - Hw + 2.6 * s, trim, .6 * s)
    r.rim([(x - .8, y - 1), (x - .8, y - Hw)], .9 * s)
    # tall windows, two each side of the portico, white surrounds with a little cornice over each
    for k, wx in enumerate((x + Wb * .12, x + Wb * .27, x + Wb * .73, x + Wb * .88)):
        wy = y - 18 * s
        sash(r, wx, wy, 7.4 * s, 14 * s, s, lit, trim)
        quad(r, wx - 6 * s, wy - 10.6 * s, wx + 6 * s, wy - 8.6 * s, trim, .4 * s)
    # the roof, and the tricolour standing on its ridge behind the pediment
    hip_roof(r, x, y, Wb, Hw, Dd, Rf, 20 * s, P['iron_g'], P['iron_g_s'], s, ov=4, seams=13)
    tricolour(r, mx, y - Hw - Rf + 2 * s, 34 * s, s)
    # the portico: steps, four columns, the sign on the frieze, the pediment with the clock
    pw = 42 * s
    for k in range(3):
        quad(r, mx - pw / 2 - (5 - k * 1.6) * s, y - (k + 1) * 1.6 * s, mx + pw / 2 + (5 - k * 1.6) * s, y - k * 1.6 * s + (1.2 * s if k == 0 else 0), light(P['grey'], .1 * k), .5 * s)
    quad(r, mx - 7 * s, y - 25 * s, mx + 7 * s, y - 4.8 * s, dark(P['green'], .15), .7 * s)
    r.line([(mx, y - 25 * s), (mx, y - 4.8 * s)], .4 * s, jitter=False)
    quad(r, mx - 7.8 * s, y - 27 * s, mx + 7.8 * s, y - 25 * s, trim, .4 * s)
    if lit:
        r.ellipse(mx, y - 14 * s, 9 * s, 9 * s, P['win'], op=.18, blur=True)
    for cxp in (mx - 17 * s, mx - 6 * s, mx + 6 * s, mx + 17 * s):
        quad(r, cxp - 1.8 * s, y - Hw + 1 * s, cxp + 1.8 * s, y - 4.8 * s, trim, .5 * s)
        r.line([(cxp + .9 * s, y - Hw + 2 * s), (cxp + .9 * s, y - 5.4 * s)], .35 * s, color=dark(trim, .25), jitter=False)
        quad(r, cxp - 2.6 * s, y - 6.4 * s, cxp + 2.6 * s, y - 4.8 * s, trim, .35 * s)
        quad(r, cxp - 2.6 * s, y - Hw + 1 * s, cxp + 2.6 * s, y - Hw + 2.6 * s, trim, .35 * s)
    fy0, fy1 = y - Hw - 7.5 * s, y - Hw + 1 * s
    quad(r, mx - pw / 2 - 2 * s, fy0, mx + pw / 2 + 2 * s, fy1, trim, .7 * s)
    quad(r, mx - pw / 2 + 2 * s, fy0 + 1.4 * s, mx + pw / 2 - 2 * s, fy1 - 1.3 * s, '#2f5a46', .4 * s)
    sign_text(r, mx, fy1 - 2.4 * s, 'СЕЛЬСОВЕТ', 4.6 * s, '#f6eedb', width=pw - 7 * s)
    ped = [(mx - pw / 2 - 4 * s, fy0), (mx, fy0 - 15 * s), (mx + pw / 2 + 4 * s, fy0)]
    r.shape(ped, trim, .9 * s + .1)
    r.shape([(mx - pw / 2 + 1.5 * s, fy0 - 1 * s), (mx, fy0 - 12.6 * s), (mx + pw / 2 - 1.5 * s, fy0 - 1 * s)], wall, .5 * s)
    r.rim([ped[0], ped[1]], .8 * s)
    if r.winter:
        r.shape([(mx - pw / 2 - 4.4 * s, fy0 - .4 * s), (mx, fy0 - 15.8 * s), (mx + pw / 2 + 4.4 * s, fy0 - .4 * s), (mx + 3 * s, fy0 - 13 * s), (mx - 3 * s, fy0 - 13 * s)], P['snow'], .5 * s)
        r.blob(mx, y + .6 * s, pw / 2 + 6 * s, 1.6 * s, P['snow'], .4 * s, n=12, wob=.05)
    # the coat of arms in the pediment: a red shield with a gold sheaf, a little wreath round it
    cy0 = fy0 - 5.6 * s
    r.lines([[(mx - 4.6 * s + 4.6 * s * (1 - math.cos(a)), cy0 + 4.2 * s * math.sin(a) - 1 * s) for a in [k * .5 for k in range(-1, 4)]],
             [(mx + 4.6 * s - 4.6 * s * (1 - math.cos(a)), cy0 + 4.2 * s * math.sin(a) - 1 * s) for a in [k * .5 for k in range(-1, 4)]]], .9 * s, color=P['leaf_s'])
    sh = [(mx - 3.3 * s, cy0 - 4 * s), (mx + 3.3 * s, cy0 - 4 * s), (mx + 3.3 * s, cy0 + .4 * s), (mx, cy0 + 3.4 * s), (mx - 3.3 * s, cy0 + .4 * s)]
    r.shape(sh, P['accent'], .5 * s)
    r.lines([[(mx, cy0 + 1.6 * s), (mx, cy0 - 2.6 * s)], [(mx, cy0 + 1 * s), (mx - 1.6 * s, cy0 - 2.2 * s)], [(mx, cy0 + 1 * s), (mx + 1.6 * s, cy0 - 2.2 * s)]], .6 * s, color='#f0c552')
    # a notice board on two posts, out in front of the right wing
    nb, ny = x + Wb * .83, y + 8 * s
    for px in (nb - 5 * s, nb + 5 * s):
        r.line([(px, ny), (px, ny - 14 * s)], .8 * s, jitter=False)
    quad(r, nb - 7 * s, ny - 15 * s, nb + 7 * s, ny - 6 * s, P['logs_s'], .55 * s)
    for k, c in enumerate((P['white'], light(P['straw'], .45), P['white'])):
        quad(r, nb - 5.8 * s + k * 4 * s, ny - 13.8 * s + (k % 2) * .6 * s, nb - 2.6 * s + k * 4 * s, ny - 8.6 * s, c, .25 * s)
    r.blob(nb - 4.2 * s, ny - 13 * s, .6 * s, .6 * s, P['accent'], .15, n=6, wob=.02)
    r.shape([(nb - 8.5 * s, ny - 15 * s), (nb + 8.5 * s, ny - 15 * s), (nb, ny - 18.5 * s)], P['tes'], .45 * s)
    if r.winter:
        r.shape([(nb - 8.6 * s, ny - 15.3 * s), (nb, ny - 19 * s), (nb + 8.6 * s, ny - 15.3 * s), (nb, ny - 17 * s)], P['snow'], .3 * s)
    r.roof = (mx + 33 * s, y - Hw - Rf - 1)


def college(r, cx, y, s=1.0, lit=False):
    """The agricultural college: a school — two storeys of pale plaster with evenly spaced windows under a red hipped
    roof, a clock tower with a belfry over the entrance, the sign «КОЛЛЕДЖ» with a mortarboard, a small glass
    greenhouse and a trial plot with labelled rows beside it, students with books. Sets r.roof for the bubble."""
    P = r.P
    Wb, Hw, Dd, Rf = 86 * s, 50 * s, 20 * s, 14 * s
    dy = Dd * .42
    x = cx - (Wb + Dd) / 2 + 8 * s
    mx = x + Wb / 2
    wall = '#c3d6d0' if not r.winter else '#bccdd0'
    wall_s = dark(wall, .24)
    trim = P['white']
    # the trial plot and its little glass greenhouse, to the left of the school: the greenhouse behind, the plot in
    # front of it with a white tag at the head of every row
    px0, py = x - 30 * s, y + 3 * s
    gx, gw, gh = px0 + 3 * s, 17 * s, 13 * s
    gy = py - 11 * s
    r.shadow([(gx + gw, gy), (gx + gw + 14 * s, gy - 2 * s), (gx + gw + 18 * s, gy + 3 * s), (gx + 4 * s, gy + 3 * s)], .6)
    r.shape([(gx + gw, gy), (gx + gw + 5 * s, gy - 2.1 * s), (gx + gw + 5 * s, gy - gh * .55 - 2.1 * s), (gx + gw, gy - gh * .55)], '#c4dedf', .6 * s, op=.9)
    arch = [(gx, gy), (gx, gy - gh * .55)] + [(gx + gw / 2 - math.cos(a) * gw / 2, gy - gh * .55 - math.sin(a) * gh * .45) for a in [math.pi * k / 6 for k in range(1, 6)]] + [(gx + gw, gy - gh * .55), (gx + gw, gy)]
    r.shape(arch, '#d7ecec', .7 * s, op=.9)
    if not r.winter:
        r.dots([(gx + gw * (k + .5) / 4, gy - 2.2 * s, 2.2 * s, 2 * s) for k in range(4)], P['leaf'], .3 * s, cls='lf')
        r.dots([(gx + gw * (k + .5) / 4 + .4 * s, gy - 4.6 * s, .7 * s, .7 * s) for k in (0, 2)], P['apple'], .2 * s)
    r.lines([[(gx + gw * k / 4, gy), (gx + gw * k / 4, gy - gh * .55 - gh * .45 * math.sin(math.pi * k / 4))] for k in range(1, 4)] + [[(gx, gy - gh * .55), (gx + gw, gy - gh * .55)]], .4 * s, color=P['white'])
    r.add(f'<path d="{D([(gx + 1.5 * s, gy - gh * .5), (gx + 5 * s, gy - gh * .9), (gx + 1.5 * s, gy - 2 * s)])}" fill="#fff" opacity=".5"/>')
    if r.winter:
        r.blob(gx + gw / 2, gy - gh + .6 * s, gw * .42, 1.6 * s, P['snow'], .35 * s, n=9)
    garden(r, [(px0 + 1 * s, py - 9 * s), (px0 + 27 * s, py - 9.5 * s), (px0 + 28 * s, py), (px0, py + .5 * s)], rows=3)
    for k in range(3):
        t = ((k + .5) / 3) ** 1.25
        lx, ly = px0 + 1 * s - 1 * s * t, py - 9 * s + 9.5 * s * t
        r.line([(lx, ly + .5 * s), (lx, ly - 4 * s)], .5 * s, jitter=False)
        quad(r, lx - 2.8 * s, ly - 7 * s, lx + 2.8 * s, ly - 3.8 * s, P['white'], .3 * s)
        r.line([(lx - 1.7 * s, ly - 5.4 * s), (lx + 1.7 * s, ly - 5.4 * s)], .45 * s, color=(P['accent'], P['blue'], P['coat3'])[k], jitter=False)
    r.shadow([(x + Wb, y), (x + Wb + Dd, y - dy), (x + Wb + Dd + 42 * s, y - dy + 14 * s), (x + Wb + 26 * s, y + 12 * s), (x + 10 * s, y + 6 * s)])
    side_wall(r, x + Wb, y, Hw, Dd, wall_s, s)
    for k in (1, 2):
        wx = x + Wb + Dd * k / 3
        window(r, wx, y - Hw * .27 - dy * k / 3, s * .75, trim, lit, False, kind='plain')
        window(r, wx, y - Hw * .72 - dy * k / 3, s * .75, trim, lit, False, kind='plain')
    quad(r, x, y - Hw, x + Wb, y, wall, 1.2 * s + .2)
    quad(r, x, y - 5 * s, x + Wb, y, P['brick'], .7 * s)
    r.lines([[(x + 1, y - 2.5 * s), (x + Wb - 1, y - 2.5 * s)]], .3 * s, op=.4)
    # the band between the floors, white corners
    quad(r, x - 1, y - Hw * .5 - 1.2 * s, x + Wb + 1, y - Hw * .5 + 1.2 * s, trim, .5 * s)
    for px in (x, x + Wb - 3 * s):
        quad(r, px, y - Hw, px + 3 * s, y - 5 * s, trim, .45 * s)
    r.rim([(x - .8, y - 1), (x - .8, y - Hw)], .9 * s)
    # many windows, evenly spaced, the same on both floors
    n = 6
    for row, wy in ((0, y - Hw * .27), (1, y - Hw * .73)):
        for i in range(n):
            if row == 0 and i in (2, 3):
                continue
            window(r, x + Wb * (i + .5) / n, wy, s * .88, trim, lit, False, kind='plain')
    # the door under a canopy, steps
    r.shape([(mx - 12 * s, y + 3 * s), (mx + 12 * s, y + 3 * s), (mx + 12 * s, y - .5), (mx - 12 * s, y - .5)], P['grey'], .6 * s)
    quad(r, mx - 7 * s, y - 19 * s, mx + 7 * s, y - .5, '#5b7f9a', .7 * s)
    r.line([(mx, y - 1), (mx, y - 19 * s)], .4 * s, jitter=False)
    quad(r, mx - 5.6 * s, y - 17.6 * s, mx - 1 * s, y - 11 * s, P['win'] if lit else P['glass'], .35 * s)
    quad(r, mx + 1 * s, y - 17.6 * s, mx + 5.6 * s, y - 11 * s, P['win'] if lit else P['glass'], .35 * s)
    if lit:
        r.ellipse(mx, y - 12 * s, 9 * s, 7 * s, P['win'], op=.2, blur=True)
    # the big sign over the door, between the floors: a mortarboard and the name
    sy0, sy1 = y - Hw * .5 - 4.6 * s, y - Hw * .5 + 3.2 * s
    quad(r, mx - 25 * s, sy0, mx + 25 * s, sy1, '#2f4d6e', .7 * s)
    cap_x, cap_y = mx - 19 * s, (sy0 + sy1) / 2
    r.shape([(cap_x - 4 * s, cap_y - .6 * s), (cap_x, cap_y - 2.6 * s), (cap_x + 4 * s, cap_y - .6 * s), (cap_x, cap_y + 1.4 * s)], '#1f2a36', .3 * s)
    quad(r, cap_x - 2.2 * s, cap_y + .4 * s, cap_x + 2.2 * s, cap_y + 2.6 * s, '#1f2a36', .25 * s)
    r.line([(cap_x + 3.4 * s, cap_y - .6 * s), (cap_x + 3.4 * s, cap_y + 2.4 * s)], .45 * s, color='#f0c552', jitter=False)
    sign_text(r, mx + 3 * s, sy1 - 1.8 * s, 'КОЛЛЕДЖ', 5.6 * s, '#f6eedb', width=34 * s)
    # the roof, the chimneys
    front = hip_roof(r, x, y, Wb, Hw, Dd, Rf, 16 * s, P['iron_r'], P['iron_r_s'], s, ov=4, seams=13)
    for chx in (x + Wb * .2, x + Wb * .8):
        chimney_box(r, chx, y - Hw - Rf * .5, 4.4 * s, 9 * s, s)
    # the clock tower over the entrance: a square shaft, the clock, the belfry with the bell, a pointed roof
    tw = 17 * s
    t0, t1 = mx - tw / 2, mx + tw / 2
    tb = y - Hw + 1
    tt = tb - Rf - 16 * s
    r.shape([(t1, tb), (t1 + 4 * s, tb - 1.7 * s), (t1 + 4 * s, tt - 1.7 * s), (t1, tt)], wall_s, .8 * s, shade=True)
    quad(r, t0, tt, t1, tb, wall, 1.0 * s + .1)
    r.rim([(t0 - .5, tb - 1), (t0 - .5, tt)], .8 * s)
    quad(r, t0 - 1.4 * s, tt - 1.6 * s, t1 + 1.4 * s, tt + .4 * s, trim, .5 * s)
    ccy = tt + 8 * s
    r.blob(mx, ccy, 5.6 * s, 5.6 * s, trim, .6 * s, n=14, wob=.01)
    r.blob(mx, ccy, 4.4 * s, 4.4 * s, '#fbf6e8' if not lit else '#ffe9b0', .4 * s, n=14, wob=.01)
    r.lines([[(mx + math.cos(a) * 3.4 * s, ccy + math.sin(a) * 3.4 * s), (mx + math.cos(a) * 4 * s, ccy + math.sin(a) * 4 * s)] for a in [k * math.pi / 2 for k in range(4)]], .4 * s)
    r.lines([[(mx, ccy), (mx, ccy - 3.2 * s)], [(mx, ccy), (mx + 2.2 * s, ccy + .9 * s)]], .55 * s)
    if r.winter:
        r.blob(mx + 1 * s, tt - 1.9 * s, tw * .55, 1.3 * s, P['snow'], .35 * s, n=9)
    # the belfry: four posts, the bell between them
    bt = tt - 1.6 * s - 10 * s
    for px in (t0 + .6 * s, mx - .7 * s, t1 - 2 * s):
        quad(r, px, bt, px + 1.4 * s, tt - 1.6 * s, trim, .35 * s)
    r.shape([(mx - 3 * s, bt + 7.4 * s), (mx - 2.2 * s, bt + 3.4 * s), (mx - 1 * s, bt + 2.4 * s), (mx + 1 * s, bt + 2.4 * s), (mx + 2.2 * s, bt + 3.4 * s), (mx + 3 * s, bt + 7.4 * s)], '#e2b84f', .45 * s)
    r.blob(mx, bt + 8 * s, .7 * s, .7 * s, dark('#e2b84f', .3), .2 * s, n=6)
    spire = [(t0 - 2.6 * s, bt + .5 * s), (mx, bt - 15 * s), (t1 + 2.6 * s, bt + .5 * s)]
    r.shape([(t1 + 2.6 * s, bt + .5 * s), (t1 + 6 * s, bt - 1.2 * s), (mx + 1 * s, bt - 15 * s)], dark(P['iron_g_s'], .1), .6 * s, shade=True)
    r.shape(spire, P['iron_g'], .8 * s + .1)
    r.rim([spire[0], spire[1]], .7 * s)
    if r.winter:
        r.shape([(t0 - 2.4 * s, bt), (mx, bt - 15.4 * s), (mx + 2 * s, bt - 10 * s), (mx - 2 * s, bt - 4 * s)], P['snow'], .4 * s)
    r.line([(mx, bt - 15 * s), (mx, bt - 19 * s)], .5 * s, jitter=False)
    r.blob(mx, bt - 19.4 * s, .9 * s, .9 * s, '#e9b44c', .25 * s, n=6)
    r.roof = (x + 5 * s, y - Hw - Rf * .45)
    # students on the way in: books under the arm, a briefcase
    kid_book(r, mx + 15 * s, y + 4 * s, 1.0, coat=P['coat2'], f=-1)
    kid_book(r, mx + 21 * s, y + 3.4 * s, .95, coat=P['coat1'], bag='#6b4a32', f=1)


def long_house(r, x, y, s=1.0, wall='logs', roof='iron_g', frame=None, shutters=False, lit=False, windows=5, W_=104, H_=34, D_=30, planks=False, wins=None, frames=None):
    """A long house with its long wall to the street (the orphanage, the restaurant): wall colour of one's own."""
    P = r.P
    frame = frame or P['white']
    Wl, Hw, G, Dd = W_ * s, H_ * s, 26 * s, D_ * s
    dy = Dd * .42
    wc = P[wall] if wall in P else wall
    ws = P.get(wall + '_s') if wall in P and wall + '_s' in P else dark(wc, .22)
    sl, ss = roof if isinstance(roof, tuple) else (P[roof], P[roof + '_s'])
    r.shadow([(x + Wl, y), (x + Wl + Dd, y - dy), (x + Wl + Dd + 40 * s, y - dy + 14 * s), (x + Wl + 26 * s, y + 13 * s), (x + 6 * s, y + 7 * s)])
    gs = [(x + Wl, y), (x + Wl + Dd, y - dy), (x + Wl + Dd, y - Hw - dy), (x + Wl + Dd / 2, y - Hw - G - dy / 2), (x + Wl, y - Hw)]
    r.shape(gs, ws, 1.0 * s + .2, shade=True)
    r.lines([[(x + Wl, y - Hw * i / 8), (x + Wl + Dd, y - Hw * i / 8 - dy)] for i in range(1, 8)], .35 * s + .1, op=.45)
    window(r, x + Wl + Dd / 2, y - Hw * .55 - dy / 2, s * .9, frame, lit, False)
    r.shape([(x, y), (x + Wl, y), (x + Wl, y - Hw), (x, y - Hw)], wc, 1.25 * s + .2)
    r.lines([[(x + 1, y - Hw * i / 8), (x + Wl - 1, y - Hw * i / 8)] for i in range(1, 8)], (.25 if planks else .35) * s + .1, op=.45)
    if not planks:
        r.dots([(x - 1.2 * s, y - Hw * (i + .5) / 8, 2.1 * s, 1.9 * s) for i in range(8)], light(wc, .22), .4 * s + .05)
    r.rim([(x - 1.2 * s, y - 1), (x - 1.2 * s, y - Hw)], .9 * s)
    ov = 5 * s
    front = [(x - ov, y - Hw + 1), (x + Wl + ov * .6, y - Hw + 1), (x + Wl + Dd / 2, y - Hw - G - dy / 2 - 1), (x + Dd / 2 - ov, y - Hw - G - dy / 2 - 1)]
    r.shape(front, sl, 1.2 * s + .2)
    r.lines([[(front[0][0] + (front[1][0] - front[0][0]) * i / 14, front[0][1]), (front[0][0] + (front[1][0] - front[0][0]) * i / 14 + Dd / 2, front[0][1] - G - dy / 2 - 1)] for i in range(1, 14)], .3 * s + .1, color=dark(sl, .35), op=.4)
    r.rim([front[0], front[3]], .9 * s)
    if r.winter:
        r.shape([front[3], front[2], (front[2][0] - 4 * s, front[2][1] + G * .7), (x + Wl * .6, y - Hw - G * .25), (x + Wl * .25, y - Hw - G * .35), (front[3][0] - 2 * s, front[3][1] + G * .75)], P['snow'], .8 * s)
    r.shape([(x + Wl + ov * .6, y - Hw + 1), (x + Wl + Dd / 2, y - Hw - G - dy / 2 - 1), (x + Wl + Dd + 2 * s, y - Hw - dy + 1), (x + Wl + Dd, y - Hw - dy + 3 * s)], P['white'], .7 * s)
    for i, t in enumerate(wins or [(i + .5) / windows for i in range(windows)]):
        window(r, x + Wl * t, y - Hw * .52, s, frames[i % len(frames)] if frames else frame, lit, shutters)
    r.shape([(x - 1, y), (x + Wl + 1, y), (x + Wl + 1, y - 3 * s), (x - 1, y - 3 * s)], dark(wc, .3), .7 * s + .1)
    if r.winter:
        r.blob(x + Wl * .5, y + 1, Wl * .55, 3 * s, P['snow'], .6 * s, n=14, wob=.08)
    return dict(Wl=Wl, Hw=Hw, G=G, Dd=Dd, dy=dy, front=front)


KID_COLS = ('#d8483a', '#3f7fc0', '#f0b43a', '#5ea35a', '#a46ac8')


def picket(r, x0, x1, y, s, cols=KID_COLS, h=8.0, gap=None):
    """A low picket fence painted in many colours, the pickets pointed; snow caps in winter."""
    P = r.P
    r.lines([[(x0, y - h * .35 * s), (x1, y - h * .35 * s)], [(x0, y - h * .75 * s), (x1, y - h * .75 * s)]], .9 * s, color=dark(P['grey'], .1))
    xx, i = x0, 0
    while xx < x1 - 1:
        if gap and gap[0] <= xx <= gap[1]:
            xx += 3.4 * s
            continue
        hh = h * s * (1 + .05 * math.sin(i * 2.1))
        r.shape([(xx, y), (xx + 2.3 * s, y), (xx + 2.3 * s, y - hh), (xx + 1.15 * s, y - hh - 1.8 * s), (xx, y - hh)], cols[i % len(cols)], .35 * s + .1)
        if r.winter:
            r.blob(xx + 1.15 * s, y - hh - 1 * s, 1.5 * s, .8 * s, P['snow'], .2, n=7, ink=False)
        xx += 3.4 * s
        i += 1
    if r.winter:
        r.blob((x0 + x1) / 2, y + .6, (x1 - x0) * .52, 1.8 * s, P['snow'], .35 * s, n=16, wob=.06)


def sun_face(r, x, y, R, s, lit=False):
    """A big smiling sun: a disc with a face, rays all round (the children's home's sign)."""
    P = r.P
    rays = []
    for k in range(12):
        a = k * math.pi / 6 + .13
        ln = R * (1.62 if k % 2 == 0 else 1.38)
        rays.append([(x + math.cos(a - .17) * R * .92, y + math.sin(a - .17) * R * .92), (x + math.cos(a) * ln, y + math.sin(a) * ln), (x + math.cos(a + .17) * R * .92, y + math.sin(a + .17) * R * .92)])
    for ray in rays:
        r.shape(ray, '#f39a2e', .4 * s)
    if lit:
        r.ellipse(x, y, R * 1.6, R * 1.6, P['win'], op=.2, blur=True)
    r.blob(x, y, R, R, '#f7c840', .7 * s + .1, n=16, wob=.01)
    r.blob(x - R * .3, y - R * .3, R * .42, R * .3, '#fde58a', 0, n=8, ink=False, rot=-.5)
    r.dots([(x - R * .36, y - R * .16, R * .1, R * .14), (x + R * .36, y - R * .16, R * .1, R * .14)], P['ink'])
    r.dots([(x - R * .56, y + R * .2, R * .17, R * .11), (x + R * .56, y + R * .2, R * .17, R * .11)], '#f08a6a', op=.8)
    r.add(f'<path d="M{fmt(x - R * .46)} {fmt(y + R * .16)}Q{fmt(x)} {fmt(y + R * .78)} {fmt(x + R * .46)} {fmt(y + R * .16)}" class="k" stroke-width="{fmt(.7 * s)}"/>')


def bunting(r, x0, y0, x1, y1, sag, s, n=9, cols=KID_COLS):
    """A string of little flags hung between two points."""
    r.add(f'<path d="M{fmt(x0)} {fmt(y0)}Q{fmt((x0 + x1) / 2)} {fmt((y0 + y1) / 2 + 2 * sag)} {fmt(x1)} {fmt(y1)}" class="k" stroke-width="{fmt(.35 * s)}"/>')
    for k in range(n):
        t = (k + .5) / n
        px = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * (x0 + x1) / 2 + t * t * x1
        py = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * ((y0 + y1) / 2 + 2 * sag) + t * t * y1
        r.shape([(px - 1.5 * s, py), (px + 1.5 * s, py), (px, py + 3 * s)], cols[k % len(cols)], .25 * s)


def playground(r, x, y, s):
    """Swings, a slide, a sandbox with a bucket, a ball; children playing (winter: snow on it all, a snowman,
    a sled, no ball)."""
    P = r.P
    w = r.winter
    r.shadow([(x, y), (x + 44 * s, y - 3 * s), (x + 52 * s, y + 4 * s), (x + 4 * s, y + 6 * s)], .5)
    # the sandbox at the front, a wooden frame in perspective
    bx, by = x + 22 * s, y + 6 * s
    sb = [(bx, by), (bx + 17 * s, by - .5 * s), (bx + 20 * s, by - 5 * s), (bx + 3 * s, by - 5.4 * s)]
    r.shape(sb, P['snow'] if w else '#efd9a0', .6 * s)
    r.lines([[sb[0], sb[1], sb[2]], [sb[0], sb[3]]], 1.4 * s, color=P['logs'])
    r.line([sb[3], sb[2]], 1.0 * s, color=P['logs_s'], jitter=False)
    if not w:
        r.shape([(bx + 6 * s, by - 2 * s), (bx + 9 * s, by - 2 * s), (bx + 8.5 * s, by - 5 * s), (bx + 6.5 * s, by - 5 * s)], '#3f7fc0', .3 * s)
        r.line([(bx + 12 * s, by - 1.6 * s), (bx + 14 * s, by - 6 * s)], .5 * s, color='#d8483a', jitter=False)
        r.blob(bx + 3.4 * s, by - 3.2 * s, 2.6 * s, 1.4 * s, dark('#efd9a0', .12), 0, n=7, ink=False)
    # the swings: an A-frame, two seats
    sx = x + 4 * s
    for px in (sx, sx + 20 * s):
        r.lines([[(px - 3 * s, y), (px, y - 20 * s), (px + 3 * s, y)]], .8 * s)
    r.line([(sx - 1 * s, y - 20 * s), (sx + 21 * s, y - 20 * s)], 1.1 * s, color=P['accent'] if not w else dark(P['accent'], .1))
    if w:
        r.blob(sx + 10 * s, y - 20.8 * s, 11 * s, .9 * s, P['snow'], .2 * s, n=9)
    for k, ox in enumerate((5 * s, 14 * s)):
        def seat(k=k):
            r.lines([[(-2.4 * s, 0), (-2.4 * s, 13 * s)], [(2.4 * s, 0), (2.4 * s, 13 * s)]], .3 * s)
            quad(r, -3.4 * s, 13 * s, 3.4 * s, 14.6 * s, KID_COLS[1 + k], .35 * s)
            if k == 0 and not w:
                person(r, 0, 14 * s, s * .9, coat=KID_COLS[3], kind='kid', scarf=KID_COLS[2])
        r.group(seat, sx + ox, y - 20 * s, 'swing', style=f'animation-delay:{-k * 1.1:.1f}s')
    # the slide: a ladder up to a little platform, a red chute down to the right
    lx = x + 30 * s
    r.lines([[(lx, y), (lx + 1 * s, y - 17 * s)], [(lx + 4 * s, y), (lx + 5 * s, y - 17 * s)]], .7 * s)
    r.lines([[(lx + .2 * s + k * .2 * s, y - k * 3.2 * s), (lx + 4.2 * s + k * .2 * s, y - k * 3.2 * s)] for k in range(1, 6)], .4 * s)
    quad(r, lx + .5 * s, y - 18.4 * s, lx + 7 * s, y - 16.8 * s, '#f0b43a', .4 * s)
    r.lines([[(lx + 1 * s, y - 18.4 * s), (lx + 1 * s, y - 22 * s), (lx + 6.5 * s, y - 22 * s), (lx + 6.5 * s, y - 18.4 * s)]], .5 * s, color='#f0b43a')
    chute = [(lx + 6.5 * s, y - 18.4 * s), (lx + 9 * s, y - 16.4 * s), (lx + 16 * s, y - 4 * s), (lx + 20 * s, y - 1.6 * s), (lx + 20 * s, y - .2 * s), (lx + 15.4 * s, y - 2.2 * s), (lx + 8.4 * s, y - 14.4 * s), (lx + 6.5 * s, y - 16.2 * s)]
    r.shape(chute, '#d8483a', .6 * s)
    r.line([(lx + 8 * s, y - 16.6 * s), (lx + 15.6 * s, y - 3.6 * s)], .5 * s, color='#f8b0a0', op=.8, jitter=False)
    r.line([(lx + 18 * s, y - 1.8 * s), (lx + 18 * s, y + .5 * s)], .6 * s, jitter=False)
    if w:
        r.blob(lx + 3.8 * s, y - 22.6 * s, 3.6 * s, .9 * s, P['snow'], .2 * s, n=7)
        r.shape([(lx + 8.6 * s, y - 17 * s), (lx + 16 * s, y - 4.6 * s), (lx + 15 * s, y - 3.6 * s), (lx + 8 * s, y - 15.4 * s)], P['snow'], .25 * s)
    # children: one at the top of the slide, one with the ball (summer); a snowman and a sled (winter)
    if not w:
        person(r, lx + 4 * s, y - 18.4 * s, s * .9, coat=KID_COLS[0], kind='kid', scarf=KID_COLS[4])
        person(r, x + 9 * s, y + 8 * s, s * .95, coat=KID_COLS[2], kind='kid', scarf=KID_COLS[1])
        r.blob(x + 15 * s, y + 7 * s, 1.9 * s, 1.9 * s, '#ffffff', .4 * s, n=9, wob=.02)
        r.add(f'<path d="M{fmt(x + 13.1 * s)} {fmt(y + 7 * s)}Q{fmt(x + 15 * s)} {fmt(y + 5.6 * s)} {fmt(x + 16.9 * s)} {fmt(y + 7 * s)}" class="kn" stroke="#d8483a" stroke-width="{fmt(1.1 * s)}"/>')
        person(r, bx + 10 * s, by - 1 * s, s * .85, coat=KID_COLS[4], kind='kid', scarf=KID_COLS[3])
    else:
        snowman(r, x + 12 * s, y + 8 * s, s * .9)
        person(r, bx + 10 * s, by - 1 * s, s * .9, coat=KID_COLS[0], kind='kid', scarf=KID_COLS[2])
        sled(r, bx + 13 * s, by + 1.4 * s, s * .7)


def orphanage(r, cx, y, s=1.0, lit=False):
    """The children's home «Солнышко»: a cheerful yellow house with frames of every colour, a mezzanine carrying a big
    smiling sun, flags strung along the eaves, a picket fence in all colours and the playground beside it — swings,
    a slide, the sandbox — with children at play. Sets r.roof for the bubble."""
    P = r.P
    Wl0 = 82
    x = cx - 38 * s
    wall = '#f4cf5c' if not r.winter else '#e9c35a'
    roof = ('#5f9fd0', '#477fae') if not r.winter else ('#5893c4', '#41739f')
    frames = [KID_COLS[0], KID_COLS[1], KID_COLS[3], KID_COLS[4]]
    playground(r, x - 48 * s, y + 1 * s, s)
    g = long_house(r, x, y, s, wall=wall, roof=roof, frame=P['white'], shutters=False, lit=lit, W_=Wl0, H_=33, D_=24, planks=True,
                   wins=[.1, .3, .7, .9], frames=frames)
    Wl, Hw, G = g['Wl'], g['Hw'], g['G']
    # the door in the middle under a little gabled porch, painted red
    px = x + Wl * .5
    quad(r, px - 9 * s, y - .5, px + 9 * s, y + 2.6 * s, P['grey'], .6 * s)
    quad(r, px - 4.8 * s, y - 17 * s, px + 4.8 * s, y - .5, '#d8483a', .6 * s)
    r.blob(px, y - 13.6 * s, 2.2 * s, 2.2 * s, P['win'] if lit else P['glass'], .35 * s, n=9, wob=.02)
    for pxx in (px - 7.4 * s, px + 7.4 * s):
        r.line([(pxx, y), (pxx, y - 19 * s)], .8 * s, jitter=False)
    r.shape([(px - 10 * s, y - 18.6 * s), (px + 10 * s, y - 18.6 * s), (px, y - 25 * s)], roof[0], .6 * s)
    if r.winter:
        r.shape([(px - 10.2 * s, y - 18.9 * s), (px, y - 25.6 * s), (px + 10.2 * s, y - 18.9 * s), (px, y - 22.6 * s)], P['snow'], .4 * s)
    if lit:
        r.ellipse(px, y - 10 * s, 8 * s, 8 * s, P['win'], op=.2, blur=True)
    # the flags along the eaves
    bunting(r, x + 1 * s, y - Hw + 2.6 * s, px - 11 * s, y - Hw + 2.4 * s, 1.6 * s, s, n=5)
    bunting(r, px + 11 * s, y - Hw + 2.4 * s, x + Wl - 1 * s, y - Hw + 2.6 * s, 1.6 * s, s, n=5)
    # the mezzanine over the middle, its gable carrying the sun
    mw = 30 * s
    base = y - Hw - G * .36
    quad(r, px - mw / 2, base - 13 * s, px + mw / 2, base + 3 * s, wall, 1.0 * s + .1)
    r.lines([[(px - mw / 2 + .5, base - 13 * s * k / 5), (px + mw / 2 - .5, base - 13 * s * k / 5)] for k in range(1, 5)], .25 * s, op=.4)
    for k, wx in enumerate((px - 8.4 * s, px + 8.4 * s)):
        window(r, wx, base - 5 * s, s * .72, frames[(k + 1) % 4], lit, False, kind='plain')
    gab = [(px - mw / 2 - 4 * s, base - 13 * s), (px, base - 33 * s), (px + mw / 2 + 4 * s, base - 13 * s)]
    r.shape(gab, roof[0], 1.0 * s + .1)
    r.shape([(px - mw / 2 + .5 * s, base - 13.6 * s), (px, base - 30 * s), (px + mw / 2 - .5 * s, base - 13.6 * s)], light(wall, .35), .7 * s)
    r.rim([gab[0], gab[1]], .8 * s)
    if r.winter:
        r.shape([(px - mw / 2 - 4.2 * s, base - 13.4 * s), (px, base - 33.8 * s), (px + mw / 2 + 4.2 * s, base - 13.4 * s), (px + 2 * s, base - 30 * s), (px - 3 * s, base - 29 * s)], P['snow'], .6 * s)
    sun_face(r, px, base - 20.5 * s, 7 * s, s, lit)
    cx2, cy2 = x + Wl * .84, y - Hw - G * .5
    chimney_box(r, cx2, cy2, 5 * s, 10 * s, s)
    smoke(r, cx2 + 1 * s, cy2 - 14 * s, s)
    r.roof = (px, base - 33 * s - 2 * s)
    # the picket fence in front, a gap at the porch
    picket(r, x - 3 * s, x + Wl + 8 * s, y + 8 * s, s, h=7, gap=(px - 8 * s, px + 7 * s))


def wheat_ear(r, x, y, h, s, col='#e9b44c', lean=0.0):
    """An ear of wheat: a stalk and grains in pairs up it, an awn at the top."""
    tip = (x + lean * h, y - h)
    r.line([(x, y), tip], .55 * s, color=dark(col, .35), jitter=False)
    gr = []
    for k in range(5):
        t = .38 + k * .13
        gx, gy = x + lean * h * t, y - h * t
        gr += [(gx - 1.05 * s, gy + .3 * s, .95 * s, 1.5 * s), (gx + 1.05 * s, gy + .3 * s, .95 * s, 1.5 * s)]
    gr.append((tip[0], tip[1] + .9 * s, .8 * s, 1.4 * s))
    r.dots(gr, col, .3 * s)


def pretzel_sign(r, s):
    """A big golden kalach-pretzel (крендель), the baker's sign of old, drawn at the origin hanging down."""
    P = r.P
    gold, crust = '#e3a93f', '#b8742c'
    r.lines([[(-3 * s, 0), (-3 * s, 3.4 * s)], [(3 * s, 0), (3 * s, 3.4 * s)]], .45 * s)
    loop = [(0, 6.6 * s), (5.4 * s, 3.8 * s), (9.4 * s, 6 * s), (10 * s, 11.6 * s), (6.4 * s, 16 * s), (0, 17.4 * s), (-6.4 * s, 16 * s), (-10 * s, 11.6 * s), (-9.4 * s, 6 * s), (-5.4 * s, 3.8 * s)]
    d = SD(loop)
    r.add(f'<path d="{d}" fill="none" class="kn" stroke="{P["ink"]}" stroke-width="{fmt(5.4 * s)}"/>')
    r.add(f'<path d="{d}" fill="none" class="kn" stroke="{gold}" stroke-width="{fmt(3.8 * s)}"/>')
    cross = f'M{fmt(-6.6 * s)} {fmt(14.4 * s)}C{fmt(-3 * s)} {fmt(10 * s)} {fmt(3 * s)} {fmt(9 * s)} {fmt(4 * s)} {fmt(5.4 * s)}M{fmt(6.6 * s)} {fmt(14.4 * s)}C{fmt(3 * s)} {fmt(10 * s)} {fmt(-3 * s)} {fmt(9 * s)} {fmt(-4 * s)} {fmt(5.4 * s)}'
    r.add(f'<path d="{cross}" fill="none" class="kn" stroke="{P["ink"]}" stroke-width="{fmt(4.6 * s)}"/>')
    r.add(f'<path d="{cross}" fill="none" class="kn" stroke="{gold}" stroke-width="{fmt(3.1 * s)}"/>')
    r.add(f'<path d="{SD(loop[6:] + loop[:2], False)}" fill="none" class="kn" stroke="#f7d687" stroke-width="{fmt(1 * s)}" opacity=".8"/>')
    r.dots([(px, py, .45 * s, .3 * s) for px, py in ((-7 * s, 8 * s), (7.6 * s, 9.6 * s), (-2 * s, 16.4 * s), (3 * s, 16 * s), (0, 10.6 * s), (-8.4 * s, 13 * s))], '#fff4d6')
    r.add(f'<path d="{SD(loop[2:6], False)}" fill="none" class="kn" stroke="{crust}" stroke-width="{fmt(1.1 * s)}" opacity=".7"/>')
    r.see([(-12.8 * s, 0), (12.8 * s, 20 * s)])


def bakery(r, cx, y, s=1.0, lit=False):
    """The bakery «Колосок»: warm brick with its gable to the street; a big golden pretzel hung out on a bracket, a
    tall oven chimney with warm smoke, a wide display window full of loaves under the sign «ПЕКАРНЯ», a wheat ear in
    the gable, flour sacks and a bread trolley by the door, the window's warm glow. Sets r.roof for the bubble."""
    P = r.P
    Wf, Hw, G, Dd = 60 * s, 38 * s, 22 * s, 28 * s
    dy = Dd * .42
    x = cx - (Wf + Dd) / 2 + 2 * s
    brick = '#c06a45' if not r.winter else '#b26043'
    brick_s = dark(brick, .26)
    r.shadow([(x + Wf, y), (x + Wf + Dd, y - dy), (x + Wf + Dd + 40 * s, y - dy + 14 * s), (x + Wf + 26 * s, y + 12 * s), (x + 6 * s, y + 6 * s)])
    side_wall(r, x + Wf, y, Hw, Dd, brick_s, s, lines=10)
    rs = [(x + Wf + 4 * s, y - Hw + 1 * s), (x + Wf / 2, y - Hw - G), (x + Wf / 2 + Dd, y - Hw - G - dy), (x + Wf + 4 * s + Dd, y - Hw - dy + 1 * s)]
    r.shape(rs, P['iron_r_s'], 1.0 * s + .2, shade=True)
    r.lines([[(rs[0][0] + (rs[1][0] - rs[0][0]) * i / 7, rs[0][1] + (rs[1][1] - rs[0][1]) * i / 7), (rs[0][0] + (rs[1][0] - rs[0][0]) * i / 7 + Dd, rs[0][1] + (rs[1][1] - rs[0][1]) * i / 7 - dy)] for i in range(1, 7)], .3 * s, op=.5)
    if r.winter:
        roof_cap(r, rs, s)
    # the oven chimney: tall, broad, whitewashed at its head, warm smoke all day long
    chx, chy = x + Wf / 2 + Dd * .62, y - Hw - G * .62 - dy * .62
    quad(r, chx - 5.5 * s, chy - 22 * s, chx + 5.5 * s, chy + 3 * s, P['brick'], .9 * s)
    r.shape([(chx + 5.5 * s, chy + 3 * s), (chx + 8.5 * s, chy + 1.6 * s), (chx + 8.5 * s, chy - 23.4 * s), (chx + 5.5 * s, chy - 22 * s)], P['brick_s'], .6 * s, shade=True)
    r.lines([[(chx - 5.5 * s, chy - 22 * s + k * 3.4 * s), (chx + 5.5 * s, chy - 22 * s + k * 3.4 * s)] for k in range(1, 7)], .3 * s, color=dark(P['brick'], .35), op=.6)
    quad(r, chx - 6.6 * s, chy - 25.6 * s, chx + 9.4 * s, chy - 21.6 * s, P['plaster'], .6 * s)
    if r.winter:
        r.shape([(chx - 6.8 * s, chy - 25.8 * s), (chx + 9.6 * s, chy - 25.8 * s), (chx + 7.6 * s, chy - 27.6 * s), (chx - 5 * s, chy - 27.4 * s)], P['snow'], .4 * s)
    if lit or True:
        r.ellipse(chx + 1 * s, chy - 27 * s, 6 * s, 3 * s, '#ffb35c', op=.3 if not lit else .45, blur=True)
    smoke(r, chx + 1 * s, chy - 30 * s, s * 1.25)
    smoke(r, chx - 3 * s, chy - 40 * s, s * .9)
    # the facade
    quad(r, x, y - Hw, x + Wf, y, brick, 1.25 * s + .2)
    r.lines([[(x + 1, y - Hw * i / 12), (x + Wf - 1, y - Hw * i / 12)] for i in range(1, 12)], .25 * s, color=dark(brick, .3), op=.5)
    r.rim([(x - .8, y - 1), (x - .8, y - Hw)], .9 * s)
    gab = [(x - 4 * s, y - Hw), (x + Wf / 2, y - Hw - G), (x + Wf + 4 * s, y - Hw)]
    r.shape(gab, P['plaster'], 1.1 * s + .2)
    for (ax, ay), (bx2, by2) in [((x - 6 * s, y - Hw + 2 * s), (x + Wf / 2, y - Hw - G - 2 * s)), ((x + Wf / 2, y - Hw - G - 2 * s), (x + Wf + 6 * s, y - Hw + 2 * s))]:
        nx, ny = (by2 - ay), -(bx2 - ax)
        L = math.hypot(nx, ny)
        nx, ny = nx / L * 2.6 * s, ny / L * 2.6 * s
        r.shape([(ax, ay), (bx2, by2), (bx2 + nx, by2 + ny), (ax + nx, ay + ny)], P['iron_r'], .8 * s)
    r.rim([(x - 6 * s, y - Hw + 2 * s), (x + Wf / 2, y - Hw - G - 2 * s)], .9 * s)
    if r.winter:
        r.shape([(x - 6 * s, y - Hw + 1.5 * s), (x + Wf / 2, y - Hw - G - 3.2 * s), (x + Wf / 2 + 3 * s, y - Hw - G - 1 * s), (x - 3 * s, y - Hw + 3 * s)], P['snow'], .6 * s)
    # the wheat ear (колосок) in the gable: three ears in a round medallion
    gy = y - Hw - G * .4
    r.blob(x + Wf / 2, gy, 7 * s, 7 * s, P['white'], .7 * s, n=12, wob=.01)
    for k, ln in ((-1, -.22), (0, 0), (1, .22)):
        wheat_ear(r, x + Wf / 2 + k * 1.2 * s, gy + 5 * s, 9.6 * s, s * .85, lean=ln)
    # the sign board over the window: «ПЕКАРНЯ»
    sy0, sy1 = y - Hw + 3 * s, y - Hw + 10.4 * s
    quad(r, x + 3 * s, sy0, x + Wf - 3 * s, sy1, '#f4e6c4', .7 * s)
    sign_text(r, x + Wf / 2, sy1 - 1.8 * s, 'ПЕКАРНЯ', 5.4 * s, '#8a3b22', width=Wf - 12 * s)
    # the display window, wide, full of loaves, a striped awning over it
    wx0, wx1, wy0, wy1 = x + 4 * s, x + Wf * .64, y - Hw * .57, y - 5 * s
    quad(r, wx0 - 2 * s, wy0 - 2 * s, wx1 + 2 * s, wy1 + 2.4 * s, P['white'], .7 * s)
    quad(r, wx0, wy0, wx1, wy1, '#ffd88a' if lit else P['glass'], .7 * s)
    if not lit:
        r.add(f'<path d="{D([(wx0 + .6, wy0 + .6), (wx0 + (wx1 - wx0) * .35, wy0 + .6), (wx0 + .6, wy0 + (wy1 - wy0) * .5)])}" fill="#fff" opacity=".4"/>')
    # shelves of bread: round loaves below, long batons and a kalach above
    r.lines([[(wx0, wy1 - 4.4 * s), (wx1, wy1 - 4.4 * s)], [(wx0, wy0 + (wy1 - wy0) * .44), (wx1, wy0 + (wy1 - wy0) * .44)]], .5 * s, color=P['logs_s'])
    r.dots([(wx0 + (wx1 - wx0) * (k + .5) / 5, wy1 - 2.4 * s, 2.5 * s, 1.8 * s) for k in range(5)], '#d9963e', .4 * s)
    r.dots([(wx0 + (wx1 - wx0) * (k + .5) / 5 - .6 * s, wy1 - 3 * s, 1 * s, .5 * s) for k in range(5)], '#f6cf86')
    ly = wy0 + (wy1 - wy0) * .44 - 1.6 * s
    for k in range(3):
        bx0 = wx0 + 2 * s + k * (wx1 - wx0 - 4 * s) / 3
        r.blob(bx0 + 3.4 * s, ly, 3.6 * s, 1.4 * s, '#c98a3a', .4 * s, n=9, wob=.02)
        r.lines([[(bx0 + 1.8 * s + j * 1.5 * s, ly - .9 * s), (bx0 + 2.6 * s + j * 1.5 * s, ly + .7 * s)] for j in range(3)], .3 * s, color='#f6cf86')
    r.line([((wx0 + wx1) / 2, wy0), ((wx0 + wx1) / 2, wy1)], .5 * s, jitter=False)
    if lit:
        r.ellipse((wx0 + wx1) / 2, y + 6 * s, 20 * s, 4 * s, P['win'], op=.35, blur=True)
        r.ellipse((wx0 + wx1) / 2, (wy0 + wy1) / 2, 14 * s, 9 * s, '#ffcf6e', op=.25, blur=True)
    aw0, aw1, at, ab = wx0 - 3.5 * s, wx1 + 3.5 * s, wy0 - 4.2 * s, wy0 + 1.2 * s
    n = 6
    for i in range(n):
        a0, a1 = aw0 + (aw1 - aw0) * i / n, aw0 + (aw1 - aw0) * (i + 1) / n
        r.shape([(a0 + .6 * s, at), (a1 + .6 * s, at), (a1, ab), ((a0 + a1) / 2, ab + 1.6 * s), (a0, ab)], P['white'] if i % 2 else '#c8402f', .4 * s)
    if r.winter:
        r.shape([(aw0, at - .3 * s), (aw1 + 1 * s, at - .3 * s), (aw1, at - 1.8 * s), (aw0 + 1 * s, at - 1.8 * s)], P['snow'], .3 * s)
    # the door with a little window, the step
    quad(r, x + Wf * .72, y - Hw * .66, x + Wf * .93, y, '#7b4a2c', .7 * s)
    quad(r, x + Wf * .76, y - Hw * .6, x + Wf * .89, y - Hw * .38, P['win'] if lit else P['glass'], .35 * s)
    quad(r, x + Wf * .68, y - .5, x + Wf * .97, y + 2.4 * s, P['grey'], .5 * s)
    # the pretzel on its bracket off the left corner, swinging
    bxx, byy = x - 1 * s, y - Hw * .86
    r.line([(bxx, byy), (bxx - 15 * s, byy)], 1.0 * s)
    r.line([(bxx, byy + 5 * s), (bxx - 6 * s, byy)], .6 * s)
    r.blob(bxx - 15 * s, byy, .9 * s, .9 * s, P['grey_s'], .3 * s, n=6)
    r.group(lambda: pretzel_sign(r, s * .74), bxx - 9.5 * s, byy, 'sway')
    # by the door: flour sacks and a trolley with a tray of loaves
    if not r.winter:
        for k, (sx2, sy2) in enumerate(((x + Wf + 4 * s, y + 4 * s), (x + Wf + 9.6 * s, y + 3 * s), (x + Wf + 6.8 * s, y - 2 * s))):
            r.blob(sx2, sy2 - 3.4 * s, 3.3 * s, 3.8 * s, '#f4efe2', .5 * s, n=9, wob=.06)
            r.line([(sx2 - 1.4 * s, sy2 - 7 * s), (sx2 + 1.4 * s, sy2 - 7 * s)], .5 * s, jitter=False)
            r.line([(sx2 - 1.8 * s, sy2 - 3 * s), (sx2 + 1.8 * s, sy2 - 3 * s)], .4 * s, color='#c8402f', jitter=False)
        tx, ty = x + Wf + 19 * s, y + 3 * s
        r.shadow([(tx - 8 * s, ty), (tx + 12 * s, ty - 1 * s), (tx + 15 * s, ty + 2.4 * s), (tx - 6 * s, ty + 2.6 * s)], .6)
        quad(r, tx - 9 * s, ty - 7 * s, tx + 9 * s, ty - 5.4 * s, P['logs'], .45 * s)
        r.lines([[(tx - 8 * s, ty - 5.4 * s), (tx - 8 * s, ty - 1.4 * s)], [(tx + 8 * s, ty - 5.4 * s), (tx + 8 * s, ty - 1.4 * s)], [(tx + 9 * s, ty - 6.4 * s), (tx + 12.6 * s, ty - 10 * s)]], .55 * s)
        r.dots([(tx - 6 * s + k * 4 * s, ty - 8.2 * s, 2.1 * s, 1.4 * s) for k in range(4)], '#d9963e', .35 * s)
        r.dots([(tx - 6.5 * s + k * 4 * s, ty - 8.7 * s, .9 * s, .45 * s) for k in range(4)], '#f6cf86')
        for wx in (tx - 6 * s, tx + 6 * s):
            r.blob(wx, ty - 1.4 * s, 1.5 * s, 1.5 * s, P['grey_s'], .35 * s, n=8, wob=.02)
    else:
        r.blob(x + Wf * .5, y + 1, Wf * .58, 2.8 * s, P['snow'], .5 * s, n=12, wob=.08)
        for k, (sx2, sy2) in enumerate(((x + Wf + 5 * s, y + 4 * s), (x + Wf + 11 * s, y + 3 * s))):
            r.blob(sx2, sy2 - 3.4 * s, 3.3 * s, 3.8 * s, '#f4efe2', .5 * s, n=9, wob=.06)
            r.blob(sx2, sy2 - 7 * s, 2.6 * s, 1 * s, P['snow'], .3 * s, n=7)
    r.roof = (x + Wf * .3, y - Hw - G - 3 * s)


def chef_hat(r, x, y, k, s):
    """A chef's toque centred at (x, y): a puffed top over a band."""
    P = r.P
    r.dots([(x - 2.6 * k, y - 2.4 * k, 2.6 * k, 2.4 * k), (x + 2.6 * k, y - 2.4 * k, 2.6 * k, 2.4 * k), (x, y - 3.6 * k, 3 * k, 2.8 * k)], P['white'], .4 * s)
    quad(r, x - 3.6 * k, y - 1.2 * k, x + 3.6 * k, y + 2 * k, P['white'], .4 * s)
    r.lines([[(x - 1.2 * k, y - .6 * k), (x - 1.2 * k, y + 1.6 * k)], [(x + 1.2 * k, y - .6 * k), (x + 1.2 * k, y + 1.6 * k)]], .3 * s, op=.6)


def samovar(r, x, y, k, s, hot=True):
    """A brass samovar on a table: a round belly, a crown with a teapot on it, taps and handles."""
    brass, brass_s = '#d4a03c', '#9e6f24'
    quad(r, x - 1.6 * k, y - 1.4 * k, x + 1.6 * k, y, brass_s, .3 * s)
    r.blob(x, y - 5 * k, 3.4 * k, 3.8 * k, brass, .45 * s, n=12, wob=.01)
    r.blob(x - 1.2 * k, y - 6.4 * k, 1 * k, 1.6 * k, '#f6d98c', 0, n=7, ink=False)
    quad(r, x - 1.8 * k, y - 9.6 * k, x + 1.8 * k, y - 8.4 * k, brass_s, .3 * s)
    r.blob(x, y - 11 * k, 1.9 * k, 1.5 * k, '#f6eedb', .3 * s, n=8)
    r.lines([[(x + 3.2 * k, y - 4 * k), (x + 5 * k, y - 3.4 * k)], [(x - 3.4 * k, y - 7 * k), (x - 4.6 * k, y - 5.6 * k)], [(x + 3.4 * k, y - 7 * k), (x + 4.6 * k, y - 5.6 * k)]], .45 * s)
    if hot:
        r.add(f'<path d="M{fmt(x)} {fmt(y - 12.6 * k)}q{fmt(-1.4 * k)} {fmt(-2 * k)} 0 {fmt(-4 * k)}q{fmt(1.4 * k)} {fmt(-2 * k)} 0 {fmt(-4 * k)}" class="kn" stroke="#ffffff" stroke-width="{fmt(.7 * s)}" opacity=".7"/>')


def terrace_table(r, x, y, s, cloth, chairs=True, cups=True):
    """A round café table with a cloth, two chairs, cups on it."""
    P = r.P
    if chairs:
        for sd in (-1, 1):
            cx = x + sd * 6.4 * s
            r.lines([[(cx, y), (cx, y - 4.4 * s), (cx + sd * .8 * s, y - 9 * s)], [(cx - sd * 2.6 * s, y), (cx - sd * 2.6 * s, y - 4.4 * s)]], .55 * s)
            r.line([(cx - sd * 3 * s, y - 4.4 * s), (cx + sd * .4 * s, y - 4.4 * s)], .9 * s, color=P['logs_s'], jitter=False)
    r.line([(x, y), (x, y - 5.6 * s)], .7 * s, jitter=False)
    r.line([(x - 2.4 * s, y), (x + 2.4 * s, y)], .7 * s, jitter=False)
    r.shape([(x - 5.2 * s, y - 5.2 * s), (x + 5.2 * s, y - 5.2 * s), (x + 4.4 * s, y - 7.6 * s), (x - 4.4 * s, y - 7.6 * s)], cloth, .45 * s)
    r.lines([[(x - 4.8 * s + k * 1.9 * s, y - 7.5 * s), (x - 5 * s + k * 1.9 * s, y - 5.3 * s)] for k in range(1, 5)], .35 * s, color=P['white'], op=.7)
    if cups:
        r.dots([(x - 2 * s, y - 8.3 * s, .9 * s, .7 * s), (x + 2.2 * s, y - 8.3 * s, .9 * s, .7 * s)], P['white'], .25 * s)


def restaurant(r, cx, y, s=1.0, lit=False):
    """The restaurant «Печь»: a long log house with carved frames and a broad Russian-stove chimney; a big signboard
    on the roof with a chef's hat and the word «РЕСТОРАН»; in front a summer terrace under a striped awning with
    tables, a samovar and string lights; a chalk menu board on an easel; a waiter with a tray. Winter: the terrace
    is cleared, the lights still burn, the samovar steams in the window. Sets r.roof for the bubble."""
    P = r.P
    x = cx - 30 * s
    W_ = 60
    wall = 'logs'
    g = long_house(r, x, y, s, wall=wall, roof='tes', frame=P['white'], shutters=False, lit=lit, W_=W_, H_=32, D_=22,
                   wins=[.15, .85], frames=['#c8402f'])
    Wl, Hw, G, Dd, dy = g['Wl'], g['Hw'], g['G'], g['Dd'], g['dy']
    # the stove chimney: a broad whitewashed stack with a hood, smoke going up
    chx, chy = x + Wl * .84, y - Hw - G * .6
    quad(r, chx - 6 * s, chy - 16 * s, chx + 6 * s, chy + 2 * s, P['plaster'], .8 * s)
    r.shape([(chx + 6 * s, chy + 2 * s), (chx + 9 * s, chy + .6 * s), (chx + 9 * s, chy - 17.4 * s), (chx + 6 * s, chy - 16 * s)], dark(P['plaster'], .22), .5 * s, shade=True)
    quad(r, chx - 7.4 * s, chy - 19 * s, chx + 10.2 * s, chy - 15.8 * s, P['brick'], .6 * s)
    r.shape([(chx - 5 * s, chy - 19 * s), (chx + 8 * s, chy - 19 * s), (chx + 6.4 * s, chy - 22 * s), (chx - 3.4 * s, chy - 22 * s)], P['brick_s'], .5 * s)
    if r.winter:
        r.blob(chx + 1.4 * s, chy - 22.4 * s, 5.6 * s, 1.3 * s, P['snow'], .35 * s, n=8)
    smoke(r, chx + 1.4 * s, chy - 26 * s, s * 1.15)
    # the big signboard on the roof: a chef's hat, crossed spoon and fork, «РЕСТОРАН»
    sx, sy = x + Wl * .45, y - Hw - G * .42
    sw, sh = 42 * s, 13 * s
    for px in (sx - sw * .32, sx + sw * .32):
        r.line([(px, sy + sh / 2), (px, sy + sh / 2 + 6 * s)], .9 * s, jitter=False)
    quad(r, sx - sw / 2, sy - sh / 2, sx + sw / 2, sy + sh / 2, '#7a2f22', .9 * s + .1)
    quad(r, sx - sw / 2 + 1.4 * s, sy - sh / 2 + 1.4 * s, sx + sw / 2 - 1.4 * s, sy + sh / 2 - 1.4 * s, '#8f3a2a', .35 * s, iop=.6)
    chef_hat(r, sx - sw / 2 + 7 * s, sy + .4 * s, 1.15 * s, s)
    sign_text(r, sx + 4.6 * s, sy + 2.3 * s, 'РЕСТОРАН', 6 * s, '#f6e2a8', width=sw - 16 * s)
    if r.winter:
        r.shape([(sx - sw / 2 - .4 * s, sy - sh / 2 - .2 * s), (sx + sw / 2 + .4 * s, sy - sh / 2 - .2 * s), (sx + sw / 2 - 1 * s, sy - sh / 2 - 1.8 * s), (sx - sw / 2 + 1 * s, sy - sh / 2 - 1.8 * s)], P['snow'], .3 * s)
    if lit:
        r.ellipse(sx, sy, sw * .6, sh * .9, P['win'], op=.16, blur=True)
    # the door in the middle with a lantern each side
    dx = x + Wl * .5
    quad(r, dx - 10 * s, y - .5, dx + 10 * s, y + 2.6 * s, P['grey'], .6 * s)
    quad(r, dx - 5.4 * s, y - 20 * s, dx + 5.4 * s, y - .5, '#6a3a24', .7 * s)
    r.line([(dx, y - 20 * s), (dx, y - .5)], .4 * s, jitter=False)
    quad(r, dx - 4.2 * s, y - 18.6 * s, dx - 1 * s, y - 12 * s, P['win'] if lit else P['glass'], .3 * s)
    quad(r, dx + 1 * s, y - 18.6 * s, dx + 4.2 * s, y - 12 * s, P['win'] if lit else P['glass'], .3 * s)
    for lx in (dx - 8.4 * s, dx + 8.4 * s):
        r.line([(lx, y - 20 * s), (lx, y - 17.4 * s)], .4 * s, jitter=False)
        r.shape([(lx - 1.4 * s, y - 17.4 * s), (lx + 1.4 * s, y - 17.4 * s), (lx + 1 * s, y - 13.4 * s), (lx - 1 * s, y - 13.4 * s)], '#ffd36b', .35 * s)
        r.ellipse(lx, y - 15.4 * s, 3 * s, 3 * s, '#ffd36b', op=.25 if not lit else .45, blur=True)
    # string lights along the eaves
    x0, x1, ly = x + 1 * s, x + Wl - 1 * s, y - Hw + 2.4 * s
    r.add(f'<path d="M{fmt(x0)} {fmt(ly)}Q{fmt((x0 * 3 + x1) / 4)} {fmt(ly + 5 * s)} {fmt((x0 + x1) / 2)} {fmt(ly)}Q{fmt((x0 + x1 * 3) / 4)} {fmt(ly + 5 * s)} {fmt(x1)} {fmt(ly)}" class="k" stroke-width=".35"/>')
    lamps = []
    for k in range(14):
        t = (k + .5) / 14
        half = t * 2 if t < .5 else (t - .5) * 2
        lamps.append((x0 + (x1 - x0) * t, ly + 2.5 * s * 4 * half * (1 - half) + .9 * s, .95 * s, .95 * s))
    r.dots(lamps, '#ffd36b' if lit else '#f3c454', .25)
    if lit:
        r.ellipse(x + Wl / 2, ly + 2 * s, Wl * .5, 4 * s, P['win'], op=.22, blur=True)
    # the summer terrace on the left: a plank deck with two tables under striped café umbrellas, the samovar on one;
    # in winter the umbrellas are folded, the chairs stacked under the snow
    tx0, tx1 = x - 31 * s, x - 2 * s
    ty = y + 3 * s
    deck = [(tx0 - 2 * s, ty + 1.6 * s), (tx1 + 2 * s, ty + 1.6 * s), (tx1 + 4 * s, ty - 4 * s), (tx0 + 2 * s, ty - 4 * s)]
    r.shadow([(tx0, ty), (tx1 + 14 * s, ty - 2 * s), (tx1 + 20 * s, ty + 4 * s), (tx0 + 4 * s, ty + 5 * s)], .6)
    r.shape(deck, P['snow'] if r.winter else light(P['grey'], .15), .5 * s)
    r.lines([[(tx0 + (tx1 - tx0) * k / 6, ty + 1.5 * s), (tx0 + 2 * s + (tx1 - tx0 + 2 * s) * k / 6, ty - 4 * s)] for k in range(1, 6)], .3 * s, op=.4)
    for k, ux in enumerate((tx0 + 8 * s, tx1 - 7 * s)):
        if not r.winter:
            terrace_table(r, ux, ty - .4 * s, s * 1.1, '#f1e7cf', cups=k == 0)
        if k == 1:
            continue
        r.line([(ux, ty - 6 * s), (ux, ty - 24 * s)], .7 * s, jitter=False)
        if not r.winter:
            R, top = 12 * s, ty - 24 * s
            for i in range(6):
                a0, a1 = -R + 2 * R * i / 6, -R + 2 * R * (i + 1) / 6
                col = '#c8402f' if i % 2 == 0 else P['white']
                r.shape([(ux + a0 * .12, top - 4.6 * s + abs(a0) / R * 4.6 * s * .1), (ux + a1 * .12, top - 4.6 * s + abs(a1) / R * 4.6 * s * .1), (ux + a1, top + 1.6 * s - (1 - (a1 / R) ** 2) * 1.6 * s), ((ux + (a0 + a1) / 2), top + 2.6 * s), (ux + a0, top + 1.6 * s - (1 - (a0 / R) ** 2) * 1.6 * s)], col, .45 * s)
            r.blob(ux, top - 5 * s, .8 * s, .8 * s, P['white'], .25 * s, n=6)
        else:
            r.shape([(ux - 1.8 * s, ty - 9 * s), (ux + 1.8 * s, ty - 9 * s), (ux + .6 * s, ty - 24 * s), (ux - .6 * s, ty - 24 * s)], mix('#c8402f', P['white'], .3), .4 * s)
            r.blob(ux, ty - 24.6 * s, 1.4 * s, .8 * s, P['snow'], .25 * s, n=6)
    if not r.winter:
        samovar(r, tx1 - 7 * s, ty - 8.4 * s, 1.05 * s, s)
    else:
        r.blob(tx0 + 9 * s, ty - 3 * s, 7 * s, 3 * s, P['snow'], .5 * s, n=10, wob=.06)
        r.lines([[(tx0 + 4 * s, ty - 2 * s), (tx0 + 5 * s, ty - 9 * s)], [(tx0 + 13 * s, ty - 2 * s), (tx0 + 12.4 * s, ty - 9 * s)]], .6 * s)
        r.blob(tx1 - 9 * s, ty - 2.6 * s, 5 * s, 2.4 * s, P['snow'], .45 * s, n=9, wob=.06)
    # string lights from the umbrella to the eaves, over the samovar's table
    ux1, uy = tx0 + 8 * s, ty - 24 * s
    r.add(f'<path d="M{fmt(ux1)} {fmt(uy - 2 * s)}Q{fmt((ux1 + x) / 2)} {fmt(uy + 4 * s)} {fmt(x + 1 * s)} {fmt(ly)}" class="k" stroke-width=".35"/>')
    r.dots([(ux1 + (x + 1 * s - ux1) * t, uy - 2 * s + (ly - uy + 2 * s) * t + 3 * s * 4 * t * (1 - t), .9 * s, .9 * s) for t in (.3, .6, .85)], '#ffd36b' if lit else '#f3c454', .25)
    # the menu board on an easel by the door, a waiter with a tray
    mx0 = x + Wl + 6 * s
    my = y + 6 * s
    r.lines([[(mx0 - 3.6 * s, my), (mx0 - 1.2 * s, my - 15 * s)], [(mx0 + 3.6 * s, my), (mx0 + 1.2 * s, my - 15 * s)], [(mx0, my - 13 * s), (mx0 + 1.6 * s, my)]], .6 * s)
    r.shape([(mx0 - 4.6 * s, my - 4 * s), (mx0 + 4.6 * s, my - 4 * s), (mx0 + 3.6 * s, my - 15.4 * s), (mx0 - 3.6 * s, my - 15.4 * s)], '#34403a', .55 * s)
    sign_text(r, mx0, my - 12.2 * s, 'МЕНЮ', 2.6 * s, '#f6f1e4', width=6.2 * s, weight=700)
    r.lines([[(mx0 - 2.6 * s, my - 10 * s + k * 1.8 * s), (mx0 + (1.6 - .4 * k) * s, my - 10 * s + k * 1.8 * s)] for k in range(3)], .35 * s, color='#f6f1e4', op=.8)
    if r.winter:
        r.shape([(mx0 - 3.7 * s, my - 15.6 * s), (mx0 + 3.7 * s, my - 15.6 * s), (mx0 + 2.8 * s, my - 16.8 * s), (mx0 - 2.8 * s, my - 16.8 * s)], P['snow'], .25 * s)
    if not r.winter:
        wx, wy = tx1 + 6 * s, y + 7 * s
        person(r, wx, wy, s * 1.05, coat='#f6eedb', kind='man')
        quad(r, wx - 2.4 * s, wy - 7.8 * s, wx + 2.4 * s, wy - 4.6 * s, '#2b2b2b', .25 * s)
        r.line([(wx + 2.4 * s, wy - 9.5 * s), (wx + 6 * s, wy - 11.6 * s)], .6 * s, color='#f6eedb')
        r.line([(wx + 3.6 * s, wy - 12.6 * s), (wx + 9 * s, wy - 12.6 * s)], .8 * s, color=P['grey_s'], jitter=False)
        r.dots([(wx + 5 * s, wy - 13.6 * s, 1 * s, .8 * s), (wx + 7.6 * s, wy - 13.6 * s, 1 * s, .8 * s)], P['white'], .25 * s)
    r.roof = (x + Wl * .36, sy - sh / 2 - 1 * s)


def bakery_c(r, cx, y, s=1.0, lit=False):
    bakery(r, cx, y, s, lit)


# ---------------------------------------------------------------- the square
def palych(r, cx, y, s=1.0):
    """Palych on his bench: cap, grey beard, a padded jacket, a stick; the cat beside him."""
    P = r.P
    r.shadow([(cx - 12 * s, y), (cx + 16 * s, y - 1 * s), (cx + 22 * s, y + 3 * s), (cx - 10 * s, y + 4 * s)], .7)
    bench(r, cx - 13 * s, y, 1.45 * s)
    bx, by = cx - 2 * s, y - 7 * s
    jacket = mix(P['coat3'], P['grey_s'], .35)
    r.line([(bx + 1 * s, by), (bx + 5 * s, by + .3 * s), (bx + 5.4 * s, y)], 1.3 * s, color=dark(P['coat1'], .4), jitter=False)
    r.line([(bx - 1 * s, by), (bx + 3 * s, by + .6 * s), (bx + 3.2 * s, y)], 1.3 * s, color=dark(P['coat1'], .3), jitter=False)
    r.shape([(bx - 3.6 * s, by + .4 * s), (bx + 2.8 * s, by + .4 * s), (bx + 2.4 * s, by - 9 * s), (bx - 3 * s, by - 9 * s)], jacket, .45 * s + .05)
    r.blob(bx - .2 * s, by - 11 * s, 2.3 * s, 2.5 * s, P['skin'], .4 * s, n=8, wob=.02)
    r.shape([(bx - 1.8 * s, by - 10.2 * s), (bx + 1.6 * s, by - 10.4 * s), (bx + .8 * s, by - 7.6 * s), (bx - 1 * s, by - 7.6 * s)], '#e9e4dc', .3 * s)
    r.shape([(bx - 2.8 * s, by - 12.3 * s), (bx - 2.2 * s, by - 14.2 * s), (bx + 2 * s, by - 14.2 * s), (bx + 2.4 * s, by - 12.6 * s), (bx + 4.4 * s, by - 12.2 * s)], P['grey_s'], .4 * s)
    r.line([(bx + 3.6 * s, by - 5 * s), (bx + 7 * s, y)], .7 * s, color=P['logs_s'])
    r.rim([(bx - 3.6 * s, by), (bx - 3 * s, by - 9 * s)], .5 * s, .5)
    cat(r, cx + 9 * s, y - 6.8 * s, .9 * s)


def fair_stall(r, cx, y, s=1.0):
    """A market stall: a plank table under a striped awning, vegetables in heaps."""
    P = r.P
    w = 34 * s
    x = cx - w / 2
    r.shadow([(x, y), (x + w + 10 * s, y - 2 * s), (x + w + 16 * s, y + 4 * s), (x + 4 * s, y + 5 * s)], .7)
    for px in (x + 2 * s, x + w - 2 * s):
        r.line([(px, y), (px, y - 26 * s)], .9 * s)
    r.shape([(x - 1 * s, y - 9 * s), (x + w + 1 * s, y - 9 * s), (x + w + 1 * s, y - 12 * s), (x - 1 * s, y - 12 * s)], P['logs'], .6 * s)
    r.shape([(x, y - 9 * s), (x + w, y - 9 * s), (x + w, y - 1 * s), (x, y - 1 * s)], P['logs_s'], .6 * s, shade=True)
    goods = [('#cf4b3a', -11), ('#e08a3a', -3), ('#e9d9a8', 5), ('#6f9a4a', 12)]
    for col, gx in goods:
        r.dots([(cx + gx * s + dx * s, y - 13.4 * s + dy * s, 1.7 * s, 1.4 * s) for dx, dy in ((-1.6, 0), (1.6, 0), (0, -1.6))], col, .3 * s)
    # the awning: blue and white stripes with a scalloped edge
    top, bot = y - 30 * s, y - 22 * s
    n = 6
    for i in range(n):
        a0, a1 = x - 3 * s + (w + 6 * s) * i / n, x - 3 * s + (w + 6 * s) * (i + 1) / n
        col = '#3f6fb0' if i % 2 == 0 else P['white']
        r.shape([(a0 + 2 * s, top), (a1 + 2 * s, top), (a1, bot), ((a0 + a1) / 2, bot + 2 * s), (a0, bot)], col, .45 * s)
    r.line([(x - 1 * s, top), (x + w + 5 * s, top)], .7 * s)
    if r.winter:
        r.shape([(x - 1 * s, top - .5), (x + w + 5 * s, top - .5), (x + w + 3 * s, top - 2.4 * s), (x + 1 * s, top - 2.4 * s)], P['snow'], .3 * s)


def signpost(r, cx, y, s=1.0, arms=(('Кубань', 1), ('Алтай', 1))):
    P = r.P
    r.shadow([(cx - 2 * s, y), (cx + 20 * s, y - 1 * s), (cx + 24 * s, y + 3 * s), (cx, y + 4 * s)], .6)
    r.shape([(cx - 1.4 * s, y + 1), (cx + 1.4 * s, y + 1), (cx + 1.2 * s, y - 44 * s), (cx - 1.2 * s, y - 44 * s)], P['grey_s'], .6 * s)
    for i, (label, d) in enumerate(arms):
        ay = y - 40 * s + i * 11 * s
        L = 34 * s
        x0 = cx - 4 * s if d > 0 else cx + 4 * s
        x1 = x0 + d * L
        r.shape([(x0, ay), (x1, ay), (x1 + d * 4 * s, ay + 4 * s), (x1, ay + 8 * s), (x0, ay + 8 * s)], light(P['logs'], .25 if i % 2 else .15), .6 * s)
        r.add(f'<text x="{fmt((x0 + x1) / 2)}" y="{fmt(ay + 6 * s)}" text-anchor="middle" font-size="{fmt(6.4 * s)}" font-weight="700" fill="{P["ink"]}">{label}</text>')
        if r.winter:
            r.shape([(x0, ay - .3), (x1, ay - .3), (x1 - 1 * s, ay - 1.8 * s), (x0 + 1 * s, ay - 1.8 * s)], P['snow'], .25 * s)
    r.shape([(cx - 2.4 * s, y - 44 * s), (cx + 2.4 * s, y - 44 * s), (cx, y - 47 * s)], P['tes'], .5 * s)


# ---------------------------------------------------------------- the farm
def barn(r, cx, y, s=1.0):
    """The barn (амбар): a log storehouse on stone corners, its roof running out over a double plank door with
    iron straps and a padlock; a ramp to the door, sacks by the wall."""
    P = r.P
    Wf, Hw, G, Dd = 56 * s, 34 * s, 26 * s, 40 * s
    dy = Dd * .42
    x = cx - (Wf + Dd) / 2 + 2 * s
    lift = 5 * s
    yb = y - lift
    r.shadow([(x + Wf, y), (x + Wf + Dd, y - dy), (x + Wf + Dd + 44 * s, y - dy + 15 * s), (x + Wf + 30 * s, y + 14 * s), (x + 6 * s, y + 6 * s)])
    wall, wall_s = mix(P['logs'], P['grey'], .55), mix(P['logs_s'], P['grey_s'], .55)
    for sx0 in (x + 1 * s, x + Wf - 6 * s, x + Wf + Dd - 5 * s):
        sy0 = y - (dy if sx0 > x + Wf else 0)
        r.blob(sx0 + 2.5 * s, sy0 - 2.2 * s, 3.4 * s, 2.6 * s, P['grey'], .5 * s, n=7)
    side = [(x + Wf, yb), (x + Wf + Dd, yb - dy), (x + Wf + Dd, yb - Hw - dy), (x + Wf, yb - Hw)]
    r.shape(side, wall_s, 1.0 * s + .2, shade=True)
    r.lines([[(x + Wf, yb - Hw * i / 8), (x + Wf + Dd, yb - Hw * i / 8 - dy)] for i in range(1, 8)], .35 * s + .1, op=.45)
    ov = 6 * s
    rs = [(x + Wf + ov, yb - Hw + 1 * s), (x + Wf / 2, yb - Hw - G), (x + Wf / 2 + Dd, yb - Hw - G - dy), (x + Wf + ov + Dd, yb - Hw - dy + 1 * s)]
    # the roof runs out forward over the door: its front edge stands proud of the wall
    rs_f = [(rs[0][0] - 3 * s, rs[0][1] + 3 * s), (rs[1][0] - 3 * s, rs[1][1] + 1.6 * s), rs[2], rs[3]]
    r.shape(rs_f, P['tes_s'], 1.0 * s + .2, shade=True)
    r.lines([[(rs_f[0][0] + (rs_f[1][0] - rs_f[0][0]) * i / 7, rs_f[0][1] + (rs_f[1][1] - rs_f[0][1]) * i / 7), (rs_f[0][0] + (rs_f[1][0] - rs_f[0][0]) * i / 7 + Dd + 3 * s, rs_f[0][1] + (rs_f[1][1] - rs_f[0][1]) * i / 7 - dy - 1.5 * s)] for i in range(1, 7)], .3 * s + .1, op=.5)
    if r.winter:
        roof_cap(r, rs_f, s)
    fac = [(x, yb), (x + Wf, yb), (x + Wf, yb - Hw), (x, yb - Hw)]
    r.shape(fac, wall, 1.25 * s + .2)
    r.lines([[(x + 1, yb - Hw * i / 8), (x + Wf - 1, yb - Hw * i / 8)] for i in range(1, 8)], .35 * s + .1, op=.45)
    r.dots([(xx, yb - Hw * (i + .5) / 8, 2.1 * s, 1.9 * s) for xx in (x - 1.2 * s, x + Wf + 1.2 * s) for i in range(8)], light(wall, .2), .4 * s + .05)
    r.rim([(x - 1.2 * s, yb - 1), (x - 1.2 * s, yb - Hw)], .9 * s)
    gab = [(x - 8 * s, yb - Hw + 3 * s), (x + Wf / 2, yb - Hw - G - 1 * s), (x + Wf + 8 * s, yb - Hw + 3 * s)]
    r.shape([(x, yb - Hw), (x + Wf / 2, yb - Hw - G + 2 * s), (x + Wf, yb - Hw)], P['grey'], 1.0 * s + .1)
    r.lines([[(x + Wf * i / 8, yb - Hw - .5), (x + Wf * i / 8, yb - Hw - (G - 2 * s) * (1 - abs(i / 8 - .5) * 2) + 1.5)] for i in range(1, 8)], .3 * s + .1, op=.45)
    for (ax, ay), (bx2, by2) in [(gab[0], gab[1]), (gab[1], gab[2])]:
        nx, ny = (by2 - ay), -(bx2 - ax)
        L = math.hypot(nx, ny)
        nx, ny = nx / L * 3 * s, ny / L * 3 * s
        r.shape([(ax, ay), (bx2, by2), (bx2 + nx, by2 + ny), (ax + nx, ay + ny)], P['tes'], .8 * s + .15)
    r.rim([gab[0], gab[1]], .9 * s)
    if r.winter:
        r.shape([(gab[0][0], gab[0][1] - 1 * s), gab[1], (gab[1][0] + 3 * s, gab[1][1] + 2 * s), (gab[0][0] + 3 * s, gab[0][1] + 1 * s)], P['snow'], .6 * s)
    # a small vent window in the gable
    r.shape([(x + Wf / 2 - 3 * s, yb - Hw - 6 * s), (x + Wf / 2 + 3 * s, yb - Hw - 6 * s), (x + Wf / 2 + 3 * s, yb - Hw - 11 * s), (x + Wf / 2 - 3 * s, yb - Hw - 11 * s)], '#3a2a1f', .4 * s)
    # the double door with iron straps and a padlock
    d0, d1, dt = x + Wf * .2, x + Wf * .8, yb - Hw * .82
    r.shape([(d0 - 2 * s, yb), (d1 + 2 * s, yb), (d1 + 2 * s, dt - 2 * s), (d0 - 2 * s, dt - 2 * s)], P['logs_s'], .8 * s)
    for a0, a1 in ((d0, (d0 + d1) / 2), ((d0 + d1) / 2, d1)):
        r.shape([(a0, yb), (a1, yb), (a1, dt), (a0, dt)], mix(P['logs'], P['grey'], .3), .7 * s)
        r.lines([[(a0 + (a1 - a0) * k / 4, yb - .5), (a0 + (a1 - a0) * k / 4, dt + .5)] for k in range(1, 4)], .3 * s, op=.5)
    r.lines([[(d0, yb - (yb - dt) * f), (d1, yb - (yb - dt) * f)] for f in (.25, .75)], 1.0 * s, color=dark(P['grey_s'], .35))
    r.shape([((d0 + d1) / 2 - 1.6 * s, yb - Hw * .4), ((d0 + d1) / 2 + 1.6 * s, yb - Hw * .4), ((d0 + d1) / 2 + 1.6 * s, yb - Hw * .4 + 3 * s), ((d0 + d1) / 2 - 1.6 * s, yb - Hw * .4 + 3 * s)], '#d9a441', .3 * s)
    # the ramp
    r.shape([(d0, yb), (d1, yb), (d1 + 3 * s, y + 4 * s), (d0 - 3 * s, y + 4 * s)], P['grey'], .6 * s)
    r.lines([[(d0 - 3 * s * k / 3, yb + (y + 4 * s - yb) * k / 3), (d1 + 3 * s * k / 3, yb + (y + 4 * s - yb) * k / 3)] for k in (1, 2)], .3 * s, op=.5)
    if r.winter:
        r.blob(x + Wf * .5, y + 1, Wf * .6, 2.6 * s, P['snow'], .5 * s, n=12, wob=.08)
    else:
        # sacks by the wall
        for i, (sx2, sy2) in enumerate(((x + Wf + 4 * s, y + 3 * s), (x + Wf + 11 * s, y + 2 * s), (x + Wf + 7 * s, y - 3 * s))):
            r.blob(sx2, sy2 - 3.4 * s, 3.4 * s, 3.8 * s, '#efe4c8', .5 * s, n=8, wob=.06)
            r.line([(sx2 - 1.4 * s, sy2 - 7 * s), (sx2 + 1.4 * s, sy2 - 7 * s)], .5 * s, jitter=False)


def lab(r, cx, y, s=1.0, lit=False):
    """The lab: a small white plastered house under a green roof, a round sign with a flask on its gable, a glass
    greenhouse joined on to the right."""
    P = r.P
    Wf, Hw, G, Dd = 40 * s, 28 * s, 16 * s, 24 * s
    dy = Dd * .42
    x = cx - 48 * s
    r.shadow([(x + Wf, y), (x + Wf + Dd + 30 * s, y - dy), (x + Wf + Dd + 70 * s, y - dy + 12 * s), (x + Wf + 40 * s, y + 12 * s), (x + 6 * s, y + 6 * s)])
    # the greenhouse first: it stands to the right, partly behind the house's side
    gx0, gx1, gh = x + Wf + 6 * s, x + Wf + 48 * s, 20 * s
    gd = 18 * s
    r.shape([(gx1, y - 2 * s), (gx1 + gd, y - 2 * s - gd * .42), (gx1 + gd, y - 2 * s - gd * .42 - gh), (gx1, y - 2 * s - gh)], '#cfe6e4', .7 * s, op=.85)
    r.shape([(gx0, y - 2 * s - gh), (gx1, y - 2 * s - gh), (gx1 + gd, y - 2 * s - gh - gd * .42), (gx0 + gd, y - 2 * s - gh - gd * .42)], '#e4f2f0', .7 * s, op=.9)
    r.shape([(gx0, y - 2 * s), (gx1, y - 2 * s), (gx1, y - 2 * s - gh), (gx0, y - 2 * s - gh)], '#cfe6e4', .9 * s, op=.85)
    if not r.winter:
        r.dots([(gx0 + (gx1 - gx0) * (k + .5) / 7, y - 6 * s - (k % 2) * 2 * s, 2.6 * s, 2.2 * s) for k in range(7)], P['leaf'], .3 * s, op=.9, cls='lf')
    r.lines([[(gx0 + (gx1 - gx0) * k / 5, y - 2 * s), (gx0 + (gx1 - gx0) * k / 5, y - 2 * s - gh), (gx0 + (gx1 - gx0) * k / 5 + gd, y - 2 * s - gh - gd * .42)] for k in range(1, 5)] + [[(gx0, y - 2 * s - gh * .5), (gx1, y - 2 * s - gh * .5)]], .4 * s, color=P['white'])
    r.add(f'<path d="{D([(gx0 + 2 * s, y - 4 * s - gh * .8), (gx0 + 12 * s, y - 4 * s - gh * .8), (gx0 + 2 * s, y - 4 * s)])}" fill="#fff" opacity=".45"/>')
    if r.winter:
        r.shape([(gx0, y - 2 * s - gh - .5), (gx1, y - 2 * s - gh - .5), (gx1 + gd, y - 2 * s - gh - gd * .42 - .5), (gx0 + gd, y - 2 * s - gh - gd * .42 - .5), (gx0 + gd * .5, y - 2 * s - gh - gd * .2)], P['snow'], .5 * s)
    # the house
    r.shape([(x + Wf, y), (x + Wf + Dd, y - dy), (x + Wf + Dd, y - Hw - dy), (x + Wf, y - Hw)], dark(P['white'], .18), 1.0 * s + .2, shade=True)
    window(r, x + Wf + Dd * .5, y - Hw * .55 - dy * .5, s * .8, P['white'], lit, False, kind='plain')
    rs = [(x + Wf + 3 * s, y - Hw), (x + Wf / 2, y - Hw - G), (x + Wf / 2 + Dd, y - Hw - G - dy), (x + Wf + 3 * s + Dd, y - Hw - dy)]
    r.shape(rs, P['iron_g_s'], 1.0 * s + .2, shade=True)
    if r.winter:
        roof_cap(r, rs, s)
    r.shape([(x, y), (x + Wf, y), (x + Wf, y - Hw), (x, y - Hw)], P['white'], 1.2 * s + .2)
    r.rim([(x - .8, y - 1), (x - .8, y - Hw)], .9 * s)
    r.shape([(x - 3 * s, y - Hw), (x + Wf / 2, y - Hw - G), (x + Wf + 3 * s, y - Hw)], P['iron_g'], 1.0 * s + .2)
    r.shape([(x + 1 * s, y - Hw - .5), (x + Wf / 2, y - Hw - G + 2.4 * s), (x + Wf - 1 * s, y - Hw - .5)], P['white'], .5 * s)
    if r.winter:
        r.shape([(x - 3 * s, y - Hw - .5), (x + Wf / 2, y - Hw - G - 1.4 * s), (x + Wf + 3 * s, y - Hw - .5), (x + Wf / 2, y - Hw - G + 3 * s)], P['snow'], .5 * s)
    window(r, x + Wf * .3, y - Hw * .55, s * 1.05, P['green'], lit, False, kind='plain')
    r.shape([(x + Wf * .6, y), (x + Wf * .86, y), (x + Wf * .86, y - Hw * .72), (x + Wf * .6, y - Hw * .72)], P['green'], .7 * s)
    r.shape([(x + Wf * .55, y + 2.4 * s), (x + Wf * .92, y + 2.4 * s), (x + Wf * .92, y - .5), (x + Wf * .55, y - .5)], P['grey'], .5 * s)
    # the sign: a flask with green liquid, bubbles rising out of it
    fx, fy = x + Wf / 2, y - Hw - G * .5 + 3 * s
    r.blob(fx, fy, 5 * s, 5 * s, P['white'], .6 * s, n=10, wob=.02)
    r.shape([(fx - 1 * s, fy - 3.4 * s), (fx + 1 * s, fy - 3.4 * s), (fx + 1 * s, fy - 1 * s), (fx + 3 * s, fy + 2.6 * s), (fx - 3 * s, fy + 2.6 * s), (fx - 1 * s, fy - 1 * s)], '#9fe08a', .4 * s)
    r.add(f'<g class="bubbling" transform="translate({fmt(fx)} {fmt(fy - 5 * s)})"><circle r="{fmt(.9 * s)}" fill="#9fe08a" stroke="{P["ink"]}" stroke-width=".3"/>'
          f'<circle cx="{fmt(1.6 * s)}" cy="{fmt(-2.4 * s)}" r="{fmt(.7 * s)}" fill="#9fe08a" stroke="{P["ink"]}" stroke-width=".3" style="animation-delay:-.9s"/></g>')


def meteo(r, cx, y, s=1.0):
    """The met station: a white louvred screen on legs, a mast with the cups and the vane, a rain gauge."""
    P = r.P
    r.shadow([(cx - 10 * s, y), (cx + 22 * s, y - 2 * s), (cx + 28 * s, y + 3 * s), (cx - 6 * s, y + 4 * s)], .6)
    bx0, bx1, bt, bb = cx - 12 * s, cx + 2 * s, y - 28 * s, y - 16 * s
    for lx in (bx0 + 1.5 * s, bx1 - 1.5 * s):
        r.line([(lx, y), (lx, bb)], .8 * s, jitter=False)
    r.shape([(bx1, bb), (bx1 + 5 * s, bb - 2 * s), (bx1 + 5 * s, bt - 2 * s), (bx1, bt)], dark(P['white'], .2), .6 * s, shade=True)
    r.shape([(bx0, bb), (bx1, bb), (bx1, bt), (bx0, bt)], P['white'], .8 * s)
    r.lines([[(bx0 + 1, bt + (bb - bt) * k / 6), (bx1 - 1, bt + (bb - bt) * k / 6 + 1 * s)] for k in range(1, 6)], .3 * s, op=.6)
    r.shape([(bx0 - 1.5 * s, bt), (bx1 + 6.5 * s, bt - 2.4 * s), (bx1 + 4 * s, bt - 5 * s), (bx0, bt - 3 * s)], P['white'], .6 * s)
    if r.winter:
        r.shape([(bx0 - 1.5 * s, bt - .5), (bx1 + 6.5 * s, bt - 2.9 * s), (bx1 + 4 * s, bt - 6 * s), (bx0, bt - 4 * s)], P['snow'], .4 * s)
    mx = cx + 12 * s
    r.line([(mx, y), (mx, y - 50 * s)], 1.0 * s)
    r.line([(mx - 4 * s, y), (mx, y - 12 * s), (mx + 4 * s, y)], .5 * s, jitter=False)

    def cups():
        r.lines([[(-6 * s, 0), (6 * s, 0)], [(0, -6 * s), (0, 6 * s)]], .6 * s)
        r.dots([(6 * s, 0, 1.6 * s, 1.3 * s), (-6 * s, 0, 1.6 * s, 1.3 * s), (0, 6 * s, 1.6 * s, 1.3 * s), (0, -6 * s, 1.6 * s, 1.3 * s)], P['white'], .4 * s)
    r.group(cups, mx, y - 51 * s, 'cups')
    r.add(f'<g transform="translate({fmt(mx)} {fmt(y - 42 * s)})"><path class="vane k" d="M{fmt(-6 * s)} 0H{fmt(6 * s)}M{fmt(3.4 * s)} {fmt(-2 * s)}L{fmt(6 * s)} 0L{fmt(3.4 * s)} {fmt(2 * s)}M{fmt(-6 * s)} 0l{fmt(2 * s)} {fmt(-2.6 * s)}M{fmt(-6 * s)} 0l{fmt(2 * s)} {fmt(2.6 * s)}" stroke-width="{fmt(.9 * s)}"/></g>')
    r.see([(mx - 8 * s, y - 58 * s), (mx + 8 * s, y)])
    gx = cx - 17 * s
    r.shape([(gx - 2.2 * s, y), (gx + 2.2 * s, y), (gx + 2.2 * s, y - 9 * s), (gx - 2.2 * s, y - 9 * s)], P['grey'], .5 * s)
    r.ellipse(gx, y - 9 * s, 2.2 * s, .8 * s, dark(P['grey'], .3))


# ---------------------------------------------------------------- the building plot
def lot(r, cx, y, w=50, d=24):
    """An empty plot to build on: a dashed outline in the grass and a white sign with a red cross."""
    P = r.P
    x = cx - w / 2
    pts = [(x + 4, y - d), (x + w + 2, y - d - 2), (x + w + 6, y), (x, y + 2)]
    r.see(pts)
    r.add(f'<path d="{D(pts)}" fill="{P["snow"] if r.winter else light(P["g4"], .25)}" fill-opacity=".55" class="kf" stroke-width=".8" stroke-dasharray="3 2.4"/>')
    px = x + 8
    r.line([(px, y - d * .4), (px, y - d - 16)], 1.0)
    r.shape([(px - 7, y - d - 26), (px + 7, y - d - 26), (px + 7, y - d - 14), (px - 7, y - d - 14)], P['white'], .7)
    r.line([(px, y - d - 23.5), (px, y - d - 16.5)], 1.4, color=P['accent'], jitter=False)
    r.line([(px - 3.5, y - d - 20), (px + 3.5, y - d - 20)], 1.4, color=P['accent'], jitter=False)
    pegs = [(x + w + 2, y - d - 2), (x + w + 6, y), (x, y + 2)]
    r.lines([[(px2, py2), (px2, py2 - 4)] for px2, py2 in pegs], .9)


# ---------------------------------------------------------------- the neighbours' gifts
def swing(r, cx, y, s=1.0):
    P = r.P
    r.shadow([(cx - 12 * s, y), (cx + 14 * s, y - 1 * s), (cx + 20 * s, y + 3 * s), (cx - 10 * s, y + 4 * s)], .6)
    for sd in (-1, 1):
        r.line([(cx + sd * 13 * s, y), (cx + sd * 9 * s, y - 27 * s), (cx + sd * 5 * s, y)], 1.0 * s)
    r.line([(cx - 11 * s, y - 27 * s), (cx + 11 * s, y - 27 * s)], 1.3 * s)

    def seat():
        r.lines([[(-3.6 * s, 0), (-3.6 * s, 18 * s)], [(3.6 * s, 0), (3.6 * s, 18 * s)]], .4 * s)
        r.shape([(-5.4 * s, 18 * s), (5.4 * s, 18 * s), (5.4 * s, 20.2 * s), (-5.4 * s, 20.2 * s)], P['accent'], .5 * s)
    r.group(seat, cx, y - 27 * s, 'swing')


def oven(r, cx, y, s=1.0):
    """An outdoor Russian oven: a whitewashed dome on a brick base, a fire in its mouth, logs beside it."""
    P = r.P
    r.shadow([(cx - 12 * s, y), (cx + 16 * s, y - 2 * s), (cx + 22 * s, y + 3 * s), (cx - 10 * s, y + 4 * s)], .7)
    r.shape([(cx - 12 * s, y), (cx + 12 * s, y), (cx + 12 * s, y - 7 * s), (cx - 12 * s, y - 7 * s)], P['brick'], .7 * s)
    r.lines([[(cx - 12 * s, y - 3.5 * s), (cx + 12 * s, y - 3.5 * s)]], .3 * s, op=.5)
    dome = [(cx - 11 * s, y - 7 * s), (cx - 10 * s, y - 15 * s), (cx - 4 * s, y - 21 * s), (cx + 4 * s, y - 21 * s), (cx + 10 * s, y - 15 * s), (cx + 11 * s, y - 7 * s)]
    r.shape(dome, P['plaster'], .8 * s, curve=True)
    r.shape([(cx - 4 * s, y - 7 * s), (cx + 4 * s, y - 7 * s), (cx + 4 * s, y - 13 * s), (cx, y - 15 * s), (cx - 4 * s, y - 13 * s)], '#3a2a1f', .4 * s)
    r.add(f'<path class="fire" d="{D([(cx - 3 * s, y - 7.4 * s), (cx - 1.6 * s, y - 11 * s), (cx - .4 * s, y - 9 * s), (cx + .6 * s, y - 12 * s), (cx + 2.6 * s, y - 7.4 * s)])}" fill="#f6a03a"/>')
    r.shape([(cx + 4 * s, y - 18 * s), (cx + 8 * s, y - 18 * s), (cx + 8 * s, y - 25 * s), (cx + 4 * s, y - 25 * s)], P['brick'], .5 * s)
    if r.winter:
        r.shape([(cx - 9 * s, y - 16 * s), (cx - 4 * s, y - 21.6 * s), (cx + 4 * s, y - 21.6 * s), (cx + 9 * s, y - 16 * s), (cx, y - 18 * s)], P['snow'], .4 * s, curve=True)
    woodpile(r, cx + 13 * s, y + 1, .45 * s)


def honor_board(r, cx, y, s=1.0):
    """The board of honour: a red board on two posts with a white header, photographs and a star."""
    P = r.P
    r.shadow([(cx - 12 * s, y), (cx + 18 * s, y - 1 * s), (cx + 22 * s, y + 3 * s), (cx - 10 * s, y + 3 * s)], .6)
    for px in (cx - 12 * s, cx + 12 * s):
        r.line([(px, y), (px, y - 14 * s)], 1.1 * s)
    r.shape([(cx - 16 * s, y - 13 * s), (cx + 16 * s, y - 13 * s), (cx + 16 * s, y - 34 * s), (cx - 16 * s, y - 34 * s)], P['accent'], .8 * s)
    r.shape([(cx - 13 * s, y - 29 * s), (cx + 13 * s, y - 29 * s), (cx + 13 * s, y - 32.4 * s), (cx - 13 * s, y - 32.4 * s)], P['white'], .4 * s)
    photos = [(cx + (-10 + 6.7 * k) * s, y - (21 + 6 * row) * s) for row in (0, 1) for k in range(4)][:7]
    for px, py in photos:
        r.shape([(px - 2.2 * s, py + 2.6 * s), (px + 2.2 * s, py + 2.6 * s), (px + 2.2 * s, py - 2.6 * s), (px - 2.2 * s, py - 2.6 * s)], P['white'], .3 * s)
    r.dots([(px, py - .4 * s, .9 * s, 1 * s) for px, py in photos], P['grey_s'])
    st = [(cx + math.cos(-math.pi / 2 + i * math.pi / 5) * (3.4 if i % 2 == 0 else 1.4) * s, y - 38 * s + math.sin(-math.pi / 2 + i * math.pi / 5) * (3.4 if i % 2 == 0 else 1.4) * s) for i in range(10)]
    r.shape(st, '#e9b44c', .4 * s)
    if r.winter:
        r.shape([(cx - 16 * s, y - 34.3 * s), (cx + 16 * s, y - 34.3 * s), (cx + 14 * s, y - 36 * s), (cx - 14 * s, y - 36 * s)], P['snow'], .3 * s)


def gazebo(r, cx, y, s=1.0):
    """A gazebo with a tent roof; a table with a samovar under it."""
    P = r.P
    r.shadow([(cx - 18 * s, y), (cx + 22 * s, y - 2 * s), (cx + 30 * s, y + 4 * s), (cx - 14 * s, y + 5 * s)], .7)
    r.shape([(cx - 18 * s, y), (cx + 18 * s, y), (cx + 15 * s, y - 4 * s), (cx - 15 * s, y - 4 * s)], P['grey'], .6 * s)
    for px in (cx - 12 * s, cx + 12 * s):
        r.line([(px, y - 3 * s), (px, y - 24 * s)], .9 * s)
    # the table and the samovar
    r.shape([(cx - 8 * s, y - 9 * s), (cx + 8 * s, y - 9 * s), (cx + 8 * s, y - 10.6 * s), (cx - 8 * s, y - 10.6 * s)], P['logs'], .4 * s)
    r.lines([[(cx - 6 * s, y - 9 * s), (cx - 6 * s, y - 3 * s)], [(cx + 6 * s, y - 9 * s), (cx + 6 * s, y - 3 * s)]], .5 * s)
    r.blob(cx, y - 14 * s, 3.2 * s, 3.4 * s, '#c9973a', .45 * s, n=9, wob=.02)
    r.shape([(cx - 1.4 * s, y - 17 * s), (cx + 1.4 * s, y - 17 * s), (cx + 1 * s, y - 19.4 * s), (cx - 1 * s, y - 19.4 * s)], dark('#c9973a', .3), .3 * s)
    r.line([(cx + 3 * s, y - 13 * s), (cx + 5 * s, y - 12 * s)], .5 * s, jitter=False)
    r.line([(cx - 3.4 * s, y - 15 * s), (cx - 5 * s, y - 13.4 * s)], .4 * s, jitter=False)
    # the tent roof
    roof = [(cx - 17 * s, y - 23 * s), (cx + 17 * s, y - 23 * s), (cx, y - 37 * s)]
    r.shape(roof, P['iron_g'], .9 * s)
    r.shape([(cx + 17 * s, y - 23 * s), (cx + 21 * s, y - 25.5 * s), (cx, y - 37 * s)], P['iron_g_s'], .7 * s, shade=True)
    r.shape([(cx - 17 * s, y - 23 * s), (cx + 17 * s, y - 23 * s), (cx + 17 * s, y - 21 * s), (cx - 17 * s, y - 21 * s)], P['white'], .4 * s)
    r.line([(cx, y - 37 * s), (cx, y - 41 * s)], .6 * s)
    r.blob(cx, y - 41.5 * s, 1 * s, 1 * s, '#e9b44c', .3 * s, n=6)
    if r.winter:
        r.shape([(cx - 15 * s, y - 24 * s), (cx, y - 37.6 * s), (cx + 15 * s, y - 24 * s), (cx + 4 * s, y - 27 * s), (cx - 6 * s, y - 26 * s)], P['snow'], .4 * s)


def desk(r, cx, y, s=1.0):
    """The college's gift: a study table in the yard with books, a microscope and a small blackboard."""
    P = r.P
    r.shadow([(cx - 14 * s, y), (cx + 18 * s, y - 1 * s), (cx + 24 * s, y + 3 * s), (cx - 12 * s, y + 4 * s)], .6)
    r.shape([(cx - 14 * s, y - 10 * s), (cx + 12 * s, y - 10 * s), (cx + 15 * s, y - 13 * s), (cx - 11 * s, y - 13 * s)], P['logs'], .6 * s)
    r.lines([[(cx - 12 * s, y - 10 * s), (cx - 12 * s, y)], [(cx + 10 * s, y - 10 * s), (cx + 10 * s, y)], [(cx + 13.5 * s, y - 12 * s), (cx + 13.5 * s, y - 3 * s)]], .8 * s)
    for i, col in enumerate((P['blue'], P['accent'], P['coat3'])):
        r.shape([(cx - 9 * s, y - 13 * s - i * 1.6 * s), (cx - 2 * s, y - 13 * s - i * 1.6 * s), (cx - 2 * s, y - 14.4 * s - i * 1.6 * s), (cx - 9 * s, y - 14.4 * s - i * 1.6 * s)], col, .3 * s)
    r.lines([[(cx + 4 * s, y - 13 * s), (cx + 7 * s, y - 13 * s)], [(cx + 5.5 * s, y - 13 * s), (cx + 5.5 * s, y - 19 * s), (cx + 3 * s, y - 21 * s)]], .9 * s)
    r.blob(cx + 2.6 * s, y - 21.4 * s, 1.2 * s, 1 * s, P['grey_s'], .3 * s, n=6)
    # the little blackboard on its easel
    bx = cx + 20 * s
    r.lines([[(bx - 5 * s, y), (bx - 2 * s, y - 22 * s)], [(bx + 5 * s, y), (bx + 2 * s, y - 22 * s)]], .7 * s)
    r.shape([(bx - 6 * s, y - 8 * s), (bx + 6 * s, y - 8 * s), (bx + 5 * s, y - 20 * s), (bx - 5 * s, y - 20 * s)], '#3d5a4a', .6 * s)
    r.lines([[(bx - 3 * s, y - 16 * s), (bx + 2 * s, y - 16 * s)], [(bx - 3 * s, y - 13 * s), (bx + 3 * s, y - 13 * s)]], .4 * s, color='#f6f1e4', op=.8)


# ---------------------------------------------------------------- the farmstead
# The player's house grows with its level (TRACKS.house): 1 «Изба», 2 «Погреб», 3 «Мастерская», 4 «Кабинет»,
# 5 «Усадьба». Every level keeps what the one before had and adds its own: the izba with its woodpile, the cellar
# mound, the workshop with the sawhorse, the light room under the gable with a balcony and carved frames, the
# columned front, the garden and the fence with a gate. Measures are in s from the house's centre x and its ground.
def woodstack(r, x, y, s):
    """A free-standing woodpile (поленница) with log ends showing, under a little plank roof."""
    P = r.P
    w, h = 26 * s, 12 * s
    r.shadow([(x, y), (x + w + 8 * s, y - 2 * s), (x + w + 12 * s, y + 3 * s), (x + 2 * s, y + 3 * s)], .6)
    quad(r, x, y - h, x + w, y, P['logs_s'], .7 * s)
    ends = []
    for row in range(4):
        for i in range(8 - row % 2):
            ends.append((x + 1.9 * s + (i + (row % 2) * .5) * 3.2 * s, y - 1.6 * s - row * 3 * s, 1.6 * s, 1.45 * s))
    r.dots(ends, light(P['logs'], .25), .35 * s)
    r.dots([(ex + .2 * s, ey + .1 * s, .45 * s, .4 * s) for ex, ey, _, _ in ends[::3]], P['logs_s'])
    for px in (x + .6 * s, x + w - .6 * s):
        r.line([(px, y), (px, y - h - 2 * s)], .8 * s, jitter=False)
    r.shape([(x - 3 * s, y - h - 1 * s), (x + w + 3 * s, y - h - 1 * s), (x + w + 1 * s, y - h - 5 * s), (x - 1 * s, y - h - 5 * s)], P['tes'], .6 * s)
    if r.winter:
        r.shape([(x - 3.2 * s, y - h - 1.4 * s), (x + w + 3.2 * s, y - h - 1.4 * s), (x + w + .6 * s, y - h - 6 * s), (x - .6 * s, y - h - 6 * s)], P['snow'], .4 * s)


def cellar(r, x, y, s):
    """The cellar (погреб): a turf mound with a vent pipe, its plank door under a little gable facing the yard."""
    P = r.P
    w = 30 * s
    r.shadow([(x - w * .4, y), (x + w * .7, y - 2 * s), (x + w * .9, y + 3 * s), (x - w * .3, y + 3 * s)], .5)
    turf = P['snow'] if r.winter else mix(P['g3'], P['leaf'], .35)
    mound = [(x - w / 2, y), (x - w * .42, y - 5 * s), (x - w * .26, y - 9.6 * s), (x, y - 12 * s), (x + w * .26, y - 9.6 * s), (x + w * .42, y - 5 * s), (x + w / 2, y)]
    r.shape(mound, turf, .7 * s, curve=False)
    if not r.winter:
        r.shape([(x + 1 * s, y - 12 * s), (x + w * .26, y - 9.6 * s), (x + w * .42, y - 5 * s), (x + w / 2, y), (x + 4 * s, y)], dark(turf, .12), 0, ink=False, shade=True)
        r.lines([[(x + dx * s, y - hh * s), (x + (dx + .5) * s, y - (hh + 2.4) * s)] for dx, hh in ((-11, 3), (-8, 6.5), (6, 9.4), (10, 6.6), (13, 2.8))], .4 * s, color=dark(turf, .35))
    else:
        r.shape([(x + 1 * s, y - 12 * s), (x + w * .26, y - 9.6 * s), (x + w * .42, y - 5 * s), (x + w / 2, y), (x + 4 * s, y)], P['snow_s'], 0, ink=False, op=.35)
    # the vent pipe on top
    quad(r, x + 5 * s, y - 16.6 * s, x + 7.6 * s, y - 10 * s, P['grey_s'], .45 * s)
    quad(r, x + 4.2 * s, y - 18 * s, x + 8.4 * s, y - 16.4 * s, P['tes'], .4 * s)
    # the portal: a plank door with a gable over it, stone sides
    px = x - 4 * s
    quad(r, px - 6.4 * s, y - 9 * s, px + 6.4 * s, y, P['grey'], .6 * s)
    quad(r, px - 4 * s, y - 8 * s, px + 4 * s, y, P['logs_s'], .55 * s)
    r.lines([[(px - 1.3 * s, y - 8 * s), (px - 1.3 * s, y - .4 * s)], [(px + 1.3 * s, y - 8 * s), (px + 1.3 * s, y - .4 * s)]], .3 * s, op=.6)
    r.line([(px + 2.6 * s, y - 4.4 * s), (px + 2.6 * s, y - 3.6 * s)], .7 * s, color='#d9a441', jitter=False)
    r.shape([(px - 8.4 * s, y - 8.6 * s), (px + 8.4 * s, y - 8.6 * s), (px, y - 14.6 * s)], P['tes'], .6 * s)
    if r.winter:
        r.shape([(px - 8.6 * s, y - 9 * s), (px, y - 15.2 * s), (px + 8.6 * s, y - 9 * s), (px, y - 12.4 * s)], P['snow'], .35 * s)
        r.blob(x + 6.3 * s, y - 18.3 * s, 2.4 * s, .8 * s, P['snow'], .2 * s, n=6)


def workshop(r, x1, y, s, lit=False):
    """The workshop (мастерская): a plank lean-to against the house's left end, its wide door open on a wall of
    tools; x1 is where it meets the house."""
    P = r.P
    w, hb, ht = 32 * s, 22 * s, 30 * s
    x0 = x1 - w
    yb = y - 3 * s
    quad(r, x0, yb - hb, x1, yb, P['grey'], .9 * s + .1)
    r.shape([(x0, yb - hb), (x1, yb - ht), (x1, yb - hb)], P['grey'], .0, ink=False)
    r.lines([[(x0 + w * k / 9, yb - .5), (x0 + w * k / 9, yb - hb - (ht - hb) * k / 9 + .5)] for k in range(1, 9)], .3 * s, op=.45)
    r.rim([(x0 - .5, yb - 1), (x0 - .5, yb - hb)], .8 * s)
    # the open door: the dark inside, a saw, an axe, a hammer and a plane on the back wall, the bench's edge
    d0, d1 = x0 + 7 * s, x0 + 23 * s
    dt = yb - 17 * s
    inside = '#3b2b20' if not lit else '#6b4626'
    quad(r, d0, dt, d1, yb, inside, .6 * s)
    if lit:
        r.ellipse((d0 + d1) / 2, yb - 8 * s, 9 * s, 7 * s, P['win'], op=.3, blur=True)
    tool = '#d9d2c4'
    r.shape([(d0 + 1.6 * s, dt + 3 * s), (d0 + 6.6 * s, dt + 2.6 * s), (d0 + 6.6 * s, dt + 5 * s), (d0 + 2.2 * s, dt + 6.4 * s)], tool, .3 * s)
    quad(r, d0 + 6.6 * s, dt + 2.2 * s, d0 + 8.2 * s, dt + 5.2 * s, P['logs'], .25 * s)
    r.line([(d0 + 10.6 * s, dt + 2 * s), (d0 + 10.6 * s, dt + 8.4 * s)], .7 * s, color=P['logs'], jitter=False)
    r.shape([(d0 + 9.2 * s, dt + 2 * s), (d0 + 12.6 * s, dt + 2 * s), (d0 + 12.2 * s, dt + 4.4 * s), (d0 + 10.6 * s, dt + 4 * s)], tool, .25 * s)
    r.line([(d0 + 14 * s, dt + 3 * s), (d0 + 14 * s, dt + 8 * s)], .6 * s, color=P['logs'], jitter=False)
    quad(r, d0 + 12.8 * s, dt + 2.2 * s, d0 + 15.2 * s, dt + 3.4 * s, tool, .25 * s)
    quad(r, d0 + .8 * s, yb - 7 * s, d1 - .8 * s, yb - 5.6 * s, P['logs'], .3 * s)
    r.dots([(d0 + 4 * s, yb - 7.8 * s, 1.2 * s, .6 * s)], '#e8c27a')
    # the door leaf swung open to the left
    r.shape([(d0, yb), (d0 - 6 * s, yb + 2 * s), (d0 - 6 * s, dt + 1.6 * s), (d0, dt)], light(P['grey'], .08), .55 * s)
    r.lines([[(d0 - 2 * s, yb + .4 * s), (d0 - 2 * s, dt + .6 * s)], [(d0 - 4 * s, yb + 1.2 * s), (d0 - 4 * s, dt + 1.2 * s)]], .3 * s, op=.5)
    # the lean-to roof, sloping down to the left from the house
    rf = [(x0 - 4 * s, yb - hb + 1.5 * s), (x1 + 1 * s, yb - ht - 1.5 * s), (x1 + 1 * s, yb - ht - 4.4 * s), (x0 - 4 * s, yb - hb - 1.6 * s)]
    r.shape(rf, P['tes_s'], .9 * s + .1)
    r.lines([[(x0 - 4 * s + (w + 5 * s) * k / 8, yb - hb + 1.5 * s - (ht - hb + 3 * s) * k / 8), (x0 - 4 * s + (w + 5 * s) * k / 8, yb - hb - 1.6 * s - (ht - hb + 2.8 * s) * k / 8)] for k in range(1, 8)], .3 * s, op=.5)
    if r.winter:
        r.shape([(x0 - 4.2 * s, yb - hb - 1.6 * s), (x1 + 1 * s, yb - ht - 4.8 * s), (x1 + 1 * s, yb - ht - 7 * s), (x0 - 3 * s, yb - hb - 3.8 * s)], P['snow'], .45 * s)
    # planks leaning on the wall at the left
    for k in range(3):
        r.shape([(x0 - 6 * s + k * 1.8 * s, yb + 1 * s), (x0 - 3.6 * s + k * 1.8 * s, yb + 1 * s), (x0 + 1.6 * s + k * 1.8 * s, yb - 19 * s + k * 1 * s), (x0 - .6 * s + k * 1.8 * s, yb - 19 * s + k * 1 * s)], light(P['logs'], .2 + .08 * k), .4 * s)


def sawhorse(r, x, y, s):
    """A sawhorse (козлы) with a log on it, a bow saw in the cut, sawdust below."""
    P = r.P
    r.shadow([(x - 8 * s, y), (x + 10 * s, y - 1 * s), (x + 13 * s, y + 2.4 * s), (x - 6 * s, y + 2.6 * s)], .6)
    if not r.winter:
        r.blob(x, y + .4 * s, 6 * s, 1.2 * s, '#ead7a8', 0, n=8, ink=False)
    for ox in (-5 * s, 5 * s):
        r.lines([[(x + ox - 3 * s, y), (x + ox + 2.4 * s, y - 8.6 * s)], [(x + ox + 3 * s, y), (x + ox - 2.4 * s, y - 8.6 * s)]], .8 * s)
    r.line([(x - 5 * s, y - 4.6 * s), (x + 5 * s, y - 4.6 * s)], .6 * s, jitter=False)
    quad(r, x - 11 * s, y - 10.8 * s, x + 11 * s, y - 6.8 * s, P['logs'], .6 * s)
    r.blob(x - 11 * s, y - 8.8 * s, 1.5 * s, 2 * s, light(P['logs'], .3), .4 * s, n=8)
    r.lines([[(x + 1 * s, y - 15 * s), (x - 1 * s, y - 7.4 * s)], [(x + 1 * s, y - 15 * s), (x + 8 * s, y - 15 * s), (x + 6 * s, y - 7.4 * s)]], .6 * s, color=P['logs_s'])
    r.line([(x - 1 * s, y - 7.6 * s), (x + 6 * s, y - 7.6 * s)], .5 * s, color=P['grey_s'], jitter=False)
    if r.winter:
        r.blob(x, y - 11.4 * s, 10 * s, 1 * s, P['snow'], .3 * s, n=8)


def gable_balcony(r, cx, gy, w, s, lit=False):
    """The light room under the gable (светёлка): a tall carved window and a balcony with balusters in front of it
    on two brackets; gy is the eaves line it stands on."""
    P = r.P
    frame = P['blue']
    wx, wy = cx, gy - 10 * s
    # the window-door with a carved crown
    window(r, wx, wy, s * .95, frame, lit, False, kind='izba')
    # the balcony: the floor, the rail, balusters, brackets under it
    fy = gy + .6 * s
    quad(r, cx - w / 2, fy - 1.8 * s, cx + w / 2, fy, P['white'], .55 * s)
    for sd in (-1, 1):
        bx = cx + sd * (w / 2 - 3 * s)
        r.shape([(bx - 1.2 * s, fy), (bx + 1.2 * s, fy), (bx + sd * 2.4 * s, fy + 5 * s)], P['white'], .45 * s)
    quad(r, cx - w / 2, fy - 8.6 * s, cx + w / 2, fy - 7.4 * s, P['white'], .45 * s)
    bal = []
    nb = int(w / (2.2 * s))
    for k in range(nb + 1):
        bx = cx - w / 2 + .6 * s + (w - 1.2 * s) * k / nb
        bal.append([(bx, fy - 1.8 * s), (bx, fy - 7.4 * s)])
    r.lines(bal, .9 * s, color=P['ink'])
    r.lines(bal, .5 * s, color=P['white'])
    if r.winter:
        r.blob(cx, fy - 9 * s, w * .52, .9 * s, P['snow'], .25 * s, n=10)


def portico(r, x0, x1, y, Hw, s):
    """Four white columns in front of the gable facade, so the house's own gable is its pediment; steps up."""
    P = r.P
    trim = P['white']
    for k in range(3):
        quad(r, x0 - (4 - k * 1.3) * s, y - (k + 1) * 1.5 * s, x1 + (4 - k * 1.3) * s, y - k * 1.5 * s + (1 * s if k == 0 else 0), light(P['grey'], .12 * k), .5 * s)
    quad(r, x0 - 2 * s, y - Hw - 1 * s, x1 + 2 * s, y - Hw + 3.2 * s, trim, .7 * s)
    for k in range(4):
        cx = x0 + 2.4 * s + (x1 - x0 - 4.8 * s) * k / 3
        quad(r, cx - 2.1 * s, y - Hw + 3.2 * s, cx + 2.1 * s, y - 4.5 * s, trim, .55 * s)
        r.line([(cx + 1 * s, y - Hw + 4 * s), (cx + 1 * s, y - 5 * s)], .4 * s, color=dark(trim, .22), jitter=False)
        quad(r, cx - 3 * s, y - 6 * s, cx + 3 * s, y - 4.5 * s, trim, .35 * s)
        quad(r, cx - 3 * s, y - Hw + 3.2 * s, cx + 3 * s, y - Hw + 4.8 * s, trim, .35 * s)
    r.rim([(x0 - 2 * s, y - Hw + 3 * s), (x0 + .4 * s, y - 4.6 * s)], .7 * s)


def manor_fence(r, x0, x1, y, s, gate):
    """A painted picket fence (штакетник) with square posts, and a gate between two tall posts with ball caps, its
    two leaves standing open into the yard (gate: the posts' x)."""
    P = r.P
    paint, post = '#f3efe6', '#e2dccf'
    g0, g1 = gate
    h = 9 * s
    for a, b in ((x0, g0 - 1.5 * s), (g1 + 1.5 * s, x1)):
        if b - a < 2:
            continue
        r.lines([[(a, y - h * .32), (b, y - h * .32)], [(a, y - h * .76), (b, y - h * .76)]], 1.1 * s, color=dark(P['grey'], .15))
        xx, i = a + .6 * s, 0
        while xx < b - 2 * s:
            r.shape([(xx, y), (xx + 1.9 * s, y), (xx + 1.9 * s, y - h), (xx + .95 * s, y - h - 1.4 * s), (xx, y - h)], paint, .3 * s + .1)
            if r.winter:
                r.blob(xx + .95 * s, y - h - .8 * s, 1.3 * s, .7 * s, P['snow'], .2, n=6, ink=False)
            xx += 3 * s
            i += 1
        k = a + 18 * s
        while k < b - 6 * s:
            quad(r, k - 1.2 * s, y - h - 1.2 * s, k + 1.2 * s, y + .5 * s, post, .4 * s)
            k += 18 * s
    for gx in (g0 - 1.5 * s, g1 + 1.5 * s):
        quad(r, gx - 1.6 * s, y - h - 7 * s, gx + 1.6 * s, y + .6 * s, post, .55 * s)
        r.blob(gx, y - h - 8.4 * s, 1.6 * s, 1.5 * s, P['white'], .4 * s, n=8, wob=.02)
        if r.winter:
            r.blob(gx, y - h - 9.6 * s, 1.5 * s, .7 * s, P['snow'], .2 * s, n=6)
    # the two leaves swung open, seen at a slant
    gm = (g0 + g1) / 2
    for a, b in ((g0, gm - 1 * s), (g1, gm + 1 * s)):
        top = [(a, y - h * .95), (b, y - h * 1.15 - 2 * s)]
        r.shape([(a, y - .5 * s), (b, y - 3 * s), top[1], top[0]], paint, .4 * s)
        r.lines([[(a + (b - a) * k / 4, y - .5 * s - 2.5 * s * k / 4), (a + (b - a) * k / 4, y - h * .95 - (h * .2 + 2 * s) * k / 4)] for k in (1, 2, 3)], .3 * s, op=.5)
    if r.winter:
        r.blob((x0 + x1) / 2, y + .6, (x1 - x0) * .52, 2 * s, P['snow'], .35 * s, n=16, wob=.06)


def manor_garden(r, cx, y, s, gate, fy):
    """The manor's front garden: a flagstone path from the steps to the gate, flower beds either side of it, round
    shrubs at their ends; the painted fence across the front at fy."""
    P = r.P
    gm = (gate[0] + gate[1]) / 2
    stones = [(cx - 12 * s + (gm - cx + 12 * s) * k / 6 + (k % 2 - .5) * .8 * s, y + 3.6 * s + (fy - y - 6 * s) * k / 6, 2.8 * s, 1.05 * s) for k in range(7)]
    if not r.winter:
        r.dots(stones, light(P['grey'], .25), .3 * s)
        for b0, b1 in ((cx - 40 * s, cx - 20 * s), (cx - 4 * s, cx + 18 * s)):
            bed = [(b0, y + 6 * s), (b1, y + 6 * s), (b1 + 1 * s, y + 13 * s), (b0 - 1 * s, y + 13 * s)]
            r.shape(bed, P['soil_l'], .4 * s)
            flowers(r, b0 + 1 * s, b1 - 1 * s, y + 8 * s, y + 13 * s, 7)
        for bx, br in ((cx - 45 * s, 4.4), (cx + 23 * s, 4)):
            by = y + 12 * s
            r.blob(bx + .6 * s, by - br * .6 * s + .6, br * s, br * .8 * s, P['leaf_d'], 0, n=9, ink=False)
            r.blob(bx, by - br * .7 * s, br * s * .9, br * .75 * s, P['leaf'], .45 * s, n=9, bumps=4, cls='lf')
    else:
        r.dots(stones, P['snow_s'], op=.45)
        for bx in (cx - 45 * s, cx + 23 * s):
            r.blob(bx, y + 9 * s, 4 * s, 2.6 * s, P['snow'], .4 * s, n=9)
    manor_fence(r, cx - 86 * s, cx + 52 * s, fy, s, gate)


def homestead(r, cx, y, s=1.0, lit=False, level=4):
    """The player's house at its level 1..5 (see above). Its centre x and ground line stay where they are; from level
    3 on the yard reaches 92 s to the left of the centre, at level 5 the fence runs 30 s in front of the house."""
    P = r.P
    lv = max(1, min(5, int(level)))
    x = cx - 45 * s
    Wf, Hw = 66 * s, 40 * s
    if lv >= 3:
        workshop(r, x + 2 * s, y, s, lit)
    izba(r, x, y, s, roof='iron_g' if lv >= 5 else 'tes', frame=P['blue'] if lv >= 4 else light(P['grey'], .12), shutters=False,
         svetelka=lv >= 4, porch=True, lit=lit, smoke_on=True, carved=lv >= 4, gable_win=lv <= 3)
    if lv >= 4:
        gable_balcony(r, x + Wf / 2, y - Hw, 24 * s, s, lit)
    if lv >= 5:
        portico(r, x + 1 * s, x + Wf - 1 * s, y, Hw, s)
        # a carved ridge piece (конёк) on the gable's peak
        px, py = x + Wf / 2, y - Hw - 30 * s - 2 * s
        r.shape([(px - .8 * s, py + 1 * s), (px + .8 * s, py + 1 * s), (px + 1.6 * s, py - 4 * s), (px + 4 * s, py - 6.4 * s), (px + 2 * s, py - 7.4 * s), (px - .4 * s, py - 5 * s)], P['white'], .45 * s)
    if lv >= 3:
        woodstack(r, cx - 84 * s, y + 21 * s, s)
        sawhorse(r, cx - 46 * s, y + 15 * s, s * .9)
    else:
        woodstack(r, cx - 76 * s, y + 10 * s, s)
    if lv >= 2:
        cellar(r, cx + 34 * s, y + 20 * s, s * 1.15)
    if lv == 4 and not r.winter:
        flowers(r, x + 2 * s, x + 60 * s, y + 3 * s, y + 9 * s, 12)
    if lv >= 5:
        manor_garden(r, cx, y, s, gate=(cx - 20 * s, cx - 4 * s), fy=y + 30 * s)


# ---------------------------------------------------------------- the house being built
def scaffold(r, cx, y, s=1.0, stage=2):
    """The house under construction, drawn over the homestead that stands now (same cx, y, s as homestead()): the
    new level shows only when it is finished. Three stages by the share of the work done:
    1 — the materials are brought (a stack of logs, a pallet of bricks), the first two poles and a plank on trestles;
    2 — scaffolding round the walls: poles, two decks along the front and the side, braces, a ladder;
    3 — up to the ridge: two tall poles by the gable, a top deck, a gin pole with a rope and a bucket."""
    P = r.P
    w = r.winter
    x = cx - 45 * s
    Wf, Hw, G, Dd = 66 * s, 40 * s, 30 * s, 24 * s
    dy = Dd * .42
    wood, wood_s, plank = P['logs'], P['logs_s'], light(P['logs'], .3)

    def pole(px, py, top):
        quad(r, px - .9 * s, top, px + .9 * s, py, wood_s, .55 * s)
        r.line([(px - .3 * s, top + 1.5 * s), (px - .3 * s, py - 1 * s)], .3 * s, color=light(wood, .4), op=.7, jitter=False)

    def deck(x0, x1, h, side=False):
        """A run of planks at height h over the ground: along the front, or receding along the side wall."""
        t = 2.8 * s
        if not side:
            r.shape([(x0, y - h), (x1, y - h), (x1, y - h - t), (x0, y - h - t)], plank, .55 * s)
            r.lines([[(x0 + (x1 - x0) * k / 4, y - h), (x0 + (x1 - x0) * k / 4, y - h - t)] for k in (1, 2, 3)], .3 * s, op=.5)
            if w:
                r.shape([(x0 - .4 * s, y - h - t), (x1 + .4 * s, y - h - t), (x1 - 1 * s, y - h - t - 1.4 * s), (x0 + 1 * s, y - h - t - 1.4 * s)], P['snow'], .3 * s)
        else:
            a, b = (x0, y - h), (x1, y - h - dy * (x1 - x0) / Dd)
            r.shape([a, b, (b[0], b[1] - t), (a[0], a[1] - t)], light(plank, .05), .5 * s)
            if w:
                r.shape([(a[0], a[1] - t), (b[0], b[1] - t), (b[0] - 1 * s, b[1] - t - 1.2 * s), (a[0] + 1 * s, a[1] - t - 1.2 * s)], P['snow'], .3 * s)

    def logs(lx, ly):
        """A stack of fresh logs lying with their ends to the viewer, a lath across."""
        r.shadow([(lx - 2 * s, ly), (lx + 22 * s, ly - 1 * s), (lx + 26 * s, ly + 2.4 * s), (lx, ly + 2.6 * s)], .55)
        rows = [(0, 5), (1, 4), (2, 3)]
        for row, n in rows:
            for i in range(n):
                ex, ey = lx + 2.4 * s + (i + row * .5) * 4.4 * s, ly - 2.1 * s - row * 3.7 * s
                r.blob(ex, ey, 2.2 * s, 2.0 * s, plank, .45 * s, n=9, wob=.05)
                r.blob(ex + .2 * s, ey + .1 * s, .7 * s, .6 * s, light(wood, .1), 0, n=6, ink=False)
        r.line([(lx + 1 * s, ly - .4 * s), (lx + 2 * s, ly - 11.6 * s)], .5 * s, color=wood_s)
        if w:
            r.blob(lx + 11 * s, ly - 12.4 * s, 7 * s, 1.1 * s, P['snow'], .3 * s, n=8)

    def bricks(bx, by):
        """A pallet of bricks: a board under, three courses stacked in a step."""
        quad(r, bx - 1 * s, by - 1.4 * s, bx + 15 * s, by, wood_s, .45 * s)
        for row, (n, off) in enumerate(((4, 0), (3, 1.8), (2, 3.6))):
            for i in range(n):
                x0 = bx + off * s + i * 3.6 * s
                quad(r, x0, by - 1.4 * s - (row + 1) * 2.1 * s, x0 + 3.5 * s, by - 1.4 * s - row * 2.1 * s, P['brick'] if (i + row) % 3 else light(P['brick'], .12), .35 * s)
        if w:
            r.blob(bx + 6.6 * s, by - 8.2 * s, 5 * s, .9 * s, P['snow'], .25 * s, n=7)

    # the materials on the ground, in front of the wall at both corners
    logs(x + 2 * s, y + 9 * s)
    bricks(x + 48 * s, y + 8.4 * s)
    front_poles = [x - 5 * s, x + 22 * s, x + 44 * s, x + 71 * s]
    if stage <= 1:
        # the first two poles at the corners and a plank on trestles between them, a few pegs with a string
        for px in (front_poles[0], front_poles[-1]):
            pole(px, y + 2.5 * s, y - 24 * s)
        for tx in (x + 14 * s, x + 54 * s):
            r.lines([[(tx - 2.4 * s, y + 3 * s), (tx + 1.6 * s, y - 6 * s)], [(tx + 2.4 * s, y + 3 * s), (tx - 1.6 * s, y - 6 * s)]], .55 * s, color=wood_s)
        deck(x + 8 * s, x + 60 * s, 6 * s)
        pegs = [(x - 9 * s, y + 6 * s), (x + 76 * s, y + 6 * s)]
        r.line(pegs, .25 * s, color=P['white'], op=.9, jitter=False)
        for px, py in pegs:
            r.line([(px, py), (px, py - 3 * s)], .6 * s, color=wood_s, jitter=False)
        return
    # stage 2 and 3: the side poles stand back along the side wall, the front ones in front of the wall
    side_poles = [(x + Wf + 9 * s, y - dy * 9 / 24 + 1.5 * s), (x + Wf + Dd + 4 * s, y - dy - 1.5 * s + 1.5 * s)]
    for px, py in side_poles:
        pole(px, py, py - 50 * s)
    deck(x + Wf + 4 * s, x + Wf + Dd + 6 * s, 15 * s + 3 * s, side=True)
    deck(x + Wf + 4 * s, x + Wf + Dd + 6 * s, 35 * s + 3 * s, side=True)
    for px in front_poles:
        pole(px, y + 2.5 * s, y - 47 * s)
    # braces in the bays: crossed in the outer two, one in the middle
    r.lines([[(front_poles[0], y - 14 * s), (front_poles[1], y - 34 * s)], [(front_poles[2], y - 14 * s), (front_poles[3], y - 34 * s)],
             [(front_poles[1], y + 1 * s), (front_poles[2], y - 14 * s)], [(front_poles[0], y - 34 * s), (front_poles[1], y - 46 * s)]], .9 * s, color=wood_s)
    deck(x - 9 * s, x + 75 * s, 15 * s)
    deck(x - 9 * s, x + 75 * s, 35 * s)
    # the ladder up to the first deck, leaning on it at the left
    lb, lt = (x - 15 * s, y + 5 * s), (x - 7 * s, y - 19 * s)
    for o in (-2 * s, 2 * s):
        r.line([(lb[0] + o, lb[1]), (lt[0] + o, lt[1])], .8 * s, color=wood_s, jitter=False)
    r.lines([[(lb[0] + (lt[0] - lb[0]) * t - 2 * s, lb[1] + (lt[1] - lb[1]) * t), (lb[0] + (lt[0] - lb[0]) * t + 2 * s, lb[1] + (lt[1] - lb[1]) * t)] for t in (.15, .35, .55, .75, .95)], .5 * s, color=wood_s)
    if stage >= 3:
        # up to the ridge: two tall poles by the gable, a top deck under the peak, the gin pole with its bucket
        for px in (x + 18 * s, x + 48 * s):
            pole(px, y - 35 * s, y - Hw - G * .62)
        deck(x + 12 * s, x + 54 * s, Hw + G * .42)
        gx = x + Wf / 2 - 1 * s
        pole(gx, y - Hw - G * .42 - 2 * s, y - Hw - G - 14 * s)
        arm = [(gx - 3 * s, y - Hw - G - 12 * s), (gx + 16 * s, y - Hw - G - 12 * s)]
        r.line(arm, 1.1 * s, color=wood_s, jitter=False)
        bx, by = gx + 14 * s, y - Hw - G + 6 * s
        r.line([(bx, arm[0][1]), (bx, by - 3 * s)], .3 * s, op=.9, jitter=False)
        r.add(f'<g class="swing">')
        r.shape([(bx - 3.4 * s, by - 3 * s), (bx + 3.4 * s, by - 3 * s), (bx + 2.6 * s, by + 2.6 * s), (bx - 2.6 * s, by + 2.6 * s)], P['grey'], .5 * s)
        r.add('</g>')
        if w:
            r.blob(gx + 6 * s, arm[0][1] - .8 * s, 9 * s, .7 * s, P['snow'], .2 * s, n=7)
