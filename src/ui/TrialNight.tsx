// The night of the year's ordeal, played over the field before anything else of the week.
// Three acts on one clock (--D, the event's length; --t, a moment as a share of it):
// the dark comes (banner, sky, veil) → the blow walks over the beds, each at its own moment → dawn and the tally.
// The field layers live in the Scene's SVG (TrialVeil in its frame, TrialTop in the beds' frame); the sky, the
// banner and the stamp are HTML over the field (TrialSky); the great swarm is a canvas (SwarmCanvas).
import { useEffect, useRef } from 'preact/hooks';
import type { GameState, TrialNight as Night, TrialOutcome } from '../engine/game';
import { plural, tile } from '../engine/game';
import { GRID } from '../engine/data';
import { TRIALS, TRIAL_GRADE_NAME, fireCore, fireRing } from '../engine/trials';
import { FirePit } from '../art/fire';
import { Hopper } from '../art/locusts';

export const CELL = 100, PAD = 22;
/** the length of each night at the normal pace (the playback divides it by its rate) */
export const TRIAL_MS: Record<Night['kind'], number> = { frost: 9800, locust: 9400, drought: 7400 };
/** moments of the night, as shares of its length */
export const TN = { veil: 0.02, banner: 0.04, blow: 0.2, spread: 0.32, settle: 0.66, dawn: 0.74, stamp: 0.8 };

const k = (x: number, y: number) => `${x},${y}`;
/** how far each bed lies from the open land round the farm (frost creeps in from there) */
function edgeDepth(s: GameState): Map<string, number> {
  const out = new Map<string, number>();
  const q: [number, number][] = [];
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    if (!tile(s, x, y).owned) continue;
    const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const a = x + dx, b = y + dy; return a < 0 || b < 0 || a >= GRID || b >= GRID || !tile(s, a, b).owned; });
    if (open) { out.set(k(x, y), 0); q.push([x, y]); }
  }
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = x + dx, b = y + dy;
      if (a < 0 || b < 0 || a >= GRID || b >= GRID || !tile(s, a, b).owned || out.has(k(a, b))) continue;
      out.set(k(a, b), out.get(k(x, y))! + 1);
      q.push([a, b]);
    }
  }
  return out;
}
/** the moment (share of the night) the blow reaches each bed it touches */
export function trialTimes(s: GameState, n: Night): Map<string, number> {
  const out = new Map<string, number>();
  if (n.kind === 'frost') {
    const depth = edgeDepth(s);
    const max = Math.max(1, ...depth.values());
    for (const [key, d] of depth) out.set(key, TN.blow + 0.06 + 0.26 * (d / max));
  } else if (n.kind === 'locust') {
    const band = n.band ?? n.cells.map((c) => [c.x, c.y] as [number, number]);
    const along = ([x, y]: [number, number]) => (n.dir === 'w' ? x : n.dir === 'e' ? -x : n.dir === 'n' ? y : -y) + 0.18 * (n.dir === 'w' || n.dir === 'e' ? y : x);
    const vals = band.map(along);
    const lo = Math.min(...vals, 0), hi = Math.max(...vals, 1);
    band.forEach((c, i) => out.set(k(...c), TN.blow + 0.12 + 0.3 * ((vals[i] - lo) / Math.max(0.5, hi - lo))));
  } else {
    const dried = n.cells.filter((c) => c.out === 'dried');
    dried.forEach((c, i) => out.set(k(c.x, c.y), TN.blow + 0.1 + 0.32 * (i / Math.max(1, dried.length - 1))));
  }
  return out;
}
/** when a bed shows its result: a moment after the blow reaches it */
export const revealAt = (t: number, out: TrialOutcome) => t + (out === 'eaten' ? 0.1 : out === 'dried' ? 0.08 : 0.07);

const BAD: TrialOutcome[] = ['killed', 'bitten', 'eaten', 'dried'];

// ---------- in the Scene's frame: the night over the whole field, with warm holes round the lit fires ----------
export function TrialVeil({ n, W, H, ox, oy }: { n: Night; W: number; H: number; ox: number; oy: number }) {
  const lit = n.lit ? n.fires : [];
  const id = `tn-mask-${n.id}`;
  return (
    <g class={`tn-veil-wrap tk-${n.kind}`} pointer-events="none" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-hole`}><stop offset="0" stop-color="#000" /><stop offset=".55" stop-color="#000" stop-opacity=".85" /><stop offset="1" stop-color="#000" stop-opacity="0" /></radialGradient>
        <mask id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
          <rect x={0} y={0} width={W} height={H} fill="#fff" />
          {lit.map(([x, y]) => <circle class="tn-hole" cx={ox + PAD + (x + 1) * CELL} cy={oy + PAD + (y + 1) * CELL - 6} r={n.kind === 'frost' ? 150 : 115} fill={`url(#${id}-hole)`} />)}
        </mask>
      </defs>
      <rect class="tn-veil" x={0} y={0} width={W} height={H} mask={`url(#${id})`} />
      {n.kind === 'drought' && <rect class="tn-heat" x={0} y={0} width={W} height={H} />}
    </g>
  );
}

function Dendrites({ seed }: { seed: number }) {
  // frost ferns grow in from the bed's corners: a stem and its side shoots
  const r = (i: number) => ((seed * 9301 + i * 49297) % 233280) / 233280;
  const ferns = [[6, 8, 38], [94, 10, 142], [8, 92, -40], [92, 90, 220]].map(([x, y, a], i) => {
    const ang = (a + (r(i) - 0.5) * 30) * Math.PI / 180, L = 30 + r(i + 7) * 18;
    const ex = x + Math.cos(ang) * L, ey = y + Math.sin(ang) * L;
    const side = [0.35, 0.6, 0.82].map((f, j) => {
      const px = x + (ex - x) * f, py = y + (ey - y) * f, s = (j % 2 ? 1 : -1) * 0.9, l = (1 - f) * 16 + 4;
      return `M${px.toFixed(1)} ${py.toFixed(1)} l${(Math.cos(ang + s) * l).toFixed(1)} ${(Math.sin(ang + s) * l).toFixed(1)} M${px.toFixed(1)} ${py.toFixed(1)} l${(Math.cos(ang - s) * l).toFixed(1)} ${(Math.sin(ang - s) * l).toFixed(1)}`;
    }).join(' ');
    return <path class={`tn-fern f${i}`} d={`M${x} ${y} L${ex.toFixed(1)} ${ey.toFixed(1)} ${side}`} pathLength={1} />;
  });
  return <g class="tn-ferns">{ferns}</g>;
}

function HeatTag({ v }: { v: number }) {
  return <g class="tn-heat-tag"><rect x={-17} y={-11} width={34} height={20} rx={10} /><text x={0} y={4} text-anchor="middle">+{v}°</text></g>;
}

/** in the beds' frame, over everything: what the night does to each bed, the fires that fight it */
export function TrialTop({ s, n, level }: { s: GameState; n: Night; level: number }) {
  const times = trialTimes(s, n);
  const cellOut = new Map(n.cells.map((c) => [k(c.x, c.y), c]));
  const owned: [number, number][] = [];
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (tile(s, x, y).owned && !tile(s, x, y).canal) owned.push([x, y]);
  const warm = new Set(n.lit ? n.fires.flatMap(([x, y]) => fireCore(x, y)).map(([x, y]) => k(x, y)) : []);
  const ring = new Set(n.lit ? n.fires.flatMap(([x, y]) => fireRing(x, y)).map(([x, y]) => k(x, y)) : []);
  const heat = [[0, 0], [5, 2], [7, 3], [9, 4]][Math.min(3, level)];
  return (
    <g class={`tn-top tk-${n.kind}`} pointer-events="none" aria-hidden="true">
      {/* the fires' warmth on the beds, under the frost and the smoke */}
      {n.lit && n.fires.map(([x, y]) => (
        <g transform={`translate(${PAD + (x + 1) * CELL} ${PAD + (y + 1) * CELL})`} class="tn-fire-warm">
          {n.kind === 'frost' && <rect class="tn-warm-ring" x={-196} y={-196} width={392} height={392} rx={46} />}
          <rect class="tn-warm-core" x={-96} y={-96} width={192} height={192} rx={28} />
        </g>
      ))}
      {n.kind === 'locust' && n.band && n.band.map(([x, y]) => (
        <rect class="tn-band" x={PAD + x * CELL + 3} y={PAD + y * CELL + 4} width={94} height={92} rx={13} style={{ ['--t' as string]: String(TN.blow + 0.04) }} />
      ))}
      {owned.map(([x, y]) => {
        const key = k(x, y);
        const c = cellOut.get(key);
        const t = times.get(key);
        const out = c?.out;
        if (n.kind === 'frost') {
          if (t === undefined) return null;
          const fight = warm.has(key) || ring.has(key);
          return (
            <g transform={`translate(${PAD + x * CELL} ${PAD + y * CELL})`} class={`tn-cell tn-frost o-${out ?? 'empty'}${fight ? ' fire-fight' : ''}${warm.has(key) ? ' fire-core' : ''}`} style={{ ['--t' as string]: t.toFixed(3) }}>
              <rect class="tn-rime" x={3} y={4} width={94} height={92} rx={13} />
              <Dendrites seed={x * 7 + y * 13 + 3} />
              <g class="tn-sparkle">{[[22, 26], [70, 34], [40, 72], [80, 76], [54, 50]].map(([a, b], i) => <path d={`M${a} ${b - 4} V${b + 4} M${a - 4} ${b} H${a + 4}`} style={{ ['--i' as string]: String(i) }} />)}</g>
              {out && BAD.includes(out) && <g class="tn-mark" transform="translate(50 50)"><circle r={15} /><path d={out === 'killed' ? 'M-6 -6 L6 6 M6 -6 L-6 6' : 'M-7 0 H7'} /></g>}
            </g>
          );
        }
        if (n.kind === 'locust') {
          if (!c) return null;
          return (
            <g transform={`translate(${PAD + x * CELL} ${PAD + y * CELL})`} class={`tn-cell tn-locust o-${out}`} style={{ ['--t' as string]: (t ?? TN.spread).toFixed(3) }}>
              {out === 'eaten' && <g class="tn-feeders">
                {[[24, 30, 1], [64, 24, -1], [76, 58, 1], [38, 66, -1], [52, 44, 1], [20, 62, -1], [70, 80, 1]].map(([a, b, d], i) => (
                  <g transform={`translate(${a} ${b}) scale(${d * 1.25} 1.25)`}><g class="tn-feeder" style={{ ['--i' as string]: String(i) }}><Hopper /></g></g>
                ))}
                <g class="tn-bites">{[[30, 40], [62, 36], [48, 62], [70, 66]].map(([a, b], i) => <circle cx={a} cy={b} r={3 + (i % 2)} style={{ ['--i' as string]: String(i) }} />)}</g>
              </g>}
              {out === 'smoke' && <g class="tn-repel">
                {[[50, 18, -1], [14, 50, 1], [86, 50, -1]].map(([a, b, d], i) => <g transform={`translate(${a} ${b}) scale(${d} 1)`}><g class="tn-flinch" style={{ ['--i' as string]: String(i) }}><Hopper /></g></g>)}
                <g class="tn-puffs">{[0, 1, 2].map((i) => <circle cx={30 + i * 20} cy={40 + (i % 2) * 18} r={14} style={{ ['--i' as string]: String(i) }} />)}</g>
              </g>}
              {out === 'guarded' && <g class="tn-guard"><rect x={5} y={6} width={90} height={88} rx={12} /><path class="tn-guard-wave" d="M18 50 q8 -10 16 0 t16 0 t16 0 t16 0" /></g>}
              {out === 'held' && <g class="tn-held" transform="translate(50 50)"><circle r={13} /><path d="M-5 0 l3.5 4 l7 -8" /></g>}
            </g>
          );
        }
        // drought
        if (!c && !tile(s, x, y).crop) return null;
        const tt = t ?? TN.spread + 0.1 * ((x + y) % 3);
        return (
          <g transform={`translate(${PAD + x * CELL} ${PAD + y * CELL})`} class={`tn-cell tn-drought o-${out ?? 'held'}`} style={{ ['--t' as string]: tt.toFixed(3) }}>
            <rect class="tn-parch" x={3} y={4} width={94} height={92} rx={13} />
            {out === 'dried' && <path class="tn-crack" d="M18 30 l12 9 l-4 11 l10 8 l-2 12 M72 20 l-7 11 l6 9 l-5 10 M56 64 l10 7 l-3 11 M24 76 l10 -5 l6 8" pathLength={1} />}
            {out !== 'dried' && <g class="tn-moist"><ellipse cx={50} cy={56} rx={30} ry={18} /></g>}
          </g>
        );
      })}
      {/* the fires themselves burn above the night */}
      {n.fires.map(([x, y], i) => (
        <g transform={`translate(${PAD + (x + 1) * CELL} ${PAD + (y + 1) * CELL + 8})`} class="tn-fire">
          <g transform="scale(1.15)"><FirePit lit={n.lit} level={level} uid={`tn${i}`} /></g>
          {n.lit && n.kind === 'frost' && <g transform="translate(0 -74)" class="tn-heat-at" style={{ ['--t' as string]: String(TN.blow + 0.02) }}><HeatTag v={heat[0]} /></g>}
          {n.lit && n.kind === 'locust' && <g class="tn-plume">{[0, 1, 2, 3, 4].map((j) => <circle cx={0} cy={-40} r={10 + j * 3} style={{ ['--i' as string]: String(j) }} />)}</g>}
        </g>
      ))}
    </g>
  );
}

/** classes for the plants while the night plays: they stiffen with frost, are stripped by the swarm, droop in the heat */
export function trialPlantClass(s: GameState, n: Night | null): Map<string, string> {
  const m = new Map<string, string>();
  if (!n) return m;
  const times = trialTimes(s, n);
  for (const c of n.cells) {
    const t = times.get(k(c.x, c.y));
    if (t === undefined) continue;
    m.set(k(c.x, c.y), `tn-plant tp-${n.kind} tp-${c.out}`);
  }
  return m;
}
export const trialPlantTime = (s: GameState, n: Night | null, x: number, y: number) => (n ? trialTimes(s, n).get(k(x, y)) : undefined);

// ---------- over the field, in HTML: the sky, the banner, the numbers, the stamp ----------
export function TrialSky({ n, D, E = 0 }: { n: Night; D: number; E?: number }) {
  const def = TRIALS[n.kind];
  const lost = n.cells.filter((c) => BAD.includes(c.out)).length;
  const kept = n.cells.filter((c) => !BAD.includes(c.out)).length;
  const r = n.result;
  const title = n.kind === 'locust' && n.waves && n.waves > 1 ? `${def.name}, волна ${n.wave ?? 1} из ${n.waves}` : def.name;
  return (
    <div class={`tn-sky tk-${n.kind}`} style={{ ['--D' as string]: `${D}ms`, ['--E' as string]: `${-E}ms` }} aria-live="polite">
      <div class="tn-dark" />
      {n.kind === 'frost' && <div class="tn-stars">{Array.from({ length: 22 }, (_, i) => <i style={{ left: `${(i * 37) % 100}%`, top: `${(i * 23) % 34}%`, ['--i' as string]: String(i % 7) }} />)}<b class="tn-moon" /></div>}
      {n.kind === 'drought' && <div class="tn-sun"><b /><i /></div>}
      {n.kind === 'locust' && <div class="tn-dust" />}
      <div class="tn-banner" role="status">
        <small>Испытание года</small>
        <strong>{title}</strong>
        <span class="tn-rule" />
      </div>
      {n.kind === 'frost' && n.temp !== undefined && <div class="tn-temp"><span class="tn-temp-n">{n.temp > 0 ? '+' : n.temp < 0 ? '−' : ''}{Math.abs(n.temp)}°</span><small>ночью</small></div>}
      {n.kind === 'drought' && <div class="tn-temp hot"><span class="tn-temp-n">+34°</span><small>в тени</small></div>}
      <div class="tn-tally">
        {lost + kept > 0 ? <>
          <span class="good">уцелело {kept} {plural(kept, 'грядка', 'грядки', 'грядок')}</span>
          {lost > 0 && <span class="bad">{n.kind === 'frost' ? 'побито морозом' : n.kind === 'locust' ? 'съедено' : 'засохло'} {lost} {plural(lost, 'грядка', 'грядки', 'грядок')}</span>}
        </> : <span>поле пустое, терять нечего</span>}
      </div>
      {r && <div class={`tn-stamp g${r.grade}`}><span>{TRIAL_GRADE_NAME[r.grade]}</span><small>{r.grade === 0 ? 'испытание переждали' : `спасено ${Math.round(r.saved * 100)}%`}{r.glory ? `, слава +${r.glory}` : ''}</small></div>}
    </div>
  );
}

// ---------- the great swarm: hundreds of insects over the field, in a canvas ----------
interface Bug { x: number; y: number; vx: number; vy: number; s: number; ph: number; lane: number; tx?: number; ty?: number; t0: number }
export function SwarmCanvas({ n, D, E = 0, anchor }: { n: Night; D: number; E?: number; anchor: () => SVGGElement | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const a = anchor();
    if (!cv || !a) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const box = cv.getBoundingClientRect();
    cv.width = Math.round(box.width * dpr); cv.height = Math.round(box.height * dpr);
    const m = a.getScreenCTM();
    if (!m) return;
    // the beds' frame → the canvas
    const map = (fx: number, fy: number): [number, number] => [(m.a * fx + m.c * fy + m.e - box.left) * dpr, (m.b * fx + m.d * fy + m.f - box.top) * dpr];
    const unit = Math.hypot(m.a, m.b) * dpr;
    const W = cv.width, H = cv.height;
    const eaten = n.cells.filter((c) => c.out === 'eaten');
    const smoke = n.lit ? n.fires.map(([x, y]) => map(PAD + (x + 1) * CELL, PAD + (y + 1) * CELL)) : [];
    const band = n.band ?? [];
    const bandC = band.length ? band.reduce((p, [x, y]) => [p[0] + x, p[1] + y], [0, 0]).map((v) => v / band.length) : [2.5, 2.5];
    const [bcx, bcy] = map(PAD + (bandC[0] + 0.5) * CELL, PAD + (bandC[1] + 0.5) * CELL);
    const dir = n.dir ?? 'w';
    const ux = dir === 'w' ? 1 : dir === 'e' ? -1 : 0, uy = dir === 'n' ? 1 : dir === 's' ? -1 : 0;
    const N = Math.round(Math.min(520, 240 + (W * H) / (dpr * dpr) / 900));
    const rnd = (() => { let z = 1234567; return () => ((z = (z * 16807) % 2147483647) / 2147483647); })();
    const bugs: Bug[] = Array.from({ length: N }, (_, i) => {
      const lane = rnd();
      const start = ux ? [ux > 0 ? -60 * dpr - rnd() * W * 0.5 : W + 60 * dpr + rnd() * W * 0.5, lane * H] : [lane * W, uy > 0 ? -60 * dpr - rnd() * H * 0.5 : H + 60 * dpr + rnd() * H * 0.5];
      const feed = eaten.length && i % 3 === 0 ? eaten[i % eaten.length] : null;
      const target = feed ? map(PAD + (feed.x + 0.2 + rnd() * 0.6) * CELL, PAD + (feed.y + 0.2 + rnd() * 0.6) * CELL) : undefined;
      return { x: start[0], y: start[1], vx: 0, vy: 0, s: (0.55 + rnd() * 0.75) * dpr, ph: rnd() * 6.28, lane, t0: rnd() * 0.12, ...(target ? { tx: target[0], ty: target[1] } : {}) };
    });
    const t0 = performance.now() - E;
    let raf = 0;
    const draw = (now: number) => {
      const u = (now - t0) / D;
      ctx.clearRect(0, 0, W, H);
      if (u > 1) return;
      const enter = TN.blow, feedA = TN.blow + 0.12, feedB = TN.settle - 0.04, leave = TN.settle;
      for (const b of bugs) {
        const uu = u - b.t0;
        if (uu < enter - 0.08) continue;
        // the stream: across the field in its direction, gathering over the band, swirling, away again
        let ax = ux * 1.6, ay = uy * 1.6;
        const sp = 9 * dpr;
        if (b.tx !== undefined && uu > feedA && uu < feedB) { ax = (b.tx - b.x) * 0.02; ay = (b.ty! - b.y) * 0.02; }
        else if (uu < leave) { ax += (bcx - b.x) * 0.0016; ay += (bcy - b.y) * 0.0016; }
        else { ax = ux * 3.2; ay = uy * 3.2 - 0.6; }
        // smoke pushes them away
        for (const [sx, sy] of smoke) {
          const dx = b.x - sx, dy = b.y - (sy - 20 * dpr), d2 = dx * dx + dy * dy, R = 150 * unit;
          if (d2 < R * R) { const f = (1 - Math.sqrt(d2) / R) * 4.2; const d = Math.sqrt(d2) || 1; ax += (dx / d) * f; ay += (dy / d) * f; }
        }
        b.ph += 0.35;
        b.vx = (b.vx + ax) * 0.86 + Math.cos(b.ph * 0.7 + b.lane * 9) * 0.9 * dpr;
        b.vy = (b.vy + ay) * 0.86 + Math.sin(b.ph + b.lane * 7) * 0.9 * dpr;
        const v = Math.hypot(b.vx, b.vy) || 1;
        if (v > sp) { b.vx = (b.vx / v) * sp; b.vy = (b.vy / v) * sp; }
        b.x += b.vx; b.y += b.vy;
        const ang = Math.atan2(b.vy, b.vx);
        const fade = uu < enter ? (uu - enter + 0.08) / 0.08 : uu > 0.9 ? Math.max(0, (1 - uu) / 0.1) : 1;
        ctx.globalAlpha = 0.92 * fade;
        ctx.save();
        ctx.translate(b.x, b.y); ctx.rotate(ang); ctx.scale(b.s, b.s);
        // a long body, a flicker of wings
        ctx.fillStyle = '#2b2812';
        ctx.beginPath(); ctx.ellipse(0, 0, 6, 1.9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = b.lane > .7 ? 'rgba(150,130,70,.55)' : 'rgba(84,74,40,.55)';
        const w = Math.sin(b.ph * 3) * 4;
        ctx.beginPath(); ctx.ellipse(-1, -2 - Math.abs(w) * 0.4, 5.2, 1.6 + Math.abs(w) * 0.35, -0.35, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(-1, 2 + Math.abs(w) * 0.4, 5.2, 1.6 + Math.abs(w) * 0.35, 0.35, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [n.id, n.wave, D]);
  return <canvas class="tn-swarm" ref={ref} aria-hidden="true" />;
}
