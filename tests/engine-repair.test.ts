import { seedWeeks, cardStat } from '../src/ui/Card';
import { Scene } from '../src/ui/Scene';
import { h } from 'preact';
import render from 'preact-render-to-string';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GameState, Plant, Quest, apply, newGame, tile, endWeek, expectedYield,
  buildMoveSpots, buildSpots, deckCount, deckLimit, forecast, marketPrice,
  priceAt, sellMult, freeStock, reservedStock, stockOf, storageCap, storageKeepWeeks,
  weekOutlook, weeklyCosts, ripenIn, targetGrow, beanGain, canClear,
  playableTargets, cardBlockReason, paymentSchedule, yearLen, IGNORED_OFFER_WEEKS,
} from '../src/engine/game';
import { CropId, CROPS, ORGS, LOCATIONS } from '../src/engine/data';
import { seasonOf } from '../src/engine/calendar';

function farm(loc: GameState['loc'] = 'chernozem'): GameState {
  const s = newGame({ loc, seed: 'REPAIR-REGRESSION' });
  s.money = 10000; s.plan = []; s.temps = s.temps.map(() => 18); s.strikes = [];
  s.crows = null; s.thieves = null; s.flags = { warm: false, rain: false, dry: false };
  for (const t of s.tiles) { t.terrain = 'plain'; t.crop = null; t.soil = 2; t.moisture = 3; }
  for (const st of Object.values(s.orgs)) if (st) st.wait = 1000;
  return s;
}
function date(s: GameState, week: number) {
  s.week = week; s.absWeek = s.yearStart + week - 1;
  const { season, w } = seasonOf(LOCATIONS[s.loc], week); s.season = season; s.weekInSeason = w;
}
function plant(s: GameState, id: CropId, x = 2, y = 2, extra: Partial<Plant> = {}) {
  tile(s, x, y).crop = { id, grown: CROPS[id].grow - 1, bonus: 0, mult: 1, planted: s.absWeek, pid: s.nextPid++, ...extra };
}
function card(s: GameState, def: string) { const uid = s.nextUid++; s.hand.push({ uid, def }); return uid; }
function quest(s: GameState, qty: number): Quest {
  return { id: 1, org: 'bakery', step: 0, title: 'Test', text: '', lines: [{ crop: 'radish', qty }], pay: 1, rel: 1, weeks: 5 };
}

test('early harvest consumes the final perennial harvest and records its achievement', () => {
  const s = farm(); plant(s, 'strawberry', 2, 2, { years: 1 });
  const next = apply(s, { t: 'play', uid: card(s, 'early'), tiles: [[2, 2]] });
  assert.equal(tile(next, 2, 2).crop, null);
  assert.ok(next.harvestedKinds.includes('strawberry')); assert.equal(next.glory, s.glory + 2);
});

test('early and ordinary harvesting apply the same bean and sunflower soil rules', () => {
  for (const id of ['bean', 'sunflower'] as const) {
    const s = farm(); plant(s, id);
    const early = apply(s, { t: 'play', uid: card(s, 'early'), tiles: [[2, 2]] });
    const normal = endWeek(s);
    assert.deepEqual(early.tiles.map((t) => t.soil), normal.tiles.map((t) => t.soil));
    assert.deepEqual(early.harvestedKinds, normal.harvestedKinds);
  }
});

const G_TRAIT_WEEKS = 4; // v3 §8.2 · a trait takes 4 weeks
test('laboratory active slots stay reserved; spare cards return to spare', () => {
  let s = farm(); s.levels.lab = 1; s.knowBase = { radish: 600, potato: 600, bean: 600, carrot: 600, onion: 600, cabbage: 600, wheat: 600, buckwheat: 600, pumpkin: 600, cranberry: 600 };
  const active = s.draw.find((c) => c.def.startsWith('seed_'))!;
  const n = deckCount(s); assert.equal(n, deckLimit(s));
  s = apply(s, { t: 'labTrait', uid: active.uid, trait: 'cold' });
  assert.equal(deckCount(s), n);
  s = apply(s, { t: 'buyCard', def: 'water' });
  assert.equal(s.spare.at(-1)!.def, 'water');
  for (let i = 0; i < G_TRAIT_WEEKS; i++) s = endWeek(s);
  assert.equal(deckCount(s), n); assert.ok(s.discard.some((c) => c.uid === active.uid) || s.hand.some((c) => c.uid === active.uid) || s.draw.some((c) => c.uid === active.uid));
  const spare = { uid: s.nextUid++, def: 'seed_radish' }; s.spare.push(spare);
  s = apply(s, { t: 'labTrait', uid: spare.uid, trait: 'cold' });
  for (let i = 0; i < G_TRAIT_WEEKS; i++) s = endWeek(s);
  assert.ok(s.spare.some((c) => c.uid === spare.uid && c.traits?.includes('cold')));
  assert.equal(deckCount(s), n);
});

test('greenhouse removal and movement cannot detach dependent tomatoes', () => {
  const s = farm(); s.levels.greenhouse = 1; tile(s, 2, 2).structure = 'greenhouse'; plant(s, 'tomato');
  const before = structuredClone(s);
  assert.throws(() => apply(s, { t: 'unbuild', item: 'greenhouse', x: 2, y: 2 }));
  assert.throws(() => apply(s, { t: 'moveBuild', item: 'greenhouse', from: [2, 2], to: [3, 3] }));
  assert.deepEqual(buildMoveSpots(s, 'greenhouse', [2, 2]), []); assert.deepEqual(s, before);
});

test('building moves are atomic and handle irrigation rows and scarecrow corners', () => {
  let s = farm(); s.levels.greenhouse = 1; tile(s, 2, 2).structure = 'greenhouse';
  assert.ok(buildMoveSpots(s, 'greenhouse', [2, 2]).some(([x, y]) => x === 3 && y === 3));
  const before = structuredClone(s);
  assert.throws(() => apply(s, { t: 'moveBuild', item: 'greenhouse', from: [2, 2], to: [0, 0] }));
  assert.deepEqual(s, before);
  s = apply(s, { t: 'moveBuild', item: 'greenhouse', from: [2, 2], to: [3, 3] });
  assert.equal(tile(s, 2, 2).structure, null); assert.equal(tile(s, 3, 3).structure, 'greenhouse');
  s.levels.irrigation = 2; s = apply(s, { t: 'build', item: 'drip', x: 1, y: 1 });
  s = apply(s, { t: 'moveBuild', item: 'drip', from: [4, 1], to: [2, 2] });
  assert.ok(!tile(s, 1, 1).drip && tile(s, 5, 2).drip);
  s.levels.guard = 1; s = apply(s, { t: 'build', item: 'scarecrow', x: 0, y: 0 });
  s = apply(s, { t: 'moveBuild', item: 'scarecrow', from: [0, 0], to: [3, 3] });
  assert.deepEqual(s.scarecrows, [[3, 3]]);
});

test('winter watering and care are limited to heated greenhouse targets', () => {
  let s = farm(); date(s, yearLen(s)); s.temps = s.temps.map(() => -8);
  s.levels.greenhouse = 3; tile(s, 2, 2).structure = 'greenhouse'; plant(s, 'tomato', 2, 2, { grown: 0 }); tile(s, 2, 2).moisture = 0;
  assert.throws(() => apply(s, { t: 'waterHand', tiles: [[1, 2]] }));
  s = apply(s, { t: 'waterHand', tiles: [[2, 2]] }); assert.equal(tile(s, 2, 2).moisture, 2);
  s.days = 4; tile(s, 2, 2).moisture = 0;
  const uid = card(s, 'water'); assert.equal(cardBlockReason(s, { def: 'water' }), null);
  s = apply(s, { t: 'play', uid, tiles: [[2, 2]] });
  assert.equal(tile(s, 2, 2).moisture, 2); assert.equal(tile(s, 1, 2).moisture, 3);
});

test('sales preserve all accepted order reservations unless explicitly overridden', () => {
  const s = farm(); s.storage = [{ crop: 'radish', qty: 12, age: 0 }]; s.orgs.bakery!.active = quest(s, 10);
  assert.equal(reservedStock(s, 'radish'), 10); assert.equal(freeStock(s, 'radish'), 2);
  let next = apply(s, { t: 'sell', crop: 'radish', qty: 5 }); assert.equal(stockOf(next, 'radish'), 10);
  assert.throws(() => apply(next, { t: 'sell', crop: 'radish', qty: 100 }));
  next = apply(next, { t: 'sell', crop: 'radish', qty: 100, allowReserved: true }); assert.equal(stockOf(next, 'radish'), 0);
});

test('free barn space rescues yard produce before reseller sale', () => {
  const s = farm(); s.yard = [{ crop: 'radish', qty: 7, age: 0, bornWeek: s.absWeek - 1 }];
  const next = endWeek(s); assert.equal(next.yard.length, 0); assert.equal(stockOf(next, 'radish'), 7); assert.equal(next.lastReport!.yardSold, 0);
});

test('early and normal overflow both spend a full following week in the yard', () => {
  for (const early of [false, true]) {
    const s = farm(); s.pets = ['cat']; s.storage = [{ crop: 'wheat', qty: storageCap(s), age: 0 }]; plant(s, 'radish');
    const harvested = early ? apply(s, { t: 'play', uid: card(s, 'early'), tiles: [[2, 2]] }) : s;
    const next = endWeek(harvested); assert.ok(next.yard.length); assert.equal(next.lastReport!.yardSold, 0);
    const sold = endWeek(next); assert.equal(sold.yard.length, 0); assert.ok(sold.lastReport!.yardSold > 0);
  }
});

test('forecast current point exactly matches noisy market price without uncertainty', () => {
  const s = farm(); s.noise.bean = .12;
  assert.deepEqual([forecast(s, 'bean', 0).price, forecast(s, 'bean', 0).low, forecast(s, 'bean', 0).high], Array(3).fill(marketPrice(s, 'bean')));
});

test('forecast crosses the year using next year demand, inflation and expired effects', () => {
  let s = farm(); date(s, yearLen(s)); s.levels.meteo = 3; s.effects = [{ kind: 'review', mult: .9, weeks: 1 }];
  assert.equal(sellMult(s, 'bean', 1), 1);
  const predicted = priceAt(s, 'bean', 1, false);
  s = endWeek(s); assert.equal(s.year, 2);
  assert.equal(predicted, priceAt(s, 'bean', 0, false));
});

test('manual and emergency intermediate summer payments do not count a full clean season', () => {
  for (const payment of ['pay', 'emergency'] as const) {
    let s = farm(); date(s, paymentSchedule(s).find((p) => p.season === 1 && p.part === 1)!.week); s.cleanSeasons = 2; s.money = 0;
    s = endWeek(s); assert.equal(s.phase, 'shortfall'); assert.equal(s.due!.seasonEnd, false);
    if (payment === 'pay') s.money = 10000;
    s = apply(s, { t: payment });
    assert.equal(s.rating, payment === 'pay' ? 2 : 1); assert.ok(s.cleanSeasons !== 3);
  }
});

test('week preview uses the real dry reset, frost, growth and operating costs', () => {
  let s = farm(); plant(s, 'radish', 2, 2, { grown: 1, dry: 1 }); tile(s, 2, 2).moisture = 0;
  s = apply(s, { t: 'waterHand', tiles: [[2, 2]] });
  const preview = weekOutlook(s), actual = endWeek(s).lastReport!;
  assert.equal(preview.ripe, 1); assert.equal(preview.ripe, actual.harvests.length); assert.equal(preview.dying, actual.dried);
  assert.equal(preview.costs, actual.costs.reduce((n, c) => n + c.amount, 0));
});

test('ripening forecast checks lethal frost before growth and expires mulch protection', () => {
  const s = farm('altai'); plant(s, 'potato', 2, 2, { grown: 1 }); s.temps[0] = -1; s.levels.clearing = 3;
  Object.assign(tile(s, 2, 2), { soil: 5, mulch: 1, terrain: 'sand', cleared: true });
  assert.equal(ripenIn(s, 2, 2), null); assert.equal(endWeek(s).lastReport!.frost, 1);
  const warm = farm(); plant(warm, 'potato', 2, 2, { grown: 1 }); tile(warm, 2, 2).mulch = 1; warm.temps[0] = 6; warm.temps[1] = -1;
  assert.equal(ripenIn(warm, 2, 2), null);
});

test('heating completed at week end is billed starting the following week', () => {
  let s = farm(); date(s, yearLen(s) - 2); s.levels.greenhouse = 2; tile(s, 2, 2).structure = 'greenhouse';
  // v3 · in winter a building site moves at half pace: half a week of work is left
  s.projects = [{ kind: 'track', track: 'greenhouse', level: 3, weeks: 0.5, total: 1 }];
  assert.equal(weekOutlook(s).costs, 0); s = endWeek(s);
  assert.equal(s.lastReport!.costs.reduce((n, c) => n + c.amount, 0), 0);
  assert.equal(weeklyCosts(s).heating, 2); s = endWeek(s); assert.equal(s.lastReport!.costs.find((c) => c.label.includes('отопление'))!.amount, 2);
});

test('greenhouse complex delivers the promised 1.5 multiplier', () => {
  const s = farm(); s.levels.greenhouse = 4; tile(s, 2, 2).structure = 'greenhouse'; plant(s, 'tomato'); assert.equal(expectedYield(s, 2, 2), 9);
});

test('mulch protects water for three full weeks and expires on the fourth', () => {
  let s = farm(); tile(s, 2, 2).mulch = 3;
  for (let i = 0; i < 3; i++) { s = endWeek(s); assert.equal(tile(s, 2, 2).moisture, 3); }
  s = endWeek(s); assert.equal(tile(s, 2, 2).moisture, 2);
});

test('perennial regrowth uses the full current cycle requirement', () => {
  for (const [id, need] of [['seabuckthorn', 10], ['cranberry', 8]] as const) {
    let s = farm(); date(s, yearLen(s)); plant(s, id, 2, 2, { rest: true, years: 2 });
    s = endWeek(s); const p = tile(s, 2, 2).crop!; assert.equal(p.regrowing, true); assert.equal(p.grown, 0); assert.equal(targetGrow(s, p), need);
  }
});

test('occupied cranberry swamp cannot be drained', () => {
  const s = farm('altai'); tile(s, 2, 2).terrain = 'swamp'; plant(s, 'cranberry');
  assert.equal(canClear(s, 2, 2), false); assert.throws(() => apply(s, { t: 'clear', x: 2, y: 2 }));
});

test('bean preview sums overlapping neighbours exactly as harvest does', () => {
  const s = farm(); plant(s, 'bean', 1, 2); plant(s, 'bean', 3, 2);
  const gain = beanGain(s, [[1, 2], [3, 2]]).get('2,2'); const before = tile(s, 2, 2).soil;
  assert.equal(gain, 2); const next = endWeek(s); assert.equal(tile(next, 2, 2).soil - before, gain);
});

test('care and snow reject already ineffective targets without consuming a card', () => {
  const s = farm(); plant(s, 'strawberry', 2, 2, { rest: true });
  assert.equal(playableTargets(s, 'care').length, 0); assert.throws(() => apply(s, { t: 'play', uid: card(s, 'care'), row: 2 }));
  date(s, yearLen(s)); for (const t of s.tiles) if (t.owned) t.snow = true;
  assert.equal(playableTargets(s, 'snow').length, 0); assert.throws(() => apply(s, { t: 'play', uid: card(s, 'snow'), row: 2 }));
});

test('ready compost stays in the pit through a full-hand season change until claimed', () => {
  let s = farm(); s.levels.compost = 1; s.compostTick = 2;
  const n = deckCount(s); s.discard.push(...s.hand); s.hand = []; s = endWeek(s);
  assert.equal(s.compostReady,true);
  // the refill leaves the hand full: the compost takes the place of a card the player gives up
  assert.throws(()=>apply(s,{t:'claimCompost'}),/место/); s=apply(s,{t:'claimCompost',uid:s.hand[0].uid});
  assert.ok(s.hand.some(c=>c.def==='compost'&&c.temp));assert.equal(deckCount(s),n);
  date(s,LOCATIONS[s.loc].seasons[0]);s=endWeek(s);
  assert.ok([...s.hand,...s.draw,...s.discard].some(c=>c.temp&&c.def==='compost'));assert.equal(deckCount(s),n);
});

test('storage lifetime includes greenhouse worker and mice aggregate all grain batches', () => {
  const s = farm(); s.team.push({ id: 'greenhouser', level: 3, away: 0 }); assert.equal(storageKeepWeeks(s, 'tomato'), 3);
  const a = farm(); a.storage = [{ crop: 'wheat', qty: 18, age: 0 }];
  const b = farm(); b.storage = [{ crop: 'wheat', qty: 9, age: 0 }, { crop: 'wheat', qty: 9, age: 1 }];
  const x = endWeek(a), y = endWeek(b); assert.equal(stockOf(x, 'wheat'), 17); assert.equal(stockOf(y, 'wheat'), 17); assert.equal(y.stats.lostUnits, 1);
});

test('unavailable story honey waits for apiary instead of changing into radish', () => {
  let s = farm('altai'); const org = s.orgs.apiarists!; org.step = ORGS.apiarists.steps.findIndex((q) => q.crops.length === 1 && q.crops[0] === 'honey'); org.wait = 0;
  assert.ok(org.step >= 0); s = endWeek(s); assert.equal(s.orgs.apiarists!.offer, null);
  s.levels.apiary = 3; s = endWeek(s); assert.equal(s.orgs.apiarists!.offer, null);
  tile(s, 2, 2).structure = 'hive'; s = endWeek(s); assert.equal(s.orgs.apiarists!.offer!.lines[0].crop, 'honey');
});

test('ignored offer expires without lowering relations', () => {
  let s = farm(); s.orgs.bakery!.offer = quest(s, 10); s.orgs.bakery!.rel = -38; s.orgs.bakery!.idle = IGNORED_OFFER_WEEKS;
  s = endWeek(s); assert.ok(s.orgs.bakery!.rel >= -38);
  s = endWeek(s); assert.ok(s.orgs.bakery!.rel >= -38);
});

test('newly hired watchman and newly placed greenhouse block already announced thieves', () => {
  for (const defense of ['watchman', 'greenhouse'] as const) {
    let s = farm(); plant(s, 'radish', 2, 2, { grown: 0 });
    s.thieves = { week: s.absWeek, targets: [{ x: 2, y: 2, pid: tile(s, 2, 2).crop!.pid }], talked: false };
    if (defense === 'watchman') { s.candidates = ['watchman']; s = apply(s, { t: 'hire', id: 'watchman' }); }
    else { s.levels.greenhouse = 1; s = apply(s, { t: 'build', item: 'greenhouse', x: 2, y: 2 }); }
    assert.equal(weekOutlook(s).thieves, 0); const next = endWeek(s);
    assert.equal(next.lastReport!.stolen, 0); assert.ok(tile(next, 2, 2).crop);
  }
});

test('a free worker remains available after seasonal candidate refresh', () => {
  let s = farm(); date(s, LOCATIONS[s.loc].seasons[0]); s.freeHire = ['agronomist']; s.candidates = ['agronomist'];
  s = endWeek(s); assert.ok(s.candidates.includes('agronomist'));
  const before = s.money; s = apply(s, { t: 'hire', id: 'agronomist' }); assert.equal(s.money, before);
});

test('simultaneously finishing variety cannot consume a returning card reservation', () => {
  let s = farm(); const card = s.draw.pop()!; const n = deckCount(s) + 1;
  s.projects = [{ kind: 'variety', crop: 'strawberry', weeks: 1, total: 1 }, { kind: 'trait', card, trait: 'cold', origin: 'deck', weeks: 1, total: 1 }];
  assert.equal(deckCount(s), n); s = endWeek(s);
  assert.equal(deckCount(s), n); assert.ok(s.spare.some((c) => c.def === 'seed_strawberry'));
  assert.ok([...s.hand, ...s.draw, ...s.discard].some((c) => c.uid === card.uid));
});

test('preview threat list applies weather before pests regardless of warning order', () => {
  const s = farm(); plant(s, 'potato', 2, 2, { grown: 0 }); const pid = tile(s, 2, 2).crop!.pid;
  s.strikes = [{ kind: 'locust', ep: 1, week: s.absWeek, cells: [[2, 2, pid]], zone: false }, { kind: 'hail', ep: 2, week: s.absWeek, cells: [[2, 2, pid]], zone: false }];
  assert.deepEqual(weekOutlook(s).threats.map(t=>t.name), ['Град','Саранча']);
});


test('seed card gives the base requirement without a target, and local heated winter timing with a target', () => {
  const s = farm(); date(s, yearLen(s) - 2); s.temps = s.temps.map(() => -8);
  assert.equal(seedWeeks(s, 'tomato'), 3); assert.equal(cardStat(s, 'seed_tomato').sub, 'рост 3 нед.');
  s.levels.greenhouse = 3; tile(s, 2, 2).structure = 'greenhouse';
  const before = structuredClone(s); assert.equal(seedWeeks(s, 'tomato', [], [[2, 2]]), 3);
  assert.equal(seedWeeks(s, 'tomato', [], [[1, 2]]), null); assert.deepEqual(s, before);
});

test('local planting advice is unaffected by undisclosed future frost or warm episodes', () => {
  const a = farm(); const b = structuredClone(a);
  b.plan.push({ id: 888, kind: 'frost', start: b.absWeek + 3, len: 1 }); b.temps[3] = -12;
  assert.equal(seedWeeks(a, 'pumpkin', [], [[2, 2]]), seedWeeks(b, 'pumpkin', [], [[2, 2]]));
});

test('card statistics reflect combine and soil scientist modifiers', () => {
  const s = farm(); s.levels.machinery = 3; s.team.push({ id: 'soilsci', level: 2, away: 0 });
  assert.equal(cardStat(s, 'early').main, '100%'); assert.equal(cardStat(s, 'compost').main, '+2'); assert.equal(cardStat(s, 'bio').main, '+2');
});

test('scene hides plants and weeds during lenses or building while preserving equipment and state', () => {
  const s = farm(); plant(s, 'radish'); tile(s, 1, 1).weeds = true; tile(s, 2, 2).structure = 'greenhouse'; s.scarecrows = [[1, 1]];
  const before = structuredClone(s);
  const props = { s, highlight: { rows: false, tiles: new Set<string>(), selected: new Set<string>(), area: new Set<string>() }, onTile: () => {}, onCorner: () => {}, hoverTile: null, onHover: () => {}, farmer: { pos: { kind: 'home' as const }, walking: false, action: 'idle' as const, facing: 1 as const, ms: 0, bubble: null }, floaters: [] };
  const normal = render(h(Scene, props)); assert.match(normal, /class="plant/); assert.match(normal, /class="weeds"/);
  for (const mode of [{ lens: 'water' as const }, { build: { item: 'scarecrow', spots: new Set<string>(), rows: false, corners: true, removable: new Set(['1,1']) } }]) {
    const html = render(h(Scene, { ...props, ...mode }));
    assert.doesNotMatch(html, /class="plant/); assert.doesNotMatch(html, /class="weeds"/); assert.match(html, /scarecrow-spot/);
    if ('build' in mode) { assert.match(html, /aria-label="Переместить пугало/); assert.match(html, /aria-pressed="true"/); assert.doesNotMatch(html, /remove-mark/); }
  }
  assert.deepEqual(s, before);
});
