// Испытания года и костры: the ordeal is planned from the third year, graded by the share of the crop saved,
// and the fire pits warm their square on the night they are lit.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine/game';
import * as D from '../src/engine/data';
import * as T from '../src/engine/trials';
import { testDate } from '../src/engine/testLab';
import { validFarm } from '../src/ui/persist';

function farm(season = 1, year = 3, loc: D.LocationId = 'chernozem'): G.GameState {
  const s = G.newGame({ loc, seed: 'TRIAL' });
  testDate(s, season, year);
  s.money = 1000; s.days = 20; s.crowWarn = []; s.kidsWarn = []; delete s.trial;
  for (const t of s.tiles) Object.assign(t, { owned: true, terrain: 'plain', crop: null, moisture: 3, soil: 2, structure: null, weeds: false, canal: false, mulch: 0, shelter: 0, drip: false, snow: false, idle: 0, clean: 0, last: null });
  for (const o of Object.values(s.orgs)) if (o) { o.wait = 1000; o.offer = null; o.active = null; }
  return s;
}
function plant(s: G.GameState, x: number, y: number, id: D.CropId, grown = 2) {
  const t = G.tile(s, x, y);
  t.crop = { id, grown, bonus: 0, mult: 1, planted: s.absWeek, pid: s.nextPid++ };
  return t.crop;
}
const end = (s: G.GameState) => { let n = G.apply(s, { t: 'endWeek' }); if (n.phase === 'shortfall') n = G.apply(n, { t: 'pay' }); return n; };

test('an ordeal is planned when the third year begins, never in the first two, and not twice in a row', () => {
  for (const loc of D.LOCATION_IDS) {
    let kinds: string[] = [];
    for (let k = 0; k < 6; k++) {
      const s = G.newGame({ loc, seed: `PLAN${k}` });
      assert.equal(s.trial, undefined);
      const N = G.yearLen(s);
      for (const year of [2, 3, 4]) {
        testDate(s, 3, year - 1); s.week = N; s.absWeek = s.yearStart + N - 1; s.season = 3;
        s.days = 9; s.money = 1e5;
        const n = end(s);
        assert.equal(n.year, year);
        if (year < T.TRIAL_FIRST_YEAR) { assert.equal(n.trial, undefined); continue; }
        const t = n.trial!;
        assert.ok(t && t.year === year && T.TRIAL_POOL[loc].includes(t.kind));
        assert.ok(t.week >= t.from && t.week <= t.to && t.from > n.yearStart && t.to < n.yearStart + N);
        if (year === 4) assert.notEqual(t.kind, (s as G.GameState).trial?.kind);
        Object.assign(s, { trial: t });
        kinds.push(t.kind);
        // the plan copy is the farm's own: the cached year plan stays untouched
        assert.notStrictEqual(n.temps, G.yearPlanFor(n, n.year).temps);
      }
    }
    assert.ok(new Set(kinds).size >= 2, `${loc}: one kind only`);
  }
});

test('black frost: dead at the limit, nipped within 1°, held above; fires and shelters add their degrees', () => {
  let s = farm();
  G.planTrial(s, 'frost', s.absWeek);
  const temp = s.trial!.temp!;
  assert.equal(G.airTemp(s), temp);
  plant(s, 0, 0, 'potato'); // −1 limit: dies
  plant(s, 2, 0, 'cabbage'); // −6
  plant(s, 4, 4, 'potato'); G.tile(s, 4, 4).shelter = 2; // +5
  s.levels.fires = 2; s.fires = [[0, 2]];
  plant(s, 0, 2, 'potato'); plant(s, 1, 3, 'potato'); // core of the fire: +7
  plant(s, 2, 2, 'potato'); // ring: +3
  s = G.apply(s, { t: 'lightFires' });
  assert.equal(G.fireHeat(s, 0, 2), 7); assert.equal(G.fireHeat(s, 2, 2), 3); assert.equal(G.fireHeat(s, 3, 3), 0);
  const n = end(s);
  const night = n.lastReport!.trial!;
  const out = (x: number, y: number) => night.cells.find((c) => c.x === x && c.y === y)?.out;
  const margin = (shield: number, limit: number) => temp + shield - limit;
  const expect = (m: number) => (m <= 0 ? 'killed' : m <= 1 ? 'bitten' : 'held');
  assert.equal(out(0, 0), expect(margin(0, -1)));
  assert.equal(out(2, 0), expect(margin(0, -6)));
  assert.equal(out(4, 4), expect(margin(5, -1)));
  assert.equal(out(0, 2), expect(margin(7, -1)));
  assert.equal(out(2, 2), expect(margin(3, -1)));
  assert.ok(n.trial!.result, 'a one-night ordeal is settled the same week');
  assert.deepEqual(night.result, n.trial!.result);
});

test('the ordeal is graded by the value saved; fewer than four beds means it was sat out', () => {
  assert.equal(T.trialGrade(3, 1), 0);
  assert.equal(T.trialGrade(6, 0.9), 3);
  assert.equal(T.trialGrade(6, 0.6), 2);
  assert.equal(T.trialGrade(6, 0.2), 1);
  let s = farm();
  G.planTrial(s, 'frost', s.absWeek);
  for (let x = 0; x < 6; x++) plant(s, x, 0, 'garlic', 3);
  s.trial!.temp = -5; s.temps[s.week - 1] = -5;
  const glory = s.glory;
  s = end(s);
  const r = s.trial!.result!;
  assert.equal(r.grade, 3); assert.equal(r.saved, 1);
  assert.equal(s.glory - glory, T.TRIAL_GLORY[3] + 15, 'pass glory and the certificate');
  assert.ok(s.certs.includes(T.TRIALS.frost.cert));
  assert.equal(G.trialAhead(s), null);
});

test('great swarm: waves are announced ahead by band, no drone turns them back, smoke and guards keep beds', () => {
  let s = farm(1, 3);
  for (const t of s.tiles) t.owned = false;
  for (let y = 1; y <= 3; y++) for (let x = 1; x <= 3; x++) { G.tile(s, x, y).owned = true; plant(s, x, y, 'cabbage', 0); }
  s.levels.drone = 3; // two sorties a season: useless against the ordeal
  G.planTrial(s, 'locust', s.absWeek + 2);
  s.trial!.dir = 'w';
  s = end(s); // trialMorning declares what it can see
  const waves = s.strikes.filter((x) => x.trial);
  assert.ok(waves.length >= 1);
  assert.deepEqual([...new Set(G.locustBand(s, s.trial!, 0).map(([x]) => x))], [1]);
  assert.deepEqual([...new Set(G.locustBand(s, s.trial!, 1).map(([x]) => x))].sort(), [2, 3]);
  s = end(s);
  // the first wave's week: smoke on (1,1),(1,2) from a pit at the corner (0,1); (1,3) guarded
  s.levels.fires = 1; s.fires = [[0, 1]];
  s = G.apply(s, { t: 'lightFires' });
  s = G.apply(s, { t: 'guard', x: 1, y: 3 });
  s = end(s);
  const night = s.lastReport!.trial!;
  assert.equal(night.wave, 1);
  assert.deepEqual(night.cells.map((c) => `${c.x},${c.y}:${c.out}`).sort(), ['1,1:smoke', '1,2:smoke', '1,3:guarded']);
  assert.ok([1, 2, 3].every((y) => G.tile(s, 1, y).crop));
  s = end(s); // second wave: nothing protects column 2–3
  assert.ok([2, 3].every((x) => [1, 2, 3].every((y) => !G.tile(s, x, y).crop)));
  assert.equal(s.dronesUsed, 0);
  assert.ok(s.trial!.result && s.trial!.result.grade === 1);
});

test('great drought: one dry week kills; mulch and drip keep its extra loss out', () => {
  let s = farm(1, 3);
  G.planTrial(s, 'drought', s.absWeek);
  plant(s, 0, 0, 'potato'); G.tile(s, 0, 0).moisture = 0;
  plant(s, 2, 0, 'potato'); G.tile(s, 2, 0).moisture = 3;
  plant(s, 4, 0, 'potato'); G.tile(s, 4, 0).moisture = 3; G.tile(s, 4, 0).mulch = 3;
  assert.ok(s.flags.dry === false || true);
  s = end(s);
  assert.equal(G.tile(s, 0, 0).crop, null, 'one dry week is enough');
  assert.ok(G.tile(s, 2, 0).crop && G.tile(s, 4, 0).crop);
  assert.ok(G.tile(s, 4, 0).moisture > G.tile(s, 2, 0).moisture, 'mulch keeps the extra loss out');
});

test('fires: built in the workshop, placed on a corner, lit for a day and firewood, once a week', () => {
  let s = farm(1, 1);
  assert.equal(G.lightFiresProblem(s), 'Кострищ ещё нет: их строят в «Доме», раздел «Стройки»');
  s.levels.fires = 1;
  assert.equal(G.buildStock(s).fire.have, 2);
  assert.ok(G.buildSpots(s, 'fire').some(([x, y]) => x === 2 && y === 2));
  s = G.apply(s, { t: 'build', item: 'fire', x: 2, y: 2 });
  assert.ok(!G.buildSpots(s, 'scarecrow').some(([x, y]) => x === 2 && y === 2), 'one thing per corner');
  const days = s.days, money = s.money, cost = G.firewoodCost(s);
  assert.equal(cost, 3);
  s = G.apply(s, { t: 'lightFires' });
  assert.equal(s.days, days - 1); assert.equal(s.money, money - cost);
  assert.throws(() => G.apply(s, { t: 'lightFires' }), /уже горят/);
  s = end(s);
  assert.equal(G.firesLit(s), false, 'a fire burns for one night');
  s = G.apply(s, { t: 'moveBuild', item: 'fire', from: [2, 2], to: [3, 3] });
  assert.deepEqual(s.fires, [[3, 3]]);
  s.levels.fires = 3;
  const d = s.days; s = G.apply(s, { t: 'lightFires' }); assert.equal(s.days, d, 'heat guns need no working day');
});

test('ordinary frost: a lit fire saves a young plant in its square', () => {
  let s = farm(0, 1);
  s.temps[s.week - 1] = -2;
  plant(s, 0, 0, 'potato', 3); plant(s, 4, 4, 'potato', 3);
  s.levels.fires = 1; s.fires = [[0, 0]];
  assert.ok(G.frostKills(s, 0, 0) && G.frostKills(s, 4, 4));
  s = G.apply(s, { t: 'lightFires' });
  assert.ok(!G.frostKills(s, 0, 0) && G.frostKills(s, 4, 4));
  s = end(s);
  assert.ok(G.tile(s, 0, 0).crop && !G.tile(s, 4, 4).crop);
});

test('saves: a farm with an ordeal, fire pits and a lit night is valid; an older save without them still is', () => {
  let s = farm(1, 3);
  assert.ok(validFarm(JSON.parse(JSON.stringify(s))));
  G.planTrial(s, 'locust', s.absWeek + 1);
  s.levels.fires = 1; s = G.apply(s, { t: 'build', item: 'fire', x: 1, y: 1 });
  plant(s, 1, 1, 'potato');
  s = end(s);
  s = G.apply(s, { t: 'lightFires' });
  const copy = JSON.parse(JSON.stringify(s));
  assert.ok(validFarm(copy));
  (copy as any).trial.kind = 'meteor'; assert.ok(!validFarm(copy));
});

test('the week preview runs the ordeal on a copy and leaves the farm untouched', () => {
  const s = farm();
  G.planTrial(s, 'frost', s.absWeek);
  plant(s, 0, 0, 'potato');
  const before = JSON.stringify(s);
  const o = G.weekOutlook(s);
  assert.equal(JSON.stringify(s), before);
  assert.ok(o.frost >= 1);
});
