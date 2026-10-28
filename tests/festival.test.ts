// 28.10 · the late game at home (docs/PROGRESSION-v3.md §9.1): the harvest festival with Пряхин once the club
// stands, its prize at the winter fair, the district rating.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine/game';
import * as D from '../src/engine/data';
import * as F from '../src/engine/festival';
import { validFarm } from '../src/ui/persist';

const json = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const home = (seed = 'FEST-2810') => {
  const s = G.newGame({ loc: 'chernozem', seed });
  s.money = 1e6; s.plan = []; s.strikes = []; s.crowWarn = []; s.kidsWarn = [];
  return s;
};
const toAutumnEnd = (s: G.GameState) => {
  const se = D.LOCATIONS[s.loc].seasons;
  const last = se[0] + se[1] + se[2];
  s.week = last; s.season = 2; s.weekInSeason = se[2]; s.absWeek = s.yearStart + last - 1;
};
const pass = (s: G.GameState) => { s = G.endWeek(s); if (s.phase === 'shortfall') { s.money = 1e6; s = G.apply(s, { t: 'pay' }); } return s; };

test('the year’s harvest is kept for the festival: units, crops, the best bed', () => {
  let s = home();
  for (const [x, y, id] of [[1, 1, 'radish'], [2, 2, 'potato'], [3, 3, 'radish']] as const) {
    const t = G.tile(s, x, y);
    t.crop = { id, grown: 99, bonus: 0, mult: 1, planted: s.absWeek, pid: s.nextPid++ };
    t.moisture = 3;
  }
  s = pass(s);
  const show = G.festShow(s);
  assert.ok(show.units > 0);
  assert.equal(show.kinds, 2);
  assert.ok(show.best > 0 && show.best <= show.units);
});

test('no club, no festival; with the club it is held at the first week of winter and judged in three', () => {
  let s = home();
  toAutumnEnd(s);
  s.yearHarvest = { year: s.year, units: 999, kinds: ['potato', 'radish', 'wheat', 'cabbage', 'carrot', 'onion'], best: 30, bestCrop: 'potato' };
  let n = pass(json(s));
  assert.equal(n.season, 3);
  assert.equal(n.fests, undefined);
  s.commons = ['club'];
  const g = s.glory;
  n = pass(s);
  assert.equal(n.fests?.length, 1);
  const f = n.fests![0];
  assert.deepEqual(f.won.sort(), ['best', 'kinds', 'units']);
  assert.equal(f.win, true);
  assert.equal(n.glory - g >= 3 * F.FEST_CAT_GLORY + F.FEST_WIN_GLORY, true);
  assert.ok(n.certs.includes(F.FEST_CERT));
  // the prize at the winter fair: Пряхин never eyes it
  const prize = n.fair!.lots.find((l) => l.prize);
  assert.ok(prize);
  assert.notEqual(n.fair!.eye, prize!.id);
  assert.ok(validFarm(json(n)));
});

test('Пряхин grows every year; a weak year loses', () => {
  const a = F.rivalShow(0), b = F.rivalShow(4);
  for (const c of F.FEST_CATS) assert.ok(b[c] >= a[c]);
  assert.ok(b.units > a.units);
  let s = home();
  toAutumnEnd(s);
  s.commons = ['club'];
  s.yearHarvest = { year: s.year, units: 50, kinds: ['potato'], best: 4 };
  s = pass(s);
  assert.equal(s.fests![0].win, false);
  assert.equal(s.fair!.lots.some((l) => l.prize), false);
});

test('the district: villages grow with the years; the farm climbs with its house, village and festivals', () => {
  const s = home();
  const t1 = G.districtTable(s);
  assert.equal(t1.length, F.DISTRICT.length + 1);
  assert.equal(G.districtPlace(s), t1.length);
  s.levels.house = 6; s.levels.barn = 3; s.levels.greenhouse = 3; s.levels.irrigation = 4;
  s.yards = { zina: { stage: 3 }, savva: { stage: 3 }, efim: { stage: 2 }, miller: { stage: 2 }, karpov: { stage: 2 } };
  s.commons = ['club', 'bridge'];
  s.fests = [{ year: 1, you: { units: 1, kinds: 1, best: 1 }, rival: { units: 0, kinds: 0, best: 0 }, won: ['units', 'kinds'], win: true, glory: 25 }];
  assert.ok(G.districtPlace(s) <= 2);
  s.year = 12;
  assert.ok(G.districtPlace(s) > 1, 'the villages keep growing');
});
