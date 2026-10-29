"""The neighbours' yards (docs/PROGRESSION-v3.md §7) and the village's shared buildings, in the hybrid style.

Each yard is drawn at its four looks, stage 0 (before the farm comes) to stage 3; villageg.py stands all four on the
spot and the game shows one by the root class `on-<yard><stage>` (src/ui/Village.tsx). Every function takes the
centre x and the base y of what it draws, like pieces.py.

    zina_yard   Зина's izba: a leaking roof and a cold stove -> a new roof -> a stove with smoke -> a greenhouse
    forge       Savva's smithy: caved in -> the hearth lit -> an awning, anvil and bellows -> a brick tool room
    carpenter   Ефим's yard: stumps and a bench in the open -> a shed -> a sawmill and log stacks -> a joinery
    mill_yard   the mill: no sails -> sails -> millstones and sacks -> a granary beside it
    karpov_yard the Карповы: a fallen fence, a grown-over garden -> fence and garden -> a covered yard -> a new house
    club, pump_tower, hostel, brook, bridge   the shared buildings
"""
import math
from hy import D, fmt, mix, dark, light, roof_cap, window, izba, izba_long, smoke, palisade, garden, person, flowers, tufts
import hy as H
import pieces as Q
from pieces import quad, sign_text


def _weeds(r, x0, x1, y, n=7, h=4.0):
    """a fringe of tall weeds (бурьян) along a base line"""
    P = r.P
    if r.winter:
        r.lines([[(x0 + (x1 - x0) * (i + .5) / n, y), (x0 + (x1 - x0) * (i + .5) / n + (i % 2 - .5) * 1.4, y - h * (.7 + .3 * (i % 3) / 2))] for i in range(n)], .5, color=dark(P['straw'], .3))
        return
    r.lines([[(x0 + (x1 - x0) * (i + .5) / n, y), (x0 + (x1 - x0) * (i + .5) / n + (i % 2 - .5) * 1.6, y - h * (.7 + .3 * (i % 3) / 2))] for i in range(n)], .6, color=P['leaf_d'])
    r.dots([(x0 + (x1 - x0) * (i + .5) / n + (i % 2 - .5) * 1.6, y - h * (.7 + .3 * (i % 3) / 2), .9, .7) for i in range(0, n, 2)], dark(P['straw'], .15))


def _gable_roof_pts(x, y, Wf, Hw, G, D_, ov):
    """the side slope of izba(): its four corners (the same as hy.izba draws)"""
    dy = D_ * .42
    return [(x + Wf + ov, y - Hw + 1), (x + Wf / 2, y - Hw - G), (x + Wf / 2 + D_, y - Hw - G - dy), (x + Wf + ov + D_, y - Hw - dy + 1)]


def _on_quad(q, u, v):
    """a point on a quad by its two fractions: u along the eaves -> ridge edge, v from the front to the back"""
    a = (q[0][0] + (q[1][0] - q[0][0]) * u, q[0][1] + (q[1][1] - q[0][1]) * u)
    b = (q[3][0] + (q[2][0] - q[3][0]) * u, q[3][1] + (q[2][1] - q[3][1]) * u)
    return (a[0] + (b[0] - a[0]) * v, a[1] + (b[1] - a[1]) * v)


def _stub_chimney(r, x, y, s):
    """a chimney fallen to a few bricks, no smoke"""
    P = r.P
    r.shape([(x, y), (x + 5 * s, y - 2 * s), (x + 5 * s, y - 6 * s), (x + 3 * s, y - 7 * s), (x + 1.4 * s, y - 5 * s), (x, y - 5.6 * s)], P['brick_s'], .6 * s + .1)
    r.dots([(x + 7 * s, y + 2 * s, .9 * s, .6 * s), (x + 9 * s, y + 3.4 * s, .8 * s, .55 * s)], P['brick'], .25 * s)


def _boarded(r, wx, wy, s):
    """two boards nailed crosswise over a window"""
    P = r.P
    for a, b in (((wx - 5 * s, wy - 6 * s), (wx + 5 * s, wy + 5 * s)), ((wx + 5 * s, wy - 6 * s), (wx - 5 * s, wy + 5 * s))):
        nx, ny = b[1] - a[1], -(b[0] - a[0])
        L = math.hypot(nx, ny)
        nx, ny = nx / L * 1.2 * s, ny / L * 1.2 * s
        r.shape([(a[0] - nx, a[1] - ny), (b[0] - nx, b[1] - ny), (b[0] + nx, b[1] + ny), (a[0] + nx, a[1] + ny)], light(P['grey'], .05), .4 * s)


# ---------------------------------------------------------------- Зина
def zina_yard(r, cx, y, s=.78, stage=0, lit=False):
    P = r.P
    x = cx - 45 * s
    Wf, Hw, G, D_ = 66 * s, 40 * s, 30 * s, 24 * s
    if stage >= 3:
        greenhouse_small(r, cx - 60 * s, y + 9 * s, s * 1.45)
    izba(r, x, y, s, roof='tes', frame=P['blue'], lit=lit, chimney=stage >= 2, smoke_on=stage >= 2, gable_win=True, carved=stage >= 1)
    q = _gable_roof_pts(x, y, Wf, Hw, G, D_, 4 * s)
    if stage == 0:
        # the roof leaks: a hole with broken boards, moss; the chimney fell; the gable window is boarded
        hole = [_on_quad(q, .34, .3), _on_quad(q, .55, .26), _on_quad(q, .66, .52), _on_quad(q, .5, .7), _on_quad(q, .3, .58)]
        r.shape(hole, '#3b2b20', .6 * s)
        r.lines([[_on_quad(q, .38, .25), _on_quad(q, .44, .72)], [_on_quad(q, .5, .2), _on_quad(q, .58, .66)]], .5 * s, color=P['logs_s'])
        if not r.winter:
            r.blob(*_on_quad(q, .15, .8), 4 * s, 1.6 * s, mix(P['leaf_d'], P['tes_s'], .4), 0, n=8, ink=False)
        c = _on_quad(q, .62, .62)
        _stub_chimney(r, c[0], c[1], s)
        _boarded(r, x + Wf / 2, y - Hw - G * .38, s * .8)
        _weeds(r, x - 4 * s, x + Wf + 4 * s, y + 2 * s, n=11, h=6 * s)
        # a basin on the bench by the porch, for the rain
        r.blob(x + Wf + 14 * s, y + 2 * s, 3.4 * s, 1.4 * s, P['grey_s'], .4 * s, n=8)
    elif stage == 1:
        # the new roof: fresh pale boards; the chimney still a stub
        for u in (.15, .38, .62, .85):
            r.line([_on_quad(q, u, .02), _on_quad(q, u, .98)], .9 * s, color=light(P['tes'], .3), jitter=False)
        c = _on_quad(q, .62, .62)
        _stub_chimney(r, c[0], c[1], s)
    if stage >= 2 and not r.winter:
        flowers(r, x + 4 * s, x + Wf - 4 * s, y + 2 * s, y + 6 * s, 8)


def greenhouse_small(r, cx, y, s=1.0):
    """a little glass greenhouse on a log sill, tomatoes red behind the glass"""
    P = r.P
    w, h, d = 22 * s, 13 * s, 10 * s
    x = cx - w / 2
    dy = d * .42
    r.shadow([(x + w, y), (x + w + d, y - dy), (x + w + d + 14 * s, y - dy + 6 * s), (x + w + 10 * s, y + 5 * s), (x + 2 * s, y + 3 * s)], .6)
    glass = light(P['glass'], .25)
    # the side and the arched front, glass panes in white frames
    r.shape([(x + w, y), (x + w + d, y - dy), (x + w + d, y - h * .6 - dy), (x + w, y - h * .6)], dark(glass, .08), .6 * s, op=.92)
    arch = [(x, y)] + [(x + w / 2 - w / 2 * math.cos(math.pi * k / 10), y - h * .6 - h * .4 * math.sin(math.pi * k / 10)) for k in range(11)] + [(x + w, y)]
    top = [(x + w / 2 - w / 2 * math.cos(math.pi * k / 10), y - h * .6 - h * .4 * math.sin(math.pi * k / 10)) for k in range(11)]
    r.shape(top + [(p[0] + d, p[1] - dy) for p in top[::-1]], light(glass, .1), .55 * s, op=.9)
    r.shape(arch, glass, .7 * s, op=.92)
    if not r.winter:
        r.dots([(x + 4 * s + i * 3.4 * s, y - 3.4 * s - (i % 2) * 2.4 * s, 1.1 * s, 1.1 * s) for i in range(5)], P['accent'], .25 * s)
        r.lines([[(x + 3.5 * s + i * 3.4 * s, y - .5), (x + 3.5 * s + i * 3.4 * s, y - 7 * s)] for i in range(5)], .45 * s, color=P['leaf_d'])
    r.lines([[(x + w * k / 4, y), (x + w * k / 4, y - h * .6 - h * .4 * math.sin(math.pi * k / 4))] for k in range(1, 4)] + [[(x, y - h * .6), (x + w, y - h * .6)]], .45 * s, color=P['white'])
    quad(r, x - 1 * s, y - 2 * s, x + w + 1 * s, y + .6 * s, P['logs_s'], .5 * s)
    if r.winter:
        r.shape(top[2:9] + [(top[8][0] + d * .7, top[8][1] - dy * .7), (top[2][0] + d * .7, top[2][1] - dy * .7)], P['snow'], .4 * s)


# ---------------------------------------------------------------- Савва
def forge(r, cx, y, s=1.0, stage=0, lit=False):
    """A low smithy of stone and logs with its gable to the street and a wide door; a brick hearth's chimney on the
    ridge. Back to front: the tool room (3), the smithy, the awning with the anvil (2)."""
    P = r.P
    w, hw, g, d = 34 * s, 18 * s, 14 * s, 22 * s
    x = cx - w / 2 + 6 * s
    dy = d * .42
    stone = mix(P['grey_s'], P['plaster'], .35)
    if stage >= 3:
        # the tool room: a small brick house behind and to the left, a window lit in winter
        tx, ty = x - 30 * s, y - 9 * s
        tw, th = 22 * s, 15 * s
        r.shape([(tx + tw, ty), (tx + tw + 10 * s, ty - 4 * s), (tx + tw + 10 * s, ty - th - 4 * s), (tx + tw, ty - th)], P['brick_s'], .7 * s, shade=True)
        quad(r, tx, ty - th, tx + tw, ty, P['brick'], .8 * s)
        r.lines([[(tx + .6, ty - th * k / 6), (tx + tw - .6, ty - th * k / 6)] for k in range(1, 6)], .25 * s, op=.4)
        window(r, tx + tw * .5, ty - th * .55, s * .8, P['white'], lit, False, kind='plain')
        rf = [(tx - 2 * s, ty - th + 1 * s), (tx + tw + 2 * s, ty - th + 1 * s), (tx + tw + 12 * s, ty - th - 9 * s), (tx + 8 * s, ty - th - 9 * s)]
        r.shape(rf, P['iron_r_s'], .7 * s, shade=True)
        r.shape([(tx - 2 * s, ty - th + 1 * s), (tx + 8 * s, ty - th - 9 * s), (tx + 3 * s, ty - th - 4 * s)], P['iron_r'], .5 * s)
        if r.winter:
            roof_cap(r, rf, s * .7)
    r.shadow([(x + w, y), (x + w + d, y - dy), (x + w + d + 26 * s, y - dy + 9 * s), (x + w + 18 * s, y + 8 * s), (x + 4 * s, y + 4 * s)], .8)
    side = [(x + w, y), (x + w + d, y - dy), (x + w + d, y - hw - dy), (x + w, y - hw)]
    r.shape(side, dark(stone, .12), .9 * s, shade=True)
    r.dots([(x + w + d * (i % 4 + .5) / 4, y - dy * (i % 4 + .5) / 4 - hw * (i // 4 + .5) / 4, 2 * s, 1.2 * s) for i in range(16)], light(stone, .05), .25 * s)
    # the roof's side slope: caved in at first
    rs = [(x + w + 3 * s, y - hw + 1), (x + w / 2, y - hw - g), (x + w / 2 + d, y - hw - g - dy), (x + w + 3 * s + d, y - hw - dy + 1)]
    if stage == 0:
        r.shape([rs[0], rs[1], _on_quad(rs, 1, .3), _on_quad(rs, .55, .42), _on_quad(rs, .2, .55), _on_quad(rs, 0, .5)], P['tes_s'], .8 * s, shade=True)
        r.shape([_on_quad(rs, 0, .5), _on_quad(rs, .2, .55), _on_quad(rs, .55, .42), _on_quad(rs, 1, .3), rs[2], rs[3]], '#3b2b20', .7 * s)
        r.lines([[_on_quad(rs, 0, .65), _on_quad(rs, .9, .62)], [_on_quad(rs, .1, .82), _on_quad(rs, 1, .78)], [_on_quad(rs, .5, .5), _on_quad(rs, .62, 1.0)]], .6 * s, color=P['logs_s'])
    else:
        r.shape(rs, P['tes_s'], .9 * s, shade=True)
        r.lines([[_on_quad(rs, u, .02), _on_quad(rs, u, .98)] for u in (.2, .4, .6, .8)], .3 * s, op=.5)
        if r.winter:
            roof_cap(r, rs, s * .8)
        # the hearth's chimney, smoking
        c = _on_quad(rs, .55, .55)
        r.shape([c, (c[0] + 5 * s, c[1] - 2 * s), (c[0] + 5 * s, c[1] - 12 * s), (c[0], c[1] - 10 * s)], P['brick'], .7 * s)
        r.shape([(c[0] + 5 * s, c[1] - 2 * s), (c[0] + 7 * s, c[1] - 3.2 * s), (c[0] + 7 * s, c[1] - 13 * s), (c[0] + 5 * s, c[1] - 12 * s)], P['brick_s'], .5 * s)
        smoke(r, c[0] + 3 * s, c[1] - 15 * s, s * .8)
    fac = [(x, y), (x + w, y), (x + w, y - hw), (x, y - hw)]
    r.shape(fac, stone, 1.0 * s + .1)
    r.dots([(x + w * (i % 5 + .5) / 5 + (i // 5 % 2) * 2 * s, y - hw * (i // 5 + .5) / 4, 2.4 * s, 1.4 * s) for i in range(20)], light(stone, .08), .25 * s)
    r.rim([(x - .6, y - 1), (x - .6, y - hw)], .8 * s)
    gab = [(x - 3 * s, y - hw), (x + w / 2, y - hw - g), (x + w + 3 * s, y - hw)]
    r.shape(gab, P['logs_s'] if stage else dark(P['grey'], .1), .9 * s)
    r.lines([[(x + w * k / 6, y - hw - .5), (x + w * k / 6, y - hw - g * (1 - abs(w * k / 6 - w / 2) / (w / 2 + 3 * s)) + 1.5)] for k in range(1, 6)], .3 * s, op=.45)
    if stage == 0:
        r.shape([(x + w / 2 - 6 * s, y - hw - 2 * s), (x + w / 2 + 2 * s, y - hw - 8 * s), (x + w / 2 + 6 * s, y - hw - 3 * s)], '#3b2b20', .5 * s)
    # the wide door: dark and gaping at first, the hearth's glow from the first stage
    d0, d1, dt = x + w * .22, x + w * .78, y - hw * .78
    quad(r, d0, dt, d1, y, '#2c2019' if not stage else '#5a2e16', .7 * s)
    if stage:
        r.ellipse((d0 + d1) / 2, y - hw * .3, 8 * s, 6 * s, '#ff9a3c', op=.55, blur=True)
        r.blob((d0 + d1) / 2, y - hw * .22, 3.4 * s, 2.2 * s, '#ffb347', .3 * s, n=8)
        r.blob((d0 + d1) / 2, y - hw * .26, 1.8 * s, 1.4 * s, '#ffe08a', 0, n=7, ink=False, cls='fire')
    else:
        # a door leaf hanging off one hinge
        r.shape([(d1, y), (d1 + 6 * s, y + 1.4 * s), (d1 + 7 * s, dt + 4 * s), (d1, dt + 1 * s)], dark(P['grey'], .05), .5 * s)
        _weeds(r, x - 2 * s, x + w + d, y + 1.5 * s, n=10, h=6 * s)
        # the cold anvil lies in the grass
        r.shape([(x - 9 * s, y + 3 * s), (x - 1 * s, y + 3 * s), (x - 2 * s, y + .4 * s), (x - 8 * s, y + .4 * s)], dark(P['grey_s'], .2), .4 * s)
    if stage >= 2:
        # the awning on two posts at the left, the anvil on its block, the bellows against the wall
        a0, a1 = x - 26 * s, x - 1 * s
        for px in (a0 + 1 * s, a1 - 1 * s):
            r.line([(px, y + 2 * s), (px, y - hw * .9)], 1.0 * s, color=P['logs_s'], jitter=False)
        aw = [(a0 - 3 * s, y - hw * .9 + 2 * s), (a1 + 1 * s, y - hw * .9 - 2 * s), (a1 + 1 * s, y - hw * .9 - 6 * s), (a0 - 3 * s, y - hw * .9 - 2 * s)]
        r.shape(aw, P['tes'], .7 * s)
        r.lines([[(a0 - 3 * s + (a1 - a0 + 4 * s) * k / 6, aw[0][1] - 4 * s * k / 6), (a0 - 3 * s + (a1 - a0 + 4 * s) * k / 6, aw[3][1] - 4 * s * k / 6)] for k in range(1, 6)], .3 * s, op=.5)
        if r.winter:
            r.shape([aw[3], aw[2], (aw[2][0], aw[2][1] - 1.6 * s), (aw[3][0], aw[3][1] - 1.6 * s)], P['snow'], .3 * s)
        ax = (a0 + a1) / 2
        quad(r, ax - 2.4 * s, y - 4 * s, ax + 2.4 * s, y + 1 * s, P['logs'], .4 * s)
        r.shape([(ax - 6 * s, y - 4 * s), (ax + 5 * s, y - 4 * s), (ax + 7.5 * s, y - 5.2 * s), (ax + 4 * s, y - 6.4 * s), (ax - 6 * s, y - 6.4 * s)], '#4f5760', .45 * s)
        # bellows: a leather wedge on a frame
        bx = a0 + 2 * s
        r.shape([(bx, y - 2 * s), (bx + 9 * s, y - 4 * s), (bx + 9 * s, y - 7 * s), (bx, y - 9 * s)], '#8a5a34', .45 * s)
        r.line([(bx + 9 * s, y - 5.5 * s), (bx + 12 * s, y - 5.5 * s)], .6 * s, jitter=False)
        if not r.winter:
            # Savva at the anvil, hammer up
            person(r, ax + 9 * s, y + 1 * s, 1.0 * s, coat='#5c4a3a', kind='man', facing=-1)
            r.line([(ax + 7 * s, y - 9 * s), (ax + 5 * s, y - 13 * s)], .7 * s, color=P['logs_s'], jitter=False)
            quad(r, ax + 3.6 * s, y - 14 * s, ax + 6.4 * s, y - 12.4 * s, '#4f5760', .3 * s)


# ---------------------------------------------------------------- Ефим
def carpenter(r, cx, y, s=1.0, stage=0, lit=False):
    """Ефим's yard on the empty plot: back to front the shed or the joinery, the sawmill to the right, stacks."""
    P = r.P
    if stage == 0:
        Q.lot(r, cx + 8 * s, y, 50, 24)
        # stumps, a bench in the open, planks
        for sx, sy in ((cx - 24 * s, y - 2 * s), (cx + 30 * s, y - 14 * s), (cx - 4 * s, y - 20 * s)):
            r.shape([(sx - 3 * s, sy), (sx + 3 * s, sy), (sx + 2.6 * s, sy - 3 * s), (sx - 2.6 * s, sy - 3 * s)], P['logs_s'], .5 * s)
            r.blob(sx, sy - 3 * s, 2.7 * s, 1.1 * s, light(P['logs'], .3), .4 * s, n=8)
        Q.sawhorse(r, cx - 12 * s, y + 4 * s, s * .9)
        _weeds(r, cx - 30 * s, cx + 36 * s, y + 4 * s, n=9, h=5 * s)
        return
    # the shed (1..2) or the joinery (3), back left
    if stage >= 3:
        izba_long(r, cx - 44 * s, y - 4 * s, s * .5, roof='tes', frame=P['white'], shutters=False, lit=lit, chimney=True, windows=3)
        # carved frames on sale lean against the wall
        for k in range(3):
            fx = cx + 6 * s + k * 5 * s
            r.shape([(fx, y + 1 * s), (fx + 4 * s, y + 1 * s), (fx + 4 * s, y - 9 * s), (fx + 2 * s, y - 11 * s), (fx, y - 9 * s)], P['white'], .4 * s)
            quad(r, fx + 1 * s, y - 7.6 * s, fx + 3 * s, y - 1 * s, P['blue'], .25 * s)
    else:
        shed(r, cx - 22 * s, y - 2 * s, s)
        Q.sawhorse(r, cx + 4 * s, y + 5 * s, s * .9)
    if stage >= 2:
        sawmill(r, cx + 16 * s, y - 6 * s, s)
        Q.woodstack(r, cx + 4 * s, y + 12 * s, s * .9)
        if not r.winter:
            person(r, cx + 18 * s, y + 4 * s, 1.0 * s, coat='#e9e2d0', kind='man', facing=1)


def shed(r, cx, y, s=1.0):
    """a plank shed with a lean-to roof and a door ajar"""
    P = r.P
    w, hb, ht, d = 24 * s, 15 * s, 20 * s, 14 * s
    x = cx - w / 2
    dy = d * .42
    r.shadow([(x + w, y), (x + w + d, y - dy), (x + w + d + 14 * s, y - dy + 5 * s), (x + w + 8 * s, y + 5 * s), (x + 2 * s, y + 3 * s)], .7)
    r.shape([(x + w, y), (x + w + d, y - dy), (x + w + d, y - hb - dy), (x + w, y - hb)], P['grey_s'], .7 * s, shade=True)
    quad(r, x, y - ht, x + w, y, P['grey'], .9 * s)
    r.lines([[(x + w * k / 7, y - .5), (x + w * k / 7, y - ht + .5)] for k in range(1, 7)], .3 * s, op=.45)
    rf = [(x - 2 * s, y - ht - 1 * s), (x + w + 2 * s, y - hb + 1 * s), (x + w + d + 2 * s, y - hb - dy + 1 * s), (x + d - 2 * s, y - ht - dy - 1 * s)]
    r.shape(rf, P['tes_s'], .7 * s, shade=True)
    if r.winter:
        roof_cap(r, rf, s * .7)
    quad(r, x + w * .3, y - ht * .7, x + w * .7, y, '#3b2b20', .5 * s)
    r.shape([(x + w * .7, y), (x + w * .9, y + 1.2 * s), (x + w * .9, y - ht * .7 + 1 * s), (x + w * .7, y - ht * .7)], light(P['grey'], .08), .4 * s)


def sawmill(r, cx, y, s=1.0):
    """a frame saw (пилорама) under a plank roof on four posts, a log on the carriage"""
    P = r.P
    w, h, d = 30 * s, 18 * s, 12 * s
    x = cx - w / 2
    dy = d * .42
    r.shadow([(x, y), (x + w + d, y - dy), (x + w + d + 16 * s, y - dy + 6 * s), (x + 4 * s, y + 4 * s)], .6)
    for px, py in ((x + d, y - dy), (x + w + d, y - dy)):
        r.line([(px, py), (px, py - h)], .9 * s, color=P['logs_s'], jitter=False)
    # the carriage and the log through the frame
    quad(r, x - 4 * s, y - 4 * s, x + w + 4 * s, y - 2 * s, P['logs_s'], .4 * s)
    quad(r, x - 2 * s, y - 8.4 * s, x + w + 2 * s, y - 4 * s, P['logs'], .5 * s)
    r.blob(x - 2 * s, y - 6.2 * s, 1.6 * s, 2.2 * s, light(P['logs'], .3), .35 * s, n=8)
    fx = x + w * .5
    r.lines([[(fx - 3 * s, y - 2 * s), (fx - 3 * s, y - 15 * s)], [(fx + 3 * s, y - 2 * s), (fx + 3 * s, y - 15 * s)], [(fx - 3 * s, y - 15 * s), (fx + 3 * s, y - 15 * s)]], .8 * s, color='#4f5760')
    r.lines([[(fx - 1 * s, y - 3 * s), (fx - 1 * s, y - 14 * s)], [(fx + 1 * s, y - 3 * s), (fx + 1 * s, y - 14 * s)]], .4 * s, color='#c9d2d9')
    for px in (x, x + w):
        r.line([(px, y), (px, y - h)], 1.0 * s, color=P['logs_s'], jitter=False)
    rf = [(x - 3 * s, y - h), (x + w + 3 * s, y - h), (x + w + d + 3 * s, y - h - dy - 4 * s), (x + d - 3 * s, y - h - dy - 4 * s)]
    r.shape(rf, P['tes'], .7 * s, shade=True)
    r.lines([[_on_quad([rf[0], rf[1], rf[2], rf[3]], k / 7, 0), _on_quad([rf[0], rf[1], rf[2], rf[3]], k / 7, 1)] for k in range(1, 7)], .3 * s, op=.5)
    if r.winter:
        roof_cap(r, rf, s * .7)
    if not r.winter:
        r.blob(fx, y + 1 * s, 7 * s, 1.4 * s, '#ead7a8', 0, n=9, ink=False)


# ---------------------------------------------------------------- the mill
def mill_yard(r, cx, y, s=1.0, stage=0, lit=False):
    P = r.P
    if stage >= 3:
        granary(r, cx - 50 * s, y + 3 * s, s * .8, lit)
    Q.windmill(r, cx, y, s, sails=stage >= 1)
    if stage == 0:
        _weeds(r, cx - 16 * s, cx + 20 * s, y + 2 * s, n=9, h=5 * s)
    if stage >= 2:
        # millstones leaning on the trestle, sacks of flour by the ladder
        for k, mx in enumerate((cx - 18 * s, cx - 12 * s)):
            r.blob(mx, y - 4.4 * s, 4.4 * s, 4.4 * s, mix(P['grey_s'], P['plaster'], .3), .5 * s, n=12, wob=.03)
            r.blob(mx, y - 4.4 * s, 1.1 * s, 1.1 * s, dark(P['grey_s'], .3), 0, n=7, ink=False)
        for k in range(3):
            sx = cx + 14 * s + k * 4.6 * s
            r.blob(sx, y + 2 * s - (k == 1) * 3 * s, 2.6 * s, 3 * s, '#f1e8d2', .4 * s, n=9, wob=.06)


def granary(r, cx, y, s=1.0, lit=False):
    """a log granary (амбар) on stilts with a plank door and a tes roof"""
    P = r.P
    w, hw, g, d = 30 * s, 16 * s, 12 * s, 18 * s
    x = cx - w / 2
    dy = d * .42
    r.shadow([(x + w, y), (x + w + d, y - dy), (x + w + d + 18 * s, y - dy + 6 * s), (x + w + 10 * s, y + 6 * s), (x + 2 * s, y + 4 * s)], .7)
    for px in (x + 2 * s, x + w - 2 * s, x + w + d - 2 * s):
        r.line([(px, y if px < x + w else y - dy), (px, (y if px < x + w else y - dy) - 4 * s)], 1.2 * s, color=P['logs_s'], jitter=False)
    yb = y - 4 * s
    r.shape([(x + w, yb), (x + w + d, yb - dy), (x + w + d, yb - hw - dy), (x + w, yb - hw)], P['logs_s'], .8 * s, shade=True)
    quad(r, x, yb - hw, x + w, yb, P['logs'], .9 * s)
    r.lines([[(x + .6, yb - hw * k / 6), (x + w - .6, yb - hw * k / 6)] for k in range(1, 6)], .3 * s, op=.45)
    quad(r, x + w * .35, yb - hw * .8, x + w * .65, yb, P['grey'], .5 * s)
    r.line([(x + w * .35, yb - hw * .4), (x + w * .65, yb - hw * .4)], .6 * s, color=P['logs_s'], jitter=False)
    rs = [(x + w + 3 * s, yb - hw + 1), (x + w / 2, yb - hw - g), (x + w / 2 + d, yb - hw - g - dy), (x + w + 3 * s + d, yb - hw - dy + 1)]
    r.shape(rs, P['tes_s'], .8 * s, shade=True)
    if r.winter:
        roof_cap(r, rs, s * .7)
    r.shape([(x - 3 * s, yb - hw), (x + w / 2, yb - hw - g), (x + w + 3 * s, yb - hw)], P['grey'], .8 * s)
    sign_text(r, x + w / 2, yb - hw - g * .3, 'МУКА', 3.2 * s, P['ink'])


# ---------------------------------------------------------------- the Карповы
def karpov_yard(r, cx, y, s=1.0, stage=0, lit=False):
    P = r.P
    x = cx - 45 * s
    Wf, Hw, G, D_ = 66 * s, 40 * s, 30 * s, 24 * s
    if stage >= 1 and not r.winter:
        garden(r, [(x + Wf + 62 * s, y - 38 * s), (x + Wf + 100 * s, y - 40 * s), (x + Wf + 104 * s, y - 22 * s), (x + Wf + 60 * s, y - 20 * s)], rows=4)
    if stage >= 3:
        izba(r, x, y, s, roof='iron_r', frame=P['white'], shutters=True, yard=True, svetelka=True, lit=lit, smoke_on=True)
    else:
        izba(r, x, y, s, roof='tes', frame=P['green'] if stage else light(P['grey'], .12), shutters=False, yard=stage >= 2, lit=lit, smoke_on=True, carved=False)
    if stage == 0:
        q = _gable_roof_pts(x, y, Wf, Hw, G, D_, 4 * s)
        # patches of odd boards on the roof, a boarded window, the fence fallen
        for u, v, c in ((.3, .4, light(P['tes_s'], .2)), (.6, .7, dark(P['tes_s'], .15))):
            pts = [_on_quad(q, u, v), _on_quad(q, u + .16, v - .02), _on_quad(q, u + .17, v + .16), _on_quad(q, u + .01, v + .18)]
            r.shape(pts, c, .5 * s)
        _boarded(r, x + Wf * 5 / 6, y - Hw * .55, s * .9)
        # what is left of the fence: some pickets standing, some down in the grass
        fy = y + 9 * s
        for k, px in enumerate([x - 9 * s + i * 4.1 * s * .75 for i in range(28)]):
            if k % 5 in (1, 2):
                r.shape([(px, fy), (px + 6 * s * .75, fy + 1.4 * s), (px + 6 * s * .75, fy + 3 * s), (px, fy + 1.6 * s)], P['grey_s'], .35 * s)
            elif k % 7 != 3:
                hh = 14 * .75 * s * (.75 + .25 * math.sin(k * 1.7))
                lean = (k % 3 - 1) * 2 * s
                r.shape([(px, fy), (px + 2 * s, fy), (px + 2 * s + lean, fy - hh), (px + lean, fy - hh - 1.4 * s)], P['grey'], .4 * s)
        _weeds(r, x + Wf + 60 * s, x + Wf + 100 * s, y - 22 * s, n=10, h=7 * s)
    else:
        palisade(r, x - 9 * s, x + Wf + 49 * s, y + 9 * s, .75, gate=(x + Wf + 25 * s, x + Wf + 41 * s))
    if stage >= 3 and not r.winter:
        flowers(r, x + 4 * s, x + Wf - 4 * s, y + 2 * s, y + 7 * s, 10)
        # the kids at the gate
        for k, kc in enumerate((P['coat1'], P['coat4'], P['coat2'])):
            person(r, x + Wf + 46 * s + k * 5 * s, y + 13 * s, 1.1, coat=kc, kind='kid')


# ---------------------------------------------------------------- the shared buildings
def club(r, cx, y, s=1.0, lit=False):
    """The village club: a wide log hall with its gable to the street, a porch on two posts, a sign, a red star on
    the gable and a poster board; bunting from the gable to a pole."""
    P = r.P
    w, hw, g, d = 50 * s, 24 * s, 18 * s, 30 * s
    x = cx - w / 2
    dy = d * .42
    r.shadow([(x + w, y), (x + w + d, y - dy), (x + w + d + 30 * s, y - dy + 10 * s), (x + w + 20 * s, y + 9 * s), (x + 4 * s, y + 5 * s)])
    side = [(x + w, y), (x + w + d, y - dy), (x + w + d, y - hw - dy), (x + w, y - hw)]
    r.shape(side, P['logs_s'], .9 * s, shade=True)
    r.lines([[(x + w, y - hw * k / 8), (x + w + d, y - dy - hw * k / 8)] for k in range(1, 8)], .3 * s, op=.45)
    for k in range(3):
        window(r, x + w + d * (k + .5) / 3, y - hw * .55 - dy * (k + .5) / 3, s * .75, P['white'], lit, False, kind='plain')
    rs = [(x + w + 4 * s, y - hw + 1), (x + w / 2, y - hw - g), (x + w / 2 + d, y - hw - g - dy), (x + w + 4 * s + d, y - hw - dy + 1)]
    r.shape(rs, P['iron_r_s'], .9 * s, shade=True)
    r.lines([[_on_quad(rs, u, .02), _on_quad(rs, u, .98)] for u in (.2, .4, .6, .8)], .3 * s, op=.4)
    if r.winter:
        roof_cap(r, rs, s)
    quad(r, x, y - hw, x + w, y, P['logs'], 1.1 * s)
    r.lines([[(x + .6, y - hw * k / 8), (x + w - .6, y - hw * k / 8)] for k in range(1, 8)], .3 * s, op=.45)
    r.rim([(x - .6, y - 1), (x - .6, y - hw)], .8 * s)
    gab = [(x - 4 * s, y - hw), (x + w / 2, y - hw - g), (x + w + 4 * s, y - hw)]
    r.shape(gab, P['white'], .9 * s)
    # a red star in the gable, the sign under it
    sx, sy = x + w / 2, y - hw - g * .45
    star = [(sx + 4 * s * math.cos(math.pi / 2 + k * math.pi / 5) * (1 if k % 2 == 0 else .42), sy - 4 * s * math.sin(math.pi / 2 + k * math.pi / 5) * (1 if k % 2 == 0 else .42)) for k in range(10)]
    r.shape(star, P['accent'], .4 * s)
    quad(r, x + w * .26, y - hw + 1.2 * s, x + w * .74, y - hw + 7.6 * s, '#2f5d8a', .6 * s)
    sign_text(r, x + w / 2, y - hw + 6.2 * s, 'КЛУБ', 5 * s, '#fff8e6')
    # two windows and the double door under a porch roof
    for fx in (.17, .83):
        window(r, x + w * fx, y - hw * .45, s * .85, P['white'], lit, False, kind='plain')
    d0, d1 = x + w * .38, x + w * .62
    quad(r, d0, y - hw * .5, d1, y, '#8a4b2a', .6 * s)
    r.line([((d0 + d1) / 2, y - hw * .5), ((d0 + d1) / 2, y)], .4 * s, jitter=False)
    for px in (d0 - 3 * s, d1 + 3 * s):
        r.line([(px, y + 2 * s), (px, y - hw * .58)], .9 * s, color=P['white'], jitter=False)
    pr = [(d0 - 6 * s, y - hw * .58), (d1 + 6 * s, y - hw * .58), (d1 + 3 * s, y - hw * .72), (d0 - 3 * s, y - hw * .72)]
    r.shape(pr, P['iron_r'], .6 * s)
    if r.winter:
        r.shape([pr[3], pr[2], (pr[2][0], pr[2][1] - 1.4 * s), (pr[3][0], pr[3][1] - 1.4 * s)], P['snow'], .3 * s)
    # the poster board at the left: a film tonight
    bx = x - 10 * s
    r.lines([[(bx, y + 2 * s), (bx, y - 14 * s)], [(bx + 8 * s, y + 2 * s), (bx + 8 * s, y - 14 * s)]], .8 * s, color=P['logs_s'])
    quad(r, bx - 1 * s, y - 16 * s, bx + 9 * s, y - 6 * s, P['white'], .5 * s)
    quad(r, bx + .6 * s, y - 14.6 * s, bx + 7.4 * s, y - 10.4 * s, P['accent'], .25 * s)
    r.lines([[(bx + .8 * s, y - 9 * s), (bx + 7 * s, y - 9 * s)], [(bx + .8 * s, y - 7.6 * s), (bx + 5 * s, y - 7.6 * s)]], .35 * s, op=.7)
    if not r.winter:
        Q.bunting(r, x + w / 2, y - hw - g + 2 * s, x + w + 22 * s, y - 14 * s, 4 * s, s, n=8)
        r.line([(x + w + 22 * s, y + 3 * s), (x + w + 22 * s, y - 15 * s)], .8 * s, jitter=False)


def pump_tower(r, cx, y, s=1.0):
    """The village water tower (водокачка): a brick shaft with arched windows, the tank in a plank skirt, a tin
    cone with a vane; a pipe and a trough at its foot."""
    P = r.P
    bw, bh = 14 * s, 26 * s
    x = cx - bw / 2
    r.shadow([(x + bw, y), (x + bw + 20 * s, y - 2 * s), (x + bw + 26 * s, y + 4 * s), (x + 2 * s, y + 3 * s)], .7)
    quad(r, x, y - bh, x + bw, y, P['brick'], .9 * s)
    r.shape([(x + bw, y), (x + bw + 5 * s, y - 2 * s), (x + bw + 5 * s, y - bh - 2 * s), (x + bw, y - bh)], P['brick_s'], .6 * s, shade=True)
    r.lines([[(x + .6, y - bh * k / 9), (x + bw - .6, y - bh * k / 9)] for k in range(1, 9)], .25 * s, op=.4)
    for wy in (y - bh * .3, y - bh * .72):
        r.shape([(cx - 2 * s, wy + 3 * s), (cx + 2 * s, wy + 3 * s), (cx + 2 * s, wy - 1 * s), (cx, wy - 3 * s), (cx - 2 * s, wy - 1 * s)], P['glass'], .4 * s)
    tw, th = 22 * s, 12 * s
    tx, ty = cx - tw / 2, y - bh
    quad(r, tx, ty - th, tx + tw, ty, P['grey'], .8 * s)
    r.lines([[(tx + tw * k / 9, ty - .5), (tx + tw * k / 9, ty - th + .5)] for k in range(1, 9)], .3 * s, op=.45)
    r.shape([(tx + tw, ty), (tx + tw + 6 * s, ty - 2.4 * s), (tx + tw + 6 * s, ty - th - 2.4 * s), (tx + tw, ty - th)], P['grey_s'], .6 * s, shade=True)
    cone = [(tx - 2 * s, ty - th), (tx + tw + 6 * s + 1 * s, ty - th - 2 * s), (cx + 3 * s, ty - th - 13 * s)]
    r.shape(cone, P['iron_g'], .8 * s, shade=True)
    if r.winter:
        r.shape([cone[0], cone[1], (cx + 6 * s, ty - th - 7 * s), (cx - 2 * s, ty - th - 7 * s)], P['snow'], .4 * s)
    r.line([(cx + 3 * s, ty - th - 13 * s), (cx + 3 * s, ty - th - 18 * s)], .6 * s, jitter=False)
    r.group(lambda: r.shape([(0, 0), (5 * s, -1 * s), (5 * s, 1.4 * s)], P['accent'], .3 * s), cx + 3 * s, ty - th - 17 * s, 'vane')
    # the pipe down to a trough
    r.line([(x + bw + 2 * s, y - 6 * s), (x + bw + 8 * s, y - 6 * s), (x + bw + 8 * s, y - 2 * s)], .9 * s, color='#4f5760', jitter=False)
    quad(r, x + bw + 4 * s, y - 2 * s, x + bw + 16 * s, y + 1.6 * s, P['logs_s'], .5 * s)
    if not r.winter:
        quad(r, x + bw + 5 * s, y - 1.6 * s, x + bw + 15 * s, y - .6 * s, P['water'], 0)


def hostel(r, cx, y, s=1.0, lit=False):
    """The hostel (общежитие): a long two-storey house with a balcony gallery, the sign over the door."""
    P = r.P
    w, h1, h2, d = 64 * s, 16 * s, 15 * s, 24 * s
    x = cx - w / 2
    dy = d * .42
    hw = h1 + h2
    r.shadow([(x + w, y), (x + w + d, y - dy), (x + w + d + 34 * s, y - dy + 12 * s), (x + w + 22 * s, y + 10 * s), (x + 4 * s, y + 6 * s)])
    r.shape([(x + w, y), (x + w + d, y - dy), (x + w + d, y - hw - dy), (x + w, y - hw)], dark(P['plaster'], .1), .9 * s, shade=True)
    window(r, x + w + d * .5, y - h1 * .55 - dy * .5, s * .75, P['white'], lit, False, kind='plain')
    window(r, x + w + d * .5, y - h1 - h2 * .5 - dy * .5, s * .75, P['white'], lit, False, kind='plain')
    quad(r, x, y - h1, x + w, y, P['plaster'], 1.0 * s)
    quad(r, x, y - hw, x + w, y - h1, P['logs'], 1.0 * s)
    r.lines([[(x + .6, y - h1 - h2 * k / 6), (x + w - .6, y - h1 - h2 * k / 6)] for k in range(1, 6)], .3 * s, op=.45)
    r.rim([(x - .6, y - 1), (x - .6, y - hw)], .8 * s)
    rf = [(x - 4 * s, y - hw + 1), (x + w + 3 * s, y - hw + 1), (x + w + d / 2, y - hw - 14 * s - dy / 2), (x + d / 2 - 4 * s, y - hw - 14 * s - dy / 2)]
    r.shape(rf, P['iron_g'], 1.0 * s)
    r.lines([[(rf[0][0] + (rf[1][0] - rf[0][0]) * k / 12, rf[0][1]), (rf[3][0] + (rf[2][0] - rf[3][0]) * k / 12, rf[3][1])] for k in range(1, 12)], .3 * s, op=.4, color=P['iron_g_s'])
    r.shape([rf[1], rf[2], (x + w + d + 2 * s, y - hw - dy + 1), (x + w + d, y - hw - dy + 3 * s)], P['white'], .7 * s)
    if r.winter:
        r.shape([rf[3], rf[2], (rf[2][0] - 4 * s, rf[2][1] + 9 * s), (rf[3][0] - 2 * s, rf[3][1] + 10 * s)], P['snow'], .7 * s)
    n = 5
    for i in range(n):
        wx = x + w * (i + .5) / n
        if i != 2:
            window(r, wx, y - h1 * .5, s * .8, P['white'], lit, False, kind='plain')
        window(r, wx, y - h1 - h2 * .55, s * .8, P['blue'], lit, False)
    # the door and the sign
    quad(r, x + w * .44, y - h1 * .8, x + w * .56, y, '#8a4b2a', .5 * s)
    quad(r, x + w * .3, y - h1 - 1.2 * s, x + w * .7, y - h1 + 3.6 * s, '#2f5d8a', .5 * s)
    sign_text(r, x + w / 2, y - h1 + 2.6 * s, 'ОБЩЕЖИТИЕ', 3.0 * s, '#fff8e6')
    # the gallery's rail along the upper floor
    r.line([(x - 1 * s, y - h1 + .5 * s), (x + w + 1 * s, y - h1 + .5 * s)], .8 * s, jitter=False)
    if not r.winter:
        Q.laundry(r, x + w + 6 * s, x + w + 26 * s, y + 4 * s, 16 * s)


def brook(r, pts, wd=4.0):
    """a little brook along a line: water with a pale shine, ink banks"""
    P = r.P
    top = [(x, y - wd / 2) for x, y in pts]
    bot = [(x, y + wd / 2) for x, y in pts[::-1]]
    r.shape(top + bot, P['water'] if not r.winter else mix(P['snow'], P['water'], .25), .6, curve=True)
    if not r.winter:
        r.lines([[(x - 3, y - .4), (x + 3, y - .6)] for x, y in pts[1:-1:2]], .5, color='#e6f3fb')


def bridge(r, cx, y, s=1.0):
    """a plank footbridge with rails over the brook"""
    P = r.P
    w = 18 * s
    x = cx - w / 2
    r.shape([(x - 3 * s, y + 1 * s), (x + w + 3 * s, y + 1 * s), (x + w + 1 * s, y - 2.2 * s), (x - 1 * s, y - 2.2 * s)], P['logs'], .6 * s)
    r.lines([[(x + w * k / 8, y + 1 * s), (x + w * k / 8 + 1 * s, y - 2 * s)] for k in range(1, 8)], .3 * s, op=.5)
    for px in (x, x + w):
        r.line([(px, y - 1 * s), (px, y - 7 * s)], .6 * s, color=P['logs_s'], jitter=False)
    r.line([(x - 1 * s, y - 6 * s), (x + w + 1 * s, y - 6 * s)], .6 * s, color=P['logs_s'], jitter=False)


def stepping_stones(r, cx, y, s=1.0):
    """before the bridge: stones across the brook and a broken pile"""
    P = r.P
    r.dots([(cx - 6 * s, y + .4 * s, 1.8 * s, 1 * s), (cx - 1 * s, y - .4 * s, 1.6 * s, .9 * s), (cx + 4 * s, y + .2 * s, 1.8 * s, 1 * s)], mix(P['grey_s'], P['plaster'], .3), .3 * s)
    r.line([(cx + 9 * s, y + 1 * s), (cx + 11 * s, y - 5 * s)], .8 * s, color=P['logs_s'], jitter=False)


# ---------------------------------------------------------------- Пряхин at the market
def pryakhin(r, x, y, s=1.0):
    """The rival at the fair: a stout man in a dark coat and a cap, his notebook open, looking at a lot."""
    P = r.P
    r.shadow([(x - 3 * s, y), (x + 8 * s, y - 1 * s), (x + 10 * s, y + 2 * s), (x - 2 * s, y + 2 * s)], .6)
    person(r, x, y, 1.25 * s, coat='#3d3b45', kind='man', facing=-1)
    # a cap with a peak
    r.shape([(x - 3 * s, y - 17.4 * s), (x + 3 * s, y - 17.4 * s), (x + 2.6 * s, y - 19.6 * s), (x - 2.4 * s, y - 19.6 * s)], '#2b2a31', .4 * s)
    r.shape([(x - 3 * s, y - 17.4 * s), (x - 6 * s, y - 16.8 * s), (x - 5.4 * s, y - 17.8 * s)], '#2b2a31', .3 * s)
    # the notebook in his hands, a pencil
    quad(r, x - 6 * s, y - 10 * s, x - 1.6 * s, y - 7 * s, '#fff8e6', .35 * s)
    r.line([(x - 5 * s, y - 8.6 * s), (x - 2.6 * s, y - 8.6 * s)], .25 * s, op=.6, jitter=False)
    r.line([(x - 1 * s, y - 9.6 * s), (x + 1 * s, y - 12 * s)], .4 * s, color=P['accent'], jitter=False)


# ---------------------------------------------------------------- Пряхин's antonovka (29.10)
def antonovka(r, x, y, s=1.0):
    """The cutting of Пряхин's antonovka grown into a young apple tree: tied to a stake, a few yellow-green apples,
    a little white picket ring round it."""
    P = r.P
    H.apple(r, x, y, 34 * s)
    r.line([(x + 4 * s, y + 1 * s), (x + 4 * s, y - 16 * s)], .8 * s, color=P['logs_s'], jitter=False)
    r.line([(x + 4 * s, y - 9 * s), (x + 1 * s, y - 9 * s)], .5 * s, color=P['straw'], jitter=False)
    if not r.winter:
        r.dots([(x - 5 * s, y - 22 * s, 1.6 * s, 1.6 * s), (x + 3 * s, y - 27 * s, 1.6 * s, 1.6 * s), (x + 7 * s, y - 20 * s, 1.6 * s, 1.6 * s)], '#d6d86a', .3 * s)
    for k in range(7):
        a = math.pi * (k / 6)
        px, py = x + math.cos(a) * 9 * s, y + 2 * s + math.sin(a) * 2.6 * s
        r.shape([(px - .9 * s, py), (px + .9 * s, py), (px + .9 * s, py - 5 * s), (px, py - 6 * s), (px - .9 * s, py - 5 * s)], P['white'], .3 * s)
