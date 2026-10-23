// The selection lab, before and after it is built. The blueprint draws the very same desk the player
// will get: a tray of seedlings, a magnifier on a stand, flasks. viewBox 0 0 320 150, desk top at y=96.
import { CropSprite } from './crops';
import type { CropId } from '../engine/data';
const INK = '#3f2a1d';

function Sprout({ x, crop, k = 1, stage = 1 }: { x: number; crop: CropId; k?: number; stage?: number }) {
  return (
    <svg x={x - 22 * k} y={98 - 40 * k} width={44 * k} height={40 * k} viewBox="6 30 88 80" overflow="visible">
      <CropSprite id={crop} stage={stage} />
    </svg>
  );
}

export function LabDesk({ level, busy }: { level: number; busy: boolean }) {
  return (
    <svg viewBox="0 0 320 150" class="lab-scene lab-desk" aria-hidden="true">
      <defs>
        <linearGradient id="lab-wall" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f6e7c8" /><stop offset="1" stop-color="#ead2a4" /></linearGradient>
        <linearGradient id="lab-sun" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#fff6d8" stop-opacity=".85" /><stop offset="1" stop-color="#fff6d8" stop-opacity="0" /></linearGradient>
        <radialGradient id="lab-glass" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff" stop-opacity=".9" /><stop offset="1" stop-color="#cfeaf7" stop-opacity=".35" /></radialGradient>
      </defs>
      <rect width={320} height={150} fill="url(#lab-wall)" />
      <path d="M86 18 L170 96 H120 L40 70 Z" fill="url(#lab-sun)" />
      {/* window */}
      <g stroke={INK} stroke-width={2} stroke-linejoin="round">
        <rect x={14} y={12} width={72} height={58} rx={4} fill="#f4ead2" />
        <rect x={20} y={18} width={60} height={46} fill="#cdeaf6" />
        <path d="M20 52 Q34 44 48 50 Q62 42 80 48 V64 H20 Z" fill="#a7d27a" stroke="none" />
        <path d="M50 18 V64 M20 40 H80" stroke="#f4ead2" stroke-width={4} />
        <path d="M50 18 V64 M20 40 H80" stroke={INK} stroke-width={1.1} />
        <rect x={20} y={18} width={60} height={46} fill="none" />
        <rect x={10} y={68} width={80} height={6} rx={2} fill="#b27947" />
      </g>
      {/* shelf with jars of seeds */}
      <g stroke={INK} stroke-width={1.8} stroke-linejoin="round">
        <rect x={232} y={36} width={80} height={6} rx={2} fill="#9a6438" />
        <path d="M240 42 V50 M304 42 V50" stroke-width={2.4} />
        <g transform="translate(238 14)"><rect width={16} height={22} rx={3} fill="#e9f7ff" /><rect x={1.5} y={9} width={13} height={11.5} rx={2.4} fill="#e9c45c" stroke="none" /><rect x={-1} y={-3} width={18} height={5} rx={1.6} fill="#c9a24a" /></g>
        <g transform="translate(258 18)"><rect width={14} height={18} rx={3} fill="#e9f7ff" /><rect x={1.5} y={8} width={11} height={8.5} rx={2.2} fill="#7a5233" stroke="none" /><rect x={-1} y={-3} width={16} height={5} rx={1.6} fill="#c9a24a" /></g>
        <g transform="translate(276 16)"><rect width={10} height={20} fill="#3f7fbf" /><rect x={10} y={2} width={9} height={18} fill="#d6473a" /><rect x={19} y={-1} width={11} height={21} fill="#5aae3a" /><path d="M2 5 h6 M12 7 h5 M21 4 h7" stroke="#fff" stroke-width={1} /></g>
        {level >= 2 && <g transform="translate(222 22)"><path d="M0 4 H14 L12 14 H2 Z" fill="#c4661a" /><path d="M7 4 V-6 M7 -2 Q0 -8 -1 -2 Q3 1 7 -2 Z M7 -4 Q13 -10 15 -4 Q12 -1 7 -4 Z" fill="#7cbc4a" stroke-width={1.2} /></g>}
      </g>
      {/* the desk */}
      <g stroke={INK} stroke-width={2} stroke-linejoin="round">
        <path d="M6 96 H314 V104 H6 Z" fill="#c58c55" />
        <path d="M10 104 H310 V150 H10 Z" fill="#a8723f" />
        <path d="M108 110 H212 V140 H108 Z" fill="#b98351" stroke-width={1.6} />
        <circle cx={160} cy={125} r={3} fill="#e9c45c" stroke-width={1.3} />
        <path d="M20 112 H96 M224 112 H300" stroke="#8f5d34" stroke-width={1.4} />
      </g>
      {/* flasks and a rack of test tubes */}
      <g stroke={INK} stroke-width={2} stroke-linejoin="round" class={busy ? 'lab-busy' : ''}>
        <path d="M30 60 H42 V72 L54 92 Q56 96 51 96 H21 Q16 96 18 92 L30 72 Z" fill="#effaff" />
        <path d="M22 84 H50 L54 92 Q56 96 51 96 H21 Q16 96 18 92 Z" fill="#8fd16a" stroke="none" />
        <path d="M30 60 H42 V72 L54 92 Q56 96 51 96 H21 Q16 96 18 92 L30 72 Z" fill="none" />
        <path d="M27 58 H45" stroke-width={2.4} />
        <g class="lab-bubbles" fill="#e9ffd9" stroke="none"><circle cx={32} cy={88} r={1.8} /><circle cx={40} cy={86} r={1.3} /><circle cx={36} cy={91} r={1.1} /></g>
        <g transform="translate(62 70)">
          <rect x={0} y={14} width={40} height={6} rx={1.5} fill="#9a6438" />
          {[['#f4b83a', 6], ['#8fd16a', 18], ['#7fc2ea', 30]].map(([c, x]) => (
            <g><rect x={x as number - 3} y={0} width={7} height={24} rx={3.5} fill="#effaff" /><rect x={x as number - 3} y={12} width={7} height={12} rx={3.5} fill={c as string} stroke="none" /><rect x={x as number - 3} y={0} width={7} height={24} rx={3.5} fill="none" /></g>
          ))}
          <path d="M2 26 V20 M38 26 V20" stroke-width={2.4} />
        </g>
      </g>
      {/* the tray of seedlings — the heart of the lab */}
      <g stroke={INK} stroke-width={2} stroke-linejoin="round">
        <path d="M112 80 H208 L212 96 H108 Z" fill="#6c472d" />
        <path d="M108 92 H212 V98 H108 Z" fill="#b27947" />
        <path d="M134 82 V96 M160 82 V96 M186 82 V96" stroke="#5a3a24" stroke-width={1.4} />
      </g>
      <Sprout x={123} crop="bean" k={1.25} />
      <Sprout x={148} crop="radish" k={1.35} stage={2} />
      <Sprout x={174} crop="carrot" k={1.3} />
      <Sprout x={198} crop="cabbage" k={1.15} />
      {/* magnifier on a stand, looking at a leaf */}
      <g stroke={INK} stroke-width={2} stroke-linejoin="round" stroke-linecap="round">
        <ellipse cx={246} cy={95} rx={16} ry={4} fill="#8a8f96" />
        <path d="M248 94 V58 L228 56" fill="none" stroke={INK} stroke-width={5} />
        <path d="M248 94 V58 L228 56" fill="none" stroke="#b9bec4" stroke-width={2.4} />
        <circle cx={210} cy={56} r={19} fill="url(#lab-glass)" stroke-width={4.4} stroke="#6b5a48" />
        <circle cx={210} cy={56} r={19} fill="none" stroke={INK} stroke-width={1.4} />
        <path d="M202 64 Q200 50 214 46 Q220 58 202 64 Z" fill="#8cc95a" stroke-width={1.6} />
        <path d="M203 63 L214 48" fill="none" stroke="#4c8e2d" stroke-width={1.2} />
        <path d="M199 48 Q203 42 210 41" fill="none" stroke="#fff" stroke-width={2.6} opacity={.8} />
      </g>
      {/* an open notebook */}
      <g stroke={INK} stroke-width={1.6} stroke-linejoin="round">
        <path d="M262 96 L268 84 H288 L290 96 Z" fill="#fffaf0" />
        <path d="M290 96 L292 84 H312 L314 96 Z" fill="#fffaf0" />
        <path d="M272 88 h12 M271 91 h10 M295 88 h12 M294 91 h9" stroke="#a89880" stroke-width={1} />
        {level >= 3 && <g transform="translate(296 52)"><rect x={-8} y={30} width={18} height={5} rx={1} fill="#56616b" /><path d="M-2 30 V18 Q-2 10 6 8 L9 14 Q4 16 4 20 V30" fill="#7d8a96" /><rect x={3} y={-2} width={6} height={12} rx={2} fill="#3f4a54" transform="rotate(-25 6 4)" /></g>}
      </g>
    </svg>
  );
}

export function LabBlueprint() {
  const pen = '#8a6440', soft = '#b89a70';
  return (
    <svg viewBox="0 0 320 150" class="lab-scene blueprint" aria-hidden="true">
      <rect width={320} height={150} fill="#f8eed6" />
      {Array.from({ length: 33 }, (_, i) => <path d={`M${i * 10} 0 V150`} stroke="#e6d6b2" stroke-width={i % 5 ? .6 : 1.1} />)}
      {Array.from({ length: 16 }, (_, i) => <path d={`M0 ${i * 10} H320`} stroke="#e6d6b2" stroke-width={i % 5 ? .6 : 1.1} />)}
      <g fill="none" stroke={pen} stroke-width={1.8} stroke-linejoin="round" stroke-linecap="round">
        {/* desk */}
        <path d="M40 98 H280 V106 H40 Z M46 106 V132 M274 106 V132" />
        <path d="M120 112 H200 V128 H120 Z" stroke={soft} stroke-dasharray="4 3" />
        {/* tray with seedlings */}
        <path d="M112 84 H196 L200 98 H108 Z" />
        <path d="M124 84 V70 M124 76 q-8 -6 -10 0 q4 3 10 0 M124 74 q7 -8 11 -2 q-4 4 -11 2" />
        <path d="M148 84 V64 M148 72 q-9 -6 -11 1 q5 3 11 -1 M148 69 q8 -9 12 -2 q-5 4 -12 2" />
        <path d="M172 84 V68 M172 75 q-8 -6 -10 0 q4 3 10 0 M172 72 q7 -8 11 -2 q-4 4 -11 2" />
        {/* magnifier */}
        <path d="M232 98 V50 L214 48" />
        <ellipse cx={232} cy={98} rx={13} ry={3} />
        <circle cx={196} cy={46} r={16} />
        <circle cx={196} cy={46} r={12} stroke={soft} stroke-dasharray="3 3" />
        {/* flask */}
        <path d="M64 62 H74 V72 L84 94 Q85 98 81 98 H57 Q53 98 54 94 L64 72 Z" />
        <path d="M58 88 H80" stroke={soft} />
      </g>
      {/* dimensions and callouts */}
      <g stroke={soft} stroke-width={1} fill="none">
        <path d="M40 142 H280 M40 138 V146 M280 138 V146" />
        <path d="M44 142 l6 -3 v6 Z M276 142 l-6 -3 v6 Z" fill={soft} />
        <path d="M150 62 L156 28 H206" /><path d="M212 31 L236 16 H262" /><path d="M70 60 L58 28 H34" />
      </g>
      <g class="bp-text" fill={pen}>
        <text x={160} y={139} text-anchor="middle" class="bp-dim">1,6 м</text>
        <text x={158} y={25}>лоток ростков</text>
        <text x={238} y={13}>лупа</text>
        <text x={34} y={25}>колба</text>
      </g>
      <g transform="translate(262 112) rotate(-8)">
        <rect x={-30} y={-13} width={60} height={26} rx={4} fill="none" stroke="#c0563a" stroke-width={2} opacity={.75} />
        <text x={0} y={5} text-anchor="middle" class="bp-stamp" fill="#c0563a" opacity={.85}>ПРОЕКТ</text>
      </g>
    </svg>
  );
}
