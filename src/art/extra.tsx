import {Companion} from './companions';
import { Animal } from './animals';
// v4 art: new icons, the new crops, pets, little workers and the emblems of organisations.
// Same outline language as the rest: warm fills, soft dark-brown strokes.
import type { JSX } from 'preact';
import { P } from './palette';
import type { CropId, OrgId, PetId } from '../engine/data';

const S = { stroke: P.ink, 'stroke-width': 2.2, 'stroke-linejoin': 'round' as const, 'stroke-linecap': 'round' as const };
const SW = 1.8;

// ---------- icons (48×48) ----------
export const moreIcons: Record<string, () => JSX.Element> = {
  house: () => (
    <g>
      <path d="M8 22 L24 8 L40 22" fill="none" {...S} stroke-width={3} />
      <path d="M12 20 V40 H36 V20" fill={P.woodLight} {...S} />
      <path d="M8 22 L24 8 L40 22 L36 22 L24 12 L12 22z" fill={P.red} {...S} />
      <rect x={20} y={28} width={8} height={12} fill={P.woodDark} {...S} />
      <rect x={28} y={24} width={6} height={6} fill="#e3f6ff" {...S} stroke-width={1.6} />
    </g>
  ),
  flask: () => (
    <g>
      <path d="M19 6 H29 M21 6 V18 L10 38 Q8 42 13 42 H35 Q40 42 38 38 L27 18 V6" fill="#e9f7ff" {...S} />
      <path d="M14 32 Q24 28 34 32 L37 38 Q38 41 35 41 H13 Q10 41 11 38z" fill="#7ed36a" {...S} stroke-width={1.6} />
      <circle cx={20} cy={36} r={2} fill="#fff" />
      <circle cx={27} cy={34} r={1.4} fill="#fff" />
      <path d="M30 14 q4 -6 8 -2" fill="none" {...S} stroke={P.leaf} stroke-width={2.4} />
    </g>
  ),
  barn: () => (
    <g>
      <path d="M6 20 L24 8 L42 20 V42 H6z" fill={P.red} {...S} />
      <rect x={16} y={24} width={16} height={18} fill={P.redDark} {...S} />
      <path d="M16 24 L32 42 M32 24 L16 42" {...S} stroke="#f7e6bd" stroke-width={2} />
      <rect x={20} y={14} width={8} height={6} fill="#f7e6bd" {...S} stroke-width={1.6} />
    </g>
  ),
  orders: () => (
    <g>
      <rect x={10} y={6} width={28} height={36} rx={3} fill={P.parchment} {...S} />
      <path d="M16 16 H32 M16 22 H32 M16 28 H26" {...S} stroke-width={2} />
      <circle cx={33} cy={35} r={8} fill={P.leaf} {...S} />
      <path d="M29 35 l3 3 l5 -6" fill="none" {...S} stroke="#fff" stroke-width={2.4} />
    </g>
  ),
  field: () => (
    <g>
      <path d="M4 30 Q24 22 44 30 V42 H4z" fill={P.soil} {...S} />
      <path d="M10 34 Q24 28 38 34 M8 39 Q24 33 40 39" fill="none" stroke={P.soilLip} stroke-width={1.8} />
      <path d="M24 30 V16" {...S} stroke={P.stem} stroke-width={3} />
      <ellipse cx={18} cy={17} rx={7} ry={4} fill={P.leaf} {...S} transform="rotate(-25 18 17)" />
      <ellipse cx={30} cy={14} rx={7} ry={4} fill={P.leafLight} {...S} transform="rotate(25 30 14)" />
    </g>
  ),
  axe: () => (
    <g>
      <path d="M14 42 L32 14" {...S} stroke={P.woodDark} stroke-width={4} />
      <path d="M26 8 Q40 6 42 18 L32 22 Q30 14 26 8z" fill={P.stone} {...S} />
    </g>
  ),
  fast: () => (
    <g>
      <path d="M26 4 L12 26 H24 L20 44 L36 20 H24z" fill={P.gold} {...S} />
    </g>
  ),
  thermo: () => (
    <g>
      <rect x={19} y={4} width={10} height={30} rx={5} fill="#fff" {...S} />
      <circle cx={24} cy={36} r={8} fill={P.red} {...S} />
      <rect x={22} y={16} width={4} height={20} fill={P.red} />
      <path d="M31 10 h4 M31 16 h4 M31 22 h4" {...S} stroke-width={1.6} />
    </g>
  ),
  lens: () => (
    <g>
      <circle cx={20} cy={20} r={12} fill="#e3f6ff" {...S} />
      <path d="M12 20 a8 8 0 0 1 8 -8" fill="none" stroke="#fff" stroke-width={3} stroke-linecap="round" />
      <path d="M29 29 L41 41" {...S} stroke-width={5} />
    </g>
  ),
  build: () => (
    <g>
      <path d="M10 38 L28 20" {...S} stroke={P.woodDark} stroke-width={4.5} />
      <path d="M24 10 L38 10 L38 18 Q34 22 30 18 L26 22 L20 16z" fill={P.stone} {...S} />
    </g>
  ),
  cloud: () => (
    <g>
      <path d="M12 34 a8 8 0 0 1 2 -15.7 a11 11 0 0 1 21 -1 a7.5 7.5 0 0 1 1 16.7z" fill="#fff" {...S} />
    </g>
  ),
  snow: () => (
    <g stroke="#3f7fbf" stroke-width={2.6} stroke-linecap="round" fill="none">
      {[0, 60, 120].map((a) => <path d="M24 6 V42 M19 10 L24 15 L29 10 M19 38 L24 33 L29 38" transform={`rotate(${a} 24 24)`} />)}
    </g>
  ),
  shelter: () => (
    <g>
      <path d="M4 40 Q24 34 44 40" fill="none" {...S} stroke={P.soil} stroke-width={3} />
      <path d="M6 38 Q24 8 42 38" fill="rgba(240,248,255,0.85)" {...S} />
      <path d="M14 30 Q24 16 34 30" fill="none" stroke="#9cc6de" stroke-width={2} />
    </g>
  ),
  compost: () => (
    <g>
      <path d="M8 40 L12 22 H36 L40 40z" fill={P.soil} {...S} />
      <path d="M14 22 Q18 12 24 18 Q28 10 34 22" fill={P.leaf} {...S} />
      <path d="M18 32 q4 -3 8 0 t8 0" fill="none" stroke="#e7a7b4" stroke-width={2.6} stroke-linecap="round" />
    </g>
  ),
  bio: () => (
    <g>
      <path d="M18 6 H30 V14 L36 40 Q37 43 33 43 H15 Q11 43 12 40 L18 14z" fill="#f1ffe9" {...S} />
      <path d="M14 30 H34 L36 40 Q37 43 33 43 H15 Q11 43 12 40z" fill="#8fd16a" {...S} stroke-width={1.6} />
      <circle cx={21} cy={36} r={2.4} fill="#fff" />
      <circle cx={28} cy={34} r={1.6} fill="#fff" />
    </g>
  ),
  forage: () => (
    <g>
      <path d="M8 40 H40" {...S} stroke={P.grassDark} />
      <rect x={14} y={26} width={7} height={14} rx={3} fill="#f6ead2" {...S} />
      <path d="M6 28 Q17 12 29 28z" fill="#9a5a2a" {...S} />
      <rect x={30} y={30} width={5} height={10} rx={2.5} fill="#f6ead2" {...S} />
      <path d="M25 31 Q32 20 40 31z" fill={P.red} {...S} />
      <circle cx={30} cy={27} r={1.3} fill="#fff" />
      <circle cx={35} cy={28} r={1.3} fill="#fff" />
    </g>
  ),
  plow: () => (
    <g>
      <path d="M6 36 Q24 28 42 36 V42 H6z" fill={P.soil} {...S} />
      <path d="M12 10 L26 30 M20 30 H32 L36 24" {...S} stroke={P.stone} stroke-width={3.4} />
    </g>
  ),
  kids: () => (
    <g>
      <circle cx={16} cy={16} r={6} fill="#f3c9a5" {...S} />
      <path d="M8 40 Q8 26 16 26 Q24 26 24 40z" fill="#e0607a" {...S} />
      <circle cx={32} cy={20} r={5} fill="#e4b08a" {...S} />
      <path d="M25 40 Q25 29 32 29 Q39 29 39 40z" fill="#4f8ad1" {...S} />
      <path d="M10 12 Q16 6 22 12" fill="none" {...S} stroke="#9a4f27" stroke-width={3} />
    </g>
  ),
  steps: () => (
    <g fill={P.soilLip} opacity={0.85}>
      <ellipse cx={14} cy={36} rx={4} ry={6} transform="rotate(-15 14 36)" />
      <ellipse cx={24} cy={24} rx={4} ry={6} transform="rotate(10 24 24)" />
      <ellipse cx={32} cy={12} rx={4} ry={6} transform="rotate(-10 32 12)" />
    </g>
  ),
  trophy: () => (
    <g>
      <path d="M14 8 H34 V18 a10 10 0 0 1 -20 0z" fill={P.gold} {...S} />
      <path d="M14 11 H8 Q8 21 15 22 M34 11 H40 Q40 21 33 22" fill="none" {...S} />
      <path d="M24 28 V34 M16 40 H32 L30 34 H18z" fill={P.goldDark} {...S} />
    </g>
  ),
  cert: () => (
    <g>
      <rect x={6} y={10} width={36} height={26} rx={2} fill={P.parchment} {...S} />
      <path d="M12 18 H36 M12 23 H30" {...S} stroke-width={1.8} />
      <circle cx={33} cy={32} r={6} fill={P.red} {...S} />
      <path d="M30 37 L28 44 L33 41 L38 44 L36 37" fill={P.red} {...S} stroke-width={1.6} />
    </g>
  ),
  paw: () => (
    <g fill={P.woodDark}>
      <ellipse cx={24} cy={31} rx={9} ry={8} />
      <circle cx={13} cy={21} r={4} />
      <circle cx={20} cy={14} r={4} />
      <circle cx={28} cy={14} r={4} />
      <circle cx={35} cy={21} r={4} />
    </g>
  ),
  study: () => (
    <g>
      <path d="M4 18 L24 10 L44 18 L24 26z" fill="#3f6fb0" {...S} />
      <path d="M12 22 V32 Q24 38 36 32 V22" fill="#5b8ad0" {...S} />
      <path d="M40 19 V30" {...S} />
      <circle cx={40} cy={32} r={2.4} fill={P.gold} {...S} stroke-width={1.4} />
    </g>
  ),
  map: () => (
    <g>
      <path d="M6 12 L17 8 L31 12 L42 8 V36 L31 40 L17 36 L6 40z" fill={P.parchment} {...S} />
      <path d="M17 8 V36 M31 12 V40" {...S} stroke-width={1.6} />
      <path d="M10 28 Q16 22 22 26 T36 22" fill="none" stroke={P.water} stroke-width={2.4} />
      <circle cx={26} cy={18} r={3} fill={P.red} {...S} stroke-width={1.4} />
    </g>
  ),
  lock: () => (
    <g>
      <rect x={12} y={22} width={24} height={18} rx={3} fill={P.gold} {...S} />
      <path d="M17 22 V16 a7 7 0 0 1 14 0 V22" fill="none" {...S} />
    </g>
  ),
  heat: () => (
    <g>
      <circle cx={24} cy={24} r={10} fill={P.pumpkin} {...S} />
      {Array.from({ length: 8 }, (_, k) => <path d="M24 4 v6" {...S} stroke={P.red} transform={`rotate(${k * 45} 24 24)`} />)}
    </g>
  ),
  canal: () => (
    <g>
      <rect x={6} y={18} width={36} height={12} rx={3} fill="#4f9fcf" {...S} />
      <path d="M10 24 q4 -3 8 0 t8 0 t8 0" fill="none" stroke="#d6f1ff" stroke-width={2} stroke-linecap="round" />
      <path d="M6 18 H42 M6 30 H42" {...S} stroke={P.soilLip} />
    </g>
  ),
  // v3 · building materials and the season's fair
  logs: () => (
    <g>
      <path d="M8 36 H34 M8 26 H34" fill="none" {...S} />
      <rect x={8} y={28} width={26} height={10} rx={2} fill={P.woodLight} {...S} />
      <rect x={14} y={18} width={26} height={10} rx={2} fill={P.wood} {...S} />
      <circle cx={36} cy={33} r={5.2} fill="#e9c58f" {...S} />
      <circle cx={36} cy={33} r={2} fill="none" stroke={P.woodDark} stroke-width={1.4} />
      <circle cx={40} cy={23} r={5.2} fill="#e9c58f" {...S} />
      <circle cx={40} cy={23} r={2} fill="none" stroke={P.woodDark} stroke-width={1.4} />
    </g>
  ),
  bricks: () => (
    <g>
      {[[6, 30], [21, 30], [13, 20], [28, 20], [20, 10]].map(([x, y]) => <rect x={x} y={y} width={14} height={9} rx={1.4} fill="#c4664a" {...S} />)}
      <path d="M6 41 H42" {...S} />
    </g>
  ),
  glass: () => (
    <g>
      <rect x={10} y={10} width={22} height={30} rx={2} fill="#cfe8ef" {...S} transform="rotate(-8 21 25)" />
      <rect x={18} y={8} width={22} height={30} rx={2} fill="#e3f4f8" {...S} transform="rotate(6 29 23)" />
      <path d="M24 14 L30 20 M23 20 L27 24" stroke="#fff" stroke-width={2.2} stroke-linecap="round" />
    </g>
  ),
  fair: () => (
    <g>
      <path d="M8 18 L12 8 H36 L40 18z" fill={P.red} {...S} />
      <path d="M8 18 q4 5 8 0 q4 5 8 0 q4 5 8 0 q4 5 8 0" fill="#fff4dc" {...S} />
      <path d="M12 22 V40 M36 22 V40" {...S} stroke={P.woodDark} />
      <rect x={10} y={30} width={28} height={6} rx={1.5} fill={P.woodLight} {...S} />
      <circle cx={18} cy={28} r={2.6} fill={P.gold} {...S} stroke-width={1.4} />
      <circle cx={25} cy={28} r={2.6} fill="#9cc45e" {...S} stroke-width={1.4} />
      <circle cx={32} cy={28} r={2.6} fill="#e08a3a" {...S} stroke-width={1.4} />
    </g>
  ),
  eye: () => (
    <g>
      <path d="M4 24 Q24 6 44 24 Q24 42 4 24z" fill="#fffaf0" {...S} />
      <circle cx={24} cy={24} r={7} fill="#6b4a32" {...S} />
      <circle cx={26} cy={22} r={2} fill="#fff" />
    </g>
  ),
};

// ---------- new crops (100×100 tile, stem base at 50,80) ----------
const stem = (d: string, w = 3, c: string = P.stem) => <path d={d} stroke={c} stroke-width={w} fill="none" stroke-linecap="round" />;
const Mound = ({ wide = 15, fill = P.soilLip }: { wide?: number; fill?: string }) => <ellipse cx={50} cy={82} rx={wide} ry={4.5} fill={fill} opacity={0.55} />;
function Frond({ x, y, rot, len = 20, fill = P.leaf }: { x: number; y: number; rot: number; len?: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d={`M0 0 L${len} 0`} stroke={P.stem} stroke-width={2} />
      {[0.3, 0.55, 0.8].map((k) => (
        <g>
          <ellipse cx={len * k} cy={-3.2} rx={3.4} ry={2.2} fill={fill} stroke={P.ink} stroke-width={1.1} />
          <ellipse cx={len * k} cy={3.2} rx={3.4} ry={2.2} fill={fill} stroke={P.ink} stroke-width={1.1} />
        </g>
      ))}
    </g>
  );
}
function Tri({ x, y, r = 7, rot = 0, fill = P.leaf }: { x: number; y: number; r?: number; rot?: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      {[-35, 0, 35].map((a) => <ellipse cx={0} cy={-r} rx={r * 0.62} ry={r * 0.9} fill={fill} stroke={P.ink} stroke-width={1.4} transform={`rotate(${a})`} />)}
    </g>
  );
}

function Carrot({ stage }: { stage: number }) {
  const big = stage >= 2;
  return (
    <g>
      <Mound />
      {big && <path d="M42 74 Q50 98 58 74z" fill={P.pumpkin} stroke={P.ink} stroke-width={SW} />}
      {big && <path d="M45 80 h4 M47 86 h3" stroke={P.pumpkinDark} stroke-width={1.4} />}
      <Frond x={50} y={76} rot={-120} len={big ? 30 : 22} />
      <Frond x={50} y={76} rot={-90} len={big ? 34 : 24} fill={P.leafLight} />
      <Frond x={50} y={76} rot={-60} len={big ? 30 : 22} />
      {big && <Frond x={50} y={76} rot={-140} len={22} fill={P.leafLight} />}
      {big && <Frond x={50} y={76} rot={-40} len={22} fill={P.leafLight} />}
    </g>
  );
}
function Onion({ stage }: { stage: number }) {
  const big = stage >= 2;
  return (
    <g>
      <Mound />
      {big && (
        <g>
          <path d="M36 74 Q36 58 50 58 Q64 58 64 74 Q60 84 50 84 Q40 84 36 74z" fill="#d9a046" stroke={P.ink} stroke-width={SW} />
          <path d="M44 62 Q42 72 46 82 M56 62 Q58 72 54 82" stroke="#b07a2a" stroke-width={1.3} fill="none" />
        </g>
      )}
      {[-18, -6, 6, 18].map((dx, i) => (
        <path d={`M50 ${big ? 60 : 78} Q${50 + dx * 0.4} ${big ? 40 : 56} ${50 + dx} ${big ? 18 - (i % 2) * 4 : 34 - (i % 2) * 6}`} stroke={i % 2 ? P.leafLight : P.leaf} stroke-width={5} fill="none" stroke-linecap="round" />
      ))}
    </g>
  );
}
function Cabbage({ stage }: { stage: number }) {
  const big = stage >= 2;
  return (
    <g>
      <Mound wide={22} />
      {[-1, 1].map((d) => <ellipse cx={50 + d * 18} cy={70} rx={16} ry={10} fill="#7cb37a" stroke={P.ink} stroke-width={SW} transform={`rotate(${d * 20} ${50 + d * 18} 70)`} />)}
      <circle cx={50} cy={big ? 58 : 64} r={big ? 21 : 13} fill={big ? '#c9e8a8' : '#9fcf86'} stroke={P.ink} stroke-width={SW} />
      <path d={big ? 'M50 40 Q42 58 50 78 M38 52 Q48 58 46 74 M62 52 Q52 58 54 74' : 'M50 54 Q46 64 50 74'} stroke="#7fae64" stroke-width={1.6} fill="none" />
      {big && <path d="M30 60 Q34 42 50 38" stroke={P.ink} stroke-width={SW} fill="#a7d38d" />}
    </g>
  );
}
function Garlic({ stage }: { stage: number }) {
  const big = stage >= 2;
  return (
    <g>
      <Mound />
      {big && (
        <g>
          <path d="M38 76 Q38 62 50 60 Q62 62 62 76 Q56 84 50 84 Q44 84 38 76z" fill="#f6efe2" stroke={P.ink} stroke-width={SW} />
          <path d="M50 62 V82 M44 64 Q42 74 45 82 M56 64 Q58 74 55 82" stroke="#d9cbb3" stroke-width={1.3} fill="none" />
          {stem('M50 60 Q48 30 60 26 Q70 24 66 34', 2.4)}
          <ellipse cx={66} cy={36} rx={4} ry={6} fill="#e8eef0" stroke={P.ink} stroke-width={1.3} />
        </g>
      )}
      {[-24, -10, 10, 24].map((dx) => <path d={`M50 ${big ? 62 : 78} Q${50 + dx * 0.3} 50 ${50 + dx} ${big ? 30 : 46}`} stroke="#6aa65a" stroke-width={4} fill="none" stroke-linecap="round" />)}
    </g>
  );
}
function Rye({ stage }: { stage: number }) {
  const ripe = stage >= 2;
  const col = ripe ? '#d6bf7a' : '#7fae8a';
  return (
    <g>
      <Mound wide={18} />
      {[-12, 0, 12].map((dx, i) => (
        <g>
          {stem(`M${50 + dx} 80 Q${50 + dx * 1.1} 50 ${50 + dx * 1.3} ${18 + i * 3}`, 2.4, ripe ? '#b9a061' : '#5f9a6a')}
          {ripe || stage >= 1 ? (
            <g transform={`translate(${50 + dx * 1.3} ${20 + i * 3})`}>
              <ellipse rx={3.4} ry={9} fill={col} stroke={P.ink} stroke-width={1.3} />
              {[-6, -1, 4].map((y) => <path d={`M0 ${y} l-6 -8 M0 ${y} l6 -8`} stroke={ripe ? '#a88c45' : '#5f9a6a'} stroke-width={1} />)}
            </g>
          ) : null}
        </g>
      ))}
    </g>
  );
}
function Strawberry({ stage }: { stage: number }) {
  const ripe = stage >= 2;
  return (
    <g>
      <Mound wide={20} />
      <Tri x={38} y={66} r={9} rot={-30} />
      <Tri x={62} y={66} r={9} rot={30} fill={P.leafLight} />
      <Tri x={50} y={58} r={10} />
      {ripe ? (
        [[36, 76], [60, 78], [48, 80]].map(([x, y]) => (
          <g transform={`translate(${x} ${y})`}>
            <path d="M-7 -4 Q0 -8 7 -4 Q6 6 0 10 Q-6 6 -7 -4z" fill={P.red} stroke={P.ink} stroke-width={1.5} />
            <path d="M-5 -5 l3 -3 l2 3 l2 -3 l3 3" fill={P.leaf} stroke={P.ink} stroke-width={1} />
            {[[-2, 0], [2, 1], [0, 4]].map(([a, b]) => <circle cx={a} cy={b} r={0.9} fill="#ffe8a0" />)}
          </g>
        ))
      ) : (
        <g transform="translate(64 76)">
          {[0, 72, 144, 216, 288].map((a) => <ellipse rx={2.6} ry={4} cy={-4} fill="#fff" stroke={P.ink} stroke-width={0.8} transform={`rotate(${a})`} />)}
          <circle r={2} fill={P.flowerYellow} />
        </g>
      )}
    </g>
  );
}
function Watermelon({ stage }: { stage: number }) {
  const ripe = stage >= 2;
  return (
    <g>
      {stem('M20 78 Q40 66 50 74 Q62 82 82 70', 2.6)}
      {[[28, 70, -20], [50, 66, 0], [72, 70, 20]].map(([x, y, r]) => (
        <path transform={`translate(${x} ${y}) rotate(${r})`} d="M0 0 C-10 -2 -12 -14 -4 -16 C-2 -22 6 -22 6 -14 C14 -14 12 -2 0 0z" fill={P.leaf} stroke={P.ink} stroke-width={1.4} />
      ))}
      {ripe ? (
        <g>
          <ellipse cx={52} cy={74} rx={22} ry={13} fill="#3f8a3a" stroke={P.ink} stroke-width={SW} />
          {[-12, -4, 4, 12].map((dx) => <path d={`M${52 + dx} 62 Q${52 + dx * 1.2} 74 ${52 + dx} 86`} stroke="#22561f" stroke-width={2.4} fill="none" />)}
          <path d="M38 70 Q44 64 52 64" stroke="#8fd16a" stroke-width={2} fill="none" opacity={0.7} />
        </g>
      ) : (
        <circle cx={52} cy={76} r={6} fill="#6cb04f" stroke={P.ink} stroke-width={1.4} />
      )}
    </g>
  );
}
function Rice({ stage }: { stage: number }) {
  const ripe = stage >= 2;
  return (
    <g>
      <ellipse cx={50} cy={80} rx={30} ry={7} fill="#7cc0e6" opacity={0.8} />
      <path d="M30 80 q5 -2 10 0 M56 82 q5 -2 10 0" stroke="#e3f6ff" stroke-width={1.6} fill="none" />
      {[-14, -5, 5, 14].map((dx, i) => (
        <g>
          {stem(`M${50 + dx} 80 Q${50 + dx * 1.2} 54 ${50 + dx * 1.6} ${30 + (i % 2) * 6}`, 2.2, '#6fae4a')}
          {ripe && (
            <path d={`M${50 + dx * 1.6} ${30 + (i % 2) * 6} q${dx > 0 ? 8 : -8} 4 ${dx > 0 ? 10 : -10} 14`} stroke="#d9b85a" stroke-width={4} fill="none" stroke-linecap="round" stroke-dasharray="3 1.5" />
          )}
        </g>
      ))}
    </g>
  );
}
function Seabuckthorn({ stage }: { stage: number }) {
  const ripe = stage >= 2;
  return (
    <g>
      <Mound wide={18} />
      {stem('M50 80 V44 M50 62 L36 46 M50 56 L64 40 M50 48 L44 32', 3.2, '#8a6a4a')}
      {[[36, 46, -40], [64, 40, 40], [44, 32, -20], [50, 44, 10], [58, 52, 50], [40, 58, -60]].map(([x, y, r]) => (
        <ellipse cx={x} cy={y} rx={9} ry={2.6} fill="#a9c3a0" stroke={P.ink} stroke-width={1.1} transform={`rotate(${r} ${x} ${y})`} />
      ))}
      {ripe && [[44, 52], [47, 56], [55, 48], [58, 44], [40, 40], [53, 60], [60, 56]].map(([x, y]) => <circle cx={x} cy={y} r={3.2} fill="#f39a1f" stroke={P.ink} stroke-width={1} />)}
    </g>
  );
}
function Cranberry({ stage }: { stage: number }) {
  const ripe = stage >= 2;
  return (
    <g>
      <ellipse cx={50} cy={78} rx={30} ry={8} fill="#7f9a5a" opacity={0.8} />
      {stem('M24 76 Q38 66 50 74 Q62 82 76 72', 2, '#8a3f2a')}
      {[[30, 72], [40, 68], [58, 76], [68, 72], [48, 72]].map(([x, y]) => <ellipse cx={x} cy={y - 4} rx={3.4} ry={2} fill="#3f7a3a" stroke={P.ink} stroke-width={0.9} />)}
      {ripe && [[34, 76], [44, 78], [56, 80], [64, 76], [50, 70]].map(([x, y]) => <circle cx={x} cy={y} r={3.6} fill="#c0213a" stroke={P.ink} stroke-width={1.1} />)}
    </g>
  );
}
function Honey() {
  return (
    <g>
      <path d="M30 40 H70 V82 Q70 88 64 88 H36 Q30 88 30 82z" fill="#f4b83a" stroke={P.ink} stroke-width={2} />
      <rect x={28} y={30} width={44} height={12} rx={3} fill={P.red} stroke={P.ink} stroke-width={2} />
      <path d="M30 52 Q40 58 50 52 T70 52" stroke="#fff3c4" stroke-width={2.4} fill="none" />
      <rect x={38} y={60} width={24} height={14} rx={2} fill={P.parchment} stroke={P.ink} stroke-width={1.4} />
    </g>
  );
}
function Mushrooms() {
  return (
    <g>
      <rect x={34} y={58} width={12} height={24} rx={5} fill="#f6ead2" stroke={P.ink} stroke-width={1.8} />
      <path d="M22 60 Q40 30 58 60z" fill="#9a5a2a" stroke={P.ink} stroke-width={1.8} />
      <rect x={58} y={66} width={9} height={16} rx={4} fill="#f6ead2" stroke={P.ink} stroke-width={1.6} />
      <path d="M50 68 Q62 50 76 68z" fill={P.red} stroke={P.ink} stroke-width={1.6} />
      <circle cx={58} cy={62} r={1.8} fill="#fff" />
      <circle cx={66} cy={60} r={1.6} fill="#fff" />
      <path d="M18 84 H82" stroke={P.grassDark} stroke-width={3} stroke-linecap="round" />
    </g>
  );
}
export const NEW_CROPS: Partial<Record<CropId, (p: { stage: number }) => JSX.Element>> = {
  carrot: Carrot, onion: Onion, cabbage: Cabbage, garlic: Garlic, rye: Rye, strawberry: Strawberry,
  watermelon: Watermelon, rice: Rice, seabuckthorn: Seabuckthorn, cranberry: Cranberry, honey: () => <Honey />, mushrooms: () => <Mushrooms />,
};
export function NewSprout({ id }: { id: CropId }) {
  switch (id) {
    case 'carrot':
      return (
        <g>
          <Mound />
          <Frond x={50} y={78} rot={-110} len={14} />
          <Frond x={50} y={78} rot={-70} len={14} fill={P.leafLight} />
        </g>
      );
    case 'onion':
    case 'garlic':
      return (
        <g>
          <Mound />
          {[-6, 6].map((dx) => <path d={`M50 79 Q${50 + dx * 0.4} 64 ${50 + dx} 52`} stroke={id === 'onion' ? P.leaf : '#6aa65a'} stroke-width={4} fill="none" stroke-linecap="round" />)}
        </g>
      );
    case 'cabbage':
      return (
        <g>
          <Mound />
          {stem('M50 79 V66')}
          <ellipse cx={42} cy={64} rx={9} ry={6} fill="#8fc07c" stroke={P.ink} stroke-width={SW} transform="rotate(-20 42 64)" />
          <ellipse cx={58} cy={64} rx={9} ry={6} fill="#9fcf86" stroke={P.ink} stroke-width={SW} transform="rotate(20 58 64)" />
        </g>
      );
    case 'rye':
    case 'rice':
      return (
        <g>
          {id === 'rice' ? <ellipse cx={50} cy={80} rx={20} ry={5} fill="#7cc0e6" opacity={0.8} /> : <Mound />}
          {[-6, 0, 6].map((dx) => stem(`M50 80 Q${50 + dx * 0.6} 66 ${50 + dx * 1.5} 54`, 2.2, id === 'rye' ? '#5f9a6a' : '#6fae4a'))}
        </g>
      );
    case 'strawberry':
      return (
        <g>
          <Mound />
          <Tri x={50} y={70} r={7} />
        </g>
      );
    case 'watermelon':
      return (
        <g>
          <Mound />
          {stem('M50 79 V68')}
          <ellipse cx={42} cy={66} rx={8} ry={5} fill={P.leafLight} stroke={P.ink} stroke-width={SW} />
          <ellipse cx={58} cy={66} rx={8} ry={5} fill={P.leafLight} stroke={P.ink} stroke-width={SW} />
        </g>
      );
    case 'seabuckthorn':
      return (
        <g>
          <Mound />
          {stem('M50 80 V56 M50 66 L42 58', 2.6, '#8a6a4a')}
          <ellipse cx={42} cy={58} rx={6} ry={2} fill="#a9c3a0" stroke={P.ink} stroke-width={1} />
          <ellipse cx={52} cy={56} rx={6} ry={2} fill="#a9c3a0" stroke={P.ink} stroke-width={1} transform="rotate(-40 52 56)" />
        </g>
      );
    case 'cranberry':
      return (
        <g>
          <ellipse cx={50} cy={78} rx={20} ry={6} fill="#7f9a5a" opacity={0.8} />
          {stem('M38 76 Q50 68 62 76', 2, '#8a3f2a')}
          <ellipse cx={46} cy={70} rx={3} ry={1.8} fill="#3f7a3a" />
          <ellipse cx={56} cy={72} rx={3} ry={1.8} fill="#3f7a3a" />
        </g>
      );
    default:
      return (
        <g>
          <Mound />
          {stem('M50 79 V64')}
          <ellipse cx={44} cy={62} rx={7} ry={4} fill={P.leafLight} stroke={P.ink} stroke-width={SW} />
          <ellipse cx={56} cy={62} rx={7} ry={4} fill={P.leaf} stroke={P.ink} stroke-width={SW} />
        </g>
      );
  }
}

// ---------- pets (viewBox 0 0 60 60, feet at y≈54) ----------
export function Pet({ id, size = 48 }: { id: PetId; size?: number }) {
  if (id === 'cat' || id === 'dog') return <Companion id={id} size={size} />;
  return <Animal id={id} size={size} />;
}

// ---------- a little worker sitting at the table (viewBox 0 0 40 56) ----------
export function Worker({ shirt, hat, size = 40, away = false }: { shirt: string; hat?: string; size?: number; away?: boolean }) {
  return (
    <svg viewBox="0 0 40 56" width={size} height={size * 1.4} aria-hidden="true" class={`worker${away ? ' away' : ''}`}>
      <ellipse cx={20} cy={53} rx={12} ry={2.6} fill="rgba(0,0,0,0.14)" />
      <path d="M8 52 Q8 32 20 30 Q32 32 32 52z" fill={shirt} stroke={P.ink} stroke-width={1.8} />
      <path d="M12 52 V44 M28 52 V44" stroke={P.ink} stroke-width={1.6} />
      <circle cx={20} cy={20} r={10} fill="#f0c4a0" stroke={P.ink} stroke-width={1.8} />
      <circle cx={16.5} cy={20} r={1.3} fill={P.ink} />
      <circle cx={23.5} cy={20} r={1.3} fill={P.ink} />
      <path d="M17 25 q3 2 6 0" fill="none" stroke={P.ink} stroke-width={1.3} stroke-linecap="round" />
      {hat ? <path d="M9 16 Q10 6 20 6 Q30 6 31 16 Q20 12 9 16z" fill={hat} stroke={P.ink} stroke-width={1.6} /> : <path d="M10 18 Q11 8 20 8 Q29 8 30 18 Q24 12 10 18z" fill="#6a4a2e" stroke={P.ink} stroke-width={1.4} />}
    </svg>
  );
}

// ---------- organisation emblems (viewBox 0 0 48 48) ----------
const EMBLEM: Record<string, () => JSX.Element> = {
  sun: () => (
    <g>
      {Array.from({ length: 10 }, (_, k) => <path d="M24 6 v6" {...S} stroke={P.goldDark} transform={`rotate(${k * 36} 24 24)`} />)}
      <circle cx={24} cy={24} r={10} fill={P.gold} {...S} />
      <path d="M19 26 q5 4 10 0" fill="none" {...S} stroke-width={1.8} />
      <circle cx={20} cy={22} r={1.2} fill={P.ink} />
      <circle cx={28} cy={22} r={1.2} fill={P.ink} />
    </g>
  ),
  flag: () => (
    <g>
      <path d="M14 42 V8" {...S} stroke-width={3} />
      <path d="M15 9 H38 L33 16 L38 23 H15z" fill={P.red} {...S} />
      <path d="M8 42 H22" {...S} stroke-width={3} />
    </g>
  ),
  bread: () => (
    <g>
      <path d="M8 30 Q8 14 24 14 Q40 14 40 30 Q40 36 34 36 H14 Q8 36 8 30z" fill="#d9a046" {...S} />
      <path d="M16 20 l4 6 M24 18 l4 7 M32 20 l3 5" {...S} stroke="#a46f22" stroke-width={2} />
    </g>
  ),
  chef: () => (
    <g>
      <path d="M14 26 a7 7 0 0 1 1 -14 a9 9 0 0 1 18 0 a7 7 0 0 1 1 14z" fill="#fff" {...S} />
      <rect x={15} y={26} width={18} height={12} fill="#fff" {...S} />
      <path d="M15 32 H33" {...S} stroke-width={1.6} />
    </g>
  ),
  cap: () => <g transform="translate(0 4)">{moreIcons.study()}</g>,
  jar: () => (
    <g>
      <rect x={14} y={8} width={20} height={6} rx={2} fill={P.gold} {...S} />
      <path d="M14 14 H34 Q38 18 38 24 V38 Q38 42 34 42 H14 Q10 42 10 38 V24 Q10 18 14 14z" fill="#e3f6ff" {...S} />
      <circle cx={20} cy={30} r={5} fill={P.red} {...S} stroke-width={1.6} />
      <circle cx={29} cy={33} r={4} fill={P.red} {...S} stroke-width={1.6} />
    </g>
  ),
  rice: () => (
    <g>
      <path d="M8 34 Q24 44 40 34 Q40 26 24 26 Q8 26 8 34z" fill="#fff" {...S} />
      {[[16, 30], [22, 28], [28, 30], [33, 31], [20, 33], [27, 34]].map(([x, y]) => <ellipse cx={x} cy={y} rx={2.4} ry={1.3} fill="#f6efe2" stroke={P.ink} stroke-width={0.9} />)}
      <path d="M30 26 Q34 10 26 6" fill="none" stroke={P.wheatDark} stroke-width={2.4} />
    </g>
  ),
  bee: () => (
    <g>
      <ellipse cx={24} cy={26} rx={13} ry={10} fill={P.flowerYellow} {...S} />
      <path d="M19 17 V35 M27 16 V36" {...S} stroke-width={3} />
      <ellipse cx={18} cy={12} rx={7} ry={5} fill="#e3f6ff" {...S} stroke-width={1.6} />
      <ellipse cx={30} cy={12} rx={7} ry={5} fill="#e3f6ff" {...S} stroke-width={1.6} />
    </g>
  ),
  tent: () => (
    <g>
      <path d="M6 40 L24 8 L42 40z" fill="#3d7a4a" {...S} />
      <path d="M24 8 L18 40 H30z" fill="#2a5a34" {...S} />
      <path d="M4 40 H44" {...S} />
    </g>
  ),
  tree: () => (
    <g>
      <path d="M24 4 L36 22 H30 L40 34 H8 L18 22 H12z" fill="#3e7a2a" {...S} />
      <rect x={21} y={34} width={6} height={8} fill={P.woodDark} {...S} />
    </g>
  ),
  cross: () => (
    <g>
      <circle cx={24} cy={24} r={17} fill="#fff" {...S} />
      <path d="M20 12 H28 V20 H36 V28 H28 V36 H20 V28 H12 V20 H20z" fill="#5aa0a8" {...S} stroke-width={1.6} />
    </g>
  ),
};
export function Emblem({ id, color, size = 44 }: { id: string; color: string; size?: number }) {
  const draw = EMBLEM[id] ?? EMBLEM.flag;
  return (
    <svg viewBox="0 0 56 56" width={size} height={size} aria-hidden="true" class="emblem">
      <circle cx={28} cy={28} r={26} fill={color} stroke={P.ink} stroke-width={2.4} />
      <circle cx={28} cy={28} r={21} fill="#fff8e6" stroke={P.ink} stroke-width={1.4} opacity={0.95} />
      <g transform="translate(4 4)">{draw()}</g>
    </svg>
  );
}
export const orgEmblem = (id: OrgId, emblem: string, color: string, size?: number) => <Emblem id={emblem} color={color} size={size} />;
