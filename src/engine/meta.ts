// The meta layer between two saves (docs/PROGRESSION-v3.md §3): the home farm sends a cart to an expedition and
// gets back what the folded farm earned; a bankrupt mortgaged home is worked off on expeditions. Pure functions:
// they take states and return new ones, the UI stores them.
import { CROPS, DECK_MIN, EXPEDITION_IDS, ExpeditionId, LOCATIONS, PetId, CropId, SEED_BANK_OK, TRACKS, WORKERS, WorkerId } from './data';
// (bedsUsed and workerSlots: a returning worker may overfill the house; hiring then waits for a bed)
import {
  Card, GameError, GameState, Worker, addMats, deckCount, deckList, infl, money, newGame, note, ownedTiles, plural, raiseSoil, returnCards,
  round2, wakeHome, workerSlots, bedsUsed, lvl, beat,
} from './game';
import { CONDITIONS, LOOT, LootId, PlotOffer, RELICS, plotOffers } from './run';

const clone = <T,>(x: T): T => structuredClone(x);
const fail = (m: string): never => { throw new GameError(m); };

/** profile glory that opens a region for expeditions (the rent is always open) */
export const expeditionOpen = (loc: ExpeditionId, glory: number) => glory >= LOCATIONS[loc].glory;
/** the cart's cash: up to 60 ₽ (inflated), twice that from the rank «Лучший садовод района» (glory 450) */
export const cartCashMax = (home: GameState, glory = 0) => Math.max(0, Math.min(Math.floor(home.money), Math.round(60 * infl(home.year) * (glory >= 450 ? 2 : 1))));
export const CART_CARDS = 3;
/** cards on the cart: 3, four from the rank «Мастер урожая» (glory 250) */
export const cartCardLimit = (glory = 0) => CART_CARDS + (glory >= 250 ? 1 : 0);
export interface Cart { uids: number[]; worker?: WorkerId; cash: number }

/** the three plots on offer for this departure (a condition and a find each), fixed for the home's week */
export const departureOffers = (home: GameState, loc: ExpeditionId): PlotOffer[] => plotOffers(loc, `${home.seed}|${home.absWeek}|${home.year}`);
/** cards that can ride in the cart: the home's own deck and spare cards, not one-off ones */
export const cartCards = (home: GameState): Card[] => [...deckList(home), ...home.spare].filter((c) => !c.temp);
export const cartWorkers = (home: GameState): Worker[] => home.team.filter((w) => w.away === 0 && w.leaves === undefined);

export function departProblem(home: GameState, loc: ExpeditionId, glory: number, cart?: Cart): string | null {
  if (!EXPEDITION_IDS.includes(loc)) return 'Туда вылазок нет';
  if (home.loc !== 'chernozem') return 'Вылазка собирается из родного дома';
  if (home.away) return `Обоз уже в пути: ${LOCATIONS[home.away.loc].name}. Сначала сверните то хозяйство`;
  if (home.phase === 'shortfall') return 'Сначала решите вопрос с платежом';
  if (home.phase === 'gameover') return 'Дом закрыт';
  if (!expeditionOpen(loc, glory)) return `Откроется со славой ${LOCATIONS[loc].glory}`;
  if (!cart) return null;
  const uids = [...new Set(cart.uids)];
  if (uids.length > cartCardLimit(glory)) return `В обоз помещается ${cartCardLimit(glory)} ${plural(cartCardLimit(glory), 'карта', 'карты', 'карт')}`;
  const own = cartCards(home);
  if (!uids.every((u) => own.some((c) => c.uid === u))) return 'Такой карты в колоде нет';
  const fromDeck = uids.filter((u) => deckList(home).some((c) => c.uid === u)).length;
  if (deckCount(home) - fromDeck < DECK_MIN) return `Дома в колоде должно остаться хотя бы ${DECK_MIN} карт`;
  if (cart.worker && !cartWorkers(home).some((w) => w.id === cart.worker)) return 'Этот работник сейчас не может уехать';
  if (!(cart.cash >= 0) || cart.cash > cartCashMax(home, glory)) return `С собой можно взять до ${money(cartCashMax(home, glory))}`;
  return null;
}

/** the cart leaves: cards, a worker and cash go from the home to a new expedition farm */
export function depart(home: GameState, loc: ExpeditionId, offer: PlotOffer, cart: Cart, seed: string, profile: { glory: number; pets?: PetId[]; seedBank?: CropId[] }): { home: GameState; run: GameState } {
  const why = departProblem(home, loc, profile.glory, cart);
  if (why) fail(why);
  if (!departureOffers(home, loc).some((o) => o.cond === offer.cond && o.relic === offer.relic)) fail('Такого участка не предлагали');
  const h = clone(home);
  const uids = [...new Set(cart.uids)];
  const cards: Card[] = [];
  for (const k of ['hand', 'draw', 'discard', 'spare'] as const) {
    h[k] = h[k].filter((c) => { if (!uids.includes(c.uid)) return true; cards.push(c); return false; });
  }
  const worker = cart.worker ? h.team.find((w) => w.id === cart.worker) : undefined;
  if (worker) h.team = h.team.filter((w) => w !== worker);
  const cash = Math.round(cart.cash);
  h.money = round2(h.money - cash);
  h.away = { loc, seed, cards: clone(cards), ...(worker ? { worker: clone(worker) } : {}), cash, week: h.absWeek };
  const run = newGame({
    loc, seed, pets: profile.pets, seedBank: profile.seedBank,
    run: { cond: offer.cond, relics: [offer.relic], cards, ...(worker ? { worker } : {}), cash, home: home.seed, ...(home.phase === 'arrest' ? { work: true } : {}) },
  });
  const what = [cards.length ? `${cards.length} ${plural(cards.length, 'карта', 'карты', 'карт')}` : '', worker ? WORKERS[worker.id].name : '', cash ? money(cash) : ''].filter(Boolean).join(', ');
  note(h, `Обоз ушёл: ${LOCATIONS[loc].name}, участок «${CONDITIONS[offer.cond].name}»${what ? `. С собой: ${what}` : ''}.`, 'info');
  return { home: h, run };
}

/** the cart comes back without a farm to fold (the expedition's save was lost): cards and the worker return, no cash */
export function recallCart(home: GameState): GameState {
  if (!home.away) return home;
  const h = clone(home);
  returnCards(h, h.away!.cards);
  if (h.away!.worker) welcome(h, h.away!.worker!);
  note(h, 'Обоз вернулся ни с чем.', 'info');
  delete h.away;
  return h;
}
/** the worker of the cart comes home to the bed they left: with their level (trained on the expedition too), even if
 *  the house filled up meanwhile — then nobody new is hired until a bed is free */
function welcome(h: GameState, w: Worker) {
  const there = h.team.find((x) => x.id === w.id);
  if (there) { there.level = Math.max(there.level, w.level); delete there.leaves; delete there.free; return; }
  h.team.push({ id: w.id, level: w.level, away: 0 });
  h.candidates = h.candidates.filter((x) => x !== w.id);
  h.freeHire = h.freeHire.filter((x) => x !== w.id);
  if (bedsUsed(h) > workerSlots(h)) note(h, `${WORKERS[w.id].name} вернулся на своё место. В доме тесно: новых не нанять, пока не освободится кровать.`, 'info');
}

/** a finished expedition (folded or bankrupt) hands over to the home it came from: cash first pays an arrest's debt,
 *  then the finds, the camp's materials, the cards and the worker of the cart. Returns null when there is nothing to do. */
export function settleRun(home: GameState | null, run: GameState): { home: GameState | null; run: GameState } | null {
  const r = run.run;
  if (!r || run.phase !== 'gameover' || r.result?.settled) return null;
  const res = r.result ?? { cash: 0, loot: [], mats: {}, cards: [], bankrupt: true };
  const done = clone(run);
  done.run!.result = { ...clone(res), settled: true };
  if (!home || home.away?.seed !== run.seed) return { home, run: done };
  let h = clone(home);
  const k = infl(h.year);
  let cash = res.cash;
  const lines: string[] = [];
  for (const id of res.loot) {
    const L = LOOT[id];
    if (L.cash) cash += Math.round(L.cash * k);
    if (L.mats) addMats(h, L.mats);
    if (L.seed) {
      if (SEED_BANK_OK[L.seed]?.includes('chernozem') && !h.unlocked.includes(L.seed)) h.unlocked.push(L.seed);
      h.rewardsOut.push({ id: `${run.seed}|loot|${id}`, kind: 'seed', value: L.seed });
    }
    if (L.worker && !h.team.some((w) => w.id === L.worker)) {
      if (!h.freeHire.includes(L.worker)) h.freeHire.push(L.worker);
      if (!h.candidates.includes(L.worker)) h.candidates.push(L.worker);
    }
    if (id === 'blacksoil') for (const [, x, y] of ownedTiles(h).filter(([t]) => t.soil < 5).sort((a, b) => a[0].soil - b[0].soil).slice(0, 4)) raiseSoil(h, x, y, 1);
    if (id === 'swarm' && lvl(h, 'apiary') < TRACKS.apiary.levels.length) h.levels.apiary = lvl(h, 'apiary') + 1;
    if (id === 'litter') for (let i = 0; i < 3; i++) h.discard.push({ uid: h.nextUid++, def: 'compost', temp: true });
    lines.push(L.name);
  }
  addMats(h, res.mats);
  returnCards(h, res.cards);
  const w = res.worker ?? h.away!.worker;
  if (w) welcome(h, w);
  const name = LOCATIONS[run.loc].name;
  delete h.away;
  // 29.10 · a haul is remembered by the home (the chronicle's «Три края», the House's list) and Пряхин has a word
  if (!res.bankrupt) {
    h.trips = [...(h.trips ?? []), { loc: run.loc as ExpeditionId, year: h.year, loot: [...res.loot] }];
    beat(h, `trip-${run.loc}`);
  }
  if (h.phase === 'arrest' && h.arrest) {
    const pay = Math.min(cash, h.arrest.debt);
    h.arrest.debt = round2(h.arrest.debt - pay);
    cash = round2(cash - pay);
    h.arrest.runs -= 1;
    if (h.arrest.debt <= 0) {
      h = wakeHome(h);
      note(h, `${name}: заработки закрыли долг (${money(pay)}).`, 'good');
    } else if (h.arrest.runs <= 0 || res.bankrupt) {
      h.phase = 'gameover';
      h.over = { reason: 'Долг не закрыт: дом с молотка купил Пряхин' };
      note(h, 'Дом ушёл с молотка. Пряхин записал покупку в тетрадь.', 'bad');
      return { home: h, run: done };
    } else note(h, `${name}: в счёт долга ${money(pay)}. Осталось ${money(h.arrest.debt)}, вылазок — ${h.arrest.runs}.`, 'bad');
  } else if (h.phase === 'gameover' && h.over?.work) {
    // the home went bankrupt while the cart was away: what the cart brings pays the bank first, and a debt paid in
    // full wakes the house (next spring) without an arrest
    const pay = Math.min(cash, h.over.work);
    cash = round2(cash - pay);
    const left = round2(h.over.work - pay);
    if (left <= 0) {
      h = wakeHome(h);
      note(h, `${name}: обоз закрыл долг банку (${money(pay)}). Дом спасён.`, 'good');
    } else {
      h.over = { ...h.over, work: left };
      note(h, `${name}: в счёт долга ${money(pay)}, осталось ${money(left)}.`, 'bad');
    }
  }
  if (cash > 0) { h.money = round2(h.money + cash); h.earned = round2(h.earned + cash); }
  const back = [cash > 0 ? money(cash) : '', ...lines, res.cards.length ? `${res.cards.length} ${plural(res.cards.length, 'карта', 'карты', 'карт')}` : ''].filter(Boolean);
  note(h, res.bankrupt ? `Обоз вернулся с вылазки (${name}) почти пустым${back.length ? `: ${back.join(', ')}` : ''}.` : `Обоз вернулся: ${name}. Привезли ${back.join(', ') || 'опыт'}.`, res.bankrupt ? 'bad' : 'good');
  return { home: h, run: done };
}

/** describe a run's finds for the fold screen */
export const lootLine = (id: LootId) => `${LOOT[id].name} — ${LOOT[id].text}`;
export const relicLine = (id: keyof typeof RELICS) => `${RELICS[id].name}: ${RELICS[id].text}`;
export const cropName = (c: CropId) => CROPS[c].name;
