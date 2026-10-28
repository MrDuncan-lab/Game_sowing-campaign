# Life in the village and its seasons (28.10): what moves about so the village is worth watching, and what spring
# and autumn add to the summer drawing.
#
# The summer drawing serves spring, summer and autumn (src/ui/Village.tsx picks it for seasons 0..2); a piece that
# belongs to some of them only sits in a group the season class shows: `vs vs-sp` spring, `vs-su` summer, `vs-au`
# autumn (several classes: several seasons). Winter has its own drawing and its own life (snowfall, a sledge, a
# skier).
#
# Movement is transform and opacity only, on small groups. Everything that moves here carries the class `lv` (the
# game pauses `lv` while the village is behind the field or moving, src/village.css); fallers (leaves, petals, snow)
# also carry `lvf` and are hidden for reduced motion, movers stand still at their start. Movers go out and back
# along a straight line: their keyframes have this piece's numbers in them, so they are generated here and
# exported with the season rules (V_SEASON_CSS); the shared ones (falling, fluttering, digging) are in village.css.
import math
import random
from hy import fmt, mix, dark, light
import hy as H

CSS = {}                  # name -> generated rules (the same name always gets the same rules)


def css():
    return ''.join(CSS[k] for k in sorted(CSS))


def seasons(r, which, fn):
    """Draw fn() in a group shown only in the named seasons of the summer drawing ('sp', 'su', 'au')."""
    svg = r.capture(fn)[0]
    r.add(f'<g class="vs {" ".join("vs-" + w for w in which)}">{svg}</g>')


def _pct(v):
    return f'{v:.2f}'.rstrip('0').rstrip('.') + '%'


def mover(r, name, fn, x0, y0, x1, y1, dur, delay=0.0, pause=6.0, faces=1, back=True):
    """fn() draws a figure at the origin facing +x (faces=1) or -x (faces=-1). It walks (rides, drives) from (x0, y0)
    to (x1, y1), waits, turns and comes back (back=False: it goes one way, waits off the picture, starts again)."""
    svg = r.capture(fn)[0]
    dx, dy = x1 - x0, y1 - y0
    go = 1 if dx >= 0 else -1
    s0 = go * faces
    a = f'{dur}s linear {-delay:.1f}s infinite'
    if back:
        h = 50 - pause / 2
        kf = (f'0%{{transform:translate(0,0)}}{_pct(h)}{{transform:translate({fmt(dx)}px,{fmt(dy)}px)}}'
              f'{_pct(100 - h)}{{transform:translate({fmt(dx)}px,{fmt(dy)}px)}}{_pct(100 - pause)},100%{{transform:translate(0,0)}}')
        face = (f'@keyframes v-mf-{name}{{0%{{transform:scaleX({s0})}}50%{{transform:scaleX({-s0})}}{_pct(100 - pause)}{{transform:scaleX({s0})}}}}'
                f'.village .mf-{name}{{transform-box:fill-box;transform-origin:50% 50%;animation:v-mf-{name} {dur}s step-end {-delay:.1f}s infinite}}')
        inner = f'<g class="lv mf-{name}">{svg}</g>'
    else:
        h = 100 - pause
        kf = f'0%{{transform:translate(0,0)}}{_pct(h)},100%{{transform:translate({fmt(dx)}px,{fmt(dy)}px)}}'
        face = ''
        inner = f'<g transform="scale({s0} 1)">{svg}</g>' if s0 < 0 else svg
    CSS[name] = f'@keyframes v-mv-{name}{{{kf}}}.village .mv-{name}{{animation:v-mv-{name} {a}}}{face}'
    r.add(f'<g transform="translate({fmt(x0)} {fmt(y0)})"><g class="lv mv-{name}">{inner}</g></g>')


def at(r, x, y, cls, fn, style=''):
    """fn() drawn at the origin, placed at (x, y), animated by a shared class of village.css."""
    svg = r.capture(fn)[0]
    st = f' style="{style}"' if style else ''
    r.add(f'<g transform="translate({fmt(x)} {fmt(y)})"><g class="{cls}"{st}>{svg}</g></g>')


# ---------------------------------------------------------------- figures (drawn at the origin, facing +x)
def rider(r, s=1.0, coat=None):
    """A kid on a bicycle: the wheels turn."""
    P = r.P
    for wx in (-5 * s, 5 * s):
        r.add(f'<g transform="translate({fmt(wx)} {fmt(-3.2 * s)})"><g class="lv spin">'
              f'<circle r="{fmt(3.2 * s)}" fill="none" stroke="{P["ink"]}" stroke-width=".55"/>'
              f'<path d="M{fmt(-3 * s)} 0H{fmt(3 * s)}M0 {fmt(-3 * s)}V{fmt(3 * s)}" stroke="{P["ink"]}" stroke-width=".3" opacity=".6"/></g></g>')
    r.line([(-5 * s, -3.2 * s), (-1 * s, -8 * s), (5 * s, -3.2 * s), (0, -3.2 * s), (-5 * s, -3.2 * s)], .6, color=P['blue'], jitter=False)
    r.line([(3.6 * s, -9 * s), (5 * s, -3.2 * s)], .6, color=P['blue'], jitter=False)
    r.line([(-.6 * s, -6.4 * s), (.8 * s, -3.6 * s)], .8 * s, color=P['soil'], jitter=False)
    H.person(r, -1 * s, -6.2 * s, s * .95, coat=coat or P['coat2'], kind='kid', pose='walk', scarf=P['coat4'])
    r.line([(.4 * s, -11.6 * s), (3.6 * s, -9.4 * s)], .55 * s, color=dark(coat or P['coat2'], .3), jitter=False)


def grandpa(r, s=1.0):
    P = r.P
    H.person(r, 0, 0, s, coat=P['grey_s'], kind='man', pose='walk')
    r.line([(2.2 * s, -7 * s), (3.4 * s, 0)], .55 * s, color=P['logs_s'], jitter=False)
    r.shape([(-2.6 * s, -14.6 * s), (2.6 * s, -14.6 * s), (2 * s, -16.4 * s), (-2 * s, -16.4 * s)], P['grey'], .3 * s)


def waiter(r, s=1.0):
    P = r.P
    H.person(r, 0, 0, s, coat=P['white'], kind='man', pose='walk')
    r.line([(-2.6 * s, -4.6 * s), (2.6 * s, -4.6 * s)], .9 * s, color=P['soil'], jitter=False)
    r.line([(2 * s, -9 * s), (4.6 * s, -10.6 * s)], .5 * s, jitter=False)
    r.shape([(2.4 * s, -10.8 * s), (7.4 * s, -10.8 * s), (7 * s, -11.6 * s), (2.8 * s, -11.6 * s)], P['grey'], .3 * s)
    r.blob(4.2 * s, -12.6 * s, 1 * s, 1 * s, P['white'], .25 * s, n=6)
    r.blob(6 * s, -12.4 * s, .9 * s, .8 * s, P['accent'], .25 * s, n=6)


def baker(r, s=1.0):
    P = r.P
    H.person(r, 0, 0, s, coat=P['white'], kind='man')
    r.shape([(-2.2 * s, -14.4 * s), (2.2 * s, -14.4 * s), (2.8 * s, -19 * s), (-2.8 * s, -19 * s)], '#ffffff', .35 * s)
    r.blob(0, -19.2 * s, 3.4 * s, 1.6 * s, '#ffffff', .35 * s, n=8)
    r.shape([(-8 * s, -9.4 * s), (-1.5 * s, -9.4 * s), (-1.8 * s, -10.4 * s), (-7.6 * s, -10.4 * s)], P['logs_s'], .3 * s)
    r.dots([(-6.4 * s, -11.4 * s, 1.4 * s, .9 * s), (-3.2 * s, -11.4 * s, 1.4 * s, .9 * s)], '#c98a45', .3 * s)


def dog(r, s=1.0):
    """The dog of the yard, running (it faces -x as hy.dog draws it)."""
    H.dog(r, 0, 0, s)


def tractor(r, s=1.0):
    P = r.P
    r.shape([(-5 * s, -3 * s), (4 * s, -3 * s), (5 * s, -6 * s), (-1 * s, -6.4 * s)], P['accent'], .4 * s)
    r.shape([(-5 * s, -6 * s), (-1 * s, -6 * s), (-1 * s, -11 * s), (-5 * s, -11 * s)], P['accent'], .4 * s)
    r.shape([(-4.2 * s, -7 * s), (-1.8 * s, -7 * s), (-1.8 * s, -10 * s), (-4.2 * s, -10 * s)], P['glass'], .25 * s)
    r.line([(2.6 * s, -6 * s), (2.6 * s, -9.6 * s)], .6 * s, jitter=False)
    for wx, wr in ((-3.4 * s, 3.4 * s), (3.6 * s, 2 * s)):
        r.add(f'<circle cx="{fmt(wx)}" cy="{fmt(-wr)}" r="{fmt(wr)}" fill="{P["soil"]}" class="kf" stroke-width="{fmt(.4 * s)}"/>')
        r.add(f'<circle cx="{fmt(wx)}" cy="{fmt(-wr)}" r="{fmt(wr * .4)}" fill="{P["coat4"]}"/>')
    # the puff from its pipe
    r.add(f'<g transform="translate({fmt(2.8 * s)} {fmt(-11 * s)})"><circle class="lv lvf puff" r="{fmt(1.4 * s)}" fill="{P["smoke"]}"/></g>')


def train(r, s=1.0, winter=False):
    """A little train on the far ridge: the engine first, three wagons behind."""
    P = r.P
    eng = '#3f5a4a' if not winter else '#3a4d63'
    r.shape([(-9 * s, -1 * s), (0, -1 * s), (1.4 * s, -3.6 * s), (-9 * s, -3.6 * s)], eng, .3 * s, iop=.8)
    r.shape([(-9 * s, -3.6 * s), (-6 * s, -3.6 * s), (-6 * s, -6.6 * s), (-9 * s, -6.6 * s)], eng, .3 * s, iop=.8)
    r.shape([(-2.4 * s, -3.6 * s), (-1.2 * s, -3.6 * s), (-1.2 * s, -6 * s), (-2.4 * s, -6 * s)], P['ink'], 0, ink=False)
    if winter:
        r.add(f'<circle cx="{fmt(.6 * s)}" cy="{fmt(-2.6 * s)}" r="{fmt(.7 * s)}" fill="{P["win"]}"/>')
    r.add(f'<g transform="translate({fmt(-1.8 * s)} {fmt(-7 * s)})"><circle class="lv lvf puff" r="{fmt(1.6 * s)}" fill="{P["smoke"]}"/>'
          f'<circle class="lv lvf puff" style="animation-delay:-.9s" r="{fmt(1.3 * s)}" fill="{P["smoke"]}"/></g>')
    cols = [P['iron_r'], P['logs_s'], P['iron_g']]
    for i, c in enumerate(cols):
        x = -10.4 * s - i * 9.4 * s
        r.shape([(x - 8.2 * s, -1 * s), (x, -1 * s), (x, -4.8 * s), (x - 8.2 * s, -4.8 * s)], c, .3 * s, iop=.8)
        if winter:
            r.dots([(x - 2.2 * s, -3.2 * s, .7 * s, .6 * s), (x - 5.6 * s, -3.2 * s, .7 * s, .6 * s)], P['win'])
    r.dots([(x, -.6 * s, .9 * s, .9 * s) for x in [-7.5 * s, -2 * s] + [-10.4 * s - i * 9.4 * s - d * s for i in range(3) for d in (1.6, 6.6)]], P['ink'], op=.8)


def kite(r, length=68, ang=-.42):
    """A kite on its string; drawn from the hand at the origin. The group swings about the hand."""
    P = r.P
    kx, ky = math.sin(ang) * length, -math.cos(ang) * length
    r.add(f'<path d="M0 0Q{fmt(kx * .35)} {fmt(ky * .3)} {fmt(kx)} {fmt(ky)}" class="k" stroke-width=".35" opacity=".75"/>')
    pts = [(kx, ky - 6), (kx + 4.2, ky), (kx, ky + 7), (kx - 4.2, ky)]
    r.shape(pts, P['accent'], .4)
    r.shape([(kx, ky - 6), (kx + 4.2, ky), (kx, ky)], P['coat4'], 0, ink=False)
    r.line([(kx, ky - 6), (kx, ky + 7)], .3, jitter=False)
    r.line([(kx - 4.2, ky), (kx + 4.2, ky)], .3, jitter=False)
    tail = [(kx, ky + 7), (kx + 2, ky + 11), (kx - 1, ky + 15), (kx + 1.6, ky + 19)]
    r.add(f'<path d="{H.SD(tail, False)}" class="k" stroke-width=".35"/>')
    r.dots([(x, y, 1.1, .6) for x, y in tail[1:]], P['blue'])


def butterfly(r, col):
    P = r.P
    r.add(f'<g class="lv flut"><path d="M0 0C-2.6-2.8-4.4-1-3.2.6C-4 2 -1.8 2.6 0 0C1.8 2.6 4 2 3.2.6C4.4-1 2.6-2.8 0 0Z" fill="{col}" class="kf" stroke-width=".25"/></g>')
    r.add(f'<path d="M0-1.2V1.4" class="k" stroke-width=".5"/>')


def leaf(r, col, s=1.0):
    r.add(f'<path d="M0 {fmt(-1.8 * s)}C{fmt(1.6 * s)} {fmt(-.8 * s)} {fmt(1.4 * s)} {fmt(1.2 * s)} 0 {fmt(1.8 * s)}C{fmt(-1.4 * s)} {fmt(1.2 * s)} {fmt(-1.6 * s)} {fmt(-.8 * s)} 0 {fmt(-1.8 * s)}Z" fill="{col}"/>')


def rook(r, s=1.0, f=1):
    P = r.P
    c = '#2e2a30'
    r.blob(0, -2.6 * s, 2.8 * s, 1.8 * s, c, .3 * s, n=8, wob=.04, rot=-.2 * f)
    r.blob(f * 2.6 * s, -4.2 * s, 1.2 * s, 1.1 * s, c, .25 * s, n=7)
    r.shape([(f * 3.6 * s, -4.6 * s), (f * 5.2 * s, -4 * s), (f * 3.6 * s, -3.8 * s)], '#d8cfc0', 0, ink=False)
    r.line([(-f * 2.4 * s, -2.2 * s), (-f * 4.6 * s, -1.4 * s)], .9 * s, color=c, jitter=False)
    r.line([(0, -1 * s), (0, .4 * s)], .35 * s, jitter=False)


def pumpkin(r, x, y, s=1.0):
    P = r.P
    r.blob(x, y - 2 * s, 3 * s, 2.1 * s, '#e08a2e', .35 * s, n=9, wob=.04)
    r.add(f'<path d="M{fmt(x - 1.2 * s)} {fmt(y - 3.8 * s)}Q{fmt(x - 1.8 * s)} {fmt(y - 2 * s)} {fmt(x - 1.2 * s)} {fmt(y - .1 * s)}M{fmt(x + 1.2 * s)} {fmt(y - 3.8 * s)}Q{fmt(x + 1.8 * s)} {fmt(y - 2 * s)} {fmt(x + 1.2 * s)} {fmt(y - .1 * s)}" class="k" stroke-width="{fmt(.3 * s)}" opacity=".6"/>')
    r.line([(x, y - 3.9 * s), (x + .6 * s, y - 5 * s)], .6 * s, color=P['leaf_s'], jitter=False)


def stook(r, x, y, s=1.0):
    """A sheaf stook on a reaped field."""
    P = r.P
    r.shape([(x - 2.6 * s, y), (x, y - 6 * s), (x + 2.6 * s, y)], P['straw'], .3 * s)
    r.line([(x, y - 6 * s), (x - .6 * s, y - 7.4 * s)], .3 * s, jitter=False)


def birdhouse(r, x, y, s=1.0):
    P = r.P
    r.shape([(x - 2.2 * s, y), (x + 2.2 * s, y), (x + 2.2 * s, y - 5 * s), (x - 2.2 * s, y - 5 * s)], P['logs'], .35 * s)
    r.shape([(x - 3 * s, y - 4.6 * s), (x, y - 7.2 * s), (x + 3 * s, y - 4.6 * s)], P['tes'], .35 * s)
    r.add(f'<circle cx="{fmt(x)}" cy="{fmt(y - 2.8 * s)}" r="{fmt(.8 * s)}" fill="{P["ink"]}"/>')


def snow_patch(r, x, y, w):
    P = r.P
    r.blob(x, y, w, w * .3, P['snow'], .3, n=10, wob=.18)
    r.blob(x + w * .6, y + .6, w * .45, w * .16, P['snow'], 0, n=8, ink=False)


# ---------------------------------------------------------------- per hill
def sky(r, far_crest):
    P = r.P
    # the rails along the foot of the far ridge, and the train
    y = 118.6
    r.add(f'<path d="M-6 {fmt(y)}H{H.fmt(368)}" class="kn" stroke="{dark(P["far1"], .25)}" stroke-width=".5" opacity=".8"/>')
    mover(r, 'train', lambda: train(r, .62, r.winter), -36, y, 446, y, 74, delay=30, pause=34, back=False)


def hill_A(r, crest_at):
    if r.winter:
        return
    P = r.P
    # a tractor works across a far field and back
    y0, y1 = crest_at('A', 238) + 33, crest_at('A', 318) + 35
    mover(r, 'tractor', lambda: tractor(r, .55), 238, y0, 318, y1, 40, delay=6, pause=10)
    # autumn: stooks on the reaped strips
    seasons(r, ['au'], lambda: [stook(r, x, crest_at('A', x) + dy, .7) for x, dy in ((24, 22), (38, 24), (70, 21), (150, 27), (168, 26), (282, 20), (300, 21))])


def hill_B(r, crest_at):
    P = r.P
    if r.winter:
        # a skier crosses the meadow behind the council and back
        def skier():
            H.person(r, 0, -1, 1.0, coat=P['coat1'], kind='man', pose='walk')
            r.line([(-6, 0), (6, .2), (7, -.8)], .6, color=P['accent'], jitter=False)
            r.line([(-3, -8), (-5, 0)], .4, jitter=False)
            r.line([(3, -8), (4, 0)], .4, jitter=False)
        mover(r, 'skier', skier, 214, 306, 300, 300, 30, delay=4, pause=12)
        return
    # a boy flies a kite on the meadow behind the council (spring, summer, autumn)
    H.person(r, 244, 320, 1.0, coat=P['coat1'], kind='kid', scarf=P['coat4'])
    r.line([(244.6, 314.4), (246.6, 311.6)], .5, jitter=False)
    at(r, 246.6, 311.6, 'lv kite', lambda: kite(r, 60, -.3))

    # autumn: geese fly south over the far hill
    def geese():
        for i in range(7):
            k = (i + 1) // 2
            sd = 1 if i % 2 else -1
            r.add(f'<g transform="translate({fmt(k * 7.5)} {fmt(sd * k * 4.2)})"><g class="lv flap" style="animation-delay:{-i * .17:.2f}s">'
                  f'<path d="M-3.6 0q1.8-2.2 3.6 0q1.8-2.2 3.6 0" class="k" stroke-width=".6" opacity=".75"/></g></g>')
    seasons(r, ['au'], lambda: mover(r, 'geese', geese, 400, 196, -80, 214, 60, delay=8, pause=38, back=False, faces=-1))


def hill_C(r, crest_at):
    if r.winter:
        return
    P = r.P
    seasons(r, ['au'], lambda: [pumpkin(r, x, y, s) for x, y, s in ((288, 492, 1.1), (312, 490, .9), (340, 494, 1.2), (356, 486, .8))])
    seasons(r, ['sp'], lambda: [r.group(lambda f=f: rook(r, 1.0, f), x, y, 'peck', style=f'animation-delay:{-d:.1f}s')
                               for x, y, f, d in ((162, 522, 1, .2), (178, 528, -1, 1.0), (196, 518, 1, .6))])
    seasons(r, ['sp'], lambda: snow_patch(r, 36, 478, 9))
    seasons(r, ['sp', 'su'], lambda: butterflies(r, [(126, 546, P['coat4'], 0), (238, 542, P['white'], 3)]))


def hill_D(r, crest_at):
    P = r.P
    if r.winter:
        # a kid sledges down the slope between the birches, again and again
        def sledge():
            H.sled(r, -7, 0, .9)
            H.person(r, 0, -3, .95, coat=P['coat2'], kind='kid', pose='walk', scarf=P['coat4'])
        mover(r, 'sledge', sledge, 312, 600, 266, 636, 9, delay=2, pause=36, back=False, faces=1)
        flakes(r, [(40, 560), (120, 590), (200, 570), (280, 600), (330, 560), (90, 650), (250, 660)], 1.0, 'D')
        return
    # the baker at the bakery's door with a tray of loaves; the waiter goes to and fro on the terrace
    at(r, 100, 716, 'nod', lambda: baker(r, 1.05), 'animation-duration:5s')
    mover(r, 'waiter', lambda: waiter(r, 1.0), 268, 714, 298, 713, 12, delay=3, pause=14)
    # spring: apples blossom and lose petals; autumn: a basket of apples under the tree, leaves fall
    seasons(r, ['sp'], lambda: fallers(r, [(150, 586), (140, 590), (160, 592)], ['#fbe3ea', '#ffffff', '#f6c9d6'], .7, 'petal'))
    seasons(r, ['au'], lambda: (basket(r, 168, 620), fallers(r, [(22, 606), (30, 610), (344, 600), (222, 572), (230, 578)], ['#e6b33c', '#d9832f', '#c9562f'], 1.0, 'leaf')))
    seasons(r, ['sp'], lambda: (puddle(r, 176, 606, 5), puddle(r, 132, 704, 6)))


def hill_E(r, crest_at):
    P = r.P
    if r.winter:
        flakes(r, [(30, 730), (100, 760), (170, 740), (240, 770), (320, 745), (60, 820), (210, 830), (300, 810)], 1.2, 'E')
        return
    # a kid rides the road out of the village and back; an old man walks the street with his stick
    mover(r, 'cyclist', lambda: rider(r, 1.0), 214, 838, 374, 815, 26, delay=7, pause=16)
    mover(r, 'grandpa', lambda: grandpa(r, 1.05), 182, 849, 118, 854, 40, delay=12, pause=8)
    # spring: a man digs the garden; rooks follow him; autumn: pumpkins, and a pile of leaves smoulders
    seasons(r, ['sp'], lambda: (at(r, 222, 806, 'lv dig', lambda: digger(r, 1.05)),
                                [r.group(lambda f=f: rook(r, 1.0, f), x, y, 'peck', style=f'animation-delay:{-d:.1f}s') for x, y, f, d in ((252, 808, -1, .4), (262, 800, 1, 1.2))]))
    seasons(r, ['au'], lambda: ([pumpkin(r, x, y, s) for x, y, s in ((220, 808, 1.1), (234, 804, .9), (258, 808, 1.2))],
                                leaf_pile(r, 76, 774), at(r, 92, 774, 'lv dig', lambda: raker(r, 1.0)),
                                fallers(r, [(24, 748), (32, 752), (346, 742), (226, 744)], ['#e6b33c', '#d9832f', '#c9562f'], 1.0, 'leaf')))
    seasons(r, ['sp', 'su'], lambda: butterflies(r, [(298, 748, P['blue'], 1), (176, 812, P['coat4'], 5)]))


def hill_F(r, crest_at):
    P = r.P
    if r.winter:
        flakes(r, [(20, 900), (90, 940), (160, 910), (230, 950), (300, 920), (350, 980), (60, 1060), (140, 1100), (250, 1080), (320, 1130), (40, 1170), (200, 1180)], 1.5, 'F')
        return
    # the dog runs along the fence and back
    mover(r, 'dog', lambda: dog(r, 1.1), 254, 1208, 330, 1206, 11, delay=2, pause=18, faces=-1)
    # a starling house on the birch by the road; in spring its starling sits on the roof
    birdhouse(r, 89.6, 882, 1.0)
    seasons(r, ['sp'], lambda: r.group(lambda: rook(r, .7, 1), 89, 875, 'peck', style='animation-delay:-.5s'))
    seasons(r, ['sp', 'su'], lambda: butterflies(r, [(214, 1120, P['white'], 2), (96, 1192, P['lilac'], 4), (318, 1140, P['coat4'], 6)]))
    seasons(r, ['au'], lambda: fallers(r, [(28, 860), (88, 858), (286, 862), (334, 856), (36, 866)], ['#e6b33c', '#d9832f', '#c9562f', '#e6b33c'], 1.15, 'leaf'))
    seasons(r, ['sp'], lambda: (puddle(r, 186, 966, 6), puddle(r, 192, 1100, 5), puddle(r, 120, 1176, 7), snow_patch(r, 18, 1210, 10)))


# ---------------------------------------------------------------- shared bits
def butterflies(r, pts):
    for x, y, col, k in pts:
        at(r, x, y, 'lv bfly', lambda col=col: butterfly(r, col), f'animation-delay:{-k * 1.3:.1f}s;animation-duration:{7 + k % 3}s')


def fallers(r, pts, cols, s, kind):
    for i, (x, y) in enumerate(pts):
        col = cols[i % len(cols)]
        at(r, x, y, f'lv lvf {kind}-fall', lambda col=col: leaf(r, col, s * (.7 if kind == 'petal' else 1)),
           f'animation-delay:{-(i * 2.3 + x % 5):.1f}s;animation-duration:{7 + (i * 3) % 4}s')


def flakes(r, pts, s, key):
    rng = random.Random(key)
    for i, (x, y) in enumerate(pts):
        rr = s * rng.uniform(.7, 1.15)
        at(r, x, y, 'lv lvf flake', lambda rr=rr: r.add(f'<circle r="{fmt(rr)}" fill="#ffffff" opacity=".92"/>'),
           f'animation-delay:{-rng.uniform(0, 9):.1f}s;animation-duration:{rng.uniform(7, 11):.1f}s')


def puddle(r, x, y, w):
    P = r.P
    r.ellipse(x, y, w, w * .3, P['water'], op=.8)
    r.add(f'<path d="M{fmt(x - w * .6)} {fmt(y - .3)}q{fmt(w * .4)}-1 {fmt(w * .9)} 0" class="kn" stroke="#fff" stroke-width=".6" opacity=".8"/>')


def basket(r, x, y):
    P = r.P
    r.shape([(x - 4, y - 4), (x + 4, y - 4), (x + 3, y), (x - 3, y)], P['straw'], .4)
    r.dots([(x - 2, y - 4.6, 1.4, 1.3), (x, y - 5.2, 1.4, 1.3), (x + 2, y - 4.6, 1.4, 1.3)], P['apple'], .3)
    r.add(f'<path d="M{fmt(x - 3.6)} {fmt(y - 4)}Q{fmt(x)} {fmt(y - 10)} {fmt(x + 3.6)} {fmt(y - 4)}" class="k" stroke-width=".45"/>')


def digger(r, s=1.0):
    P = r.P
    H.person(r, 0, 0, s, coat=P['coat3'], kind='man')
    r.line([(2 * s, -9 * s), (4 * s, 1.6 * s)], .6 * s, color=P['logs_s'], jitter=False)
    r.shape([(3 * s, 0), (5.6 * s, -.6 * s), (5.6 * s, 2.4 * s), (3.8 * s, 2.6 * s)], P['grey'], .3 * s)


def raker(r, s=1.0):
    P = r.P
    H.person(r, 0, 0, s, coat=P['coat2'], kind='woman', scarf=P['coat4'])
    r.line([(-2 * s, -8 * s), (-7 * s, 0)], .55 * s, color=P['logs_s'], jitter=False)
    r.line([(-9 * s, .2 * s), (-5 * s, -.4 * s)], .55 * s, jitter=False)


def leaf_pile(r, x, y):
    P = r.P
    r.blob(x, y - 2.4, 7, 3.2, '#c97a32', .4, n=10, bumps=4)
    r.dots([(x - 3, y - 3.6, 1.4, .9), (x + 2, y - 4.4, 1.4, .9), (x + 4, y - 2.2, 1.2, .8), (x - 1, y - 1.6, 1.3, .8)], '#e6b33c')
    r.dots([(x - 5, y - 1.8, 1.2, .8), (x + 1, y - 3, 1.1, .7)], '#a9472c')
    H.smoke(r, x + 1, y - 7, .7)
