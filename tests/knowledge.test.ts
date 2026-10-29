// 28.10 · knowledge of the crops on the profile (docs/PROGRESSION-v3.md §8): harvests teach, levels open the lab's
// cells and traits, a well-known crop is sown cheaper, the fifth level is a certificate; the lab's new prices.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine/game';
import * as K from '../src/engine/knowledge';
import { emptyProfile, syncFarm, syncProfile, farmRunId, knowElsewhere } from '../src/ui/persist';

const home = (seed = 'KN-2810') => {
  const s = G.newGame({ loc: 'chernozem', seed });
  s.money = 1e4; s.plan = []; s.strikes = []; s.crowWarn = []; s.kidsWarn = [];
  return s;
};
const seedCard = (s: G.GameState, def = 'seed_potato') => { const c = { uid: s.nextUid++, def }; s.spare.push(c); return c; };

test('levels: 20 / 60 / 150 / 300 / 600 units', () => {
  assert.deepEqual([0, 19, 20, 59, 60, 149, 150, 300, 599, 600, 5000].map(K.knowLevelOf), [0, 0, 1, 1, 2, 2, 3, 4, 4, 5, 5]);
  const s = home();
  s.knowBase = { potato: 50 }; s.crops = { potato: 12 };
  assert.equal(G.cropKnow(s, 'potato'), 62);
  assert.equal(G.knowLevel(s, 'potato'), 2);
});

test('a harvest teaches; the fifth level gives a certificate and glory once on the profile', () => {
  let s = home();
  s.knowBase = { radish: 595 };
  const t = G.tile(s, 2, 2);
  t.crop = { id: 'radish', grown: 99, bonus: 0, mult: 1, planted: s.absWeek, pid: s.nextPid++ };
  t.moisture = 3;
  const g = s.glory;
  s = G.endWeek(s);
  if (s.phase === 'shortfall') { s.money = 1e6; s = G.apply(s, { t: 'pay' }); }
  assert.ok((s.crops?.radish ?? 0) > 0);
  assert.equal(G.knowLevel(s, 'radish'), 5);
  assert.ok(s.rewardsOut.some((r) => r.id === 'know|radish|5' && r.value === K.KNOW_GLORY));
  assert.ok(s.certs.some((c) => c.includes('редис')));
  assert.ok(s.glory >= g + K.KNOW_GLORY);
});

test('the lab: a trait needs knowledge 1, a cell 2; the second trait 3, the second cell 4', () => {
  const s = home();
  s.levels.lab = 3;
  const c = seedCard(s);
  assert.match(G.traitLimit(s, c) ?? '', /знание «Картофель» 1/);
  assert.match(G.cellLimit(s, c) ?? '', /знание «Картофель» 2/);
  assert.deepEqual(G.upgradeSpots(s, c), []);
  assert.throws(() => G.apply(s, { t: 'labTrait', uid: c.uid, trait: 'cold' }), /знание/);
  s.knowBase = { potato: 60 };
  assert.equal(G.traitLimit(s, c), null);
  assert.equal(G.cellLimit(s, c), null);
  assert.ok(G.upgradeSpots(s, c).length > 0);
  const one = { ...c, traits: ['cold' as const], extra: [[1, 0] as [number, number]] };
  assert.match(G.traitLimit(s, one) ?? '', /3/);
  assert.match(G.cellLimit(s, one) ?? '', /4/);
  s.knowBase = { potato: 600 };
  assert.equal(G.cardTraitMax(s, c), 3);
  assert.equal(G.cardExtraMax(s, c), 3);
  // the lab's own level still caps it
  s.levels.lab = 1;
  assert.equal(G.cardTraitMax(s, c), 1);
});

test('lab prices: a cell 15 / 60 / 135, a trait 20 / 40 / 80, a variety 40; weeks 3/4/5, 4, 6', () => {
  const s = home();
  const c = (extra: number, traits: number): G.Card => ({ uid: 1, def: 'seed_potato', extra: Array.from({ length: extra }, (_, i) => [i + 1, 0] as [number, number]), traits: (['cold', 'fast', 'yield'] as const).slice(0, traits) as G.Card['traits'] });
  assert.deepEqual([0, 1, 2].map((k) => G.cellPrice(s, c(k, 0))), [15, 60, 135]);
  assert.deepEqual([0, 1, 2].map((k) => G.traitPrice(s, c(0, k))), [20, 40, 80]);
  assert.equal(G.varietyPrice(s), 40);
  assert.deepEqual([0, 1, 2].map((k) => G.labWeeksFor(s, 'cell', c(k, 0))), [3, 4, 5]);
  assert.equal(G.labWeeksFor(s, 'trait'), 4);
  assert.equal(G.labWeeksFor(s, 'variety'), 6);
});

test('a new variety needs knowledge 2 in three crops', () => {
  const s = home();
  s.levels.lab = 1;
  const crop = G.labCrops(s)[0];
  assert.match(G.varietyProblem(s) ?? '', /3 культур/);
  assert.throws(() => G.apply(s, { t: 'labVariety', crop }), /знание/);
  s.knowBase = { potato: 60, wheat: 60, radish: 60 };
  assert.equal(G.varietyProblem(s), null);
  const n = G.apply(s, { t: 'labVariety', crop });
  assert.ok(n.projects.some((p) => p.kind === 'variety'));
});

test('knowledge 3 sows the crop 20% cheaper', () => {
  const s = home();
  const before = G.seedCost(s, 'potato');
  s.knowBase = { potato: 150 };
  assert.ok(Math.abs(G.seedCost(s, 'potato') - before * K.KNOW_SEED_SALE) < 0.011);
});

test('the profile keeps each farm’s harvest; a farm sees what the others know, never itself twice', () => {
  const a = home('A'), b = G.newGame({ loc: 'kuban', seed: 'B', run: { cond: 'lgota' } });
  a.crops = { potato: 40 }; b.crops = { potato: 30, wheat: 10 };
  let p = syncProfile(emptyProfile(), a);
  p = syncProfile(p, b);
  assert.deepEqual(p.know?.[farmRunId(a)], { potato: 40 });
  assert.deepEqual(knowElsewhere(p, a), { potato: 30, wheat: 10 });
  const a2 = syncFarm(p, a);
  assert.equal(G.cropKnow(a2, 'potato'), 70);
  assert.equal(G.knowLevel(a2, 'potato'), 2);
  // nothing changed: the same objects come back
  assert.equal(syncProfile(p, a), p);
  assert.equal(syncFarm(p, a2).knowBase, a2.knowBase);
});
