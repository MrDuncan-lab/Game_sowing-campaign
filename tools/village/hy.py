"""The village's drawing kit in the hybrid style chosen on 26.10: the book's ink line and hatching with the game
vector's light, haze and colour. Low sun on the left, shadows to the lower right. Summer and winter palettes.

Pieces are functions of a renderer (Hy) and a place; villageg.py puts them on the six hills. The kit grew out of
the concept generator (project doc claude/village-hybrid-gen.py) and keeps its look, with lighter markup: ink is a
class coloured by a CSS variable, smooth shapes are Béziers, cast shadows and glows are patterns and gradients
instead of blur filters.
"""
import math, random
def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def hx(c):
    return '#%02x%02x%02x' % tuple(max(0, min(255, int(round(v)))) for v in c)


def mix(a, b, t):
    A, B = rgb(a), rgb(b)
    return hx([A[i] + (B[i] - A[i]) * t for i in range(3)])


def dark(a, k):
    return mix(a, '#2a1d14', k)


def light(a, k):
    return mix(a, '#ffffff', k)


PAL = {
    'summer': dict(
        ink='#3a2a1f', sky0='#86b2cf', sky1='#cfd9cf', sky2='#f3d7a2', sun='#fff3cc', glow='#ffd98a',
        far1='#b4c6ab', far2='#a8bd96', forest='#5a7a62',
        g1='#adc27a', g2='#a1b96a', g3='#93ae5c', g4='#85a253',
        road='#dfc794', rut='#b99d6b', strip='#93ad5e',
        logs='#c88c52', logs_s='#97653c', grey='#ad9f88', grey_s='#83776a',
        tes='#8a7a67', tes_s='#6a5c4f', iron_g='#6f9a7f', iron_g_s='#557a63', iron_r='#a95b42', iron_r_s='#7f4433',
        brick='#b4624a', brick_s='#8a4636', plaster='#e9dcc2',
        white='#f6eedb', blue='#4b85bd', green='#5e9a77', glass='#bcd6dc', win='#bcd6dc',
        accent='#c8402f', straw='#e2bf6a', soil='#5d4433', soil_l='#7a5a43',
        leaf='#8fb557', leaf_s='#5f8a43', leaf_h='#c0da82', leaf_d='#46693a', apple='#cf4b3a', lilac='#a98bc8', lilac_s='#7f66a3',
        spruce='#4f7258', spruce_s='#3c5a46', birch='#f6f1e4', snow='#fafbff', snow_s='#a9b6d8',
        coat1='#4b85bd', coat2='#a9553f', coat3='#6e7d4a', coat4='#d9a441', skin='#efc79f', hair='#6b4a32',
        smoke='#f4efe6', water='#8fb7c9', haze='#fbefd2', ao='#2c4a2a', shade_tone='#2f4a1e'),
    'winter': dict(
        ink='#33283a', sky0='#5c75a6', sky1='#a6aac8', sky2='#f1c2a6', sun='#ffe0bd', glow='#ffc18f',
        far1='#c3cadf', far2='#cfd5e8', forest='#36505b',
        g1='#e0e5f2', g2='#e6eaf5', g3='#ecf0f9', g4='#f2f5fc',
        road='#d9dae8', rut='#a3a6c4', strip='#eef0f9',
        logs='#b8784a', logs_s='#865332', grey='#a39584', grey_s='#786c61',
        tes='#7f705f', tes_s='#5f5347', iron_g='#638c78', iron_g_s='#4a6d5b', iron_r='#9c533c', iron_r_s='#733c2c',
        brick='#a95a45', brick_s='#7e4132', plaster='#e4d9c4',
        white='#f6ecdb', blue='#3f7fc0', green='#4f8c6c', glass='#ffcf6e', win='#ffcf6e',
        accent='#c8402f', straw='#d7b366', soil='#5d4433', soil_l='#7a5a43',
        leaf='#8fb557', leaf_s='#5f8a43', leaf_h='#c0da82', leaf_d='#46693a', apple='#cf4b3a', lilac='#a98bc8', lilac_s='#7f66a3',
        spruce='#3c5e57', spruce_s='#2c4844', birch='#f4f0e8', snow='#fbfcff', snow_s='#aab6da',
        coat1='#3f7fc0', coat2='#a9553f', coat3='#55603d', coat4='#d9a441', skin='#efc79f', hair='#6b4a32',
        smoke='#cfd2e6', water='#9fb0cf', haze='#dfe4f4', ao='#3d4f8f', shade_tone='#33467e'),
}


# ---------------------------------------------------------------- curves
def catmull(pts, n=8, closed=False):
    out = []
    m = len(pts)
    rng = range(m) if closed else range(m - 1)
    for i in rng:
        p0 = pts[(i - 1) % m] if closed or i > 0 else pts[0]
        p1 = pts[i]
        p2 = pts[(i + 1) % m]
        p3 = pts[(i + 2) % m] if closed or i + 2 < m else pts[-1]
        for k in range(n):
            t = k / n
            t2, t3 = t * t, t * t * t
            out.append(tuple(.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in (0, 1)))
    if not closed:
        out.append(pts[-1])
    return out


def ribbon(center, width, wobble=0.0, seed=1):
    """Outline of a path: centre spline, width(t) profile, low-frequency wobble on the edges."""
    rng = random.Random(seed)
    ph = [rng.uniform(0, 6.28) for _ in range(4)]
    c = catmull(center, 10)
    n = len(c)
    L, R_ = [], []
    for i, (x, y) in enumerate(c):
        a = c[max(0, i - 1)]
        b = c[min(n - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        d = math.hypot(dx, dy) or 1
        nx, ny = -dy / d, dx / d
        t = i / (n - 1)
        w = width(t) / 2
        e1 = wobble * (math.sin(t * 9 + ph[0]) + .5 * math.sin(t * 23 + ph[1]))
        e2 = wobble * (math.sin(t * 8 + ph[2]) + .5 * math.sin(t * 21 + ph[3]))
        L.append((x + nx * (w + e1), y + ny * (w + e1)))
        R_.append((x - nx * (w + e2), y - ny * (w + e2)))
    return L + R_[::-1], c, L, R_




# ---------------------------------------------------------------- compact path data
def fmt(v):
    s = f'{v:.1f}'
    if s.endswith('.0'):
        s = s[:-2]
    if s.startswith('0.'):
        s = s[1:]
    elif s.startswith('-0.'):
        s = '-' + s[2:]
    return '0' if s == '-0' else s


def _xy(p):
    return f'{fmt(p[0])} {fmt(p[1])}'


def D(pts, closed=True):
    """Polyline path data with implicit linetos, numbers as short as they go."""
    s = 'M' + ' '.join(_xy(p) for p in pts) + ('Z' if closed else '')
    return s.replace(' -', '-')


def SD(pts, closed=True):
    """A smooth path through the points (Catmull-Rom as cubic Béziers): far fewer numbers than a sampled curve."""
    n = len(pts)
    if n < 3:
        return D(pts, closed)
    out = ['M' + _xy(pts[0])]
    rng = range(n) if closed else range(n - 1)
    for i in rng:
        p0 = pts[(i - 1) % n] if closed or i > 0 else pts[0]
        p1 = pts[i]
        p2 = pts[(i + 1) % n]
        p3 = pts[(i + 2) % n] if closed or i + 2 < n else pts[-1]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        out.append('C' + _xy(c1) + ' ' + _xy(c2) + ' ' + _xy(p2))
    return (''.join(out) + ('Z' if closed else '')).replace(' -', '-')


def _op(v):
    return '' if v >= .995 else f' opacity="{fmt(v) if v >= .1 else f"{v:.2f}".lstrip("0")}"'


def _cls(c):
    return f' class="{c}"' if c else ''


# ---------------------------------------------------------------- renderer
# Ink is a class whose colour comes from a CSS variable of the village (--vk), so a season can recolour it and the
# markup stays short: .k is an ink line, .kf an ink outline round a fill, .kn a line in its own colour.
class Hy:
    def __init__(self, season, seed=5):
        self.season = season
        self.P = PAL[season]
        self.winter = season == 'winter'
        self.rng = random.Random(seed)
        self.out = []
        self.box = None
        self.defs = []

    def add(self, s):
        self.out.append(s)

    def see(self, pts):
        if self.box is None:
            return
        b = self.box
        for x, y in pts:
            if x < b[0]: b[0] = x
            if y < b[1]: b[1] = y
            if x > b[2]: b[2] = x
            if y > b[3]: b[3] = y

    def capture(self, fn):
        """Draw with fn() into a fresh buffer; returns (svg, [x0, y0, x1, y1])."""
        out, box = self.out, self.box
        self.out, self.box = [], [1e9, 1e9, -1e9, -1e9]
        fn()
        res = (''.join(self.out), self.box)
        self.out, self.box = out, box
        return res

    def group(self, fn, tx=0.0, ty=0.0, cls='', style=''):
        """Draw fn() at the origin and place it at (tx, ty), wrapped in a class (an animated part, a tree)."""
        svg, b = self.capture(fn)
        if b[0] < 1e8:
            self.see([(b[0] + tx, b[1] + ty), (b[2] + tx, b[3] + ty)])
        st = f' style="{style}"' if style else ''
        inner = f'<g class="{cls}"{st}>{svg}</g>' if cls or style else svg
        self.add(f'<g transform="translate({fmt(tx)} {fmt(ty)})">{inner}</g>' if tx or ty else inner)

    def jit(self, pts, closed=True, amp=.26, step=9.0):
        seq = pts + ([pts[0]] if closed else [])
        res = []
        for i in range(len(seq) - 1):
            (x0, y0), (x1, y1) = seq[i], seq[i + 1]
            n = max(1, int(math.hypot(x1 - x0, y1 - y0) / step))
            for k in range(n):
                t = k / n
                a = amp * (.5 if k == 0 else 1)
                res.append((x0 + (x1 - x0) * t + self.rng.uniform(-a, a), y0 + (y1 - y0) * t + self.rng.uniform(-a, a)))
        if not closed:
            res.append(seq[-1])
        return res

    @staticmethod
    def d(pts, closed=True):
        return D(pts, closed)

    def shape(self, pts, fill, w=1.0, shade=False, ink=True, op=1.0, curve=False, iop=1.0, cls=''):
        self.see(pts)
        ink = ink and w > 0
        if curve:
            dd = SD(pts)
            if fill and ink and iop >= .995:
                self.add(f'<path d="{dd}" fill="{fill}"{_cls(("kf " + cls).strip())} stroke-width="{fmt(w) if w >= .1 else ".1"}"{_op(op)}/>')
                ink = False
            elif fill:
                self.add(f'<path d="{dd}" fill="{fill}"{_cls(cls)}{_op(op)}/>')
            if shade:
                self.add(f'<path d="{dd}" fill="url(#vhH)"{_op(.42 * op)}/>')
            if ink:
                self.add(f'<path d="{dd}" class="k" stroke-width="{fmt(w)}"{_op(iop)}/>')
            return
        per = sum(math.dist(pts[i - 1], pts[i]) for i in range(len(pts)))
        dd = D(pts)
        if fill and ink and per < 44 and op >= .995 and iop >= .995 and not shade:
            self.add(f'<path d="{dd}" fill="{fill}"{_cls(("kf " + cls).strip())} stroke-width="{fmt(w) if w >= .1 else ".1"}"/>')
            return
        if fill:
            self.add(f'<path d="{dd}" fill="{fill}"{_cls(cls)}{_op(op)}/>')
        if shade:
            self.add(f'<path d="{dd}" fill="url(#vhH)"{_op(.42 * op)}/>')
        if ink:
            p = self.jit(pts) if per >= 44 else pts
            self.add(f'<path d="{D(p)}" class="k" stroke-width="{fmt(w)}"{_op(iop)}/>')

    def line(self, pts, w=.8, color=None, op=1.0, curve=False, jitter=True):
        self.see(pts)
        if curve:
            dd = SD(pts, closed=False)
        else:
            ln = sum(math.dist(pts[i - 1], pts[i]) for i in range(1, len(pts)))
            dd = D(self.jit(pts, closed=False, amp=.2) if jitter and ln >= 24 else pts, closed=False)
        st = f' class="k"' if color is None else f' class="kn" stroke="{color}"'
        self.add(f'<path d="{dd}"{st} stroke-width="{fmt(w)}"{_op(op)}/>')

    def lines(self, polys, w=.5, color=None, op=1.0):
        """Several plain lines of one style as one path."""
        polys = [p for p in polys if len(p) > 1]
        if not polys:
            return
        for p in polys:
            self.see(p)
        dd = ''.join(D(p, closed=False) for p in polys)
        st = f' class="k"' if color is None else f' class="kn" stroke="{color}"'
        self.add(f'<path d="{dd}"{st} stroke-width="{fmt(w)}"{_op(op)}/>')

    def blob(self, cx, cy, rx, ry, fill, w=.8, shade=False, n=10, wob=.12, op=1.0, ink=True, bumps=0, rot=0.0, cls=''):
        pts = []
        n = max(5, int(n * .8))
        for i in range(n):
            a = 2 * math.pi * i / n
            r = 1 + self.rng.uniform(-wob, wob) + (.1 * math.cos(bumps * a) if bumps else 0)
            ex, ey = rx * r * math.cos(a), ry * r * math.sin(a)
            pts.append((cx + ex * math.cos(rot) - ey * math.sin(rot), cy + ex * math.sin(rot) + ey * math.cos(rot)))
        self.shape(pts, fill, w, shade, ink, op, curve=True, cls=cls)

    def dots(self, es, fill, w=0.0, op=1.0, cls=''):
        """Many small ellipses (cx, cy, rx, ry) of one fill as one path of arcs; w > 0 outlines them in ink."""
        if not es:
            return
        self.see([(cx - rx, cy - ry) for cx, cy, rx, ry in es] + [(cx + rx, cy + ry) for cx, cy, rx, ry in es])
        dd = ''.join(f'M{fmt(cx - rx)} {fmt(cy)}a{fmt(rx)} {fmt(ry)} 0 1 0 {fmt(2 * rx)} 0a{fmt(rx)} {fmt(ry)} 0 1 0 {fmt(-2 * rx)} 0' for cx, cy, rx, ry in es).replace(' -', '-')
        c = ('kf ' + cls).strip() if w > 0 else cls
        sw = f' stroke-width="{fmt(w)}"' if w > 0 else ''
        self.add(f'<path d="{dd}" fill="{fill}"{_cls(c)}{sw}{_op(op)}/>')

    def ellipse(self, cx, cy, rx, ry, fill, op=1.0, blur=False):
        self.see([(cx - rx, cy - ry), (cx + rx, cy + ry)])
        if blur:  # a soft glow: a radial gradient, not a blur filter
            self.add(f'<ellipse cx="{fmt(cx)}" cy="{fmt(cy)}" rx="{fmt(rx * 1.3)}" ry="{fmt(ry * 1.3)}" fill="url(#vhG)"{_op(min(1, op * 2.4))}/>')
            return
        self.add(f'<ellipse cx="{fmt(cx)}" cy="{fmt(cy)}" rx="{fmt(rx)}" ry="{fmt(ry)}" fill="{fill}"{_op(op)}/>')

    def shadow(self, pts, k=1.0):
        """Cast shadow: a cool tone with light hatching (one pattern, no blur)."""
        self.add(f'<path d="{SD(pts)}" fill="url(#vhS)"{_op(.38 * k)}/>')

    def rim(self, pts, w=.9, op=.7):
        """Sunlit edge on the left of a form."""
        c = '#fff4d6' if not self.winter else '#ffd9c2'
        self.add(f'<path d="{D(pts, closed=False)}" class="kn" stroke="{c}" stroke-width="{fmt(w)}"{_op(op)}/>')

# ---------------------------------------------------------------- buildings
def roof_cap(r, quad, s, k=.75):
    """Snow over a roof plane given as (lower-front, apex-front, apex-back, lower-back)."""
    A, B, C, D = quad
    lo_b = (C[0] + (D[0] - C[0]) * k, C[1] + (D[1] - C[1]) * k)
    lo_f = (B[0] + (A[0] - B[0]) * k, B[1] + (A[1] - B[1]) * k)
    cap = [(B[0], B[1] - 1.4), (C[0], C[1] - 1.4)]
    for i in range(8):
        u = i / 7
        cap.append((lo_b[0] + (lo_f[0] - lo_b[0]) * u, lo_b[1] + (lo_f[1] - lo_b[1]) * u + 1.6 * s * math.sin(i * 1.9 + A[0])))
    r.shape(cap, r.P['snow'], .7 * s + .2)
    r.shape([cap[-1], (lo_f[0] + 1, lo_f[1] + 3 * s), (B[0] + (A[0] - B[0]) * .95, B[1] + (A[1] - B[1]) * .95)], r.P['snow_s'], 0, ink=False, op=.5)


def window(r, wx, wy, s, frame, lit, shutters=False, kind='izba'):
    P = r.P
    ww, wh = 8.6 * s, 11.5 * s
    if shutters:
        for sx in (-1, 1):
            x0 = wx + sx * (ww / 2 + 2.6 * s)
            r.shape([(x0, wy - wh / 2 - 1 * s), (x0 + sx * 5 * s, wy - wh / 2 - 1 * s), (x0 + sx * 5 * s, wy + wh / 2 + 1.5 * s), (x0, wy + wh / 2 + 1.5 * s)], frame, .5 * s + .1)
            r.line([(x0 + sx * 2.5 * s, wy - wh / 2), (x0 + sx * 2.5 * s, wy + wh / 2)], .35 * s, op=.6)
    top = [(wx + ww / 2 + 3.2 * s, wy - wh / 2 - 2.6 * s), (wx, wy - wh / 2 - 7.5 * s), (wx - ww / 2 - 3.2 * s, wy - wh / 2 - 2.6 * s)] if kind == 'izba' else \
          [(wx + ww / 2 + 2.6 * s, wy - wh / 2 - 2.5 * s), (wx - ww / 2 - 2.6 * s, wy - wh / 2 - 2.5 * s)]
    r.shape([(wx - ww / 2 - 2.4 * s, wy + wh / 2 + 3 * s), (wx + ww / 2 + 2.4 * s, wy + wh / 2 + 3 * s), (wx + ww / 2 + 2.4 * s, wy - wh / 2 - 1 * s)] + top + [(wx - ww / 2 - 2.4 * s, wy - wh / 2 - 1 * s)],
            frame, .65 * s + .15)
    g = P['win'] if lit else P['glass']
    r.shape([(wx - ww / 2, wy + wh / 2), (wx + ww / 2, wy + wh / 2), (wx + ww / 2, wy - wh / 2), (wx - ww / 2, wy - wh / 2)], g, .55 * s + .1)
    if not lit:  # a sky reflection
        r.add(f'<path d="M{wx - ww / 2 + .6:.1f} {wy - wh / 2 + .6:.1f} L{wx + ww / 2 - .6:.1f} {wy - wh / 2 + .6:.1f} L{wx - ww / 2 + .6:.1f} {wy + wh * .1:.1f} Z" fill="#ffffff" opacity=".45"/>')
    r.line([(wx, wy - wh / 2), (wx, wy + wh / 2)], .45 * s + .1, op=.8, jitter=False)
    r.line([(wx - ww / 2, wy - wh * .12), (wx + ww / 2, wy - wh * .12)], .45 * s + .1, op=.8, jitter=False)
    if kind == 'izba':
        r.blob(wx, wy - wh / 2 - 4.3 * s, 1.2 * s, 1.2 * s, P['white'], .3 * s, n=7, wob=.02)
    if lit:
        r.ellipse(wx, wy, ww * 1.6, wh * 1.2, P['win'], op=.22, blur=True)


def izba(r, x, y, s=1.0, roof='tes', frame=None, shutters=False, yard=False, svetelka=False, porch=True, lit=False, chimney=True, smoke_on=None,
         carved=True, gable_win=True):
    """A log house with its gable to the street: three windows, carved frames (plain boards if not `carved`),
    bargeboards, a round window in the gable (`gable_win`)."""
    P = r.P
    frame = frame or P['blue']
    Wf, Hw, G, D = 66 * s, 40 * s, 30 * s, 24 * s
    dy, ov = D * .42, 4 * s
    sl = P[roof]
    ss = P[roof + '_s']
    r.shadow([(x + Wf, y), (x + Wf + D, y - dy), (x + Wf + D + 44 * s, y - dy + 15 * s), (x + Wf + 30 * s, y + 13 * s), (x + 6 * s, y + 6 * s)])
    if yard:  # a covered yard behind and to the right: a low long roof over plank walls
        yx, yd = x + Wf + D * .2, 46 * s
        r.shape([(yx, y - dy * .2), (yx + yd, y - dy * .2 - 4 * s), (yx + yd, y - dy * .2 - 22 * s), (yx, y - dy * .2 - 20 * s)], P['grey_s'], .9 * s + .1, shade=True)
        for i in range(1, 9):
            xx = yx + yd * i / 9
            r.line([(xx, y - dy * .2 - 4 * s * i / 9), (xx, y - dy * .2 - 20 * s - 2 * s * i / 9)], .3 * s, op=.45, jitter=False)
        r.shape([(yx - 2 * s, y - dy * .2 - 20 * s), (yx + yd + 3 * s, y - dy * .2 - 22.5 * s), (yx + yd - 2 * s, y - dy * .2 - 34 * s), (yx + 2 * s, y - dy * .2 - 33 * s)], ss, .9 * s + .1, shade=True)
        if r.winter:
            r.shape([(yx + 1 * s, y - dy * .2 - 33.5 * s), (yx + yd - 2 * s, y - dy * .2 - 34.5 * s), (yx + yd + 1 * s, y - dy * .2 - 27 * s), (yx + 2 * s, y - dy * .2 - 26 * s)], P['snow'], .6 * s)
        r.shape([(yx + yd * .55, y - dy * .2 - 2.6 * s), (yx + yd * .85, y - dy * .2 - 3.4 * s), (yx + yd * .85, y - dy * .2 - 17 * s), (yx + yd * .55, y - dy * .2 - 16 * s)], P['grey'], .6 * s)
    side = [(x + Wf, y), (x + Wf + D, y - dy), (x + Wf + D, y - Hw - dy), (x + Wf, y - Hw)]
    r.shape(side, P['logs_s'], 1.0 * s + .2, shade=True)
    for i in range(1, 9):
        yy = y - Hw * i / 9
        r.line([(x + Wf, yy), (x + Wf + D, yy - dy)], .35 * s + .1, op=.45, jitter=False)
    rs = [(x + Wf + ov, y - Hw + 1 * s), (x + Wf / 2, y - Hw - G), (x + Wf / 2 + D, y - Hw - G - dy), (x + Wf + ov + D, y - Hw - dy + 1 * s)]
    r.shape(rs, ss, 1.0 * s + .2, shade=True)
    for i in range(1, 7):
        t = i / 7
        a = (rs[0][0] + (rs[1][0] - rs[0][0]) * t, rs[0][1] + (rs[1][1] - rs[0][1]) * t)
        r.line([a, (a[0] + D, a[1] - dy)], .3 * s + .1, op=.5, jitter=False)
    if svetelka:  # a dormer with a window on the roof slope
        sx0, sy0 = x + Wf / 2 + D * .5, y - Hw - G * .5 - dy * .5
        r.shape([(sx0 - 6 * s, sy0 + 3 * s), (sx0 + 6 * s, sy0 + 1 * s), (sx0 + 6 * s, sy0 - 9 * s), (sx0, sy0 - 15 * s), (sx0 - 6 * s, sy0 - 7 * s)], P['grey'], .7 * s + .1)
        r.shape([(sx0 - 2.6 * s, sy0 + .5 * s), (sx0 + 2.6 * s, sy0), (sx0 + 2.6 * s, sy0 - 6 * s), (sx0 - 2.6 * s, sy0 - 5.5 * s)], P['win'] if lit else P['glass'], .5 * s)
    if r.winter:
        roof_cap(r, rs, s)
    if chimney:
        cx, cy = x + Wf / 2 + D * .62, y - Hw - G * .45 - dy * .62
        ch = [(cx, cy), (cx + 6 * s, cy - 2.5 * s), (cx + 6 * s, cy - 15 * s), (cx, cy - 12.5 * s)]
        r.shape(ch, P['brick'], .8 * s + .1)
        r.shape([(cx + 6 * s, cy - 2.5 * s), (cx + 8 * s, cy - 4 * s), (cx + 8 * s, cy - 16 * s), (cx + 6 * s, cy - 15 * s)], P['brick_s'], .6 * s, shade=True)
        if r.winter:
            r.shape([(cx - .8, cy - 12.5 * s), (cx + 8.6 * s, cy - 16.5 * s), (cx + 7 * s, cy - 18 * s), (cx + .2, cy - 14.5 * s)], P['snow'], .5 * s)
        if smoke_on if smoke_on is not None else r.winter:
            smoke(r, cx + 4 * s, cy - 18 * s, s)
    fac = [(x, y), (x + Wf, y), (x + Wf, y - Hw), (x, y - Hw)]
    r.shape(fac, P['logs'], 1.25 * s + .2)
    for i in range(1, 9):
        yy = y - Hw * i / 9
        r.line([(x + 1, yy), (x + Wf - 1, yy)], .35 * s + .1, op=.45, jitter=False)
    for xx in (x - 1.2 * s, x + Wf + 1.2 * s):
        for i in range(9):
            r.blob(xx, y - Hw * (i + .5) / 9, 2.1 * s, 1.9 * s, light(P['logs'], .22), .4 * s + .05, n=7, wob=.05)
    r.rim([(x - 1.2 * s, y - 1), (x - 1.2 * s, y - Hw)], .9 * s)
    gab = [(x - ov, y - Hw), (x + Wf / 2, y - Hw - G), (x + Wf + ov, y - Hw)]
    r.shape(gab, P['grey'], 1.1 * s + .2)
    for i in range(1, 7):
        xx = x + Wf * i / 7
        top = y - Hw - G * (1 - abs(xx - (x + Wf / 2)) / (Wf / 2 + ov))
        r.line([(xx, y - Hw - .5), (xx, top + 1.5)], .3 * s + .1, op=.45, jitter=False)
    for (ax, ay), (bx, by) in [((x - ov - 2 * s, y - Hw + 2 * s), (x + Wf / 2, y - Hw - G - 2 * s)), ((x + Wf / 2, y - Hw - G - 2 * s), (x + Wf + ov + 2 * s, y - Hw + 2 * s))]:
        nx, ny = (by - ay), -(bx - ax)
        L = math.hypot(nx, ny)
        nx, ny = nx / L * 3 * s, ny / L * 3 * s
        r.shape([(ax, ay), (bx, by), (bx + nx, by + ny), (ax + nx, ay + ny)], P['white'], .8 * s + .15)
    r.rim([(x - ov - 2 * s, y - Hw + 2 * s), (x + Wf / 2, y - Hw - G - 2 * s)], .9 * s)
    r.shape([(x + Wf / 2 - 2.5 * s, y - Hw - G + 1 * s), (x + Wf / 2 + 2.5 * s, y - Hw - G + 1 * s), (x + Wf / 2, y - Hw - G + 8 * s)], P['white'], .6 * s)
    if r.winter:
        r.shape([(x - ov - 2 * s, y - Hw + 1.5 * s), (x + Wf / 2, y - Hw - G - 3.2 * s), (x + Wf / 2 + 3 * s, y - Hw - G - 1 * s), (x - ov + 1 * s, y - Hw + 3 * s)], P['snow'], .6 * s)
    ay = y - Hw - G * .38
    if gable_win:
        r.blob(x + Wf / 2, ay, 4 * s, 4 * s, P['white'], .6 * s, n=10, wob=.02)
        r.blob(x + Wf / 2, ay, 2.4 * s, 2.4 * s, P['win'] if lit else P['glass'], .45 * s, n=9, wob=.02)
    for i in range(3):
        window(r, x + Wf * (i + .5) / 3, y - Hw * .55, s, frame, lit, shutters, kind='izba' if carved else 'plain')
    r.shape([(x - 1, y), (x + Wf + 1, y), (x + Wf + 1, y - 3 * s), (x - 1, y - 3 * s)], P['logs_s'], .7 * s + .1)
    if r.winter:
        r.blob(x + Wf * .5, y + 1, Wf * .56, 3 * s, P['snow'], .6 * s, n=14, wob=.08)
        if lit:
            for i in range(3):
                r.ellipse(x + Wf * (i + .5) / 3 + 5 * s, y + 6 * s, 6 * s, 2 * s, P['win'], op=.25, blur=True)
    if porch:
        px, py = x + Wf + D * .25, y - dy * .25
        r.shape([(px, py), (px + 9 * s, py - 4 * s), (px + 9 * s, py - 24 * s), (px, py - 20 * s)], P['grey_s'], .8 * s + .1, shade=True)
        r.shape([(px - 2 * s, py - 20 * s), (px + 11 * s, py - 25.5 * s), (px + 8 * s, py - 31 * s), (px - 4 * s, py - 25 * s)], sl, .7 * s + .1)
        for k in range(3):
            r.line([(px + 1 * s + k * 2.6 * s, py - 1 * s - k * 1.1 * s), (px + 3.6 * s + k * 2.6 * s, py - 2 * s - k * 1.1 * s)], .5 * s, op=.7, jitter=False)


def izba_long(r, x, y, s=1.0, roof='iron_r', frame=None, shutters=True, lit=False, chimney=True, windows=4):
    """A house turned with its long wall to the street: four windows, the gable at the side."""
    P = r.P
    frame = frame or P['white']
    Wl, Hw, G, D = 92 * s, 36 * s, 26 * s, 34 * s
    dy = D * .42
    sl, ss = P[roof], P[roof + '_s']
    r.shadow([(x + Wl, y), (x + Wl + D, y - dy), (x + Wl + D + 40 * s, y - dy + 14 * s), (x + Wl + 26 * s, y + 13 * s), (x + 6 * s, y + 7 * s)])
    # gable side wall (shade) with its pediment
    gs = [(x + Wl, y), (x + Wl + D, y - dy), (x + Wl + D, y - Hw - dy), (x + Wl + D / 2, y - Hw - G - dy / 2), (x + Wl, y - Hw)]
    r.shape(gs, P['logs_s'], 1.0 * s + .2, shade=True)
    for i in range(1, 8):
        yy = y - Hw * i / 8
        r.line([(x + Wl, yy), (x + Wl + D, yy - dy)], .35 * s + .1, op=.45, jitter=False)
    window(r, x + Wl + D / 2, y - Hw * .55 - dy / 2, s * .9, frame, lit, False)
    # long wall
    fac = [(x, y), (x + Wl, y), (x + Wl, y - Hw), (x, y - Hw)]
    r.shape(fac, P['logs'], 1.25 * s + .2)
    for i in range(1, 8):
        yy = y - Hw * i / 8
        r.line([(x + 1, yy), (x + Wl - 1, yy)], .35 * s + .1, op=.45, jitter=False)
    for xx in (x - 1.2 * s,):
        for i in range(8):
            r.blob(xx, y - Hw * (i + .5) / 8, 2.1 * s, 1.9 * s, light(P['logs'], .22), .4 * s + .05, n=7, wob=.05)
    r.rim([(x - 1.2 * s, y - 1), (x - 1.2 * s, y - Hw)], .9 * s)
    # roof: front slope, ridge going back to the gable
    ov = 5 * s
    front = [(x - ov, y - Hw + 1), (x + Wl + ov * .6, y - Hw + 1), (x + Wl + D / 2, y - Hw - G - dy / 2 - 1), (x + D / 2 - ov, y - Hw - G - dy / 2 - 1)]
    r.shape(front, sl, 1.2 * s + .2)
    for i in range(1, 12):
        t = i / 12
        a = (front[0][0] + (front[1][0] - front[0][0]) * t, front[0][1])
        r.line([a, (a[0] + D / 2, a[1] - G - dy / 2 - 1)], .3 * s + .1, op=.4, color=dark(sl, .35), jitter=False)
    r.rim([front[0], front[3]], .9 * s)
    if r.winter:
        r.shape([front[3], front[2], (front[2][0] - 4 * s, front[2][1] + G * .7), (x + Wl * .6, y - Hw - G * .25), (x + Wl * .25, y - Hw - G * .35), (front[3][0] - 2 * s, front[3][1] + G * .75)], P['snow'], .8 * s)
    r.shape([(x + Wl + ov * .6, y - Hw + 1), (x + Wl + D / 2, y - Hw - G - dy / 2 - 1), (x + Wl + D + 2 * s, y - Hw - dy + 1), (x + Wl + D, y - Hw - dy + 3 * s)], P['white'], .7 * s)
    if chimney:
        cx, cy = x + Wl * .62, y - Hw - G * .62
        r.shape([(cx, cy), (cx + 6 * s, cy), (cx + 6 * s, cy - 13 * s), (cx, cy - 13 * s)], P['plaster'], .8 * s + .1)
        r.shape([(cx - .8 * s, cy - 11 * s), (cx + 6.8 * s, cy - 11 * s), (cx + 6.8 * s, cy - 13.5 * s), (cx - .8 * s, cy - 13.5 * s)], P['brick'], .6 * s)
        if r.winter:
            r.shape([(cx - 1, cy - 13 * s), (cx + 7 * s, cy - 13 * s), (cx + 6 * s, cy - 15 * s), (cx, cy - 15 * s)], P['snow'], .5 * s)
            smoke(r, cx + 3 * s, cy - 17 * s, s)
    for i in range(windows):
        window(r, x + Wl * (i + .5) / windows, y - Hw * .52, s, frame, lit, shutters)
    r.shape([(x - 1, y), (x + Wl + 1, y), (x + Wl + 1, y - 3 * s), (x - 1, y - 3 * s)], P['logs_s'], .7 * s + .1)
    if r.winter:
        r.blob(x + Wl * .5, y + 1, Wl * .55, 3 * s, P['snow'], .6 * s, n=14, wob=.08)


def shop(r, x, y, s=1.0, lit=False):
    """The village shop (сельпо): plastered brick, a wide window, a sign board, a step."""
    P = r.P
    Wb, Hw, D = 70 * s, 34 * s, 22 * s
    dy = D * .42
    r.shadow([(x + Wb, y), (x + Wb + D, y - dy), (x + Wb + D + 34 * s, y - dy + 12 * s), (x + Wb + 22 * s, y + 10 * s)])
    r.shape([(x + Wb, y), (x + Wb + D, y - dy), (x + Wb + D, y - Hw - dy), (x + Wb, y - Hw)], P['brick_s'], 1.0 * s + .2, shade=True)
    r.shape([(x, y), (x + Wb, y), (x + Wb, y - Hw), (x, y - Hw)], P['plaster'], 1.2 * s + .2)
    r.shape([(x, y), (x + Wb, y), (x + Wb, y - 6 * s), (x, y - 6 * s)], P['brick'], .7 * s)
    for i in range(1, 4):
        r.line([(x, y - 1.5 * s * i), (x + Wb, y - 1.5 * s * i)], .3 * s, op=.4, jitter=False)
    roof = [(x - 4 * s, y - Hw + 1), (x + Wb + 4 * s, y - Hw + 1), (x + Wb + D + 3 * s, y - Hw - dy - 6 * s), (x + 8 * s, y - Hw - dy - 6 * s)]
    r.shape(roof, P['iron_g'], 1.1 * s + .2)
    if r.winter:
        r.shape([(x - 3 * s, y - Hw - 1), roof[3], roof[2], (x + Wb + 4 * s, y - Hw - 1), (x + Wb * .5, y - Hw + 2 * s)], P['snow'], .7 * s)
    r.shape([(x + 8 * s, y - Hw + 2 * s), (x + Wb - 8 * s, y - Hw + 2 * s), (x + Wb - 8 * s, y - Hw + 9 * s), (x + 8 * s, y - Hw + 9 * s)], P['white'], .7 * s)
    r.shape([(x + Wb * .14, y - Hw * .25), (x + Wb * .14, y - Hw * .66), (x + Wb * .5, y - Hw * .66), (x + Wb * .5, y - Hw * .25)], P['win'] if lit else P['glass'], .7 * s)
    r.line([(x + Wb * .32, y - Hw * .66), (x + Wb * .32, y - Hw * .25)], .45 * s, jitter=False)
    if not lit:
        r.add(f'<path d="M{x + Wb * .15:.1f} {y - Hw * .65:.1f} l{Wb * .12:.1f} 0 l{-Wb * .12:.1f} {Hw * .2:.1f} Z" fill="#fff" opacity=".45"/>')
    r.shape([(x + Wb * .62, y - 1), (x + Wb * .84, y - 1), (x + Wb * .84, y - Hw * .74), (x + Wb * .62, y - Hw * .74)], P['green'], .7 * s)
    r.shape([(x + Wb * .58, y + 2 * s), (x + Wb * .88, y + 2 * s), (x + Wb * .88, y - 1), (x + Wb * .58, y - 1)], P['grey'], .5 * s)
    # a loaf painted on the sign
    r.blob(x + Wb * .5, y - Hw + 5.5 * s, 6 * s, 2.4 * s, P['straw'], .4 * s, n=10)
    if lit:
        r.ellipse(x + Wb * .32, y + 6 * s, 14 * s, 3 * s, P['win'], op=.3, blur=True)


def council(r, x, y, s=1.0, lit=False):
    """The village council: a long log building, a hipped green iron roof, a porch with a pediment."""
    P = r.P
    Wb, Hw, Rf, D = 112 * s, 34 * s, 24 * s, 20 * s
    dy = D * .42
    r.shadow([(x + Wb, y), (x + Wb + D, y - dy), (x + Wb + D + 40 * s, y - dy + 13 * s), (x + Wb + 26 * s, y + 11 * s), (x + 10 * s, y + 6 * s)])
    r.shape([(x + Wb, y), (x + Wb + D, y - dy), (x + Wb + D, y - Hw - dy), (x + Wb, y - Hw)], P['logs_s'], 1.0 * s + .2, shade=True)
    r.shape([(x, y), (x + Wb, y), (x + Wb, y - Hw), (x, y - Hw)], P['logs'], 1.2 * s + .2)
    for i in range(1, 8):
        r.line([(x + 1, y - Hw * i / 8), (x + Wb - 1, y - Hw * i / 8)], .35 * s + .1, op=.45, jitter=False)
    r.rim([(x - 1, y - 1), (x - 1, y - Hw)], .9 * s)
    ov = 5 * s
    front = [(x - ov, y - Hw + 1), (x + Wb + ov, y - Hw + 1), (x + Wb - 10 * s, y - Hw - Rf), (x + 18 * s, y - Hw - Rf)]
    r.shape(front, P['iron_g'], 1.2 * s + .2)
    for i in range(1, 12):
        xx = x - ov + (Wb + 2 * ov) * i / 12
        r.line([(xx, y - Hw + 1), (xx + (x + Wb / 2 - xx) * .18, y - Hw - Rf + 1)], .3 * s + .1, op=.4, color=dark(P['iron_g'], .4), jitter=False)
    r.rim([front[0], front[3]], .9 * s)
    hip = [(x + Wb + ov, y - Hw + 1), (x + Wb + ov + D, y - Hw - dy + 1), (x + Wb - 10 * s + D * .5, y - Hw - Rf - dy * .5), (x + Wb - 10 * s, y - Hw - Rf)]
    r.shape(hip, P['iron_g_s'], 1.0 * s + .2, shade=True)
    if r.winter:
        r.shape([(x - ov + 2, y - Hw - 2), (x + 18 * s, y - Hw - Rf - 1.5), (x + Wb - 10 * s, y - Hw - Rf - 1.5), (x + Wb + ov - 2, y - Hw - 2), (x + Wb - 14 * s, y - Hw - Rf + 9 * s), (x + 60 * s, y - Hw - Rf + 12 * s), (x + 22 * s, y - Hw - Rf + 8 * s)], P['snow'], .8 * s)
    for i in range(5):
        if i == 2:
            continue
        window(r, x + Wb * (i + .5) / 5, y - Hw * .55, s, P['white'], lit, False, kind='plain')
    dx = x + Wb * .5
    r.shape([(dx - 13 * s, y + 3 * s), (dx + 13 * s, y + 3 * s), (dx + 13 * s, y - 1 * s), (dx - 13 * s, y - 1 * s)], P['grey'], .7 * s)
    r.shape([(dx - 6 * s, y - 1 * s), (dx + 6 * s, y - 1 * s), (dx + 6 * s, y - 22 * s), (dx - 6 * s, y - 22 * s)], P['grey_s'], .7 * s, shade=True)
    for px in (dx - 11 * s, dx + 10 * s):
        r.shape([(px, y - 1 * s), (px + 1.6 * s, y - 1 * s), (px + 1.6 * s, y - 28 * s), (px, y - 28 * s)], P['white'], .5 * s)
    r.shape([(dx - 15 * s, y - 27 * s), (dx + 15 * s, y - 27 * s), (dx, y - 39 * s)], P['white'], .8 * s)
    r.shape([(dx - 12 * s, y - 28 * s), (dx + 12 * s, y - 28 * s), (dx, y - 36.5 * s)], P['iron_g'], .6 * s)
    if r.winter:
        r.shape([(dx - 15 * s, y - 27.5 * s), (dx, y - 40 * s), (dx + 15 * s, y - 27.5 * s), (dx, y - 36 * s)], P['snow'], .5 * s)


def banya(r, x, y, s=1.0, smoke_on=False):
    P = r.P
    Wf, Hw, G, D = 30 * s, 18 * s, 11 * s, 18 * s
    dy = D * .42
    r.shadow([(x + Wf, y), (x + Wf + D, y - dy), (x + Wf + D + 18 * s, y - dy + 7 * s), (x + Wf + 10 * s, y + 6 * s)], .8)
    r.shape([(x + Wf, y), (x + Wf + D, y - dy), (x + Wf + D, y - Hw - dy), (x + Wf, y - Hw)], P['grey_s'], .8 * s, shade=True)
    r.shape([(x, y), (x + Wf, y), (x + Wf, y - Hw), (x, y - Hw)], P['grey'], .9 * s)
    for i in range(1, 5):
        r.line([(x + 1, y - Hw * i / 5), (x + Wf - 1, y - Hw * i / 5)], .3 * s, op=.45, jitter=False)
    r.shape([(x - 3 * s, y - Hw), (x + Wf / 2, y - Hw - G), (x + Wf + 3 * s, y - Hw)], P['grey_s'], .8 * s)
    rs = [(x + Wf + 3 * s, y - Hw), (x + Wf / 2, y - Hw - G), (x + Wf / 2 + D, y - Hw - G - dy), (x + Wf + 3 * s + D, y - Hw - dy)]
    r.shape(rs, P['tes_s'], .8 * s, shade=True)
    if r.winter:
        roof_cap(r, rs, s, .8)
    r.shape([(x + Wf * .38, y), (x + Wf * .6, y), (x + Wf * .6, y - Hw * .8), (x + Wf * .38, y - Hw * .8)], P['logs_s'], .5 * s)
    cx, cy = x + Wf / 2 + D * .7, y - Hw - G * .4 - dy * .7
    r.shape([(cx, cy), (cx + 3.4 * s, cy - 1.4 * s), (cx + 3.4 * s, cy - 8 * s), (cx, cy - 6.6 * s)], P['grey_s'], .5 * s)
    if smoke_on or r.winter:
        smoke(r, cx + 1.7 * s, cy - 10 * s, s * .9)


def smoke(r, x, y, s):
    """The game's living smoke: three puffs that the CSS sends up one after another (not counted in a piece's size)."""
    puffs = ''.join(f'<circle class="pf pf{i}" r="{fmt((3.6 + i * 1.5) * s * .8)}"/>' for i in range(3))
    r.add(f'<g class="smoke" transform="translate({fmt(x)} {fmt(y)})">{puffs}</g>')


# ---------------------------------------------------------------- trees, shrubs
def birch(r, x, y, h, lean=0.0):
    P = r.P
    tw = max(1.3, h * .04)
    top = (x + lean * h, y - h)
    r.shadow([(x - 2, y), (x + h * .7, y - 1), (x + h * .9, y + 5), (x + 2, y + 5)], .7)
    trunk = [(x - tw, y), (x + tw, y), (top[0] + tw * .4, top[1] + h * .1), (top[0] - tw * .4, top[1] + h * .1)]
    if not r.winter:
        # back layer of hanging strands
        nb = 11 + int(h / 9)
        for i in range(nb):
            a = -math.pi / 2 + (i - nb / 2) * (3.3 / nb)
            rr = r.rng.uniform(.12, .26)
            cx = top[0] + math.cos(a) * h * rr * 1.1 + r.rng.uniform(-1.5, 1.5)
            cy = top[1] + h * .26 + math.sin(a) * h * rr * .9 + abs(i - nb / 2) * h * .3 / nb
            k = r.rng.uniform(.75, 1.1) * (1 if h < 90 else .62)
            r.blob(cx + 1.6, cy + 2.4, h * .085 * k, h * .17 * k, P['leaf_s'], .55, n=10, wob=.08, bumps=5, rot=-.2 * (i - nb / 2) / nb, ink=False, cls='tb')
        r.shape(trunk, P['birch'], .8)
        r.rim([(x - tw, y), (top[0] - tw * .4, top[1] + h * .1)], .8)
        for i in range(9):
            yy = y - h * (i + .5) / 10
            xx = x + lean * h * (y - yy) / h
            r.line([(xx - tw * .7, yy), (xx + tw * .2, yy + .7)], .9, jitter=False)
        # branches showing through
        for i in range(4):
            by = top[1] + h * (.2 + .1 * i)
            sd = -1 if i % 2 else 1
            r.line([(x + lean * h * .7, by), (x + lean * h * .7 + sd * h * .14, by - h * .05)], .55, op=.8)
        nf = 12 + int(h / 7)
        for i in range(nf):
            a = -math.pi / 2 + (i - nf / 2) * (3.1 / nf)
            rr = r.rng.uniform(.08, .23)
            cx = top[0] + math.cos(a) * h * rr + r.rng.uniform(-1.5, 1.5)
            cy = top[1] + h * .22 + math.sin(a) * h * rr * .85 + abs(i - nf / 2) * h * .3 / nf
            k = r.rng.uniform(.75, 1.1) * (1 if h < 90 else .6)
            col = P['leaf_h'] if cx < top[0] - h * .05 and i % 2 == 0 else P['leaf']
            r.blob(cx, cy, h * .075 * k, h * .15 * k, col, .5, n=11, wob=.08, bumps=5, rot=-.2 * (i - nf / 2) / nf, shade=cx > top[0] + h * .08, cls='th' if col == P['leaf_h'] else 'tl')
    else:
        r.shape(trunk, P['birch'], .8)
        for i in range(9):
            yy = y - h * (i + .5) / 10
            xx = x + lean * h * (y - yy) / h
            r.line([(xx - tw * .7, yy), (xx + tw * .2, yy + .7)], .9, jitter=False)
        for i in range(9):
            by = top[1] + h * (.05 + .05 * i)
            bx = top[0] + lean * h * .1
            sd = -1 if i % 2 else 1
            ex, ey = bx + sd * h * (.16 + .04 * (i % 3)), by - h * .1
            r.line([(bx, by), ((bx + ex) / 2, by - h * .09), (ex, ey)], .55, curve=True)
            for k in range(5):
                tx = bx + (ex - bx) * (.3 + .14 * k)
                ty = by + (ey - by) * (.3 + .14 * k) - h * .05
                r.line([(tx, ty), (tx + sd * 1.2, ty + h * .14)], .3, op=.75, jitter=False)
        r.blob(top[0], top[1] + h * .12, h * .05, h * .018, P['snow'], .3, n=8)


def apple(r, x, y, h):
    P = r.P
    r.shadow([(x - h * .15, y), (x + h * .65, y - 2), (x + h * .8, y + 6), (x - h * .05, y + 7)], .8)
    tr = [(x - 2.2, y), (x + 2.2, y), (x + 1.5, y - h * .42), (x + 5, y - h * .58), (x + 2.4, y - h * .6), (x - .4, y - h * .47), (x - 3.4, y - h * .6), (x - 5, y - h * .56), (x - 1.6, y - h * .42)]
    r.shape(tr, P['logs_s'], .8)
    if r.winter:
        for i in range(7):
            a = -math.pi / 2 + (i - 3) * .42
            ex, ey = x + math.cos(a) * h * .34, y - h * .55 + math.sin(a) * h * .38
            r.line([(x, y - h * .5), ((x + ex) / 2 + 2, (y - h * .5 + ey) / 2), (ex, ey)], .6, curve=True)
            r.line([(ex, ey), (ex + math.cos(a + .6) * 5, ey + math.sin(a + .6) * 5)], .35, op=.8)
        r.blob(x, y - h * .9, h * .2, h * .03, P['snow'], .3, n=8)
        return
    for i in range(9):
        a = 2 * math.pi * i / 9
        r.blob(x + math.cos(a) * h * .22 + 1.8, y - h * .72 + math.sin(a) * h * .15 + 2, h * .17, h * .14, P['leaf_d'], .55, n=10, wob=.08, bumps=5, ink=False, cls='ad')
    for i in range(9):
        a = 2 * math.pi * i / 9 + .3
        cx, cy = x + math.cos(a) * h * .2, y - h * .74 + math.sin(a) * h * .14
        r.blob(cx, cy, h * .16, h * .13, P['leaf_h'] if cx < x - h * .08 else P['leaf'], .55, n=10, wob=.08, bumps=5, shade=cx > x + h * .1, cls='ah' if cx < x - h * .08 else 'al')
    for i in range(9):
        a = r.rng.uniform(0, 2 * math.pi)
        rr = r.rng.uniform(.06, .3)
        r.blob(x + math.cos(a) * h * rr, y - h * .74 + math.sin(a) * h * rr * .7, 1.5, 1.5, P['apple'], .3, n=7, wob=.02, cls='fr')


def spruce(r, x, y, h):
    P = r.P
    r.shadow([(x - 3, y), (x + h * .45, y - 1), (x + h * .55, y + 4), (x, y + 5)], .7)
    tiers = 6
    for i in range(tiers):
        t0 = i / tiers
        wd = h * (.34 - .27 * t0)
        yb = y - h * t0 * .84
        yt = yb - h * .28
        pts = [(x - wd, yb + 1), (x - wd * .7, yb - 2), (x - wd * .45, yb), (x - wd * .25, yb - 3), (x, yt), (x + wd * .25, yb - 3), (x + wd * .45, yb), (x + wd * .7, yb - 2), (x + wd, yb + 1), (x + wd * .3, yb + 2.5), (x - wd * .3, yb + 2.5)]
        r.shape(pts, P['spruce'], .65)
        r.shape([(x, yt + 1), (x + wd * .25, yb - 3), (x + wd * .45, yb), (x + wd * .7, yb - 2), (x + wd, yb + 1), (x + wd * .3, yb + 2.5), (x, yb + 2)], P['spruce_s'], 0, ink=False, shade=True)
        if r.winter:
            r.shape([(x - wd * .85, yb), (x - wd * .4, yb - 3), (x, yt + h * .05), (x + wd * .2, yb - h * .1), (x - wd * .1, yb - 1.5)], P['snow'], .4)
    r.shape([(x - 1.4, y + 3), (x + 1.4, y + 3), (x + 1.4, y - 1), (x - 1.4, y - 1)], P['logs_s'], .4)


def lilac(r, x, y, w):
    P = r.P
    if r.winter:
        for i in range(7):
            a = -math.pi / 2 + (i - 3) * .3
            r.line([(x, y), (x + math.cos(a) * w * .6, y + math.sin(a) * w * .7)], .45)
        r.blob(x, y + 1, w * .6, 2.2, P['snow'], .3, n=10)
        return
    for i in range(7):
        a = math.pi + i * math.pi / 6
        cx, cy = x + math.cos(a) * w * .35, y - w * .35 + math.sin(a) * w * .25
        r.blob(cx + 1, cy + 1.5, w * .3, w * .24, P['leaf_d'], .5, n=10, bumps=4, ink=False, cls='ld')
        r.blob(cx, cy, w * .28, w * .22, P['leaf'], .5, n=10, bumps=4, cls='lt')
    for i in range(6):
        a = math.pi + (i + .5) * math.pi / 6
        cx, cy = x + math.cos(a) * w * .3, y - w * .42 + math.sin(a) * w * .25
        r.blob(cx, cy, 2.2, 3.4, P['lilac'] if i % 2 else P['lilac_s'], .35, n=8, wob=.1, cls='lb')


# ---------------------------------------------------------------- fences, props
def palisade(r, x1, x2, y, s=1.0, gate=None, y2=None):
    P = r.P
    y2 = y if y2 is None else y2
    hgt = 14 * s
    yy = lambda xx: y + (y2 - y) * (xx - x1) / max(1, (x2 - x1))
    for frac in (.32, .75):
        r.shape([(x1, yy(x1) - hgt * frac), (x2, yy(x2) - hgt * frac), (x2, yy(x2) - hgt * frac - 1.8 * s), (x1, yy(x1) - hgt * frac - 1.8 * s)], P['grey_s'], .45 * s)
    xx, i = x1, 0
    while xx < x2 - 2:
        if gate and gate[0] <= xx <= gate[1]:
            xx += 4.1 * s
            continue
        b = yy(xx)
        hh = hgt * (1 + .07 * math.sin(i * 2.3))
        col = P['grey'] if i % 6 else light(P['grey'], .12)
        r.shape([(xx, b), (xx + 2.7 * s, b), (xx + 2.7 * s, b - hh), (xx + 1.35 * s, b - hh - 2.1 * s), (xx, b - hh)], col, .45 * s + .1)
        if r.winter:
            r.blob(xx + 1.35 * s, b - hh - 1.3 * s, 1.7 * s, .9 * s, P['snow'], .2, n=7, ink=False)
        xx += 4.1 * s
        i += 1
    if gate:
        g0, g1 = gate
        for px in (g0 - 2 * s, g1 + 1):
            r.shape([(px, yy(px) + 1), (px + 3 * s, yy(px) + 1), (px + 3 * s, yy(px) - hgt * 1.55), (px, yy(px) - hgt * 1.55)], P['grey_s'], .55 * s)
        r.shape([(g0 - 4.5 * s, yy(g0) - hgt * 1.55), (g1 + 5 * s, yy(g1) - hgt * 1.55), (g1 + 2.5 * s, yy(g1) - hgt * 1.85), (g0 - 2 * s, yy(g0) - hgt * 1.85)], P['tes'], .55 * s)
        if r.winter:
            r.shape([(g0 - 4.5 * s, yy(g0) - hgt * 1.86), (g1 + 3 * s, yy(g1) - hgt * 1.86), (g1 + 1 * s, yy(g1) - hgt * 2.05), (g0 - 2.5 * s, yy(g0) - hgt * 2.05)], P['snow'], .4 * s)
        # a half-open gate leaf
        r.shape([(g0 + 1, yy(g0)), (g0 + (g1 - g0) * .45, yy(g0) + 3 * s), (g0 + (g1 - g0) * .45, yy(g0) - hgt + 2 * s), (g0 + 1, yy(g0) - hgt)], light(P['grey'], .1), .45 * s)
    if r.winter:
        r.blob((x1 + x2) / 2, (y + y2) / 2 + 1, (x2 - x1) * .52, 2.6 * s, P['snow'], .4 * s, n=16, wob=.06)


def rail_fence(r, pts):
    """A field fence of poles (жердевой забор)."""
    P = r.P
    for i in range(len(pts) - 1):
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]
        r.line([(x0, y0 - 3), (x1, y1 - 3)], .45, op=.8)
        r.line([(x0, y0 - 5.5), (x1, y1 - 5.5)], .45, op=.8)
    for x, y in pts:
        r.line([(x, y + .5), (x, y - 7)], .55, op=.9)


def well_crane(r, x, y, s=1.0):
    P = r.P
    r.shadow([(x - 4 * s, y + 1), (x + 34 * s, y - 2 * s), (x + 40 * s, y + 6 * s), (x - 2 * s, y + 7 * s)], .8)
    r.shape([(x - 9 * s, y), (x + 9 * s, y), (x + 9 * s, y - 11 * s), (x - 9 * s, y - 11 * s)], P['logs'], .8 * s)
    for i in range(1, 4):
        r.line([(x - 9 * s, y - 11 * s * i / 4), (x + 9 * s, y - 11 * s * i / 4)], .3 * s, op=.45, jitter=False)
    r.shape([(x - 10 * s, y - 11 * s), (x + 10 * s, y - 11 * s), (x + 8 * s, y - 13 * s), (x - 8 * s, y - 13 * s)], P['logs_s'], .7 * s)
    if r.winter:
        r.blob(x, y - 13.5 * s, 9 * s, 1.8 * s, P['snow'], .3 * s, n=10)
    px = x + 16 * s
    r.shape([(px - 1.5 * s, y + 1), (px + 1.5 * s, y + 1), (px + 1.1 * s, y - 34 * s), (px - 1.1 * s, y - 34 * s)], P['grey_s'], .7 * s)
    r.line([(px - 1.3 * s, y - 34 * s), (px - 3.4 * s, y - 39 * s)], 1.1 * s)
    r.line([(px + 1.3 * s, y - 34 * s), (px + 3.4 * s, y - 39 * s)], 1.1 * s)
    tip, tail = (x - 2 * s, y - 52 * s), (px + 18 * s, y - 35 * s + 10 * s)
    r.line([tail, tip], 1.9 * s, color=P['ink'])
    r.line([tail, tip], 1.0 * s, color=P['grey'], jitter=False)
    r.shape([(tail[0] - 2 * s, tail[1] - 2 * s), (tail[0] + 3 * s, tail[1] - 1 * s), (tail[0] + 2.5 * s, tail[1] + 3 * s), (tail[0] - 2.5 * s, tail[1] + 2 * s)], P['grey_s'], .5 * s)
    r.line([tip, (tip[0], y - 18 * s)], .45 * s)
    r.shape([(tip[0] - 2.4 * s, y - 18 * s), (tip[0] + 2.4 * s, y - 18 * s), (tip[0] + 1.8 * s, y - 13.5 * s), (tip[0] - 1.8 * s, y - 13.5 * s)], P['grey_s'], .5 * s)


def notice_board(r, x, y, s=1.0):
    P = r.P
    for px in (x, x + 18 * s):
        r.line([(px, y), (px, y - 22 * s)], 1.0 * s)
    r.shape([(x - 2 * s, y - 10 * s), (x + 20 * s, y - 10 * s), (x + 20 * s, y - 22 * s), (x - 2 * s, y - 22 * s)], P['logs_s'], .6 * s)
    for i, (dx, c) in enumerate([(1, P['white']), (8, P['white']), (14, light(P['straw'], .5))]):
        r.shape([(x + dx * s, y - 12 * s), (x + (dx + 5) * s, y - 12 * s), (x + (dx + 5) * s, y - 20 * s), (x + dx * s, y - 20 * s)], c, .3 * s)
    r.shape([(x - 4 * s, y - 22 * s), (x + 22 * s, y - 22 * s), (x + 9 * s, y - 27 * s)], P['tes'], .5 * s)
    if r.winter:
        r.shape([(x - 4 * s, y - 22.4 * s), (x + 9 * s, y - 27.5 * s), (x + 22 * s, y - 22.4 * s), (x + 9 * s, y - 25 * s)], P['snow'], .3 * s)


def bench(r, x, y, s=1.0):
    P = r.P
    r.shape([(x, y - 5 * s), (x + 18 * s, y - 5 * s), (x + 18 * s, y - 6.8 * s), (x, y - 6.8 * s)], P['grey'], .5 * s)
    for px in (x + 2 * s, x + 15 * s):
        r.shape([(px, y), (px + 1.3 * s, y), (px + 1.3 * s, y - 5 * s), (px, y - 5 * s)], P['grey_s'], .4 * s)
    if r.winter:
        r.blob(x + 9 * s, y - 7.3 * s, 9 * s, 1 * s, P['snow'], .2, n=8, ink=False)


def poles(r, pts):
    """Telegraph poles along the road with sagging wires: the village's long horizontal."""
    P = r.P
    tops = []
    for x, y, hgt in pts:
        r.line([(x, y + 1), (x + .6, y - hgt)], 1.0)
        r.line([(x - 4, y - hgt + 2.5), (x + 4.6, y - hgt + 2)], .7)
        tops.append((x + .4, y - hgt + 2.2))
    for i in range(len(tops) - 1):
        (x0, y0), (x1, y1) = tops[i], tops[i + 1]
        for dy in (0, 1.4):
            mid = ((x0 + x1) / 2, (y0 + y1) / 2 + 5 + dy)
            r.add(f'<path d="M{x0:.1f} {y0 + dy:.1f} Q{mid[0]:.1f} {mid[1] + 3:.1f} {x1:.1f} {y1 + dy:.1f}" fill="none" stroke="{P["ink"]}" stroke-width=".35" opacity=".75"/>')


def beehives(r, x, y, n=3):
    P = r.P
    for i in range(n):
        bx = x + i * 11
        r.shape([(bx, y), (bx + 7, y), (bx + 7, y - 8), (bx, y - 8)], P['straw'] if i % 2 else light(P['straw'], .25), .45)
        r.shape([(bx - 1.2, y - 8), (bx + 8.2, y - 8), (bx + 3.5, y - 11)], P['tes'], .4)
        if r.winter:
            r.shape([(bx - 1.4, y - 8.2), (bx + 3.5, y - 11.4), (bx + 8.4, y - 8.2), (bx + 3.5, y - 9.6)], P['snow'], .25)


def laundry(r, x0, x1, y, h):
    P = r.P
    r.line([(x0, y), (x0, y - h)], .7)
    r.line([(x1, y + 2), (x1, y - h + 2)], .7)
    r.add(f'<path d="M{x0} {y - h + 1} Q{(x0 + x1) / 2} {y - h + 6} {x1} {y - h + 3}" stroke="{P["ink"]}" stroke-width=".35" fill="none"/>')
    cols = [P['white'], P['coat4'], P['blue'], P['white'], P['coat2']]
    for i in range(5):
        t = (i + .6) / 5.6
        lx = x0 + (x1 - x0) * t
        ly = y - h + 1 + 4.6 * 4 * t * (1 - t) + 2 * t
        r.shape([(lx, ly), (lx + 4.4, ly + .3), (lx + 4.6, ly + 7), (lx - .2, ly + 6.6)], cols[i], .3)


def person(r, x, y, s=1.0, coat=None, kind='woman', facing=1, pose='stand', scarf=None):
    P = r.P
    coat = coat or P['coat1']
    sk, hair = P['skin'], P['hair']
    if pose == 'walk':
        r.line([(x - 1 * s, y - 4.5 * s), (x - 2.6 * s, y)], .9 * s, color=dark(coat, .4), jitter=False)
        r.line([(x + 1 * s, y - 4.5 * s), (x + 2.4 * s, y - .3)], .9 * s, color=dark(coat, .4), jitter=False)
    if kind == 'woman':
        r.shape([(x - 3.8 * s, y - (1.4 if pose == 'walk' else 0) * s), (x + 3.8 * s, y - (1.4 if pose == 'walk' else 0) * s), (x + 2 * s, y - 9 * s), (x - 2 * s, y - 9 * s)], coat, .45 * s + .05)
        r.shape([(x - 2.2 * s, y - 9 * s), (x + 2.2 * s, y - 9 * s), (x + 1.8 * s, y - 11 * s), (x - 1.8 * s, y - 11 * s)], light(coat, .2), .35 * s)
    elif kind == 'kid':
        r.shape([(x - 2 * s, y - 2.5 * s), (x + 2 * s, y - 2.5 * s), (x + 1.6 * s, y - 7 * s), (x - 1.6 * s, y - 7 * s)], coat, .4 * s)
        if pose != 'walk':
            r.line([(x - .8 * s, y - 2.5 * s), (x - .8 * s, y)], .8 * s, color=P['soil'], jitter=False)
            r.line([(x + .8 * s, y - 2.5 * s), (x + .8 * s, y)], .8 * s, color=P['soil'], jitter=False)
        r.blob(x, y - 8.6 * s, 1.9 * s, 2 * s, sk, .35 * s, n=8, wob=.02)
        r.shape([(x - 2.1 * s, y - 8.6 * s), (x - 1.8 * s, y - 10.8 * s), (x + 1.8 * s, y - 10.8 * s), (x + 2.1 * s, y - 8.6 * s)], scarf or P['coat4'], .3 * s)
        return
    else:
        if pose != 'walk':
            r.line([(x - .9 * s, y - 4.5 * s), (x - 1 * s, y)], 1.0 * s, color=P['soil'], jitter=False)
            r.line([(x + .9 * s, y - 4.5 * s), (x + 1 * s, y)], 1.0 * s, color=P['soil'], jitter=False)
        r.shape([(x - 2.7 * s, y - 4.5 * s), (x + 2.7 * s, y - 4.5 * s), (x + 2.2 * s, y - 10.5 * s), (x - 2.2 * s, y - 10.5 * s)], coat, .45 * s + .05)
    r.blob(x, y - 12.2 * s, 2.2 * s, 2.4 * s, sk, .4 * s, n=9, wob=.02)
    if kind == 'woman':
        r.shape([(x - 2.6 * s, y - 11.6 * s), (x - 2.3 * s, y - 14.2 * s), (x, y - 15.2 * s), (x + 2.3 * s, y - 14.2 * s), (x + 2.6 * s, y - 11.6 * s), (x + 1.3 * s, y - 13.2 * s), (x - 1.3 * s, y - 13.2 * s)], scarf or P['white'], .4 * s)
    else:
        r.shape([(x - 2.5 * s, y - 13.2 * s), (x - 2 * s, y - 15 * s), (x + 2 * s, y - 15 * s), (x + 2.5 * s, y - 13.2 * s), (x + 3.6 * s * facing, y - 13 * s)], hair if not r.winter else P['coat3'], .4 * s)
    r.rim([(x - 3.6 * s, y), (x - 2 * s, y - 9 * s)], .6 * s, .5)


def yoke(r, x, y, s=1.0):
    """A woman carrying water on a yoke (коромысло)."""
    P = r.P
    person(r, x, y, s, coat=P['coat2'], pose='walk', scarf=P['coat4'])
    r.add(f'<path d="M{x - 9 * s:.1f} {y - 9.5 * s:.1f} Q{x:.1f} {y - 13 * s:.1f} {x + 9 * s:.1f} {y - 9.5 * s:.1f}" stroke="{P["logs_s"]}" stroke-width="{1.1 * s:.2f}" fill="none"/>')
    for bx in (x - 9 * s, x + 9 * s):
        r.line([(bx, y - 9.5 * s), (bx, y - 6 * s)], .3 * s)
        r.shape([(bx - 2 * s, y - 6 * s), (bx + 2 * s, y - 6 * s), (bx + 1.5 * s, y - 2.5 * s), (bx - 1.5 * s, y - 2.5 * s)], P['grey'], .35 * s)


def woodcutter(r, x, y, s=1.0):
    P = r.P
    r.shape([(x + 5 * s, y), (x + 11 * s, y), (x + 11 * s, y - 3.5 * s), (x + 5 * s, y - 3.5 * s)], P['logs'], .4 * s)
    person(r, x, y, s, coat=P['coat3'], kind='man')
    r.line([(x + 1.5 * s, y - 10 * s), (x + 6 * s, y - 16 * s)], .7 * s, color=P['logs_s'])
    r.shape([(x + 5 * s, y - 17.5 * s), (x + 8.5 * s, y - 16.5 * s), (x + 7 * s, y - 14.5 * s)], P['grey_s'], .3 * s)


def chicken(r, x, y, s=1.0, f=1):
    P = r.P
    col = P['white'] if f > 0 else P['straw']
    r.blob(x, y - 2.4 * s, 2.7 * s, 2.1 * s, col, .35 * s, n=8, wob=.05)
    r.blob(x + f * 2.3 * s, y - 4.4 * s, 1.2 * s, 1.2 * s, col, .3 * s, n=7)
    r.shape([(x + f * 2.4 * s, y - 5.4 * s), (x + f * 2.9 * s, y - 6.1 * s), (x + f * 1.9 * s, y - 5.8 * s)], P['accent'] if False else P['coat2'], 0, ink=False)
    r.line([(x - .5 * s, y - .5 * s), (x - .5 * s, y + .8 * s)], .35 * s, jitter=False)


def goat(r, x, y, s=1.0):
    P = r.P
    r.blob(x, y - 5 * s, 5 * s, 3 * s, P['white'], .45 * s, n=10, wob=.04)
    for lx in (x - 3 * s, x - 1 * s, x + 2 * s, x + 3.6 * s):
        r.line([(lx, y - 3 * s), (lx, y)], .7 * s, jitter=False)
    r.blob(x + 5.4 * s, y - 7.6 * s, 1.8 * s, 1.6 * s, P['white'], .4 * s, n=8)
    r.line([(x + 5 * s, y - 9 * s), (x + 4 * s, y - 11.4 * s)], .45 * s)
    r.line([(x + 6 * s, y - 9 * s), (x + 6.4 * s, y - 11.6 * s)], .45 * s)


def cow(r, x, y, s=1.0):
    P = r.P
    r.blob(x, y - 5 * s, 6 * s, 3.2 * s, '#8a5a3c', .45 * s, n=10, wob=.04)
    r.blob(x - 1.5 * s, y - 5.5 * s, 2 * s, 1.5 * s, P['white'], 0, n=7, ink=False)
    for lx in (x - 4 * s, x - 2 * s, x + 2.5 * s, x + 4.4 * s):
        r.line([(lx, y - 3 * s), (lx, y)], .7 * s, jitter=False)
    r.blob(x + 6.6 * s, y - 6.4 * s, 2 * s, 1.7 * s, '#8a5a3c', .4 * s, n=8)


def dog(r, x, y, s=1.0):
    P = r.P
    r.blob(x, y - 3.6 * s, 4 * s, 2.2 * s, '#b07a4a', .4 * s, n=9, wob=.04)
    for lx in (x - 2.6 * s, x + 2.4 * s):
        r.line([(lx, y - 2 * s), (lx, y)], .7 * s, jitter=False)
    r.blob(x - 4 * s, y - 5.6 * s, 1.9 * s, 1.7 * s, '#b07a4a', .35 * s, n=8)
    r.line([(x + 3.6 * s, y - 4 * s), (x + 5.6 * s, y - 6.6 * s)], .7 * s)


def cat(r, x, y, s=1.0):
    P = r.P
    r.blob(x, y - 2 * s, 2.6 * s, 1.8 * s, '#5b5a62', .35 * s, n=8)
    r.blob(x - 2.2 * s, y - 3.6 * s, 1.3 * s, 1.2 * s, '#5b5a62', .3 * s, n=7)
    r.line([(x + 2.4 * s, y - 2 * s), (x + 4 * s, y - 4.6 * s)], .55 * s, curve=True)


def bicycle(r, x, y, s=1.0):
    P = r.P
    for wx in (x, x + 10 * s):
        r.add(f'<circle cx="{wx:.1f}" cy="{y - 3.2 * s:.1f}" r="{3.2 * s:.1f}" fill="none" stroke="{P["ink"]}" stroke-width=".55"/>')
    r.line([(x, y - 3.2 * s), (x + 4 * s, y - 8 * s), (x + 10 * s, y - 3.2 * s), (x + 5 * s, y - 3.2 * s), (x, y - 3.2 * s)], .6, color=P['blue'], jitter=False)
    r.line([(x + 8.6 * s, y - 9 * s), (x + 10 * s, y - 3.2 * s)], .6, color=P['blue'], jitter=False)


def sled(r, x, y, s=1.0):
    P = r.P
    r.shape([(x, y - 3 * s), (x + 13 * s, y - 3 * s), (x + 13 * s, y - 5 * s), (x, y - 5 * s)], P['logs'], .45 * s)
    r.line([(x - 2 * s, y - 4 * s), (x - 1 * s, y), (x + 15 * s, y), (x + 16 * s, y - 2 * s)], .7 * s, curve=True)


def snowman(r, x, y, s=1.0):
    P = r.P
    r.blob(x, y - 4 * s, 4.6 * s, 4 * s, P['snow'], .45 * s, n=10)
    r.blob(x, y - 10.6 * s, 3.2 * s, 3 * s, P['snow'], .45 * s, n=9)
    r.shape([(x + 2.6 * s, y - 11 * s), (x + 5.4 * s, y - 10.6 * s), (x + 2.6 * s, y - 10.2 * s)], '#e08a3a', .2 * s)
    r.shape([(x - 2.6 * s, y - 13 * s), (x + 2.6 * s, y - 13 * s), (x + 2.2 * s, y - 16 * s), (x - 2.2 * s, y - 16 * s)], P['grey_s'], .3 * s)


def haystack(r, x, y, s=1.0):
    P = r.P
    r.shadow([(x, y + 1), (x + 18 * s, y - 1), (x + 24 * s, y + 4 * s), (x + 4 * s, y + 5 * s)], .6)
    r.line([(x, y - 2), (x, y - 33 * s)], .9 * s)
    r.shape([(x - 12 * s, y), (x - 11 * s, y - 10 * s), (x - 6 * s, y - 22 * s), (x, y - 28 * s), (x + 6 * s, y - 22 * s), (x + 11 * s, y - 10 * s), (x + 12 * s, y)], P['straw'], .75 * s, curve=False)
    r.shape([(x + 1, y - 27 * s), (x + 6 * s, y - 22 * s), (x + 11 * s, y - 10 * s), (x + 12 * s, y), (x + 4 * s, y)], dark(P['straw'], .15), 0, ink=False, shade=True)
    if r.winter:
        r.shape([(x - 7 * s, y - 20 * s), (x, y - 29 * s), (x + 7 * s, y - 20 * s), (x + 2 * s, y - 18 * s), (x - 3 * s, y - 19 * s)], P['snow'], .5 * s)


def water_tower(r, x, y, s=1.0):
    P = r.P
    c = mix(P['far2'], P['grey_s'], .5)
    r.shape([(x - 3 * s, y), (x + 3 * s, y), (x + 2.2 * s, y - 26 * s), (x - 2.2 * s, y - 26 * s)], c, .5 * s, iop=.7)
    r.shape([(x - 5 * s, y - 26 * s), (x + 5 * s, y - 26 * s), (x + 5 * s, y - 34 * s), (x - 5 * s, y - 34 * s)], c, .5 * s, iop=.7)
    r.shape([(x - 5.5 * s, y - 34 * s), (x + 5.5 * s, y - 34 * s), (x, y - 40 * s)], dark(c, .1), .5 * s, iop=.7)


def garden(r, pts, rows=5, crop='potato'):
    """A kitchen garden. Summer: dark soil in raised rows that get closer toward the back, plants in two
    tones, grass over the front edge. Winter: a snow field whose outline, furrows and old stalks still show."""
    P = r.P
    (ax, ay), (bx, by), (cx, cy), (dx, dy) = pts  # back-left, back-right, front-right, front-left
    corners = [(ax, ay), ((ax + bx) / 2, (ay + by) / 2 - .6), (bx, by), (cx, cy), ((cx + dx) / 2, (cy + dy) / 2 + .6), (dx, dy)]
    r.see(corners)
    dd = SD(corners)
    row_t = [((i + .5) / rows) ** 1.25 for i in range(rows)]
    if not r.winter:
        r.add(f'<path d="{dd}" fill="{P["soil"]}" class="kf" stroke-width=".6"/>')
        ridges, furrows, base, leaf, hi = [], [], [], [], []
        for t in row_t:
            p0 = (ax + (dx - ax) * t, ay + (dy - ay) * t)
            p1 = (bx + (cx - bx) * t, by + (cy - by) * t)
            hgt = 1.2 + 1.6 * t
            ridges.append(D([p0, p1, (p1[0], p1[1] - hgt), (p0[0], p0[1] - hgt)]))
            furrows.append([(p0[0], p0[1] + .2), (p1[0], p1[1] + .2)])
            npl = max(3, int(math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / (5.5 + 2.5 * (1 - t))))
            sc = .55 + .55 * t
            for k in range(npl):
                u = (k + .5) / npl
                px, py = p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u - hgt
                if crop == 'cabbage':
                    base.append((px + .6 * sc, py + .3, 2.8 * sc, 2.2 * sc))
                    leaf.append((px, py, 2.6 * sc, 2.0 * sc))
                    hi.append((px - .5 * sc, py - .4 * sc, 1.1 * sc, .9 * sc))
                else:
                    base.append((px - 1.1 * sc, py - .3 * sc, 1.4 * sc, 1.1 * sc))
                    base.append((px + 1.1 * sc, py - .3 * sc, 1.4 * sc, 1.1 * sc))
                    leaf.append((px, py - 1.4 * sc, 1.4 * sc, 1.1 * sc))
        rd = ''.join(ridges)
        r.add(f'<path d="{rd}" fill="{P["soil_l"]}"/>')
        r.lines(furrows, .45, color=dark(P['soil'], .35), op=.9)
        if crop == 'cabbage':
            r.dots(base, P['leaf_d'])
            r.dots(leaf, light(P['leaf'], .28), .3, cls='lf')
            r.dots(hi, light(P['leaf_h'], .35))
        else:
            r.dots(base, P['leaf'], cls='lf')
            r.dots(leaf, P['leaf_h'], .25, cls='lh')
        # grass tufts over the front edge
        m = max(1, int(math.hypot(cx - dx, cy - dy) / 6))
        tf = []
        for k in range(m):
            u = (k + r.rng.uniform(.2, .8)) / m
            gx, gy = dx + (cx - dx) * u, dy + (cy - dy) * u + .6
            tf += [[(gx - 1.2, gy), (gx - 1.8, gy - 3)], [(gx, gy), (gx + .2, gy - 3.8)], [(gx + 1.3, gy), (gx + 2.1, gy - 2.8)]]
        r.lines(tf, .5, color=dark(P['g3'], .3))
    else:
        r.add(f'<path d="{dd}" fill="{mix(P["snow"], P["snow_s"], .1)}"/>')
        # the drift piles up along the back fence: a soft blue shade inside the back edge
        r.add(f'<path d="{D([(ax, ay + 1.5), (bx, by + 1.5)], False)}" class="kn" stroke="{P["snow_s"]}" stroke-width="4" opacity=".3"/>')
        r.add(f'<path d="{dd}" class="kn" stroke="{mix(P["ink"], P["snow_s"], .55)}" stroke-width=".55" opacity=".7"/>')
        sh, wh, st = [], [], []
        stalk = mix(P['logs_s'], P['snow_s'], .35)
        for t in row_t:
            p0 = (ax + (dx - ax) * t, ay + (dy - ay) * t)
            p1 = (bx + (cx - bx) * t, by + (cy - by) * t)
            wav = [(p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u + .5 * math.sin(u * 17 + t * 9)) for u in [i / 12 for i in range(13)]]
            sh.append(wav)
            wh.append([(x, y - .9 - .5 * t) for x, y in wav])
            for k in range(int(math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / 24)):
                u = r.rng.uniform(.05, .95)
                sx, sy = p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u - 1
                hh = 2 + 2.4 * t
                st.append([(sx, sy), (sx + r.rng.uniform(-.8, .8), sy - hh)])
        r.lines(sh, 1.3, color=P['snow_s'], op=.45)
        r.lines(wh, .7, color='#ffffff', op=.9)
        r.lines(st, .35, color=stalk, op=.75)


def far_fields(r):
    """Patchwork on the far slope: rows of fields that share their borders (nothing overlaps), borders
    converging slightly toward the middle as they come nearer, a shelter belt of trees along one border."""
    P = r.P
    w = r.winter
    offs = [6, 17, 31, 50]

    def hb(k, x):
        return crest('far2', x) + offs[k] + 1.1 * math.sin(x * .045 + k * 1.7)

    def bx(x, k):  # a border's x on boundary k: fields widen a little toward the viewer
        return x + (x - 180) * .07 * k

    rows = [[-30, 26, 78, 124, 172, 230, 280, 334, 390],
            [-30, 14, 64, 118, 160, 212, 266, 318, 390],
            [-30, 40, 98, 150, 206, 258, 304, 390]]
    crops = ['wheat', 'meadow', 'fallow', 'young', 'stubble', 'sun', 'meadow', 'wheat', 'young', 'fallow', 'stubble', 'meadow', 'wheat', 'sun', 'young', 'fallow', 'wheat', 'meadow', 'stubble', 'young', 'wheat', 'fallow', 'meadow', 'young']
    col = {'wheat': P['straw'], 'meadow': light(P['far2'], .1), 'fallow': P['soil_l'], 'young': light(P['leaf'], .18),
           'stubble': light(P['straw'], .3), 'sun': mix(P['coat4'], P['leaf'], .35)}
    ci = 0
    for k, xs in enumerate(rows):
        for j in range(len(xs) - 1):
            xa, xb2 = xs[j], xs[j + 1]
            n = 10
            top = [(bx(xa + (xb2 - xa) * i / n, k), hb(k, bx(xa + (xb2 - xa) * i / n, k))) for i in range(n + 1)]
            bot = [(bx(xa + (xb2 - xa) * i / n, k + 1), hb(k + 1, bx(xa + (xb2 - xa) * i / n, k + 1))) for i in range(n, -1, -1)]
            crop = crops[ci % len(crops)]
            ci += 1
            if not w:
                fc = col[crop]
                r.add(f'<path d="{Hy.d(top + bot)}" fill="{fc}"/>')
                if crop in ('wheat', 'young', 'stubble', 'fallow'):  # rows along the slope
                    for q in range(1, 6 if k < 2 else 8):
                        u = q / (6 if k < 2 else 8)
                        line = [(top[i][0] + (bot[n - i][0] - top[i][0]) * u, top[i][1] + (bot[n - i][1] - top[i][1]) * u) for i in range(n + 1)]
                        r.line(line, .3, color=dark(fc, .28), op=.55, jitter=False)
                elif crop == 'sun':  # rows down the slope, converging
                    for q in range(1, 9):
                        u = q / 9
                        r.line([(top[0][0] + (top[n][0] - top[0][0]) * u, top[0][1] + (top[n][1] - top[0][1]) * u),
                                (bot[n][0] + (bot[0][0] - bot[n][0]) * u, bot[n][1] + (bot[0][1] - bot[n][1]) * u)], .45, color=dark(fc, .3), op=.6, jitter=False)
            else:
                fc = mix(P['snow'], P['snow_s'], .08 + .1 * ((ci * 7) % 3) / 2)
                r.add(f'<path d="{Hy.d(top + bot)}" fill="{fc}"/>')
                if crop in ('stubble', 'fallow', 'wheat'):  # stubble and furrows show through the snow
                    for q in range(1, 5):
                        u = q / 5
                        line = [(top[i][0] + (bot[n - i][0] - top[i][0]) * u, top[i][1] + (bot[n - i][1] - top[i][1]) * u) for i in range(n + 1)]
                        r.line(line, .4, color=P['snow_s'], op=.55, jitter=False)
    # borders: field edges as fine lines (blue shadow lines under snow), verticals fainter
    bc = P['ink'] if not w else P['snow_s']
    for k in range(1, 3):
        r.line([(x, hb(k, x)) for x in range(-6, W + 7, 6)], .4, color=bc, op=.45 if not w else .8, jitter=not w)
    for k, xs in enumerate(rows):
        for x in xs[1:-1]:
            r.line([(bx(x, k), hb(k, bx(x, k))), (bx(x, k + 1), hb(k + 1, bx(x, k + 1)))], .35, color=bc, op=.4 if not w else .7, jitter=False)
    # a shelter belt (лесополоса) along the second border, with gaps
    for x in list(range(-4, 132, 5)) + list(range(232, 366, 5)):
        if r.rng.random() < .12:
            continue
        y = hb(1, x)
        hh = r.rng.uniform(4.5, 6.5)
        if not w:
            r.blob(x + .8, y - hh * .55 + .6, hh * .62, hh * .55, P['leaf_d'], 0, n=8, ink=False)
            r.blob(x, y - hh * .6, hh * .58, hh * .52, P['forest'], .35, n=8, wob=.12)
            r.blob(x - hh * .2, y - hh * .78, hh * .25, hh * .2, light(P['leaf'], .1), 0, n=6, ink=False)
        else:
            r.blob(x, y - hh * .62, hh * .6, hh * .55, mix(P['logs_s'], P['snow_s'], .55), 0, n=9, wob=.15, op=.45, ink=False)
            r.line([(x, y), (x + .2, y - hh * .9)], .45, color=mix(P['logs_s'], P['ink'], .3), op=.8, jitter=False)
            for a in (-.7, .1, .8):
                r.line([(x, y - hh * .45), (x + math.sin(a) * hh * .5, y - hh * .45 - math.cos(a) * hh * .5)], .3, color=mix(P['logs_s'], P['ink'], .3), op=.65, jitter=False)
    # haystacks on the stubble, cows on a meadow
    haystack(r, 52, hb(2, 52) - 2, .5)
    haystack(r, 312, hb(2, 312) - 1, .45)
    if not w:
        cow(r, 196, hb(1, 196) + 9, .6)
        cow(r, 214, hb(1, 214) + 11, .55)


def scarecrow(r, x, y, s=1.0):
    P = r.P
    r.line([(x, y), (x, y - 24 * s)], 1.0 * s)
    r.line([(x - 9 * s, y - 17 * s), (x + 9 * s, y - 18 * s)], .9 * s)
    r.shape([(x - 5 * s, y - 9 * s), (x + 5 * s, y - 9 * s), (x + 6 * s, y - 19 * s), (x - 6 * s, y - 19 * s)], P['coat2'], .45 * s)
    r.blob(x, y - 21.5 * s, 2.8 * s, 2.8 * s, P['straw'], .4 * s, n=9)
    r.shape([(x - 5 * s, y - 23 * s), (x + 5 * s, y - 23 * s), (x + 2.6 * s, y - 26 * s), (x - 2.6 * s, y - 26 * s)], P['grey_s'], .4 * s)
    if r.winter:
        r.shape([(x - 5.2 * s, y - 23.4 * s), (x + 5.2 * s, y - 23.4 * s), (x + 2.6 * s, y - 26.6 * s), (x - 2.6 * s, y - 26.6 * s)], P['snow'], .3 * s)


def woodpile(r, x, y, s=1.0):
    P = r.P
    for row in range(3):
        for i in range(6 - row):
            r.blob(x + (i + row * .5) * 4.4 * s, y - 2.2 * s - row * 3.8 * s, 2.2 * s, 2.0 * s, light(P['logs'], .2), .4 * s, n=8, wob=.05)
    if r.winter:
        r.blob(x + 11 * s, y - 12.5 * s, 13 * s, 2.2 * s, P['snow'], .35 * s, n=10)


def flowers(r, x0, x1, y0, y1, n):
    P = r.P
    for i in range(n):
        x, y = r.rng.uniform(x0, x1), r.rng.uniform(y0, y1)
        r.line([(x, y), (x + r.rng.uniform(-.8, .8), y - 4)], .45, color=P['leaf_s'], jitter=False)
        r.blob(x, y - 4.4, 1.4, 1.2, [P['white'], P['blue'], P['coat4'], P['lilac']][i % 4], .25, n=7, wob=.04)


def tufts(r, x0, x1, y0, y1, n):
    P = r.P
    for _ in range(n):
        x, y = r.rng.uniform(x0, x1), r.rng.uniform(y0, y1)
        if r.winter:
            r.line([(x - 2, y), (x + 2, y - .3)], .4, color=P['snow_s'], op=.6, jitter=False)
            continue
        for dx, dh in ((-1.5, 3), (0, 3.8), (1.6, 2.8)):
            r.line([(x + dx, y), (x + dx * 1.3, y - dh)], .4, color=dark(P['g3'], .35), op=.7, jitter=False)


def sunflower(r, x, y, h):
    P = r.P
    r.line([(x, y), (x + 1, y - h)], 1.0, color=P['leaf_s'])
    r.blob(x - 3, y - h * .5, 3.4, 1.5, P['leaf'], .3, n=8)
    for i in range(10):
        a = 2 * math.pi * i / 10
        r.blob(x + 1 + math.cos(a) * 3.8, y - h + math.sin(a) * 3.8, 2.1, 1.1, P['coat4'], .25, n=7, wob=.02, rot=a)
    r.blob(x + 1, y - h, 2.5, 2.5, P['soil'], .3, n=8, wob=.03)


def bubble(r, x, y):
    P = r.P
    r.add(f'<path d="M{x - 15} {y - 26} H{x + 15} Q{x + 19} {y - 26} {x + 19} {y - 22} V{y - 10} Q{x + 19} {y - 6} {x + 15} {y - 6} H{x + 4} L{x} {y} L{x - 4} {y - 6} H{x - 15} Q{x - 19} {y - 6} {x - 19} {y - 10} V{y - 22} Q{x - 19} {y - 26} {x - 15} {y - 26} Z" fill="#fffaf0" stroke="{P["accent"]}" stroke-width="1.6"/>')
    r.blob(x - 6, y - 16, 6, 3.6, P['straw'], .5, n=10, wob=.03)
    for i in range(3):
        r.line([(x - 9 + i * 3, y - 18.5), (x - 7.5 + i * 3, y - 14.5)], .45, jitter=False)
    r.add(f'<text x="{x + 8}" y="{y - 12.4}" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="9" fill="{P["accent"]}">8</text>')


def build_spot(r, x, y, w=60, h=16):
    P = r.P
    pts = [(x, y), (x + w, y - 3), (x + w + 6, y + h), (x + 5, y + h + 3)]
    r.add(f'<path d="{Hy.d(pts)}" fill="{P["snow"] if r.winter else light(P["g4"], .2)}" fill-opacity=".6" stroke="{P["ink"]}" stroke-width=".8" stroke-dasharray="3 2.4"/>')
    r.line([(x + 6, y + 6), (x + 6, y - 14)], 1.0)
    r.shape([(x - 1, y - 24), (x + 13, y - 24), (x + 13, y - 12), (x - 1, y - 12)], P['white'], .7)
    r.line([(x + 6, y - 21.5), (x + 6, y - 14.5)], 1.3, color=P['accent'], jitter=False)
    r.line([(x + 2.5, y - 18), (x + 9.5, y - 18)], 1.3, color=P['accent'], jitter=False)


def cart(r, x, y, amount='37 ₽'):
    P = r.P
    r.shadow([(x - 14, y + 1), (x + 20, y), (x + 24, y + 4), (x - 10, y + 5)], .7)
    r.shape([(x - 14, y - 4), (x + 14, y - 4), (x + 12, y - 12), (x - 12, y - 12)], P['logs'], .7)
    r.line([(x + 14, y - 8), (x + 24, y - 14)], 1.1)
    r.shape([(x - 9, y - 12), (x - 9, y - 24), (x + 9, y - 24), (x + 9, y - 12)], P['white'], .7)
    r.add(f'<text x="{x}" y="{y - 15.5}" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="7" fill="{P["ink"]}">{amount}</text>')
    for wx in (x - 8, x + 8):
        r.blob(wx, y - 2, 4.3, 4.3, light(P['logs'], .2), .6, n=10, wob=.02)
        r.line([(wx - 4, y - 2), (wx + 4, y - 2)], .35, jitter=False)
        r.line([(wx, y - 6), (wx, y + 2)], .35, jitter=False)


# ---------------------------------------------------------------- scene
