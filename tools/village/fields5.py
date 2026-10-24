# Fields on the far slopes as a patchwork quilt: bands that follow the hill's curve, each cut into plots of a
# different crop. Furrows run along the band (ploughed land, wheat), rows run down the slope (potatoes, beans),
# flowers dot the sunflower and buckwheat plots. Between the bands, a hedge of small round bushes.
from roads5 import rnd

KINDS = {
    #          fill       furrow     style
    'wheat': ('#e8d27c', '#c9ad55', 'furrow'),
    'rye': ('#dcc56f', '#bba04c', 'furrow'),
    'plough': ('#c9a37a', '#a7805a', 'furrow'),
    'green': ('#b9d784', '#8fb95b', 'rows'),
    'potato': ('#a9cf7a', '#7fa953', 'rows'),
    'sun': ('#f0d25a', '#c98f2a', 'dots'),
    'buck': ('#efe4dc', '#d6aebf', 'dots'),
    'meadow': ('#cfe3a2', '#b3cf86', 'none'),
}


def curve(fn, x0, x1, dy, n=10):
    return [(x0 + (x1 - x0) * k / n, fn(x0 + (x1 - x0) * k / n) + dy) for k in range(n + 1)]


def pts(p):
    return ' L'.join(f'{x:.1f} {y:.1f}' for x, y in p)


def plot(fn, xa, xb, ya, yb, kind, seed, skew=0.0):
    """One plot between x in [xa, xb] (the bottom edge shifted by `skew`) and the band from ya to yb below the crest."""
    fill, mark, style = KINDS[kind]
    top = curve(fn, xa, xb, ya)
    bot = curve(fn, xa + skew, xb + skew, yb)
    o = f'<path d="M{pts(top)} L{pts(bot[::-1])} Z" fill="{fill}" stroke="{mark}" stroke-width=".5" stroke-opacity=".6"/>'
    h = yb - ya
    if style == 'furrow':
        for k in range(1, int(h / 2.6)):
            t = k / int(h / 2.6)
            row = [(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t) for a, b in zip(top, bot)]
            o += f'<path d="M{pts(row)}" fill="none" stroke="{mark}" stroke-width=".55" opacity=".75"/>'
    elif style == 'rows':
        n = int((xb - xa) / 4.2)
        for k in range(1, n):
            t = k / n
            a = (xa + (xb - xa) * t, fn(xa + (xb - xa) * t) + ya + .6)
            bx = xa + skew + (xb - xa) * t
            b = (bx, fn(bx) + yb - .6)
            o += f'<path d="M{a[0]:.1f} {a[1]:.1f} L{b[0]:.1f} {b[1]:.1f}" stroke="{mark}" stroke-width=".9" stroke-dasharray="1.6 1.1" opacity=".85"/>'
    elif style == 'dots':
        n = int((xb - xa) * h / 9)
        for k in range(n):
            u, v = rnd(k, seed), rnd(k, seed + 9)
            x = xa + skew * v + (xb - xa) * u
            y = fn(x) + ya + h * (.12 + .76 * v)
            o += f'<circle cx="{x:.1f}" cy="{y:.1f}" r=".75" fill="{mark}" opacity=".9"/>'
    # a sunlit edge along the top of the plot
    o += f'<path d="M{pts(top)}" fill="none" stroke="#fffbe8" stroke-width=".7" opacity=".55"/>'
    return o


def hedge(fn, x0, x1, dy, seed, col='#6f9a4a'):
    o = f'<path d="M{pts(curve(fn, x0, x1, dy, 16))}" fill="none" stroke="{col}" stroke-width="1.1" opacity=".7"/>'
    x = x0 + 2
    k = 0
    while x < x1 - 2:
        r = 1.2 + rnd(k, seed) * 1.3
        o += f'<circle cx="{x:.1f}" cy="{fn(x) + dy - r * .6:.1f}" r="{r:.1f}" fill="{col}" opacity=".9"/>'
        x += 5 + rnd(k, seed + 3) * 9
        k += 1
    return o


def patchwork(fn, bands):
    """bands: [(ya, yb, [(xa, xb, kind), ...], skew), ...] from the far band to the near one."""
    o = ''
    for i, (ya, yb, plots, skew) in enumerate(bands):
        for j, (xa, xb, kind) in enumerate(plots):
            o += plot(fn, xa, xb, ya, yb, kind, i * 17 + j, skew)
    for i, (ya, yb, plots, skew) in enumerate(bands):
        xa, xb = plots[0][0], plots[-1][1]
        o += hedge(fn, xa + skew, xb + skew, yb + .8, i + 21)
    return o
