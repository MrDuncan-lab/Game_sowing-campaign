# The Chernozem village for the game itself. Six hills above the field, drawn from the fourth edition's mockup,
# with what the player asked for since: roads as ribbons of changing width with ruts and verges, a patchwork of
# fields on the far slope, no crows sitting on the council's roof (they circle in the sky when a raid comes).
# Everything that depends on the game is either a class the game switches on (the lab, the gifts, the empty
# lots) or an anchor the game draws at (order bubbles, the payment cart, the kids at the gate, the flock).
import json, math, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import v4art as V
from v4art import A, INK, f1, line, place, text
import roads5
import fields5
import art3

W = 362
VH = 1240                 # the village's full height; every hill runs on to VH + 40 under the field
BOTTOM = VH + 40

HILLS = {
    'A': dict(xs=[-10, 40, 100, 160, 220, 280, 330, 372], ys=[138, 124, 132, 120, 130, 122, 134, 128], c=('#d3e6bc', '#bcd7a2'), rate=0.0),
    'B': dict(xs=[-10, 60, 130, 200, 270, 330, 372], ys=[272, 262, 270, 260, 268, 260, 268], c=('#c6e1a2', '#aed08a'), rate=0.0),
    'C': dict(xs=[-10, 50, 120, 190, 260, 320, 372], ys=[416, 404, 412, 402, 412, 404, 414], c=('#b8db8c', '#9fcd74'), rate=0.0),
    'D': dict(xs=[-10, 70, 150, 230, 300, 372], ys=[566, 556, 564, 554, 562, 556], c=('#aad67a', '#93c862'), rate=0.06),
    'E': dict(xs=[-10, 60, 140, 220, 290, 372], ys=[724, 714, 722, 712, 720, 714], c=('#9fd06c', '#89c158'), rate=0.26),
    'F': dict(xs=[-10, 80, 170, 250, 320, 372], ys=[884, 874, 880, 870, 878, 872], c=('#96ca64', '#80b851'), rate=0.52),
}
ORDER = ['A', 'B', 'C', 'D', 'E', 'F']


def smooth(xs, ys):
    d = f'M{xs[0]} {ys[0]}'
    for i in range(1, len(xs)):
        mx = (xs[i - 1] + xs[i]) / 2
        d += f' C{mx} {ys[i - 1]} {mx} {ys[i]} {xs[i]} {ys[i]}'
    return d


def sample(xs, ys):
    out = []
    for i in range(1, len(xs)):
        x0, y0, x1, y1 = xs[i - 1], ys[i - 1], xs[i], ys[i]
        mx = (x0 + x1) / 2
        for k in range(16):
            t = k / 16
            bx = (1 - t) ** 3 * x0 + 3 * (1 - t) ** 2 * t * mx + 3 * (1 - t) * t ** 2 * mx + t ** 3 * x1
            by = (1 - t) ** 3 * y0 + 3 * (1 - t) ** 2 * t * y0 + 3 * (1 - t) * t ** 2 * y1 + t ** 3 * y1
            out.append((bx, by))
    out.append((xs[-1], ys[-1]))
    return out


SAMPLES = {k: sample(v['xs'], v['ys']) for k, v in HILLS.items()}


def crest_at(key, x):
    s = SAMPLES[key]
    for (ax, ay), (bx, by) in zip(s, s[1:]):
        if ax <= x <= bx:
            return ay + (by - ay) * (x - ax) / max(bx - ax, 1e-6)
    return s[-1][1]


def hill_path(key):
    h = HILLS[key]
    return smooth(h['xs'], h['ys']) + f' L372 {BOTTOM} L-10 {BOTTOM} Z'


# ---------------------------------------------------------------- the roads (village coordinates)
MAIN = ('M181 1290 L181 1240 C181 1214 188 1192 206 1166 C222 1142 220 1116 204 1094 C190 1074 190 1050 200 1026 '
        'C210 1002 214 976 208 950 C202 924 200 904 204 878 C207 856 198 836 194 812 C190 788 192 762 190 732 '
        'C188 710 184 698 182 686 C180 664 180 640 178 616 C176 594 178 574 176 552 C174 530 174 506 172 482 '
        'C170 458 174 436 176 412 C178 394 182 384 186 376')
BRANCHES = [
    'M200 1040 C192 1036 186 1030 172 1022',          # to the porch
    'M206 1110 C232 1100 262 1080 286 1056',          # to the barn
    'M206 1170 C170 1176 120 1176 82 1164',           # to the lab
    'M194 846 C160 850 120 852 92 856',               # the street: to the left yard
    'M196 840 C250 836 310 826 390 812',              # the road out of the village, to the map
    'M182 694 C150 698 112 704 76 712',               # round the square: the bakery
    'M182 694 C214 698 252 704 292 712',              # and the restaurant
    'M174 520 C150 524 124 530 100 538',              # up the far hills: the orphanage
    'M176 512 C204 516 228 522 252 530',              # the izbas
    'M150 372 C126 348 104 312 92 282 C86 266 80 250 74 236',   # past the council to the windmill
]


def road_width(y):
    t = max(0.0, min(1.0, (y - 376) / (BOTTOM - 376)))
    return 4.6 + 21 * t ** 1.3


ROADS_SVG, MAIN_ROAD = roads5.network(MAIN, BRANCHES, road_width)


# ---------------------------------------------------------------- pieces: what stands where
POPS = []
ANCHORS = {}


def fronts(layer, x):
    i = ORDER.index(layer)
    return [(k, crest_at(k, x)) for k in ORDER[i + 1:]]


def pop(layer, key, x, base, h, body, label, k=1.0, cls='', cond=None):
    """A building that stands up (scaleY) once it is out from behind the hill in front and under the sky strip.
    `cond` names a class of the village root that must be on for it to show at all."""
    fr = fronts(layer, x)
    POPS.append((layer, key, x, base, h * k))
    f = ';'.join(f'{kk}:{y:.1f}' for kk, y in fr)
    c = ' '.join(filter(None, ['spot-g', cls, f'vc vc-{cond}' if cond else '']))
    return (f'<g class="{c}" data-k="{key}" role="button" tabindex="-1" aria-label="{label}" transform="translate({f1(x)} {f1(base)})">'
            f'<g class="pop" data-l="{layer}" data-b="{f1(base)}" data-h="{f1(h * k)}" data-f="{f}"><g transform="scale({k})">{body}</g></g></g>')


def anchor(name, layer, x, y):
    ANCHORS[name] = {'l': layer, 'x': round(x, 1), 'y': round(y, 1)}


def deco(x, y, body, k=1.0, cls=''):
    c = f' class="{cls}"' if cls else ''
    return f'<g{c} transform="translate({f1(x)} {f1(y)}) scale({k})">{body}</g>'


def tufts(key, n=16, seed=3):
    h = HILLS[key]
    out = ''
    for i in range(n):
        x = (i * 97 + seed * 31) % 352 + 5
        y = crest_at(key, x) + 12 + (i * 53 + seed * 17) % 90
        col = V.shade(h['c'][1], -.12)
        out += f'<path d="M{x} {y} q1.6 -5 3.2 0 q1.6 -5.6 3.2 0" fill="none" stroke="{col}" stroke-width="1.2" stroke-linecap="round" opacity=".9"/>'
        if i % 4 == 0:
            out += f'<circle cx="{x + 9}" cy="{y - 2}" r="1.3" fill="{["#fffaf0", "#f4c542", "#e0607a"][i % 3]}" opacity=".9"/>'
    return out


def hill(key):
    h = HILLS[key]
    top, foot = h['c']
    d = hill_path(key)
    out = (f'<defs><linearGradient id="hg-{key}" x1="0" x2="0" gradientUnits="userSpaceOnUse" '
           f'y1="{min(h["ys"])}" y2="{min(h["ys"]) + 170}"><stop offset="0" stop-color="{top}" class="hg0"/><stop offset="1" stop-color="{foot}" class="hg1"/></linearGradient>'
           f'<clipPath id="hc-{key}"><path d="{d}"/></clipPath></defs>')
    out += f'<path class="hill" d="{d}" fill="url(#hg-{key})"/>'
    out += f'<path d="{smooth(h["xs"], h["ys"])}" fill="none" stroke="#fffbe8" stroke-opacity=".6" stroke-width="2.4" transform="translate(0 2.2)"/>'
    out += f'<path d="{smooth(h["xs"], h["ys"])}" fill="none" stroke="{INK}" stroke-opacity=".32" stroke-width="1.2"/>'
    out += tufts(key)
    # the one road network, cut by this hill's own outline: where a crest hides it, the hill behind carries on
    out += f'<g clip-path="url(#hc-{key})"><use href="#v-roads"/></g>'
    return out


def with_smoke(svg_an):
    svg, an = svg_an
    if 'smoke' in an:
        x, y = an['smoke']
        svg += V.smoke(x, y, .8)
    return svg


def sunflower(h=20):
    return (line([(0, 0), (0, -h)], '#4f8a3a', 1.4) + f'<path d="M0 {f1(-h * .45)} q-5 -2 -7 -6 q5 0 7 4" fill="#6fae45" stroke="{INK}" stroke-width=".6"/>'
            f'<g transform="translate(0 {f1(-h)})"><g class="nod">' + ''.join(f'<ellipse cx="0" cy="-4" rx="1.6" ry="2.9" fill="#f4c542" stroke="{INK}" stroke-width=".45" transform="rotate({a})"/>' for a in range(0, 360, 40))
            + f'<circle r="2.9" fill="#7c4f2b" stroke="{INK}" stroke-width=".6"/></g></g>')


# ---------------------------------------------------------------- the six hills
def hill_A():
    o = hill('A')
    for i, x in enumerate([2, 11, 20, 29, 38, 120, 132, 324, 333, 342, 351, 360, 369]):
        o += deco(x, crest_at('A', x) + 6, V.fir(18 + (i * 7) % 9, '#5f9a4c' if i % 2 else '#4e8a42', False))
    # the patchwork on the far slope: two bands of plots following the hill
    fn = lambda x: crest_at('A', x)
    o += fields5.patchwork(fn, [
        (16, 34, [(52, 96, 'plough'), (96, 150, 'wheat'), (150, 196, 'green'), (196, 246, 'sun'), (246, 300, 'rye')], 0),
        (37, 60, [(50, 104, 'potato'), (104, 152, 'buck'), (152, 210, 'wheat'), (210, 262, 'plough'), (262, 312, 'green')], -4),
    ])
    o += pop('A', 'mill', 74, 240, 74, V.windmill(), 'Мельница на дальнем холме', .9)
    o += pop('A', 'farhouse', 150, 236, 40, V.izba(wall='#c99c6a', roof='#8a6a4c', porch=False, chim=None)[0], 'Дом на дальнем холме', .6)
    o += pop('A', 'farhouse2', 198, 232, 40, V.izba(wall='#d2a676', roof='#b9563d', porch=False, chim=None)[0], 'Дом на дальнем холме', .56)
    o += pop('A', 'farhouse3', 246, 240, 40, V.izba(wall='#c48a55', roof='#5f7f48', porch=False, chim=None)[0], 'Дом на дальнем холме', .58)
    o += pop('A', 'lot-tower', 306, 246, 26, V.lot(44, 24), 'Участок на вырост', .9)
    anchor('flock', 'A', 290, 182)
    return o


def hill_B():
    o = hill('B')
    o += pop('B', 'council', 186, 394, 90, V.council(True)[0], 'Сельсовет', 1.08)
    anchor('bubble-council', 'B', 214, 394 - 90 * 1.08 - 4)
    o += pop('B', 'college', 312, 398, 74, V.college(False)[0], 'Агроколледж', .98)
    anchor('bubble-college', 'B', 318, 398 - 74 * .98 - 4)
    o += pop('B', 'lot-school', 60, 392, 30, V.lot(50, 26), 'Участок на вырост', 1.0)
    o += deco(116, 398, V.birch(40)) + deco(254, 402, V.birch(36)) + deco(20, 372, V.apple(.9)) + deco(356, 380, V.fir(30))
    o += deco(140, 404, V.bush(7)) + deco(236, 406, V.bush(6, '#5f9a3a', False))
    return o


def hill_C():
    o = hill('C')
    o += deco(16, 470, V.fir(30)) + deco(148, 470, V.birch(40)) + deco(214, 470, V.apple(.95))
    o += pop('C', 'orphanage', 86, 542, 76, with_smoke(V.orphanage()), 'Интернат «Солнышко»', 1.12)
    anchor('bubble-orphanage', 'C', 66, 542 - 76 * 1.12 - 2)
    o += deco(150, 548, V.bush(8))
    o += V.wattle([(214, 540), (226, 522), (364, 522)], 7)
    o += ''.join(f'<g transform="translate({f1(x)} {f1(y)}) scale(.13)">{A["crop:cabbage:2"]}</g>' for x, y in [(292, 522), (304, 524), (316, 522), (292, 532), (304, 534)])
    o += pop('C', 'izba1', 250, 536, 52, with_smoke(V.izba(wall='#c98f58', roof='#7d5a3c', frame='#9fd0ef')), 'Дом соседей', 1.12)
    o += pop('C', 'izba2', 334, 548, 52, with_smoke(V.izba(wall='#d6a16a', roof='#b9563d')), 'Дом соседей', 1.0)
    o += deco(206, 552, V.chickens(3))
    return o


def hill_D():
    o = hill('D')
    o += deco(150, 612, V.apple(1.15)) + deco(222, 606, V.birch(42)) + deco(22, 640, V.birch(44)) + deco(344, 636, V.birch(40)) + deco(362, 660, V.fir(32))
    # the square: a paved oval round the well, its cobbles in rings
    o += '<ellipse cx="182" cy="694" rx="114" ry="25" fill="#bb9c6c"/><ellipse cx="182" cy="694" rx="112" ry="23.6" fill="#e6d2a4"/>'
    o += '<ellipse cx="182" cy="694" rx="70" ry="14" fill="none" stroke="#d6be8c" stroke-width="1" stroke-dasharray="3 2.4"/>'
    o += ''.join(f'<ellipse cx="{x}" cy="{y}" rx="3.4" ry="1.7" fill="#d6be8c"/>' for x, y in [(98, 692), (122, 704), (150, 682), (176, 708), (206, 680), (232, 704), (258, 688), (138, 712), (270, 708), (112, 682)])
    o += pop('D', 'bakery', 58, 714, 82, with_smoke(V.bakery()), 'Пекарня «Колосок»', 1.22)
    anchor('bubble-bakery', 'D', 44, 714 - 82 * 1.22 + 2)
    o += pop('D', 'restaurant', 312, 712, 78, V.restaurant(False)[0], 'Ресторан «Печь»', 1.2)
    anchor('bubble-restaurant', 'D', 318, 712 - 78 * 1.2 - 2)
    o += pop('D', 'board', 128, 692, 44, V.notice_board(), 'Доска объявлений: заказы деревни', 1.22)
    o += pop('D', 'well', 184, 698, 42, V.well(), 'Колодец', 1.28)
    o += pop('D', 'palych', 236, 698, 34, V.palych_bench(), 'Палыч на лавке', 1.25)
    o += pop('D', 'fair', 250, 722, 34, V.fair_stall('#3f6fb0', '#fff6e6', ('tomato', 'carrot', 'onion', 'bean')), 'Рынок', 1.15)
    # a woman with a basket crosses the square and back
    o += f'<g class="stroll"><g class="stroll-face">{V.person("#d0503c", "#3f6fb0", "#d0503c", "basket")}</g></g>'
    return o


def hill_E():
    o = hill('E')
    o += deco(24, 782, V.birch(46)) + deco(222, 768, V.apple(1.1)) + deco(346, 772, V.birch(44)) + deco(300, 760, V.bush(9))
    o += V.wattle([(14, 860), (22, 836), (134, 836), (140, 860)], 8)
    o += (line([(104, 840), (104, 812)], '#8f5d34', 1.2) + line([(136, 842), (136, 814)], '#8f5d34', 1.2)
          + f'<path d="M104 815 Q120 821 136 817" fill="none" stroke="{INK}" stroke-width=".6"/>'
          + ''.join(f'<rect class="wash" style="animation-delay:{-i * .5}s" x="{x}" y="816.5" width="6.4" height="{h}" fill="{c}" stroke="{INK}" stroke-width=".5"/>' for i, (x, h, c) in enumerate([(108, 9, '#f6f1e6'), (116, 7, '#d0503c'), (124, 10, '#3f6fb0')])))
    o += pop('E', 'izba3', 62, 860, 60, with_smoke(V.izba(wall='#c98f58', roof='#5f7f48', frame='#fffaf0')), 'Дом соседей', 1.38)
    o += deco(124, 868, V.chickens(3), 1.2)
    o += pop('E', 'lot', 146, 790, 30, V.lot(50, 28), 'Участок на вырост', 1.25)
    o += pop('E', 'hay', 270, 794, 30, V.haystack(), 'Стог', 1.35)
    o += pop('E', 'signpost', 324, 852, 44, V.signpost((('Кубань', 1), ('Алтай', 1))), 'Указатель: карта ферм', 1.2)
    return o


def hill_F():
    o = hill('F')
    o += ''.join(deco(x, crest_at('F', x) + 26, V.birch(48 + (i % 3) * 5)) for i, x in enumerate([28, 88, 288, 340]))
    o += deco(150, 930, V.bush(10)) + deco(250, 934, V.bush(9, '#5f9a3a', False)) + deco(30, 1062, V.woodpile(), 1.35)
    house, han = V.izba(w=52, d=34, h=30, rh=22, wall='#c98f58', roof='#8a5a3c', frame='#fffaf0')
    shed = (V.poly([(30, 0), V.dep((30, 0), 20), V.dep((30, -18), 20), (30, -18)], V.shade('#b27947', -.2))
            + f'<rect x="26" y="-18" width="14" height="18" fill="#b27947" stroke="{INK}" stroke-width="1"/>'
            + V.poly([(24, -18), (42, -18), V.dep((42, -18), 20), V.dep((24, -18), 20)], '#6e5a48'))
    house += V.smoke(*han['smoke'], .8) if 'smoke' in han else ''
    o += pop('F', 'meteo', 346, 976, 44, V.meteo(), 'Метеостанция', 1.35, cond='meteo')
    o += pop('F', 'house', 116, 1052, 84, house + shed + V.place(V.flowers(6, 30), -12, 5), 'Ваша усадьба', 1.75)
    o += pop('F', 'barn', 294, 1046, 74, V.barn()[0], 'Амбар', 1.6)
    o += deco(336, 1082, V.chickens(3), 1.3)
    o += pop('F', 'lab', 64, 1158, 66, V.lab()[0], 'Лаборатория', 1.45, cond='lab')
    o += pop('F', 'lot-lab', 64, 1150, 30, V.lot(46, 24), 'Место под лабораторию', 1.3, cond='nolab')
    o += pop('F', 'hives', 298, 1118, 18, V.hives(), 'Пасека', 1.5, cond='hives')
    # the neighbours' gifts in the front yard: each stands once the neighbour is a friend
    o += pop('F', 'g-orphanage', 142, 1196, 32, V.swing(), 'Качели: подарок интерната', 1.45, cond='g-orphanage')
    o += pop('F', 'g-bakery', 336, 1158, 24, V.oven(), 'Печь во дворе: подарок пекарни', 1.5, cond='g-bakery')
    o += pop('F', 'g-council', 242, 1112, 60, art3.honor_board(), 'Доска почёта: подарок сельсовета', .58, cond='g-council')
    o += pop('F', 'g-restaurant', 152, 1130, 56, art3.gazebo(), 'Беседка с самоваром: подарок ресторана', .56, cond='g-restaurant')
    o += pop('F', 'g-college', 296, 1194, 46, art3.desk(), 'Учебный стол: подарок колледжа', .56, cond='g-college')
    o += deco(104, 1204, V.flowers(5, 26, 2), 1.3) + deco(214, 1132, V.flowers(4, 20, 3), 1.1)
    # the fence with the gate down to the field; sunflowers along it; a bush the kids hide in
    o += V.picket(-6, 160, 1216, 7, 13) + V.picket(202, 368, 1216, 7, 13)
    o += (f'<g transform="translate(160 1216)">{line([(0, 0), (0, -16)], INK, 3)}{line([(42, 0), (42, -16)], INK, 3)}'
          f'<path d="M1 -2 L-12 -6 V-15 L1 -12 Z M41 -2 L54 -6 V-15 L41 -12 Z" fill="#e4bb82" stroke="{INK}" stroke-width=".8" stroke-linejoin="round"/></g>')
    o += pop('F', 'gate', 181, 1218, 18, '<rect x="-22" y="-18" width="44" height="20" fill="#fff" fill-opacity="0"/>', 'Калитка: вниз, к полю', 1.0, 'gate')
    o += deco(236, 1214, V.bush(11, '#5f9a3a', False))
    anchor('kids', 'F', 236, 1210)
    o += ''.join(deco(x, 1216, sunflower(22 + (x % 3) * 3)) for x in (14, 50, 116, 262, 352))
    return o


def sky_layer():
    o = ('<defs><linearGradient id="v4-sky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#a6d9f1" class="sk0"/>'
         '<stop offset=".25" stop-color="#cdeaf3" class="sk1"/><stop offset=".6" stop-color="#e8f4e6" class="sk2"/><stop offset="1" stop-color="#eef6e0" class="sk3"/></linearGradient></defs>'
         f'<rect width="{W}" height="{BOTTOM}" fill="url(#v4-sky)"/>')
    o += f'<path d="{smooth([-10, 50, 110, 170, 230, 290, 340, 372], [112, 96, 104, 88, 100, 86, 98, 92])} L372 300 L-10 300 Z" fill="#c4dccb" class="ridge0"/>'
    o += f'<path d="{smooth([-10, 70, 150, 230, 300, 372], [124, 112, 120, 108, 118, 112])} L372 300 L-10 300 Z" fill="#b6d4bd" opacity=".9" class="ridge1"/>'
    o += ''.join(f'<g transform="translate({x} {y})" opacity=".5">{V.fir(12 + (x * 7) % 6, "#8fb79b", False)}</g>' for x, y in [(30, 118), (44, 117), (58, 119), (210, 114), (224, 113), (238, 115), (318, 116), (332, 115)])
    # clouds float to and fro; birds wheel in slow circles (nothing slides off and jumps back)
    o += ''.join(f'<g class="drift" style="animation-delay:{-i * 9}s;animation-duration:{38 + i * 7}s">{cloud(x, y, k)}</g>' for i, (x, y, k) in enumerate([(70, 62, .5), (240, 48, .42), (320, 82, .34), (150, 92, .3)]))
    o += ''.join(f'<g transform="translate({x} {y})"><g class="wheel-bird" style="animation-delay:{-i * 2.1}s;animation-duration:{9 + i * 2}s">'
                 f'<path d="M-6 0 q3 -3 6 0 q3 -3 6 0" fill="none" stroke="{INK}" stroke-width=".9" opacity=".6"/></g></g>' for i, (x, y) in enumerate([(116, 66), (138, 58), (282, 70)]))
    return o


def cloud(cx, cy, k):
    parts = [('c', -20, 2, 13), ('c', 0, -7, 17), ('c', 19, 1, 13), ('r', -32, 4, 64, 15)]
    s = ''
    for p in parts:
        if p[0] == 'c':
            s += f'<circle cx="{p[1]}" cy="{p[2]}" r="{p[3]}" fill="#ffffff"/>'
        else:
            s += f'<rect x="{p[1]}" y="{p[2]}" width="{p[3]}" height="{p[4]}" rx="7.5" fill="#ffffff"/>'
    return f'<g transform="translate({cx} {cy}) scale({k})" opacity=".9">{s}</g>'


def layers():
    return [('sky', 0.0, sky_layer()), ('A', HILLS['A']['rate'], hill_A()), ('B', HILLS['B']['rate'], hill_B()),
            ('C', HILLS['C']['rate'], hill_C()), ('D', HILLS['D']['rate'], hill_D()), ('E', HILLS['E']['rate'], hill_E()),
            ('F', HILLS['F']['rate'], hill_F())]


def cart_path():
    """The cart's way, from the council down to the gate, as points with the length run so far."""
    pts = roads5.sample(MAIN, 3)[::-1]
    # from the council (the far end of the main road) to just above the gate
    pts = [p for p in pts if p[1] <= 1214]
    out, run = [], 0.0
    for i, p in enumerate(pts):
        if i:
            run += math.dist(p, pts[i - 1])
        out += [round(p[0], 1), round(p[1], 1), round(run, 1)]
    return out


def crests():
    return {k: [[round(x, 1), round(y, 1)] for x, y in SAMPLES[k][::4]] for k in ORDER}
