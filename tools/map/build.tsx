/** @jsxImportSource preact */
// Writes the map page for the renderer: npx tsx --tsconfig tsconfig.tools.json tools/map/build.tsx <out-dir> <fonts-dir>
import { renderToString } from 'preact-render-to-string';
import { writeFileSync } from 'node:fs';
import { MapBase } from './mapArt';
const [out = 'tools/map/out', fonts = ''] = process.argv.slice(2);
const css = ['400', '400-italic', '700'].map((w) => `<link rel="stylesheet" href="file://${fonts}/${w}.css">`).join('');
writeFileSync(`${out}/page.html`, `<!doctype html><meta charset="utf-8">${css}<style>
html,body{margin:0;background:#000}svg{display:block}
.m-river{font-family:'Old Standard TT',serif;font-style:italic;font-size:7px;fill:#3d2a1b;letter-spacing:.35px;paint-order:stroke;stroke:#efe0bb;stroke-width:1.6px;stroke-linejoin:round}
.m-small{font-family:'Old Standard TT',serif;font-style:italic;font-size:4.6px;fill:#3d2a1b;letter-spacing:.2px;paint-order:stroke;stroke:#efe0bb;stroke-width:1.4px}
.m-sea{font-family:'Old Standard TT',serif;font-style:italic;font-size:8.6px;fill:#29505a;letter-spacing:1.6px;paint-order:stroke;stroke:#a9cbc8;stroke-width:1.4px}
.m-title{font-family:'Old Standard TT',serif;font-weight:700;font-size:8.4px;fill:#3d2a1b;letter-spacing:.6px}
.m-cap{font-family:'Old Standard TT',serif;font-weight:700;fill:#3d2a1b}
</style>${renderToString(<MapBase />)}`);
