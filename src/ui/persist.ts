import { SCENE_KINDS, ensureV3, repairOpenOffers } from '../engine/game';
import { CONDITIONS, LOOT, RELICS, VISITS } from '../engine/run';
// Saves: one profile shared by every farm (glory, certificates, pets, the seed bank, records) and one slot per farm.
import type { CropId, LocationId, PetId } from '../engine/data';
import { CARDS, CROPS, LOCATION_IDS, ORGS, PETS, SEED_BANK_OK, TERRAIN, TRACKS, TRAITS, WORKERS } from '../engine/data';
import type { GameState } from '../engine/game';
import { newGame } from '../engine/game';
import { EPISODES } from '../engine/calendar';
import { TRIALS } from '../engine/trials';
import { canWriteSession, managedSaveSession, saveSession } from './saveSession';

const PROFILE = 'posevnaya.v4.profile';
const FARM = (loc: LocationId) => `posevnaya.v4.farm.${loc}`;
const observed = new Map<string, string | null>();
const liveKeys = [PROFILE, ...LOCATION_IDS.map(FARM), 'posevnaya.tutorial.atlas.v4', 'posevnaya.tutorial.active'];

// Called only after acquiring exclusive ownership, before loading any UI state.
export function resetPersistenceSession() {
  observed.clear();
  issues.clear();
  invalid.clear();
  for (const key of liveKeys) {
    try { observed.set(key, localStorage.getItem(key)); } catch { /* read() reports unavailable storage */ }
  }
}
// ST-10 · site data wiped while the game is open: every live key is gone at once. Nothing newer exists anywhere,
// so this tab's progress is the only copy left and must stay writable (another tab never deletes every save).
const CLEARED = 'storage:cleared';
function storageCleared(): boolean {
  if (![...observed.values()].some((v) => v !== null)) return false;
  if (!liveKeys.every((k) => localStorage.getItem(k) === null)) return false;
  for (const k of observed.keys()) observed.set(k, null);
  issue(CLEARED, 'Данные сайта в браузере очищены. Прогресс этой вкладки будет записан заново.');
  return true;
}
export function checkSaveSession(): boolean {
  if (!canWriteSession()) return false;
  if (!managedSaveSession) return true;
  try {
    for (const [key, raw] of observed) {
      if (localStorage.getItem(key) !== raw) { if (storageCleared()) return true; saveSession.invalidate(); return false; }
    }
  } catch {
    // A storage outage must preserve in-memory play. The exclusive browser lock
    // still protects ownership; actual writes report quota/unavailability.
  }
  return true;
}
function rememberRead(key: string, raw: string | null) {
  if (managedSaveSession && observed.has(key) && observed.get(key) !== raw && !(raw === null && storageCleared())) {
    saveSession.invalidate();
    return false;
  }
  observed.set(key, raw);
  return true;
}
// Tutorial saves use the same ownership and snapshot fence as farm/profile.
export function writeSessionStorage(key: string, value: string | null): boolean {
  if (!checkSaveSession()) return false;
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
    observed.set(key, value);
    issue(`${key}:write`);
    return true;
  } catch {
    issue(`${key}:write`, 'Обучение не сохранено: запись недоступна или недостаточно места. Повторите действие после освобождения места.');
    return false;
  }
}

export interface FarmRecord { loc: LocationId; years: number; glory: number; reason: string; at: number; runId?: string; seed?: string }
export interface Profile {
  v: 1;
  glory: number;
  applied: string[];
  pets: PetId[];
  certs: { name: string; loc: LocationId; year: number }[];
  seedBank: CropId[];
  best: { years: number; money: number; harvest: number };
  history: FarmRecord[];
  settings: { fast: boolean; intro: boolean; guide?: boolean };
}
export const emptyProfile = (): Profile => ({
  v: 1, glory: 0, applied: [], pets: [], certs: [], seedBank: [], best: { years: 0, money: 0, harvest: 0 }, history: [], settings: { fast: false, intro: false },
});

// Never delete a live slot before its replacement is safely written. A failed
// backup/write leaves the original slot in place and remains visible to the UI.
const issues = new Map<string, string>();
const invalid = new Set<string>();
const listeners = new Set<() => void>();
export const persistenceStatus = () => [...issues.values()].join(' ');
export const subscribePersistence = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
function issue(key: string, message?: string) {
  if (message) issues.set(key, message); else issues.delete(key);
  for (const fn of listeners) fn();
}
const label = (key: string) => key === PROFILE ? 'Профиль' : 'Ферма';
const obj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const arr = (v: unknown, valid: (v: any) => boolean): v is any[] => Array.isArray(v) && v.every(valid);
const member = (table: object, v: unknown) => typeof v === 'string' && Object.hasOwn(table, v);
const loc = (v: unknown): v is LocationId => LOCATION_IDS.includes(v as LocationId);
function read<T>(key: string, valid: (v: unknown) => v is T): T | null {
  const notice = `${key}:read`;
  try {
    const raw = localStorage.getItem(key);
    if (!rememberRead(key, raw)) return null;
    if (raw === null) { invalid.delete(key); issue(notice); return null; }
    let value: unknown;
    try { value = JSON.parse(raw); } catch { /* try the last complete snapshot */ }
    if (valid(value)) { invalid.delete(key); issue(notice); return value; }
    const backup = localStorage.getItem(`${key}.backup`);
    let recovered: unknown;
    try { recovered = backup === null ? null : JSON.parse(backup); } catch { /* keep both original strings */ }
    if (valid(recovered)) {
      invalid.delete(key);
      issue(notice, `${label(key)}: повреждено сохранение, загружена резервная копия. Нажмите «Сохранить», чтобы восстановить основной слот.`);
      return recovered;
    }
    invalid.add(key);
    issue(notice, `${label(key)}: сохранение повреждено. Данные сохранены; замена требует подтверждения.`);
    return null;
  } catch {
    issue(notice, `${label(key)}: хранилище недоступно. Прогресс остаётся в этой вкладке; повторите сохранение.`);
    return null;
  }
}
function write<T>(key: string, value: T, valid: (v: unknown) => v is T, replaceInvalid = false): boolean {
  if (!checkSaveSession()) return false;
  try {
    if (!valid(value)) throw new Error('Invalid state');
    const old = localStorage.getItem(key);
    if (old !== null) {
      let previous: unknown;
      try { previous = JSON.parse(old); } catch { /* preserve malformed input */ }
      if (valid(previous)) {
        if (replaceInvalid) localStorage.setItem(`${key}.previous`, old);
        localStorage.setItem(`${key}.backup`, old);
      }
      else {
        const backup = localStorage.getItem(`${key}.backup`);
        let recovered: unknown;
        try { recovered = backup === null ? null : JSON.parse(backup); } catch { /* no valid backup */ }
        if (!replaceInvalid && !valid(recovered)) {
          issue(`${key}:write`, `${label(key)}: повреждённые данные сохранены. Подтвердите восстановление для замены.`);
          return false;
        }
        localStorage.setItem(`${key}.recovery`, old);
      }
    }
    const raw = JSON.stringify(value);
    localStorage.setItem(key, raw);
    observed.set(key, raw);
    invalid.delete(key);
    issue(`${key}:read`);
    issue(`${key}:write`);
    if (issues.has(CLEARED) && key !== PROFILE) issue(CLEARED); // the progress is written again
    return true;
  } catch {
    issue(`${key}:write`, `${label(key)} не ${key === PROFILE ? "сохранён" : "сохранена"}: запись недоступна или недостаточно места. Прогресс остаётся в этой вкладке; повторите сохранение.`);
    return false;
  }
}

function validProfile(v: unknown): v is Profile {
  return obj(v) && v.v === 1 && num(v.glory) && v.glory >= 0 && arr(v.applied, (x) => typeof x === 'string')
    && arr(v.pets, (x) => member(PETS, x)) && arr(v.certs, (x) => obj(x) && typeof x.name === 'string' && loc(x.loc) && num(x.year))
    && arr(v.seedBank, (x) => member(CROPS, x)) && obj(v.best) && ['years', 'money', 'harvest'].every((k) => num(v.best[k]))
    && arr(v.history, (x) => obj(x) && loc(x.loc) && ['years', 'glory', 'at'].every((k) => num(x[k])) && typeof x.reason === 'string')
    && obj(v.settings) && typeof v.settings.fast === 'boolean' && typeof v.settings.intro === 'boolean' && (v.settings.guide === undefined || typeof v.settings.guide === 'boolean');
}

// Match every mandatory scalar/object against an engine-created state. Empty
// collections and nullable values need their own element schemas below.
function shape(v: unknown, template: unknown): boolean {
  if (template === null || Array.isArray(template)) return true;
  if (typeof template === 'number') return num(v);
  if (obj(template)) return obj(v) && Object.keys(template).every((k) => shape(v[k], template[k]));
  return typeof v === typeof template;
}
const templates = new Map<LocationId, GameState>();
const points = (v: unknown) => arr(v, (x) => Array.isArray(x) && x.length === 2 && x.every(Number.isInteger));
const coords = (v: unknown) => arr(v, (x) => Array.isArray(x) && x.length === 2 && x.every((n) => Number.isInteger(n) && n >= 0 && n < 6));
const card = (v: any) => obj(v) && Number.isInteger(v.uid) && member(CARDS, v.def) && (v.extra === undefined || points(v.extra)) && (v.traits === undefined || arr(v.traits, (t) => member(TRAITS, t)));
const lot = (v: any) => obj(v) && member(CROPS, v.crop) && num(v.qty) && v.qty >= 0 && num(v.age);
const cell = (x: unknown, y: unknown) => Number.isInteger(x) && Number.isInteger(y) && (x as number) >= 0 && (x as number) < 6 && (y as number) >= 0 && (y as number) < 6;
const plant = (p: any) => obj(p) && member(CROPS, p.id) && ['grown', 'bonus', 'mult', 'planted', 'pid'].every((k) => num(p[k]));
const DAMAGE = ['frost', 'dry', 'hail', 'flood', 'crows', 'thieves', 'bear', 'boars', 'fire'];
const STRIKES = ['hail', 'flood', 'beetle', 'locust', 'weedsurge', 'bear', 'boars', 'fire'];
const int = (v: unknown, min = 0) => Number.isInteger(v) && (v as number) >= min;
const worker = (x: any) => obj(x) && member(WORKERS, x.id) && Number.isInteger(x.level) && x.level >= 1 && x.level <= WORKERS[x.id as keyof typeof WORKERS].levels.length && Number.isInteger(x.away) && x.away >= 0
  && (x.leaves === undefined || int(x.leaves)) && (x.free === undefined || typeof x.free === 'boolean');
// v3 · an expedition's run and the home's cart, arrest and buyout: optional, checked on their own
const runResult = (x: any) => obj(x) && num(x.cash) && x.cash >= 0 && arr(x.loot, (l) => member(LOOT, l)) && mats(x.mats) && arr(x.cards, card) && (x.worker === undefined || worker(x.worker)) && typeof x.bankrupt === 'boolean' && (x.settled === undefined || typeof x.settled === 'boolean');
const run = (r: any) => obj(r) && member(CONDITIONS, r.cond) && arr(r.relics, (x) => member(RELICS, x)) && (r.home === undefined || typeof r.home === 'string') && (r.work === undefined || typeof r.work === 'boolean')
  && obj(r.carried) && arr(r.carried.uids, Number.isInteger) && (r.carried.worker === undefined || member(WORKERS, r.carried.worker)) && num(r.carried.cash)
  && (r.visit === null || obj(r.visit) && member(VISITS, r.visit.id) && int(r.visit.week) && (r.visit.relic === undefined || member(RELICS, r.visit.relic)) && (r.visit.price === undefined || num(r.visit.price)))
  && int(r.nextVisit) && arr(r.seen, (x) => typeof x === 'string') && arr(r.used, (x) => typeof x === 'string') && int(r.autumns)
  && (r.dig === undefined || obj(r.dig) && cell(r.dig.x, r.dig.y) && int(r.dig.until)) && (r.calm === undefined || obj(r.calm) && ['bear', 'boars'].every((k) => r.calm[k] === undefined || int(r.calm[k])))
  && (r.cones === undefined || int(r.cones)) && (r.surcharge === undefined || num(r.surcharge) && r.surcharge >= 0) && (r.result === undefined || runResult(r.result));
const away = (a: any) => obj(a) && ['rent', 'kuban', 'altai'].includes(a.loc) && typeof a.seed === 'string' && arr(a.cards, card) && (a.worker === undefined || worker(a.worker)) && num(a.cash) && a.cash >= 0 && int(a.week);
const quest = (v: any) => v === null || obj(v) && (v.createdWeek === undefined || Number.isInteger(v.createdWeek) && v.createdWeek >= 0) && member(ORGS, v.org) && ['id', 'step', 'pay', 'rel', 'weeks'].every((k) => num(v[k])) && typeof v.title === 'string' && typeof v.text === 'string' && arr(v.lines, (x) => obj(x) && member(CROPS, x.crop) && num(x.qty));
const MAT_KEYS = ['logs', 'bricks', 'glass'];
const mats = (v: any) => obj(v) && Object.entries(v).every(([k, n]) => MAT_KEYS.includes(k) && Number.isInteger(n) && (n as number) >= 0);
const fairLot = (l: any) => obj(l) && Number.isInteger(l.id) && ['equip', 'mat', 'worker'].includes(l.kind) && num(l.price) && l.price >= 0
  && (l.kind !== 'equip' || member(TRACKS, l.track) && Number.isInteger(l.level) && l.level >= 1 && l.level <= TRACKS[l.track as keyof typeof TRACKS].levels.length)
  && (l.kind !== 'mat' || mats(l.mats)) && (l.kind !== 'worker' || member(WORKERS, l.worker))
  && (l.sold === undefined || ['player', 'rival'].includes(l.sold)) && ['hold', 'deposit', 'wlevel'].every((k) => l[k] === undefined || num(l[k]));
const fair = (f: any) => f === undefined || obj(f) && ['year', 'season', 'eyeWeek', 'rival', 'nextId'].every((k) => num(f[k])) && (f.eye === null || Number.isInteger(f.eye)) && arr(f.lots, fairLot);
export function validFarm(v: unknown): v is GameState {
  if (!obj(v) || v.v !== 5 || !loc(v.loc) || typeof v.seed !== 'string' || !v.seed || !['week', 'shortfall', 'gameover', 'arrest'].includes(v.phase)) return false;
  // v3 fields are optional (old saves lack them) and checked on their own: the template leaves them out
  if (!templates.has(v.loc)) {
    const { mats: _m, fair: _f, equipSeen: _e, paidYears: _p, ...base } = newGame({ loc: v.loc, seed: 'validation' });
    templates.set(v.loc, base as GameState);
  }
  if (v.mats !== undefined && (!mats(v.mats) || MAT_KEYS.some((k) => !Number.isInteger(v.mats[k])))) return false;
  if (!fair(v.fair) || (v.equipSeen !== undefined && !(obj(v.equipSeen) && Object.entries(v.equipSeen).every(([k, n]) => member(TRACKS, k) && Number.isInteger(n))))) return false;
  if (['helpWeek'].some((k) => v[k] !== undefined && !Number.isInteger(v[k])) || (v.quiet !== undefined && typeof v.quiet !== 'boolean')) return false;
  if (['paidYears', 'skipYears'].some((k) => v[k] !== undefined && !int(v[k])) || (v.owned !== undefined && typeof v.owned !== 'boolean')) return false;
  if ((v.run !== undefined && !run(v.run)) || (v.away !== undefined && !away(v.away))) return false;
  if (v.arrest !== undefined && !(obj(v.arrest) && num(v.arrest.debt) && v.arrest.debt >= 0 && int(v.arrest.runs))) return false;
  if (v.phase === 'arrest' && v.arrest === undefined) return false;
  if (v.over && v.over.work !== undefined && !(num(v.over.work) && v.over.work > 0)) return false;
  const base = templates.get(v.loc)!;
  if(v.guide!==undefined && !arr(v.guide,x=>typeof x==='string' && ['plant','rotate','water','harvest','sale','payment','order','delivery','soil'].includes(x))) return false;
  if(['compostReady','shortfallBorrowed'].some(k=>v[k]!==undefined && typeof v[k]!=='boolean')) return false;
  if(v.exchangeWeek!==undefined && (!Number.isInteger(v.exchangeWeek) || v.exchangeWeek<0)) return false;
  // the ordeal of the year and the fire pits (absent in older saves)
  if(v.fires!==undefined && !coords(v.fires)) return false;
  if(v.firesLit!==undefined && (!Number.isInteger(v.firesLit) || v.firesLit<0)) return false;
  if(v.trial!==undefined && !(obj(v.trial) && typeof v.trial.id==='string' && member(TRIALS,v.trial.kind) && ['year','power','from','to','week','len'].every(k=>Number.isInteger(v.trial[k])) && (v.trial.dir===undefined || ['w','e','n','s'].includes(v.trial.dir)) && ['temp','beds','risk','lostValue','lostUnits'].every(k=>v.trial[k]===undefined || num(v.trial[k])) && (v.trial.result===undefined || obj(v.trial.result) && [0,1,2,3].includes(v.trial.result.grade) && ['saved','beds','risk','lostValue','lostUnits','glory'].every(k=>num(v.trial.result[k]))))) return false;
  if(v.scenes!==undefined && !arr(v.scenes,e=>obj(e) && typeof e.id==='string' && Number.isInteger(e.week) && e.week>=0 && (e.at===undefined||coords([e.at])) && (e.visit===undefined || obj(e.visit) && ['stolen','empty'].includes(e.visit.outcome) && coords(e.visit.targets) && coords(e.visit.crows)) && (SCENE_KINDS as string[]).includes(e.kind))) return false;

  if (!shape(v, base) || !Number.isInteger(v.season) || v.season < 0 || v.season > 3 || v.year < 1 || v.week < 0 || v.week > base.temps.length || v.absWeek < 0) return false;
  if (!Array.isArray(v.tiles) || v.tiles.length !== 36 || !v.tiles.every((t: any) => shape(t, base.tiles[0]) && (t.greenhousePlacedWeek===undefined || Number.isInteger(t.greenhousePlacedWeek) && t.greenhousePlacedWeek>=0 && t.greenhousePlacedWeek<=v.absWeek) && (t.hivePlacedWeek===undefined || Number.isInteger(t.hivePlacedWeek) && t.hivePlacedWeek>=0 && t.hivePlacedWeek<=v.absWeek) && (t.tree === undefined || Number.isInteger(t.tree) && t.tree >= 0) && (t.chop === undefined || Number.isInteger(t.chop) && t.chop >= 0) && Number.isInteger(t.soil) && t.soil >= 1 && t.soil <= 5 && Number.isInteger(t.moisture) && t.moisture >= 0 && t.moisture <= 3 && member(TERRAIN, t.terrain) && (t.last === null || member(CROPS, t.last)) && [null, 'greenhouse', 'hive'].includes(t.structure) && (t.crop === null || obj(t.crop) && member(CROPS, t.crop.id) && ['grown', 'bonus', 'mult', 'planted', 'pid'].every((k) => num(t.crop[k])) && (t.crop.traits === undefined || arr(t.crop.traits, (x) => member(TRAITS, x)))))) return false;
  if (!['draw', 'hand', 'discard', 'spare'].every((k) => arr(v[k], card)) || !['storage', 'yard'].every((k) => arr(v[k], lot))) return false;
  if (!arr(v.pets, (x) => member(PETS, x)) || !arr(v.certs, (x) => typeof x === 'string') || !['unlocked', 'harvestedKinds'].every((k) => arr(v[k], (x) => member(CROPS, x)))) return false;
  if (!obj(v.levels) || !Object.entries(v.levels).every(([k, n]) => member(TRACKS, k) && Number.isInteger(n) && (n as number) >= (k === 'house' ? 1 : 0) && (n as number) <= TRACKS[k as keyof typeof TRACKS].levels.length) || !coords(v.guards) || !coords(v.scarecrows)) return false;
  if (!arr(v.team, worker) || !['candidates', 'freeHire'].every((k) => arr(v[k], (x) => member(WORKERS, x)))) return false;
  // PSV-022 · a story step is a whole number from 0; relations stay within −100…100
  if (!obj(v.orgs) || !Object.entries(v.orgs).every(([k, x]) => member(ORGS, k) && obj(x) && ['rel', 'step', 'wait', 'idle', 'lastMischief'].every((n) => num(x[n])) && Number.isInteger(x.step) && x.step >= 0 && x.rel >= -100 && x.rel <= 100 && quest(x.offer) && quest(x.active))) return false;
  if (!arr(v.projects, (x) => obj(x) && num(x.weeks) && num(x.total) && (x.kind === 'track' ? member(TRACKS, x.track) && Number.isInteger(x.level) && x.level >= 1 && x.level <= TRACKS[x.track as keyof typeof TRACKS].levels.length : x.kind === 'cell' ? card(x.card) && points([x.cell]) : x.kind === 'trait' ? card(x.card) && member(TRAITS, x.trait) : x.kind === 'variety' ? member(CROPS, x.crop) : x.kind === 'train' ? member(WORKERS, x.worker) : x.kind === 'bio'))) return false;
  if (!Number.isInteger(v.rating) || v.rating < 0 || v.rating > 5) return false;
  // every card is one object: a uid seen twice would play or move the wrong card
  const uids = [...['draw', 'hand', 'discard', 'spare'].flatMap((k) => v[k]), ...v.projects.flatMap((x: any) => x.kind === 'cell' || x.kind === 'trait' ? [x.card] : [])].map((c: any) => c.uid);
  if (new Set(uids).size !== uids.length) return false;
  if (!arr(v.plan, (x) => obj(x) && member(EPISODES, x.kind) && ['id', 'start', 'len'].every((k) => num(x[k]))) || !arr(v.temps, num) || v.temps.length !== base.temps.length) return false;
  if (!arr(v.loans, (x) => obj(x) && ['id', 'principal', 'rate'].every((k) => num(x[k]))) || !arr(v.effects, (x) => obj(x) && x.kind === 'review' && num(x.mult) && num(x.weeks))) return false;
  if (!arr(v.strikes, (x) => obj(x) && (x.trial===undefined || typeof x.trial==='boolean') && STRIKES.includes(x.kind) && num(x.ep) && num(x.week) && typeof x.zone === 'boolean' && arr(x.cells, (c) => Array.isArray(c) && c.length === 3 && c.every(num) && cell(c[0], c[1])))) return false;
  if (!(v.crows === null || obj(v.crows) && num(v.crows.week) && typeof v.crows.shoo === 'boolean' && typeof v.crows.drone === 'boolean' && arr(v.crows.targets, (x) => obj(x) && ['x', 'y', 'pid'].every((k) => num(x[k])) && cell(x.x, x.y) && ['young', 'ripe'].includes(x.type)))) return false;
  if (!['crowWarn', 'crowRolled', 'kidsWarn', 'kidsRolled'].every((k) => v[k] === undefined || arr(v[k], num))) return false;
  if (!(v.thieves === null || obj(v.thieves) && num(v.thieves.week) && typeof v.thieves.talked === 'boolean' && arr(v.thieves.targets, (x) => obj(x) && ['x', 'y', 'pid'].every((k) => num(x[k])) && cell(x.x, x.y)))) return false;
  const report = (x: unknown) => obj(x) && ['milk', 'borrowed', 'insurancePaid', 'yardUnits'].every((k) => x[k] === undefined || num(x[k]) && x[k] >= 0) && (x.fieldDamage === undefined || arr(x.fieldDamage, (d) => obj(d) && DAMAGE.includes(d.kind) && cell(d.x, d.y) && plant(d.before) && (d.after === null || plant(d.after)) && num(d.lost) && (d.note === undefined || typeof d.note === 'string'))) && (x.pestHits===undefined || arr(x.pestHits,h=>obj(h)&&['locust','beetle'].includes(h.kind)&&coords([[h.x,h.y]])&&num(h.lost)&&h.lost>=0&&obj(h.plant)&&member(CROPS,h.plant.id)&&['grown','bonus','mult','planted','pid'].every(k=>num(h.plant[k]))&&(h.after===undefined||h.after===null||obj(h.after)&&member(CROPS,h.after.id)&&['grown','bonus','mult','planted','pid'].every(k=>num(h.after[k]))))) && shape(x, base.report) && arr(x.harvests, (h) => obj(h) && member(CROPS, h.crop) && ['qty', 'x', 'y'].every((k) => num(h[k])) && cell(h.x, h.y)) && arr(x.lost, (s) => typeof s === 'string') && arr(x.done, (s) => typeof s === 'string') && arr(x.costs, (c) => obj(c) && typeof c.label === 'string' && num(c.amount));
  return report(v.report) && (v.lastReport === null || report(v.lastReport))
    && arr(v.feed, (x) => obj(x) && num(x.week) && typeof x.text === 'string' && ['good', 'bad', 'info'].includes(x.tone))
    && arr(v.rewardsOut, (x) => obj(x) && typeof x.id === 'string' && (x.kind === 'glory' ? num(x.value) && x.value >= 0 : x.kind === 'pet' ? member(PETS, x.value) : x.kind === 'seed' ? member(CROPS, x.value) : x.kind === 'cert' && typeof x.value === 'string'))
    && (v.over === null || obj(v.over) && typeof v.over.reason === 'string') && (v.due === null || obj(v.due) && num(v.due.amount) && typeof v.due.name === 'string')
    && (v.phase !== 'gameover' || v.over !== null) && (v.phase !== 'shortfall' || v.due !== null);
}

export function loadProfile(): Profile {
  return read(PROFILE, validProfile) ?? emptyProfile();
}
export const saveProfile = (p: Profile, replaceInvalid = false) => write(PROFILE, p, validProfile, replaceInvalid);
export const profileRecoveryRequired = () => invalid.has(PROFILE);

export function loadFarm(loc: LocationId): GameState | null {
  return read(FARM(loc), (v): v is GameState => validFarm(v) && v.loc === loc);
}
export const saveFarm = (s: GameState, replaceInvalid = false) => write(FARM(s.loc), s, validFarm, replaceInvalid);
export function hasFarmData(loc: LocationId): boolean {
  try { return localStorage.getItem(FARM(loc)) !== null; } catch { return true; }
}
export function syncFarm(p: Profile, s: GameState): GameState {
  const unlocked = [...new Set([...s.unlocked, ...p.seedBank.filter((c) => SEED_BANK_OK[c]?.includes(s.loc))])];
  const pets = [...new Set([...s.pets, ...p.pets])];
  return ensureV3(repairOpenOffers(unlocked.length === s.unlocked.length && pets.length === s.pets.length ? s : { ...s, unlocked, pets }));
}
export const allFarms = (): Partial<Record<LocationId, GameState>> =>
  Object.fromEntries(LOCATION_IDS.map((l) => [l, loadFarm(l)]).filter(([, s]) => s)) as Partial<Record<LocationId, GameState>>;

// what the farm earned for the profile, applied exactly once by the reward's id
export function syncProfile(p: Profile, s: GameState): Profile {
  const done = new Set(p.applied);
  let changed = false;
  const next: Profile = { ...p, applied: [...p.applied], pets: [...p.pets], certs: [...p.certs], seedBank: [...p.seedBank], best: { ...p.best } };
  for (const r of s.rewardsOut) {
    if (done.has(r.id)) continue;
    done.add(r.id);
    next.applied.push(r.id);
    changed = true;
    if (r.kind === 'glory') next.glory += Number(r.value) || 0;
    if (r.kind === 'pet' && !next.pets.includes(r.value as PetId)) next.pets.push(r.value as PetId);
    if (r.kind === 'cert' && !next.certs.some((c) => c.name === r.value)) next.certs.push({ name: String(r.value), loc: s.loc, year: s.year });
    if (r.kind === 'seed' && !next.seedBank.includes(r.value as CropId)) next.seedBank.push(r.value as CropId);
  }
  if (s.money > next.best.money) (next.best.money = Math.round(s.money)), (changed = true);
  if (s.yearsCompleted > next.best.years) (next.best.years = s.yearsCompleted), (changed = true);
  if (s.stats.harvested > next.best.harvest) (next.best.harvest = s.stats.harvested), (changed = true);
  return changed ? next : p;
}
export const farmRunId = (s: GameState) => `${s.loc}|${s.seed}`;
export function recordEnd(p: Profile, s: GameState, reason = s.over?.reason ?? 'Перезапуск'): Profile {
  const runId = farmRunId(s);
  if (p.history.some((h) => h.runId === runId)) return p;
  const rec: FarmRecord = { loc: s.loc, seed: s.seed, runId, years: s.yearsCompleted, glory: s.glory, reason, at: Date.now() };
  return { ...p, history: [rec, ...p.history].slice(0, 12) };
}
