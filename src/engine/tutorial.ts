import { apply, expectedYield, handMax, newGame, tile, stockOf, weekDays, workEffectCells, type Action, type GameState, type Card } from './game';
import { CARDS, CROPS, TRACKS, type CropId } from './data';

// The training farm, version 4 (docs/ONBOARDING-v4.md). Written for a newcomer from match-3 games:
// a reward after the very first «Конец недели», one or two new things a week, everything else locked but
// visible. Chapter I takes four weeks and is the one Палыч offers everybody; chapter II is optional and gives
// every topic a week of its own.
//   week 1   plant · rotate · bean · night                Палыч's radish ripens tonight; the player sows beside it
//   week 2   sale · visit · accept · water · play2         the first money; guests order the radish still growing
//   week 3   village · deliver · hail · play3             the order is taken through the village; hail announced
//   week 4   solo                                         a week on one's own with the full hand, then the first rent
//   week 5   chapter · weeds · lens · compost · play5      (chapter II, optional) the land
//   week 6   hire · play6                                 a helper
//   week 7   lab · play7                                  the first selection project
//   week 8   upgrade · play8                              an improvement
//   week 9   place · play9                                a building on the field
//   week 10  practice · done                              an order grown without hints
// The rules of the game are the real ones; only this lesson decides the hand, the weather and the orders.
export const TUTORIAL_STEPS = ['plant','rotate','bean','night','sale','visit','accept','water','play2','village','deliver','hail','play3','solo','chapter','weeds','lens','compost','play5','hire','play6','lab','play7','upgrade','play8','place','play9','practice','done'] as const;
export type TutorialStep = typeof TUTORIAL_STEPS[number];
export const FREE_STEPS: readonly TutorialStep[] = ['play2','play3','play5','play6','play7','play8','play9'];
export const CHAPTER_WEEKS = { I: 4, II: 6 } as const;
export const CHAPTER_I_WEEKS = CHAPTER_WEEKS.I;
// the week of the lesson each step belongs to (the chapter certificate greets the player on the morning of week 5)
export const TUTORIAL_WEEK: Record<TutorialStep, number> = {
  plant:1, rotate:1, bean:1, night:1,
  sale:2, visit:2, accept:2, water:2, play2:2,
  village:3, deliver:3, hail:3, play3:3,
  solo:4, chapter:4,
  weeds:5, lens:5, compost:5, play5:5,
  hire:6, play6:6,
  lab:7, play7:7,
  upgrade:8, play8:8,
  place:9, play9:9,
  practice:10, done:10,
};
export const tutorialChapter = (step: TutorialStep): 'I' | 'II' => TUTORIAL_STEPS.indexOf(step) > TUTORIAL_STEPS.indexOf('chapter') ? 'II' : 'I';
// The hand grows with the player: three cards in the first week, the full hand from the fourth.
// The working days stay three, so the full hand turns into a lesson of choice.
export const HAND_BY_WEEK: Record<number, number> = { 1: 3, 2: 4, 3: 5 };
// Parts of the farm the lesson keeps closed until it needs them. A closed part stays visible with a lock:
// the player can peek at it, nothing there can be used yet.
export type TutorialArea = 'barn' | 'orders' | 'village' | 'deck' | 'tools' | 'shop' | 'bank' | 'house' | 'lab';
export const AREA_OPENS: Record<TutorialArea, TutorialStep> = {
  barn: 'sale', orders: 'visit', village: 'village', deck: 'solo', tools: 'lens', shop: 'weeds', bank: 'weeds', house: 'hire', lab: 'lab',
};
export const AREA_IDS = Object.keys(AREA_OPENS) as TutorialArea[];
export const areaOpen = (step: TutorialStep, area: TutorialArea) => TUTORIAL_STEPS.indexOf(step) >= TUTORIAL_STEPS.indexOf(AREA_OPENS[area]);
// the beds where Палыч's radish ripens on the first night
export const PALYCH_BEDS: readonly [number, number][] = [[1, 1], [2, 1]];
export interface SoloGoals { planted: boolean; watered: boolean; sold: boolean; sell: boolean }
export interface TutorialSession {
  version: 4; farm: GameState; step: TutorialStep; labUid: number;
  watered: boolean; delivered: boolean; checkpoint?: Omit<TutorialSession, 'checkpoint'>;
  plantedAt?: [number, number]; hiddenHintStep?: TutorialStep; orderNotice?: string; weedAt?: [number, number];
  /** the beds that were dry when the watering lesson began: its counter */
  thirsty?: [number, number][];
  /** the week on one's own: what has been done (sell — whether there was anything to sell) */
  solo?: SoloGoals;
  /** chapter II: Палыч's compost, given at its start */
  compostUid?: number;
  /** the first sale's counter: how much of Палыч's radish there was to sell */
  saleOf?: number;
}
export const TUTORIAL_KEY = 'posevnaya.tutorial.atlas.v4';
export const TUTORIAL_SEED = 'atlas-tutorial-v4';
const at = (i: number): [number, number] => [i % 6, Math.floor(i / 6)];
const after = (t: TutorialSession, step: TutorialStep) => TUTORIAL_STEPS.indexOf(t.step) > TUTORIAL_STEPS.indexOf(step);
const same = ([a, b]: [number, number], [x, y]: [number, number]) => a === x && b === y;
// the order the deck deals after the first week: the second week's four cards, then the third week's five
// (the hail lesson's «Укрытие» among them), the rest below
const DEAL_ORDER = ['water', 'seed_radish', 'seed_potato', 'seed_onion', 'shelter', 'seed_carrot', 'seed_potato', 'seed_cabbage', 'seed_wheat', 'mulch', 'fertilizer'];

export function createTutorial(): TutorialSession {
  const s = newGame({ loc: 'chernozem', seed: TUTORIAL_SEED });
  s.money = 250; s.peak = 250; s.guide = []; s.plan = []; s.temps = s.temps.map(() => 18);
  s.flags = { warm: false, rain: false, dry: false }; s.strikes = []; s.crows = null; s.thieves = null;
  s.levels.lab = 1; s.levels.irrigation = 1; s.candidates = ['foreman'];
  // the calm lesson weather has no helpers' episode: the first week has the usual working days too
  s.days = weekDays(s);
  for (const t of s.tiles) if (t.owned) { t.moisture = 1; t.weeds = false; t.soil = 3; }
  tile(s, 1, 2).soil = 1;
  // Палыч's own radish: one week of growth left, so the first night already brings a harvest
  for (const [x, y] of PALYCH_BEDS) tile(s, x, y).crop = { id: 'radish', grown: CROPS.radish.grow - 1, bonus: 0, mult: 1, planted: s.absWeek - 1, pid: s.nextPid++ };
  const all = [...s.hand, ...s.draw, ...s.discard];
  const take = (def: string): Card => { const i = all.findIndex((c) => c.def === def); return i < 0 ? { uid: s.nextUid++, def } : all.splice(i, 1)[0]; };
  s.hand = [take('seed_radish'), take('seed_bean'), take('water')];
  const dealt = DEAL_ORDER.map(take);
  // draw takes from the end of the pile
  s.draw = [...all, ...dealt.reverse()];
  s.discard = [];
  for (const o of Object.values(s.orgs)) { o.offer = null; o.active = null; o.wait = 999; }
  return checkpoint({ version: 4, farm: s, step: 'plant', labUid: -1, watered: false, delivered: false });
}
function checkpoint(t: TutorialSession): TutorialSession {
  const { checkpoint: _, ...bare } = t;
  return { ...bare, checkpoint: JSON.parse(JSON.stringify(bare)) };
}
function advance(t: TutorialSession, step: TutorialStep): TutorialSession {
  let n: TutorialSession = { ...t, step, hiddenHintStep: undefined };
  if (step === 'water') {
    n.thirsty = dryBeds(n.farm);
    // nothing is dry (it cannot happen on this farm, but a lesson never waits for the impossible)
    if (!n.thirsty.length) n = { ...n, step: 'play2' };
  }
  if (step === 'solo') n.solo = { planted: false, watered: false, sold: false, sell: storageUnits(n.farm) > 0 };
  if (step === 'sale') n.saleOf = stockOf(n.farm, 'radish');
  return checkpoint(n);
}
const storageUnits = (s: GameState) => s.storage.reduce((a, l) => a + l.qty, 0) + s.yard.reduce((a, l) => a + l.qty, 0);
/** The bed of the player's first radish (Палыч's radish is not it). */
export function tutorialPlant(t: TutorialSession): [number, number] {
  if (t.plantedAt) return t.plantedAt;
  const i = t.farm.tiles.findIndex((v, i) => v.crop?.id === 'radish' && !PALYCH_BEDS.some((b) => same(b, at(i))));
  return i < 0 ? [2, 2] : at(i);
}
export function tutorialReserve(t: TutorialSession): number {
  return Object.values(t.farm.orgs).flatMap((o) => (o.active ?? o.offer)?.lines ?? []).find((l) => l.crop === 'radish')?.qty ?? 2;
}
/** The beds that are dry and have something growing. */
export function dryBeds(s: GameState): [number, number][] {
  return s.tiles.flatMap((v, i) => v.owned && v.crop && !v.crop.rest && v.moisture === 0 ? [at(i)] : []);
}
/** The first sale's counter: how much of Палыч's radish is sold. */
export function saleProgress(t: TutorialSession): { done: number; of: number } {
  const of = t.saleOf ?? 0;
  return { done: Math.max(0, of - stockOf(t.farm, 'radish')), of };
}
/** The watering lesson's counter: how many of the beds that were dry are watered now. */
export function wateringProgress(t: TutorialSession): { done: number; of: number } {
  const beds = t.thirsty ?? [];
  return { done: beds.filter(([x, y]) => tile(t.farm, x, y).moisture > 0 || !tile(t.farm, x, y).crop).length, of: beds.length };
}
const stillThirsty = (t: TutorialSession) => (t.thirsty ?? []).filter(([x, y]) => tile(t.farm, x, y).crop && tile(t.farm, x, y).moisture === 0);
export function tutorialNext(t: TutorialSession): TutorialSession {
  // UI-only steps: the guests' visit, the village, the lens; the certificate's «Ещё у Палыча» begins chapter II
  if (t.step === 'chapter') return startChapterTwo(t);
  const next: Partial<Record<TutorialStep, TutorialStep>> = { visit: 'accept', village: 'deliver', lens: 'compost' };
  return next[t.step] ? advance(t, next[t.step]!) : t;
}
// Chapter II begins on the morning of week 5: a weed comes up and Палыч brings a bag of compost
// (a one-off card, so the deck stays the starter deck).
function startChapterTwo(t: TutorialSession): TutorialSession {
  const n: TutorialSession = JSON.parse(JSON.stringify(t));
  const s = n.farm;
  if (s.hand.length >= handMax(s)) {
    const j = s.hand.map((c) => !c.temp && !c.keep).lastIndexOf(true);
    if (j >= 0) s.draw.push(...s.hand.splice(j, 1));
  }
  const compost: Card = { uid: s.nextUid++, def: 'compost', temp: true };
  s.hand.push(compost);
  return advance({ ...sowWeeds(n), compostUid: compost.uid }, 'weeds');
}
const FREE_ACTIONS: Action['t'][] = ['endWeek', 'play', 'waterHand', 'weed', 'guard', 'exchangeCard', 'accept', 'deliver', 'sell', 'pay', 'borrow', 'repay', 'insure', 'buyCard'];
// what each closed part of the farm would allow
const AREA_ACTIONS: Partial<Record<Action['t'], TutorialArea>> = {
  exchangeCard: 'deck', buyCard: 'shop', borrow: 'bank', repay: 'bank', insure: 'bank',
  hire: 'house', fire: 'house', train: 'house', track: 'house', deckIn: 'house', deckOut: 'house',
  labCell: 'lab', labTrait: 'lab', labVariety: 'lab', labBio: 'lab',
};
const CLOSED: Record<TutorialArea, string> = {
  barn: 'Амбар откроется, когда соберёте первый урожай.',
  orders: 'Заказы откроются, когда к ферме придут первые гости.',
  village: 'Деревня откроется на третьей неделе.',
  deck: 'Обмен карт откроется на четвёртой неделе, вместе с полной рукой.',
  tools: 'Инструменты откроются во второй главе.',
  shop: 'Лавка семян откроется во второй главе.',
  bank: 'Касса откроется во второй главе.',
  house: 'Дом откроется во второй главе.',
  lab: 'Лаборатория откроется во второй главе.',
};
export const closedReason = (area: TutorialArea) => CLOSED[area];
export function tutorialProblem(t: TutorialSession, a: Action): string | null {
  if (a.t === 'guide') return null;
  // A payment can interrupt any lesson. Its real controls must remain usable.
  if (t.farm.phase === 'shortfall' && ['pay', 'emergency', 'restructure', 'giveUp', 'sell', 'borrow', 'repay', 'deliver'].includes(a.t)) return null;
  const area = AREA_ACTIONS[a.t];
  if (area && !areaOpen(t.step, area)) return CLOSED[area];
  const def = a.t === 'play' ? t.farm.hand.find((c) => c.uid === a.uid)?.def : null;
  const one = (types: Action['t'][]) => types.includes(a.t) ? null : 'Сначала — то, что показывает Палыч. Свободное время будет в конце недели.';
  if (FREE_STEPS.includes(t.step) || t.step === 'solo') {
    // free time: anything a farmer does in a normal week; what a later lesson explains waits for it
    if (!FREE_ACTIONS.includes(a.t)) return 'На учебной ферме это Палыч показывает в своё время. На своей ферме — когда угодно.';
    return null;
  }
  switch (t.step) {
    case 'plant': return a.t === 'play' && def === 'seed_radish' ? null : 'Начнём с редиса: перетащите его карту на свободную грядку.';
    case 'rotate': return 'Коснитесь выбранной фасоли ещё раз — фигура повернётся.';
    case 'bean': return a.t === 'play' && def === 'seed_bean' ? null : 'Посадите повёрнутую фасоль на свободные грядки.';
    case 'night': return one(['endWeek']);
    case 'sale': return a.t === 'sell' && a.crop === 'radish' && a.qty > 0 ? null : 'Сначала продадим урожай Палыча — он в амбаре.';
    case 'water': {
      const dry = stillThirsty(t);
      const hits = (cells: [number, number][]) => cells.some((c) => dry.some((d) => same(c, d)));
      const ok = (a.t === 'waterHand' && hits(a.tiles)) || (a.t === 'play' && def === 'water' && !!a.tiles?.[0] && hits(workEffectCells(t.farm, 'water', ...a.tiles[0])));
      return ok ? null : 'Полейте ростки с красной каплей: картой «Полив» или лейкой из меню грядки.';
    }
    case 'visit': return 'К ферме идут гости — встретьте их.';
    case 'village': return 'Заказ ждут в деревне — откройте её над полем.';
    case 'accept': return one(['accept']);
    case 'deliver': return one(['deliver']);
    case 'hail': {
      const cells = t.farm.strikes.flatMap((st) => st.cells);
      const manual = a.t === 'guard' && cells.some(([x, y]) => x === a.x && y === a.y);
      const cover = a.t === 'play' && def === 'shelter' && a.tiles?.[0] && workEffectCells(t.farm, 'shelter', ...a.tiles[0]).some(([x, y]) => cells.some(([a, b]) => a === x && b === y));
      return manual || cover ? null : 'Накройте фасоль картой «Укрытие» или щитом из меню её грядки.';
    }
    case 'chapter': return 'Глава I пройдена. Выберите, что дальше: своя ферма или вторая глава.';
    case 'weeds': { const [wx, wy] = t.weedAt ?? [-1, -1]; return a.t === 'weed' && a.x === wx && a.y === wy ? null : 'Прополите грядку с сорняком — нажмите на неё.'; }
    case 'compost': return a.t === 'play' && a.uid === t.compostUid && a.tiles?.[0] && workEffectCells(t.farm, 'compost', ...a.tiles[0]).some(([x, y]) => x === 1 && y === 2) ? null : 'Высыпьте компост на бедную грядку — она подсвечена.';
    case 'hire': return one(['hire']);
    case 'lab': return a.t === 'labCell' ? null : 'Выберите семена в разделе «Селекция» и добавьте клетку к посеву.';
    case 'upgrade': return a.t === 'track' && a.track === 'irrigation' ? null : 'Улучшите бочку до капельного полива.';
    case 'place': return a.t === 'build' && a.item === 'drip' ? null : 'Поставьте готовую капельную линию на поле.';
    case 'practice': return one(['waterHand', 'play', 'accept', 'deliver', 'weed', 'sell', 'endWeek', 'pay', 'borrow', 'repay', 'exchangeCard', 'guard', 'buyCard']);
    case 'done': return 'Обучение завершено. Здесь можно осмотреть ферму. Чтобы играть дальше, выберите ферму на карте.';
    default: return 'Продолжите урок по кнопке в подсказке.';
  }
}
function lessonWeather(s: GameState) {
  s.plan = []; s.temps = s.temps.map(() => 18); s.flags = { warm: false, rain: false, dry: false }; s.crows = null; s.thieves = null;
  // Fixed lesson conditions are declared at entry; growth, costs and project clocks use the real engine.
  s.strikes = []; s.candidates = s.team.some((w) => w.id === 'foreman') ? [] : ['foreman'];
  for (const o of Object.values(s.orgs)) if (!o.active && !o.offer) o.wait = 999;
}
// A new week deals the full hand; in the first weeks the lesson puts the cards it does not need yet back on
// top of the deck, in the same order, so they come next week.
function shapeHand(t: TutorialSession) {
  const s = t.farm, size = HAND_BY_WEEK[TUTORIAL_WEEK[t.step]];
  if (!size) return;
  const ordinary = s.hand.filter((c) => !c.temp);
  if (ordinary.length <= size) return;
  const back = ordinary.slice(size);
  s.hand = s.hand.filter((c) => !back.includes(c));
  s.draw.push(...back.reverse());
}
// the practice order asks for what the farm actually has: beans if there are two, else another crop
function practiceCrop(s: GameState): CropId {
  if (stockOf(s, 'bean') >= 2) return 'bean';
  const held = s.storage.reduce((m, l) => m.set(l.crop, (m.get(l.crop) ?? 0) + l.qty), new Map<CropId, number>());
  const stored = [...held.entries()].find(([, q]) => q >= 2)?.[0];
  if (stored) return stored;
  const growing = s.tiles.find((v) => v.crop && !v.crop.rest)?.crop?.id;
  if (growing) return growing;
  // The last exercise starts from this farm's actual means of production.
  // A novice who sold everything should not be asked to wait blindly for beans.
  const seedCrop = (cards: Card[]) => cards.map((c) => CARDS[c.def].crop).filter((c): c is CropId => !!c).sort((a, b) => CROPS[a].grow - CROPS[b].grow)[0];
  return seedCrop(s.hand) ?? seedCrop([...s.draw, ...s.discard]) ?? 'radish';
}
export function practiceNeed(t: TutorialSession) {
  const s = t.farm;
  const line = Object.values(s.orgs).flatMap((o) => (o.active ?? o.offer)?.lines ?? [])[0];
  if (!line || t.delivered) return null;
  const { crop, qty } = line, have = stockOf(s, crop);
  const plants = s.tiles.flatMap((v, i) => v.crop?.id === crop && !v.crop.rest ? [{ at: at(i), dry: v.moisture === 0 }] : []);
  const seed = s.hand.find((c) => CARDS[c.def].crop === crop);
  return { crop, qty, have, plants, seed };
}
function preparePracticeSeed(t: TutorialSession) {
  if (t.step !== 'practice' || t.delivered) return;
  const need = practiceNeed(t);
  // the seed already in hand waits for the morning: it is put aside so the new week's hand keeps it
  if (need?.seed && need.have < need.qty && !need.plants.length && !need.seed.keep) { const c = t.farm.hand.find((c) => c.uid === need.seed!.uid); if (c && !c.temp && t.farm.hand.filter((h) => h.keep).length < 1 + Math.min(2, t.farm.levels.planning ?? 0)) c.keep = true; }
  if (!need || need.have >= need.qty || need.plants.length || need.seed) return;
  // Only this fixed lesson controls the next draw. Reuse an existing UID;
  // exchange still costs the normal day and replaces a real card.
  for (const pile of [t.farm.draw, t.farm.discard]) {
    const i = pile.map((c) => CARDS[c.def].crop === need.crop).lastIndexOf(true);
    if (i >= 0) { const [seed] = pile.splice(i, 1); t.farm.draw.push(seed); return; }
  }
}
// The first order comes before its harvest: it asks for the radish still growing on the player's bed,
// and leaves something of that harvest to sell — without changing any crop yields or ordinary orders.
function firstOrderUnits(t: TutorialSession): number {
  const [x, y] = tutorialPlant(t), p = tile(t.farm, x, y).crop;
  return Math.max(stockOf(t.farm, 'radish'), p?.id === 'radish' ? expectedYield(t.farm, x, y) : 0);
}
function offer(s: GameState, second = false, expect = stockOf(s, 'radish')) {
  const org = Object.keys(s.orgs)[0] as keyof typeof s.orgs;
  const qty = second ? 2 : Math.max(1, Math.min(2, Math.floor(expect) - 1));
  const crop = second ? practiceCrop(s) : 'radish';
  s.orgs[org]!.offer = { id: s.nextQuestId++, org, step: s.orgs[org]!.step, title: second ? 'К столу соседей' : 'Первый редис', text: second ? 'Немного урожая к обеду.' : 'Свежий редис к обеду.', lines: [{ crop, qty }], pay: 8, rel: 1, weeks: 5, deadline: s.absWeek + 5, expires: s.absWeek + 5, createdWeek: s.absWeek };
  s.orgs[org]!.idle = 0;
}
// Only this adapter owns the lesson's orders. Run before the real engine too,
// so its weekly scheduler cannot create unrelated story offers between steps.
function lessonOrders(t: TutorialSession) {
  const first = ['visit', 'accept', 'water', 'play2', 'village', 'deliver'].includes(t.step);
  const second = t.step === 'practice' && !t.delivered;
  const title = first ? 'Первый редис' : second ? 'К столу соседей' : null;
  const org = Object.keys(t.farm.orgs)[0] as keyof typeof t.farm.orgs;
  for (const [id, o] of Object.entries(t.farm.orgs)) {
    if (id !== org || o.offer?.title !== title) o.offer = null;
    if (id !== org || o.active?.title !== title) o.active = null;
    if (!o.offer && !o.active) o.wait = 999;
  }
  const o = t.farm.orgs[org]!;
  if (title && !o.offer && !o.active) {
    offer(t.farm, second, second ? undefined : firstOrderUnits(t));
    if (second) t.orderNotice = 'Срок прошлого заказа вышел. Новый заказ уже в разделе «Заказы».';
    if (t.step === 'deliver' || t.step === 'village') t.step = 'accept';
  }
}
// a weed comes up on a free bed — or on any bed if every one is planted
function sowWeeds(t: TutorialSession): TutorialSession {
  const s = t.farm;
  const owned = s.tiles.map((v, i) => [v, i] as const).filter(([v]) => v.owned && !v.structure && !v.canal);
  const pick = owned.find(([v, i]) => !v.crop && !same(at(i), [1, 2])) ?? owned.find(([v]) => !v.crop) ?? owned.find(([v]) => v.crop?.id !== 'bean') ?? owned[0];
  if (!pick) return t;
  pick[0].weeds = true;
  return { ...t, weedAt: at(pick[1]) };
}
export function normalizeTutorial(t: TutorialSession): TutorialSession {
  const n: TutorialSession = JSON.parse(JSON.stringify(t));
  // chapter II's compost is a one-off card: should it ever be missing before its lesson, Палыч brings another
  if (n.step === 'weeds' || n.step === 'lens' || n.step === 'compost') {
    const f = n.farm;
    if (!f.hand.some((c) => c.uid === n.compostUid)) {
      for (const pile of [f.draw, f.discard]) { const i = pile.findIndex((c) => c.uid === n.compostUid); if (i >= 0) pile.splice(i, 1); }
      if (f.hand.length >= handMax(f)) { const j = f.hand.map((h) => !h.temp && !h.keep).lastIndexOf(true); if (j >= 0) f.draw.push(...f.hand.splice(j, 1)); }
      const c: Card = { uid: f.nextUid++, def: 'compost', temp: true };
      f.hand.push(c); n.compostUid = c.uid;
    }
  }
  lessonOrders(n);
  preparePracticeSeed(n);
  return n;
}
export function applyTutorial(t: TutorialSession, a: Action): TutorialSession {
  const why = tutorialProblem(t, a); if (why) throw new Error(why);
  const prepared = normalizeTutorial(t);
  const s = apply(prepared.farm, a); let n: TutorialSession = { ...prepared, farm: s };
  // a new week began (the week ended, or a payment that held it was settled)
  const newWeek = s.absWeek > prepared.farm.absWeek && s.phase === 'week';
  if (newWeek) lessonWeather(s);
  // the lesson's projects take one week: the player learns to start one, not to wait for it
  if (['labCell', 'labTrait', 'labVariety', 'labBio', 'track'].includes(a.t)) for (const p of s.projects) { p.weeks = Math.min(p.weeks, 1); p.total = Math.min(p.total, 1); }
  if (a.t === 'track') {
    const p = s.projects.find((p) => p.kind === 'track' && p.track === a.track);
    const entry = s.feed[s.feed.length - 1];
    if (p?.kind === 'track' && entry?.text.startsWith('Началась стройка:')) entry.text = `Началась стройка: ${TRACKS[p.track].levels[p.level - 1].name}, ${p.weeks} неделя.`;
  }
  const watering = a.t === 'waterHand' || (a.t === 'play' && t.farm.hand.find((c) => c.uid === a.uid)?.def === 'water');
  const wetter = watering && s.tiles.some((v, i) => v.moisture > prepared.farm.tiles[i].moisture);
  switch (t.step) {
    case 'plant': if (a.t === 'play') n = advance({ ...n, plantedAt: a.tiles![0] }, 'rotate'); break;
    case 'rotate': if (a.t === 'guide' && a.lesson === 'rotate') n = advance(n, 'bean'); break;
    case 'bean': if (a.t === 'play') n = advance(n, 'night'); break;
    case 'night': if (newWeek) n = advance(n, 'sale'); break;
    // all of Палыч's radish sold: the guests come to the field with an order for the radish still growing
    case 'sale': if (a.t === 'sell' && stockOf(s, 'radish') <= 0) { offer(s, false, firstOrderUnits(n)); n = advance(n, 'visit'); } break;
    // the order taken: back to the field, the sprouts are thirsty; an order lost and offered again goes on to delivery
    case 'accept': if (a.t === 'accept') n = advance(n, s.absWeek <= 2 ? 'water' : 'deliver'); break;
    case 'water': if (watering && !stillThirsty(n).length) n = advance(n, 'play2'); break;
    case 'play2': if (newWeek) n = advance(n, 'village'); break;
    case 'deliver': if (a.t === 'deliver') {
      // tonight hail is coming for the beans
      const i = s.tiles.findIndex((v) => v.crop?.id === 'bean');
      if (i >= 0) { s.strikes = [{ kind: 'hail', week: s.absWeek, ep: 0, cells: [[i % 6, Math.floor(i / 6), s.tiles[i].crop!.pid]], zone: false }]; n = advance(n, 'hail'); }
      else n = advance(n, 'play3');
    } break;
    case 'hail': if (a.t === 'guard' || a.t === 'play') n = advance(n, 'play3'); break;
    case 'play3': if (newWeek) n = advance(n, 'solo'); break;
    case 'solo': {
      const g = { ...(n.solo ?? { planted: false, watered: false, sold: false, sell: false }) };
      if (a.t === 'play' && CARDS[t.farm.hand.find((c) => c.uid === a.uid)?.def ?? '']?.kind === 'seed') g.planted = true;
      if (wetter) g.watered = true;
      if (a.t === 'sell') g.sold = true;
      n = { ...n, solo: g };
      // chapter I ends with its fourth week: the certificate greets the player on the morning of week 5
      if (newWeek) n = advance(n, 'chapter');
      break;
    }
    case 'weeds': if (a.t === 'weed') n = advance(n, 'lens'); break;
    case 'compost': if (a.t === 'play') n = advance(n, 'play5'); break;
    case 'play5': if (newWeek) n = advance(n, 'hire'); break;
    case 'hire': if (a.t === 'hire') n = advance(n, 'play6'); break;
    case 'play6': if (newWeek) n = advance(n, 'lab'); break;
    case 'lab': if (a.t === 'labCell') n = advance({ ...n, labUid: a.uid }, 'play7'); break;
    case 'play7': if (newWeek) n = advance(n, 'upgrade'); break;
    case 'upgrade': if (a.t === 'track') n = advance(n, 'play8'); break;
    case 'play8': if (newWeek && !s.projects.some((p) => p.kind === 'track' && p.track === 'irrigation')) n = advance(n, 'place'); break;
    case 'place': if (a.t === 'build') n = advance(n, 'play9'); break;
    case 'play9': if (newWeek) { offer(s, true); n = advance({ ...n, watered: false, delivered: false }, 'practice'); } break;
    case 'practice':
      n = { ...n, watered: n.watered || wetter, delivered: n.delivered || a.t === 'deliver' };
      if (a.t === 'accept' || a.t === 'deliver') n.orderNotice = undefined;
      if (n.watered && n.delivered) n = advance(n, 'done'); break;
  }
  if (newWeek) shapeHand(n);
  lessonOrders(n);
  preparePracticeSeed(n);
  return n;
}
export function restartTutorialStep(t: TutorialSession): TutorialSession {
  return t.checkpoint ? normalizeTutorial(checkpoint({ ...JSON.parse(JSON.stringify(t.checkpoint)), hiddenHintStep: undefined })) : createTutorial();
}
/** A stored lesson this build can continue (the load check of ui/Tutorial.tsx). */
export function tutorialAccepted(v: any, validFarm: (f: unknown) => boolean): v is TutorialSession {
  return v?.version === 4 && TUTORIAL_STEPS.includes(v.step) && v.farm?.seed === TUTORIAL_SEED && validFarm(v.farm) && Number.isInteger(v.labUid)
    && (!v.checkpoint || validFarm(v.checkpoint.farm) && TUTORIAL_STEPS.includes(v.checkpoint.step));
}
