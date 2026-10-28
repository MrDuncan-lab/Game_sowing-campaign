// 28.10 · progression v3, phases 2–3 (docs/PROGRESSION-v3.md): buildings take materials and time, the house grows to
// seven levels with beds for workers, the season's fair sells equipment, materials and workers against Пряхин, and
// the field itself gives materials (trees that sprout and grow, stones a flood leaves). Fields added for this are
// optional: an older save gets them on its next turn.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine/game';
import * as D from '../src/engine/data';
import { validFarm } from '../src/ui/persist';

const quiet = (loc: D.LocationId = 'chernozem', seed = 'V3-2810') => {
  const s = G.newGame({ loc, seed });
  s.money = 5000; s.plan = []; s.strikes = []; s.temps = s.temps.map(() => 15); s.crowWarn = []; s.kidsWarn = [];
  return s;
};
const toWeek = (s: G.GameState, week: number) => {
  // move the calendar inside this year without playing (the season fields follow the week)
  const { season, w } = seasonAt(s, week);
  s.week = week; s.season = season as 0 | 1 | 2 | 3; s.weekInSeason = w; s.absWeek = s.yearStart + week - 1;
};
const seasonAt = (s: G.GameState, week: number) => {
  const seasons = D.LOCATIONS[s.loc].seasons;
  let left = week;
  for (let i = 0; i < 4; i++) { if (left <= seasons[i]) return { season: i, w: left }; left -= seasons[i]; }
  return { season: 3, w: seasons[3] };
};
const lots = (s: G.GameState) => s.fair!.lots;
const play = (s: G.GameState, weeks: number) => {
  for (let i = 0; i < weeks; i++) {
    s = G.endWeek(s);
    if (s.phase === 'shortfall') { s.money = Math.max(s.money, 100000); s = G.apply(s, { t: 'pay' }); }
  }
  return s;
};

test('buildings take materials from the shed and refuse without them, without charging', () => {
  let s = quiet();
  assert.match(G.trackProblem(s, 'house')!, /Не хватает: 6 брёвен, 6 кирпича/);
  const snap = JSON.stringify(s);
  assert.throws(() => G.apply(s, { t: 'track', track: 'house' }), /Не хватает/);
  assert.equal(JSON.stringify(s), snap);
  s.mats = { logs: 10, bricks: 7, glass: 0 };
  s = G.apply(s, { t: 'track', track: 'house' });
  assert.deepEqual(s.mats, { logs: 4, bricks: 1, glass: 0 });
  assert.equal(s.projects[0].weeks, 4, 'the cellar takes four weeks');
  // the first levels of the small doors cost money only
  for (const t of ['compost', 'guard', 'apiary', 'irrigation'] as D.TrackId[]) assert.deepEqual(D.TRACKS[t].levels[0].mat ?? {}, {}, t);
});

test('the house has seven levels at home; beds, deck, slots follow v3 §5.2', () => {
  const s = quiet();
  assert.equal(D.TRACKS.house.levels.length, 7);
  const want = [[1, 14, 1, 3], [1, 16, 1, 3], [2, 18, 1, 3], [2, 20, 2, 4], [3, 22, 2, 4], [4, 24, 2, 5], [5, 24, 3, 5]];
  for (let lv = 1; lv <= 7; lv++) {
    s.levels.house = lv;
    assert.deepEqual([G.workerSlots(s), G.deckLimit(s), G.workshopSlots(s), G.questSlots(s)], want[lv - 1], `house ${lv}`);
  }
});

test('on an expedition the house is a camp of three levels', () => {
  const s = quiet('kuban');
  assert.equal(G.trackDef(s, 'house').name, 'Лагерь');
  assert.deepEqual(G.trackLevels(s, 'house').map((l) => l.name), ['Палатка', 'Времянка', 'Полевой стан']);
  s.levels.house = 3; s.mats = { logs: 99, bricks: 99, glass: 99 };
  assert.equal(G.trackProblem(s, 'house'), 'Уже лучший уровень');
  assert.equal(G.workerSlots(s), 2);
  assert.equal(G.weekDays({ ...s, season: 1 }), 4, 'the field camp gives a working day');
});

test('a building site moves at half pace in winter; the mechanic takes 15% off; helping saves a week once a week', () => {
  let s = quiet();
  s.mats = { logs: 99, bricks: 99, glass: 99 };
  s.team.push({ id: 'mechanic', level: 1, away: 0 });
  assert.equal(G.trackWeeks(s, 'house', 5), Math.ceil(10 * 0.85));
  s.team = [];
  s = G.apply(s, { t: 'track', track: 'house' });
  const before = s.projects[0].weeks, days = s.days;
  s = G.apply(s, { t: 'helpBuild', track: 'house' });
  assert.equal(s.projects[0].weeks, before - 1);
  assert.equal(s.days, days - 1);
  assert.match(G.helpProblem(s, 'house')!, /уже помогали/);
  assert.throws(() => G.apply(s, { t: 'helpBuild', track: 'house' }), G.GameError);
  // winter: half a week per week
  const w = quiet(); w.mats = { logs: 99, bricks: 99, glass: 99 };
  toWeek(w, G.yearLen(w) - 2);
  let n = G.apply(w, { t: 'track', track: 'house' });
  n = G.endWeek(n);
  assert.equal(n.projects[0].weeks, 3.5);
  // a site that ends this week anyway takes no help
  const last = quiet(); last.projects = [{ kind: 'track', track: 'barn', level: 1, weeks: 1, total: 2 }];
  assert.match(G.helpProblem(last, 'barn')!, /и так закончится/);
});

test('equipment is not built in the workshop: it is sold at the fair, the next level of a line', () => {
  const s = quiet();
  for (const t of D.EQUIPMENT) assert.equal(G.trackProblem(s, t), 'Продаётся на ярмарке');
  assert.ok(s.fair, 'the fair opens with the first spring');
  const plan = lots(s).reduce((a, l) => ({ ...a, [l.kind]: (a[l.kind] ?? 0) + 1 }), {} as Record<string, number>);
  assert.equal(lots(s).length, 6);
  assert.ok((plan.equip ?? 0) >= 2 && (plan.mat ?? 0) >= 2, JSON.stringify(plan));
  for (const l of lots(s).filter((l) => l.kind === 'equip' && !l.special)) assert.equal(l.level, G.lvl(s, l.track!) + 1);
  const e = lots(s).find((l) => l.kind === 'equip' && !l.special)!;
  const cash = s.money;
  const n = G.apply(s, { t: 'fairBuy', id: e.id });
  assert.equal(G.lvl(n, e.track!), e.level);
  assert.equal(n.money, cash - e.price);
  assert.equal(n.fair!.lots.find((l) => l.id === e.id)!.sold, 'player');
  assert.throws(() => G.apply(n, { t: 'fairBuy', id: e.id }), /Уже куплено/);
});

test('every unfinished equipment line is offered at least once a year', () => {
  for (const seed of ['A', 'B', 'C', 'D', 'E', 'F']) {
    let s = quiet('chernozem', `V3-YEAR-${seed}`);
    s.levels.house = 3; // nothing waits for the house
    const seen = new Set<D.TrackId>();
    for (let i = 0; i < G.yearLen(s); i++) {
      for (const l of lots(s)) if (l.kind === 'equip') seen.add(l.track!);
      s = play(s, 1);
    }
    assert.deepEqual([...seen].sort(), [...D.EQUIPMENT].sort(), seed);
  }
});

test('a worker comes from the fair onto a free bed; candidates no longer refresh every season', () => {
  let s = quiet();
  const w = lots(s).find((l) => l.kind === 'worker');
  assert.ok(w, 'the spring fair has a worker looking for a job');
  s.team.push({ id: w!.worker === 'foreman' ? 'agronomist' : 'foreman', level: 1, away: 0 });
  assert.equal(G.fairBuyProblem(s, w), 'Нет свободной кровати');
  s.team = [];
  s = G.apply(s, { t: 'fairBuy', id: w!.id });
  assert.equal(s.team[0].id, w!.worker);
  assert.equal(s.team[0].level, w!.wlevel ?? 1);
  // three new candidates each season are gone
  s.candidates = [];
  s = play(s, 6);
  assert.deepEqual(s.candidates, []);
});

test('Пряхин eyes a lot for a week, then may buy it; a deposit keeps it; he takes at most two a season', () => {
  let s = quiet();
  const eye = s.fair!.eye!;
  assert.ok(Number.isInteger(eye));
  // a deposit on the lot he eyes makes him look elsewhere, and keeps it to the end of next week
  const lot = lots(s).find((l) => l.id === eye)!;
  const cash = s.money;
  s = G.apply(s, { t: 'fairHold', id: eye });
  assert.equal(s.money, cash - G.fairDeposit(lot));
  assert.notEqual(s.fair!.eye, eye);
  s = play(s, 1);
  assert.equal(lots(s).find((l) => l.id === eye)!.sold, undefined, 'a held lot is not his');
  assert.notEqual(s.fair!.eye, eye);
  // buying a held lot pays only the rest
  const rest = G.fairPayNow(lots(s).find((l) => l.id === eye)!);
  assert.equal(rest, lot.price - G.fairDeposit(lot));
  // a deposit that runs out is lost and the lot is for sale again
  let lapse = quiet();
  const other = lots(lapse).find((l) => l.id !== lapse.fair!.eye)!;
  lapse = G.apply(lapse, { t: 'fairHold', id: other.id });
  lapse = play(lapse, 2);
  const after = lots(lapse).find((l) => l.id === other.id)!;
  if (lapse.season === 0) { assert.equal(after.hold, undefined); assert.equal(after.deposit, undefined); }
  // over many springs he never takes more than two lots
  for (const seed of 'ABCDEFGH') {
    let f = quiet('chernozem', `V3-RIVAL-${seed}`);
    f = play(f, D.LOCATIONS.chernozem.seasons[0] - 1);
    assert.ok(f.fair!.rival <= G.RIVAL_MAX);
    assert.equal(lots(f).filter((l) => l.sold === 'rival').length, f.fair!.rival);
  }
});

test('a new season opens a new fair; unbought lots and deposits go', () => {
  let s = quiet();
  const first = lots(s).map((l) => l.id);
  s = play(s, D.LOCATIONS.chernozem.seasons[0] - 1);
  const open = lots(s).find((l) => !l.sold)!;
  s = G.apply(s, { t: 'fairHold', id: open.id });
  s = play(s, 1);
  assert.equal(s.season, 1);
  assert.equal(s.fair!.season, 1);
  assert.ok(lots(s).every((l) => !first.includes(l.id)));
  assert.ok(s.feed.some((f) => /Ярмарка закрылась: задаток/.test(f.text)));
});

test('trees sprout on free land in spring and summer, grow through three stages and give logs', () => {
  let s = quiet();
  s.year = 2; // no sprouts in the very first spring
  let sprouted = 0;
  for (let i = 0; i < 40 && !sprouted; i++) {
    s = play(s, 1);
    sprouted = s.tiles.filter((t) => t.tree !== undefined).length;
  }
  assert.ok(sprouted > 0, 'a tree sprouts within a few warm weeks');
  const i = s.tiles.findIndex((t) => t.tree !== undefined), x = i % 6, y = Math.floor(i / 6);
  const t = G.tile(s, x, y);
  assert.equal(G.treeStage(t), 1);
  assert.equal(G.tileBlock(s, x, y, 'radish'), 'поросль');
  // grown: three days of uprooting, ten logs, livelier soil
  t.tree = G.TREE_GROWN; s.days = 3; s.season = 1;
  const soil = t.soil, logs = G.matStock(s, 'logs');
  let n = G.apply(s, { t: 'fell', x, y });
  n = G.apply(n, { t: 'fell', x, y });
  assert.equal(G.tile(n, x, y).chop, 2);
  n = G.apply(n, { t: 'fell', x, y });
  assert.equal(G.tile(n, x, y).tree, undefined);
  assert.equal(G.matStock(n, 'logs'), logs + G.FELL_LOGS[3]);
  assert.equal(G.tile(n, x, y).soil, Math.min(5, soil + 1));
  // young: one day, three logs; its neighbours stand in its shade
  const y2 = quiet(); G.tile(y2, 2, 2).tree = G.TREE_YOUNG;
  G.tile(y2, 2, 3).crop = { id: 'radish', grown: 0, bonus: 0, mult: 1, planted: 0, pid: 99 };
  assert.ok(G.yieldParts(y2, 2, 3, 'radish').some((p) => p.label === 'тень дерева'));
  const m = G.apply(y2, { t: 'fell', x: 2, y: 2 });
  assert.equal(G.matStock(m, 'logs'), G.FELL_LOGS[2]);
  // weeding a line pulls the sprouts on it
  const wd = quiet(); G.tile(wd, 1, 2).tree = 0; wd.hand.push({ uid: 999, def: 'weeding' });
  const k = G.apply(wd, { t: 'play', uid: 999, row: 2 });
  assert.equal(G.tile(k, 1, 2).tree, undefined);
});

test('the lesson farm stays quiet: no trees sprout there', () => {
  let s = quiet(); s.quiet = true; s.year = 2;
  s = play(s, 30);
  assert.ok(s.tiles.every((t) => t.tree === undefined));
});

test('a spring flood leaves stones by the river; clearing them gives brick, clearing taiga gives logs', () => {
  let s = quiet('kuban', 'V3-FLOOD');
  s.plan = [];
  const week = s.absWeek;
  s.strikes = [{ kind: 'flood', ep: 1, week, cells: [], zone: true }];
  s = G.endWeek(s);
  const stones = G.ownedTiles(s).filter(([t]) => t.terrain === 'rock');
  assert.ok(stones.length >= 1 && stones.length <= 2, `${stones.length} stones`);
  const [, x, y] = stones[0];
  s.days = 3; s.money = 1000;
  const n = G.apply(s, { t: 'clear', x, y });
  assert.equal(G.matStock(n, 'bricks'), G.STONE_BRICKS);
  // taiga
  const a = quiet('altai'); a.days = 3;
  const forest = a.tiles.findIndex((t, i) => t.terrain === 'forest' && G.canClear(a, i % 6, Math.floor(i / 6)));
  const b = G.apply(a, { t: 'clear', x: forest % 6, y: Math.floor(forest / 6) });
  assert.equal(G.matStock(b, 'logs'), G.CLEAR_LOGS);
});

test('a save from before v3 (no shed, no fair) loads as it is and gets them on its next turn', () => {
  const s = quiet() as Partial<G.GameState> & G.GameState;
  delete s.mats; delete s.fair; delete s.equipSeen;
  assert.equal(validFarm(JSON.parse(JSON.stringify(s))), true);
  assert.equal(G.matStock(s, 'logs'), 0);
  const n = G.endWeek(s);
  assert.ok(n.mats && n.fair && n.equipSeen);
  assert.equal(validFarm(JSON.parse(JSON.stringify(n))), true);
  const up = G.ensureV3(s);
  assert.notEqual(up, s);
  assert.equal(G.ensureV3(up), up, 'nothing to add: the very same object');
  // an expedition house above the camp's three levels is taken down and paid back
  const k = quiet('kuban') as G.GameState; delete k.fair; k.levels.house = 5;
  const cash = k.money, kk = G.ensureV3(k);
  assert.equal(G.lvl(kk, 'house'), 3);
  assert.equal(kk.money, cash + Math.round((120 + 220) * G.infl(k.year)));
});

test('states with trees, a shed and a fair pass save validation; malformed ones do not', () => {
  const s = quiet();
  G.tile(s, 1, 1).tree = 7; G.tile(s, 2, 1).tree = 20; G.tile(s, 2, 1).chop = 1; s.mats = { logs: 3, bricks: 0, glass: 1 };
  assert.equal(validFarm(JSON.parse(JSON.stringify(s))), true);
  for (const bad of [
    (x: any) => { x.mats.logs = -1; },
    (x: any) => { x.mats.wood = 3; },
    (x: any) => { x.tiles[7].tree = 1.5; },
    (x: any) => { x.fair.lots[0].kind = 'cow'; },
    (x: any) => { x.fair.eye = 'all'; },
  ]) {
    const c = JSON.parse(JSON.stringify(s)); bad(c);
    assert.equal(validFarm(c), false, String(bad));
  }
});
