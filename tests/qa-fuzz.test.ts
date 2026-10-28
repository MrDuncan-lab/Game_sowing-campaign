// QA matrix 28.10 · a seeded random player tries every kind of action in every region; after each accepted step
// the farm must stay valid and consistent (save validation, finite money, no negative stock, barn capacity, hand and
// keep limits, workers within the house, buildings within stock, no crops under canals or hives). A refused action
// must be a GameError, never a crash. Covers ST-08, CRD-01/09, ECO-05/10, UP-01/04/05 as invariants.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine/game';
import * as D from '../src/engine/data';
import { validFarm } from '../src/ui/persist';

let rng = 12345;
const r = () => { rng = (rng * 1103515245 + 12345) & 0x7fffffff; return rng / 0x7fffffff; };
const pick = <T,>(a: T[]): T => a[Math.floor(r() * a.length)];
const cell = (): [number, number] => [Math.floor(r() * 6), Math.floor(r() * 6)];

function actions(s: G.GameState): G.Action[] {
  const out: G.Action[] = [];
  for (const c of s.hand) {
    if (D.CARDS[c.def].kind === 'seed') { const pl = G.placements(s, c); if (pl.length) out.push({ t: 'play', uid: c.uid, tiles: pick(pl).tiles }); }
    else { const tg = G.playableTargets(s, c.def); out.push({ t: 'play', uid: c.uid, tiles: tg.length ? [pick(tg)] : [cell()], row: Math.floor(r() * 6), col: Math.floor(r() * 6) }); }
    out.push({ t: 'keepCard', uid: c.uid }, { t: 'exchangeCard', uid: c.uid }, { t: 'discardCard', uid: c.uid }, { t: 'compostCard', uid: c.uid });
  }
  const [x, y] = cell();
  out.push({ t: 'drawCard' }, { t: 'claimCompost', uid: s.hand[0]?.uid }, { t: 'waterHand', tiles: [cell()] }, { t: 'weed', x, y }, { t: 'guard', x, y }, { t: 'shoo' }, { t: 'droneCrows' }, { t: 'talkKids' },
    { t: 'plow', x, y }, { t: 'clear', x, y }, { t: 'buyLand', x, y });
  for (const item of ['greenhouse', 'hive', 'drip', 'scarecrow', 'canal'] as G.BuildItem[]) {
    out.push({ t: 'build', item, x, y }, { t: 'unbuild', item, x, y }, { t: 'moveBuild', item, from: cell(), to: cell() });
  }
  for (const crop of D.CROP_IDS) if (G.stockOf(s, crop)) out.push({ t: 'sell', crop, qty: Math.ceil(r() * 20), allowReserved: r() < 0.3 });
  for (const def of G.shopCards(s)) out.push({ t: 'buyCard', def });
  for (const c of G.deckList(s)) out.push({ t: 'deckOut', uid: c.uid });
  for (const c of s.spare) out.push({ t: 'deckIn', uid: c.uid });
  for (const track of Object.keys(D.TRACKS) as D.TrackId[]) out.push({ t: 'track', track });
  const seedCard = [...G.deckList(s), ...s.spare].find((c) => D.isSeed(c.def));
  if (seedCard) {
    const sp = G.upgradeSpots(s, seedCard); if (sp.length) out.push({ t: 'labCell', uid: seedCard.uid, cell: pick(sp) });
    out.push({ t: 'labTrait', uid: seedCard.uid, trait: pick(Object.keys(D.TRAITS) as D.TraitId[]) });
  }
  for (const crop of G.labCrops(s)) out.push({ t: 'labVariety', crop });
  out.push({ t: 'labBio' });
  for (const id of s.candidates) out.push({ t: 'hire', id });
  for (const w of s.team) out.push({ t: 'fire', id: w.id }, { t: 'train', id: w.id });
  for (const o of D.LOCATIONS[s.loc].orgs) out.push({ t: 'accept', org: o }, { t: 'deliver', org: o });
  out.push({ t: 'borrow', amount: Math.ceil(r() * 50) }, { t: 'insure' });
  for (const l of s.loans) out.push({ t: 'repay', id: l.id, amount: Math.ceil(r() * 30) });
  out.push({ t: 'pay' }, { t: 'emergency' }, { t: 'restructure' });
  // malformed input from a broken client must be refused, never crash (CRD-03)
  const junk = [['1', '2'], null, [1.5, 2], [x], {}, 7] as unknown as [number, number][];
  if (s.hand[0]) out.push({ t: 'play', uid: s.hand[0].uid, tiles: [pick(junk)] }, { t: 'play', uid: s.hand[0].uid, tiles: pick(junk) as unknown as [number, number][] });
  out.push({ t: 'waterHand', tiles: pick(junk) as unknown as [number, number][] }, { t: 'build', item: pick(['constructor', 'toString', 'barn']) as G.BuildItem, x, y });
  return out;
}

function check(s: G.GameState, where: string) {
  const bad = (m: string) => { throw new Error(`${where}: ${m}`); };
  if (!validFarm(JSON.parse(JSON.stringify(s)))) bad('validFarm rejects');
  const nums = [s.money, s.carry, s.earned, s.peak, s.glory, ...Object.values(s.stats), ...s.loans.flatMap((l) => [l.principal, l.rate])];
  if (!nums.every(Number.isFinite)) bad('non-finite number');
  if (s.money < -1e-9) bad(`negative money ${s.money}`);
  if ([...s.storage, ...s.yard].some((l) => !(l.qty >= 0))) bad('negative stock');
  if (G.storageUsed(s) > G.storageCap(s)) bad(`barn over capacity ${G.storageUsed(s)}>${G.storageCap(s)}`);
  if (s.hand.length > G.handMax(s)) bad(`hand ${s.hand.length}`);
  if (G.keptCount(s) > G.keepSlots(s)) bad('too many kept');
  if (s.team.length > G.workerSlots(s)) bad('team over slots');
  if (G.countStructure(s, 'greenhouse') > G.greenhousesAllowed(s) || G.countStructure(s, 'hive') > G.hivesAllowed(s)) bad('structures over stock');
  for (const t of s.tiles) {
    if (t.crop && (t.canal || t.structure === 'hive')) bad('crop under canal/hive');
    if (t.crop && !t.owned) bad('crop on foreign land');
    if (t.structure && !t.owned) bad('structure on foreign land');
  }
  if (s.candidates.some((c) => s.team.some((w) => w.id === c))) bad('hired worker is a candidate');
  if (Object.values(s.orgs).some((o) => o && (o.rel < -100 || o.rel > 100))) bad('relation out of range');
}

test('QA fuzz · random play in every region keeps the farm valid and never crashes', () => {
  const stats = { runs: 0, steps: 0, weeks: 0, errors: 0, refused: 0 };
  for (let run = 0; run < 9; run++) {
    const loc = D.LOCATION_IDS[run % 3];
    let s = G.newGame({ loc, seed: `FUZZ-${run}` });
    s.money = run % 2 ? 400 : 3000;
    stats.runs++;
    for (let step = 0; step < 600 && s.phase !== 'gameover'; step++) {
      const end = r() < 0.18;
      const a: G.Action = s.phase === 'shortfall' ? pick<G.Action>([{ t: 'pay' }, { t: 'emergency' }, { t: 'restructure' }, { t: 'sell', crop: pick(D.CROP_IDS), qty: 99 }, { t: 'borrow', amount: 30 }, ...(r() < 0.02 ? [{ t: 'giveUp' } as G.Action] : [])]) : end ? { t: 'endWeek' } : pick(actions(s));
      try {
        const n = G.apply(s, a);
        check(n, `${loc} run ${run} step ${step} ${JSON.stringify(a)}`);
        if (a.t === 'endWeek') stats.weeks++;
        s = n; stats.steps++;
      } catch (e) {
        if (e instanceof G.GameError) { stats.refused++; continue; }
        throw e;
      }
    }
  }
  assert.ok(stats.weeks > 100, JSON.stringify(stats));
});
