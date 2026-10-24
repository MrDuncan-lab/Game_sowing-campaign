# Drawing helpers for the second edition: the field as a scene (sky = forecast), threats as things in
# the world, the five-card fan, and the village. Built from the game's own SVG fragments (art.json,
# art2.json) plus simple ink shapes in the same style: dark-brown outline, flat fill, paper.
import json, os, math
HERE = os.path.dirname(os.path.abspath(__file__))
ART = os.path.join(HERE, 'artgen')
A = json.load(open(os.path.join(ART, 'art.json')))
A.update(json.load(open(os.path.join(ART, 'art2.json'))))

INK = '#3f2a1d'
RED = '#c23a2c'
AMBER = '#d9822b'
GREEN = '#4f9a32'
BLUE = '#2c86b8'
FONT = "Alegreya Sans, 'Segoe UI', sans-serif"


def g_icon(name, x, y, s, op=1):
    k = s / 48
    o = f' opacity="{op}"' if op != 1 else ''
    return f'<g transform="translate({x - s / 2:.1f} {y - s / 2:.1f}) scale({k:.4f})"{o}>{A["icon:" + name]}</g>'


def icon(name, size=24, cls=''):
    return (f'<svg class="ic{(" " + cls) if cls else ""}" viewBox="0 0 48 48" width="{size}" height="{size}" '
            f'aria-hidden="true">{A["icon:" + name]}</svg>')


def place(frag, x, y, k=1.0, rot=0, op=1, flip=False):
    sx = -k if flip else k
    r = f' rotate({rot})' if rot else ''
    o = f' opacity="{op}"' if op != 1 else ''
    return f'<g transform="translate({x:.1f} {y:.1f}){r} scale({sx:.3f} {k:.3f})"{o}>{frag}</g>'


def text(x, y, s, size=12, fill=INK, weight=800, anchor='middle', extra=''):
    return (f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="{FONT}" font-size="{size}" '
            f'font-weight="{weight}" fill="{fill}"{extra}>{s}</text>')


# ---------------- weather shapes ----------------
CLOUD_PARTS = [('c', -20, 2, 13), ('c', 0, -7, 17), ('c', 19, 1, 13), ('r', -32, 4, 64, 15)]


def cloud(cx, cy, k=1.0, fill='#ffffff', sw=2.2, op=1):
    def shapes(stroke):
        out = ''
        for p in CLOUD_PARTS:
            if p[0] == 'c':
                _, x, y, r = p
                out += f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}"{stroke}/>'
            else:
                _, x, y, w, h = p
                out += f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="7.5" fill="{fill}"{stroke}/>'
        return out
    o = f' opacity="{op}"' if op != 1 else ''
    return (f'<g transform="translate({cx} {cy}) scale({k})"{o}>'
            f'{shapes(f" stroke=\"{INK}\" stroke-width=\"{sw * 2 / k:.2f}\"")}{shapes("")}</g>')


def hail_cloud(cx, cy, k=1.0, pellets=True, streaks=0):
    out = cloud(cx, cy, k, '#8c98a8')
    out += f'<g transform="translate({cx} {cy}) scale({k})">'
    out += '<path d="M-14 -4 q6 -6 12 0 M4 -10 q6 -6 12 0" stroke="#dfe6ee" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/>'
    if pellets:
        for i, (px, py) in enumerate([(-18, 28), (-6, 36), (6, 27), (16, 37), (-12, 46), (10, 48)]):
            out += f'<circle cx="{px}" cy="{py}" r="3.1" fill="#f2f8ff" stroke="#5f7f99" stroke-width="1.4"/>'
    out += '</g>'
    return out


def snow_cloud(cx, cy, k=1.0):
    out = cloud(cx, cy, k, '#dfeaf3')
    out += f'<g transform="translate({cx} {cy}) scale({k})" stroke="#6fa6cf" stroke-width="1.8" stroke-linecap="round">'
    for px, py in [(-16, 30), (2, 36), (18, 29), (-6, 46), (12, 47)]:
        out += f'<path d="M{px} {py - 4.5} V{py + 4.5} M{px - 4} {py - 2.3} L{px + 4} {py + 2.3} M{px - 4} {py + 2.3} L{px + 4} {py - 2.3}"/>'
    return out + '</g>'


def rain_cloud(cx, cy, k=1.0):
    out = cloud(cx, cy, k, '#b9c7d4')
    out += f'<g transform="translate({cx} {cy}) scale({k})" stroke="#3f97d0" stroke-width="2.4" stroke-linecap="round">'
    for px in (-18, -6, 6, 18):
        out += f'<path d="M{px} 26 l-4 11"/><path d="M{px + 5} 42 l-3 8" opacity=".7"/>'
    return out + '</g>'


def sun(cx, cy, r=14, hot=False, op=1):
    col = '#f6a03a' if hot else '#ffd25a'
    ray = '#d9822b' if hot else '#e1a52b'
    rays = ''.join(
        f'<path d="M{cx + math.cos(a) * (r + 4):.1f} {cy + math.sin(a) * (r + 4):.1f} L{cx + math.cos(a) * (r + 10):.1f} {cy + math.sin(a) * (r + 10):.1f}" '
        f'stroke="{ray}" stroke-width="3" stroke-linecap="round"/>' for a in [i * math.pi / 4 for i in range(8)])
    o = f' opacity="{op}"' if op != 1 else ''
    return f'<g{o}>{rays}<circle cx="{cx}" cy="{cy}" r="{r}" fill="{col}" stroke="{INK}" stroke-width="2.2"/></g>'


def heat(cx, cy, w=30, n=3, col='#e0823a'):
    out = ''
    for i in range(n):
        y = cy + i * 7
        out += (f'<path d="M{cx - w / 2} {y} q{w / 8} -5 {w / 4} 0 t{w / 4} 0 t{w / 4} 0 t{w / 4} 0" fill="none" '
                f'stroke="{col}" stroke-width="2.2" stroke-linecap="round" opacity="{0.9 - i * 0.2:.2f}"/>')
    return out


def swarm(cx, cy, k=1.0, n=26, seed=3):
    out = f'<g transform="translate({cx} {cy}) scale({k})">'
    out += '<ellipse rx="34" ry="14" fill="#5b5a3a" opacity=".18"/>'
    for i in range(n):
        a = math.sin(i * 12.9898 + seed) * 43758.5453
        b = math.sin(i * 78.233 + seed) * 12345.678
        x = (a - math.floor(a) - .5) * 64
        y = (b - math.floor(b) - .5) * 22
        out += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="1.9" fill="#4a4a2a"/>'
    out += '</g>'
    return out


def chip(x, y, label, fill='#fffaf0', col=INK, r=10):
    return (f'<g transform="translate({x} {y})"><circle r="{r}" fill="{fill}" stroke="{col}" stroke-width="1.8"/>'
            f'{text(0, r * 0.45, label, r * 1.25, col)}</g>')


def temp_tag(x, y, t):
    return (f'<g transform="translate({x} {y})"><rect x="-17" y="-9" width="34" height="18" rx="6" fill="#fff8ea" '
            f'stroke="{INK}" stroke-width="1.6"/>{text(0, 4.5, t, 12.5)}</g>')


def sparkles(cx, cy, s=1.0):
    out = ''
    for dx, dy, k in [(-26, -18, 1.0), (24, -24, .8), (30, 10, .7), (-30, 14, .6)]:
        x, y, r = cx + dx * s, cy + dy * s, 7 * k * s
        out += (f'<path d="M{x} {y - r} Q{x + r * .22} {y - r * .22} {x + r} {y} Q{x + r * .22} {y + r * .22} {x} {y + r} '
                f'Q{x - r * .22} {y + r * .22} {x - r} {y} Q{x - r * .22} {y - r * .22} {x} {y - r} Z" fill="#ffd84a" '
                f'stroke="{INK}" stroke-width="1.2"/>')
    return out


def trail(d, op=.75):
    return (f'<path d="{d}" fill="none" stroke="#5a3a24" stroke-width="4" stroke-linecap="round" '
            f'stroke-dasharray="0.1 10" opacity="{op}"/>')


def cart(x, y, amount='62', ok=True):
    bag = '#cfe7ad' if ok else '#f6c9bf'
    bagst = GREEN if ok else RED
    return (f'<g transform="translate({x} {y})">'
            f'<path d="M-24 -12 H22 L18 0 H-20 Z" fill="#b27947" stroke="{INK}" stroke-width="2" stroke-linejoin="round"/>'
            f'<path d="M22 -10 L36 -18" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>'
            f'<path d="M-10 -12 C-16 -26 -6 -36 2 -36 C10 -36 18 -26 12 -12 Z" fill="{bag}" stroke="{INK}" stroke-width="2" stroke-linejoin="round"/>'
            f'<path d="M-4 -35 Q1 -40 6 -35" fill="none" stroke="{INK}" stroke-width="2"/>'
            f'{text(1, -18, amount, 12, bagst)}'
            f'<circle cx="-12" cy="2" r="7" fill="#d9a466" stroke="{INK}" stroke-width="2"/><circle cx="-12" cy="2" r="2" fill="{INK}"/>'
            f'<circle cx="12" cy="2" r="7" fill="#d9a466" stroke="{INK}" stroke-width="2"/><circle cx="12" cy="2" r="2" fill="{INK}"/>'
            f'</g>')


def fence(x0, x1, y, step=26, col='#dcaa6e'):
    out = f'<path d="M{x0} {y - 6} H{x1}" stroke="#b27947" stroke-width="4"/>'
    x = x0 + 4
    while x < x1:
        out += f'<path d="M{x} {y + 6} V{y - 12} l3 -4 l3 4 V{y + 6} Z" fill="{col}" stroke="{INK}" stroke-width="1.6" stroke-linejoin="round"/>'
        x += step
    return out


def round_tree(x, y, k=1.0, c1='#7fbf55', c2='#5f9a3a'):
    return (f'<g transform="translate({x} {y}) scale({k})"><path d="M-3 0 V-18 M3 0 V-18" stroke="{INK}" stroke-width="2"/>'
            f'<rect x="-3" y="-20" width="6" height="20" fill="#8f5d34" stroke="{INK}" stroke-width="1.6"/>'
            f'<circle cx="0" cy="-34" r="20" fill="{c1}" stroke="{INK}" stroke-width="2"/>'
            f'<circle cx="-8" cy="-38" r="7" fill="{c2}" opacity=".45"/></g>')


# ---------------- the field as a scene ----------------
PAD, CELL = 22, 100
SKY = 132          # sky band with the horizon
ROAD_Y = 146       # middle of the road
TOP = 176          # first row of tiles
FW = PAD * 2 + 5 * CELL
FH = TOP + 5 * CELL + PAD
POTATO = [(1, 1), (2, 1), (1, 2)]
HAIL = POTATO + [(2, 2)]   # hail strikes a 3×3 zone around (1, 1): the potato and one bean bed
LAYOUT = {
    (1, 1): ('potato', 1, 2, 2), (2, 1): ('potato', 1, 2, 2), (3, 1): ('radish', 2, 3, 3),
    (1, 2): ('potato', 1, 2, 2), (2, 2): ('bean', 1, 0, 2), (3, 2): ('bean', 1, 1, 2),
    (1, 3): ('wheat', 1, 2, 3), (2, 3): ('wheat', 1, 2, 3), (3, 3): ('wheat', 1, 3, 3),
}
# where each week sits on the sky band: x, y and scale (nearer = bigger)
SLOTS = {0: (176, 54, 1.25), 1: (318, 70, .82), 2: (404, 80, .62), 3: (470, 88, .48)}


def tile_xy(x, y):
    return PAD + x * CELL, TOP + y * CELL


def sky_band(night=False):
    out = (f'<defs><linearGradient id="sky-g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#bfe4f6"/>'
           f'<stop offset="1" stop-color="#eef7e0"/></linearGradient>'
           f'<linearGradient id="fog-g" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#f7f2e6" stop-opacity="0"/>'
           f'<stop offset=".5" stop-color="#f7f2e6" stop-opacity=".9"/><stop offset="1" stop-color="#f4efe2" stop-opacity="1"/></linearGradient></defs>')
    out += f'<rect x="0" y="0" width="{FW}" height="{TOP}" fill="url(#sky-g)"/>'
    out += f'<path d="M0 112 Q80 92 170 106 Q260 88 350 104 Q440 92 544 102 V140 H0 Z" fill="#b9dd8a"/>'
    out += f'<path d="M0 124 Q120 112 260 122 Q400 110 544 120 V176 H0 Z" fill="#9fd166"/>'
    out += '<g fill="#c7a17a" stroke="#3f2a1d" stroke-width="1" opacity=".5"><path d="M486 100 h10 v-6 l5 -5 l5 5 v6 h8 v4 h-28 Z"/><path d="M516 99 h8 v-9 l4 -5 l4 5 v9 h-16 Z"/></g>'
    # the road along the top of the field
    out += f'<path d="M0 {ROAD_Y - 8} Q272 {ROAD_Y - 14} {FW} {ROAD_Y - 8} V{ROAD_Y + 10} Q272 {ROAD_Y + 4} 0 {ROAD_Y + 10} Z" fill="#e2c79a"/>'
    out += f'<path d="M0 {ROAD_Y} Q272 {ROAD_Y - 6} {FW} {ROAD_Y}" stroke="#c9a77a" stroke-width="1.6" stroke-dasharray="2 10" fill="none"/>'
    out += fence(PAD, FW - PAD, TOP - 6)
    return out


def weather_tokens():
    s = {}
    x, y, k = SLOTS[0]
    s[0] = hail_cloud(x, y, k) + temp_tag(x + 46, y - 26, '+20°')
    x, y, k = SLOTS[1]
    s[1] = sun(x, y, 14 * k + 4) + temp_tag(x, y + 30, '+21°') + chip(x - 30, y + 30, '1')
    x, y, k = SLOTS[2]
    s[2] = sun(x, y, 11) + heat(x, y + 22, 22, 2, '#e9a23b') + temp_tag(x, y + 42, '+24°') + chip(x - 28, y + 42, '2')
    x, y, k = SLOTS[3]
    s[3] = sun(x, y, 9, hot=True) + temp_tag(x, y + 34, '+27°') + chip(x - 26, y + 34, '3')
    return s


def fog():
    return (f'<rect x="440" y="0" width="{FW - 440}" height="{TOP - 30}" fill="url(#fog-g)"/>'
            f'<path d="M470 40 q14 -6 28 0 t28 0 M478 62 q14 -6 28 0 t28 0 M466 84 q14 -6 28 0 t28 0" stroke="#e2d9c6" stroke-width="3" fill="none" stroke-linecap="round"/>'
            f'{g_icon("sensor", 520, 42, 26, .45)}')


def hail_shadow(tiles):
    out = ''
    for (x, y) in tiles:
        tx, ty = tile_xy(x, y)
        out += f'<g transform="translate({tx} {ty})"><rect x="4" y="6" width="92" height="88" rx="12" fill="#26354a" fill-opacity=".36"/>'
        for px, py in [(22, 30), (48, 22), (72, 34), (30, 60), (62, 66), (80, 56), (44, 82)]:
            out += f'<circle cx="{px}" cy="{py}" r="3.4" fill="#f2f8ff" stroke="#5f7f99" stroke-width="1.4"/>'
        out += '</g>'
    return out


def hail_streaks(x0, y0, tiles):
    out = ''
    for i, (x, y) in enumerate(tiles):
        tx, ty = tile_xy(x, y)
        for j in range(3):
            sx = x0 - 30 + i * 22 + j * 9
            out += (f'<path d="M{sx} {y0 + 30} L{tx + 22 + j * 26} {ty + 14}" stroke="#7d8fa3" stroke-width="2" '
                    f'stroke-dasharray="7 9" opacity=".55" stroke-linecap="round"/>')
    return out


def field_tiles(layout, empty_override=None):
    parts = []
    owned = {(x, y) for x in (1, 2, 3) for y in (1, 2, 3)}
    for y in range(5):
        for x in range(5):
            tx, ty = tile_xy(x, y)
            if (x, y) in owned:
                crop, stage, m, s = layout.get((x, y), (None, 0, 2, 2))
                if empty_override and (x, y) in empty_override:
                    crop = None
                body = A[f'bed:{m}:{s}'] + (A[f'crop:{crop}:{stage}'] if crop else '')
                parts.append(f'<g transform="translate({tx} {ty})">{body}</g>')
            else:
                near = any((x + dx, y + dy) in owned for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
                cell = A[f'meadow:{x}:{y}']
                if near:
                    cell += ('<rect x="8" y="10" width="84" height="80" rx="12" fill="#fff" fill-opacity=".1" '
                             'stroke="#fff" stroke-opacity=".45" stroke-width="2.5" stroke-dasharray="7 6"/>')
                parts.append(f'<g transform="translate({tx} {ty})">{cell}</g>')
    return ''.join(parts)


def scene(night=False, cls='', label='Поле-сцена'):
    tok = weather_tokens()
    parts = [f'<rect x="0" y="0" width="{FW}" height="{FH}" rx="18" fill="url(#grass-tex)"/>', sky_band()]
    parts.append(f'<g class="tok tok-3">{tok[3]}</g><g class="tok tok-2">{tok[2]}</g><g class="tok tok-1">{tok[1]}</g>')
    parts.append(f'<g class="tok tok-fog">{fog()}</g>')
    # the road: farmer, beetles walking to the potato, the payment cart
    parts.append(place(A['farmer'], 44, ROAD_Y + 14, .6))
    parts.append(f'<g class="tok tok-pay">{cart(470, ROAD_Y + 4)}</g>')
    beetles = ''.join(place(A['beetle'], 318 + dx, ROAD_Y + 2 + dy, 1.5, rot=-150) for dx, dy in [(0, 0), (14, 6), (26, -2)])
    t0x, t0y = tile_xy(1, 1)
    parts.append(f'<g class="tok tok-1b">{trail(f"M306 {ROAD_Y + 8} Q250 {TOP + 4} {t0x + 70} {t0y + 34}")}{beetles}</g>')
    parts.append(f'<rect x="0" y="{TOP - 2}" width="{FW}" height="{FH - TOP + 2}" fill="none"/>')
    parts.append(field_tiles(LAYOUT))
    # this week: the hail cloud right over the potato, its shadow on the beds
    x, y, k = SLOTS[0]
    parts.append(f'<g class="tok tok-0">{hail_streaks(x, y, HAIL)}{hail_shadow(HAIL)}{tok[0]}</g>')
    # crows on the young wheat (they hold sprouts back a week), sparkles: the radish ripens tonight
    rx, ry = tile_xy(3, 1)
    wx, wy = tile_xy(3, 3)
    parts.append(f'<g class="tok tok-crow">{place(A["crow"], wx + 54, wy + 40, 1.25)}</g>')
    parts.append(f'<g class="tok tok-ripe">{sparkles(rx + 50, ry + 52, 1.1)}</g>')
    # highlight rings shown when a token is tapped
    def ring(tiles):
        out = ''
        for (x2, y2) in tiles:
            tx, ty = tile_xy(x2, y2)
            out += f'<rect x="{tx + 2}" y="{ty + 4}" width="96" height="92" rx="14" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="10 7"/>'
        return out
    hl = ring(POTATO)
    parts.append(f'<g class="hl hl-0">{ring(HAIL)}</g><g class="hl hl-5">{ring([(3, 3)])}</g><g class="hl hl-1">{hl}<path d="M306 {ROAD_Y + 8} Q250 {TOP + 4} {t0x + 70} {t0y + 34}" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".55"/></g>')
    parts.append(f'<g class="hl hl-3"><circle cx="470" cy="{ROAD_Y - 10}" r="40" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="10 7"/></g>')
    parts.append(f'<g class="hl hl-2"><circle cx="{SLOTS[2][0]}" cy="{SLOTS[2][1]}" r="30" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="10 7"/></g>')
    if night:
        parts.append(f'<rect x="0" y="0" width="{FW}" height="{FH}" rx="18" fill="#1d2a52" opacity=".52"/>')
        parts.append(f'<circle cx="80" cy="44" r="18" fill="#fff6d2" stroke="{INK}" stroke-width="2"/><circle cx="88" cy="38" r="16" fill="#3a4670"/>')
        for sx, sy in [(140, 30), (260, 22), (360, 40), (430, 18), (500, 52), (210, 70)]:
            parts.append(f'<circle cx="{sx}" cy="{sy}" r="1.8" fill="#fff6d2"/>')
        # what the night brings: floating numbers over the beds
        px, py = tile_xy(1, 1)
        parts.append(loss_tag(px + 100, py + 60, '−17', RED, 'hail'))
        parts.append(loss_tag(rx + 50, ry + 6, '+4', GREEN, crop='radish'))
        bx, by = tile_xy(2, 2)
        parts.append(loss_tag(bx + 50, by + 58, '+1 нед.', AMBER, 'drop', w=104))
        parts.append(loss_tag(wx + 50, wy + 58, '+1 нед.', AMBER, 'crow', w=104))
    return (f'<svg class="scene-svg{(" " + cls) if cls else ""}" viewBox="0 0 {FW} {FH}" role="img" aria-label="{label}">'
            f'{"".join(parts)}</svg>')


def loss_tag(x, y, label, col, ic=None, crop=None, w=76):
    pic = (f'<g transform="translate({-w / 2 + 6} -16) scale(.32)">{A["crop:" + crop + ":2"]}</g>' if crop else g_icon(ic, -w / 2 + 20, 0, 26))
    return (f'<g transform="translate({x} {y})"><rect x="{-w / 2}" y="-20" width="{w}" height="40" rx="12" fill="#fff8ea" stroke="{col}" stroke-width="3.2"/>'
            f'{pic}{text(w / 2 - 22 - (6 if len(label) > 3 else 0), 8, label, 21 if len(label) <= 3 else 17, col)}</g>')


# ---------------- threat grammar vignettes ----------------
VW, VH = 160, 132


def vbase(fogged=False):
    out = (f'<rect width="{VW}" height="{VH}" fill="url(#vg-sky)"/>'
           f'<path d="M0 40 Q40 32 80 38 Q120 30 160 36 V60 H0 Z" fill="#b9dd8a"/>'
           f'<rect y="50" width="{VW}" height="{VH - 50}" fill="url(#grass-tex)"/>'
           f'<path d="M0 52 Q80 48 160 52 V64 Q80 60 0 64 Z" fill="#e2c79a"/>'
           f'{fence(4, 156, 74, 22)}')
    if fogged:
        out += f'<rect x="112" y="0" width="48" height="60" fill="url(#vg-fog)"/>'
    return out


def vbed(crop='potato', stage=2, m=2, s=2, extra=''):
    return f'<g transform="translate(48 70) scale(.6)">{A[f"bed:{m}:{s}"]}{A[f"crop:{crop}:{stage}"] if crop else ""}{extra}</g>'


def vchip(n):
    return chip(150, 12, n, r=8)


def vignette(kind, state):
    o = ''
    if kind == 'hail':
        if state == 'far':
            o = vbase(True) + hail_cloud(132, 22, .38) + vchip('2') + vbed()
        elif state == 'near':
            o = vbase() + hail_cloud(110, 22, .55) + vchip('1') + vbed()
        elif state == 'now':
            o = vbase() + hail_cloud(78, 16, .62, pellets=False) + vbed(extra='<rect x="4" y="6" width="92" height="88" rx="12" fill="#26354a" fill-opacity=".36"/>' + ''.join(f'<circle cx="{a}" cy="{b}" r="4" fill="#f2f8ff" stroke="#5f7f99" stroke-width="1.6"/>' for a, b in [(22, 30), (52, 22), (74, 40), (34, 62), (64, 70)]))
            o += ''.join(f'<path d="M{60 + i * 12} 34 L{58 + i * 12} 62" stroke="#7d8fa3" stroke-width="2" stroke-dasharray="5 6" opacity=".7"/>' for i in range(4))
        else:
            o = vbase() + hail_cloud(78, 16, .62, pellets=False) + vbed(extra=A['scene:shelter']) + ''.join(f'<path d="M{a} {b} q4 -8 8 -2" fill="none" stroke="#5f7f99" stroke-width="1.6"/><circle cx="{a}" cy="{b}" r="2.6" fill="#f2f8ff" stroke="#5f7f99" stroke-width="1.2"/>' for a, b in [(52, 68), (90, 66), (106, 74)])
    elif kind == 'beetle':
        if state == 'far':
            o = vbase(True) + vchip('2') + vbed() + ''.join(place(A['beetle'], 138 + d, 56, .9, rot=-160) for d in (0, 9))
        elif state == 'near':
            o = vbase() + vchip('1') + vbed() + trail('M110 60 Q96 72 86 92', .8) + ''.join(place(A['beetle'], 112 + d, 57 + d / 3, 1.3, rot=-150) for d in (0, 12))
        elif state == 'now':
            o = vbase() + vbed() + ''.join(place(A['beetle'], x, y, 1.4, rot=r) for x, y, r in [(70, 92, 20), (90, 104, -40), (78, 114, 70)])
        else:
            o = vbase() + vbed() + f'<g transform="translate(104 82) scale(.46)">{A["bed:2:2"]}{A["crop:garlic:2"]}</g>' + place(A['beetle'], 132, 62, 1.1, rot=40, op=.7)
    elif kind == 'crows':
        if state == 'far':
            o = vbase(True) + vchip('2') + vbed('radish') + ''.join(place(A['crow:fly'], x, y, .32) for x, y in [(128, 18), (140, 26), (118, 28)])
        elif state == 'near':
            o = vbase() + vchip('1') + vbed('radish') + ''.join(place(A['crow'], x, 66, .55) for x in (112, 136))
        elif state == 'now':
            o = vbase() + vbed('wheat', 1) + place(A['crow'], 84, 104, .85)
        else:
            o = vbase() + vbed('wheat', 1) + place(A['scarecrow'], 112, 122, .62) + ''.join(place(A['crow:fly'], x, y, .3) for x, y in [(128, 22), (142, 14)])
    elif kind == 'frost':
        rime = '<rect x="4" y="6" width="92" height="88" rx="12" fill="#d8ecfb" fill-opacity=".62"/>' + ''.join(f'<path d="M{a} {b - 6} V{b + 6} M{a - 5} {b - 3} L{a + 5} {b + 3} M{a - 5} {b + 3} L{a + 5} {b - 3}" stroke="#7fb4dc" stroke-width="2" stroke-linecap="round"/>' for a, b in [(20, 24), (78, 30), (26, 74), (80, 76)])
        if state == 'far':
            o = vbase(True) + snow_cloud(132, 20, .38) + vchip('2') + vbed('tomato', 1)
        elif state == 'near':
            o = vbase() + snow_cloud(108, 20, .55) + vchip('1') + vbed('tomato', 1) + ''.join(f'<path d="M{x} 62 h7" stroke="#fff" stroke-width="3" stroke-linecap="round"/>' for x in range(8, 156, 22))
        elif state == 'now':
            o = vbase() + snow_cloud(80, 16, .6) + vbed('tomato', 1, extra=rime)
        else:
            o = vbase() + snow_cloud(80, 16, .6) + vbed('tomato', 1, extra=A['scene:shelter'])
    elif kind == 'drought':
        if state == 'far':
            o = vbase(True) + sun(136, 30, 8, hot=True) + vchip('2') + vbed('bean', 1)
        elif state == 'near':
            o = vbase() + sun(112, 22, 11, hot=True) + heat(112, 44, 26, 2) + vchip('1') + vbed('bean', 1, m=1)
        elif state == 'now':
            o = vbase() + sun(80, 18, 13, hot=True) + heat(126, 96, 24, 3) + vbed('bean', 1, m=0, s=1)
        else:
            o = vbase() + sun(80, 18, 13, hot=True) + f'<g transform="translate(48 70) scale(.6)">{A["bed:mulch"]}{A["crop:bean:1"]}{A["scene:drip"]}</g>'
    elif kind == 'locust':
        if state == 'far':
            o = vbase(True) + swarm(130, 26, .45) + vchip('2') + vbed('wheat', 2)
        elif state == 'near':
            o = vbase() + swarm(108, 28, .7) + vchip('1') + vbed('wheat', 2)
        elif state == 'now':
            o = vbase() + vbed('wheat', 2) + ''.join(place(A['hopper'], x, y, 1.5, flip=f) for x, y, f in [(66, 90, False), (92, 104, True), (78, 116, False)])
        else:
            o = vbase() + vbed('wheat', 2) + place(A['drone'], 84, 44, .42) + ''.join(f'<circle cx="{a}" cy="{b}" r="1.6" fill="#9fd3ff"/>' for a, b in [(76, 70), (84, 74), (92, 70), (80, 80), (90, 82)])
    elif kind == 'thieves':
        if state == 'far':
            o = vbase(True) + vbed('pumpkin', 2) + f'<rect x="0" y="0" width="{VW}" height="{VH}" fill="#f7f2e6" opacity=".6"/>' + text(80, 30, 'заранее', 14, '#86694d', 700) + text(80, 47, 'не видно', 14, '#86694d', 700)
        elif state == 'near':
            o = vbase() + vchip('1') + vbed('pumpkin', 2) + '<g transform="translate(118 46)"><circle cx="10" cy="14" r="16" fill="#5f9a3a" stroke="#3f2a1d" stroke-width="1.6"/><circle cx="26" cy="16" r="13" fill="#6aa843" stroke="#3f2a1d" stroke-width="1.6"/></g>' + place(A['kidspeek'], 112, 50, .6)
        elif state == 'now':
            o = vbase() + vbed('pumpkin', 2, extra=A['scene:footprints']) + place(A['kid:sack'], 128, 120, .55)
        else:
            o = vbase() + vbed('pumpkin', 2) + place(A['dog:bark'], 126, 118, .42)
    return f'<svg class="vg" viewBox="0 0 {VW} {VH}" aria-hidden="true">{o}</svg>'


def vunseen(kind):
    w = VW * 2 + 8
    o = (f'<rect width="{w}" height="{VH}" fill="url(#vg-sky)"/>'
         f'<path d="M0 40 Q80 30 164 38 Q250 30 {w} 36 V60 H0 Z" fill="#b9dd8a"/>'
         f'<rect y="50" width="{w}" height="{VH - 50}" fill="url(#grass-tex)"/>'
         f'<path d="M0 52 Q164 47 {w} 52 V64 Q164 59 0 64 Z" fill="#e2c79a"/>{fence(4, w - 4, 74, 22)}')
    if kind == 'crows':
        o += f'<g transform="translate(134 70) scale(.6)">{A["bed:2:2"]}{A["crop:wheat:1"]}</g>'
        lines, hint = ('прилетают без предупреждения', 'видно утром своей недели'), ''
    else:
        o += f'<g transform="translate(134 70) scale(.6)">{A["bed:2:2"]}{A["crop:pumpkin:2"]}</g>'
        lines, hint = ('приходят без предупреждения', 'только если сосед обижен'), f'<g transform="translate(262 4) scale(.4)">{vhouse(12, 118, shut=True, smoke=False)}</g>'
    o += f'<rect width="{w}" height="{VH}" fill="#f7f2e6" opacity=".62"/>' + hint
    cx = w / 2 if kind == 'crows' else 128
    o += text(cx, 28, lines[0], 15, '#6d523b', 800) + text(cx, 46, lines[1], 13, '#86694d', 700)
    return f'<svg class="vg" viewBox="0 0 {w} {VH}" aria-hidden="true">{o}</svg>'


def vgrad_defs():
    return ('<svg class="defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>'
            f'{A["grasspattern"]}'
            '<linearGradient id="vg-sky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#bfe4f6"/><stop offset="1" stop-color="#eef7e0"/></linearGradient>'
            '<linearGradient id="vg-fog" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#f7f2e6" stop-opacity="0"/><stop offset=".6" stop-color="#f7f2e6" stop-opacity=".95"/><stop offset="1" stop-color="#f7f2e6"/></linearGradient>'
            '</defs></svg>')


# ---------------- the five-card fan ----------------
SHAPES = {
    'radish': [(0, 0)], 'potato': [(0, 0), (1, 0), (0, 1)], 'wheat': [(0, 0), (1, 0), (2, 0)],
    'bean': [(0, 0), (1, 0)], 'cabbage': [(1, 0), (0, 1), (2, 1), (1, 2)],
    'water': [(1, 0), (0, 1), (1, 1), (2, 1), (1, 2)], 'shelter': [(0, 0), (1, 0), (0, 1), (1, 1)],
    'mulch': [(1, 0), (0, 1), (1, 1), (2, 1), (1, 2)],
}


def glyph(cells, cell=6, col='#3e7a2a'):
    w = (max(c[0] for c in cells) + 1) * cell
    h = (max(c[1] for c in cells) + 1) * cell
    rects = ''.join(f'<rect x="{x * cell + .6}" y="{y * cell + .6}" width="{cell - 1.2}" height="{cell - 1.2}" rx="1.2" fill="{col}" stroke="#3f2a1d" stroke-width=".8"/>' for x, y in cells)
    return f'<svg class="glyph" viewBox="0 0 {w} {h}" width="{w}" height="{h}" aria-hidden="true">{rects}</svg>'


def card(kind, name, days, art, shape, big, unit, money=None, sel=False, i=0):
    seed = kind == 'seed'
    pic = (f'<svg viewBox="-4 -6 108 108" width="__S__" height="__S__" aria-hidden="true">{A["crop:" + art + ":2"]}</svg>' if seed
           else f'<svg viewBox="0 0 48 48" width="__S__" height="__S__" aria-hidden="true">{A["icon:" + art]}</svg>')
    gl = glyph(SHAPES[shape], 6, '#3e7a2a' if seed else '#c8742c')
    money_html = f'<i class="fc-money">{money}</i>' if money else ''
    return (f'<div class="fc {"seed" if seed else "work"}{" sel" if sel else ""}" style="--i:{i};--y:{abs(i) * 8}px;z-index:{10 + i}">'
            f'<b class="fc-name">{name}</b>'
            f'<span class="fc-idx"><i class="fc-days">{days}</i>{pic.replace("__S__", "26")}{gl}</span>'
            f'<span class="fc-art">{pic.replace("__S__", "56")}</span>'
            f'<span class="fc-big"><b>{big}</b><small>{unit}</small></span>{money_html}</div>')


FAN5 = [
    ('seed', 'Редис', 1, 'radish', 'radish', '4', 'ед.', '2 ₽'),
    ('seed', 'Картофель', 2, 'potato', 'potato', '30', 'ед.', '12 ₽'),
    ('seed', 'Пшеница', 2, 'wheat', 'wheat', '42', 'ед.', '15 ₽'),
    ('work', 'Полив', 1, 'water', 'water', '+2', 'влаги', None),
    ('work', 'Укрытие', 1, 'shelter', 'shelter', '3 нед.', 'от града', '2 ₽'),
]


def fan(selected=1):
    cards = ''.join(card(k, n, d, a, sh, b, u, m, sel=(idx == selected), i=idx - 2) for idx, (k, n, d, a, sh, b, u, m) in enumerate(FAN5))
    return f'<div class="fan" aria-label="Рука: пять карт веером">{cards}</div>'


# ---------------- the village ----------------
import re as _re
BARN = _re.sub(r'<g transform="translate\(118 112\)">.*?</text></g>', '', A['barn'])
VWID, VHEI = 1200, 660


def vhouse(x, ground, w=112, h=70, roof='#b9563d', wall='#d9a466', lit=True, shut=False, faded=False,
           smoke=True, emblem=None, flag=False, garland=False):
    y0 = ground - h
    out = f'<g{" opacity=\".5\" filter=\"url(#v-gray)\"" if faded else ""}>'
    out += f'<rect x="{x}" y="{y0}" width="{w}" height="{h}" fill="{wall}" stroke="{INK}" stroke-width="2.4"/>'
    for i in range(1, 5):
        yy = y0 + i * h / 5
        out += f'<path d="M{x + 2} {yy:.1f} H{x + w - 2}" stroke="#a8723f" stroke-width="1.3" opacity=".6"/>'
    out += f'<rect x="{x + w * .7:.0f}" y="{y0 - 44}" width="13" height="30" fill="#a9493a" stroke="{INK}" stroke-width="2"/>'
    out += f'<path d="M{x - 12} {y0 + 3} L{x + w / 2} {y0 - 48} L{x + w + 12} {y0 + 3} Z" fill="{roof}" stroke="{INK}" stroke-width="2.4" stroke-linejoin="round"/>'
    out += f'<path d="M{x - 4} {y0 - 3} L{x + w / 2} {y0 - 42} L{x + w + 4} {y0 - 3}" fill="none" stroke="#fff" stroke-width="1.6" opacity=".35"/>'
    if smoke and not shut:
        cx = x + w * .7 + 6
        out += ''.join(f'<circle cx="{cx + dx}" cy="{y0 - 52 - k * 13}" r="{5 + k * 2}" fill="#efe9dc" stroke="#b9a98a" stroke-width="1.2" opacity="{.9 - k * .25:.2f}"/>' for k, dx in enumerate((0, 6, 2)))
    for wx in (x + 14, x + w - 38):
        fill = '#ffe08a' if lit and not shut else '#64707c'
        out += f'<rect x="{wx}" y="{y0 + 16}" width="24" height="22" fill="{fill}" stroke="{INK}" stroke-width="2"/>'
        out += f'<path d="M{wx + 12} {y0 + 16} V{y0 + 38} M{wx} {y0 + 27} H{wx + 24}" stroke="{INK}" stroke-width="1.5"/>'
        if shut:
            out += (f'<rect x="{wx - 1}" y="{y0 + 15}" width="13" height="24" fill="#7c4f2b" stroke="{INK}" stroke-width="1.6"/>'
                    f'<rect x="{wx + 12}" y="{y0 + 15}" width="13" height="24" fill="#7c4f2b" stroke="{INK}" stroke-width="1.6"/>'
                    f'<path d="M{wx + 2} {y0 + 22} h8 M{wx + 15} {y0 + 22} h8 M{wx + 2} {y0 + 31} h8 M{wx + 15} {y0 + 31} h8" stroke="#5a3a20" stroke-width="1.2"/>')
    out += f'<rect x="{x + w / 2 - 11}" y="{ground - 34}" width="22" height="34" fill="#7c4f2b" stroke="{INK}" stroke-width="2"/><circle cx="{x + w / 2 + 6}" cy="{ground - 17}" r="1.8" fill="{INK}"/>'
    if emblem:
        out += f'<g transform="translate({x + w / 2 - 15} {y0 - 30})"><svg width="30" height="30" viewBox="0 0 48 48">{emblem}</svg></g>'
    if garland:
        out += f'<path d="M{x - 6} {y0 + 2} Q{x + w / 2} {y0 + 18} {x + w + 6} {y0 + 2}" fill="none" stroke="{INK}" stroke-width="1.2"/>'
        for k in range(9):
            t = (k + .5) / 9
            gx = x - 6 + (w + 12) * t
            gy = y0 + 2 + 16 * (1 - (2 * t - 1) ** 2)
            col = ['#d0503c', '#f4c542', '#3f6fb0', '#5dad3c'][k % 4]
            out += f'<path d="M{gx - 4:.1f} {gy:.1f} L{gx + 4:.1f} {gy:.1f} L{gx:.1f} {gy + 7:.1f} Z" fill="{col}" stroke="{INK}" stroke-width=".8"/>'
    if flag:
        fx = x + w / 2
        out += f'<path d="M{fx} {y0 - 48} V{y0 - 86}" stroke="{INK}" stroke-width="2.2"/><path d="M{fx} {y0 - 86} L{fx + 26} {y0 - 80} L{fx} {y0 - 72} Z" fill="#d0503c" stroke="{INK}" stroke-width="1.6"/>'
    return out + '</g>'


def bubble(x, y, inner, w=58, h=36, col=INK):
    return (f'<g transform="translate({x} {y})"><path d="M{-w / 2} {-h} H{w / 2} Q{w / 2 + 6} {-h} {w / 2 + 6} {-h + 6} V-6 Q{w / 2 + 6} 0 {w / 2} 0 H6 L0 10 L-6 0 H{-w / 2} Q{-w / 2 - 6} 0 {-w / 2 - 6} -6 V{-h + 6} Q{-w / 2 - 6} {-h} {-w / 2} {-h} Z" '
            f'fill="#fffaf0" stroke="{col}" stroke-width="2.2" stroke-linejoin="round"/>{inner}</g>')


def plaque(x, y, label, w=None, ic=None):
    w = w or (len(label) * 10 + (34 if ic else 22))
    icon_svg = g_icon(ic, -w / 2 + 17, -1, 22) if ic else ''
    tx = 9 if ic else 0
    return (f'<g transform="translate({x} {y})"><path d="M0 4 V34" stroke="{INK}" stroke-width="4"/><path d="M0 4 V34" stroke="#b27947" stroke-width="2"/>'
            f'<rect x="{-w / 2}" y="-16" width="{w}" height="30" rx="5" fill="#d9a466" stroke="{INK}" stroke-width="2.2"/>'
            f'<rect x="{-w / 2 + 3}" y="-13" width="{w - 6}" height="24" rx="3" fill="none" stroke="#fff3d6" stroke-width="1" opacity=".6"/>'
            f'{icon_svg}<text x="{tx}" y="5" text-anchor="middle" font-family="Old Standard TT, Georgia, serif" font-size="16" font-weight="700" fill="{INK}">{label}</text></g>')


def ghost(kind, x, ground, need):
    st = 'fill="none" stroke="#7a6a55" stroke-width="2" stroke-dasharray="6 5" stroke-linejoin="round"'
    if kind == 'mill':
        d = (f'<path d="M{x - 18} {ground} L{x - 12} {ground - 70} H{x + 12} L{x + 18} {ground} Z" {st}/>'
             f'<path d="M{x - 14} {ground - 70} L{x} {ground - 86} L{x + 14} {ground - 70}" {st}/>'
             + ''.join(f'<path d="M{x} {ground - 72} l{dx} {dy}" {st}/>' for dx, dy in [(-34, -34), (34, -34), (-34, 30), (34, 30)]))
    elif kind == 'tower':
        d = (f'<path d="M{x - 12} {ground} L{x - 8} {ground - 70} H{x + 8} L{x + 12} {ground} Z" {st}/>'
             f'<path d="M{x - 26} {ground - 70} H{x + 26} V{ground - 98} H{x - 26} Z" {st}/><path d="M{x - 30} {ground - 98} L{x} {ground - 116} L{x + 30} {ground - 98}" {st}/>')
    else:
        d = (f'<path d="M{x - 60} {ground} V{ground - 54} H{x + 60} V{ground} Z" {st}/>'
             f'<path d="M{x - 66} {ground - 54} L{x} {ground - 88} L{x + 66} {ground - 54}" {st}/>'
             f'<circle cx="{x}" cy="{ground - 66}" r="9" {st}/>'
             + ''.join(f'<path d="M{x + dx} {ground} V{ground - 46}" {st}/>' for dx in (-40, -20, 20, 40)))
    return (f'<g class="ghost">{d}<g transform="translate({x} {ground - 128 if kind == "tower" else ground - 112})">'
            f'<rect x="-26" y="-12" width="52" height="22" rx="11" fill="#fff8e1" stroke="#c8931f" stroke-width="1.8"/>'
            f'{g_icon("star", -13, -1, 15)}{text(8, 4, need, 13, "#7a5810")}</g></g>')


def well(x, ground):
    return (f'<g transform="translate({x} {ground})">'
            f'<path d="M-24 0 V-20 Q0 -28 24 -20 V0 Q0 8 -24 0 Z" fill="#a7a29a" stroke="{INK}" stroke-width="2.2"/>'
            f'<path d="M-24 -20 Q0 -12 24 -20" fill="none" stroke="{INK}" stroke-width="1.6"/>'
            + ''.join(f'<path d="M{a} -6 h10 M{a + 4} -14 h10" stroke="#7c776f" stroke-width="1.4"/>' for a in (-18, 0))
            + f'<path d="M-20 -22 V-62 M20 -22 V-62" stroke="{INK}" stroke-width="4.4"/><path d="M-20 -22 V-62 M20 -22 V-62" stroke="#b27947" stroke-width="2.4"/>'
            f'<path d="M-30 -58 L0 -80 L30 -58 Z" fill="#9a6438" stroke="{INK}" stroke-width="2.2" stroke-linejoin="round"/>'
            f'<path d="M-16 -48 H16" stroke="{INK}" stroke-width="3"/><path d="M4 -48 V-36" stroke="{INK}" stroke-width="1.4"/>'
            f'<path d="M-2 -36 h12 l-2 9 h-8 Z" fill="#8f5d34" stroke="{INK}" stroke-width="1.6"/></g>')


def stall(x, ground, c1, c2):
    stripes = ''.join(f'<path d="M{x - 40 + k * 16} {ground - 70} h16 l-2 16 h-16 Z" fill="{c1 if k % 2 == 0 else c2}" stroke="{INK}" stroke-width="1.4"/>' for k in range(5))
    goods = ''.join(f'<g transform="translate({x - 30 + k * 20} {ground - 44}) scale(.2)">{A["crop:" + c + ":2"]}</g>' for k, c in enumerate(('pumpkin', 'cabbage', 'radish', 'potato')))
    return (f'<g><path d="M{x - 38} {ground} V{ground - 70} M{x + 38} {ground} V{ground - 70}" stroke="{INK}" stroke-width="4"/>'
            f'<path d="M{x - 38} {ground} V{ground - 70} M{x + 38} {ground} V{ground - 70}" stroke="#b27947" stroke-width="2"/>'
            f'<rect x="{x - 44}" y="{ground - 28}" width="88" height="28" fill="#d9a466" stroke="{INK}" stroke-width="2.2"/>'
            f'{goods}{stripes}</g>')


def bench_palych(x, ground):
    return (f'<g><path d="M{x - 34} {ground - 16} H{x + 34} M{x - 30} {ground - 16} V{ground} M{x + 30} {ground - 16} V{ground}" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>'
            f'<path d="M{x - 34} {ground - 16} H{x + 34}" stroke="#b27947" stroke-width="3" stroke-linecap="round"/>'
            f'<defs><clipPath id="pal-clip"><circle cx="{x}" cy="{ground - 52}" r="25"/></clipPath></defs>'
            f'<circle cx="{x}" cy="{ground - 52}" r="29" fill="#c8931f" stroke="{INK}" stroke-width="2.4"/>'
            f'<image href="img/p_palych.webp" x="{x - 25}" y="{ground - 77}" width="50" height="50" clip-path="url(#pal-clip)" preserveAspectRatio="xMidYMin slice"/>'
            f'<circle cx="{x}" cy="{ground - 52}" r="25" fill="none" stroke="{INK}" stroke-width="1.6"/>'
            f'{bubble(x + 40, ground - 74, text(0, -12, "?", 22, "#c23a2c"), 26, 32)}</g>')


def notice_board(x, ground):
    return (f'<g><path d="M{x - 34} {ground} V{ground - 92} M{x + 34} {ground} V{ground - 92}" stroke="{INK}" stroke-width="5"/>'
            f'<path d="M{x - 34} {ground} V{ground - 92} M{x + 34} {ground} V{ground - 92}" stroke="#b27947" stroke-width="3"/>'
            f'<rect x="{x - 44}" y="{ground - 100}" width="88" height="62" rx="4" fill="#9a6438" stroke="{INK}" stroke-width="2.2"/>'
            f'<rect x="{x - 38}" y="{ground - 94}" width="76" height="46" fill="#f4ead2" stroke="{INK}" stroke-width="1.4"/>'
            f'<defs><clipPath id="poster-clip"><rect x="{x - 36}" y="{ground - 92}" width="72" height="42"/></clipPath></defs>'
            f'<image href="img/boss_droughtyear.webp" x="{x - 36}" y="{ground - 92}" width="72" height="42" clip-path="url(#poster-clip)" preserveAspectRatio="xMidYMid slice"/>'
            f'<path d="M{x - 50} {ground - 100} L{x} {ground - 118} L{x + 50} {ground - 100}" fill="#7c4f2b" stroke="{INK}" stroke-width="2.2" stroke-linejoin="round"/></g>')


def signpost(x, ground):
    def arm(y, label, need, flip=False):
        d = 1 if not flip else -1
        x0 = x + 4 * d
        return (f'<path d="M{x0} {y - 12} H{x0 + 92 * d} L{x0 + 104 * d} {y} L{x0 + 92 * d} {y + 12} H{x0} Z" fill="#d9a466" stroke="{INK}" stroke-width="2"/>'
                f'{text(x0 + 40 * d, y + 5, label, 14, INK, 700)}{g_icon("lock", x0 + 80 * d, y - 1, 14)}'
                f'<g transform="translate({x0 + 46 * d} {y + 26})"><rect x="-22" y="-10" width="44" height="18" rx="9" fill="#fff8e1" stroke="#c8931f" stroke-width="1.6"/>{g_icon("star", -11, -1, 12)}{text(7, 4, need, 11.5, "#7a5810")}</g>')
    return (f'<g><path d="M{x} {ground} V{ground - 118}" stroke="{INK}" stroke-width="6"/><path d="M{x} {ground} V{ground - 118}" stroke="#b27947" stroke-width="3.4"/>'
            f'{arm(ground - 102, "Кубань", "40", True)}{arm(ground - 54, "Алтай", "120", True)}</g>')


def big_field(x, y, rows, n=6):
    out = ''
    for r, crop in enumerate(rows):
        yy = y + r * 40
        out += f'<rect x="{x + r * 10}" y="{yy}" width="{n * 37 + 8}" height="34" rx="9" fill="#8f5d34" stroke="{INK}" stroke-width="2"/>'
        out += ''.join(f'<g transform="translate({x + r * 10 + 4 + k * 37} {yy - 10}) scale(.38)">{A["crop:" + crop + ":2"]}</g>' for k in range(n))
    return out


def village():
    p = []
    p.append('<defs><linearGradient id="v-sky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#bfe4f6"/><stop offset="1" stop-color="#f1f7e2"/></linearGradient>'
             '<filter id="v-gray"><feColorMatrix type="saturate" values=".1"/></filter></defs>')
    p.append(f'<rect width="{VWID}" height="{VHEI}" fill="url(#v-sky)"/>')
    p.append(sun(1110, 66, 22))
    p.append(cloud(210, 70, 1.1) + cloud(650, 52, .9) + cloud(900, 92, .7))
    p.append('<path d="M0 300 Q140 252 300 282 Q470 236 640 276 Q820 244 980 270 Q1100 252 1200 266 V360 H0 Z" fill="#c4e29a"/>')
    p.append('<path d="M0 330 Q200 300 420 322 Q640 296 860 318 Q1040 302 1200 314 V620 H0 Z" fill="#a9d474"/>')
    p.append(f'<rect y="430" width="{VWID}" height="{VHEI - 430}" fill="url(#grass-tex)"/>')
    # growth: what the village gets as your glory grows
    p.append(ghost('mill', 452, 328, '250') + ghost('tower', 668, 330, '450') + ghost('club', 900, 330, '750'))
    # the road
    p.append('<path d="M0 452 Q600 440 1200 452 V488 Q600 476 0 488 Z" fill="#e2c79a"/>')
    p.append('<path d="M0 470 Q600 458 1200 470" stroke="#c9a77a" stroke-width="2" stroke-dasharray="3 12" fill="none"/>')
    # your yard: the house and the kitchen garden (Огород)
    p.append(f'<svg x="22" y="250" width="236" height="172" viewBox="-12 -8 224 162" overflow="visible">{A["house:2"]}</svg>')
    p.append(place(A['pet:cat'].replace('<svg', '<svg x="-24" y="-24" width="48" height="48"', 1), 150, 420, .9))
    beds = ''
    for gy in range(3):
        for gx in range(3):
            crop = [['radish', 'carrot', 'onion'], ['potato', 'cabbage', 'bean'], ['potato', 'wheat', 'pumpkin']][gy][gx]
            beds += f'<g transform="translate({120 + gx * 40} {500 + gy * 38}) scale(.38)">{A["bed:2:2"]}{A["crop:" + crop + ":2"]}</g>'
    p.append(f'<rect x="110" y="494" width="134" height="124" rx="8" fill="#93c65a" stroke="#5f9a3a" stroke-width="2"/>{beds}')
    p.append(fence(104, 252, 500, 16))
    p.append(plaque(64, 520, 'Огород', 108, 'water'))
    # the square: well, Palych on his bench, the notice board with the year's trial, the fair
    p.append(well(318, 590))
    p.append(bench_palych(412, 596))
    p.append(notice_board(520, 600))
    p.append(stall(624, 598, '#d0503c', '#fff6e6') + stall(718, 598, '#3e7a2a', '#fff6e6'))
    p.append(plaque(671, 512, 'Ярмарка', 104))
    # neighbours along the road: the farm's organisations, each with its state
    orgs = [('orphanage', 300, '#e9b44c', 'order'), ('council', 438, '#d0503c', 'friend'), ('bakery', 576, '#c4982f', 'ok'),
            ('restaurant', 714, '#8a3a2a', 'cold'), ('college', 852, '#3f6fb0', 'new')]
    for oid, ox, roof, st in orgs:
        em = A['emblem:' + oid].split('>', 1)[1].rsplit('</svg>', 1)[0]
        p.append(vhouse(ox, 440, 108, 66, roof=roof, lit=st != 'cold', shut=st == 'cold', faded=st == 'new',
                        smoke=st in ('ok', 'friend', 'order'), emblem=em, flag=st == 'friend', garland=st == 'friend'))
        if st == 'order':
            inner = f'<g transform="translate(-24 -36) scale(.3)">{A["crop:radish:2"]}</g>' + text(14, -12, '6', 17, INK)
            p.append(bubble(ox + 54, 316, inner, 50, 34))
        if st == 'new':
            p.append(bubble(ox + 54, 318, text(0, -11, '?', 20, '#86694d'), 26, 32))
    # Хозяйство: beyond the fence, the big fields and the barn
    p.append(big_field(866, 530, ['wheat', 'sunflower', 'potato']))
    p.append(f'<g transform="translate(1108 560) scale(.52)">{BARN}</g>')
    p.append(place(A['scarecrow'], 846, 652, .72))
    p.append(plaque(846, 520, 'Хозяйство', 134, 'tractor'))
    p.append(signpost(1172, 452))
    p.append(place(A['farmer'], 280, 600, .7))
    p.append(round_tree(276, 440, .9) + round_tree(980, 440, .8, '#8cc95a') + place(A['est:birch'], 18, 448, 1.1))
    return f'<svg class="village-svg" viewBox="0 176 {VWID} {VHEI - 176}" role="img" aria-label="Деревня: двор с огородом, соседи, площадь и хозяйство за околицей">{"".join(p)}</svg>'
