// The meadow around the beds: every free plot gets its own little scene, chosen by a stable hash of its
// position and drawn for the season — dandelions in spring, chamomile and cornflowers in summer, leaves and
// mushrooms in autumn, snow and a snowman in winter. Plus the grass itself, the trodden path along the
// yard, a rain barrel by the farmer's spot and tufts along the edges. Pure decoration: nothing here is
// clickable and nothing changes the game.
import type { JSX } from 'preact';
import { P } from './palette';
import { YARD, type YardPiece } from './yard';

const INK = P.ink;
export type Season = 0 | 1 | 2 | 3;

export function hash2(x: number, y: number, k = 0) {
  let h = ((x + k * 31) * 374761393 + (y + k * 17) * 668265263) >>> 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// spots away from the centre of the plot, so the "for sale" sign in the middle stays clear
const SPOTS: [number, number][] = [[29, 70], [71, 68], [30, 31], [70, 33]];

function Tuft({ x, y, s = 1, c = P.grassDark }: { x: number; y: number; s?: number; c?: string }) {
  return <path d={`M${x} ${y} l${-3 * s} ${-7 * s} M${x} ${y} l0 ${-9 * s} M${x} ${y} l${3 * s} ${-7 * s}`} stroke={c} stroke-width={1.9} stroke-linecap="round" />;
}
function Bush({ berry }: { berry: boolean }) {
  return (
    <g>
      <ellipse cx={0} cy={6} rx={16} ry={5} fill="rgba(0,0,0,0.12)" />
      <circle cx={-7} cy={0} r={9} fill={P.grassDark} stroke={INK} stroke-width={1.6} />
      <circle cx={6} cy={-3} r={11} fill="#6aa843" stroke={INK} stroke-width={1.6} />
      <path d="M2 -9 q3 -2 6 0" stroke="#8fca5e" stroke-width={1.4} fill="none" stroke-linecap="round" />
      {berry && <><circle cx={2} cy={-6} r={2.1} fill={P.red} stroke={INK} stroke-width={.6} /><circle cx={9} cy={1} r={1.8} fill={P.red} stroke={INK} stroke-width={.6} /><circle cx={-6} cy={-2} r={1.7} fill={P.red} stroke={INK} stroke-width={.6} /></>}
    </g>
  );
}
function Stones() {
  return (
    <g>
      <ellipse cx={2} cy={5} rx={15} ry={3.4} fill="rgba(0,0,0,0.12)" />
      <path d="M-12 4 Q-13 -4 -5 -5 Q2 -6 3 1 Q3 5 -4 5.4 Q-11 5.6 -12 4 Z" fill={P.stone} stroke={INK} stroke-width={1.5} stroke-linejoin="round" />
      <path d="M-9 -2 q3 -2 6 -1" stroke="#c9c4bb" stroke-width={1.2} fill="none" stroke-linecap="round" />
      <path d="M4 5 Q3 -1 8.6 -1.4 Q13.6 -1 13.4 3.4 Q12.6 6 8 6 Q4.6 6 4 5 Z" fill="#b5b0a7" stroke={INK} stroke-width={1.4} stroke-linejoin="round" />
      <path d="M-11.4 2 Q-8 -1 -5 2" stroke="#7aa24a" stroke-width={2} fill="none" stroke-linecap="round" opacity={.8} />
    </g>
  );
}
function Dandelions({ k }: { k: number }) {
  const heads: [number, number][] = [[-10, -2], [-1, -8], [8, 0], [14, -9]];
  return (
    <g>
      {heads.map(([x, y], i) => (
        <g transform={`translate(${x} ${y})`}>
          <path d={`M0 0 Q${i % 2 ? 1.5 : -1.5} 5 0 10`} stroke={P.stem} stroke-width={1.3} fill="none" />
          {(i + k) % 4 === 3
            ? <g><circle r={4} fill="#fbfaf4" stroke="#b9b39f" stroke-width={.5} stroke-dasharray="1 1" /><circle r={1} fill="#c9b98a" /></g>
            : <g><circle r={3.6} fill={P.flowerYellow} stroke="#c9a12a" stroke-width={.8} /><circle r={1.6} fill="#f2b82e" /></g>}
        </g>
      ))}
      <path d="M-14 10 q3 -7 6 -1 q2 -6 5 0" fill="#5f9a3a" stroke="#4c7f2c" stroke-width={.8} />
    </g>
  );
}
function Chamomile({ k }: { k: number }) {
  const fl: [number, number, boolean][] = [[-10, -1, false], [0, -8, true], [9, 1, false], [15, -7, k % 2 === 0]];
  return (
    <g>
      {fl.map(([x, y, blue]) => (
        <g transform={`translate(${x} ${y})`}>
          <path d="M0 0 V10" stroke={P.stem} stroke-width={1.2} />
          {blue
            ? <g>{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <path d="M0 0 L-1.2 -4.2 L0 -3.4 L1.2 -4.2 Z" fill="#5f8fe0" stroke="#3d64ad" stroke-width={.4} transform={`rotate(${a})`} />)}<circle r={1.2} fill="#33427a" /></g>
            : <g>{[0, 40, 80, 120, 160, 200, 240, 280, 320].map((a) => <ellipse cy={-3} rx={1.2} ry={2.4} fill="#fffdf6" stroke="#d6cfbd" stroke-width={.4} transform={`rotate(${a})`} />)}<circle r={1.8} fill="#f2c23a" stroke="#c99a1f" stroke-width={.5} /></g>}
        </g>
      ))}
    </g>
  );
}
function Poppies() {
  return (
    <g>
      {[[-8, -4], [5, -9], [12, 1]].map(([x, y], i) => (
        <g transform={`translate(${x} ${y})`}>
          <path d={`M0 0 Q${i - 1} 6 0 12`} stroke={P.stem} stroke-width={1.2} fill="none" />
          <path d="M0 -4 Q4 -4.4 4 0 Q4 3.6 0 3.4 Q-4 3.6 -4 0 Q-4 -4.4 0 -4 Z" fill="#e0473a" stroke="#a92e25" stroke-width={.7} />
          <circle r={1.2} fill="#3a2a22" />
        </g>
      ))}
    </g>
  );
}
function Leaves({ k }: { k: number }) {
  const c = ['#d9822f', '#c4502f', '#e2b13c', '#b5651d'];
  return (
    <g>
      {[[-12, 2, -30], [-2, -6, 40], [9, 3, 100], [15, -5, 160]].map(([x, y, r], i) => (
        <g transform={`translate(${x} ${y}) rotate(${r + k * 23})`}>
          <path d="M0 -5 C3.6 -3.6 3.6 2.6 0 5 C-3.6 2.6 -3.6 -3.6 0 -5 Z" fill={c[(i + k) % 4]} stroke="#7a3a1e" stroke-width={.6} />
          <path d="M0 -4 V5.6" stroke="#7a3a1e" stroke-width={.5} />
        </g>
      ))}
    </g>
  );
}
function Mushrooms() {
  return (
    <g>
      <ellipse cx={2} cy={5} rx={12} ry={2.6} fill="rgba(0,0,0,0.12)" />
      {[[-5, 0, 1], [6, 2, .78]].map(([x, y, s]) => (
        <g transform={`translate(${x} ${y}) scale(${s})`}>
          <path d="M-2.6 4 Q-3.2 -2 -2 -4 H2 Q3.2 -2 2.6 4 Z" fill="#f2e8d0" stroke={INK} stroke-width={1.1} stroke-linejoin="round" />
          <path d="M-8 -3.4 Q-7.6 -11 0 -11.4 Q7.6 -11 8 -3.4 Q0 -1.6 -8 -3.4 Z" fill="#9a5a2c" stroke={INK} stroke-width={1.2} stroke-linejoin="round" />
          <path d="M-4.6 -8 q2 -1.6 4 -1.6" stroke="#c48a55" stroke-width={1.1} fill="none" stroke-linecap="round" />
        </g>
      ))}
    </g>
  );
}
function Molehill() {
  return (
    <g>
      <path d="M-14 5 Q-11 -8 0 -9 Q11 -8 14 5 Z" fill="#7a5638" stroke={INK} stroke-width={1.4} stroke-linejoin="round" />
      <path d="M-7 -3 q2 -2 4 -1 M3 -5 q2 0 3 2 M-2 1 q2 -1 3 0" stroke="#9c744f" stroke-width={1.2} fill="none" stroke-linecap="round" />
      <circle cx={-17} cy={4} r={1.6} fill="#7a5638" /><circle cx={17} cy={3} r={1.3} fill="#7a5638" /><circle cx={12} cy={7} r={1.1} fill="#7a5638" />
    </g>
  );
}
function TallGrass({ k }: { k: number }) {
  return (
    <g class="m-sway" style={{ animationDelay: `${-k * 1.3}s` }}>
      {[[-9, -26, -6], [-5, -32, -2], [-1, -36, 1], [3, -30, 4], [7, -26, 8], [10, -20, 11]].map(([x, h, lean], i) => (
        <g>
          <path d={`M${x} 6 Q${x + lean * .3} ${h * .5} ${x + lean} ${h}`} stroke={i % 2 ? '#5f9a3a' : '#6fa845'} stroke-width={1.8} fill="none" stroke-linecap="round" />
          {i % 2 === 0 && <ellipse cx={x + lean} cy={h - 2} rx={1.3} ry={3.4} transform={`rotate(${lean * 2} ${x + lean} ${h - 2})`} fill="#c9b46a" stroke="#8f7c3a" stroke-width={.5} />}
        </g>
      ))}
    </g>
  );
}
function Stump() {
  return (
    <g>
      <ellipse cx={1} cy={6} rx={15} ry={3.4} fill="rgba(0,0,0,0.13)" />
      <path d="M-10 -4 V4 Q0 8 10 4 V-4 Z" fill="#8a5a33" stroke={INK} stroke-width={1.4} stroke-linejoin="round" />
      <path d="M-6 -2 V5 M-1 -1 V6.6 M5 -2 V5.6" stroke="#6b4426" stroke-width={.9} />
      <ellipse cx={0} cy={-4} rx={10} ry={3.6} fill="#d9b382" stroke={INK} stroke-width={1.4} />
      <ellipse cx={0} cy={-4} rx={6} ry={2} fill="none" stroke="#b58a5a" stroke-width={.7} />
      <ellipse cx={0} cy={-4} rx={2.6} ry={.9} fill="none" stroke="#b58a5a" stroke-width={.7} />
      <path d="M10 1 q5 -1 6 -5" stroke="#6aa843" stroke-width={1.6} fill="none" stroke-linecap="round" />
      <ellipse cx={16.4} cy={-5} rx={2.6} ry={1.6} fill="#7dbb4f" stroke="#4c7f2c" stroke-width={.6} />
    </g>
  );
}
function Clover() {
  const leaf = (x: number, y: number, r: number) => (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>{[0, 120, 240].map((a) => <circle cx={0} cy={-2.2} r={2.3} fill="#6aa843" stroke="#4c7f2c" stroke-width={.5} transform={`rotate(${a})`} />)}</g>
  );
  return (
    <g>
      {leaf(-10, 2, 10)}{leaf(-2, -4, 40)}{leaf(7, 3, -20)}{leaf(13, -4, 70)}{leaf(2, 6, 0)}
      {[[-6, -8], [10, -9]].map(([x, y]) => <g transform={`translate(${x} ${y})`}><path d="M0 0 V8" stroke={P.stem} stroke-width={1} />{[0, 60, 120, 180, 240, 300].map((a) => <ellipse cy={-1.6} rx={1} ry={1.8} fill="#f5d6e2" stroke="#c98aa3" stroke-width={.3} transform={`rotate(${a})`} />)}</g>)}
    </g>
  );
}
function HayBale() {
  return (
    <g>
      <ellipse cx={0} cy={9} rx={17} ry={3.6} fill="rgba(0,0,0,0.14)" />
      <path d="M-14 8 V-6 Q-14 -11 -6 -11 H8 Q14 -11 14 -6 V8 Z" fill="#e3bd5e" stroke={INK} stroke-width={1.4} stroke-linejoin="round" />
      <ellipse cx={-6} cy={-1.4} rx={8} ry={9.6} fill="#ecca72" stroke={INK} stroke-width={1.4} />
      <path d="M-6 -1.4 m-5 0 a5 6 0 1 0 5 -6 a3 3.6 0 1 0 -3 3.6" fill="none" stroke="#c49a3a" stroke-width={.9} />
      <path d="M3 -11 V8 M9 -11 V8" stroke="#a87c2c" stroke-width={1} />
      <path d="M-14 -3 l-3 -2 M-13 4 l-3 1 M14 2 l3 -1" stroke="#d2ac52" stroke-width={1} stroke-linecap="round" />
    </g>
  );
}
function Seedlings() {
  return (
    <g>
      <ellipse cx={0} cy={8} rx={16} ry={3.2} fill="rgba(0,0,0,0.13)" />
      <path d="M-13 -2 H13 L11 8 H-11 Z" fill="#c99b62" stroke={INK} stroke-width={1.4} stroke-linejoin="round" />
      <path d="M-12 2.4 H12" stroke="#9a6b40" stroke-width={.9} />
      {[-8, -2.6, 2.6, 8].map((x, i) => <g transform={`translate(${x} -2)`}><path d="M0 0 V-6" stroke={P.stem} stroke-width={1.2} /><path d={`M0 -5 q${i % 2 ? 4 : -4} -3 ${i % 2 ? 4 : -4} 1 q${i % 2 ? -3 : 3} 1 ${i % 2 ? -4 : 4} -1`} fill="#79b94c" stroke="#4c7f2c" stroke-width={.5} /></g>)}
    </g>
  );
}
function Snowman() {
  return (
    <g>
      <ellipse cx={1} cy={8} rx={14} ry={3} fill="rgba(60,90,110,0.16)" />
      <circle cx={0} cy={0} r={9} fill="#fbfdff" stroke="#6f8796" stroke-width={1.3} />
      <circle cx={0} cy={-13} r={6.4} fill="#fbfdff" stroke="#6f8796" stroke-width={1.3} />
      <path d="M-6.4 -9 Q0 -6.4 6.4 -9 L6 -7 Q0 -4.6 -6 -7 Z" fill="#c0473a" stroke={INK} stroke-width={.7} />
      <path d="M4 -8 l3 6 l2 -1 l-3 -5" fill="#c0473a" stroke={INK} stroke-width={.6} />
      <circle cx={-2.2} cy={-14.6} r={.9} fill={INK} /><circle cx={2.2} cy={-14.6} r={.9} fill={INK} />
      <path d="M0 -13 l5 1.2 l-5 1" fill="#f08a24" stroke="#c4661a" stroke-width={.5} />
      <circle cx={0} cy={-2} r={.9} fill={INK} /><circle cx={0} cy={2} r={.9} fill={INK} />
      <path d="M-8 -2 l-7 -5 M-13 -5.6 l-1.4 -2.6 M8 -2 l7 -4" stroke="#7a5638" stroke-width={1.2} stroke-linecap="round" />
      <path d="M-5 -18.6 H5 L4 -24 H-4 Z" fill="#5a4a3e" stroke={INK} stroke-width={.8} />
    </g>
  );
}
function SnowMound() {
  return (
    <g>
      <path d="M-15 6 Q-10 -6 0 -5 Q9 -7 15 6 Z" fill="#fbfdff" stroke="#b9cbd6" stroke-width={1.2} />
      <path d="M-4 -4 l-3 -9 M-5.6 -9 l-3 -2 M5 -5 l2 -8 M6 -9 l3 -2" stroke="#7a5638" stroke-width={1.1} stroke-linecap="round" />
    </g>
  );
}

/** The one plot that gets the season's prop (a crate of seedlings, a hay bale, a snowman). */
export function propPlot(cands: [number, number][]): string | null {
  let best: string | null = null, bv = 2;
  for (const [x, y] of cands) { const v = hash2(x, y, 11); if (v < bv) { bv = v; best = `${x},${y}`; } }
  return best;
}

/** What grows on a free plot: a hash picks the kind, the season picks how it looks. */
export function MeadowDecor({ x, y, season, prop }: { x: number; y: number; season: Season; prop?: boolean }) {
  const r = hash2(x, y), r2 = hash2(y + 7, x + 3), k = Math.floor(hash2(x, y, 5) * 4);
  const [sx, sy] = SPOTS[Math.floor(r2 * 4) % 4];
  const winter = season === 3;
  const tuftC = winter ? '#b9cbd6' : P.grassDark;
  const tufts = [[18, 30], [64, 22], [40, 72], [80, 76], [22, 84], [86, 44]] as const;
  let el: JSX.Element | null = null;
  if (prop) el = winter ? <Snowman /> : season === 0 ? <Seedlings /> : <HayBale />;
  else if (winter) {
    if (r < .3) el = <SnowMound />;
    else if (r < .38) el = <Stump />;
  } else if (r < .14) el = <Bush berry={season === 1 || season === 2} />;
  else if (r < .24) el = <Stones />;
  else if (r < .46) el = season === 0 ? <Dandelions k={k} /> : season === 1 ? (k % 3 === 2 ? <Poppies /> : <Chamomile k={k} />) : <Leaves k={k} />;
  else if (r < .53) el = <Molehill />;
  else if (r < .64) el = season === 2 && k % 2 ? <Mushrooms /> : <TallGrass k={k} />;
  else if (r < .7) el = <Stump />;
  else if (r < .8) el = season === 2 ? <Mushrooms /> : <Clover />;
  return (
    <g class="meadow-decor" pointer-events="none">
      {tufts.map(([a, b], i) => ((i + k) % 3 === 0 ? null : <Tuft x={a + (r2 - .5) * 6} y={b} s={.8 + ((i * 7 + k) % 4) * .1} c={tuftC} />))}
      {!winter && !prop && r >= .8 && <g transform={`translate(${sx} ${sy})`}>{season === 0 ? <Dandelions k={k + 1} /> : season === 1 ? <Chamomile k={k} /> : <Leaves k={k + 2} />}</g>}
      {el && <g transform={`translate(${sx} ${sy})`}>{el}</g>}
    </g>
  );
}

/** The grass under everything: varied tufts, seed dots and a little engraver's hatching. */
/** 29.10 · each region's grass: the Kuban steppe yellower, the Altai cooler and deeper */
const REGION_GRASS: Record<string, [string, string, string]> = { kuban: ['#9fa956', '#7f8a40', '#6e7a2c'], altai: ['#76a05c', '#527a3f', '#3f7a3a'] };
export function GrassPattern({ winter, region = 'chernozem' }: { winter: boolean; region?: string }) {
  const tint = REGION_GRASS[region];
  const base = winter ? '#e8f1f6' : tint?.[0] ?? P.grass, dark = winter ? '#c9dbe6' : tint?.[1] ?? P.grassDark, hatch = winter ? '#9fb6c4' : tint?.[2] ?? '#4f8a30';
  return (
    <pattern id="grass-tex" width="120" height="120" patternUnits="userSpaceOnUse">
      <rect width="120" height="120" fill={base} />
      <path d="M10 14 l-2 -6 M10 14 l2 -6 M40 44 l-2 -6 M40 44 l2 -6 M48 12 l-2 -5 M86 26 l-2 -6 M86 26 l1 -7 M86 26 l3 -5 M22 92 l-2 -5 M22 92 l2 -6 M70 84 l-3 -5 M70 84 l1 -6 M104 70 l-2 -5 M104 70 l2 -5 M58 108 l-2 -6 M58 108 l2 -5" stroke={dark} stroke-width={2} stroke-linecap="round" opacity={0.5} />
      <path d="M96 100 l6 -6 M99 103 l6 -6 M102 106 l5 -5 M28 58 l5 -5 M31 61 l5 -5 M34 64 l4 -4 M70 46 l4 -4 M73 49 l4 -4" stroke={hatch} stroke-width={.9} stroke-linecap="round" opacity={0.28} />
      <g fill={dark} opacity={0.45}><circle cx="62" cy="64" r="1.1" /><circle cx="16" cy="40" r=".9" /><circle cx="110" cy="16" r="1" /><circle cx="40" cy="114" r=".9" /><circle cx="94" cy="56" r=".8" /></g>
      {!winter && <g fill="#fbf3ff" opacity={0.75}><circle cx="78" cy="102" r="1.3" /><circle cx="8" cy="66" r="1.1" /></g>}
    </pattern>
  );
}

/** The yard strip: a trodden path the farmer walks, a rain barrel by his spot and a couple of fence posts. */
/** Where the village road leaves the yard path, and where it meets the hill crest (fractions of the width);
 *  the sky draws the rest of it up to the village on the horizon (see SkyBand). 28.10 · the crest end stands where
 *  the village's own main road runs from hill F's crest down to its gate (tools/village: x 186-191 of 362) and is as
 *  wide as it there, so whatever stretch of the village shows over the field's crest, the two meet as one road. */
export const ROAD_AT = 0.56, ROAD_CREST = 188 / 362, ROAD_HALF = 0.039;

/** A cubic Bézier's point at t. */
function bez(p0: number[], c1: number[], c2: number[], p1: number[], t: number): [number, number] {
  const u = 1 - t;
  return [u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0],
    u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1]];
}
/** Grass creeping over a path's edge: three blades every few units along the given points (one path). */
function edgeTufts(pts: [number, number][], seed: number): string {
  let d = '';
  pts.forEach(([x, y], i) => {
    const h = 2.6 + hash2(i, seed) * 2.4;
    d += `M${(x - 1.4).toFixed(1)} ${(y + .6).toFixed(1)}l-.8 ${(-h * .75).toFixed(1)}M${x.toFixed(1)} ${(y + .6).toFixed(1)}l.3 ${(-h).toFixed(1)}M${(x + 1.5).toFixed(1)} ${(y + .6).toFixed(1)}l1 ${(-h * .7).toFixed(1)}`;
  });
  return d;
}
const piece = (season: Season, k: YardPiece) => YARD[season === 3 ? 'winter' : 'summer'][k];

/** The yard in the village's hybrid style (tools/village/yard.py draws the pieces): the trodden path the farmer
 *  walks, the road up to the village with its worn edges, the rain barrel, the fence, the gate, the crane well
 *  whose sweep dips, the hens, the sunflowers. 29.10 · on an expedition the yard is the camp of its region (a tent,
 *  a fire, a woodpile; poplars and melons on the Kuban, spruces and stones in the Altai, a haystack and a birch in
 *  Заречье), and at home what the carts brought back stands in the yard: a haystack from Заречье, a poplar and
 *  melons from the Kuban, a young cedar from the Altai. */
export type YardRegion = 'chernozem' | 'rent' | 'kuban' | 'altai';
export function YardDecor({ W, yard, season, region = 'chernozem', hauls = [] }: { W: number; yard: number; season: Season; region?: YardRegion; hauls?: YardRegion[] }) {
  const camp = region !== 'chernozem';
  const has = (r: YardRegion) => hauls.includes(r);
  // the camp's things grow a little on a wide field; the compost heap holds the yard's right end
  const k = Math.min(1.5, Math.max(1, W / 420)), yardEnd = W - 112;
  const winter = season === 3;
  const y = yard - 3;
  const top = yard - 66; // the crest of the field's hill, where the sky's land meets it
  const rx = W * ROAD_AT, cx = W * ROAD_CREST, hw = W * ROAD_HALF;
  const ink = winter ? '#33283a' : '#3a2a1f';
  const road = winter ? '#e1e3ef' : '#dfc794', worn = winter ? '#aab6da' : '#bfb27c', rut = winter ? '#a3a6c4' : '#b99d6b';
  const grass = winter ? '#aab6da' : '#5e7a3c';
  // the road's two edges and its outline
  const L: [number[], number[], number[], number[]] = [[rx - 20, y + 2], [rx - 16, y - 24], [cx - hw - 2, top + 22], [cx - hw, top - 2]];
  const R: [number[], number[], number[], number[]] = [[rx + 22, y + 2], [rx + 18, y - 24], [cx + hw + 2, top + 22], [cx + hw, top - 2]];
  const roadD = `M${L[0][0]} ${L[0][1]} C${L[1][0]} ${L[1][1]} ${L[2][0]} ${L[2][1]} ${L[3][0]} ${L[3][1]} H${R[3][0]} C${R[2][0]} ${R[2][1]} ${R[1][0]} ${R[1][1]} ${R[0][0]} ${R[0][1]} Z`;
  const path = `M14 ${y} Q${W * .3} ${y - 3} ${W * .55} ${y} T${W - 14} ${y}`;
  const along = (e: typeof L, n: number) => Array.from({ length: n }, (_, i) => bez(e[0], e[1], e[2], e[3], (i + .5) / n));
  const tufts = winter ? '' : edgeTufts([...along(L, 9), ...along(R, 9), ...Array.from({ length: Math.round(W / 18) }, (_, i) => [14 + (i + .5) * ((W - 28) / Math.round(W / 18)), y - 4.6 + (hash2(i, 41) - .5) * 1.4] as [number, number])], 7);
  const html = (k: YardPiece) => ({ dangerouslySetInnerHTML: { __html: piece(season, k) } });
  return (
    <g class="yard-decor" pointer-events="none">
      {/* the road to the village: off the yard path, up to the crest and on through the sky's hills — a worn halo,
          the fill, a broken ink edge half hidden, the ruts, grass over the verges */}
      <path d={roadD} fill="none" stroke={worn} stroke-width={5} stroke-opacity={winter ? .35 : .4} stroke-linejoin="round" />
      <path d={roadD} fill={road} />
      {!winter && <path d={roadD} fill="none" stroke={ink} stroke-width={1.2} stroke-dasharray="9 5 3 7 14 6" stroke-opacity={.45} stroke-linejoin="round" />}
      <path d={`M${rx - 7} ${y} C${rx - 6} ${y - 24} ${cx - hw * .45} ${top + 22} ${cx - hw * .4} ${top}`} stroke={rut} stroke-width={1.1} fill="none" stroke-linecap="round" />
      <path d={`M${rx + 9} ${y} C${rx + 9} ${y - 24} ${cx + hw * .45} ${top + 22} ${cx + hw * .4} ${top}`} stroke={rut} stroke-width={1.1} fill="none" stroke-linecap="round" />
      {/* the trodden path along the yard */}
      <path d={path} stroke={worn} stroke-width={13} stroke-linecap="round" fill="none" stroke-opacity={.3} />
      <path d={path} stroke={road} stroke-width={9} stroke-linecap="round" fill="none" stroke-opacity={winter ? .95 : .85} />
      <path d={path} stroke={rut} stroke-width={.9} stroke-dasharray="1 9" stroke-linecap="round" fill="none" stroke-opacity={.8} />
      {tufts && <path d={tufts} stroke={grass} stroke-width={.9} stroke-linecap="round" fill="none" stroke-opacity={.75} />}
      <g transform={`translate(18 ${y - 3})`} {...html('barrel')} />
      {camp ? <>
        {/* the camp: a woodpile, the tent, the fire; the region's own things up to the compost heap (it stands at the
            right, W − 108), a little larger on a wide expedition field */}
        <g transform={`translate(58 ${y - 1}) scale(${k})`} {...html('woodstack')} />
        <g transform={`translate(${W * .3} ${y}) scale(${k})`} {...html('tent')} />
        <g transform={`translate(${W * .43} ${y + 1}) scale(${k})`} class="yard-fire" {...html('fire')} />
        {region === 'kuban' && <>
          <g transform={`translate(${W * .63} ${y}) scale(${k})`} {...html('melons')} />
          <g transform={`translate(${yardEnd - 34 * k} ${y - 1}) scale(${Math.min(k, .95)})`} {...html('poplar')} />
          <g transform={`translate(${yardEnd - 12 * k} ${y}) scale(${Math.min(k, .95) * .9})`} {...html('poplar')} />
        </>}
        {region === 'altai' && <>
          <g transform={`translate(${W * .64} ${y}) scale(${k})`} {...html('stones')} />
          <g transform={`translate(${yardEnd - 60 * k} ${y - 1}) scale(${Math.min(k, 1.35)})`} {...html('spruce')} />
          <g transform={`translate(${yardEnd - 38 * k} ${y}) scale(${k})`} {...html('spruce_s')} />
          <g transform={`translate(${yardEnd - 14 * k} ${y - 1}) scale(${Math.min(k, 1.35)})`} {...html('spruce')} />
        </>}
        {region === 'rent' && <>
          <g transform={`translate(${W * .66} ${y}) scale(${k})`} {...html('haystack')} />
          <g transform={`translate(${yardEnd - 24 * k} ${y}) scale(${Math.min(k, 1.15)})`} {...html('birch')} />
        </>}
      </> : <>
        {/* the hauls the carts brought home stand at the back of the yard, smaller for the distance: a cedar and a
            poplar behind the well, a haystack past the gate, melons by the fence */}
        {has('altai') && <g transform={`translate(${W * .2} ${y - 16}) scale(.7)`} {...html('spruce_s')} />}
        {has('kuban') && <g transform={`translate(${W * .27} ${y - 18}) scale(.72)`} {...html('poplar')} />}
        <g transform={`translate(88 ${y - 2})`}>
          <g {...html('fence')} />
          {season === 0 && <g transform="translate(34 -2) scale(.7)"><Dandelions k={1} /></g>}
        </g>
        {has('kuban') && <g transform={`translate(44 ${y}) scale(.8)`} {...html('melons')} />}
        <g transform={`translate(${rx} ${y - 1})`} {...html('gate')} />
        <g transform={`translate(${W * .33} ${y + 1})`}>
          <g {...html('well')} />
          <g class="well-sweep" {...html('sweep')} />
        </g>
        {!winter && [0, 1].map((k) => (
          <g transform={`translate(${W * (k ? .43 : .395)} ${y + (k ? 2 : -1)})${k ? ' scale(-1 1)' : ''}`}>
            <g class={`yard-hen h${k}`}><g {...html('legs')} /><g class="hen-body" {...html(k ? 'hen1' : 'hen0')} /></g>
          </g>
        ))}
        {has('rent') && <g transform={`translate(${W * .655} ${y - 6}) scale(.8)`} {...html('haystack')} />}
      </>}
      {/* tall pieces keep their tops under the crest (yard − 66): over it they would cover the forecast */}
      {!camp && season < 2 && [0, 1, 2].map((i) => (
        <g transform={`translate(${W * (.73 + i * .035)} ${y - 2})`}>
          <g class="yard-sunflower" style={{ ['--sd' as string]: `${-hash2(i, 5) * 3}s` }} {...html(i % 2 ? 'sun32' : 'sun26')} />
        </g>
      ))}
      {season === 2 && <g transform={`translate(${W * .76} ${y - 4}) scale(.8)`}><Leaves k={3} /></g>}
    </g>
  );
}

/** Tufts and a few flowers along the edges of the board, between the beds and the frame. */
export function EdgeDecor({ W, H, yard, season }: { W: number; H: number; yard: number; season: Season }) {
  const winter = season === 3;
  const c = winter ? '#b9cbd6' : P.grassDark;
  const items: JSX.Element[] = [];
  const n = Math.max(3, Math.round(W / 70));
  for (let i = 0; i < n; i++) {
    const x = 26 + (i + .5) * ((W - 52) / n) + (hash2(i, 3) - .5) * 20;
    items.push(<Tuft x={x} y={H - 6} s={.7} c={c} />);
    if (!winter && hash2(i, 9) < .35) items.push(<g transform={`translate(${x + 9} ${H - 9}) scale(.5)`}>{season === 2 ? <Leaves k={i} /> : <g>{[0, 72, 144, 216, 288].map((a) => <ellipse rx={2.2} ry={3.6} cy={-3.6} fill={i % 2 ? P.flowerWhite : P.flowerPink} transform={`rotate(${a})`} />)}<circle r={1.8} fill={P.flowerYellow} /></g>}</g>);
  }
  const m = Math.max(2, Math.round((H - yard) / 90));
  for (let i = 0; i < m; i++) {
    const y = yard + 30 + (i + .5) * ((H - yard - 50) / m);
    items.push(<Tuft x={9} y={y + (hash2(i, 4) - .5) * 20} s={.65} c={c} />);
    items.push(<Tuft x={W - 9} y={y + (hash2(i, 6) - .5) * 20} s={.65} c={c} />);
  }
  return <g class="edge-decor" pointer-events="none">{items}</g>;
}
