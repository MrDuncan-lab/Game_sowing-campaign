// Regressions for the unified audit of 24.10.2026 (PSV-xxx ids from MASTER_FIX_LIST).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine/game';
import * as D from '../src/engine/data';
import { levelText } from '../src/content/rules';
import { validFarm, loadFarm, persistenceStatus, resetPersistenceSession } from '../src/ui/persist';

const fresh = (loc: D.LocationId = 'chernozem') => G.newGame({ loc, seed: 'audit-regression' });
function quiet(loc: D.LocationId = 'chernozem') {
  const s = fresh(loc);
  s.money = 10000; s.days = 10; s.plan = []; s.temps = [...s.temps].fill(20); s.strikes = []; s.crows = null; s.thieves = null; s.flags = { warm: false, rain: false, dry: false };
  for (const t of s.tiles) Object.assign(t, { owned: true, terrain: 'plain', soil: 2, moisture: 3, crop: null, weeds: false, structure: null, canal: false });
  return s;
}
const plant = (s: G.GameState, x: number, y: number, id: D.CropId, grown = 3) => { G.tile(s, x, y).crop = { id, pid: s.nextPid++, grown, mult: 1, bonus: 0, planted: s.absWeek }; };

test('PSV-002 · the shop, the card face and the engine agree on a card\'s day cost', () => {
  const s = fresh();
  // the engine charges by area: potato, wheat, pumpkin, corn are two-cell seeds → 2 days at the start
  for (const crop of ['potato', 'wheat'] as D.CropId[]) {
    const def = `seed_${crop}`;
    assert.equal(G.cardDaysShown(s, { def }), G.cardDays(s, { def }));
    assert.equal(G.cardDaysShown(s, { def }), Math.ceil(G.cardCells({ def }).length / 2));
  }
  assert.equal(G.cardDaysShown(s, { def: 'seed_potato' }), 2);
  // a tractor makes the first sowing of the week one day cheaper, everywhere
  s.levels.machinery = 2; s.sowings = 0;
  assert.equal(G.cardDaysShown(s, { def: 'seed_radish' }), 0);
});

test('PSV-018 · an Altai cranberry extension that can never be planted is refused and not charged', () => {
  const s = fresh('altai');
  s.money = 10000; s.levels.lab = 1; s.unlocked.push('cranberry');
  for (const t of s.tiles) if (t.terrain === 'swamp') t.owned = true;
  const c = { uid: s.nextUid++, def: 'seed_cranberry' };
  s.spare.push(c);
  assert.ok(G.potentialPlacements(s, c) > 0, 'the base cranberry has a place');
  const spots = G.upgradeSpots(s, c);
  assert.equal(spots.length, 6);
  for (const cell of spots) {
    assert.equal(G.spotFits(s, c, cell), false, `extension ${cell} has no possible place`);
    assert.throws(() => G.apply(s, { t: 'labCell', uid: c.uid, cell }), /негде расти/);
  }
  assert.equal(s.money, 10000);
  // an ordinary extension elsewhere still works
  const p = fresh('chernozem'); p.money = 10000; p.levels.lab = 1;
  const pc = { uid: p.nextUid++, def: 'seed_potato' }; p.spare.push(pc);
  const cell = G.upgradeSpots(p, pc)[0];
  assert.ok(G.spotFits(p, pc, cell));
  const n = G.apply(p, { t: 'labCell', uid: pc.uid, cell });
  assert.ok(n.projects.some((x) => x.kind === 'cell' && x.card.uid === pc.uid));
});

test('PSV-019 · the winter preview moves the whole calendar, so it agrees with real winter', () => {
  const s = fresh();
  s.levels.greenhouse = 3; G.tile(s, 1, 1).structure = 'greenhouse'; G.tile(s, 2, 1).structure = 'greenhouse';
  for (const t of s.tiles) t.owned = true;
  const card = { def: 'seed_potato', extra: [[1, 1]] as [number, number][] };
  const winter = { ...G.seasonView(s, 3), tiles: s.tiles.map((t) => ({ ...t, crop: null })) };
  assert.equal(G.weekInfo(winter, 0).season, 3);
  assert.equal(winter.season, 3);
  assert.equal(G.cardCells(card).length, 4);
  assert.equal(G.placements(winter, card).length, 0, 'two greenhouses cannot hold four cells');
  // a one-cell radish under a greenhouse does fit in the same preview
  assert.ok(G.placements(winter, 'seed_radish').length > 0);
});

test('PSV-020 · after draining the swamp pair no cranberry order is offered without stock', () => {
  let s = fresh('altai');
  s.unlocked.push('cranberry'); s.orgs.sanatorium!.step = 2; s.orgs.sanatorium!.wait = 0;
  for (const a of [{ t: 'buyLand', x: 2, y: 4 }, { t: 'buyLand', x: 3, y: 4 }, { t: 'buyLand', x: 4, y: 3 }, { t: 'clear', x: 2, y: 4 }, { t: 'clear', x: 3, y: 4 }] as G.Action[]) s = G.apply(s, a);
  assert.equal(s.tiles.filter((t) => t.terrain === 'swamp').length, 1);
  assert.equal(G.cropProducible(s, 'cranberry'), false);
  assert.equal(G.orderCropAvailable(s, 'cranberry'), false);
  const n = G.endWeek(s);
  assert.ok(!n.orgs.sanatorium?.offer?.lines.some((l) => l.crop === 'cranberry'));
  // stock in the barn makes a (capped) order possible again
  s.storage.push({ crop: 'cranberry', qty: 5, age: 0 });
  assert.equal(G.orderCropAvailable(s, 'cranberry'), true);
  // the swamp pair itself, before draining, is a valid place
  const t = fresh('altai'); t.unlocked.push('cranberry');
  for (const a of [{ t: 'buyLand', x: 2, y: 4 }, { t: 'buyLand', x: 3, y: 4 }] as G.Action[]) Object.assign(G.tile(t, (a as any).x, (a as any).y), { owned: true });
  assert.equal(G.cropProducible(t, 'cranberry'), true);
});

test('PSV-021 · a moved hive pollinates from the next week, so one hive cannot boost two early harvests', () => {
  let s = quiet(); s.levels.apiary = 1;
  plant(s, 1, 1, 'buckwheat', 0); plant(s, 4, 4, 'buckwheat', 0);
  const hive = (st: G.GameState, x: number, y: number) => G.yieldParts(st, x, y, 'buckwheat').some((p) => p.label === 'улей рядом');
  s = G.apply(s, { t: 'build', item: 'hive', x: 1, y: 2 });
  assert.equal(hive(s, 1, 1), false, 'set down this week: no pollination yet');
  s = G.endWeek(s);
  assert.equal(hive(s, 1, 1), true, 'a week later the hive works');
  s = G.apply(s, { t: 'moveBuild', item: 'hive', from: [1, 2], to: [4, 3] });
  assert.equal(hive(s, 4, 4), false, 'moved: the new neighbour waits a week');
  assert.equal(hive(s, 1, 1), false);
  s = G.endWeek(s);
  assert.equal(hive(s, 4, 4), true);
  assert.match(levelText('apiary', 0), /следующей недели/);
});

test('PSV-022 · damaged saves are rejected and the backup is loaded with a notice', () => {
  const corrupt: [string, (s: any) => void][] = [
    ['negative story step', (s) => { s.orgs.orphanage.step = -1; s.orgs.orphanage.wait = 0; }],
    ['strike outside the field', (s) => { s.strikes = [{ kind: 'hail', ep: 2, week: s.absWeek, cells: [[100, 100, 0]], zone: true }]; }],
    ['field damage as an object', (s) => { s.lastReport = { ...s.report, fieldDamage: { oops: true } }; }],
    ['impossible rating', (s) => { s.rating = 99; }],
    ['fractional soil', (s) => { s.tiles[14].soil = 2.5; }],
    ['duplicate card uid', (s) => { s.hand = [{ uid: 7, def: 'water' }]; s.draw = [{ uid: 7, def: 'mulch' }]; }],
  ];
  for (const [name, change] of corrupt) {
    const s: any = JSON.parse(JSON.stringify(fresh()));
    assert.equal(validFarm(s), true, `${name}: the untouched save is valid`);
    change(s);
    assert.equal(validFarm(s), false, name);
  }
  const values = new Map<string, string>();
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => void values.set(k, v), removeItem: (k: string) => void values.delete(k) } });
  try {
    resetPersistenceSession();
    const good = fresh(), bad: any = structuredClone(good);
    bad.orgs.orphanage.step = -1;
    values.set('posevnaya.v4.farm.chernozem', JSON.stringify(bad));
    values.set('posevnaya.v4.farm.chernozem.backup', JSON.stringify(good));
    const loaded = loadFarm('chernozem');
    assert.equal(loaded?.orgs.orphanage?.step, 0);
    assert.match(persistenceStatus(), /резервная копия/);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous); else delete (globalThis as any).localStorage;
  }
});

test('PSV-023 · the drip line text matches what heat and drought still do', () => {
  const s = quiet(); s.flags.dry = true; s.temps.fill(30); s.levels.irrigation = 2;
  G.tile(s, 2, 2).drip = true; G.tile(s, 3, 2).drip = true; G.tile(s, 3, 2).terrain = 'sand';
  const n = G.endWeek(s);
  assert.ok(G.tile(n, 2, 2).moisture < 3, 'a hot week still dries a line');
  assert.match(levelText('irrigation', 1), /жара и засуха/);
  assert.doesNotMatch(levelText('irrigation', 1), /не сохнут за неделю/);
});

test('PSV-031 · order bonuses and the goat\'s income count as earnings', () => {
  const s = fresh();
  s.orgs.council!.step = 2;
  s.orgs.council!.active = { id: s.nextQuestId++, org: 'council', step: 2, title: D.ORGS.council.steps[2].title, text: '', lines: [{ crop: 'wheat', qty: 20 }], pay: 100, rel: 18, weeks: 6, deadline: 7, reward: D.ORGS.council.steps[2].reward };
  s.storage = [{ crop: 'wheat', qty: 20, age: 0 }];
  const n = G.apply(s, { t: 'deliver', org: 'council' });
  const cash = n.money - s.money;
  assert.ok(cash > 100, 'the step carries a cash bonus');
  assert.equal(n.earned - s.earned, cash);
  assert.match(n.feed.at(-1)!.text, /премия/);
  const goat = fresh(); goat.pets.push('goat');
  const g = G.endWeek(goat);
  assert.ok(g.money - goat.money > 0, 'the goat brings milk money');
  assert.equal(g.earned - goat.earned, g.money - goat.money);
});

test('PSV-032 · mice threaten only what lies in the barn', () => {
  const s = fresh();
  s.storage = [{ crop: 'radish', qty: 30, age: 0 }];
  s.yard = [{ crop: 'wheat', qty: 10, age: 0 }];
  assert.deepEqual(G.miceTargets(s), []);
  s.storage.push({ crop: 'wheat', qty: 10, age: 0 });
  assert.deepEqual(G.miceTargets(s), ['wheat']);
  s.pets.push('cat');
  assert.deepEqual(G.miceTargets(s), []);
});

test('PSV-030 · on real maps the cat and the dog never walk through tayga, river, swamp or a canal', async () => {
  const { camera } = await import('../src/ui/Scene');
  const { petArea, petMoment } = await import('../src/ui/petMotion');
  for (const loc of D.LOCATION_IDS) {
    const s = G.newGame({ loc, seed: 'animation-audit', pets: ['cat', 'dog'] });
    const cam = camera(s), area = petArea(s);
    for (const id of ['cat', 'dog'] as const) for (let i = 0; i <= 1080; i++) {
      const m = petMoment(cam, id, i / 10, area);
      const fy = m.y - cam.yard - 22;
      if (fy <= 0) continue; // the yard strip
      const x = Math.floor((m.x - 22) / 100 + 1e-6) + cam.vx, y = Math.floor(fy / 100 + 1e-6) + cam.vy;
      // a point exactly on a bed boundary belongs to both sides: check the cell it is inside of, if any
      const onEdgeX = Math.abs(((m.x - 22) % 100 + 100) % 100) < 1e-3, onEdgeY = Math.abs((fy % 100 + 100) % 100) < 1e-3;
      if (onEdgeX || onEdgeY || !G.inGrid(x, y)) continue;
      const t = G.tile(s, x, y);
      assert.ok(!['forest', 'river', 'swamp'].includes(t.terrain) && !t.canal, `${loc} ${id} at ${i / 10}s stands in ${t.terrain} (${x},${y})`);
    }
  }
});

test("PSV-017 · a canal that shrinks the pets' area makes the pet glide from where it stands, not jump a cell", async () => {
  const { camera } = await import('../src/ui/Scene');
  const { petArea, petMoment, startGlide, glideAt } = await import('../src/ui/petMotion');
  const s = G.newGame({ loc: 'kuban', seed: 'animation-audit', pets: ['cat', 'dog'] });
  const before = petArea(s), spot = G.buildSpots(s, 'canal')[0];
  const n = G.apply({ ...s, money: 1000, days: 9, levels: { ...s.levels, canal: Math.max(1, s.levels.canal ?? 0) } }, { t: 'build', item: 'canal', x: spot[0], y: spot[1] });
  const after = petArea(n), cam = camera(n), t0 = 47.9;
  assert.notDeepEqual([after.x, after.y, after.w, after.h], [before.x, before.y, before.w, before.h], 'the canal changes the area');
  const was = petMoment(camera(s), 'cat', t0, before), now = petMoment(cam, 'cat', t0, after);
  const g = startGlide([was.x, was.y], now, t0);
  const at = (t: number) => { const m = petMoment(cam, 'cat', t, after), o = g ? glideAt(g, t) : { dx: 0, dy: 0 }; return [m.x + o.dx, m.y + o.dy]; };
  assert.deepEqual(at(t0).map((v) => Math.round(v)), [was.x, was.y].map((v) => Math.round(v)), 'starts where it stood');
  for (let t = t0; t < t0 + 6; t += 0.1) { const [a, b] = [at(t), at(t + 0.1)]; assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 12, `continuous at ${t.toFixed(1)}s`); }
});
