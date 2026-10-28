// QA matrix ST-01…ST-10 at the code level: saves, backups, profile sync, tab ownership, migration from 3552a1e.
// Tests named «FIX …» reproduce a bug found by the matrix and fixed in the same change (they failed before it).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as G from '../src/engine/game';
import * as D from '../src/engine/data';
import { testFixture } from '../src/engine/testLab';
import * as TUT from '../src/engine/tutorial';
import { play } from './lesson-walk';
import { emptyProfile, loadFarm, saveFarm, saveProfile, loadProfile, syncProfile, validFarm } from '../src/ui/persist';

// ---------- a Map-backed localStorage / sessionStorage (no window: managedSaveSession is false here) ----------
const store = new Map<string, string>();
const fakeStorage = (m: Map<string, string>) => ({
  getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
  setItem: (k: string, v: string) => { m.set(k, String(v)); },
  removeItem: (k: string) => { m.delete(k); },
  clear: () => m.clear(),
});
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: fakeStorage(store) });
Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: fakeStorage(new Map()) });

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const gitRepo = process.env.QA_GIT_REPO ?? repoRoot;
const OLD = '3552a1e';
const json = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

// ---------- a deterministic player usable with any engine build ----------
function prng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = <T,>(r: () => number, xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
function attempt(E: any, s: any, a: any): any {
  try { return E.apply(s, a); } catch (e) { if (e instanceof E.GameError) return null; throw new Error(`${a.t}: ${(e as Error).stack}`); }
}
function playerWeek(E: any, Dm: any, s: any, r: () => number): any {
  for (let guard = 0; guard < 30 && s.phase === 'week'; guard++) {
    const roll = r();
    if (roll < 0.45 && s.hand.length) {
      const card = pick(r, s.hand) as any;
      if (E.cardBlockReason(s, card)) continue;
      const d = Dm.CARDS[card.def];
      let n: any = null;
      if (d.kind === 'seed') { const pl = E.placements(s, card); if (pl.length) n = attempt(E, s, { t: 'play', uid: card.uid, tiles: pick(r, pl as any[]).tiles }); }
      else if (d.target === 'none') n = attempt(E, s, { t: 'play', uid: card.uid });
      else if (d.target === 'row' || d.target === 'line') n = attempt(E, s, { t: 'play', uid: card.uid, row: Math.floor(r() * 6) });
      else { const tg = E.playableTargets(s, card.def); if (tg.length) n = attempt(E, s, { t: 'play', uid: card.uid, tiles: [pick(r, tg)] }); }
      if (n) s = n;
    } else if (roll < 0.55) {
      const dry = E.ownedTiles(s).filter(([t]: any) => t.crop && t.moisture < 1);
      if (dry.length) s = attempt(E, s, { t: 'waterHand', tiles: [[dry[0][1], dry[0][2]]] }) ?? s;
    } else if (roll < 0.6) {
      for (const l of [...s.storage, ...s.yard]) if (r() < 0.5) s = attempt(E, s, { t: 'sell', crop: l.crop, qty: l.qty }) ?? s;
    } else if (roll < 0.68) {
      for (const o of Dm.LOCATIONS[s.loc].orgs) {
        if (!E.acceptProblem(s, o)) s = attempt(E, s, { t: 'accept', org: o }) ?? s;
        if (!E.deliverProblem(s, o)) s = attempt(E, s, { t: 'deliver', org: o }) ?? s;
      }
    } else if (roll < 0.74) {
      const ts = Object.keys(Dm.TRACKS).filter((t) => E.trackAvailable(s, t) && !E.trackProblem(s, t));
      if (ts.length) s = attempt(E, s, { t: 'track', track: pick(r, ts) }) ?? s;
    } else if (roll < 0.8) {
      for (const item of ['greenhouse', 'hive', 'drip', 'scarecrow', 'canal']) {
        const st = E.buildStock(s)[item];
        if (st.used < st.have) { const sp = E.buildSpots(s, item); if (sp.length) { const [x, y] = pick(r, sp) as [number, number]; s = attempt(E, s, { t: 'build', item, x, y }) ?? s; } }
      }
    } else if (roll < 0.83) {
      const def = pick(r, E.shopCards(s) as string[]);
      if (s.money > E.cardShopPrice(s, def) + 40) s = attempt(E, s, { t: 'buyCard', def }) ?? s;
    } else if (roll < 0.87 && !E.labProblem(s)) {
      const seeds = [...s.draw, ...s.discard].filter((c: any) => Dm.CARDS[c.def].kind === 'seed');
      const k = Math.floor(r() * 4);
      if (k === 0 && seeds.length) { const c = pick(r, seeds) as any; const sp = E.upgradeSpots(s, c); if (sp.length) s = attempt(E, s, { t: 'labCell', uid: c.uid, cell: sp[0] }) ?? s; }
      else if (k === 1 && seeds.length) s = attempt(E, s, { t: 'labTrait', uid: (seeds[0] as any).uid, trait: pick(r, Dm.TRAIT_IDS) }) ?? s;
      else if (k === 2 && E.labCrops(s).length) s = attempt(E, s, { t: 'labVariety', crop: E.labCrops(s)[0] }) ?? s;
      else s = attempt(E, s, { t: 'labBio' }) ?? s;
    } else if (roll < 0.9) {
      if (s.candidates.length) s = attempt(E, s, { t: 'hire', id: s.candidates[0] }) ?? s;
      if (s.team.length) s = attempt(E, s, { t: 'train', id: s.team[0].id }) ?? s;
    } else if (roll < 0.93) {
      for (const [, x, y] of E.ownedTiles(s)) if (E.guardable(s, x, y)) s = attempt(E, s, { t: 'guard', x, y }) ?? s;
      if (E.crowsOpen(s)) s = attempt(E, s, { t: 'shoo' }) ?? s;
      if (s.thieves) s = attempt(E, s, { t: 'talkKids' }) ?? s;
      for (const [t, x, y] of E.ownedTiles(s)) if (t.weeds) s = attempt(E, s, { t: 'weed', x, y }) ?? s;
    } else if (roll < 0.95) {
      for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) {
        if (E.canClear(s, x, y)) s = attempt(E, s, { t: 'clear', x, y }) ?? s;
        else if (E.canBuyLand(s, x, y) && s.money > E.landPrice(s) + 60) s = attempt(E, s, { t: 'buyLand', x, y }) ?? s;
      }
    } else break;
  }
  return s;
}
function settleShortfall(E: any, s: any): any {
  for (const l of [...s.storage, ...s.yard]) s = attempt(E, s, { t: 'sell', crop: l.crop, qty: l.qty }) ?? s;
  return attempt(E, s, { t: 'pay' }) ?? attempt(E, s, { t: 'emergency' }) ?? attempt(E, s, { t: 'restructure' }) ?? E.apply(s, { t: 'giveUp' });
}
function nonFinite(v: unknown, path = '$', out: string[] = []): string[] {
  if (typeof v === 'number') { if (!Number.isFinite(v)) out.push(`${path}=${v}`); }
  else if (Array.isArray(v)) v.forEach((x, i) => nonFinite(x, `${path}[${i}]`, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) nonFinite(x, `${path}.${k}`, out);
  return out;
}

// ---------- the oldest public build (3552a1e), straight from git ----------
let oldBuild: { G: any; D: any; T: any; L: any } | null | undefined;
async function old() {
  if (oldBuild !== undefined) return oldBuild;
  try {
    const dir = mkdtempSync(join(tmpdir(), 'qa-old-engine-'));
    writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
    for (const f of ['game', 'data', 'calendar', 'rng', 'testLab', 'tutorial'])
      writeFileSync(join(dir, `${f}.ts`), execFileSync('git', ['-C', gitRepo, 'show', `${OLD}:src/engine/${f}.ts`], { encoding: 'utf8' }));
    const at = (f: string) => import(pathToFileURL(join(dir, `${f}.ts`)).href);
    oldBuild = { G: await at('game'), D: await at('data'), T: await at('tutorial'), L: await at('testLab') };
  } catch { oldBuild = null; }
  return oldBuild;
}
// realistic saves of the old build: every region, mid-season, shortfall, game over, hives, projects, orders, lab fixtures
async function oldSaves(): Promise<Record<string, any>> {
  const o = (await old())!;
  const out: Record<string, any> = {};
  for (const loc of o.D.LOCATION_IDS as D.LocationId[]) {
    out[`${loc}/new`] = o.G.newGame({ loc, seed: `OLD-${loc}` });
    for (const rich of [false, true]) {
      let s = o.G.newGame({ loc, seed: `OLD-${loc}-${rich}` });
      if (rich) s = { ...s, money: 3000 };
      const r = prng(rich ? 77 : 13), tag = `${loc}/${rich ? 'rich' : 'poor'}`;
      for (let w = 0; w < 120 && s.phase !== 'gameover'; w++) {
        s = playerWeek(o.G, o.D, s, r);
        if (w === 6) out[`${tag}/mid-season`] = s;
        if (w === 60) out[`${tag}/late`] = s;
        if (s.phase === 'shortfall') { out[`${tag}/shortfall`] ??= s; s = settleShortfall(o.G, s); continue; }
        if (s.tiles.some((t: any) => t.structure === 'hive')) out[`${tag}/hive`] ??= s;
        if (s.tiles.some((t: any) => t.structure === 'greenhouse')) out[`${tag}/greenhouse`] ??= s;
        if (s.projects.length) out[`${tag}/project`] ??= s;
        if (Object.values(s.orgs).some((x: any) => x?.active)) out[`${tag}/order`] ??= s;
        s = o.G.endWeek(s);
      }
      out[`${tag}/final:${s.phase}`] = s;
    }
  }
  for (const [k] of o.L.TEST_SCENARIOS) for (const loc of ['chernozem', 'altai']) out[`fixture/${k}/${loc}`] = o.L.testFixture(k, loc);
  return json(out);
}
// HEAD's own load check for a tutorial session (src/ui/Tutorial.tsx · load)
const tutorialAccepted = (v: any) => TUT.tutorialAccepted(v, validFarm);
// the action a careful learner takes at each step of the OLD build's lesson (version 3)
function oldLessonAction(E: any, T: any, t: any): any {
  const s = t.farm, org = Object.keys(s.orgs)[0];
  switch (t.step) {
    case 'plant': return { t: 'play', uid: s.hand.find((c: any) => c.def === 'seed_radish').uid, tiles: [[2, 2]] };
    case 'rotate': return { t: 'guide', lesson: 'rotate' };
    case 'bean': return { t: 'play', uid: s.hand.find((c: any) => c.def === 'seed_bean').uid, tiles: [[3, 2], [3, 3]] };
    case 'night': return { t: 'endWeek' };
    case 'water': return { t: 'waterHand', tiles: [T.tutorialPlant(t)] };
    case 'hail': { const [x, y] = s.strikes[0].cells[0]; return { t: 'guard', x, y }; }
    case 'sale': return { t: 'sell', crop: 'radish', qty: E.stockOf(s, 'radish') };
    case 'accept': return { t: 'accept', org };
    case 'deliver': return { t: 'deliver', org };
    case 'weeds': return { t: 'weed', x: t.weedAt[0], y: t.weedAt[1] };
    case 'visit': case 'lens': case 'chapter': return 'next';
    case 'compost': return { t: 'play', uid: t.heldUid, tiles: [[1, 2]] };
    case 'hire': return { t: 'hire', id: 'foreman' };
    case 'lab': { const c = E.deckList(s).find((c: any) => c.uid === t.labUid) ?? E.deckList(s).find((c: any) => c.def === 'seed_radish'); return { t: 'labCell', uid: c.uid, cell: E.upgradeSpots(s, c)[0] }; }
    case 'upgrade': return { t: 'track', track: 'irrigation' };
    case 'place': return { t: 'build', item: 'drip', x: 2, y: 2 };
    case 'practice': {
      if (!t.watered) { const i = s.tiles.findIndex((v: any) => v.owned && !v.drip && v.moisture < 3); return { t: 'waterHand', tiles: [[i % 6, Math.floor(i / 6)]] }; }
      const o = s.orgs[org]; if (o.offer) return { t: 'accept', org };
      const need = o.active?.lines[0]; if (need && E.stockOf(s, need.crop) >= need.qty) return { t: 'deliver', org };
      const dry = T.dryBeds(s); return dry.length ? { t: 'waterHand', tiles: [dry[0]] } : { t: 'endWeek' };
    }
    default: { const dry = T.dryBeds(s); return dry.length && s.days > 0 ? { t: 'waterHand', tiles: dry.slice(0, E.handWaterMax(s)) } : { t: 'endWeek' }; }
  }
}

// ---------- the real App (show/startNew/toMap, Web Locks fence) in a child process, screens stubbed ----------
// window is a per-tab EventTarget, so managedSaveSession is true there and the ownership fence is live.
const HARNESS = String.raw`
import { isMainThread } from 'node:worker_threads';
const STUBS = { './FarmScreen': 'FarmScreen', './MapScreen': 'MapScreen', './Intro': 'Intro', './Tutorial': 'Tutorial', './TestLab': 'TestLab', './common': 'common' };
const tabOf = (u) => { const i = u.indexOf('?tab='); return i < 0 ? null : u.slice(i + 5).split('&')[0]; };
export async function resolve(spec, ctx, next) {
  const parent = ctx.parentURL || '';
  const tab = tabOf(parent);
  if (tab !== null && parent.includes('/src/ui/App.tsx') && STUBS[spec]) return { url: 'qa-stub:' + STUBS[spec] + '?tab=' + tab, shortCircuit: true };
  const r = await next(spec, ctx);
  if (tab !== null && r.url.startsWith('file:') && r.url.includes('/src/') && !r.url.includes('?')) return { ...r, url: r.url + '?tab=' + tab };
  return r;
}
function stub(name, tab) {
  const reg = 'const reg = () => ((globalThis.__qa ??= {})[' + JSON.stringify(tab) + '] ??= { buttons: {}, renders: [] });\n'
    + 'const txt = (c) => [].concat(c ?? []).map((x) => typeof x === "string" || typeof x === "number" ? String(x) : "").join("");\n';
  if (name === 'common') return reg + 'export function Btn(p) { reg().buttons[txt(p.children)] = p.onClick; return null; }\nexport function Sheet(p) { reg().sheet = p; return p.children ?? null; }\n';
  return reg + 'export function ' + name + '(p) { const r = reg(); r[' + JSON.stringify(name) + '] = p; r.renders.push(' + JSON.stringify(name) + '); return null; }\n';
}
export async function load(url, ctx, next) {
  if (url.startsWith('qa-stub:')) { const u = new URL(url); return { format: 'module', source: stub(u.pathname, u.searchParams.get('tab')), shortCircuit: true }; }
  const r = await next(url, ctx);
  const tab = tabOf(url);
  if (tab !== null && (url.includes('/src/ui/App.tsx') || url.includes('/src/ui/saveSession.ts')))
    return { ...r, source: String(r.source).replace(/import\.meta\.env\.DEV/g, 'false').replace(/\bwindow\b/g, 'globalThis.__qaw[' + JSON.stringify(tab) + ']') };
  return r;
}
if (process.argv[2] === 'run' && isMainThread) {
  class N {
    constructor(t) { this.nodeType = t; this.childNodes = []; this.parentNode = null; }
    get firstChild() { return this.childNodes[0] ?? null; }
    get nextSibling() { const c = this.parentNode && this.parentNode.childNodes; return c ? c[c.indexOf(this) + 1] ?? null : null; }
    insertBefore(n, ref) { if (n.parentNode) n.parentNode.removeChild(n); const i = ref ? this.childNodes.indexOf(ref) : -1; if (i < 0) this.childNodes.push(n); else this.childNodes.splice(i, 0, n); n.parentNode = this; return n; }
    appendChild(n) { return this.insertBefore(n, null); }
    removeChild(n) { const i = this.childNodes.indexOf(n); if (i >= 0) this.childNodes.splice(i, 1); n.parentNode = null; return n; }
    remove() { if (this.parentNode) this.parentNode.removeChild(this); }
    get textContent() { return this.nodeType === 3 ? this.data : this.childNodes.map((c) => c.textContent).join(' '); }
  }
  class T extends N { constructor(d) { super(3); this.data = d; } }
  class E extends N {
    constructor(ns, tag) { super(1); this.namespaceURI = ns; this.localName = tag; this.attributes = []; this.style = { cssText: '', setProperty() {} }; }
    setAttribute() {} removeAttribute() {} addEventListener() {} removeEventListener() {}
  }
  globalThis.document = { createElementNS: (ns, t) => new E(ns, t), createTextNode: (d) => new T(String(d)), documentElement: new E(null, 'html') };
  const values = new Map();
  let storage = 'ok';
  globalThis.__failKey = null;
  const deny = () => { if (storage === 'disabled') throw new Error('SecurityError'); };
  globalThis.localStorage = {
    getItem: (k) => { deny(); return values.has(k) ? values.get(k) : null; },
    setItem: (k, v) => { deny(); if (storage === 'full' || k === globalThis.__failKey) throw new Error('QuotaExceededError'); values.set(k, String(v)); },
    removeItem: (k) => { deny(); values.delete(k); },
  };
  globalThis.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  let held = null;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { async request(name, o, cb) { if (held) return cb(null); const me = {}; held = me; try { await cb(me); } finally { if (held === me) held = null; } } } } });
  globalThis.__qaw = {};
  let rnd = 12345, uuid = 0;
  Math.random = () => ((rnd = (rnd * 1103515245 + 12345) % 2147483648) / 2147483648);
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { randomUUID: () => 'qa-' + (++uuid) } });
  const repo = process.env.QA_REPO;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const { render, h } = await import(repo + '/node_modules/preact/dist/preact.mjs');
  const G = await import(repo + '/src/engine/game.ts');
  const D = await import(repo + '/src/engine/data.ts');
  async function until(fn) { for (let i = 0; i < 300; i++) { if (fn()) return; await sleep(10); } throw new Error('timeout'); }
  async function openTab(id) {
    const w = new EventTarget();
    w.location = { hash: '', pathname: '/', search: '', reload() {} }; w.history = { replaceState() {} };
    w.setTimeout = setTimeout; w.clearTimeout = clearTimeout; w.matchMedia = () => ({ matches: false });
    globalThis.__qaw[id] = w;
    const { App } = await import(repo + '/src/ui/App.tsx?tab=' + id);
    const root = new E(null, 'div');
    render(h(App, null), root);
    const qa = () => (globalThis.__qa || {})[id];
    await until(() => qa());
    await sleep(20);
    return { w, qa, text: () => root.textContent.trim(), close: async () => { w.dispatchEvent(new Event('pagehide')); render(null, root); await sleep(40); } };
  }
  const PK = 'posevnaya.v4.profile', FK = (l) => 'posevnaya.v4.farm.' + l;
  const seedProfile = (glory) => values.set(PK, JSON.stringify({ v: 1, glory, applied: [], pets: [], certs: [], seedBank: [], best: { years: 0, money: 0, harvest: 0 }, history: [], settings: { fast: false, intro: true } }));
  const farm = (l) => (values.has(FK(l)) ? JSON.parse(values.get(FK(l))) : null);
  const profile = () => JSON.parse(values.get(PK));
  const glory = (f) => f.rewardsOut.filter((r) => r.kind === 'glory').reduce((a, r) => a + r.value, 0);
  async function playWeek(t) {
    let s = t.qa().FarmScreen.s;
    if (s.phase === 'shortfall') { for (const a of [{ t: 'pay' }, { t: 'emergency' }, { t: 'restructure' }]) if (t.qa().FarmScreen.dispatch(a)) break; await sleep(5); return; }
    for (const c of [...s.hand]) {
      s = t.qa().FarmScreen.s;
      if (!s.hand.some((x) => x.uid === c.uid) || D.CARDS[c.def].kind !== 'seed' || G.cardBlockReason(s, c)) continue;
      const pl = G.placements(s, c);
      if (pl.length) { t.qa().FarmScreen.dispatch({ t: 'play', uid: c.uid, tiles: pl[0].tiles }); await sleep(2); }
    }
    t.qa().FarmScreen.dispatch({ t: 'endWeek' }); await sleep(5);
  }
  async function toRewardWeek(t) {
    for (let i = 0; i < 60; i++) { const s = t.qa().FarmScreen.s; if (s.phase === 'week' && G.endWeek(s).rewardsOut.length > s.rewardsOut.length) return; await playWeek(t); }
    throw new Error('no reward week');
  }
  const out = {};
  const scenarios = {
    async reload() {
      const t = await openTab(1);
      t.qa().Intro.onDone(false); await sleep(20);
      t.qa().MapScreen.onNew('chernozem'); await sleep(20);
      for (let i = 0; i < 3; i++) await playWeek(t);
      out.before = t.qa().FarmScreen.s.absWeek;
      await t.close();
      const t2 = await openTab(2);
      out.screen = t2.qa().renders.at(-1);
      t2.qa().MapScreen.onOpen('chernozem'); await sleep(20);
      out.after = t2.qa().FarmScreen.s.absWeek;
      out.played = !!t2.qa().FarmScreen.dispatch({ t: 'endWeek' }); await sleep(20);
      out.stored = farm('chernozem').absWeek; out.notice = t2.text();
    },
    async tabs() {
      seedProfile(0);
      const a = await openTab(1);
      a.qa().MapScreen.onNew('chernozem'); await sleep(20);
      a.qa().FarmScreen.dispatch({ t: 'endWeek' }); await sleep(20);
      const b = await openTab(2);
      out.bBlocked = !b.qa().MapScreen;
      b.qa().buttons['Продолжить здесь'](); await sleep(40);
      out.bStillBlocked = !b.qa().MapScreen;
      a.w.dispatchEvent(new Event('pagehide')); await sleep(30);
      b.qa().buttons['Продолжить здесь'](); await until(() => b.qa().MapScreen);
      b.qa().MapScreen.onOpen('chernozem'); await sleep(20);
      out.bBought = !!b.qa().FarmScreen.dispatch({ t: 'buyCard', def: 'water' }); await sleep(20);
      out.bMoney = farm('chernozem').money;
      const renders = a.qa().renders.length;
      a.w.dispatchEvent(new Event('pageshow')); await sleep(40);
      out.aWhileB = a.qa().renders.length === renders;
      await b.close();
      a.w.dispatchEvent(new Event('pageshow')); await until(() => a.qa().renders.length > renders);
      out.aSees = a.qa().MapScreen.farms.chernozem.money;
      a.qa().MapScreen.onOpen('chernozem'); await sleep(20);
      a.qa().FarmScreen.dispatch({ t: 'endWeek' }); await sleep(20);
      const f = farm('chernozem');
      out.water = [...f.hand, ...f.draw, ...f.discard, ...f.spare].filter((c) => c.def === 'water').length;
    },
    async foreign() {
      seedProfile(0);
      const t = await openTab(1);
      t.qa().MapScreen.onNew('chernozem'); await sleep(20);
      await playWeek(t);
      const other = farm('chernozem'); other.money = 12345; values.set(FK('chernozem'), JSON.stringify(other));
      out.accepted = !!t.qa().FarmScreen.dispatch({ t: 'endWeek' }); await sleep(20);
      out.kept = farm('chernozem').money;
    },
    async corrupt() {
      seedProfile(0);
      let g = G.newGame({ loc: 'chernozem', seed: 'qa-corrupt' });
      for (let i = 0; i < 3; i++) g = G.endWeek({ ...g, money: 1000 });
      values.set(FK('chernozem') + '.backup', JSON.stringify(g));
      values.set(FK('chernozem'), '{broken');
      const t = await openTab(1);
      out.mapAbs = t.qa().MapScreen.farms.chernozem && t.qa().MapScreen.farms.chernozem.absWeek; out.backupAbs = g.absWeek;
      out.notice = t.text().includes('резервная копия');
      t.qa().MapScreen.onOpen('chernozem'); await sleep(20);
      out.mainAbs = farm('chernozem').absWeek;
      out.recovery = values.get(FK('chernozem') + '.recovery');
    },
    async farmWriteFailure() {
      seedProfile(0);
      const t = await openTab(1);
      t.qa().MapScreen.onNew('chernozem'); await sleep(20);
      await toRewardWeek(t);
      globalThis.__failKey = FK('chernozem');
      t.qa().FarmScreen.dispatch({ t: 'endWeek' }); await sleep(20);
      globalThis.__failKey = null;
      await t.close();
      const f = farm('chernozem'), p = profile();
      out.farmIds = f.rewardsOut.map((r) => r.id); out.applied = p.applied; out.farmGlory = glory(f); out.profileGlory = p.glory;
    },
    async gameoverWriteFailure() {
      seedProfile(0);
      const t = await openTab(1);
      t.qa().MapScreen.onNew('chernozem'); await sleep(20);
      for (let i = 0; i < 40 && t.qa().FarmScreen.s.phase === 'week'; i++) { t.qa().FarmScreen.dispatch({ t: 'endWeek' }); await sleep(5); }
      out.phase = t.qa().FarmScreen.s.phase;
      globalThis.__failKey = FK('chernozem');
      t.qa().FarmScreen.dispatch({ t: 'giveUp' }); await sleep(20);
      globalThis.__failKey = null;
      await t.close();
      const f = farm('chernozem');
      out.storedPhase = f.phase; out.runId = f.loc + '|' + f.seed; out.history = profile().history.map((h) => h.runId);
    },
    async profileFailure() {
      seedProfile(0);
      const t = await openTab(1);
      t.qa().MapScreen.onNew('chernozem'); await sleep(20);
      await toRewardWeek(t);
      globalThis.__failKey = PK;
      t.qa().FarmScreen.dispatch({ t: 'endWeek' }); await sleep(20);
      globalThis.__failKey = null;
      out.notice = t.text().includes('Профиль не сохранён');
      const f = farm('chernozem');
      out.farmGlory = glory(f); out.storedGlory = profile().glory; out.farmAbs = f.absWeek;
      await t.close();
      const t2 = await openTab(2);
      out.mapGlory = t2.qa().MapScreen.profile.glory;
      t2.qa().MapScreen.onOpen('chernozem'); await sleep(20);
      out.afterOpen = profile().glory;
      t2.qa().FarmScreen.onMap(); await sleep(20); t2.qa().MapScreen.onOpen('chernozem'); await sleep(20);
      t2.qa().FarmScreen.dispatch({ t: 'endWeek' }); await sleep(20);
      const p = profile(), f2 = farm('chernozem');
      out.finalGlory = p.glory; out.expected = glory(f2); out.dupIds = p.applied.length - new Set(p.applied).size;
      out.calendar = [f2.yearStart, f2.week, f2.absWeek]; out.phase = f2.phase; out.due = f2.due;
    },
    async restartAfterProfileFailure() {
      seedProfile(0);
      const t = await openTab(1);
      t.qa().MapScreen.onNew('chernozem'); await sleep(20);
      await toRewardWeek(t);
      globalThis.__failKey = PK;
      t.qa().FarmScreen.dispatch({ t: 'endWeek' }); await sleep(20);
      const run = farm('chernozem');
      out.runGlory = glory(run);
      t.qa().FarmScreen.onRestart(); await sleep(20);
      globalThis.__failKey = null;
      await t.close();
      const t2 = await openTab(2);
      t2.qa().MapScreen.onOpen('chernozem'); await sleep(20);
      t2.qa().FarmScreen.dispatch({ t: 'endWeek' }); await sleep(20);
      t2.qa().FarmScreen.onMap(); await sleep(20);
      out.profileGlory = profile().glory;
    },
    async regions() {
      seedProfile(500);
      const t = await openTab(1);
      for (const l of ['chernozem', 'kuban', 'altai', 'chernozem']) {
        t.qa().MapScreen.onNew(l); await sleep(20);
        for (let i = 0; i < 10; i++) await playWeek(t);
        t.qa().FarmScreen.onMap(); await sleep(20);
      }
      await t.close();
      const t2 = await openTab(2);
      const p = profile();
      const farms = ['chernozem', 'kuban', 'altai'].map(farm);
      const runs = [...farms, JSON.parse(values.get(FK('chernozem') + '.previous'))];
      out.locs = farms.map((f) => f.loc); out.seeds = new Set(runs.map((f) => f.seed)).size;
      out.profileGlory = p.glory; out.expected = 500 + runs.reduce((a, f) => a + glory(f), 0);
      out.dupIds = p.applied.length - new Set(p.applied).size; out.mapGlory = t2.qa().MapScreen.profile.glory;
      out.history = p.history.map((x) => x.loc);
    },
    async cleared() {
      seedProfile(0);
      const t = await openTab(1);
      t.qa().MapScreen.onNew('chernozem'); await sleep(20);
      for (let i = 0; i < 3; i++) await playWeek(t);
      out.before = t.qa().FarmScreen.s.absWeek;
      values.clear();
      out.accepted = !!t.qa().FarmScreen.dispatch({ t: 'endWeek' }); await sleep(20);
      out.text = t.text().slice(0, 120);
      out.stored = farm('chernozem') && farm('chernozem').absWeek;
      await t.close();
      const t2 = await openTab(2);
      out.reloaded = farm('chernozem') && farm('chernozem').absWeek;
    },
    async disabled() {
      storage = process.argv[4];
      const t = await openTab(1);
      if (t.qa().Intro) { t.qa().Intro.onDone(false); await sleep(20); }
      t.qa().MapScreen.onNew('chernozem'); await sleep(20);
      out.screen = t.qa().renders.at(-1);
      out.played = !!(t.qa().FarmScreen && t.qa().FarmScreen.dispatch({ t: 'endWeek' }));
      out.text = t.text().slice(0, 160);
    },
    async full() {
      seedProfile(0);
      const t = await openTab(1);
      t.qa().MapScreen.onNew('chernozem'); await sleep(20);
      await playWeek(t);
      out.saved = farm('chernozem').absWeek;
      storage = 'full';
      await playWeek(t); await playWeek(t);
      out.memory = t.qa().FarmScreen.s.absWeek; out.notice = t.text().includes('Ферма не сохранена');
      t.qa().FarmScreen.onMap(); await sleep(20);
      out.mapKeeps = t.qa().MapScreen.farms.chernozem.absWeek;
      storage = 'ok';
      t.qa().buttons['Сохранить'](); await sleep(20);
      out.afterRetry = farm('chernozem').absWeek; out.cleared = !t.text().includes('не сохранена');
    },
  };
  try { await scenarios[process.argv[3]](); } catch (e) { out.error = String((e && e.stack) || e); }
  console.log('QA_RESULT ' + JSON.stringify(out));
  process.exit(0);
}
`;
let harnessFile: string | null = null;
const appRuns = new Map<string, Promise<any>>();
function app(scenario: string, arg = ''): Promise<any> {
  const key = `${scenario}:${arg}`;
  if (!appRuns.has(key)) appRuns.set(key, new Promise((resolve) => {
    if (!harnessFile) { harnessFile = join(mkdtempSync(join(tmpdir(), 'qa-app-')), 'harness.mjs'); writeFileSync(harnessFile, HARNESS); }
    const hook = `data:text/javascript,${encodeURIComponent(`import{register}from'node:module';register(${JSON.stringify(pathToFileURL(harnessFile).href)});`)}`;
    const env: NodeJS.ProcessEnv = { ...process.env, QA_REPO: pathToFileURL(repoRoot).href.replace(/\/$/, '') };
    delete env.NODE_TEST_CONTEXT;
    execFile(process.execPath, ['--import', 'tsx', '--import', hook, harnessFile, 'run', scenario, arg], { cwd: repoRoot, env, timeout: 90000, maxBuffer: 1 << 24 }, (err, stdout, stderr) => {
      const line = stdout.split('\n').find((l) => l.startsWith('QA_RESULT '));
      resolve(line ? JSON.parse(line.slice(10)) : { error: `${err?.message ?? ''}\n${stderr}` });
    });
  }));
  return appRuns.get(key)!;
}
// start every App scenario at once; each test awaits its own
for (const [s, a] of [['reload'], ['tabs'], ['foreign'], ['corrupt'], ['farmWriteFailure'], ['gameoverWriteFailure'], ['profileFailure'], ['restartAfterProfileFailure'], ['regions'], ['cleared'], ['disabled', 'disabled'], ['disabled', 'full'], ['full']] as [string, string?][]) void app(s, a);
const ok = (r: any) => assert.equal(r.error, undefined, r.error);

// ============================== ST-01 ==============================
test('ST-01 · a clean start, a few weeks and a reload continue from the saved week without a notice', async () => {
  const r = await app('reload'); ok(r);
  assert.equal(r.screen, 'MapScreen');
  assert.equal(r.after, r.before);
  assert.equal(r.played, true);
  assert.equal(r.stored, r.before + 1);
  assert.equal(r.notice, '');
});

// ============================== ST-02 ==============================
test('ST-02 · a second tab cannot write; after a hand-over the first tab continues from the newer purchase', async () => {
  const r = await app('tabs'); ok(r);
  assert.equal(r.bBlocked, true); assert.equal(r.bStillBlocked, true);
  assert.equal(r.bBought, true);
  assert.equal(r.aWhileB, true, 'the returning tab stays blocked while the other one owns the saves');
  assert.equal(r.aSees, r.bMoney, 'the returning tab reloads the newer save');
  assert.equal(r.water, 3, 'two starter water cards + the one bought in the other tab');
});
test('ST-02 · a foreign write of a live slot (an older build in another tab) stops this tab instead of overwriting it', async () => {
  const r = await app('foreign'); ok(r);
  assert.equal(r.accepted, false);
  assert.equal(r.kept, 12345);
});

// ============================== ST-03 ==============================
test('ST-03 · saving in the middle of an event chain and restarting applies every event, cost and reward once', () => {
  for (const loc of D.LOCATION_IDS) {
    const before = testFixture('eventchain', loc);
    const mid = json(before);
    assert.equal(validFarm(mid), true);
    // the night from memory and the night after a reload are the same night
    const night = G.endWeek(before), nightAfterReload = G.endWeek(mid);
    assert.equal(JSON.stringify(nightAfterReload), JSON.stringify(night));
    assert.ok((night.lastReport?.fieldDamage?.length ?? 0) + (night.lastReport?.pestHits?.length ?? 0) > 0, 'the chain really happened');
    // the committed morning is what a restart loads; it is not resolved a second time
    store.clear();
    assert.equal(saveFarm(night), true);
    const restored = loadFarm(loc)!;
    assert.deepEqual(restored, json(night));
    assert.deepEqual(restored.lastReport, json(night.lastReport));
    assert.equal(restored.money, json(night).money);
    assert.equal(JSON.stringify(G.endWeek(restored)), JSON.stringify(G.endWeek(night)));
    const p = syncProfile(emptyProfile(), night);
    assert.deepEqual(syncProfile(p, restored), p, 'rewards of the reloaded morning are not paid again');
  }
});

// ============================== ST-04 ==============================
test('ST-04 · a corrupt main farm with a valid backup is restored with a notice and repaired on the next save', async () => {
  const r = await app('corrupt'); ok(r);
  assert.equal(r.mapAbs, r.backupAbs);
  assert.equal(r.notice, true);
  assert.equal(r.mainAbs, r.backupAbs);
  assert.equal(r.recovery, '{broken');
});

// ============================== ST-05 ==============================
test('ST-05 · an interrupted profile write is healed from the farm once; year, week and phase stay consistent', async () => {
  const r = await app('profileFailure'); ok(r);
  assert.equal(r.notice, true);
  assert.ok(r.farmGlory > 0 && r.storedGlory === 0, 'the farm slot has the reward, the profile slot does not');
  assert.equal(r.afterOpen, r.farmGlory);
  assert.equal(r.finalGlory, r.expected);
  assert.equal(r.dupIds, 0);
  const [yearStart, week, abs] = r.calendar;
  assert.equal(abs, yearStart + week - 1, 'year, week and absolute week agree');
  assert.ok(abs === r.farmAbs + 1 || r.phase === 'shortfall' && r.due && abs === r.farmAbs, 'one week further, or waiting on its payment');
});
test('FIX ST-05 · after an interrupted profile write a reload shows the glory the stored farm already earned', async () => {
  const r = await app('profileFailure'); ok(r);
  assert.equal(r.mapGlory, r.farmGlory, 'the map (and region unlocks) use the stale profile until that farm is reopened');
});
test('FIX ST-05 · a farm write that fails does not credit the profile with rewards the stored farm does not have', async () => {
  const r = await app('farmWriteFailure'); ok(r);
  assert.deepEqual(r.applied.filter((id: string) => !r.farmIds.includes(id)), [], 'profile is ahead of the stored farm');
  assert.equal(r.profileGlory, r.farmGlory);
});
test('FIX ST-05 · a game over whose farm write fails is not written into the profile history while the stored farm is still open', async () => {
  const r = await app('gameoverWriteFailure'); ok(r);
  assert.equal(r.phase, 'shortfall');
  assert.notEqual(r.storedPhase, 'gameover');
  assert.deepEqual(r.history.filter((id: string) => id === r.runId), [], 'the stored run is alive but already recorded as ended');
});

// ============================== ST-06 ==============================
test('ST-06 · Chernozem, Kuban, Altai and a restart keep separate farms; shared glory equals the sum of all runs, no id twice', async () => {
  const r = await app('regions'); ok(r);
  assert.deepEqual(r.locs, ['chernozem', 'kuban', 'altai']);
  assert.equal(r.seeds, 4);
  assert.equal(r.profileGlory, r.expected);
  assert.equal(r.mapGlory, r.expected);
  assert.equal(r.dupIds, 0);
  assert.deepEqual(r.history, ['chernozem']);
});
test('FIX ST-05/ST-06 · restarting a farm while the profile cannot be written does not lose that run\'s glory', async () => {
  const r = await app('restartAfterProfileFailure'); ok(r);
  assert.ok(r.runGlory > 0);
  assert.ok(r.profileGlory >= r.runGlory, `the closed run earned ${r.runGlory} glory, the profile has ${r.profileGlory}`);
});

// ============================== ST-08 ==============================
test('ST-08 · 300 weeks per region: every save is valid, finite and bounded; the profile stays small', () => {
  for (const loc of D.LOCATION_IDS) {
    let s: any = G.newGame({ loc, seed: `QA-LONG-${loc}` }), p = emptyProfile(), max = 0;
    const r = prng(4242);
    for (let w = 0; w < 300 && s.phase !== 'gameover'; w++) {
      s = { ...s, money: Math.max(s.money, 50000) };
      s = s.phase === 'shortfall' ? settleShortfall(G, s) : G.endWeek(playerWeek(G, D, s, r));
      const raw = JSON.stringify(s);
      max = Math.max(max, raw.length);
      assert.deepEqual(nonFinite(s), [], `${loc} week ${w}`);
      assert.equal(validFarm(JSON.parse(raw)), true, `${loc} week ${w}`);
      assert.ok(s.feed.length <= 60 && (s.scenes?.length ?? 0) <= 12);
      p = syncProfile(p, s);
    }
    assert.ok(s.absWeek >= 250, `${loc} lived ${s.absWeek} weeks`);
    assert.ok(max < 64_000, `${loc}: ${max} bytes`);
    assert.deepEqual(nonFinite(p), []);
    assert.ok(JSON.stringify(p).length < 16_000);
    store.clear();
    assert.equal(saveProfile(p), true); assert.deepEqual(loadProfile(), json(p));
    assert.equal(saveFarm(s), true); assert.deepEqual(loadFarm(loc), json(s));
  }
});

// ============================== ST-09 ==============================
test(`ST-09 · GameState/Tile/Card/Quest/OrgState: fields added since ${OLD} are optional, none were removed`, (t) => {
  let before: string;
  try { before = execFileSync('git', ['-C', gitRepo, 'show', `${OLD}:src/engine/game.ts`], { encoding: 'utf8' }); } catch { return t.skip(`${OLD} not available`); }
  const now = readFileSync(join(repoRoot, 'src/engine/game.ts'), 'utf8');
  const fields = (text: string, name: string) => {
    const m = text.match(new RegExp(`export interface ${name} \\{([^\\n]*)\\}`)) ?? text.match(new RegExp(`export interface ${name} \\{([\\s\\S]*?)\\n\\}`))!;
    const body = m[1].replace(/\/\/.*$/gm, '').replace(/\{[^{}]*\}/g, 'X').replace(/\{[^{}]*\}/g, 'X');
    return Object.fromEntries([...body.matchAll(/([A-Za-z_]\w*)(\??)\s*:/g)].map((f) => [f[1], f[2] === '?']));
  };
  const added: string[] = [];
  for (const name of ['GameState', 'Tile', 'Card', 'Quest', 'OrgState', 'Plant', 'WeekReport', 'Lot']) {
    const a = fields(before, name), b = fields(now, name);
    assert.deepEqual(Object.keys(a).filter((k) => !(k in b)), [], `${name}: removed fields`);
    for (const k of Object.keys(b).filter((k) => !(k in a))) { added.push(`${name}.${k}`); assert.equal(b[k], true, `${name}.${k} is required: old saves lack it`); }
    for (const k of Object.keys(a)) if (k in b) assert.ok(!a[k] || b[k], `${name}.${k} became required`);
  }
  // the fields added after the publication (every one optional, checked above); later optional fields may join
  for (const f of ['Card.keep', 'GameState.crowRolled', 'GameState.crowWarn', 'GameState.exchanges', 'GameState.kidsRolled', 'GameState.kidsWarn', 'Tile.hivePlacedWeek']) assert.ok(added.includes(f), f);
});
test(`ST-09 · saves made by ${OLD} (all regions, mid-season, shortfall, game over, hives, projects, orders, fixtures) open and play on`, async (t) => {
  if (!(await old())) return t.skip(`${OLD} not available`);
  const saves = await oldSaves();
  for (const need of ['hive', 'greenhouse', 'project', 'order', 'shortfall', 'mid-season']) assert.ok(Object.keys(saves).some((k) => k.endsWith(need)), need);
  assert.ok(Object.values(saves).some((s: any) => s.phase === 'gameover'));
  for (const [name, saved] of Object.entries(saves)) {
    assert.equal(validFarm(saved), true, `${name} rejected by validFarm`);
    store.clear();
    assert.equal(saveFarm(saved), true, name);
    assert.deepEqual(loadFarm(saved.loc), saved, name);
    let s: any = loadFarm(saved.loc);
    const r = prng(9);
    for (let w = 0; w < 8 && s.phase !== 'gameover'; w++) {
      s = s.phase === 'shortfall' ? settleShortfall(G, s) : G.endWeek(playerWeek(G, D, s, r));
      assert.equal(validFarm(json(s)), true, `${name}: HEAD week ${w}`);
    }
    syncProfile(emptyProfile(), s);
  }
});
test(`ST-09 · every intermediate state of ${OLD} play (action by action) passes HEAD validation`, async (t) => {
  const o = await old();
  if (!o) return t.skip(`${OLD} not available`);
  let n = 0;
  const act = (s: any, a: any) => { const next = attempt(o.G, s, a); if (!next) return s; n++; assert.equal(validFarm(json(next)), true, `after ${a.t} at week ${next.absWeek} (${next.loc})`); return next; };
  for (const loc of D.LOCATION_IDS) for (const k of [0, 1, 2, 3]) {
    let s: any = o.G.newGame({ loc, seed: `QA-FUZZ-${loc}-${k}` });
    if (k % 2) s = { ...s, money: 20000 };
    const r = prng(71 + k), xy = (): [number, number] => [Math.floor(r() * 6), Math.floor(r() * 6)];
    for (let w = 0; w < 120 && s.phase !== 'gameover'; w++) {
      if (s.phase === 'shortfall') { s = settleShortfall(o.G, s); assert.equal(validFarm(json(s)), true, `after a payment at ${s.absWeek} (${s.loc})`); continue; }
      for (let i = 0; i < 30 && s.phase === 'week'; i++) {
        const c: any = s.hand.length ? pick(r, s.hand) : null, roll = r();
        if (roll < 0.25) { const before = s; s = playerWeek(o.G, o.D, s, r); if (s !== before) { n++; assert.equal(validFarm(json(s)), true, `after play at week ${s.absWeek} (${s.loc})`); } }
        else if (roll < 0.35 && c) s = act(s, { t: pick(r, ['exchangeCard', 'compostCard', 'discardCard'] as const), uid: c.uid });
        else if (roll < 0.4) s = act(s, { t: pick(r, ['claimCompost', 'drawCard', 'shoo', 'droneCrows', 'talkKids', 'insure'] as const) });
        else if (roll < 0.5) { const [x, y] = xy(); s = act(s, { t: pick(r, ['weed', 'guard', 'plow', 'clear', 'buyLand'] as const), x, y }); }
        else if (roll < 0.6) { const item = pick(r, ['greenhouse', 'hive', 'drip', 'scarecrow', 'canal'] as const); const sp = o.G.buildSpots(s, item); s = sp.length ? act(s, { t: 'build', item, x: sp[0][0], y: sp[0][1] }) : act(s, { t: 'moveBuild', item, from: xy(), to: xy() }); }
        else if (roll < 0.65) { const d = o.G.deckList(s); if (d.length) s = act(s, { t: 'deckOut', uid: pick(r, d as any[]).uid }); if (s.spare.length) s = act(s, { t: 'deckIn', uid: s.spare[0].uid }); }
        else if (roll < 0.72) s = act(s, { t: pick(r, ['hire', 'train', 'fire'] as const), id: pick(r, D.WORKER_IDS) });
        else if (roll < 0.78) s = act(s, r() < 0.5 ? { t: 'borrow', amount: 1 + Math.floor(r() * 30) } : { t: 'repay', id: s.loans[0]?.id ?? 0, amount: 5 });
        else if (roll < 0.8) s = act(s, { t: 'guide', lesson: r() < 0.5 ? 'rotate' : 'off' });
        else break;
      }
      if (s.phase === 'week') s = act(s, { t: 'endWeek' });
    }
  }
  assert.ok(n > 800, `${n} states`);
});
test(`ST-09 · a hive from a ${OLD} save (no hivePlacedWeek) pollinates at once; a hive set down on HEAD only from next week`, async (t) => {
  const o = await old();
  if (!o) return t.skip(`${OLD} not available`);
  const bees = json(o.L.testFixture('bees', 'chernozem'));
  assert.equal(G.tile(bees, 2, 2).structure, 'hive');
  assert.equal(G.tile(bees, 2, 2).hivePlacedWeek, undefined);
  assert.ok(validFarm(bees));
  assert.ok(G.yieldParts(bees, 2, 1, 'buckwheat').some((p) => p.label === 'улей рядом'), 'an old, established hive');
  const moved = G.apply(G.apply(bees, { t: 'unbuild', item: 'hive', x: 2, y: 2 }), { t: 'build', item: 'hive', x: 2, y: 2 });
  assert.equal(G.tile(moved, 2, 2).hivePlacedWeek, moved.absWeek);
  assert.ok(!G.yieldParts(moved, 2, 1, 'buckwheat').some((p) => p.label === 'улей рядом'), 'set down this week');
});
test(`FIX ST-09 · a lesson saved by ${OLD} at any step is not continued: the training farm starts anew and can be finished`, async (t) => {
  const o = await old();
  if (!o) return t.skip(`${OLD} not available`);
  // the old build's lesson, saved after every step a learner can reach
  const saved: Record<string, any> = {};
  let s = o.T.createTutorial();
  for (let i = 0; i < 120 && s.step !== 'done'; i++) {
    saved[s.step] ??= json(s);
    const a = oldLessonAction(o.G, o.T, s);
    s = json(a === 'next' ? o.T.tutorialNext(s) : o.T.applyTutorial(s, a));
  }
  assert.ok(Object.keys(saved).length > 20);
  for (const [step, v] of Object.entries(saved)) assert.equal(tutorialAccepted(v), false, `${step}: an old lesson is replaced, not continued`);
  assert.equal(play(TUT.createTutorial(), 'done').step, 'done');
});

// ============================== ST-10 ==============================
test('ST-10 · a full storage mid-game keeps play in memory with a notice; «Сохранить» writes the newest week', async () => {
  const r = await app('full'); ok(r);
  assert.equal(r.notice, true);
  assert.equal(r.memory, r.saved + 2);
  assert.equal(r.mapKeeps, r.memory);
  assert.equal(r.afterRetry, r.memory);
  assert.equal(r.cleared, true);
});
test('FIX ST-10 · clearing site data while playing is not reported as another tab, keeps the game playable and rewrites the progress', async () => {
  const r = await app('cleared'); ok(r);
  assert.doesNotMatch(r.text, /Другая вкладка/);
  assert.equal(r.accepted, true, 'the next action is refused');
  assert.equal(r.stored, r.before + 1, 'nothing is written: the only copy is in memory');
  assert.equal(r.reloaded, r.before + 1, 'progress is gone after a reload');
});
for (const mode of ['disabled', 'full'])
  test(`FIX ST-10 · with ${mode === 'disabled' ? 'localStorage disabled (SecurityError)' : 'no writable quota'} «Играть» still opens a farm to play in this tab`, async () => {
    const r = await app('disabled', mode); ok(r);
    assert.match(r.text, /не сохран|недоступно/, 'the notice is shown');
    assert.equal(r.screen, 'FarmScreen', 'the map stays: startNew returns when the first farm cannot be written');
    assert.equal(r.played, true);
  });
