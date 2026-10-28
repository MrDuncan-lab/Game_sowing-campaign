// The village above the field (Chernozem). Six hills drawn once (see art/village); what depends on the farm is
// switched on by classes (the lab, the met station, the hives, the neighbours' gifts) or drawn over the hills at
// anchors (order bubbles, the kids at the gate, a flock on its way, the payment cart).
//
// One gesture moves between three stops: the field, the village, the top of the village. Pulling the field down,
// it slides away and the village comes up from behind it hill by hill, like flats on a paper stage: each hill waits
// sunk behind the one in front and rises in its turn, the nearer ones first, and settles without a bounce; the
// houses and trees ride on their hills. Past that the whole village scrolls as one map. The sky over the field thins
// to a veil as the field goes, so nothing tall is cut by it.
//
// Every frame of the way only moves composited layers (the hills, the field, the dock) and fades the sky strip:
// nothing inside the drawing is transformed, so the browser never repaints the village while it moves. The
// village's own little lives (smoke, sails, hens) wait while it moves and play once it stands.
import type { ComponentChildren, RefObject } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { V_ANCHORS, V_BOTTOM, V_CART, V_SEASON_CSS, V_SPOTS, V_SUMMER, V_VH, V_W, V_WINTER } from '../art/village/chernozem';
import { ORGS, type OrgId } from '../engine/data';
import { GameState, buildStage, deliverProblem, friends, hasCommon, locOf, lvl, nextPayment, paymentSchedule, thievesBlocked, yardStage, yearLen } from '../engine/game';
import { COMMON_IDS, YARD_IDS } from '../engine/neighbours';
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
  // the player's house is drawn at its level, the same drawing as on the house screen
  on.push(`on-house${Math.max(1, Math.min(7, lvl(s, 'house')))}`);
  // a house under construction stands in scaffolding by the stage of the work
  const stage = buildStage(s, 'house');
  if (stage) on.push(`on-build${stage}`);
  if (lvl(s, 'meteo') >= 1) on.push('on-meteo');
  if (lvl(s, 'apiary') >= 1) on.push('on-hives');
  for (const o of locOf(s).orgs) if (friends(s, o)) on.push(`on-g-${o}`);
  // v3 §7 · each neighbour's yard at its stage (a stage being built shows the one before it), the shared buildings
  for (const y of YARD_IDS) on.push(`on-${y}${yardStage(s, y)}`);
  for (const c of COMMON_IDS) on.push(hasCommon(s, c) ? `on-c-${c}` : `on-no${c}`);
  // Пряхин stands at the stall while he has his eye on a lot
  if (s.fair?.eye != null) on.push('on-pryakhin');
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

// coming up from behind the field, like flats on a paper stage: each hill waits a little sunk and rises into its
// place in its turn, the nearer ones first. Depth sets both: a farther hill sinks less and moves later, so nothing far
// overtakes anything near (it is the field and the near hills that travel; the far land barely stirs)
const SINK_NEAR = 34, SINK_STEP = 4, RISE_STEP = 0.07, RISE_LEN = 0.5;
function riseOf(_k: string, depth: number) {
  const start = depth * RISE_STEP;
  return { sink: Math.max(10, SINK_NEAR - depth * SINK_STEP), start, len: Math.min(RISE_LEN, 1 - start) };
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

// Small captions under the places that do something when tapped (28.10). The other houses get theirs once they
// have a use. Captions stand in the nearest hill's overlay: with the village open every hill is in its place, so
// they sit right under their building; while the village moves they fade out (see village.css).
export const VILLAGE_LABELS: { k: string; text: string; cond?: string; x?: number }[] = [
  { k: 'house', text: 'Дом', x: 116 }, { k: 'barn', text: 'Амбар' },
  { k: 'lab', text: 'Лаборатория', cond: 'lab' }, { k: 'lot-lab', text: 'Под лабораторию', cond: 'nolab' },
  { k: 'meteo', text: 'Метеостанция', cond: 'meteo' }, { k: 'hives', text: 'Пасека', cond: 'hives' },
  { k: 'board', text: 'Заказы' }, { k: 'fair', text: 'Рынок' }, { k: 'signpost', text: 'Карта ферм' },
  { k: 'council', text: 'Сельсовет' }, { k: 'college', text: 'Колледж' }, { k: 'orphanage', text: 'Интернат' },
  { k: 'bakery', text: 'Пекарня' }, { k: 'restaurant', text: 'Ресторан' },
  // v3 §7 · the neighbours and the shared buildings
  { k: 'n-zina', text: 'Зина' }, { k: 'n-savva', text: 'Кузня' }, { k: 'n-efim', text: 'Плотник', x: 140 }, { k: 'n-miller', text: 'Мельница' },
  { k: 'n-karpov', text: 'Карповы', x: 70 },
  { k: 'c-club', text: 'Клуб', cond: 'c-club' }, { k: 'c-pump', text: 'Водокачка', cond: 'c-pump' }, { k: 'c-hostel', text: 'Общежитие', cond: 'c-hostel' },
];
const LABEL_FS = 8.6;
function PlaceLabel({ k, x, y, text, cond }: { k: string; x: number; y: number; text: string; cond?: string }) {
  const w = Math.round(text.length * LABEL_FS * 0.56 + 9), h = LABEL_FS + 5;
  const left = Math.max(2, Math.min(V_W - w - 2, x - w / 2));
  return (
    <g class={`v-label${cond ? ` vc vc-${cond}` : ''}`} data-for={k} transform={`translate(${left.toFixed(1)} ${(y + 2.5).toFixed(1)})`} aria-hidden="true">
      <rect class="vl-tag" width={w} height={h} rx={h / 2} />
      <text class="vl-text" x={w / 2} y={h / 2 + LABEL_FS * 0.35} text-anchor="middle" font-size={LABEL_FS}>{text}</text>
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
  const front = (villageDrawing(s) === 'winter' ? V_WINTER : V_SUMMER).layers.at(-1)?.k ?? 'F';
  for (const l of VILLAGE_LABELS) { const p = V_SPOTS[l.k]; if (p) add(front, <PlaceLabel k={l.k} x={l.x ?? p.x} y={p.y} text={l.text} cond={l.cond} />); }
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
interface Pop { g: SVGGElement; l: string; b: number; h: number; f: [string, number][]; up: boolean | null }
interface Lay { el: HTMLElement; k: string; r: number; sink: number; start: number; len: number }
interface Run { t0: number; T: number; from: number; to: number; m0: number; anims: Animation[]; done?: () => void }
interface Sky { strip: HTMLElement; solid: SVGSVGElement | null; land: SVGSVGElement | null; veil: SVGSVGElement | null; front: SVGSVGElement | null }
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** a hill settling into its place: quick to start, no overshoot */
const settle = (t: number) => 1 - Math.pow(1 - t, 3);
const smooth = (t: number) => t * t * (3 - 2 * t);
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** A glide's way over its time: a cubic from the start slope m0 (the speed it sets off with, in the way's length per
 *  glide time) to rest, never past its end for m0 <= 3; slope 3 is the ease-out cubic. */
const curve = (u: number, m0: number) => m0 * (u * u * u - 2 * u * u + u) + (3 * u * u - 2 * u * u * u);
const slope = (u: number, m0: number) => m0 * (3 * u * u - 4 * u + 1) + (6 * u - 6 * u * u);
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
  const st = useRef({ s: 0, u: 1, HS: 600, S1: 400, S2: 600, T: 1000, band: 60, fc: 100, mode: 'field' as VillageMode, ready: false,
    pops: [] as Pop[], lays: [] as Lay[], carts: [] as SVGGElement[], cartTf: [] as string[], bubbles: [] as SVGGElement[],
    sky: null as Sky | null, dockH: 0, still: null as boolean | null, moving: false, run: null as Run | null,
    cartRun: -1, cartAnim: 0, cartDir: 1, wheelLock: 0, wheelAcc: 0, wheelT: 0, wheelEnd: 0, noClick: 0, queued: false,
    drag: null as null | { id: number; x: number; y: number; s0: number; from: number; dir: number; lastY: number; lastT: number; v: number; resume?: number } });
  const opts = useRef(o);
  opts.current = o;
  // what was last written to an element's style, so a frame writes only what changed
  const written = useRef(new WeakMap<Element, Record<string, string>>());
  const set = (el: HTMLElement | SVGElement | null | undefined, prop: 'transform' | 'opacity' | 'visibility', v: string) => {
    if (!el) return;
    const w = written.current.get(el) ?? {};
    if (w[prop] === v) return;
    w[prop] = v; written.current.set(el, w);
    el.style[prop] = v;
  };

  const stops = () => [0, st.current.S2, st.current.T];
  const nearest = (s: number) => stops().reduce((a, v) => (Math.abs(v - s) < Math.abs(a - s) ? v : a));
  const stopFrom = (s: number, dir: number) => (dir > 0 ? stops().find((v) => v > s + 2) : [...stops()].reverse().find((v) => v < s - 2));
  /** where the way stands right now, a glide included */
  const here = () => { const S = st.current, r = S.run; return r ? r.from + (r.to - r.from) * curve(clamp((performance.now() - r.t0) / r.T, 0, 1), r.m0) : S.s; };
  // the way between the field and the village is one act of the motion language (720 ms and a breath); along the
  // village map the glide is shorter, by the distance
  const glideMs = (to: number) => { const S = st.current, s = here(); return Math.max(s, to) > S.S2 + 2 ? 760 : clamp(300 + Math.abs(to - s) * 0.5, 420, 640); };

  // ---- where everything stands at a place s along the way: pure, for a frame under the finger and for the keyframes
  // of a glide alike
  const phiOf = (s: number) => { const S = st.current; return clamp((s - S.S2) / S.S1, 0, 1); };
  function layerY(l: Lay, s: number) {
    const S = st.current;
    let y = s <= S.S2 ? -s : -S.S2 - l.r * (s - S.S2);
    // still behind the field: the hill waits sunk and rises in its turn into its place
    const p = 1 - phiOf(s);
    if (l.sink > 0 && p < 1) {
      const t = clamp((p - l.start) / l.len, 0, 1);
      y += l.sink * (1 - (opts.current.reduce ? smooth(t) : settle(t)));
    }
    return y * S.u;
  }
  const fieldY = (s: number) => (st.current.T - s) * st.current.u;
  // the hand of cards goes down with the field's first steps
  const dockY = (s: number) => smooth(clamp((1 - phiOf(s)) / 0.35, 0, 1)) * (st.current.dockH + 16);
  // the sky over the field thins out all along the first two thirds of the way, down to a veil behind the forecast;
  // its own strip of land goes first, so no band of it is left hanging over the village
  const skyAt = (s: number) => { const solid = smooth(clamp((phiOf(s) - 0.35) / 0.65, 0, 1)); return { solid, land: smooth(clamp((solid - 0.6) / 0.4, 0, 1)) }; };
  const tf = (y: number) => (Math.abs(y) > 0.05 ? `translate3d(0,${y.toFixed(2)}px,0)` : 'none');
  // the sky's strip of hills is the field's own horizon: it goes down with the field as it fades (the sky pictures are
  // centred by a translateX that every frame has to keep)
  const tfLand = (y: number) => `translateX(-50%) translate3d(0,${y.toFixed(2)}px,0)`;

  /** One place, written straight to the styles (under the finger, and where a glide ends). */
  function put(s: number) {
    const S = st.current, O = opts.current;
    for (const l of S.lays) set(l.el, 'transform', tf(layerY(l, s)));
    set(O.moveRef.current, 'transform', tf(fieldY(s)));
    set(O.dockRef.current, 'transform', tf(dockY(s)));
    const k = skyAt(s);
    if (S.sky) {
      set(S.sky.solid, 'opacity', k.solid.toFixed(3));
      set(S.sky.land, 'opacity', k.land.toFixed(3));
      set(S.sky.land, 'transform', tfLand(fieldY(s)));
      set(S.sky.veil, 'opacity', (1 - k.solid).toFixed(3));
      // the forecast, the far road and its little church belong to the field's sky: they go with it, so nothing of
      // the field's sky hangs over the village's green (28.10)
      set(S.sky.front, 'opacity', k.solid.toFixed(3));
      // the fog past the forecast thins to a haze once the field starts to go
      S.sky.strip.classList.toggle('v-open', phiOf(s) < 0.96);
    }
  }
  function frame() {
    const S = st.current;
    S.queued = false;
    if (!opts.current.enabled || !S.ready) return;
    put(clamp(S.s, 0, S.T));
  }
  const queue = () => { const S = st.current; if (!S.queued) { S.queued = true; requestAnimationFrame(frame); } };

  /** The way starts: the village becomes a picture (its little lives wait), the sign up to it goes. */
  function beginMove(to: number) {
    const S = st.current, O = opts.current;
    if (!S.moving) { S.moving = true; O.viewRef.current?.classList.add('v-moving'); }
    // the village sleeps only while its hills rise or sink (the way to the field); scrolling the open village
    // over its map keeps its life and its captions
    if (Math.max(to, S.s) > S.S2 + 1) sleep();
    // the cart stands on its hill before the hill comes up
    if (to < S.T - 2) placeCart(0);
  }
  function sleep() {
    const S = st.current;
    if (S.still !== true) { S.still = true; opts.current.rootRef.current?.classList.add('v-asleep'); }
  }
  /** The way has ended: what can be tapped, the mode, the cart, the village's life. */
  function endMove() {
    const S = st.current, O = opts.current;
    if (S.moving) { S.moving = false; O.viewRef.current?.classList.remove('v-moving'); }
    const s = clamp(S.s, 0, S.T), phi = phiOf(s);
    // a house can be tapped once most of it is out from behind the hills in front (the field is the nearest hill of
    // all) and under the sky strip; on the field the houses just over the yard stay out of reach
    const field = S.fc + (S.T - s) - clamp((phi - 0.8) / 0.2, 0, 1) * 90;
    const shift: Record<string, number> = {};
    for (const l of S.lays) shift[l.k] = layerY(l, s) / S.u;
    for (const q of S.pops) {
      const top = q.b + (shift[q.l] ?? 0) - q.h;
      let crest = field;
      for (const [k, y] of q.f) crest = Math.min(crest, y + (shift[k] ?? 0));
      const up = crest - Math.max(top, S.band) >= q.h * 0.7;
      if (up !== q.up) { q.up = up; q.g.classList.toggle('up', up); q.g.setAttribute('tabindex', up ? '0' : '-1'); }
    }
    const upNow = new Set(S.pops.filter((q) => q.up).map((q) => q.g.dataset.k ?? ''));
    // order bubbles and captions show over a place once it can be tapped
    for (const b of S.bubbles) b.classList.toggle('shown', upNow.has(b.dataset.for ?? ''));
    set(O.moveRef.current, 'visibility', fieldY(s) > S.HS * S.u + 40 ? 'hidden' : '');
    const mode: VillageMode = phi > 0.96 ? 'field' : phi < 0.12 ? 'village' : 'between';
    // the village's little lives play only while it stands open and still
    const still = mode !== 'village';
    if (still !== S.still) { S.still = still; O.rootRef.current?.classList.toggle('v-asleep', still); }
    O.moveRef.current?.classList.toggle('v-away', mode === 'village');
    placeCart(phi);
    if (mode !== S.mode) { S.mode = mode; O.onMode(mode); if (mode === 'village') rollCart(); }
  }

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
    S.carts.forEach((c, i) => {
      const on = c.dataset.l === k && phi < 0.5;
      // write only what changed: an SVG attribute set again still repaints the hill
      const t = on ? `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${flip * 0.9} .9)` : '';
      if (t === S.cartTf[i]) return;
      S.cartTf[i] = t;
      c.style.display = on ? '' : 'none';
      if (on) c.setAttribute('transform', t);
    });
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
      placeCart(phiOf(S.s));
      if (t < 1) S.cartAnim = requestAnimationFrame(step);
      else { S.cartAnim = 0; cartMemo.set(O.cart.key, to); O.rootRef.current?.classList.remove('cart-rolling'); }
    };
    S.cartAnim = requestAnimationFrame(step);
  }

  /** Stop a glide where it is now; returns its speed (units per ms), so the next one goes on from it. */
  function halt(): number {
    const S = st.current, r = S.run;
    if (!r) return 0;
    const u = clamp((performance.now() - r.t0) / r.T, 0, 1);
    S.s = r.from + (r.to - r.from) * curve(u, r.m0);
    put(S.s);
    for (const a of r.anims) a.cancel();
    S.run = null;
    return ((r.to - r.from) * slope(u, r.m0)) / r.T;
  }
  function finish() {
    const S = st.current, r = S.run;
    if (!r) return;
    S.s = r.to;
    put(r.to);
    for (const a of r.anims) a.cancel();
    S.run = null;
    endMove();
    r.done?.();
  }
  /** A glide to `to`: it goes on at the speed the finger let go (v0, units per ms) or the glide it interrupts had, or
   *  from rest sets off briskly, and settles without overshoot (V-01). A fast fling ends sooner; a slow one never
   *  stalls and then speeds up. The way is laid out at once as keyframes for every moving layer and played by the
   *  compositor, so it stays smooth whatever the page is busy with. */
  function glide(to: number, ms: number, done?: () => void, v0?: number) {
    const S = st.current, O = opts.current;
    const vNow = halt();
    const from = S.s, dist = to - from, D = Math.abs(dist);
    S.dockH = O.dockRef.current?.offsetHeight ?? S.dockH;
    if (O.reduce || D < 1 || typeof Element.prototype.animate !== 'function') {
      S.s = to; put(to); endMove();
      if (done) setTimeout(done, 40);
      return;
    }
    beginMove(to);
    const v = v0 ?? vNow, vt = v * Math.sign(dist);
    const T = vt > 0 ? clamp((3 * D) / vt, 360, ms) : ms;
    const m0 = vt > 0 ? clamp((vt * T) / D, 1.6, 3) : 3;
    const n = Math.max(12, Math.ceil(T / 16));
    const ss = Array.from({ length: n + 1 }, (_, i) => from + dist * curve(i / n, m0));
    const opt: KeyframeAnimationOptions = { duration: T, easing: 'linear', fill: 'forwards' };
    const anims: Animation[] = [];
    const go = (el: Element | null | undefined, frames: Keyframe[]) => { if (el) anims.push(el.animate(frames, opt)); };
    for (const l of S.lays) go(l.el, ss.map((s) => ({ transform: tf(layerY(l, s)) })));
    go(O.moveRef.current, ss.map((s) => ({ transform: tf(fieldY(s)) })));
    go(O.dockRef.current, ss.map((s) => ({ transform: tf(dockY(s)) })));
    if (S.sky) {
      const k = ss.map(skyAt);
      go(S.sky.solid, k.map((x) => ({ opacity: x.solid })));
      go(S.sky.land, k.map((x, i) => ({ opacity: x.land, transform: tfLand(fieldY(ss[i])) })));
      go(S.sky.veil, k.map((x) => ({ opacity: 1 - x.solid })));
      go(S.sky.front, k.map((x) => ({ opacity: x.solid })));
      S.sky.strip.classList.toggle('v-open', phiOf(to) < 0.96);
    }
    const run: Run = { t0: performance.now(), T, from, to, m0, anims, done };
    S.run = run;
    if (anims[0]) anims[0].onfinish = () => { if (st.current.run === run) finish(); };
    else finish();
  }
  const goTo = (to: number, v0?: number) => glide(to, glideMs(to), undefined, v0);

  // ---- geometry: from the view's size and the sky's and the field's places
  function measure() {
    const S = st.current, O = opts.current, view = O.viewRef.current, root = O.rootRef.current;
    if (!O.enabled || !view || !root) { S.ready = false; return; }
    halt();
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
      return { el, k, r: Number(el.dataset.r) || 0, ...rise };
    });
    const strip = view.querySelector<HTMLElement>('.sky-strip');
    S.sky = strip ? { strip, solid: strip.querySelector('.sb-solid'), land: strip.querySelector('.sb-land'), veil: strip.querySelector('.sb-veil'), front: strip.querySelector('.sb-front') } : null;
    S.dockH = O.dockRef.current?.offsetHeight ?? 0;
    S.still = null;
    S.pops = [...root.querySelectorAll<SVGGElement>('.pop')].map((el) => ({
      g: el.parentNode as SVGGElement, l: el.dataset.l ?? '', b: Number(el.dataset.b), h: Number(el.dataset.h), up: null,
      f: (el.dataset.f ?? '').split(';').filter(Boolean).map((q) => { const [k, y] = q.split(':'); return [k, Number(y)] as [string, number]; }),
    }));
    S.carts = [...root.querySelectorAll<SVGGElement>('.v-cart')];
    S.cartTf = S.carts.map(() => '\u0000');
    S.bubbles = [...root.querySelectorAll<SVGGElement>('.v-bubble, .v-label')];
    S.s = wasField ? S.T : wasTop ? 0 : wasBottom ? S.S2 : clamp(S.s, 0, S.T);
    S.ready = true;
    put(S.s);
    endMove();
  }

  useEffect(() => {
    if (!o.enabled) {
      const S = st.current;
      halt();
      S.ready = false;
      const move = o.moveRef.current, dock = o.dockRef.current;
      if (move) { move.style.transform = ''; move.style.visibility = ''; }
      if (dock) dock.style.transform = '';
      for (const el of o.viewRef.current?.querySelectorAll<SVGSVGElement>('.sky-strip .sky-svg') ?? []) { el.style.opacity = ''; el.style.transform = ''; }
      o.viewRef.current?.querySelector('.sky-strip')?.classList.remove('v-open');
      o.viewRef.current?.classList.remove('v-moving');
      o.moveRef.current?.classList.remove('v-away');
      written.current = new WeakMap();
      S.moving = false;
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
      // a finger catches a glide where it is; a tap that does not drag lets it go on to where it was going
      const resume = S.run?.to;
      halt();
      S.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, s0: S.s, from: resume ?? nearest(S.s), dir: 0, lastY: e.clientY, lastT: performance.now(), v: 0, resume };
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
          beginMove(0);
          try { view.setPointerCapture(e.pointerId); } catch { /* not every pointer can be captured */ }
        } else if (Math.abs(dx) > 12) { S.drag = null; return; }
        else return;
      }
      const now = performance.now();
      S.s = clamp(d.s0 - dy / S.u, 0, S.T);
      if (S.s > S.S2 + 1) sleep();
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
      if (!d.dir) { if (d.resume !== undefined) goTo(d.resume); return; }
      S.noClick = performance.now() + 350;
      const ds = S.s - d.from, fling = performance.now() - d.lastT < 90 ? d.v : 0;
      // The open village is a map: let go anywhere over it and it coasts on a little and stays (every house can be
      // reached). Only the way between the village and the field snaps, to one end or the other.
      if (S.s <= S.S2 + 1 && d.from <= S.S2 + 1) {
        const to = clamp(S.s + fling * 320, 0, S.S2);
        if (Math.abs(to - S.s) < 2) { S.s = clamp(S.s, 0, S.S2); put(S.s); endMove(); return; }
        goTo(to, fling);
        return;
      }
      let to = d.from;
      if (e.type !== 'pointercancel' && (Math.abs(ds) > 28 || Math.abs(fling) > 0.3)) to = stopFrom(d.from, Math.abs(ds) > 28 ? Math.sign(ds) : Math.sign(fling)) ?? d.from;
      // the glide carries on at the speed the finger let go (V-01)
      goTo(to, fling);
    };
    const click = (e: MouseEvent) => { if (performance.now() < S.noClick) { e.stopPropagation(); e.preventDefault(); } };
    const wheel = (e: WheelEvent) => {
      if (opts.current.blocked() || (e.target as Element).closest('.dock, .sheet')) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
      if (!dy) return;
      const dir = Math.sign(dy);
      if (!S.run && (dir > 0 ? S.s >= S.T - 2 : S.s <= 2)) return;
      e.preventDefault();
      const now = performance.now();
      // over the open village the wheel scrolls its map like a page; at its foot the next turn goes to the field
      const at = S.run ? S.run.to : S.s;
      if (now >= S.wheelLock && at <= S.S2 + 1 && !(dir > 0 && at >= S.S2 - 1)) {
        S.wheelAcc = 0;
        const to = clamp(at + dy / S.u, 0, S.S2);
        if (Math.abs(dy) < 40 && !S.run) {
          // a trackpad's small steps follow the fingers directly
          S.s = to; queue();
          clearTimeout(S.wheelEnd); S.wheelEnd = window.setTimeout(() => endMove(), 140);
        } else glide(to, 240);
        // a page's worth of a swipe does not run on into the field in the same gesture
        if (to >= S.S2 - 1) S.wheelLock = now + 360;
        return;
      }
      if (now < S.wheelLock) { S.wheelLock = Math.max(S.wheelLock, now + 120); return; }
      if (now - S.wheelT > 220) S.wheelAcc = 0;
      S.wheelT = now; S.wheelAcc += dy;
      if (Math.abs(S.wheelAcc) < 24) return;
      // one turn of the wheel (or one trackpad swipe with its tail) is one stop; a new one may turn the glide (V-02)
      const next = stopFrom(S.run ? S.run.to : S.s, dir);
      if (next === undefined) return;
      S.wheelAcc = 0;
      S.wheelLock = now + 260;
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
      halt();
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
    toggle: () => { const S = st.current; if (!S.ready) return; goTo(here() > S.S2 + S.S1 / 2 ? S.S2 : S.T); },
    toField: () => { const S = st.current; if (S.ready) goTo(S.T); },
    flyTo: (k: string) => new Promise<boolean>((res) => {
      const S = st.current, root = opts.current.rootRef.current;
      if (!S.ready || S.mode === 'field' || !root) { res(false); return; }
      const g = [...root.querySelectorAll<SVGGElement>(`.spot-g[data-k="${k}"]`)].find((x) => x.getBoundingClientRect().width > 0) ?? null;
      const p = g?.querySelector<SVGGElement>('.pop');
      if (!g || !p) { res(false); return; }
      const target = clamp(Number(p.dataset.b) - S.HS * 0.62, 0, S.S2);
      glide(target, Math.abs(target - here()) < 4 ? 1 : 560, () => {
        g.classList.remove('ping'); void g.getBBox(); g.classList.add('ping');
        setTimeout(() => res(true), 420);
      });
    }),
  };
}
