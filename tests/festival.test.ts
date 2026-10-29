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

test('before the club a show on the square (small glory, no prize); with the club the festival, judged in three', () => {
  let s = home();
  toAutumnEnd(s);
  s.yearHarvest = { year: s.year, units: 999, kinds: ['potato', 'radish', 'wheat', 'cabbage', 'carrot', 'onion', 'bean'], best: 30, bestCrop: 'potato' };
  let n = pass(json(s));
  assert.equal(n.season, 3);
  assert.equal(n.fests?.length, 1);
  assert.equal(n.fests![0].club, false);
  assert.equal(n.fests![0].win, true);
  assert.equal(n.fests![0].glory, 3 * F.SMOTR_CAT_GLORY + F.SMOTR_WIN_GLORY);
  assert.equal(n.fair!.lots.some((l) => l.prize), false);
  assert.ok(n.told?.includes('smotr-win'));
  assert.equal(G.hasAntonovka(n), false);
  s.commons = ['club'];
  const g = s.glory;
  n = pass(s);
  assert.equal(n.fests?.length, 1);
  const f = n.fests![0];
  assert.deepEqual(f.won.sort(), ['best', 'kinds', 'units']);
  assert.equal(f.win, true);
  assert.equal(n.glory - g >= 3 * F.FEST_CAT_GLORY + F.FEST_WIN_GLORY, true);
  assert.ok(n.certs.includes(F.FEST_CERT));
  assert.equal(G.hasAntonovka(n), true, 'Пряхин gives his antonovka at the first win in the club');
  // the prize at the winter fair: Пряхин never eyes it
  const prize = n.fair!.lots.find((l) => l.prize);
  assert.ok(prize);
  assert.notEqual(n.fair!.eye, prize!.id);
  assert.ok(validFarm(json(n)));
});

test('Пряхин grows for six years, then holds; a weak year loses', () => {
  const a = F.rivalShow(0), b = F.rivalShow(4);
  for (const c of F.FEST_CATS) assert.ok(b[c] >= a[c]);
  assert.ok(b.units > a.units);
  assert.deepEqual(F.rivalShow(F.RIVAL_PEAK + 7), F.rivalShow(F.RIVAL_PEAK));
  assert.ok(F.rivalShow(F.RIVAL_PEAK).units > F.rivalShow(F.RIVAL_PEAK - 1).units);
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
  s.fests = [{ club: true, year: 1, you: { units: 1, kinds: 1, best: 1 }, rival: { units: 0, kinds: 0, best: 0 }, won: ['units', 'kinds'], win: true, glory: 25 }];
  assert.ok(G.districtPlace(s) <= 2);
  s.year = 12;
  assert.ok(G.districtPlace(s) > 1, 'the villages keep growing');
});

test('29.10 · the chronicle closes with an epilogue once all seven milestones are done (a haul from each region too)', () => {
  let s = home('CHRON');
  assert.equal(G.chronicleDone(s), false);
  s.owned = true; s.levels.house = 7;
  s.yards = { zina: { stage: 2 }, savva: { stage: 2 }, efim: { stage: 2 }, miller: { stage: 2 }, karpov: { stage: 2 } };
  s.commons = ['club'];
  s.fests = [{ club: true, year: 1, you: { units: 1, kinds: 1, best: 1 }, rival: { units: 0, kinds: 0, best: 0 }, won: ['units', 'kinds'], win: true, glory: 25 }];
  assert.equal(G.chronicle(s).filter((c) => !c.done).map((c) => c.id).join(), 'first,trips');
  s.told = [...(s.told ?? []), 'district-first'];
  s.trips = [{ loc: 'rent', year: 2, loot: ['rentLogs'] }, { loc: 'kuban', year: 4, loot: [] }];
  assert.equal(G.chronicleDone(s), false);
  assert.ok(validFarm(json(s)));
  s.trips.push({ loc: 'altai', year: 5, loot: ['logs24'] });
  assert.equal(G.chronicleDone(s), true);
  toAutumnEnd(s);
  const g = s.glory;
  s = pass(s);
  assert.ok(s.told?.includes('epilogue'));
  assert.ok(s.certs.includes(F.CHRONICLE_CERT));
  assert.ok(s.glory >= g + F.CHRONICLE_GLORY);
  assert.ok(validFarm(json(s)));
});

test('29.10 · story beats: the first morning at home, once; none on the lesson farm; the rival only at home and in Заречье', () => {
  const s = home('BEATS');
  assert.ok(s.told?.includes('start'));
  assert.deepEqual(s.beats?.map((b) => b.id), ['start']);
  const k = G.newGame({ loc: 'kuban', seed: 'B', run: { cond: 'lgota' } });
  assert.ok(k.told?.includes('arrive-kuban'));
  assert.equal(k.told?.includes('start'), false);
  const old = json(s) as unknown as Record<string, unknown>;
  delete old.told; delete old.beats;
  assert.ok(validFarm(old));
});

test('29.10 · the lesson farm stays without story beats however long it is played', async () => {
  const { createTutorial } = await import('../src/engine/tutorial');
  const t = createTutorial();
  let s = t.farm;
  assert.equal(s.told, undefined);
  for (let i = 0; i < 8; i++) { s = pass(s); G.beat(s, 'rival-buy'); }
  assert.equal(s.told, undefined);
  assert.equal(s.beats, undefined);
});

test('29.10 · antonovka and «сосед» come with the first win in the club only; an older save keeps its tree', () => {
  let s = home('PACT');
  toAutumnEnd(s);
  s.commons = ['club'];
  // a save from before the show on the square: its result has no `club` field and was a festival in the club
  s.fests = [{ year: 0, you: { units: 1, kinds: 1, best: 1 }, rival: { units: 0, kinds: 0, best: 0 }, won: ['units', 'kinds'], win: true, glory: 25 }];
  assert.equal(G.hasAntonovka(s), true);
  s.yearHarvest = { year: s.year, units: 9999, kinds: ['potato', 'radish', 'wheat', 'cabbage', 'carrot', 'onion', 'bean', 'pumpkin'], best: 99 };
  s = pass(s);
  assert.equal(s.fests!.at(-1)!.win, true);
  assert.equal(s.told?.includes('fest-pact'), false);
});

test('29.10 · in the district a tie is the village’s: the farm passes a place only by being stronger', () => {
  const s = home('TIE');
  s.year = 1;
  for (const k of Object.keys(s.levels) as D.TrackId[]) s.levels[k] = 0;
  s.levels.house = 5;
  s.yards = { zina: { stage: 2 }, savva: { stage: 2 } };
  s.commons = []; s.fests = [];
  const him = () => G.districtTable(s).findIndex((r) => r.name === F.DISTRICT[0].name);
  const me = () => G.districtTable(s).findIndex((r) => r.you);
  assert.equal(G.farmStrength(s), Math.round(F.DISTRICT[0].base + F.DISTRICT[0].growth * s.year));
  assert.ok(him() < me());
  s.yards.efim = { stage: 1 };
  assert.ok(me() < him());
});

test('29.10 · a home whose chronicle closed before «Три края» keeps it closed and is not promised the epilogue again', () => {
  const s = home('OLD-EPILOGUE');
  s.told = [...(s.told ?? []), 'epilogue'];
  assert.equal(G.chronicle(s).find((c) => c.id === 'trips')!.done, true);
  assert.equal(G.tripDone(s, 'kuban'), false);
});
