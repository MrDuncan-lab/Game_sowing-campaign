# Fourth edition: the village redrawn. Buildings in a three-quarter view (front face lit, right side in
# shade, roofs with planks or shingles), soft shadows to the right, a thin ink outline that keeps the game's
# hand. Every piece is drawn with its front-bottom-centre at (0, 0) so it can stand up from its base.
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
ART = os.path.join(HERE, 'artgen')
A = json.load(open(os.path.join(ART, 'art.json')))
A.update(json.load(open(os.path.join(ART, 'art2.json'))))

INK = '#3f2a1d'
FONT = "Alegreya Sans, 'Segoe UI', sans-serif"
KX, KY = 0.46, 0.30          # one unit of depth goes this far right and up on screen
LW = 1.15                    # outline width


def f1(v):
    s = f'{v:.1f}'
    return s[:-2] if s.endswith('.0') else s


def hexrgb(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) for i in (0, 2, 4)]


def rgbhex(c):
    return '#' + ''.join(f'{max(0, min(255, round(v))):02x}' for v in c)


def shade(h, f):
    """f < 0 darkens toward a warm brown, f > 0 lightens toward warm white."""
    c = hexrgb(h)
    t = [58, 38, 26] if f < 0 else [255, 250, 238]
    k = abs(f)
    return rgbhex([a + (b - a) * k for a, b in zip(c, t)])


def pts(p):
    return ' '.join(f'{f1(x)},{f1(y)}' for x, y in p)


def poly(p, fill, stroke=INK, sw=LW, extra=''):
    st = f' stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"' if stroke else ''
    return f'<polygon points="{pts(p)}" fill="{fill}"{st}{extra}/>'


def line(p, stroke=INK, sw=LW, extra=''):
    return f'<polyline points="{pts(p)}" fill="none" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"{extra}/>'


def dep(p, z):
    """Push a point z units back in depth."""
    return (p[0] + z * KX, p[1] - z * KY)


def text(x, y, s, size=10, fill=INK, weight=800, anchor='middle', extra=''):
    return (f'<text x="{f1(x)}" y="{f1(y)}" text-anchor="{anchor}" font-family="{FONT}" font-size="{size}" '
            f'font-weight="{weight}" fill="{fill}"{extra}>{s}</text>')


def place(frag, x, y, k=1.0, flip=False, op=1):
    sx = -k if flip else k
    o = f' opacity="{op}"' if op != 1 else ''
    return f'<g transform="translate({f1(x)} {f1(y)}) scale({sx:.3f} {k:.3f})"{o}>{frag}</g>'


def g_icon(name, x, y, s, op=1):
    k = s / 48
    o = f' opacity="{op}"' if op != 1 else ''
    return f'<g transform="translate({f1(x - s / 2)} {f1(y - s / 2)}) scale({k:.4f})"{o}>{A["icon:" + name]}</g>'


def ground_shadow(w, d, op=.2):
    """Light from the upper left: the shadow falls to the right and back of the footprint."""
    x0, x1 = -w / 2, w / 2
    p = [(x0 + 2, 1), (x1 + 6, 2), dep((x1 + 14, 2), d + 6), dep((x0 + 10, 0), d + 4)]
    return poly(p, '#2e2414', None, 0, f' opacity="{op}"')


# ---------------------------------------------------------------- walls, windows, doors
def log_lines(x0, y0, x1, y1, step, col, side=False, d=0):
    out = ''
    y = y0 + step
    while y < y1 - 1:
        if side:
            out += line([(x0, y), dep((x0, y), d)], col, .8, ' opacity=".8"')
        else:
            out += line([(x0 + 1, y), (x1 - 1, y)], col, .8, ' opacity=".8"')
        y += step
    return out


def log_ends(x, y0, y1, step, col):
    out = ''
    y = y0 + step / 2
    while y < y1:
        out += f'<circle cx="{f1(x)}" cy="{f1(y)}" r="{f1(step / 2 - .25)}" fill="{col}" stroke="{INK}" stroke-width=".7"/>'
        out += f'<circle cx="{f1(x)}" cy="{f1(y)}" r="{f1(step / 5)}" fill="none" stroke="{shade(col, -.35)}" stroke-width=".5"/>'
        y += step
    return out


def win(x, y, w, h, frame='#fffaf0', lit=True, carved=True, shut=None, mull=True):
    """A front-face window: carved top (наличник), frame, glass, sill; shutters if given."""
    glass = '#ffe39a' if lit else '#6f7d8a'
    out = ''
    if shut:
        out += (f'<rect x="{f1(x - w * .55)}" y="{f1(y)}" width="{f1(w * .55)}" height="{f1(h)}" fill="{shut}" stroke="{INK}" stroke-width=".8"/>'
                f'<rect x="{f1(x + w)}" y="{f1(y)}" width="{f1(w * .55)}" height="{f1(h)}" fill="{shut}" stroke="{INK}" stroke-width=".8"/>')
    out += f'<rect x="{f1(x - 1.4)}" y="{f1(y - 1.4)}" width="{f1(w + 2.8)}" height="{f1(h + 2.8)}" fill="{frame}" stroke="{INK}" stroke-width=".8"/>'
    out += f'<rect class="win" x="{f1(x)}" y="{f1(y)}" width="{f1(w)}" height="{f1(h)}" fill="{glass}"/>'
    if lit:
        out += f'<path d="M{f1(x + 1)} {f1(y + h - 1)} L{f1(x + w * .5)} {f1(y + 1)}" stroke="#fff6d8" stroke-width="1" opacity=".7"/>'
    if mull:
        out += line([(x + w / 2, y), (x + w / 2, y + h)], frame, .9) + line([(x, y + h * .42), (x + w, y + h * .42)], frame, .9)
    if carved:
        out += (f'<path d="M{f1(x - 3)} {f1(y - 1.6)} Q{f1(x + w / 2)} {f1(y - 7.5)} {f1(x + w + 3)} {f1(y - 1.6)} Z" fill="{frame}" stroke="{INK}" stroke-width=".8"/>'
                f'<circle cx="{f1(x + w / 2)}" cy="{f1(y - 3.6)}" r=".9" fill="{shade(frame, -.4)}"/>')
    out += f'<rect x="{f1(x - 2.6)}" y="{f1(y + h + 1)}" width="{f1(w + 5.2)}" height="2.2" fill="{frame}" stroke="{INK}" stroke-width=".7"/>'
    return out


def side_win(x, z, y, ww, h, frame='#f1e8d4', lit=True):
    """A window on the right side face: sheared along the depth."""
    a, b = dep((x, y), z - ww / 2), dep((x, y), z + ww / 2)
    c, d = (b[0], b[1] + h), (a[0], a[1] + h)
    glass = '#e8c873' if lit else '#5f6c78'
    return (poly([dep((x, y - 1.2), z - ww / 2 - 1), dep((x, y - 1.2), z + ww / 2 + 1), dep((x, y + h + 1.2), z + ww / 2 + 1), dep((x, y + h + 1.2), z - ww / 2 - 1)], frame, INK, .7)
            + poly([a, b, c, d], glass, None, 0)
            + line([dep((x, y), z), dep((x, y + h), z)], frame, .8))


def door(x, y, w, h, col='#7c4f2b', arch=False):
    top = f'M{f1(x)} {f1(y + h)} V{f1(y + (w / 2 if arch else 0))}' + (f' A{f1(w / 2)} {f1(w / 2)} 0 0 1 {f1(x + w)} {f1(y + w / 2)}' if arch else f' H{f1(x + w)}') + f' V{f1(y + h)} Z'
    return (f'<path d="{top}" fill="{col}" stroke="{INK}" stroke-width="{LW}"/>'
            + line([(x + w / 2, y + (w / 2 if arch else 2)), (x + w / 2, y + h)], shade(col, -.3), .7)
            + f'<circle cx="{f1(x + w * .78)}" cy="{f1(y + h * .58)}" r=".9" fill="#f4d27a"/>')


# ---------------------------------------------------------------- houses
def side_house(w, d, h, rh, wall, roof, o=4, logs=False, roof_lines='plank', chimney=None, chimney_col='#a9493a',
               trim='#fffaf0', base=None):
    """Long wall to the front, ridge parallel to it. Returns (svg, anchors)."""
    x0, x1 = -w / 2, w / 2
    side_c, gable_c = shade(wall, -.2), shade(wall, -.16)
    out = ground_shadow(w, d)
    side = [(x1, 0), dep((x1, 0), d), dep((x1, -h), d), (x1, -h)]
    out += poly(side, side_c)
    apex = dep((x1, -h - rh), d / 2)
    out += poly([(x1, -h), dep((x1, -h), d), apex], gable_c)
    if logs:
        out += log_lines(x1, -h, x1, 0, 6, shade(wall, -.38), side=True, d=d)
    out += f'<rect x="{f1(x0)}" y="{f1(-h)}" width="{f1(w)}" height="{f1(h)}" fill="{wall}" stroke="{INK}" stroke-width="{LW}"/>'
    if base:
        out += f'<rect x="{f1(x0 - .5)}" y="-4" width="{f1(w + 1)}" height="4" fill="{base}" stroke="{INK}" stroke-width=".8"/>'
        out += poly([(x1, 0), dep((x1, 0), d), dep((x1, -4), d), (x1, -4)], shade(base, -.2), INK, .8)
    if logs:
        out += log_lines(x0, -h, x1, 0, 6, shade(wall, -.3))
        out += log_ends(x0, -h, 0, 6, shade(wall, .25)) + log_ends(x1, -h, 0, 6, shade(wall, .18))
    # the roof slope that faces us, from the eave up to the ridge at half depth
    eL, eR = (x0 - o, -h + o * .45), (x1 + o * .5, -h + o * .45)
    rL, rR = dep((x0 - o, -h - rh), d / 2), dep((x1 + o * .5, -h - rh), d / 2)
    rc = roof
    out += poly([eL, eR, rR, rL], rc)
    # planks or shingle rows across the slope
    n = 5
    for i in range(1, n):
        t = i / n
        a = (eL[0] + (rL[0] - eL[0]) * t, eL[1] + (rL[1] - eL[1]) * t)
        b = (eR[0] + (rR[0] - eR[0]) * t, eR[1] + (rR[1] - eR[1]) * t)
        out += line([a, b], shade(rc, -.28), .7, ' opacity=".8"')
    if roof_lines == 'plank':
        k = max(4, int(w / 9))
        for i in range(1, k):
            t = i / k
            a = (eL[0] + (eR[0] - eL[0]) * t, eL[1])
            b = (rL[0] + (rR[0] - rL[0]) * t, rL[1])
            out += line([a, b], shade(rc, -.2), .5, ' opacity=".55"')
    out += line([eL, eR], shade(rc, .35), 1.4, ' opacity=".7"')
    # the bargeboards along the side gable and the ridge
    out += line([eR, rR, dep((x1 + o * .5, -h + o * .45), d)], shade(rc, -.15), 2.6)
    out += line([eR, rR, dep((x1 + o * .5, -h + o * .45), d)], INK, .7)
    out += line([rL, rR], shade(rc, -.32), 1.8)
    anchors = {'apex': apex, 'ridgeL': rL, 'ridgeR': rR, 'top': min(rL[1], rR[1])}
    if chimney is not None:
        cx = x0 + w * chimney
        t = .55
        base_pt = (cx, eL[1] + (rL[1] - eL[1]) * t)
        base_pt = (base_pt[0] + (rL[0] - eL[0]) * t, base_pt[1])
        out += chimney_box(base_pt[0], base_pt[1], 7, 5, 14, chimney_col)
        anchors['smoke'] = (base_pt[0] + 4, base_pt[1] - 18)
    return out, anchors


def gable_house(w, d, h, rh, wall, roof, o=4, logs=False, chimney=None, chimney_col='#a9493a', base=None, gable=None):
    """Gable end to the front (as an izba faces the street), ridge going back."""
    x0, x1 = -w / 2, w / 2
    side_c = shade(wall, -.2)
    apex = (0, -h - rh)
    eL, eR = (x0 - o, -h + o * .55), (x1 + o, -h + o * .55)
    out = ground_shadow(w, d)
    # the far roof slope peeks out above the left edge of the gable
    out += poly([apex, eL, dep(eL, d), dep(apex, d)], shade(roof, -.25))
    side = [(x1, 0), dep((x1, 0), d), dep((x1, -h), d), (x1, -h)]
    out += poly(side, side_c)
    if logs:
        out += log_lines(x1, -h, x1, 0, 6, shade(wall, -.38), side=True, d=d)
    if base:
        out += poly([(x1, 0), dep((x1, 0), d), dep((x1, -4), d), (x1, -4)], shade(base, -.2), INK, .8)
    out += poly([(x0, 0), (x0, -h), apex, (x1, -h), (x1, 0)], wall)
    gc = gable or wall
    if gable:
        out += poly([(x0 + 2, -h), apex, (x1 - 2, -h)], gc, None, 0)
    if base:
        out += f'<rect x="{f1(x0 - .5)}" y="-4" width="{f1(w + 1)}" height="4" fill="{base}" stroke="{INK}" stroke-width=".8"/>'
    if logs:
        out += log_lines(x0, -h, x1, 0, 6, shade(wall, -.3))
        out += log_ends(x0, -h, 0, 6, shade(wall, .25)) + log_ends(x1, -h, 0, 6, shade(wall, .18))
        out += line([(x0 + 3, -h - 1), (x1 - 3, -h - 1)], shade(wall, -.35), 1.2)
        # vertical boards in the gable
        for i in range(1, 6):
            gx = x0 + w * i / 6
            gy = -h - rh * (1 - abs(gx) / (w / 2))
            out += line([(gx, -h - 1.5), (gx, gy + 1.2)], shade(gc, -.25), .7, ' opacity=".8"')
    # the near roof slope going back to the right
    out += poly([apex, eR, dep(eR, d), dep(apex, d)], roof)
    for i in range(1, 5):
        t = i / 5
        a = (apex[0] + (eR[0] - apex[0]) * t, apex[1] + (eR[1] - apex[1]) * t)
        out += line([a, dep(a, d)], shade(roof, -.25), .7, ' opacity=".8"')
    out += line([eR, dep(eR, d)], shade(roof, .3), 1.3, ' opacity=".7"')
    # carved bargeboards on the gable, a little sun-board at the apex
    out += line([eL, apex, eR], shade(roof, -.2), 3.2)
    out += line([eL, apex, eR], '#fffaf0', 1.1, ' opacity=".85"')
    out += line([eL, apex, eR], INK, .6)
    out += line([apex, dep(apex, d)], shade(roof, -.35), 1.6)
    anchors = {'apex': apex, 'ridgeB': dep(apex, d), 'top': apex[1] - d * KY}
    if chimney is not None:
        t = chimney
        p = (apex[0] + (eR[0] - apex[0]) * .45, apex[1] + (eR[1] - apex[1]) * .45)
        p = dep(p, d * t)
        out += chimney_box(p[0], p[1], 7, 5, 13, chimney_col)
        anchors['smoke'] = (p[0] + 4, p[1] - 17)
    return out, anchors


def chimney_box(x, y, w, d, h, col):
    """A brick chimney standing on a roof point (x, y) = front-left-bottom of the stack."""
    f = [(x, y), (x + w, y), (x + w, y - h), (x, y - h)]
    s = [(x + w, y), dep((x + w, y), d), dep((x + w, y - h), d), (x + w, y - h)]
    t = [(x, y - h), (x + w, y - h), dep((x + w, y - h), d), dep((x, y - h), d)]
    out = poly(s, shade(col, -.25)) + poly(f, col) + poly(t, shade(col, -.45))
    out += line([(x, y - h + 3), (x + w, y - h + 3)], shade(col, -.3), .6)
    return out


def smoke(x, y, k=1.0, cls=''):
    puffs = ''.join(f'<circle class="pf pf{i}" cx="0" cy="0" r="{f1((3.6 + i * 1.5) * k)}"/>' for i in range(3))
    return f'<g class="smoke{(" " + cls) if cls else ""}" transform="translate({f1(x)} {f1(y)})">{puffs}</g>'


def flag(x, y, h=26, col='#d0503c'):
    return (line([(x, y), (x, y - h)], INK, 1.5) + f'<circle cx="{f1(x)}" cy="{f1(y - h - 1.4)}" r="1.6" fill="#f4c542" stroke="{INK}" stroke-width=".7"/>'
            f'<g transform="translate({f1(x)} {f1(y - h + 1)})"><path class="flagw" d="M0 0 Q8 -3 16 1 Q11 4.6 16 8.6 Q8 5.6 0 9 Z" fill="{col}" stroke="{INK}" stroke-width=".9" stroke-linejoin="round"/></g>')


def garland(x0, y0, x1, y1, sag=6, n=12):
    mx, my = (x0 + x1) / 2, (y0 + y1) / 2 + sag * 2
    out = f'<path d="M{f1(x0)} {f1(y0)} Q{f1(mx)} {f1(my)} {f1(x1)} {f1(y1)}" fill="none" stroke="{INK}" stroke-width=".7"/>'
    for i in range(n):
        t = (i + .5) / n
        gx = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * mx + t ** 2 * x1
        gy = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * my + t ** 2 * y1
        col = ['#d0503c', '#f4c542', '#3f6fb0', '#5dad3c'][i % 4]
        out += f'<path d="M{f1(gx - 2.2)} {f1(gy)} L{f1(gx + 2.2)} {f1(gy)} L{f1(gx)} {f1(gy + 4)} Z" fill="{col}" stroke="{INK}" stroke-width=".45"/>'
    return out


def badge(frag, cx, cy, size):
    inner = frag.split('>', 1)[1].rsplit('</svg>', 1)[0]
    return f'<svg x="{f1(cx - size / 2)}" y="{f1(cy - size / 2)}" width="{f1(size)}" height="{f1(size)}" viewBox="0 0 56 56" overflow="visible">{inner}</svg>'


# ---------------------------------------------------------------- the village's buildings
def izba(w=46, d=30, h=26, rh=20, wall='#c98f58', roof='#7d5a3c', frame='#fffaf0', shut=None, lit=True, chim=.7, porch=True):
    """A log house with its gable to the street: three windows, carved frames, a porch on the side."""
    out, an = gable_house(w, d, h, rh, wall, roof, o=4, logs=True, chimney=chim, base='#a7a29a', gable=shade(wall, .05))
    for x in (-w / 2 + 5, -5, w / 2 - 15):
        out += win(x, -h + 7, 10, 11, frame, lit, True, shut)
    out += side_win(w / 2, d * .35, -h + 8, 8, 10, frame, lit)
    if porch:
        p0 = dep((w / 2, 0), d * .62)
        out += (poly([p0, dep(p0, 7), dep((p0[0], p0[1] - 14), 7), (p0[0], p0[1] - 14)], shade(wall, -.1))
                + door(p0[0] + 1, p0[1] - 13, 6, 13, '#7c4f2b'))
    out += f'<circle cx="0" cy="{f1(-h - rh * .55)}" r="3" fill="{frame}" stroke="{INK}" stroke-width=".7"/>'
    return out, an


def bakery():
    w, d, h, rh = 54, 32, 28, 20
    out, an = side_house(w, d, h, rh, '#d9a866', '#d6b25c', o=4, logs=True, roof_lines='thatch', base='#a7a29a')
    # the big oven stack and the shop window with loaves
    stack = (w / 2 - 14, -h - 6)
    out += chimney_box(stack[0], stack[1] + 4, 9, 6, 22, '#b4553f')
    an['smoke'] = (stack[0] + 5, stack[1] - 22)
    out += f'<rect x="{f1(-w / 2 + 5)}" y="{f1(-h + 8)}" width="22" height="14" fill="#fbe3a8" stroke="{INK}" stroke-width="{LW}"/>'
    out += ''.join(f'<ellipse cx="{f1(-w / 2 + 9 + i * 7)}" cy="{f1(-h + 18.5)}" rx="3" ry="2" fill="#c88a3a" stroke="{INK}" stroke-width=".6"/>' for i in range(3))
    out += f'<path d="M{f1(-w / 2 + 3)} {f1(-h + 8)} h26 l-2 -4 h-22 Z" fill="#c23a2c" stroke="{INK}" stroke-width=".8"/>'
    out += door(6, -18, 10, 18)
    out += win(w / 2 - 12, -h + 8, 8, 10)
    # a golden pretzel on a bracket over the door
    out += line([(18, -h + 4), (24, -h + 4)], INK, 1)
    out += (f'<g transform="translate(22 {f1(-h + 10)})"><path class="sway" d="M0 -4 C-6 -8 -8 1 -1 2 C-5 4 -1 7 0 3.4 C1 7 5 4 1 2 C8 1 6 -8 0 -4 Z" '
            f'fill="#e3a64a" stroke="{INK}" stroke-width=".8" stroke-linejoin="round"/></g>')
    out += badge(A['emblem:bakery'], -w / 2 + 16, -h - 9, 11)
    return out, an


def restaurant(offended=True):
    w, d, h, rh = 48, 30, 30, 18
    out, an = gable_house(w, d, h, rh, '#b4775a', '#6b2f22', o=4, chimney=.7, chimney_col='#7d3528', base='#8f8a80')
    out += ''.join(line([(-w / 2 + i * 6, -h + 1), (-w / 2 + i * 6, -1)], '#8f5a42', .7, ' opacity=".7"') for i in range(1, 8))
    out += ''.join(f'<path d="M{f1(-w / 2 - 2 + i * 6.5)} {f1(-h + 6)} h6.5 l-1 6 h-6.5 Z" fill="{"#c23a2c" if i % 2 == 0 else "#fff6e6"}" stroke="{INK}" stroke-width=".6"/>' for i in range(8))
    out += win(-w / 2 + 5, -h + 14, 9, 10, '#f1e8d4', not offended, False, '#7c4f2b' if offended else None)
    out += win(w / 2 - 14, -h + 14, 9, 10, '#f1e8d4', not offended, False, '#7c4f2b' if offended else None)
    out += door(-5, -16, 10, 16, '#5a3a20')
    out += side_win(w / 2, d * .45, -h + 10, 9, 10, '#f1e8d4', not offended)
    out += badge(A['emblem:restaurant'], 0, -h - rh * .45, 11)
    if offended:
        out += (f'<rect x="-6" y="-12" width="12" height="5" rx="1" fill="#fffaf0" stroke="{INK}" stroke-width=".6"/>'
                + line([(-4, -9.5), (4, -9.5)], INK, .7, ' stroke-dasharray="1.6 1"'))
        an.pop('smoke', None)
    return out, an


def orphanage():
    w, d, h, rh = 76, 34, 40, 16
    out, an = side_house(w, d, h, rh, '#f2d27c', '#5f9a3a', o=4, roof_lines='tin', base='#b9b2a6', chimney=.78, chimney_col='#b4553f')
    out += line([(-w / 2 + 1, -h / 2), (w / 2 - 1, -h / 2)], '#d8b25a', 1.2)
    for x in (-w / 2 + 6, -w / 2 + 18, w / 2 - 26, w / 2 - 14):
        for y in (-h + 5, -h / 2 + 4):
            out += win(x, y, 8, 9, '#fffaf0', True, False)
    # the porch in the middle with its own little roof and the sun over the door
    out += f'<rect x="-10" y="{f1(-h)}" width="20" height="{f1(h)}" fill="#efc96a" stroke="{INK}" stroke-width="{LW}"/>'
    out += door(-5, -15, 10, 15, '#6b8f3a')
    out += f'<path d="M-9 -16 L0 -21 L9 -16 Z" fill="#5f9a3a" stroke="{INK}" stroke-width=".8" stroke-linejoin="round"/>'
    out += badge(A['emblem:orphanage'], 0, -h + 10, 13)
    out += side_win(w / 2, d * .3, -h + 6, 8, 9) + side_win(w / 2, d * .7, -h + 6, 8, 9) + side_win(w / 2, d * .3, -h / 2 + 4, 8, 9) + side_win(w / 2, d * .7, -h / 2 + 4, 8, 9)
    return out, an


def council(friend=True):
    w, d, h, rh = 70, 36, 32, 16
    out, an = side_house(w, d, h, rh, '#f4eedf', '#b9563d', o=4, roof_lines='tin', base='#b9b2a6')
    for x in (-w / 2 + 5, -w / 2 + 15, w / 2 - 23, w / 2 - 13):
        out += win(x, -h + 7, 8, 13, '#fffaf0', True, False)
        out += f'<path d="M{f1(x - 1.5)} {f1(-h + 5)} h11" stroke="{INK}" stroke-width="1.1"/>'
    # a portico with four columns and a pediment
    out += f'<rect x="-15" y="{f1(-h)}" width="30" height="{f1(h)}" fill="#ece2c8" stroke="{INK}" stroke-width="{LW}"/>'
    out += door(-4.5, -18, 9, 18, '#8a5a34', arch=True)
    for x in (-13, -7, 4, 10):
        out += f'<rect x="{x}" y="{f1(-h + 1)}" width="3.4" height="{f1(h - 5)}" fill="#fffdf6" stroke="{INK}" stroke-width=".7"/>'
    out += poly([(-18, -h), (0, -h - 13), (18, -h)], '#f4eedf')
    out += badge(A['emblem:council'], 0, -h - 5, 9)
    out += f'<path d="M-12 -2.5 h24 v2.5 h-24 Z M-9 -5 h18 v2.5 h-18 Z" fill="#d8d0c2" stroke="{INK}" stroke-width=".6"/>'
    out += side_win(w / 2, d * .3, -h + 7, 8, 12) + side_win(w / 2, d * .7, -h + 7, 8, 12)
    rx, ry = an['ridgeL'][0] + (an['ridgeR'][0] - an['ridgeL'][0]) * .5, an['ridgeL'][1]
    out += flag(rx, ry, 22)
    an['flag'] = (rx, ry - 22)
    if friend:
        out += garland(-18, -h + 1, 18, -h + 1, 4, 11)
    return out, an


def college(faded=True):
    w, d, h, rh = 54, 30, 30, 13
    out, an = side_house(w, d, h, rh, '#c66a50', '#3f6fb0', o=3, roof_lines='tin', base='#9a948a')
    out += ''.join(line([(-w / 2 + 1, -h + i * 5), (w / 2 - 1, -h + i * 5)], '#a9533c', .5, ' opacity=".6"') for i in range(1, 6))
    for x in (-w / 2 + 5, -w / 2 + 15, w / 2 - 23, w / 2 - 13):
        out += (f'<path d="M{f1(x)} -9 V-20 a4 4 0 0 1 8 0 V-9 Z" fill="#ffe39a" stroke="{INK}" stroke-width=".8"/>'
                + line([(x + 4, -24), (x + 4, -9)], '#fffaf0', .7) + f'<path d="M{f1(x - 1)} -8 h10" stroke="#fffaf0" stroke-width="1.6"/>')
    out += door(-4, -15, 8, 15, '#3f5f8f', arch=True)
    # a little clock tower on the ridge
    cx, cy = (an['ridgeL'][0] + an['ridgeR'][0]) / 2, an['ridgeL'][1]
    out += (f'<rect x="{f1(cx - 6)}" y="{f1(cy - 16)}" width="12" height="16" fill="#c66a50" stroke="{INK}" stroke-width=".9"/>'
            f'<path d="M{f1(cx - 8)} {f1(cy - 16)} L{f1(cx)} {f1(cy - 25)} L{f1(cx + 8)} {f1(cy - 16)} Z" fill="#3f6fb0" stroke="{INK}" stroke-width=".9"/>'
            f'<circle cx="{f1(cx)}" cy="{f1(cy - 9)}" r="3.8" fill="#fffaf0" stroke="{INK}" stroke-width=".7"/>'
            + line([(cx, cy - 9), (cx, cy - 11.6)], INK, .7) + line([(cx, cy - 9), (cx + 1.8, cy - 8)], INK, .7))
    out += side_win(w / 2, d * .4, -h + 8, 8, 11)
    an['top'] = cy - 25
    if faded:
        out = f'<g class="faded">{out}</g>'
    return out, an


def lab():
    """A white house with the trial glasshouse beside it."""
    out, an = gable_house(26, 22, 22, 13, '#f4f1ea', '#56616b', o=3, base='#b9b2a6')
    out = out.replace('', '', 0)
    out += win(-8, -16, 8, 9, '#fffaf0', True, False)
    out += door(3, -13, 7, 13, '#56616b')
    # glasshouse to the left: an arched tunnel going back
    gx, gw, gd, gh = -38, 24, 26, 16
    g = ''
    for k in range(3, -1, -1):
        z = gd * k / 3
        p0 = dep((gx, 0), z)
        g += f'<path d="M{f1(p0[0])} {f1(p0[1])} V{f1(p0[1] - gh * .55)} Q{f1(p0[0])} {f1(p0[1] - gh)} {f1(p0[0] + gw / 2)} {f1(p0[1] - gh)} Q{f1(p0[0] + gw)} {f1(p0[1] - gh)} {f1(p0[0] + gw)} {f1(p0[1] - gh * .55)} V{f1(p0[1])}" fill="{"#dff1f8" if k == 0 else "none"}" fill-opacity=".75" stroke="{"#6f8f9c" if k else INK}" stroke-width="{.7 if k else LW}"/>'
    top0, top1 = (gx + gw / 2, -gh), dep((gx + gw / 2, -gh), gd)
    g += line([top0, top1], '#6f8f9c', .9) + line([(gx + gw, 0), dep((gx + gw, 0), gd)], '#6f8f9c', .9)
    g += ''.join(f'<path d="M{f1(gx + 3 + i * 5)} -1 q2 -6 4 0" fill="#7cbc4a" stroke="{INK}" stroke-width=".6"/>' for i in range(4))
    g += f'<path d="M{f1(gx + 3)} {f1(-gh * .6)} Q{f1(gx + 5)} {f1(-gh * .95)} {f1(gx + 11)} {f1(-gh + .5)}" fill="none" stroke="#fff" stroke-width="1.4" opacity=".9"/>'
    out = g + out
    # the flask sign over the door
    out += (f'<g transform="translate(0 {f1(-22 - 13 - 9)})"><circle r="6.5" fill="#fffaf0" stroke="{INK}" stroke-width=".8"/>'
            f'<g transform="translate(-5 -5) scale(.21)">{A["icon:flask"]}</g></g>')
    out += (f'<g class="bubbling" transform="translate(2 -56)"><circle r="1.6" fill="#9fe08a" stroke="{INK}" stroke-width=".5"/>'
            f'<circle cx="2.4" cy="-4" r="1.1" fill="#9fe08a" stroke="{INK}" stroke-width=".5"/></g>')
    an['top'] = -60
    return out, an


def barn():
    w, d, h, rh = 46, 34, 26, 18
    out, an = gable_house(w, d, h, rh, '#c2432f', '#6e3a2a', o=3, base='#8f8a80')
    out += ''.join(line([(-w / 2 + i * 5.8, -h - (rh * (1 - abs(-w / 2 + i * 5.8) / (w / 2)) if False else 0)), (-w / 2 + i * 5.8, -1)], '#9c3524', .6, ' opacity=".6"') for i in range(1, 8))
    out += (f'<rect x="-11" y="-20" width="22" height="20" fill="#f4eedf" stroke="{INK}" stroke-width="{LW}"/>'
            + line([(-11, -20), (11, 0)], '#c2432f', 2.2) + line([(11, -20), (-11, 0)], '#c2432f', 2.2)
            + line([(0, -20), (0, 0)], INK, .8)
            + f'<rect x="-5" y="{f1(-h - 9)}" width="10" height="8" fill="#5a3a20" stroke="#f4eedf" stroke-width="1.6"/>')
    out += line([(-w / 2, -h), (0, -h - rh), (w / 2, -h)], '#f4eedf', 1.6)
    return out, an


def windmill(ghost=False):
    out = '' if ghost else ground_shadow(26, 18)
    body = [(-12, 0), (-8, -44), (8, -44), (12, 0)]
    side = [(12, 0), dep((12, 0), 12), dep((8, -44), 9), (8, -44)]
    cap = [(-10, -44), (0, -56), (10, -44)]
    if ghost:
        st = 'fill="#fffaf0" fill-opacity=".35" stroke="#7a6a55" stroke-width="1.2" stroke-dasharray="4 3" stroke-linejoin="round"'
        out += f'<polygon points="{pts(body)}" {st}/><polygon points="{pts(cap)}" {st}/>'
        out += f'<g transform="translate(0 -46)"><g class="sails">' + ''.join(f'<path d="M0 0 L{f1(math.cos(a) * 24)} {f1(math.sin(a) * 24)}" stroke="#7a6a55" stroke-width="1.2" stroke-dasharray="4 3"/>' for a in (math.pi * .25, math.pi * .75, math.pi * 1.25, math.pi * 1.75)) + '</g></g>'
        return out
    out += poly(side, '#b98a55') + poly(body, '#d9a466')
    out += ''.join(line([(-12 + i * .55, -i * 5.5), (12 - i * .55, -i * 5.5)], '#a8723f', .6, ' opacity=".7"') for i in range(1, 8))
    out += poly(cap, '#8a5a34') + poly([(10, -44), dep((10, -44), 9), (4, -52), (0, -56)], shade('#8a5a34', -.25))
    out += door(-4, -11, 8, 11) + win(-3.5, -32, 7, 8, '#fffaf0', True, False)
    sail = (line([(0, 0), (0, -30)], INK, 1.6) + f'<path d="M1.5 -6 H9 V-30 H1.5 Z" fill="#fffaf0" fill-opacity=".92" stroke="{INK}" stroke-width=".8"/>'
            + ''.join(line([(1.5, -6 - i * 6), (9, -6 - i * 6)], INK, .5) for i in range(1, 4)))
    out += (f'<g transform="translate(0 -46)"><g class="sails">' + ''.join(f'<g transform="rotate({a})">{sail}</g>' for a in (20, 110, 200, 290))
            + f'</g><circle r="2.6" fill="#7c4f2b" stroke="{INK}" stroke-width=".8"/></g>')
    return out


def fire_tower(ghost=False):
    st = 'fill="#fffaf0" fill-opacity=".35" stroke="#7a6a55" stroke-width="1.2" stroke-dasharray="4 3" stroke-linejoin="round"'
    if ghost:
        return (f'<polygon points="{pts([(-8, 0), (-6, -46), (6, -46), (8, 0)])}" {st}/>'
                f'<polygon points="{pts([(-12, -46), (12, -46), (12, -60), (-12, -60)])}" {st}/>'
                f'<polygon points="{pts([(-15, -60), (0, -72), (15, -60)])}" {st}/>')
    out = ground_shadow(16, 14)
    out += poly([(8, 0), dep((8, 0), 10), dep((6, -46), 8), (6, -46)], '#a4533c') + poly([(-8, 0), (-6, -46), (6, -46), (8, 0)], '#c66a50')
    out += ''.join(line([(-8 + i * .3, -i * 6), (8 - i * .3, -i * 6)], '#a9533c', .5, ' opacity=".7"') for i in range(1, 8))
    out += f'<rect x="-12" y="-60" width="24" height="14" fill="#f3ead6" stroke="{INK}" stroke-width="{LW}"/>' + ''.join(line([(x, -59), (x, -47)], INK, .8) for x in (-6, 0, 6))
    out += poly([(-15, -60), (0, -72), (15, -60)], '#b9563d') + door(-3, -9, 6, 9, '#5a3a20')
    out += f'<g class="bell" transform="translate(0 -54)"><path d="M-3 0 Q-3 -6 0 -6 Q3 -6 3 0 Z" fill="#e9b44c" stroke="{INK}" stroke-width=".7"/></g>'
    return out


def well():
    out = ground_shadow(22, 16, .16)
    # a round log frame, two posts and a little roof
    out += f'<ellipse cx="0" cy="-2" rx="11" ry="4.2" fill="#a7a29a" stroke="{INK}" stroke-width="{LW}"/>'
    out += f'<path d="M-11 -2 V-12 A11 4.2 0 0 0 11 -12 V-2 A11 4.2 0 0 1 -11 -2 Z" fill="#b9b2a6" stroke="{INK}" stroke-width="{LW}"/>'
    out += f'<ellipse cx="0" cy="-12" rx="11" ry="4.2" fill="#8f8a80" stroke="{INK}" stroke-width="{LW}"/><ellipse cx="0" cy="-12" rx="7.5" ry="2.6" fill="#3f6f8f"/>'
    out += ''.join(line([(x, -4), (x + 5, -4)], '#7c776f', .6) for x in (-8, 1)) + line([(-4, -8), (1, -8)], '#7c776f', .6)
    out += line([(-9, -12), (-9, -32)], INK, 2.6) + line([(9, -12), (9, -32)], INK, 2.6)
    out += line([(-9, -12), (-9, -32)], '#b27947', 1.3) + line([(9, -12), (9, -32)], '#b27947', 1.3)
    out += poly([(-14, -30), (0, -40), (14, -30), dep((14, -30), 6), dep((0, -40), 6)], '#9a6438')
    out += line([(-7, -24), (7, -24)], INK, 1.6) + line([(2, -24), (2, -18)], INK, .7)
    out += f'<path d="M-1 -18 h6 l-1 4 h-4 Z" fill="#8f5d34" stroke="{INK}" stroke-width=".7"/>'
    return out


def notice_board():
    out = ground_shadow(26, 6, .14)
    out += line([(-12, 0), (-12, -34)], INK, 2.6) + line([(12, 0), (12, -34)], INK, 2.6)
    out += line([(-12, 0), (-12, -34)], '#b27947', 1.3) + line([(12, 0), (12, -34)], '#b27947', 1.3)
    out += f'<rect x="-16" y="-36" width="32" height="22" rx="2" fill="#9a6438" stroke="{INK}" stroke-width="{LW}"/>'
    out += f'<path d="M-19 -36 L0 -43 L19 -36 Z" fill="#7c4f2b" stroke="{INK}" stroke-width="{LW}" stroke-linejoin="round"/>'
    # the year's trial pinned up: a sun over cracked earth, drawn by hand
    out += (f'<rect x="-13" y="-33.5" width="15" height="17" fill="#fbf3df" stroke="{INK}" stroke-width=".6" transform="rotate(-3 -5 -25)"/>'
            f'<circle cx="-5.5" cy="-27.5" r="3.2" fill="#f6a03a" stroke="{INK}" stroke-width=".5"/>'
            + line([(-11, -21), (-1, -21)], '#a8723f', .9) + line([(-8, -21), (-7, -19)], '#a8723f', .6)
            + f'<rect x="4" y="-33" width="8" height="10" fill="#fffaf0" stroke="{INK}" stroke-width=".5" transform="rotate(4 8 -28)"/>'
            + ''.join(line([(5, -31 + i * 2.2), (11, -31 + i * 2.2)], '#b7ad9c', .5) for i in range(4)))
    out += f'<circle cx="-5.5" cy="-33" r=".9" fill="#d0503c"/><circle cx="8" cy="-32.5" r=".9" fill="#3f6fb0"/>'
    return out


def palych_bench():
    """Palych himself: grey beard, a cap, a stick, on his bench under the board."""
    out = ground_shadow(26, 8, .14)
    out += line([(-13, -7), (13, -7)], INK, 3) + line([(-13, -7), (13, -7)], '#b27947', 1.6)
    out += line([(-11, -7), (-11, 0)], INK, 1.6) + line([(11, -7), (11, 0)], INK, 1.6)
    # body: coat, legs, boots
    out += f'<path d="M-6 -7 L-7 -1 H-3 L-2 -7 Z M2 -7 L3 -1 H7 L6 -7 Z" fill="#4a4a52" stroke="{INK}" stroke-width=".7"/>'
    out += f'<path d="M-8 -1 h6 v1.5 h-6 Z M2 -1 h6 v1.5 h-6 Z" fill="#2e2a26"/>'
    out += f'<path d="M-8 -8 Q-9 -20 -4 -22 H4 Q9 -20 8 -8 Z" fill="#6b7f5a" stroke="{INK}" stroke-width=".9"/>'
    out += line([(0, -21), (0, -9)], '#56664a', .6)
    out += f'<circle cx="0" cy="-26" r="4.6" fill="#f1c8a0" stroke="{INK}" stroke-width=".8"/>'
    out += f'<path d="M-4 -24.5 Q0 -16 4 -24.5 Q2 -21.5 0 -21.5 Q-2 -21.5 -4 -24.5 Z" fill="#e8e4dc" stroke="{INK}" stroke-width=".6"/>'
    out += f'<path d="M-5 -27.5 Q-4.5 -32.6 0 -32.4 Q5 -32.6 5.4 -27.6 Q0 -29 -5 -27.5 Z" fill="#5a5a62" stroke="{INK}" stroke-width=".7"/><path d="M3 -28 h4.4" stroke="{INK}" stroke-width="1.1"/>'
    out += f'<circle cx="-1.6" cy="-26.4" r=".55" fill="{INK}"/><circle cx="1.8" cy="-26.4" r=".55" fill="{INK}"/>'
    out += line([(9, -12), (13, 0)], '#7c4f2b', 1.3)
    out += f'<path d="M7 -15 Q10 -13 10 -11" fill="none" stroke="{INK}" stroke-width="1"/>'
    return out


def fair_stall(c1, c2, goods):
    out = ground_shadow(30, 14, .14)
    out += poly([(15, 0), dep((15, 0), 10), dep((15, -10), 10), (15, -10)], '#b98a55')
    out += f'<rect x="-15" y="-10" width="30" height="10" fill="#d9a466" stroke="{INK}" stroke-width="{LW}"/>'
    out += poly([(-15, -10), (15, -10), dep((15, -10), 10), dep((-15, -10), 10)], '#e6c08a')
    out += ''.join(f'<g transform="translate({f1(-11 + k * 7.5 + 3)} -14) scale(.085)">{A["crop:" + c + ":2"]}</g>' for k, c in enumerate(goods))
    out += line([(-14, -10), (-14, -28)], INK, 1.6) + line([(14, -10), (14, -28)], INK, 1.6)
    out += line([dep((14, -10), 10), dep((14, -28), 10)], INK, 1.2)
    stripes = ''
    for k in range(6):
        x = -17 + k * 6
        stripes += poly([(x, -28), (x + 6, -28), dep((x + 6, -28), 10), dep((x, -28), 10)], c1 if k % 2 == 0 else c2, INK, .5)
        stripes += f'<path d="M{f1(x)} -28 h6 l-.6 4 h-4.8 Z" fill="{c1 if k % 2 == 0 else c2}" stroke="{INK}" stroke-width=".5"/>'
    return out + stripes


def signpost(arms=(('Кубань', -1), ('Алтай', 1))):
    out = ground_shadow(8, 4, .14)
    out += line([(0, 0), (0, -40)], INK, 3.2) + line([(0, 0), (0, -40)], '#b27947', 1.8)
    for i, (lab, d) in enumerate(arms):
        y = -34 + i * 13
        x0, x1 = (2, 38) if d > 0 else (-2, -38)
        tip = x1 + 5 * d
        out += f'<path d="M{x0} {y - 5} H{x1} L{tip} {y} L{x1} {y + 5} H{x0} Z" fill="#d9a466" stroke="{INK}" stroke-width=".9" stroke-linejoin="round"/>'
        out += text((x0 + x1) / 2, y + 2.8, lab, 7.6, INK, 800)
    return out


def haystack():
    return (ground_shadow(20, 10, .16)
            + f'<path d="M-12 0 Q-13 -14 0 -20 Q13 -14 12 0 Z" fill="#e3c35a" stroke="{INK}" stroke-width="{LW}"/>'
            + ''.join(f'<path d="M{x} -2 q2 -8 1 -14" fill="none" stroke="#c49a3a" stroke-width=".7"/>' for x in (-7, -2, 3, 8))
            + line([(0, -20), (0, -26)], '#8f5d34', 1.4))


def woodpile():
    out = ground_shadow(22, 8, .14)
    for r in range(3):
        for i in range(4 - r):
            x = -9 + i * 6 + r * 3
            y = -3.2 - r * 5.6
            out += f'<circle cx="{f1(x)}" cy="{f1(y)}" r="3" fill="#d9a466" stroke="{INK}" stroke-width=".7"/><circle cx="{f1(x)}" cy="{f1(y)}" r="1" fill="none" stroke="#a8723f" stroke-width=".5"/>'
    return out


def swing():
    return (ground_shadow(20, 6, .12) + line([(-12, 0), (-8, -26), (8, -26), (12, 0)], INK, 2.2) + line([(-12, 0), (-8, -26), (8, -26), (12, 0)], '#b27947', 1)
            + f'<g class="swing">{line([(-3.4, -26), (-3.4, -8)], INK, .7)}{line([(3.4, -26), (3.4, -8)], INK, .7)}<rect x="-5.4" y="-9" width="10.8" height="2.2" fill="#d0503c" stroke="{INK}" stroke-width=".6"/></g>')


def oven():
    return (ground_shadow(20, 10, .14)
            + f'<path d="M-13 0 V-10 Q-13 -22 0 -22 Q13 -22 13 -10 V0 Z" fill="#ece4d6" stroke="{INK}" stroke-width="{LW}"/>'
            + f'<path d="M-5 0 V-6 Q-5 -11 0 -11 Q5 -11 5 -6 V0 Z" fill="#3a2618" stroke="{INK}" stroke-width=".8"/>'
            + '<path class="fire" d="M-3 -1 q1.5 -4 3 -1 q1.5 -3.5 3 0" fill="#f6a03a"/>'
            + chimney_box(4, -18, 4, 3, 8, '#b4553f'))


def hives():
    out = ground_shadow(26, 8, .14)
    for x in (-8, 8):
        out += (f'<rect x="{x - 5}" y="-2" width="10" height="2" fill="#8f5d34" stroke="{INK}" stroke-width=".6"/>'
                f'<rect x="{x - 4.5}" y="-10" width="9" height="8" rx="1" fill="#e9c45c" stroke="{INK}" stroke-width=".7"/>'
                f'<path d="M{x - 5.5} -10 L{x} -14 L{x + 5.5} -10 Z" fill="#c58f57" stroke="{INK}" stroke-width=".7"/>'
                f'<rect x="{x - 1.4}" y="-5" width="2.8" height="1.2" fill="#3a2618"/>')
    out += '<circle class="bee" cx="2" cy="-16" r="1.2" fill="#f2c94c" stroke="#3f2a1d" stroke-width=".4"/>'
    return out


def meteo():
    out = ground_shadow(14, 6, .12)
    out += (line([(-8, 0), (-8, -9)], INK, 1) + line([(-2, 0), (-2, -9)], INK, 1)
            + f'<rect x="-10" y="-17" width="10" height="8" fill="#fffaf0" stroke="{INK}" stroke-width=".8"/>'
            + ''.join(line([(-9, -15 + i * 1.8), (-1, -15 + i * 1.8)], '#b7ad9c', .5) for i in range(3))
            + f'<path d="M-11 -17 L-5 -20 L1 -17 Z" fill="#fffaf0" stroke="{INK}" stroke-width=".7"/>'
            + line([(6, 0), (6, -40)], INK, 1.4)
            + f'<g transform="translate(6 -36)"><g class="cups">{line([(-6, 0), (6, 0)], INK, .7)}{line([(0, -6), (0, 6)], INK, .7)}'
            + ''.join(f'<circle cx="{cx}" cy="{cy}" r="1.6" fill="#d0503c" stroke="{INK}" stroke-width=".5"/>' for cx, cy in ((-6, 0), (6, 0), (0, -6), (0, 6))) + '</g></g>'
            + f'<g transform="translate(6 -42)"><path class="vane" d="M-6 0 H6 L3.4 -2 M-6 0 l2 -2.6 M-6 0 l2 2.6" fill="none" stroke="{INK}" stroke-width="1.1" stroke-linecap="round"/></g>')
    return out


def lot(w=40, d=22, sign=True):
    """An empty plot waiting for a building: trampled earth, stakes and a string, a little board with a plus."""
    out = poly([(-w / 2, 0), (w / 2, 0), dep((w / 2, 0), d), dep((-w / 2, 0), d)], '#d9c28c', None, 0, ' opacity=".55"')
    corners = [(-w / 2, 0), (w / 2, 0), dep((w / 2, 0), d), dep((-w / 2, 0), d)]
    out += line(corners + [corners[0]], '#f4f1ea', .6, ' stroke-dasharray="2 2"')
    for c in corners:
        out += line([c, (c[0], c[1] - 6)], '#8f5d34', 1.4)
    if sign:
        sx, sy = -w / 2 + 6, -1
        out += (line([(sx, sy), (sx, sy - 12)], INK, 1.4)
                + f'<rect x="{f1(sx - 6)}" y="{f1(sy - 20)}" width="12" height="9" rx="1.5" fill="#fff8e1" stroke="#c8931f" stroke-width=".9"/>'
                + f'<path d="M{f1(sx - 2.6)} {f1(sy - 15.5)} h5.2 M{f1(sx)} {f1(sy - 18.1)} v5.2" stroke="#7a5810" stroke-width="1.3" stroke-linecap="round"/>')
    return out


# ---------------------------------------------------------------- nature
def birch(h=40, k=1.0):
    t = h * k
    out = (f'<ellipse cx="3" cy="1" rx="{f1(10 * k)}" ry="{f1(2.4 * k)}" fill="#2e2414" opacity=".14"/>'
           f'<path d="M-1.6 0 L-1 {f1(-t)} L1 {f1(-t)} L1.6 0 Z" fill="#f4f1ea" stroke="{INK}" stroke-width=".8"/>'
           + ''.join(line([(-1.2, -t * f), (0.6, -t * f)], INK, .8) for f in (.2, .38, .55, .7)))
    for dx, dy, rx, ry, col in ((-6, -.78, 8, 6.5, '#8cc95a'), (5, -.86, 9, 7, '#9dd468'), (-1, -1.0, 7, 5.5, '#a8db73'), (8, -.66, 6, 5, '#8cc95a')):
        out += f'<ellipse cx="{f1(dx * k)}" cy="{f1(t * dy)}" rx="{f1(rx * k)}" ry="{f1(ry * k)}" fill="{col}" stroke="{INK}" stroke-width=".7"/>'
    return f'<g class="tree">{out}</g>'


def apple(k=1.0):
    out = (f'<ellipse cx="4" cy="1" rx="{f1(13 * k)}" ry="{f1(3 * k)}" fill="#2e2414" opacity=".15"/>'
           f'<path d="M-2 0 Q-1 {f1(-10 * k)} -2 {f1(-16 * k)} L2 {f1(-16 * k)} Q1 {f1(-10 * k)} 2 0 Z" fill="#8f5d34" stroke="{INK}" stroke-width=".8"/>'
           f'<circle cx="0" cy="{f1(-24 * k)}" r="{f1(12 * k)}" fill="#6fae45" stroke="{INK}" stroke-width=".8"/>'
           f'<circle cx="{f1(-4 * k)}" cy="{f1(-28 * k)}" r="{f1(6 * k)}" fill="#86c25a" opacity=".9"/>'
           f'<circle cx="{f1(5 * k)}" cy="{f1(-20 * k)}" r="{f1(5 * k)}" fill="#5f9a3a" opacity=".55"/>')
    out += ''.join(f'<circle cx="{f1(x * k)}" cy="{f1(y * k)}" r="{f1(1.5 * k)}" fill="#d6473a" stroke="{INK}" stroke-width=".4"/>' for x, y in ((-6, -22), (4, -29), (6, -18), (-2, -16), (-8, -30)))
    return f'<g class="tree">{out}</g>'


def fir(h=30, col='#4f8a3a', shadow=True):
    w = h * .38
    o = f'<ellipse cx="3" cy="1" rx="{f1(w * .9)}" ry="2" fill="#2e2414" opacity=".14"/>' if shadow else ''
    tiers = ''
    for i, (y0, y1, ww) in enumerate(((-h * .38, 0, w), (-h * .66, -h * .3, w * .78), (-h, -h * .56, w * .55))):
        tiers += f'<path d="M0 {f1(y0)} L{f1(ww)} {f1(y1)} H{f1(-ww)} Z" fill="{col if i != 1 else shade(col, .08)}" stroke="{INK}" stroke-width=".7" stroke-linejoin="round"/>'
    return f'<g class="tree">{o}<rect x="-1.2" y="-2" width="2.4" height="4" fill="#7c4f2b"/>{tiers}</g>'


def bush(r=8, col='#6fae45', berries=True):
    out = (f'<ellipse cx="2" cy="1" rx="{f1(r * 1.2)}" ry="{f1(r * .3)}" fill="#2e2414" opacity=".14"/>'
           f'<path d="M{f1(-r * 1.15)} 0 Q{f1(-r * 1.4)} {f1(-r * .9)} {f1(-r * .5)} {f1(-r * 1.05)} Q{f1(-r * .1)} {f1(-r * 1.7)} {f1(r * .55)} {f1(-r * 1.1)} Q{f1(r * 1.45)} {f1(-r)} {f1(r * 1.15)} 0 Z" fill="{col}" stroke="{INK}" stroke-width=".8" stroke-linejoin="round"/>'
           f'<path d="M{f1(-r * .5)} {f1(-r * .7)} q{f1(r * .3)} {f1(-r * .3)} {f1(r * .6)} 0" fill="none" stroke="{shade(col, .25)}" stroke-width=".8"/>')
    if berries:
        out += f'<circle cx="{f1(-r * .4)}" cy="{f1(-r * .7)}" r="1.1" fill="#d6473a"/><circle cx="{f1(r * .45)}" cy="{f1(-r * .45)}" r="1.1" fill="#d6473a"/>'
    return out


def flowers(n=5, w=24, seed=1):
    out = ''
    cols = ['#e0607a', '#f4c542', '#fffaf0', '#c08adf', '#ef8a4a']
    for i in range(n):
        x = -w / 2 + i * w / max(n - 1, 1)
        y = -((i * 37 + seed * 13) % 5) * .6
        out += line([(x, y), (x, y - 4.5)], '#4f8a3a', .7) + f'<circle cx="{f1(x)}" cy="{f1(y - 5)}" r="1.5" fill="{cols[(i + seed) % 5]}" stroke="{INK}" stroke-width=".35"/>'
    return out


def picket(x0, x1, y, step=5.5, h=9, z=0):
    """A picket fence along x at ground y; z pushes it back in depth."""
    a, b = dep((x0, y), z), dep((x1, y), z)
    out = line([(a[0], a[1] - h * .55), (b[0], b[1] - h * .55)], '#9a6438', 1.6)
    x = x0 + 1.5
    while x < x1:
        p = dep((x, y), z)
        out += f'<path d="M{f1(p[0] - 1.4)} {f1(p[1])} V{f1(p[1] - h)} l1.4 -1.8 l1.4 1.8 V{f1(p[1])} Z" fill="#e4bb82" stroke="{INK}" stroke-width=".55" stroke-linejoin="round"/>'
        x += step
    return out


def wattle(pts_, h=8):
    """A woven fence (плетень) along a polyline of ground points."""
    out = ''
    for (ax, ay), (bx, by) in zip(pts_, pts_[1:]):
        n = max(2, int(math.hypot(bx - ax, by - ay) / 6))
        for i in range(n + 1):
            t = i / n
            x, y = ax + (bx - ax) * t, ay + (by - ay) * t
            out += line([(x, y + 1), (x, y - h - 1.5)], '#7c4f2b', .9)
        for j in range(3):
            yy = -h * (.25 + j * .3)
            out += f'<path d="M{f1(ax)} {f1(ay + yy)} L{f1(bx)} {f1(by + yy)}" stroke="#a8723f" stroke-width="2" stroke-dasharray="5 1" fill="none"/>'
    return out


def person(shirt='#3d5a80', skirt=None, hat='#c8931f', carry=None, k=1.0, walk=True):
    """A villager in the game's ink: head, body, legs; an optional basket or buckets."""
    legs = f'<g class="{"walk" if walk else ""}"><path d="M-2 -8 L-3 0 M2 -8 L3 0" stroke="{INK}" stroke-width="1.6" stroke-linecap="round"/></g>'
    body = (f'<path d="M-4.5 -8 Q-5 -17 0 -18 Q5 -17 4.5 -8 Z" fill="{shirt}" stroke="{INK}" stroke-width=".7"/>' if not skirt else
            f'<path d="M-5.5 -3 L-3.5 -17 Q0 -18.5 3.5 -17 L5.5 -3 Z" fill="{skirt}" stroke="{INK}" stroke-width=".7"/><path d="M-3.4 -17 Q0 -18.5 3.4 -17 L3 -12 H-3 Z" fill="{shirt}" stroke="{INK}" stroke-width=".6"/>')
    head = f'<circle cx="0" cy="-21" r="3.4" fill="#f1c8a0" stroke="{INK}" stroke-width=".7"/>'
    hat_s = (f'<path d="M-4.2 -22 Q0 -27.5 4.2 -22 Z" fill="{hat}" stroke="{INK}" stroke-width=".6"/>' if hat and not skirt else
             f'<path d="M-3.6 -21 Q-3.6 -25.5 0 -25.5 Q3.6 -25.5 3.6 -21 L4.6 -18.5 Q0 -20 -4.6 -18.5 Z" fill="{hat}" stroke="{INK}" stroke-width=".6"/>' if hat else '')
    extra = ''
    if carry == 'buckets':
        extra = line([(-9, -15), (9, -15)], '#8f5d34', 1.2) + ''.join(f'<path d="M{x - 2.4} -14 h4.8 l-.6 4.4 h-3.6 Z" fill="#9aa4ae" stroke="{INK}" stroke-width=".5"/>' for x in (-9, 9))
    elif carry == 'basket':
        extra = f'<path d="M3 -12 h7 l-1 5 h-5 Z" fill="#c49a3a" stroke="{INK}" stroke-width=".6"/><path d="M4 -12 q2.5 -4 5 0" fill="none" stroke="{INK}" stroke-width=".6"/>'
    out = f'<ellipse cx="1" cy="0.6" rx="5" ry="1.3" fill="#2e2414" opacity=".18"/>' + legs + body + extra + head + hat_s
    return f'<g transform="scale({k})">{out}</g>'


def chickens(n=3):
    out = ''
    for i in range(n):
        x, y = -8 + i * 8, -(i % 2) * 2
        out += (f'<g class="peck" style="animation-delay:{-i * .7}s" transform="translate({x} {y})"><ellipse cx="0" cy="-3" rx="3.4" ry="2.6" fill="#fffaf0" stroke="{INK}" stroke-width=".5"/>'
                f'<circle cx="2.6" cy="-5.4" r="1.6" fill="#fffaf0" stroke="{INK}" stroke-width=".5"/><path d="M2.4 -7 l.6 -1.2 l.6 1.2" fill="#d0503c"/>'
                f'<path d="M4 -5.4 l1.4 .4 l-1.4 .4 Z" fill="#f4c542"/><path d="M-.6 -.6 v.9 M.8 -.6 v.9" stroke="#e0a030" stroke-width=".5"/></g>')
    return out
