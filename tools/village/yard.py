"""The farmyard over the field, in the village's hybrid style: the rain barrel, the fence, the gate, the crane well,
the hens, the sunflowers. Written into src/art/yard.ts as SVG strings per season; src/art/meadow.tsx (YardDecor)
places them and wraps the moving parts in the classes main-screen.css animates (well-sweep, hen-body,
yard-sunflower).

    python3 yard.py

The field is drawn smaller on screen than the village (a scene unit is about half a pixel), so lines are drawn a
little heavier here (INK_SCALE) and the hatching is wider; ink is written as attributes (the field's SVG has no
village classes), hatching and shadows use the field's own patterns (fyH, fyS, see Scene).
"""
import json, math, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import hy as H
from hy import Hy, PAL, D, SD, fmt, mix, dark, light, roof_cap
import villageg as G

OUT = os.path.join(HERE, '..', '..', 'src', 'art', 'yard.ts')
INK_SCALE = 1.7


class YardHy(Hy):
    """The kit with a hand that shakes a little more: the yard is drawn at half the village's scale."""
    def jit(self, pts, closed=True, amp=.5, step=7.0):
        return super().jit(pts, closed, amp, step)


def barrel(r):
    P = r.P
    r.shadow([(-6, 1), (14, -1), (18, 3), (-4, 4)], .8)
    staves = [(-8, 0), (-9.2, -10), (-8, -20), (8, -20), (9.2, -10), (8, 0)]
    r.shape(staves, P['logs'], 1.0, curve=False)
    r.shape([(0, 0), (8, 0), (9.2, -10), (8, -20), (0, -20)], P['logs_s'], 0, ink=False, shade=True, op=.6)
    r.lines([[(x, -1), (x * 1.05, -19)] for x in (-4.5, 0, 4.5)], .35, op=.5)
    for y in (-4.5, -15.5):
        r.line([(-9, y), (9, y)], 1.6, color=P['grey_s'], jitter=False)
        r.line([(-9, y - .9), (9, y - .9)], .35, op=.7, jitter=False)
    r.rim([(-8.6, -2), (-9.4, -10), (-8.4, -18)], .8)
    if r.winter:
        r.blob(0, -20.5, 8.6, 2.6, P['snow'], .5, n=10, wob=.04)
    else:
        r.blob(0, -20, 7.8, 2.1, P['water'], .5, n=10, wob=.02)
        r.line([(-4, -20.4), (0, -21)], .5, color='#ffffff', op=.8, jitter=False)


def fence(r):
    """Two posts and two rails at the far end of the yard."""
    P = r.P
    r.shadow([(2, 1), (30, 0), (34, 3), (4, 4)], .6)
    for x in (0, 22):
        r.shape([(x - 1.6, 0), (x + 1.6, 0), (x + 1.4, -16.5), (x - 1.4, -16.5)], P['grey'], .8)
        if r.winter:
            r.blob(x, -17, 2.2, 1.2, P['snow'], .3, n=7)
    for y in (-11, -5):
        r.shape([(-4, y - 1.2), (26, y - 1.2), (26, y + 1.2), (-4, y + 1.2)], light(P['grey'], .1), .7)
    if r.winter:
        r.shape([(-4, -12.4), (26, -12.4), (25, -13.6), (-3, -13.6)], P['snow'], .3)


def gate(r):
    """The gate where the road leaves the yard: two posts with caps, and the leaf swung open to the right."""
    P = r.P
    r.shadow([(-18, 1), (40, -1), (46, 3), (-14, 4)], .6)
    for x in (-20, 20):
        r.shape([(x - 1.8, 0), (x + 1.8, 0), (x + 1.6, -22), (x - 1.6, -22)], P['grey_s'], .9)
        r.shape([(x - 2.8, -22), (x + 2.8, -22), (x, -25.5)], P['tes'], .6)
        if r.winter:
            r.shape([(x - 2.9, -22.3), (x, -26), (x + 2.9, -22.3), (x, -24)], P['snow'], .3)
    leaf = [(20, -18), (34, -14), (34, -2), (20, -5)]
    r.shape(leaf, light(P['grey'], .12), .8)
    r.lines([[(20 + 14 * k / 4, -18 + 4 * k / 4), (20 + 14 * k / 4, -5 + 3 * k / 4)] for k in (1, 2, 3)], .35, op=.6)
    r.line([(20, -11.5), (34, -8)], .6)
    r.rim([(-21.8, -1), (-21.6, -21)], .7)


WELL_POST = (26, -48)    # the fork the sweep turns on (main-screen.css: .well-sweep transform-origin)


def well_base(r):
    """The crane well's log box, its rim and the post with the fork (the sweep is drawn apart)."""
    P = r.P
    r.shadow([(-8, 1), (40, -2), (48, 4), (-4, 5)], .8)
    r.shape([(-13, 0), (13, 0), (13, -15), (-13, -15)], P['logs'], 1.0)
    r.shape([(0, 0), (13, 0), (13, -15), (0, -15)], P['logs_s'], 0, ink=False, shade=True, op=.5)
    r.lines([[(-12.5, -15 * k / 4), (12.5, -15 * k / 4)] for k in (1, 2, 3)], .35, op=.5)
    r.dots([(-13.6, -15 * (k + .5) / 4, 1.7, 1.6) for k in range(4)] + [(13.6, -15 * (k + .5) / 4, 1.7, 1.6) for k in range(4)], light(P['logs'], .22), .4)
    r.shape([(-15, -14), (15, -14), (13, -17.5), (-13, -17.5)], P['logs_s'], .8)
    r.rim([(-13.6, -1), (-13.6, -14)], .8)
    if r.winter:
        r.blob(0, -18, 13, 2, P['snow'], .4, n=10)
    px, py = WELL_POST
    r.shape([(px - 1.8, 2), (px + 1.8, 2), (px + 1.4, py), (px - 1.4, py)], P['grey_s'], .9)
    r.line([(px - 1.2, py), (px - 4, py - 6)], 1.3)
    r.line([(px + 1.2, py), (px + 4, py - 6)], 1.3)
    r.rim([(px - 1.8, 0), (px - 1.4, py + 2)], .7)


def well_sweep(r):
    P = r.P
    tail, tip = (58, -30), (-8, -62)
    r.line([tail, tip], 2.3)
    r.line([tail, tip], 1.2, color=P['grey'], jitter=False)
    r.shape([(53, -33.5), (61, -30), (59, -25), (51, -28.5)], P['grey_s'], .6)
    r.line([(-6, -61), (-6, -24)], .55)
    r.shape([(-10, -24), (-2, -24), (-3, -17), (-9, -17)], P['grey'], .6)
    r.line([(-10, -24), (-2, -24)], .5, color=P['grey_s'], jitter=False)


def hen_body(r, k):
    P = r.P
    col = P['white'] if k % 2 else mix(P['logs'], P['straw'], .3)
    body = [(-6, -2), (-6.6, -6), (-4, -9.6), (0, -10.2), (3.8, -8.4), (6.6, -11), (8.2, -8.4), (7, -5), (3.6, -1), (-1.6, -.2)]
    r.shape(body, col, .7, curve=True)
    r.shape([(1, -2), (3.6, -1.2), (7, -5), (4.4, -4)], dark(col, .15), 0, ink=False, shade=True, op=.6)
    r.line([(-3.4, -5.4), (0, -4), (2.6, -5.2)], .45, op=.7)
    r.shape([(4.2, -9.2), (5.4, -11.6), (6.6, -9.8)], P['accent'], .3)
    r.shape([(7.8, -7.4), (10, -6.6), (7.8, -5.8)], P['coat4'], .3)
    r.dots([(5.6, -7.6, .55, .55)], P['ink'])


def hen_legs(r):
    P = r.P
    r.add(f'<ellipse cx="0" cy="1" rx="6" ry="1.5" fill="url(#fyS)" fill-opacity=".5"/>')
    r.lines([[(-1, 0), (-1, 2.2)], [(2, 0), (2, 2.2)]], .9, color='#c98a2a')


def sunflower(r, h, lean):
    P = r.P
    r.add(f'<ellipse cx="3" cy="1" rx="6" ry="1.4" fill="url(#fyS)" fill-opacity=".45"/>')
    r.line([(0, 0), (lean * .5, -h * .5), (lean * .2, -h)], 1.4, color=P['leaf_s'], curve=True)
    r.blob(-4.2, -h * .46, 4.2, 1.8, P['leaf'], .5, n=8, rot=-.5)
    r.blob(4.4, -h * .62, 4.2, 1.8, P['leaf'], .5, n=8, rot=.5)
    cx, cy = lean * .2, -h
    petals = [(cx + math.cos(2 * math.pi * i / 11) * 4.6, cy + math.sin(2 * math.pi * i / 11) * 4.4, 2.3, 2.3) for i in range(11)]
    r.dots(petals, P['coat4'], .35)
    r.blob(cx, cy, 3.2, 3.2, P['soil'], .5, n=8, wob=.03)
    r.dots([(cx - 1, cy - 1, .7, .7)], light(P['soil'], .25))


PIECES = {
    'barrel': barrel, 'fence': fence, 'gate': gate, 'well': well_base, 'sweep': well_sweep,
    'hen0': lambda r: hen_body(r, 0), 'hen1': lambda r: hen_body(r, 1), 'legs': hen_legs,
    'sun26': lambda r: sunflower(r, 26, 2.4), 'sun32': lambda r: sunflower(r, 32, -2.0),
}


def flatten(svg, season):
    """Ink as attributes, the field's patterns, heavier lines for the field's scale."""
    ink = PAL[season]['ink']

    def cls(m):
        names = m.group(1).split()
        attrs = ''
        if 'k' in names:
            attrs = f' fill="none" stroke="{ink}" stroke-linecap="round" stroke-linejoin="round"'
        elif 'kn' in names:
            attrs = ' fill="none" stroke-linecap="round" stroke-linejoin="round"'
        elif 'kf' in names:
            attrs = f' stroke="{ink}" stroke-linejoin="round"'
        rest = [n for n in names if n not in ('k', 'kn', 'kf')]
        return attrs + (f' class="{" ".join(rest)}"' if rest else '')
    svg = re.sub(r' class="([^"]*)"', cls, svg)
    svg = svg.replace('url(#vhH)', 'url(#fyH)').replace('url(#vhS)', 'url(#fyS)')
    svg = re.sub(r'stroke-width="([\d.]+)"', lambda m: f'stroke-width="{fmt(float(m.group(1)) * INK_SCALE)}"', svg)
    return G.flat_opacity(svg)


def export():
    out = {}
    for season in G.SEASONS:
        r = YardHy(season, seed=31)
        out[season] = {k: flatten(r.capture(lambda f=f: f(r))[0], season) for k, f in PIECES.items()}
    src = ['// The farmyard over the field in the village\'s hybrid style. Generated by tools/village/yard.py:',
           '// edit the generator, not this file. Pieces stand at their own origin (see YardDecor in meadow.tsx).',
           'export type YardPiece = ' + ' | '.join(f"'{k}'" for k in PIECES) + ';',
           f'export const YARD: Record<\'summer\' | \'winter\', Record<YardPiece, string>> = {json.dumps(out, ensure_ascii=False)};',
           '']
    open(OUT, 'w', encoding='utf-8').write('\n'.join(src))
    print('wrote', OUT, sum(len(s) for s in src), 'chars')


if __name__ == '__main__':
    export()
