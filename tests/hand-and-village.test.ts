// 28.10 · the hand keeps every card not played (only the missing ones come from the deck); the village shows the
// house at its level, captions under the places with a use, and the house screen draws the same house.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine/game';
import { V_SPOTS, V_SUMMER, V_WINTER, V_ANCHORS } from '../src/art/village/chernozem';
import { ES_SUMMER, ES_WINTER } from '../src/art/village/estate';
import { VILLAGE_LABELS } from '../src/ui/Village';

const quiet = () => {
  const s = G.newGame({ loc: 'chernozem', seed: 'HAND-2810' });
  s.money = 1000; s.plan = []; s.strikes = []; s.temps = s.temps.map(() => 15);
  return s;
};

test('cards not played stay in the hand, in place; the deck only tops the hand up to its size', () => {
  let s = quiet();
  assert.equal(s.hand.length, G.handMax(s));
  const seed = s.hand.find((c) => c.def.startsWith('seed_') && !G.cardBlockReason(s, c) && G.placements(s, c).length)!;
  s = G.apply(s, { t: 'play', uid: seed.uid, tiles: G.placements(s, seed)[0].tiles });
  const stay = s.hand.map((c) => c.uid), deck = G.deckCount(s);
  const next = G.endWeek(s);
  assert.deepEqual(next.hand.slice(0, stay.length).map((c) => c.uid), stay, 'every unplayed card is still there, in its place');
  assert.equal(next.hand.length, G.handMax(next), 'the hand is full again');
  assert.equal(next.hand.length - stay.length, 1, 'one new card for the one played');
  assert.equal(G.deckCount(next), deck);
  assert.equal(G.weeklyDraw(s), 1);
});

test('a full unplayed hand brings no new card at all; an over-full old hand is not cut', () => {
  const s = quiet();
  const n = G.endWeek(s);
  assert.deepEqual(n.hand.map((c) => c.uid), s.hand.map((c) => c.uid));
  const big = quiet(); big.hand.push(big.draw.pop()!);
  assert.equal(G.endWeek(big).hand.length, G.handMax(big) + 1);
});

test('the planning notebook makes an exchange free of working days; without it an exchange costs one', () => {
  let s = quiet();
  const days = s.days, card = s.hand[0];
  assert.equal(G.exchangeDays(s), 1);
  assert.equal(G.apply(s, { t: 'exchangeCard', uid: card.uid }).days, days - 1);
  s.levels.planning = 1;
  assert.equal(G.exchangeDays(s), 0);
  assert.equal(G.apply(s, { t: 'exchangeCard', uid: card.uid }).days, days);
  s.days = 0;
  assert.doesNotThrow(() => G.apply(s, { t: 'exchangeCard', uid: card.uid }), 'no working day needed');
});

test('the village draws the house at each of the five levels in both drawings, one of them shown at a time', () => {
  for (const d of [V_SUMMER, V_WINTER]) {
    const all = d.layers.map((l) => l.svg).join('');
    for (let n = 1; n <= 5; n++) assert.equal((all.match(new RegExp(`vc vc-house${n}"`, 'g')) ?? []).length, 1, `house level ${n}`);
  }
});

test('every caption stands under a real place; every customer has an order bubble just over its roof', () => {
  for (const l of VILLAGE_LABELS) assert.ok(V_SPOTS[l.k], l.k);
  for (const o of ['council', 'college', 'orphanage', 'bakery', 'restaurant']) {
    const a = V_ANCHORS[`bubble-${o}`], p = V_SPOTS[o];
    assert.ok(a && p, o);
    assert.equal(a.l, p.l, `${o}: the bubble rides on the building's hill`);
    assert.ok(a.y < p.y - 20 && a.y >= p.top - 30, `${o}: the bubble sits over the building, near its top (${a.y}: top ${p.top}, base ${p.y})`);
  }
});

test('the house screen has its own self-contained drawing of the same seven houses', () => {
  for (const d of [ES_SUMMER, ES_WINTER]) {
    assert.equal(d.houses.length, 7);
    for (const k of ['hive', 'greenhouse', 'scarecrow', 'barrel', 'meteo', 'compost'] as const) assert.ok(d.items[k].length > 50, k);
    const ids = new Set([...d.defs.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
    const used = [...[d.back, d.backs.kuban, d.backs.altai, d.front, ...d.houses, ...d.camps, ...Object.values(d.items)].join('').matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]);
    for (const id of used) { assert.ok(id.startsWith('es-'), id); assert.ok(ids.has(id), `missing def ${id}`); }
  }
});
