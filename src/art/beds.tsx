// A bed on the 100×100 field cell and the few marks drawn on it. Kept deliberately plain:
// the colour of the earth is water (dry and cracked → dark and shiny), one small chip is fertility (1–3),
// one badge per planting counts the weeks, a red drop warns about a dry bed. Everything else lives in the
// panel of the selected bed. Marks take a scale `m` so they stay readable when the field is small on screen.
import { P } from './palette';

export function soilFill(moisture: number, sand: boolean, glass: boolean): string {
  if (glass) return P.soil;
  if (sand) return moisture >= 2 ? '#b88a52' : moisture === 1 ? '#d2a96c' : '#e6c58c';
  return moisture >= 2 ? P.soilWet : moisture === 1 ? P.soil : P.soilDry;
}

export function Bed({ moisture, sand = false, glass = false, mulch = false, soil = 2 }: { moisture: number; sand?: boolean; glass?: boolean; mulch?: boolean; soil?: number }) {
  const dry = moisture === 0 && !glass;
  return (
    <g>
      <rect x={6} y={14} width={88} height={82} rx={12} fill={P.soilLip} />
      <rect x={6} y={8} width={88} height={82} rx={12} fill={soilFill(moisture, sand, glass)} stroke={P.ink} stroke-width={2.2} />
      {[30, 50, 70].map((y) => <path d={`M16 ${y} Q50 ${y + 3} 84 ${y}`} stroke={P.furrow} stroke-width={3} fill="none" stroke-linecap="round" />)}
      {/* Fertility is texture, water is colour/cracks. Keep the texture at the exposed edges. */}
      {soil >= 2 && <g class={`soil-texture soil-${soil}`} fill="#493022" opacity={soil >= 3 ? .7 : .35} pointer-events="none">
        {(soil >= 3 ? [[17,40],[82,43],[20,63],[79,65],[31,83],[65,84]] : [[17,40],[79,65],[31,83]]).map(([x,y]) =>
          <path d={`M${x-3} ${y+1} q-1 -5 3 -5 q5 1 4 5 q-3 3 -7 0z`} />)}
      </g>}
      {dry && <path d="M22 22 l7 7 l-3 6 l5 4 M72 56 l-6 5 l4 7 M58 20 l5 6 l-2 4 M30 70 l6 -3 l3 5" stroke="rgba(63,42,29,0.5)" stroke-width={1.8} fill="none" stroke-linecap="round" stroke-linejoin="round" />}
      {moisture >= 3 && !glass && (
        <g opacity={0.8}>
          <ellipse cx={70} cy={76} rx={11} ry={4} fill="#5c8fae" opacity={0.55} />
          <path d="M64 75 q5 -2 10 0" stroke="#cfeaf7" stroke-width={1.6} fill="none" stroke-linecap="round" />
        </g>
      )}
      {moisture >= 2 && !glass && <path d="M14 20 Q26 13 40 16" stroke="rgba(255,255,255,0.28)" stroke-width={3} fill="none" stroke-linecap="round" />}
      {mulch && <Mulch />}
    </g>
  );
}

// Straw mulch: loose uneven tufts laid on the earth around the plant. Patches of soil stay open,
// so the colour of the bed still tells how wet it is.
const TUFTS: [number, number, number, number][] = [
  [34, 74, -8, 1.05], [50, 80, 4, 1.15], [66, 73, 12, 1], [24, 56, -18, .85], [76, 55, 16, .9], [40, 62, 8, .8], [60, 62, -6, .78],
  [20, 33, -6, .7], [80, 34, 10, .72], [50, 26, 0, .6], [28, 84, 20, .7], [72, 84, -16, .75],
];
function Mulch() {
  return (
    <g class="mulch-cover" stroke-linecap="round" pointer-events="none">
      {TUFTS.map(([x, y, r, k], i) => (
        <g transform={`translate(${x} ${y}) rotate(${r}) scale(${k})`}>
          <ellipse cx={0} cy={2.5} rx={10} ry={3} fill="#3a2614" opacity={0.18} />
          <path d={i % 2 ? 'M-10 1 L8 -3 M-9 3 L10 1 M-7 -2 L9 2 M-4 4 L6 -4' : 'M-9 -2 L10 2 M-10 2 L7 -1 M-6 4 L9 -3 M-3 -4 L5 4'} stroke="#a47a2c" stroke-width={3.2} />
          <path d={i % 2 ? 'M-10 1 L8 -3 M-9 3 L10 1 M-7 -2 L9 2' : 'M-9 -2 L10 2 M-10 2 L7 -1 M-6 4 L9 -3'} stroke="#ecc66a" stroke-width={1.7} />
          <path d={i % 2 ? 'M-4 4 L6 -4' : 'M-3 -4 L5 4'} stroke="#f7e3a3" stroke-width={1.2} />
        </g>
      ))}
    </g>
  );
}

const FERT = [
  null,
  { bg: '#f3e2bd', leaf: '#c9b27a', text: '#7a5536' },
  { bg: '#d6efbd', leaf: P.leaf, text: '#2f5f1d' },
  { bg: '#9fd66b', leaf: P.leafDark, text: '#1f4512' },
] as const;

// fertility: a leaf and a digit in the top-left corner. `to` shows a change: 2→1 before replanting, 1→2 from beans.
export function SoilChip({ soil, to, m = 1 }: { soil: number; to?: number; m?: number }) {
  const c = FERT[Math.max(1, Math.min(3, soil))]!;
  const change = to !== undefined && to !== soil;
  const w = change ? 40 : 25;
  const tone = change ? (to! < soil ? '#f6c9be' : '#c9f0a8') : c.bg;
  return (
    <g transform={`translate(9 11) scale(${m})`} class="soil-chip">
      <rect x={0} y={0} width={w} height={17} rx={8.5} fill={tone} stroke={P.ink} stroke-width={1.5} />
      <path d="M8 13 C3 12 3 6 7 3 C11 6 11 11 8 13z" fill={c.leaf} stroke={P.ink} stroke-width={0.9} />
      <text x={change ? 26 : 17.5} y={13} text-anchor="middle" class="chip-text" fill={change ? (to! < soil ? '#8f2418' : '#2f5f1d') : c.text}>
        {change ? `${soil}→${to}` : soil}
      </text>
    </g>
  );
}

// weeks to harvest for a whole planting: a number, ✓ for tonight, ❄ when winter comes first
export function WeeksBadge({ weeks, m = 1 }: { weeks: number | null; m?: number }) {
  const cold = weeks === null;
  const now = weeks === 0;
  return (
    <g transform={`translate(80 79) scale(${m})`} class="weeks-badge">
      <circle r={12} fill={cold ? '#cfe8f7' : now ? '#5aae3a' : '#fffaf0'} stroke={cold ? '#2f5f80' : P.ink} stroke-width={2} />
      <text y={5} text-anchor="middle" class={`badge-text${cold ? ' frost' : now ? '' : ' dark'}`}>{cold ? '❄' : now ? '✓' : weeks! + 1}</text>
    </g>
  );
}

export function DryBadge({ m = 1 }: { m?: number }) {
  return (
    <g transform={`translate(85 17) scale(${m})`}>
      <g class="dry-badge">
        <circle r={10} fill={P.red} stroke={P.ink} stroke-width={1.8} />
        <path d="M0 -6 C3 -2 5 1 5 3 a5 5 0 0 1 -10 0 C-5 1 -3 -2 0 -6z" fill="#fff" />
      </g>
    </g>
  );
}

// placement marks, drawn over the field after the crops; they never take the pointer
export type MarkKind = 'valid' | 'blocked' | 'option' | 'queued' | 'working' | 'done';
export function Mark({ kind, n, m = 1 }: { kind: MarkKind; n?: number; m?: number }) {
  switch (kind) {
    case 'option': // another place where the shape fits: barely there
      return <rect x={10} y={12} width={80} height={76} rx={12} class="mark-option" />;
    case 'valid':
      return <rect x={4} y={5} width={92} height={90} rx={13} class="mark-valid" />;
    case 'blocked':
      return (
        <g>
          <rect x={4} y={5} width={92} height={90} rx={13} class="mark-blocked" />
          <g transform={`translate(50 50) scale(${m})`}>
            <circle r={13} fill="#fff6f2" stroke="#a92e25" stroke-width={2.4} />
            <path d="M-6 -6 L6 6 M6 -6 L-6 6" stroke="#a92e25" stroke-width={3.4} stroke-linecap="round" />
          </g>
        </g>
      );
    case 'queued':
    case 'working':
      return (
        <g>
          <rect x={5} y={6} width={90} height={88} rx={13} class={kind === 'working' ? 'mark-working' : 'mark-queued'} />
          <g transform={`translate(20 22) scale(${m})`}>
            <circle r={11} fill={kind === 'working' ? P.gold : '#fffaf0'} stroke={P.ink} stroke-width={2} />
            <text y={5} text-anchor="middle" class="badge-text dark">{n}</text>
          </g>
        </g>
      );
    case 'done':
      return (
        <g class="mark-done">
          <g transform={`translate(20 22) scale(${m})`}>
            <circle r={11} fill="#5aae3a" stroke={P.ink} stroke-width={2} />
            <path d="M-5 0 L-1 4 L6 -4" stroke="#fff" stroke-width={3} fill="none" stroke-linecap="round" stroke-linejoin="round" />
          </g>
        </g>
      );
  }
}

// part of the shape is past the edge of the visible field: an arrow on the edge with the number of cells
export function EdgeArrow({ dir, n, m = 1 }: { dir: 'left' | 'right' | 'up' | 'down'; n: number; m?: number }) {
  const rot = { right: 0, down: 90, left: 180, up: 270 }[dir];
  return (
    <g class="edge-arrow">
      <g transform={`rotate(${rot}) scale(${m})`}>
        <path d="M-6 -12 L8 0 L-6 12z" fill="#e0473a" stroke={P.ink} stroke-width={2} stroke-linejoin="round" />
      </g>
      <g transform={`scale(${m})`}>
        <circle cx={dir === 'left' ? 16 : dir === 'right' ? -16 : 0} cy={dir === 'up' ? 16 : dir === 'down' ? -16 : 0} r={9} fill="#fffaf0" stroke={P.ink} stroke-width={1.6} />
        <text x={dir === 'left' ? 16 : dir === 'right' ? -16 : 0} y={(dir === 'up' ? 16 : dir === 'down' ? -16 : 0) + 4.5} text-anchor="middle" class="badge-text dark small">{n}</text>
      </g>
    </g>
  );
}

// a small "+1" / "−1" tag in the lower-left corner: what tonight's beans or this planting will do to the soil
export function SoilDelta({ d, m = 1 }: { d: number; m?: number }) {
  return (
    <g transform={`translate(24 78) scale(${m})`}>
      <rect x={-15} y={-10} width={30} height={19} rx={9.5} fill={d > 0 ? '#c9f0a8' : '#f6c9be'} stroke={P.ink} stroke-width={1.5} />
      <text y={4.5} text-anchor="middle" class="chip-text" fill={d > 0 ? '#2f5f1d' : '#8f2418'}>{d > 0 ? `+${d}` : `−${-d}`}</text>
    </g>
  );
}
