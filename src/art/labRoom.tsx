// The selection lab as a working room, big enough to read (viewBox 0 0 360 210, desk top at y = 150).
// It is functional: every lab table is a station on the desk. A project shows its seedling under a glass
// cloche with a paper tag — what is being done and how many weeks are left, with a progress bar; a free
// table is an empty tray with «свободно». Лёва, the lab's breeder, works behind the desk.
import type { ComponentChildren } from 'preact';
import { CropSprite } from './crops';
import type { CropId } from '../engine/data';
import { Scientist } from './scientist';
const INK = '#3f2a1d';

export interface LabStation {
  key: string;
  crop?: CropId;          // the seedling under the cloche (none for a free table or the bio project)
  bio?: boolean;
  label: string;          // «+1 клетка», «скороспелость», «сорт», «биопрепарат», «свободно»
  weeks?: number;         // weeks left
  progress?: number;      // 0..1
  onOpen?: () => void;
  aria: string;
}

function Station({ x, st, compact }: { x: number; st: LabStation; compact: boolean }) {
  const free = !st.crop && !st.bio;
  // Three trays are 61 units apart. Their labels and transparent touch areas
  // must fit that pitch; the crop, cloche and room keep their original scale.
  const width = compact ? 56 : 70;
  const label = compact
    ? st.bio ? 'Био ×2' : free ? 'свободно' : st.label === '+1 клетка' ? '+1 кл.' : st.label === 'новый сорт' ? 'сорт' : 'свойство'
    : st.bio ? 'Био ×2' : st.label;
  return (
    <g class={`lab-station${free ? ' free' : ' busy'}`} transform={`translate(${x} 0)`} role="button" tabindex={0} aria-label={st.aria}
      onClick={st.onOpen} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && st.onOpen) { e.preventDefault(); st.onOpen(); } }}>
      <rect class="ls-hit" x={-width / 2} y={86} width={width} height={108} fill="transparent" />
      {/* tray on the desk */}
      <path d="M-28 140 H28 L31 151 H-31 Z" fill="#6c472d" stroke={INK} stroke-width={1.8} />
      <path d="M-31 148 H31 V153 H-31 Z" fill="#b27947" stroke={INK} stroke-width={1.6} />
      {free ? (
        <g>
          <path d="M-20 142 q6 -3 12 0 q6 -3 12 0 q6 -3 12 0" fill="none" stroke="#4a301c" stroke-width={2.2} />
          <g transform="translate(14 126) rotate(8)">
            <rect x={-7} y={-9} width={14} height={18} rx={1.6} fill="#f4e6c2" stroke={INK} stroke-width={1.2} />
            <path d="M-4 -4 h8 M-4 -1 h6" stroke="#b9a07a" stroke-width={.9} />
            <circle cx={0} cy={4} r={2.4} fill="#c49a5a" stroke={INK} stroke-width={.8} />
          </g>
        </g>
      ) : (
        <g>
          <svg x={-24} y={96} width={48} height={48} viewBox="6 20 88 88" overflow="visible">
            {st.crop ? <CropSprite id={st.crop} stage={2} /> : <g><ellipse cx={50} cy={92} rx={24} ry={8} fill="#5a3d26" /><path d="M36 92 q14 -24 28 0" fill="#8fd16a" stroke={INK} stroke-width={2} /></g>}
          </svg>
          {/* the glass cloche */}
          <path class="ls-cloche" d="M-24 141 V118 Q-24 92 0 92 Q24 92 24 118 V141" fill="rgba(216,238,247,.32)" stroke="#6f8f9c" stroke-width={2.2} />
          <path d="M-24 141 V118 Q-24 92 0 92 Q24 92 24 118 V141" fill="none" stroke={INK} stroke-width={.9} opacity={.6} />
          <path d="M-16 120 Q-16 102 -4 99" fill="none" stroke="#fff" stroke-width={2.6} opacity={.75} />
          <circle cx={0} cy={89} r={3.2} fill="#cfd8dc" stroke={INK} stroke-width={1.2} />
        </g>
      )}
      {/* the paper tag hanging from the desk edge: what and how long */}
      <g class="ls-tag" transform="translate(0 157)">
        <path d="M-3 -3 V1 M3 -3 V1" stroke="#8a8f96" stroke-width={1.2} />
        <rect x={-width / 2} y={0} width={width} height={st.weeks !== undefined ? 33 : 19} rx={3} fill={free ? '#f4ead2' : '#fffaf0'} stroke={INK} stroke-width={1.3} />
        <text x={0} y={13.6} text-anchor="middle" class="ls-label">{label}</text>
        {st.weeks !== undefined && <>
          <text x={0} y={24.6} text-anchor="middle" class="ls-weeks">ещё {st.weeks} нед.</text>
          <rect x={-(width - 14) / 2} y={27.4} width={width - 14} height={3.4} rx={1.7} fill="#e6dccb" />
          <rect x={-(width - 14) / 2} y={27.4} width={Math.max(3.4, (width - 14) * Math.min(1, st.progress ?? 0))} height={3.4} rx={1.7} fill="#6fae45" />
        </>}
      </g>
    </g>
  );
}

export function LabRoom({ level, stations, mood, children }: { level: number; stations: LabStation[]; mood: 'work' | 'wait'; children?: ComponentChildren }) {
  const n = Math.max(1, stations.length);
  const x0 = n >= 3 ? 196 : 212, x1 = 318, step = n > 1 ? (x1 - x0) / (n - 1) : 0;
  const xs = stations.map((_, i) => (n === 1 ? 264 : x0 + step * i));
  return (
    <svg viewBox="0 0 360 210" class="lab-scene lab-room" role="group" aria-label="Лаборатория">
      <defs>
        <linearGradient id="lr-wall" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f6e7c8" /><stop offset="1" stop-color="#e8cf9f" /></linearGradient>
        <linearGradient id="lr-sun" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#fff6d8" stop-opacity=".8" /><stop offset="1" stop-color="#fff6d8" stop-opacity="0" /></linearGradient>
      </defs>
      <rect width={360} height={210} fill="url(#lr-wall)" />
      {/* wainscot and floor */}
      <rect y={128} width={360} height={30} fill="#e2c38f" />
      <path d="M0 128 H360" stroke="#b9925e" stroke-width={2} />
      <rect y={186} width={360} height={24} fill="#b27947" />
      {[192, 200].map((y) => <path d={`M0 ${y} H360`} stroke="#9a6438" stroke-width={1.2} />)}
      <path d="M96 16 L190 150 H130 L30 90 Z" fill="url(#lr-sun)" />
      {/* the window */}
      <g stroke={INK} stroke-width={2} stroke-linejoin="round">
        <rect x={16} y={14} width={80} height={66} rx={4} fill="#f4ead2" />
        <rect x={22} y={20} width={68} height={54} fill="#cdeaf6" />
        <path d="M22 60 Q36 50 52 57 Q68 48 90 55 V74 H22 Z" fill="#a7d27a" stroke="none" />
        <path d="M30 60 l3 -8 l3 8 M70 56 l3 -7 l3 7" fill="#6fae45" stroke="none" />
        <path d="M56 20 V74 M22 46 H90" stroke="#f4ead2" stroke-width={4} />
        <path d="M56 20 V74 M22 46 H90" stroke={INK} stroke-width={1.1} />
        <rect x={22} y={20} width={68} height={54} fill="none" />
        <rect x={12} y={78} width={88} height={6} rx={2} fill="#b27947" />
      </g>
      {/* a pinned chart of the crossing: two pods and their offspring */}
      <g transform="translate(126 18)" stroke={INK} stroke-linejoin="round">
        <rect x={0} y={0} width={70} height={52} rx={2} fill="#fffaf0" stroke-width={1.6} transform="rotate(-2 35 26)" />
        <circle cx={35} cy={2} r={2.4} fill="#d6473a" stroke-width={.8} />
        <path d="M14 16 h12 M44 16 h12 M20 18 V28 H50 V18 M35 28 V36" fill="none" stroke="#8a6a4a" stroke-width={1.3} />
        <circle cx={20} cy={14} r={4} fill="#8fd16a" stroke-width={1} /><circle cx={50} cy={14} r={4} fill="#e9c45c" stroke-width={1} />
        <circle cx={35} cy={41} r={5} fill="#b9d86a" stroke-width={1.1} />
        <path d="M8 47 h18 M44 47 h16" stroke="#c9b48a" stroke-width={1} />
      </g>
      {/* the shelf of seed jars */}
      <g stroke={INK} stroke-width={1.8} stroke-linejoin="round">
        <rect x={232} y={50} width={118} height={6} rx={2} fill="#9a6438" />
        <path d="M242 56 V64 M340 56 V64" stroke-width={2.4} />
        {[[240, '#e9c45c', 22], [260, '#7a5233', 18], [278, '#c9784a', 20], [298, '#8fbf5a', 17]].map(([x, c, h]) => (
          <g transform={`translate(${x} ${50 - (h as number)})`}><rect width={16} height={h as number} rx={3} fill="#e9f7ff" /><rect x={1.5} y={(h as number) * .42} width={13} height={(h as number) * .5} rx={2.4} fill={c as string} stroke="none" /><rect x={-1} y={-3} width={18} height={5} rx={1.6} fill="#c9a24a" /></g>
        ))}
        <g transform="translate(320 28)"><rect width={10} height={22} fill="#3f7fbf" /><rect x={10} y={2} width={9} height={20} fill="#d6473a" /></g>
        {level >= 2 && <g transform="translate(212 28)"><path d="M0 8 H16 L14 22 H2 Z" fill="#c4661a" /><path d="M8 8 V-4 M8 1 Q0 -6 -1 1 Q3 4 8 1 Z M8 -1 Q15 -8 17 -1 Q13 2 8 -1 Z" fill="#7cbc4a" stroke-width={1.2} /></g>}
      </g>
      {/* Лёва behind the desk */}
      <g transform="translate(70 196) scale(1.32)"><Scientist mood={mood} /></g>
      {/* flasks and tubes beside him */}
      <g stroke={INK} stroke-width={1.9} stroke-linejoin="round" class={mood === 'work' ? 'lab-busy' : ''}>
        <path d="M118 108 H128 V118 L138 140 Q140 145 135 145 H111 Q106 145 108 140 L118 118 Z" fill="#effaff" />
        <path d="M112 132 H134 L138 140 Q140 145 135 145 H111 Q106 145 108 140 Z" fill="#8fd16a" stroke="none" />
        <path d="M118 108 H128 V118 L138 140 Q140 145 135 145 H111 Q106 145 108 140 L118 118 Z" fill="none" />
        <g class="lab-bubbles" fill="#e9ffd9" stroke="none"><circle cx={120} cy={138} r={1.7} /><circle cx={127} cy={135} r={1.2} /><circle cx={123} cy={141} r={1} /></g>
        <g transform="translate(144 120)">
          <rect x={0} y={20} width={26} height={5} rx={1.5} fill="#9a6438" />
          {[['#f4b83a', 5], ['#7fc2ea', 13], ['#d6473a', 21]].map(([c, x]) => <g><rect x={(x as number) - 2.6} y={2} width={5.2} height={20} rx={2.6} fill="#effaff" /><rect x={(x as number) - 2.6} y={12} width={5.2} height={10} rx={2.6} fill={c as string} stroke="none" /></g>)}
        </g>
      </g>
      {/* the desk */}
      <g stroke={INK} stroke-width={2} stroke-linejoin="round">
        <path d="M4 150 H356 V158 H4 Z" fill="#c58c55" />
        <path d="M8 158 H352 V188 H8 Z" fill="#a8723f" />
        <path d="M14 166 H96" stroke="#8f5d34" stroke-width={1.4} />
      </g>
      {level >= 3 && <g transform="translate(20 132)" stroke={INK} stroke-width={1.5}><rect x={0} y={14} width={22} height={5} rx={1} fill="#56616b" /><path d="M6 14 V2 Q6 -6 14 -8 L17 -2 Q12 0 12 4 V14" fill="#7d8a96" /><rect x={11} y={-16} width={6} height={12} rx={2} fill="#3f4a54" transform="rotate(-20 14 -10)" /></g>}
      {stations.map((st, i) => <Station x={xs[i]} st={st} compact={n >= 3} />)}
      {children}
    </svg>
  );
}
