// QA matrix 28.10 (ECO / ORG / UP) at the engine level. Tests named «FIX …» reproduce a bug found by the matrix
// and fixed in the same change (they failed before it); the rest pin rows that were checked and hold.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine/game';
import * as D from '../src/engine/data';
import { testDate } from '../src/engine/testLab';
import { syncProfile, syncFarm, emptyProfile, validFarm } from '../src/ui/persist';

function quiet(loc: D.LocationId = 'chernozem', season = 1, year = 1): G.GameState {
  const s = G.newGame({ loc, seed: 'QA-ECO' });
  testDate(s, season, year);
  s.money = 1000; s.days = 20; s.crowWarn = []; s.kidsWarn = [];
  for (const t of s.tiles) Object.assign(t, { owned: true, terrain: 'plain', crop: null, moisture: 3, soil: 3, structure: null, weeds: false, canal: false, mulch: 0, shelter: 0, drip: false, snow: false, idle: 0, clean: 0, last: null });
  for (const o of Object.values(s.orgs)) if (o) { o.wait = 1000; o.offer = null; o.active = null; }
  return s;
}
function plant(s: G.GameState, x: number, y: number, id: D.CropId, grown = 0) {
  const t = G.tile(s, x, y);
  t.crop = { id, grown, bonus: 0, mult: 1, planted: s.absWeek, pid: s.nextPid++, ...(D.CROPS[id].perennial ? { years: D.CROPS[id].perennial } : {}) };
  return t.crop;
}
const card = (s: G.GameState, def: string, extra: Partial<G.Card> = {}) => { const c: G.Card = { uid: s.nextUid++, def, ...extra }; s.hand.push(c); return c; };
const pay = (s: G.GameState) => (s.phase === 'shortfall' ? G.apply(s, { t: 'pay' }) : s);
const weekFeed = (s: G.GameState, week: number) => s.feed.filter((f) => f.week === week).map((f) => f.text);
function date(s: G.GameState, week: number) {
  s.week = week; s.absWeek = s.yearStart + week - 1;
  const loc = D.LOCATIONS[s.loc]; let k = 0, w = week;
  while (w > loc.seasons[k]) { w -= loc.seasons[k]; k++; }
  s.season = k as G.GameState['season']; s.weekInSeason = w;
}
const order = (s: G.GameState, org: D.OrgId, lines: G.QuestLine[], extra: Partial<G.Quest> = {}): G.Quest =>
  ({ id: s.nextQuestId++, org, step: s.orgs[org]!.step, title: 'QA', text: '', lines, pay: 50, rel: 18, weeks: 4, deadline: s.absWeek + 4, ...extra });

// ---------------------------------------------------------------- ECO-01 / ECO-02
test('ECO-01 · a bank loan and seeds on supplier credit: interest once per week, the seed debt joins the next payment', () => {
  let s = quiet();
  s = G.apply(s, { t: 'borrow', amount: 50 });
  s.money = 1; const c = card(s, 'seed_potato');
  const cost = G.round2(G.seedCost(s, 'potato') * G.cardCells(c).length), debt = G.seedDebt(s, cost);
  s = G.apply(s, { t: 'play', uid: c.uid, tiles: G.placements(s, c)[0].tiles });
  assert.equal(s.money, 0); assert.equal(s.carry, debt);
  const np = G.nextPayment(s);
  assert.equal(np.amount, G.paymentBase(s, np.season) + debt, 'the supplier debt is visible in the next payment');
  s.money = 100;
  for (let k = 0; k < 3; k++) {
    assert.equal(G.paymentNow(s), null);
    const i = G.loanInterest(s.loans[0]), n = G.endWeek(s);
    assert.equal(G.round2(n.stats.interest - s.stats.interest), i);
    assert.deepEqual(n.lastReport!.costs.filter((x) => x.label === 'проценты'), [{ label: 'проценты', amount: i }]);
    assert.equal(n.money, G.round2(s.money - i)); assert.equal(G.outstanding(n), 50);
    s = n;
  }
});

test('ECO-02 · repaying a loan in the week of a mandatory payment: each amount charged exactly once', () => {
  let s = quiet(); const p = G.paymentSchedule(s).find((x) => x.season === 1 && x.part === 1)!; date(s, p.week);
  s = G.apply(s, { t: 'borrow', amount: 50 }); s.money = 500;
  s = G.apply(s, { t: 'repay', id: s.loans[0].id, amount: 20 });
  assert.equal(s.money, 480); assert.equal(G.outstanding(s), 30);
  const due = G.paymentBase(s, 1) + s.carry, i = G.loanInterest(s.loans[0]);
  const n = G.endWeek(s);
  assert.equal(n.phase, 'week');
  assert.equal(n.money, G.round2(480 - i - due));
  assert.equal(G.round2(n.stats.payments - s.stats.payments), due);
  assert.equal(G.round2(n.stats.interest - s.stats.interest), i);
  assert.equal(weekFeed(n, s.absWeek).filter((t) => t.includes('внесено')).length, 1);
  // in a shortfall: a repayment is allowed, the payment still asks for the full amount once
  let t = quiet(); date(t, p.week); t = G.apply(t, { t: 'borrow', amount: 50 }); t.money = 10; t = G.endWeek(t);
  assert.equal(t.phase, 'shortfall'); const owed = t.due!.amount;
  t = G.apply(t, { t: 'repay', id: t.loans[0].id, amount: 5 }); t.money = owed; t = G.apply(t, { t: 'pay' });
  assert.equal(t.money, 0); assert.equal(t.phase, 'week');
});

// ---------------------------------------------------------------- ECO-03
test('FIX ECO-03 · with exactly enough money the seeds are bought: cardBlockReason and sow agree to the kopeck', () => {
  // year 2 with a seeder: potato costs 3.20 a cell, 3 cells = 9.60 (3.2 * 3 = 9.600000000000001 in floats).
  // After a restructured payment the carried debt is above the supplier credit cap.
  const s = quiet('chernozem', 1, 2); s.levels.machinery = 1; s.carry = 40; s.restructured = true;
  const c = card(s, 'seed_potato');
  const cost = G.round2(G.seedCost(s, 'potato') * G.cardCells(c).length);
  assert.equal(cost, 9.6); assert.ok(s.carry > G.seedCreditCap(s));
  s.money = cost;
  assert.equal(G.cardBlockReason(s, c), null, 'the farm has the full price in cash: no credit is needed');
  const n = G.apply(s, { t: 'play', uid: c.uid, tiles: G.placements(s, c)[0].tiles });
  assert.equal(n.money, 0); assert.equal(n.carry, 40);
});

test('ECO-03 · at the 30×inflation boundary the supplier credit is never exceeded and both checks agree', () => {
  for (const year of [1, 2, 3, 4]) for (const crop of ['radish', 'potato', 'wheat', 'cabbage', 'pumpkin'] as D.CropId[]) {
    const s = quiet('chernozem', 1, year); const c = card(s, `seed_${crop}`);
    const cost = G.round2(G.seedCost(s, crop) * G.cardCells(c).length), cap = G.seedCreditCap(s);
    for (const money of [0, 0.01, G.round2(cost / 2)]) {
      const debt = G.seedDebt({ ...s, money }, cost);
      for (const carry of [G.round2(cap - debt), G.round2(cap - debt + 0.01)]) {
        const t = structuredClone(s); t.money = money; t.carry = carry;
        const blocked = G.cardBlockReason(t, c) !== null;
        let sown: G.GameState | null = null;
        try { sown = G.apply(t, { t: 'play', uid: c.uid, tiles: G.placements(t, c)[0].tiles }); } catch (e) { if (!(e instanceof G.GameError)) throw e; }
        assert.equal(blocked, sown === null, `${crop} y${year} money ${money} carry ${carry}`);
        assert.equal(blocked, carry + debt > cap);
        if (sown) assert.ok(sown.carry <= cap + 1e-9);
      }
    }
  }
});

// ---------------------------------------------------------------- ECO-04
test('FIX ECO-04 · the goat\'s milk money appears in the week journal (PSV-031)', () => {
  const s = quiet(); s.pets = ['goat']; const milk = Math.round(3 * G.infl(s.year));
  const n = G.endWeek(s);
  assert.equal(n.money - s.money, milk);
  assert.ok(weekFeed(n, s.absWeek).some((t) => t.includes(G.money(milk))), `no journal entry for +${G.money(milk)}: ${JSON.stringify(weekFeed(n, s.absWeek))}`);
});

test('FIX ECO-04 · the goat\'s milk of the week pays that week\'s salary before anything is borrowed', () => {
  const s = quiet(); s.pets = ['goat']; s.money = 0; s.team = [{ id: 'foreman', level: 1, away: 0 }];
  const milk = Math.round(3 * G.infl(s.year)), salary = G.weeklyCosts(s).salaries;
  assert.ok(milk > salary);
  const n = G.endWeek(s);
  assert.equal(G.outstanding(n), 0, 'cash earned in the same settlement covers the salary');
  assert.equal(n.money, milk - salary);
});

test('ECO-04 · a side job\'s pay is written in the journal like every other income', () => {
  let s = quiet(); const c = card(s, 'sidejob'); const earned = G.sidejobPay(s);
  s = G.apply(s, { t: 'play', uid: c.uid });
  assert.ok(weekFeed(s, s.absWeek).some((t) => t.includes(G.money(earned))), `no journal entry for +${G.money(earned)}`);
});

test('ECO-04 · in a payment week an order premium and an insurance payout are in the report and the journal', () => {
  let s = quiet(); const p = G.paymentSchedule(s).find((x) => x.season === 1 && x.part === 3)!; date(s, p.week);
  s.orgs.council!.step = 2; s.orgs.council!.active = order(s, 'council', [{ crop: 'wheat', qty: 20 }], { step: 2, pay: 100, reward: D.ORGS.council.steps[2].reward });
  s.storage = [{ crop: 'wheat', qty: 20, age: 0 }];
  const bonus = Math.round(D.ORGS.council.steps[2].reward!.money! * G.infl(s.year));
  s = G.apply(s, { t: 'deliver', org: 'council' });
  assert.ok(weekFeed(s, s.absWeek).some((t) => t.includes(`премия +${G.money(bonus)}`)));
  const crop = plant(s, 2, 2, 'potato', 2); s.insurance = 1;
  s.strikes = [{ kind: 'locust', ep: 1, week: s.absWeek, cells: [[2, 2, crop.pid]], zone: false }];
  const n = G.endWeek(s);
  assert.ok(n.lastReport!.insurancePaid! > 0);
  assert.ok(weekFeed(n, s.absWeek).some((t) => t.includes(`Страховка: +${G.money(n.lastReport!.insurancePaid!)}`)));
  assert.equal(n.phase, 'week');
});

// ---------------------------------------------------------------- ECO-05
test('FIX ECO-05 · costs the farm cannot pay are borrowed visibly: unpaid interest and salary are journaled', () => {
  const s = quiet(); s.money = 0; s.team = [{ id: 'foreman', level: 1, away: 0 }];
  s.loans = [{ id: s.nextLoanId++, principal: 100, rate: 0.03 }];
  const n = G.endWeek(s), grew = G.round2(G.outstanding(n) - G.outstanding(s));
  assert.equal(grew, 5, 'interest 3 and salary 2 are added to the debt');
  assert.ok(weekFeed(n, s.absWeek).some((t) => t.includes(G.money(grew))), `debt grew by ${G.money(grew)} without a journal entry: ${JSON.stringify(weekFeed(n, s.absWeek))}`);
});

test('ECO-05 · six years of steady paying play: every number finite, no hidden loans, payments follow the formula', () => {
  for (const loc of D.LOCATION_IDS) {
    let s = G.newGame({ loc, seed: `QA-ECO-LONG-${loc}` }); s.money = 100000;
    const finite = (st: G.GameState) => [st.money, st.carry, st.earned, st.peak, ...Object.values(st.stats), ...st.loans.flatMap((l) => [l.principal, l.rate]), ...[...st.storage, ...st.yard].map((l) => l.qty), ...Object.values(st.orgs).map((o) => o!.rel)].every(Number.isFinite);
    while (s.yearsCompleted < 6) {
      s = pay(s);
      for (const c of [...s.hand]) {
        if (G.cardBlockReason(s, c) || D.CARDS[c.def].kind !== 'seed') continue;
        const pl = G.placements(s, c); if (pl.length) s = G.apply(s, { t: 'play', uid: c.uid, tiles: pl[0].tiles });
      }
      for (const crop of D.CROP_IDS) { const q = G.freeStock(s, crop); if (q > 0) s = G.apply(s, { t: 'sell', crop, qty: q }); }
      const p = G.paymentNow(s); const before = s.stats.payments, base = p ? G.paymentDue(s, p.season) + s.carry : 0;
      s = pay(G.endWeek(s));
      if (p) assert.equal(G.round2(s.stats.payments - before), base);
      assert.ok(finite(s), `${loc} y${s.year} w${s.week}`); assert.equal(s.loans.length, 0); assert.ok(s.money >= 0);
    }
    assert.equal(G.paymentBase(s, 2), Math.round(112 * Math.pow(1.42, s.year - 1) * D.LOCATIONS[loc].payMult));
    // v3 §3.1–3.2 · three autumn payments buy the home out: from then on it pays only the yearly tax
    if (G.isHome(s)) { assert.equal(s.owned, true); assert.equal(G.paymentDue(s, 2), G.homeTax(s)); assert.equal(G.paymentSchedule(s).length, 1); }
  }
});

// ---------------------------------------------------------------- ECO-06 / ECO-07 / ECO-08 / ECO-10
test('ECO-06 · a full barn: the overflow waits one whole week in the yard, then the reseller pays 60%', () => {
  let s = quiet(); s.storage = [{ crop: 'radish', qty: 40, age: 0 }]; plant(s, 2, 2, 'onion', D.CROPS.onion.grow - 1);
  assert.equal(G.storageUsed(s), G.storageCap(s));
  s = G.endWeek(s);
  const q = s.lastReport!.overflow; assert.ok(q > 0); assert.equal(s.lastReport!.yardSold, 0);
  assert.deepEqual(s.yard, [{ crop: 'onion', qty: q, age: 0, bornWeek: s.absWeek - 1 }]);
  const price = G.round2(G.priceOf(s, 'onion') * 0.6), cash = s.money;
  const n = G.endWeek(s);
  assert.equal(n.lastReport!.yardUnits, q); assert.equal(n.lastReport!.yardSold, G.round2(q * price));
  assert.equal(n.money, G.round2(cash + q * price)); assert.deepEqual(n.yard, []); assert.equal(G.stockOf(n, 'onion'), 0);
});

test('ECO-07/ORG-05 · a full barn with stock reserved for an order: only an explicit allowReserved sale touches it', () => {
  let s = quiet(); s.storage = [{ crop: 'radish', qty: 30, age: 0 }, { crop: 'potato', qty: 10, age: 2 }]; s.yard = [{ crop: 'potato', qty: 5, age: 0, bornWeek: s.absWeek }];
  s.orgs.council!.active = order(s, 'council', [{ crop: 'potato', qty: 12 }]);
  assert.equal(G.freeStock(s, 'potato'), 3);
  const p = G.marketPrice(s, 'potato');
  let n = G.apply(s, { t: 'sell', crop: 'potato', qty: 10 });
  assert.equal(G.stockOf(n, 'potato'), 12); assert.equal(n.money, G.round2(s.money + 3 * p)); assert.equal(G.deliverProblem(n, 'council'), null);
  assert.throws(() => G.apply(n, { t: 'sell', crop: 'potato', qty: 1 }), G.GameError);
  n = G.apply(n, { t: 'sell', crop: 'potato', qty: 5, allowReserved: true });
  assert.equal(G.stockOf(n, 'potato'), 7); assert.equal(n.money, G.round2(s.money + 8 * p));
  assert.equal(G.reservedStock(n, 'potato'), 12); assert.ok(G.deliverProblem(n, 'council'));
  assert.ok([...n.storage, ...n.yard].every((l) => l.qty > 0)); assert.ok(G.storageUsed(n) <= G.storageCap(n));
});

test('ECO-08 · an overfull barn without a cat: the mice warning names exactly what the week end nibbles', () => {
  const s = quiet(); s.storage = [{ crop: 'wheat', qty: 25, age: 1 }, { crop: 'potato', qty: 9, age: 1 }, { crop: 'radish', qty: 6, age: 0 }];
  s.yard = [{ crop: 'wheat', qty: 12, age: 0, bornWeek: s.absWeek - 1 }];
  assert.deepEqual(G.miceTargets(s), ['wheat']);
  const n = G.endWeek(s);
  assert.equal(n.lastReport!.mice, Math.max(1, Math.floor(25 * 0.03)));
  assert.equal(G.stockOf(n, 'potato'), 9);
  const cat = structuredClone(s); cat.pets = ['cat']; assert.deepEqual(G.miceTargets(cat), []); assert.equal(G.endWeek(cat).lastReport!.mice, 0);
});

test('FIX ECO-08 · goods carried from the yard into the barn at the week end are not nibbled behind a silent warning', () => {
  // the barn had room again (the player sold radishes), so last week's yard wheat is moved inside at the week end
  const s = quiet(); s.storage = [{ crop: 'radish', qty: 25, age: 0 }, { crop: 'wheat', qty: 5, age: 0 }];
  s.yard = [{ crop: 'wheat', qty: 10, age: 0, bornWeek: s.absWeek - 1 }];
  assert.deepEqual(G.miceTargets(s), [], 'the barn shows no mice warning');
  const n = G.endWeek(s);
  assert.equal(n.lastReport!.mice, 0, 'yet mice ate wheat that was in the yard all week');
  // the same with this week's harvest: 5 wheat in the barn, no warning, a wheat bed ripens
  const h = quiet(); h.storage = [{ crop: 'wheat', qty: 5, age: 0 }]; plant(h, 1, 1, 'wheat', D.CROPS.wheat.grow - 1); plant(h, 2, 1, 'wheat', D.CROPS.wheat.grow - 1);
  assert.deepEqual(G.miceTargets(h), []);
  assert.equal(G.endWeek(h).lastReport!.mice, 0, 'no warning, yet the fresh harvest is nibbled the same night');
});

test('ECO-10 · odd sale quantities never make stock negative; refused sales change nothing', () => {
  const s = quiet(); s.storage = [{ crop: 'potato', qty: 7, age: 0 }];
  for (const qty of [NaN, -1, 0, 0.4, -Infinity]) {
    const before = JSON.stringify(s); assert.throws(() => G.apply(s, { t: 'sell', crop: 'potato', qty }), G.GameError); assert.equal(JSON.stringify(s), before);
  }
  assert.throws(() => G.apply(s, { t: 'sell', crop: 'carrot', qty: 1 }), G.GameError);
  for (const amount of [NaN, -5, 0.5, Infinity]) assert.throws(() => G.apply(s, { t: 'borrow', amount }), G.GameError);
  const loan = G.apply(s, { t: 'borrow', amount: 10.7 }); assert.equal(G.outstanding(loan), 10);
  for (const amount of [NaN, -5, 0]) assert.throws(() => G.apply(loan, { t: 'repay', id: loan.loans[0].id, amount }), G.GameError);
  const repaid = G.apply(loan, { t: 'repay', id: loan.loans[0].id, amount: Infinity }); assert.equal(repaid.loans.length, 0); assert.equal(repaid.money, s.money);
  assert.throws(() => G.apply(s, { t: 'sell', crop: 'nope' as D.CropId, qty: 1 }), G.GameError);
  assert.equal(G.stockOf(G.apply(s, { t: 'sell', crop: 'potato', qty: 2.9 }), 'potato'), 5);
  const all = G.apply(s, { t: 'sell', crop: 'potato', qty: Infinity });
  assert.equal(G.stockOf(all, 'potato'), 0); assert.equal(all.money, G.round2(s.money + 7 * G.marketPrice(s, 'potato')));
});

// ---------------------------------------------------------------- ORG-01 … ORG-06
test('FIX ORG-01 · a cranberry order for a drained swamp disappears once the stock no longer covers it', () => {
  let s = G.newGame({ loc: 'altai', seed: 'audit-regression' });
  s.unlocked.push('cranberry'); s.orgs.sanatorium!.step = 2; s.orgs.sanatorium!.wait = 0;
  for (const o of D.LOCATIONS.altai.orgs) if (o !== 'sanatorium') s.orgs[o]!.wait = 1000;
  for (const a of [{ t: 'buyLand', x: 2, y: 4 }, { t: 'buyLand', x: 3, y: 4 }, { t: 'buyLand', x: 4, y: 3 }, { t: 'clear', x: 2, y: 4 }, { t: 'clear', x: 3, y: 4 }] as G.Action[]) s = G.apply({ ...s, money: 1000, days: 9 }, a);
  s.money = 1000; s.storage.push({ crop: 'cranberry', qty: 5, age: 0 });
  assert.equal(G.cropProducible(s, 'cranberry'), false);
  s = pay(G.endWeek(s));
  const line = s.orgs.sanatorium!.offer?.lines.find((l) => l.crop === 'cranberry');
  assert.ok(line && line.qty <= 5, 'precondition: the order is capped to the stock');
  s = G.apply(s, { t: 'sell', crop: 'cranberry', qty: 4 });
  s = pay(G.endWeek(s));
  const left = G.stockOf(s, 'cranberry'), offer = s.orgs.sanatorium!.offer;
  assert.ok(!offer?.lines.some((l) => l.crop === 'cranberry' && l.qty > left), `an impossible order stays on offer: ${JSON.stringify(offer?.lines)}, stock ${left}`);
});

test('ORG-02 · two missed orders reach −40 and its sanction; a delivered order mends relations and ends it', () => {
  let s = quiet('chernozem', 0);
  for (const k of [1, 2]) { s.orgs.council!.active = order(s, 'council', [{ crop: 'wheat', qty: 99 }], { deadline: s.absWeek }); s = pay(G.endWeek(s)); assert.equal(s.orgs.council!.rel, -20 * k); }
  assert.equal(G.mischiefOn(s, 'council'), true); assert.equal(G.relTier(-40).name, 'Обида');
  s.orgs.council!.active = order(s, 'council', [{ crop: 'wheat', qty: 5 }]); s.storage = [{ crop: 'wheat', qty: 5, age: 0 }];
  s = G.apply(s, { t: 'deliver', org: 'council' });
  assert.equal(s.orgs.council!.rel, -22); assert.equal(G.mischiefOn(s, 'council'), false);
  // the bakery's silence mends by itself, two points a week, and then offers come back
  let b = quiet('chernozem', 1); b.orgs.bakery!.rel = -40; b.orgs.bakery!.wait = 1;
  b = G.endWeek(b); assert.equal(b.orgs.bakery!.rel, -38); assert.equal(G.mischiefOn(b, 'bakery'), false);
  for (let k = 0; k < 4 && !b.orgs.bakery!.offer; k++) b = pay(G.endWeek(b));
  assert.ok(b.orgs.bakery!.offer); assert.equal(b.orgs.bakery!.rel, -38);
});

test('FIX ORG-03 · a fine the farm cannot fully pay is journaled with the amount actually taken', () => {
  const s = quiet('chernozem', 3); date(s, G.yearLen(s)); s.orgs.council!.rel = -50; s.money = 2;
  const n = G.endWeek(s);
  assert.equal(n.money, 0);
  const fine = weekFeed(n, n.absWeek).find((t) => t.startsWith('Сельсовет'))!;
  assert.ok(fine.includes(G.money(2)), `2 ₽ were taken, the journal says: «${fine}»`);
});

test('ORG-03 · orgs left alone for two years: reputation stays put, offers lapse without penalty, fines at most every 6 weeks', () => {
  let s = quiet('chernozem', 0); s.money = 100000; for (const o of Object.values(s.orgs)) if (o) o.wait = 1;
  s.orgs.council!.rel = -45; const fines: number[] = [];
  for (let k = 0; k < 46; k++) {
    s = pay(G.endWeek(s));
    if (weekFeed(s, s.absWeek).some((t) => t.startsWith('Сельсовет: проверка'))) fines.push(s.absWeek);
  }
  for (const o of ['orphanage', 'bakery', 'restaurant', 'college'] as D.OrgId[]) assert.equal(s.orgs[o]!.rel, 0, o);
  assert.equal(s.orgs.council!.rel, -45);
  assert.ok(fines.length >= 2 && fines.every((w, i) => i === 0 || w - fines[i - 1] >= 6), JSON.stringify(fines));
});

test('ORG-04 · the end of a chain survives save/load: pet, certificate and glory granted once', () => {
  let s = quiet(); s.orgs.orphanage!.step = 2;
  s.orgs.orphanage!.active = order(s, 'orphanage', [{ crop: 'carrot', qty: 8 }], { step: 2, reward: D.ORGS.orphanage.steps[2].reward });
  s.storage = [{ crop: 'carrot', qty: 30, age: 0 }];
  s = JSON.parse(JSON.stringify(G.apply(s, { t: 'deliver', org: 'orphanage' })));
  assert.throws(() => G.apply(s, { t: 'deliver', org: 'orphanage' }), G.GameError);
  s.orgs.orphanage!.active = order(s, 'orphanage', [{ crop: 'carrot', qty: 8 }], { step: 3, reward: D.ORGS.orphanage.steps[3].reward });
  const glory = s.glory; s = JSON.parse(JSON.stringify(G.apply(s, { t: 'deliver', org: 'orphanage' })));
  assert.equal(s.orgs.orphanage!.step, 4); assert.equal(s.glory, glory + 10 + 20 + 15 + 25);
  assert.equal(s.pets.filter((p) => p === 'dog').length, 1); assert.deepEqual(s.certs, [D.ORGS.orphanage.steps[3].reward!.cert]);
  const p1 = syncProfile(emptyProfile(), s), p2 = syncProfile(p1, JSON.parse(JSON.stringify(s)));
  assert.equal(p2, p1); assert.equal(p1.pets.length, 1); assert.equal(p1.certs.length, 1);
  assert.equal(new Set(s.rewardsOut.map((r) => r.id)).size, s.rewardsOut.length);
  s = pay(G.endWeek(s)); assert.equal(s.pets.length, 1); assert.equal(s.orgs.orphanage!.active, null);
});

test('FIX ORG-04 · a one-off reward card reaches the deck even when the deck is full (one-off cards take no place)', () => {
  const s = G.newGame({ loc: 'chernozem', seed: 'QA-ECO' }); s.money = 1000;
  assert.equal(G.deckCount(s), G.deckLimit(s));
  s.orgs.college!.step = 2; s.orgs.college!.active = order(s, 'college', [{ crop: 'wheat', qty: 10 }], { step: 2, reward: D.ORGS.college.steps[2].reward });
  s.storage = [{ crop: 'wheat', qty: 10, age: 0 }];
  const n = G.apply(s, { t: 'deliver', org: 'college' });
  assert.ok(G.deckList(n).some((c) => c.def === 'bio' && c.temp), `the «bio» card is stuck among spare cards: ${JSON.stringify(n.spare)}`);
});

test('FIX ORG-04 · a worker reward for someone already on the team adds no phantom candidate', () => {
  const s = quiet(); s.team = [{ id: 'agronomist', level: 1, away: 0 }]; s.orgs.college!.step = 1;
  s.orgs.college!.active = order(s, 'college', [{ crop: 'wheat', qty: 1 }], { step: 1, reward: D.ORGS.college.steps[1].reward });
  s.storage = [{ crop: 'wheat', qty: 1, age: 0 }];
  const n = G.apply(s, { t: 'deliver', org: 'college' });
  assert.ok(!n.candidates.some((id) => n.team.some((w) => w.id === id)), `candidates ${n.candidates} include a team member`);
});

test('FIX ORG-06 · a missed order costs a «silent» org the −20 the report announces, so −20 → −40 starts its sanction', () => {
  const s = quiet('chernozem', 1); s.orgs.bakery!.rel = -20;
  s.orgs.bakery!.active = order(s, 'bakery', [{ crop: 'wheat', qty: 99 }], { deadline: s.absWeek });
  const n = G.endWeek(s);
  assert.ok(n.lastReport!.lost.some((l) => l.startsWith('Пекарня') && l.includes('−20')));
  assert.equal(n.orgs.bakery!.rel, -40, 'the same tick already refunds +2 of «silence» recovery');
  assert.equal(G.mischiefOn(n, 'bakery'), true);
});

test('ORG-06 · relation thresholds 25 and −40 act exactly at the boundary', () => {
  const s = quiet(); const st = s.orgs.bakery!;
  st.rel = 24; const plain = G.sellMult(s, 'wheat'); assert.equal(G.friends(s, 'bakery'), false);
  st.rel = 25; assert.equal(G.friends(s, 'bakery'), true); assert.equal(G.sellMult(s, 'wheat'), plain * 1.1); assert.equal(G.relTier(25).name, 'Дружба');
  for (const [rel, on] of [[-39, false], [-40, true]] as const) {
    const t = quiet('chernozem', 1); date(t, D.LOCATIONS.chernozem.seasons[0] + D.LOCATIONS.chernozem.seasons[1]); t.orgs.council!.rel = rel;
    const n = pay(G.endWeek(t)); assert.equal(n.season, 2);
    assert.equal(weekFeed(n, n.absWeek).some((x) => x.startsWith('Сельсовет: проверка')), on, `rel ${rel}`);
    assert.equal(G.relTier(rel).name, on ? 'Обида' : 'Холодно');
  }
});

// ---------------------------------------------------------------- UP-01 … UP-07
test('UP-01 · a full workshop or lab refuses new projects without charging; no duplicate project', () => {
  let s = quiet(); s = G.apply(s, { t: 'track', track: 'irrigation' });
  const snap = JSON.stringify(s);
  assert.throws(() => G.apply(s, { t: 'track', track: 'barn' }), /Мастерская занята/); assert.throws(() => G.apply(s, { t: 'track', track: 'irrigation' }), /Уже строится/);
  assert.equal(JSON.stringify(s), snap);
  s.levels.lab = 1; s = G.apply(s, { t: 'labBio' }); const lab = JSON.stringify(s);
  assert.throws(() => G.apply(s, { t: 'labBio' }), /заняты/); assert.throws(() => G.apply(s, { t: 'labVariety', crop: G.labCrops(s)[0] }), /заняты/);
  assert.equal(JSON.stringify(s), lab); assert.equal(s.projects.length, 2);
});

test('UP-02 · a building that finishes in a payment week (also the last before winter) applies once', () => {
  for (const part of [1, 3]) {
    let s = quiet(); const p = part === 1 ? G.paymentSchedule(s)[1] : G.paymentSchedule(s)[4]; date(s, p.week);
    s.projects = [{ kind: 'track', track: 'house', level: 2, weeks: 1, total: 1 }, { kind: 'track', track: 'barn', level: 2, weeks: 1, total: 1 }];
    s.money = 1; s.storage = [{ crop: 'wheat', qty: 30, age: 0 }];
    const glory = s.glory; let n = G.endWeek(s);
    assert.equal(n.phase, 'shortfall'); assert.equal(n.levels.house, 2); assert.equal(n.levels.barn, 2); assert.equal(n.projects.length, 0);
    n.money = 1000; n = G.apply(n, { t: 'pay' });
    assert.equal(n.glory, glory + 5); assert.equal(n.lastReport!.done.length, 2); assert.equal(n.levels.house, 2);
    assert.deepEqual(G.miceTargets(n), []); assert.equal(n.season, part === 1 ? 1 : 3);
  }
});

test('UP-03/UP-04 · hire, train, fire mid-training, upgrade the house: never more workers than places', () => {
  let s = quiet(); s.candidates = ['foreman', 'agronomist', 'irrigator'];
  s = G.apply(s, { t: 'hire', id: 'foreman' });
  assert.throws(() => G.apply(s, { t: 'hire', id: 'agronomist' }), /места/);
  const price = G.trainPrice(s, 'foreman'), cash = s.money;
  s = G.apply(s, { t: 'train', id: 'foreman' }); assert.equal(s.money, cash - price); assert.equal(s.team[0].away, 2); assert.equal(G.wlvl(s, 'foreman'), 0);
  // v3 · the house takes materials, and the second bed comes with the third level (beds 1, 1, 2, …)
  s.mats = { logs: 40, bricks: 40, glass: 10 };
  s = G.apply(s, { t: 'track', track: 'house' }); s = G.endWeek(s);
  s = G.apply(s, { t: 'fire', id: 'foreman' }); assert.equal(s.team.length, 0); assert.equal(G.weeklyCosts(s).salaries, 0);
  while (G.lvl(s, 'house') < 3) {
    assert.ok(s.team.length <= G.workerSlots(s));
    if (!s.projects.some((p) => p.kind === 'track' && p.track === 'house')) { s.money = Math.max(s.money, 500); s = G.apply(s, { t: 'track', track: 'house' }); }
    s = pay(G.endWeek(s));
  }
  s.candidates = ['agronomist', 'irrigator', 'foreman'];
  s = G.apply(s, { t: 'hire', id: 'agronomist' }); s = G.apply(s, { t: 'hire', id: 'irrigator' });
  assert.throws(() => G.apply(s, { t: 'hire', id: 'foreman' }), /места/); assert.equal(s.team.length, G.workerSlots(s));
});

test('FIX UP-05 · moving a settled greenhouse onto its own cell does not silently reset its yield bonus', () => {
  const s = quiet(); s.levels.greenhouse = 4; G.tile(s, 2, 2).structure = 'greenhouse'; plant(s, 2, 2, 'radish', 1);
  const before = G.expectedYield(s, 2, 2);
  assert.ok(!G.buildMoveSpots(s, 'greenhouse', [2, 2]).some(([x, y]) => x === 2 && y === 2), 'the move preview never offers the same cell');
  let n: G.GameState;
  try { n = G.apply(s, { t: 'moveBuild', item: 'greenhouse', from: [2, 2], to: [2, 2] }); } catch (e) { assert.ok(e instanceof G.GameError); return; }
  assert.equal(G.expectedYield(n, 2, 2), before, 'the same-cell move cost this week\'s greenhouse bonus');
});

test('UP-05 · equipment moves: an invalid target changes nothing; a moved greenhouse or hive helps from next week only, never twice', () => {
  const s = quiet(); s.levels.greenhouse = 4; s.levels.apiary = 1; G.tile(s, 1, 1).structure = 'greenhouse'; G.tile(s, 4, 4).structure = 'hive';
  plant(s, 3, 3, 'onion', 0); plant(s, 1, 1, 'onion', 0); plant(s, 4, 3, 'buckwheat', 0);
  const snap = JSON.stringify(s);
  for (const a of [{ t: 'moveBuild', item: 'hive', from: [4, 4], to: [3, 3] }, { t: 'moveBuild', item: 'greenhouse', from: [1, 1], to: [9, 9] }, { t: 'moveBuild', item: 'greenhouse', from: [2, 2], to: [3, 3] }] as G.Action[])
    assert.throws(() => G.apply(s, a), G.GameError);
  assert.equal(JSON.stringify(s), snap);
  const plain = G.expectedYield(s, 3, 3), hived = G.yieldParts(s, 4, 3, 'buckwheat').some((p) => p.label === 'улей рядом');
  assert.ok(hived);
  let n = G.apply(s, { t: 'moveBuild', item: 'greenhouse', from: [1, 1], to: [3, 3] });
  n = G.apply(n, { t: 'moveBuild', item: 'hive', from: [4, 4], to: [5, 3] });
  assert.equal(G.expectedYield(n, 3, 3), plain); assert.equal(G.yieldParts(n, 4, 3, 'buckwheat').some((p) => p.label === 'улей рядом'), false);
  n = G.endWeek(n);
  assert.ok(G.expectedYield(n, 3, 3) > plain); assert.equal(G.yieldParts(n, 4, 3, 'buckwheat').filter((p) => p.label === 'улей рядом').length, 1);
});

test('UP-06/UP-07 · a lab shape change kept through save/load and a region switch returns once, on time, across a season change', () => {
  let s = quiet('chernozem', 0); date(s, D.LOCATIONS.chernozem.seasons[0]); s.levels.lab = 1; s.money = 1000; s.knowBase = { radish: 600, potato: 600, bean: 600, carrot: 600, onion: 600, cabbage: 600, wheat: 600, buckwheat: 600, pumpkin: 600, cranberry: 600 };
  const c = s.hand.find((k) => D.CARDS[k.def].kind === 'seed')!, deck = G.deckCount(s), weeks = G.labWeeksFor(s, 'cell');
  const cell = G.upgradeSpots(s, c).find((sp) => G.spotFits(s, c, sp))!;
  s = G.apply(s, { t: 'labCell', uid: c.uid, cell });
  // the player visits another region and comes back: the farm is reloaded and synced with a profile that brings pets and seeds
  const profile = { ...emptyProfile(), pets: ['cat'] as D.PetId[], seedBank: ['strawberry'] as D.CropId[] };
  for (let k = 1; k <= weeks; k++) {
    s = syncFarm(profile, pay(G.endWeek(JSON.parse(JSON.stringify(s))))); assert.ok(validFarm(s));
    const back = [...s.hand, ...s.draw, ...s.discard, ...s.spare].filter((x) => x.uid === c.uid);
    assert.equal(back.length, k < weeks ? 0 : 1, `week ${k}`);
    if (k === weeks) { assert.equal(back[0].def, c.def); assert.deepEqual(back[0].extra, [cell]); assert.equal(G.cardCells(back[0]).length, G.cardCells(c).length + 1); }
  }
  assert.equal(s.season, 1); assert.equal(G.deckCount(s), deck);
  const k = [...s.hand, ...s.draw, ...s.discard].find((x) => x.uid === c.uid)!;
  s.hand.push(...(s.hand.includes(k) ? [] : [k])); s.draw = s.draw.filter((x) => x !== k); s.discard = s.discard.filter((x) => x !== k);
  const pl = G.placements(s, k)[0]; s = G.apply(s, { t: 'play', uid: k.uid, tiles: pl.tiles });
  assert.ok(pl.tiles.every(([x, y]) => G.tile(s, x, y).crop?.id === D.CARDS[c.def].crop));
});
