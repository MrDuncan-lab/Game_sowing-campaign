# A still picture of the whole village with every optional piece on, to check the drawing.
import sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import villageg as G
show = sys.argv[1] if len(sys.argv) > 1 else 'all'
defs = f'<svg width="0" height="0" style="position:absolute"><defs><g id="v-roads">{G.ROADS_SVG}</g></defs></svg>'
lays = ''.join(f'<svg viewBox="0 0 {G.W} {G.BOTTOM}" style="position:absolute;left:0;top:0;width:100%;height:auto">{svg}</svg>' for k, r, svg in G.layers())
css = '.vc{display:none}' if show == 'none' else ''
html = f'''<!doctype html><meta charset="utf-8"><style>body{{margin:0}}.wrap{{position:relative;width:724px;height:{2 * G.BOTTOM}px;overflow:hidden}}{css}
.pop{{transform-box:fill-box}}</style><div class="wrap">{defs}{lays}</div>'''
open(os.path.join(HERE, 'preview.html'), 'w', encoding='utf-8').write(html)
print('ok', len(html), 'roads', len(G.ROADS_SVG), 'pops', len(G.POPS), 'anchors', G.ANCHORS)
