// Small UI icons and card illustrations, 48×48 viewBox, same outline language as the crops.
import type { JSX } from 'preact';
import { P } from './palette';
import { moreIcons } from './extra';
import { FireIcon } from './fire';

const S = { stroke: P.ink, 'stroke-width': 2.2, 'stroke-linejoin': 'round' as const, 'stroke-linecap': 'round' as const };

function Svg({ size = 24, children, label }: { size?: number; children: JSX.Element | JSX.Element[]; label?: string }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'}>
      {children}
    </svg>
  );
}

export const icons: Record<string, () => JSX.Element> = {
  journal: () => <g {...S}><rect x="8" y="5" width="32" height="38" rx="5" fill="#b78952"/><path d="M15 7 H35 Q38 7 38 10 V36 Q38 39 35 39 H15Z" fill="#fff2ce"/><path d="M15 6 V41 M20 18 H32 M20 24 H32 M20 30 H28" fill="none"/><path d="M29 6 H35 V17 L32 14 L29 17Z" fill="#a7513e"/><path d="M6 14 H11 M6 24 H11 M6 34 H11" fill="none"/></g>,
  coin: () => (
    <g>
      <circle cx={24} cy={24} r={16} fill={P.gold} {...S} />
      <circle cx={24} cy={24} r={11} fill="none" stroke={P.goldDark} stroke-width={2} />
      <path d="M21 32 V16 h5 a4.5 4.5 0 0 1 0 9 h-8 M18 28.5 h9" fill="none" stroke={P.ink} stroke-width={2.4} stroke-linecap="round" />
    </g>
  ),
  drop: () => <path d="M24 6 C30 16 36 22 36 30 a12 12 0 0 1 -24 0 C12 22 18 16 24 6z" fill={P.water} {...S} />,
  day: () => (
    <g>
      {Array.from({ length: 8 }, (_, k) => <path d={`M24 4 v6`} {...S} stroke={P.goldDark} transform={`rotate(${k * 45} 24 24)`} />)}
      <circle cx={24} cy={24} r={11} fill={P.gold} {...S} />
    </g>
  ),
  soil: () => (
    <g>
      <path d="M8 34 Q24 26 40 34 L40 40 L8 40z" fill={P.soil} {...S} />
      <path d="M24 32 V18" {...S} stroke={P.stem} stroke-width={3} />
      <ellipse cx={18} cy={18} rx={7} ry={4} fill={P.leaf} {...S} transform="rotate(-25 18 18)" />
      <ellipse cx={30} cy={16} rx={7} ry={4} fill={P.leafLight} {...S} transform="rotate(25 30 16)" />
    </g>
  ),
  sack: () => (
    <g>
      <path d="M14 18 Q12 40 24 42 Q36 40 34 18z" fill={P.parchmentDark} {...S} />
      <path d="M16 18 L14 10 L34 10 L32 18z" fill={P.parchment} {...S} />
      <path d="M15 18 H33" {...S} />
      <path d="M20 30 h8" {...S} stroke={P.inkSoft} />
    </g>
  ),
  bank: () => (
    <g>
      <path d="M6 18 L24 7 L42 18z" fill={P.parchmentDark} {...S} />
      <rect x={8} y={36} width={32} height={5} fill={P.parchmentDark} {...S} />
      {[12, 21, 30].map((x) => <rect x={x} y={19} width={6} height={17} fill={P.parchment} {...S} />)}
    </g>
  ),
  calendar: () => (
    <g>
      <rect x={8} y={10} width={32} height={30} rx={3} fill={P.parchment} {...S} />
      <rect x={8} y={10} width={32} height={9} rx={3} fill={P.red} {...S} />
      <path d="M16 7 v7 M32 7 v7" {...S} />
      <path d="M15 26 h4 M22 26 h4 M29 26 h4 M15 33 h4 M22 33 h4" {...S} stroke={P.inkSoft} />
    </g>
  ),
  shield: () => (
    <g>
      <path d="M24 6 L39 12 V24 C39 33 32 39 24 42 C16 39 9 33 9 24 V12z" fill="#7ec3e8" {...S} />
      <path d="M17 24 l5 5 l9 -10" fill="none" {...S} stroke-width={3} />
    </g>
  ),
  contract: () => (
    <g>
      <rect x={10} y={6} width={26} height={34} rx={2} fill={P.parchment} {...S} />
      <path d="M15 14 h16 M15 20 h16 M15 26 h10" {...S} stroke={P.inkSoft} />
      <circle cx={32} cy={34} r={7} fill={P.red} {...S} />
      <path d="M30 34 l2 2 l3 -4" fill="none" stroke="#fff" stroke-width={2} stroke-linecap="round" />
    </g>
  ),
  piggy: () => (
    <g>
      <ellipse cx={24} cy={27} rx={15} ry={11} fill="#f6a9b9" {...S} />
      <path d="M14 36 v5 M30 36 v5" {...S} stroke-width={3} />
      <ellipse cx={38} cy={26} rx={3.5} ry={4.5} fill="#f08aa1" {...S} />
      <path d="M17 18 l-2 -6 l6 3" fill="#f08aa1" {...S} />
      <rect x={20} y={14} width={8} height={3} rx={1} fill={P.ink} />
      <circle cx={31} cy={23} r={1.6} fill={P.ink} />
    </g>
  ),
  loan: () => (
    <g>
      <rect x={6} y={14} width={36} height={22} rx={3} fill="#9ed48a" {...S} />
      <circle cx={24} cy={25} r={6} fill="#c9ecb9" {...S} />
      <path d="M11 19 h4 M33 31 h4" {...S} />
      <path d="M38 8 l4 4 l-4 4" fill="none" {...S} />
    </g>
  ),
  water: () => (
    <g>
      <path d="M10 22 h22 l-2 18 h-18z" fill="#8fb7c9" {...S} />
      <path d="M32 26 L42 16" {...S} stroke-width={4} />
      <path d="M32 26 L42 16" stroke="#8fb7c9" stroke-width={1.8} stroke-linecap="round" />
      <path d="M14 22 Q21 12 28 22" fill="none" {...S} />
      {[[42, 22], [45, 28], [40, 30]].map(([x, y]) => <circle cx={x} cy={y} r={1.8} fill={P.water} />)}
    </g>
  ),
  fertilizer: () => (
    <g>
      <path d="M12 12 h24 l3 28 h-30z" fill="#e8d6a8" {...S} />
      <path d="M12 12 l3 -4 h18 l3 4" fill="#d6bf86" {...S} />
      <ellipse cx={18} cy={26} rx={4} ry={2.5} fill={P.leaf} {...S} transform="rotate(-30 18 26)" />
      <ellipse cx={26} cy={24} rx={4} ry={2.5} fill={P.leafLight} {...S} transform="rotate(30 26 24)" />
      <path d="M22 32 v-6" {...S} stroke={P.stem} />
    </g>
  ),
  mulch: () => (
    <g>
      <path d="M6 36 Q24 24 42 36 L42 40 H6z" fill={P.wheat} {...S} />
      {[10, 16, 22, 28, 34].map((x, i) => <path d={`M${x} 36 l${i % 2 ? 4 : -3} -8`} {...S} stroke={P.wheatDark} />)}
    </g>
  ),
  care: () => (
    <g>
      <path d="M8 40 Q24 32 40 40 V43 H8z" fill={P.soil} {...S} />
      <path d="M22 38 V24" {...S} stroke={P.stem} stroke-width={3} />
      <ellipse cx={16} cy={24} rx={7} ry={4} fill={P.leaf} {...S} transform="rotate(-25 16 24)" />
      <ellipse cx={28} cy={20} rx={7} ry={4} fill={P.leafLight} {...S} transform="rotate(25 28 20)" />
      <circle cx={36} cy={11} r={7} fill={P.gold} {...S} />
      <path d="M36 7.5 v7 M32.5 11 h7" {...S} stroke-width={2.4} />
    </g>
  ),
  weeding: () => (
    <g>
      <path d="M4 40 Q20 34 36 40 V43 H4z" fill={P.soil} {...S} />
      <path d="M11 33 l-5 -11 l7 6 l1 -10 l4 10 l6 -7 l-3 12z" fill={P.grassDark} {...S} />
      <path d="M14 33 v6 M12 35 l-2 5 M17 35 l2 5" {...S} stroke={P.woodDark} stroke-width={1.8} />
      <path d="M43 5 L28 30" {...S} stroke-width={4} stroke={P.woodDark} />
      <path d="M23 26 l11 6 l-3 6 l-11 -6z" fill={P.stone} {...S} />
    </g>
  ),
  early: () => (
    <g>
      <path d="M8 22 h32 l-4 18 h-24z" fill={P.woodLight} {...S} />
      <path d="M14 22 Q24 6 34 22" fill="none" {...S} stroke-width={3} />
      <circle cx={19} cy={20} r={5} fill={P.red} {...S} />
      <circle cx={29} cy={19} r={5} fill={P.pumpkin} {...S} />
      <path d="M12 30 h24" {...S} stroke={P.woodDark} />
    </g>
  ),
  helpers: () => (
    <g>
      <circle cx={17} cy={16} r={6} fill="#f2c7a1" {...S} />
      <circle cx={31} cy={16} r={6} fill="#e3a77b" {...S} />
      <path d="M7 40 c0 -10 6 -14 10 -14 s10 4 10 14z" fill="#7aa7d9" {...S} />
      <path d="M21 40 c0 -10 6 -14 10 -14 s10 4 10 14z" fill={P.leaf} {...S} />
    </g>
  ),
  sidejob: () => (
    <g>
      <path d="M12 38 L30 20" {...S} stroke-width={4} stroke={P.woodDark} />
      <rect x={26} y={8} width={14} height={9} rx={2} fill={P.stone} {...S} transform="rotate(45 33 12.5)" />
      <circle cx={14} cy={18} r={8} fill={P.gold} {...S} />
      <path d="M14 14 v8 M11 18 h6" {...S} />
    </g>
  ),
  lock: () => (
    <g>
      <rect x={12} y={22} width={24} height={18} rx={3} fill={P.gold} {...S} />
      <path d="M17 22 v-6 a7 7 0 0 1 14 0 v6" fill="none" {...S} stroke-width={3} />
    </g>
  ),
  star: () => <path d="M24 6 l5 11 l12 1 l-9 8 l3 12 l-11 -6 l-11 6 l3 -12 l-9 -8 l12 -1z" fill={P.gold} {...S} />,
  chart: () => (
    <g>
      <rect x={6} y={8} width={36} height={32} rx={3} fill={P.parchment} {...S} />
      <path d="M10 32 L18 24 L24 28 L32 16 L38 20" fill="none" {...S} stroke={P.red} stroke-width={3} />
    </g>
  ),
  team: () => (
    <g>
      <circle cx={24} cy={15} r={7} fill="#f2c7a1" {...S} />
      <path d="M11 41 c0 -12 7 -16 13 -16 s13 4 13 16z" fill={P.wood} {...S} />
    </g>
  ),
  sensor: () => (
    <g>
      <path d="M24 42 V20" {...S} stroke-width={3} stroke={P.woodDark} />
      <circle cx={24} cy={16} r={10} fill={P.parchment} {...S} />
      <path d="M24 16 l5 -5" {...S} stroke={P.red} />
      <path d="M8 42 h32" {...S} />
    </g>
  ),
  drone: () => (
    <g>
      <rect x={16} y={20} width={16} height={9} rx={3} fill="#cfd8dc" {...S} />
      <path d="M16 22 L8 16 M32 22 L40 16 M16 27 L8 33 M32 27 L40 33" {...S} />
      {[[8, 16], [40, 16], [8, 33], [40, 33]].map(([x, y]) => <ellipse cx={x} cy={y} rx={6} ry={2} fill="#90a4ae" {...S} />)}
      <circle cx={24} cy={30} r={2.5} fill={P.red} {...S} stroke-width={1.2} />
    </g>
  ),
  elevator: () => (
    <g>
      <rect x={10} y={16} width={14} height={26} fill="#cfd8dc" {...S} />
      <rect x={24} y={12} width={14} height={30} fill="#b0bec5" {...S} />
      <path d="M10 16 Q17 8 24 16 M24 12 Q31 4 38 12" fill="#90a4ae" {...S} />
      <path d="M14 24 h6 M28 22 h6 M28 30 h6" {...S} stroke={P.inkSoft} />
    </g>
  ),
  seeder: () => (
    <g>
      <path d="M8 18 h24 l-4 12 h-16z" fill={P.red} {...S} />
      <circle cx={14} cy={36} r={5} fill={P.stone} {...S} />
      <circle cx={28} cy={36} r={5} fill={P.stone} {...S} />
      <path d="M32 22 L42 14" {...S} stroke-width={3} />
      {[12, 18, 24].map((x) => <circle cx={x} cy={14} r={2} fill={P.wheat} {...S} stroke-width={1.2} />)}
    </g>
  ),
  tractor: () => (
    <g>
      <path d="M8 30 V20 h14 l4 -8 h8 v18z" fill={P.red} {...S} />
      <rect x={26} y={14} width={7} height={8} fill={P.sky} {...S} stroke-width={1.6} />
      <circle cx={30} cy={34} r={8} fill="#5d5d5d" {...S} />
      <circle cx={30} cy={34} r={3} fill={P.stone} />
      <circle cx={12} cy={36} r={5} fill="#5d5d5d" {...S} />
      <path d="M12 20 V12" {...S} stroke-width={3} />
    </g>
  ),
  sprinkler: () => (
    <g>
      <path d="M24 42 V22" {...S} stroke-width={3} stroke="#78909c" />
      <path d="M14 22 h20" {...S} stroke-width={3} stroke="#78909c" />
      {[[10, 14], [16, 9], [24, 7], [32, 9], [38, 14]].map(([x, y]) => <circle cx={x} cy={y} r={2.2} fill={P.water} {...S} stroke-width={1.2} />)}
      <path d="M8 42 h32" {...S} />
    </g>
  ),
  greenhouse: () => (
    <g>
      <path d="M6 40 V22 Q24 4 42 22 V40z" fill="#c8ecff" {...S} />
      <path d="M24 9 V40 M6 26 H42 M14 14 V40 M34 14 V40" {...S} stroke={P.inkSoft} stroke-width={1.6} />
      <path d="M18 38 v-6 M28 38 v-8" {...S} stroke={P.stem} stroke-width={2.4} />
    </g>
  ),
  hive: () => (
    <g>
      <path d="M10 18 h28 l-2 -8 h-24z" fill={P.woodDark} {...S} />
      <rect x={10} y={18} width={28} height={8} fill={P.woodLight} {...S} />
      <rect x={10} y={26} width={28} height={8} fill={P.wood} {...S} />
      <rect x={10} y={34} width={28} height={7} fill={P.woodLight} {...S} />
      <rect x={21} y={29} width={6} height={3} rx={1} fill={P.ink} />
      <ellipse cx={40} cy={12} rx={3} ry={2.2} fill={P.flowerYellow} {...S} stroke-width={1.2} />
    </g>
  ),
  drip: () => (
    <g>
      <path d="M4 20 H44" {...S} stroke-width={4} stroke="#455a64" />
      <path d="M4 20 H44" stroke="#78909c" stroke-width={2} />
      {[12, 24, 36].map((x) => <path d={`M${x} 24 C${x + 3} 30 ${x + 3} 33 ${x} 34 C${x - 3} 33 ${x - 3} 30 ${x} 24z`} fill={P.water} {...S} stroke-width={1.4} />)}
      <path d="M4 40 Q24 34 44 40" fill="none" {...S} stroke={P.soil} />
    </g>
  ),
  // ---- rules 3: periods, threats, market windows ----
  sun: () => (
    <g>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <path d="M24 5 V11" transform={`rotate(${a} 24 24)`} {...S} />)}
      <circle cx={24} cy={24} r={9} fill={P.gold} {...S} />
    </g>
  ),
  rain: () => (
    <g>
      <path d="M12 26 Q6 26 6 20 Q6 14 13 14 Q15 7 23 7 Q31 7 33 14 Q42 13 42 20 Q42 26 35 26z" fill="#e8f2f8" {...S} />
      {[[15, 32], [24, 35], [33, 32]].map(([x, y]) => <path d={`M${x} ${y} l-2 6`} stroke={P.waterDark} stroke-width={2.6} stroke-linecap="round" />)}
    </g>
  ),
  warm: () => (
    <g>
      <rect x={20} y={6} width={8} height={26} rx={4} fill="#fffaf0" {...S} />
      <circle cx={24} cy={36} r={7} fill={P.red} {...S} />
      <path d="M24 30 V16" stroke={P.red} stroke-width={3.4} stroke-linecap="round" />
      <path d="M33 12 q4 3 0 6 q-4 3 0 6 M39 14 q3 2 0 4" stroke={P.pumpkin} stroke-width={1.8} fill="none" stroke-linecap="round" />
    </g>
  ),
  hail: () => (
    <g>
      <path d="M12 24 Q6 24 6 18 Q6 12 13 12 Q15 5 23 5 Q31 5 33 12 Q42 11 42 18 Q42 24 35 24z" fill="#cfd8e0" {...S} />
      {[[14, 32], [24, 36], [34, 31], [19, 41], [30, 42]].map(([x, y]) => <circle cx={x} cy={y} r={3} fill="#fff" stroke={P.ink} stroke-width={1.4} />)}
    </g>
  ),
  frost: () => (
    <g stroke="#3f7fbf" stroke-width={2.6} stroke-linecap="round" fill="none">
      {[0, 60, 120].map((a) => <path d="M24 6 V42 M19 10 L24 15 L29 10 M19 38 L24 33 L29 38" transform={`rotate(${a} 24 24)`} />)}
    </g>
  ),
  flood: () => (
    <g>
      <path d="M4 22 q5 -5 10 0 t10 0 t10 0 t10 0" stroke={P.waterDark} stroke-width={3} fill="none" stroke-linecap="round" />
      <path d="M4 31 q5 -5 10 0 t10 0 t10 0 t10 0" stroke={P.water} stroke-width={3} fill="none" stroke-linecap="round" />
      <path d="M4 40 q5 -5 10 0 t10 0 t10 0 t10 0" stroke={P.waterDark} stroke-width={3} fill="none" stroke-linecap="round" />
      <path d="M24 6 v10 M20 12 l4 4 l4 -4" {...S} fill="none" />
    </g>
  ),
  // a card going down onto the discard pile
  discard: () => (
    <g>
      <rect x={8} y={30} width={32} height={12} rx={3} fill="#d8c7a4" {...S} />
      <rect x={15} y={4} width={18} height={24} rx={3} fill="#fffaf0" {...S} transform="rotate(14 24 16)" />
      <path d="M24 22 v8 M20 26 l4 4 l4 -4" stroke={P.red} stroke-width={2.6} fill="none" stroke-linecap="round" stroke-linejoin="round" />
    </g>
  ),
  beetle: () => (
    <g>
      <path d="M17 14 l-5 -5 M31 14 l5 -5 M13 24 h-6 M35 24 h6 M14 33 l-5 4 M34 33 l5 4" {...S} />
      <ellipse cx={24} cy={27} rx={11} ry={13} fill="#f2c94c" {...S} />
      <path d="M24 14 V40 M18 18 V36 M30 18 V36" stroke={P.ink} stroke-width={2} />
      <circle cx={24} cy={13} r={5} fill={P.pumpkinDark} {...S} />
    </g>
  ),
  locust: () => (
    <g>
      <path d="M10 30 Q20 18 36 20 Q42 22 40 27 Q36 31 22 31z" fill="#8fbf4a" {...S} />
      <path d="M14 29 L8 40 M24 31 L20 41 M28 26 L40 40 L44 36" {...S} fill="none" />
      <circle cx={37} cy={22} r={2} fill={P.ink} />
      <path d="M40 19 Q44 10 46 8" {...S} fill="none" />
    </g>
  ),
  weeds: () => (
    <g>
      {[[14, 40], [24, 40], [34, 40]].map(([x, y], i) => (
        <path d={`M${x} ${y} C${x - 8} ${y - 6} ${x - 10} ${y - 16} ${x - 8} ${y - 20} C${x - 4} ${y - 14} ${x - 1} ${y - 8} ${x} ${y} C${x + 2} ${y - 12} ${x + 6} ${y - 18} ${x + 10} ${y - 20} C${x + 10} ${y - 10} ${x + 6} ${y - 4} ${x} ${y}z`} fill={i % 2 ? '#6aa843' : '#86c94e'} {...S} stroke-width={1.6} />
      ))}
    </g>
  ),
  up: () => <path d="M24 6 L40 24 H30 V42 H18 V24 H8z" fill="#7cc35a" {...S} />,
  down: () => <path d="M24 42 L40 24 H30 V6 H18 V24 H8z" fill="#e2735f" {...S} />,
  seed: () => (
    <g>
      <rect x={10} y={8} width={28} height={34} rx={3} fill={P.parchment} {...S} />
      <path d="M17 30 q7 -10 14 0 q-7 8 -14 0z" fill={P.leaf} {...S} stroke-width={1.6} />
      <path d="M14 15 h20" {...S} />
    </g>
  ),
  hand: () => (
    <g>
      <path d="M12 30 V16 q0 -3 3 -3 q3 0 3 3 V12 q0 -3 3 -3 q3 0 3 3 v-1 q0 -3 3 -3 q3 0 3 3 v3 q0 -3 3 -3 q3 0 3 3 V30 q0 10 -12 10 q-12 0 -15 -10z" fill="#f0c4a0" {...S} />
    </g>
  ),
  crow: () => (
    <g>
      <path d="M8 34 Q14 22 28 20 Q38 19 40 26 Q38 33 26 34z" fill="#9c9da4" {...S} />
      <path d="M8 34 L2 38 L4 30z" fill="#2a2a30" {...S} />
      <path d="M12 30 Q22 22 34 24 Q26 30 16 32z" fill="#2a2a30" />
      <path d="M30 22 Q32 12 39 12 Q45 13 44 19 Q42 23 36 23z" fill="#2a2a30" {...S} />
      <path d="M43 15 L48 17 L43 19z" fill="#3a3a42" stroke={P.ink} stroke-width={1.2} />
      <circle cx={39} cy={16} r={1.3} fill="#d99a2e" />
    </g>
  ),
  scarecrow: () => (
    <g>
      <path d="M24 44 V10 M8 22 H40" stroke={P.woodDark} stroke-width={3.4} stroke-linecap="round" />
      <path d="M12 20 Q24 16 36 20 L33 34 Q24 36 15 34z" fill="#c9774a" {...S} />
      <circle cx={24} cy={12} r={6} fill="#e8d3a3" {...S} />
      <path d="M14 8 Q24 3 34 8z" fill={P.wheat} {...S} />
    </g>
  ),
  guard: () => (
    <g>
      <path d="M24 5 L39 11 V23 Q39 36 24 43 Q9 36 9 23 V11z" fill="#bfe0f2" {...S} />
      <path d="M24 34 V22 M24 26 Q18 25 17 19 Q22 19 24 24 M24 24 Q28 18 32 18 Q31 24 24 25" stroke={P.stem} stroke-width={2} fill={P.leafLight} stroke-linejoin="round" />
    </g>
  ),
  bee: () => (
    <g>
      <ellipse cx={24} cy={26} rx={11} ry={8} fill={P.flowerYellow} {...S} />
      <path d="M20 19 v14 M27 19 v14" {...S} stroke-width={3} />
      <ellipse cx={20} cy={15} rx={6} ry={4} fill="#e3f6ff" {...S} stroke-width={1.6} />
      <ellipse cx={30} cy={15} rx={6} ry={4} fill="#e3f6ff" {...S} stroke-width={1.6} />
    </g>
  ),
  seeds: () => (
    <g>
      <rect x={10} y={8} width={28} height={34} rx={3} fill={P.parchment} {...S} />
      <rect x={10} y={8} width={28} height={10} rx={3} fill={P.leaf} {...S} />
      <circle cx={24} cy={30} r={7} fill={P.red} {...S} />
    </g>
  ),
};

Object.assign(icons, moreIcons);
icons.fire = () => <FireIcon />;

export function Icon({ name, size = 22, label }: { name: string; size?: number; label?: string }) {
  const draw = icons[name] ?? icons.star;
  return <Svg size={size} label={label}>{draw()}</Svg>;
}
