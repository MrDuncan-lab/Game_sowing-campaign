// node tools/map/render.cjs <out-dir>  →  <out-dir>/map.png at 4× (1600×1200)
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const dir = require('path').resolve(process.argv[2] || 'tools/map/out');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 400, height: 300 }, deviceScaleFactor: 4 });
  await p.goto('file://' + dir + '/page.html');
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(600);
  await p.screenshot({ path: dir + '/map.png' });
  await b.close();
})();
