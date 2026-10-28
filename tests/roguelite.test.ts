// 28.10 · the roguelite of expeditions (docs/PROGRESSION-v3.md §3, docs/CHARACTERS-v3.md): plots with a condition
// and a random map, finds that last a run, visitors at the camp, the hazards of a region (bear, boars, fire, dry
// wind), folding a farm and the cart back home; the home's mortgage, buyout, tax, inventory and arrest.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine/game';
import * as D from '../src/engine/data';
import * as R from '../src/engine/run';
import * as M from '../src/engine/meta';
import { planYear } from '../src/engine/calendar';
import { hashSeed } from '../src/engine/rng';
import { validFarm } from '../src/ui/persist';

const json = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const quietRun = (loc: D.ExpeditionId, cond: R.CondId, relics: R.RelicId[] = [], seed = 'RUN-2810') => {
  const s = G.newGame({ loc, seed, run: { cond, relics } });
  s.money = 5000; s.plan = []; s.strikes = []; s.temps = s.temps.map(() => 15); s.crowWarn = []; s.kidsWarn = [];
  s.flags = { warm: false, rain: false, dry: false };
  s.run!.nextVisit = 9999;
  return s;
};
const plant = (s: G.GameState, x: number, y: number, id: D.CropId, grown = 1) => {
  const t = G.tile(s, x, y);
  t.crop = { id, grown, bonus: 0, mult: 1, planted: s.absWeek, pid: s.nextPid++ };
  t.moisture = 3; t.weeds = false;
  return t.crop;
};
const toWeek = (s: G.GameState, week: number) => {
  const seasons = D.LOCATIONS[s.loc].seasons;
  let left = week, season = 3, w = seasons[3];
  for (let i = 0; i < 4; i++) { if (left <= seasons[i]) { season = i; w = left; break; } left -= seasons[i]; }
  s.week = week; s.season = season as 0 | 1 | 2 | 3; s.weekInSeason = w; s.absWeek = s.yearStart + week - 1;
};
const payThrough = (s: G.GameState, weeks: number) => {
  for (let i = 0; i < weeks && s.phase !== 'gameover'; i++) {
    s = G.endWeek(s);
    if (s.phase === 'shortfall') { s.money = Math.max(s.money, 1e6); s = G.apply(s, { t: 'pay' }); }
  }
  return s;
};
const plot = (s: G.GameState) => G.ownedTiles(s).map(([t]) => t.terrain);

// ---------------------------------------------------------------- the map of a plot
test('a run map: the start plot holds no water, taiga or swamp; the Kuban river touches it; maps differ by seed and repeat by seed', () => {
  const seen = new Set<string>();
  for (const loc of D.EXPEDITION_IDS) for (const cond of R.REGION_CONDS[loc]) for (let k = 0; k < 25; k++) {
    const seed = `MAP-${k}`, m = R.runMap(loc, seed, cond);
    assert.deepEqual(R.runMap(loc, seed, cond), m);
    seen.add(m.join(''));
    for (let y = 1; y <= 3; y++) for (let x = 1; x <= 3; x++) assert.ok(['plain', 'sand', 'rock'].includes(m[y * 6 + x]), `${loc}/${cond}/${seed} ${x},${y} ${m[y * 6 + x]}`);
    if (loc === 'kuban') {
      const nearPlot = [...Array(36).keys()].filter((i) => m[i] === 'river').some((i) => { const x = i % 6, y = Math.floor(i / 6); return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => x + dx >= 1 && x + dx <= 3 && y + dy >= 1 && y + dy <= 3); });
      assert.ok(nearPlot, `${cond}/${seed}: the river must touch the plot`);
    }
    if (loc === 'altai') assert.equal(m.filter((t) => t === 'river').length, 6);
  }
  assert.ok(seen.size > 100, 'maps vary');
});

test('a run starts with its condition: canals, a hut, a hive, melons, a cold stanitsa, a weedy widow plot, richer soil', () => {
  assert.equal(G.lvl(G.newGame({ loc: 'kuban', seed: 'C1', run: { cond: 'aryks' } }), 'canal'), 2);
  assert.equal(G.lvl(G.newGame({ loc: 'altai', seed: 'C1', run: { cond: 'banya' } }), 'house'), 2);
  assert.equal(G.lvl(G.newGame({ loc: 'altai', seed: 'C1', run: { cond: 'oldhives' } }), 'apiary'), 1);
  const melons = G.newGame({ loc: 'kuban', seed: 'C1', run: { cond: 'melons' } });
  assert.equal(G.deckList(melons).filter((c) => c.def === 'seed_watermelon' && c.traits?.includes('yield')).length, 2);
  assert.equal(G.newGame({ loc: 'kuban', seed: 'C1', run: { cond: 'lgota' } }).orgs.stanitsa!.rel, -30);
  const widow = G.newGame({ loc: 'rent', seed: 'C1', run: { cond: 'widow' } });
  assert.equal(G.ownedTiles(widow).filter(([t]) => t.weeds).length, 4);
  assert.equal(G.ownedTiles(widow).filter(([t]) => G.treeStage(t) === 1).length, 1);
  assert.ok(G.ownedTiles(widow).every(([t]) => t.soil === 4));
  assert.ok(G.ownedTiles(G.newGame({ loc: 'kuban', seed: 'C1', run: { cond: 'floodplain' } })).every(([t]) => t.terrain !== 'plain' || t.soil === 3));
  const school = G.newGame({ loc: 'rent', seed: 'C1', run: { cond: 'school' } });
  assert.equal(school.orgs.school!.rel, 30);
  // the rent is Черноземье's climate with Заречье's four customers and a cheaper or dearer rent by condition
  assert.deepEqual(D.LOCATIONS.rent.orgs, ['teahouse', 'school', 'steward', 'club']);
  const strip = G.newGame({ loc: 'rent', seed: 'C1', run: { cond: 'strip' } }), plain = G.newGame({ loc: 'rent', seed: 'C1', run: { cond: 'road' } });
  assert.ok(G.paymentBase(strip, 1) < G.paymentBase(plain, 1) && G.paymentBase(school, 1) > G.paymentBase(plain, 1));
});

// ---------------------------------------------------------------- hazards in the year plan
test('hazards are drawn after the rest of the year: a run keeps every other episode and temperature of its seed', () => {
  for (const loc of ['kuban', 'altai'] as const) for (let y = 1; y <= 4; y++) {
    const key = `PLAN-${loc}|${loc}|v4|plan|${y}`;
    const base = planYear({ key, year: y, loc: D.LOCATIONS[loc], river: true, crops: D.LOCATIONS[loc].shop });
    const run = planYear({ key, year: y, loc: D.LOCATIONS[loc], river: true, crops: D.LOCATIONS[loc].shop, hazards: R.hazardsFor(loc, R.REGION_CONDS[loc][1], y) });
    assert.deepEqual(run.episodes.filter((e) => e.id % 1000 < 500), base.episodes);
    const extra = run.episodes.filter((e) => e.id % 1000 >= 500);
    assert.ok(extra.length >= 1, `${loc} y${y}: hazards`);
    const wind = new Set(extra.filter((e) => e.kind === 'sukhovey').flatMap((e) => Array.from({ length: e.len }, (_, i) => e.start + i)));
    run.temps.forEach((t, i) => assert.equal(t, base.temps[i] + (wind.has(i + 1) ? 4 : 0)));
    // no two threats in the same week, nothing in winter
    const threats = run.episodes.filter((e) => ['bear', 'boars', 'fire', 'flood', 'hail', 'beetle', 'locust', 'weedsurge', 'crows'].includes(e.kind));
    for (const a of threats) for (const b of threats) if (a !== b) assert.ok(a.start + a.len - 1 < b.start || b.start + b.len - 1 < a.start, `${loc} y${y} ${a.kind}/${b.kind}`);
  }
  // a farm without a run (every older save and test) plans exactly as before
  const legacy = G.newGame({ loc: 'kuban', seed: 'PLAN-LEGACY' });
  assert.ok(!legacy.plan.some((e) => ['bear', 'boars', 'fire', 'sukhovey'].includes(e.kind)));
  const k = G.newGame({ loc: 'kuban', seed: 'PLAN-RUN', run: { cond: 'melons' } });
  const y2 = G.yearPlanFor(k, 2).episodes;
  assert.equal(y2.filter((e) => e.kind === 'boars').length, 2, 'melons: two herds from the second year');
  assert.ok(G.yearPlanFor(G.newGame({ loc: 'altai', seed: 'PLAN-RUN', run: { cond: 'cedar' } }), 2).episodes.filter((e) => e.kind === 'bear').length === 2);
});

// ---------------------------------------------------------------- bear, boars, fire, dry wind
test('a bear is seen a week ahead, wrecks a hive and the beds it reaches; a guarded bed and a watched farm are safe', () => {
  let s = quietRun('altai', 'banya');
  s.levels.apiary = 1;
  G.tile(s, 2, 2).structure = 'hive'; G.tile(s, 2, 2).hivePlacedWeek = 0;
  plant(s, 1, 1, 'strawberry'); plant(s, 3, 3, 'potato');
  s.storage = [{ crop: 'honey', qty: 8, age: 0 }];
  s.plan = [{ id: 7501, kind: 'bear', start: s.absWeek + 2, len: 1 }];
  s = G.endWeek(s);
  const st = s.strikes.find((x) => x.kind === 'bear')!;
  assert.ok(st && st.cells.some(([x, y]) => x === 2 && y === 2) && st.cells.some(([x, y]) => x === 1 && y === 1));
  assert.ok(s.feed.some((f) => /Медвежьи следы/.test(f.text)));
  s = G.endWeek(s);
  for (const [t] of G.ownedTiles(s)) t.moisture = 3;
  s = G.apply(s, { t: 'guard', x: 1, y: 1 });
  const watched = structuredClone(s);
  s = G.endWeek(s);
  assert.equal(G.tile(s, 2, 2).structure, null, 'the hive is wrecked');
  assert.equal(G.tile(s, 1, 1).crop?.id, 'strawberry', 'the guarded bed stands');
  assert.equal(G.stockOf(s, 'honey'), 2);
  assert.ok(s.scenes?.some((x) => x.kind === 'bear'));
  watched.team = [{ id: 'watchman', level: 1, away: 0 }];
  const n = G.endWeek(watched);
  assert.equal(G.tile(n, 2, 2).structure, 'hive');
  assert.ok(n.feed.some((f) => /Сторож отогнал медведя/.test(f.text)));
});

test('Пурга drives a bear off once a season; a hunter keeps it off for three weeks', () => {
  const bear = (s: G.GameState) => { s.strikes = [{ kind: 'bear', ep: 1, week: s.absWeek, cells: [[1, 1, G.tile(s, 1, 1).crop!.pid]], zone: false }]; for (const [t] of G.ownedTiles(s)) t.moisture = 3; return G.endWeek(s); };
  let s = quietRun('altai', 'cedar', ['laika']);
  toWeek(s, 6); plant(s, 1, 1, 'strawberry');
  s = bear(s);
  assert.equal(G.tile(s, 1, 1).crop?.id, 'strawberry');
  assert.ok(s.feed.some((f) => /Лайка Пурга отогнала медведя/.test(f.text)));
  s = bear(s);
  assert.equal(G.tile(s, 1, 1).crop, null, 'the second visit in the same season gets through');
  let h = quietRun('altai', 'cedar');
  toWeek(h, 6); plant(h, 1, 1, 'strawberry');
  h.run!.calm = { bear: h.absWeek + 2 };
  h = bear(h); h = bear(h);
  assert.equal(G.tile(h, 1, 1).crop?.id, 'strawberry');
});

test('boars root up a patch on the edge of the field (two beds in the first year); a patrol keeps them off', () => {
  let s = quietRun('kuban', 'melons');
  toWeek(s, 6);
  for (const [x, y] of [[1, 1], [2, 1], [3, 1], [1, 2]] as [number, number][]) plant(s, x, y, 'pumpkin');
  s.plan = [{ id: 7502, kind: 'boars', start: s.absWeek + 2, len: 1 }];
  s = G.endWeek(s);
  assert.ok(s.feed.some((f) => /Кабаны перерыли балку/.test(f.text)));
  for (const [t] of G.ownedTiles(s)) t.moisture = 3;
  s = G.endWeek(s);
  const st = s.strikes.find((x) => x.kind === 'boars')!;
  assert.equal(st.cells.length, 2);
  const calm = structuredClone(s);
  for (const [t] of G.ownedTiles(s)) t.moisture = 3;
  s = G.endWeek(s);
  assert.equal(st.cells.filter(([x, y]) => G.tile(s, x, y).crop === null).length, 2);
  assert.ok(s.lastReport!.fieldDamage!.some((d) => d.kind === 'boars'));
  calm.run!.calm = { boars: calm.absWeek };
  for (const [t] of G.ownedTiles(calm)) t.moisture = 3;
  const n = G.endWeek(calm);
  assert.ok(st.cells.every(([x, y]) => G.tile(n, x, y).crop?.id === 'pumpkin'));
  assert.ok(n.feed.some((f) => /Казачий разъезд отогнал кабанов/.test(f.text)));
});

test('fire burns the beds by the taiga that are not watered to the brim, and the taiga next to them becomes open land', () => {
  let s = quietRun('altai', 'cedar', [], 'FIRE-1');
  const edge = G.ownedTiles(s).filter(([, x, y]) => G.nearTerrain(s, x, y, 'forest'));
  assert.ok(edge.length >= 2);
  const [[, ax, ay], [, bx, by]] = edge;
  plant(s, ax, ay, 'potato'); plant(s, bx, by, 'cabbage');
  s.strikes = [{ kind: 'fire', ep: 1, week: s.absWeek, cells: [[ax, ay, 0], [bx, by, 0]], zone: true }];
  G.tile(s, ax, ay).moisture = 1; G.tile(s, bx, by).moisture = 3;
  const forest = G.neighbors4(ax, ay).filter(([x, y]) => G.tile(s, x, y).terrain === 'forest');
  const n = G.endWeek(s);
  assert.equal(G.tile(n, ax, ay).crop, null);
  assert.equal(G.tile(n, bx, by).crop?.id, 'cabbage', 'watered to the brim — does not catch');
  assert.ok(forest.some(([x, y]) => G.tile(n, x, y).terrain === 'plain'), 'the taiga burns into open land');
});

test('a dry wind kills a bed with no water at once; taiga, a tree or a cover nearby shelters it', () => {
  const s = quietRun('kuban', 'spit', [], 'WIND-1');
  toWeek(s, 6);
  const open = G.ownedTiles(s).filter(([t, x, y]) => !G.nearTerrain(s, x, y, 'river') && !G.windbreak(s, x, y) && t.terrain === 'plain');
  assert.ok(open.length >= 2);
  const [[a, ax, ay], [b, bx, by]] = open;
  plant(s, ax, ay, 'corn'); plant(s, bx, by, 'corn');
  a.moisture = 0; b.moisture = 0; b.shelter = 2;
  const calm = structuredClone(s);
  s.plan = [{ id: 7503, kind: 'sukhovey', start: s.absWeek, len: 1 }];
  assert.equal(G.sukhovey(s), true);
  const n = G.endWeek(s);
  assert.equal(G.tile(n, ax, ay).crop, null);
  assert.equal(G.tile(n, bx, by).crop?.id, 'corn');
  assert.equal(G.tile(G.endWeek(calm), ax, ay).crop?.id, 'corn', 'without the wind a dry week is survived');
});

// ---------------------------------------------------------------- visitors
test('the first visitor comes in the third week; a visitor waits one week; nobody comes in winter', () => {
  let s = G.newGame({ loc: 'kuban', seed: 'VISIT-1', run: { cond: 'lgota' } });
  s.money = 1e5;
  s = G.endWeek(G.endWeek(s));
  assert.equal(s.absWeek, 3);
  const v = s.run!.visit!;
  assert.ok(v && R.VISITS[v.id].where.includes('kuban'));
  assert.ok(s.feed.some((f) => f.text.startsWith('К лагерю пришли')));
  assert.ok(s.run!.nextVisit >= s.absWeek + 2 && s.run!.nextVisit <= s.absWeek + 4);
  const n = G.endWeek(s);
  assert.equal(n.run!.visit, null);
  assert.ok(n.feed.some((f) => f.text === R.VISITS[v.id].gone));
  const w = structuredClone(n);
  toWeek(w, D.LOCATIONS.kuban.seasons.slice(0, 3).reduce((a, b) => a + b, 0) + 1);
  w.run!.nextVisit = w.absWeek;
  w.week -= 1; w.absWeek -= 1; // the winter week starts on the next turn
  const x = G.endWeek(w);
  assert.equal(x.season, 3);
  assert.equal(x.run!.visit, null);
});

test('answers: seeds from the melon man, a patrol for produce, the hunter, the geologist, the peddler; refusal costs nothing', () => {
  const at = (loc: D.ExpeditionId, cond: R.CondId, id: R.VisitId, extra: Partial<G.RunVisit> = {}) => {
    const s = quietRun(loc, cond); toWeek(s, 6); s.run!.visit = { id, week: s.absWeek, ...extra }; return s;
  };
  let s = at('kuban', 'lgota', 'melonman');
  const cash = s.money;
  s = G.apply(s, { t: 'answer', choice: 0 });
  assert.equal(s.money, cash - Math.round(12 * G.infl(1)));
  assert.ok([...G.deckList(s), ...s.spare].some((c) => c.def === 'seed_watermelon' && c.traits?.includes('yield')));
  assert.equal(s.run!.visit, null);
  assert.throws(() => G.apply(s, { t: 'answer', choice: 0 }), /Никто не ждёт/);
  s = at('kuban', 'lgota', 'patrol');
  assert.match(G.visitOptions(s)[0].problem!, /Нужно 4 ед\. урожая/);
  assert.throws(() => G.apply(s, { t: 'answer', choice: 0 }), /Нужно 4/);
  s.storage = [{ crop: 'corn', qty: 5, age: 0 }];
  s = G.apply(s, { t: 'answer', choice: 0 });
  assert.equal(G.stockOf(s, 'corn'), 1); assert.equal(s.run!.calm!.boars, s.absWeek + 3); assert.equal(s.orgs.stanitsa!.rel, -20);
  s = at('altai', 'cedar', 'hunter');
  assert.ok(G.visitOptions(s)[1].problem);
  s.storage = [{ crop: 'honey', qty: 4, age: 0 }];
  s = G.apply(s, { t: 'answer', choice: 1 });
  assert.ok(s.run!.relics.includes('laika')); assert.equal(G.stockOf(s, 'honey'), 0);
  s = at('altai', 'cedar', 'geologist'); s.storage = [{ crop: 'potato', qty: 3, age: 0 }];
  s = G.apply(s, { t: 'answer', choice: 0 });
  assert.ok(s.run!.relics.includes('oldmap'));
  s = at('rent', 'road', 'peddler', { relic: 'kettle', price: 17 });
  const before = s.money;
  s = G.apply(s, { t: 'answer', choice: 0 });
  assert.ok(s.run!.relics.includes('kettle')); assert.equal(s.money, before - 17);
  s = at('kuban', 'lgota', 'shepherd');
  const snap = s.money;
  s = G.apply(s, { t: 'answer', choice: 2 });
  assert.equal(s.money, snap);
});

test('the fire family: a carpenter for six weeks who takes no bed and no pay, then leaves', () => {
  let s = quietRun('altai', 'cedar'); toWeek(s, 6);
  s.run!.visit = { id: 'firefamily', week: s.absWeek };
  s = G.apply(s, { t: 'answer', choice: 0 });
  const w = s.team.find((x) => x.id === 'mechanic')!;
  assert.equal(w.free, true); assert.equal(w.leaves, s.absWeek + 6);
  assert.equal(G.bedsUsed(s), 0); assert.equal(G.weeklyCosts(s).salaries, 0);
  for (let i = 0; i < 6; i++) { for (const [t] of G.ownedTiles(s)) t.moisture = 3; s = G.endWeek(s); if (s.phase === 'shortfall') s = G.apply(s, { t: 'pay' }); }
  assert.ok(!s.team.some((x) => x.id === 'mechanic'));
  assert.ok(s.feed.some((f) => /доработал своё/.test(f.text)));
});

test('archaeologists dig an empty bed for three weeks; Пряхин inspects his strip and raises the next rent for weeds', () => {
  let s = quietRun('kuban', 'lgota'); toWeek(s, 6);
  s.run!.visit = { id: 'archaeologists', week: s.absWeek };
  s = G.apply(s, { t: 'answer', choice: 0 });
  const d = s.run!.dig!;
  assert.equal(G.tileBlock(s, d.x, d.y, 'radish'), 'раскоп археологов');
  for (let i = 0; i < 3; i++) s = payThrough(s, 1);
  assert.equal(s.run!.dig, undefined);
  assert.ok(s.run!.relics.includes('bead') || s.feed.some((f) => /за беспокойство/.test(f.text)));
  let r = quietRun('rent', 'strip'); toWeek(r, 6);
  G.tile(r, 1, 1).weeds = true; G.tile(r, 2, 1).weeds = true;
  const due = G.nextPayment(r).amount;
  r.run!.visit = { id: 'inspection', week: r.absWeek };
  r = G.endWeek(r); // not answered: he inspects anyway
  assert.equal(r.run!.surcharge, 0.1);
  assert.equal(G.nextPayment(r).amount, Math.round(G.paymentBase(r, G.nextPayment(r).season) * 1.1));
  assert.ok(G.nextPayment(r).amount > due - 1);
  r = payThrough(r, 12);
  assert.equal(r.run!.surcharge, undefined, 'the surcharge is paid with the next rent');
});

// ---------------------------------------------------------------- finds
test('finds: an axe, a rattle, a seed bag, a kettle, a vane, an accordion, a notebook, a burka, a receipt, a bead', () => {
  const plain = quietRun('rent', 'road'), withR = (r: R.RelicId) => { const s = quietRun('rent', 'road', [r]); return s; };
  assert.equal(G.chopDays(withR('axe')), 2); assert.equal(G.chopDays(plain), 3);
  assert.equal(G.guardPrice(withR('rattle')), 0);
  assert.equal(G.seedCost(withR('seedbag'), 'potato'), G.round2(G.seedCost(plain, 'potato') * 0.8));
  assert.equal(G.sidejobPay(withR('kettle')), 2 * G.sidejobPay(plain));
  assert.equal(G.raidLead(withR('vane')), G.raidLead(plain) + 1);
  const acc = withR('accordion'); toWeek(acc, 5); const p2 = structuredClone(plain); toWeek(p2, 5);
  assert.equal(G.weekDays(acc), G.weekDays(p2) + 1);
  assert.equal(G.storageKeepWeeks(withR('notebook'), 'strawberry'), G.storageKeepWeeks(plain, 'strawberry') + 2);
  const cold = withR('burka'); plant(cold, 2, 2, 'potato'); plant(plain, 2, 2, 'potato');
  const lim = G.frostLimit(G.tile(plain, 2, 2).crop!) - G.frostShield(plain, G.tile(plain, 2, 2));
  assert.equal(G.frostKills(plain, 2, 2, lim), true); assert.equal(G.frostKills(cold, 2, 2, lim), false);
  let rc = withR('receipt');
  const full = G.paymentBase(rc, 0);
  assert.equal(G.nextPayment(rc).amount, Math.round(full * 0.75));
  rc = payThrough(rc, D.LOCATIONS.rent.seasons[0]);
  assert.ok(rc.run!.used.includes('receipt'));
  assert.equal(G.nextPayment(rc).amount, G.paymentBase(rc, G.nextPayment(rc).season));
  // the bead: +2 glory with every order
  const b = withR('bead'); const o = 'teahouse';
  b.orgs[o]!.active = { id: 99, org: o, step: 5, title: 'x', text: '', lines: [{ crop: 'potato', qty: 1 }], pay: 10, rel: 5, weeks: 5, deadline: b.absWeek + 5 };
  b.storage = [{ crop: 'potato', qty: 1, age: 0 }];
  const g = b.glory;
  assert.equal(G.apply(b, { t: 'deliver', org: o }).glory, g + 2);
});

// ---------------------------------------------------------------- folding and the cart home
test('a farm is folded after its first autumn payment: half of (cash + barn − debts), one find a year', () => {
  let s = G.newGame({ loc: 'kuban', seed: 'FOLD-1', run: { cond: 'lgota' } });
  s.money = 3000;
  assert.match(G.foldProblem(s)!, /после первого осеннего платежа/);
  assert.throws(() => G.apply(s, { t: 'fold', picks: [] }), /после первого осеннего/);
  const autumnEnd = D.LOCATIONS.kuban.seasons.slice(0, 3).reduce((a, b) => a + b, 0);
  s = payThrough(s, autumnEnd);
  assert.equal(s.run!.autumns, 1);
  assert.equal(G.foldProblem(s), null);
  const offers = G.lootOffers(s);
  assert.ok(offers.length >= 3 && offers.every((l) => R.LOOT[l].loc === 'kuban'));
  assert.equal(G.lootCount(s), 1 + G.chainsDone(s));
  assert.throws(() => G.apply(s, { t: 'fold', picks: [] }), /Выберите/);
  assert.throws(() => G.apply(s, { t: 'fold', picks: ['logs24'] }), /Выберите/);
  const v = G.foldValue(s);
  assert.equal(v.share, 0.5);
  const n = G.apply(s, { t: 'fold', picks: offers.slice(0, G.lootCount(s)) });
  assert.equal(n.phase, 'gameover');
  assert.equal(n.run!.result!.cash, v.total);
  assert.equal(n.run!.result!.bankrupt, false);
  assert.ok(validFarm(json(n)));
  // the rent sends home 70%
  assert.equal(G.foldShare(G.newGame({ loc: 'rent', seed: 'F', run: { cond: 'road' } })), 0.7);
});

test('the cart: up to three cards, one worker and some cash leave the home; folding brings them back with the finds', () => {
  let home = G.newGame({ loc: 'chernozem', seed: 'HOME-1' });
  home.money = 500; home.levels.house = 3;
  home.team = [{ id: 'agronomist', level: 2, away: 0 }];
  const bred = { uid: home.nextUid++, def: 'seed_potato', extra: [[2, 0]] as [number, number][], traits: ['yield'] as D.TraitId[] };
  home.discard.push(bred);
  const deck = G.deckCount(home);
  const offer = M.departureOffers(home, 'rent')[0];
  const cart: M.Cart = { uids: [bred.uid, home.draw[0].uid], worker: 'agronomist', cash: M.cartCashMax(home) };
  assert.equal(M.cartCashMax(home), 60);
  assert.match(M.departProblem(home, 'rent', 0, { ...cart, cash: 61 })!, /до 60/);
  assert.match(M.departProblem(home, 'rent', 0, { ...cart, uids: [...cart.uids, home.draw[1].uid, home.draw[2].uid] })!, /3 карты/);
  assert.match(M.departProblem(home, 'kuban', 0)!, /славой 40/);
  const { home: h, run } = M.depart(home, 'rent', offer, cart, 'RUN-SEED-1', { glory: 0 });
  assert.equal(G.deckCount(h), deck - 2);
  assert.equal(h.team.length, 0);
  assert.equal(h.money, 440);
  assert.equal(h.away!.seed, 'RUN-SEED-1');
  assert.match(M.departProblem(h, 'rent', 0)!, /Обоз уже в пути/);
  assert.equal(run.money, 130);
  assert.equal(run.run!.cond, offer.cond); assert.deepEqual(run.run!.relics, [offer.relic]);
  assert.ok(run.team.some((w) => w.id === 'agronomist' && w.level === 2));
  const carried = G.deckList(run).filter((c) => run.run!.carried.uids.includes(c.uid));
  assert.ok(carried.some((c) => c.def === 'seed_potato' && c.traits?.includes('yield') && c.extra?.length === 1));
  // a season or so later the farm is folded
  let r = run; r.money = 2000;
  r = payThrough(r, D.LOCATIONS.rent.seasons.slice(0, 3).reduce((a, b) => a + b, 0));
  r.mats = { logs: 5, bricks: 2, glass: 0 };
  const picks = G.lootOffers(r).slice(0, G.lootCount(r));
  r = G.apply(r, { t: 'fold', picks });
  const res = r.run!.result!;
  const back = M.settleRun(h, r)!;
  assert.ok(back.home);
  const H = back.home!;
  assert.equal(H.away, undefined);
  assert.ok(H.team.some((w) => w.id === 'agronomist' && w.level === 2));
  assert.equal(G.deckCount(H), deck);
  assert.ok([...G.deckList(H), ...H.spare].some((c) => c.def === 'seed_potato' && c.traits?.includes('yield')));
  const lootCash = picks.reduce((a, l) => a + Math.round((R.LOOT[l].cash ?? 0) * G.infl(H.year)), 0);
  assert.equal(H.money, G.round2(440 + res.cash + lootCash));
  assert.ok(G.matStock(H, 'logs') >= 5);
  assert.equal(back.run.run!.result!.settled, true);
  assert.equal(M.settleRun(H, back.run), null, 'settled once');
  // a farm folded for a home that was restarted: the run is closed, the new home is untouched
  const other = G.newGame({ loc: 'chernozem', seed: 'HOME-2' });
  const lone = M.settleRun(other, r)!;
  assert.equal(lone.home, other);
  assert.equal(lone.run.run!.result!.settled, true);
});

test('a bankrupt expedition sends home one poor find and the cart, no cash', () => {
  let home = G.newGame({ loc: 'chernozem', seed: 'HOME-3' }); home.money = 100;
  const { home: h, run } = M.depart(home, 'rent', M.departureOffers(home, 'rent')[0], { uids: [], cash: 0 }, 'RUN-BUST', { glory: 0 });
  let r = run; r.money = 0; r.storage = [];
  while (r.phase === 'week') r = G.endWeek(r);
  assert.equal(r.phase, 'shortfall');
  r = G.apply(r, { t: 'giveUp' });
  assert.equal(r.run!.result!.bankrupt, true); assert.equal(r.run!.result!.cash, 0); assert.equal(r.run!.result!.loot.length, 1);
  const H = M.settleRun(h, r)!.home!;
  assert.equal(H.money, 100 + Math.round((R.LOOT[r.run!.result!.loot[0]].cash ?? 0) * G.infl(H.year)));
  assert.ok(H.feed.some((f) => /почти пустым/.test(f.text)));
});

// ---------------------------------------------------------------- the home: mortgage, buyout, tax, inventory, arrest
test('three autumn payments buy the home out: +30 glory, a certificate; then only the yearly tax', () => {
  let s = G.newGame({ loc: 'chernozem', seed: 'BUY-1' });
  assert.equal(s.paidYears, 0); assert.ok(G.isMortgaged(s));
  s.money = 1e6;
  const yl = G.yearLen(s), autumn = D.LOCATIONS.chernozem.seasons.slice(0, 3).reduce((a, b) => a + b, 0);
  s = payThrough(s, yl * 2 + autumn - 1);
  assert.equal(s.paidYears, 2);
  assert.equal(G.nextPayment(s).name, D.BUYOUT_NAME);
  const glory = s.glory;
  s = payThrough(s, 1);
  assert.equal(s.owned, true); assert.equal(s.paidYears, 3);
  assert.ok(s.certs.includes('Хозяин родного дома'));
  assert.ok(s.glory >= glory + 30);
  assert.ok(s.scenes?.some((x) => x.kind === 'buyout'));
  assert.equal(G.paymentSchedule(s).length, 1);
  assert.equal(G.nextPayment(s).name, D.TAX_NAME);
  assert.equal(G.nextPayment(s).amount, G.homeTax(s, s.year + 1));
});

test('an early buyout pays the rest of the ladder with 10% off', () => {
  let s = G.newGame({ loc: 'chernozem', seed: 'BUY-2' });
  s.money = 1e5;
  const sch = G.paymentSchedule(s);
  const all = [1, 2, 3].reduce((a, y) => a + sch.reduce((b, p) => b + G.paymentBase(s, p.season, y), 0), 0);
  assert.equal(G.buyoutPrice(s), Math.round(all * 0.9));
  const n = G.apply(s, { t: 'buyout' });
  assert.equal(n.owned, true); assert.equal(n.money, G.round2(1e5 - G.buyoutPrice(s)!));
  assert.equal(G.buyoutPrice(n), null);
  assert.throws(() => G.apply(n, { t: 'buyout' }), /уже выкуплен/);
  assert.equal(G.buyoutPrice(G.newGame({ loc: 'rent', seed: 'X', run: { cond: 'road' } })), null);
});

test('a bought-out home is never lost: the inventory takes the dearest equipment at 60% and the rest becomes a loan', () => {
  let s = G.newGame({ loc: 'chernozem', seed: 'SEIZE-1' });
  s.owned = true; s.paidYears = 3; s.levels.drone = 2; s.levels.machinery = 1;
  const tax = G.paymentSchedule(s)[0];
  toWeek(s, tax.week);
  s.money = 0; s.storage = [];
  s = G.endWeek(s);
  assert.equal(s.phase, 'shortfall');
  assert.throws(() => G.apply(G.newGame({ loc: 'chernozem', seed: 'S2' }), { t: 'seize' }), /не требуется/);
  const rating = s.rating;
  const n = G.apply(s, { t: 'seize' });
  assert.equal(n.phase, 'week');
  assert.ok(G.lvl(n, 'drone') < 2);
  assert.equal(n.rating, Math.max(0, rating - 2));
  assert.ok(n.feed.some((f) => /Опись/.test(f.text)));
});

test('a mortgaged home that goes bankrupt can be worked off: arrest, two expeditions, the house wakes next spring', () => {
  let home = G.newGame({ loc: 'chernozem', seed: 'ARREST-1' });
  home.money = 0; home.storage = [];
  while (home.phase === 'week') home = G.endWeek(home);
  const short = home.due!.amount - home.money;
  home = G.apply(home, { t: 'giveUp' });
  assert.equal(home.phase, 'gameover');
  assert.equal(home.over!.work, Math.round(short * 1.2));
  assert.ok(validFarm(json(home)));
  home = G.startArrest(home);
  home.tiles[G.idx(1, 1)].crop = { id: 'strawberry', grown: 2, bonus: 0, mult: 1, planted: 0, pid: home.nextPid++, years: 3 };
  home.tiles[G.idx(2, 2)].crop = { id: 'potato', grown: 2, bonus: 0, mult: 1, planted: 0, pid: home.nextPid++ };
  assert.equal(home.phase, 'arrest'); assert.equal(home.arrest!.runs, 2);
  assert.throws(() => G.apply(home, { t: 'sell', crop: 'radish', qty: 1 }), /арестом/);
  assert.equal(G.endWeek(home), home);
  assert.ok(validFarm(json(home)));
  // the first run brings too little: the debt shrinks, one run left
  const go = (h: G.GameState, seed: string, cash: number) => {
    const { home: hh, run } = M.depart(h, 'rent', M.departureOffers(h, 'rent')[0], { uids: [], cash: 0 }, seed, { glory: 0 });
    let r = run; r.money = 1e5;
    r = payThrough(r, D.LOCATIONS.rent.seasons.slice(0, 3).reduce((a, b) => a + b, 0));
    r.loans = []; r.carry = 0; r.storage = []; r.yard = [];
    r.money = cash / 0.7;
    r = G.apply(r, { t: 'fold', picks: G.lootOffers(r).filter((l) => !R.LOOT[l].cash).slice(0, G.lootCount(r)) });
    return M.settleRun(hh, r)!.home!;
  };
  const debt = home.arrest!.debt;
  home = go(home, 'WORK-1', debt / 2);
  assert.equal(home.phase, 'arrest'); assert.equal(home.arrest!.runs, 1);
  assert.ok(Math.abs(home.arrest!.debt - debt / 2) <= 1);
  const year = home.year;
  home = go(home, 'WORK-2', debt);
  assert.equal(home.phase, 'week');
  assert.equal(home.year, year + 1); assert.equal(home.season, 0); assert.equal(home.weekInSeason, 1);
  assert.equal(home.skipYears, 1);
  assert.equal(G.paymentBase(home, 1), G.paymentBase({ ...home, skipYears: 0, year: home.year - 1 }, 1), 'the arrest year is not counted');
  assert.deepEqual(home.storage, []);
  assert.equal(G.tile(home, 1, 1).crop?.id, 'strawberry', 'perennials live');
  assert.equal(G.tile(home, 2, 2).crop, null, 'the rest of the field is empty');
  assert.ok(home.money > 0);
  // two poor runs: Пряхин buys the house
  let lost = G.newGame({ loc: 'chernozem', seed: 'ARREST-2' });
  lost.money = 0; lost.storage = [];
  while (lost.phase === 'week') lost = G.endWeek(lost);
  lost = G.startArrest(G.apply(lost, { t: 'giveUp' }));
  lost = go(lost, 'POOR-1', 0); lost = go(lost, 'POOR-2', 0);
  assert.equal(lost.phase, 'gameover');
  assert.match(lost.over!.reason, /Пряхин/);
});

// ---------------------------------------------------------------- saves
test('saves: a played run and an old home save are valid; an old home is bought out by the years it lived', () => {
  let s = G.newGame({ loc: 'altai', seed: 'SAVE-RUN', run: { cond: 'cedar', relics: ['laika', 'vane'] } });
  s.money = 1e5;
  for (let i = 0; i < 40 && s.phase !== 'gameover'; i++) {
    if (s.run!.visit) { const k = G.visitOptions(s).findIndex((o) => !o.problem); s = G.apply(s, { t: 'answer', choice: k }); }
    s = payThrough(s, 1);
    assert.ok(validFarm(json(s)), `week ${s.absWeek}`);
  }
  assert.ok(s.run!.seen.length > 0);
  const old = json(G.newGame({ loc: 'chernozem', seed: 'SAVE-OLD' })) as G.GameState;
  delete old.paidYears;
  assert.ok(validFarm(old));
  old.yearsCompleted = 3; old.year = 4;
  const up = G.ensureV3(old);
  assert.notEqual(up, old);
  assert.equal(up.paidYears, 3); assert.equal(up.owned, true);
  const young = json(G.newGame({ loc: 'chernozem', seed: 'SAVE-OLD' })) as G.GameState;
  delete young.paidYears; young.yearsCompleted = 1; young.year = 2;
  const y = G.ensureV3(young);
  assert.equal(y.paidYears, 1); assert.equal(y.owned, undefined);
  const fresh = G.newGame({ loc: 'chernozem', seed: 'SAVE-NEW' });
  assert.equal(G.ensureV3(fresh), fresh);
  void hashSeed;
});
