// The estate as one big picture for the house tab (viewBox 0 0 360 220): the house at its real level in
// its yard, under the season's sky. What the player owns stands around it — a hive, a greenhouse, a
// scarecrow, a water barrel, a weather vane — so the picture itself says what the farm has; the house's
// own rooms (cellar, workshop, the wings of the manor) come from the house drawing. Scaffolding while it grows.
import { House } from './farm';
import { P } from './palette';
const INK = '#3f2a1d';

export interface EstateOwns { hive?: boolean; greenhouse?: boolean; scarecrow?: boolean; irrigation?: boolean; meteo?: boolean; compost?: boolean }

// PSV-014 · the birch follows the season: green, then gold in autumn, bare twigs under snow in winter
function Birch({ x, y, k = 1, season = 1 }: { x: number; y: number; k?: number; season?: number }) {
  const leaves = season === 2 ? ['#e2b23c', '#ecc24a', '#f2cf5e'] : ['#8cc95a', '#9dd468', '#a8db73'];
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`} stroke={INK} stroke-linejoin="round">
      <path d="M-3 0 L-2 -58 L2 -58 L3 0 Z" fill="#f4f1ea" stroke-width={1.6} />
      <path d="M-2 -12 h3 M-1 -26 h3 M-2 -40 h2.6 M0 -50 h2" stroke={INK} stroke-width={1.6} />
      {season === 3 ? (
        <g class="estate-twigs" fill="none" stroke-linecap="round">
          <path d="M0 -56 L-14 -74 M-8 -66 L-18 -66 M0 -56 L12 -78 M7 -68 L18 -70 M0 -58 L1 -88 M1 -76 L-7 -84" stroke="#6b5a4a" stroke-width={1.6} />
          <path d="M-16 -75 q2 -2 4 0 M10 -79 q2 -2 4 0 M-2 -89 q2 -2 4 0 M15 -71 q2 -2 4 0" stroke="#fbfdff" stroke-width={2.4} />
        </g>
      ) : (
        <g class="estate-leaves">
          <ellipse cx={-10} cy={-62} rx={14} ry={11} fill={leaves[0]} stroke-width={1.6} />
          <ellipse cx={8} cy={-70} rx={15} ry={12} fill={leaves[1]} stroke-width={1.6} />
          <ellipse cx={0} cy={-80} rx={12} ry={9} fill={leaves[2]} stroke-width={1.6} />
        </g>
      )}
    </g>
  );
}
function Hive({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke={INK} stroke-width={1.5} stroke-linejoin="round">
      <rect x={-10} y={-4} width={20} height={4} fill="#8f5d34" />
      <rect x={-9} y={-18} width={18} height={14} rx={1.5} fill="#e9c45c" />
      <path d="M-11 -18 L0 -25 L11 -18 Z" fill="#c58f57" />
      <path d="M-9 -11 h18" stroke="#b98a2a" stroke-width={1} />
      <rect x={-3} y={-8} width={6} height={2.4} fill="#3a2618" stroke="none" />
      <circle class="estate-bee" cx={13} cy={-22} r={1.8} fill="#f2c94c" stroke-width={.8} />
    </g>
  );
}
function Greenhouse({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke={INK} stroke-width={1.5} stroke-linejoin="round">
      <path d="M-20 0 V-16 Q-20 -30 0 -30 Q20 -30 20 -16 V0 Z" fill="rgba(214,238,247,.75)" />
      <path d="M-10 0 V-28 M0 0 V-30 M10 0 V-28 M-20 -14 H20" fill="none" stroke="#6f8f9c" stroke-width={1.2} />
      <path d="M-14 -4 q3 -8 6 0 M4 -4 q3 -9 6 0" fill="#7cbc4a" stroke-width={1} />
      <path d="M-16 -18 Q-14 -26 -6 -27" fill="none" stroke="#fff" stroke-width={1.8} />
    </g>
  );
}
function Scarecrow({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke={INK} stroke-width={1.5} stroke-linejoin="round" stroke-linecap="round">
      <path d="M0 0 V-34 M-13 -24 H13" stroke="#8f5d34" stroke-width={2.6} />
      <path d="M-9 -27 L9 -27 L7 -12 L-7 -12 Z" fill="#b9563d" />
      <circle cx={0} cy={-34} r={5.4} fill="#e9c98a" />
      <path d="M-8 -37 Q0 -46 8 -37 Z" fill="#d6ad55" />
      <path d="M-13 -24 l-3 3 M13 -24 l3 3" stroke="#e7c46f" stroke-width={1.6} />
    </g>
  );
}
function Barrel({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke={INK} stroke-width={1.5} stroke-linejoin="round">
      <path d="M-8 0 Q-10 -9 -8 -18 H8 Q10 -9 8 0 Z" fill="#a8723f" />
      <path d="M-9 -5 H9 M-9 -13 H9" stroke="#56616b" stroke-width={1.6} />
      <ellipse cx={0} cy={-18} rx={8} ry={2.4} fill="#4f9fcf" />
      <path d="M8 -9 q10 0 12 8" fill="none" stroke="#3f7a3a" stroke-width={2.2} />
    </g>
  );
}

export function Estate({ level, building, season, owns }: { level: number; building: boolean; season: number; owns: EstateOwns }) {
  const winter = season === 3, autumn = season === 2;
  const ground = winter ? '#eef4f8' : autumn ? '#b9c66a' : '#93c65a';
  const groundFar = winter ? '#dfe9f0' : autumn ? '#c9c77a' : '#a9d474';
  return (
    <svg viewBox="0 8 360 210" class={`estate-scene${winter ? ' winter' : autumn ? ' autumn' : ''}`} aria-hidden="true">
      <defs>
        <linearGradient id="est-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color={winter ? '#cfdfe9' : '#bfe4f6'} /><stop offset="1" stop-color={winter ? '#eef4f8' : '#eef7e0'} />
        </linearGradient>
      </defs>
      <rect width={360} height={220} fill="url(#est-sky)" />
      {!winter && <g fill="#fff" opacity={.85}><ellipse cx={58} cy={30} rx={20} ry={7} /><ellipse cx={74} cy={26} rx={13} ry={8} /><ellipse cx={292} cy={40} rx={18} ry={6} /><ellipse cx={306} cy={36} rx={11} ry={7} /></g>}
      <circle cx={322} cy={26} r={11} fill={winter ? '#f4f1e6' : '#ffe48a'} stroke="#e9c45c" stroke-width={2} opacity={.95} />
      {/* far hills and a village roofline */}
      <path d="M0 132 Q60 108 120 122 Q190 100 260 120 Q310 110 360 124 V160 H0 Z" fill={groundFar} />
      <g fill="#c7a17a" stroke={INK} stroke-width={1} opacity={.55}><path d="M268 118 h10 v-6 l5 -5 l5 5 v6 h8 v4 h-28 Z" /><path d="M300 117 h8 v-9 l4 -5 l4 5 v9 h-16 Z" /></g>
      <path d="M0 150 Q90 136 180 146 Q270 136 360 148 V220 H0 Z" fill={ground} />
      {/* the path to the door */}
      <path d="M186 214 Q182 192 198 176 L214 176 Q204 192 214 214 Z" fill={winter ? '#e2d8c8' : '#d8b98a'} opacity={.85} />
      <Birch x={34} y={170} k={1.05} season={season} />
      {!winter && <Birch x={62} y={178} k={.75} />}
      {/* the house at its level — its own drawing, enlarged */}
      <svg x={76} y={22} width={238} height={172} viewBox="-12 -8 224 162" overflow="visible"><House level={level} building={building} /></svg>
      {/* what the farm owns, in the yard */}
      {owns.hive && <Hive x={70} y={202} />}
      {owns.irrigation && <Barrel x={98} y={198} />}
      {owns.greenhouse && <Greenhouse x={318} y={196} />}
      {owns.scarecrow && <Scarecrow x={286} y={210} />}
      {owns.meteo && <g transform="translate(250 64)" stroke={INK} stroke-width={1.4} stroke-linecap="round"><path d="M0 0 V22" /><path class="estate-vane" d="M-9 2 H9 L5 -2 M-9 2 l3 -4" fill="none" stroke-width={1.8} /><circle cx={0} cy={0} r={1.8} fill={P.gold} /></g>}
      {owns.compost && <g transform="translate(140 204)" stroke={INK} stroke-width={1.4}><rect x={-12} y={-12} width={24} height={12} fill="#c58f57" /><path d="M-12 -6 h24" stroke="#8f5d34" /><path d="M-9 -12 Q0 -20 9 -12" fill="#5b3c25" /></g>}
      {/* a low fence along the front */}
      <g stroke={INK} stroke-width={1.4} stroke-linejoin="round">
        <path d="M110 206 H176 M224 206 H346" stroke="#b27947" stroke-width={3} />
        {[114, 128, 142, 156, 170, 228, 242, 256, 270, 300, 314, 328, 342].map((x) => <path d={`M${x} 214 V200 l2 -3 l2 3 V214 Z`} fill="#dcaa6e" />)}
      </g>
      {winter && <g fill="#fff" opacity={.9}>{[[30, 60], [120, 30], [200, 70], [280, 24], [340, 90], [80, 110]].map(([x, y]) => <circle class="estate-snow" cx={x} cy={y} r={1.8} />)}</g>}
    </svg>
  );
}
