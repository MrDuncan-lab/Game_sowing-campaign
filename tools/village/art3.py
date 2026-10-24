# Third edition: the village lives above the field. Pull the field down and four hills slide at their own
# speed, so every row of houses rises from behind the hill in front of it; each house stands up like a
# piece of a pop-up book. Everything is drawn in the game's ink: dark-brown outline, flat fill, paper.
# Design units are CSS px of a 362-px-wide phone screen; the stage under the top bar is 698 tall.
import os, sys, math, re
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from art2 import (A, INK, FONT, place, text, cloud, sun, fence, round_tree, bubble, stall, g_icon, icon,
                  temp_tag, chip, BARN)

W, HS = 362, 698
S = 624                       # scroll distance between the village and the field
FIELD_CREST = 676             # where the field's crest sits when the village is open
RATES = [0.03, 0.22, 0.38, 0.57, 1.0]   # far hill … near hill, field
LAYER_H = 780

SKIN = '#f1c8a0'


def r1(v):
    return f'{v:.1f}'.rstrip('0').rstrip('.')


# ---------------------------------------------------------------- hills
def crest_y(xs, ys, x):
    """Linear read of a crest polyline at x (the hills are drawn smooth through these points)."""
    for i in range(len(xs) - 1):
        if xs[i] <= x <= xs[i + 1]:
            t = (x - xs[i]) / (xs[i + 1] - xs[i])
            return ys[i] + (ys[i + 1] - ys[i]) * t
    return ys[-1]


def smooth(xs, ys):
    d = f'M{xs[0]} {ys[0]}'
    for i in range(1, len(xs)):
        mx = (xs[i - 1] + xs[i]) / 2
        d += f' C{mx} {ys[i - 1]} {mx} {ys[i]} {xs[i]} {ys[i]}'
    return d


def sample_crest(xs, ys, n=90):
    """Sample the smooth (cubic) crest so pop-up maths sees the same hill the eye does."""
    pts = []
    for i in range(1, len(xs)):
        x0, y0, x1, y1 = xs[i - 1], ys[i - 1], xs[i], ys[i]
        mx = (x0 + x1) / 2
        for k in range(12):
            t = k / 12
            bx = (1 - t) ** 3 * x0 + 3 * (1 - t) ** 2 * t * mx + 3 * (1 - t) * t ** 2 * mx + t ** 3 * x1
            by = (1 - t) ** 3 * y0 + 3 * (1 - t) ** 2 * t * y0 + 3 * (1 - t) * t ** 2 * y1 + t ** 3 * y1
            pts.append((bx, by))
    pts.append((xs[-1], ys[-1]))
    return pts


def crest_at(pts, x):
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        if ax <= x <= bx:
            return ay + (by - ay) * (x - ax) / max(bx - ax, 1e-6)
    return pts[-1][1]


CRESTS = {
    1: ([-10, 40, 96, 150, 210, 262, 318, 372], [134, 128, 138, 132, 136, 128, 136, 132]),
    2: ([-10, 50, 120, 190, 250, 312, 372], [204, 196, 206, 198, 206, 196, 204]),
    3: ([-10, 60, 130, 200, 270, 330, 372], [318, 308, 318, 310, 318, 308, 316]),
    4: ([-10, 70, 150, 230, 300, 372], [430, 418, 428, 418, 428, 420]),
    5: ([-10, 90, 181, 270, 372], [FIELD_CREST + 2, FIELD_CREST - 6, FIELD_CREST, FIELD_CREST - 6, FIELD_CREST + 2]),
}
SAMPLED = {k: sample_crest(*v) for k, v in CRESTS.items()}
HILL = {1: ('#d6eab2', '#c6e09e'), 2: ('#c5e39a', '#b4d886'), 3: ('#b2db82', '#a4d172'), 4: ('#a2d36c', '#93c763')}


def hill(k, extra=''):
    xs, ys = CRESTS[k]
    top, bot = HILL[k]
    d = smooth(xs, ys) + f' L372 {LAYER_H} L-10 {LAYER_H} Z'
    tufts = ''
    for i in range(14):
        x = 8 + i * 26 + (7 if i % 2 else 0)
        y = crest_y(xs, ys, x) + 16 + (i * 37 % 60)
        tufts += f'<path d="M{x} {y} q2 -6 4 0 q2 -7 4 0" fill="none" stroke="{bot}" stroke-width="1.6" stroke-linecap="round" opacity=".9"/>'
    return (f'<defs><linearGradient id="hg{k}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="{top}"/>'
            f'<stop offset=".35" stop-color="{bot}"/><stop offset="1" stop-color="{bot}"/></linearGradient></defs>'
            f'<path class="hill" d="{d}" fill="url(#hg{k})"/>'
            f'<path d="{smooth(xs, ys)}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2.2" transform="translate(0 2.5)"/>'
            f'<path d="{smooth(xs, ys)}" fill="none" stroke="{INK}" stroke-opacity=".38" stroke-width="1.6"/>'
            f'{tufts}{extra}')


# ---------------------------------------------------------------- small pieces
def smoke(x, y, k=1.0, cls=''):
    puffs = ''.join(f'<circle class="pf pf{i}" cx="0" cy="0" r="{(4 + i * 1.6) * k:.1f}"/>' for i in range(3))
    return f'<g class="smoke{(" " + cls) if cls else ""}" transform="translate({r1(x)} {r1(y)})">{puffs}</g>'


def window(x, y, w=11, h=13, lit=True, shut=False, trim='#fffaf0', carved=True):
    glass = '#ffe08a' if lit and not shut else '#6d7a86'
    out = ''
    if carved:  # a carved frame: a little pediment over the window
        out += (f'<path d="M{x - 2.5} {y - 1.5} L{x + w / 2} {y - 6.5} L{x + w + 2.5} {y - 1.5} Z" fill="{trim}" stroke="{INK}" stroke-width="1.1" stroke-linejoin="round"/>'
                f'<rect x="{x - 2}" y="{y + h - .5}" width="{w + 4}" height="2.6" fill="{trim}" stroke="{INK}" stroke-width="1"/>')
    out += (f'<rect class="win" x="{x}" y="{y}" width="{w}" height="{h}" fill="{glass}" stroke="{INK}" stroke-width="1.3"/>'
            f'<path d="M{x + w / 2} {y} V{y + h} M{x} {y + h * .45} H{x + w}" stroke="{INK}" stroke-width=".9"/>')
    if shut:
        out += (f'<rect x="{x - .5}" y="{y - .5}" width="{w / 2 + .5}" height="{h + 1}" fill="#7c4f2b" stroke="{INK}" stroke-width="1.1"/>'
                f'<rect x="{x + w / 2}" y="{y - .5}" width="{w / 2 + .5}" height="{h + 1}" fill="#7c4f2b" stroke="{INK}" stroke-width="1.1"/>'
                f'<path d="M{x + 1.4} {y + h * .3} h{w / 2 - 2.6} M{x + w / 2 + 1.2} {y + h * .3} h{w / 2 - 2.6} M{x + 1.4} {y + h * .7} h{w / 2 - 2.6} M{x + w / 2 + 1.2} {y + h * .7} h{w / 2 - 2.6}" stroke="#5a3a20" stroke-width=".8"/>')
    return out


def door(x, y, w=11, h=17, col='#7c4f2b'):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="1" fill="{col}" stroke="{INK}" stroke-width="1.3"/>'
            f'<circle cx="{x + w - 2.6}" cy="{y + h * .55}" r=".9" fill="{INK}"/>')


def badge(frag, cx, cy, size):
    """The game's round emblem (a 56-unit svg) as a medallion on a facade."""
    inner = frag.split('>', 1)[1].rsplit('</svg>', 1)[0]
    return f'<svg x="{r1(cx - size / 2)}" y="{r1(cy - size / 2)}" width="{size}" height="{size}" viewBox="0 0 56 56" overflow="visible">{inner}</svg>'


def flag(x, y, h=30, col='#d0503c'):
    return (f'<path d="M{x} {y} V{y - h}" stroke="{INK}" stroke-width="1.8" stroke-linecap="round"/>'
            f'<circle cx="{x}" cy="{y - h - 1.5}" r="1.8" fill="#f4c542" stroke="{INK}" stroke-width=".9"/>'
            f'<g transform="translate({x} {y - h + 1})"><path class="flagw" d="M0 0 Q9 -3 18 1 Q12 5 18 9 Q9 6 0 10 Z" fill="{col}" stroke="{INK}" stroke-width="1.2" stroke-linejoin="round"/></g>')


def garland(x0, x1, y, sag=9, n=11):
    out = f'<path d="M{x0} {y} Q{(x0 + x1) / 2} {y + sag * 2} {x1} {y}" fill="none" stroke="{INK}" stroke-width=".9"/>'
    for i in range(n):
        t = (i + .5) / n
        gx = x0 + (x1 - x0) * t
        gy = y + sag * 2 * 2 * t * (1 - t)
        col = ['#d0503c', '#f4c542', '#3f6fb0', '#5dad3c'][i % 4]
        out += f'<path d="M{gx - 2.6:.1f} {gy:.1f} L{gx + 2.6:.1f} {gy:.1f} L{gx:.1f} {gy + 4.6:.1f} Z" fill="{col}" stroke="{INK}" stroke-width=".6"/>'
    return out


def logs(x, y, w, h, step=6.5, wall='#d9a466', line='#a8723f'):
    out = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{wall}" stroke="{INK}" stroke-width="1.6"/>'
    yy = y + step
    while yy < y + h - 1:
        out += f'<path d="M{x + 1} {yy:.1f} H{x + w - 1}" stroke="{line}" stroke-width="1" opacity=".7"/>'
        yy += step
    # round log ends on both corners
    yy = y + step / 2
    while yy < y + h:
        for cx in (x, x + w):
            out += f'<circle cx="{cx}" cy="{yy:.1f}" r="{step / 2 - .3:.1f}" fill="#e8bf86" stroke="{INK}" stroke-width=".9"/>'
        yy += step
    return out


def gable(x0, x1, y, peak, col, ridge=True):
    xm = (x0 + x1) / 2
    out = (f'<path d="M{x0} {y} L{xm} {peak} L{x1} {y} Z" fill="{col}" stroke="{INK}" stroke-width="1.8" stroke-linejoin="round"/>'
           f'<path d="M{x0 + 6} {y - 2} L{xm} {peak + 4} L{x1 - 6} {y - 2}" fill="none" stroke="#fff" stroke-opacity=".32" stroke-width="1.4"/>')
    if ridge:  # a carved horse-head on the ridge, as on an izba
        out += f'<path d="M{xm} {peak} q-1 -5 3 -7 q4 -1 4 3 q-3 -1 -4 2" fill="#a8723f" stroke="{INK}" stroke-width="1"/>'
    return out


def hip(x0, x1, y, h, inset, col):
    return (f'<path d="M{x0} {y} L{x0 + inset} {y - h} L{x1 - inset} {y - h} L{x1} {y} Z" fill="{col}" stroke="{INK}" stroke-width="1.8" stroke-linejoin="round"/>'
            f'<path d="M{x0 + inset + 2} {y - h + 3} H{x1 - inset - 2}" stroke="#fff" stroke-opacity=".3" stroke-width="1.4"/>')


def chimney(x, y, w=7, h=14, col='#a9493a'):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{col}" stroke="{INK}" stroke-width="1.3"/>'
            f'<rect x="{x - 1.2}" y="{y - 2}" width="{w + 2.4}" height="3" fill="{col}" stroke="{INK}" stroke-width="1.1"/>')


def shadow(rx, ry=3.2):
    return f'<ellipse cx="0" cy="1" rx="{rx}" ry="{ry}" fill="#3a2a1a" fill-opacity=".16"/>'


# ---------------------------------------------------------------- buildings (ground y = 0, centre x = 0)
def council(friend=True):
    o = shadow(60)
    o += hip(-62, 62, -52, 22, 14, '#b9563d')
    o += f'<rect x="-56" y="-6" width="112" height="6" fill="#b9b2a6" stroke="{INK}" stroke-width="1.4"/>'
    o += f'<rect x="-54" y="-52" width="108" height="46" fill="#f3ead6" stroke="{INK}" stroke-width="1.7"/>'
    for x in (-46, -32, 20, 34):
        o += window(x, -44, 11, 15, carved=False)
        o += f'<path d="M{x - 1.5} {-45.5} h14" stroke="{INK}" stroke-width="1.4"/>'
    # portico: pediment, four columns, the door
    o += f'<rect x="-21" y="-52" width="42" height="46" fill="#ece0c6" stroke="{INK}" stroke-width="1.4"/>'
    o += door(-6, -28, 12, 22, '#8a5a34')
    for x in (-18, -9, 5, 14):
        o += f'<rect x="{x}" y="-50" width="4.5" height="44" fill="#fffaf0" stroke="{INK}" stroke-width="1.1"/>'
    o += f'<path d="M-26 -52 L0 -74 L26 -52 Z" fill="#f3ead6" stroke="{INK}" stroke-width="1.7" stroke-linejoin="round"/>'
    o += badge(A['emblem:council'], 0, -60, 15)
    o += f'<path d="M-18 -4 h36 v4 h-36 Z M-15 -7 h30 v3 h-30 Z" fill="#d8d0c2" stroke="{INK}" stroke-width="1"/>'
    o += flag(0, -74, 30)
    if friend:
        o += garland(-54, 54, -52, 6, 15)
    return o


def orphanage(lit=True):
    o = shadow(58)
    o += hip(-60, 60, -58, 18, 12, '#5f9a3a')
    o += f'<path d="M-46 -64 H46" stroke="#3e7a2a" stroke-width="1.2" opacity=".7"/>'
    o += f'<rect x="-55" y="-58" width="110" height="58" fill="#f6d98a" stroke="{INK}" stroke-width="1.7"/>'
    o += f'<path d="M-54 -30 H54" stroke="#d8b25a" stroke-width="1.6"/>'
    for x in (-47, -31, 20, 36):
        for y in (-52, -24):
            o += window(x, y, 11, 12, lit=lit, carved=False)
    # the entrance with a little roof, the sun over it
    o += f'<rect x="-15" y="-58" width="30" height="58" fill="#f0cf74" stroke="{INK}" stroke-width="1.4"/>'
    o += door(-6, -20, 12, 20, '#6b8f3a')
    o += f'<path d="M-12 -21 L0 -28 L12 -21 Z" fill="#5f9a3a" stroke="{INK}" stroke-width="1.2" stroke-linejoin="round"/>'
    o += f'<path d="M-20 -58 L0 -80 L20 -58 Z" fill="#f6d98a" stroke="{INK}" stroke-width="1.6" stroke-linejoin="round"/>'
    o += badge(A['emblem:orphanage'], 0, -66, 15)
    o += window(-4, -48, 8, 10, lit=lit, carved=False)
    # a swing by the wall
    o += (f'<g transform="translate(68 0)"><path d="M-10 0 L-5 -26 L5 -26 L10 0 M-5 -26 H5" fill="none" stroke="{INK}" stroke-width="1.6"/>'
          f'<g class="swing"><path d="M-2.5 -26 V-9 M2.5 -26 V-9" stroke="{INK}" stroke-width=".9"/><rect x="-4.5" y="-10" width="9" height="2.4" fill="#b27947" stroke="{INK}" stroke-width=".8"/></g></g>')
    return o


def bakery():
    o = shadow(50)
    o += chimney(22, -92, 13, 36, '#b4553f')
    o += ''.join(f'<path d="M{22 + (j % 2) * 4} {-86 + j * 6} h{9 - (j % 2) * 4}" stroke="#7d3528" stroke-width=".8"/>' for j in range(5))
    o += smoke(28, -98, 1.15, 'big')
    o += logs(-44, -44, 88, 44)
    o += gable(-52, 52, -44, -80, '#d8b45a')
    o += ''.join(f'<path d="M{-40 + i * 9} -46 L{-36 + i * 8.2} -50" stroke="#a88638" stroke-width="1"/>' for i in range(10))
    o += badge(A['emblem:bakery'], 0, -57, 16)
    # a shop window with loaves, the door, a pretzel sign on a bracket
    o += f'<rect x="-36" y="-34" width="26" height="19" fill="#ffe8a8" stroke="{INK}" stroke-width="1.4"/>'
    o += ''.join(f'<ellipse cx="{-30 + i * 7}" cy="-20" rx="3.4" ry="2.4" fill="#c88a3a" stroke="{INK}" stroke-width=".8"/>' for i in range(3))
    o += f'<path d="M-36 -26 H-10" stroke="{INK}" stroke-width=".9"/>'
    o += door(10, -24, 12, 24)
    o += window(28, -34, 10, 12)
    o += (f'<path d="M-44 -38 H-56" stroke="{INK}" stroke-width="1.6"/><path d="M-53 -38 V-34" stroke="{INK}" stroke-width="1"/>'
          f'<g transform="translate(-53 -27)"><path class="sway" d="M0 -6 C-9 -12 -12 2 -2 3 C-8 6 -2 11 0 5 C2 11 8 6 2 3 C12 2 9 -12 0 -6 Z" fill="#e3a64a" stroke="{INK}" stroke-width="1.1" stroke-linejoin="round"/></g>')
    o += (f'<g transform="translate(37 0)"><path d="M-5 0 L-2 -16 M0 0 V-17 M5 0 L2 -16" stroke="#c49a3a" stroke-width="1.6"/>'
          + ''.join(f'<ellipse cx="{dx}" cy="-17" rx="1.6" ry="3.6" fill="#e3c35a" stroke="{INK}" stroke-width=".6" transform="rotate({dx * 6} {dx} -17)"/>' for dx in (-2.5, 0, 2.5))
          + f'<path d="M-4 -7 h8" stroke="#b27947" stroke-width="1.8"/></g>')
    return o


def restaurant(offended=True):
    o = shadow(52)
    o += chimney(-34, -84, 8, 22, '#7d3528')
    if not offended:
        o += smoke(-30, -88)
    o += f'<rect x="-48" y="-50" width="96" height="50" fill="#b4775a" stroke="{INK}" stroke-width="1.7"/>'
    o += ''.join(f'<path d="M{-48 + i * 8} -49 V-1" stroke="#8f5a42" stroke-width="1" opacity=".75"/>' for i in range(1, 12))
    o += gable(-55, 55, -50, -82, '#6b2f22', ridge=False)
    o += badge(A['emblem:restaurant'], 0, -61, 16)
    # striped awning, shutters closed while the chef is offended
    o += ''.join(f'<path d="M{-44 + i * 11} -38 h11 l-1.6 9 h-11 Z" fill="{"#c23a2c" if i % 2 == 0 else "#fff6e6"}" stroke="{INK}" stroke-width="1"/>' for i in range(8))
    o += window(-38, -24, 12, 14, lit=not offended, shut=offended, carved=False)
    o += window(26, -24, 12, 14, lit=not offended, shut=offended, carved=False)
    o += door(-6, -24, 12, 24, '#5a3a20')
    if offended:
        o += (f'<path d="M-4 -26 L0 -30 L4 -26" fill="none" stroke="{INK}" stroke-width=".8"/>'
              f'<rect x="-9" y="-19" width="18" height="8" rx="1" fill="#fffaf0" stroke="{INK}" stroke-width=".9"/>'
              f'<path d="M-6 -15 h12" stroke="{INK}" stroke-width="1" stroke-dasharray="2 1.2"/>')
    return o


def college():
    o = shadow(52)
    o += hip(-54, 54, -52, 16, 12, '#3f6fb0')
    o += f'<rect x="-50" y="-52" width="100" height="52" fill="#c66a50" stroke="{INK}" stroke-width="1.7"/>'
    o += ''.join(f'<path d="M-49 {-52 + i * 6} H49" stroke="#a9533c" stroke-width=".7" opacity=".7"/>' for i in range(1, 9))
    for x in (-42, -24, 14, 32):
        o += (f'<path d="M{x} -18 V-36 a5 5 0 0 1 10 0 V-18 Z" fill="#ffe08a" stroke="{INK}" stroke-width="1.3"/>'
              f'<path d="M{x + 5} -41 V-18 M{x} -28 h10" stroke="{INK}" stroke-width=".8"/>'
              f'<path d="M{x - 1.5} -17 h13" stroke="#fffaf0" stroke-width="2.2"/>')
    o += f'<rect x="-12" y="-90" width="24" height="38" fill="#c66a50" stroke="{INK}" stroke-width="1.5"/>'
    o += f'<path d="M-15 -90 L0 -104 L15 -90 Z" fill="#3f6fb0" stroke="{INK}" stroke-width="1.5" stroke-linejoin="round"/>'
    o += f'<circle cx="0" cy="-76" r="7.5" fill="#fffaf0" stroke="{INK}" stroke-width="1.3"/><path d="M0 -76 V-81 M0 -76 L3.5 -74" stroke="{INK}" stroke-width="1.1" stroke-linecap="round"/>'
    o += door(-6, -22, 12, 22, '#3f5f8f')
    o += badge(A['emblem:college'], 0, -60, 13)
    return o


def lab(busy=True):
    o = shadow(40)
    # the house of the lab and a glass wing for the trials
    o += f'<rect x="-36" y="-40" width="36" height="40" fill="#f4f1ea" stroke="{INK}" stroke-width="1.6"/>'
    o += gable(-40, 4, -40, -60, '#56616b', ridge=False)
    o += window(-30, -32, 10, 12, carved=False)
    o += door(-15, -20, 10, 20, '#56616b')
    o += (f'<path d="M0 0 V-22 Q0 -38 18 -38 Q36 -38 36 -22 V0 Z" fill="#d6eef7" fill-opacity=".85" stroke="{INK}" stroke-width="1.5"/>'
          f'<path d="M9 0 V-35 M18 0 V-38 M27 0 V-35 M0 -20 H36" stroke="#6f8f9c" stroke-width="1"/>'
          f'<path d="M4 -24 Q6 -33 14 -35" fill="none" stroke="#fff" stroke-width="1.8"/>'
          + ''.join(f'<path d="M{x} -2 q2 -7 4 0" fill="#7cbc4a" stroke="{INK}" stroke-width=".8"/>' for x in (4, 12, 20, 28)))
    # a flask on a round sign
    o += (f'<g transform="translate(-18 -66)"><circle r="9" fill="#fffaf0" stroke="{INK}" stroke-width="1.3"/>'
          f'<g transform="translate(-7 -7) scale(.29)">{A["icon:flask"]}</g></g>')
    if busy:
        o += f'<g class="bubbling" transform="translate(-18 -78)"><circle r="2" fill="#9fe08a" stroke="{INK}" stroke-width=".7"/><circle cx="3" cy="-5" r="1.4" fill="#9fe08a" stroke="{INK}" stroke-width=".6"/></g>'
    return o


def meteo():
    o = shadow(18, 2.4)
    # the white screen box on legs and the mast with cups and a vane
    o += (f'<path d="M-16 0 V-14 M-6 0 V-14" stroke="{INK}" stroke-width="1.4"/>'
          f'<rect x="-19" y="-28" width="16" height="15" fill="#fffaf0" stroke="{INK}" stroke-width="1.3"/>'
          + ''.join(f'<path d="M-17 {-25 + i * 3} h12" stroke="#b7ad9c" stroke-width=".8"/>' for i in range(4))
          + f'<path d="M-21 -28 L-11 -33 L-1 -28 Z" fill="#fffaf0" stroke="{INK}" stroke-width="1.1"/>'
          f'<path d="M8 0 V-66" stroke="{INK}" stroke-width="2"/><path d="M8 0 V-66" stroke="#c9c2b4" stroke-width=".8"/>'
          f'<g transform="translate(8 -60)"><g class="cups"><path d="M-9 0 H9 M0 -9 V9" stroke="{INK}" stroke-width="1"/>'
          + ''.join(f'<circle cx="{cx}" cy="{cy}" r="2.4" fill="#d0503c" stroke="{INK}" stroke-width=".8"/>' for cx, cy in ((-9, 0), (9, 0), (0, -9), (0, 9)))
          + '</g></g>'
          f'<g transform="translate(8 -68)"><path class="vane" d="M-9 0 H9 L5 -3 M-9 0 l3 -4 M-9 0 l3 4" fill="none" stroke="{INK}" stroke-width="1.5" stroke-linecap="round"/></g>')
    return o


def hives():
    return shadow(22, 2.6) + place(A['est:hive'], -10, 0, 1.15) + place(A['est:hive'], 12, 0, 1.15)


def well():
    return (shadow(22, 2.6) + '<g>'
            f'<path d="M-16 0 V-13 Q0 -19 16 -13 V0 Q0 5 -16 0 Z" fill="#a7a29a" stroke="{INK}" stroke-width="1.6"/>'
            f'<path d="M-16 -13 Q0 -8 16 -13" fill="none" stroke="{INK}" stroke-width="1.1"/>'
            f'<path d="M-12 -4 h7 M2 -4 h7 M-8 -9 h7" stroke="#7c776f" stroke-width="1"/>'
            f'<path d="M-13 -14 V-40 M13 -14 V-40" stroke="{INK}" stroke-width="3.2"/><path d="M-13 -14 V-40 M13 -14 V-40" stroke="#b27947" stroke-width="1.6"/>'
            f'<path d="M-20 -38 L0 -52 L20 -38 Z" fill="#9a6438" stroke="{INK}" stroke-width="1.6" stroke-linejoin="round"/>'
            f'<path d="M-10 -31 H10" stroke="{INK}" stroke-width="2.2"/><path d="M3 -31 V-24" stroke="{INK}" stroke-width="1"/>'
            f'<path d="M-1 -24 h8 l-1.4 6 h-5.2 Z" fill="#8f5d34" stroke="{INK}" stroke-width="1.1"/></g>')


def bench_palych():
    clip = '<defs><clipPath id="v-pal"><circle cx="0" cy="-34" r="16"/></clipPath></defs>'
    return (shadow(26, 2.6) + clip
            + f'<path d="M-24 -10 H24 M-21 -10 V0 M21 -10 V0" stroke="{INK}" stroke-width="3.6" stroke-linecap="round"/>'
            f'<path d="M-24 -10 H24" stroke="#b27947" stroke-width="2" stroke-linecap="round"/>'
            f'<circle cx="0" cy="-34" r="18.5" fill="#c8931f" stroke="{INK}" stroke-width="1.8"/>'
            f'<image href="img/p_palych.webp" x="-16" y="-50" width="32" height="32" clip-path="url(#v-pal)" preserveAspectRatio="xMidYMin slice"/>'
            f'<circle cx="0" cy="-34" r="16" fill="none" stroke="{INK}" stroke-width="1.2"/>'
            f'<g class="bob">{bubble(25, -46, text(0, -7, "?", 15, "#c23a2c"), 16, 21)}</g>')


def notice_board():
    clip = '<defs><clipPath id="v-poster"><rect x="-22" y="-56" width="44" height="27"/></clipPath></defs>'
    return (shadow(26, 2.6) + clip
            + f'<path d="M-22 0 V-60 M22 0 V-60" stroke="{INK}" stroke-width="3.6"/><path d="M-22 0 V-60 M22 0 V-60" stroke="#b27947" stroke-width="2"/>'
            f'<rect x="-28" y="-62" width="56" height="38" rx="3" fill="#9a6438" stroke="{INK}" stroke-width="1.6"/>'
            f'<rect x="-24" y="-58" width="48" height="31" fill="#f4ead2" stroke="{INK}" stroke-width="1.1"/>'
            f'<image href="img/boss_droughtyear.webp" x="-22" y="-56" width="44" height="27" clip-path="url(#v-poster)" preserveAspectRatio="xMidYMid slice"/>'
            f'<path d="M-32 -62 L0 -74 L32 -62" fill="#7c4f2b" stroke="{INK}" stroke-width="1.6" stroke-linejoin="round"/>'
            f'<circle cx="-18" cy="-55" r="1.6" fill="#d0503c" stroke="{INK}" stroke-width=".6"/><circle cx="18" cy="-55" r="1.6" fill="#d0503c" stroke="{INK}" stroke-width=".6"/>')


def fair_stall(c1, c2, goods):
    stripes = ''.join(f'<path d="M{-26 + k * 10.4} -46 h10.4 l-1.4 10 h-10.4 Z" fill="{c1 if k % 2 == 0 else c2}" stroke="{INK}" stroke-width="1"/>' for k in range(5))
    g = ''.join(f'<g transform="translate({-21 + k * 13} -30) scale(.13)">{A["crop:" + c + ":2"]}</g>' for k, c in enumerate(goods))
    return (shadow(28, 2.6)
            + f'<path d="M-25 0 V-46 M25 0 V-46" stroke="{INK}" stroke-width="3.2"/><path d="M-25 0 V-46 M25 0 V-46" stroke="#b27947" stroke-width="1.6"/>'
            f'<rect x="-29" y="-18" width="58" height="18" fill="#d9a466" stroke="{INK}" stroke-width="1.6"/>'
            f'<path d="M-27 -10 h54" stroke="#a8723f" stroke-width="1"/>{g}{stripes}')


def signpost():
    def arm(y, label, need):
        return (f'<path d="M2 {y - 8} H44 L51 {y} L44 {y + 8} H2 Z" fill="#d9a466" stroke="{INK}" stroke-width="1.5" stroke-linejoin="round"/>'
                f'{text(24, y + 4, label, 10, INK, 800)}'
                f'<g transform="translate(25 {y + 15})"><rect x="-16" y="-6.5" width="32" height="12" rx="6" fill="#fff8e1" stroke="#c8931f" stroke-width="1.2"/>'
                f'{g_icon("star", -8, -.5, 9)}{text(5, 3.2, need, 9, "#7a5810", 800)}</g>')
    return (shadow(10, 2) + f'<path d="M0 0 V-74" stroke="{INK}" stroke-width="4.4"/><path d="M0 0 V-74" stroke="#b27947" stroke-width="2.4"/>'
            + arm(-64, 'Кубань', '40') + arm(-34, 'Алтай', '120'))


def birch(k=1.0):
    return place(A['est:birch'], 0, 0, k)


def fir(h=34, col='#4f8a3a'):
    w = h * .42
    return (f'<path d="M0 {-h} L{w * .55} {-h * .62} H{w * .3} L{w * .8} {-h * .3} H{w * .5} L{w} 0 H{-w} L{-w * .5} {-h * .3} H{-w * .8} '
            f'L{-w * .3} {-h * .62} H{-w * .55} Z" fill="{col}" stroke="{INK}" stroke-width="1.2" stroke-linejoin="round"/>'
            f'<rect x="-1.6" y="0" width="3.2" height="3" fill="#7c4f2b"/>')


def bush(r=11, berries=True, col='#6fae45'):
    out = (f'<path d="M{-r * 1.2} 0 Q{-r * 1.5} {-r * .9} {-r * .6} {-r * 1.1} Q{-r * .2} {-r * 1.8} {r * .5} {-r * 1.2} '
           f'Q{r * 1.5} {-r * 1.1} {r * 1.2} 0 Z" fill="{col}" stroke="{INK}" stroke-width="1.3" stroke-linejoin="round"/>')
    if berries:
        out += f'<circle cx="{-r * .4}" cy="{-r * .8}" r="1.6" fill="#d6473a" stroke="{INK}" stroke-width=".6"/><circle cx="{r * .5}" cy="{-r * .5}" r="1.6" fill="#d6473a" stroke="{INK}" stroke-width=".6"/>'
    return out


def sunflower(h=26):
    return (f'<path d="M0 0 V{-h}" stroke="#4f8a3a" stroke-width="1.8"/><path d="M0 {-h * .45} q-6 -2 -8 -7 q6 0 8 5" fill="#6fae45" stroke="{INK}" stroke-width=".8"/>'
            f'<g transform="translate(0 {-h})"><g class="nod">' + ''.join(f'<ellipse cx="0" cy="-5.2" rx="2" ry="3.6" fill="#f4c542" stroke="{INK}" stroke-width=".6" transform="rotate({a})"/>' for a in range(0, 360, 40))
            + f'<circle r="3.6" fill="#7c4f2b" stroke="{INK}" stroke-width=".8"/></g></g>')


def flowers(n=5, w=30):
    out = ''
    for i in range(n):
        x = -w / 2 + i * w / max(n - 1, 1)
        col = ['#e0607a', '#f4c542', '#fffaf0', '#c08adf', '#e0607a'][i % 5]
        out += f'<path d="M{x} 0 V-6" stroke="#4f8a3a" stroke-width="1"/><circle cx="{x}" cy="-7" r="2.2" fill="{col}" stroke="{INK}" stroke-width=".6"/>'
    return out


def picket(x0, x1, y, step=7.5, h=12):
    out = f'<path d="M{x0} {y - h * .55} H{x1}" stroke="#b27947" stroke-width="2.4"/>'
    x = x0 + 2
    while x < x1:
        out += f'<path d="M{x:.1f} {y} V{y - h} l2 -2.6 l2 2.6 V{y} Z" fill="#dcaa6e" stroke="{INK}" stroke-width="1" stroke-linejoin="round"/>'
        x += step
    return out


def ghost_mill():
    st = 'fill="#fffaf0" fill-opacity=".38" stroke="#7a6a55" stroke-width="1.5" stroke-dasharray="4 3.4" stroke-linejoin="round"'
    return (f'<path d="M-12 0 L-8 -46 H8 L12 0 Z" {st}/><path d="M-10 -46 L0 -58 L10 -46 Z" {st}/>'
            f'<g transform="translate(0 -48)"><g class="sails">' + ''.join(f'<path d="M0 0 L{dx} {dy}" fill="none" stroke="#7a6a55" stroke-width="1.5" stroke-dasharray="4 3.4"/>' for dx, dy in ((-24, -22), (24, -22), (-24, 22), (24, 22)))
            + '</g></g>')


def ghost_tower():
    st = 'fill="#fffaf0" fill-opacity=".38" stroke="#7a6a55" stroke-width="1.5" stroke-dasharray="4 3.4" stroke-linejoin="round"'
    return (f'<path d="M-9 0 L-6 -52 H6 L9 0 Z" {st}/><path d="M-15 -52 H15 V-68 H-15 Z" {st}/>'
            f'<path d="M-18 -68 L0 -82 L18 -68 Z" {st}/><path d="M0 -82 V-90" stroke="#7a6a55" stroke-width="1.5" stroke-dasharray="3 3"/>')


def build_badge(x, y):
    return (f'<g class="bb" transform="translate({x} {y})"><circle r="9.5" fill="#fff8e1" stroke="#c8931f" stroke-width="1.4"/>'
            f'{g_icon("build", 0, 0, 13)}</g>')


def pill(label, ic='build', w=None):
    w = w or (len(label) * 6.2 + 26)
    return (f'<g class="pill"><rect x="{-w / 2}" y="-8" width="{w}" height="16" rx="8" fill="#fff8e1" stroke="#c8931f" stroke-width="1.2"/>'
            f'{g_icon(ic, -w / 2 + 9, 0, 11)}{text(6, 4, label, 10, "#7a5810", 800)}</g>')


def order_bubble(crop, qty, sad=False):
    inner = f'<g transform="translate(-17 -27) scale(.2)">{A["crop:" + crop + ":2"]}</g>' + text(8, -10, str(qty), 13.5, '#c23a2c' if sad else INK, 800)
    return f'<g class="bob">{bubble(0, 0, inner, 36, 26, "#c23a2c" if sad else INK)}</g>'


def put_svg(frag, gx, gy, k, ax=50, ay=90, box=100):
    """Place a fixed-size game svg (pets, workers) by its feet."""
    m = re.search(r'width="([\d.]+)"', frag)
    size = float(m.group(1)) if m else 48
    s = size / box * k
    return f'<g transform="translate({gx - ax * s:.1f} {gy - ay * s:.1f}) scale({k})">{frag}</g>'


def path_seg(d, cls='trail', layer=1):
    """A dirt path that draws itself up from behind the hill in front, as the hill uncovers it."""
    nums = [float(v) for v in re.findall(r'-?\d+(?:\.\d+)?', d)]
    xs, ys = nums[0::2], nums[1::2]
    bottom, top = max(ys), min(ys)
    fronts = ','.join(f'{crest_at(SAMPLED[j], xs[0]):.1f}' for j in range(layer + 1, 6))
    return (f'<g class="trail-set" data-l="{layer}" data-b="{bottom:.1f}" data-h="{max(bottom - top, 1):.1f}" data-f="{fronts}">'
            f'<path class="{cls} trail-edge" d="{d}" fill="none" stroke="#c9a77a" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>'
            f'<path class="{cls}" d="{d}" fill="none" stroke="#ead2a6" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>'
            f'<path class="{cls} trail-dash" d="{d}" fill="none" stroke="#d2b688" stroke-width="1.6" stroke-dasharray="1 7" stroke-linecap="round"/></g>')


# ---------------------------------------------------------------- the stage: one piece per layer
POPS = []   # (layer, key, x, base, height): what the scroll maths needs for each standing piece


def pop(layer, key, x, base, h, body, label, extra_cls=''):
    """A piece that stands up when it clears the hill in front of it; tappable."""
    fronts = [crest_at(SAMPLED[j], x) for j in range(layer + 1, 6)]
    POPS.append((layer, key, x, base, h))
    f = ','.join(f'{v:.1f}' for v in fronts)
    return (f'<g class="spot-g{(" " + extra_cls) if extra_cls else ""}" data-k="{key}" role="button" tabindex="0" aria-label="{label}" '
            f'transform="translate({r1(x)} {r1(base)})"><g class="pop" data-l="{layer}" data-x="{r1(x)}" data-b="{r1(base)}" data-h="{r1(h)}" data-f="{f}">'
            f'{body}</g></g>')


def decor(x, base, body, cls=''):
    return f'<g{(" class=" + chr(34) + cls + chr(34)) if cls else ""} transform="translate({r1(x)} {r1(base)})">{body}</g>'


def layer_svg(k, inner, label=''):
    return (f'<svg class="lay-svg" viewBox="0 0 {W} {LAYER_H}" preserveAspectRatio="xMidYMin meet" aria-hidden="{"false" if label else "true"}">'
            f'{inner}</svg>')


def sky_layer():
    o = ('<defs><linearGradient id="v-sky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#a6d9f1"/>'
         '<stop offset=".45" stop-color="#d4eef2"/><stop offset="1" stop-color="#eef6e0"/></linearGradient></defs>'
         f'<rect width="{W}" height="{LAYER_H}" fill="url(#v-sky)"/>')
    # the far ridge with a fir line: seen only once the field slides down
    xs = [-10, 30, 80, 120, 170, 220, 260, 300, 340, 372]
    ys = [104, 86, 98, 80, 96, 84, 100, 82, 94, 90]
    o += f'<path d="{smooth(xs, ys)} L372 300 L-10 300 Z" fill="#bcd9c2"/>'
    o += ''.join(f'<g transform="translate({x} {crest_y(xs, ys, x) + 6})" opacity=".55">{fir(14 + (x * 7) % 9, "#8fb79b")}</g>' for x in range(6, 362, 13))
    o += ''.join(f'<g class="drift" style="animation-delay:{-i * 9}s">{cloud(x, y, k, "#ffffff", 1.4, .8)}</g>' for i, (x, y, k) in enumerate([(70, 72, .55), (250, 60, .42), (330, 96, .36)]))
    return layer_svg(0, o)


def layer1():
    o = hill(1)
    xs, ys = CRESTS[1]
    # forest edges left and right, the dotted mill and fire tower the village could build
    # forest edges, with clearings where the village could still build
    firs = [4, 14, 24, 100, 111, 122, 252, 262, 340, 351, 361]
    o += ''.join(decor(x, crest_y(xs, ys, x) + 4, fir(22 + (x * 5) % 10, '#5d9a48' if x % 2 else '#4f8a3a')) for x in firs)
    o += pop(1, 'mill', 62, 166, 72, ghost_mill() + build_badge(0, -24), 'Мельница — стройка деревни', 'ghost')
    o += pop(1, 'tower', 300, 170, 92, ghost_tower() + build_badge(0, -30), 'Каланча — стройка деревни', 'ghost')
    o += path_seg('M181 240 C178 222 186 204 182 184', 'trail t1', 1)
    o += pop(1, 'council', 181, 182, 106, council(), 'Сельсовет')
    o += decor(124, 184, birch(.62)) + decor(240, 182, birch(.55))
    return layer_svg(1, o)


def layer2():
    o = hill(2)
    o += path_seg('M196 344 C190 318 160 304 162 286', 'trail t2', 2)
    o += path_seg('M168 296 C130 292 96 290 70 280', 'trail t2b', 2)
    o += path_seg('M176 294 C226 292 262 292 292 284', 'trail t2c', 2)
    o += pop(2, 'orphanage', 66, 276, 82, orphanage() + f'<g transform="translate(-34 -84)">{order_bubble("radish", 6, sad=True)}</g>', 'Интернат «Солнышко»')
    o += pop(2, 'bakery', 181, 278, 96, bakery() + f'<g transform="translate(-26 -84)">{order_bubble("wheat", 18)}</g>', 'Пекарня «Колосок»')
    o += pop(2, 'restaurant', 300, 276, 84, restaurant(), 'Ресторан «Печь»')
    o += decor(124, 280, bush(9)) + decor(236, 282, bush(8, False))
    o += decor(350, 262, fir(28)) + decor(12, 262, fir(26, '#5d9a48'))
    return layer_svg(2, o)


def layer3():
    o = hill(3)
    # the square: a cobbled oval with the well, Palych, the board and the fair
    o += '<ellipse cx="170" cy="392" rx="150" ry="26" fill="#e9d6ae" stroke="#c9a77a" stroke-width="1.4"/>'
    o += ''.join(f'<ellipse cx="{x}" cy="{y}" rx="3.6" ry="2" fill="#d9c294"/>' for x, y in [(60, 386), (90, 400), (130, 382), (170, 404), (210, 384), (250, 398), (284, 386), (110, 410), (230, 410)])
    o += path_seg('M204 470 C200 440 214 424 206 406', 'trail t3', 3)
    o += path_seg('M210 384 C214 360 206 340 210 318', 'trail t3b', 3)
    o += pop(3, 'well', 40, 392, 52, well(), 'Колодец')
    o += pop(3, 'palych', 104, 398, 56, bench_palych(), 'Палыч на лавке')
    o += pop(3, 'board', 168, 390, 74, notice_board(), 'Доска на площади: испытание года')
    o += pop(3, 'fair', 248, 396, 46, fair_stall('#d0503c', '#fff6e6', ('pumpkin', 'cabbage', 'radish', 'potato')), 'Ярмарка')
    o += pop(3, 'fair2', 310, 392, 46, fair_stall('#3e7a2a', '#fff6e6', ('tomato', 'carrot', 'onion', 'bean')), 'Ярмарка')
    o += decor(350, 372, fir(26)) + decor(16, 356, birch(.5))
    # a kid from the orphanage slipping down the path toward the field
    o += f'<g class="sneak"><g transform="translate(0 0)">{place(A["kid:1"], 0, 0, .36)}</g></g>'
    return layer_svg(3, o)


def layer4():
    o = hill(4)
    xs, ys = CRESTS[4]
    o += path_seg('M181 700 C181 676 170 650 176 620 C182 590 214 572 210 540 C206 512 192 488 204 452', 'trail t4', 4)
    o += path_seg('M196 560 C170 560 150 566 126 566', 'trail t4b', 4)
    o += decor(181, 470, '<ellipse cx="0" cy="0" rx="1" ry="1" fill="none"/>')
    # the farm itself: the lab, the house at its level, hives, the barn, the weather mast
    o += pop(4, 'lab', 42, 536, 82, lab(), 'Лаборатория')
    o += pop(4, 'meteo', 336, 520, 76, meteo(), 'Метеостанция')
    o += decor(258, 594, flowers(4, 18))
    o += pop(4, 'house', 120, 574, 104, place(A['house:3'], -62, -91.2, .6) + f'<g transform="translate(-50 2)">{flowers(5, 30)}</g>', 'Ваша усадьба')
    o += pop(4, 'barn', 282, 566, 76, place(BARN, -40, -78, .5), 'Амбар')
    o += pop(4, 'hives', 222, 598, 30, hives(), 'Пасека')
    o += decor(76, 600, put_svg(A['pet:dog'], 0, 0, .62))
    o += decor(132, 628, put_svg(A['pet:geese'], 0, 0, .72))
    # the fence with the gate down to the field, sunflowers along it
    o += picket(-4, 160, 652) + picket(202, 366, 652)
    o += ('<g transform="translate(160 652)"><path d="M0 0 V-16 M42 0 V-16" stroke="#3f2a1d" stroke-width="3.6"/><path d="M0 0 V-16 M42 0 V-16" stroke="#b27947" stroke-width="2"/>'
          '<path d="M1 -2 L-12 -6 V-15 L1 -12 Z M41 -2 L54 -6 V-15 L41 -12 Z" fill="#dcaa6e" stroke="#3f2a1d" stroke-width="1" stroke-linejoin="round"/></g>')
    o += ''.join(decor(x, 652, sunflower(24 + (x % 3) * 3)) for x in (16, 44, 108, 286, 344))
    o += pop(4, 'gate', 181, 652, 22, '<rect x="-22" y="-22" width="44" height="24" fill="#fff" fill-opacity="0"/>', 'Калитка: вниз, к полю', 'gate')
    o += pop(4, 'scouts', 236, 640, 44, f'<g class="scouts-wrap">{A["scouts"]}</g>', 'Ребята из интерната в кустах')
    o += pop(4, 'signpost', 300, 642, 74, signpost(), 'Указатель: карта регионов')
    return layer_svg(4, o)


def field_layer():
    xs, ys = CRESTS[5]
    top = FIELD_CREST - 9
    d = smooth(xs, [y - top for y in ys]) + f' L372 760 L-10 760 Z'
    o = (f'<path d="{d}" fill="#90c563"/>'
         f'<path d="{smooth(xs, [y - top for y in ys])}" fill="none" stroke="#6fae45" stroke-width="2"/>'
         + ''.join(f'<path d="M{x} {crest_y(xs, [y - top for y in ys], x) + 4} q2 -6 4 0 q2 -7 4 0" fill="none" stroke="#6fae45" stroke-width="1.5" stroke-linecap="round"/>' for x in range(10, 360, 23)))
    return (f'<svg class="crest-svg" viewBox="0 0 {W} 40" preserveAspectRatio="none" aria-hidden="true">{o}</svg>')


def sky_band():
    """The forecast strip from the game, drawn over a clear sky: this week's sun, next week's, crows, fog."""
    o = ''
    o += f'<g class="tok-big"><g class="rays" transform="translate(70 27)">' + ''.join(
        f'<path d="M{math.cos(a) * 19:.1f} {math.sin(a) * 19:.1f} L{math.cos(a) * 26:.1f} {math.sin(a) * 26:.1f}" stroke="#e1a52b" stroke-width="3.2" stroke-linecap="round"/>' for a in [i * math.pi / 5 for i in range(10)]) + '</g>'
    o += f'<circle cx="70" cy="27" r="15" fill="#ffd25a" stroke="{INK}" stroke-width="2"/></g>'
    o += temp_tag(92, 47, '+20°')
    o += sun(140, 29, 9) + chip(124, 13, '1', r=7)
    o += temp_tag(152, 48, '+21°').replace('translate(152 48)', 'translate(152 48) scale(.8)')
    flock = ''.join(f'<g class="orbit" style="animation-delay:{-i * 1.6}s"><g transform="translate(14 0) scale(.42)">{A["crow:fly"]}</g></g>' for i in range(3))
    o += f'<g transform="translate(196 22)">{flock}</g>'
    o += ('<defs><linearGradient id="band-fog" x1="0" x2="1"><stop offset="0" stop-color="#f6f3ea" stop-opacity="0"/><stop offset=".5" stop-color="#f6f3ea" stop-opacity=".92"/>'
          '<stop offset="1" stop-color="#f6f3ea" stop-opacity=".2"/></linearGradient></defs>'
          '<rect x="222" y="2" width="62" height="56" rx="20" fill="url(#band-fog)"/>'
          '<path d="M236 20 q7 -3 14 0 t14 0 M232 36 q7 -3 14 0 t14 0" stroke="#ddd3bf" stroke-width="2.2" fill="none" stroke-linecap="round"/>'
          + g_icon('sensor', 258, 30, 18, .5))
    return f'<svg class="band-svg" viewBox="0 0 {W} 61" aria-hidden="true">{o}</svg>'


def pops_json():
    return POPS


# ---------------------------------------------------------------- what the village can build (ground y = 0)
def crane_well():
    """A well with a sweep (журавль): log frame, the fork post, the beam with a weight, the pole and bucket."""
    o = shadow(40)
    o += logs(-46, -16, 30, 16, 5.3)
    o += f'<path d="M-46 -16 h30" stroke="{INK}" stroke-width="1.6"/><ellipse cx="-31" cy="-16" rx="12" ry="2.6" fill="#3f6f8f" stroke="{INK}" stroke-width="1"/>'
    o += f'<path d="M22 0 L20 -46 M18 -54 L20 -46 L24 -54" fill="none" stroke="{INK}" stroke-width="4.2" stroke-linecap="round"/><path d="M22 0 L20 -46" stroke="#a8723f" stroke-width="2.2"/>'
    o += (f'<g class="sweep"><path d="M-31 -66 L52 -32" stroke="{INK}" stroke-width="4" stroke-linecap="round"/><path d="M-31 -66 L52 -32" stroke="#b27947" stroke-width="2"/>'
          f'<rect x="44" y="-38" width="14" height="10" rx="2" fill="#8f8a80" stroke="{INK}" stroke-width="1.2" transform="rotate(22 51 -33)"/>'
          f'<path d="M-31 -66 V-24" stroke="{INK}" stroke-width="1.6"/>'
          f'<path d="M-37 -24 h12 l-2 9 h-8 Z" fill="#8f5d34" stroke="{INK}" stroke-width="1.2"/></g>')
    return o


def lanterns():
    o = shadow(46)
    o += f'<path d="M-60 2 Q0 -6 60 2" stroke="#ead2a6" stroke-width="9" fill="none" stroke-linecap="round"/>'
    for x in (-34, 30):
        o += (f'<circle cx="{x + 9}" cy="-52" r="16" fill="#ffe08a" opacity=".35" class="glow"/>'
              f'<path d="M{x} 0 V-50 Q{x} -56 {x + 7} -56 H{x + 10}" fill="none" stroke="{INK}" stroke-width="3"/>'
              f'<path d="M{x} 0 V-50 Q{x} -56 {x + 7} -56 H{x + 10}" fill="none" stroke="#56616b" stroke-width="1.4"/>'
              f'<path d="M{x + 4} -56 h10 l-2 9 h-6 Z" fill="#ffe08a" stroke="{INK}" stroke-width="1.2"/><path d="M{x + 5} -57 L{x + 9} -61 L{x + 13} -57" fill="#56616b" stroke="{INK}" stroke-width="1"/>'
              f'<rect x="{x - 3}" y="-3" width="6" height="3" fill="#56616b" stroke="{INK}" stroke-width=".8"/>')
    return o


def bridge():
    o = (f'<path d="M-66 -2 Q-30 -10 0 -4 Q34 2 66 -4 V8 H-66 Z" fill="#7fc0e6" stroke="{INK}" stroke-width="1.2"/>'
         f'<path class="ripple" d="M-48 2 q6 -3 12 0 M10 4 q6 -3 12 0 M36 0 q6 -3 12 0" stroke="#e3f4ff" stroke-width="1.6" fill="none" stroke-linecap="round"/>')
    o += f'<path d="M-50 -2 Q0 -36 50 -2" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/><path d="M-50 -2 Q0 -36 50 -2" fill="none" stroke="#b27947" stroke-width="5" stroke-linecap="round"/>'
    o += ''.join(f'<path d="M{x} {-2 - 34 * (1 - (x / 50) ** 2) * .5 * 2 + 2:.1f} v-14" stroke="{INK}" stroke-width="2.4"/>' for x in (-40, -20, 0, 20, 40))
    o += f'<path d="M-44 -22 Q0 -50 44 -22" fill="none" stroke="{INK}" stroke-width="2.6"/><path d="M-44 -22 Q0 -50 44 -22" fill="none" stroke="#dcaa6e" stroke-width="1.2"/>'
    return o


def fair_square():
    o = shadow(60)
    o += f'<ellipse cx="0" cy="-2" rx="64" ry="7" fill="#e9d6ae" stroke="#c9a77a" stroke-width="1.2"/>'
    o += f'<path d="M-60 0 V-58 M60 0 V-58" stroke="{INK}" stroke-width="3"/><path d="M-60 0 V-58 M60 0 V-58" stroke="#b27947" stroke-width="1.4"/>'
    o += garland(-60, 60, -56, 7, 17)
    o += place(fair_stall('#d0503c', '#fff6e6', ('pumpkin', 'cabbage', 'radish', 'potato')), -28, 0, .78)
    o += place(fair_stall('#3f6fb0', '#fff6e6', ('tomato', 'carrot', 'onion', 'bean')), 30, 0, .78)
    return o


def windmill(turn=True):
    o = shadow(26)
    o += f'<path d="M-20 0 L-13 -56 H13 L20 0 Z" fill="#d9a466" stroke="{INK}" stroke-width="1.7" stroke-linejoin="round"/>'
    o += ''.join(f'<path d="M{-20 + i * .9:.1f} {-i * 7} H{20 - i * .9:.1f}" stroke="#a8723f" stroke-width="1" opacity=".7"/>' for i in range(1, 8))
    o += f'<path d="M-16 -56 L0 -74 L16 -56 Z" fill="#9a6438" stroke="{INK}" stroke-width="1.7" stroke-linejoin="round"/>'
    o += door(-6, -18, 12, 18) + window(-5, -42, 10, 11, carved=False)
    sail = (f'<path d="M0 0 L0 -46" stroke="{INK}" stroke-width="2.4"/>'
            f'<path d="M2 -8 L12 -8 L12 -46 L2 -46 Z" fill="#fffaf0" fill-opacity=".9" stroke="{INK}" stroke-width="1.2"/>'
            f'<path d="M2 -18 H12 M2 -28 H12 M2 -38 H12 M7 -8 V-46" stroke="{INK}" stroke-width=".7"/>')
    o += (f'<g transform="translate(0 -60)"><g class="{"sails" if turn else ""}">' + ''.join(f'<g transform="rotate({a})">{sail}</g>' for a in (0, 90, 180, 270))
          + f'</g><circle r="3.4" fill="#7c4f2b" stroke="{INK}" stroke-width="1.2"/></g>')
    return o


def school():
    o = shadow(52)
    o += hip(-54, 54, -46, 18, 12, '#c4572f')
    o += logs(-50, -46, 100, 46, 6.5, '#e2b77a', '#b38450')
    for x in (-40, -22, 12, 30):
        o += window(x, -36, 11, 14)
    o += door(-6, -24, 12, 24, '#6b8f3a')
    o += (f'<g transform="translate(0 -64)"><path d="M-9 0 V-16 H9 V0" fill="#e2b77a" stroke="{INK}" stroke-width="1.4"/>'
          f'<path d="M-12 -16 L0 -26 L12 -16 Z" fill="#c4572f" stroke="{INK}" stroke-width="1.4" stroke-linejoin="round"/>'
          f'<g class="bell"><path d="M-5 -2 Q-5 -12 0 -12 Q5 -12 5 -2 Z" fill="#e9b44c" stroke="{INK}" stroke-width="1.1"/><circle cy="0" r="1.6" fill="{INK}"/></g></g>')
    o += f'<g transform="translate(64 0)">{place(A["kid:2"], 0, 0, .38)}</g>'
    return o


def fire_tower():
    o = shadow(22)
    o += f'<path d="M-14 0 L-9 -70 H9 L14 0 Z" fill="#c66a50" stroke="{INK}" stroke-width="1.7" stroke-linejoin="round"/>'
    o += ''.join(f'<path d="M{-14 + i * .7:.1f} {-i * 10} H{14 - i * .7:.1f}" stroke="#a9533c" stroke-width=".9" opacity=".75"/>' for i in range(1, 7))
    o += door(-5, -16, 10, 16, '#5a3a20')
    o += f'<rect x="-20" y="-92" width="40" height="22" fill="#f3ead6" stroke="{INK}" stroke-width="1.6"/>'
    o += ''.join(f'<path d="M{x} -90 V-72" stroke="{INK}" stroke-width="1.2"/>' for x in (-10, 0, 10))
    o += f'<path d="M-24 -72 H24" stroke="{INK}" stroke-width="2.4"/>'
    o += f'<path d="M-24 -92 L0 -108 L24 -92 Z" fill="#b9563d" stroke="{INK}" stroke-width="1.7" stroke-linejoin="round"/>'
    o += f'<g class="bell" transform="translate(0 -80)"><path d="M-5 0 Q-5 -9 0 -9 Q5 -9 5 0 Z" fill="#e9b44c" stroke="{INK}" stroke-width="1.1"/></g>'
    o += flag(0, -108, 14, '#d0503c')
    return o


def club():
    o = shadow(60)
    o += f'<rect x="-58" y="-6" width="116" height="6" fill="#d8d0c2" stroke="{INK}" stroke-width="1.2"/>'
    o += f'<rect x="-54" y="-50" width="108" height="44" fill="#f6e7c2" stroke="{INK}" stroke-width="1.7"/>'
    o += hip(-58, 58, -50, 14, 10, '#7a8f9c')
    o += f'<path d="M-30 -50 L0 -76 L30 -50 Z" fill="#f6e7c2" stroke="{INK}" stroke-width="1.7" stroke-linejoin="round"/>'
    o += f'<path d="M0 -70 l2.6 5.4 l6 .8 l-4.4 4.2 l1 6 l-5.2 -2.8 l-5.2 2.8 l1 -6 l-4.4 -4.2 l6 -.8 Z" fill="#d0503c" stroke="{INK}" stroke-width=".9" transform="translate(0 6) scale(.9)"/>'
    o += ''.join(f'<rect x="{x}" y="-48" width="5" height="42" fill="#fffaf0" stroke="{INK}" stroke-width="1.1"/>' for x in (-26, -14, 9, 21))
    o += door(-6, -26, 12, 20, '#8a3a2a')
    for x in (-48, 36):
        o += f'<rect x="{x}" y="-40" width="12" height="16" fill="#3f6fb0" stroke="{INK}" stroke-width="1.1"/><path d="M{x + 2} -36 h8 M{x + 2} -32 h6 M{x + 2} -28 h8" stroke="#fffaf0" stroke-width="1"/>'
    o += ''.join(f'<g class="note" style="animation-delay:{-i * .8}s" transform="translate({30 + i * 12} {-74 - i * 6})"><path d="M0 0 V-9 l6 -2 V-2" fill="none" stroke="{INK}" stroke-width="1.3"/><ellipse cx="-1.6" cy="0" rx="2.4" ry="1.8" fill="{INK}"/></g>' for i in range(2))
    return o


# ---------------------------------------------------------------- the yard of the estate
def swing():
    return (shadow(22) + f'<path d="M-22 0 L-14 -46 L14 -46 L22 0 M-14 -46 H14" fill="none" stroke="{INK}" stroke-width="3"/>'
            f'<path d="M-22 0 L-14 -46 L14 -46 L22 0" fill="none" stroke="#b27947" stroke-width="1.4"/>'
            f'<g class="swing"><path d="M-6 -46 V-14 M6 -46 V-14" stroke="{INK}" stroke-width="1.1"/><rect x="-9" y="-15" width="18" height="3.4" fill="#d0503c" stroke="{INK}" stroke-width="1"/></g>')


def honor_board():
    clip = '<defs><clipPath id="hb-p"><rect x="-9" y="-46" width="18" height="20" rx="2"/></clipPath></defs>'
    return (shadow(24) + clip + f'<path d="M-18 0 V-40 M18 0 V-40" stroke="{INK}" stroke-width="3"/>'
            f'<rect x="-26" y="-56" width="52" height="36" rx="3" fill="#d0503c" stroke="{INK}" stroke-width="1.6"/>'
            f'<rect x="-11" y="-48" width="22" height="24" rx="2" fill="#fffaf0" stroke="{INK}" stroke-width="1.1"/>'
            f'<rect x="-9" y="-46" width="18" height="20" fill="#cfe9f5"/>'
            f'<g clip-path="url(#hb-p)">{place(A["farmer"], 1, -10, .4)}</g>'
            f'<path d="M-22 -52 h8 M14 -52 h8 M-22 -46 h6 M16 -46 h6" stroke="#f4c542" stroke-width="1.6"/>'
            f'{text(0, -60, "ПОЧЁТ", 7.5, INK, 800)}')


def oven():
    return (shadow(24) + f'<path d="M-24 0 V-22 Q-24 -40 0 -40 Q24 -40 24 -22 V0 Z" fill="#e8e0d2" stroke="{INK}" stroke-width="1.7"/>'
            f'<path d="M-10 0 V-12 Q-10 -22 0 -22 Q10 -22 10 -12 V0 Z" fill="#3a2618" stroke="{INK}" stroke-width="1.3"/>'
            f'<path d="M-6 -2 q3 -8 6 -2 q3 -7 6 0" fill="#f6a03a" stroke="none" class="fire"/>'
            f'{chimney(8, -52, 7, 14, "#b4553f")}{smoke(12, -56, .8)}')


def gazebo():
    return (shadow(30) + f'<path d="M-26 0 V-34 M26 0 V-34 M-10 0 V-34 M10 0 V-34" stroke="{INK}" stroke-width="3"/>'
            f'<path d="M-26 0 V-34 M26 0 V-34 M-10 0 V-34 M10 0 V-34" stroke="#b27947" stroke-width="1.4"/>'
            f'<path d="M-34 -32 L0 -54 L34 -32 Z" fill="#6b2f22" stroke="{INK}" stroke-width="1.7" stroke-linejoin="round"/>'
            f'<path d="M-26 -14 H26" stroke="#b27947" stroke-width="2.4"/>'
            f'<g transform="translate(0 -14)"><path d="M-7 0 V-10 Q-7 -14 0 -14 Q7 -14 7 -10 V0 Z" fill="#e9b44c" stroke="{INK}" stroke-width="1.1"/>'
            f'<path d="M7 -8 h4 v3" fill="none" stroke="{INK}" stroke-width="1"/><path d="M-3 -14 V-18 h6 V-14" fill="#e9b44c" stroke="{INK}" stroke-width="1"/></g>')


def desk():
    return (shadow(26) + f'<path d="M-30 -30 L0 -44 L30 -30" fill="none" stroke="{INK}" stroke-width="2"/>'
            f'<path d="M-28 0 V-31 M28 0 V-31" stroke="{INK}" stroke-width="2.4"/>'
            f'<path d="M-32 -32 L0 -46 L32 -32 Z" fill="#3f6fb0" stroke="{INK}" stroke-width="1.5" stroke-linejoin="round"/>'
            f'<rect x="-16" y="-16" width="32" height="4" fill="#b27947" stroke="{INK}" stroke-width="1.1"/>'
            f'<path d="M-13 -12 V0 M13 -12 V0" stroke="{INK}" stroke-width="1.8"/>'
            f'<rect x="-8" y="-20" width="10" height="4" fill="#fffaf0" stroke="{INK}" stroke-width=".8"/>'
            f'<g transform="translate(14 -12) scale(.16)">{A["crop:carrot:2"]}</g>')


def birdhouse():
    return (shadow(10) + f'<path d="M0 0 V-40" stroke="{INK}" stroke-width="3.4"/><path d="M0 0 V-40" stroke="#b27947" stroke-width="1.6"/>'
            f'<rect x="-9" y="-58" width="18" height="18" fill="#d9a466" stroke="{INK}" stroke-width="1.4"/>'
            f'<path d="M-12 -57 L0 -67 L12 -57 Z" fill="#5f9a3a" stroke="{INK}" stroke-width="1.3" stroke-linejoin="round"/>'
            f'<circle cy="-50" r="3" fill="#3a2618"/><path d="M0 -45 v3" stroke="{INK}" stroke-width="1.2"/>'
            f'<g class="bird" transform="translate(13 -64)"><ellipse rx="5" ry="3.6" fill="#3a3a48" stroke="{INK}" stroke-width=".8"/><circle cx="4" cy="-2" r="2.4" fill="#3a3a48"/><path d="M6 -2 l3 .6 l-3 .8" fill="#f4c542"/></g>')


def rooster_vane():
    return (shadow(10) + f'<path d="M0 0 V-46" stroke="{INK}" stroke-width="2.4"/>'
            f'<path d="M-10 -38 H10 M0 -42 V-34" stroke="{INK}" stroke-width="1.2"/>{text(-13, -35, "З", 6.5, INK, 800)}{text(13, -35, "В", 6.5, INK, 800)}'
            f'<g transform="translate(0 -50)"><g class="vane"><path d="M-12 2 Q-14 -6 -8 -8 Q-6 -14 0 -12 Q2 -18 6 -14 Q10 -16 10 -10 Q14 -8 12 -4 Q14 0 8 2 Z" fill="#e9b44c" stroke="{INK}" stroke-width="1.2" stroke-linejoin="round"/>'
            f'<path d="M4 -14 q1 -4 3 -2 q1 -3 3 0" fill="#d0503c" stroke="{INK}" stroke-width=".8"/><circle cx="7" cy="-9" r="1" fill="{INK}"/></g></g>')


def banya():
    o = shadow(30) + chimney(10, -52, 7, 16, '#7d3528') + smoke(14, -56)
    o += logs(-28, -32, 56, 32, 6, '#c58f57', '#8f5d34')
    o += gable(-34, 34, -32, -54, '#7c4f2b', ridge=False)
    o += door(-6, -22, 12, 22, '#5a3a20') + window(14, -24, 8, 8, carved=False)
    o += f'<path d="M-24 -16 q3 -4 6 0" stroke="#fff" stroke-width="1.4" fill="none" opacity=".8"/>'
    return o


def pond():
    o = (f'<ellipse cx="0" cy="-6" rx="40" ry="12" fill="#7fc0e6" stroke="{INK}" stroke-width="1.4"/>'
         f'<path class="ripple" d="M-24 -6 q5 -2 10 0 M8 -2 q5 -2 10 0" stroke="#e3f4ff" stroke-width="1.4" fill="none" stroke-linecap="round"/>')
    for i, (x, y) in enumerate(((-12, -10), (12, -8))):
        o += (f'<g class="duck" style="animation-delay:{-i * 1.6}s" transform="translate({x} {y})"><ellipse rx="6" ry="3.4" fill="#fffaf0" stroke="{INK}" stroke-width="1"/>'
              f'<circle cx="5" cy="-4" r="2.8" fill="#4f8a3a" stroke="{INK}" stroke-width=".9"/><path d="M7.6 -4 l3 .6 l-3 .8 Z" fill="#f4c542" stroke="{INK}" stroke-width=".5"/></g>')
    o += ''.join(f'<path d="M{x} -2 q-2 -12 0 -16 M{x + 3} -2 q1 -10 4 -13" stroke="#4f8a3a" stroke-width="1.4" fill="none"/><ellipse cx="{x + 1}" cy="-17" rx="1.6" ry="3.4" fill="#7c4f2b"/>' for x in (32,))
    return o


def cart_tax(amount='62 ₽'):
    return (shadow(30)
            + f'<path d="M-28 -14 H24 L20 0 H-24 Z" fill="#b27947" stroke="{INK}" stroke-width="1.8" stroke-linejoin="round"/>'
            f'<path d="M24 -12 L40 -20" stroke="{INK}" stroke-width="2.2" stroke-linecap="round"/>'
            f'<path d="M-14 -14 C-20 -30 -8 -40 0 -40 C8 -40 18 -30 12 -14 Z" fill="#f6c9bf" stroke="{INK}" stroke-width="1.8" stroke-linejoin="round"/>'
            f'<path d="M-5 -39 Q0 -44 5 -39" fill="none" stroke="{INK}" stroke-width="1.8"/>'
            f'{text(-1, -21, amount, 10, "#c23a2c", 800)}'
            f'<g class="wheel" transform="translate(-14 2)"><circle r="7" fill="#d9a466" stroke="{INK}" stroke-width="1.8"/><path d="M-7 0 H7 M0 -7 V7" stroke="{INK}" stroke-width="1"/></g>'
            f'<g class="wheel" transform="translate(12 2)"><circle r="7" fill="#d9a466" stroke="{INK}" stroke-width="1.8"/><path d="M-7 0 H7 M0 -7 V7" stroke="{INK}" stroke-width="1"/></g>')


def mini_scene(body, w=160, h=104, ground=84, sky=True, hill_col='#a2d36c', far='#c6e09e', idp='ms'):
    """A small framed scene: sky, a far hill, a near hill to stand on, then the drawing."""
    o = ''
    if sky:
        o += (f'<defs><linearGradient id="{idp}-sky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#bfe4f6"/>'
              f'<stop offset="1" stop-color="#eef7e0"/></linearGradient></defs><rect width="{w}" height="{h}" fill="url(#{idp}-sky)"/>')
    o += f'<path d="M0 {ground - 18} Q{w * .3} {ground - 30} {w * .55} {ground - 20} Q{w * .8} {ground - 12} {w} {ground - 22} V{h} H0 Z" fill="{far}"/>'
    o += f'<path d="M0 {ground - 4} Q{w * .5} {ground - 12} {w} {ground - 4} V{h} H0 Z" fill="{hill_col}"/>'
    o += f'<path d="M0 {ground - 4} Q{w * .5} {ground - 12} {w} {ground - 4}" fill="none" stroke="{INK}" stroke-opacity=".3" stroke-width="1.2"/>'
    return o + body
