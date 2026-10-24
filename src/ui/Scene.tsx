import type {SceneCue} from './useSceneQueue';
import type { ComponentChildren } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';
import {THEFT_ARRIVAL_MS, THEFT_IMPACT_MS, theftStagger, theftDelay} from './weekPlayback';
import { FarmLife } from './FarmLife';
import { MorningLayer, MorningStep, morningPlantClass, morningCellDelay } from './Morning';
import { BedLeftovers } from '../art/collisions';
import { kidDelay, type MissCause } from './collisions';
import { wetCanals, idx } from '../engine/game';
// The field: beds, terrain, plants, marks, lenses and the farmer. Pure drawing — every decision comes in as props.
import {CompostHeap} from '../art/compost';
import {NibbledPlant} from '../art/pestDamage';
import type {PestHit} from '../engine/game';
import { Locusts } from '../art/locusts';
import { Beetles } from '../art/beetles';
import { MeadowDecor, GrassPattern, YardDecor, EdgeDecor, propPlot, type Season } from '../art/meadow';
import { CROPS, GRID } from '../engine/data';
import type { CropId, PetId } from '../engine/data';
import {
  GameState, Tile, canBuyLand, landPrice, tile, ripenIn, growNote, strikeVictims, isGuarded, frostVictims, soilTemp, airTemp, cropMinT, canClear,
  underScarecrow, targetGrow, thievesBlocked,
} from '../engine/game';
import type { StrikeKind } from '../engine/game';
import { icons } from '../art/icons';
import { Crow, CrowFlying, Scarecrow, Wither } from '../art/crows';
import { CropSprite, cropStage } from '../art/crops';
import { Farmer, FarmerAction } from '../art/farm';
import { Bed, DryBadge, EdgeArrow, Mark, SoilDelta, WeeksBadge } from '../art/beds';
import { KidsPeek } from '../art/people';
import { ScoutingKids } from '../art/scouts';
import { P } from '../art/palette';

export type Lens = 'water' | 'soil' | 'temp' | null;
export type Highlight = {
  tiles: Set<string>;
  selected: Set<string>;
  rows: boolean;
  area: Set<string>;
  areaKind?: 'water' | 'mulch' | 'fert' | 'warm' | 'soil';
  preview?: { cells: [number, number][]; why: (string | null)[]; crop?: CropId };
  anchor?: string;
  options?: boolean;
  soil?: Map<string, { from: number; to: number }>;
  gain?: Map<string, number>;
  block?: [number, number];
  corners?: [number, number][];
  minT?: number; // a seed card is picked: the temperature lens compares with it
};
export type Flock = 'on' | 'leave' | 'off';
export interface QueueMark { n: number; state: 'queued' | 'working' | 'done' }
// side: which edge of the bed the farmer stands at — the left one facing right (1), or the right one facing left (-1)
export type FarmerPos = { kind: 'home' } | { kind: 'barn' } | { kind: 'tile'; x: number; y: number; side?: 1 | -1 };
export interface FarmerState { pos: FarmerPos; walking: boolean; action: FarmerAction; facing: 1 | -1; ms: number; bubble: string | null; cycle?: number }
export interface Floater { key: number; x: number; y: number; text: string; crop?: CropId; delay?: number; tone?: 'bad' }
export type FxKind = 'seed' | 'water' | 'fert' | 'mulch' | 'care' | 'harvest' | 'build' | 'weed' | 'coin' | 'wither' | 'shield';
export interface TileFx { key: number; x: number; y: number; kind: FxKind; delay?: number }

export const CELL = 100;
export const PAD = 22;
export const YARD = 64;

export interface Camera { vx: number; vy: number; span: number; W: number; H: number; yard: number }
export function camera(s: GameState, yard = YARD): Camera {
  let x0 = GRID, y0 = GRID, x1 = 0, y1 = 0;
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (tile(s, x, y).owned) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1); x1 = Math.min(GRID - 1, x1 + 1); y1 = Math.min(GRID - 1, y1 + 1);
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (tile(s, x, y).terrain !== 'plain' && tile(s, x, y).terrain !== 'forest') { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const span = Math.max(x1 - x0, y1 - y0) + 1;
  const cx = (x0 + x1 + 1) / 2, cy = (y0 + y1 + 1) / 2;
  const vx = Math.max(0, Math.min(GRID - span, cx - span / 2));
  const vy = Math.max(0, Math.min(GRID - span, cy - span / 2));
  return { vx, vy, span, W: span * CELL + PAD * 2, H: yard + span * CELL + PAD * 2, yard };
}
export function farmerXY(cam: Camera, pos: FarmerPos): [number, number] {
  if (pos.kind === 'home') return [54, Math.max(76, cam.yard - 4)];
  if (pos.kind === 'barn') return [cam.W - 70, Math.max(76, cam.yard - 4)];
  // he stands on the bed's edge at mid depth, so what he pours, sows or hoes lands on the bed itself
  return [PAD + (pos.x - cam.vx) * CELL + (pos.side === -1 ? 78 : 22), cam.yard + PAD + (pos.y - cam.vy) * CELL + 70];
}
function hashXY(x: number, y: number) {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function Greenhouse() {
  return (
    <g>
      <path d="M8 90 V44 Q50 -4 92 44 V90" fill={P.glass} stroke="#5b7f93" stroke-width={2.4} />
      <path d="M50 20 V90 M8 60 H92 M26 30 V90 M74 30 V90" stroke="#7aa0b4" stroke-width={1.6} fill="none" />
      <path d="M20 46 Q30 34 40 30" stroke="#fff" stroke-width={3} opacity={0.6} fill="none" stroke-linecap="round" />
    </g>
  );
}

function Hive() {
  return (
    <g transform="translate(26 26)">
      <path d="M2 22 h44 l-3 -12 h-38z" fill={P.woodDark} stroke={P.ink} stroke-width={2.2} />
      <rect x={2} y={22} width={44} height={14} fill={P.woodLight} stroke={P.ink} stroke-width={2.2} />
      <rect x={2} y={36} width={44} height={14} fill={P.wood} stroke={P.ink} stroke-width={2.2} />
      <rect x={2} y={50} width={44} height={12} fill={P.woodLight} stroke={P.ink} stroke-width={2.2} />
      <rect x={18} y={54} width={12} height={4} rx={1.5} fill={P.ink} />
      {[[52, 8], [-6, 18], [58, 34]].map(([x, y], i) => (
        <g transform={`translate(${x} ${y})`}>
          <g class={`bee b${i}`}>
            <ellipse rx={4.5} ry={3.4} fill={P.flowerYellow} stroke={P.ink} stroke-width={1.2} />
            <path d="M-1 -3 v6 M2 -3 v6" stroke={P.ink} stroke-width={1.2} />
          </g>
        </g>
      ))}
    </g>
  );
}

function Meadow({ x, y, buyable, price, signOnly, season = 0, prop }: { x: number; y: number; buyable: boolean; price: number; signOnly?: boolean; season?: Season; prop?: boolean }) {
  if (signOnly)
    return (
      <g class="sale-sign" data-price={price}>
        <rect x={8} y={8} width={84} height={84} rx={12} fill="none" stroke="#fff6c4" stroke-width={2.5} stroke-dasharray="7 8" opacity={0.7} />
        <g transform="translate(50 50)">
          <circle r={11} fill="rgba(255,250,232,0.85)" stroke={P.woodDark} stroke-width={1.6} />
          <path d="M-5 0 H5 M0 -5 V5" stroke={P.woodDark} stroke-width={2.4} stroke-linecap="round" />
        </g>
      </g>
    );
  return (
    <g>
      <rect x={2} y={2} width={96} height={96} rx={10} fill={season === 3 ? '#eef4f8' : buyable ? '#86c25a' : P.grass} opacity={0.9} />
      <MeadowDecor x={x} y={y} season={season} prop={prop} />
      {buyable && (
        <g class="sale-sign">
          <rect x={8} y={8} width={84} height={84} rx={12} fill="none" stroke="#fff6c4" stroke-width={2.5} stroke-dasharray="7 8" opacity={0.7} />
          <g transform="translate(50 50)">
            <circle r={11} fill="rgba(255,250,232,0.85)" stroke={P.woodDark} stroke-width={1.6} />
            <path d="M-5 0 H5 M0 -5 V5" stroke={P.woodDark} stroke-width={2.4} stroke-linecap="round" />
          </g>
        </g>
      )}
    </g>
  );
}

function hashN(x: number, y: number, k: number) {
  return hashXY(x * 7 + k, y * 13 + k * 3);
}

function riverPath(s: GameState, x: number, y: number) {
  const isW = (a: number, b: number) => (a < 0 || b < 0 || a >= GRID || b >= GRID ? false : tile(s, a, b).terrain === 'river');
  const n = isW(x, y - 1), so = isW(x, y + 1), w = isW(x - 1, y), e = isW(x + 1, y);
  const r = 26;
  // water body with rounded corners only where the river does not continue
  const tl = !n && !w ? r : 0, tr = !n && !e ? r : 0, br = !so && !e ? r : 0, bl = !so && !w ? r : 0;
  const x0 = w ? -2 : 8, x1 = e ? 102 : 92, y0 = n ? -2 : 8, y1 = so ? 102 : 92;
  return `M${x0 + tl} ${y0} H${x1 - tr} Q${x1} ${y0} ${x1} ${y0 + tr} V${y1 - br} Q${x1} ${y1} ${x1 - br} ${y1} H${x0 + bl} Q${x0} ${y1} ${x0} ${y1 - bl} V${y0 + tl} Q${x0} ${y0} ${x0 + tl} ${y0}z`;
}

// all river cells in three passes so neighbouring cells merge into one stream without seams
function RiverLayer({ s, cam }: { s: GameState; cam: Camera }) {
  const cells: [number, number][] = [];
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      if (tile(s, x, y).terrain !== 'river') continue;
      if (x < cam.vx - 0.01 || x >= cam.vx + cam.span || y < cam.vy - 0.01 || y >= cam.vy + cam.span) continue;
      cells.push([x, y]);
    }
  const at = (x: number, y: number) => `translate(${PAD + x * CELL} ${PAD + y * CELL})`;
  return (
    <g class="river" pointer-events="none">
      {cells.map(([x, y]) => <rect transform={at(x, y)} x={0} y={0} width={100} height={100} fill={P.grass} />)}
      {cells.map(([x, y]) => <path transform={at(x, y)} d={riverPath(s, x, y)} fill="#2c6f94" stroke="#2c6f94" stroke-width={6} stroke-linejoin="round" />)}
      {cells.map(([x, y]) => <path transform={at(x, y)} d={riverPath(s, x, y)} fill="#4f9fcf" />)}
      {cells.map(([x, y]) => (
        <g transform={at(x, y)} class="waves" stroke="#d6f1ff" stroke-width={3} stroke-linecap="round" fill="none" opacity={0.85}>
          <path d={`M${22 + hashN(x, y, 1) * 20} 34 q8 -6 16 0 t16 0`} />
          <path d={`M${30 + hashN(x, y, 2) * 18} 62 q8 -6 16 0 t16 0`} />
        </g>
      ))}
    </g>
  );
}

function Forest({ x, y }: { x: number; y: number }) {
  const r = hashN(x, y, 4);
  return (
    <g>
      <rect x={0} y={0} width={100} height={100} fill="#6aa843" />
      {[[26, 70, 1], [70, 62, 0.9], [48, 38, 1.1]].map(([cx, cy, k], i) => (
        <g transform={`translate(${cx + (r - 0.5) * 10} ${cy}) scale(${k})`}>
          <ellipse cx={0} cy={18} rx={16} ry={5} fill="rgba(0,0,0,0.18)" />
          <rect x={-3} y={4} width={6} height={14} fill={P.woodDark} stroke={P.ink} stroke-width={1.6} />
          {(i + Math.floor(r * 3)) % 2 ? (
            <path d="M0 -30 L18 8 H-18z" fill="#3e7a2a" stroke={P.ink} stroke-width={2} stroke-linejoin="round" />
          ) : (
            <circle cx={0} cy={-8} r={17} fill="#4f9a34" stroke={P.ink} stroke-width={2} />
          )}
        </g>
      ))}
    </g>
  );
}

function Rocks({ x, y, owned }: { x: number; y: number; owned: boolean }) {
  const r = hashN(x, y, 5);
  return (
    <g>
      <ellipse cx={50} cy={74} rx={34} ry={8} fill="rgba(0,0,0,0.15)" />
      <path d={`M${20 + r * 6} 72 Q18 50 36 44 Q52 40 56 58 Q60 74 40 76z`} fill={P.stone} stroke={P.ink} stroke-width={2.2} />
      <path d="M50 74 Q50 48 70 46 Q86 48 84 66 Q82 78 60 78z" fill="#b9b4ab" stroke={P.ink} stroke-width={2.2} />
      <path d="M30 52 q6 -4 12 -2 M62 54 q6 -4 12 -1" stroke="#fff" stroke-width={2} opacity={0.5} fill="none" stroke-linecap="round" />
      {owned && (
        <g transform="translate(80 82)">
          <circle r={11} fill="#fffaf0" stroke={P.ink} stroke-width={1.8} />
          <path d="M-6 6 L6 -6 M1 -8 Q8 -9 8 -2" stroke={P.ink} stroke-width={2.2} fill="none" stroke-linecap="round" />
        </g>
      )}
    </g>
  );
}

function Swamp({ x, y, owned }: { x: number; y: number; owned: boolean }) {
  const r = hashN(x, y, 6);
  return (
    <g>
      {!owned && <rect x={0} y={0} width={100} height={100} fill="#79a85a" />}
      <ellipse cx={46 + r * 8} cy={56} rx={30} ry={18} fill="#5f8f86" stroke="#3c615b" stroke-width={2.2} />
      <ellipse cx={40 + r * 8} cy={52} rx={12} ry={4} fill="#9cc6be" opacity={0.7} />
      {[[18, 40], [74, 34], [80, 70], [22, 76]].map(([a, b]) => (
        <g transform={`translate(${a} ${b})`} stroke={P.leafDark} stroke-width={2.2} stroke-linecap="round" fill="none">
          <path d="M0 0 l-3 -16 M0 0 l1 -20 M0 0 l5 -14" />
          <ellipse cx={1} cy={-20} rx={2.4} ry={5} fill="#7a4e2a" stroke="none" />
        </g>
      ))}
    </g>
  );
}

function SandDunes({ x, y }: { x: number; y: number }) {
  const r = hashN(x, y, 7);
  return (
    <g>
      <rect x={2} y={2} width={96} height={96} rx={10} fill="#e9d29a" />
      <path d={`M10 ${60 + r * 10} Q30 ${46 + r * 6} 52 60 T92 ${56 + r * 8}`} stroke="#cfb175" stroke-width={3} fill="none" />
      <path d="M16 32 Q30 24 44 32 M58 28 Q70 22 82 28" stroke="#cfb175" stroke-width={2.5} fill="none" />
      {r > 0.5 && <path d="M70 76 v-12 M70 70 h-5 v-6 M70 68 h5 v-8" stroke="#6a9a3a" stroke-width={3} stroke-linecap="round" fill="none" />}
    </g>
  );
}

function Weeds({ x, y }: { x: number; y: number }) {
  const r = hashN(x, y, 8);
  return (
    <g class="weeds" pointer-events="none">
      {[[24, 40], [58, 34], [40, 70], [74, 66], [20, 78]].map(([a, b], i) => (
        <g transform={`translate(${a + (r - 0.5) * 8} ${b})`}>
          <path d="M0 0 C-8 -6 -10 -14 -8 -18 C-4 -12 -1 -8 0 0 C2 -10 6 -16 10 -18 C10 -10 6 -4 0 0z" fill={i % 2 ? '#6aa843' : '#86c94e'} stroke={P.ink} stroke-width={1.4} />
          {i === 2 && <circle cx={0} cy={-20} r={3.4} fill={P.flowerYellow} stroke={P.ink} stroke-width={1} />}
        </g>
      ))}
    </g>
  );
}

export function TileEffect({ kind }: { kind: FxKind }) {
  // Natural, small and quick: seed, granules, straw and soil fall and settle; nothing pops or sparkles.
  const d = (v: number) => ({ ['--d' as string]: `${v}s` });
  switch (kind) {
    case 'water':
      return (
        <g>
          {[[30, 0], [52, 0.08], [70, 0.16], [40, 0.24], [62, 0.32]].map(([x, d]) => (
            <path class="fx-drop" style={{ animationDelay: `${d}s` }} d={`M${x} 6 C${x + 3} 11 ${x + 5} 14 ${x + 5} 17 a5 5 0 0 1 -10 0 C${x - 5} 14 ${x - 3} 11 ${x} 6z`} fill={P.water} stroke={P.waterDark} stroke-width={1.2} />
          ))}
          <ellipse class="fx-ring" cx={50} cy={64} rx={26} ry={10} fill="none" stroke="#bfe6fa" stroke-width={3} />
        </g>
      );
    case 'seed':
      return (
        <g>
          {[[32, 58, 0], [44, 64, .06], [56, 56, .12], [66, 66, .18], [50, 72, .24]].map(([x, y, t]) => (
            <g>
              <ellipse class="fx-puff" style={d(t + .34)} cx={x} cy={y + 1} rx={5} ry={1.6} fill="#c9a87a" />
              <g class="fx-fall" style={d(t)}><ellipse cx={x} cy={y} rx={1.6} ry={2.2} fill="#d6ad72" stroke="#5a3a24" stroke-width={.6} /></g>
            </g>
          ))}
        </g>
      );
    case 'fert':
      return (
        <g>
          <ellipse class="fx-glow" style={d(.35)} cx={50} cy={58} rx={34} ry={22} fill="rgba(170,215,110,.28)" />
          {Array.from({ length: 12 }, (_, i) => {
            const x = 24 + ((i * 37) % 52), y = 40 + ((i * 23) % 36);
            return <g class="fx-fall short" style={d((i % 6) * .04)}><circle cx={x} cy={y} r={1.2} fill="#f3ecda" stroke="#a89880" stroke-width={.5} /></g>;
          })}
        </g>
      );
    case 'mulch':
      return (
        <g>
          {Array.from({ length: 9 }, (_, i) => {
            const x = 22 + ((i * 41) % 56), y = 40 + ((i * 29) % 40), r = (i * 47) % 180;
            return <g class="fx-fall straw" style={d((i % 5) * .05)}><path d={`M${x - 5} ${y} L${x + 5} ${y}`} transform={`rotate(${r - 90} ${x} ${y})`} stroke={i % 2 ? '#c9a55a' : '#b8924a'} stroke-width={1.6} stroke-linecap="round" /></g>;
          })}
        </g>
      );
    case 'care':
      return (
        <g>
          <ellipse class="fx-glow" style={d(.1)} cx={50} cy={60} rx={30} ry={18} fill="rgba(255,240,200,.25)" />
          {[[30, 70, -4], [40, 76, 3], [62, 74, -3], [70, 66, 4], [48, 80, 2], [56, 68, -2]].map(([x, y, dx], i) => (
            <g class="fx-hop" style={{ ...d(i * .05), ['--dx' as string]: `${dx}px` }}><circle cx={x} cy={y} r={1.4} fill="#7a5638" /></g>
          ))}
        </g>
      );
    case 'weed':
      return (
        <g>
          {[[34, -1], [50, .2], [66, 1]].map(([x, dir], i) => (
            <g class="fx-pull" style={{ ...d(i * .07), ['--dx' as string]: `${dir * 22}px`, ['--rot' as string]: `${dir * 50}deg` }}>
              <path d={`M${x} 62 v6 M${x - 2} 66 l-2 5 M${x + 2} 66 l2 4`} stroke="#8a6a4a" stroke-width={.9} stroke-linecap="round" />
              <path d={`M${x} 62 C${x - 7} 56 ${x - 9} 49 ${x - 7} 45 C${x - 3} 50 ${x - 1} 54 ${x} 62 Z M${x} 62 C${x + 6} 57 ${x + 8} 51 ${x + 6} 47 C${x + 3} 52 ${x + 1} 56 ${x} 62 Z`} fill="#7aa84a" stroke={P.ink} stroke-width={.9} />
              <circle cx={x} cy={64} r={2.4} fill="#7a5638" />
            </g>
          ))}
        </g>
      );
    case 'harvest':
      return (
        <g>
          {[[40, 46, -1], [58, 42, 1], [50, 36, .3]].map(([x, y, dir], i) => (
            <g class="fx-leaf" style={{ ...d(i * .06), ['--dx' as string]: `${dir * 14}px` }}><path d={`M${x} ${y} q3 -4 7 -2 q-3 4 -7 2 Z`} fill="#86b452" stroke={P.ink} stroke-width={.6} /></g>
          ))}
          <ellipse class="fx-puff" style={d(.05)} cx={50} cy={74} rx={16} ry={3.6} fill="#c9a87a" />
        </g>
      );
    case 'coin':
      return (
        <g class="fx-coinrise"><ellipse cx={50} cy={46} rx={5.4} ry={5.4} fill={P.gold} stroke={P.ink} stroke-width={1.2} /><path d="M48.6 43.4 v5.2 M51.4 43.4 v5.2" stroke={P.goldDark} stroke-width={.9} /></g>
      );
    case 'wither':
      return <g><Wither />{[[44, 58], [58, 54], [52, 62]].map(([x, y], i) => <g class="fx-fall dry" style={d(.1 + i * .12)}><path d={`M${x} ${y} q3 -3 6 -1 q-3 3 -6 1 Z`} fill="#b49a58" stroke="#7a6034" stroke-width={.5} /></g>)}</g>;
    case 'shield':
      return (
        <g class="fx-dome"><path d="M10 88 Q10 22 50 18 Q90 22 90 88" fill="rgba(220,240,255,.18)" stroke="#e8f6ff" stroke-width={2.2} /><path d="M24 80 Q26 36 50 30" fill="none" stroke="#ffffff" stroke-width={1.4} opacity={.6} /></g>
      );
    case 'build':
    default:
      return (
        <g>
          {[[28, 80, 0], [46, 84, .06], [64, 80, .12], [76, 84, .18]].map(([x, y, t]) => <ellipse class="fx-cloud" style={d(t)} cx={x} cy={y} rx={9} ry={5} fill="#e9dcc0" />)}
          {[[40, 70, -1], [58, 72, 1], [50, 66, .4]].map(([x, y, dir], i) => (
            <g class="fx-hop chip" style={{ ...d(i * .05), ['--dx' as string]: `${dir * 10}px` }}><path d={`M${x - 2} ${y} l4 -1 l-.6 2 Z`} fill="#c99b62" stroke={P.ink} stroke-width={.5} /></g>
          ))}
        </g>
      );
  }
}

// where the birds of a flock stand: two on beds, one on the edge — chosen by the week, not by the flock's targets
function flockSpots(s: GameState, cam: Camera): [number, number, number][] {
  const beds: [number, number, number][] = [];
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      const t = tile(s, x, y);
      if (!t.owned || t.structure || x < cam.vx - 0.01 || y < cam.vy - 0.01 || x >= cam.vx + cam.span || y >= cam.vy + cam.span) continue;
      beds.push([x, y, hashXY(x + s.absWeek * 3, y + s.absWeek) + (t.crop ? 0 : 1)]);
    }
  beds.sort((a, b) => a[2] - b[2]);
  // on the upper edge of a bed (the boundary between beds): the counters in the corners stay visible
  const out: [number, number, number][] = beds.slice(0, 2).map(([x, y], i) => [PAD + x * CELL + 32 + hashXY(x, y + i) * 8, PAD + y * CELL + 13, i]);
  // the third keeps to the edge of the field
  out.push([PAD + (cam.vx + cam.span) * CELL - 34, PAD + cam.vy * CELL + 6, 2]);
  return out;
}


function CanalCell({ s, x, y }: { s: GameState; x: number; y: number }) {
  const w = (a: number, b: number) => a >= 0 && b >= 0 && a < GRID && b < GRID && (tile(s, a, b).canal || tile(s, a, b).terrain === 'river');
  const n = w(x, y - 1), so = w(x, y + 1), we = w(x - 1, y), e = w(x + 1, y);
  // the ditch runs from the middle to every joined side; alone it is a small round pond
  // butt ends exactly at the tile edge, a round middle: neighbours join without drawing over each other
  const arms = [n && 'M50 50 V-0.5', so && 'M50 50 V100.5', we && 'M50 50 H-0.5', e && 'M50 50 H100.5'].filter(Boolean).join(' ');
  const layer = (w: number, c: string, dy = 0) => <g transform={dy ? `translate(0 ${dy})` : undefined}>{arms && <path d={arms} stroke={c} stroke-width={w} fill="none" />}<circle cx={50} cy={50} r={w / 2} fill={c} /></g>;
  return (
    <g pointer-events="none" class="canal-ditch">
      {layer(46, 'rgba(40,26,12,.18)', 2.5)}
      {layer(44, '#9a7046')}
      {layer(38, '#b88a58')}
      {layer(30, '#6f4f2e')}
      {layer(26, '#3f86b8')}
      {layer(18, '#5aa6d6')}
      <path d="M40 50 q5 -3 10 0 t10 0" stroke="#d6f1ff" stroke-width={2.2} fill="none" stroke-linecap="round" class="waves" />
      <g fill="#7fa64e" stroke="#4f6b2c" stroke-width={0.8}>
        {!n && <path d="M38 24 l2 -6 l2 6 M56 25 l2 -5 l2 5" />}
        {!so && <path d="M42 80 l2 -6 l2 6 M58 79 l2 -5 l2 5" />}
      </g>
    </g>
  );
}
// №16 · Капельная линия: a black-green hose along the bed's foot, held by wire clips, with emitter
// buttons every quarter. It keeps the water a bed has; no water is drawn running from it. Under it the soil
// is only darker while the bed actually holds water.
function DripHose({ wet, l, r }: { wet: boolean; l: boolean; r: boolean }) {
  const x0 = l ? 0 : 8, x1 = r ? 100 : 92;
  return (
    <g pointer-events="none" class="drip-hose">
      {wet && <path d={`M${x0 + 2} 88 H${x1 - 2}`} stroke="rgba(52,34,20,.22)" stroke-width={9} stroke-linecap="round" />}
      <path d={`M${x0} 87.5 Q25 89.5 50 87.5 T${x1} 87.5`} fill="none" stroke="#1f2f22" stroke-width={6.4} stroke-linecap="round" />
      <path d={`M${x0} 86.6 Q25 88.6 50 86.6 T${x1} 86.6`} fill="none" stroke="#4e6b45" stroke-width={3} stroke-linecap="round" />
      <path d={`M${x0 + 2} 85.7 Q25 87.7 50 85.7`} fill="none" stroke="#9fbb86" stroke-width={0.9} opacity={0.8} stroke-linecap="round" />
      {[17, 42, 67, 88].filter((e) => e > x0 + 3 && e < x1 - 3).map((e) => (
        <g transform={`translate(${e} 87.6)`}><ellipse rx={3.3} ry={2.5} fill="#d9b04a" stroke="#1f2f22" stroke-width={1.1} /><circle r={0.8} fill="#1f2f22" /></g>
      ))}
      {[30, 80].filter((c) => c > x0 && c < x1).map((c) => (
        <path d={`M${c - 3} 92 Q${c} 81 ${c + 3} 92`} fill="none" stroke="#8a9096" stroke-width={1.4} stroke-linecap="round" />
      ))}
      {!l && <circle cx={x0} cy={87.5} r={2.6} fill="#1f2f22" />}
      {!r && <path d={`M${x1} 85 v5`} stroke="#1f2f22" stroke-width={3} stroke-linecap="round" />}
    </g>
  );
}
function SnowCover({ x, y, row }: { x: number; y: number; row: boolean }) {
  const r = hashXY(x + 3, y + 11);
  return (
    <g pointer-events="none" class="snow-cover">
      <path d={`M6 ${30 + r * 8} Q30 ${20 + r * 6} 50 ${28} T94 ${26 + r * 6} V90 Q50 96 6 90z`} fill="#f7fbff" opacity={0.92} />
      <path d={`M14 ${36 + r * 6} Q40 ${30} 70 ${36}`} stroke="#d4e6f2" stroke-width={3} fill="none" />
      {row && <path d="M8 22 H92 M14 14 V30 M50 14 V30 M86 14 V30" stroke={P.woodDark} stroke-width={3.4} stroke-linecap="round" />}
    </g>
  );
}
// Агроволокно: a low fabric tunnel on two wire hoops, pegged at the ground. Next to another sheltered
// bed the tunnel simply runs on, so a 2×2 cover reads as one piece of cloth. The plant shows through.
// Agrofibre over hoops. Neighbouring sheltered beds (left, right, above, below) share one sheet:
// each cell draws its own piece, and a side with a neighbour runs straight to the tile edge,
// so a 2×2 block reads as one low tunnel. Outer edges get a hem, pegs and a soft shadow.
interface ShelterNb { l: boolean; r: boolean; u: boolean; d: boolean; ul: boolean; ur: boolean; dl: boolean; dr: boolean }
function shelterPaths(n: ShelterNb) {
  const I = 3, R = 16, A = 0, B = 100, lo = I, hi = 100 - I;
  const fill: string[] = [], edge: string[] = [];
  let pen = false;
  const go = (x: number, y: number, draw: boolean) => {
    fill.push(`${fill.length ? 'L' : 'M'}${x} ${y}`);
    if (draw) { if (!pen) edge.push(`M${last[0]} ${last[1]}`); edge.push(`L${x} ${y}`); }
    pen = draw; last = [x, y];
  };
  const arc = (x: number, y: number) => {
    fill.push(`A${R} ${R} 0 0 1 ${x} ${y}`);
    if (!pen) edge.push(`M${last[0]} ${last[1]}`);
    edge.push(`A${R} ${R} 0 0 1 ${x} ${y}`); pen = true; last = [x, y];
  };
  let last: [number, number] = [0, 0];
  // start of the top side, after the top-left corner
  const tlStart: [number, number] = n.u && n.l ? (n.ul ? [A, A] : [lo, A]) : n.u ? [lo, A] : n.l ? [A, lo] : [lo + R, lo];
  last = tlStart; fill.push(`M${tlStart[0]} ${tlStart[1]}`);
  // top side → top-right corner
  if (n.u && n.r) { if (n.ur) go(B, A, false); else { go(hi, A, false); go(hi, lo, true); go(B, lo, true); } }
  else if (n.u) go(hi, A, false);
  else if (n.r) go(B, lo, !n.u);
  else { go(hi - R, lo, true); arc(hi, lo + R); }
  // right side → bottom-right corner
  if (n.r && n.d) { if (n.dr) go(B, B, false); else { go(B, hi, false); go(hi, hi, true); go(hi, B, true); } }
  else if (n.r) go(B, hi, false);
  else if (n.d) go(hi, B, true);
  else { go(hi, hi - R, true); arc(hi - R, hi); }
  // bottom side → bottom-left corner
  if (n.d && n.l) { if (n.dl) go(A, B, false); else { go(lo, B, false); go(lo, hi, true); go(A, hi, true); } }
  else if (n.d) go(lo, B, false);
  else if (n.l) go(A, hi, true);
  else { go(lo + R, hi, true); arc(lo, hi - R); }
  // left side → back to the start
  if (n.l && n.u) { if (n.ul) go(A, A, false); else { go(A, lo, false); go(lo, lo, true); go(lo, A, true); } }
  else if (n.l) go(A, lo, false);
  else if (n.u) go(lo, A, true);
  else { go(lo, lo + R, true); arc(lo + R, lo); }
  return { fill: fill.join(' ') + ' Z', edge: edge.join(' '), lo, hi };
}
function shelterNb(s: GameState, x: number, y: number): ShelterNb {
  const on = (a: number, b: number) => a >= 0 && b >= 0 && a < GRID && b < GRID && tile(s, a, b).owned && tile(s, a, b).shelter > 0 && tile(s, a, b).structure !== 'greenhouse';
  return { l: on(x - 1, y), r: on(x + 1, y), u: on(x, y - 1), d: on(x, y + 1), ul: on(x - 1, y - 1), ur: on(x + 1, y - 1), dl: on(x - 1, y + 1), dr: on(x + 1, y + 1) };
}
function ShelterDome({ n }: { n: ShelterNb }) {
  const { fill, edge, lo, hi } = shelterPaths(n);
  const y0 = n.u ? 0 : lo, y1 = n.d ? 100 : hi, x0 = n.l ? 0 : lo, x1 = n.r ? 100 : hi;
  const ribs = [...(n.l ? [0] : []), 34, 66];
  const pegs: [number, number][] = [];
  if (!n.d) { if (!n.l) pegs.push([lo + 5, hi]); pegs.push([50, hi]); if (!n.r) pegs.push([hi - 5, hi]); }
  if (!n.u) { if (!n.l) pegs.push([lo + 5, lo + 1]); if (!n.r) pegs.push([hi - 5, lo + 1]); }
  return (
    <g pointer-events="none" class="shelter-dome">
      {!n.d && <path d={`M${x0 + (n.l ? 0 : 10)} ${hi + 2.5} H${x1 - (n.r ? 0 : 10)}`} stroke="rgba(38,52,60,0.22)" stroke-width={5} stroke-linecap="round" />}
      <path d={fill} fill="rgba(240,248,251,0.16)" />
      {/* wire hoops: a dark wire with a light glint — they, not the cloth, say «covered» */}
      {ribs.map((x) => (
        <g>
          <path d={`M${x} ${y0} Q${x - 3} ${(y0 + y1) / 2} ${x} ${y1}`} fill="none" stroke="#4d6470" stroke-width={x === 0 ? 3.4 : 3} opacity={0.7} stroke-linecap="round" />
          <path d={`M${x} ${y0} Q${x - 3} ${(y0 + y1) / 2} ${x} ${y1}`} fill="none" stroke="#f4fafc" stroke-width={1.3} opacity={0.95} stroke-linecap="round" />
        </g>
      ))}
      {n.u && <path d="M0 0.5 H100" stroke="#ffffff" stroke-width={1.6} opacity={0.35} />}
      {/* the hem of the cloth: a doubled, slightly gathered edge */}
      <path d={edge} fill="none" stroke="#4d6470" stroke-width={4.2} stroke-linejoin="round" stroke-linecap="round" opacity={0.6} />
      <path d={edge} fill="none" stroke="#f6fbfd" stroke-width={2.4} stroke-linejoin="round" stroke-linecap="round" />
      <path d={edge} fill="none" stroke="#c9dde4" stroke-width={0.9} stroke-dasharray="1.6 3.2" stroke-linejoin="round" />
      {pegs.map(([x, y]) => (
        <g transform={`translate(${x} ${y})`}>
          <path d="M0 -4 V4" stroke={P.ink} stroke-width={3.6} stroke-linecap="round" />
          <path d="M0 -4 V4" stroke={P.woodLight} stroke-width={1.7} stroke-linecap="round" />
        </g>
      ))}
    </g>
  );
}
function Footprints() {
  return (
    <g pointer-events="none" class="footprints" fill={P.soilLip} opacity={0.75}>
      {[[24, 72, -20], [36, 58, 15], [50, 46, -15], [62, 32, 15]].map(([x, y, r]) => <ellipse cx={x} cy={y} rx={4.5} ry={7} transform={`rotate(${r} ${x} ${y})`} />)}
    </g>
  );
}
// a small round badge in the top-right corner of a bed: why the plant stands still
function NoteBadge({ kind, m = 1 }: { kind: 'cold' | 'hot' | 'flood'; m?: number }) {
  return (
    <g transform={`translate(85 17) scale(${m})`}>
      <circle r={10} fill={kind === 'cold' ? '#cfe8f7' : kind === 'hot' ? '#ffd7a8' : '#cfe8f7'} stroke={P.ink} stroke-width={1.8} />
      <g transform="translate(-8 -8) scale(0.34)">{(icons[kind === 'cold' ? 'thermo' : kind === 'hot' ? 'heat' : 'drop'] ?? icons.star)()}</g>
    </g>
  );
}
function FrostMark({ m = 1 }: { m?: number }) {
  return (
    <g pointer-events="none" class="frost-mark">
      <rect x={4} y={6} width={92} height={88} rx={12} fill="rgba(180,220,255,0.28)" stroke="#9fd3ff" stroke-width={3} stroke-dasharray="7 5" />
      <g transform={`translate(20 80) scale(${m})`}>
        <circle r={12} fill="#e8f5ff" stroke={P.ink} stroke-width={1.8} />
        <g transform="translate(-9 -9) scale(0.375)">{icons.snow()}</g>
      </g>
    </g>
  );
}
// lens colours: water blue, soil life brown→green, soil temperature blue→green→orange
const WATER_C = ['#e9c9a0', '#bfe0f2', '#7fc2ea', '#3f97d0'];
const SOIL_C = ['', '#d8c3a0', '#c7d79a', '#9fcf6a', '#6fb84a', '#3f9a32'];
function tempColor(t: number, min?: number): string {
  if (min !== undefined) return t < min ? '#8ec3ec' : t > min + 18 ? '#f2a35a' : '#9fdc7a';
  return t <= 0 ? '#7fb2e6' : t < 8 ? '#a9d4f2' : t < 15 ? '#c9eab0' : t < 25 ? '#9fdc7a' : '#f2a35a';
}
function LensCell({ s, x, y, lens, minT, m }: { s: GameState; x: number; y: number; lens: Exclude<Lens, null>; minT?: number; m: number }) {
  const t = tile(s, x, y);
  let fill = '', label = '';
  if (lens === 'water') {
    fill = WATER_C[t.moisture];
    label = String(t.moisture);
  } else if (lens === 'soil') {
    fill = SOIL_C[t.soil];
    label = String(t.soil);
  } else {
    const v = soilTemp(s, x, y);
    fill = tempColor(v, minT);
    label = `${v > 0 ? '+' : ''}${v}°`;
  }
  return (
    <g pointer-events="none" class={`lens-cell lens-${lens}`}>
      <rect x={6} y={8} width={88} height={82} rx={12} fill={fill} opacity={0.72} />
      <g transform={`translate(50 50) scale(${m})`}>
        <rect x={-24} y={-15} width={48} height={28} rx={14} fill="rgba(255,250,240,0.92)" stroke={P.ink} stroke-width={1.6} />
        {lens === 'water' && <path d="M-15 -8 C-12 -4 -10 -1 -10 1 a5 5 0 0 1 -10 0 C-20 -1 -18 -4 -15 -8z" transform="translate(4 2)" fill={P.water} stroke={P.ink} stroke-width={1} />}
        {lens === 'soil' && <path d="M-16 6 q4 -8 8 -2 q4 6 8 -2" transform="translate(-2 -4)" fill="none" stroke="#c97b8a" stroke-width={3} stroke-linecap="round" />}
        <text x={lens === 'temp' ? 0 : 6} y={5} text-anchor="middle" class="lens-text">{label}</text>
      </g>
    </g>
  );
}

const STRIKE_ICON: Record<StrikeKind, string> = { hail: 'hail', flood: 'flood', beetle: 'beetle', locust: 'locust', weedsurge: 'weeds' };
function dangerMarks(s: GameState): Map<string, StrikeKind> {
  const out = new Map<string, StrikeKind>();
  for (const st of s.strikes) {
    if (st.week < s.absWeek || st.kind === 'locust') continue;
    const cells = st.kind === 'weedsurge' ? strikeVictims(s, st) : st.zone ? st.cells.map(([x, y]) => [x, y] as [number, number]) : strikeVictims(s, st);
    for (const [x, y] of cells) if (tile(s, x, y).owned && tile(s, x, y).structure !== 'greenhouse') out.set(`${x},${y}`, st.kind);
  }
  return out;
}
function plantingBadges(s: GameState, hidden?: Map<string, Tile>): Map<string, number | null> {
  const groups = new Map<string, [number, number]>();
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      const t = tile(s, x, y);
      if (!t.owned || !t.crop || t.crop.rest || hidden?.has(`${x},${y}`)) continue;
      const g = `${t.crop.pid}:${t.crop.grown}`;
      const cur = groups.get(g);
      if (!cur || y > cur[1] || (y === cur[1] && x > cur[0])) groups.set(g, [x, y]);
    }
  const out = new Map<string, number | null>();
  for (const [x, y] of groups.values()) out.set(`${x},${y}`, ripenIn(s, x, y, { knownOnly: true }));
  return out;
}

export interface BuildView { item: string; spots: Set<string>; rows: boolean; corners: boolean; removable: Set<string> }

/**
 * PSV-004 · the farmer walks on the scene's own clock. A CSS transition cannot be paused, so the walk is a Web
 * Animation from wherever he stands now to the new spot; a pause freezes it mid-step and play() finishes the rest.
 */
function Walker({ x, y, ms, paused, cycle, children }: { x: number; y: number; ms: number; paused: boolean; cycle: number; children: ComponentChildren }) {
  const ref = useRef<SVGGElement>(null);
  const anim = useRef<Animation | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const to = `translate(${x}px, ${y}px)`;
    const from = el.style.transform ? getComputedStyle(el).transform : '';
    anim.current?.cancel();
    anim.current = null;
    el.style.transform = to;
    if (ms > 0 && from && from !== 'none' && typeof el.animate === 'function') {
      const a = el.animate([{ transform: from }, { transform: to }], { duration: ms, easing: 'linear' });
      if (paused) a.pause();
      a.onfinish = () => { if (anim.current === a) anim.current = null; };
      anim.current = a;
    }
  }, [x, y, ms]);
  useLayoutEffect(() => {
    const a = anim.current;
    if (!a) return;
    if (paused) a.pause(); else if (a.playState === 'paused') a.play();
  }, [paused]);
  return <g ref={ref} class="farmer" pointer-events="none" style={{ ['--work-cycle' as string]: `${cycle}ms` }}>{children}</g>;
}

export function Scene({
  scenePaused = false, menuTile = null,
  s, highlight, onTile, onCorner, hoverTile, onHover, farmer, floaters, hidden, effects = [], yard = YARD, px = 1, queue, flock = 'off', lens = null, build = null, pets = [], lifeActive = true, showWarnings = true, sceneCue = null, pestHits = [], pestPaused=false, morning = null, compost, scouts = false, onScouts, aftermath, spentDry,
}: {
  /** the world is paused (a dialog, another section, a hidden page): the farmer's walk stops with it */
  scenePaused?: boolean;
  /** the bed whose action menu is open ("x,y") */
  menuTile?: string | null;
  /** the week before a raid: two orphanage kids loiter behind a bush in the yard */
  scouts?: boolean;
  onScouts?: () => void;
  compost?:{built:boolean;building:boolean;ready:boolean;fill?:number;selected:boolean;open:boolean;over?:boolean;pulse?:number;onClick:()=>void};
  pestHits?:PestHit[];
  pestPaused?:boolean;
  morning?: MorningStep | null;
  showWarnings?: boolean;
  s: GameState;
  highlight: Highlight;
  onTile: (x: number, y: number) => void;
  onCorner?: (x: number, y: number) => void;
  hoverTile: string | null;
  onHover: (k: string | null) => void;
  farmer: FarmerState;
  floaters: Floater[];
  hidden?: Map<string, Tile>;
  aftermath?: Map<string, MissCause>;
  spentDry?: Set<string>;
  effects?: TileFx[];
  yard?: number;
  px?: number;
  queue?: Map<string, QueueMark>;
  flock?: Flock;
  lens?: Lens;
  build?: BuildView | null;
  pets?: PetId[];
  lifeActive?: boolean;
  sceneCue?: SceneCue|null;
}) {
  const cam = camera(s, yard);
  const price = landPrice(s);
  const [fx, fy] = farmerXY(cam, farmer.pos);
  const rows = Array.from({ length: GRID }, (_, y) => y);
  const mk = (size: number, minPx: number) => Math.min(2.3, Math.max(1, minPx / (size * Math.max(0.05, px))));
  const mWeeks = mk(15, 10.5), mDry = mk(20, 14), mNum = mk(13, 10), mCross = mk(26, 18), mLens = mk(28, 18);
  const hidePlants = !!lens || !!build;
  const badges = hidePlants ? new Map<string, number | null>() : plantingBadges(s, hidden);
  const vis = (x: number, y: number) => x >= cam.vx - 0.01 && x < cam.vx + cam.span && y >= cam.vy - 0.01 && y < cam.vy + cam.span;
  const winter = s.season === 3;
  const locustBeds = new Set(s.strikes.filter((st) => st.kind === 'locust' && st.week === s.absWeek).flatMap((st) => strikeVictims(s, st)).filter(([x, y]) => !isGuarded(s, x, y)).map(([x, y]) => `${x},${y}`));
  // the beetle speaks the locusts' language: the insects on the plant they eat this week (guarded beds keep their shield)
  const beetleBeds = new Set(s.strikes.filter((st) => st.kind === 'beetle' && st.week === s.absWeek).flatMap((st) => strikeVictims(s, st)).filter(([x, y]) => !isGuarded(s, x, y) && tile(s, x, y).structure !== 'greenhouse').map(([x, y]) => `${x},${y}`));
  const danger = dangerMarks(s);
  const frost = new Set(frostVictims(s).map(([x, y]) => `${x},${y}`));
  const thieves = new Set(s.thieves && s.thieves.week === s.absWeek && !s.thieves.talked && !thievesBlocked(s) ? s.thieves.targets.filter((g) => tile(s, g.x, g.y).structure !== 'greenhouse' && tile(s, g.x, g.y).crop?.pid === g.pid && !isGuarded(s, g.x, g.y)).map((g) => `${g.x},${g.y}`) : []);
  const yardCrates = s.yard.reduce((a, l) => a + l.qty, 0);
  const mPlant = morningPlantClass(morning);
  const propKey = propPlot(rows.flatMap((y) => Array.from({ length: GRID }, (_, x) => [x, y] as [number, number])).filter(([x, y]) => { if (!vis(x, y)) return false; const t = tile(s, x, y); return !t.owned && !t.canal && t.terrain === 'plain'; }));
  return (<>
    <svg viewBox={`0 0 ${cam.W} ${cam.H}`} class={`scene-svg${winter ? ' winter' : ''}${lens ? ` lens-on` : ''}${build ? ' build-on' : ''}${highlight.preview || highlight.area.size || highlight.block || highlight.tiles.size ? ' previewing' : ''}`} role="group" aria-label="Поле">
      <defs>
        <GrassPattern winter={winter} />
      </defs>
      <rect x={0} y={0} width={cam.W} height={cam.H} rx={18} fill="url(#grass-tex)" />
      {/* the yard strip: a path, the fence, the pets and the crates that did not fit the barn */}
      <rect x={0} y={0} width={cam.W} height={yard} rx={18} fill={winter ? '#f4f8fb' : '#a9d27f'} opacity={0.6} />
      <YardDecor W={cam.W} yard={yard} season={s.season as Season} />
      <EdgeDecor W={cam.W} H={cam.H} yard={yard} season={s.season as Season} />
      {/* an engraver's double rule round the plot, like the plates of the atlas */}
      <g class="board-rule" pointer-events="none" fill="none">
        <rect x={.8} y={.8} width={cam.W - 1.6} height={cam.H - 1.6} rx={17.4} stroke={winter ? '#7f98a8' : '#3f6526'} stroke-width={1.6} opacity={.55} />
        <rect x={5} y={5} width={cam.W - 10} height={cam.H - 10} rx={13.5} stroke={winter ? '#9fb6c4' : '#4a7a2c'} stroke-width={1} opacity={.55} />
        <rect x={8} y={8} width={cam.W - 16} height={cam.H - 16} rx={11} stroke={winter ? '#b7c9d4' : '#5f9a3a'} stroke-width={.6} opacity={.35} stroke-dasharray="2 3" />
      </g>
      {yardCrates > 0 && (
        <g transform={`translate(${cam.W / 2 - 40} ${yard - 44})`} class="yard-crates" pointer-events="none">
          {[0, 1, 2].slice(0, Math.min(3, Math.ceil(yardCrates / 6))).map((i) => (
            <g transform={`translate(${i * 26} ${i === 2 ? -18 : 0})`}>
              <rect width={26} height={20} rx={2} fill={P.woodLight} stroke={P.ink} stroke-width={1.6} />
              <path d="M2 7 H24 M2 13 H24" stroke={P.woodDark} stroke-width={1.4} />
            </g>
          ))}
          <text x={40} y={34} text-anchor="middle" class="yard-label">{yardCrates} ед.</text>
        </g>
      )}
      {!hidePlants && showWarnings && scouts && thieves.size === 0 && (
        <g transform={`translate(${Math.round(Math.max(150, Math.min(cam.W / 2 - 76, cam.W - 160)))} ${yard - 3})`} class="scouts" role="button" tabindex={0}
          aria-label="Дети из интерната что-то высматривают у поля" onClick={(e) => { e.stopPropagation(); onScouts?.(); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onScouts?.(); } }}>
          <rect x={-40} y={-60} width={80} height={66} fill="transparent" />
          <g transform="scale(1.15)"><ScoutingKids /></g>
        </g>
      )}
      {!hidePlants && showWarnings && thieves.size > 0 && (
        <g transform={`translate(${cam.W / 2 - 26} ${yard - 33})`} class="kids-peek" pointer-events="none">
          <KidsPeek />
        </g>
      )}

      <g transform={`translate(${-cam.vx * CELL} ${yard - cam.vy * CELL})`}>
        <RiverLayer s={s} cam={cam} />
        {rows.map((y) =>
          Array.from({ length: GRID }, (_, x) => {
            if (!vis(x, y)) return null;
            const k = `${x},${y}`;
            const t = hidden?.get(k) ?? tile(s, x, y);
            const buyable = !t.owned && canBuyLand(s, x, y);
            const clearable = !t.owned && canClear(s, x, y);
            const target = highlight.tiles.has(k) || (!!build && build.spots.has(k));
            const sel = highlight.selected.has(k);
            const inArea = highlight.area.has(k);
            const clickable = t.owned || buyable || clearable || target;
            const hit=pestHits.find(h=>h.x===x&&h.y===y);
            const crop = t.crop;
            const remains = aftermath?.get(k);
            const missIndex = sceneCue?.kind === 'thieves' ? (sceneCue.misses?.findIndex(m=>m.x===x&&m.y===y)??-1) : -1;
            const childIndex = (sceneCue?.visit?.outcome==='empty'?0:sceneCue?.targets?.length??2)+missIndex;
            const impactIndex = morning?.cells.findIndex(c=>c.x===x&&c.y===y)??-1;
            const plantTiming = impactIndex<0 ? undefined : morning?.kind==='thieves'
              ? {'--pull-time':`${(THEFT_IMPACT_MS-THEFT_ARRIVAL_MS)/(sceneCue?.rate??1)}ms`,'--pull-delay':`${(THEFT_ARRIVAL_MS+theftDelay(sceneCue)+theftStagger(impactIndex))/(sceneCue?.rate??1)}ms`}
              : {'--weather-impact':`${morning!.reveal}ms`,'--weather-delay':`${morningCellDelay(impactIndex)}ms`};
            const stage = crop ? (crop.rest ? 1 : cropStage(crop.grown, targetGrow(s, crop))) : 0;
            const dim = highlight.tiles.size > 0 && t.owned && !target && !highlight.rows && !highlight.options;
            const badge = badges.get(k);
            const note = crop && !hidden?.has(k) ? growNote(s, x, y) : null;
            return (
              <g
                transform={`translate(${PAD + x * CELL} ${PAD + y * CELL})`}
                data-tile={k}
                class={`tile${clickable ? ' clickable' : ''}${target ? ' target' : ''}${sel ? ' selected' : ''}${hoverTile === k ? ' hover' : ''}${dim ? ' dim' : ''}`}
                onClick={() => onTile(x, y)}
                onMouseEnter={() => onHover(k)}
                onMouseLeave={() => onHover(null)}
                role={clickable ? 'button' : undefined}
                tabindex={clickable ? 0 : undefined}
                aria-expanded={clickable && menuTile === k ? true : undefined}
                aria-controls={clickable && menuTile === k ? 'bed-menu' : undefined}
                aria-label={t.terrain === 'river' ? 'Река' : t.terrain === 'forest' ? (clearable ? 'Тайга: можно раскорчевать' : 'Тайга') : t.owned ? `Грядка ${x + 1}:${y + 1}${crop ? `, ${CROPS[crop.id].name}` : t.weeds ? ', сорняки' : ', пусто'}` : buyable ? `Участок на продажу за ${price} ₽` : 'Чужая земля'}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTile(x, y); } }}
              >
                {t.terrain === 'river' ? (
                  <rect x={0} y={0} width={100} height={100} fill="transparent" />
                ) : t.terrain === 'forest' ? (
                  <g>
                    <Forest x={x} y={y} />
                    {clearable && !winter && <g transform="translate(66 64) scale(0.6)" class="axe-hint">{icons.axe()}</g>}
                  </g>
                ) : t.canal ? (
                  <g class={wetCanals(s).has(idx(x,y))?'canal-watered':'canal-dry'}><CanalCell s={s} x={x} y={y} /></g>
                ) : t.owned ? (
                  <Bed moisture={winter ? 2 : t.moisture} soil={t.soil >= 4 ? 3 : t.soil >= 2 ? 2 : 1} sand={t.terrain === 'sand'} mulch={t.mulch > 0} />
                ) : t.terrain === 'sand' ? (
                  <g>
                    <SandDunes x={x} y={y} />
                    {buyable && <Meadow x={x} y={y} buyable price={price} signOnly />}
                  </g>
                ) : (
                  <Meadow x={x} y={y} buyable={buyable} price={price} season={s.season as Season} prop={k === propKey} />
                )}
                {t.terrain === 'rock' && <Rocks x={x} y={y} owned={t.owned} />}
                {t.terrain === 'swamp' && <Swamp x={x} y={y} owned={t.owned} />}
                {!hidePlants && t.owned && t.weeds && <Weeds x={x} y={y} />}
                {t.owned && t.drip && <DripHose wet={t.moisture > 0} l={x > 0 && tile(s, x - 1, y).drip} r={x < GRID - 1 && tile(s, x + 1, y).drip} />}
                {t.structure === 'hive' && <Hive />}
                {!hidePlants && crop && !hit && (
                  <g class={`plant${!winter && t.moisture === 0 && !crop.rest ? ((crop.dry ?? 0) >= 1 ? ' wilt-2' : ' wilt-1') : ''}${crop.rest ? ' resting' : ''}${mPlant.has(k) ? ` ${mPlant.get(k)}` : ''}`} style={plantTiming} key={`${crop.id}-${crop.planted}-${crop.pid}`}>
                    {crop.chewed?<NibbledPlant plant={crop} stage={stage}/>:<CropSprite id={crop.id} stage={stage} />}
                  </g>
                )}
                {!hidePlants && hit && <g class={pestPaused?'pest-paused':''}><NibbledPlant plant={hit.plant} stage={cropStage(hit.plant.grown,targetGrow(s,hit.plant))} hit={hit}/></g>}
                {!hidePlants && !crop && remains && <g class={`bed-aftermath cause-${remains}${missIndex>=0?' kid-bed':''}${spentDry?.has(k)?' spent':''}`} data-cause={remains} pointer-events="none" style={{'--kd':`${kidDelay(Math.max(0,childIndex))/(sceneCue?.rate??1)}ms`,'--reaction-dur':`${5000/(sceneCue?.rate??1)}ms`}}>
                  <BedLeftovers cause={remains}/>
                </g>}
                {t.owned && t.shelter > 0 && <ShelterDome n={shelterNb(s, x, y)} />}
                {t.structure === 'greenhouse' && <Greenhouse />}
                {winter && t.owned && t.structure !== 'greenhouse' && !t.canal && <SnowCover x={x} y={y} row={t.snow} />}
                {!hidePlants && crop && note === 'dry' && <DryBadge m={mDry} />}
                {!hidePlants && crop && !hit && (note === 'cold' || note === 'hot' || note === 'flood') && <NoteBadge kind={note} m={mDry} />}
                {!hidePlants && badge !== undefined && <WeeksBadge weeks={badge} m={mWeeks} />}
                {showWarnings && !hidePlants && crop && locustBeds.has(k) && <Locusts phase={(x + y * 2) * 0.37} />}
                {showWarnings && !hidePlants && crop && beetleBeds.has(k) && <Beetles phase={(x * 2 + y) * 0.31} />}
                {showWarnings && !hidePlants && thieves.has(k) && <Footprints />}
                {showWarnings && frost.has(k) && !hidePlants && <FrostMark m={mNum} />}
                {showWarnings && danger.has(k) && !hidePlants && !beetleBeds.has(k) && (
                  <g pointer-events="none" class={isGuarded(s, x, y) ? 'guarded' : 'danger'}>
                    <rect x={4} y={6} width={92} height={88} rx={12} class={isGuarded(s, x, y) ? 'guard-ring' : 'danger-ring'} />
                    <g transform={`translate(20 80) scale(${mNum})`}>
                      <circle r={12} fill={isGuarded(s, x, y) ? '#dff1fb' : '#fff3df'} stroke={P.ink} stroke-width={1.8} />
                      <g transform="translate(-9 -9) scale(0.375)">{(icons[isGuarded(s, x, y) ? 'guard' : STRIKE_ICON[danger.get(k)!]] ?? icons.star)()}</g>
                    </g>
                  </g>
                )}
                {lens && t.owned && !t.canal && <LensCell s={s} x={x} y={y} lens={lens} minT={highlight.minT} m={mLens} />}
                {inArea && <rect x={4} y={6} width={92} height={88} rx={12} class={`area-overlay${highlight.areaKind ? ` k-${highlight.areaKind}` : ''}`} pointer-events="none" />}
                {build?.removable.has(k) && (
                  <g pointer-events="none">
                    <rect x={3} y={4} width={94} height={92} rx={13} fill="none" stroke="#395928" stroke-width={4} stroke-dasharray="8 5" />
                    <g transform="translate(78 22)" pointer-events="none" class="move-mark">
                      <circle r={13} fill="#fff3df" stroke={P.ink} stroke-width={2} />
                    <path d="M-7 0 H7 M0 -7 V7 M-7 0 l3 -3 M-7 0 l3 3 M7 0 l-3 -3 M7 0 l-3 3 M0 -7 l-3 3 M0 -7 l3 3 M0 7 l-3 -3 M0 7 l3 -3" fill="none" stroke="#395928" stroke-width={1.8} stroke-linecap="round" stroke-linejoin="round" />
                  </g>
                  </g>
                )}
                {target && highlight.options ? <Mark kind="option" /> : (target || sel) && <rect x={3} y={4} width={94} height={92} rx={13} class={sel ? 'sel-ring' : 'target-ring'} pointer-events="none" />}
              </g>
            );
          }),
        )}
        {highlight.preview && (() => {
          const pv = highlight.preview!;
          const inside = pv.cells.map(([x, y], i) => [x, y, i] as const).filter(([x, y]) => x >= 0 && y >= 0 && x < GRID && y < GRID && vis(x, y));
          const out = pv.cells.filter(([x, y]) => !(x >= 0 && y >= 0 && x < GRID && y < GRID && vis(x, y)));
          const x0 = cam.vx, x1 = cam.vx + cam.span, y0 = cam.vy, y1 = cam.vy + cam.span;
          const arrows: { dir: 'left' | 'right' | 'up' | 'down'; n: number; at: [number, number] }[] = [];
          for (const dir of ['left', 'right', 'up', 'down'] as const) {
            const these = out.filter(([x, y]) => (dir === 'left' ? x < x0 : dir === 'right' ? x >= x1 : dir === 'up' ? y < y0 : y >= y1));
            if (!these.length) continue;
            const mx = these.reduce((a, c) => a + c[0], 0) / these.length + 0.5;
            const my = these.reduce((a, c) => a + c[1], 0) / these.length + 0.5;
            const at: [number, number] = dir === 'left' ? [x0, my] : dir === 'right' ? [x1, my] : dir === 'up' ? [mx, y0] : [mx, y1];
            at[0] = Math.max(x0 + 0.2, Math.min(x1 - 0.2, at[0]));
            at[1] = Math.max(y0 + 0.2, Math.min(y1 - 0.2, at[1]));
            arrows.push({ dir, n: these.length, at });
          }
          return (
            <g pointer-events="none" class="preview-layer">
              {inside.map(([x, y, i]) => (
                <g transform={`translate(${PAD + x * CELL} ${PAD + y * CELL})`}>
                  {!hidePlants && !pv.why[i] && pv.crop && !tile(s, x, y).crop && (
                    <g opacity={0.85}>
                      <CropSprite id={pv.crop} stage={0} />
                    </g>
                  )}
                  <Mark kind={pv.why[i] ? 'blocked' : 'valid'} m={mCross} />
                </g>
              ))}
              {arrows.map((a) => (
                <g transform={`translate(${PAD + a.at[0] * CELL} ${PAD + a.at[1] * CELL})`}>
                  <EdgeArrow dir={a.dir} n={a.n} m={mk(24, 16)} />
                </g>
              ))}
            </g>
          );
        })()}
        {highlight.gain &&
          [...highlight.gain.entries()].map(([k, d]) => {
            const [x, y] = k.split(',').map(Number);
            return (
              <g transform={`translate(${PAD + x * CELL} ${PAD + y * CELL})`} pointer-events="none">
                <SoilDelta d={d} m={mk(12.5, 9.5)} />
              </g>
            );
          })}
        {!hidePlants && queue &&
          [...queue.entries()].map(([k, q]) => {
            const [x, y] = k.split(',').map(Number);
            return (
              <g key={`q${k}${q.state}`} transform={`translate(${PAD + x * CELL} ${PAD + y * CELL})`} pointer-events="none">
                <Mark kind={q.state} n={q.n} m={mNum} />
              </g>
            );
          })}
        {highlight.anchor && !highlight.preview && (() => {
          const [ax, ay] = highlight.anchor.split(',').map(Number);
          return (
            <g transform={`translate(${PAD + ax * CELL} ${PAD + ay * CELL})`} pointer-events="none">
              <rect x={2} y={3} width={96} height={94} rx={14} class="anchor-ring" />
            </g>
          );
        })()}
        {highlight.corners?.map(([x, y]) => (
          <g key={`corner-${x}-${y}`} data-corner={`${x},${y}`} class="corner-target" role="button" tabindex={0}
            aria-label={`Цель переноса пугала: угол ${x + 1}:${y + 1}`}
            transform={`translate(${PAD + (x + 1) * CELL} ${PAD + (y + 1) * CELL + 8})`}
            onPointerEnter={() => onHover?.(`corner:${x},${y}`)}
            onPointerLeave={() => onHover?.(null)}
            onClick={(e) => { e.stopPropagation(); onCorner?.(x, y); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCorner?.(x, y); } }}>
            <circle r={Math.min(CELL * 0.44, 22 / px)} fill="transparent" />
            <circle r={8 / px} fill="#fff4bd" stroke="#395928" stroke-width={2 / px} pointer-events="none" />
            <circle r={3 / px} fill="#395928" pointer-events="none" />
          </g>
        ))}
        {s.scarecrows.map(([x, y]) => (
          <g transform={`translate(${PAD + (x + 1) * CELL} ${PAD + (y + 1) * CELL + 8})`} class="scarecrow-spot"
            data-corner={`${x},${y}`}
            role={build ? 'button' : undefined} tabindex={build ? 0 : undefined}
            aria-label={build ? `Переместить пугало: угол ${x + 1}:${y + 1}` : 'Пугало'}
            aria-pressed={build ? build.removable.has(`${x},${y}`) : undefined}
            onClick={(e) => { if (build) { e.stopPropagation(); onCorner?.(x, y); } }}
            onKeyDown={(e) => { if (build && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); onCorner?.(x, y); } }}
            pointer-events={build ? 'auto' : 'none'}>
            <Scarecrow />
            {build?.removable.has(`${x},${y}`) && (
              <g pointer-events="none" class="move-mark">
                <rect x={-26} y={-58} width={52} height={70} rx={12} fill="none" stroke="#395928" stroke-width={3} stroke-dasharray="7 4" />
                <g transform="translate(24 -40)">
                  <circle r={13} fill="#fff3df" stroke={P.ink} stroke-width={2} />
                  <path d="M-7 0 H7 M0 -7 V7 M-7 0 l3 -3 M-7 0 l3 3 M7 0 l-3 -3 M7 0 l-3 3 M0 -7 l-3 3 M0 -7 l3 3 M0 7 l-3 -3 M0 7 l3 -3" fill="none" stroke="#395928" stroke-width={1.8} stroke-linecap="round" stroke-linejoin="round" />
                </g>
              </g>
            )}
          </g>
        ))}
        {highlight.block && (() => {
          const [bx, by] = highlight.block!;
          return (
            <g pointer-events="none" class="block-preview">
              <rect x={PAD + bx * CELL + 4} y={PAD + by * CELL + 6} width={CELL * 2 - 8} height={CELL * 2 - 10} rx={14} class="area-overlay" />
            </g>
          );
        })()}
        {!hidePlants && flock !== 'off' && (
          <g class={`flock ${flock}`} pointer-events="none" aria-hidden="true">
            {flockSpots(s, cam).map(([x, y, i]) => (
              <g transform={`translate(${x} ${y}) scale(0.85)`}>
                <g class={`crow-walk w${i}`}>{flock === 'leave' ? <g class="c-takeoff" transform="translate(1 -13)"><CrowFlying /></g> : <Crow />}</g>
              </g>
            ))}
          </g>
        )}
        {!hidePlants && <MorningLayer step={morning} />}
        {effects.filter((f) => !hidePlants || f.kind === 'build').map((f) => (
          <g key={f.key} transform={`translate(${PAD + f.x * CELL} ${PAD + f.y * CELL})`} class={`tile-fx fx-${f.kind}`} style={{ ['--d' as string]: `${f.delay ?? 0}ms` }} pointer-events="none">
            <TileEffect kind={f.kind} />
          </g>
        ))}
        {(highlight.rows || build?.rows) &&
          rows.map((y) => (
            <rect x={PAD - 6 + cam.vx * CELL} y={PAD + y * CELL + 2} width={cam.span * CELL + 12} height={CELL - 4} rx={14} class={`row-target${hoverTile?.endsWith(`,${y}`) ? ' on' : ''}`} pointer-events="none" />
          ))}
      </g>

      {compost&&<g class={`compost-button field-compost${compost.ready?' ready':''}${compost.selected?' accepting':''}${compost.over?' drag-over':''}${compost.open?' open':''}`} transform={`translate(${cam.W-108} 2)`} role="button" tabindex={0} aria-label={!compost.built?(compost.building?'Компостная куча строится':'Обустроить компостную кучу'):compost.ready?'Компост готов':'Компостная куча'} aria-expanded={compost.open} onClick={compost.onClick} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();compost.onClick();}}}>
       <rect x={-6} y={-2} width={Math.max(104,48/px)} height={Math.max(72,48/px)} fill="transparent" class="compost-hit"/>
       <g class="compost-lift"><g key={compost.pulse??0} class={compost.pulse?'compost-settle':''}><CompostHeap built={compost.built} building={compost.building} fill={compost.fill} ready={compost.ready}/></g></g>
      </g>}
      {!hidePlants && floaters.map((f) => {
        const [x, y] = farmerXY(cam, { kind: 'tile', x: f.x, y: f.y });
        return (
          <g key={f.key} transform={`translate(${x + 30} ${y - 64})`} pointer-events="none">
            <g class={`floater${f.tone === 'bad' ? ' floater-bad' : ''}`} style={{ animationDelay: `${f.delay ?? 0}ms` }}>
              <rect x={-34} y={-17} width={68} height={28} rx={14} fill="#fffaf0" stroke={P.ink} stroke-width={2} />
              {f.crop && <svg x={-32} y={-16} width={26} height={26} viewBox="10 6 80 82"><CropSprite id={f.crop} stage={2} /></svg>}
              <text x={f.crop ? 10 : 0} y={3} text-anchor="middle" class="floater-text">{f.text}</text>
            </g>
          </g>
        );
      })}
    </svg>
    <svg viewBox={`0 0 ${cam.W} ${cam.H}`} class="life-svg" pointer-events="none">
      <g visibility={hidePlants?'hidden':'visible'}><FarmLife s={s} cam={cam} px={px} cue={sceneCue} active={lifeActive&&!hidePlants} interactive={!hidePlants&&!highlight.tiles.size&&!highlight.preview&&!highlight.area.size}/></g>
      <Walker x={fx} y={fy} ms={farmer.ms} paused={scenePaused} cycle={farmer.cycle ?? 1200}>
        <g transform={`scale(${farmer.facing * 0.8} 0.8)`}>
          <Farmer action={farmer.action} walking={farmer.walking} bubble={null} rest={farmer.pos.kind !== 'tile'} />
        </g>
        {farmer.bubble && (
          <g transform={`translate(32 ${Math.max(-88,24-fy)})`}>
            <g class="farmer-bubble" key={farmer.bubble}>
              <path d="M-5 14 l5 9 l5 -9" fill="#fffaf0" stroke={P.ink} stroke-width={2} />
              <circle r={17} fill="#fffaf0" stroke={P.ink} stroke-width={2} />
              <g transform="translate(-12 -12) scale(0.5)">{(icons[farmer.bubble] ?? icons.star)()}</g>
            </g>
          </g>
        )}
      </Walker>
    </svg>
  </>);
}
// keep these names used by the old parts (and quiet the linter about the rest)
export const _unused = { airTemp, cropMinT, underScarecrow };
