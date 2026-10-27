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
    x = cx - 66 * s
    council(r, x, y, s, lit)
    flag(r, x + 56 * s, y - 39 * s, 13, s)


def college(r, cx, y, s=1.0, lit=False):
    """The agricultural college: two floors of plastered brick, pilasters, a hipped red roof, an emblem."""
    P = r.P
    Wb, Hw, Dd = 96 * s, 50 * s, 22 * s
    dy = Dd * .42
    x = cx - (Wb + Dd) / 2
    wall, wall_s = P['plaster'], dark(P['plaster'], .2)
    r.shadow([(x + Wb, y), (x + Wb + Dd, y - dy), (x + Wb + Dd + 42 * s, y - dy + 14 * s), (x + Wb + 26 * s, y + 12 * s), (x + 10 * s, y + 6 * s)])
    r.shape([(x + Wb, y), (x + Wb + Dd, y - dy), (x + Wb + Dd, y - Hw - dy), (x + Wb, y - Hw)], wall_s, 1.0 * s + .2, shade=True)
    for k in (1, 2):
        wx = x + Wb + Dd * k / 3
        window(r, wx, y - Hw * .27 - dy * k / 3, s * .8, P['white'], lit, False, kind='plain')
        window(r, wx, y - Hw * .72 - dy * k / 3, s * .8, P['white'], lit, False, kind='plain')
    r.shape([(x, y), (x + Wb, y), (x + Wb, y - Hw), (x, y - Hw)], wall, 1.2 * s + .2)
    r.shape([(x, y), (x + Wb, y), (x + Wb, y - 6 * s), (x, y - 6 * s)], P['brick'], .7 * s)
    r.lines([[(x + 1, y - 2 * s * i), (x + Wb - 1, y - 2 * s * i)] for i in (1, 2)], .3 * s, op=.4)
    r.shape([(x - 1, y - Hw * .5 + 1 * s), (x + Wb + 1, y - Hw * .5 + 1 * s), (x + Wb + 1, y - Hw * .5 - 1.4 * s), (x - 1, y - Hw * .5 - 1.4 * s)], P['white'], .5 * s)
    for px in (x, x + Wb * .5 - 9 * s, x + Wb * .5 + 6 * s, x + Wb - 3 * s):
        r.shape([(px, y - 6 * s), (px + 3 * s, y - 6 * s), (px + 3 * s, y - Hw), (px, y - Hw)], P['white'], .45 * s)
    r.rim([(x - .8, y - 1), (x - .8, y - Hw)], .9 * s)
    for row, wy in ((0, y - Hw * .27), (1, y - Hw * .72)):
        for i in range(6):
            if row == 0 and i in (2, 3):
                continue
            if i in (2, 3) and row == 1:
                window(r, x + Wb * (i + .5) / 6, wy, s * .9, P['white'], lit, False, kind='plain')
                continue
            window(r, x + Wb * (i + .5) / 6, wy, s * .9, P['white'], lit, False, kind='plain')
    # the door under a canopy on two posts, steps
    dx = x + Wb / 2
    r.shape([(dx - 13 * s, y + 3 * s), (dx + 13 * s, y + 3 * s), (dx + 13 * s, y - .5), (dx - 13 * s, y - .5)], P['grey'], .6 * s)
    r.shape([(dx - 6 * s, y - .5), (dx + 6 * s, y - .5), (dx + 6 * s, y - 18 * s), (dx - 6 * s, y - 18 * s)], P['green'], .7 * s)
    r.line([(dx, y - 1), (dx, y - 18 * s)], .4 * s, jitter=False)
    for px in (dx - 11 * s, dx + 10 * s):
        r.line([(px, y), (px, y - 21 * s)], .9 * s)
    r.shape([(dx - 14 * s, y - 21 * s), (dx + 14 * s, y - 21 * s), (dx + 11 * s, y - 25 * s), (dx - 11 * s, y - 25 * s)], P['iron_r'], .6 * s)
    # the hipped roof
    Rf = 17 * s
    front = [(x - 4 * s, y - Hw + 1), (x + Wb + 4 * s, y - Hw + 1), (x + Wb - 14 * s, y - Hw - Rf), (x + 18 * s, y - Hw - Rf)]
    r.shape(front, P['iron_r'], 1.2 * s + .2)
    r.lines([[(x - 4 * s + (Wb + 8 * s) * i / 14, y - Hw + 1), (x - 4 * s + (Wb + 8 * s) * i / 14 + (cx - (x - 4 * s + (Wb + 8 * s) * i / 14)) * .2, y - Hw - Rf + 1)] for i in range(1, 14)], .3 * s, color=dark(P['iron_r'], .35), op=.5)
    r.rim([front[0], front[3]], .9 * s)
    hip = [(x + Wb + 4 * s, y - Hw + 1), (x + Wb + 4 * s + Dd, y - Hw - dy + 1), (x + Wb - 14 * s + Dd * .5, y - Hw - Rf - dy * .5), (x + Wb - 14 * s, y - Hw - Rf)]
    r.shape(hip, P['iron_r_s'], 1.0 * s + .2, shade=True)
    if r.winter:
        r.shape([(x - 2 * s, y - Hw - 2), (x + 18 * s, y - Hw - Rf - 1.5), (x + Wb - 14 * s, y - Hw - Rf - 1.5), (x + Wb + 2 * s, y - Hw - 2), (x + Wb - 20 * s, y - Hw - Rf + 9 * s), (x + 50 * s, y - Hw - Rf + 11 * s), (x + 20 * s, y - Hw - Rf + 8 * s)], P['snow'], .8 * s)
    # a pediment over the middle with the wheat-ear emblem
    r.shape([(dx - 16 * s, y - Hw - 1), (dx + 16 * s, y - Hw - 1), (dx, y - Hw - 15 * s)], P['white'], .8 * s)
    r.blob(dx, y - Hw - 6 * s, 3.6 * s, 3.6 * s, P['straw'], .5 * s, n=9, wob=.02)
    r.lines([[(dx, y - Hw - 3 * s), (dx, y - Hw - 9 * s)]] + [[(dx, y - Hw - (4 + k * 1.5) * s), (dx + sd * 1.6 * s, y - Hw - (5.2 + k * 1.5) * s)] for k in range(3) for sd in (-1, 1)], .4 * s)
    if r.winter:
        r.shape([(dx - 16 * s, y - Hw - 1.5), (dx, y - Hw - 15.6 * s), (dx + 16 * s, y - Hw - 1.5), (dx, y - Hw - 12 * s)], P['snow'], .5 * s)
    for chx in (x + Wb * .22, x + Wb * .8):
        cy0 = y - Hw - Rf * .55
        r.shape([(chx, cy0), (chx + 5 * s, cy0), (chx + 5 * s, cy0 - 11 * s), (chx, cy0 - 11 * s)], P['brick'], .6 * s)


def long_house(r, x, y, s=1.0, wall='logs', roof='iron_g', frame=None, shutters=False, lit=False, windows=5, W_=104, H_=34, D_=30, planks=False):
    """A long house with its long wall to the street (the orphanage, the restaurant): wall colour of one's own."""
    P = r.P
    frame = frame or P['white']
    Wl, Hw, G, Dd = W_ * s, H_ * s, 26 * s, D_ * s
    dy = Dd * .42
    wc = P[wall] if wall in P else wall
    ws = P.get(wall + '_s') if wall in P and wall + '_s' in P else dark(wc, .22)
    sl, ss = P[roof], P[roof + '_s']
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
    for i in range(windows):
        window(r, x + Wl * (i + .5) / windows, y - Hw * .52, s, frame, lit, shutters)
    r.shape([(x - 1, y), (x + Wl + 1, y), (x + Wl + 1, y - 3 * s), (x - 1, y - 3 * s)], dark(wc, .3), .7 * s + .1)
    if r.winter:
        r.blob(x + Wl * .5, y + 1, Wl * .55, 3 * s, P['snow'], .6 * s, n=14, wob=.08)
    return dict(Wl=Wl, Hw=Hw, G=G, Dd=Dd, dy=dy, front=front)


def orphanage(r, cx, y, s=1.0, lit=False):
    """The children's home «Солнышко»: a long house painted yellow, a mezzanine with a sun on its gable."""
    P = r.P
    x = cx - 67 * s
    g = long_house(r, x, y, s, wall=mix(P['straw'], P['white'], .35), roof='iron_g', frame=P['white'], shutters=False, lit=lit, windows=5, planks=True)
    Hw, G = g['Hw'], g['G']
    # the mezzanine: a small gabled storey over the middle of the roof
    mx, mw = x + 104 * s * .5, 30 * s
    base = y - Hw - G * .35
    r.shape([(mx - mw / 2, base + 3 * s), (mx + mw / 2, base + 3 * s), (mx + mw / 2, base - 14 * s), (mx - mw / 2, base - 14 * s)], mix(P['straw'], P['white'], .35), 1.0 * s + .1)
    r.lines([[(mx - mw / 2 + .5, base - 14 * s * k / 5), (mx + mw / 2 - .5, base - 14 * s * k / 5)] for k in range(1, 5)], .25 * s, op=.4)
    window(r, mx - 7 * s, base - 5 * s, s * .8, P['white'], lit)
    window(r, mx + 7 * s, base - 5 * s, s * .8, P['white'], lit)
    gab = [(mx - mw / 2 - 3 * s, base - 14 * s), (mx, base - 29 * s), (mx + mw / 2 + 3 * s, base - 14 * s)]
    r.shape(gab, P['iron_g'], 1.0 * s + .1)
    r.shape([(mx - mw / 2 + 1 * s, base - 14.5 * s), (mx, base - 26.5 * s), (mx + mw / 2 - 1 * s, base - 14.5 * s)], P['white'], .7 * s)
    if r.winter:
        r.shape([(mx - mw / 2 - 3 * s, base - 14.6 * s), (mx, base - 29.8 * s), (mx + mw / 2 + 3 * s, base - 14.6 * s), (mx, base - 25 * s)], P['snow'], .6 * s)
    # the sun: a disc with short rays
    sy = base - 19 * s
    r.lines([[(mx + math.cos(a) * 4.4 * s, sy + math.sin(a) * 4.4 * s), (mx + math.cos(a) * 6.6 * s, sy + math.sin(a) * 6.6 * s)] for a in [i * math.pi / 5 for i in range(10)]], .6 * s, color=P['coat4'])
    r.blob(mx, sy, 3.6 * s, 3.6 * s, P['coat4'], .5 * s, n=9, wob=.02)
    # a porch with a little roof in front of the door
    px = x + 104 * s * .3
    r.shape([(px - 8 * s, y + 2.5 * s), (px + 8 * s, y + 2.5 * s), (px + 8 * s, y - .5), (px - 8 * s, y - .5)], P['grey'], .6 * s)
    r.shape([(px - 4.6 * s, y - .5), (px + 4.6 * s, y - .5), (px + 4.6 * s, y - 16 * s), (px - 4.6 * s, y - 16 * s)], P['blue'], .6 * s)
    r.shape([(px - 9 * s, y - 17 * s), (px + 9 * s, y - 17 * s), (px, y - 23 * s)], P['iron_g'], .6 * s)
    cx2, cy2 = x + 104 * s * .78, y - Hw - G * .5
    r.shape([(cx2, cy2), (cx2 + 6 * s, cy2), (cx2 + 6 * s, cy2 - 12 * s), (cx2, cy2 - 12 * s)], P['brick'], .7 * s)
    smoke(r, cx2 + 3 * s, cy2 - 15 * s, s)


def bakery(r, cx, y, s=1.0, lit=False):
    """The bakery «Колосок»: brick, its gable to the street, a big chimney that always smokes, loaves in the window,
    a pretzel sign swinging on a bracket."""
    P = r.P
    Wf, Hw, G, Dd = 60 * s, 38 * s, 24 * s, 30 * s
    dy = Dd * .42
    x = cx - (Wf + Dd) / 2
    r.shadow([(x + Wf, y), (x + Wf + Dd, y - dy), (x + Wf + Dd + 40 * s, y - dy + 14 * s), (x + Wf + 26 * s, y + 12 * s), (x + 6 * s, y + 6 * s)])
    r.shape([(x + Wf, y), (x + Wf + Dd, y - dy), (x + Wf + Dd, y - Hw - dy), (x + Wf, y - Hw)], P['brick_s'], 1.0 * s + .2, shade=True)
    r.lines([[(x + Wf, y - Hw * i / 9), (x + Wf + Dd, y - Hw * i / 9 - dy)] for i in range(1, 9)], .3 * s, op=.35)
    rs = [(x + Wf + 4 * s, y - Hw + 1 * s), (x + Wf / 2, y - Hw - G), (x + Wf / 2 + Dd, y - Hw - G - dy), (x + Wf + 4 * s + Dd, y - Hw - dy + 1 * s)]
    # the big chimney stands on the ridge, behind the roof's near edge
    chx, chy = x + Wf / 2 + Dd * .55, y - Hw - G - dy * .55
    r.shape(rs, P['tes_s'], 1.0 * s + .2, shade=True)
    r.lines([[(rs[0][0] + (rs[1][0] - rs[0][0]) * i / 7, rs[0][1] + (rs[1][1] - rs[0][1]) * i / 7), (rs[0][0] + (rs[1][0] - rs[0][0]) * i / 7 + Dd, rs[0][1] + (rs[1][1] - rs[0][1]) * i / 7 - dy)] for i in range(1, 7)], .3 * s, op=.5)
    if r.winter:
        roof_cap(r, rs, s)
    r.shape([(chx - 4 * s, chy + 4 * s), (chx + 5 * s, chy + 2 * s), (chx + 5 * s, chy - 16 * s), (chx - 4 * s, chy - 14 * s)], P['brick'], .9 * s)
    r.shape([(chx - 5 * s, chy - 14 * s), (chx + 6 * s, chy - 16.5 * s), (chx + 6 * s, chy - 18.5 * s), (chx - 5 * s, chy - 16 * s)], P['brick_s'], .6 * s)
    if r.winter:
        r.shape([(chx - 5 * s, chy - 16.4 * s), (chx + 6 * s, chy - 19 * s), (chx + 4 * s, chy - 20.4 * s), (chx - 4 * s, chy - 18 * s)], P['snow'], .4 * s)
    smoke(r, chx + .5 * s, chy - 22 * s, s * 1.1)
    fac = [(x, y), (x + Wf, y), (x + Wf, y - Hw), (x, y - Hw)]
    r.shape(fac, P['brick'], 1.25 * s + .2)
    r.lines([[(x + 1, y - Hw * i / 12), (x + Wf - 1, y - Hw * i / 12)] for i in range(1, 12)], .25 * s, color=dark(P['brick'], .3), op=.5)
    r.rim([(x - .8, y - 1), (x - .8, y - Hw)], .9 * s)
    gab = [(x - 4 * s, y - Hw), (x + Wf / 2, y - Hw - G), (x + Wf + 4 * s, y - Hw)]
    r.shape(gab, P['plaster'], 1.1 * s + .2)
    for (ax, ay), (bx2, by2) in [((x - 6 * s, y - Hw + 2 * s), (x + Wf / 2, y - Hw - G - 2 * s)), ((x + Wf / 2, y - Hw - G - 2 * s), (x + Wf + 6 * s, y - Hw + 2 * s))]:
        nx, ny = (by2 - ay), -(bx2 - ax)
        L = math.hypot(nx, ny)
        nx, ny = nx / L * 2.6 * s, ny / L * 2.6 * s
        r.shape([(ax, ay), (bx2, by2), (bx2 + nx, by2 + ny), (ax + nx, ay + ny)], P['tes'], .8 * s)
    if r.winter:
        r.shape([(x - 6 * s, y - Hw + 1.5 * s), (x + Wf / 2, y - Hw - G - 3.2 * s), (x + Wf / 2 + 3 * s, y - Hw - G - 1 * s), (x - 3 * s, y - Hw + 3 * s)], P['snow'], .6 * s)
    # the round sign on the gable: a loaf and an ear of wheat
    gy = y - Hw - G * .42
    r.blob(x + Wf / 2, gy, 6.4 * s, 6.4 * s, P['white'], .7 * s, n=10, wob=.02)
    r.blob(x + Wf / 2, gy + .6 * s, 4.2 * s, 2.4 * s, P['straw'], .45 * s, n=9, wob=.04)
    r.lines([[(x + Wf / 2 - 2.6 * s + k * 2 * s, gy - .4 * s), (x + Wf / 2 - 1.6 * s + k * 2 * s, gy + 1.6 * s)] for k in range(3)], .35 * s, op=.7)
    # the shop window with loaves, the door
    wx0, wx1, wy0, wy1 = x + 5 * s, x + Wf * .62, y - Hw * .7, y - 7 * s
    r.shape([(wx0 - 2 * s, wy1 + 2.4 * s), (wx1 + 2 * s, wy1 + 2.4 * s), (wx1 + 2 * s, wy0 - 2 * s), (wx0 - 2 * s, wy0 - 2 * s)], P['white'], .7 * s)
    r.shape([(wx0, wy1), (wx1, wy1), (wx1, wy0), (wx0, wy0)], P['win'] if lit else P['glass'], .7 * s)
    r.line([((wx0 + wx1) / 2, wy0), ((wx0 + wx1) / 2, wy1)], .5 * s, jitter=False)
    r.dots([(wx0 + (wx1 - wx0) * (k + .5) / 5, wy1 - 2.6 * s, 2.6 * s, 1.6 * s) for k in range(5)] + [(wx0 + (wx1 - wx0) * (k + 1) / 5, wy1 - 5.6 * s, 2.4 * s, 1.5 * s) for k in range(4)], P['straw'], .4 * s)
    if not lit:
        r.add(f'<path d="{D([(wx0 + .6, wy0 + .6), (wx0 + (wx1 - wx0) * .4, wy0 + .6), (wx0 + .6, wy0 + (wy1 - wy0) * .45)])}" fill="#fff" opacity=".4"/>')
    else:
        r.ellipse((wx0 + wx1) / 2, y + 5 * s, 16 * s, 3 * s, P['win'], op=.3, blur=True)
    r.shape([(x + Wf * .72, y), (x + Wf * .92, y), (x + Wf * .92, y - Hw * .68), (x + Wf * .72, y - Hw * .68)], P['green'], .7 * s)
    r.shape([(x + Wf * .68, y + 2.4 * s), (x + Wf * .96, y + 2.4 * s), (x + Wf * .96, y - .5), (x + Wf * .68, y - .5)], P['grey'], .5 * s)
    # the sign board over the window
    r.shape([(wx0, wy0 - 4 * s), (wx1, wy0 - 4 * s), (wx1, wy0 - 10 * s), (wx0, wy0 - 10 * s)], P['white'], .6 * s)
    r.blob((wx0 + wx1) / 2 - 7 * s, wy0 - 7 * s, 3 * s, 1.6 * s, P['straw'], .35 * s, n=8)
    r.lines([[((wx0 + wx1) / 2 - 2 * s + k * 3.4 * s, wy0 - 8.4 * s), ((wx0 + wx1) / 2 - 2 * s + k * 3.4 * s, wy0 - 5.6 * s)] for k in range(4)], .9 * s, color=P['brick_s'], op=.8)
    # a pretzel on a bracket at the corner, swinging
    bxx, byy = x - 1 * s, y - Hw * .78
    r.line([(bxx, byy), (bxx - 9 * s, byy)], .8 * s)

    def pretzel():
        r.line([(0, 0), (0, 2.5 * s)], .4 * s, jitter=False)
        r.add(f'<path d="{SD([(0, 3 * s), (3.6 * s, 4.2 * s), (3.4 * s, 8 * s), (0, 9.4 * s), (-3.4 * s, 8 * s), (-3.6 * s, 4.2 * s)])}" fill="none" stroke="{P["logs_s"]}" stroke-width="{fmt(1.6 * s)}"/>')
        r.add(f'<path d="{D([(-2.6 * s, 9 * s), (2.4 * s, 4.4 * s)], False)}M{fmt(2.6 * s)} {fmt(9 * s)}L{fmt(-2.4 * s)} {fmt(4.4 * s)}" fill="none" stroke="{P["logs_s"]}" stroke-width="{fmt(1.3 * s)}"/>')
        r.see([(-4 * s, 0), (4 * s, 10 * s)])
    r.group(pretzel, bxx - 7 * s, byy, 'sway')


def restaurant(r, cx, y, s=1.0, lit=False):
    """The restaurant «Печь»: a log house with carved frames and blue shutters, a stove painted on its sign board,
    a string of little lamps under the eaves."""
    P = r.P
    x = cx - 61 * s
    g = long_house(r, x, y, s, wall='logs', roof='tes', frame=P['white'], shutters=True, lit=lit, windows=4, W_=92, H_=34, D_=30)
    Wl, Hw, G = g['Wl'], g['Hw'], g['G']
    # the sign on the roof slope: a white stove with its mouth glowing
    sx, sy = x + Wl * .5, y - Hw - G * .45
    r.shape([(sx - 17 * s, sy + 5 * s), (sx + 17 * s, sy + 5 * s), (sx + 17 * s, sy - 9 * s), (sx - 17 * s, sy - 9 * s)], P['logs_s'], .8 * s)
    r.line([(sx - 12 * s, sy + 5 * s), (sx - 12 * s, sy + 9 * s)], .7 * s)
    r.line([(sx + 12 * s, sy + 5 * s), (sx + 12 * s, sy + 9 * s)], .7 * s)
    r.shape([(sx - 8 * s, sy + 3.6 * s), (sx + 8 * s, sy + 3.6 * s), (sx + 8 * s, sy - 3 * s), (sx + 3 * s, sy - 3 * s), (sx + 3 * s, sy - 7.6 * s), (sx + 1 * s, sy - 7.6 * s), (sx + 1 * s, sy - 3 * s), (sx - 8 * s, sy - 3 * s)], P['white'], .5 * s)
    r.shape([(sx - 5 * s, sy + 2.4 * s), (sx - 1 * s, sy + 2.4 * s), (sx - 1 * s, sy - .4 * s), (sx - 3 * s, sy - 1.6 * s), (sx - 5 * s, sy - .4 * s)], '#3a2a1f', .3 * s)
    r.add(f'<path class="fire" d="{D([(sx - 4.4 * s, sy + 2.2 * s), (sx - 3.6 * s, sy + .6 * s), (sx - 3 * s, sy + 1.6 * s), (sx - 2.4 * s, sy), (sx - 1.6 * s, sy + 2.2 * s)])}" fill="#f6a03a"/>')
    # little lamps under the eaves
    x0, x1, ly = x + 2 * s, x + Wl - 2 * s, y - Hw + 3 * s
    r.add(f'<path d="M{fmt(x0)} {fmt(ly)}Q{fmt((x0 + x1) / 4 + x0 / 2)} {fmt(ly + 5 * s)} {fmt((x0 + x1) / 2)} {fmt(ly)}Q{fmt((x0 + x1) / 4 + x1 / 2)} {fmt(ly + 5 * s)} {fmt(x1)} {fmt(ly)}" class="k" stroke-width=".35"/>')
    lamps = []
    for k in range(13):
        t = (k + .5) / 13
        half = t * 2 if t < .5 else (t - .5) * 2
        lx = x0 + (x1 - x0) * t
        lamps.append((lx, ly + 2.5 * s * 4 * half * (1 - half) + .9 * s, .9 * s, .9 * s))
    r.dots(lamps, '#ffd36b' if lit else '#f3c454', .25)
    if lit:
        r.ellipse(x + Wl / 2, ly + 2 * s, Wl * .5, 4 * s, P['win'], op=.18, blur=True)
    # the porch in the middle of the long wall
    px = x + Wl * .5
    r.shape([(px - 9 * s, y + 3 * s), (px + 9 * s, y + 3 * s), (px + 9 * s, y - .5), (px - 9 * s, y - .5)], P['grey'], .6 * s)
    cx2, cy2 = x + Wl * .7, y - Hw - G * .6
    r.shape([(cx2, cy2), (cx2 + 6 * s, cy2), (cx2 + 6 * s, cy2 - 13 * s), (cx2, cy2 - 13 * s)], P['brick'], .7 * s)
    smoke(r, cx2 + 3 * s, cy2 - 16 * s, s)


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
def homestead(r, cx, y, s=1.0, lit=False):
    """The player's house: a big izba with its gable to the road, a dormer, carved frames; a woodshed by it."""
    P = r.P
    x = cx - 45 * s
    izba(r, x, y, s, roof='tes', frame=P['blue'], shutters=False, svetelka=True, porch=True, lit=lit, smoke_on=True)
    flowers(r, x + 2 * s, x + 60 * s, y + 3 * s, y + 9 * s, 12) if not r.winter else None
