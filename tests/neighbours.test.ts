// 28.10 · the neighbours of the home village (docs/PROGRESSION-v3.md §7): five yards in three stages built in the
// brigade's slot, swaps, «Позвать соседа», beds, the smith's forge, the shared buildings and their effects.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine/game';
import * as N from '../src/engine/neighbours';
import { validFarm } from '../src/ui/persist';

const json = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const home = (seed = 'NB-2810') => {
  const s = G.newGame({ loc: 'chernozem', seed });
  s.money = 1e5; s.plan = []; s.strikes = []; s.crowWarn = []; s.kidsWarn = [];
  s.mats = { logs: 400, bricks: 400, glass: 100 };
  for (const crop of ['potato', 'cabbage', 'wheat', 'rye', 'carrot'] as const) s.storage.push({ crop, qty: 200, age: 0 });
  return s;
};
const weeks = (s: G.GameState, n: number) => {
  for (let i = 0; i < n; i++) {
    s = G.endWeek(s);
    if (s.phase === 'shortfall') { s.money = Math.max(s.money, 1e6); s = G.apply(s, { t: 'pay' }); }
  }
  return s;
};
/** build a yard's stage and wait it out */
const stage = (s: G.GameState, y: N.YardId) => {
  s = G.apply(s, { t: 'yardBuild', yard: y });
  const p = s.projects.find((x) => x.kind === 'yard' && x.yard === y)!;
  return weeks(s, Math.ceil(p.weeks * 2) + 1);
};

test('a yard stage takes money, materials and crops, a brigade slot, and ends with glory', () => {
  let s = home();
  const before = { money: s.money, logs: s.mats!.logs, potato: G.stockOf(s, 'potato'), glory: s.glory };
  s = G.apply(s, { t: 'yardBuild', yard: 'zina' });
  assert.equal(s.mats!.logs, before.logs - 8);
  assert.equal(G.stockOf(s, 'potato'), before.potato - 10);
  assert.ok(s.money < before.money);
  assert.equal(G.workshopBusy(s), 1);
  assert.match(G.yardProblem(s, 'savva') ?? '', /Бригада занята/);
  assert.match(G.trackProblem(s, 'barn') ?? '', /занята/);
  s = weeks(s, 8);
  assert.equal(G.yardStage(s, 'zina'), 1);
  assert.ok(s.glory >= before.glory + 10);
  assert.ok(validFarm(json(s)));
});

test('crops a stage needs must be in the barn; grain is any of wheat, rye, buckwheat', () => {
  let s = home();
  s.storage = s.storage.filter((l) => l.crop !== 'potato');
  assert.match(G.yardProblem(s, 'zina') ?? '', /картофеля/);
  s = stage(s, 'savva');
  const grain = G.stockOf(s, 'wheat') + G.stockOf(s, 'rye');
  s = G.apply(s, { t: 'yardBuild', yard: 'savva' });
  assert.equal(G.stockOf(s, 'wheat') + G.stockOf(s, 'rye'), grain - 20);
});

test('only at home: no neighbours on an expedition', () => {
  const s = G.newGame({ loc: 'kuban', seed: 'NB', run: { cond: 'lgota' } });
  assert.match(G.yardProblem(s, 'zina') ?? '', /дома/);
  assert.equal(G.lodging(s), 0);
});

test('swaps: once a season, Зина weekly from her second stage; each gives its own', () => {
  let s = stage(home(), 'zina');
  assert.equal(G.swapProblem(s, 'savva', 'wheat')?.includes('первой стадии'), true);
  const hand = s.hand.length + s.discard.length;
  s = G.apply(s, { t: 'yardSwap', yard: 'zina', crop: 'potato', card: 'compost' });
  assert.equal(s.hand.length + s.discard.length, hand + 1);
  assert.match(G.swapProblem(s, 'zina', 'potato') ?? '', /сезоне/);
  s = stage(s, 'zina');
  // a new week: weekly now
  assert.equal(G.swapProblem(s, 'zina', 'potato'), null);
  s = G.apply(s, { t: 'yardSwap', yard: 'zina', crop: 'cabbage', card: 'mulch' });
  assert.match(G.swapProblem(s, 'zina', 'potato') ?? '', /неделе/);
  s = weeks(s, 1);
  assert.equal(G.swapProblem(s, 'zina', 'potato'), null);
  assert.throws(() => G.apply(s, { t: 'yardSwap', yard: 'zina', crop: 'wheat', card: 'mulch' }), /не возьмёт/);

  s = stage(s, 'efim');
  const logs = s.mats!.logs;
  s = G.apply(s, { t: 'yardSwap', yard: 'efim', crop: 'potato' });
  assert.equal(s.mats!.logs, logs + 4);
  s = stage(s, 'miller');
  const m = s.money;
  s = G.apply(s, { t: 'yardSwap', yard: 'miller', crop: 'wheat' });
  assert.ok(s.money > m);
});

test('second stages: a bed each (two at the Карповы), «Позвать соседа» once a season', () => {
  let s = home();
  const beds = G.workerSlots(s);
  s = stage(stage(s, 'karpov'), 'karpov');
  assert.equal(G.workerSlots(s), beds + 2);
  s = stage(stage(s, 'zina'), 'zina');
  assert.equal(G.workerSlots(s), beds + 3);
  const d = s.days;
  s = G.apply(s, { t: 'yardHelp', yard: 'zina' });
  assert.equal(s.days, d + 1);
  assert.match(G.yardHelpProblem(s, 'zina') ?? '', /сезоне/);
  assert.match(G.yardHelpProblem(s, 'efim') ?? '', /второй стадии/);
});

test('Ефим: builds 20% faster from the second stage, a brigade slot at the third', () => {
  let s = home();
  const slots = G.workshopSlots(s), w = G.trackWeeks(s, 'barn', 1);
  s = stage(stage(s, 'efim'), 'efim');
  assert.ok(G.trackWeeks(s, 'barn', 1) <= Math.ceil(w * 0.8));
  s = stage(s, 'efim');
  assert.equal(G.workshopSlots(s), slots + 1);
});

test('the miller: grain sells 25% dearer; with the granary flour orders pay 30% more', () => {
  let s = home();
  const p = G.sellMult(s, 'wheat'), q = G.sellMult(s, 'potato');
  s = stage(stage(s, 'miller'), 'miller');
  assert.ok(Math.abs(G.sellMult(s, 'wheat') / p - 1.25) < 1e-9);
  assert.ok(Math.abs(G.sellMult(s, 'potato') / q - 1) < 1e-9);
  s = stage(s, 'miller');
  const quest = { id: 1, org: 'bakery' as const, step: 1, title: '', text: '', lines: [{ crop: 'wheat' as const, qty: 5 }], pay: 10, rel: 1, weeks: 4 };
  assert.equal(G.millFlour(s, quest), true);
  assert.equal(G.millFlour(s, { ...quest, org: 'restaurant' }), false);
});

test('Savva: fair equipment −15% at stage two, forges a level in 4 weeks for +30%', () => {
  let s = stage(stage(home(), 'savva'), 'savva');
  const line = G.forgeOfferLines(s)[0];
  assert.ok(line);
  const o = G.forgeOffer(s, line)!;
  s = G.apply(s, { t: 'forge', track: line });
  assert.match(G.forgeProblem(s, line) ?? '', /уже куёт/);
  s = weeks(s, 4);
  assert.equal(G.lvl(s, line), o.level);
  assert.equal(s.forge, undefined);
  assert.ok(validFarm(json(s)));
});

test('shared buildings open with three yards at stage two; толока; the hostel, the bridge, the pump', () => {
  let s = home();
  assert.match(G.commonProblem(s, 'hostel') ?? '', /три|3/);
  for (const y of ['zina', 'efim', 'karpov'] as const) s = stage(stage(s, y), y);
  assert.equal(G.commonsOpen(s), true);
  assert.ok(G.commonWeeks(s, 'hostel') < N.COMMONS.hostel.weeks);
  const beds = G.workerSlots(s);
  s = G.apply(s, { t: 'commonBuild', id: 'hostel' });
  s = weeks(s, 12);
  assert.equal(G.hasCommon(s, 'hostel'), true);
  assert.equal(G.workerSlots(s), beds + 2);
  assert.ok(validFarm(json(s)));
});

test('an older save without neighbours loads and plays', () => {
  const s = home();
  const old = json(s) as unknown as Record<string, unknown>;
  delete old.yards; delete old.commons; delete old.forge;
  assert.ok(validFarm(old));
  assert.equal(G.yardStage(old as unknown as G.GameState, 'zina'), 0);
});

test('review 28.10 · a level Savva is forging is not sold at the fair; a forge made pointless is refunded', () => {
  let s = stage(stage(home('NB-FORGE'), 'savva'), 'savva');
  const line = G.forgeOfferLines(s)[0];
  const o = G.forgeOffer(s, line)!;
  s = G.apply(s, { t: 'forge', track: line });
  const lot = { id: 999, kind: 'equip' as const, track: line, level: o.level, price: 1 };
  s.fair!.lots.push(lot);
  assert.match(G.fairBuyProblem(s, lot) ?? '', /Савва/);
  // the level arrives another way: Savva gives the money back
  s.levels[line] = o.level;
  const m = s.money;
  s = weeks(s, 4);
  assert.ok(s.money >= m + o.price - 1e-6 || s.feed.some((f) => f.text.includes('деньги вернул')));
});

test('review 28.10 · built-in property names are not neighbours', () => {
  const s = home();
  assert.throws(() => G.apply(s, { t: 'yardBuild', yard: 'constructor' as N.YardId }), G.GameError);
  assert.throws(() => G.apply(s, { t: 'commonBuild', id: 'toString' as N.CommonId }), G.GameError);
  assert.throws(() => G.apply(s, { t: 'yardHelp', yard: 'toString' as N.YardId }), G.GameError);
});

test('review 28.10 · an older farm gets its harvest shared out over the crops it grew', () => {
  const s = home();
  const old = json(s) as unknown as Record<string, unknown>;
  delete old.crops;
  (old as unknown as G.GameState).harvestedKinds = ['potato', 'radish'];
  (old as unknown as G.GameState).stats.harvested = 130;
  assert.ok(validFarm(old));
  const n = G.ensureV3(old as unknown as G.GameState);
  assert.deepEqual(n.crops, { potato: 65, radish: 65 });
  assert.equal(G.knowLevel(n, 'potato'), 2);
});
