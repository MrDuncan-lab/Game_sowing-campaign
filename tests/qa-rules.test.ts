// QA matrix 28.10 (CAL / CRD / WTH) at the engine level. Tests named «FIX …» reproduce a bug found by the matrix
// and fixed in the same change (they failed before it); the rest pin rows that were checked and hold.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine/game';
import * as D from '../src/engine/data';
import { testDate } from '../src/engine/testLab';

function quiet(loc: D.LocationId = 'chernozem', season = 1): G.GameState {
  const s = G.newGame({ loc, seed: 'QA-RULES' });
  testDate(s, season);
  s.money = 1000; s.days = 20;
  for (const t of s.tiles) Object.assign(t, { owned: true, terrain: 'plain', crop: null, moisture: 3, soil: 3, structure: null, weeds: false, canal: false, mulch: 0, shelter: 0, drip: false, snow: false, idle: 0, clean: 0, last: null });
  for (const o of Object.values(s.orgs)) if (o) { o.wait = 1000; o.offer = null; o.active = null; }
  return s;
}
function plant(s: G.GameState, x: number, y: number, id: D.CropId, grown = 0, extra: Partial<G.Plant> = {}) {
  const t = G.tile(s, x, y);
  t.owned = true;
  t.crop = { id, grown, bonus: 0, mult: 1, planted: s.absWeek, pid: s.nextPid++, ...(D.CROPS[id].perennial ? { years: D.CROPS[id].perennial } : {}), ...extra };
  return t.crop;
}
const card = (s: G.GameState, def: string, extra: Partial<G.Card> = {}) => { const c: G.Card = { uid: s.nextUid++, def, ...extra }; s.hand.push(c); return c; };
const allCards = (s: G.GameState) => [...s.hand, ...s.draw, ...s.discard, ...s.spare];
const pay = (s: G.GameState) => (s.phase === 'shortfall' ? G.apply(s, { t: 'pay' }) : s);

// ---------------------------------------------------------------- CAL-03 / WTH-04
test('FIX CAL-03/WTH-04 · an unheated greenhouse in winter dries its crops to death though watering is forbidden there', () => {
  const crops = ['garlic', 'rye', 'strawberry', 'seabuckthorn'] as const;
  for (const [loc, start] of [['chernozem', 0], ['kuban', 0], ['altai', 0], ['altai', 3]] as const) {
    let s = quiet(loc, 3);
    s.levels.greenhouse = 2; // two greenhouses, no heating
    crops.forEach((id, i) => {
      G.tile(s, i + 1, 1).structure = 'greenhouse';
      plant(s, i + 1, 1, id, 1); G.tile(s, i + 1, 1).moisture = start;
      plant(s, i + 1, 3, id, 1); G.tile(s, i + 1, 3).moisture = start; // the same crop outdoors
    });
    // the player has no way to water an unheated greenhouse in winter: hand watering, the water card and rain all skip it
    assert.throws(() => G.apply(s, { t: 'waterHand', tiles: [[1, 1]] }), G.GameError);
    assert.equal(G.playableTargets(s, 'water').length, 0);
    let dried = 0;
    for (let i = 0; i < D.LOCATIONS[loc].seasons[3]; i++) { s = pay(G.endWeek(s)); dried += s.lastReport!.dried; }
    assert.equal(s.season, 0);
    crops.forEach((id, i) => assert.ok(G.tile(s, i + 1, 3).crop, `${loc}: outdoor ${id} sleeps through winter`));
    assert.equal(dried, 0, `${loc}, moisture ${start} at the start of winter: no crop may dry out in a greenhouse that cannot be watered`);
  }
});

test('CAL-03 · perennials and winter crops outdoors and in a heated greenhouse winter without false deaths (all regions, real winters)', () => {
  for (const loc of D.LOCATION_IDS) for (const seed of ['A', 'B', 'C', 'D']) {
    let s = G.newGame({ loc, seed: `QA-WINTER-${seed}` });
    s.money = 1e6; testDate(s, 2);
    s.temps = G.yearPlanFor(s, 1).temps.slice();
    const last = D.LOCATIONS[loc].seasons.slice(0, 3).reduce((a, b) => a + b, 0);
    s.week = last; s.absWeek = s.yearStart + last - 1; s.weekInSeason = D.LOCATIONS[loc].seasons[2];
    for (const t of s.tiles) Object.assign(t, { owned: true, terrain: 'plain', crop: null, moisture: 2, structure: null, weeds: false });
    for (const o of Object.values(s.orgs)) if (o) { o.wait = 1000; o.offer = null; o.active = null; }
    s.levels.greenhouse = 3; s.levels.house = 2;
    ['strawberry', 'seabuckthorn', 'garlic', 'rye'].forEach((id, i) => { plant(s, i, 0, id as D.CropId, 0); plant(s, i, 1, id as D.CropId, 2, D.CROPS[id as D.CropId].perennial ? { rest: true, years: 2 } : {}); });
    G.tile(s, 5, 5).terrain = 'swamp'; G.tile(s, 4, 5).terrain = 'swamp'; plant(s, 4, 5, 'cranberry', 1); G.tile(s, 5, 5).crop = { ...G.tile(s, 4, 5).crop! };
    G.tile(s, 0, 4).structure = 'greenhouse'; plant(s, 0, 4, 'garlic', 0); G.tile(s, 0, 4).moisture = 3;
    let lost = 0;
    for (let i = 0; i <= D.LOCATIONS[loc].seasons[3]; i++) { s = pay(G.endWeek(s)); lost += s.lastReport!.frost + s.lastReport!.dried; if (G.tile(s, 0, 4).crop && G.tile(s, 0, 4).moisture < 2 && s.season === 3) s = G.apply({ ...s, days: 5 }, { t: 'waterHand', tiles: [[0, 4]] }); }
    assert.equal(s.season, 0, `${loc}/${seed}: spring arrived`);
    assert.equal(lost, 0, `${loc}/${seed}: nothing froze or dried`);
  }
});

// ---------------------------------------------------------------- WTH-02 / WTH-03
test('FIX WTH-02 · a hive set down this week makes honey only from the next week, like its pollination bonus', () => {
  let s = quiet(); s.levels.apiary = 3;
  plant(s, 2, 1, 'buckwheat', 0);
  s = G.apply(s, { t: 'build', item: 'hive', x: 2, y: 2 });
  assert.equal(G.yieldParts(s, 2, 1, 'buckwheat').some((p) => p.label === 'улей рядом'), false, 'no pollination bonus this week (PSV-021)');
  const first = G.endWeek(s);
  assert.equal(first.lastReport!.honey, 0, 'no honey in the week the hive was set down');
  assert.equal(G.endWeek(first).lastReport!.honey, 2, 'honey from the following week');
});

test('FIX WTH-03 · moving a hive next to flowers during the week gives no instant honey', () => {
  let s = quiet(); s.levels.apiary = 3;
  plant(s, 2, 1, 'buckwheat', 0);
  G.tile(s, 5, 5).structure = 'hive'; // established, far from flowers
  assert.equal(G.endWeek(s).lastReport!.honey, 0);
  s = G.apply(s, { t: 'moveBuild', item: 'hive', from: [5, 5], to: [2, 2] });
  assert.equal(G.endWeek(s).lastReport!.honey, 0, 'the moved hive works from the next week');
});

test('WTH-02 · a greenhouse placed under an announced frost protects at once; its yield bonus waits a week', () => {
  let s = quiet(); s.temps[s.week - 1] = -3; s.levels.greenhouse = 4;
  plant(s, 2, 2, 'potato', 3);
  assert.deepEqual(G.frostVictims(s), [[2, 2]]);
  s = G.apply(s, { t: 'build', item: 'greenhouse', x: 2, y: 2 });
  assert.deepEqual(G.frostVictims(s), []); assert.equal(G.weekOutlook(s).frost, 0);
  assert.equal(G.expectedYield(s, 2, 2), Math.round(10 * G.soilMult(3)), 'complex ×1,5 not yet');
  const n = G.endWeek(s);
  assert.equal(n.lastReport!.frost, 0); assert.equal(n.lastReport!.harvests[0].qty, 12);
});

// ---------------------------------------------------------------- CAL-06 / CRD-09
test('FIX CAL-06/CRD-09 · a card put aside and then played comes back through an exchange without its stale «kept» mark', () => {
  let s = quiet();
  const seed: G.Card = { uid: s.nextUid++, def: 'seed_radish' }, water: G.Card = { uid: s.nextUid++, def: 'water' };
  s.hand = [seed, water]; s.draw = []; s.discard = [];
  s = G.apply(s, { t: 'keepCard', uid: seed.uid });
  s = G.apply(s, { t: 'play', uid: seed.uid, tiles: [[4, 4]] }); // spent: it goes to the discard
  s = G.apply(s, { t: 'exchangeCard', uid: water.uid }); // the only other card is the radish
  const back = s.hand.find((c) => c.uid === seed.uid)!;
  assert.ok(back, 'the exchange brought the radish back');
  assert.equal(back.keep, undefined, 'the player never put it aside again');
  assert.equal(G.keptCount(s), 0);
  // the stale mark eats the keep allowance: the player cannot put aside a card of their choice
  const other = card(s, 'mulch');
  assert.doesNotThrow(() => G.apply(s, { t: 'keepCard', uid: other.uid }));
});

test('CRD-09 · many identical cards: unique uids, stable deck count through draws, exchanges and weeks', () => {
  let s = quiet();
  const n = G.deckCount(s);
  s.draw = Array.from({ length: n - s.hand.length }, () => ({ uid: s.nextUid++, def: 'seed_radish' }));
  s.hand = s.hand.map(() => ({ uid: s.nextUid++, def: 'seed_radish' })); s.discard = [];
  for (let i = 0; i < 6; i++) {
    s.days = 5; for (const t of s.tiles) t.weeds = false;
    s = G.apply(s, { t: 'exchangeCard', uid: s.hand[0].uid });
    s = G.apply(s, { t: 'play', uid: s.hand[0].uid, tiles: G.placements(s, s.hand[0])[0].tiles });
    s = pay(G.endWeek(s));
    const uids = allCards(s).map((c) => c.uid);
    assert.equal(new Set(uids).size, uids.length); assert.equal(G.deckCount(s), n); assert.ok(s.hand.length <= G.handMax(s));
  }
});

test('CAL-06 · one-off cards survive the weekly reset but are used up when played, never restored', () => {
  let s = quiet(); s.levels.house = 1;
  const temp: G.Card = { uid: s.nextUid++, def: 'bio', temp: true };
  s.discard.push(...s.hand.splice(6)); s.hand.push(temp);
  for (const t of s.tiles) t.soil = 5; // nothing to improve: the card stays unusable
  assert.equal(G.cardBlockReason(s, temp), 'На всех грядках плодородие 5/5');
  testDate(s, 1); s.week += D.LOCATIONS.chernozem.seasons[1] - 1; s.absWeek += D.LOCATIONS.chernozem.seasons[1] - 1; s.weekInSeason = D.LOCATIONS.chernozem.seasons[1];
  s = pay(G.endWeek(s)); assert.equal(s.season, 2);
  assert.equal(s.hand.filter((c) => c.uid === temp.uid).length, 1, 'kept through the season reset');
  G.tile(s, 1, 1).soil = 2; s.days = 3;
  s = G.apply(s, { t: 'play', uid: temp.uid, tiles: [[1, 1]] });
  for (let i = 0; i < 4; i++) s = pay(G.endWeek(s));
  assert.equal(allCards(s).filter((c) => c.uid === temp.uid).length, 0);
});

// ---------------------------------------------------------------- CRD-01 / CRD-02
test('CRD-01 · the same card uid applied twice is used and charged once', () => {
  for (const def of ['water', 'mulch', 'fertilizer', 'shelter', 'compost', 'early', 'helpers', 'sidejob', 'care', 'seed_radish']) {
    let s = quiet(); for (const t of s.tiles) { t.moisture = 1; t.soil = 2; }
    plant(s, 2, 2, 'potato', 3);
    const c = card(s, def);
    const a: G.Action = def === 'care' ? { t: 'play', uid: c.uid, row: 2 } : { t: 'play', uid: c.uid, tiles: [def === 'seed_radish' ? [4, 4] : [2, 2]] };
    const once = G.apply(s, a);
    assert.throws(() => G.apply(once, a), G.GameError, def);
    assert.equal(allCards(once).filter((x) => x.uid === c.uid).length, 1, def);
  }
});

test('CRD-02 · two quick purchases: the second is refused once money runs out, balance never negative', () => {
  for (const def of ['water', 'seed_potato', 'shelter']) {
    let s = quiet(); s.money = G.cardShopPrice(s, def);
    s = G.apply(s, { t: 'buyCard', def });
    assert.equal(s.money, 0);
    const snap = JSON.stringify(s);
    assert.throws(() => G.apply(s, { t: 'buyCard', def }), G.GameError);
    assert.equal(JSON.stringify(s), snap);
  }
  let s = quiet(); s.money = G.landPrice(s) * 3; for (const t of s.tiles) t.owned = t !== G.tile(s, 5, 5);
  s = G.apply(s, { t: 'buyLand', x: 5, y: 5 });
  assert.throws(() => G.apply(s, { t: 'buyLand', x: 5, y: 5 }), G.GameError); assert.ok(s.money >= 0);
});

// ---------------------------------------------------------------- CRD-03
test('CRD-03 · beyond the edge or on an occupied cell: GameError, nothing spent', () => {
  const s = quiet(); plant(s, 2, 2, 'radish');
  const c = card(s, 'seed_bean'); const snap = JSON.stringify(s);
  for (const tiles of [[[5, 1], [6, 1]], [[-1, 1], [0, 1]], [[1, 2], [2, 2]], [[1, 1], [3, 1]]] as [number, number][][])
    assert.throws(() => G.apply(s, { t: 'play', uid: c.uid, tiles }), G.GameError, JSON.stringify(tiles));
  assert.equal(JSON.stringify(s), snap);
});

test('FIX CRD-03 · malformed cells (string, null, non-array) are refused with GameError, not a TypeError', () => {
  const s = quiet();
  const bean = card(s, 'seed_bean');
  const bad: unknown[] = [[[1, 1], ['2', '1']], [[1, 1], null], {}, 7, [[1, 1], { 0: 2, 1: 1 }]];
  for (const tiles of bad) assert.throws(() => G.apply(s, { t: 'play', uid: bean.uid, tiles } as any), G.GameError, JSON.stringify(tiles));
  for (const tiles of [{}, [null], [[1, 1], 'x']]) assert.throws(() => G.apply(s, { t: 'waterHand', tiles } as any), G.GameError, JSON.stringify(tiles));
});

test('FIX CRD-03 · an unknown building name is refused instead of being written onto the field', () => {
  const s = quiet();
  assert.throws(() => G.apply(s, { t: 'build', item: 'constructor' as G.BuildItem, x: 1, y: 1 }), G.GameError);
});

// ---------------------------------------------------------------- CRD-04
test('CRD-04 · figured plantings beside neighbours, every orientation: preview equals the sown planting', () => {
  for (const def of ['seed_corn', 'seed_potato', 'seed_carrot', 'seed_cabbage', 'seed_buckwheat', 'seed_sunflower', 'seed_pumpkin']) {
    const s = quiet(); s.levels.apiary = 1; s.unlocked = [...D.SOWN_IDS];
    plant(s, 0, 0, 'bean'); plant(s, 5, 0, 'pumpkin'); plant(s, 0, 5, 'onion'); plant(s, 3, 3, 'bean'); G.tile(s, 5, 5).structure = 'hive';
    G.tile(s, 2, 0).last = D.CARDS[def].crop!; G.tile(s, 4, 4).soil = 5;
    const c = card(s, def);
    for (const p of G.placements(s, c)) {
      const n = G.apply(s, { t: 'play', uid: c.uid, tiles: p.tiles });
      const pid = G.tile(n, p.tiles[0][0], p.tiles[0][1]).crop!.pid;
      assert.deepEqual(G.pidCells(n, pid).map(String).sort(), p.tiles.map(String).sort());
      assert.equal(G.plantingYield(n, pid), G.placementYield(s, c, p.tiles), `${def} rot ${p.rot} ${JSON.stringify(p.tiles)}`);
    }
  }
});

// ---------------------------------------------------------------- CRD-05 / CRD-06
test('CRD-05/06 · Altai cranberry extensions refused without charge; a 4-cell winter planting has 0 places under 2 greenhouses', () => {
  const a = quiet('altai'); const alt = G.newGame({ loc: 'altai', seed: 'QA-RULES' }); a.tiles = alt.tiles; a.levels.lab = 1; a.money = 1000;
  const c = card(a, 'seed_cranberry');
  for (const cell of G.upgradeSpots(a, c)) assert.throws(() => G.apply(a, { t: 'labCell', uid: c.uid, cell }), /негде расти/);
  assert.equal(a.money, 1000);
  const w = quiet('chernozem', 3); w.levels.greenhouse = 3; w.levels.house = 2;
  G.tile(w, 1, 1).structure = 'greenhouse'; G.tile(w, 2, 1).structure = 'greenhouse';
  const p = card(w, 'seed_potato', { extra: [[1, 1]] });
  assert.equal(G.placements(w, p).length, 0);
  assert.equal(G.cardBlockReason(w, p), 'Фигуре нет места на поле');
});

// ---------------------------------------------------------------- CAL-01 / CAL-02
function paymentWeek(s: G.GameState, season: number, part = 1) {
  const p = G.paymentSchedule(s).find((x) => x.season === season && x.part === part)!;
  s.week = p.week; s.absWeek = s.yearStart + p.week - 1;
  const { season: se, w } = { season: G.weekInfo({ ...s, week: p.week } as G.GameState, 0).season, w: G.weekInfo({ ...s, week: p.week } as G.GameState, 0).weekInSeason };
  s.season = se; s.weekInSeason = w;
}
test('CAL-01 · spring → summer with a payment and a ripe crop: harvest, costs, payment, new season — each once', () => {
  const s = quiet('chernozem', 0); s.temps.fill(15); paymentWeek(s, 0);
  plant(s, 2, 2, 'radish', 1); s.team = [{ id: 'foreman', level: 1, away: 0 }]; s.money = 200;
  const amount = G.paymentBase(s, 0);
  const n = G.endWeek(s);
  assert.equal(n.lastReport!.harvests.length, 1); assert.equal(G.stockOf(n, 'radish'), G.expectedYield(s, 2, 2));
  assert.equal(n.money, 200 - 2 - amount); assert.equal(n.stats.payments, amount);
  assert.equal(n.season, 1); assert.equal(n.weekInSeason, 1); assert.equal(n.absWeek, s.absWeek + 1);
  // through a shortfall the same steps happen once: the payment starts the summer exactly once
  const poor = structuredClone(s); poor.money = 0; poor.storage = [];
  let sf = G.endWeek(poor); assert.equal(sf.phase, 'shortfall'); assert.equal(sf.absWeek, s.absWeek);
  assert.equal(G.endWeek(sf), sf); assert.throws(() => G.apply(sf, { t: 'endWeek' }));
  sf = G.apply(sf, { t: 'sell', crop: 'radish', qty: 99 }); sf.money += amount; sf = G.apply(sf, { t: 'pay' });
  assert.equal(sf.phase, 'week'); assert.equal(sf.absWeek, s.absWeek + 1); assert.equal(sf.season, 1); assert.equal(sf.stats.payments, amount);
  assert.throws(() => G.apply(sf, { t: 'pay' }), G.GameError);
});

test('CAL-02 · end of summer/autumn shortfall: borrow, emergency, pay, restructure and give-up penalise once', () => {
  for (const [season, part] of [[1, 3], [2, 1]] as const) {
    const base = quiet('chernozem', season); paymentWeek(base, season, part); base.money = 0; base.rating = 5; base.cleanSeasons = 2;
    const sf = G.endWeek(base); assert.equal(sf.phase, 'shortfall'); assert.equal(sf.due!.seasonEnd, true);
    let a = G.apply(sf, { t: 'borrow', amount: 5 }); a = G.apply(a, { t: 'borrow', amount: 5 }); a = G.apply(a, { t: 'emergency' });
    assert.equal(a.rating, 4, 'late credit lowers the rating once'); assert.equal(a.phase, 'week'); assert.equal(a.cleanSeasons, 0);
    assert.equal(G.outstanding(a), sf.due!.amount);
    const r = G.apply(sf, { t: 'restructure' }); assert.equal(r.rating, 3); assert.equal(r.carry, Math.round(sf.due!.amount * 1.2));
    assert.throws(() => G.apply(r, { t: 'restructure' }), G.GameError);
    const g = G.apply(sf, { t: 'giveUp' }); assert.equal(g.phase, 'gameover'); assert.throws(() => G.apply(g, { t: 'pay' }), G.GameError);
  }
});

test('CAL-02 · a season-end payment postponed by restructuring is penalised once, like an emergency credit: the next clean season counts', () => {
  const run = (how: 'restructure' | 'emergency') => {
    let s = quiet('chernozem', 0); s.temps.fill(15); paymentWeek(s, 0); s.money = 0; s.rating = 3;
    s = G.endWeek(s); s = G.apply(s, { t: how }); s.money = 1e5;
    while (s.season === 1) s = pay(G.endWeek(s));
    return s.cleanSeasons;
  };
  assert.equal(run('restructure'), run('emergency'), 'the clean summer counts in both cases');
});

// ---------------------------------------------------------------- CAL-07
test('CAL-07 · empty beds through every winter week: no growth, weeds or winter raids', () => {
  for (const loc of D.LOCATION_IDS) {
    let s = quiet(loc, 3);
    for (const t of s.tiles) t.idle = 3;
    for (let i = 0; i < D.LOCATIONS[loc].seasons[3]; i++) {
      assert.equal(s.season, 3);
      assert.deepEqual([s.strikes.length, !!s.crows, !!s.thieves, s.kidsWarn?.length ?? 0, s.crowWarn?.length ?? 0], [0, false, false, 0, 0]);
      const before = JSON.stringify(s.tiles);
      const n = pay(G.endWeek(s));
      if (n.season === 3) assert.equal(JSON.stringify(n.tiles), before, `${loc} week ${i}`);
      assert.equal(n.lastReport!.lost.length + n.lastReport!.harvests.length, 0);
      s = n;
    }
    assert.ok(s.tiles.every((t) => !t.weeds && !t.crop));
  }
});

// ---------------------------------------------------------------- CAL-08 / WTH-06
test('CAL-08/WTH-06 · at the exact growth and frost thresholds every preview agrees with the resolution', () => {
  for (const season of [0, 1, 3]) for (const id of ['radish', 'potato', 'wheat', 'garlic', 'tomato', 'strawberry', 'cabbage'] as D.CropId[])
    for (const cfg of ['open', 'mulch', 'shelter', 'gh', 'heated'] as const) {
      const s0 = quiet('chernozem', season);
      if (D.CROPS[id].greenhouseOnly && (cfg !== 'gh' && cfg !== 'heated')) continue;
      const t0 = G.tile(s0, 2, 2); if (cfg === 'mulch') t0.mulch = 2; if (cfg === 'shelter') t0.shelter = 2;
      if (cfg === 'gh' || cfg === 'heated') { t0.structure = 'greenhouse'; s0.levels.greenhouse = cfg === 'heated' ? 3 : 1; }
      const probe = { ...D.CROPS[id] };
      const soilAt = (air: number) => G.soilTemp(s0, 2, 2, air);
      // the air temperatures that put the soil exactly on minT and the air exactly on the frost limit, ±1
      const airs = new Set<number>();
      for (let air = -40; air <= 40; air++) if (Math.abs(soilAt(air) - probe.minT) <= 1) airs.add(air);
      for (const grown of [0, 2]) {
        const lim = G.frostLimit({ id, grown, bonus: 0, mult: 1, planted: 0, pid: 0 }) - G.frostShield(s0, t0);
        for (const d of [-1, 0, 1]) airs.add(lim + d);
        for (const air of airs) {
          const s = structuredClone(s0); s.temps.fill(air);
          plant(s, 2, 2, id, Math.min(grown, G.cropGrow(s, id) - 1));
          const before = G.tile(s, 2, 2).crop!.grown;
          const pre = { kills: G.frostKills(s, 2, 2), victims: G.frostVictims(s).length, note: G.growNote(s, 2, 2), out: G.weekOutlook(s), ripen: G.ripenIn(s, 2, 2), known: G.ripenIn(s, 2, 2, { knownOnly: true }), soil: G.soilTemp(s, 2, 2) };
          const n = G.endWeek(s), r = n.lastReport!, after = G.tile(n, 2, 2).crop;
          const label = `${season} ${id} ${cfg} grown ${grown} air ${air}`;
          assert.equal(pre.kills, r.frost === 1, label); assert.equal(pre.victims, r.frost, label); assert.equal(pre.out.frost, r.frost, label);
          const grew = r.harvests.length > 0 || (!!after && after.grown > before);
          if (!r.frost) assert.equal(pre.note === null, grew, `${label}: growNote ${pre.note} soil ${pre.soil}`);
          assert.equal(pre.out.ripe, r.harvests.length, label);
          assert.equal(pre.ripen === 0, r.harvests.length > 0, label); assert.equal(pre.known === 0, r.harvests.length > 0, label);
          if (!pre.note || pre.note === 'cold') assert.equal(pre.note === 'cold', pre.soil < G.cropMinT(id), `${label}: shown soil drives the cold note`);
        }
      }
    }
});

// ---------------------------------------------------------------- WTH-01 / WTH-04
test('WTH-01 · frost → drought → beetles → locust → children → crows: each trouble once, on what the previous one left', async () => {
  const { testFixture } = await import('../src/engine/testLab');
  for (const loc of D.LOCATION_IDS) {
    const s = testFixture('collisions', loc), out = G.weekOutlook(s), n = G.endWeek(s), r = n.lastReport!;
    assert.deepEqual([r.frost, r.dried, r.stolen], [1, 1, 1]);
    assert.deepEqual([out.frost, out.dying, out.thieves], [1, 1, 1]);
    assert.deepEqual(r.fieldDamage!.map((d) => `${d.kind}@${d.x},${d.y}`), ['frost@1,1', 'dry@2,1', 'thieves@2,2', 'crows@3,1']);
    assert.deepEqual(r.pestHits!.map((p) => `${p.kind}@${p.x},${p.y}`), ['beetle@2,2', 'beetle@3,1', 'locust@1,2']);
    assert.equal(G.tile(n, 3, 1).crop!.mult, 0.5 * 0.8);
  }
});

test('WTH-04 · zero moisture: every crop dies on its second dry week (third with drought trait), as forecast', () => {
  for (const id of ['radish', 'potato', 'sunflower', 'rice', 'garlic', 'strawberry'] as D.CropId[]) for (const traits of [[], ['drought']] as D.TraitId[][]) {
    let s = quiet(); s.flags.dry = true; plant(s, 2, 2, id, 0, { traits });
    G.tile(s, 2, 2).moisture = 0;
    const need = traits.length ? 3 : 2;
    for (let w = 1; w <= need; w++) {
      const out = G.weekOutlook(s); s = G.endWeek(s);
      assert.equal(out.dying, s.lastReport!.dried, `${id} ${traits} week ${w}`);
      assert.equal(s.lastReport!.dried, w === need ? 1 : 0, `${id} ${traits} week ${w}`);
      if (w < need) assert.equal(G.tile(s, 2, 2).crop!.grown, 0, 'a dry plant does not grow');
      s.flags.dry = true;
    }
    assert.equal(G.tile(s, 2, 2).crop, null);
  }
});
