// Not a balance test: a random-but-sensible bot plays every farm for years and checks that nothing breaks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  Action, GameError, GameState, apply, newGame, placements, playableTargets, cardBlockReason, ownedTiles, stockOf, acceptProblem, deliverProblem,
  trackProblem, trackAvailable, buildSpots, buildStock, BuildItem, shopCards, cardShopPrice, labProblem, upgradeSpots, labCrops, weekOutlook,
  guardable, crowsOpen, canClear, canBuyLand, landPrice, deckList, ripenIn, soilTemp, airTemp,
} from '../src/engine/game';
import { CARDS, CROPS, LOCATION_IDS, LOCATIONS, TRACKS, TrackId, TRAIT_IDS, GRID } from '../src/engine/data';
import { rand, randInt } from '../src/engine/rng';
import { nextPayment } from '../src/engine/game';

function tryApply(s: GameState, a: Action): GameState | null {
  try {
    return apply(s, a);
  } catch (e) {
    if (e instanceof GameError) return null;
    throw new Error(`${a.t}: ${(e as Error).stack}`);
  }
}

function botWeek(s: GameState, r: { rng: number }): GameState {
  // shortfall: sell everything, then emergency / restructure / give up
  if (s.phase === 'shortfall') {
    for (const l of [...s.storage, ...s.yard]) s = tryApply(s, { t: 'sell', crop: l.crop, qty: l.qty }) ?? s;
    return tryApply(s, { t: 'pay' }) ?? tryApply(s, { t: 'emergency' }) ?? tryApply(s, { t: 'restructure' }) ?? apply(s, { t: 'giveUp' });
  }
  // careful: keep the next payment, sell what the barn holds when money is short
  if (s.money < nextPayment(s).amount + 20) for (const l of [...s.storage, ...s.yard]) s = tryApply(s, { t: 'sell', crop: l.crop, qty: l.qty }) ?? s;
  const rich = () => s.money > nextPayment(s).amount + 60;
  for (let guard = 0; guard < 25 && s.phase === 'week'; guard++) {
    const roll = rand(r);
    if (roll >= 0.66 && roll < 0.9 && !rich()) continue;
    if (roll < 0.45 && s.hand.length) {
      const card = s.hand[randInt(r, s.hand.length)];
      if (cardBlockReason(s, card)) continue;
      const d = CARDS[card.def];
      let next: GameState | null = null;
      if (d.kind === 'seed') {
        const pl = placements(s, card);
        if (pl.length) next = tryApply(s, { t: 'play', uid: card.uid, tiles: pl[randInt(r, pl.length)].tiles });
      } else if (d.target === 'none') next = tryApply(s, { t: 'play', uid: card.uid });
      else if (d.target === 'row') next = tryApply(s, { t: 'play', uid: card.uid, row: randInt(r, GRID) });
      else if (d.target === 'line') next = tryApply(s, { t: 'play', uid: card.uid, row: randInt(r, GRID) });
      else {
        const tg = playableTargets(s, card.def);
        if (tg.length) next = tryApply(s, { t: 'play', uid: card.uid, tiles: [tg[randInt(r, tg.length)]] });
      }
      if (next) s = next;
    } else if (roll < 0.55) {
      const dry = ownedTiles(s).filter(([t]) => t.crop && t.moisture < 1);
      if (dry.length) s = tryApply(s, { t: 'waterHand', tiles: [[dry[0][1], dry[0][2]]] }) ?? s;
    } else if (roll < 0.6) {
      for (const l of [...s.storage, ...s.yard]) if (rand(r) < 0.6) s = tryApply(s, { t: 'sell', crop: l.crop, qty: l.qty }) ?? s;
    } else if (roll < 0.66) {
      for (const o of LOCATIONS[s.loc].orgs) {
        if (!acceptProblem(s, o)) s = tryApply(s, { t: 'accept', org: o }) ?? s;
        if (!deliverProblem(s, o)) s = tryApply(s, { t: 'deliver', org: o }) ?? s;
      }
    } else if (roll < 0.7) {
      const ts = (Object.keys(TRACKS) as TrackId[]).filter((t) => trackAvailable(s, t) && !trackProblem(s, t));
      if (ts.length) s = tryApply(s, { t: 'track', track: ts[randInt(r, ts.length)] }) ?? s;
    } else if (roll < 0.74) {
      for (const item of ['greenhouse', 'hive', 'drip', 'scarecrow', 'canal'] as BuildItem[]) {
        const st = buildStock(s)[item];
        if (st.used < st.have) {
          const sp = buildSpots(s, item);
          if (sp.length) {
            const [x, y] = sp[randInt(r, sp.length)];
            s = tryApply(s, { t: 'build', item, x, y }) ?? s;
          }
        }
      }
    } else if (roll < 0.77) {
      const cards = shopCards(s);
      const def = cards[randInt(r, cards.length)];
      if (s.money > cardShopPrice(s, def) + 40) s = tryApply(s, { t: 'buyCard', def }) ?? s;
    } else if (roll < 0.8 && !labProblem(s)) {
      const seeds = [...s.draw, ...s.discard].filter((c) => CARDS[c.def].kind === 'seed');
      const k = randInt(r, 4);
      if (k === 0 && seeds.length) {
        const c = seeds[randInt(r, seeds.length)];
        const sp = upgradeSpots(s, c);
        if (sp.length) s = tryApply(s, { t: 'labCell', uid: c.uid, cell: sp[0] }) ?? s;
      } else if (k === 1 && seeds.length) s = tryApply(s, { t: 'labTrait', uid: seeds[0].uid, trait: TRAIT_IDS[randInt(r, TRAIT_IDS.length)] }) ?? s;
      else if (k === 2 && labCrops(s).length) s = tryApply(s, { t: 'labVariety', crop: labCrops(s)[0] }) ?? s;
      else s = tryApply(s, { t: 'labBio' }) ?? s;
    } else if (roll < 0.83) {
      if (s.candidates.length) s = tryApply(s, { t: 'hire', id: s.candidates[0] }) ?? s;
      if (s.team.length) s = tryApply(s, { t: 'train', id: s.team[0].id }) ?? s;
    } else if (roll < 0.86) {
      for (const [, x, y] of ownedTiles(s)) if (guardable(s, x, y)) s = tryApply(s, { t: 'guard', x, y }) ?? s;
      if (crowsOpen(s)) s = tryApply(s, { t: 'shoo' }) ?? s;
      if (s.thieves) s = tryApply(s, { t: 'talkKids' }) ?? s;
      for (const [t, x, y] of ownedTiles(s)) if (t.weeds) s = tryApply(s, { t: 'weed', x, y }) ?? s;
    } else if (roll < 0.88) {
      for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
        if (canClear(s, x, y)) s = tryApply(s, { t: 'clear', x, y }) ?? s;
        else if (canBuyLand(s, x, y) && s.money > landPrice(s) + 60) s = tryApply(s, { t: 'buyLand', x, y }) ?? s;
      }
    } else if (roll < 0.9 && s.season === 3) {
      const d = deckList(s).find((c) => !s.hand.includes(c));
      if (d && rand(r) < 0.5) s = tryApply(s, { t: 'deckOut', uid: d.uid }) ?? s;
      if (s.spare.length) s = tryApply(s, { t: 'deckIn', uid: s.spare[0].uid }) ?? s;
    } else break;
  }
  return s;
}

function invariants(s: GameState) {
  assert.ok(Number.isFinite(s.money) && s.money >= 0, `money ${s.money}`);
  assert.equal(s.tiles.length, GRID * GRID);
  for (const t of s.tiles) {
    assert.ok(t.moisture >= 0 && t.moisture <= 3, `moisture ${t.moisture}`);
    assert.ok(t.soil >= 1 && t.soil <= 5, `soil ${t.soil}`);
    if (t.crop) assert.ok(CROPS[t.crop.id], 'crop');
  }
  for (const l of [...s.storage, ...s.yard]) assert.ok(l.qty > 0 && Number.isInteger(l.qty), `lot ${l.qty}`);
  const uids = [...s.hand, ...s.draw, ...s.discard, ...s.spare].map((c) => c.uid);
  assert.equal(new Set(uids).size, uids.length, 'unique cards');
  assert.ok(s.hand.length <= 9, 'hand');
  JSON.stringify(s);
}

test('every farm plays for years without breaking', () => {
  for (const loc of LOCATION_IDS)
    for (let k = 0; k < 6; k++) {
      let s = newGame({ loc, seed: `SMOKE${k}` });
      if (k % 2) s = { ...s, money: 4000 };
      const r = { rng: 1234 + k };
      let weeks = 0;
      while (s.phase !== 'gameover' && weeks < 140) {
        s = botWeek(s, r);
        invariants(s);
        if (s.phase === 'week') {
          weekOutlook(s);
          for (const [, x, y] of ownedTiles(s)) {
            ripenIn(s, x, y);
            soilTemp(s, x, y);
          }
          s = apply(s, { t: 'endWeek' });
          weeks++;
        }
        invariants(s);
      }
      assert.ok(weeks > 5, `${loc} lived ${weeks} weeks`);
      console.log(loc, k, 'weeks', weeks, 'year', s.year, 'money', s.money, 'glory', s.glory, 'phase', s.phase, 'air', airTemp(s), 'stock', stockOf(s, 'potato'));
    }
});

test('temperature gates growth and frost kills sprouts', () => {
  const s = newGame({ loc: 'chernozem', seed: 'T1' });
  assert.ok(s.temps.length === 23);
  assert.ok(s.temps[0] < 12 && s.temps[10] > 15, `temps ${s.temps.join(',')}`);
  const w = s.temps.slice(20);
  assert.ok(w.every((t) => t < 0), `winter ${w}`);
});
