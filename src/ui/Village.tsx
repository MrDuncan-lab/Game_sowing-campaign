// The village above the field (Chernozem). Six hills drawn once (see art/village); what depends on the farm is
// switched on by classes (the lab, the met station, the hives, the neighbours' gifts) or drawn over the hills at
// anchors (order bubbles, the kids at the gate, a flock on its way, the payment cart).
//
// One gesture moves between three stops: the field, the village, the top of the village. Pulling the field down,
// it slides away and the village comes up from behind it hill by hill: each hill waits sunk behind the one in front,
// then rises with a little sway, the nearer ones first; past that the whole village scrolls as one map. A house
// stands up (scaleY) once it is out from behind the hill in front of it and under the sky; a tree springs up once
// its foot is clear. The sky over the field thins to a veil as the field goes, so nothing tall is cut by it.
import type { ComponentChildren, RefObject } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { V_ANCHORS, V_BOTTOM, V_CART, V_SEASON_CSS, V_SUMMER, V_VH, V_W, V_WINTER } from '../art/village/chernozem';
import { ORGS, type OrgId } from '../engine/data';
import { GameState, deliverProblem, friends, locOf, lvl, nextPayment, paymentSchedule, thievesBlocked, yearLen } from '../engine/game';
import { CropSprite } from '../art/crops';
import { ScoutingKids } from '../art/scouts';
import { Flock } from '../art/sky';
import { kidsScouting } from './foresight';
import { compactMoney } from './common';

const INK = '#3f2a1d';
export const hasVillage = (s: GameState) => s.loc === 'chernozem';
/** which drawing of the village stands: the winter one in winter, the summer one (recoloured by season) the rest */
export const villageDrawing = (s: GameState) => (s.season === 3 ? 'winter' : 'summer');
export type VillageMode = 'field' | 'between' | 'village';
export interface VillageApi {
  available: boolean;
  mode: () => VillageMode;
  toggle: () => void;
  toField: () => void;
  /** glide so the place is in view and make it glow; false when the village is not shown */
  flyTo: (k: string) => Promise<boolean>;
}

// which optional pieces stand: buildings the farm has, gifts of the neighbours who are friends
function villageClasses(s: GameState): string {
  const on: string[] = [];
  on.push(lvl(s, 'lab') >= 1 ? 'on-lab' : 'on-nolab');
  if (lvl(s, 'meteo') >= 1) on.push('on-meteo');
  if (lvl(s, 'apiary') >= 1) on.push('on-hives');
  for (const o of locOf(s).orgs) if (friends(s, o)) on.push(`on-g-${o}`);
  return on.join(' ');
}

// the cart's way, in the generator's units: [x, y, run] triples from the council to the gate
const CART_LEN = V_CART[V_CART.length - 1];
function cartAt(run: number): { x: number; y: number; a: number } {
  const n = V_CART.length / 3;
  let i = 1;
  while (i < n - 1 && V_CART[i * 3 + 2] < run) i++;
  const r0 = V_CART[(i - 1) * 3 + 2], r1 = V_CART[i * 3 + 2];
  const t = Math.max(0, Math.min(1, (run - r0) / Math.max(1e-6, r1 - r0)));
  const x0 = V_CART[(i - 1) * 3], y0 = V_CART[(i - 1) * 3 + 1], x1 = V_CART[i * 3], y1 = V_CART[i * 3 + 1];
  return { x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t, a: Math.atan2(y1 - y0, x1 - x0) };
}
// the hill a point of the road lies on: the nearest one whose crest is above it
const CRESTS: [string, number][] = [['F', 872], ['E', 714], ['D', 556], ['C', 404], ['B', 262]];
const layerOf = (y: number) => CRESTS.find(([, c]) => y >= c - 2)?.[0] ?? 'A';
const CREST: Record<string, number> = { ...Object.fromEntries(CRESTS), A: 130 };

// coming up from behind the field: how far each hill waits sunk (a share of its height over the nearest hill, so
// every one starts hidden behind the one in front) and when along the way it rises (nearer hills first)
const SINK = 0.8, RISE_STEP = 0.13, RISE_LEN = 0.5;
function riseOf(k: string, depth: number) {
  const start = depth * RISE_STEP;
  return { sink: SINK * Math.max(0, CREST.F - (CREST[k] ?? CREST.A)), start, len: Math.min(RISE_LEN, 1 - start) };
}

/** How far down the road the payment cart is: it leaves the council after a payment and reaches the gate in the
 *  week the next one is due. Between two payments it moves a step a week; it never jumps back on its own. */
export function cartRun(s: GameState): number {
  if (s.phase === 'shortfall') return CART_LEN;
  const np = nextPayment(s);
  const weeks = paymentSchedule(s).map((p) => p.week);
  const prev = [...weeks].reverse().find((w) => w < np.week) ?? weeks[weeks.length - 1] - yearLen(s);
  const gap = Math.max(1, np.week - prev);
  const f = Math.max(0, Math.min(1, (gap - np.weeksLeft + 1) / gap));
  return f * CART_LEN;
}

function Bubble({ s, o }: { s: GameState; o: OrgId }) {
  const st = s.orgs[o], a = V_ANCHORS[`bubble-${o}`];
  if (!st || !a) return null;
  const q = st.active;
  const kind = q ? (deliverProblem(s, o) ? 'order' : 'ready') : st.offer ? 'offer' : null;
  if (!kind) return null;
  const hot = !!q && q.deadline !== undefined && q.deadline - s.absWeek <= 1;
  const crop = q?.lines[0]?.crop;
  const left = q ? q.lines.reduce((n, l) => n + l.qty, 0) : 0;
  return (
    <g class={`v-bubble ${kind}${hot ? ' hot' : ''}`} data-for={o} data-k={o} transform={`translate(${a.x} ${a.y})`}>
      <g class="bob">
        <path class="vb-box" d="M-15 -26 H15 Q19 -26 19 -22 V-10 Q19 -6 15 -6 H4 L0 0 L-4 -6 H-15 Q-19 -6 -19 -10 V-22 Q-19 -26 -15 -26 Z" />
        {kind === 'offer' ? <text class="vb-text" y={-11.5} text-anchor="middle">!</text>
          : <>
            {crop && <svg x={-18} y={-26.5} width={20} height={20} viewBox="10 6 80 82"><CropSprite id={crop} stage={2} /></svg>}
            {kind === 'ready' ? <path class="vb-check" d="M3 -16 l3.6 3.6 l7.4 -7.6" /> : <text class="vb-text" x={8} y={-11.5} text-anchor="middle">{left}</text>}
          </>}
      </g>
    </g>
  );
}

function CartArt({ amount }: { amount: string }) {
  return (
    <g class="v-cart-art">
      <ellipse cx={3} cy={1} rx={19} ry={3.2} fill="#2e2414" opacity={0.16} />
      <path d="M-18 -11 H16 L13 -2 H-15 Z" fill="#b27947" stroke={INK} stroke-width={1.1} stroke-linejoin="round" />
      <path d="M16 -9 L28 -15" stroke={INK} stroke-width={1.6} stroke-linecap="round" />
      <path d="M-10 -11 C-14 -23 -5 -30 1 -30 C7 -30 13 -23 9 -11 Z" fill="#f6c9bf" stroke={INK} stroke-width={1.1} stroke-linejoin="round" />
      <path d="M-3.5 -29 Q1 -33 5 -29" fill="none" stroke={INK} stroke-width={1.1} />
      <text class="v-cart-sum" x={0} y={-16.5} text-anchor="middle">{amount}</text>
      {[-9, 9].map((x) => (
        <g transform={`translate(${x} 0)`}><g class="v-wheel"><circle r={5.4} fill="#d9a466" stroke={INK} stroke-width={1.1} /><path d="M-5.4 0 H5.4 M0 -5.4 V5.4" stroke={INK} stroke-width={0.6} /></g></g>
      ))}
    </g>
  );
}

export function Village({ s, rootRef, onPlace }: { s: GameState; rootRef: RefObject<HTMLDivElement>; onPlace: (k: string) => void }) {
  const ov: Record<string, ComponentChildren[]> = {};
  const add = (k: string, el: ComponentChildren) => { (ov[k] ??= []).push(el); };
  for (const o of locOf(s).orgs) { const a = V_ANCHORS[`bubble-${o}`]; if (a) add(a.l, <Bubble s={s} o={o} />); }
  const crowsComing = (s.crowWarn ?? []).some((w) => w > s.absWeek);
  if (crowsComing && V_ANCHORS.flock) add(V_ANCHORS.flock.l, <g class="v-flock" transform={`translate(${V_ANCHORS.flock.x} ${V_ANCHORS.flock.y}) scale(1.25)`}><Flock far={false} /></g>);
  if (kidsScouting(s) && !thievesBlocked(s) && V_ANCHORS.kids) add(V_ANCHORS.kids.l, <g class="v-kids" transform={`translate(${V_ANCHORS.kids.x} ${V_ANCHORS.kids.y}) scale(.34)`}><ScoutingKids /></g>);
  const amount = compactMoney(s.due?.amount ?? nextPayment(s).amount);
  const click = (e: MouseEvent) => {
    const g = (e.target as Element | null)?.closest?.('.spot-g.up, .v-bubble.shown');
    if (g) onPlace((g as SVGGElement).dataset.k ?? '');
  };
  const key = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const g = (e.target as Element | null)?.closest?.('.spot-g.up');
    if (g) { e.preventDefault(); onPlace((g as SVGGElement).dataset.k ?? ''); }
  };
  const dr = villageDrawing(s) === 'winter' ? V_WINTER : V_SUMMER;
  return (
    <div class={`village season-${s.season} ${villageClasses(s)}`} ref={rootRef} onClick={click} onKeyDown={key} aria-label="Деревня">
      <style>{V_SEASON_CSS}</style>
      <svg class="v-defs" width="0" height="0" aria-hidden="true"><defs dangerouslySetInnerHTML={{ __html: `${dr.defs}<g id="v-roads">${dr.roads}</g>` }} /></svg>
      {dr.layers.map((l) => (
        <div class="v-lay" data-k={l.k} data-r={l.rate} key={`${villageDrawing(s)}-${l.k}`}>
          <svg class="v-lay-svg" viewBox={`0 0 ${V_W} ${V_BOTTOM}`} aria-hidden={l.k === 'sky' ? 'true' : undefined}>
            <g class="v-art" dangerouslySetInnerHTML={{ __html: l.svg }} />
            <g class="v-ov">{ov[l.k]}</g>
            {l.k !== 'sky' && <g class="v-cart" data-l={l.k} aria-hidden="true"><CartArt amount={amount} /></g>}
          </svg>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- the pager: field, village, its top
interface Pop { el: SVGGElement; g: SVGGElement; l: string; b: number; h: number; f: [string, number][]; last: number; up: boolean | null }
interface Lay { el: HTMLElement; k: string; r: number; sink: number; start: number; len: number; last: string }
interface Tree { el: SVGGElement; l: string; y: number; front: string[]; up: boolean | null }
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const back = (t: number, c1 = 1.2) => { const c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const smooth = (t: number) => t * t * (3 - 2 * t);
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const cartMemo = new Map<string, number>();

export function useVillagePager(o: {
  enabled: boolean;
  viewRef: RefObject<HTMLDivElement>; rootRef: RefObject<HTMLDivElement>; moveRef: RefObject<HTMLDivElement>; dockRef: RefObject<HTMLElement>;
  /** the sky strip's height and where the field's crest is in field mode, in px from the top of the view */
  skyH: number; crest: number;
  blocked: () => boolean;
  onMode: (m: VillageMode) => void;
  cart: { run: number; key: string };
  reduce: boolean;
  /** the drawing on show ('summer' or 'winter'): when it changes the houses and trees are new elements */
  drawing: string;
}): VillageApi {
  const st = useRef({ s: 0, u: 1, HS: 600, S1: 400, S2: 600, T: 1000, band: 60, fc: 100, anim: 0, mode: 'field' as VillageMode, ready: false,
    pops: [] as Pop[], lays: [] as Lay[], trees: [] as Tree[], solid: -1, carts: [] as SVGGElement[], bubbles: [] as SVGGElement[],
    cartRun: -1, cartAnim: 0, cartDir: 1, wheelLock: 0, wheelAcc: 0, wheelT: 0, noClick: 0, queued: false,
    drag: null as null | { id: number; x: number; y: number; s0: number; from: number; dir: number; lastY: number; lastT: number; v: number } });
  const opts = useRef(o);
  opts.current = o;

  const stops = () => [0, st.current.S2, st.current.T];
  const nearest = (s: number) => stops().reduce((a, v) => (Math.abs(v - s) < Math.abs(a - s) ? v : a));
  const stopFrom = (s: number, dir: number) => (dir > 0 ? stops().find((v) => v > s + 2) : [...stops()].reverse().find((v) => v < s - 2));
  // the way between the field and the village is taken slowly: the hills come up one after another
  const glideMs = (to: number) => { const S = st.current; return Math.max(S.s, to) > S.S2 + 2 ? 1700 : Math.abs(to - S.s) > S.S2 ? 1100 : 850; };

  function frame() {
    const S = st.current, O = opts.current;
    S.queued = false;
    if (!O.enabled || !S.ready) return;
    const u = S.u, s = clamp(S.s, 0, S.T);
    const phi = clamp((s - S.S2) / S.S1, 0, 1), p = 1 - phi;
    const shift: Record<string, number> = {};
    for (const l of S.lays) {
      shift[l.k] = s <= S.S2 ? -s : -S.S2 - l.r * (s - S.S2);
      // still behind the field: the hill waits sunk and rises in its turn, swaying a little past its place
      if (l.sink > 0 && p < 1) {
        const t = clamp((p - l.start) / l.len, 0, 1);
        shift[l.k] += l.sink * (1 - (O.reduce ? smooth(t) : back(t, 1.4)));
      }
      const tf = `translate3d(0,${(shift[l.k] * u).toFixed(2)}px,0)`;
      if (tf !== l.last) { l.el.style.transform = tf; l.last = tf; }
    }
    const dy = (S.T - s) * u;
    const move = O.moveRef.current, dock = O.dockRef.current;
    if (move) { move.style.transform = dy > 0.5 ? `translate3d(0,${dy.toFixed(2)}px,0)` : ''; move.style.visibility = dy > S.HS * u + 40 ? 'hidden' : ''; }
    if (dock) { const k = clamp((0.78 - phi) / 0.22, 0, 1); dock.style.transform = k > 0 ? `translate3d(0,${(k * (dock.offsetHeight + 16)).toFixed(1)}px,0)` : ''; }
    // the field is the nearest hill of all; on the field the houses just over the yard stay folded
    const lift = clamp((phi - 0.8) / 0.2, 0, 1) * 90;
    const field = S.fc + (S.T - s) - lift;
    const upNow = new Set<string>();
    for (const p of S.pops) {
      const base = p.b + (shift[p.l] ?? 0), top = base - p.h;
      let crest = field;
      for (const [k, y] of p.f) crest = Math.min(crest, y + (shift[k] ?? 0));
      const f = clamp((crest - Math.max(top, S.band)) / p.h, 0, 1);
      const t = clamp(f / 0.7, 0, 1);
      const v = t <= 0 ? 0 : O.reduce ? (t > 0.5 ? 1 : 0) : back(t);
      if (Math.abs(v - p.last) > 0.002) { p.el.style.transform = `scaleY(${v.toFixed(3)})`; p.last = v; }
      const up = t >= 1;
      if (up) upNow.add(p.g.dataset.k ?? '');
      if (up !== p.up) { p.up = up; p.g.classList.toggle('up', up); p.g.setAttribute('tabindex', up ? '0' : '-1'); }
    }
    for (const b of S.bubbles) b.classList.toggle('shown', upNow.has(b.dataset.for ?? ''));
    // a tree springs up once its foot is out from behind every hill in front of it
    for (const tr of S.trees) {
      let crest = field;
      for (const k of tr.front) crest = Math.min(crest, CREST[k] + (shift[k] ?? 0));
      const up = tr.y + (shift[tr.l] ?? 0) < crest + 1;
      if (up !== tr.up) { tr.up = up; tr.el.classList.toggle('up', up); }
    }
    // the sky over the field thins out as soon as the field starts to go, down to a veil behind the forecast;
    // its own strip of land goes first, so no band of it is left hanging over the village
    const solid = Number(smooth(clamp((phi - 0.72) / 0.28, 0, 1)).toFixed(3));
    if (solid !== S.solid) {
      S.solid = solid;
      const view = O.viewRef.current;
      view?.style.setProperty('--sky-solid', String(solid));
      view?.style.setProperty('--sky-land', String(Number(smooth(clamp((solid - 0.45) / 0.55, 0, 1)).toFixed(3))));
    }
    const mode: VillageMode = phi > 0.96 ? 'field' : phi < 0.12 ? 'village' : 'between';
    O.rootRef.current?.classList.toggle('v-asleep', mode === 'field' && !S.anim);
    if (mode !== S.mode) { S.mode = mode; O.onMode(mode); if (mode === 'village') rollCart(); }
    placeCart(phi);
  }
  const queue = () => { const S = st.current; if (!S.queued) { S.queued = true; requestAnimationFrame(frame); } };

  // ---- the cart: rests where the week puts it; when the village opens it drives there from where it was seen last
  function placeCart(phi: number) {
    const S = st.current;
    if (S.cartRun < 0) return;
    const p = cartAt(S.cartRun);
    const k = layerOf(p.y);
    const ahead = cartAt(Math.min(CART_LEN, S.cartRun + 3)), behind = cartAt(Math.max(0, S.cartRun - 3));
    // it faces the way it last went: down the road to the gate, or back up to the council
    const dx = S.cartDir > 0 ? ahead.x - behind.x : behind.x - ahead.x;
    const flip = dx < 0 ? -1 : 1;
    for (const c of S.carts) {
      const on = c.dataset.l === k && phi < 0.5;
      c.style.display = on ? '' : 'none';
      if (on) c.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${flip * 0.9} .9)`);
    }
  }
  function rollCart() {
    const S = st.current, O = opts.current;
    const to = O.cart.run;
    if (S.cartRun < 0) S.cartRun = cartMemo.get(O.cart.key) ?? to;
    if (Math.abs(to - S.cartRun) < 0.5 || O.reduce) { S.cartRun = to; cartMemo.set(O.cart.key, to); placeCart(0); return; }
    const from = S.cartRun, t0 = performance.now(), ms = clamp(Math.abs(to - from) * 6, 1400, 4200);
    S.cartDir = Math.sign(to - from) || 1;
    cancelAnimationFrame(S.cartAnim);
    O.rootRef.current?.classList.add('cart-rolling');
    const step = (now: number) => {
      const t = clamp((now - t0) / ms, 0, 1);
      S.cartRun = from + (to - from) * ease(t);
      placeCart(clamp((S.s - S.S2) / S.S1, 0, 1));
      if (t < 1) S.cartAnim = requestAnimationFrame(step);
      else { S.cartAnim = 0; cartMemo.set(O.cart.key, to); O.rootRef.current?.classList.remove('cart-rolling'); }
    };
    S.cartAnim = requestAnimationFrame(step);
  }

  function glide(to: number, ms: number, done?: () => void) {
    const S = st.current;
    cancelAnimationFrame(S.anim);
    const from = S.s;
    if (opts.current.reduce || Math.abs(to - from) < 1) { S.s = to; S.anim = 0; queue(); if (done) setTimeout(done, 40); return; }
    const t0 = performance.now();
    const step = (now: number) => {
      const t = clamp((now - t0) / ms, 0, 1);
      S.s = from + (to - from) * ease(t);
      frame();
      if (t < 1) S.anim = requestAnimationFrame(step); else { S.anim = 0; frame(); if (done) done(); }
    };
    S.anim = requestAnimationFrame(step);
  }
  const stopGlide = () => { const S = st.current; if (S.anim) { cancelAnimationFrame(S.anim); S.anim = 0; } };
  const goTo = (to: number) => glide(to, glideMs(to));

  // ---- geometry: from the view's size and the sky's and the field's places
  function measure() {
    const S = st.current, O = opts.current, view = O.viewRef.current, root = O.rootRef.current;
    if (!O.enabled || !view || !root) { S.ready = false; return; }
    const wasField = S.ready ? S.s >= S.T - 2 : true, wasTop = S.ready && S.s <= 2, wasBottom = S.ready && Math.abs(S.s - S.S2) < 2;
    S.u = view.clientWidth / V_W;
    S.HS = view.clientHeight / S.u;
    S.band = O.skyH / S.u;
    S.fc = O.crest / S.u;
    S.S2 = Math.max(0, V_VH - S.HS);
    S.S1 = Math.max(120, S.HS - S.fc + 24);
    S.T = S.S1 + S.S2;
    const hills = [...root.querySelectorAll<HTMLElement>('.v-lay')].filter((el) => el.dataset.k !== 'sky').map((el) => el.dataset.k ?? '');
    S.lays = [...root.querySelectorAll<HTMLElement>('.v-lay')].map((el) => {
      const k = el.dataset.k ?? '', depth = hills.length - 2 - hills.indexOf(k);
      const rise = k === 'sky' || depth < 0 ? { sink: 0, start: 0, len: 1 } : riseOf(k, depth);
      return { el, k, r: Number(el.dataset.r) || 0, ...rise, last: '' };
    });
    S.trees = [];
    for (const lay of S.lays) {
      if (lay.k === 'sky') continue;
      const front = hills.slice(hills.indexOf(lay.k) + 1);
      for (const el of lay.el.querySelectorAll<SVGGElement>('.tree')) {
        const m = /translate\(\s*([-\d.]+)[\s,]+([-\d.]+)/.exec((el.parentNode as SVGGElement).getAttribute('transform') ?? '');
        if (!m) continue;
        const x = Number(m[1]), y = Number(m[2]);
        // they spring up one after another along the hill, not in one go
        el.style.setProperty('--td', `${((x / V_W) * 0.22 + ((x * 7 + y * 3) % 11) / 110).toFixed(2)}s`);
        S.trees.push({ el, l: lay.k, y, front, up: null });
      }
    }
    S.solid = -1;
    S.pops = [...root.querySelectorAll<SVGGElement>('.pop')].map((el) => ({
      el, g: el.parentNode as SVGGElement, l: el.dataset.l ?? '', b: Number(el.dataset.b), h: Number(el.dataset.h), last: -1, up: null,
      f: (el.dataset.f ?? '').split(';').filter(Boolean).map((q) => { const [k, y] = q.split(':'); return [k, Number(y)] as [string, number]; }),
    }));
    S.carts = [...root.querySelectorAll<SVGGElement>('.v-cart')];
    S.bubbles = [...root.querySelectorAll<SVGGElement>('.v-bubble')];
    S.s = wasField ? S.T : wasTop ? 0 : wasBottom ? S.S2 : clamp(S.s, 0, S.T);
    S.ready = true;
    frame();
  }

  useEffect(() => {
    if (!o.enabled) {
      const S = st.current;
      S.ready = false;
      const move = o.moveRef.current, dock = o.dockRef.current;
      if (move) { move.style.transform = ''; move.style.visibility = ''; }
      if (dock) dock.style.transform = '';
      o.viewRef.current?.style.removeProperty('--sky-solid');
      o.viewRef.current?.style.removeProperty('--sky-land');
      S.solid = -1;
      if (S.mode !== 'field') { S.mode = 'field'; o.onMode('field'); }
      return;
    }
    measure();
    const view = o.viewRef.current;
    if (!view) return;
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => measure());
    ro?.observe(view);
    const S = st.current;
    const down = (e: PointerEvent) => {
      if (e.button > 0 || opts.current.blocked()) return;
      const t = e.target as Element;
      if (t.closest('.dock, .sheet, .bed-popover, .compost-popover, .lens-picker, .tool-btn, .v-back, .flash')) return;
      stopGlide();
      S.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, s0: S.s, from: nearest(S.s), dir: 0, lastY: e.clientY, lastT: performance.now(), v: 0 };
    };
    const moveH = (e: PointerEvent) => {
      const d = S.drag;
      if (!d || e.pointerId !== d.id) return;
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (!d.dir) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx) * 1.2) {
          // on the field only a pull downwards opens the village; up there both ways move
          if (S.s >= S.T - 2 && dy < 0) { S.drag = null; return; }
          d.dir = 1;
          try { view.setPointerCapture(e.pointerId); } catch { /* not every pointer can be captured */ }
        } else if (Math.abs(dx) > 12) { S.drag = null; return; }
        else return;
      }
      const now = performance.now();
      S.s = clamp(d.s0 - dy / S.u, 0, S.T);
      const dt = Math.max(now - d.lastT, 1);
      d.v = 0.7 * ((d.lastY - e.clientY) / S.u / dt) + 0.3 * d.v;
      d.lastY = e.clientY; d.lastT = now;
      queue();
      e.preventDefault();
    };
    const up = (e: PointerEvent) => {
      const d = S.drag;
      if (!d || e.pointerId !== d.id) return;
      S.drag = null;
      if (!d.dir) return;
      S.noClick = performance.now() + 350;
      const ds = S.s - d.from, fling = performance.now() - d.lastT < 90 ? d.v : 0;
      let to = d.from;
      if (e.type !== 'pointercancel' && (Math.abs(ds) > 28 || Math.abs(fling) > 0.3)) to = stopFrom(d.from, Math.abs(ds) > 28 ? Math.sign(ds) : Math.sign(fling)) ?? d.from;
      goTo(to);
    };
    const click = (e: MouseEvent) => { if (performance.now() < S.noClick) { e.stopPropagation(); e.preventDefault(); } };
    const wheel = (e: WheelEvent) => {
      if (opts.current.blocked() || (e.target as Element).closest('.dock, .sheet')) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
      if (!dy) return;
      const dir = Math.sign(dy);
      if (!S.anim && (dir > 0 ? S.s >= S.T - 2 : S.s <= 2)) return;
      e.preventDefault();
      const now = performance.now();
      if (now < S.wheelLock) { S.wheelLock = Math.max(S.wheelLock, now + 120); return; }
      if (now - S.wheelT > 220) S.wheelAcc = 0;
      S.wheelT = now; S.wheelAcc += dy;
      if (Math.abs(S.wheelAcc) < 24) return;
      const next = stopFrom(S.s, dir);
      if (next === undefined) return;
      S.wheelAcc = 0;
      S.wheelLock = now + glideMs(next);
      goTo(next);
    };
    view.addEventListener('pointerdown', down);
    view.addEventListener('pointermove', moveH, { passive: false });
    view.addEventListener('pointerup', up);
    view.addEventListener('pointercancel', up);
    view.addEventListener('click', click, true);
    view.addEventListener('wheel', wheel, { passive: false });
    return () => {
      ro?.disconnect();
      view.removeEventListener('pointerdown', down);
      view.removeEventListener('pointermove', moveH);
      view.removeEventListener('pointerup', up);
      view.removeEventListener('pointercancel', up);
      view.removeEventListener('click', click, true);
      view.removeEventListener('wheel', wheel);
      stopGlide();
      cancelAnimationFrame(S.cartAnim);
    };
  }, [o.enabled]);
  // the sky and the field's crest move with the layout: keep the stop, recompute the rest
  useEffect(() => { if (o.enabled) measure(); }, [o.skyH, o.crest, o.drawing]);
  // a new week moves the cart's goal: seen from the village it rolls there at once
  useEffect(() => { if (o.enabled && st.current.mode === 'village') rollCart(); else if (o.enabled) queue(); }, [o.cart.run, o.cart.key]);

  return {
    available: o.enabled,
    mode: () => st.current.mode,
    toggle: () => { const S = st.current; if (!S.ready) return; goTo(S.s > S.S2 + S.S1 / 2 ? S.S2 : S.T); },
    toField: () => { const S = st.current; if (S.ready) goTo(S.T); },
    flyTo: (k: string) => new Promise<boolean>((res) => {
      const S = st.current, root = opts.current.rootRef.current;
      if (!S.ready || S.mode === 'field' || !root) { res(false); return; }
      const g = [...root.querySelectorAll<SVGGElement>(`.spot-g[data-k="${k}"]`)].find((x) => x.getBoundingClientRect().width > 0) ?? null;
      const p = g?.querySelector<SVGGElement>('.pop');
      if (!g || !p) { res(false); return; }
      const target = clamp(Number(p.dataset.b) - S.HS * 0.62, 0, S.S2);
      glide(target, Math.abs(target - S.s) < 4 ? 1 : 700, () => {
        g.classList.remove('ping'); void g.getBBox(); g.classList.add('ping');
        setTimeout(() => res(true), 420);
      });
    }),
  };
}
