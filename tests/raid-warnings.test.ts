import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine/game';
import * as D from '../src/engine/data';
import { testFixture, testDate } from '../src/engine/testLab';
import { kidsScouting, kidsAhead } from '../src/ui/foresight';
import type { EpisodeKind } from '../src/engine/calendar';

// a calm summer farm with a growing potato patch and young sprouts
function summer(scout = false) {
  const s = testFixture('normal', 'chernozem');
  testDate(s, 1);
  s.money = 10000; s.plan = []; s.temps.fill(20);
  if (scout) s.levels.drone = 1;
  for (const t of s.tiles) if (t.owned) { t.moisture = 3; t.weeds = false; }
  const owned = G.ownedTiles(s).map(([, x, y]) => [x, y] as [number, number]);
  owned.slice(0, 3).forEach(([x, y], i) => { G.tile(s, x, y).crop = { id: 'potato', grown: 1, pid: 500, mult: 1, bonus: 0, planted: s.absWeek - 1 }; void i; });
  owned.slice(3, 5).forEach(([x, y], i) => { G.tile(s, x, y).crop = { id: 'bean', grown: 0, pid: 600 + i, mult: 1, bonus: 0, planted: s.absWeek }; });
  return s;
}
const ep = (kind: EpisodeKind, start: number, len = 1) => ({ id: 7000 + start, kind, start, len });

test('pests are not in the weather forecast; beetles show a week before they eat, two with the scout drone', () => {
  for (const scout of [false, true]) {
    let s = summer(scout);
    const start = s.absWeek + 3;
    s.plan = [ep('beetle', start, 2), ep('rain', start, 2)];
    assert.ok(!G.knownEpisodes(s).some((e) => e.kind === 'beetle'));
    assert.ok(G.knownEpisodes({ ...s, levels: { ...s.levels, meteo: 3 } }).some((e) => e.kind === 'rain'));
    const declared: number[] = [];
    for (let i = 0; i < 5; i++) {
      s = G.endWeek(s);
      if (s.phase === 'shortfall') s = G.apply(s, { t: 'pay' });
      const st = s.strikes.find((x) => x.kind === 'beetle');
      if (st && !declared.length) declared.push(st.week - s.absWeek);
    }
    assert.deepEqual(declared, [scout ? 2 : 1]);
  }
});

test('locust waves and weeds are announced a week before each strike', () => {
  let s = summer();
  const start = s.absWeek + 2;
  s.plan = [ep('locust', start, 3), ep('weedsurge', start + 4)];
  const seen = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    s = G.endWeek(s);
    if (s.phase === 'shortfall') s = G.apply(s, { t: 'pay' });
    for (const st of s.strikes) {
      const k = `${st.kind}@${st.week}`;
      if (!seen.has(k)) seen.set(k, st.week - s.absWeek);
    }
  }
  for (const [k, ahead] of seen) assert.equal(ahead, 1, k);
  assert.ok([...seen.keys()].some((k) => k.startsWith('locust')));
});

test('a flock is decided once and circles a week before it lands; the drone shows it two weeks ahead', () => {
  for (const scout of [false, true]) {
    let found = false;
    for (let seed = 0; seed < 40 && !found; seed++) {
      let s = summer(scout);
      s.seed = `FLOCK-${seed}`;
      // young beans everywhere: sprouts draw the flock, and by its week they are ripening
      for (const [t] of G.ownedTiles(s)) t.crop = { id: 'bean', grown: 0, pid: 800, mult: 1, bonus: 0, planted: s.absWeek };
      const week = s.absWeek + (scout ? 3 : 2);
      s.plan = [ep('crows', week)];
      for (let i = 0; i < 3; i++) {
        s = G.endWeek(s);
        if (s.phase === 'shortfall') s = G.apply(s, { t: 'pay' });
        if (s.crowWarn?.includes(week)) {
          assert.equal(week - s.absWeek, scout ? 2 : 1);
          found = true;
          while (s.absWeek < week) {
            // keep food on the field for its arrival: fresh sprouts on the eve of the landing
            if (s.absWeek === week - 1) for (const [t] of G.ownedTiles(s)) t.crop = { id: 'bean', grown: 0, pid: 900, mult: 1, bonus: 0, planted: s.absWeek };
            s = G.endWeek(s); if (s.phase === 'shortfall') s = G.apply(s, { t: 'pay' });
          }
          assert.ok(s.crows && s.crows.week === s.absWeek, 'the announced flock lands on its week');
          break;
        }
      }
    }
    assert.ok(found, `a flock was announced (scout=${scout})`);
  }
});

test('angry children are seen at the field a week before the raid and come for ripe beds', () => {
  let found = false;
  for (let seed = 0; seed < 40 && !found; seed++) {
    let s = summer();
    s.seed = `KIDS-${seed}`;
    for (const t of s.tiles) if (t.crop) t.crop.grown = Math.max(0, G.targetGrow(s, t.crop) - 3);
    for (const o of D.LOCATIONS[s.loc].orgs) if (D.ORGS[o].mischief === 'thieves' && s.orgs[o]) s.orgs[o]!.rel = -50;
    s = G.endWeek(s);
    if (s.phase === 'shortfall') s = G.apply(s, { t: 'pay' });
    if (!kidsScouting(s)) continue;
    found = true;
    assert.equal(kidsAhead(s), 1);
    const next = G.endWeek(s);
    assert.ok(next.thieves && next.thieves.week === next.absWeek, 'the raid comes on the announced week');
  }
  assert.ok(found);
});
