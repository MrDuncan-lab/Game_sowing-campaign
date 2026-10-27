# Still pictures of the whole village, summer and winter, with every optional piece on, to check the drawing.
#   python3 preview.py [none]   -> preview-summer.html, preview-winter.html ('none' hides the optional pieces)
import sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import villageg as G

show = sys.argv[1] if len(sys.argv) > 1 else 'all'
for season in G.SEASONS:
    lays = G.layers(season)
    defs = f'<svg width="0" height="0" style="position:absolute"><defs>{G.defs(season)}<g id="v-roads">{G.roads_svg(season)}</g></defs></svg>'
    svgs = ''.join(f'<div class="v-lay" data-k="{k}"><svg viewBox="0 0 {G.W} {G.BOTTOM}" style="position:absolute;left:0;top:0;width:100%;height:auto">{svg}</svg></div>' for k, r, svg in lays)
    css = '.vc{display:none}' if show == 'none' else ''
    sn = 'season-3' if season == 'winter' else 'season-1'
    html = (f'<!doctype html><meta charset="utf-8"><style>body{{margin:0}}.wrap{{position:relative;width:724px;height:{2 * G.BOTTOM}px;overflow:hidden}}{css}'
            f'{G.STYLE}.village text{{font-family:system-ui,sans-serif}}.smoke .pf{{fill:#f1ece2;stroke:#b9a98a;stroke-width:1;opacity:.85}}.pop{{transform-box:fill-box}}</style>'
            f'<div class="wrap village {sn}">{defs}{svgs}</div>')
    p = os.path.join(HERE, f'preview-{season}.html')
    open(p, 'w', encoding='utf-8').write(html)
    print(season, len(html), 'pops', len(G.POPS), 'anchors', len(G.ANCHORS))
