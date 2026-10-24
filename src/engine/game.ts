// Посевная v4 — the deterministic engine. No UI, no Math.random: a farm replays from its seed and its actions.
import {
  BARN_CAP, BASE_PAYMENTS, CARDS, CROPS, CROP_IDS, CropId, DECK_LIMIT, DECK_MIN, GRID, HAND_BASE, LOCATIONS, LocationDef, LocationId,
  ORGS, OrgId, PETS, PetId, RATING_LIMIT, RATING_RATE, Reward, SEASON_DEMAND, SEED_BANK_OK, SOWN_IDS, TERRAIN, TRACKS, Terrain, TraitId,
  TrackId, WORKERS, WORKER_IDS, WorkerId, isSeed, parseMap, relTier, TRAITS, PAYMENT_NAMES,
} from './data';
import { EPISODES, Episode, EpisodeKind, YearPlan, covers, episodeEnd, marketMult, planYear, seasonOf, baseTemp } from './calendar';
import { gauss, hashSeed, rand, randInt, shuffle } from './rng';

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
}
export interface Card { uid: number; def: string; extra?: [number, number][]; traits?: TraitId[]; temp?: boolean; keep?: boolean }
export type CardLike = { def: string; extra?: [number, number][]; traits?: TraitId[] } | string;
export interface Lot { crop: CropId; qty: number; age: number; bornWeek?: number }
export interface Loan { id: number; principal: number; rate: number }
export interface Worker { id: WorkerId; level: number; away: number }
export interface QuestLine { crop: CropId; qty: number }
export interface Quest { id: number; org: OrgId; step: number; title: string; text: string; lines: QuestLine[]; pay: number; rel: number; weeks: number; deadline?: number; expires?: number; contract?: boolean; reward?: Reward; createdWeek?: number }
export interface OrgState { rel: number; step: number; offer: Quest | null; active: Quest | null; wait: number; idle: number; lastMischief: number }
export type Project =
  | { kind: 'track'; track: TrackId; level: number; weeks: number; total: number }
  | { kind: 'cell'; card: Card; origin?: 'deck' | 'spare'; cell: [number, number]; weeks: number; total: number }
  | { kind: 'trait'; card: Card; origin?: 'deck' | 'spare'; trait: TraitId; weeks: number; total: number }
  | { kind: 'variety'; crop: CropId; weeks: number; total: number }
  | { kind: 'bio'; weeks: number; total: number }
  | { kind: 'train'; worker: WorkerId; weeks: number; total: number };
export type StrikeKind = 'hail' | 'flood' | 'beetle' | 'locust' | 'weedsurge';
export interface Strike { kind: StrikeKind; ep: number; week: number; cells: [number, number, number][]; zone: boolean; wave?: number }
export interface CrowRaid { week: number; targets: { x: number; y: number; pid: number; type: 'young' | 'ripe' }[]; shoo: boolean; drone: boolean }
export interface Thieves { week: number; targets: { x: number; y: number; pid: number }[]; talked: boolean }
export interface FeedItem { week: number; text: string; tone: 'good' | 'bad' | 'info' }
export interface PestHit { kind:'locust'|'beetle'; x:number; y:number; plant:Plant; lost:number; after?:Plant|null }
export type FieldDamageKind = "frost" | "dry" | "hail" | "flood" | "crows" | "thieves";
export interface FieldDamage { kind: FieldDamageKind; x: number; y: number; before: Plant; after: Plant | null; lost: number; note?: string }
export interface WeekReport {
  fieldDamage?: FieldDamage[];
  pestHits?: PestHit[];
  harvests: { crop: CropId; qty: number; x: number; y: number }[];
  lost: string[];
  costs: { label: string; amount: number }[];
  yardSold: number; yardUnits?: number; overflow: number; frost: number; dried: number; stolen: number; done: string[];
  soilUp: number; soilDown: number; honey: number; mice: number; insurancePaid?: number;
}
export interface Effect { kind: 'review'; mult: number; weeks: number }
export interface Stats { sales: number; orders: number; seeds: number; work: number; land: number; build: number; salaries: number; interest: number; payments: number; lostUnits: number; harvested: number }
export type Phase = 'week' | 'shortfall' | 'gameover';
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
  scenes?: { id: string; kind: 'dogThieves' | 'thieves' | 'watchman' | 'drone' | 'geese'; week: number; at?: [number,number]; visit?: { outcome: 'stolen' | 'empty'; targets: [number,number][]; crows: [number,number][] } }[];
  report: WeekReport;
  lastReport: WeekReport | null;
  feed: FeedItem[];
  stats: Stats;
  over: { reason: string } | null;
  due: { amount: number; name: string; seasonEnd?: boolean } | null; // phase shortfall: what is owed
  rewardsOut: Reward4[];
  yearsCompleted: number;
}

export interface GameOptions { loc: LocationId; seed: string; pets?: PetId[]; seedBank?: CropId[] }

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
export const storageCap = (s: GameState) => BARN_CAP[Math.min(BARN_CAP.length - 1, lvl(s, 'barn'))];
export const storageUsed = (s: GameState) => s.storage.reduce((a, l) => a + l.qty, 0);
export const storageKeepWeeks = (s: GameState, c: CropId) => (CROPS[c].perishable ?? 99) + (lvl(s, 'house') >= 2 ? 1 : 0) + (lvl(s, 'barn') >= 3 ? 2 : 0) + (wlvl(s, 'greenhouser') >= 3 ? 2 : 0);
export const yardUsed = (s: GameState) => s.yard.reduce((a, l) => a + l.qty, 0);
// The hand never grows: five cards always fit the fan. Each week brings a fresh hand; the planning track
// lets the player put more cards aside for the next week.
export const handMax = (_s: GameState) => HAND_BASE;
export const keepSlots = (s: GameState) => 1 + Math.min(2, lvl(s, 'planning'));
export const keptCount = (s: GameState) => s.hand.filter((c) => c.keep && !c.temp).length;
export const deckLimit = (s: GameState) => DECK_LIMIT[Math.min(4, lvl(s, 'house') - 1)];
export const workerSlots = (s: GameState) => lvl(s, 'house');
export const workshopSlots = (s: GameState) => 1 + (lvl(s, 'house') >= 4 ? 1 : 0) + (wlvl(s, 'mechanic') >= 3 ? 1 : 0);
export const labSlots = (s: GameState) => (lvl(s, 'lab') >= 2 ? 2 : 1) + (wlvl(s, 'breeder') >= 2 ? 1 : 0);
export const maxExtra = (s: GameState) => lvl(s, 'lab');
export const maxTraits = (s: GameState) => lvl(s, 'lab') + (wlvl(s, 'breeder') >= 3 ? 1 : 0);
export const greenhousesAllowed = (s: GameState) => [0, 1, 2, 2, 3][lvl(s, 'greenhouse')] ?? 3;
export const heated = (s: GameState) => lvl(s, 'greenhouse') >= 3;
export const hivesAllowed = (s: GameState) => [0, 1, 2, 2][lvl(s, 'apiary')] ?? 2;
export const dripAllowed = (s: GameState) => (lvl(s, 'irrigation') >= 4 ? 4 : lvl(s, 'irrigation') >= 2 ? 2 : 0);
export const scarecrowsAllowed = (s: GameState) => [0, 1, 2, 2][lvl(s, 'guard')] ?? 2;
export const canalsAllowed = (s: GameState) => [0, 2, 4, 7][lvl(s, 'canal')] ?? 7;
export const lookahead = (s: GameState) => [1, 2, 4, 6][lvl(s, 'meteo')] ?? 6;
export const sortiesPerSeason = (s: GameState) => Math.max(0, lvl(s, 'drone') - 1);
export const questSlots = (s: GameState) => 3 + (lvl(s, 'house') >= 4 ? 1 : 0);
export const countStructure = (s: GameState, k: 'greenhouse' | 'hive') => s.tiles.filter((t) => t.structure === k).length;
export const dripRows = (s: GameState) => new Set(s.tiles.map((t, i) => (t.drip ? Math.floor(i / GRID) : -1)).filter((r) => r >= 0)).size;
export const canalCount = (s: GameState) => s.tiles.filter((t) => t.canal).length;
const placed = (s: GameState) => ({ greenhouse: countStructure(s, 'greenhouse'), hive: countStructure(s, 'hive'), drip: dripRows(s), scarecrow: s.scarecrows.length, canal: canalCount(s) });
export type BuildItem = 'greenhouse' | 'hive' | 'drip' | 'scarecrow' | 'canal';
export function buildStock(s: GameState): Record<BuildItem, { have: number; used: number }> {
  const p = placed(s);
  return {
    greenhouse: { have: greenhousesAllowed(s), used: p.greenhouse },
    hive: { have: hivesAllowed(s), used: p.hive },
    drip: { have: dripAllowed(s), used: p.drip },
    scarecrow: { have: scarecrowsAllowed(s), used: p.scarecrow },
    canal: { have: canalsAllowed(s), used: p.canal },
  };
}

// ---------- calendar ----------
export const seasonLen = (s: GameState, season = s.season) => locOf(s).seasons[season];
export const yearLen = (s: GameState) => locOf(s).seasons.reduce((a, b) => a + b, 0);
// the weeks of the year a payment falls on, with the season it belongs to
export function paymentSchedule(s: GameState): { week: number; season: number; part: number; parts: number }[] {
  const [sp, su, au] = locOf(s).seasons;
  const thirds = [Math.round(su / 3), Math.round((2 * su) / 3), su];
  return [
    { week: sp, season: 0, part: 1, parts: 1 },
    ...thirds.map((w, i) => ({ week: sp + w, season: 1, part: i + 1, parts: 3 })),
    { week: sp + su + au, season: 2, part: 1, parts: 1 },
  ];
}
export function paymentBase(s: GameState, season: number, year = s.year): number {
  const base = BASE_PAYMENTS[season] ?? 0;
  return Math.round(base * Math.pow(1.42, year - 1) * locOf(s).payMult);
}
export const paymentNow = (s: GameState) => paymentSchedule(s).find((p) => p.week === s.week) ?? null;
export function nextPayment(s: GameState): { week: number; weeksLeft: number; amount: number; name: string; season: number } {
  const sch = paymentSchedule(s);
  const p = sch.find((x) => x.week >= s.week);
  if (p) return { week: p.week, weeksLeft: p.week - s.week + 1, amount: paymentBase(s, p.season) + s.carry, name: PAYMENT_NAMES[p.season], season: p.season };
  const first = sch[0];
  return { week: first.week, weeksLeft: yearLen(s) - s.week + first.week + 1, amount: paymentBase(s, 0, s.year + 1) + s.carry, name: PAYMENT_NAMES[0], season: 0 };
}

const planCache = new Map<string, YearPlan>();
export function yearPlanFor(s: Pick<GameState, 'seed' | 'loc' | 'tiles'>, year: number): YearPlan {
  const key = `${s.seed}|${s.loc}|v4|plan|${year}`;
  let p = planCache.get(key);
  if (!p) {
    const loc = LOCATIONS[s.loc];
    p = planYear({ key, year, loc, river: s.tiles.some((t) => t.terrain === 'river'), crops: loc.shop });
    if (planCache.size > 40) planCache.clear();
    planCache.set(key, p);
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
  return (t.shelter > 0 ? 5 : 0) + (t.mulch > 0 ? 1 : 0);
}
export function frostKills(s: GameState, x: number, y: number, air = airTemp(s)): boolean {
  const t = tile(s, x, y);
  if (!t.crop) return false;
  return air + frostShield(s, t) <= frostLimit(t.crop);
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
    if (area.some(([a, b]) => tile(s, a, b).structure === 'hive')) parts.push({ label: 'улей рядом', mult: (c === 'buckwheat' ? 1.5 : 1.25) * (wlvl(s, 'beekeeper') >= 3 ? 1.2 : 1) });
  }
  if (greenhouseYieldReady(s, t)) {
    if (wlvl(s, 'greenhouser') >= 1) parts.push({ label: 'тепличница', mult: 1.5 });
    if (lvl(s, 'greenhouse') >= 4) parts.push({ label: 'тепличный комплекс', mult: 1.5 });
  }
  if (t.terrain === 'sand' && CROPS[c].sandBonus) parts.push({ label: 'песок', mult: c === 'watermelon' ? 1.4 : 1.3 });
  if (!greenhouseYieldReady(s,t) && nearTerrain(s, x, y, 'forest')) parts.push({ label: 'тень леса', mult: 0.85 });
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
};
export const friends = (s: GameState, o: OrgId) => (s.orgs[o]?.rel ?? 0) >= 25;
export function sellMult(s: GameState, c: CropId, offset = 0): number {
  let m = 1 + [0, 0.1, 0.15, 0.2][wlvl(s, 'marketer')];
  for (const o of locOf(s).orgs) if (friends(s, o)) m *= PERK_PRICE[o]?.[c] ?? 1;
  for (const e of s.effects) if (e.kind === 'review' && e.weeks > offset) m *= e.mult;
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
  return round2(CROPS[c].seedCost * infl(s.year) * Math.max(0.5, sale * seeder));
};
export const cardCost = (s: GameState, def: string) => round2((CARDS[def].cost ?? 0) * infl(s.year));
export const cardShopPrice = (s: GameState, def: string) => Math.round(CARDS[def].shop * infl(s.year));
export const sidejobPay = (s: GameState) => Math.round(8 * infl(s.year));
export const guardPrice = (s: GameState) => round2(2 * infl(s.year));
export const outstanding = (s: GameState) => round2(s.loans.reduce((a, l) => a + l.principal, 0));
export const loanRate = (s: GameState) => RATING_RATE[Math.max(1, Math.min(5, s.rating))];
export const creditLimit = (s: GameState) => (s.rating === 0 ? 0 : Math.max(0, Math.floor(RATING_LIMIT[s.rating] * paymentBase(s, 1) - outstanding(s))));
export const insurancePrice = (s: GameState) => round2(0.08 * nextPayment(s).amount + 2);
export const loanInterest = (l: Loan) => Math.floor((kop(l.principal) * Math.round(l.rate * 10000) + 5000) / 10000) / 100;
export function weeklyCosts(s: GameState) {
  const interest = round2(s.loans.reduce((a, l) => a + loanInterest(l), 0));
  const salaries = s.team.reduce((a, w) => a + Math.round(WORKERS[w.id].salary * infl(s.year)), 0);
  const heating = weekInfo(s, 0).season === 3 && heated(s) ? Math.round(2 * infl(s.year)) * countStructure(s, 'greenhouse') : 0;
  return { interest, salaries, heating, total: round2(interest + salaries + heating) };
}
export function landPrice(s: GameState): number {
  const perk = locOf(s).orgs.some((o) => (o === 'council' || o === 'stanitsa') && friends(s, o)) ? 0.7 : 1;
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
  return Math.round((t.terrain === 'swamp' ? 14 : 10) * infl(s.year));
}
export const clearDays = (s: GameState, x: number, y: number) => (tile(s, x, y).terrain === 'forest' ? (lvl(s, 'clearing') >= 2 ? 1 : 2) : 1);
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
  if (activeEpisodes(s).some((e) => e.kind === 'helpers')) d += 1;
  if (lvl(s, 'planning') >= 3) d += 1;
  return d;
}
// Every new week deals a fresh hand: one-off cards and the cards put aside stay, the rest go to the discard.
export const weeklyDraw = (s: GameState) => Math.max(0, handMax(s) - s.hand.filter((c) => c.temp || c.keep).length);
// Exchanges (and cards sent to the compost pit) share one weekly allowance.
export const exchangesPerWeek = (s: GameState) => 1 + (lvl(s, 'planning') >= 2 ? 1 : 0) + (lvl(s, 'house') >= 5 ? 1 : 0) + (wlvl(s, 'foreman') >= 2 ? 1 : 0);
export const exchangesUsed = (s: GameState) => (s.exchangeWeek === s.absWeek ? s.exchanges ?? 1 : 0);
export const exchangeDays = (_s: GameState) => 1;
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
// The new week's hand: one-off cards and up to keepSlots cards put aside stay, the rest go to the discard.
function dealWeek(s: GameState) {
  let slots = keepSlots(s);
  const stay: Card[] = [];
  for (const c of s.hand) {
    if (c.temp || (c.keep && slots-- > 0)) stay.push(c);
    else { delete c.keep; s.discard.push(c); }
  }
  s.hand = stay;
  drawCards(s, handMax(s) - s.hand.length);
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
    const cost = seedCost(s, crop) * cardCells(k).length;
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
  if (k.def === 'weeding' && !s.tiles.some((t) => t.owned && t.weeds)) return 'Сорняков нет';
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
export const weedsOnLine = (s: GameState, dir: 'row' | 'col', i: number) => lineCells(dir, i).filter(([x, y]) => tile(s, x, y).owned && tile(s, x, y).weeds).length;
// manual watering by hand: one or two beds, three in a line with a hose
export const handWaterMax = (s: GameState) => (lvl(s, 'irrigation') >= 1 ? 3 : 2);

// ---------- new game ----------
function freshTile(terrain: Terrain, owned: boolean, soil: number): Tile {
  return { owned, terrain, crop: null, moisture: owned ? 2 : 0, soil, last: null, mulch: 0, shelter: 0, structure: null, drip: false, canal: false, weeds: false, idle: 0, clean: 0, snow: false, cleared: false };
}
export function newGame(o: GameOptions): GameState {
  const loc = LOCATIONS[o.loc];
  const map = parseMap(loc.map);
  const tiles: Tile[] = [];
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      const owned = x >= 1 && x <= 3 && y >= 1 && y <= 3;
      const t = map[y * GRID + x];
      const soil = t === 'rock' ? 4 : t === 'sand' ? 1 : owned ? loc.soil : Math.max(2, loc.soil - 1);
      tiles.push(freshTile(t, owned, soil));
    }
  const s: GameState = {
    v: 5, loc: o.loc, seed: o.seed, rng: hashSeed(o.seed), year: 1, week: 0, season: 0, weekInSeason: 0, absWeek: 0, yearStart: 1, phase: 'week',
    money: 70, earned: 0, peak: 70, tiles, bought: 0, draw: [], hand: [], discard: [], spare: [], nextUid: 1, nextPid: 1, days: 0, sowings: 0,
    storage: [], yard: [], demand: {} as GameState['demand'], noise: Object.fromEntries(CROP_IDS.map((c) => [c, 0])) as Record<CropId, number>,
    plan: [], temps: [], flags: { warm: false, rain: false, dry: false }, strikes: [], crows: null, raids: 0, thieves: null, guards: [], scarecrows: [],
    levels: { house: 1, ...(o.loc === 'kuban' ? { canal: 1 } : {}), ...(o.loc === 'altai' ? { clearing: 1 } : {}) },
    projects: [], team: [], candidates: [], freeHire: [], unlocked: [], orgs: {}, nextQuestId: 1, pets: [...(o.pets ?? [])], certs: [], glory: 0, harvestedKinds: [],
    loans: [], nextLoanId: 1, rating: 2, cleanSeasons: 0, carry: 0, restructured: false, incident: false, insurance: 0, dronesUsed: 0, autoShoo: false,
    effects: [], compostTick: 0, report: emptyReport(), lastReport: null, feed: [], over: null, due: null, rewardsOut: [], yearsCompleted: 0,
    stats: { sales: 0, orders: 0, seeds: 0, work: 0, land: 0, build: 0, salaries: 0, interest: 0, payments: 0, lostUnits: 0, harvested: 0 },
  };
  for (const c of o.seedBank ?? []) if (SEED_BANK_OK[c]?.includes(o.loc) && !s.unlocked.includes(c)) s.unlocked.push(c);
  s.draw = shuffle(s, loc.starter.map((def) => ({ uid: s.nextUid++, def })));
  // the first hand always holds the quickest seed
  const quick = s.draw.findIndex((c) => c.def === 'seed_radish');
  if (quick >= 0 && quick < s.draw.length - 5) s.draw.push(...s.draw.splice(quick, 1));
  for (const id of loc.orgs) s.orgs[id] = { rel: 0, step: 0, offer: null, active: null, wait: id === loc.orgs[0] ? 1 : 2 + loc.orgs.indexOf(id), idle: 0, lastMischief: -99 };
  s.demand = genDemand(s);
  newYearPlan(s);
  s.candidates = pickCandidates(s);
  feed(s, `Новая ферма: ${loc.name}. Начинается первая весна.`);
  startWeek(s);
  return s;
}
function newYearPlan(s: GameState) {
  const p = yearPlanFor(s, s.year);
  s.plan = p.episodes.map((e) => ({ ...e, start: e.start + s.yearStart - 1 }));
  s.temps = p.temps;
}
function pickCandidates(s: GameState): WorkerId[] {
  const pool = WORKER_IDS.filter((id) => !s.team.some((w) => w.id === id));
  shuffle(world(s, 'hire', s.absWeek), pool);
  return [...new Set([...s.freeHire.filter((id) => !s.team.some((w) => w.id === id)), ...pool.slice(0, 3)])];
}

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
  if (newSeason) seasonStart(s);
  s.days = weekDays(s);
  // Cards kept by the player survive every season and year boundary.
  // price noise
  const sigma = Math.min(0.12, 0.035 * (1 + 0.12 * (s.year - 1)));
  const nw = world(s, 'noise', s.absWeek);
  for (const c of CROP_IDS) s.noise[c] = sigma * gauss(nw);
  // threats of the week, and with a scout drone those of the next one
  morningThreats(s);
  crowMorning(s);
  thievesMorning(s);
  mischiefMorning(s);
  // the watchman of the third level guards two threatened beds by himself
  if (wlvl(s, 'watchman') >= 3) {
    const beds = s.strikes.filter((st) => st.week === s.absWeek && st.kind !== 'weedsurge').flatMap((st) => strikeVictims(s, st));
    for (const [x, y] of beds.slice(0, 2)) if (!isGuarded(s, x, y)) s.guards.push([x, y]);
  }
  // Every week brings a fresh hand of five.
  dealWeek(s);
}

function seasonStart(s: GameState) {
  s.dronesUsed = 0;
  s.candidates = pickCandidates(s);
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

// ---------- declared threats ----------
const PESTS: StrikeKind[] = ['beetle', 'locust'];
export const STRIKE_NAME: Record<StrikeKind, string> = { hail: 'Град', flood: 'Паводок', beetle: 'Колорадский жук', locust: 'Саранча', weedsurge: 'Сорняки' };
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
    const free = owned.filter(([t]) => !t.crop && !t.structure && !t.canal && !t.weeds && t.clean <= 0 && TERRAIN[t.terrain].plantable);
    shuffle(w, free);
    cells = free.slice(0, 2).map(([, x, y]) => [x, y, 0]);
  }
  s.strikes.push({ kind, ep, week, cells, zone, ...(wave ? { wave } : {}) });
}
// Raids give warning: beetles, locusts, weeds, a flock and the orphanage children show up a week before they
// strike, two weeks with the scout drone. They are not in the weather forecast.
export const raidLead = (s: GameState) => (lvl(s, 'drone') >= 1 ? 2 : 1);
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
  }
}
export const isGuarded = (s: GameState, x: number, y: number) => s.guards.some(([a, b]) => a === x && b === y);
const garlicNear = (s: GameState, x: number, y: number) => neighbors8(x, y).some(([a, b]) => tile(s, a, b).crop?.id === 'garlic');
export function strikeVictims(s: GameState, st: Strike): [number, number][] {
  if (st.kind === 'weedsurge')
    return st.cells.filter(([x, y]) => {
      const t = tile(s, x, y);
      return t.owned && !t.crop && !t.structure && !t.canal && !t.weeds && t.clean <= 0 && TERRAIN[t.terrain].plantable;
    }).map(([x, y]) => [x, y]);
  const out: [number, number][] = [];
  for (const [x, y, pid] of st.cells) {
    const t = tile(s, x, y);
    if (!t.owned || !t.crop || t.structure === 'greenhouse') continue;
    if (st.kind === 'hail' && t.shelter > 0) continue;
    if (!st.zone && t.crop.pid !== pid) continue;
    if (PESTS.includes(st.kind) && (t.crop.traits?.includes('tough') || garlicNear(s, x, y))) continue;
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
    if (PESTS.includes(st.kind) && sorties > 0) guard = 'drone';
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
  const priority: Record<StrikeKind, number> = { hail: 0, flood: 0, beetle: 1, locust: 2, weedsurge: 3 };
  for (const st of s.strikes.filter((x) => x.week === s.absWeek).sort((a,b)=>priority[a.kind]-priority[b.kind])) {
    const name = STRIKE_NAME[st.kind];
    const o = strikeOutcome(s, st, sortiesPerSeason(s) - s.dronesUsed, s.insurance);
    if (o.guarded) feed(s, `${name}: ${o.guarded} ${plural(o.guarded, 'защищённая грядка уцелела', 'защищённые грядки уцелели', 'защищённых грядок уцелело')}.`, 'good');
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
    const factor = st.kind === 'beetle' && hasPet(s, 'hedgehog') ? 0.75 : 0.5;
    for (const [x,y] of o.hit) {
      const beforePlant={...tile(s,x,y).crop!};
      const crop=beforePlant.id;
      const units=destroy ? noteLoss(s,x,y) : noteLoss(s,x,y,()=>tile(s,x,y).crop!.mult*=factor, st.kind === 'hail' || st.kind === 'flood' ? st.kind : undefined);
      lost+=units; lossValue+=units*priceOf(s,crop);
      if(st.kind==='locust'||st.kind==='beetle'){
        if(st.kind==='beetle'&&tile(s,x,y).crop)tile(s,x,y).crop!.chewed=true;
        (r.pestHits??=[]).push({kind:st.kind,x,y,plant:beforePlant,lost:units,after:tile(s,x,y).crop?{...tile(s,x,y).crop!}:null});
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
      s.money = round2(s.money - Math.min(f, s.money));
      st.lastMischief = s.absWeek;
      feed(s, `${ORGS[o].short}: ${ORGS[o].mischiefText.toLowerCase()} — ${money(f)}.`, 'bad');
    }
    if (m === 'review' && s.absWeek - st.lastMischief >= 8 && !s.effects.some((e) => e.kind === 'review')) {
      s.effects.push({ kind: 'review', mult: 0.9, weeks: 3 });
      st.lastMischief = s.absWeek;
      feed(s, `${ORGS[o].short}: ${ORGS[o].mischiefText.toLowerCase()}.`, 'bad');
    }
  }
}

// ---------- the end of the week ----------
// rain and irrigation → frost → dry check → declared blows → crows → thieves → growth → harvest → water → weeds → farm work
// (honey, compost, geese) → yard → spoilage and mice → projects → organisations → money → payment
export function endWeek(state: GameState): GameState {
  if (state.phase !== 'week') return state;
  const s = clone(state);
  resolveWeek(s);
  const p = paymentNow(s);
  if (p) resolvePayment(s, paymentBase(s, p.season) + s.carry, PAYMENT_NAMES[p.season], p.part === p.parts);
  else startWeek(s);
  return s;
}

// Both previews and committed turns execute this transition on their own state copy.
function resolveWeek(s: GameState, diagnostic?: Pick<WeekOutlook, 'threats'>) {
  const r = s.report;
  const costs = weeklyCosts(s);
  const air = airTemp(s);
  const winter = s.season === 3;
  // 1. Water arrives before drought/growth; identical to the visible forecast.
  const watered=growthMoisture(s);
  s.tiles.forEach((t,i)=>t.moisture=watered[i]);
  // 2. frost
  for (const [t, x, y] of ownedTiles(s)) {
    if (!t.crop || !frostKills(s, x, y, air)) continue;
    noteLoss(s, x, y, undefined, 'frost');
    r.frost++;
  }
  if (r.frost) {
    r.lost.push(`Мороз погубил ${r.frost} ${plural(r.frost, 'растение', 'растения', 'растений')}`);
    feed(s, `${air}°: мороз погубил ${r.frost} ${plural(r.frost, 'растение', 'растения', 'растений')}.`, 'bad');
  }
  // 3. the dry check (sleeping plants need no water)
  for (const [t, x, y] of ownedTiles(s)) {
    if (!t.crop || t.crop.rest || (winter && t.structure !== 'greenhouse')) continue;
    if (t.moisture >= 1) {
      t.crop.dry = 0;
      continue;
    }
    t.crop.dry = (t.crop.dry ?? 0) + 1;
    if (t.crop.dry >= (t.crop.traits?.includes('drought') ? 3 : 2)) {
      noteLoss(s, x, y, undefined, 'dry');
      r.dried++;
    }
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
  const productiveHives=ownedTiles(s).filter(([t,x,y])=>t.structure==='hive' &&
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
    if (winter && t.structure !== 'greenhouse') continue;
    const shade = nearTerrain(s, x, y, 'forest');
    if (!(t.mulch > 0) && !t.drip && (!shade || t.structure === 'greenhouse')) t.moisture = Math.max(0, t.moisture - 1);
    const hotWeek = s.flags.dry || air >= 28;
    if (hotWeek && t.structure !== 'greenhouse' && t.crop?.id !== 'sunflower' && !t.crop?.traits?.includes('drought')) {
      const extra = (s.flags.dry && t.terrain === 'sand' ? 2 : 1) - (wlvl(s, 'irrigator') >= 2 ? 1 : 0);
      t.moisture = Math.max(0, t.moisture - extra);
    }
  }
  for (const [t] of ownedTiles(s)) { if (t.mulch > 0) t.mulch--; if (t.shelter > 0) t.shelter--; }
  // 10. weeds
  if (!winter) growWeeds(s);
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
    for (const crop of CROP_IDS.filter((c) => CROPS[c].storable)) {
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
  for (const loan of s.loans) {
    const i = loanInterest(loan);
    payOrBorrow(s, i, loan);
    s.stats.interest = round2(s.stats.interest + i);
  }
  if (costs.interest) r.costs.push({ label: 'проценты', amount: costs.interest });
  if (costs.salaries) {
    payOrBorrow(s, costs.salaries);
    s.stats.salaries += costs.salaries;
    r.costs.push({ label: 'зарплаты', amount: costs.salaries });
  }
  if (costs.heating) {
    payOrBorrow(s, costs.heating);
    r.costs.push({ label: 'отопление теплиц', amount: costs.heating });
  }
  if (hasPet(s, 'goat')) s.money = round2(s.money + Math.round(3 * infl(s.year)));
  for (const e of s.effects) e.weeks -= 1;
  s.effects = s.effects.filter((e) => e.weeks > 0);
  s.strikes = s.strikes.filter((x) => x.week > s.absWeek);
  s.guards = [];
  settle(s);
  s.lastReport = r;
}

function growWeeds(s: GameState) {
  if (s.year === 1 && s.season === 0) return;
  const creep: [number, number][] = [];
  for (const [t, x, y] of ownedTiles(s)) {
    const fallow = !t.crop && !t.structure && !t.canal && TERRAIN[t.terrain].plantable;
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
function harvestTile(s: GameState, x: number, y: number, qty: number) {
  const t = tile(s, x, y);
  if (!t.crop) return;
  const c = t.crop.id;
  if (qty > 0) addToStorage(s, c, qty);
  s.stats.harvested += qty;
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

function payOrBorrow(s: GameState, amount: number, loan?: Loan) {
  s.money = round2(s.money - amount);
  if (s.money < 0) {
    const debt = -s.money;
    s.money = 0;
    if (loan) loan.principal = round2(loan.principal + debt);
    else if (s.loans[0]) s.loans[0].principal = round2(s.loans[0].principal + debt);
    else s.loans.push({ id: s.nextLoanId++, principal: debt, rate: loanRate(s) });
  }
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

// ---------- projects: workshop, lab, training ----------
export const isLabProject = (p: Project) => p.kind === 'cell' || p.kind === 'trait' || p.kind === 'variety' || p.kind === 'bio';
export const workshopBusy = (s: GameState) => s.projects.filter((p) => p.kind === 'track').length;
export const labBusy = (s: GameState) => s.projects.filter(isLabProject).length;
export function trackCost(s: GameState, t: TrackId, level: number): number {
  const L = TRACKS[t].levels[level - 1];
  return Math.round(L.cost * infl(s.year) * (wlvl(s, 'mechanic') >= 2 ? 0.85 : 1));
}
export function trackWeeks(s: GameState, t: TrackId, level: number): number {
  const L = TRACKS[t].levels[level - 1];
  return Math.max(1, L.weeks - (wlvl(s, 'mechanic') >= 1 ? 1 : 0));
}
export function trackProblem(s: GameState, t: TrackId): string | null {
  const next = lvl(s, t) + 1;
  const L = TRACKS[t].levels[next - 1];
  if (!L) return 'Уже лучший уровень';
  if (s.projects.some((p) => p.kind === 'track' && p.track === t)) return 'Уже строится';
  if (L.needHouse && lvl(s, 'house') < L.needHouse) return `Нужен дом ${L.needHouse}-го уровня`;
  if (workshopBusy(s) >= workshopSlots(s)) return 'Мастерская занята';
  if (s.money < trackCost(s, t, next)) return `Нужно ${money(trackCost(s, t, next))}`;
  return null;
}
const labWeeks = (s: GameState, base: number) => Math.max(1, base - (wlvl(s, 'breeder') >= 1 ? 1 : 0) - (lvl(s, 'lab') >= 3 ? 1 : 0));
export const cellPrice = (s: GameState, c: Card) => Math.round((12 + 8 * (c.extra?.length ?? 0)) * infl(s.year));
export const traitPrice = (s: GameState, c: Card) => Math.round((15 + 10 * (c.traits?.length ?? 0)) * infl(s.year));
export const varietyPrice = (s: GameState) => Math.round(25 * infl(s.year));
export const bioPrice = (s: GameState) => Math.round(6 * infl(s.year));
export const LAB_WEEKS = { cell: 2, trait: 3, variety: 4, bio: 1 };
export const labWeeksFor = (s: GameState, kind: keyof typeof LAB_WEEKS) => labWeeks(s, LAB_WEEKS[kind]);
export function labProblem(s: GameState): string | null {
  if (lvl(s, 'lab') < 1) return 'Лабораторию нужно построить';
  if (labBusy(s) >= labSlots(s)) return 'Все столы лаборатории заняты';
  return null;
}
export function upgradeSpots(s: GameState, c: CardLike): [number, number][] {
  const cells = cardCells(c);
  if ((asCard(c).extra?.length ?? 0) >= maxExtra(s)) return [];
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

function tickProjects(s: GameState) {
  for (const p of s.projects) p.weeks -= 1;
  const done = s.projects.filter((p) => p.weeks <= 0);
  for (const p of done) {
    // Other completed laboratory cards retain their reservations until their own return.
    s.projects = s.projects.filter((other) => other !== p);
    let msg = '';
    if (p.kind === 'track') {
      s.levels[p.track] = p.level;
      const L = TRACKS[p.track].levels[p.level - 1];
      msg = `${TRACKS[p.track].name}: готово «${L.name}» — ${L.text}`;
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
  if(CROPS[c].swamp && !ownedTiles(s).some(([t])=>t.terrain==='swamp'))return false;
  return true;
}
export function repairOpenOffers(state: GameState): GameState {
  const bad=locOf(state).orgs.filter(o=>{const q=state.orgs[o];return q?.offer&&!q.active&&q.offer.lines.some(l=>!orderCropAvailable(state,l.crop));});
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
  const pay = round2(ls.reduce((a, l) => a + l.qty * CROPS[l.crop].price, 0) * infl(s.year) * payK * (1.15 + rand(w) * 0.2));
  return { id: s.nextQuestId++, org: o, step, title, text, lines: ls, pay, rel: step >= def.steps.length ? 10 : step === def.steps.length - 1 ? 25 : 18, weeks, reward, createdWeek:s.absWeek, expires:s.absWeek+weeks, contract:step>=def.steps.length, deadline:s.absWeek+weeks };
}
export const IGNORED_OFFER_WEEKS = 6;
// Legacy offers retain a fixed deadline from their creation, never from acceptance.
export const offerDeadline=(s:GameState,q:Quest)=>q.deadline??(q.createdWeek!==undefined?q.createdWeek+q.weeks:q.expires??s.absWeek+q.weeks);
function tickOrgs(s: GameState) {
  for (const o of locOf(s).orgs) {
    const st = s.orgs[o];
    if (!st) continue;
    if (st.active && st.active.deadline !== undefined && st.active.deadline <= s.absWeek) {
      st.rel = Math.max(-100, st.rel - 20);
      s.report.lost.push(`${ORGS[o].short}: срок заказа вышел (отношения −20)`);
      feed(s, `${ORGS[o].short}: заказ «${st.active.title}» не сдан, отношения испортились.`, 'bad');
      st.active = null;
      st.wait = 2;
    }
    if(st.offer && !st.active && !st.offer.lines.every(l=>orderCropAvailable(s,l.crop))) {
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
    if (!st.offer && !st.active && ORGS[o].mischief === 'silence' && st.rel < -35) st.rel += 2;
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
export function deliverProblem(s: GameState, o: OrgId): string | null {
  const q = s.orgs[o]?.active;
  if (!q) return 'Нет заказа в работе';
  for (const l of q.lines) if (stockOf(s, l.crop) < l.qty) return `Не хватает ${l.qty - stockOf(s, l.crop)} ед. ${CROPS[l.crop].gen}`;
  return null;
}
function grant(s: GameState, rw: Reward, src: string) {
  if (rw.money) s.money = round2(s.money + Math.round(rw.money * infl(s.year)));
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
    if (!s.freeHire.includes(rw.worker) && !s.team.some((w) => w.id === rw.worker)) s.freeHire.push(rw.worker);
    if (!s.candidates.includes(rw.worker)) s.candidates.push(rw.worker);
    feed(s, `${WORKERS[rw.worker].name} (${WORKERS[rw.worker].title.toLowerCase()}) — можно нанять без платы за наём. Зарплата сохраняется — условия в доме.`, 'good');
  }
  if (rw.card) addCard(s, rw.card, { temp: true });
  if (rw.glory) addGlory(s, rw.glory, `${src}|glory`);
}
function addGlory(s: GameState, n: number, id: string) {
  s.glory += n;
  s.rewardsOut.push({ id: `${s.seed}|${s.loc}|${id}`, kind: 'glory', value: n });
}
export const relClamp = (n: number) => Math.max(-100, Math.min(100, n));

// ---------- actions ----------
export type Action =
  | { t: 'play'; uid: number; tiles?: [number, number][]; row?: number; col?: number }
  | { t: 'endWeek' }
  | { t: 'guide'; lesson: 'rotate' | 'off' }
  | { t: 'drawCard' }
  | { t: 'discardCard'; uid: number }
  | { t: 'keepCard'; uid: number }
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
  | { t: 'giveUp' };

const ANY_PHASE: Action['t'][] = ['guide', 'pay', 'emergency', 'restructure', 'giveUp', 'sell', 'borrow', 'repay', 'deliver'];
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
  if (state.phase === 'shortfall' && !ANY_PHASE.includes(a.t)) fail('Вы не можете это сделать, не решив вопрос с платежом');
  if (a.t === 'endWeek') { const next=endWeek(state); learn(state,next,a); return next; }
  const s = clone(state);
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
        pile.splice(pile.findIndex(c=>c.uid===replacement.uid),1);s.hand.push(replacement);
      } else drawCards(s,1);
      if(!out.temp) s.discard.push(out);
      break;
    }
    case 'compostCard': {
      const why=compostProblem(s,a.uid); if(why) fail(why);
      useExchange(s);
      s.discard.push(...s.hand.splice(s.hand.findIndex(c=>c.uid===a.uid),1));
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
        const [out]=s.hand.splice(i,1); if(!out.temp) s.discard.push(out);
      }
      deliverTemporary(s,'compost'); s.compostReady=false; s.compostTick=0;
      break;
    }
    case 'keepCard': {
      const c = s.hand.find((h) => h.uid === a.uid);
      if (!c) fail('Карты нет в руке');
      if (c.temp) fail('Разовая карта и так останется в руке');
      if (c.keep) delete c.keep;
      else {
        if (keptCount(s) >= keepSlots(s)) fail(keepSlots(s) === 1 ? 'Отложить можно одну карту' : `Отложить можно не больше ${keepSlots(s)} карт`);
        c.keep = true;
      }
      break;
    }
    case 'discardCard': {
      const i = s.hand.findIndex((c) => c.uid === a.uid);
      if (i < 0) fail('Карты нет в руке');
      needDay(s);
      s.discard.push(...s.hand.splice(i, 1));
      break;
    }
    case 'waterHand': {
      const cells = [...new Map((a.tiles ?? []).filter(([x, y]) => cellOk(x, y)).map((c) => [`${c[0]},${c[1]}`, c] as const)).values()];
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
        feed(s, `Раскорчёвана клетка тайги за ${money(p)}: под ней жирная почва.${angry ? ' Лесхоз недоволен.' : ''}`, 'good');
      } else if (t.terrain === 'rock') {
        t.soil = 4;
        feed(s, `Камни убраны за ${money(p)}.`, 'good');
      } else {
        t.moisture = 3;
        t.soil = 3;
        feed(s, `Болото осушено за ${money(p)}.`, 'good');
      }
      t.terrain = 'plain';
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
    case 'unbuild':
      unbuild(s, a.item, a.x, a.y);
      break;
    case 'moveBuild':
      if (!Array.isArray(a.from) || !Array.isArray(a.to) || !cellOk(...a.from) || !cellOk(...a.to)) fail('Клетка вне поля');
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
      const weeks = trackWeeks(s, a.track, level);
      s.projects.push({ kind: 'track', track: a.track, level, weeks, total: weeks });
      feed(s, `Началась стройка: ${TRACKS[a.track].levels[level - 1].name}, ${weeks} ${plural(weeks, 'неделя', 'недели', 'недель')}.`, 'info');
      break;
    }
    case 'labCell': {
      const why = labProblem(s);
      if (why) fail(why);
      const c = findDeckCard(s, a.uid);
      if (!c || !isSeed(c.def)) fail('Выбери карту семян');
      // Selecting a hand card explicitly transfers that UID into the project.
      if (!Array.isArray(a.cell) || !upgradeSpots(s, c!).some(([x, y]) => x === a.cell[0] && y === a.cell[1])) fail('Сюда клетку не добавить');
      spend(s, cellPrice(s, c!), 'build');
      const origin = s.spare.some((c) => c.uid === a.uid) ? 'spare' as const : 'deck' as const;
      const card = removeCard(s, a.uid);
      const weeks = labWeeksFor(s, 'cell');
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
      if ((c!.traits?.length ?? 0) >= maxTraits(s)) fail('Больше признаков эта лаборатория не привьёт');
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
      if (s.team.length >= workerSlots(s)) fail('Все места в доме заняты: нужен дом побольше');
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
      const pay = round2(q.pay * (wlvl(s, 'marketer') >= 3 ? 1.1 : 1));
      s.money = round2(s.money + pay);
      s.stats.orders = round2(s.stats.orders + pay);
      s.earned = round2(s.earned + pay);
      st.rel = relClamp(st.rel + q.rel);
      st.active = null;
      st.wait = 1;
      const chain = q.step < ORGS[a.org].steps.length;
      if (chain) {
        st.step += 1;
        addGlory(s, 10, `quest-${a.org}-${q.step}`);
        if (q.reward) grant(s, q.reward, `${s.seed}|${s.loc}|${a.org}|${q.step}`);
        if (st.step === ORGS[a.org].steps.length) addGlory(s, 25, `chain-${a.org}`);
      }
      feed(s, `${ORGS[a.org].short}: заказ сдан, +${money(pay)}.`, 'good');
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
      s.incident = true;
      s.due = null;
      feed(s, `Платёж перенесён: ${money(s.carry)} добавятся к следующему. Рейтинг −2.`, 'bad');
      startWeek(s);
      break;
    }
    case 'giveUp': {
      s.phase = 'gameover';
      s.over = { reason: s.due ? `Не хватило ${money(Math.max(0, s.due.amount - s.money))} на платёж «${s.due.name}»` : 'Ферма закрыта' };
      feed(s, 'Ферма обанкротилась.', 'bad');
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

// ---------- building mode ----------
export function buildSpots(s: GameState, item: BuildItem): [number, number][] {
  const out: [number, number][] = [];
  if (item === 'drip') {
    for (let y = 0; y < GRID; y++) if (ownedTiles(s).some(([t, , ty]) => ty === y && !t.drip)) out.push([0, y]);
    return out;
  }
  if (item === 'scarecrow') {
    for (let y = 0; y < GRID - 1; y++)
      for (let x = 0; x < GRID - 1; x++)
        if (scarecrowCells(x, y).some(([a, b]) => tile(s, a, b).owned) && !s.scarecrows.some(([a, b]) => a === x && b === y)) out.push([x, y]);
    return out;
  }
  for (const [t, x, y] of ownedTiles(s)) {
    if (!TERRAIN[t.terrain].plantable || t.structure || t.canal) continue;
    if (item === 'hive' && t.crop) continue;
    if (item === 'canal' && (t.crop || !(nearTerrain(s, x, y, 'river') || nearCanal(s, x, y)))) continue;
    out.push([x, y]);
  }
  return out;
}
export function buildMoveSpots(s: GameState, item: BuildItem, from?: [number, number]): [number, number][] {
  if (!from) {
    if (item === 'scarecrow') return s.scarecrows.map(([x, y]) => [x, y]);
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
  const st = buildStock(s)[item];
  if (!st) fail('Нет такой постройки');
  if (st.used >= st.have) fail(st.have ? 'Все такие постройки уже стоят на поле' : 'Сначала её нужно построить в мастерской');
  if (!buildSpots(s, item).some(([a, b]) => (item === 'drip' ? b === y : a === x && b === y))) fail('Сюда не поставить');
  if (item === 'drip') for (let k = 0; k < GRID; k++) tile(s, k, y).drip = true;
  else if (item === 'scarecrow') s.scarecrows.push([x, y]);
  else if (item === 'canal') {
    const t = tile(s, x, y);
    t.canal = true;
    t.weeds = false;
  } else { tile(s, x, y).structure = item; if(item === 'greenhouse') tile(s,x,y).greenhousePlacedWeek=s.absWeek; }
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
  } else if (item === 'canal') {
    if (!tile(s, x, y).canal) fail('Здесь нет канала');
    tile(s, x, y).canal = false;
  } else {
    if (tile(s, x, y).structure !== item) fail('Здесь этого нет');
    if (item === 'greenhouse' && tile(s, x, y).crop && CROPS[tile(s, x, y).crop!.id].greenhouseOnly) fail('Сначала соберите культуру, которой нужна теплица');
    tile(s, x, y).structure = null;
    delete tile(s,x,y).greenhousePlacedWeek;
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
      if (!t.crop) t.idle = 0;
    }
  } else {
    spend(s, cardCost(s, card.def), 'work');
    if (card.def === 'helpers') s.days += 1;
    if (card.def === 'sidejob') {
      s.sidejobWeek = s.absWeek;
      s.money = round2(s.money + sidejobPay(s));
      s.earned = round2(s.earned + sidejobPay(s));
    }
    if (card.def === 'forage') {
      s.forageWeek = s.absWeek;
      const edge = ownedTiles(s).filter(([, x, y]) => nearTerrain(s, x, y, 'forest')).length;
      const q = 3 + Math.min(5, Math.floor(edge / 2)) + randInt(s, 2);
      addToStorage(s, 'mushrooms', q);
      feed(s, `Поход в тайгу: ${q} ед. грибов.`, 'good');
    }
  }
  s.days -= days;
  s.hand.splice(s.hand.indexOf(card), 1);
  // cards made by the compost pit or the lab are used up
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
  const amount = p ? paymentBase(s, p.season) + s.carry : 0;
  return { frost: r.frost, dying: r.dried, threats: diagnostic.threats, crows: crowsOpen(s), thieves: r.stolen, ripe: r.harvests.length, yardSale: r.yardUnits ?? 0, payment: p ? { amount, name: PAYMENT_NAMES[p.season], short: round2(Math.max(0, amount - c.money)) } : null, costs };
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
