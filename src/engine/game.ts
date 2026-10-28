// Посевная v4 — the deterministic engine. No UI, no Math.random: a farm replays from its seed and its actions.
import {
  BARN_CAP, BASE_PAYMENTS, CARDS, CROPS, CROP_IDS, CropId, DECK_LIMIT, DECK_MIN, GRID, HAND_BASE, LOCATIONS, LocationDef, LocationId,
  ORGS, OrgId, PETS, PetId, RATING_LIMIT, RATING_RATE, Reward, SEASON_DEMAND, SEED_BANK_OK, SOWN_IDS, TERRAIN, TRACKS, Terrain, TraitId,
  TrackId, WORKERS, WORKER_IDS, WorkerId, isSeed, parseMap, relTier, TRAITS, PAYMENT_NAMES,
  CAMP, EQUIPMENT, HOUSE_BEDS, MATERIALS, MATERIAL_IDS, MaterialId, Mats, TrackDef, TrackLevel,
  BUYOUT_NAME, BUYOUT_YEARS, TAX_NAME, ExpeditionId,
} from './data';
import {
  COND_PAY, CondId, FIRST_VISIT, LOOT, LootId, RELICS, RELIC_IDS, RelicId, VISITS, VISIT_IDS, VisitId, hazardsFor, lootOf, runMap,
} from './run';
import { EPISODES, Episode, EpisodeKind, YearPlan, covers, episodeEnd, marketMult, planYear, seasonOf, baseTemp } from './calendar';
import { gauss, hashSeed, pickWeighted, rand, randInt, shuffle } from './rng';
import { COMMONS, COMMONS_NEED, COMMON_GLORY, CommonId, FORGE_MULT, FORGE_WEEKS, GRAIN, SAVVA_APPRENTICE, TOLOKA, YARDS, YARD_CANDIDATE, YARD_GLORY, YARD_IDS, YardId } from './neighbours';
import { KNOW_GLORY, KNOW_NAMES, KNOW_SEED_SALE, VARIETY_CROPS, VARIETY_KNOW, cellNeeds, knowCells, knowLevelOf, knowTraits, traitNeeds } from './knowledge';
import { DISTRICT, FEST_CATS, FEST_CAT_GLORY, FEST_CERT, FEST_NAMES, FEST_PRIZE, FEST_WIN_GLORY, FestCat, rivalShow } from './festival';
import { FIRE_HEAT, FIRE_WOOD, TRIALS, TRIAL_FIRST_YEAR, TRIAL_GLORY, TRIAL_POOL, TrialGrade, TrialKind, fireCore, fireRing, firesAllowed, trialDroughtLen, trialFrostTemp, trialGrade, trialPower, trialWaves } from './trials';

// ---------- state ----------
export interface Plant {
  id: CropId; grown: number; bonus: number; mult: number; planted: number; pid: number;
  chewed?: boolean; fed?: boolean; dry?: number; crowDelayed?: boolean; crowPecked?: boolean;
  traits?: TraitId[]; years?: number; rest?: boolean; regrowing?: boolean; // perennials: harvests left, resting until spring
}
export interface Tile {
  owned: boolean; terrain: Terrain; crop: Plant | null;
  moisture: number; soil: number; last: CropId | null;
  mulch: number; shelter: number; structure: 'greenhouse' | 'hive' | null; drip: boolean; canal: boolean;
  weeds: boolean; idle: number; clean: number; snow: boolean; cleared: boolean;
  greenhousePlacedWeek?: number; // absent in older saves: already established
  hivePlacedWeek?: number; // PSV-021 · same rule as the greenhouse: a hive pollinates from the week after it was set down
  tree?: number; // v3 §4.5 · a tree sprouted here: its age in warm weeks (sprout, young tree, tree)
  chop?: number; // days of uprooting already put into a grown tree
}
export interface Card { uid: number; def: string; extra?: [number, number][]; traits?: TraitId[]; temp?: boolean; keep?: boolean }
export type CardLike = { def: string; extra?: [number, number][]; traits?: TraitId[] } | string;
export interface Lot { crop: CropId; qty: number; age: number; bornWeek?: number }
export interface Loan { id: number; principal: number; rate: number }
export interface Worker { id: WorkerId; level: number; away: number; leaves?: number; free?: boolean } // v3 · a temporary hand: leaves that week, takes no bed and no pay
export interface QuestLine { crop: CropId; qty: number }
export interface Quest { id: number; org: OrgId; step: number; title: string; text: string; lines: QuestLine[]; pay: number; rel: number; weeks: number; deadline?: number; expires?: number; contract?: boolean; reward?: Reward; createdWeek?: number }
export interface OrgState { rel: number; step: number; offer: Quest | null; active: Quest | null; wait: number; idle: number; lastMischief: number }
export type Project =
  | { kind: 'track'; track: TrackId; level: number; weeks: number; total: number }
  | { kind: 'cell'; card: Card; origin?: 'deck' | 'spare'; cell: [number, number]; weeks: number; total: number }
  | { kind: 'trait'; card: Card; origin?: 'deck' | 'spare'; trait: TraitId; weeks: number; total: number }
  | { kind: 'variety'; crop: CropId; weeks: number; total: number }
  | { kind: 'bio'; weeks: number; total: number }
  | { kind: 'train'; worker: WorkerId; weeks: number; total: number }
  // v3 §7 · a stage of a neighbour's yard, a shared building of the village: both take a slot of the brigade
  | { kind: 'yard'; yard: YardId; stage: number; weeks: number; total: number }
  | { kind: 'common'; id: CommonId; weeks: number; total: number };
export type StrikeKind = 'hail' | 'flood' | 'beetle' | 'locust' | 'weedsurge' | 'bear' | 'boars' | 'fire';
export interface Strike { kind: StrikeKind; ep: number; week: number; cells: [number, number, number][]; zone: boolean; wave?: number; /** a wave of the year's ordeal: no drone turns it back */ trial?: boolean }
// ---------- the ordeal of the year ----------
export type TrialDir = 'w' | 'e' | 'n' | 's';
export type TrialOutcome = 'killed' | 'bitten' | 'held' | 'eaten' | 'smoke' | 'guarded' | 'dried';
export interface TrialResult { grade: TrialGrade; saved: number; beds: number; risk: number; lostValue: number; lostUnits: number; glory: number; cert?: string }
export interface Trial {
  id: string; kind: TrialKind; year: number; power: number;
  /** absolute weeks: the first and the last week the ordeal may begin (announced), and the week it does */
  from: number; to: number; week: number;
  /** weeks it lasts: waves of the swarm, weeks of drought (frost: one night) */
  len: number;
  temp?: number; dir?: TrialDir;
  beds?: number; risk?: number; lostValue?: number; lostUnits?: number;
  result?: TrialResult;
}
/** what the ordeal did this week, for the field to play it back */
export interface TrialNight {
  id: string; kind: TrialKind; temp?: number; wave?: number; waves?: number; dir?: TrialDir;
  band?: [number, number][]; fires: [number, number][]; lit: boolean;
  cells: { x: number; y: number; out: TrialOutcome; before?: Plant; after?: Plant | null; lost?: number }[];
  result?: TrialResult;
}
export interface CrowRaid { week: number; targets: { x: number; y: number; pid: number; type: 'young' | 'ripe' }[]; shoo: boolean; drone: boolean }
export interface Thieves { week: number; targets: { x: number; y: number; pid: number }[]; talked: boolean }
export type SceneKind = 'dogThieves' | 'thieves' | 'watchman' | 'drone' | 'geese' | 'buyout' | 'bear' | 'boars' | 'fire';
export const SCENE_KINDS: SceneKind[] = ['dogThieves', 'thieves', 'watchman', 'drone', 'geese', 'buyout', 'bear', 'boars', 'fire'];
export interface FeedItem { week: number; text: string; tone: 'good' | 'bad' | 'info' }
export interface PestHit { kind:'locust'|'beetle'; x:number; y:number; plant:Plant; lost:number; after?:Plant|null; trial?:boolean }
export type FieldDamageKind = "frost" | "dry" | "hail" | "flood" | "crows" | "thieves" | "bear" | "boars" | "fire";
export interface FieldDamage { kind: FieldDamageKind; x: number; y: number; before: Plant; after: Plant | null; lost: number; note?: string }
export interface WeekReport {
  fieldDamage?: FieldDamage[];
  pestHits?: PestHit[];
  harvests: { crop: CropId; qty: number; x: number; y: number }[];
  lost: string[];
  costs: { label: string; amount: number }[];
  yardSold: number; yardUnits?: number; overflow: number; frost: number; dried: number; stolen: number; done: string[];
  soilUp: number; soilDown: number; honey: number; mice: number; insurancePaid?: number;
  milk?: number; // ECO-04 · the goat's milk money of the week
  borrowed?: number; // ECO-05 · bills the cash could not cover, added to the bank debt
  trial?: TrialNight;
}
export interface Effect { kind: 'review'; mult: number; weeks: number }
/** A lot of the season's fair (v3 §4): a piece of equipment, a load of materials, or a worker looking for a job. */
export interface FairLot {
  id: number;
  kind: 'equip' | 'mat' | 'worker';
  track?: TrackId; level?: number; // equipment: the level it brings the line to
  mats?: Mats; // materials (one kind; a special lot carries all three)
  worker?: WorkerId; wlevel?: number;
  price: number;
  used?: boolean; // second-hand: cheaper
  special?: boolean;
  prize?: boolean; // v3 §9.1 · the festival's prize: Пряхин never buys it
  hold?: number; deposit?: number; // the player's deposit holds the lot to the end of week `hold`
  sold?: 'player' | 'rival';
}
export interface FairState { year: number; season: 0 | 1 | 2 | 3; lots: FairLot[]; eye: number | null; eyeWeek: number; rival: number; nextId: number }
export interface Stats { sales: number; orders: number; seeds: number; work: number; land: number; build: number; salaries: number; interest: number; payments: number; lostUnits: number; harvested: number }
export type Phase = 'week' | 'shortfall' | 'gameover' | 'arrest';
export type Reward4 = { id: string; kind: 'pet' | 'cert' | 'seed' | 'glory'; value: string | number };

export interface GameState {
  v: 5;
  guide?: string[];
  sidejobWeek?: number;
  forageWeek?: number;
  loc: LocationId;
  seed: string;
  rng: number;
  year: number;
  week: number; // week of the year, 1-based
  season: 0 | 1 | 2 | 3;
  weekInSeason: number;
  absWeek: number;
  yearStart: number; // absWeek of week 1 of this year
  phase: Phase;
  money: number;
  earned: number;
  peak: number;
  tiles: Tile[];
  bought: number;
  draw: Card[]; hand: Card[]; discard: Card[]; spare: Card[];
  nextUid: number; nextPid: number;
  days: number;
  sowings: number;
  storage: Lot[];
  yard: Lot[];
  demand: Record<CropId, { a: number; w: number; p: number }>;
  noise: Record<CropId, number>;
  plan: Episode[];
  temps: number[];
  flags: { warm: boolean; rain: boolean; dry: boolean };
  strikes: Strike[];
  crows: CrowRaid | null;
  raids: number; // flocks this summer
  thieves: Thieves | null;
  // raids announced ahead (a flock circling, children at the fence) and the weeks already decided
  crowWarn?: number[]; crowRolled?: number[]; kidsWarn?: number[]; kidsRolled?: number[];
  guards: [number, number][];
  scarecrows: [number, number][];
  levels: Partial<Record<TrackId, number>>;
  projects: Project[];
  team: Worker[];
  candidates: WorkerId[];
  freeHire: WorkerId[];
  unlocked: CropId[]; // crops opened on this farm by the lab, quests or the profile's seed bank
  orgs: Partial<Record<OrgId, OrgState>>;
  nextQuestId: number;
  pets: PetId[];
  certs: string[];
  glory: number;
  harvestedKinds: CropId[];
  loans: Loan[]; nextLoanId: number; rating: number; cleanSeasons: number; carry: number; restructured: boolean; incident: boolean;
  insurance: number;
  dronesUsed: number;
  autoShoo: boolean; // this summer's one free scaring of a flock is used
  effects: Effect[];
  compostTick: number;
  compostReady?: boolean; exchangeWeek?: number; exchanges?: number; shortfallBorrowed?: boolean;
  trial?: Trial;
  /** fire pits on the corners of four beds, and the absolute week they were last lit */
  fires?: [number, number][]; firesLit?: number;
  scenes?: { id: string; kind: SceneKind; week: number; at?: [number,number]; visit?: { outcome: 'stolen' | 'empty'; targets: [number,number][]; crows: [number,number][] } }[];
  report: WeekReport;
  lastReport: WeekReport | null;
  feed: FeedItem[];
  stats: Stats;
  over: { reason: string; work?: number } | null; // work: a mortgaged home went bankrupt — the debt if one goes to work it off
  due: { amount: number; name: string; seasonEnd?: boolean } | null; // phase shortfall: what is owed
  rewardsOut: Reward4[];
  yearsCompleted: number;
  // v3 · building materials in the shed, the season's fair, when each equipment line was last offered (year).
  // Optional like every field added after publication (ST-09): fillV3 adds them to an older save on its next turn.
  mats?: Record<MaterialId, number>;
  fair?: FairState;
  equipSeen?: Partial<Record<TrackId, number>>;
  helpWeek?: number; // the week the farmer last helped on a building site
  quiet?: boolean; // lessons: no trees sprout on their own
  // v3 §3.1–3.3 · the home farm: autumn payments made while mortgaged, bought out, years of arrest not counted,
  // the cart away on an expedition, the arrest after a bankruptcy
  paidYears?: number; owned?: boolean; skipYears?: number;
  away?: AwayState;
  arrest?: { debt: number; runs: number };
  // v3 §3.4 · an expedition: the plot's condition, finds, visitors, what goes home
  run?: RunState;
  // v3 §7 · the neighbours of the home village: each yard's stage and what was asked of it lately; the shared
  // buildings standing; the level the smith is forging
  yards?: Partial<Record<YardId, YardState>>;
  commons?: CommonId[];
  forge?: { track: TrackId; level: number; week: number; price?: number };
  // v3 §8.1 · knowledge of the crops: units harvested on this farm, and what the profile's other farms know
  // (written in by the game when the farm is opened: ui/persist syncFarm)
  crops?: Partial<Record<CropId, number>>;
  knowBase?: Partial<Record<CropId, number>>;
  // v3 §9.1 · the year's harvest for the festival, and the festivals held
  yearHarvest?: YearHarvest;
  fests?: FestResult[];
}
export interface YearHarvest { year: number; units: number; kinds: CropId[]; best: number; bestCrop?: CropId }
export interface FestResult { year: number; you: Record<FestCat, number>; rival: Record<FestCat, number>; won: FestCat[]; win: boolean; glory: number; bestCrop?: CropId }
/** a neighbour's yard: the stages done (0..3), the season (year·4+season, or the week when weekly) of the last swap,
 *  the season of the last «Позвать соседа», the year a candidate was last sent */
export interface YardState { stage: number; swap?: number; help?: number; cand?: number }
/** what the cart took from the home farm to an expedition (it comes back when the farm there is folded) */
export interface AwayState { loc: ExpeditionId; seed: string; cards: Card[]; worker?: Worker; cash: number; week: number }
export interface RunVisit { id: VisitId; week: number; relic?: RelicId; price?: number }
export interface RunResult { cash: number; loot: LootId[]; mats: Mats; cards: Card[]; worker?: Worker; bankrupt: boolean; settled?: boolean }
export interface RunState {
  cond: CondId;
  relics: RelicId[];
  home?: string; // the seed of the home farm the cart came from
  work?: boolean; // «на заработки»: the fold pays the home's debt first
  carried: { uids: number[]; worker?: WorkerId; cash: number };
  visit: RunVisit | null;
  nextVisit: number;
  seen: string[];
  used: string[]; // one-shot finds used up: the laika by season, the receipt
  dig?: { x: number; y: number; until: number };
  calm?: { bear?: number; boars?: number }; // a hunter or a patrol keeps them off until that week
  cones?: number; // the pine-cone brigade beat the cedar: half the mushrooms until that week
  autumns: number; // autumn payments made: the farm can be folded after the first
  surcharge?: number; // Пряхин's inspection: the next rent is this share dearer
  result?: RunResult;
}
export interface RunOptions { cond: CondId; relics?: RelicId[]; cards?: Card[]; worker?: Worker; cash?: number; home?: string; work?: boolean }
export interface GameOptions { loc: LocationId; seed: string; pets?: PetId[]; seedBank?: CropId[]; run?: RunOptions }

// ---------- small helpers ----------
export const idx = (x: number, y: number) => y * GRID + x;
export const inGrid = (x: number, y: number) => x >= 0 && y >= 0 && x < GRID && y < GRID;
export const tile = (s: GameState, x: number, y: number) => s.tiles[idx(x, y)];
export const kop = (v: number) => Math.round(v * 100);
export const round2 = (v: number) => {
  const k = v * 100;
  const r = Math.floor(Math.abs(k) + 0.5 + 1e-7);
  return (k < 0 ? -r : r) / 100;
};
const group = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
export const rub = (x: number) => {
  const r = round2(x);
  const a = Math.abs(r);
  const whole = Math.floor(a + 1e-9);
  const k = Math.round((a - whole) * 100);
  return `${r < 0 ? '−' : ''}${group(whole)}${k ? `,${String(k).padStart(2, '0')}` : ''}`;
};
export const money = (x: number) => `${rub(x)} ₽`;
export const fmt = (x: number) => String(Math.round(x * 10) / 10).replace('.', ',');
export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = Math.abs(n) % 10, m100 = Math.abs(n) % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
export const infl = (year: number) => Math.pow(1.2, year - 1);
export function neighbors4(x: number, y: number): [number, number][] {
  return ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).map(([dx, dy]) => [x + dx, y + dy] as [number, number]).filter(([a, b]) => inGrid(a, b));
}
export function neighbors8(x: number, y: number): [number, number][] {
  const out: [number, number][] = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && inGrid(x + dx, y + dy)) out.push([x + dx, y + dy]);
  return out;
}
const clone = <T,>(x: T): T => structuredClone(x);
export class GameError extends Error {}
function fail(msg: string): never {
  throw new GameError(msg);
}
function feed(s: GameState, text: string, tone: FeedItem['tone'] = 'info') {
  s.feed.push({ week: s.absWeek, text, tone });
  if (s.feed.length > 60) s.feed.splice(0, s.feed.length - 60);
}
export const locOf = (s: GameState): LocationDef => LOCATIONS[s.loc];
const world = (s: GameState, tag: string, n: number) => ({ rng: hashSeed(`${s.seed}|${s.loc}|v4|${tag}|${n}`) });
export function ownedTiles(s: GameState): [Tile, number, number][] {
  const out: [Tile, number, number][] = [];
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (tile(s, x, y).owned) out.push([tile(s, x, y), x, y]);
  return out;
}
const emptyReport = (): WeekReport => ({ harvests: [], lost: [], costs: [], yardSold: 0, overflow: 0, frost: 0, dried: 0, stolen: 0, done: [], soilUp: 0, soilDown: 0, honey: 0, mice: 0 });

// ---------- levels, team, pets ----------
export const lvl = (s: GameState, t: TrackId) => s.levels[t] ?? (t === 'house' ? 1 : 0);
export const wlvl = (s: GameState, id: WorkerId) => {
  const w = s.team.find((x) => x.id === id);
  return w && w.away <= 0 ? w.level : 0;
};
export const hasPet = (s: GameState, p: PetId) => s.pets.includes(p);
/** PSV-032 · the crops mice will nibble at the week's end: storable lots of ten or more inside the barn (not the yard) */
export function miceTargets(s: GameState): CropId[] {
  if (hasPet(s, 'cat') || lvl(s, 'barn') >= 2) return [];
  return CROP_IDS.filter((c) => CROPS[c].storable && s.storage.filter((l) => l.crop === c).reduce((n, l) => n + l.qty, 0) >= 10);
}
export const storageCap = (s: GameState) => BARN_CAP[Math.min(BARN_CAP.length - 1, lvl(s, 'barn'))];
export const storageUsed = (s: GameState) => s.storage.reduce((a, l) => a + l.qty, 0);
export const storageKeepWeeks = (s: GameState, c: CropId) => (CROPS[c].perishable ?? 99) + (lvl(s, 'house') >= 2 ? 1 : 0) + (lvl(s, 'barn') >= 3 ? 2 : 0) + (wlvl(s, 'greenhouser') >= 3 ? 2 : 0) + (hasRelic(s, 'notebook') ? 2 : 0);
export const yardUsed = (s: GameState) => s.yard.reduce((a, l) => a + l.qty, 0);
// The hand never grows past HAND_BASE: it always fits the fan. Cards not played stay in the hand from week to
// week (decision of 28.10); each new week tops the hand up from the deck.
export const handMax = (_s: GameState) => HAND_BASE;

/** v3 · Черноземье is the home farm; Кубань and Алтай are expeditions with a camp instead of a house. */
export const isHome = (s: Pick<GameState, 'loc'>) => s.loc === 'chernozem';
// v3 §3.4 · an expedition run: its condition and the finds it carries
export const hasRelic = (s: Pick<GameState, 'run'>, r: RelicId) => !!s.run?.relics.includes(r);
export const hasCond = (s: Pick<GameState, 'run'>, c: CondId) => s.run?.cond === c;
/** v3 §3.1 · the home farm before the third autumn payment: the payment ladder goes on, a bankruptcy can be worked off */
export const isMortgaged = (s: GameState) => isHome(s) && !s.owned;
export const trackDef = (s: Pick<GameState, 'loc' | 'levels'>, t: TrackId): TrackDef =>
  (t === 'house' && !isHome(s) && (s.levels.house ?? 1) <= CAMP.levels.length ? CAMP : TRACKS[t]);
export const trackLevels = (s: Pick<GameState, 'loc' | 'levels'>, t: TrackId): TrackLevel[] => trackDef(s, t).levels;
export const deckLimit = (s: GameState) => DECK_LIMIT[Math.min(DECK_LIMIT.length - 1, lvl(s, 'house') - 1)];
/** beds in the farm's own house (or camp) */
export const houseBeds = (s: GameState) => HOUSE_BEDS[Math.max(0, Math.min(HOUSE_BEDS.length - 1, lvl(s, 'house') - 1))];
export const workerSlots = (s: GameState) => houseBeds(s) + lodging(s);
// ---------- v3 §7 · the neighbours ----------
/** the stage a neighbour's yard stands at (0..3); there are neighbours only at home */
export const yardStage = (s: GameState, y: YardId) => (isHome(s) ? s.yards?.[y]?.stage ?? 0 : 0);
export const hasCommon = (s: GameState, c: CommonId) => isHome(s) && !!s.commons?.includes(c);
/** beds the village lends: one in every yard at its second stage (two at the Карповы's), two in the hostel */
export const lodging = (s: GameState) =>
  YARD_IDS.reduce((n, y) => n + (yardStage(s, y) >= 2 ? (y === 'karpov' ? 2 : 1) : 0), 0) + (hasCommon(s, 'hostel') ? 2 : 0);
/** the season as one number, for once-a-season things */
export const seasonKey = (s: Pick<GameState, 'year' | 'season'>) => s.year * 4 + s.season;
export const yardsStanding = (s: GameState) => YARD_IDS.filter((y) => yardStage(s, y) >= 2).length;
export const commonsOpen = (s: GameState) => isHome(s) && yardsStanding(s) >= COMMONS_NEED;
/** beds taken: a temporary hand (v3 · a visitor who stays a few weeks) sleeps in the barn */
export const bedsUsed = (s: GameState) => s.team.filter((w) => w.leaves === undefined).length;
export const workshopSlots = (s: GameState) => 1 + (lvl(s, 'house') >= 4 ? 1 : 0) + (lvl(s, 'house') >= 7 ? 1 : 0) + (wlvl(s, 'mechanic') >= 3 ? 1 : 0) + (yardStage(s, 'efim') >= 3 ? 1 : 0);
export const labSlots = (s: GameState) => (lvl(s, 'lab') >= 2 ? 2 : 1) + (wlvl(s, 'breeder') >= 2 ? 1 : 0);
export const maxExtra = (s: GameState) => lvl(s, 'lab');
export const maxTraits = (s: GameState) => lvl(s, 'lab') + (wlvl(s, 'breeder') >= 3 ? 1 : 0);
// ---------- v3 §8.1 · knowledge of the crops ----------
/** units of a crop harvested on every farm of the profile (this one included) */
export const cropKnow = (s: Pick<GameState, 'crops' | 'knowBase'>, c: CropId) => Math.round((s.knowBase?.[c] ?? 0) + (s.crops?.[c] ?? 0));
export const knowLevel = (s: Pick<GameState, 'crops' | 'knowBase'>, c: CropId) => knowLevelOf(cropKnow(s, c));
/** extra cells / traits a card can carry: the lab's level and the knowledge of its crop, whichever is lower */
export function cardExtraMax(s: GameState, c: CardLike): number {
  const crop = CARDS[asCard(c).def]?.crop;
  return Math.min(maxExtra(s), crop ? knowCells(knowLevel(s, crop)) : 0);
}
export function cardTraitMax(s: GameState, c: CardLike): number {
  const crop = CARDS[asCard(c).def]?.crop;
  return Math.min(maxTraits(s), crop ? knowTraits(knowLevel(s, crop)) : 0);
}
/** why the lab cannot give a card one more cell / trait: the lab's level or the knowledge of the crop */
export function cellLimit(s: GameState, c: CardLike): string | null {
  const k = asCard(c).extra?.length ?? 0, crop = CARDS[asCard(c).def]?.crop;
  if (k >= maxExtra(s)) return k ? `Лаборатория ${lvl(s, 'lab')}-го уровня даёт до +${maxExtra(s)} кл.` : 'Нужна лаборатория';
  if (crop && knowLevel(s, crop) < cellNeeds(k)) return `Нужно знание «${CROPS[crop].name}» ${cellNeeds(k)} (${KNOW_NAMES[cellNeeds(k)]})`;
  return null;
}
export function traitLimit(s: GameState, c: CardLike): string | null {
  const k = asCard(c).traits?.length ?? 0, crop = CARDS[asCard(c).def]?.crop;
  if (k >= maxTraits(s)) return `Лаборатория ${lvl(s, 'lab')}-го уровня даёт до ${maxTraits(s)} свойств`;
  if (crop && knowLevel(s, crop) < traitNeeds(k)) return `Нужно знание «${CROPS[crop].name}» ${traitNeeds(k)} (${KNOW_NAMES[traitNeeds(k)]})`;
  return null;
}
/** crops known at the level a new variety needs */
export const varietyKnown = (s: GameState) => SOWN_IDS.filter((c) => knowLevel(s, c) >= VARIETY_KNOW);
export function varietyProblem(s: GameState): string | null {
  const n = varietyKnown(s).length;
  return n >= VARIETY_CROPS ? null : `Новый сорт: нужно знание ${VARIETY_KNOW} у ${VARIETY_CROPS} культур (сейчас ${n})`;
}
export const greenhousesAllowed = (s: GameState) => [0, 1, 2, 2, 3][lvl(s, 'greenhouse')] ?? 3;
export const heated = (s: GameState) => lvl(s, 'greenhouse') >= 3;
export const hivesAllowed = (s: GameState) => [0, 1, 2, 2][lvl(s, 'apiary')] ?? 2;
export const dripAllowed = (s: GameState) => (lvl(s, 'irrigation') >= 4 ? 4 : lvl(s, 'irrigation') >= 2 ? 2 : 0);
export const scarecrowsAllowed = (s: GameState) => [0, 1, 2, 2][lvl(s, 'guard')] ?? 2;
export const canalsAllowed = (s: GameState) => [0, 2, 4, 7][lvl(s, 'canal')] ?? 7;
export const lookahead = (s: GameState) => [1, 2, 4, 6][lvl(s, 'meteo')] ?? 6;
export const sortiesPerSeason = (s: GameState) => Math.max(0, lvl(s, 'drone') - 1);
export const questSlots = (s: GameState) => 3 + (lvl(s, 'house') >= 4 ? 1 : 0) + (lvl(s, 'house') >= 6 ? 1 : 0);
export const countStructure = (s: GameState, k: 'greenhouse' | 'hive') => s.tiles.filter((t) => t.structure === k).length;
export const dripRows = (s: GameState) => new Set(s.tiles.map((t, i) => (t.drip ? Math.floor(i / GRID) : -1)).filter((r) => r >= 0)).size;
export const canalCount = (s: GameState) => s.tiles.filter((t) => t.canal).length;
const placed = (s: GameState) => ({ greenhouse: countStructure(s, 'greenhouse'), hive: countStructure(s, 'hive'), drip: dripRows(s), scarecrow: s.scarecrows.length, canal: canalCount(s), fire: s.fires?.length ?? 0 });
export type BuildItem = 'greenhouse' | 'hive' | 'drip' | 'scarecrow' | 'canal' | 'fire';
// ---------- fires ----------
export const firePits = (s: GameState): [number, number][] => s.fires ?? [];
export const firesLit = (s: GameState) => s.firesLit === s.absWeek && firePits(s).length > 0;
/** firewood for one night, all pits together */
export const firewoodCost = (s: GameState) => Math.round(FIRE_WOOD[Math.min(3, lvl(s, 'fires'))] * infl(s.year)) * firePits(s).length;
export const fireLightDays = (s: GameState) => (lvl(s, 'fires') >= 3 ? 0 : 1);
/** degrees a lit fire adds against frost on this bed (the strongest fire counts, they do not add up) */
export function fireHeat(s: GameState, x: number, y: number, lit = firesLit(s)): number {
  if (!lit) return 0;
  const [core, ring] = FIRE_HEAT[Math.min(3, lvl(s, 'fires'))];
  let best = 0;
  for (const [a, b] of firePits(s)) {
    if (fireCore(a, b).some(([p, q]) => p === x && q === y)) best = Math.max(best, core);
    else if (fireRing(a, b).some(([p, q]) => p === x && q === y)) best = Math.max(best, ring);
  }
  return best;
}
/** a lit fire's smoke keeps the swarm off its 2×2 */
export const inSmoke = (s: GameState, x: number, y: number) => firesLit(s) && firePits(s).some(([a, b]) => fireCore(a, b).some(([p, q]) => p === x && q === y));
export function lightFiresProblem(s: GameState): string | null {
  if (s.phase !== 'week') return 'Сначала решите вопрос с платежом';
  if (!firePits(s).length) return lvl(s, 'fires') ? 'Поставьте кострища на поле' : 'Кострищ ещё нет: их строят в мастерской';
  if (s.season === 3) return 'Зимой в поле греть нечего';
  if (firesLit(s)) return 'Костры уже горят';
  if (s.money < firewoodCost(s)) return `Нужно ${money(firewoodCost(s))} на дрова`;
  if (s.days < fireLightDays(s)) return 'Нужен рабочий день';
  return null;
}
export function buildStock(s: GameState): Record<BuildItem, { have: number; used: number }> {
  const p = placed(s);
  return {
    greenhouse: { have: greenhousesAllowed(s), used: p.greenhouse },
    hive: { have: hivesAllowed(s), used: p.hive },
    drip: { have: dripAllowed(s), used: p.drip },
    scarecrow: { have: scarecrowsAllowed(s), used: p.scarecrow },
    canal: { have: canalsAllowed(s), used: p.canal },
    fire: { have: firesAllowed(lvl(s, 'fires')), used: p.fire },
  };
}

// ---------- calendar ----------
export const seasonLen = (s: GameState, season = s.season) => locOf(s).seasons[season];
export const yearLen = (s: GameState) => locOf(s).seasons.reduce((a, b) => a + b, 0);
// the weeks of the year a payment falls on, with the season it belongs to
export function paymentSchedule(s: GameState): { week: number; season: number; part: number; parts: number }[] {
  const [sp, su, au] = locOf(s).seasons;
  // v3 §3.2 · a bought-out home pays only the yearly tax, at the end of autumn
  if (isHome(s) && s.owned) return [{ week: sp + su + au, season: 2, part: 1, parts: 1 }];
  const thirds = [Math.round(su / 3), Math.round((2 * su) / 3), su];
  return [
    { week: sp, season: 0, part: 1, parts: 1 },
    ...thirds.map((w, i) => ({ week: sp + w, season: 1, part: i + 1, parts: 3 })),
    { week: sp + su + au, season: 2, part: 1, parts: 1 },
  ];
}
/** the payment ladder of a season: the year counts from the first one the farm was not under arrest (v3 §3.3),
 *  an expedition's plot makes it cheaper or dearer (run.ts COND_PAY) */
export function paymentBase(s: GameState, season: number, year = s.year): number {
  const base = BASE_PAYMENTS[season] ?? 0;
  const cond = s.run ? COND_PAY[s.run.cond] ?? 1 : 1;
  return Math.round(base * Math.pow(1.42, Math.max(1, year - (s.skipYears ?? 0)) - 1) * locOf(s).payMult * cond);
}
/** v3 §3.2 · the yearly tax of a bought-out home: (3 per own cell + 15 per house level) with inflation */
export const homeTax = (s: GameState, year = s.year) => Math.round((3 * ownedTiles(s).length + 15 * lvl(s, 'house')) * infl(year));
/** what the payment of `season` comes to before the carried debt: the ladder, the tax of a bought-out home, Пряхин's
 *  surcharge after an inspection, a receipt that takes a quarter off once */
export function paymentDue(s: GameState, season: number, year = s.year): number {
  if (isHome(s) && s.owned) return homeTax(s, year);
  let a = paymentBase(s, season, year);
  if (s.run?.surcharge) a = Math.round(a * (1 + s.run.surcharge));
  if (hasRelic(s, 'receipt') && !s.run!.used.includes('receipt')) a = Math.round(a * 0.75);
  return a;
}
export function paymentName(s: GameState, season: number, year = s.year): string {
  if (isHome(s) && s.owned) return TAX_NAME;
  if (isHome(s) && season === 2 && (s.paidYears ?? 0) === BUYOUT_YEARS - 1 && year === s.year) return BUYOUT_NAME;
  return PAYMENT_NAMES[season];
}
export const paymentNow = (s: GameState) => paymentSchedule(s).find((p) => p.week === s.week) ?? null;
export function nextPayment(s: GameState): { week: number; weeksLeft: number; amount: number; name: string; season: number } {
  const sch = paymentSchedule(s);
  const p = sch.find((x) => x.week >= s.week);
  if (p) return { week: p.week, weeksLeft: p.week - s.week + 1, amount: paymentDue(s, p.season) + s.carry, name: paymentName(s, p.season), season: p.season };
  const first = sch[0];
  return { week: first.week, weeksLeft: yearLen(s) - s.week + first.week + 1, amount: paymentDue(s, first.season, s.year + 1) + s.carry, name: paymentName(s, first.season, s.year + 1), season: first.season };
}
/** v3 §3.1 · the rest of the ladder to the buyout, 10% off: every payment of this year not yet made, then whole
 *  years until the third autumn payment, plus what was carried over */
export function buyoutPrice(s: GameState): number | null {
  if (!isMortgaged(s)) return null;
  let left = BUYOUT_YEARS - (s.paidYears ?? 0), sum = 0, year = s.year;
  const sch = paymentSchedule(s);
  const autumn = sch.find((p) => p.season === 2)!;
  if (s.week > autumn.week) year += 1; // this year's autumn is already paid
  for (; left > 0; year++, left--) for (const p of sch) if (year > s.year || p.week >= s.week) sum += paymentBase(s, p.season, year);
  return Math.round((sum + s.carry) * 0.9);
}

const planCache = new Map<string, YearPlan>();
export function yearPlanFor(s: Pick<GameState, 'seed' | 'loc' | 'tiles' | 'run'>, year: number): YearPlan {
  const key = `${s.seed}|${s.loc}|v4|plan|${year}`;
  // v3 · an expedition adds its region's hazards; the random stream of the rest of the year stays the same
  const hazards = s.run ? hazardsFor(s.loc, s.run.cond, year) : undefined;
  const cacheKey = hazards ? `${key}|${s.run!.cond}` : key;
  let p = planCache.get(cacheKey);
  if (!p) {
    const loc = LOCATIONS[s.loc];
    p = planYear({ key, year, loc, river: s.tiles.some((t) => t.terrain === 'river'), crops: loc.shop, ...(hazards ? { hazards } : {}) });
    if (planCache.size > 40) planCache.clear();
    planCache.set(cacheKey, p);
  }
  return p;
}
export interface WeekInfo { year: number; week: number; season: 0 | 1 | 2 | 3; weekInSeason: number; absWeek: number; offset: number; temp: number }
export function weekInfo(s: GameState, offset: number): WeekInfo {
  let year = s.year, week = s.week + offset;
  const N = yearLen(s);
  while (week > N) {
    week -= N;
    year += 1;
  }
  const { season, w } = seasonOf(locOf(s), week);
  const temps = year === s.year ? s.temps : yearPlanFor(s, year).temps;
  return { year, week, season, weekInSeason: w, absWeek: s.absWeek + offset, offset, temp: temps[week - 1] ?? 0 };
}
export const airTemp = (s: GameState, offset = 0) => weekInfo(s, offset).temp;
/** PSV-019 · a copy whose whole calendar (week, season, week in season, absolute week) stands at the start of
 *  `season` of this year. Previews use it instead of overwriting only `season`, so every season check agrees. */
export function seasonView(s: GameState, season: 0 | 1 | 2 | 3): GameState {
  const week = locOf(s).seasons.slice(0, season).reduce((a, b) => a + b, 0) + 1;
  return { ...s, season, week, weekInSeason: 1, absWeek: s.yearStart + week - 1 };
}
// episodes of the week `abs` (this year and, past its end, the next one)
export function episodesAt(s: GameState, abs: number): Episode[] {
  const own = s.plan.filter((e) => covers(e, abs));
  if (abs - s.yearStart + 1 <= yearLen(s)) return own;
  const next = yearPlanFor(s, s.year + 1).episodes.map((e) => ({ ...e, start: e.start + s.yearStart + yearLen(s) - 1 }));
  return [...own, ...next.filter((e) => covers(e, abs))];
}
export const activeEpisodes = (s: GameState) => s.plan.filter((e) => e.kind !== 'crows' && covers(e, s.absWeek));
// what the player knows: running periods and those starting within the forecast horizon
export function knownEpisodes(s: GameState): Episode[] {
  const until = s.absWeek + lookahead(s);
  const showMarket = lvl(s, 'meteo') >= 2;
  const own = s.plan;
  const next = yearPlanFor(s, s.year + 1).episodes.map((e) => ({ ...e, start: e.start + s.yearStart + yearLen(s) - 1 }));
  return [...own, ...next].filter((e) => !EPISODES[e.kind].biotic && e.start <= until && episodeEnd(e) >= s.absWeek && (showMarket || EPISODES[e.kind].row !== 'market' || e.start <= s.absWeek));
}

// ---------- shapes ----------
const asCard = (c: CardLike) => (typeof c === 'string' ? { def: c } : c);
export function rotateCells(cells: [number, number][], rot: number): [number, number][] {
  let out = cells.map(([x, y]) => [x, y] as [number, number]);
  for (let i = 0; i < ((rot % 4) + 4) % 4; i++) out = out.map(([x, y]) => [-y, x] as [number, number]);
  const mx = Math.min(...out.map((c) => c[0]));
  const my = Math.min(...out.map((c) => c[1]));
  return out.map(([x, y]) => [x - mx, y - my] as [number, number]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}
export function cardCells(c: CardLike): [number, number][] {
  const k = asCard(c);
  const d = CARDS[k.def];
  if (!d?.crop) return [[0, 0]];
  return [...CROPS[d.crop].shape.map((x) => [x[0], x[1]] as [number, number]), ...(k.extra ?? [])];
}
export const cardShape = (c: CardLike, rot = 0) => rotateCells(cardCells(c), rot);
export function shapeRotations(c: CardLike): number[] {
  const seen = new Set<string>();
  const out: number[] = [];
  for (let r = 0; r < 4; r++) {
    const k = JSON.stringify(cardShape(c, r));
    if (!seen.has(k)) {
      seen.add(k);
      out.push(r);
    }
  }
  return out;
}
export function shapePivot(cells: [number, number][]): [number, number] {
  const cx = cells.reduce((a, c) => a + c[0], 0) / cells.length;
  const cy = cells.reduce((a, c) => a + c[1], 0) / cells.length;
  let best = cells[0];
  let bd = Infinity;
  for (const c of cells) {
    const d = (c[0] - cx) ** 2 + (c[1] - cy) ** 2;
    if (d < bd - 1e-9) {
      bd = d;
      best = c;
    }
  }
  return best;
}
export function shapeTiles(c: CardLike, ax: number, ay: number, rot: number): [number, number][] {
  const cells = cardShape(c, rot);
  const [px, py] = shapePivot(cells);
  return cells.map(([x, y]) => [ax + x - px, ay + y - py] as [number, number]);
}
function matchesShape(c: CardLike, tiles: [number, number][]): boolean {
  const mx = Math.min(...tiles.map((t) => t[0]));
  const my = Math.min(...tiles.map((t) => t[1]));
  const norm = JSON.stringify(tiles.map(([x, y]) => [x - mx, y - my]).sort((a, b) => a[1] - b[1] || a[0] - b[0]));
  return shapeRotations(c).some((r) => JSON.stringify(cardShape(c, r)) === norm);
}
export const cardTraits = (c: CardLike): TraitId[] => asCard(c).traits ?? [];
export function variantId(c: CardLike): string {
  const k = asCard(c);
  return `${k.def}${k.extra?.length ? `|${k.extra.map((e) => e.join(',')).join(';')}` : ''}${k.traits?.length ? `#${k.traits.join(',')}` : ''}`;
}

// ---------- temperature ----------
export const nearTerrain = (s: GameState, x: number, y: number, kind: Terrain) => neighbors4(x, y).some(([a, b]) => tile(s, a, b).terrain === kind);
export function wetCanals(s: GameState): Set<number> {
  const wet = new Set<number>();
  const queue = ownedTiles(s).filter(([t,x,y]) => t.canal && nearTerrain(s,x,y,'river')).map(([,x,y]) => [x,y] as [number,number]);
  for (let i=0; i<queue.length; i++) {
    const [x,y]=queue[i], key=idx(x,y);
    if(wet.has(key)) continue;
    wet.add(key);
    for(const [a,b] of neighbors4(x,y)) if(tile(s,a,b).canal && !wet.has(idx(a,b))) queue.push([a,b]);
  }
  return wet;
}
export const nearCanal = (s: GameState, x: number, y: number) => {
  const wet=wetCanals(s);
  return neighbors4(x,y).some(([a,b])=>wet.has(idx(a,b)));
};
// One shared preview/transition for water arriving before growth. No hidden random inputs.
export function growthMoisture(s: GameState): number[] {
  const m=s.tiles.map(t=>t.moisture), winter=s.season===3, wet=wetCanals(s);
  for(const [t,x,y] of ownedTiles(s)) {
    // Frozen outdoor beds rest; heated greenhouses still need working irrigation.
    if(!winterCareTarget(s,x,y)) continue;
    const i=idx(x,y);
    if(!winter && s.flags.rain && t.structure!=='greenhouse' && !t.canal) m[i]=Math.min(3,m[i]+1);
    if(lvl(s,'irrigation')>=3) m[i]=Math.min(3,m[i]+1);
    if(lvl(s,'irrigation')>=4 && t.crop && m[i]<2) m[i]=Math.min(3,m[i]+2);
    if(!winter && nearTerrain(s,x,y,'river')) m[i]=Math.max(m[i],1);
    if(!winter && neighbors4(x,y).some(([a,b])=>wet.has(idx(a,b)))) m[i]=3;
  }
  if(wlvl(s,'irrigator')>=3) {
    const thirsty=ownedTiles(s).filter(([t,x,y])=>t.crop && !t.crop.rest && winterCareTarget(s,x,y) && m[idx(x,y)]<2).sort((a,b)=>m[idx(a[1],a[2])]-m[idx(b[1],b[2])]).slice(0,3);
    for(const [,x,y] of thirsty) m[idx(x,y)]=Math.min(3,m[idx(x,y)]+2);
  }
  return m;
}
// the soil temperature of a bed in a week of the given air temperature
export function soilTemp(s: GameState, x: number, y: number, air = airTemp(s)): number {
  const t = tile(s, x, y);
  if (t.structure === 'greenhouse') {
    if (heated(s)) return Math.max(air + 10, 18) + (wlvl(s, 'greenhouser') >= 2 ? 4 : 0);
    return air + 8 + (wlvl(s, 'greenhouser') >= 2 ? 4 : 0);
  }
  let v = air;
  if (t.mulch > 0) v += air < 12 ? 2 : air > 25 ? -3 : 0;
  if (t.shelter > 0) v += 5;
  if (t.terrain === 'sand') v += 2;
  if (nearTerrain(s, x, y, 'forest')) v -= 2;
  if (nearTerrain(s, x, y, 'river') || nearCanal(s, x, y)) v -= 1;
  if (t.soil >= 4) v += 1;
  if (t.cleared && lvl(s, 'clearing') >= 3) v += 3;
  return Math.round(v);
}
export function cropMinT(c: CropId, traits: TraitId[] = []) {
  return CROPS[c].minT - (traits.includes('cold') ? 4 : 0);
}
export function cropMaxT(c: CropId) {
  return CROPS[c].maxT;
}
// the air temperature at which a plant dies
export function frostLimit(p: Plant): number {
  const d = CROPS[p.id];
  const cold = p.traits?.includes('cold') ? 4 : 0;
  if (d.winter || d.perennial) return d.frost - cold;
  return (p.grown < 2 ? Math.min(0, d.frost + 3) : d.frost) - cold;
}
// how much a bed shields its plant from frost, in degrees
export function frostShield(s: GameState, t: Tile): number {
  if (t.structure === 'greenhouse') return heated(s) ? 60 : 8;
  const i = s.tiles.indexOf(t);
  const fire = i >= 0 ? fireHeat(s, i % GRID, Math.floor(i / GRID)) : 0;
  return (t.shelter > 0 ? 5 : 0) + (t.mulch > 0 ? 1 : 0) + fire;
}
export function frostKills(s: GameState, x: number, y: number, air = airTemp(s)): boolean {
  const t = tile(s, x, y);
  if (!t.crop) return false;
  // v3 · a run: the burka softens frost by 1°, a plot by the spring is 2° colder
  const run = (hasRelic(s, 'burka') ? 1 : 0) - (hasCond(s, 'spring') ? 2 : 0);
  return air + run + frostShield(s, t) <= frostLimit(t.crop);
}

// why a plant will not grow this week (null — it grows): the order the player should fix it in
export type GrowNote = 'dry' | 'cold' | 'hot' | 'flood' | 'dormant' | 'rest' | null;
export function growNote(s: GameState, x: number, y: number, rained = false, air = airTemp(s)): GrowNote {
  const t = tile(s, x, y);
  const p = t.crop;
  if (!p) return null;
  if (p.rest) return 'rest';
  if (CROPS[p.id].greenhouseOnly && t.structure !== 'greenhouse') return 'dormant';
  const winter = s.season === 3;
  if (winter && t.structure !== 'greenhouse') return 'dormant';
  const m = rained ? t.moisture : growthMoisture(s)[idx(x,y)];
  if (m < 1) return 'dry';
  if (CROPS[p.id].flood && m < 3) return 'flood';
  const soil = soilTemp(s, x, y, air);
  if (soil < cropMinT(p.id, p.traits)) return 'cold';
  const max = cropMaxT(p.id);
  if (max !== undefined && soil > max && t.structure !== 'greenhouse') return 'hot';
  return null;
}
export function growStep(s: GameState, x: number, y: number, rained = false): number {
  if (growNote(s, x, y, rained)) return 0;
  return 1 + (s.flags.warm ? 1 : 0);
}
export function cropGrow(s: GameState, p: Plant | CropId, traits: TraitId[] = []): number {
  const id = typeof p === 'string' ? p : p.id;
  const tr = typeof p === 'string' ? traits : p.traits ?? [];
  return Math.max(1, CROPS[id].grow - (tr.includes('fast') ? 1 : 0));
}
// a perennial wakes in spring and needs this many warm weeks to fruit again
export const REGROW: Partial<Record<CropId, number>> = { strawberry: 4, seabuckthorn: 10, cranberry: 8 };
export const targetGrow = (s: GameState, p: Plant) => {
  const regrowing = p.regrowing ?? ((p.years ?? CROPS[p.id].perennial ?? 0) < (CROPS[p.id].perennial ?? 0));
  const base = regrowing ? (REGROW[p.id] ?? CROPS[p.id].grow) : CROPS[p.id].grow;
  return Math.max(1, base - (p.traits?.includes('fast') ? 1 : 0));
};

// In how many weeks a plant ripens if kept watered (0 — at the end of this week; null — not this year / never).
// Uses the year's temperatures, so a cold spring and an early winter are counted.
export function ripenIn(s: GameState, x: number, y: number, options?: { knownOnly?: boolean }): number | null {
  if (!inGrid(x, y) || !tile(s, x, y).crop) return null;
  const c = clone(s);
  const pid = tile(c, x, y).crop!.pid;
  const known = options?.knownOnly ? knownEpisodes(s) : null;
  for (let k = 0; k < 40; k++) {
    const t = tile(c, x, y);
    if (!t.crop || t.crop.pid !== pid) return null;
    if (known) {
      // Planting advice uses only disclosed weather. Beyond the forecast horizon it
      // assumes the seasonal curve, so hidden episodes cannot leak through a date.
      c.plan = known;
      c.temps = Array.from({ length: yearLen(c) }, (_, i) => {
        const abs = c.yearStart + i, offset = abs - s.absWeek;
        if (offset >= 0 && offset <= lookahead(s)) return airTemp(s, offset);
        const { season, w } = seasonOf(locOf(c), i + 1);
        let temp = baseTemp(locOf(c), season, w);
        for (const e of known.filter((e) => covers(e, abs))) {
          if (e.kind === 'warm') temp += 4;
          if (e.kind === 'dry') temp += 5;
          if (e.kind === 'rain') temp -= 2;
          if (e.kind === 'thaw') temp = Math.max(temp, 1);
          if (e.kind === 'frost') temp = Math.min(temp, -2);
        }
        return Math.round(temp);
      });
      c.flags = k === 0 ? { ...s.flags } : {
        warm: known.some((e) => e.kind === 'warm' && covers(e, c.absWeek)),
        rain: known.some((e) => e.kind === 'rain' && covers(e, c.absWeek)),
        dry: known.some((e) => e.kind === 'dry' && covers(e, c.absWeek)),
      };
      c.strikes = clone(s.strikes.filter((st) => st.week >= c.absWeek));
      c.crows = k === 0 ? clone(s.crows) : null;
      c.thieves = k === 0 ? clone(s.thieves) : null;
    }
    // This forecast assumes the selected crop is kept watered, as its UI promises.
    t.moisture = 3;
    c.report = emptyReport();
    resolveWeek(c);
    if (c.report.harvests.some((h) => h.x === x && h.y === y)) return k;
    if (!tile(c, x, y).crop) return null;
    startWeek(c);
  }
  return null;
}

// ---------- soil and yield ----------
export const SOIL_MULT = [0, 0.6, 1, 1.2, 1.4, 1.6];
export const soilMult = (soil: number) => SOIL_MULT[Math.max(1, Math.min(5, soil))];
export function pidCells(s: GameState, pid: number): [number, number][] {
  const out: [number, number][] = [];
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (tile(s, x, y).crop?.pid === pid) out.push([x, y]);
  return out;
}
function sisters(s: GameState, cells: [number, number][]) {
  const own = new Set(cells.map(([x, y]) => `${x},${y}`));
  let bean = false, pumpkin = false;
  for (const [x, y] of cells)
    for (const [a, b] of neighbors4(x, y)) {
      if (own.has(`${a},${b}`)) continue;
      const id = tile(s, a, b).crop?.id;
      if (id === 'bean') bean = true;
      if (id === 'pumpkin') pumpkin = true;
    }
  return bean && pumpkin;
}
export interface YieldPart { label: string; mult?: number; add?: number }
// every multiplier of a bed, named (the bed panel shows them)
export const greenhouseYieldReady = (s: GameState, t: Tile) => t.structure === 'greenhouse' && (t.greenhousePlacedWeek === undefined || t.greenhousePlacedWeek < s.absWeek);
export const hiveYieldReady = (s: GameState, t: Tile) => t.structure === 'hive' && (t.hivePlacedWeek === undefined || t.hivePlacedWeek < s.absWeek);
export function yieldParts(s: GameState, x: number, y: number, c: CropId, planting?: [number, number][], soilOverride?: number): YieldPart[] {
  const t = tile(s, x, y);
  const parts: YieldPart[] = [];
  const soil = soilOverride ?? t.soil;
  if (soil !== 2) parts.push({ label: `плодородие ${soil}`, mult: soilMult(soil) });
  if (c === 'corn') {
    const cells = planting ?? (t.crop?.id === 'corn' ? pidCells(s, t.crop.pid) : [[x, y] as [number, number]]);
    if (sisters(s, cells)) parts.push({ label: '«три сёстры»', mult: 1.25 });
  }
  if ((c === 'carrot' && neighbors8(x, y).some(([a, b]) => tile(s, a, b).crop?.id === 'onion')) || (c === 'onion' && neighbors8(x, y).some(([a, b]) => tile(s, a, b).crop?.id === 'carrot')))
    parts.push({ label: c === 'carrot' ? 'лук рядом' : 'морковь рядом', mult: 1.2 });
  if (CROPS[c].flowering || c === 'strawberry' || c === 'watermelon') {
    const area = wlvl(s, 'beekeeper') >= 1 ? neighbors8(x, y) : neighbors4(x, y);
    if (area.some(([a, b]) => hiveYieldReady(s, tile(s, a, b)))) parts.push({ label: 'улей рядом', mult: (c === 'buckwheat' ? 1.5 : 1.25) * (wlvl(s, 'beekeeper') >= 3 ? 1.2 : 1) });
  }
  if (greenhouseYieldReady(s, t)) {
    if (wlvl(s, 'greenhouser') >= 1) parts.push({ label: 'тепличница', mult: 1.5 });
    if (lvl(s, 'greenhouse') >= 4) parts.push({ label: 'тепличный комплекс', mult: 1.5 });
  }
  if (t.terrain === 'sand' && CROPS[c].sandBonus) parts.push({ label: 'песок', mult: c === 'watermelon' ? 1.4 : 1.3 });
  if (!greenhouseYieldReady(s,t) && nearTerrain(s, x, y, 'forest')) parts.push({ label: 'тень леса', mult: 0.85 });
  else if (!greenhouseYieldReady(s,t) && nearTree(s, x, y)) parts.push({ label: 'тень дерева', mult: 0.85 });
  if (lvl(s, 'machinery') >= 3) parts.push({ label: 'комбайн', mult: 1.1 });
  return parts;
}
export function harvestMultiplier(s: GameState, x: number, y: number, c: CropId, planting?: [number, number][], soilOverride?: number): number {
  return yieldParts(s, x, y, c, planting, soilOverride).reduce((m, p) => m * (p.mult ?? 1), 1);
}
const flatBonus = (s: GameState, traits: TraitId[] = []) => (wlvl(s, 'agronomist') >= 3 ? 2 : wlvl(s, 'agronomist') >= 1 ? 1 : 0) + (traits.includes('yield') ? 1 : 0);
export function expectedYield(s: GameState, x: number, y: number, mult?: number): number {
  const t = tile(s, x, y);
  if (!t.crop) return 0;
  const p = t.crop;
  return Math.max(0, Math.round(CROPS[p.id].yield * harvestMultiplier(s, x, y, p.id) * (mult ?? p.mult) + p.bonus + flatBonus(s, p.traits)));
}
export function plantingYield(s: GameState, pid: number, factor = 1): number {
  let sum = 0;
  for (const [x, y] of pidCells(s, pid)) sum += expectedYield(s, x, y, tile(s, x, y).crop!.mult * factor);
  return sum;
}
// what a card would give on exactly these cells
export function placementYield(s: GameState, c: CardLike, cells: [number, number][]): number {
  const k = asCard(c);
  const crop = CARDS[k.def].crop!;
  const shift = sowingSoil(s, c, cells);
  let sum = 0;
  for (const [x, y] of cells.filter(([x, y]) => inGrid(x, y))) {
    const soil = shift.get(`${x},${y}`)?.to ?? tile(s, x, y).soil;
    sum += Math.max(0, Math.round(CROPS[crop].yield * harvestMultiplier(s, x, y, crop, cells, soil) + flatBonus(s, k.traits)));
  }
  return sum;
}
export function sowingSoil(s: GameState, c: CardLike, cells: [number, number][]): Map<string, { from: number; to: number }> {
  const crop = CARDS[asCard(c).def].crop!;
  const out = new Map<string, { from: number; to: number }>();
  if (wlvl(s, 'agronomist') >= 2) return out;
  for (const [x, y] of cells) {
    if (!inGrid(x, y)) continue;
    const t = tile(s, x, y);
    if (t.owned && !t.crop && t.last === crop && t.soil > 1) out.set(`${x},${y}`, { from: t.soil, to: t.soil - 1 });
  }
  return out;
}
const legumeGain = (s: GameState) => (wlvl(s, 'soilsci') >= 1 ? 2 : 1);
export function beanGain(s: GameState, cells: [number, number][]): Map<string, number> {
  const out = new Map<string, number>();
  const own = new Set(cells.map(([x, y]) => `${x},${y}`));
  for (const [x, y] of cells)
    for (const [a, b] of neighbors4(x, y)) {
      const k = `${a},${b}`;
      const t = tile(s, a, b);
      if (own.has(k) || !t.owned || t.soil >= 5) continue;
      out.set(k, Math.min(5 - t.soil, (out.get(k) ?? 0) + legumeGain(s)));
    }
  return out;
}
function soilUp(s: GameState, x: number, y: number, n: number) {
  const t = tile(s, x, y);
  if (!t.owned || n <= 0) return 0;
  const was = t.soil;
  t.soil = Math.min(5, t.soil + n);
  if (t.soil > was) s.report.soilUp += 1;
  return t.soil - was;
}

// ---------- placement ----------
export function tileBlock(s: GameState, x: number, y: number, crop?: CropId): string | null {
  if (!inGrid(x, y)) return 'за краем поля';
  const t = tile(s, x, y);
  if (!t.owned) return t.terrain === 'river' ? 'река' : t.terrain === 'forest' ? 'тайга' : 'чужая земля';
  if (t.terrain === 'rock') return 'камни';
  if (t.terrain === 'swamp' && !(crop && CROPS[crop].swamp)) return 'болото';
  if (crop && CROPS[crop].swamp && t.terrain !== 'swamp') return 'нужно болото';
  if (t.canal) return 'канал';
  if (t.crop) return 'занято';
  if (s.run?.dig && s.run.dig.x === x && s.run.dig.y === y) return 'раскоп археологов';
  if (t.tree !== undefined) return treeStage(t) === 1 ? 'поросль' : 'дерево';
  if (t.structure === 'hive') return 'улей';
  if (t.weeds) return 'сорняки';
  if (crop && CROPS[crop].greenhouseOnly && t.structure !== 'greenhouse') return 'только в теплице';
  if (weekInfo(s, 0).season === 3 && t.structure !== 'greenhouse') return 'земля промёрзла';
  return null;
}
export function cellReasons(s: GameState, c: CardLike, cells: [number, number][]): (string | null)[] {
  const crop = CARDS[asCard(c).def].crop;
  return cells.map(([x, y]) => tileBlock(s, x, y, crop));
}
export function plantBlock(s: GameState, c: CardLike, cells: [number, number][]): string | null {
  const why = cellReasons(s, c, cells).find((r) => r);
  return why ?? null;
}
export function placements(s: GameState, c: CardLike): { rot: number; tiles: [number, number][] }[] {
  const out: { rot: number; tiles: [number, number][] }[] = [];
  const seen = new Set<string>();
  for (const rot of shapeRotations(c))
    for (let y = 0; y < GRID; y++)
      for (let x = 0; x < GRID; x++) {
        const tiles = shapeTiles(c, x, y, rot);
        const k = tiles.map((t) => t.join(',')).sort().join(';');
        if (seen.has(k) || plantBlock(s, c, tiles)) continue;
        seen.add(k);
        out.push({ rot, tiles });
      }
  return out;
}

/** PSV-018/020 · could this crop ever grow on (x,y) in this region? Only the land itself counts: ownership, crops,
 *  weeds, buildings and canals change during a game; a river never becomes a bed and a drained swamp never comes back. */
export function potentialTile(s: GameState, x: number, y: number, crop: CropId): boolean {
  if (!inGrid(x, y)) return false;
  const t = tile(s, x, y);
  if (CROPS[crop].swamp) return t.terrain === 'swamp';
  if (t.terrain === 'river') return false;
  if (t.terrain === 'forest') return t.owned || trackAvailable(s, 'clearing');
  return true; // plain and sand; rock and swamp can be cleared
}
/** how many ways the shape could ever be laid on this region's land (any rotation) */
export function potentialPlacements(s: GameState, c: CardLike): number {
  const crop = CARDS[asCard(c).def].crop;
  if (!crop) return 0;
  const seen = new Set<string>();
  for (const rot of shapeRotations(c))
    for (let y = 0; y < GRID; y++)
      for (let x = 0; x < GRID; x++) {
        const tiles = shapeTiles(c, x, y, rot);
        if (tiles.every(([a, b]) => potentialTile(s, a, b, crop))) seen.add(tiles.map((p) => p.join(',')).sort().join(';'));
      }
  return seen.size;
}
export const extendedCard = (c: CardLike, cell: [number, number]) => ({ ...asCard(c), extra: [...(asCard(c).extra ?? []), cell] });
/** a lab extension that leaves the seed with no possible place in this region is refused, never charged */
export const spotFits = (s: GameState, c: CardLike, cell: [number, number]) => potentialPlacements(s, extendedCard(c, cell)) > 0;
/** the crop can be produced here: some seed of it (owned or sold here) has a place on owned-or-buyable land */
export function cropProducible(s: GameState, c: CropId): boolean {
  if (!CROPS[c].swamp) return true;
  if (!ownedTiles(s).some(([t]) => t.terrain === 'swamp')) return false;
  const seed = `seed_${c}`;
  const cards: CardLike[] = [...deckList(s), ...s.spare, ...s.projects.flatMap((p) => (p.kind === 'cell' || p.kind === 'trait') ? [p.card] : [])].filter((k) => k.def === seed && !k.temp);
  if (shopCards(s).includes(seed)) cards.push(seed);
  return cards.some((k) => potentialPlacements(s, k) > 0);
}

// ---------- market ----------
function genDemand(s: GameState, year = s.year): GameState['demand'] {
  const w = world(s, 'demand', year);
  const out = {} as GameState['demand'];
  for (const c of CROP_IDS) out[c] = { a: 0.1 + rand(w) * 0.2, w: 5 + rand(w) * 7, p: rand(w) * Math.PI * 2 };
  return out;
}
export function priceAt(s: GameState, c: CropId, offset: number, known = true): number {
  const info = weekInfo(s, offset);
  const d = (info.year === s.year ? s.demand : genDemand(s, info.year))[c];
  const wave = 1 + d.a * Math.sin((2 * Math.PI * info.absWeek) / d.w + d.p);
  let p = CROPS[c].price * infl(info.year) * SEASON_DEMAND[c][info.season] * wave;
  const eps = known && offset > 0 ? knownEpisodes(s) : episodesAt(s, info.absWeek);
  for (const e of eps) if (EPISODES[e.kind].row === 'market' && covers(e, info.absWeek)) p *= marketMult(e, c);
  return p;
}
export const priceOf = (s: GameState, c: CropId) => round2(priceAt(s, c, 0) * Math.exp(s.noise[c] ?? 0));
const PERK_PRICE: Partial<Record<OrgId, Partial<Record<CropId, number>>>> = {
  bakery: { wheat: 1.1, rye: 1.1, buckwheat: 1.1 },
  restaurant: { tomato: 1.15, pumpkin: 1.15, strawberry: 1.15 },
  cannery: { pumpkin: 1.15, watermelon: 1.15 },
  ricemill: { rice: 1.1, wheat: 1.1 },
  beekeepers: { honey: 1.2 },
  camp: { mushrooms: 1.15, strawberry: 1.15, seabuckthorn: 1.15, cranberry: 1.15 },
  apiarists: { honey: 1.15, buckwheat: 1.15 },
  sanatorium: { cranberry: 1.1, seabuckthorn: 1.1, cabbage: 1.1 },
  teahouse: { potato: 1.15, cabbage: 1.15 },
  club: { pumpkin: 1.15, sunflower: 1.15 },
};
export const friends = (s: GameState, o: OrgId) => (s.orgs[o]?.rel ?? 0) >= 25;
export function sellMult(s: GameState, c: CropId, offset = 0): number {
  let m = 1 + [0, 0.1, 0.15, 0.2][wlvl(s, 'marketer')];
  for (const o of locOf(s).orgs) if (friends(s, o)) m *= PERK_PRICE[o]?.[c] ?? 1;
  for (const e of s.effects) if (e.kind === 'review' && e.weeks > offset) m *= e.mult;
  // v3 §7 · grain through the mill sells 25% dearer
  if (yardStage(s, 'miller') >= 2 && GRAIN.includes(c)) m *= 1.25;
  return m;
}
export const marketPrice = (s: GameState, c: CropId) => round2(priceOf(s, c) * sellMult(s, c));
export interface Forecast { offset: number; price: number; low: number; high: number; label: string }
export function forecast(s: GameState, c: CropId, offset: number): Forecast {
  if (offset === 0) {
    const p = marketPrice(s, c);
    return { offset, price: p, low: p, high: p, label: 'Сейчас' };
  }
  const p = priceAt(s, c, offset) * sellMult(s, c, offset);
  const k = Math.max(0, offset);
  const info = weekInfo(s, offset);
  // Future noise is independent each week. A better station reveals events,
  // never the random draw. The band is an indicative scenario range, not a guarantee.
  const sigma = Math.min(0.12, 0.035 * (1 + 0.12 * (info.year - 1)));
  const unknown = offset > lookahead(s) ? 0.16 + 0.025 * (offset-lookahead(s)) : lvl(s,'meteo') < 2 ? 0.12 : 0;
  const band = 2 * sigma + unknown;
  const r = (x: number) => round2(x);
  return { offset, price: r(p), low: r(p * Math.exp(-band)), high: r(p * Math.exp(band)), label: `${info.weekInSeason}-я нед. ${['весны', 'лета', 'осени', 'зимы'][info.season]}` };
}

// ---------- money ----------
export const seedCost = (s: GameState, c: CropId) => {
  const sale = activeEpisodes(s).some((e) => e.kind === 'seeds' && e.crop === c) ? 0.75 : 1;
  const seeder = lvl(s, 'machinery') >= 1 ? 2 / 3 : 1;
  const bag = hasRelic(s, 'seedbag') ? 0.8 : 1;
  // v3 §8.1 · a crop known well (level 3) is sown for less: the farmer saves seed of their own
  const know = knowLevel(s, c) >= 3 ? KNOW_SEED_SALE : 1;
  return round2(CROPS[c].seedCost * infl(s.year) * Math.max(0.5, sale * seeder) * bag * know);
};
export const cardCost = (s: GameState, def: string) => round2((CARDS[def].cost ?? 0) * infl(s.year));
export const cardShopPrice = (s: GameState, def: string) => Math.round(CARDS[def].shop * infl(s.year));
export const sidejobPay = (s: GameState) => Math.round(8 * infl(s.year) * (hasRelic(s, 'kettle') ? 2 : 1));
export const guardPrice = (s: GameState) => (hasRelic(s, 'rattle') ? 0 : round2(2 * infl(s.year)));
export const outstanding = (s: GameState) => round2(s.loans.reduce((a, l) => a + l.principal, 0));
export const loanRate = (s: GameState) => RATING_RATE[Math.max(1, Math.min(5, s.rating))];
export const creditLimit = (s: GameState) => (s.rating === 0 ? 0 : Math.max(0, Math.floor(RATING_LIMIT[s.rating] * paymentBase(s, 1) - outstanding(s))));
export const insurancePrice = (s: GameState) => round2(0.08 * nextPayment(s).amount + 2);
export const loanInterest = (l: Loan) => Math.floor((kop(l.principal) * Math.round(l.rate * 10000) + 5000) / 10000) / 100;
export function weeklyCosts(s: GameState) {
  const interest = round2(s.loans.reduce((a, l) => a + loanInterest(l), 0));
  const salaries = s.team.reduce((a, w) => a + (w.free ? 0 : Math.round(WORKERS[w.id].salary * infl(s.year))), 0);
  const heating = weekInfo(s, 0).season === 3 && heated(s) ? Math.round(2 * infl(s.year)) * countStructure(s, 'greenhouse') : 0;
  return { interest, salaries, heating, total: round2(interest + salaries + heating) };
}
export function landPrice(s: GameState): number {
  const perk = locOf(s).orgs.some((o) => (o === 'council' || o === 'stanitsa' || o === 'steward') && friends(s, o)) ? 0.7 : 1;
  return Math.round(12 * Math.pow(1.1, s.bought) * infl(s.year) * perk);
}
export function canBuyLand(s: GameState, x: number, y: number): boolean {
  const t = tile(s, x, y);
  if (t.owned || !TERRAIN[t.terrain].buyable) return false;
  return neighbors4(x, y).some(([a, b]) => tile(s, a, b).owned);
}
export function clearPrice(s: GameState, x: number, y: number): number {
  const t = tile(s, x, y);
  if (t.terrain === 'forest') {
    const k = (lvl(s, 'clearing') >= 2 ? 0.7 : 1) * (friends(s, 'forestry') ? 0.6 : 1);
    return Math.round(16 * infl(s.year) * k);
  }
  if (t.terrain === 'rock' && hasRelic(s, 'oldmap')) return 0;
  return Math.round((t.terrain === 'swamp' ? 14 : 10) * infl(s.year));
}
export const clearDays = (s: GameState, x: number, y: number) => (tile(s, x, y).terrain === 'forest' ? Math.max(1, (lvl(s, 'clearing') >= 2 ? 1 : 2) - (hasRelic(s, 'axe') ? 1 : 0)) : 1);
export function canClear(s: GameState, x: number, y: number): boolean {
  const t = tile(s, x, y);
  if (t.terrain === 'forest') return !t.owned && lvl(s, 'clearing') >= 1 && neighbors4(x, y).some(([a, b]) => tile(s, a, b).owned);
  return t.owned && !t.crop && !t.structure && !t.canal && (t.terrain === 'rock' || t.terrain === 'swamp');
}

// ---------- days and the hand ----------
export function weekDays(s: GameState): number {
  const winter = s.season === 3;
  let d = winter ? 2 : 3;
  if (lvl(s, 'house') >= 3) d += 1;
  const f = wlvl(s, 'foreman');
  d += f >= 3 ? 2 : f >= 1 ? 1 : 0;
  if (s.season === 1 && locOf(s).orgs.includes('orphanage') && friends(s, 'orphanage')) d += 1;
  if (s.season === 1 && locOf(s).orgs.includes('school') && friends(s, 'school')) d += 1;
  if (s.season === 1 && hasCond(s, 'school')) d += 1;
  if (s.weekInSeason === 1 && hasRelic(s, 'accordion')) d += 1;
  if (activeEpisodes(s).some((e) => e.kind === 'helpers')) d += 1;
  if (lvl(s, 'planning') >= 3) d += 1;
  return d;
}
// Every new week tops the hand up: the cards not played stay, the deck brings the missing ones.
export const weeklyDraw = (s: GameState) => Math.max(0, handMax(s) - s.hand.length);
// Exchanges (and cards sent to the compost pit) share one weekly allowance.
export const exchangesPerWeek = (s: GameState) => 1 + (lvl(s, 'planning') >= 2 ? 1 : 0) + (lvl(s, 'house') >= 5 ? 1 : 0) + (wlvl(s, 'foreman') >= 2 ? 1 : 0);
export const exchangesUsed = (s: GameState) => (s.exchangeWeek === s.absWeek ? s.exchanges ?? 1 : 0);
// Cards stay in the hand until played, so the exchange is how a hand is refreshed: the planning notebook makes it
// free of working days (28.10, replaces the notebook's «put a card aside»).
export const exchangeDays = (s: GameState) => (lvl(s, 'planning') >= 1 ? 0 : 1);
/** The card the next draw brings, when the planning headquarters lets the player see it (null: unknown). */
export const nextDraw = (s: GameState): Card | null => (lvl(s, 'planning') >= 3 && s.draw.length ? s.draw[s.draw.length - 1] : null);
export function drawCards(s: GameState, n: number) {
  for (let i = 0; i < n && s.hand.length < handMax(s); i++) {
    if (!s.draw.length) {
      if (!s.discard.length) return;
      s.draw = shuffle(s, s.discard);
      s.discard = [];
    }
    const c = s.draw.pop()!;
    delete c.keep;
    s.hand.push(c);
  }
}
// The new week's hand: every card not played stays where it is (28.10: «все карты остаются на руке»); the deck
// tops the hand up to handMax. Saves made under the old «put aside» rule lose their marks.
function dealWeek(s: GameState) {
  for (const c of s.hand) delete c.keep;
  drawCards(s, weeklyDraw(s));
}
export const deckList = (s: GameState): Card[] => [...s.hand, ...s.draw, ...s.discard];
// A laboratory project reserves its permanent active slot until it returns.
export const deckCount = (s: GameState): number => deckList(s).filter((c) => !c.temp).length + s.projects.filter((p) => (p.kind === 'cell' || p.kind === 'trait') && p.origin !== 'spare' && !p.card.temp).length;
export function drawProblem(s: GameState): string | null {
  if (s.phase !== 'week') return s.phase === 'shortfall' ? 'Вы не можете это сделать, не решив вопрос с платежом' : 'Сейчас не время';
  if (s.hand.length >= handMax(s)) return `В руке уже ${handMax(s)} карт`;
  if (!s.draw.length && !s.discard.length) return 'Колода пуста';
  if (s.days < 1) return 'Нужен рабочий день';
  return null;
}
export function exchangeIdentity(c: CardLike): string {
  const k=asCard(c);
  const shape=shapeRotations(k).map(r=>JSON.stringify(cardShape(k,r))).sort()[0];
  return `${k.def}|${shape}|${[...(k.traits??[])].sort().join(',')}`;
}
export function exchangeProblem(s: GameState, uid?: number): string | null {
  if(s.phase!=='week') return 'Сначала решите вопрос с платежом';
  if(exchangesUsed(s)>=exchangesPerWeek(s)) return exchangesPerWeek(s)>1 ? 'Обмены этой недели закончились' : 'Обмен уже использован на этой неделе';
  if(s.days<exchangeDays(s)) return 'Нужен рабочий день';
  if(!s.hand.length) return 'В руке нет карт для обмена';
  if(uid!==undefined && !s.hand.some(c=>c.uid===uid)) return 'Карты нет в руке';
  if(!s.draw.length && !s.discard.length) return 'Нет другой карты для обмена';
  return null;
}
export const compostWeeks = (s: GameState) => lvl(s,'compost')>=2 ? 2 : 3;
export function compostProblem(s: GameState, uid: number): string | null {
  if(lvl(s,'compost')<1) return 'Сначала постройте компостную яму';
  if(s.compostReady) return 'Сначала заберите готовый компост';
  if(exchangesUsed(s)>=exchangesPerWeek(s)) return 'На этой неделе карта уже обменена или отправлена в компост';
  if(s.days<exchangeDays(s)) return 'Нужен рабочий день';
  const c=s.hand.find(c=>c.uid===uid);
  if(!c) return 'Выберите карту в руке';
  if(c.temp || c.def==='compost' || c.def==='bio') return 'Готовое удобрение и одноразовые карты сюда не идут';
  return null;
}
export function sowDays(s: GameState, cells: number): number {
  return Math.max(0, Math.ceil(cells / 2) - (lvl(s, 'machinery') >= 2 && !s.sowings ? 1 : 0));
}
export function cardDays(s: GameState, card: CardLike, cells?: number): number {
  const def = asCard(card).def;
  if (isSeed(def)) return sowDays(s, cells ?? cardCells(card).length);
  if (def === 'fertilizer') return Math.max(1, Math.ceil((cells ?? 1) / 2));
  return CARDS[def].days;
}
export const winterCareTarget = (s: GameState, x: number, y: number) => s.season !== 3 || (heated(s) && tile(s, x, y).structure === 'greenhouse');
// The same effective cells drive validation, preview, application and animation.
export function workEffectCells(s: GameState, def: string, x: number, y: number): [number, number][] {
  if (!inGrid(x, y) || !tile(s, x, y).owned) return [];
  const d = CARDS[def], t = tile(s, x, y);
  if (d.target === 'cropTile' && (!t.crop || t.crop.rest)) return [];
  let cells: [number, number][] = def === 'fertilizer' ? pidCells(s, t.crop!.pid)
    : def === 'water' ? waterArea(s, x, y)
    : def === 'compost' || def === 'mulch' ? [[x, y], ...neighbors4(x, y)]
    : d.target === 'block' ? blockCells(x, y)
    : d.target === 'row' ? lineCells('row', y) : [[x, y]];
  return cells.filter(([a, b]) => {
    const q = tile(s, a, b);
    if (!q.owned || (d.noWinter && !winterCareTarget(s, a, b))) return false;
    if (def === 'water') return q.moisture < 3;
    if (def === 'fertilizer') return !!q.crop && !q.crop.rest && !q.crop.fed;
    if (def === 'compost' || def === 'bio') return q.soil < 5;
    if (def === 'mulch') return q.mulch < 3;
    if (def === 'shelter') return q.shelter < 3;
    if (def === 'care') return !!q.crop && !q.crop.rest;
    if (def === 'snow') return !q.snow;
    if (def === 'early') return !!q.crop && q.crop.grown * 2 >= targetGrow(s, q.crop);
    return true;
  });
}
export function workCardPreview(s: GameState, card: CardLike, x: number, y: number) {
  const def = asCard(card).def;
  const cells = workEffectCells(s, def, x, y);
  const days = cardDays(s, card, cells.length);
  const cost = cardCost(s, def);
  const empty: Record<string, string> = { water: 'Здесь уже полито', fertilizer: 'Здесь нечего подкормить', compost: 'Здесь плодородие уже 5/5', bio: 'Здесь плодородие уже 5/5', mulch: 'Мульча ещё свежая', shelter: 'Укрытие уже установлено', care: 'Здесь нет растущих посевов', snow: 'Этот ряд уже задерживает снег', early: 'Ещё рано собирать' };
  const reason = !inGrid(x,y) || !tile(s,x,y).owned ? 'Выберите свою грядку'
    : CARDS[def].noWinter && !winterCareTarget(s,x,y) ? 'Зимой — только в отапливаемой теплице'
    : !cells.length ? empty[def] ?? 'Здесь нет эффекта'
    : s.days < days ? `Нужно ${days} дн., осталось ${s.days}`
    : s.money < cost ? `Не хватает ${money(cost - s.money)}` : null;
  const before = cells.reduce((n,[a,b]) => n + expectedYield(s,a,b),0);
  let after = def === 'fertilizer' ? cells.reduce((n,[a,b]) => n + expectedYield(s,a,b,tile(s,a,b).crop!.mult * 1.5),0) : before;
  if(def==='care') after=before+cells.length;
  if(def==='compost'||def==='bio') {
    const preview=clone(s);
    for(const [a,b] of cells) tile(preview,a,b).soil=Math.min(5,tile(preview,a,b).soil+(wlvl(s,'soilsci')>=2?2:1));
    after=cells.reduce((n,[a,b])=>n+expectedYield(preview,a,b),0);
  }
  return {cells,days,cost,reason,before,after};
}
export function playableTargets(s: GameState, def: string): [number, number][] {
  const d = CARDS[def];
  const out: [number, number][] = [];
  for (const [t, x, y] of ownedTiles(s)) {
    if (s.season === 3 && d.noWinter && !winterCareTarget(s, x, y)) continue;
    if (['water','fertilizer','compost','bio','mulch','shelter','care','snow'].includes(def)) {
      if (workEffectCells(s,def,x,y).length) out.push([x,y]);
      continue;
    }
    if (def === 'care' && (!t.crop || t.crop.rest)) continue;
    if (def === 'snow' && t.snow) continue;
    if (d.target === 'cropTile') {
      if (!t.crop || t.crop.rest) continue;
      if (def === 'fertilizer' && t.crop.fed) continue;
      if (def === 'early' && t.crop.grown * 2 < targetGrow(s, t.crop)) continue;
      out.push([x, y]);
    } else if (d.target === 'tile' || d.target === 'block' || d.target === 'row') out.push([x, y]);
  }
  return out;
}
/** PSV-002 · the one day cost every view shows: the card face, its spoken label, the shop and the inventory */
export const cardDaysShown = (s: GameState, card: CardLike): number => (s.phase === 'week' ? cardNeedDays(s, card) : cardDays(s, card));
export function cardNeedDays(s: GameState, card: CardLike): number {
  const def = asCard(card).def;
  if (def === 'fertilizer') {
    const sizes = playableTargets(s, def).map(([x,y]) => workEffectCells(s,def,x,y).length);
    return cardDays(s, card, sizes.length ? Math.min(...sizes) : 1);
  }
  return cardDays(s, card);
}
// seeds can be taken from the suppliers on credit: the debt joins the next payment
export const seedCreditCap = (s: GameState) => Math.round(30 * infl(s.year));
export function seedDebt(s: GameState, cost: number) {
  return Math.max(0, round2((cost - s.money) * 1.1));
}
export function cardBlockReason(s: GameState, card: CardLike): string | null {
  const k = asCard(card);
  const d = CARDS[k.def];
  const winter = s.season === 3;
  if (s.phase !== 'week') return s.phase === 'shortfall' ? 'Вы не можете это сделать, не решив вопрос с платежом' : 'Сейчас не время';
  if (k.def === 'sidejob' && s.sidejobWeek === s.absWeek) return 'Подработка уже выполнена на этой неделе';
  if (k.def === 'forage' && s.forageWeek === s.absWeek) return 'Грибы уже собраны на этой неделе';
  if (d.winterOnly && !winter) return 'Только зимой';
  if (d.noWinter && winter && !(['water', 'fertilizer', 'mulch', 'care'].includes(k.def) && playableTargets(s, k.def).length)) return 'Зимой не пригодится';
  if (s.days < cardNeedDays(s, k)) return 'Не хватает рабочих дней';
  if (d.kind === 'seed') {
    const crop = d.crop!;
    // ECO-03 · the same kopeck-rounded price `sow` charges
    const cost = round2(seedCost(s, crop) * cardCells(k).length);
    if (s.money < cost && s.carry + seedDebt(s, cost) > seedCreditCap(s)) return 'Нет денег, а в долг семян больше не дают';
    if (CROPS[crop].greenhouseOnly && !countStructure(s, 'greenhouse')) return 'Нужна теплица';
    if (winter && !s.tiles.some((t) => t.structure === 'greenhouse' && heated(s))) return 'Земля промёрзла';
    if (!placements(s, k).length) return 'Фигуре нет места на поле';
    return null;
  }
  if (s.money < cardCost(s, k.def)) return 'Не хватает денег';
  if ((k.def === 'fertilizer' || k.def === 'early') && !playableTargets(s, k.def).length)
    return s.tiles.some((t) => t.crop) ? (k.def === 'early' ? 'Рано: собирать можно с половины срока' : 'Все посадки уже подкормлены') : 'Нет посевов';
  if (k.def === 'care' && !playableTargets(s, k.def).length) return 'Нет растущих посевов';
  if (k.def === 'snow' && !playableTargets(s, k.def).length) return 'Все ряды уже задерживают снег';
  if (['compost','bio'].includes(k.def) && !playableTargets(s,k.def).length) return 'На всех грядках плодородие 5/5';
  if (k.def === 'water' && !playableTargets(s,k.def).length) return 'Все грядки уже политы';
  if (k.def === 'weeding' && !s.tiles.some((t) => t.owned && (t.weeds || treeStage(t) === 1))) return 'Сорняков нет';
  if (k.def === 'forage' && !(s.season === 1 || s.season === 2)) return 'Грибы бывают летом и осенью';
  return null;
}
export function waterArea(s: GameState, x: number, y: number): [number, number][] {
  if (wlvl(s, 'irrigator') < 1) return [[x, y], ...neighbors4(x, y)];
  const out = new Map<string, [number, number]>();
  for (let k = 0; k < GRID; k++) {
    out.set(`${k},${y}`, [k, y]);
    out.set(`${x},${k}`, [x, k]);
  }
  return [...out.values()];
}
export const blockCells = (x: number, y: number): [number, number][] => [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]].filter(([a, b]) => inGrid(a, b)) as [number, number][];
export const lineCells = (dir: 'row' | 'col', i: number): [number, number][] => Array.from({ length: GRID }, (_, k) => (dir === 'row' ? [k, i] : [i, k]) as [number, number]);
export const weedsOnLine = (s: GameState, dir: 'row' | 'col', i: number) => lineCells(dir, i).filter(([x, y]) => tile(s, x, y).owned && (tile(s, x, y).weeds || treeStage(tile(s, x, y)) === 1)).length;
// manual watering by hand: one or two beds, three in a line with a hose
export const handWaterMax = (s: GameState) => (lvl(s, 'irrigation') >= 1 ? 3 : 2);

// ---------- new game ----------
function freshTile(terrain: Terrain, owned: boolean, soil: number): Tile {
  return { owned, terrain, crop: null, moisture: owned ? 2 : 0, soil, last: null, mulch: 0, shelter: 0, structure: null, drip: false, canal: false, weeds: false, idle: 0, clean: 0, snow: false, cleared: false };
}
export function newGame(o: GameOptions): GameState {
  const loc = LOCATIONS[o.loc];
  const run = o.run;
  // v3 · a run gets its own map: the river, sand, stones and taiga fall differently every time
  const map = run ? runMap(o.loc, o.seed, run.cond) : parseMap(loc.map);
  const plotSoil = run?.cond === 'floodplain' || run?.cond === 'burn' ? 3 : run?.cond === 'widow' ? 4 : loc.soil;
  const tiles: Tile[] = [];
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      const owned = x >= 1 && x <= 3 && y >= 1 && y <= 3;
      const t = map[y * GRID + x];
      // the sandy beds of the spit are part of the plot: a little better than the bank outside
      const soil = t === 'rock' ? 4 : t === 'sand' ? (owned ? 2 : 1) : owned ? plotSoil : Math.max(2, plotSoil - 1);
      tiles.push(freshTile(t, owned, soil));
    }
  const s: GameState = {
    v: 5, loc: o.loc, seed: o.seed, rng: hashSeed(o.seed), year: 1, week: 0, season: 0, weekInSeason: 0, absWeek: 0, yearStart: 1, phase: 'week',
    money: 70, earned: 0, peak: 70, tiles, bought: 0, draw: [], hand: [], discard: [], spare: [], nextUid: 1, nextPid: 1, days: 0, sowings: 0,
    storage: [], yard: [], demand: {} as GameState['demand'], noise: Object.fromEntries(CROP_IDS.map((c) => [c, 0])) as Record<CropId, number>,
    plan: [], temps: [], flags: { warm: false, rain: false, dry: false }, strikes: [], crows: null, raids: 0, thieves: null, guards: [], scarecrows: [],
    levels: { house: 1, ...(o.loc === 'kuban' ? { canal: 1 } : {}), ...(o.loc === 'altai' ? { clearing: 1 } : {}) },
    projects: [], team: [], candidates: [], freeHire: [], unlocked: [], orgs: {}, nextQuestId: 1, crops: {}, pets: [...(o.pets ?? [])], certs: [], glory: 0, harvestedKinds: [],
    loans: [], nextLoanId: 1, rating: 2, cleanSeasons: 0, carry: 0, restructured: false, incident: false, insurance: 0, dronesUsed: 0, autoShoo: false,
    effects: [], compostTick: 0, report: emptyReport(), lastReport: null, feed: [], over: null, due: null, rewardsOut: [], yearsCompleted: 0,
    stats: { sales: 0, orders: 0, seeds: 0, work: 0, land: 0, build: 0, salaries: 0, interest: 0, payments: 0, lostUnits: 0, harvested: 0 },
    mats: { logs: 0, bricks: 0, glass: 0 }, equipSeen: {},
    ...(o.loc === 'chernozem' ? { paidYears: 0 } : {}),
  };
  for (const c of o.seedBank ?? []) if (SEED_BANK_OK[c]?.includes(o.loc) && !s.unlocked.includes(c)) s.unlocked.push(c);
  s.draw = shuffle(s, loc.starter.map((def) => ({ uid: s.nextUid++, def })));
  // the first hand always holds the quickest seed
  const quick = s.draw.findIndex((c) => c.def === 'seed_radish');
  if (quick >= 0 && quick < s.draw.length - 5) s.draw.push(...s.draw.splice(quick, 1));
  for (const id of loc.orgs) s.orgs[id] = { rel: 0, step: 0, offer: null, active: null, wait: id === loc.orgs[0] ? 1 : 2 + loc.orgs.indexOf(id), idle: 0, lastMischief: -99 };
  if (run) startRun(s, run);
  s.demand = genDemand(s);
  newYearPlan(s);
  feed(s, `Новая ферма: ${loc.name}. Начинается первая весна.`);
  startWeek(s);
  return s;
}
/** v3 §3.4 · the plot's condition, the finds and the cart from home, on a fresh expedition (newGame) */
function startRun(s: GameState, o: RunOptions) {
  const carried: RunState['carried'] = { uids: [], cash: 0 };
  s.run = { cond: o.cond, relics: [...new Set(o.relics ?? [])], carried, visit: null, nextVisit: FIRST_VISIT, seen: [], used: [], autumns: 0, ...(o.home ? { home: o.home } : {}), ...(o.work ? { work: true } : {}) };
  // the cart: cards bred at home ride on top of the deck, a worker from home, and some cash
  const cards = (o.cards ?? []).slice(0, 3).map((c) => ({ ...structuredClone(c), uid: s.nextUid++ }));
  for (const c of cards) { delete c.keep; delete c.temp; carried.uids.push(c.uid); }
  s.draw.push(...cards);
  if (o.worker) { s.team.push({ id: o.worker.id, level: o.worker.level, away: 0 }); carried.worker = o.worker.id; }
  const cash = Math.max(0, Math.round(o.cash ?? 0));
  if (cash) { s.money += cash; s.peak = s.money; carried.cash = cash; }
  // the condition of the plot
  const c = o.cond;
  if (c === 'aryks') s.levels.canal = 2;
  if (c === 'banya') s.levels.house = 2;
  if (c === 'oldhives') s.levels.apiary = 1;
  if (c === 'melons') for (let i = 0; i < 2; i++) s.draw.splice(randInt(s, s.draw.length + 1), 0, { uid: s.nextUid++, def: 'seed_watermelon', traits: ['yield'] });
  if (c === 'lgota' && s.orgs.stanitsa) s.orgs.stanitsa.rel = -30;
  if (c === 'school' && s.orgs.school) s.orgs.school.rel = 30;
  if (c === 'widow') {
    const plot = shuffle(s, ownedTiles(s).filter(([, x, y]) => x !== 2 || y !== 2));
    for (const [t] of plot.slice(0, 4)) t.weeds = true;
    const [t] = plot[4];
    t.tree = 3;
  }
}
function newYearPlan(s: GameState) {
  const p = yearPlanFor(s, s.year);
  s.plan = p.episodes.map((e) => ({ ...e, start: e.start + s.yearStart - 1 }));
  s.temps = p.temps;
}
// v3 §6 · candidates no longer come three a season: the ones a reward sent (free hires) stay, the rest leave
const keepCandidates = (s: GameState): WorkerId[] => [...new Set(s.freeHire.filter((id) => !s.team.some((w) => w.id === id)))];

// ---------- the week starts ----------
function startWeek(s: GameState) {
  delete s.shortfallBorrowed;
  const N = yearLen(s);
  s.week += 1;
  s.absWeek += 1;
  if (s.week > N) {
    // a new year begins after winter
    s.week = 1;
    s.year += 1;
    s.yearStart = s.absWeek;
    s.yearsCompleted += 1;
    s.demand = genDemand(s);
    newYearPlan(s);
    addGlory(s, 10, `year-${s.year}`);
    feed(s, `Начался ${s.year}-й год. Платежи выросли.`, 'info');
    planTrial(s);
  }
  const { season, w } = seasonOf(locOf(s), s.week);
  const newSeason = season !== s.season || s.weekInSeason === 0;
  s.season = season;
  s.weekInSeason = w;
  s.phase = 'week';
  s.report = emptyReport();
  s.sowings = 0;
  s.guards = [];
  s.flags = { warm: false, rain: false, dry: false };
  for (const e of activeEpisodes(s)) {
    if (e.kind === 'warm') s.flags.warm = true;
    if (e.kind === 'rain') s.flags.rain = true;
    if (e.kind === 'dry') s.flags.dry = true;
  }
  if (droughtTrialOn(s)) { s.flags.dry = true; s.flags.rain = false; }
  if (newSeason) seasonStart(s);
  // v3 · a temporary hand leaves when the agreed weeks are over
  for (const w of s.team.filter((x) => x.leaves !== undefined && x.leaves <= s.absWeek)) feed(s, `${WORKERS[w.id].name} доработал своё и ушёл. Спасибо!`, 'info');
  s.team = s.team.filter((x) => x.leaves === undefined || x.leaves > s.absWeek);
  visitMorning(s);
  forgeWeek(s);
  s.days = weekDays(s);
  // Cards not played stay in the hand across every season and year boundary (dealWeek).
  // price noise
  const sigma = Math.min(0.12, 0.035 * (1 + 0.12 * (s.year - 1)));
  const nw = world(s, 'noise', s.absWeek);
  for (const c of CROP_IDS) s.noise[c] = sigma * gauss(nw);
  if (!newSeason) fairWeek(s);
  // threats of the week, and with a scout drone those of the next one
  morningThreats(s);
  trialMorning(s);
  crowMorning(s);
  thievesMorning(s);
  mischiefMorning(s);
  // the watchman of the third level guards two threatened beds by himself
  if (wlvl(s, 'watchman') >= 3) {
    const beds = s.strikes.filter((st) => st.week === s.absWeek && st.kind !== 'weedsurge').flatMap((st) => strikeVictims(s, st));
    for (const [x, y] of beds.slice(0, 2)) if (!isGuarded(s, x, y)) s.guards.push([x, y]);
  }
  // Every week tops the hand up from the deck.
  dealWeek(s);
}

function seasonStart(s: GameState) {
  s.dronesUsed = 0;
  s.candidates = keepCandidates(s);
  // v3 §9.1 · the festival comes before the winter fair, so a win's prize is among its lots
  if (s.season === 3) festival(s);
  openFair(s);
  yardsSeason(s);
  if (s.season === 1) {
    s.raids = (s.crowWarn ?? []).filter((w) => w >= s.absWeek).length;
    s.autoShoo = false;
  }
  if (s.season === 0) {
    // snow melts: wet ground, rows that kept snow even wetter and livelier; perennials wake
    for (const [t] of ownedTiles(s)) {
      if (t.snow) {
        t.moisture = 3;
        t.mulch = Math.max(t.mulch, 2);
        if (t.soil < 5) t.soil += 1;
      } else t.moisture = Math.max(t.moisture, 2);
      t.snow = false;
      if (t.crop?.rest) {
        t.crop.rest = false;
        t.crop.grown = 0;
        t.crop.regrowing = true;
        t.crop.fed = false;
        t.crop.mult = 1;
        t.crop.bonus = 0;
        t.crop.crowPecked = false;
        t.crop.crowDelayed = false;
      }
    }
  }
  if (s.season === 3) {
    // winter: weeds die back, the ground freezes
    for (const [t] of ownedTiles(s)) {
      t.weeds = false;
      t.idle = 0;
      t.clean = 0;
    }
    s.crows = null;
    s.thieves = null;
    s.strikes = [];
    s.crowWarn = [];
    s.kidsWarn = [];
  }
  const names = ['Весна', 'Лето', 'Осень', 'Зима'];
  feed(s, `${names[s.season]}, ${s.year}-й год.`, 'info');
}

// ---------- the ordeal of the year ----------
/** the ordeal announced for this year, while it is still to come or under way */
export const trialAhead = (s: GameState) => (s.trial && s.trial.year === s.year && !s.trial.result ? s.trial : null);
/** the last week the ordeal does damage in: a drought's last dry deaths come a week after its heat */
export const trialEnd = (t: Trial) => t.week + t.len - 1 + (t.kind === 'drought' ? 1 : 0);
/** weeks before it that the exact date of an ordeal is known */
export const trialLead = (s: GameState, t: Trial) => (t.kind === 'locust' ? raidLead(s) + 1 : Math.max(2, lookahead(s)));
export const trialKnown = (s: GameState, t: Trial) => t.week - s.absWeek <= trialLead(s, t);
export const droughtTrialOn = (s: GameState) => { const t = trialAhead(s); return !!t && t.kind === 'drought' && s.absWeek >= t.week && s.absWeek < t.week + t.len; };
export const trialWeekNow = (s: GameState) => { const t = trialAhead(s); return !!t && s.absWeek >= t.week && s.absWeek <= trialEnd(t); };

/** Called when a year begins (and by the test fixtures): picks the ordeal, its window and its week. */
export function planTrial(s: GameState, forced?: TrialKind, at?: number) {
  if (s.year < TRIAL_FIRST_YEAR && !forced) return;
  const [sp, su, au] = locOf(s).seasons;
  const w = world(s, 'trial', s.year);
  const prev = s.trial?.kind;
  const pool = TRIAL_POOL[s.loc].filter((k) => k !== prev);
  const kind = forced ?? pool[randInt(w, pool.length)];
  const power = trialPower(s.year);
  const S0 = sp + 1, S1 = sp + su, A0 = S1 + 1, A1 = S1 + au;
  let from: number, to: number, len = 1;
  if (kind === 'frost') { from = S1 - 1; to = Math.min(A1, A0 + 1); }
  else if (kind === 'locust') { len = trialWaves(power); from = S0 + 3; to = Math.max(from, S1 - 2 - len); }
  else { len = trialDroughtLen(power); from = S0 + 2; to = Math.max(from, S1 - 1 - len); }
  const wk = at !== undefined ? at - s.yearStart + 1 : from + randInt(w, to - from + 1);
  const abs = (k: number) => s.yearStart + k - 1;
  const t: Trial = { id: `${s.year}-${kind}`, kind, year: s.year, power, from: abs(Math.min(from, wk)), to: abs(Math.max(to, wk)), week: abs(wk), len };
  // the weather of those weeks is the ordeal's own; the year plan is a copy, never the cached original
  s.temps = [...s.temps];
  const span = (e: Episode, a: number, b: number) => e.start <= b && episodeEnd(e) >= a;
  if (kind === 'frost') {
    t.temp = trialFrostTemp(power);
    s.temps[wk - 1] = t.temp;
    s.plan = s.plan.filter((e) => !(EPISODES[e.kind].row === 'climate' && span(e, t.week, t.week)));
  } else if (kind === 'locust') {
    t.dir = (['w', 'e', 'n', 's'] as TrialDir[])[randInt(w, 4)];
    s.plan = s.plan.filter((e) => !(EPISODES[e.kind].row === 'threat' && span(e, t.week - 2, t.week + len)));
  } else {
    for (let k = wk; k < wk + len; k++) s.temps[k - 1] = Math.max(s.temps[k - 1] + 6, 28);
    s.plan = s.plan.filter((e) => !((e.kind === 'rain' || e.kind === 'frost') && span(e, t.week - 1, t.week + len)));
  }
  s.trial = t;
  feed(s, `Испытание года: «${TRIALS[kind].name}». Ждите его ${TRIALS[kind].window}.`, 'bad');
}

/** the beds a wave of the swarm sweeps: a band of columns or rows of the farm, from the side it comes from */
export function locustBand(s: GameState, t: Trial, wave: number): [number, number][] {
  const own = ownedTiles(s);
  if (!own.length) return [];
  const horiz = t.dir === 'w' || t.dir === 'e';
  const coord = ([, x, y]: [Tile, number, number]) => (horiz ? x : y);
  const lo = Math.min(...own.map(coord)), hi = Math.max(...own.map(coord));
  const width = hi - lo + 1;
  const a = Math.floor((wave * width) / t.len), b = Math.max(a, Math.floor(((wave + 1) * width) / t.len) - 1);
  const lines = new Set<number>();
  for (let k = a; k <= b; k++) lines.add(Math.min(hi, lo + k));
  const rev = t.dir === 'e' || t.dir === 's';
  return own.filter((o) => lines.has(rev ? hi - (coord(o) - lo) : coord(o))).map(([, x, y]) => [x, y]);
}
export function trialMorning(s: GameState) {
  const t = trialAhead(s);
  if (!t) return;
  if (s.absWeek === t.week - trialLead(s, t)) feed(s, `${TRIALS[t.kind].name}: ${t.kind === 'locust' ? 'туча уже видна на горизонте' : 'точный срок известен'} — через ${trialLead(s, t)} нед.`, 'bad');
  if (t.kind !== 'locust') return;
  for (let i = 0; i < t.len; i++) {
    const wk = t.week + i, ahead = wk - s.absWeek;
    const st = s.strikes.find((x) => x.trial && x.week === wk);
    if (st && !st.cells.length && ahead >= 0) s.strikes = s.strikes.filter((x) => x !== st);
    else if (st) continue;
    if (ahead >= 0 && ahead <= trialLead(s, t))
      s.strikes.push({ kind: 'locust', ep: -t.year, week: wk, cells: locustBand(s, t, i).map(([x, y]) => [x, y, 0]), zone: true, wave: i + 1, trial: true });
  }
}
function trialNight(s: GameState, t: Trial): TrialNight {
  if (!s.report.trial) s.report.trial = { id: t.id, kind: t.kind, fires: firePits(s).map(([x, y]) => [x, y]), lit: firesLit(s), cells: [], ...(t.temp !== undefined ? { temp: t.temp } : {}), ...(t.dir ? { dir: t.dir } : {}), waves: t.len };
  return s.report.trial;
}
/** the stake of the ordeal, taken on the morning it begins */
function beginTrial(s: GameState, t: Trial) {
  if (t.beds !== undefined) return;
  let beds = 0, risk = 0;
  for (const [tl, x, y] of ownedTiles(s)) {
    if (!tl.crop || tl.crop.rest || CROPS[tl.crop.id].product) continue;
    beds++;
    risk += expectedYield(s, x, y) * priceOf(s, tl.crop.id);
  }
  t.beds = beds; t.risk = round2(risk); t.lostValue = 0; t.lostUnits = 0;
}
function trialLoss(t: Trial, units: number, value: number) {
  t.lostUnits = (t.lostUnits ?? 0) + units;
  t.lostValue = round2((t.lostValue ?? 0) + value);
}
function settleTrial(s: GameState, t: Trial) {
  const risk = t.risk ?? 0;
  const saved = risk > 0 ? Math.max(0, Math.min(1, 1 - (t.lostValue ?? 0) / risk)) : 1;
  const grade = trialGrade(t.beds ?? 0, saved);
  const glory = TRIAL_GLORY[grade];
  const def = TRIALS[t.kind];
  const result: TrialResult = { grade, saved: Math.round(saved * 1000) / 1000, beds: t.beds ?? 0, risk, lostValue: t.lostValue ?? 0, lostUnits: t.lostUnits ?? 0, glory };
  if (glory) addGlory(s, glory, `trial-${t.id}`);
  if (grade === 3 && !s.certs.includes(def.cert)) { grant(s, { cert: def.cert }, `trial-${t.id}`); result.cert = def.cert; }
  t.result = result;
  trialNight(s, t).result = result;
  const pct = Math.round(saved * 100);
  feed(s, grade === 0 ? `${def.name}: поле почти пустое — испытание переждали. Слава +${glory}.`
    : `${def.name}: ${grade === 3 ? 'выстояли' : grade === 2 ? 'устояли' : 'хозяйство потрепало'} — спасено ${pct}% урожая${glory ? `, слава +${glory}` : ''}.`, grade >= 2 ? 'good' : 'bad');
}

// ---------- declared threats ----------
const PESTS: StrikeKind[] = ['beetle', 'locust'];
export const STRIKE_NAME: Record<StrikeKind, string> = { hail: 'Град', flood: 'Паводок', beetle: 'Колорадский жук', locust: 'Саранча', weedsurge: 'Сорняки', bear: 'Медведь', boars: 'Кабаны', fire: 'Пожар' };
/** v3 · the raiders of the expeditions: a bear and boars walk, fire spreads from the taiga */
export const BEASTS: StrikeKind[] = ['bear', 'boars'];
export const BERRIES: CropId[] = ['strawberry', 'seabuckthorn', 'cranberry'];
export const BOAR_FOOD: CropId[] = ['potato', 'carrot', 'watermelon', 'pumpkin', 'corn', 'onion', 'garlic', 'cabbage', 'radish'];
export function cropCluster(s: GameState, x: number, y: number): [number, number][] {
  const c = tile(s, x, y).crop?.id;
  if (!c) return [];
  const seen = new Set<string>([`${x},${y}`]);
  const out: [number, number][] = [[x, y]];
  for (let i = 0; i < out.length; i++)
    for (const [a, b] of neighbors4(out[i][0], out[i][1])) {
      const k = `${a},${b}`;
      const t = tile(s, a, b);
      if (seen.has(k) || !t.owned || t.crop?.id !== c || t.structure === 'greenhouse') continue;
      seen.add(k);
      out.push([a, b]);
    }
  return out;
}
export const locustLimit = (s: GameState) => (s.year <= 3 ? 2 : 4);
function locustTargets(s: GameState, w: { rng: number }, limit: number): [number, number, number][] {
  const open = ownedTiles(s).filter(([t]) => t.crop && t.structure !== 'greenhouse');
  const seen = new Set<string>();
  const list: [number, number][][] = [];
  for (const [, x, y] of open) {
    if (seen.has(`${x},${y}`)) continue;
    const cl = cropCluster(s, x, y);
    for (const [a, b] of cl) seen.add(`${a},${b}`);
    list.push(cl);
  }
  if (!list.length) return [];
  const top = Math.max(...list.map((p) => p.length));
  const best = list.filter((p) => p.length === top);
  const patch = best[randInt(w, best.length)];
  const core = patch[randInt(w, patch.length)];
  const inPatch = new Set(patch.map(([x, y]) => `${x},${y}`));
  const out: [number, number][] = [core];
  const got = new Set([`${core[0]},${core[1]}`]);
  for (let i = 0; i < out.length && out.length < limit; i++)
    for (const [a, b] of neighbors4(out[i][0], out[i][1])) {
      const k = `${a},${b}`;
      if (out.length >= limit) break;
      if (!inPatch.has(k) || got.has(k)) continue;
      got.add(k);
      out.push([a, b]);
    }
  return out.map(([x, y]) => [x, y, tile(s, x, y).crop!.pid]);
}
function declareStrike(s: GameState, kind: StrikeKind, ep: number, week: number, wave?: number) {
  const w = world(s, `strike|${kind}`, week * 10 + (wave ?? 0));
  const owned = ownedTiles(s);
  let cells: [number, number, number][] = [];
  let zone = true;
  if (kind === 'hail') {
    const growing = owned.filter(([t]) => t.crop && t.structure !== 'greenhouse');
    const pool = growing.length ? growing : owned;
    if (pool.length) {
      const [, cx, cy] = pool[randInt(w, pool.length)];
      cells = owned.filter(([, x, y]) => Math.abs(x - cx) <= 1 && Math.abs(y - cy) <= 1).map(([, x, y]) => [x, y, 0]);
    }
  } else if (kind === 'flood') {
    if (lvl(s, 'canal') >= 3) return;
    cells = owned.filter(([, x, y]) => nearTerrain(s, x, y, 'river')).map(([, x, y]) => [x, y, 0]);
  } else if (kind === 'beetle') {
    zone = false;
    const pot = owned.filter(([t]) => t.crop?.id === 'potato' && t.structure !== 'greenhouse');
    if (pot.length) {
      const [, x, y] = pot[randInt(w, pot.length)];
      cells = cropCluster(s, x, y).map(([a, b]) => [a, b, tile(s, a, b).crop!.pid]);
    }
  } else if (kind === 'locust') {
    zone = false;
    cells = locustTargets(s, w, locustLimit(s));
  } else if (kind === 'weedsurge') {
    const free = owned.filter(([t]) => !t.crop && !t.structure && !t.canal && t.tree === undefined && !t.weeds && t.clean <= 0 && TERRAIN[t.terrain].plantable);
    shuffle(w, free);
    cells = free.slice(0, 2).map(([, x, y]) => [x, y, 0]);
  } else if (kind === 'bear') {
    // hives and berries first, then beds by the taiga: three at most
    zone = false;
    const open = owned.filter(([t]) => t.structure !== 'greenhouse' && !t.crop?.rest);
    const bait = shuffle(w, open.filter(([t]) => t.structure === 'hive' || (t.crop && BERRIES.includes(t.crop.id))));
    const edge = shuffle(w, open.filter(([t, x, y]) => t.crop && !bait.some(([b]) => b === t) && (nearTerrain(s, x, y, 'forest') || nearTerrain(s, x, y, 'river'))));
    cells = [...bait, ...edge].slice(0, 3).map(([t, x, y]) => [x, y, t.crop?.pid ?? 0]);
  } else if (kind === 'boars') {
    // a herd out of the gully: roots and melons on the edge of the field, a patch of three
    zone = false;
    const food = owned.filter(([t]) => t.crop && !t.crop.rest && t.structure !== 'greenhouse' && BOAR_FOOD.includes(t.crop.id));
    if (food.length) {
      const edge = (x: number, y: number) => 4 - neighbors4(x, y).filter(([a, b]) => tile(s, a, b).owned).length;
      const top = Math.max(...food.map(([, x, y]) => edge(x, y)));
      const best = food.filter(([, x, y]) => edge(x, y) === top);
      const [, cx, cy] = best[randInt(w, best.length)];
      const got: [number, number][] = [[cx, cy]], herd = s.year === 1 ? 2 : 3;
      for (let i = 0; i < got.length && got.length < herd; i++)
        for (const [a, b] of neighbors4(got[i][0], got[i][1])) {
          if (got.length >= herd) break;
          if (got.some(([p, q]) => p === a && q === b) || !food.some(([, x, y]) => x === a && y === b)) continue;
          got.push([a, b]);
        }
      cells = got.map(([x, y]) => [x, y, tile(s, x, y).crop!.pid]);
    }
  } else if (kind === 'fire') {
    // the edge of the field by the taiga (or by a grown tree) catches: beds with something to burn first, four at most
    const near = owned.filter(([t, x, y]) => t.structure !== 'greenhouse' && (nearTerrain(s, x, y, 'forest') || nearTree(s, x, y)));
    const fuel = shuffle(w, near.filter(([t]) => t.crop || t.mulch > 0 || t.tree !== undefined || t.structure === 'hive'));
    const rest = shuffle(w, near.filter(([t]) => !fuel.some(([f]) => f === t)));
    cells = [...fuel, ...rest].slice(0, 4).map(([, x, y]) => [x, y, 0]);
  }
  s.strikes.push({ kind, ep, week, cells, zone, ...(wave ? { wave } : {}) });
}
// Raids give warning: beetles, locusts, weeds, a flock and the orphanage children show up a week before they
// strike, two weeks with the scout drone. They are not in the weather forecast.
export const raidLead = (s: GameState) => (lvl(s, 'drone') >= 1 ? 2 : 1) + (hasRelic(s, 'vane') ? 1 : 0);
function morningThreats(s: GameState) {
  s.strikes = s.strikes.filter((x) => x.week >= s.absWeek);
  if (s.crows && s.crows.week < s.absWeek) s.crows = null;
  const scout = lvl(s, 'drone') >= 1;
  const lead = raidLead(s);
  const has = (ep: number, week: number) => s.strikes.some((x) => x.ep === ep && x.week === week);
  for (const e of s.plan) {
    const k = e.kind;
    // weather: seen in the sky; the struck beds are known on the morning, with the scout a week early
    if (k === 'hail' || k === 'flood') {
      if (e.start === s.absWeek && !has(e.id, e.start)) declareStrike(s, k, e.id, s.absWeek);
      if (scout && e.start === s.absWeek + 1 && !has(e.id, e.start)) declareStrike(s, k, e.id, e.start);
    }
    const raid = (kind: StrikeKind, week: number, wave?: number) => {
      const ahead = week - s.absWeek;
      const st = s.strikes.find((x) => x.ep === e.id && x.week === week);
      // a raid that found nothing to go for looks again every morning until its week
      if (st && !st.cells.length && ahead >= 0) { s.strikes = s.strikes.filter((x) => x !== st); declareStrike(s, kind, e.id, week, wave); return; }
      if (!st && ahead >= 1 && ahead <= lead) declareStrike(s, kind, e.id, week, wave);
    };
    if (k === 'weedsurge') raid('weedsurge', e.start);
    if (k === 'beetle') raid('beetle', e.start + 1);
    if (k === 'locust') for (const wave of [1, 2]) raid('locust', e.start + wave, wave);
    if (k === 'bear' || k === 'boars' || k === 'fire') {
      const had = s.strikes.some((x) => x.ep === e.id && x.week === e.start && x.cells.length);
      raid(k, e.start);
      const st = s.strikes.find((x) => x.ep === e.id && x.week === e.start);
      if (!had && st && st.cells.length && e.start > s.absWeek) feed(s, RAID_WARN[k](e.start - s.absWeek), 'bad');
    }
  }
}
const when = (n: number) => (n <= 1 ? 'на следующей неделе' : `через ${n} нед.`);
const RAID_WARN: Record<'bear' | 'boars' | 'fire', (n: number) => string> = {
  bear: (n) => `Медвежьи следы у ручья: медведь придёт ${when(n)}. Покараульте грядки или позовите сторожа.`,
  boars: (n) => `Кабаны перерыли балку: ${when(n)} выйдут на край поля. Покараульте грядки.`,
  fire: (n) => `Дым над тайгой: огонь подойдёт ${when(n)}. Полейте грядки у леса до краёв или окопайте их.`,
};
/** v3 · who keeps a bear or boars away this week (nobody: null). Пурга works once a season; a dog half the time. */
export function beastGuard(s: GameState, st: Strike): string | null {
  if (!BEASTS.includes(st.kind)) return null;
  const calm = st.kind === 'bear' ? s.run?.calm?.bear : s.run?.calm?.boars;
  if (calm !== undefined && calm >= st.week) return st.kind === 'bear' ? 'Охотник Афанасьич' : 'Казачий разъезд';
  if (wlvl(s, 'watchman') >= 1 || lvl(s, 'guard') >= 3) return 'Сторож';
  if (hasRelic(s, 'laika') && !s.run!.used.includes(`laika-${s.year}-${s.season}`)) return 'Лайка Пурга';
  if (hasPet(s, 'dog') && rand(world(s, `deter|${st.kind}`, st.week)) < 0.5) return 'Пёс';
  return null;
}
export const isGuarded = (s: GameState, x: number, y: number) => s.guards.some(([a, b]) => a === x && b === y);
/** v3 · a dry wind (суховей) is blowing this week */
export const sukhovey = (s: GameState) => activeEpisodes(s).some((e) => e.kind === 'sukhovey');
/** shelter from the dry wind: taiga or a grown tree next to the bed, a greenhouse, a cover */
export function windbreak(s: GameState, x: number, y: number): boolean {
  const t = tile(s, x, y);
  if (t.structure === 'greenhouse' || t.shelter > 0) return true;
  return neighbors8(x, y).some(([a, b]) => tile(s, a, b).terrain === 'forest' || treeStage(tile(s, a, b)) >= 2);
}
const garlicNear = (s: GameState, x: number, y: number) => neighbors8(x, y).some(([a, b]) => tile(s, a, b).crop?.id === 'garlic');
export function strikeVictims(s: GameState, st: Strike): [number, number][] {
  if (st.kind === 'bear')
    return st.cells.filter(([x, y, pid]) => {
      const t = tile(s, x, y);
      if (!t.owned || t.structure === 'greenhouse') return false;
      return t.structure === 'hive' || (!!t.crop && !t.crop.rest && t.crop.pid === pid);
    }).map(([x, y]) => [x, y]);
  if (st.kind === 'fire')
    // a bed watered to the brim does not catch
    return st.cells.filter(([x, y]) => {
      const t = tile(s, x, y);
      return t.owned && t.structure !== 'greenhouse' && t.moisture < 3 && (!!t.crop || t.mulch > 0 || t.tree !== undefined || t.structure === 'hive');
    }).map(([x, y]) => [x, y]);
  if (st.kind === 'weedsurge')
    return st.cells.filter(([x, y]) => {
      const t = tile(s, x, y);
      return t.owned && !t.crop && !t.structure && !t.canal && t.tree === undefined && !t.weeds && t.clean <= 0 && TERRAIN[t.terrain].plantable;
    }).map(([x, y]) => [x, y]);
  const out: [number, number][] = [];
  for (const [x, y, pid] of st.cells) {
    const t = tile(s, x, y);
    if (!t.owned || !t.crop || t.structure === 'greenhouse') continue;
    if (st.kind === 'hail' && t.shelter > 0) continue;
    if (!st.zone && t.crop.pid !== pid) continue;
    if (PESTS.includes(st.kind) && (t.crop.traits?.includes('tough') || garlicNear(s, x, y))) continue;
    if (st.trial && inSmoke(s, x, y)) continue;
    out.push([x, y]);
  }
  return out;
}
export function guardable(s: GameState, x: number, y: number): boolean {
  if (s.phase !== 'week' || isGuarded(s, x, y)) return false;
  return s.strikes.some((st) => st.week === s.absWeek && st.kind !== 'weedsurge' && strikeVictims(s, st).some(([a, b]) => a === x && b === y));
}
function strikeOutcome(s: GameState, st: Strike, sorties: number, insurance: number) {
  const all = strikeVictims(s, st);
  const hit = st.kind === 'weedsurge' ? all : all.filter(([x, y]) => !isGuarded(s, x, y));
  let guard: 'drone' | 'insurance' | null = null;
  if (hit.length && st.kind !== 'weedsurge') {
    if (PESTS.includes(st.kind) && sorties > 0 && !st.trial) guard = 'drone';
    else if (insurance > 0) guard = 'insurance';
  }
  return { all, hit, guard, guarded: all.length - hit.length };
}
function noteLoss(s: GameState, x: number, y: number, change?: () => void, kind?: FieldDamageKind): number {
  const t = tile(s, x, y);
  if (!t.crop) return 0;
  const plantBefore = clone(t.crop);
  const before = expectedYield(s, x, y);
  if (change) change();
  else t.crop = null;
  const lost = Math.max(0, before - (t.crop ? expectedYield(s, x, y) : 0));
  s.stats.lostUnits += lost;
  if (kind) (s.report.fieldDamage ??= []).push({kind,x,y,before:plantBefore,after:t.crop ? clone(t.crop) : null,lost});
  return lost;
}
const bedsWord = (n: number) => `${n} ${plural(n, 'грядка', 'грядки', 'грядок')}`;
function resolveStrikes(s: GameState, diagnostic?: Pick<WeekOutlook, 'threats'>) {
  const r = s.report;
  // Resolution and presentation use the same priority, independent of warning order.
  const priority: Record<StrikeKind, number> = { hail: 0, flood: 0, fire: 0, bear: 1, boars: 1, beetle: 1, locust: 2, weedsurge: 3 };
  for (const st of s.strikes.filter((x) => x.week === s.absWeek).sort((a,b)=>priority[a.kind]-priority[b.kind])) {
    const name = STRIKE_NAME[st.kind];
    if (st.kind === 'flood') floodStones(s);
    if (BEASTS.includes(st.kind) && strikeVictims(s, st).length) {
      const by = beastGuard(s, st);
      if (by) {
        if (by === 'Лайка Пурга') s.run!.used.push(`laika-${s.year}-${s.season}`);
        feed(s, `${by} ${st.kind === 'bear' ? 'отогнал медведя' : 'отогнал кабанов'} от поля.`.replace('Лайка Пурга отогнал', 'Лайка Пурга отогнала'), 'good');
        scene(s, st.kind as SceneKind);
        continue;
      }
    }
    if (st.kind === 'bear' || st.kind === 'boars' || st.kind === 'fire') { beastStrike(s, st, diagnostic); continue; }
    const o = strikeOutcome(s, st, sortiesPerSeason(s) - s.dronesUsed, s.insurance);
    if (o.guarded) feed(s, `${name}: ${o.guarded} ${plural(o.guarded, 'защищённая грядка уцелела', 'защищённые грядки уцелели', 'защищённых грядок уцелело')}.`, 'good');
    const ord = st.trial ? trialAhead(s) : null;
    if (ord) {
      const n = trialNight(s, ord);
      n.wave = st.wave; n.band = st.cells.map(([x, y]) => [x, y]);
      for (const [x, y] of n.band) {
        const t = tile(s, x, y);
        if (!t.crop || o.hit.some(([a, b]) => a === x && b === y)) continue;
        n.cells.push({ x, y, out: inSmoke(s, x, y) ? 'smoke' : isGuarded(s, x, y) ? 'guarded' : 'held' });
      }
    }
    if (!o.hit.length) continue;
    diagnostic?.threats.push({ name, beds: o.hit.length, guard: o.guard === 'drone' ? 'дрон' : o.guard === 'insurance' ? 'денежная компенсация'  : null });
    if (o.guard === 'drone') {
      s.dronesUsed += 1;
      feed(s, `Дрон отогнал вредителей (${name.toLowerCase()}).`, 'good');
      scene(s,'drone');
      continue;
    }
    if (o.guard === 'insurance') {
      // Compensation is calculated below, after real physical damage.
    }
    if (st.kind === 'weedsurge') {
      for (const [x, y] of o.hit) {
        tile(s, x, y).weeds = true;
        tile(s, x, y).idle = 0;
      }
      r.lost.push(`Сорняки заняли ${bedsWord(o.hit.length)}`);
      continue;
    }
    let lost = 0, lossValue = 0;
    const destroy = st.kind === 'locust';
    const ordeal = st.trial ? trialAhead(s) : null;
    const factor = st.kind === 'beetle' && hasPet(s, 'hedgehog') ? 0.75 : 0.5;
    for (const [x,y] of o.hit) {
      const beforePlant={...tile(s,x,y).crop!};
      const crop=beforePlant.id;
      const units=destroy ? noteLoss(s,x,y) : noteLoss(s,x,y,()=>tile(s,x,y).crop!.mult*=factor, st.kind === 'hail' || st.kind === 'flood' ? st.kind : undefined);
      lost+=units; lossValue+=units*priceOf(s,crop);
      if(ordeal){trialLoss(ordeal,units,units*priceOf(s,crop));trialNight(s,ordeal).cells.push({x,y,out:'eaten',before:beforePlant,after:null,lost:units});}
      if(st.kind==='locust'||st.kind==='beetle'){
        if(st.kind==='beetle'&&tile(s,x,y).crop)tile(s,x,y).crop!.chewed=true;
        (r.pestHits??=[]).push({kind:st.kind,x,y,plant:beforePlant,lost:units,after:tile(s,x,y).crop?{...tile(s,x,y).crop!}:null,...(st.trial?{trial:true}:{})});
      }
    }
    if(o.guard==='insurance' && lossValue>0) {
      s.insurance--;
      const paid=round2(Math.min(lossValue*0.6, nextPayment(s).amount));
      s.money=round2(s.money+paid);
      r.insurancePaid=round2((r.insurancePaid??0)+paid);
      feed(s,`Страховка: +${money(paid)} за ${name.toLowerCase()}. Посевы не восстановлены.`,'info');
    }
    const what = destroy ? `погибло ${o.hit.length} ${plural(o.hit.length, 'растение', 'растения', 'растений')}` : `урожай на ${o.hit.length} грядках уменьшился ${factor === 0.5 ? 'вдвое' : 'на четверть'}`;
    r.lost.push(`${name}: ${what} (−${lost} ед.)`);
    feed(s, `${name}: ${what}.`, 'bad');
  }
}

/** v3 · a bear, boars or a fire: what they reach is gone (a hive is wrecked, a burnt bed loses its mulch and its
 *  tree), the insurance pays as for any blow. Fire also burns the taiga next to it into open land. */
function beastStrike(s: GameState, st: Strike, diagnostic?: Pick<WeekOutlook, 'threats'>) {
  const r = s.report, name = STRIKE_NAME[st.kind];
  const o = strikeOutcome(s, st, 0, s.insurance);
  if (o.guarded) feed(s, `${name}: ${o.guarded} ${plural(o.guarded, 'грядка под караулом уцелела', 'грядки под караулом уцелели', 'грядок под караулом уцелело')}.`, 'good');
  if (!o.hit.length) return;
  diagnostic?.threats.push({ name, beds: o.hit.length, guard: o.guard === 'insurance' ? 'денежная компенсация' : null });
  let lost = 0, value = 0, hives = 0;
  const kind = st.kind as FieldDamageKind;
  for (const [x, y] of o.hit) {
    const t = tile(s, x, y);
    if (t.crop) { const c = t.crop.id; const u = noteLoss(s, x, y, undefined, kind); lost += u; value += u * priceOf(s, c); }
    if (t.structure === 'hive') { t.structure = null; delete t.hivePlacedWeek; hives += 1; }
    if (st.kind === 'fire') { t.mulch = 0; delete t.tree; delete t.chop; t.weeds = false; }
  }
  if (st.kind === 'bear' && hives) {
    const honey = Math.min(6, stockOf(s, 'honey'));
    if (honey) { takeStock(s, 'honey', honey); lost += honey; value += honey * priceOf(s, 'honey'); }
  }
  let burnt = 0;
  if (st.kind === 'fire') {
    const near = new Set<number>();
    for (const [x, y] of o.hit) for (const [a, b] of neighbors4(x, y)) if (tile(s, a, b).terrain === 'forest' && !tile(s, a, b).owned) near.add(idx(a, b));
    for (const i of [...near].slice(0, 2)) { const t = s.tiles[i]; t.terrain = 'plain'; t.soil = 4; t.weeds = false; burnt += 1; }
  }
  if (o.guard === 'insurance' && value > 0) {
    s.insurance--;
    const paid = round2(Math.min(value * 0.6, nextPayment(s).amount));
    s.money = round2(s.money + paid);
    r.insurancePaid = round2((r.insurancePaid ?? 0) + paid);
    feed(s, `Страховка: +${money(paid)} за ${name.toLowerCase()}.`, 'info');
  }
  const what = st.kind === 'bear'
    ? `${hives ? `разорил ${hives} ${plural(hives, 'улей', 'улья', 'ульев')}${o.hit.length > hives ? ' и ' : ''}` : ''}${o.hit.length > hives ? `помял ${o.hit.length - hives} ${plural(o.hit.length - hives, 'грядку', 'грядки', 'грядок')}` : ''}`
    : st.kind === 'boars' ? `перерыли ${bedsWord(o.hit.length)}` : `сгорело ${bedsWord(o.hit.length)}${burnt ? `, ${burnt} ${plural(burnt, 'клетка', 'клетки', 'клеток')} тайги стали гарью` : ''}`;
  r.lost.push(`${name}: ${what}${lost ? ` (−${lost} ед.)` : ''}`);
  feed(s, `${name}: ${what}.`, 'bad');
  scene(s, st.kind as SceneKind);
}

// ---------- crows ----------
const ABOVE: CropId[] = ['bean', 'buckwheat', 'pumpkin', 'wheat', 'sunflower', 'corn', 'strawberry', 'rye', 'rice', 'watermelon', 'seabuckthorn'];
export function crowFood(s: GameState) {
  const young: [number, number][] = [];
  const ripe: [number, number][] = [];
  const step = 1 + (s.flags.warm ? 1 : 0);
  for (const [t, x, y] of ownedTiles(s)) {
    if (!t.crop || t.structure === 'greenhouse' || t.crop.rest) continue;
    if (ABOVE.includes(t.crop.id) && targetGrow(s, t.crop) - t.crop.grown <= step) ripe.push([x, y]);
    else if (t.crop.grown < 2) young.push([x, y]);
  }
  return { young, ripe };
}
export function crowChance(Y: number, R: number): number {
  if (Y < 4 && R < 3) return 0;
  const q = Math.max(Y / 4, R / 3);
  return Math.round(Math.min(0.5, 0.2 + 0.1 * (q - 1)) * 1000) / 1000;
}
export const scarecrowCells = (x: number, y: number): [number, number][] => [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]];
export const underScarecrow = (s: GameState, x: number, y: number) => s.scarecrows.some(([a, b]) => x >= a && x <= a + 1 && y >= b && y <= b + 1);
export const crowsOpen = (s: GameState) => !!s.crows && s.crows.week === s.absWeek && !s.crows.shoo && !s.crows.drone;
function crowMorning(s: GameState) {
  s.crowWarn = (s.crowWarn ?? []).filter((w) => w >= s.absWeek);
  s.crowRolled = (s.crowRolled ?? []).filter((w) => w >= s.absWeek);
  if (s.season === 1 && s.crowWarn.includes(s.absWeek)) landFlock(s);
  // the next flock is decided once, when it can first be seen: it circles over the farm until its week
  const lead = raidLead(s);
  for (const e of s.plan) {
    if (e.kind !== 'crows' || e.start <= s.absWeek || e.start - s.absWeek > lead || s.crowRolled.includes(e.start)) continue;
    s.crowRolled.push(e.start);
    if (s.raids >= (s.year === 1 ? 1 : 2)) continue;
    const food = crowFood(s);
    const p = crowChance(food.young.length, food.ripe.length);
    if (!p || rand(world(s, 'crows', e.start)) >= p) continue;
    s.crowWarn.push(e.start);
    s.raids += 1;
    feed(s, `Над лесом кружит стая ворон. ${e.start - s.absWeek === 1 ? 'На следующей неделе' : `Через ${e.start - s.absWeek} нед.`} сядет на поле.`, 'bad');
  }
}
function landFlock(s: GameState) {
  const food = crowFood(s);
  const w = world(s, 'crowtargets', s.absWeek);
  const pool = [...food.ripe.map((c) => [c, 'ripe'] as const), ...food.young.map((c) => [c, 'young'] as const)];
  shuffle(w, pool);
  const n = Math.max(1, (s.year === 1 ? 2 : 3) - (hasPet(s, 'dog') ? 1 : 0));
  if (!pool.length) { feed(s, 'Стая покружила над полем и улетела: клевать нечего.', 'info'); return; }
  s.crows = { week: s.absWeek, targets: pool.slice(0, n).map(([[x, y], type]) => ({ x, y, pid: tile(s, x, y).crop!.pid, type })), shoo: false, drone: false };
  // the watchman or the lodge scare one flock a summer by themselves
  if (!s.autoShoo && (wlvl(s, 'watchman') >= 2 || lvl(s, 'guard') >= 3)) {
    s.autoShoo = true;
    s.crows.shoo = true;
    feed(s, 'Прилетели вороны, но сторож их отогнал.', 'good');
    return;
  }
  feed(s, 'Вороны сели на поле: можно отогнать за рабочий день.', 'bad');
}
function resolveCrows(s: GameState): Set<string> {
  const blocked = new Set<string>();
  const r = s.crows;
  if (!r || r.week !== s.absWeek) return blocked;
  if (r.shoo || r.drone) return blocked;
  let delayed = 0, pecked = 0, lost = 0;
  for (const g of r.targets) {
    const t = tile(s, g.x, g.y);
    if (!t.crop || t.crop.pid !== g.pid || t.structure === 'greenhouse' || underScarecrow(s, g.x, g.y)) continue;
    if (g.type === 'young') {
      if (!t.crop.crowDelayed) {
        blocked.add(`${g.x},${g.y}`);
        const before = clone(t.crop);
        t.crop.crowDelayed = true;
        (s.report.fieldDamage ??= []).push({kind:'crows',x:g.x,y:g.y,before,after:clone(t.crop),lost:0,note:'+1 нед.'});
        delayed++;
      }
    } else if (!t.crop.crowPecked) {
      const c = t.crop;
      lost += noteLoss(s, g.x, g.y, () => {
        c.mult *= 0.8;
        c.crowPecked = true;
      }, 'crows');
      s.report.fieldDamage!.at(-1)!.note = '−20%';
      pecked++;
    }
  }
  const parts = [delayed ? `${delayed} ${plural(delayed, 'росток не вырос', 'ростка не выросли', 'ростков не выросли')}` : '', pecked ? `поклевали ${pecked} ${plural(pecked, 'грядку', 'грядки', 'грядок')} (−${lost} ед.)` : ''].filter(Boolean);
  if (parts.length) {
    s.report.lost.push(`Вороны: ${parts.join(', ')}`);
    feed(s, `Вороны: ${parts.join(', ')}.`, 'bad');
  }
  return blocked;
}

// ---------- thieves and other mischief ----------
export const mischiefOn = (s: GameState, o: OrgId) => (s.orgs[o]?.rel ?? 0) <= -40;
export function thievesBlocked(s: GameState): boolean {
  return hasPet(s, 'dog') || wlvl(s, 'watchman') >= 1 || lvl(s, 'guard') >= 3;
}
function scene(s: GameState, kind: NonNullable<GameState['scenes']>[number]['kind'], at?:[number,number]) {
  const id=`${s.absWeek}:${kind}`;
  if(s.scenes?.some(e=>e.id===id)) return;
  s.scenes=[...(s.scenes??[]),{id,kind,week:s.absWeek,...(at?{at}:{})}].slice(-12);
}
function thievesMorning(s: GameState) {
  s.thieves = null;
  s.kidsWarn = (s.kidsWarn ?? []).filter((w) => w >= s.absWeek);
  s.kidsRolled = (s.kidsRolled ?? []).filter((w) => w >= s.absWeek);
  const angry = () => locOf(s).orgs.some((o) => ORGS[o].mischief === 'thieves' && mischiefOn(s, o));
  // the coming weeks: the children decide early and are seen hiding by the field until they come
  const lead = raidLead(s);
  for (let d = 1; d <= lead; d++) {
    const wk = s.absWeek + d, season = weekInfo(s, d).season;
    if (s.kidsRolled.includes(wk)) continue;
    s.kidsRolled.push(wk);
    if ((season === 1 || season === 2) && angry() && rand(world(s, 'thieves', wk)) <= 0.6) s.kidsWarn.push(wk);
  }
  if (!s.kidsWarn.includes(s.absWeek) || (s.season !== 1 && s.season !== 2)) return;
  // relations mended in the meantime: they do not come
  if (!angry()) return;
  const ripe = ownedTiles(s).filter(([t]) => t.crop && !t.crop.rest && t.structure !== 'greenhouse' && targetGrow(s, t.crop) - t.crop.grown <= 2);
  if (!ripe.length) return;
  shuffle(world(s, 'thieftargets', s.absWeek), ripe);
  s.thieves = { week: s.absWeek, targets: ripe.slice(0, 2).map(([t, x, y]) => ({ x, y, pid: t.crop!.pid })), talked: false };
  if(thievesBlocked(s)) {
    scene(s,hasPet(s,'dog')?'dogThieves':'watchman');
    feed(s,hasPet(s,'dog')?'Пёс заметил воров и прогнал их от грядок. Урожай цел.':'Сторож прогнал воров от грядок. Урожай цел.','good');
  } else feed(s, 'У забора чужие следы. Урожай нужно защитить.', 'bad');
}
function resolveThieves(s: GameState) {
  const th = s.thieves;
  if (!th || th.week !== s.absWeek || th.talked) return;
  if(thievesBlocked(s)) { scene(s,hasPet(s,'dog')?'dogThieves':'watchman'); return; }
  const victims = th.targets.filter(g => {
    const t = tile(s,g.x,g.y);
    return t.crop?.pid===g.pid && t.structure!=='greenhouse' && !isGuarded(s,g.x,g.y);
  });
  const chased = crowsOpen(s) ? s.crows!.targets.filter(g => victims.some(v=>v.x===g.x&&v.y===g.y&&v.pid===g.pid) && !underScarecrow(s,g.x,g.y)) : [];
  // The children chase birds from the beds they approach. Other birds act later.
  if(chased.length) s.crows!.targets=s.crows!.targets.filter(g=>!chased.includes(g));
  scene(s,'thieves');
  const visit=s.scenes!.find(e=>e.id===`${s.absWeek}:thieves`)!;
  visit.visit={outcome:victims.length?'stolen':'empty',targets:(victims.length?victims:th.targets).map(g=>[g.x,g.y]),crows:chased.map(g=>[g.x,g.y])};
  let n = 0, lost = 0;
  for (const g of victims) {
    const t = tile(s, g.x, g.y);
    if (!t.crop || t.crop.pid !== g.pid || t.structure === 'greenhouse' || isGuarded(s, g.x, g.y)) continue;
    lost += noteLoss(s, g.x, g.y, undefined, 'thieves');
    n++;
  }
  if (n) {
    s.report.stolen += n;
    s.report.lost.push(`Утащили урожай с ${n} ${plural(n, 'грядки', 'грядок', 'грядок')} (−${lost} ед.)`);
    feed(s, `Ночью с ${n} ${plural(n, 'грядки', 'грядок', 'грядок')} утащили урожай.`, 'bad');
  } else feed(s,'Дети ушли с пустыми руками.','info');
}
function mischiefMorning(s: GameState) {
  for (const o of locOf(s).orgs) {
    const st = s.orgs[o];
    if (!st || !mischiefOn(s, o)) continue;
    const m = ORGS[o].mischief;
    if (m === 'fine' && s.weekInSeason === 1 && s.absWeek - st.lastMischief >= 6) {
      const f = Math.max(5, round2(s.money * 0.08));
      // ORG-03 · the journal names what was actually taken: an empty till pays less than the fine
      const taken = round2(Math.min(f, s.money));
      s.money = round2(s.money - taken);
      st.lastMischief = s.absWeek;
      feed(s, `${ORGS[o].short}: ${ORGS[o].mischiefText.toLowerCase()} — ${money(taken)}${taken < f ? ` (штраф ${money(f)}, больше в кассе не было)` : ''}.`, 'bad');
    }
    if (m === 'review' && s.absWeek - st.lastMischief >= 8 && !s.effects.some((e) => e.kind === 'review')) {
      s.effects.push({ kind: 'review', mult: 0.9, weeks: 3 });
      st.lastMischief = s.absWeek;
      feed(s, `${ORGS[o].short}: ${ORGS[o].mischiefText.toLowerCase()}.`, 'bad');
    }
  }
}

// ---------- the end of the week ----------
// CAL-01 · the one order of a week's end (resolveWeek, then the payment):
// rain and irrigation → frost → dry check → declared blows (hail/flood, beetles, locusts, weeds) → thieves → crows →
// growth → yard crates to the barn or the reseller → harvest → water loss → weeds → farm work (honey, compost, geese) →
// spoilage and mice → projects and training → organisations → money (milk, interest, salaries, heating) → payment
// → the next week starts (season and year change, threats announced, a fresh hand)
export function endWeek(state: GameState): GameState {
  if (state.phase !== 'week') return state;
  const s = clone(state);
  fillV3(s);
  resolveWeek(s);
  const p = paymentNow(s);
  if (p) resolvePayment(s, paymentDue(s, p.season) + s.carry, paymentName(s, p.season), p.part === p.parts);
  else startWeek(s);
  return s;
}

// Both previews and committed turns execute this transition on their own state copy.
function resolveWeek(s: GameState, diagnostic?: Pick<WeekOutlook, 'threats'>) {
  const r = s.report;
  const costs = weeklyCosts(s);
  const air = airTemp(s);
  const winter = s.season === 3;
  // ECO-08 · mice go for the lots the barn warned about this week (miceTargets), not for crates that only
  // arrive at the week's end from the yard or the harvest
  const miceList = miceTargets(s);
  // 1. Water arrives before drought/growth; identical to the visible forecast.
  const watered=growthMoisture(s);
  s.tiles.forEach((t,i)=>t.moisture=watered[i]);
  const ordeal = trialAhead(s);
  const ordealOn = !!ordeal && s.absWeek >= ordeal.week && s.absWeek <= trialEnd(ordeal);
  if (ordeal && ordealOn) { beginTrial(s, ordeal); trialNight(s, ordeal); }
  // 2. frost. The ordeal's black frost grades its blow: a bed within 1° of its limit is only nipped (half the crop)
  const blackFrost = ordealOn && ordeal!.kind === 'frost' && s.absWeek === ordeal!.week ? ordeal! : null;
  for (const [t, x, y] of ownedTiles(s)) {
    if (!t.crop) continue;
    if (blackFrost) {
      const margin = air + frostShield(s, t) - frostLimit(t.crop);
      const n = trialNight(s, blackFrost);
      const before = clone(t.crop);
      const price = priceOf(s, t.crop.id);
      if (margin <= 0) {
        const lost = noteLoss(s, x, y, undefined, 'frost');
        trialLoss(blackFrost, lost, lost * price);
        n.cells.push({ x, y, out: 'killed', before, after: null, lost });
        r.frost++;
      } else if (margin <= 1 && !t.crop.rest) {
        const c = t.crop;
        const lost = noteLoss(s, x, y, () => { c.mult *= 0.5; }, 'frost');
        s.report.fieldDamage!.at(-1)!.note = 'прихватило';
        trialLoss(blackFrost, lost, lost * price);
        n.cells.push({ x, y, out: 'bitten', before, after: clone(c), lost });
      } else n.cells.push({ x, y, out: 'held' });
      continue;
    }
    if (!frostKills(s, x, y, air)) continue;
    noteLoss(s, x, y, undefined, 'frost');
    r.frost++;
  }
  if (r.frost) {
    r.lost.push(`Мороз погубил ${r.frost} ${plural(r.frost, 'растение', 'растения', 'растений')}`);
    feed(s, `${air}°: мороз погубил ${r.frost} ${plural(r.frost, 'растение', 'растения', 'растений')}.`, 'bad');
  }
  // 3. the dry check (sleeping plants need no water). CAL-03/WTH-04 · in winter only a heated greenhouse is
  // tended (watered by hand, by cards and by irrigation); an unheated one sleeps like the open field.
  const wind = sukhovey(s);
  for (const [t, x, y] of ownedTiles(s)) {
    if (!t.crop || t.crop.rest || !winterCareTarget(s, x, y)) continue;
    if (t.moisture >= 1) {
      t.crop.dry = 0;
      continue;
    }
    t.crop.dry = (t.crop.dry ?? 0) + 1;
    // v3 · under a dry wind a bed with no water dies at once (a drought-hardy one lasts a week);
    // in the great drought one dry week is enough (two for a drought-hardy variety)
    const drySpan = droughtTrialOn(s) || (wind && !windbreak(s, x, y)) ? 1 : 2;
    if (t.crop.dry >= (t.crop.traits?.includes('drought') ? drySpan + 1 : drySpan)) {
      const before = clone(t.crop), price = priceOf(s, t.crop.id);
      const lost = noteLoss(s, x, y, undefined, 'dry');
      if (ordealOn && ordeal!.kind === 'drought') { trialLoss(ordeal!, lost, lost * price); trialNight(s, ordeal!).cells.push({ x, y, out: 'dried', before, after: null, lost }); }
      r.dried++;
    }
  }
  if (ordealOn && ordeal!.kind === 'drought') {
    const n = trialNight(s, ordeal!);
    for (const [t, x, y] of ownedTiles(s)) if (t.crop && !t.crop.rest && !n.cells.some((c) => c.x === x && c.y === y)) n.cells.push({ x, y, out: 'held' });
  }
  if (r.dried) {
    r.lost.push(`Засохли без воды: ${r.dried} ${plural(r.dried, 'растение', 'растения', 'растений')}`);
    feed(s, `Засохли без воды: ${r.dried} ${plural(r.dried, 'растение', 'растения', 'растений')}.`, 'bad');
  }
  // 4–6. blows, crows, thieves
  resolveStrikes(s, diagnostic);
  resolveThieves(s);
  const blocked = resolveCrows(s);
  // 7. growth
  for (const [t, x, y] of ownedTiles(s)) if (t.crop && (t.crop.dry ?? 0) === 0 && !blocked.has(`${x},${y}`)) t.crop.grown += growStep(s, x, y, true);
  // Pollination is evaluated before harvest removes this week's flowers.
  // WTH-02/03 · a hive set down or moved this week makes honey from the next week, like its pollination bonus
  const productiveHives=ownedTiles(s).filter(([t,x,y])=>hiveYieldReady(s,t) &&
    (wlvl(s,'beekeeper')>=1?neighbors8(x,y):neighbors4(x,y)).some(([a,b])=>{
      const p=tile(s,a,b).crop;
      return p && !p.rest && (CROPS[p.id].flowering || p.id==='strawberry' || p.id==='watermelon') && !growNote(s,a,b,true);
    })).length;
  // 8. harvest from one snapshot of the field
  sellYard(s);
  const ripe = ownedTiles(s).filter(([t]) => t.crop && !t.crop.rest && t.crop.grown >= targetGrow(s, t.crop));
  const yields = ripe.map(([, x, y]) => expectedYield(s, x, y));
  ripe.forEach(([, x, y], i) => harvestTile(s, x, y, yields[i]));
  // 9. water
  for (const [t, x, y] of ownedTiles(s)) {
    if (!winterCareTarget(s, x, y)) continue;
    const shade = nearTerrain(s, x, y, 'forest');
    if (!(t.mulch > 0) && !t.drip && (!shade || t.structure === 'greenhouse')) t.moisture = Math.max(0, t.moisture - 1);
    // v3 · by the spring (run condition) a drought dries no harder than a hot week
    const dry = s.flags.dry && !hasCond(s, 'spring');
    const hotWeek = dry || air >= 28;
    if (hotWeek && t.structure !== 'greenhouse' && t.crop?.id !== 'sunflower' && !t.crop?.traits?.includes('drought')) {
      const extra = (dry && t.terrain === 'sand' ? 2 : 1) - (wlvl(s, 'irrigator') >= 2 ? 1 : 0);
      t.moisture = Math.max(0, t.moisture - extra);
    }
    if (wind && !windbreak(s, x, y) && !(t.mulch > 0) && !t.drip) t.moisture = Math.max(0, t.moisture - 1);
    // v3 §7 · the village pump: in a hot week every bed gets a bucket more
    if (hotWeek && hasCommon(s, 'pump')) t.moisture = Math.min(3, t.moisture + 1);
    // the road's dust: the plot's bottom row dries faster in summer
    if (hasCond(s, 'road') && s.season === 1 && y === 3 && t.structure !== 'greenhouse' && !(t.mulch > 0)) t.moisture = Math.max(0, t.moisture - 1);
    // the great drought takes one more from every open bed; mulch and drip lines keep it in
    if (droughtTrialOn(s) && t.structure !== 'greenhouse' && !(t.mulch > 0) && !t.drip && t.crop?.id !== 'sunflower' && !t.crop?.traits?.includes('drought')) t.moisture = Math.max(0, t.moisture - 1);
  }
  for (const [t] of ownedTiles(s)) { if (t.mulch > 0) t.mulch--; if (t.shelter > 0) t.shelter--; }
  // 10. weeds and trees
  if (!winter) growWeeds(s);
  if (!winter) growTrees(s);
  // 11. farm work that happens by itself
  if (s.season === 1 && lvl(s, 'apiary') >= 3) {
    const hives = productiveHives;
    const q = hives * 2 * (wlvl(s, 'beekeeper') >= 2 ? 2 : 1);
    if (q) {
      addToStorage(s, 'honey', q);
      r.honey = q;
    }
  }
  if (lvl(s,'compost')>=1 && !s.compostReady) {
    s.compostTick=Math.min(compostWeeks(s),s.compostTick+1);
    if(s.compostTick>=compostWeeks(s)) {
      s.compostReady=true;
      feed(s,'Компост созрел. Его можно забрать из ямы.','good');
    }
  }
  if (hasPet(s, 'geese') && !winter) {
    const w = ownedTiles(s).find(([t]) => t.weeds);
    if (w) {
      w[0].weeds = false;
      w[0].clean = 2;
      scene(s,'geese',[w[1],w[2]]);
    }
  }
  // 12. the barn: spoilage, mice
  for (const l of s.storage) l.age += 1;
  
  for (const l of s.storage.filter((l) => CROPS[l.crop].perishable && l.age > storageKeepWeeks(s, l.crop))) {
    r.lost.push(`Испортилось: ${CROPS[l.crop].name.toLowerCase()}, ${l.qty} ед.`);
    s.stats.lostUnits += l.qty;
    l.qty = 0;
  }
  if (!hasPet(s, 'cat') && lvl(s, 'barn') < 2) {
    for (const crop of miceList) {
      const lots = s.storage.filter((l) => l.crop === crop).sort((a, b) => b.age - a.age);
      const total = lots.reduce((n, l) => n + l.qty, 0);
      if (total < 10) continue;
      let left = Math.max(1, Math.floor(total * 0.03));
      r.mice += left;
      s.stats.lostUnits += left;
      for (const l of lots) { const n = Math.min(left, l.qty); l.qty -= n; left -= n; }
    }
    if (r.mice) r.lost.push(`Мыши в амбаре: −${r.mice} ед. урожая`);
  }
  s.storage = s.storage.filter((l) => l.qty > 0);
  // 13. projects
  tickProjects(s);
  for (const w of s.team) if (w.away > 0) {
    w.away -= 1;
    if (w.away === 0) {
      w.level = Math.min(3, w.level + 1);
      const msg = `${WORKERS[w.id].name} вернулся с учёбы: ${WORKERS[w.id].title.toLowerCase()} ${w.level}-го уровня`;
      r.done.push(msg);
      feed(s, `${msg}.`, 'good');
    }
  }
  // 14. organisations
  tickOrgs(s);
  // 15. money (rates and facilities at the beginning of this week)
  // PSV-031/ECO-04 · the goat's milk money is income too: it arrives before the bills and is written in the journal
  if (hasPet(s, 'goat')) {
    const milk = Math.round(3 * infl(s.year));
    s.money = round2(s.money + milk);
    s.earned = round2(s.earned + milk);
    r.milk = milk;
    feed(s, `Коза: молоко продано за ${money(milk)}.`, 'good');
  }
  let borrowed = 0;
  for (const loan of s.loans) {
    const i = loanInterest(loan);
    borrowed += payOrBorrow(s, i, loan);
    s.stats.interest = round2(s.stats.interest + i);
  }
  if (costs.interest) r.costs.push({ label: 'проценты', amount: costs.interest });
  if (costs.salaries) {
    borrowed += payOrBorrow(s, costs.salaries);
    s.stats.salaries += costs.salaries;
    r.costs.push({ label: 'зарплаты', amount: costs.salaries });
  }
  if (costs.heating) {
    borrowed += payOrBorrow(s, costs.heating);
    r.costs.push({ label: 'отопление теплиц', amount: costs.heating });
  }
  // ECO-05 · bills the cash could not cover join the bank debt: never silently
  borrowed = round2(borrowed);
  if (borrowed > 0) {
    r.borrowed = borrowed;
    r.lost.push(`Не хватило денег на расходы: ${money(borrowed)} добавлено к долгу банку`);
    feed(s, `Не хватило денег на расходы недели: ${money(borrowed)} добавлено к долгу банку.`, 'bad');
  }
  for (const e of s.effects) e.weeks -= 1;
  s.effects = s.effects.filter((e) => e.weeks > 0);
  s.strikes = s.strikes.filter((x) => x.week > s.absWeek);
  s.guards = [];
  if (ordeal && ordealOn && s.absWeek === trialEnd(ordeal)) settleTrial(s, ordeal);
  // v3 · a visitor waits one week; Пряхин does his inspection whether you show him round or not
  const v = s.run?.visit;
  if (v && v.week <= s.absWeek) {
    if (v.id === 'inspection') answerVisit(s, v, 0);
    else feed(s, VISITS[v.id].gone, 'info');
    s.run!.visit = null;
  }
  settle(s);
  s.lastReport = r;
}

function growWeeds(s: GameState) {
  if (s.year === 1 && s.season === 0) return;
  const creep: [number, number][] = [];
  for (const [t, x, y] of ownedTiles(s)) {
    const fallow = !t.crop && !t.structure && !t.canal && t.tree === undefined && TERRAIN[t.terrain].plantable;
    if (!fallow) {
      t.idle = 0;
      continue;
    }
    if (t.weeds) {
      if (rand(s) < 0.2) {
        const n = neighbors4(x, y).filter(([a, b]) => {
          const o = tile(s, a, b);
          return o.owned && !o.crop && !o.structure && !o.canal && !o.weeds && o.clean <= 0 && TERRAIN[o.terrain].plantable;
        });
        if (n.length) creep.push(n[randInt(s, n.length)]);
      }
      continue;
    }
    if (t.clean > 0) continue;
    t.idle += 1;
    if (t.idle >= 4) {
      t.weeds = true;
      t.idle = 0;
    }
  }
  for (const [x, y] of creep) tile(s, x, y).weeds = true;
  for (const t of s.tiles) if (t.clean > 0) t.clean -= 1;
}

// Intensive harvests consume soil; light crops and legumes keep distinct roles.
export const SOIL_HUNGRY: CropId[] = ['sunflower','corn','cabbage','pumpkin'];
export const soilHarvestCost = (s: GameState, c: CropId) => SOIL_HUNGRY.includes(c) && !(c==='sunflower' && wlvl(s,'soilsci')>=3) ? 1 : 0;
/** v3 §9.1 · the year's harvest as the festival will judge it: all units, the crops, the best single bed */
function noteYearHarvest(s: GameState, c: CropId, qty: number) {
  if (s.yearHarvest?.year !== s.year) s.yearHarvest = { year: s.year, units: 0, kinds: [], best: 0 };
  const y = s.yearHarvest;
  y.units += qty;
  if (!y.kinds.includes(c)) y.kinds.push(c);
  if (qty > y.best) { y.best = qty; y.bestCrop = c; }
}
/** the showing the farm would bring to the festival now */
export function festShow(s: GameState): Record<FestCat, number> {
  const y = s.yearHarvest?.year === s.year ? s.yearHarvest : undefined;
  return { units: y?.units ?? 0, kinds: y?.kinds.length ?? 0, best: y?.best ?? 0 };
}
export const festRival = (s: GameState) => rivalShow(Math.max(0, s.year - 1));
/** the festival is held at the first week of winter in a village with a club */
export const festOpen = (s: GameState) => hasCommon(s, 'club');
function festival(s: GameState) {
  if (!festOpen(s) || s.fests?.some((f) => f.year === s.year)) return;
  const you = festShow(s), rival = festRival(s);
  const won = FEST_CATS.filter((c) => you[c] >= rival[c]);
  const win = won.length >= 2;
  let glory = 0;
  for (const c of won) { addGlory(s, FEST_CAT_GLORY, `fest-${s.year}-${c}`); glory += FEST_CAT_GLORY; }
  if (win) {
    addGlory(s, FEST_WIN_GLORY, `fest-win-${s.year}`);
    glory += FEST_WIN_GLORY;
    if (!s.certs.includes(FEST_CERT)) { s.certs.push(FEST_CERT); s.rewardsOut.push({ id: `${s.seed}|${s.loc}|fest|cert`, kind: 'cert', value: FEST_CERT }); }
  }
  (s.fests ??= []).push({ year: s.year, you, rival, won, win, glory, ...(s.yearHarvest?.bestCrop ? { bestCrop: s.yearHarvest.bestCrop } : {}) });
  const msg = win ? `Праздник урожая: вы победили Пряхина (${won.map((c) => FEST_NAMES[c].toLowerCase()).join(', ')}). На зимней ярмарке — призовой лот`
    : won.length ? `Праздник урожая: Пряхин впереди, но «${FEST_NAMES[won[0]]}» ваша` : 'Праздник урожая: в этот раз первый — Пряхин';
  s.report.done.push(msg);
  feed(s, `${msg}.`, win ? 'good' : 'info');
}
// ---------- v3 §9.1 · the district ----------
/** the strength of the farm as the district sees it: the house, the buildings, the village, the festivals */
export function farmStrength(s: GameState): number {
  const tracks = (Object.keys(s.levels) as TrackId[]).filter((t) => t !== 'house').reduce((n, t) => n + lvl(s, t), 0);
  const yards = YARD_IDS.reduce((n, y) => n + yardStage(s, y), 0);
  const fests = (s.fests ?? []).filter((f) => f.win).length;
  return Math.round(12 * lvl(s, 'house') + 2 * tracks + 4 * yards + 8 * (s.commons?.length ?? 0) + 10 * fests);
}
export interface DistrictRow { name: string; strength: number; note: string; you?: boolean }
export function districtTable(s: GameState): DistrictRow[] {
  const rows: DistrictRow[] = DISTRICT.map((v) => ({ name: v.name, note: v.note, strength: Math.round(v.base + v.growth * s.year) }));
  rows.push({ name: 'Ваше хозяйство', note: LOCATIONS[s.loc].name, strength: farmStrength(s), you: true });
  return rows.sort((a, b) => b.strength - a.strength || Number(!!b.you) - Number(!!a.you));
}
export const districtPlace = (s: GameState) => districtTable(s).findIndex((r) => r.you) + 1;

/** v3 §8.1 · a harvest teaches: the farm's count grows, a new level of knowledge is told, the fifth is a certificate */
function learnCrop(s: GameState, c: CropId, qty: number) {
  const before = knowLevel(s, c);
  (s.crops ??= {})[c] = (s.crops[c] ?? 0) + qty;
  const after = knowLevel(s, c);
  if (after <= before) return;
  feed(s, `Знание: ${CROPS[c].name} — ${KNOW_NAMES[after]} (${after} из 5).`, 'good');
  if (after >= 5) {
    // once on the profile whichever farm gets there: the reward's id has no farm in it
    s.glory += KNOW_GLORY;
    s.rewardsOut.push({ id: `know|${c}|5`, kind: 'glory', value: KNOW_GLORY });
    const cert = `Свой сорт: ${CROPS[c].name.toLowerCase()}`;
    if (!s.certs.includes(cert)) { s.certs.push(cert); s.rewardsOut.push({ id: `know|${c}|cert`, kind: 'cert', value: cert }); }
  }
}
function harvestTile(s: GameState, x: number, y: number, qty: number) {
  const t = tile(s, x, y);
  if (!t.crop) return;
  const c = t.crop.id;
  if (qty > 0) addToStorage(s, c, qty);
  s.stats.harvested += qty;
  if (qty > 0) learnCrop(s, c, qty);
  if (qty > 0 && !CROPS[c].product) noteYearHarvest(s, c, qty);
  s.report.harvests.push({ crop: c, qty, x, y });
  if (!s.harvestedKinds.includes(c)) {
    s.harvestedKinds.push(c);
    addGlory(s, 2, `first-${c}`);
  }
  if (CROPS[c].legume) for (const [key, gain] of beanGain(s, [[x, y]])) {
    const [a, b] = key.split(',').map(Number);
    soilUp(s, a, b, gain);
  }
  if (soilHarvestCost(s,c) && t.soil > 1) {
    t.soil -= 1;
    s.report.soilDown += 1;
  }
  t.last = c;
  const per = CROPS[c].perennial;
  if (per) {
    const years = (t.crop.years ?? per) - 1;
    if (years > 0) {
      t.crop.years = years;
      t.crop.rest = true;
      t.crop.regrowing = true;
      t.crop.grown = 0;
      return;
    }
  }
  t.crop = null;
}

export function addToStorage(s: GameState, crop: CropId, qty: number) {
  const free = Math.max(0, storageCap(s) - storageUsed(s));
  const stored = Math.min(free, qty);
  if (stored > 0) {
    const lot = s.storage.find((l) => l.crop === crop && l.age === 0);
    if (lot) lot.qty += stored;
    else s.storage.push({ crop, qty: stored, age: 0 });
  }
  const over = qty - stored;
  if (over > 0) {
    const lot = s.yard.find((l) => l.crop === crop && l.bornWeek === s.absWeek);
    if (lot) lot.qty += over;
    else s.yard.push({ crop, qty: over, age: 0, bornWeek: s.absWeek });
    s.report.overflow += over;
  }
}
// crates that waited in the yard a whole week go to a reseller at 60% of the price
function sellYard(s: GameState) {
  let v = 0, n = 0;
  // Recover overflow first whenever storage has become available.
  for (const l of s.yard) {
    const n = Math.min(l.qty, Math.max(0, storageCap(s) - storageUsed(s)));
    if (n) { s.storage.push({ crop: l.crop, qty: n, age: l.age }); l.qty -= n; }
  }
  for (const l of s.yard.filter((l) => (l.bornWeek ?? s.absWeek - 1) < s.absWeek)) {
    v += round2(l.qty * round2(priceOf(s, l.crop) * 0.6));
    n += l.qty;
  }
  s.yard = s.yard.filter((l) => l.qty > 0 && (l.bornWeek ?? s.absWeek - 1) >= s.absWeek);
  if (n) {
    v = round2(v);
    s.money = round2(s.money + v);
    s.stats.sales = round2(s.stats.sales + v);
    s.earned = round2(s.earned + v);
    s.report.yardSold = v;
    s.report.yardUnits = n;
    feed(s, `Перекупщик забрал со двора ${n} ед. за ${money(v)} (60% цены).`, 'info');
  }
}
export const reservedStock = (s: GameState, c: CropId) => Object.values(s.orgs).reduce((n, org) => n + (org?.active?.lines.filter((l) => l.crop === c).reduce((sum, l) => sum + l.qty, 0) ?? 0), 0);
export const freeStock = (s: GameState, c: CropId) => Math.max(0, stockOf(s, c) - reservedStock(s, c));
export const stockOf = (s: GameState, c: CropId) => s.storage.filter((l) => l.crop === c).reduce((a, l) => a + l.qty, 0) + s.yard.filter((l) => l.crop === c).reduce((a, l) => a + l.qty, 0);
function takeStock(s: GameState, crop: CropId, qty: number): number {
  let left = qty;
  for (const l of s.yard.filter((l) => l.crop === crop)) {
    const q = Math.min(l.qty, left);
    l.qty -= q;
    left -= q;
  }
  for (const l of s.storage.filter((l) => l.crop === crop).sort((a, b) => b.age - a.age)) {
    const q = Math.min(l.qty, left);
    l.qty -= q;
    left -= q;
  }
  s.yard = s.yard.filter((l) => l.qty > 0);
  s.storage = s.storage.filter((l) => l.qty > 0);
  return qty - left;
}

/** pays a bill from cash; what the cash cannot cover is added to a bank loan. Returns the amount borrowed. */
function payOrBorrow(s: GameState, amount: number, loan?: Loan): number {
  s.money = round2(s.money - amount);
  if (s.money < 0) {
    const debt = -s.money;
    s.money = 0;
    if (loan) loan.principal = round2(loan.principal + debt);
    else if (s.loans[0]) s.loans[0].principal = round2(s.loans[0].principal + debt);
    else s.loans.push({ id: s.nextLoanId++, principal: debt, rate: loanRate(s) });
    return debt;
  }
  return 0;
}
function settle(s: GameState) {
  s.money = round2(s.money);
  s.earned = round2(s.earned);
  for (const l of s.loans) l.principal = round2(l.principal);
  s.loans = s.loans.filter((l) => l.principal > 0);
  s.peak = Math.max(s.peak, s.money);
}
function resolvePayment(s: GameState, amount: number, name: string, seasonEnd: boolean) {
  if (s.money >= amount) {
    s.money = round2(s.money - amount);
    s.stats.payments = round2(s.stats.payments + amount);
    s.carry = 0;
    feed(s, `${name}: внесено ${money(amount)}.`, 'good');
    paidHooks(s, seasonEnd);
    if (seasonEnd && !s.incident) {
      s.cleanSeasons += 1;
      if (s.cleanSeasons >= 3 && s.rating < 5) {
        s.rating += 1;
        s.cleanSeasons = 0;
        feed(s, 'Рейтинг фермы вырос.', 'good');
      }
    }
    if (seasonEnd) s.incident = false;
    startWeek(s);
    return;
  }
  s.phase = 'shortfall';
  s.due = { amount, name, seasonEnd };
}

/** v3 · after a payment is made: the receipt is used up, the inspection surcharge is paid; an autumn payment counts
 *  toward the buyout of the home and opens folding an expedition */
function paidHooks(s: GameState, seasonEnd: boolean) {
  const autumn = s.season === 2 && seasonEnd;
  if (s.run) {
    if (hasRelic(s, 'receipt') && !s.run.used.includes('receipt')) s.run.used.push('receipt');
    delete s.run.surcharge;
    if (autumn) {
      s.run.autumns += 1;
      if (s.run.autumns === 1) feed(s, 'Первый год закрыт: хозяйство можно свернуть и везти добычу домой. Или рискнуть ещё годом.', 'info');
    }
  }
  if (isHome(s) && !s.owned && autumn) {
    s.paidYears = (s.paidYears ?? 0) + 1;
    if (s.paidYears >= BUYOUT_YEARS) buyHome(s);
  }
}
function buyHome(s: GameState) {
  s.owned = true;
  s.paidYears = Math.max(s.paidYears ?? 0, BUYOUT_YEARS);
  s.carry = 0;
  addGlory(s, 30, 'buyout');
  const cert = 'Хозяин родного дома';
  if (!s.certs.includes(cert)) { s.certs.push(cert); s.rewardsOut.push({ id: `${s.seed}|${s.loc}|buyout|cert`, kind: 'cert', value: cert }); }
  feed(s, 'Дом наш! Залог снят. Дальше — только налог раз в год, осенью.', 'good');
  scene(s, 'buyout');
}

// ---------- projects: workshop, lab, training ----------
/** The stage of a building under construction, for its picture: 0 when nothing is being built, then 1..3 by the
 *  share of its weeks done (materials brought, scaffolding round the walls, up to the ridge). */
export function buildStage(s: GameState, t: TrackId): 0 | 1 | 2 | 3 {
  const p = s.projects.find((x) => x.kind === 'track' && x.track === t);
  if (!p) return 0;
  const done = Math.max(0, p.total - p.weeks) / Math.max(1, p.total);
  return done < 1 / 3 ? 1 : done < 2 / 3 ? 2 : 3;
}
export const isLabProject = (p: Project) => p.kind === 'cell' || p.kind === 'trait' || p.kind === 'variety' || p.kind === 'bio';
export const isBuildProject = (p: Project) => p.kind === 'track' || p.kind === 'yard' || p.kind === 'common';
export const workshopBusy = (s: GameState) => s.projects.filter(isBuildProject).length;
export const labBusy = (s: GameState) => s.projects.filter(isLabProject).length;
export function trackCost(s: GameState, t: TrackId, level: number): number {
  const L = trackLevels(s, t)[level - 1];
  return Math.round(L.cost * infl(s.year) * (wlvl(s, 'mechanic') >= 2 ? 0.85 : 1));
}
/** v3 §5.1 · weeks of a building: the mechanic takes 15% off (rounded up, at least a week). Winter halves the pace. */
export function trackWeeks(s: GameState, t: TrackId, level: number): number {
  const L = trackLevels(s, t)[level - 1];
  return buildWeeks(s, L.weeks);
}
/** the weeks of any building site: the mechanic takes 15% off, Ефим's sawmill 20% (rounded up, at least a week) */
export const buildWeeks = (s: GameState, base: number) =>
  Math.max(1, Math.ceil(base * (wlvl(s, 'mechanic') >= 1 ? 0.85 : 1) * (yardStage(s, 'efim') >= 2 ? 0.8 : 1) - 1e-9));
/** the materials a level takes from the shed when it is laid down */
export const trackMats = (s: GameState, t: TrackId, level: number): Mats => trackLevels(s, t)[level - 1]?.mat ?? {};
export const matsList = (m: Mats) => MATERIAL_IDS.filter((k) => (m[k] ?? 0) > 0).map((k) => [k, m[k]!] as [MaterialId, number]);
/** what is missing from the shed for `m`, as words: «4 брёвен, 2 стекла»; null when everything is there */
export const matStock = (s: GameState, k: MaterialId) => s.mats?.[k] ?? 0;
export function matsShort(s: GameState, m: Mats): string | null {
  const miss = matsList(m).filter(([k, n]) => matStock(s, k) < n).map(([k, n]) => `${n - matStock(s, k)} ${MATERIALS[k].gen}`);
  return miss.length ? miss.join(', ') : null;
}
export const matsWords = (m: Mats) => matsList(m).map(([k, n]) => `${n} ${MATERIALS[k].gen}`).join(', ');
export function addMats(s: GameState, m: Mats) {
  s.mats ??= { logs: 0, bricks: 0, glass: 0 };
  for (const [k, n] of matsList(m)) s.mats[k] += n;
}
export function trackProblem(s: GameState, t: TrackId): string | null {
  const next = lvl(s, t) + 1;
  const L = trackLevels(s, t)[next - 1];
  if (!L) return 'Уже лучший уровень';
  if (TRACKS[t].equipment) return 'Продаётся на ярмарке';
  if (s.projects.some((p) => p.kind === 'track' && p.track === t)) return 'Уже строится';
  if (L.needHouse && lvl(s, 'house') < L.needHouse) return `Нужен ${isHome(s) ? 'дом' : 'лагерь'} ${L.needHouse}-го уровня`;
  if (workshopBusy(s) >= workshopSlots(s)) return 'Мастерская занята';
  if (s.money < trackCost(s, t, next)) return `Нужно ${money(trackCost(s, t, next))}`;
  const short = matsShort(s, L.mat ?? {});
  if (short) return `Не хватает: ${short}`;
  return null;
}
/** v3 §5.1 · the farmer gives a working day to a building site: a week off it, once a week, while it saves a week */
export function helpProblem(s: GameState, t: TrackId): string | null {
  const p = s.projects.find((x) => x.kind === 'track' && x.track === t);
  if (!p) return 'Здесь ничего не строится';
  if (s.helpWeek === s.absWeek) return 'На этой неделе вы уже помогали на стройке';
  if (p.weeks <= 1) return 'Стройка и так закончится на этой неделе';
  if (s.days < 1) return 'Нужен рабочий день';
  return null;
}
const labWeeks = (s: GameState, base: number) => Math.max(1, base - (wlvl(s, 'breeder') >= 1 ? 1 : 0) - (lvl(s, 'lab') >= 3 ? 1 : 0));
// v3 §8.2 · every improvement is a decision: a cell costs the square of how many the card will have, a trait doubles
export const cellPrice = (s: GameState, c: Card) => Math.round(15 * ((c.extra?.length ?? 0) + 1) ** 2 * infl(s.year));
export const traitPrice = (s: GameState, c: Card) => Math.round(20 * 2 ** (c.traits?.length ?? 0) * infl(s.year));
export const varietyPrice = (s: GameState) => Math.round(40 * infl(s.year));
export const bioPrice = (s: GameState) => Math.round(6 * infl(s.year));
/** base weeks: a cell 3 / 4 / 5 by how many the card has, a trait 4, a variety 6, the bio-preparation 1 */
export const LAB_WEEKS = { cell: 3, trait: 4, variety: 6, bio: 1 };
export const labWeeksFor = (s: GameState, kind: keyof typeof LAB_WEEKS, c?: Card) => labWeeks(s, LAB_WEEKS[kind] + (kind === 'cell' ? c?.extra?.length ?? 0 : 0));
export function labProblem(s: GameState): string | null {
  if (lvl(s, 'lab') < 1) return 'Лабораторию нужно построить';
  if (labBusy(s) >= labSlots(s)) return 'Все столы лаборатории заняты';
  return null;
}
export function upgradeSpots(s: GameState, c: CardLike): [number, number][] {
  const cells = cardCells(c);
  if ((asCard(c).extra?.length ?? 0) >= cardExtraMax(s, c)) return [];
  const has = new Set(cells.map((x) => x.join(',')));
  const out = new Map<string, [number, number]>();
  for (const [x, y] of cells)
    for (const [a, b] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as [number, number][]) {
      const k = `${a},${b}`;
      if (!has.has(k) && Math.abs(a) <= 3 && Math.abs(b) <= 3) out.set(k, [a, b]);
    }
  return [...out.values()];
}
export const labCrops = (s: GameState) => locOf(s).lab.filter((c) => !s.unlocked.includes(c) && !locOf(s).shop.includes(c));
export function trainPrice(s: GameState, id: WorkerId): number {
  const w = s.team.find((x) => x.id === id);
  const lvlNow = w?.level ?? 1;
  const perk = locOf(s).orgs.includes('college') && friends(s, 'college') ? 0.7 : 1;
  const angry = locOf(s).orgs.some((o) => ORGS[o].mischief === 'training' && mischiefOn(s, o)) ? 2 : 1;
  return Math.round(WORKERS[id].price * lvlNow * infl(s.year) * perk * angry);
}
export const trainWeeks = (s: GameState, id: WorkerId) => 2 * (s.team.find((x) => x.id === id)?.level ?? 1);
export const hirePrice = (s: GameState, id: WorkerId) => (s.freeHire.includes(id) ? 0 : Math.round(WORKERS[id].price * infl(s.year)));

// ---------- v3 §7 · the neighbours: stages, swaps, help, the smith's forge ----------
export const yardCost = (s: GameState, y: YardId, stage: number) => Math.round(YARDS[y].stages[stage - 1].cost * infl(s.year) * (wlvl(s, 'mechanic') >= 2 ? 0.85 : 1));
export const yardWeeks = (s: GameState, y: YardId, stage: number) => buildWeeks(s, YARDS[y].stages[stage - 1].weeks);
export const commonCost = (s: GameState, c: CommonId) => Math.round(COMMONS[c].cost * infl(s.year) * (wlvl(s, 'mechanic') >= 2 ? 0.85 : 1));
/** толока: the whole village comes, the shared buildings go 30% faster */
export const commonWeeks = (s: GameState, c: CommonId) => Math.max(1, Math.ceil(buildWeeks(s, COMMONS[c].weeks) * TOLOKA - 1e-9));
/** how much of the crops a need asks for the barn and the yard hold (any of a group counts) */
export const cropNeedStock = (s: GameState, crops: CropId[]) => crops.reduce((n, c) => n + stockOf(s, c), 0);
/** take a need of crops: the crop there is most of first */
function takeCropNeed(s: GameState, crops: CropId[], qty: number) {
  let left = qty;
  for (const c of [...crops].sort((a, b) => stockOf(s, b) - stockOf(s, a))) {
    const n = Math.min(left, stockOf(s, c));
    if (n > 0) { takeStock(s, c, n); left -= n; }
    if (left <= 0) break;
  }
}
export function yardProblem(s: GameState, y: YardId): string | null {
  if (!isHome(s)) return 'Соседи — дома, в Черноземье';
  if (!Object.hasOwn(YARDS, y)) return 'Нет такого соседа';
  const next = yardStage(s, y) + 1;
  const st = YARDS[y].stages[next - 1];
  if (!st) return 'Двор уже отстроен';
  if (s.projects.some((p) => p.kind === 'yard' && p.yard === y)) return 'Уже строится';
  if (workshopBusy(s) >= workshopSlots(s)) return 'Бригада занята';
  if (s.money < yardCost(s, y, next)) return `Нужно ${money(yardCost(s, y, next))}`;
  const short = matsShort(s, st.mat);
  if (short) return `Не хватает: ${short}`;
  if (st.crop && cropNeedStock(s, st.crop.crops) < st.crop.qty) return `Нужно ${st.crop.qty} ед. ${st.crop.name} (есть ${cropNeedStock(s, st.crop.crops)})`;
  return null;
}
export function commonProblem(s: GameState, c: CommonId): string | null {
  if (!isHome(s)) return 'Общие постройки — дома, в Черноземье';
  if (!Object.hasOwn(COMMONS, c)) return 'Нет такой постройки';
  if (hasCommon(s, c)) return 'Уже стоит';
  if (!commonsOpen(s)) return `Деревня возьмётся, когда ${COMMONS_NEED} двора будут на второй стадии (сейчас ${yardsStanding(s)})`;
  if (s.projects.some((p) => p.kind === 'common' && p.id === c)) return 'Уже строится';
  if (workshopBusy(s) >= workshopSlots(s)) return 'Бригада занята';
  if (s.money < commonCost(s, c)) return `Нужно ${money(commonCost(s, c))}`;
  const short = matsShort(s, COMMONS[c].mat);
  if (short) return `Не хватает: ${short}`;
  return null;
}
/** a swap is once a season; Зина's, from her second stage, once a week */
const swapWeekly = (s: GameState, y: YardId) => y === 'zina' && yardStage(s, y) >= 2;
const swapKey = (s: GameState, y: YardId) => (swapWeekly(s, y) ? s.absWeek : seasonKey(s));
export const ZINA_CARDS = ['compost', 'mulch', 'shelter'] as const;
export type ZinaCard = (typeof ZINA_CARDS)[number];
export function swapProblem(s: GameState, y: YardId, crop?: CropId): string | null {
  if (!isHome(s)) return 'Соседи — дома, в Черноземье';
  if (!Object.hasOwn(YARDS, y)) return 'Нет такого соседа';
  if (yardStage(s, y) < 1) return 'Обмен откроется после первой стадии';
  const st = s.yards?.[y];
  if (st?.swap === swapKey(s, y)) return swapWeekly(s, y) ? 'На этой неделе уже менялись' : 'В этом сезоне уже менялись';
  const sw = YARDS[y].swap;
  if (crop !== undefined && !sw.take.crops.includes(crop)) return 'Это сосед не возьмёт';
  const have = crop !== undefined ? stockOf(s, crop) : Math.max(0, ...sw.take.crops.map((c) => stockOf(s, c)));
  if (have < sw.take.qty) return `Нужно ${sw.take.qty} ед. ${sw.take.name} одной культуры`;
  return null;
}
export function yardHelpProblem(s: GameState, y: YardId): string | null {
  if (!isHome(s)) return 'Соседи — дома, в Черноземье';
  if (yardStage(s, y) < 2) return 'Сосед подмогнёт, когда двор будет на второй стадии';
  if (s.yards?.[y]?.help === seasonKey(s)) return 'В этом сезоне сосед уже помогал';
  return null;
}
/** the next level of an equipment line Savva can forge, and its price */
export function forgeOffer(s: GameState, t: TrackId): { level: number; price: number } | null {
  if (!EQUIPMENT.includes(t)) return null;
  const level = equipNext(s, t);
  if (level === null) return null;
  return { level, price: Math.round(equipPrice(s, t, level) * FORGE_MULT) };
}
export const forgeOfferLines = (s: GameState): TrackId[] => EQUIPMENT.filter((t) => forgeOffer(s, t) !== null);
export function forgeProblem(s: GameState, t: TrackId): string | null {
  if (yardStage(s, 'savva') < 2) return 'Савва скуёт, когда кузня будет на второй стадии';
  if (s.forge) return `Савва уже куёт: ${TRACKS[s.forge.track].levels[s.forge.level - 1].name}`;
  const o = forgeOffer(s, t);
  if (!o) return 'Здесь Савве ковать нечего';
  if (s.money < o.price) return `Нужно ${money(o.price)}`;
  return null;
}
/** a candidate a neighbour sends: one not in the team, not away with the cart, not already waiting */
function yardCandidate(s: GameState, y: YardId, only?: WorkerId) {
  const pool = (only ? [only] : WORKER_IDS).filter((id) => !s.team.some((w) => w.id === id) && !s.candidates.includes(id) && s.away?.worker?.id !== id);
  if (!pool.length) return;
  const id = pool[randInt(world(s, `yard-${y}`, s.year), pool.length)];
  s.candidates.push(id);
  (s.yards![y] ??= { stage: yardStage(s, y) }).cand = s.year;
  feed(s, `${YARDS[y].name}: ${YARD_CANDIDATE[y]} — ${WORKERS[id].name}, ${WORKERS[id].title.toLowerCase()}. Ждёт у крыльца.`, 'good');
}
/** the neighbours' turn at the start of a season: the glass from Зина's greenhouse, the yearly candidates in spring
 *  (and the smith's apprentice every season until he is taken) */
function yardsSeason(s: GameState) {
  if (!isHome(s) || !s.yards) return;
  if (yardStage(s, 'zina') >= 3) { addMats(s, { glass: 2 }); feed(s, 'Зина: лишнее стекло из теплицы — 2 стекла в сарай.', 'good'); }
  for (const y of ['zina', 'karpov'] as const) if (yardStage(s, y) >= 3 && s.yards[y]!.cand !== s.year) yardCandidate(s, y);
  if (yardStage(s, 'savva') >= 3 && !s.team.some((w) => w.id === SAVVA_APPRENTICE)) yardCandidate(s, 'savva', SAVVA_APPRENTICE);
}
/** a stage is done: glory, the neighbour's thanks, and what it opens at once */
function finishYard(s: GameState, y: YardId, stage: number): string {
  s.yards ??= {};
  const st = (s.yards[y] ??= { stage: 0 });
  st.stage = Math.max(st.stage, stage);
  addGlory(s, YARD_GLORY[stage - 1], `yard-${y}-${stage}`);
  const D = YARDS[y];
  if (stage === 3 && (y === 'zina' || y === 'karpov') && st.cand !== s.year) yardCandidate(s, y);
  if (stage === 3 && y === 'savva') yardCandidate(s, 'savva', SAVVA_APPRENTICE);
  const opens = stage === 1 ? `открылся обмен: ${D.swap.give}` : stage === 2 ? D.second : D.third;
  return `${D.name}: готово «${D.stages[stage - 1].name}» — ${opens}`;
}
/** the smith's work is ready on its week */
function forgeWeek(s: GameState) {
  const f = s.forge;
  if (!f || f.week > s.absWeek) return;
  delete s.forge;
  if (lvl(s, f.track) >= f.level) {
    // the level came some other way meanwhile: Savva gives the money back
    if (f.price) s.money = round2(s.money + f.price);
    feed(s, `Савва: «${TRACKS[f.track].levels[f.level - 1].name}» у вас уже есть — деньги вернул.`, 'info');
    return;
  }
  s.levels[f.track] = f.level;
  const msg = `Савва сковал: ${TRACKS[f.track].levels[f.level - 1].name} — ${TRACKS[f.track].levels[f.level - 1].text}`;
  s.report.done.push(msg);
  feed(s, `${msg}.`, 'good');
}

function tickProjects(s: GameState) {
  // v3 §5.1 · in winter a building site moves at half pace; the lab and training go on indoors
  for (const p of s.projects) p.weeks = round2(p.weeks - (isBuildProject(p) && s.season === 3 ? 0.5 : 1));
  const done = s.projects.filter((p) => p.weeks <= 0);
  for (const p of done) {
    // Other completed laboratory cards retain their reservations until their own return.
    s.projects = s.projects.filter((other) => other !== p);
    let msg = '';
    if (p.kind === 'track') {
      s.levels[p.track] = p.level;
      const L = trackLevels(s, p.track)[p.level - 1];
      msg = `${trackDef(s, p.track).name}: готово «${L.name}» — ${L.text}`;
      if (p.track === 'house') addGlory(s, 5, `house-${p.level}`);
    } else if (p.kind === 'cell') {
      p.card.extra = [...(p.card.extra ?? []), p.cell];
      if (p.origin === 'spare' || deckCount(s) >= deckLimit(s)) s.spare.push(p.card);
      else s.discard.push(p.card);
      msg = `Лаборатория: «${CARDS[p.card.def].name}» теперь сажает ${cardCells(p.card).length} кл.`;
    } else if (p.kind === 'trait') {
      p.card.traits = [...(p.card.traits ?? []), p.trait];
      if (p.origin === 'spare' || deckCount(s) >= deckLimit(s)) s.spare.push(p.card);
      else s.discard.push(p.card);
      msg = `Лаборатория: «${CARDS[p.card.def].name}» — ${TRAITS[p.trait].short}`;
    } else if (p.kind === 'variety') {
      if (!s.unlocked.includes(p.crop)) s.unlocked.push(p.crop);
      addCard(s, `seed_${p.crop}`);
      msg = `Лаборатория вывела сорт: ${CROPS[p.crop].name}. Семена в колоде и в лавке`;
    } else if (p.kind === 'bio') {
      deliverTemporary(s, 'bio');
      deliverTemporary(s, 'bio');
      msg = 'Лаборатория: 2 карты «Биопрепарат» доставлены в руку; при полной руке — в сброс';
    } else if (p.kind === 'train') {
      // training ends with the worker's away counter
    } else if (p.kind === 'yard') {
      msg = finishYard(s, p.yard, p.stage);
    } else if (p.kind === 'common') {
      (s.commons ??= []).push(p.id);
      addGlory(s, COMMON_GLORY, `common-${p.id}`);
      msg = `Деревня построила: ${COMMONS[p.id].name} — ${COMMONS[p.id].text}`;
    }
    if (msg) {
      s.report.done.push(msg);
      feed(s, `${msg}.`, 'good');
    }
  }
}
function deliverTemporary(s: GameState, def: string) {
  const card: Card = { uid: s.nextUid++, def, temp: true };
  (s.hand.length < handMax(s) ? s.hand : s.discard).push(card);
}
// a new card: into the deck while there is room, otherwise among the spare cards
function addCard(s: GameState, def: string, extra?: Partial<Card>) {
  const c: Card = { uid: s.nextUid++, def, ...extra };
  if (deckCount(s) < deckLimit(s)) s.discard.push(c);
  else s.spare.push(c);
  return c;
}

// ---------- organisations ----------
export function obtainable(s: GameState, c: CropId): boolean {
  if (c === 'honey') return lvl(s, 'apiary') >= 3;
  if (c === 'mushrooms') return s.loc === 'altai';
  return locOf(s).shop.includes(c) || s.unlocked.includes(c) || locOf(s).lab.includes(c);
}
// A regional research possibility is not an unlocked production chain.
export function orderCropAvailable(s: GameState,c: CropId): boolean {
  if(c==='honey')return lvl(s,'apiary')>=3 && countStructure(s,'hive')>0;
  if(c==='mushrooms')return s.loc==='altai';
  const seed=`seed_${c}`;
  const ownsSeed=[...deckList(s),...s.spare].some(k=>k.def===seed&&!k.temp) || s.projects.some(p=>(p.kind==='cell'||p.kind==='trait')&&p.card.def===seed&&!p.card.temp);
  if(!shopCards(s).includes(seed)&&!ownsSeed)return false;
  if(CROPS[c].greenhouseOnly && !countStructure(s,'greenhouse'))return false;
  // PSV-020 · an order needs a way to produce the crop (its shape must fit the swamps that are left) or stock to cover it
  if(!cropProducible(s,c))return freeStock(s,c)>0;
  return true;
}
/** ORG-01 · an open offer line can be met: the crop is available, and a crop that can no longer be grown here
 *  is still covered by the stock the offer was capped to */
export const offerLineOk = (s: GameState, l: QuestLine) => orderCropAvailable(s, l.crop) && (cropProducible(s, l.crop) || freeStock(s, l.crop) >= l.qty);
export function repairOpenOffers(state: GameState): GameState {
  const bad=locOf(state).orgs.filter(o=>{const q=state.orgs[o];return q?.offer&&!q.active&&q.offer.lines.some(l=>!offerLineOk(state,l));});
  if(!bad.length)return state;
  const s=clone(state);
  for(const o of bad){const q=s.orgs[o]!;q.offer=null;q.wait=0;q.idle=0;}
  return s;
}
function makeQuest(s: GameState, o: OrgId, step: number): Quest {
  const def = ORGS[o];
  const w = world(s, `quest|${o}`, s.absWeek * 7 + step);
  const scale = 1 + 0.3 * (s.year - 1);
  let crops: CropId[];
  let primary: CropId[] = [];
  let lines = 1;
  let title: string, text: string, weeks: number, payK: number, reward: Reward | undefined;
  if (step < def.steps.length) {
    const st = def.steps[step];
    crops = st.crops.filter((c) => orderCropAvailable(s, c));
    if (!crops.length) fail('Этот сюжетный заказ пока недоступен');
    primary=[...crops];
    const desired=Math.max(st.lines??1, step>=3?3:step>=1?2:1);
    if(desired>1) crops=[...new Set([...crops,...def.wants.filter(c=>orderCropAvailable(s,c))])];
    lines=Math.min(desired,crops.length);
    title = st.title;
    text = st.text;
    weeks = st.weeks;
    payK = st.pay;
    reward = st.reward;
  } else {
    crops = def.wants.filter((c) => orderCropAvailable(s, c));
    if (!crops.length) crops = [locOf(s).shop[0]];
    title = 'Поставка к сроку';
    text = 'Нужна вся партия к указанной неделе. Срок уже назначен.';
    lines=Math.min(3,crops.length);
    weeks = 6;
    payK = 1.25;
  }
  shuffle(w, crops);
  if(primary.length) { const first=primary[randInt(w,primary.length)]; crops=[first,...crops.filter(c=>c!==first)]; }
  const base = step < def.steps.length ? def.steps[step].qty : 8 + randInt(w, 7);
  const ls: QuestLine[] = crops.slice(0, lines).map((c) => ({ crop: c, qty: Math.max(3, Math.round(base * scale * (0.85 + rand(w) * 0.3) * (CROPS[c].yield >= 9 ? 1.4 : 1))) }));
  // PSV-020 · a crop that can no longer be grown here is ordered only as far as the stock reaches
  for (const l of ls) if (!cropProducible(s, l.crop)) l.qty = Math.max(1, Math.min(l.qty, freeStock(s, l.crop)));
  const road = o === 'teahouse' && hasCond(s, 'road') ? 1.2 : 1;
  const pay = round2(ls.reduce((a, l) => a + l.qty * CROPS[l.crop].price, 0) * infl(s.year) * payK * (1.15 + rand(w) * 0.2) * road);
  return { id: s.nextQuestId++, org: o, step, title, text, lines: ls, pay, rel: step >= def.steps.length ? 10 : step === def.steps.length - 1 ? 25 : 18, weeks, reward, createdWeek:s.absWeek, expires:s.absWeek+weeks, contract:step>=def.steps.length, deadline:s.absWeek+weeks };
}
export const IGNORED_OFFER_WEEKS = 6;
// Legacy offers retain a fixed deadline from their creation, never from acceptance.
export const offerDeadline=(s:GameState,q:Quest)=>q.deadline??(q.createdWeek!==undefined?q.createdWeek+q.weeks:q.expires??s.absWeek+q.weeks);
function tickOrgs(s: GameState) {
  for (const o of locOf(s).orgs) {
    const st = s.orgs[o];
    if (!st) continue;
    let failed = false;
    if (st.active && st.active.deadline !== undefined && st.active.deadline <= s.absWeek) {
      st.rel = Math.max(-100, st.rel - 20);
      s.report.lost.push(`${ORGS[o].short}: срок заказа вышел (отношения −20)`);
      feed(s, `${ORGS[o].short}: заказ «${st.active.title}» не сдан, отношения испортились.`, 'bad');
      st.active = null;
      st.wait = 2;
      failed = true;
    }
    if(st.offer && !st.active && !st.offer.lines.every(l=>offerLineOk(s,l))) {
      st.offer=null;st.idle=0;st.wait=0;
    }
    if (st.offer && !st.active) {
      st.idle += 1;
      if (offerDeadline(s,st.offer)<=s.absWeek || (st.offer.createdWeek===undefined && st.offer.expires===undefined && st.idle>IGNORED_OFFER_WEEKS)) {
        st.offer=null; st.idle=0; st.wait=2;
        feed(s,`${ORGS[o].short}: предложение истекло. Отношения не изменились.`,'info');
        continue;
      }
      if (ORGS[o].mischief === 'silence' && mischiefOn(s, o)) {
        st.offer = null; st.idle = 0; st.wait = 3;
        feed(s, `${ORGS[o].short}: заказы временно отозваны.`, 'bad');
        continue;
      }
    }
    // ORG-06 · the slow thaw of a «silent» org does not start in the week an order was missed (the −20 holds)
    if (!failed && !st.offer && !st.active && ORGS[o].mischief === 'silence' && st.rel < -35) st.rel += 2;
    if (!st.offer && !st.active) {
      st.wait -= 1;
      const step = ORGS[o].steps[st.step];
      const obtainableStory = (step?.crops ?? ORGS[o].wants).some((c) => orderCropAvailable(s, c));
      if (st.wait <= 0 && obtainableStory && !(ORGS[o].mischief === 'silence' && mischiefOn(s, o)) && s.season !== 3) {
        st.offer = makeQuest(s, o, st.step);
        st.idle = 0;
        feed(s, `${ORGS[o].short}: новый заказ — «${st.offer.title}».`, 'info');
      }
    }
  }
}
export function acceptProblem(s: GameState, o: OrgId): string | null {
  const st = s.orgs[o];
  if (!st?.offer) return 'Заказа нет';
  if (st.active) return 'Этот заказ уже в работе';
  if(offerDeadline(s,st.offer)<s.absWeek) return 'Предложение истекло';
  const n = Object.values(s.orgs).filter((x) => x?.active).length;
  if (n >= questSlots(s)) return `В работе уже ${questSlots(s)} ${plural(questSlots(s), 'заказ', 'заказа', 'заказов')}`;
  return null;
}
/** v3 §7 · an order of the bakery or the council with grain in it goes as flour once the mill has its granary */
export const millFlour = (s: GameState, q: Quest) => yardStage(s, 'miller') >= 3 && (q.org === 'bakery' || q.org === 'council') && q.lines.some((l) => GRAIN.includes(l.crop));
export function deliverProblem(s: GameState, o: OrgId): string | null {
  const q = s.orgs[o]?.active;
  if (!q) return 'Нет заказа в работе';
  for (const l of q.lines) if (stockOf(s, l.crop) < l.qty) return `Не хватает ${l.qty - stockOf(s, l.crop)} ед. ${CROPS[l.crop].gen}`;
  return null;
}
function grant(s: GameState, rw: Reward, src: string): number {
  // PSV-031 · a cash bonus is income: it counts in «Заработано» and in the order earnings
  const bonus = rw.money ? Math.round(rw.money * infl(s.year)) : 0;
  if (bonus) { s.money = round2(s.money + bonus); s.earned = round2(s.earned + bonus); s.stats.orders = round2(s.stats.orders + bonus); }
  if (rw.pet && !s.pets.includes(rw.pet)) {
    s.pets.push(rw.pet);
    s.rewardsOut.push({ id: `${src}|pet`, kind: 'pet', value: rw.pet });
    feed(s, `На ферме новый питомец: ${PETS[rw.pet].kind.toLowerCase()} ${PETS[rw.pet].name}!`, 'good');
  }
  if (rw.cert && !s.certs.includes(rw.cert)) {
    s.certs.push(rw.cert);
    s.rewardsOut.push({ id: `${src}|cert`, kind: 'cert', value: rw.cert });
    addGlory(s, 15, `${src}|certglory`);
    feed(s, `Грамота: «${rw.cert}».`, 'good');
  }
  if (rw.seeds) {
    if (!s.unlocked.includes(rw.seeds)) s.unlocked.push(rw.seeds);
    addCard(s, `seed_${rw.seeds}`);
    s.rewardsOut.push({ id: `${src}|seed`, kind: 'seed', value: rw.seeds });
    feed(s, `Новые семена: ${CROPS[rw.seeds].name}.`, 'good');
  }
  if (rw.worker) {
    const hired = s.team.some((w) => w.id === rw.worker);
    if (!s.freeHire.includes(rw.worker) && !hired) s.freeHire.push(rw.worker);
    // ORG-04 · someone already on the team is not offered for hire a second time
    if (!hired && !s.candidates.includes(rw.worker)) s.candidates.push(rw.worker);
    if (!hired) feed(s, `${WORKERS[rw.worker].name} (${WORKERS[rw.worker].title.toLowerCase()}) — можно нанять без платы за наём. Зарплата сохраняется — условия в доме.`, 'good');
  }
  // ORG-04 · a one-off card takes no deck place, so it never lands among the spare cards
  if (rw.card) s.discard.push({ uid: s.nextUid++, def: rw.card, temp: true });
  if (rw.glory) addGlory(s, rw.glory, `${src}|glory`);
  return bonus;
}
function addGlory(s: GameState, n: number, id: string) {
  s.glory += n;
  s.rewardsOut.push({ id: `${s.seed}|${s.loc}|${id}`, kind: 'glory', value: n });
}
export const relClamp = (n: number) => Math.max(-100, Math.min(100, n));

// ---------- visitors at the camp (v3 · docs/CHARACTERS-v3.md §5) ----------
const visitKey = (s: GameState, id: VisitId) => (VISITS[id].once ? id : id === 'inspection' ? `${id}-${s.year}-${s.season}` : `${id}-${s.year}`);
/** empty beds the archaeologists could dig */
export const digSpots = (s: GameState): [number, number][] =>
  ownedTiles(s).filter(([t]) => !t.crop && !t.structure && !t.canal && t.tree === undefined && TERRAIN[t.terrain].plantable && t.terrain !== 'swamp').map(([, x, y]) => [x, y]);
function visitPossible(s: GameState, id: VisitId): boolean {
  const r = s.run!;
  if (!VISITS[id].where.includes(s.loc as ExpeditionId) || r.seen.includes(visitKey(s, id))) return false;
  if (id === 'archaeologists') return digSpots(s).length > 0;
  if (id === 'peddler') return RELIC_IDS.some((x) => !r.relics.includes(x));
  if (id === 'inspection') return hasCond(s, 'strip') && s.season <= 2;
  if (id === 'patrol') return s.season >= 1;
  if (id === 'pinecones') return s.season <= 1;
  if (id === 'postwoman') return !!r.home;
  return true;
}
function visitMorning(s: GameState) {
  const r = s.run;
  if (!r) return;
  r.visit = null;
  if (r.dig && r.dig.until <= s.absWeek) finishDig(s);
  if (s.season === 3 || s.absWeek < r.nextVisit) return;
  const w = world(s, 'visit', s.absWeek);
  const pool = VISIT_IDS.filter((id) => visitPossible(s, id));
  if (!pool.length) { r.nextVisit = s.absWeek + 2; return; }
  // Пряхин inspects his strip once a season; local people come more often than the peddler and the post
  const id = pool.includes('inspection') ? 'inspection' : pickWeighted(w, pool.map((x) => [x, VISITS[x].once ? 3 : 1] as [VisitId, number]));
  const v: RunVisit = { id, week: s.absWeek };
  if (id === 'peddler') {
    const left = RELIC_IDS.filter((x) => !r.relics.includes(x));
    v.relic = left[randInt(w, left.length)];
    v.price = Math.round((14 + randInt(w, 8)) * infl(s.year));
  }
  r.visit = v;
  r.seen.push(visitKey(s, id));
  r.nextVisit = s.absWeek + 2 + randInt(w, 3);
  feed(s, `К лагерю пришли: ${VISITS[id].name.toLowerCase()} (${VISITS[id].who}).`, 'info');
}
function finishDig(s: GameState) {
  const r = s.run!, d = r.dig!;
  delete r.dig;
  const t = tile(s, d.x, d.y);
  t.weeds = false; t.idle = 0; t.clean = 2;
  if (rand(world(s, 'dig', d.until)) < 0.5) {
    if (!r.relics.includes('bead')) { r.relics.push('bead'); feed(s, 'Археологи нашли скифскую бусину — и оставили её вам на счастье: +2 славы за каждый заказ.', 'good'); }
    else { addGlory(s, 5, `dig-${d.until}`); feed(s, 'Археологи нашли черепок с узором. Про ферму напишут в районной газете: слава +5.', 'good'); }
  } else {
    const pay = Math.round(5 * infl(s.year));
    s.money = round2(s.money + pay); s.earned = round2(s.earned + pay);
    feed(s, `Археологи ничего не нашли, засыпали шурф и оставили ${money(pay)} за беспокойство.`, 'info');
  }
}
const PRODUCE_SWEET: CropId[] = ['honey', ...BERRIES];
/** units of produce in the barn that no active order holds (only some kinds, if given) */
export const produceFree = (s: GameState, kinds: CropId[] = CROP_IDS) => kinds.reduce((a, c) => a + freeStock(s, c), 0);
function takeProduce(s: GameState, n: number, kinds: CropId[] = CROP_IDS) {
  let left = n;
  for (const c of [...kinds].sort((a, b) => freeStock(s, b) - freeStock(s, a))) {
    if (left <= 0) break;
    const q = Math.min(left, freeStock(s, c));
    if (q > 0) { takeStock(s, c, q); left -= q; }
  }
}
export interface VisitOption { label: string; note: string; problem: string | null }
/** the answers to the visitor at the camp this week, with what each one costs and brings */
export function visitOptions(s: GameState): VisitOption[] {
  const v = s.run?.visit;
  if (!v || v.week !== s.absWeek) return [];
  const k = infl(s.year), ch = VISITS[v.id].choices;
  const cash = (n: number) => (s.money >= n ? null : `Нужно ${money(n)}`);
  const goods = (n: number, kinds?: CropId[]) => (produceFree(s, kinds) >= n ? null : `Нужно ${n} ед. ${kinds ? 'мёда или ягод' : 'урожая'} на складе`);
  const opt = (i: number, note = ch[i].note, problem: string | null = null): VisitOption => ({ label: ch[i].label, note, problem });
  switch (v.id) {
    case 'archaeologists': return [opt(0, 'пустая грядка занята на 3 недели; в половине случаев — находка', digSpots(s).length ? null : 'Нет пустой грядки'), opt(1)];
    case 'shepherd': return [opt(0), opt(1, `+${money(Math.round(8 * k))}; молодые всходы теряют неделю роста`), opt(2)];
    case 'melonman': { const p = Math.round(12 * k); return [opt(0, `${money(p)}: карта арбуза с признаком «урожайный»`, cash(p)), opt(1)]; }
    case 'patrol': return [opt(0, ch[0].note, goods(4)), opt(1)];
    case 'hunter': { const p = Math.round(6 * k); return [opt(0, `${money(p)}: 3 недели медведь не подойдёт`, cash(p)), opt(1, ch[1].note, goods(4, PRODUCE_SWEET)), opt(2)]; }
    case 'geologist': return [opt(0, ch[0].note, goods(3)), opt(1)];
    case 'firefamily': { const p = Math.round(10 * k); return [opt(0, s.team.some((w) => w.id === 'mechanic') ? 'бригадир на 6 недель без зарплаты' : ch[0].note), opt(1, `${money(p)}: слава +5`, cash(p)), opt(2)]; }
    case 'pinecones': return [opt(0, `+${money(Math.round(12 * k))} сейчас; до зимы грибов вдвое меньше`), opt(1)];
    case 'peddler': return [opt(0, `${money(v.price!)}: «${RELICS[v.relic!].name}» — ${RELICS[v.relic!].text}`, cash(v.price!)), opt(1)];
    case 'postwoman': return [opt(0)];
    case 'inspection': return [opt(0), opt(1, ch[1].note, goods(2))];
  }
}
function answerVisit(s: GameState, v: RunVisit, choice: number) {
  const r = s.run!, k = infl(s.year), w = world(s, `answer|${v.id}`, v.week);
  const nibble = () => {
    let n = 0;
    for (const [t] of ownedTiles(s)) if (t.crop && !t.crop.rest && t.crop.grown < 2 && t.structure !== 'greenhouse') { t.crop.grown = Math.max(0, t.crop.grown - 1); n++; }
    return n;
  };
  const relic = (id: RelicId) => { if (!r.relics.includes(id)) r.relics.push(id); feed(s, `Находка: «${RELICS[id].name}» — ${RELICS[id].text}.`, 'good'); };
  switch (v.id) {
    case 'archaeologists':
      if (choice === 0) {
        const spots = shuffle(w, digSpots(s));
        const [x, y] = spots[0];
        r.dig = { x, y, until: s.absWeek + 3 };
        tile(s, x, y).weeds = false;
        feed(s, 'Даша размечает шурф колышками. Профессор рассказывает про скифов.', 'info');
      }
      break;
    case 'shepherd':
      if (choice === 0) {
        const empty = shuffle(w, ownedTiles(s).filter(([t]) => !t.crop && !t.structure && !t.canal && TERRAIN[t.terrain].plantable && t.soil < 5)).slice(0, 4);
        for (const [, x, y] of empty) soilUp(s, x, y, 1);
        const n = nibble();
        feed(s, `Отара прошла по полю: ${empty.length} ${plural(empty.length, 'грядка удобрена', 'грядки удобрены', 'грядок удобрено')}${n ? `, ${n} ${plural(n, 'росток объеден', 'ростка объедены', 'ростков объедены')}` : ''}.`, 'info');
      } else if (choice === 1) {
        const pay = Math.round(8 * k);
        s.money = round2(s.money + pay); s.earned = round2(s.earned + pay);
        const n = nibble();
        feed(s, `Чабан заплатил ${money(pay)} за выпас${n ? `; ${n} ${plural(n, 'росток объеден', 'ростка объедены', 'ростков объедены')}` : ''}.`, 'info');
      }
      break;
    case 'melonman':
      if (choice === 0) {
        spend(s, Math.round(12 * k), 'seeds');
        const c = addCard(s, 'seed_watermelon', { traits: ['yield'] });
        feed(s, `Петро Никифорович отсыпал «сахарных» семян${s.spare.includes(c) ? ' — колода полна, карта в запасе' : ''}.`, 'good');
      }
      break;
    case 'patrol':
      if (choice === 0) {
        takeProduce(s, 4);
        (r.calm ??= {}).boars = s.absWeek + 3;
        if (s.orgs.stanitsa) s.orgs.stanitsa.rel = relClamp(s.orgs.stanitsa.rel + 10);
        feed(s, 'Разъезд встал у поля: три недели кабанам сюда хода нет.', 'good');
      }
      break;
    case 'hunter':
      if (choice === 0) {
        spend(s, Math.round(6 * k), 'work');
        (r.calm ??= {}).bear = s.absWeek + 3;
        feed(s, 'Афанасьич с Пургой ночуют у ручья: три недели медведь не подойдёт.', 'good');
      } else if (choice === 1) {
        takeProduce(s, 4, PRODUCE_SWEET);
        relic('laika');
      }
      break;
    case 'geologist':
      if (choice === 0) { takeProduce(s, 3); relic('oldmap'); }
      break;
    case 'firefamily':
      if (choice === 0) {
        const id: WorkerId | null = !s.team.some((x) => x.id === 'mechanic') ? 'mechanic' : !s.team.some((x) => x.id === 'foreman') ? 'foreman' : null;
        if (id) { s.team.push({ id, level: 1, away: 0, leaves: s.absWeek + 6, free: true }); feed(s, `Николай Звягин работает у вас шесть недель (${WORKERS[id].title.toLowerCase()}), за кров и еду.`, 'good'); }
        else { addGlory(s, 5, `firefamily-${v.week}`); feed(s, 'Николай помог по хозяйству и ушёл искать работу. Слава +5.', 'good'); }
      } else if (choice === 1) {
        spend(s, Math.round(10 * k), 'work');
        addGlory(s, 5, `firefamily-${v.week}`);
        feed(s, 'Звягины ушли с деньгами на дорогу. Слава +5.', 'good');
      }
      break;
    case 'pinecones':
      if (choice === 0) {
        const pay = Math.round(12 * k);
        s.money = round2(s.money + pay); s.earned = round2(s.earned + pay);
        r.cones = s.yearStart + locOf(s).seasons.slice(0, 3).reduce((a, b) => a + b, 0) - 1;
        feed(s, `Шишкари заплатили ${money(pay)}. До зимы грибов в кедраче будет вдвое меньше.`, 'info');
      }
      break;
    case 'peddler':
      if (choice === 0) { spend(s, v.price!, 'work'); relic(v.relic!); }
      break;
    case 'postwoman': {
      const gift = randInt(w, 3);
      if (gift === 0) { const pay = Math.round(8 * k); s.money = round2(s.money + pay); s.earned = round2(s.earned + pay); feed(s, `Письмо из дома: соседи передали ${money(pay)} и банку варенья.`, 'good'); }
      else if (gift === 1) { s.discard.push({ uid: s.nextUid++, def: 'helpers', temp: true }); feed(s, 'Письмо из дома: «Пришлём помощников на недельку» — разовая карта «Помощники».', 'good'); }
      else { s.discard.push({ uid: s.nextUid++, def: 'compost', temp: true }); feed(s, 'Письмо из дома и мешок перегноя с родного двора — разовая карта компоста.', 'good'); }
      break;
    }
    case 'inspection': {
      const weeds = ownedTiles(s).filter(([t]) => t.weeds || treeStage(t) === 1).length;
      if (choice === 1) takeProduce(s, 2);
      const add = Math.min(0.3, weeds * (choice === 1 ? 0.025 : 0.05));
      if (add > 0) { r.surcharge = round2((r.surcharge ?? 0) + add); feed(s, `Пряхин насчитал ${weeds} ${plural(weeds, 'заросшую грядку', 'заросшие грядки', 'заросших грядок')}: следующая аренда +${Math.round(add * 100)}%.`, 'bad'); }
      else feed(s, 'Пряхин обошёл поле и ничего не сказал. Это и есть похвала.', 'good');
      break;
    }
  }
}

// ---------- folding an expedition (v3 §3.4) ----------
export const foldShare = (s: GameState) => (s.loc === 'rent' ? 0.7 : 0.5);
/** what folding the farm sends home: a share of (cash + the barn at the reseller's price − debts) */
export function foldValue(s: GameState) {
  const cash = round2(s.money);
  const stock = round2([...s.storage, ...s.yard].reduce((a, l) => a + l.qty * round2(priceOf(s, l.crop) * 0.6), 0));
  const debts = round2(outstanding(s) + s.carry);
  const share = foldShare(s);
  return { cash, stock, debts, share, total: Math.max(0, Math.round((cash + stock - debts) * share)) };
}
export const chainsDone = (s: GameState) => locOf(s).orgs.filter((o) => (s.orgs[o]?.step ?? 0) >= ORGS[o].steps.length).length;
/** finds to pick: one a year (up to four), one more for every finished story chain */
export const lootCount = (s: GameState) => Math.min(s.run?.autumns ?? 0, 4) + chainsDone(s);
export function lootOffers(s: GameState): LootId[] {
  const pool = lootOf(s.loc as ExpeditionId);
  const n = Math.min(pool.length, Math.max(3, lootCount(s) + 2));
  return shuffle(world(s, 'loot', s.absWeek), [...pool]).slice(0, n);
}
export function foldProblem(s: GameState): string | null {
  if (!s.run) return 'Это не вылазка';
  if (s.phase === 'shortfall') return 'Сначала решите вопрос с платежом';
  if (s.phase !== 'week') return 'Хозяйство уже закрыто';
  if (s.run.autumns < 1) return 'Свернуть можно после первого осеннего платежа';
  return null;
}
function carriedCards(s: GameState): Card[] {
  const all = [...deckList(s), ...s.spare, ...s.projects.flatMap((p) => (p.kind === 'cell' || p.kind === 'trait' ? [p.card] : []))];
  return s.run!.carried.uids.map((u) => all.find((c) => c.uid === u)).filter((c): c is Card => !!c).map((c) => { const k = clone(c); delete k.keep; return k; });
}
function runResult(s: GameState, loot: LootId[], bankrupt: boolean): RunResult {
  const id = s.run!.carried.worker, w = id ? s.team.find((x) => x.id === id) : undefined;
  return {
    cash: bankrupt ? 0 : foldValue(s).total,
    loot,
    mats: bankrupt ? {} : { ...(s.mats ?? {}) },
    cards: carriedCards(s),
    ...(w ? { worker: { id: w.id, level: w.level, away: 0 } } : {}),
    bankrupt,
  };
}
const worstLoot = (s: GameState): LootId => [...lootOffers(s)].sort((a, b) => LOOT[a].value - LOOT[b].value)[0];

// ---------- the home farm: arrest and waking up (v3 §3.3) ----------
/** a mortgaged home went bankrupt and its farmer goes to work the debt off: the house is under arrest */
export function startArrest(state: GameState): GameState {
  if (state.phase !== 'gameover' || !state.over?.work) fail('Арест возможен только после банкротства дома в залоге');
  const s = clone(state);
  s.arrest = { debt: state.over!.work!, runs: 2 };
  s.phase = 'arrest';
  s.money = 0;
  s.due = null;
  s.over = null;
  feed(s, `Дом под арестом: долг банку ${money(s.arrest.debt)}. Две вылазки, чтобы его закрыть.`, 'bad');
  return s;
}
/** the debt is paid: the farm wakes in the spring of the next year; the field is empty but for perennials, the barn
 *  was sold by the bank, the year of the arrest does not count on the ladder */
export function wakeHome(state: GameState): GameState {
  const s = clone(state);
  delete s.arrest;
  s.phase = 'week'; s.due = null; s.over = null; s.carry = 0;
  s.storage = []; s.yard = [];
  for (const t of s.tiles) {
    if (t.crop && !CROPS[t.crop.id].perennial) t.crop = null;
    else if (t.crop) { t.crop.rest = true; t.crop.grown = 0; t.crop.regrowing = true; }
    t.weeds = false; t.idle = 0;
  }
  s.strikes = []; s.crows = null; s.thieves = null; s.guards = [];
  s.skipYears = (s.skipYears ?? 0) + 1;
  s.week = yearLen(s);
  s.season = 3;
  startWeek(s);
  feed(s, 'Долг закрыт, арест снят. Хозяйство просыпается весной.', 'good');
  settle(s);
  return s;
}
/** cards coming back from an expedition: into the deck while it has room, then among the spare cards */
export function returnCards(s: GameState, cards: Card[]) {
  for (const c of cards) {
    const card: Card = { ...clone(c), uid: s.nextUid++ };
    delete card.keep;
    if (card.temp) continue;
    if (deckCount(s) < deckLimit(s)) s.discard.push(card); else s.spare.push(card);
  }
}
export { feed as note, soilUp as raiseSoil, addGlory as gainGlory };

// ---------- actions ----------
export type Action =
  | { t: 'play'; uid: number; tiles?: [number, number][]; row?: number; col?: number }
  | { t: 'endWeek' }
  | { t: 'guide'; lesson: 'rotate' | 'off' }
  | { t: 'drawCard' }
  | { t: 'discardCard'; uid: number }
  | { t: 'exchangeCard'; uid: number }
  | { t: 'compostCard'; uid: number }
  | { t: 'claimCompost'; uid?: number }
  | { t: 'waterHand'; tiles: [number, number][] }
  | { t: 'weed'; x: number; y: number }
  | { t: 'guard'; x: number; y: number }
  | { t: 'shoo' }
  | { t: 'droneCrows' }
  | { t: 'talkKids' }
  | { t: 'plow'; x: number; y: number }
  | { t: 'clear'; x: number; y: number }
  | { t: 'buyLand'; x: number; y: number }
  | { t: 'build'; item: BuildItem; x: number; y: number }
  | { t: 'unbuild'; item: BuildItem; x: number; y: number }
  | { t: 'sell'; crop: CropId; qty: number; allowReserved?: boolean }
  | { t: 'moveBuild'; item: BuildItem; from: [number, number]; to: [number, number] }
  | { t: 'buyCard'; def: string }
  | { t: 'deckOut'; uid: number }
  | { t: 'deckIn'; uid: number }
  | { t: 'track'; track: TrackId }
  | { t: 'helpBuild'; track: TrackId }
  | { t: 'fell'; x: number; y: number }
  | { t: 'fairBuy'; id: number }
  | { t: 'fairHold'; id: number }
  | { t: 'labCell'; uid: number; cell: [number, number] }
  | { t: 'labTrait'; uid: number; trait: TraitId }
  | { t: 'labVariety'; crop: CropId }
  | { t: 'labBio' }
  | { t: 'hire'; id: WorkerId }
  | { t: 'fire'; id: WorkerId }
  | { t: 'train'; id: WorkerId }
  | { t: 'accept'; org: OrgId }
  | { t: 'deliver'; org: OrgId }
  | { t: 'borrow'; amount: number }
  | { t: 'repay'; id: number; amount: number }
  | { t: 'insure' }
  | { t: 'pay' }
  | { t: 'emergency' }
  | { t: 'restructure' }
  | { t: 'lightFires' }
  | { t: 'giveUp' }
  | { t: 'answer'; choice: number }
  | { t: 'fold'; picks: LootId[] }
  | { t: 'buyout' }
  | { t: 'seize' }
  | { t: 'yardBuild'; yard: YardId }
  | { t: 'commonBuild'; id: CommonId }
  | { t: 'yardSwap'; yard: YardId; crop: CropId; card?: ZinaCard }
  | { t: 'yardHelp'; yard: YardId }
  | { t: 'forge'; track: TrackId };

const ANY_PHASE: Action['t'][] = ['guide', 'pay', 'emergency', 'restructure', 'giveUp', 'seize', 'sell', 'borrow', 'repay', 'deliver'];
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const cellOk = (x: unknown, y: unknown) => isInt(x) && isInt(y) && inGrid(x, y);
// every card the farm owns (also those in the lab), by uid
const findDeckCard = (s: GameState, uid: number) => [...s.hand, ...s.draw, ...s.discard, ...s.spare].find((c) => c.uid === uid);
function removeCard(s: GameState, uid: number): Card {
  for (const k of ['hand', 'draw', 'discard', 'spare'] as const) {
    const i = s[k].findIndex((c) => c.uid === uid);
    if (i >= 0) return s[k].splice(i, 1)[0];
  }
  return fail('Карта не найдена');
}
const useExchange = (s: GameState) => {
  needDay(s, exchangeDays(s));
  s.exchanges = exchangesUsed(s) + 1;
  s.exchangeWeek = s.absWeek;
};
const needDay = (s: GameState, n = 1) => {
  if (s.days < n) fail(n === 1 ? 'Нужен рабочий день' : `Нужно ${n} ${plural(n, 'рабочий день', 'рабочих дня', 'рабочих дней')}`);
  s.days -= n;
};
const spend = (s: GameState, amount: number, stat?: keyof Stats) => {
  if (s.money < amount - 1e-9) fail(`Нужно ${money(amount)}`);
  s.money = round2(s.money - amount);
  if (stat) (s.stats[stat] as number) = round2((s.stats[stat] as number) + amount);
};

function learn(before: GameState, after: GameState, a: Action) {
  if(!after.guide)return;
  const mark=(id:string)=>{if(!after.guide!.includes(id))after.guide!.push(id);};
  if(a.t==='play') {const c=before.hand.find(c=>c.uid===a.uid);if(c){if(isSeed(c.def))mark('plant');if(c.def==='water')mark('water');if(['compost','bio'].includes(c.def))mark('soil');}}
  if(a.t==='waterHand')mark('water');if(a.t==='sell')mark('sale');if(a.t==='accept')mark('order');if(a.t==='deliver')mark('delivery');
  if(after.stats.harvested>before.stats.harvested)mark('harvest');if(after.stats.payments>before.stats.payments)mark('payment');
}
function markLateBorrow(s: GameState) {
  if(!s.shortfallBorrowed) { s.rating=Math.max(0,s.rating-1); s.cleanSeasons=0; s.incident=true; s.shortfallBorrowed=true; feed(s,'Кредит после срока платежа: рейтинг −1.','bad'); }
}
export function apply(state: GameState, a: Action): GameState {
  if (!a || typeof a !== 'object') fail('Неизвестное действие');
  if (state.phase === 'gameover') fail('Партия окончена');
  if (state.phase === 'arrest') fail('Дом под арестом: долг гасят на вылазке');
  if (state.phase === 'shortfall' && !ANY_PHASE.includes(a.t)) fail('Вы не можете это сделать, не решив вопрос с платежом');
  if (a.t === 'endWeek') { const next=endWeek(state); learn(state,next,a); return next; }
  const s = clone(state);
  fillV3(s);
  switch (a.t) {
    case 'guide':
      if(a.lesson==='off') delete s.guide;
      else if(s.guide && !s.guide.includes('rotate')) s.guide.push('rotate');
      break;
    case 'play':
      playCard(s, a.uid, a.tiles ?? [], a.row, a.col);
      break;
    case 'drawCard': {
      const why = drawProblem(s);
      if (why) fail(why);
      s.days -= 1;
      drawCards(s, 1);
      break;
    }
    case 'exchangeCard': {
      const why=exchangeProblem(s,a.uid); if(why) fail(why);
      const i=s.hand.findIndex(c=>c.uid===a.uid), [out]=s.hand.splice(i,1);
      useExchange(s);
      // Draw before discarding: the exchanged card cannot immediately come back.
      const identity=exchangeIdentity(out);
      let pile=s.draw, choices=pile.filter(c=>exchangeIdentity(c)!==identity);
      if(!choices.length){pile=s.discard;choices=pile.filter(c=>exchangeIdentity(c)!==identity);}
      if(choices.length) {
        // Preserve the draw order; a discard-only alternative is chosen deterministically at random.
        const replacement=pile===s.draw?choices[choices.length-1]:choices[randInt(s,choices.length)];
        // CAL-06 · a card coming back from the piles is not «put aside» any more (drawCards clears it too)
        pile.splice(pile.findIndex(c=>c.uid===replacement.uid),1);delete replacement.keep;s.hand.push(replacement);
      } else drawCards(s,1);
      if(!out.temp) { delete out.keep; s.discard.push(out); }
      break;
    }
    case 'compostCard': {
      const why=compostProblem(s,a.uid); if(why) fail(why);
      useExchange(s);
      for (const c of s.hand.splice(s.hand.findIndex(c=>c.uid===a.uid),1)) { delete c.keep; s.discard.push(c); }
      s.compostTick=Math.min(compostWeeks(s),s.compostTick+1);
      s.compostReady=s.compostTick>=compostWeeks(s);
      break;
    }
    case 'claimCompost': {
      if(lvl(s,'compost')<1 || !s.compostReady) fail('Компост ещё созревает');
      if(s.hand.length>=handMax(s)) {
        // A full hand gives up one card of the player's choice for the compost.
        const i=a.uid===undefined?-1:s.hand.findIndex(c=>c.uid===a.uid);
        if(i<0) fail('Освободите место в руке или выберите карту на замену. Компост останется в яме');
        const [out]=s.hand.splice(i,1); if(!out.temp) { delete out.keep; s.discard.push(out); }
      }
      deliverTemporary(s,'compost'); s.compostReady=false; s.compostTick=0;
      break;
    }
    case 'discardCard': {
      // a working day; a one-off card is simply used up
      const i = s.hand.findIndex((c) => c.uid === a.uid);
      if (i < 0) fail('Карты нет в руке');
      needDay(s);
      for (const c of s.hand.splice(i, 1)) { delete c.keep; if (!c.temp) s.discard.push(c); }
      break;
    }
    case 'waterHand': {
      // CRD-03 · malformed input is refused with a game message, never a crash
      const given: unknown[] = Array.isArray(a.tiles) ? a.tiles : [];
      const valid = given.filter((c): c is [number, number] => Array.isArray(c) && c.length === 2 && cellOk(c[0], c[1]));
      const cells = [...new Map(valid.map((c) => [`${c[0]},${c[1]}`, c] as const)).values()];
      if (!cells.length || cells.length > handWaterMax(s)) fail(`Полить можно до ${handWaterMax(s)} грядок`);
      const line = cells.every(([x]) => x === cells[0][0]) || cells.every(([, y]) => y === cells[0][1]);
      const span = Math.max(...cells.map(([x, y]) => x + y)) - Math.min(...cells.map(([x, y]) => x + y));
      if (cells.length > 1 && (!line || span !== cells.length - 1)) fail('Грядки должны идти подряд в одну линию');
      if (!cells.every(([x, y]) => tile(s, x, y).owned && winterCareTarget(s, x, y))) fail('Поливать можно свою землю; зимой — только отапливаемую теплицу');
      if (!cells.some(([x,y]) => tile(s,x,y).moisture < 3)) fail('Эти грядки уже политы');
      needDay(s);
      for (const [x, y] of cells) tile(s, x, y).moisture = Math.min(3, tile(s, x, y).moisture + 2);
      break;
    }
    case 'weed': {
      if (!cellOk(a.x, a.y)) fail('Клетка вне поля');
      const t = tile(s, a.x, a.y);
      if (!t.owned || !t.weeds) fail('Здесь нет сорняков');
      needDay(s);
      t.weeds = false;
      t.idle = 0;
      t.clean = 4;
      break;
    }
    case 'guard': {
      if (!cellOk(a.x, a.y)) fail('Клетка вне поля');
      if (!guardable(s, a.x, a.y)) fail('Этой грядке на этой неделе ничего не грозит');
      const p = guardPrice(s);
      if (s.money < p) fail(`Нужно ${money(p)}`);
      needDay(s);
      spend(s, p, 'work');
      s.guards.push([a.x, a.y]);
      break;
    }
    case 'shoo':
      if (!crowsOpen(s)) fail('Ворон на поле нет');
      needDay(s);
      s.crows!.shoo = true;
      feed(s, 'Ворон отогнали.', 'good');
      break;
    case 'droneCrows':
      if (!crowsOpen(s)) fail('Ворон на поле нет');
      if (sortiesPerSeason(s) - s.dronesUsed <= 0) fail('Дрону нечем лететь');
      s.dronesUsed += 1;
      s.crows!.drone = true;
      break;
    case 'talkKids': {
      if (!s.thieves || s.thieves.week !== s.absWeek || s.thieves.talked) fail('Говорить не с кем');
      needDay(s);
      s.thieves.talked = true;
      const o = locOf(s).orgs.find((x) => ORGS[x].mischief === 'thieves');
      if (o && s.orgs[o]) s.orgs[o]!.rel = relClamp(s.orgs[o]!.rel + 8);
      feed(s, 'Поговорил с ребятами и угостил их — сегодня в огород не полезут.', 'good');
      break;
    }
    case 'plow': {
      if (!cellOk(a.x, a.y)) fail('Клетка вне поля');
      const p = tile(s, a.x, a.y).crop;
      if (!p || !CROPS[p.id].sidereal) fail('Запахать можно озимую рожь');
      if (p.grown < 2) fail('Рожь ещё не набрала зелёную массу (нужно 2 недели роста)');
      if (s.season === 3) fail('Зимой земля промёрзла');
      needDay(s);
      for (const [x, y] of pidCells(s, p.pid)) {
        tile(s, x, y).crop = null;
        soilUp(s, x, y, 1);
      }
      feed(s, 'Рожь запахана: почва ожила.', 'good');
      break;
    }
    case 'clear': {
      if (!cellOk(a.x, a.y)) fail('Клетка вне поля');
      if (!canClear(s, a.x, a.y)) fail('Здесь нечего расчищать');
      const t = tile(s, a.x, a.y);
      const p = clearPrice(s, a.x, a.y);
      if (s.money < p) fail(`Нужно ${money(p)}`);
      needDay(s, clearDays(s, a.x, a.y));
      spend(s, p, 'land');
      if (t.terrain === 'forest') {
        t.owned = true;
        t.soil = 4;
        t.moisture = 2;
        t.cleared = true;
        const angry = locOf(s).orgs.includes('forestry') && (s.orgs.forestry?.rel ?? 0) < 0 && !s.certs.includes('Разрешение лесхоза');
        if (angry && s.orgs.forestry) s.orgs.forestry.rel = relClamp(s.orgs.forestry.rel - 5);
        addMats(s, { logs: CLEAR_LOGS });
        feed(s, `Раскорчёвана клетка тайги за ${money(p)}: под ней жирная почва, в сарае +${CLEAR_LOGS} ${plural(CLEAR_LOGS, 'бревно', 'бревна', 'брёвен')}.${angry ? ' Лесхоз недоволен.' : ''}`, 'good');
      } else if (t.terrain === 'rock') {
        // v3 §4.5 · the stones go to the shed for foundations (they count as bricks); the soil under them stays
        addMats(s, { bricks: STONE_BRICKS });
        feed(s, `Камни убраны за ${money(p)}: +${STONE_BRICKS} камня на фундамент (в счёт кирпича).`, 'good');
      } else {
        t.moisture = 3;
        t.soil = 3;
        feed(s, `Болото осушено за ${money(p)}.`, 'good');
      }
      t.terrain = 'plain';
      break;
    }
    case 'fell': {
      if (!cellOk(a.x, a.y)) fail('Клетка вне поля');
      const why = fellProblem(s, a.x, a.y);
      if (why) fail(why);
      const t = tile(s, a.x, a.y);
      const st = treeStage(t);
      needDay(s);
      if (st === 1) {
        delete t.tree;
        feed(s, 'Поросль выдернута.', 'info');
      } else if (st === 2) {
        delete t.tree;
        addMats(s, { logs: FELL_LOGS[2] });
        feed(s, `Срубили молодое дерево: +${FELL_LOGS[2]} бревна.`, 'good');
      } else {
        t.chop = (t.chop ?? 0) + 1;
        if (t.chop >= chopDays(s)) {
          delete t.tree;
          delete t.chop;
          addMats(s, { logs: FELL_LOGS[3] });
          soilUp(s, a.x, a.y, 1);
          feed(s, `Дерево выкорчевано: +${FELL_LOGS[3]} брёвен, под ним лесная почва.`, 'good');
        } else feed(s, `Корчуем дерево: ${t.chop} из ${chopDays(s)} дней.`, 'info');
      }
      if (t.tree === undefined) { t.idle = 0; t.clean = Math.max(t.clean, 2); }
      break;
    }
    case 'fairBuy': {
      const l = s.fair?.lots.find((x) => x.id === a.id);
      const why = fairBuyProblem(s, l);
      if (why) fail(why);
      const lot = l!;
      spend(s, fairPayNow(lot), 'build');
      if (lot.kind === 'equip') {
        s.levels[lot.track!] = Math.max(lvl(s, lot.track!), lot.level!);
        feed(s, `Куплено на ярмарке: ${lotName(lot)} — ${TRACKS[lot.track!].levels[lot.level! - 1].text}.`, 'good');
      } else if (lot.kind === 'mat') {
        addMats(s, lot.mats!);
        feed(s, `Куплено на ярмарке: ${lotName(lot)}.`, 'good');
      } else {
        const id = lot.worker!;
        s.team.push({ id, level: lot.wlevel ?? 1, away: 0 });
        s.candidates = s.candidates.filter((x) => x !== id);
        s.freeHire = s.freeHire.filter((x) => x !== id);
        feed(s, `${WORKERS[id].name} теперь работает на ферме (${WORKERS[id].title.toLowerCase()}).`, 'good');
      }
      lot.sold = 'player';
      delete lot.hold;
      if (s.fair!.eye === lot.id) s.fair!.eye = null;
      break;
    }
    case 'fairHold': {
      const l = s.fair?.lots.find((x) => x.id === a.id);
      const why = fairHoldProblem(s, l);
      if (why) fail(why);
      const lot = l!;
      const d = fairDeposit(lot);
      spend(s, d, 'build');
      lot.hold = s.absWeek + 1;
      lot.deposit = d;
      if (s.fair!.eye === lot.id) s.fair!.eye = null;
      feed(s, `Задаток ${money(d)}: «${lotName(lot)}» ждёт вас до конца следующей недели.`, 'info');
      break;
    }
    case 'buyLand': {
      if (!cellOk(a.x, a.y)) fail('Клетка вне поля');
      if (!canBuyLand(s, a.x, a.y)) fail('Купить можно только участок рядом со своим полем');
      const p = landPrice(s);
      spend(s, p, 'land');
      s.bought += 1;
      const t = tile(s, a.x, a.y);
      t.owned = true;
      t.moisture = 1;
      feed(s, `Куплен участок за ${money(p)}.`, 'info');
      break;
    }
    case 'build':
      build(s, a.item, a.x, a.y);
      break;
    case 'lightFires': {
      const why = lightFiresProblem(s);
      if (why) fail(why);
      const cost = firewoodCost(s);
      needDay(s, fireLightDays(s));
      spend(s, cost, 'work');
      s.firesLit = s.absWeek;
      feed(s, `Разожгли костры на ночь: ${firePits(s).length} ${plural(firePits(s).length, 'кострище', 'кострища', 'кострищ')}, дрова ${money(cost)}.`, 'info');
      break;
    }
    case 'unbuild':
      unbuild(s, a.item, a.x, a.y);
      break;
    case 'moveBuild':
      if (!Array.isArray(a.from) || !Array.isArray(a.to) || !cellOk(...a.from) || !cellOk(...a.to)) fail('Клетка вне поля');
      // UP-05 · a «move» onto its own cell would only reset the week a greenhouse or hive needs to settle
      if (a.item === 'drip' ? a.from[1] === a.to[1] : a.from[0] === a.to[0] && a.from[1] === a.to[1]) fail('Постройка уже стоит здесь');
      unbuild(s, a.item, ...a.from);
      build(s, a.item, ...a.to);
      break;
    case 'sell': {
      if (!Object.prototype.hasOwnProperty.call(CROPS, a.crop)) fail('Нет такой культуры');
      const qty = Math.min(Math.floor(a.qty), a.allowReserved ? stockOf(s, a.crop) : freeStock(s, a.crop));
      if (!(qty > 0)) fail('Нечего продавать');
      const v = round2(qty * marketPrice(s, a.crop));
      takeStock(s, a.crop, qty);
      s.money = round2(s.money + v);
      s.stats.sales = round2(s.stats.sales + v);
      s.earned = round2(s.earned + v);
      break;
    }
    case 'buyCard': {
      if (!shopCards(s).includes(a.def)) fail('Этого в лавке нет');
      spend(s, cardShopPrice(s, a.def), 'work');
      const c = addCard(s, a.def);
      feed(s, `Куплена карта «${CARDS[a.def].name}»${s.spare.includes(c) ? ' — колода полна, она в запасе' : ''}.`, 'info');
      break;
    }
    case 'deckOut': {
      if (s.season !== 3) fail('Колоду перебирают зимой');
      if(!deckList(s).some(c=>c.uid===a.uid)) fail('Карты нет в колоде');
      if (!findDeckCard(s, a.uid)?.temp && deckCount(s) <= DECK_MIN) fail(`В колоде должно остаться хотя бы ${DECK_MIN} карт`);
      const c = removeCard(s, a.uid);
      if (c.temp) {
        feed(s, `«${CARDS[c.def].name}» убрана из колоды.`, 'info');
        break;
      }
      s.spare.push(c);
      break;
    }
    case 'deckIn': {
      if (s.season !== 3) fail('Колоду перебирают зимой');
      if (deckCount(s) >= deckLimit(s)) fail(`Колода полна: ${deckLimit(s)} карт`);
      const i = s.spare.findIndex((c) => c.uid === a.uid);
      if (i < 0) fail('Такой карты в запасе нет');
      s.discard.push(...s.spare.splice(i, 1));
      break;
    }
    case 'track': {
      if (!Object.prototype.hasOwnProperty.call(TRACKS, a.track)) fail('Нет такой постройки');
      if (!trackAvailable(s, a.track)) fail('Здесь такого нет');
      const why = trackProblem(s, a.track);
      if (why) fail(why);
      const level = lvl(s, a.track) + 1;
      spend(s, trackCost(s, a.track, level), 'build');
      for (const [k, n] of matsList(trackMats(s, a.track, level))) s.mats![k] -= n;
      const weeks = trackWeeks(s, a.track, level);
      s.projects.push({ kind: 'track', track: a.track, level, weeks, total: weeks });
      feed(s, `Началась стройка: ${trackLevels(s, a.track)[level - 1].name}, ${weeks} ${plural(weeks, 'неделя', 'недели', 'недель')}.`, 'info');
      break;
    }
    case 'yardBuild': {
      const why = yardProblem(s, a.yard);
      if (why) fail(why);
      const stage = yardStage(s, a.yard) + 1;
      const st = YARDS[a.yard].stages[stage - 1];
      spend(s, yardCost(s, a.yard, stage), 'build');
      for (const [k, n] of matsList(st.mat)) s.mats![k] -= n;
      if (st.crop) takeCropNeed(s, st.crop.crops, st.crop.qty);
      const weeks = yardWeeks(s, a.yard, stage);
      s.projects.push({ kind: 'yard', yard: a.yard, stage, weeks, total: weeks });
      feed(s, `${YARDS[a.yard].name}: начали «${st.name}», ${weeks} ${plural(weeks, 'неделя', 'недели', 'недель')}.`, 'info');
      break;
    }
    case 'commonBuild': {
      const why = commonProblem(s, a.id);
      if (why) fail(why);
      spend(s, commonCost(s, a.id), 'build');
      for (const [k, n] of matsList(COMMONS[a.id].mat)) s.mats![k] -= n;
      const weeks = commonWeeks(s, a.id);
      s.projects.push({ kind: 'common', id: a.id, weeks, total: weeks });
      feed(s, `Толока: всей деревней строим «${COMMONS[a.id].name}», ${weeks} ${plural(weeks, 'неделя', 'недели', 'недель')}.`, 'info');
      break;
    }
    case 'yardSwap': {
      if (!Object.hasOwn(YARDS, a.yard)) fail('Нет такого соседа');
      if (!CROP_IDS.includes(a.crop)) fail('Нет такой культуры');
      const why = swapProblem(s, a.yard, a.crop);
      if (why) fail(why);
      if (a.yard === 'zina' && !ZINA_CARDS.includes(a.card as ZinaCard)) fail('Выберите карту');
      const key = swapKey(s, a.yard);
      takeStock(s, a.crop, YARDS[a.yard].swap.take.qty);
      let got = '';
      if (a.yard === 'zina') { deliverTemporary(s, a.card!); got = `карта «${CARDS[a.card!].name}» в руку`; }
      else if (a.yard === 'savva') { addMats(s, { bricks: 5 }); got = '5 кирпичей'; }
      else if (a.yard === 'efim') { const n = yardStage(s, 'efim') >= 2 ? 6 : 4; addMats(s, { logs: n }); got = `${n} брёвен`; }
      else if (a.yard === 'miller') {
        const cash = round2(YARDS.miller.swap.take.qty * priceOf(s, a.crop) * 1.4);
        s.money = round2(s.money + cash); s.earned = round2(s.earned + cash); s.stats.sales = round2(s.stats.sales + cash);
        got = `мука, +${money(cash)}`;
      } else { deliverTemporary(s, 'helpers'); got = 'карта «Помощь соседей» в руку'; }
      (s.yards![a.yard] ??= { stage: yardStage(s, a.yard) }).swap = key;
      feed(s, `${YARDS[a.yard].name}: ${YARDS[a.yard].swap.take.qty} ед. «${CROPS[a.crop].name}» — ${got}.`, 'good');
      break;
    }
    case 'yardHelp': {
      if (!Object.hasOwn(YARDS, a.yard)) fail('Нет такого соседа');
      const why = yardHelpProblem(s, a.yard);
      if (why) fail(why);
      s.yards![a.yard]!.help = seasonKey(s);
      s.days += 1;
      feed(s, `${YARDS[a.yard].name} пришли подсобить: +1 рабочий день на этой неделе.`, 'good');
      break;
    }
    case 'forge': {
      if (!Object.prototype.hasOwnProperty.call(TRACKS, a.track)) fail('Нет такой линии');
      const why = forgeProblem(s, a.track);
      if (why) fail(why);
      const o = forgeOffer(s, a.track)!;
      spend(s, o.price, 'build');
      s.forge = { track: a.track, level: o.level, week: s.absWeek + FORGE_WEEKS, price: o.price };
      feed(s, `Савва взялся ковать: ${TRACKS[a.track].levels[o.level - 1].name}, ${FORGE_WEEKS} недели.`, 'info');
      break;
    }
    case 'helpBuild': {
      if (!Object.prototype.hasOwnProperty.call(TRACKS, a.track)) fail('Нет такой постройки');
      const why = helpProblem(s, a.track);
      if (why) fail(why);
      needDay(s);
      const p = s.projects.find((x) => x.kind === 'track' && x.track === a.track)!;
      p.weeks = round2(p.weeks - 1);
      s.helpWeek = s.absWeek;
      feed(s, `Помогли на стройке: «${trackLevels(s, a.track)[(p as { level: number }).level - 1].name}» на неделю ближе.`, 'good');
      break;
    }
    case 'labCell': {
      const why = labProblem(s);
      if (why) fail(why);
      const c = findDeckCard(s, a.uid);
      if (!c || !isSeed(c.def)) fail('Выбери карту семян');
      { const lim = cellLimit(s, c!); if (lim) fail(lim); }
      // Selecting a hand card explicitly transfers that UID into the project.
      if (!Array.isArray(a.cell) || !upgradeSpots(s, c!).some(([x, y]) => x === a.cell[0] && y === a.cell[1])) fail('Сюда клетку не добавить');
      // PSV-018 · never charge for a shape that has no possible place in this region
      if (!spotFits(s, c!, [a.cell[0], a.cell[1]])) fail('Такой фигуре в этом регионе негде расти');
      spend(s, cellPrice(s, c!), 'build');
      const origin = s.spare.some((c) => c.uid === a.uid) ? 'spare' as const : 'deck' as const;
      const weeks = labWeeksFor(s, 'cell', c!);
      const card = removeCard(s, a.uid);
      s.projects.push({ kind: 'cell', card, origin, cell: [a.cell[0], a.cell[1]], weeks, total: weeks });
      break;
    }
    case 'labTrait': {
      const why = labProblem(s);
      if (why) fail(why);
      const c = findDeckCard(s, a.uid);
      if (!c || !isSeed(c.def)) fail('Выбери карту семян');
      // Selecting a hand card explicitly transfers that UID into the project.
      if (!Object.prototype.hasOwnProperty.call(TRAITS, a.trait)) fail('Нет такого признака');
      if ((c!.traits ?? []).includes(a.trait)) fail('Этот признак уже есть');
      { const lim = traitLimit(s, c!); if (lim) fail(lim); }
      spend(s, traitPrice(s, c!), 'build');
      const origin = s.spare.some((c) => c.uid === a.uid) ? 'spare' as const : 'deck' as const;
      const card = removeCard(s, a.uid);
      const weeks = labWeeksFor(s, 'trait');
      s.projects.push({ kind: 'trait', card, origin, trait: a.trait, weeks, total: weeks });
      break;
    }
    case 'labVariety': {
      const why = labProblem(s);
      if (why) fail(why);
      if (!labCrops(s).includes(a.crop)) fail('Этот сорт здесь не вывести');
      { const why2 = varietyProblem(s); if (why2) fail(why2); }
      if (s.projects.some((p) => p.kind === 'variety' && p.crop === a.crop)) fail('Уже выводится');
      spend(s, varietyPrice(s), 'build');
      const weeks = labWeeksFor(s, 'variety');
      s.projects.push({ kind: 'variety', crop: a.crop, weeks, total: weeks });
      break;
    }
    case 'labBio': {
      const why = labProblem(s);
      if (why) fail(why);
      spend(s, bioPrice(s), 'build');
      const weeks = labWeeksFor(s, 'bio');
      s.projects.push({ kind: 'bio', weeks, total: weeks });
      break;
    }
    case 'hire': {
      if (!WORKERS[a.id]) fail('Нет такого работника');
      if (!s.candidates.includes(a.id)) fail('Этого человека нет среди кандидатов');
      if (s.team.some((w) => w.id === a.id)) fail('Уже в команде');
      if (s.away?.worker?.id === a.id) fail('Этот работник уехал с обозом');
      if (bedsUsed(s) >= workerSlots(s)) fail('Все места в доме заняты: нужен дом побольше');
      spend(s, hirePrice(s, a.id), 'build');
      s.team.push({ id: a.id, level: 1, away: 0 });
      s.candidates = s.candidates.filter((x) => x !== a.id);
      s.freeHire = s.freeHire.filter((x) => x !== a.id);
      feed(s, `${WORKERS[a.id].name} теперь работает на ферме (${WORKERS[a.id].title.toLowerCase()}).`, 'good');
      break;
    }
    case 'fire':
      if (!s.team.some((w) => w.id === a.id)) fail('Такого работника нет');
      s.team = s.team.filter((w) => w.id !== a.id);
      break;
    case 'train': {
      const w = s.team.find((x) => x.id === a.id);
      if (!w) fail('Такого работника нет');
      if (w!.level >= 3) fail('Уже мастер своего дела');
      if (w!.away > 0) fail('Уже на учёбе');
      spend(s, trainPrice(s, a.id), 'build');
      w!.away = trainWeeks(s, a.id);
      feed(s, `${WORKERS[a.id].name} уехал на учёбу на ${w!.away} ${plural(w!.away, 'неделю', 'недели', 'недель')}.`, 'info');
      break;
    }
    case 'accept': {
      const why = acceptProblem(s, a.org);
      if (why) fail(why);
      const st = s.orgs[a.org]!;
      st.active = { ...st.offer!, deadline: offerDeadline(s,st.offer!) };
      st.offer = null;
      st.idle = 0;
      break;
    }
    case 'deliver': {
      const why = deliverProblem(s, a.org);
      if (why) fail(why);
      const st = s.orgs[a.org]!;
      const q = st.active!;
      for (const l of q.lines) takeStock(s, l.crop, l.qty);
      // v3 §7 · with the mill's granary the bakery and the council get flour for their grain, and pay for it
      const flour = millFlour(s, q);
      const pay = round2(q.pay * (wlvl(s, 'marketer') >= 3 ? 1.1 : 1) * (flour ? 1.3 : 1));
      s.money = round2(s.money + pay);
      s.stats.orders = round2(s.stats.orders + pay);
      s.earned = round2(s.earned + pay);
      st.rel = relClamp(st.rel + q.rel);
      st.active = null;
      st.wait = 1;
      const chain = q.step < ORGS[a.org].steps.length;
      if (hasRelic(s, 'bead')) addGlory(s, 2, `bead-${a.org}-${q.id}`);
      let bonus = 0;
      if (chain) {
        st.step += 1;
        addGlory(s, 10, `quest-${a.org}-${q.step}`);
        if (q.reward) bonus = grant(s, q.reward, `${s.seed}|${s.loc}|${a.org}|${q.step}`);
        if (st.step === ORGS[a.org].steps.length) addGlory(s, 25, `chain-${a.org}`);
      }
      feed(s, `${ORGS[a.org].short}: заказ сдан${flour ? ' мукой с мельницы' : ''}, +${money(pay)}${bonus ? ` и премия +${money(bonus)}` : ''}.`, 'good');
      break;
    }
    case 'borrow': {
      const amount = Math.floor(a.amount);
      if (!(amount > 0) || amount > creditLimit(s)) fail('Столько банк не даст');
      s.loans.push({ id: s.nextLoanId++, principal: amount, rate: loanRate(s) });
      s.money = round2(s.money + amount);
      feed(s, `Кредит ${money(amount)} под ${fmt(loanRate(s) * 100)}% в неделю.`, 'info');
      if(s.phase==='shortfall') markLateBorrow(s);
      break;
    }
    case 'repay': {
      const loan = s.loans.find((l) => l.id === a.id);
      if (!loan) fail('Кредит не найден');
      const amount = round2(Math.min(a.amount, loan!.principal, s.money));
      if (!(amount > 0)) fail('На счёте нет денег');
      loan!.principal = round2(loan!.principal - amount);
      s.money = round2(s.money - amount);
      break;
    }
    case 'insure': {
      if (s.insurance >= 2) fail('Уже две страховки');
      spend(s, insurancePrice(s), 'work');
      s.insurance += 1;
      break;
    }
    case 'pay': {
      if (s.phase !== 'shortfall' || !s.due) fail('Платёж не требуется');
      if (s.money < s.due.amount) fail('Денег пока не хватает');
      const d = s.due;
      s.due = null;
      resolvePayment(s, d.amount, d.name, d.seasonEnd ?? (paymentNow(s)?.part === paymentNow(s)?.parts));
      break;
    }
    case 'emergency': {
      if (s.phase !== 'shortfall' || !s.due) fail('Платёж не требуется');
      const deficit = round2(s.due.amount - s.money);
      if (deficit <= 0) fail('Денег уже хватает — внесите платёж');
      if (s.rating === 0 || creditLimit(s) < deficit) fail('Экстренный кредит недоступен');
      s.loans.push({ id: s.nextLoanId++, principal: deficit, rate: loanRate(s) });
      s.money = round2(s.money + deficit);
      markLateBorrow(s);
      const d = s.due;
      s.due = null;
      feed(s, `Экстренный кредит ${money(deficit)}. Рейтинг снижен.`, 'bad');
      resolvePayment(s, d.amount, d.name, d.seasonEnd ?? (paymentNow(s)?.part === paymentNow(s)?.parts));
      break;
    }
    case 'restructure': {
      if (s.phase !== 'shortfall' || !s.due) fail('Платёж не требуется');
      if (s.restructured) fail('Платёж уже переносили');
      s.restructured = true;
      s.carry = Math.round(s.due.amount * 1.2);
      s.rating = Math.max(0, s.rating - 2);
      s.cleanSeasons = 0;
      // CAL-02 · the incident belongs to the season it happened in: at a season's last payment that season
      // closes here (rating −2, clean count 0), so the next season is not penalised a second time
      s.incident = !s.due.seasonEnd;
      s.due = null;
      feed(s, `Платёж перенесён: ${money(s.carry)} добавятся к следующему. Рейтинг −2.`, 'bad');
      startWeek(s);
      break;
    }
    case 'giveUp': {
      const short = s.due ? round2(Math.max(0, s.due.amount - s.money)) : 0;
      // v3 §3.3 · a mortgaged home that fails a payment can be worked off: the debt is the shortfall + 20%
      const work = isMortgaged(s) && s.due && short > 0 ? Math.round(short * 1.2) : 0;
      // a bankrupt expedition sends home its cart and, after a year's work, one poor find (before that: nothing,
      // or giving up at once would be a free loot loop)
      if (s.run) s.run.result = runResult(s, s.run.autumns >= 1 ? [worstLoot(s)] : [], true);
      s.phase = 'gameover';
      s.over = { reason: s.due ? `Не хватило ${money(short)} на платёж «${s.due.name}»` : 'Ферма закрыта', ...(work ? { work } : {}) };
      feed(s, 'Ферма обанкротилась.', 'bad');
      break;
    }
    case 'seize': {
      // v3 §3.2 · a bought-out home is never lost: the bank takes the dearest equipment at 60%, the rest becomes a loan
      if (s.phase !== 'shortfall' || !s.due) fail('Платёж не требуется');
      if (!(isHome(s) && s.owned)) fail('Опись — только для выкупленного дома');
      let deficit = round2(s.due.amount - s.money);
      const taken: string[] = [];
      while (deficit > 0) {
        const line = EQUIPMENT.filter((l) => lvl(s, l) > 0).sort((a, b) => equipPrice(s, b, lvl(s, b)) - equipPrice(s, a, lvl(s, a)))[0];
        if (!line) break;
        const got = round2(equipPrice(s, line, lvl(s, line)) * 0.6);
        taken.push(TRACKS[line].levels[lvl(s, line) - 1].name);
        s.levels[line] = lvl(s, line) - 1;
        s.money = round2(s.money + got);
        deficit = round2(deficit - got);
      }
      if (deficit > 0) { s.loans.push({ id: s.nextLoanId++, principal: deficit, rate: loanRate(s) }); s.money = round2(s.money + deficit); }
      s.rating = Math.max(0, s.rating - 2); s.cleanSeasons = 0; s.incident = true;
      feed(s, `Опись: ${taken.length ? `банк забрал ${taken.join(', ')}` : 'забирать нечего'}${deficit > 0 ? `, ${money(deficit)} — в долг` : ''}. Рейтинг −2.`, 'bad');
      const d = s.due;
      s.due = null;
      resolvePayment(s, d.amount, d.name, d.seasonEnd ?? true);
      break;
    }
    case 'buyout': {
      const price = buyoutPrice(s);
      if (price === null) fail('Дом уже выкуплен');
      if (s.phase !== 'week') fail('Сначала решите вопрос с платежом');
      spend(s, price!, 'payments');
      s.paidYears = BUYOUT_YEARS;
      feed(s, `Досрочный выкуп: внесено ${money(price!)}.`, 'good');
      buyHome(s);
      break;
    }
    case 'answer': {
      const v = s.run?.visit;
      if (!v || v.week !== s.absWeek) fail('Никто не ждёт ответа');
      const o = visitOptions(s)[isInt(a.choice) ? a.choice : -1];
      if (!o) fail('Нет такого ответа');
      if (o!.problem) fail(o!.problem);
      answerVisit(s, v!, a.choice);
      s.run!.visit = null;
      break;
    }
    case 'fold': {
      const why = foldProblem(s);
      if (why) fail(why);
      const offers = lootOffers(s), n = Math.min(lootCount(s), offers.length);
      const picks = [...new Set(Array.isArray(a.picks) ? a.picks : [])];
      if (picks.length !== n || !picks.every((p) => offers.includes(p))) fail(`Выберите ${n} ${plural(n, 'находку', 'находки', 'находок')} из предложенных`);
      const res = runResult(s, picks, false);
      s.run!.result = res;
      s.phase = 'gameover';
      s.over = { reason: `Хозяйство свёрнуто: домой ${money(res.cash)}${n ? ` и ${n} ${plural(n, 'находка', 'находки', 'находок')}` : ''}` };
      feed(s, 'Обоз собран: хозяйство свёрнуто, едем домой.', 'good');
      break;
    }
    default:
      fail('Неизвестное действие');
  }
  settle(s);
  learn(state,s,a);
  return s;
}

export function trackAvailable(s: GameState, t: TrackId): boolean {
  if (t === 'canal' || t === 'clearing') return locOf(s).extra.includes(t);
  return true;
}
export function shopCards(s: GameState): string[] {
  const crops = [...new Set([...locOf(s).shop, ...s.unlocked])].filter((c) => !CROPS[c].product && (!SEED_BANK_OK[c] || SEED_BANK_OK[c]!.includes(s.loc) || locOf(s).shop.includes(c)));
  const works = ['water', 'mulch', 'fertilizer', 'care', 'weeding', 'early', 'shelter', 'compost', 'sidejob', 'helpers', 'snow', ...(s.loc === 'altai' ? ['forage'] : [])];
  return [...crops.map((c) => `seed_${c}`), ...works];
}

// ---------- the season's fair (v3 §4) ----------
const FAIR_PLAN: Record<0 | 1 | 2 | 3, { equip: number; mat: number; worker: number; special: number }> = {
  0: { equip: 2, mat: 2, worker: 1, special: 1 },
  1: { equip: 2, mat: 3, worker: 0, special: 1 },
  2: { equip: 2, mat: 2, worker: 1, special: 0 },
  3: { equip: 0, mat: 2, worker: 1, special: 0 },
};
const MAT_WEIGHT: Record<LocationId, Record<MaterialId, number>> = {
  chernozem: { logs: 0.45, bricks: 0.35, glass: 0.2 },
  kuban: { logs: 0.3, bricks: 0.4, glass: 0.3 },
  altai: { logs: 0.6, bricks: 0.25, glass: 0.15 },
  rent: { logs: 0.45, bricks: 0.35, glass: 0.2 },
};
// regional fairs lean: Кубань sells brick and glass cheaper, Алтай logs cheaper and in bigger loads
const MAT_PRICE: Partial<Record<LocationId, Mats>> = { kuban: { bricks: 0.8, glass: 0.8 }, altai: { logs: 0.75 } };
const MAT_QTY: Partial<Record<LocationId, Mats>> = { altai: { logs: 1.4 } };
export const RIVAL_CHANCE: Record<FairLot['kind'], number> = { equip: 0.6, worker: 0.5, mat: 0.4 };
export const RIVAL_MAX = 2;
export const fairDeposit = (l: FairLot) => Math.max(1, Math.round(l.price * 0.25));
export const fairPayNow = (l: FairLot) => round2(l.price - (l.deposit ?? 0));
export const fairHeld = (s: GameState, l: FairLot) => l.hold !== undefined && l.hold >= s.absWeek;
export function lotName(l: FairLot): string {
  if (l.kind === 'equip') return TRACKS[l.track!].levels[l.level! - 1].name;
  if (l.kind === 'mat') return matsWords(l.mats!);
  return `${WORKERS[l.worker!].title.toLowerCase()} ${WORKERS[l.worker!].name}${(l.wlevel ?? 1) > 1 ? `, ${l.wlevel}-й уровень` : ''}`;
}
/** the next level of an equipment line the farm can use now, or null */
function equipNext(s: GameState, line: TrackId, step = 1): number | null {
  // a level Savva is forging counts as had: the fair offers the one after it
  const now = Math.max(lvl(s, line), s.forge?.track === line ? s.forge.level : 0);
  const L = TRACKS[line].levels, next = now + step;
  if (next > L.length) return null;
  for (let k = now + 1; k <= next; k++) if ((L[k - 1].needHouse ?? 0) > lvl(s, 'house')) return null;
  return next;
}
const equipPrice = (s: GameState, line: TrackId, level: number) => TRACKS[line].levels[level - 1].cost * infl(s.year);
function openFair(s: GameState) {
  const old = s.fair;
  if (old) for (const l of old.lots) if (!l.sold && l.deposit && fairHeld(s, l)) feed(s, `Ярмарка закрылась: задаток за «${lotName(l)}» пропал.`, 'bad');
  const season = s.season as 0 | 1 | 2 | 3;
  const w = world(s, 'fair', s.absWeek);
  const f: FairState = { year: s.year, season, lots: [], eye: null, eyeWeek: s.absWeek, rival: 0, nextId: (old?.nextId ?? 1) };
  const plan = FAIR_PLAN[season];
  const spread = () => 0.9 + 0.3 * rand(w);
  const lot = (l: Omit<FairLot, 'id'>) => f.lots.push({ id: f.nextId++, ...l });
  const lines = () => EQUIPMENT.filter((line) => equipNext(s, line) !== null && !f.lots.some((l) => l.track === line));
  // v3 §7 · Savva's forge: equipment 15% cheaper
  const smith = yardStage(s, 'savva') >= 2 ? 0.85 : 1;
  const matLot = () => {
    const k = pickWeighted(w, MATERIAL_IDS.map((m) => [m, MAT_WEIGHT[s.loc][m]] as [MaterialId, number]));
    const [lo, hi] = MATERIALS[k].lot;
    const qty = Math.round((lo + randInt(w, hi - lo + 1)) * (MAT_QTY[s.loc]?.[k] ?? 1));
    lot({ kind: 'mat', mats: { [k]: qty }, price: Math.max(1, Math.round(qty * MATERIALS[k].price * (MAT_PRICE[s.loc]?.[k] ?? 1) * infl(s.year) * spread())) });
  };
  // equipment: the lines not offered yet this year come first, so every line shows up at least once a year
  for (let i = 0; i < plan.equip; i++) {
    s.equipSeen ??= {};
    const seen = s.equipSeen;
    const free = shuffle(w, lines()).sort((a, b) => Number(seen[a] === s.year) - Number(seen[b] === s.year));
    if (!free.length) { matLot(); continue; }
    const line = free[0], level = equipNext(s, line)!;
    s.equipSeen[line] = s.year;
    const used = rand(w) < 0.2;
    lot({ kind: 'equip', track: line, level, price: Math.round(equipPrice(s, line, level) * spread() * (used ? 0.7 : 1) * smith), ...(used ? { used } : {}) });
  }
  for (let i = 0; i < plan.mat; i++) matLot();
  for (let i = 0; i < plan.worker; i++) {
    // the worker away with the cart is still the home's: never offered to someone else
    const pool = WORKER_IDS.filter((id) => !s.team.some((x) => x.id === id) && !s.candidates.includes(id) && s.away?.worker?.id !== id);
    if (!pool.length) { matLot(); continue; }
    const id = pool[randInt(w, pool.length)];
    const wlevel = rand(w) < 0.15 ? 2 : 1;
    lot({ kind: 'worker', worker: id, wlevel, price: Math.round(WORKERS[id].price * infl(s.year) * (wlevel > 1 ? 1.6 : 1)) });
  }
  for (let i = 0; i < plan.special; i++) {
    // a jump of two levels in one line, or a cart of all three materials, a little cheaper than apart
    const jump = lines().filter((line) => equipNext(s, line, 2) !== null);
    if (jump.length && rand(w) < 0.5) {
      const line = jump[randInt(w, jump.length)], level = equipNext(s, line, 2)!;
      (s.equipSeen ??= {})[line] = s.year;
      lot({ kind: 'equip', track: line, level, special: true, price: Math.round((equipPrice(s, line, level - 1) + equipPrice(s, line, level)) * 0.9 * smith) });
    } else {
      const mats: Mats = { logs: 10, bricks: 6, glass: 3 };
      const base = matsList(mats).reduce((a, [k, n]) => a + n * MATERIALS[k].price * (MAT_PRICE[s.loc]?.[k] ?? 1), 0);
      lot({ kind: 'mat', mats, special: true, price: Math.round(base * 0.85 * infl(s.year)) });
    }
  }
  // v3 §7 · the bridge brings sellers from over the river: one more lot, equipment while there is a line to offer
  if (hasCommon(s, 'bridge')) {
    const free = lines();
    if (free.length) {
      const line = free[randInt(w, free.length)], level = equipNext(s, line)!;
      (s.equipSeen ??= {})[line] = s.year;
      lot({ kind: 'equip', track: line, level, price: Math.round(equipPrice(s, line, level) * spread() * smith) });
    } else matLot();
  }
  // v3 §9.1 · the festival's prize at the winter fair: the dearest line's next level at 60%
  const fest = s.fests?.at(-1);
  if (season === 3 && fest?.year === s.year && fest.win) {
    const line = EQUIPMENT.filter((t) => equipNext(s, t) !== null).sort((a, b) => equipPrice(s, b, equipNext(s, b)!) - equipPrice(s, a, equipNext(s, a)!))[0];
    if (line) lot({ kind: 'equip', track: line, level: equipNext(s, line)!, price: Math.round(equipPrice(s, line, equipNext(s, line)!) * FEST_PRIZE), prize: true });
    else lot({ kind: 'mat', mats: { logs: 12, bricks: 8, glass: 4 }, price: Math.round(40 * infl(s.year)), special: true, prize: true });
  }
  s.fair = f;
  eyeLot(s);
}
/** Пряхин picks the lot he will buy at the end of this week if nobody takes it first (the dearer, the likelier) */
function eyeLot(s: GameState) {
  const f = s.fair;
  if (!f) return;
  f.eye = null;
  if (f.rival >= RIVAL_MAX) return;
  const open = f.lots.filter((l) => !l.sold && !fairHeld(s, l) && !l.prize);
  if (!open.length) return;
  const w = world(s, 'eye', s.absWeek);
  f.eye = pickWeighted(w, open.map((l) => [l.id, l.price] as [number, number]));
  f.eyeWeek = s.absWeek;
}
/** the start of a week inside a season: lapsed deposits, then Пряхин buys what he was looking at, then looks again */
function fairWeek(s: GameState) {
  const f = s.fair;
  if (!f) return;
  for (const l of f.lots)
    if (!l.sold && l.hold !== undefined && l.hold < s.absWeek) {
      feed(s, `Задаток за «${lotName(l)}» сгорел: лот снова в продаже.`, 'bad');
      delete l.hold;
      delete l.deposit;
    }
  if (f.eye !== null && f.eyeWeek < s.absWeek) {
    const l = f.lots.find((x) => x.id === f.eye);
    if (l && !l.sold && !fairHeld(s, l) && f.rival < RIVAL_MAX && rand(world(s, 'rival', s.absWeek)) < RIVAL_CHANCE[l.kind]) {
      l.sold = 'rival';
      f.rival += 1;
      feed(s, `Пряхин купил на ярмарке: ${lotName(l)}.`, 'bad');
    }
  }
  eyeLot(s);
}
export function fairBuyProblem(s: GameState, l: FairLot | undefined): string | null {
  if (!s.fair || !l) return 'Такого лота нет';
  if (l.sold) return l.sold === 'rival' ? 'Лот купил Пряхин' : 'Уже куплено';
  if (l.kind === 'equip') {
    if (lvl(s, l.track!) >= l.level!) return 'Это уже есть';
    if (s.forge && s.forge.track === l.track && s.forge.level >= l.level!) return 'Это уже куёт Савва';
    for (let k = lvl(s, l.track!) + 1; k <= l.level!; k++) {
      const need = TRACKS[l.track!].levels[k - 1].needHouse;
      if (need && lvl(s, 'house') < need) return `Нужен дом ${need}-го уровня`;
    }
  }
  if (l.kind === 'worker') {
    if (s.team.some((x) => x.id === l.worker)) return 'Уже в команде';
    if (s.away?.worker?.id === l.worker) return 'Этот работник уехал с обозом';
    if (bedsUsed(s) >= workerSlots(s)) return 'Нет свободной кровати';
  }
  if (s.money < fairPayNow(l) - 1e-9) return `Нужно ${money(fairPayNow(l))}`;
  return null;
}
export function fairHoldProblem(s: GameState, l: FairLot | undefined): string | null {
  if (!s.fair || !l) return 'Такого лота нет';
  if (l.sold) return l.sold === 'rival' ? 'Лот купил Пряхин' : 'Уже куплено';
  if (fairHeld(s, l)) return 'Лот уже за вами';
  if (s.money < fairDeposit(l)) return `Нужно ${money(fairDeposit(l))}`;
  return null;
}

/** v3 · fields added by the progression rework are optional (ST-09). A state without them gets them here, in place:
 *  an empty shed and this season's fair; on an expedition the house becomes a camp of at most three levels, and what
 *  was built above that is paid back at its old price. */
const OLD_HOUSE_COST = [0, 35, 70, 120, 220];
const v3Ready = (s: GameState) => !!s.mats && !!s.equipSeen && !!s.fair && !!s.crops && (isHome(s) ? s.paidYears !== undefined : lvl(s, 'house') <= CAMP.levels.length);
function fillV3(s: GameState) {
  if (v3Ready(s)) return;
  s.mats ??= { logs: 0, bricks: 0, glass: 0 };
  s.equipSeen ??= {};
  if (!s.crops) {
    // v3 §8.1 · an older farm knew nothing of crops by name: what it harvested is shared out over the crops it grew
    s.crops = {};
    const kinds = s.harvestedKinds.filter((c) => !CROPS[c].product);
    for (const c of kinds) s.crops[c] = Math.floor(s.stats.harvested / kinds.length);
  }
  if (isHome(s) && s.paidYears === undefined) {
    // an older home save: every year it lived through paid its autumn (the ladder was the same); three of them buy it out
    s.paidYears = Math.min(BUYOUT_YEARS, s.yearsCompleted + (s.season === 3 ? 1 : 0));
    if (s.paidYears >= BUYOUT_YEARS && !s.owned) {
      s.owned = true;
      feed(s, 'Три осенних платежа уже внесены: дом выкуплен. Дальше — только налог раз в год.', 'good');
    }
  }
  if (!isHome(s) && lvl(s, 'house') > CAMP.levels.length) {
    const max = CAMP.levels.length;
    let back = 0;
    for (let k = lvl(s, 'house'); k > max; k--) back += OLD_HOUSE_COST[k - 1] ?? 0;
    s.projects = s.projects.filter((p) => {
      if (p.kind !== 'track' || p.track !== 'house' || p.level <= max) return true;
      back += OLD_HOUSE_COST[p.level - 1] ?? 0;
      return false;
    });
    s.levels.house = max;
    const r = Math.round(back * infl(s.year));
    if (r) {
      s.money = round2(s.money + r);
      feed(s, `Здесь теперь лагерь, не выше полевого стана: за разобранные уровни дома вернули ${money(r)}.`, 'info');
    }
  }
  if (!s.fair) openFair(s);
}
/** the same for a stored state: the very object when nothing is missing, otherwise an upgraded copy */
export function ensureV3(state: GameState): GameState {
  if (v3Ready(state) || state.phase === 'gameover') return state;
  const s = clone(state);
  fillV3(s);
  return s;
}

// ---------- trees on the field (v3 §4.5) ----------
// A sprout comes up only where the land was let go: a weedy fallow bed, in spring or summer, a few in % a week each,
// and never more than TREE_MAX trees on the farm. A field that is weeded never grows a forest; a corner left wild
// grows timber. (A sprout on any free bed at 12% a week took over the 3×3 start field: runs 28.10, 11/12 → 3/12.)
export const TREE_CHANCE = 0.04;
export const TREE_MAX = 3;
export const TREE_YOUNG = 6, TREE_GROWN = 16, TREE_CHOP = 3;
/** days of uprooting a grown tree: two with grandfather's axe */
export const chopDays = (s: Pick<GameState, 'run'>) => TREE_CHOP - (hasRelic(s, 'axe') ? 1 : 0);
export const FELL_LOGS: Record<2 | 3, number> = { 2: 3, 3: 10 };
export const CLEAR_LOGS = 4, STONE_BRICKS = 4;
export const treeStage = (t: Tile): 0 | 1 | 2 | 3 => (t.tree === undefined ? 0 : t.tree < TREE_YOUNG ? 1 : t.tree < TREE_GROWN ? 2 : 3);
export const TREE_NAMES = ['', 'Поросль', 'Молодое дерево', 'Дерево'] as const;
export const nearTree = (s: GameState, x: number, y: number) => neighbors4(x, y).some(([a, b]) => tile(s, a, b).owned && treeStage(tile(s, a, b)) >= 2);
export function fellProblem(s: GameState, x: number, y: number): string | null {
  const t = tile(s, x, y);
  if (!t?.owned || treeStage(t) === 0) return 'Здесь нет дерева';
  if (s.days < 1) return 'Нужен рабочий день';
  return null;
}
function growTrees(s: GameState) {
  for (const [t] of ownedTiles(s)) if (t.tree !== undefined) t.tree += 1;
  if (s.quiet || s.season > 1) return;
  const w = world(s, 'sprout', s.absWeek);
  let trees = s.tiles.filter((t) => t.owned && t.tree !== undefined).length;
  for (const [t] of ownedTiles(s)) {
    if (trees >= TREE_MAX) break;
    const wild = t.weeds && t.tree === undefined && !t.crop && !t.structure && !t.canal && TERRAIN[t.terrain].plantable && t.terrain !== 'swamp';
    if (!wild || rand(w) >= TREE_CHANCE) continue;
    t.tree = 0;
    t.weeds = false;
    delete t.chop;
    trees += 1;
    feed(s, 'Заросшая грядка пустила поросль. Выдерните её — или дайте дереву вырасти на брёвна.', 'info');
  }
}
/** v3 §4.5 · a spring flood leaves stones on one or two empty cells by the river */
function floodStones(s: GameState) {
  const w = world(s, 'stones', s.absWeek);
  const free = shuffle(w, ownedTiles(s).filter(([t, x, y]) => nearTerrain(s, x, y, 'river') && !t.crop && !t.structure && !t.canal && t.tree === undefined && (t.terrain === 'plain' || t.terrain === 'sand')));
  const n = Math.min(free.length, 1 + randInt(w, 2));
  for (const [t] of free.slice(0, n)) { t.terrain = 'rock'; t.weeds = false; }
  if (n) feed(s, `Разлив вынес камни на ${n} ${plural(n, 'клетку', 'клетки', 'клеток')} у реки. Расчистите — камень пойдёт на фундамент.`, 'info');
}

// ---------- building mode ----------
export function buildSpots(s: GameState, item: BuildItem): [number, number][] {
  const out: [number, number][] = [];
  if (item === 'drip') {
    for (let y = 0; y < GRID; y++) if (ownedTiles(s).some(([t, , ty]) => ty === y && !t.drip)) out.push([0, y]);
    return out;
  }
  if (item === 'scarecrow' || item === 'fire') {
    // a scarecrow and a fire pit both stand on a corner of four beds; one thing per corner
    for (let y = 0; y < GRID - 1; y++)
      for (let x = 0; x < GRID - 1; x++)
        if (scarecrowCells(x, y).some(([a, b]) => tile(s, a, b).owned) && !s.scarecrows.some(([a, b]) => a === x && b === y) && !firePits(s).some(([a, b]) => a === x && b === y)) out.push([x, y]);
    return out;
  }
  for (const [t, x, y] of ownedTiles(s)) {
    if (!TERRAIN[t.terrain].plantable || t.structure || t.canal || t.tree !== undefined) continue;
    if (item === 'hive' && t.crop) continue;
    if (item === 'canal' && (t.crop || !(nearTerrain(s, x, y, 'river') || nearCanal(s, x, y)))) continue;
    out.push([x, y]);
  }
  return out;
}
export function buildMoveSpots(s: GameState, item: BuildItem, from?: [number, number]): [number, number][] {
  if (!from) {
    if (item === 'scarecrow') return s.scarecrows.map(([x, y]) => [x, y]);
    if (item === 'fire') return firePits(s).map(([x, y]) => [x, y]);
    if (item === 'drip') return [...new Set(s.tiles.flatMap((t, i) => t.drip ? [Math.floor(i / GRID)] : []))].map((y) => [0, y]);
    return ownedTiles(s).filter(([t]) => item === 'canal' ? t.canal : t.structure === item).map(([, x, y]) => [x, y]);
  }
  if (!cellOk(...from)) return [];
  const c = clone(s);
  try { unbuild(c, item, ...from); } catch (e) { if (e instanceof GameError) return []; throw e; }
  return buildSpots(c, item).filter(([x, y]) => item === 'drip' ? y !== from[1] : x !== from[0] || y !== from[1]);
}
function build(s: GameState, item: BuildItem, x: number, y: number) {
  if (!cellOk(x, y)) fail('Клетка вне поля');
  // CRD-03 · only real buildings: an inherited key such as «constructor» is not one
  const stock = buildStock(s);
  const st = typeof item === 'string' && Object.prototype.hasOwnProperty.call(stock, item) ? stock[item] : undefined;
  if (!st) fail('Нет такой постройки');
  if (st.used >= st.have) fail(st.have ? 'Все такие постройки уже стоят на поле' : 'Сначала её нужно построить в мастерской');
  if (!buildSpots(s, item).some(([a, b]) => (item === 'drip' ? b === y : a === x && b === y))) fail('Сюда не поставить');
  if (item === 'drip') for (let k = 0; k < GRID; k++) tile(s, k, y).drip = true;
  else if (item === 'scarecrow') s.scarecrows.push([x, y]);
  else if (item === 'fire') s.fires = [...firePits(s), [x, y]];
  else if (item === 'canal') {
    const t = tile(s, x, y);
    t.canal = true;
    t.weeds = false;
  } else { tile(s, x, y).structure = item; if(item === 'greenhouse') tile(s,x,y).greenhousePlacedWeek=s.absWeek; if(item === 'hive') tile(s,x,y).hivePlacedWeek=s.absWeek; }
}
function unbuild(s: GameState, item: BuildItem, x: number, y: number) {
  if (!cellOk(x, y)) fail('Клетка вне поля');
  if (item === 'drip') {
    if (!tile(s, 0, y).drip && !lineCells('row', y).some(([a, b]) => tile(s, a, b).drip)) fail('Здесь нет капельной линии');
    for (let k = 0; k < GRID; k++) tile(s, k, y).drip = false;
  } else if (item === 'scarecrow') {
    const i = s.scarecrows.findIndex(([a, b]) => a === x && b === y);
    if (i < 0) fail('Здесь нет пугала');
    s.scarecrows.splice(i, 1);
  } else if (item === 'fire') {
    if (!firePits(s).some(([a, b]) => a === x && b === y)) fail('Здесь нет кострища');
    s.fires = firePits(s).filter(([a, b]) => a !== x || b !== y);
  } else if (item === 'canal') {
    if (!tile(s, x, y).canal) fail('Здесь нет канала');
    tile(s, x, y).canal = false;
  } else {
    if (tile(s, x, y).structure !== item) fail('Здесь этого нет');
    if (item === 'greenhouse' && tile(s, x, y).crop && CROPS[tile(s, x, y).crop!.id].greenhouseOnly) fail('Сначала соберите культуру, которой нужна теплица');
    tile(s, x, y).structure = null;
    delete tile(s,x,y).greenhousePlacedWeek; delete tile(s,x,y).hivePlacedWeek;
  }
}

// ---------- playing a card ----------
function playCard(s: GameState, uid: number, cells: [number, number][], row?: number, col?: number) {
  const i = s.hand.findIndex((c) => c.uid === uid);
  if (i < 0) fail('Карты нет в руке');
  const card = s.hand[i];
  const d = CARDS[card.def];
  const block = cardBlockReason(s, card);
  if (block) fail(block);
  let days = cardDays(s, card);
  // CRD-03 · every given cell must be a pair of whole numbers: malformed input is refused, never a crash
  // (the other cells past the edge are named by plantBlock: «за краем поля»)
  if (!Array.isArray(cells) || !cells.every((c) => Array.isArray(c) && c.length === 2 && isInt(c[0]) && isInt(c[1]))) fail('Клетка вне поля');
  const one = cells[0];
  if (one && !cellOk(one[0], one[1])) fail('Клетка вне поля');
  if (d.kind === 'seed') {
    const uniq = [...new Map(cells.map((c) => [`${c[0]},${c[1]}`, c] as const)).values()];
    if (!uniq.length) fail('Нужно выбрать грядку');
    if (uniq.length !== cardCells(card).length || !matchesShape(card, uniq)) fail('Посадка должна повторять фигуру культуры');
    days = cardDays(s, card, uniq.length);
    if (s.days < days) fail('Не хватает рабочих дней');
    sow(s, card, uniq);
  } else if (d.target === 'tile' || d.target === 'cropTile' || d.target === 'block') {
    if (!one) fail('Нужно выбрать грядку');
    const [x, y] = one;
    const preview = workCardPreview(s,card,x,y);
    if (preview.reason) fail(preview.reason);
    const t = tile(s, x, y);
    days = preview.days;
    spend(s, cardCost(s, card.def), 'work');
    switch (card.def) {
      case 'water':
        for (const [a, b] of preview.cells) tile(s, a, b).moisture = Math.min(3, tile(s, a, b).moisture + 2);
        break;
      case 'fertilizer':
        for (const [a, b] of preview.cells) {
          tile(s, a, b).crop!.mult *= 1.5;
          tile(s, a, b).crop!.fed = true;
        }
        break;
      case 'mulch':
        for (const [a, b] of preview.cells) tile(s, a, b).mulch = 3;
        break;
      case 'compost':
        for (const [a, b] of preview.cells) soilUp(s, a, b, wlvl(s, 'soilsci') >= 2 ? 2 : 1);
        break;
      case 'shelter':
        for (const [a, b] of preview.cells) tile(s, a, b).shelter = 3;
        break;
      case 'bio':
        for (const [a, b] of preview.cells) soilUp(s, a, b, wlvl(s, 'soilsci') >= 2 ? 2 : 1);
        break;
      case 'early': {
        const full = expectedYield(s, x, y);
        const q = Math.round(full * (lvl(s, 'machinery') >= 3 ? 1 : 0.7));
        harvestTile(s, x, y, q);
        break;
      }
      default:
        break;
    }
  } else if (d.target === 'row') {
    if (row === undefined || !isInt(row) || row < 0 || row >= GRID) fail('Нужно выбрать ряд');
    if (card.def === 'snow') {
      if (!lineCells('row', row!).some(([a, b]) => tile(s, a, b).owned && !tile(s, a, b).snow)) fail('Ряд уже задерживает снег или здесь нет своих грядок');
      for (const [a, b] of lineCells('row', row!)) if (tile(s, a, b).owned) tile(s, a, b).snow = true;
    } else {
      if (!lineCells('row', row!).some(([a, b]) => tile(s, a, b).owned && tile(s, a, b).crop && !tile(s, a, b).crop!.rest && winterCareTarget(s, a, b))) fail('В этом ряду ничего не растёт');
      for (const [a, b] of lineCells('row', row!)) if (tile(s, a, b).owned && tile(s, a, b).crop && !tile(s, a, b).crop!.rest && winterCareTarget(s, a, b)) tile(s, a, b).crop!.bonus += 1;
    }
  } else if (d.target === 'line') {
    if (row === undefined && col === undefined) fail('Нужно выбрать ряд или столбец');
    const dir = row !== undefined ? 'row' : 'col';
    const i2 = (row ?? col)!;
    if (!isInt(i2) || i2 < 0 || i2 >= GRID) fail('Нужно выбрать ряд или столбец');
    if (!weedsOnLine(s, dir, i2)) fail('На этой линии сорняков нет');
    for (const [a, b] of lineCells(dir, i2)) {
      const t = tile(s, a, b);
      if (!t.owned) continue;
      t.weeds = false;
      t.clean = 4;
      if (treeStage(t) === 1) delete t.tree;
      if (!t.crop) t.idle = 0;
    }
  } else {
    spend(s, cardCost(s, card.def), 'work');
    if (card.def === 'helpers') s.days += 1;
    if (card.def === 'sidejob') {
      s.sidejobWeek = s.absWeek;
      s.money = round2(s.money + sidejobPay(s));
      s.earned = round2(s.earned + sidejobPay(s));
      feed(s, `Подработка: +${money(sidejobPay(s))}.`, 'good');
    }
    if (card.def === 'forage') {
      s.forageWeek = s.absWeek;
      const edge = ownedTiles(s).filter(([, x, y]) => nearTerrain(s, x, y, 'forest')).length;
      const base = 3 + Math.min(5, Math.floor(edge / 2)) + randInt(s, 2);
      // v3 · a run: the cedar grove and the old map double it, the pine-cone brigade halves it
      const k = (hasCond(s, 'cedar') ? 2 : 1) * (hasRelic(s, 'oldmap') ? 2 : 1) * ((s.run?.cones ?? -1) >= s.absWeek ? 0.5 : 1);
      const q = Math.max(1, Math.round(base * Math.min(3, k)));
      addToStorage(s, 'mushrooms', q);
      feed(s, `Поход в тайгу: ${q} ед. грибов.`, 'good');
    }
  }
  s.days -= days;
  s.hand.splice(s.hand.indexOf(card), 1);
  // cards made by the compost pit or the lab are used up; a played card is no longer «put aside»
  delete card.keep;
  if (!card.temp) s.discard.push(card);
}
function sow(s: GameState, card: Card, cells: [number, number][]) {
  const crop = CARDS[card.def].crop!;
  const block = plantBlock(s, card, cells);
  if (block) fail(`Не встанет: ${block}`);
  const cost = round2(seedCost(s, crop) * cells.length);
  if (s.money < cost) {
    const debt = seedDebt(s, cost);
    if (s.carry + debt > seedCreditCap(s)) fail('Нет денег, а в долг семян больше не дают');
    s.stats.seeds = round2(s.stats.seeds + s.money);
    s.money = 0;
    s.carry = round2(s.carry + debt);
    feed(s, `Семена взяты в долг: ${money(debt)} добавлены к следующему платежу.`, 'bad');
  } else spend(s, cost, 'seeds');
  const pid = s.nextPid++;
  const shift = sowingSoil(s, card, cells);
  for (const [x, y] of cells) {
    const t = tile(s, x, y);
    const sh = shift.get(`${x},${y}`);
    if (sh) {
      t.soil = sh.to;
      s.report.soilDown += 1;
    }
    t.crop = { id: crop, grown: 0, bonus: 0, mult: 1, planted: s.absWeek, pid, ...(card.traits?.length ? { traits: [...card.traits] } : {}), ...(CROPS[crop].perennial ? { years: CROPS[crop].perennial } : {}) };
    t.idle = 0;
  }
  s.sowings += 1;
}

// ---------- what the end of the week will bring (the same steps on a copy) ----------
export interface WeekOutlook { frost: number; dying: number; threats: { name: string; beds: number; guard: string | null }[]; crows: boolean; thieves: number; ripe: number; yardSale: number; payment: { amount: number; name: string; short: number } | null; costs: number }
export function weekOutlook(s: GameState): WeekOutlook {
  const c = clone(s);
  c.report = emptyReport();
  const diagnostic: Pick<WeekOutlook, 'threats'> = { threats: [] };
  const costs = weeklyCosts(s).total;
  resolveWeek(c, diagnostic);
  const r = c.report;
  const p = paymentNow(s);
  const amount = p ? paymentDue(s, p.season) + s.carry : 0;
  return { frost: r.frost, dying: r.dried, threats: diagnostic.threats, crows: crowsOpen(s), thieves: r.stolen, ripe: r.harvests.length, yardSale: r.yardUnits ?? 0, payment: p ? { amount, name: paymentName(s, p.season), short: round2(Math.max(0, amount - c.money)) } : null, costs };
}
// beds that will die of frost this week, for the field marks
export function frostVictims(s: GameState): [number, number][] {
  const air = airTemp(s);
  return ownedTiles(s).filter(([t, x, y]) => t.crop && frostKills(s, x, y, air)).map(([, x, y]) => [x, y]);
}
export const relOf = (s: GameState, o: OrgId) => s.orgs[o]?.rel ?? 0;
export { relTier };
export const finalScore = (s: GameState) => ({ years: s.yearsCompleted, glory: s.glory, earned: Math.round(s.earned) });
export function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}
