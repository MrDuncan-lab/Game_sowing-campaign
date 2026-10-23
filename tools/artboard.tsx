/** @jsxImportSource preact */
// Renders art components to a static page for visual review: npx tsx tools/artboard.tsx <out.html>
import { renderToString } from 'preact-render-to-string';
import { readFileSync, writeFileSync } from 'node:fs';
import { BOARD } from './artboard-items';
const css = ['src/theme.css'].map(f => { try { return readFileSync(f, 'utf8'); } catch { return ''; } }).join('\n');
const body = BOARD.map(([title, el, w, h, bg]) => `<figure style="width:${w}px"><div class="cell" style="width:${w}px;height:${h}px;background:${bg ?? '#cfe7ad'}">${renderToString(el)}</div><figcaption>${title}</figcaption></figure>`).join('\n');
writeFileSync(process.argv[2] ?? 'artboard.html', `<!doctype html><meta charset="utf-8"><style>
body{margin:0;padding:12px;background:#efe3c4;font:12px sans-serif;display:flex;flex-wrap:wrap;gap:10px;align-items:flex-start}
figure{margin:0}.cell{position:relative;border-radius:8px;overflow:hidden}.cell>svg{width:100%;height:100%;display:block}
figcaption{text-align:center;padding:2px}
${css}</style>${body}`);
