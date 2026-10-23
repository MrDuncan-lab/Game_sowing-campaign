/** @jsxImportSource preact */
// Animation board: every animated character and effect in one page with the game's CSS, for frame sampling.
// npx tsx --tsconfig tsconfig.tools.json tools/animboard.tsx <out.html>
import { renderToString } from 'preact-render-to-string';
import { readFileSync, writeFileSync } from 'node:fs';
import { ANIM } from './animboard-items';
const css = ['src/fonts.css', 'src/legacy.css', 'src/styles.css', 'src/field-life.css', 'src/style-polish.css', 'src/theme.css'].map((f) => readFileSync(f, 'utf8').replace(/url\('\.\/assets/g, "url('../src/assets")).join('\n');
const body = ANIM.map(([title, el, w, h, bg]) => `<figure style="width:${w}px"><div class="cell" style="width:${w}px;height:${h}px;background:${bg ?? '#9fcf6a'}">${renderToString(el)}</div><figcaption>${title}</figcaption></figure>`).join('\n');
writeFileSync(process.argv[2] ?? 'animboard.html', `<!doctype html><meta charset="utf-8"><style>
${css}
html,body{height:auto;overflow:visible}body{margin:0;padding:10px;background:#efe3c4;font:12px sans-serif;display:flex;flex-wrap:wrap;gap:8px;align-items:flex-start}
figure{margin:0}.cell{position:relative;border-radius:8px;overflow:hidden}.cell>svg{width:100%;height:100%;display:block}
figcaption{text-align:center;padding:2px;font:11px sans-serif;color:#333}
</style>${body}`);
