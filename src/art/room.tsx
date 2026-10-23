// Inside the izba: a log wall, a window with a carved frame, the stove, and one long table.
// Workers sit behind the table with their hands and tools on it; a free place is an empty chair.
// viewBox 0 0 360 196: table far edge y=124, near edge y=138, front y=138..150.
import type { ComponentChildren } from 'preact';
import type { WorkerId } from '../engine/data';
import { SeatedWorker } from './people';
import { Companion } from './companions';
import { icons } from './icons';

const INK = '#3f2a1d';
export type RoomSeat =
  | { kind: 'worker'; id: WorkerId; title: string; level: number; label: string; onOpen: () => void }
  | { kind: 'away'; id: WorkerId; title: string; weeks: number; label: string; onOpen: () => void }
  | { kind: 'free'; label: string; onOpen: () => void };

function Seat({ x, k, children, label, onOpen, cls }: { x: number; k: number; children: ComponentChildren; label: string; onOpen: () => void; cls: string }) {
  return (
    <g class={`room-seat ${cls}`} role="button" tabindex={0} aria-label={label} transform={`translate(${x} 0)`}
      onClick={onOpen} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}>
      <rect class="seat-hit" x={-30 * k} y={64} width={60 * k} height={96} rx={10} fill="transparent" />
      {children}
    </g>
  );
}
function Chair({ k }: { k: number }) {
  return (
    <g transform={`translate(0 124) scale(${k})`} stroke={INK} stroke-width={2} stroke-linejoin="round">
      <path d="M-19 0 V-38 Q-19 -44 -13 -44 H13 Q19 -44 19 -38 V0" fill="#9a6438" />
      <path d="M-13 -37 H13 V-24 H-13 Z" fill="#b98351" />
      <path d="M-13 -18 H13" stroke="#7c4f2b" stroke-width={1.6} />
    </g>
  );
}
function PlaceCard({ text, pips, of = 3, tone }: { text: string; pips?: number; of?: number; tone?: 'free' | 'away' }) {
  const w = Math.max(38, Math.min(58, text.length * 4.7 + 10));
  return (
    <g class={`place-card${tone ? ` ${tone}` : ''}`} transform="translate(0 141)">
      <rect x={-w / 2} y={0} width={w} height={pips !== undefined ? 17 : 12} rx={2.5} fill={tone === 'free' ? '#f5ecd5' : '#fffaf0'} stroke={INK} stroke-width={1.2} />
      <text x={0} y={8.6} text-anchor="middle" class="place-text">{text}</text>
      {pips !== undefined && Array.from({ length: of }, (_, i) => <circle cx={(i - (of - 1) / 2) * 6} cy={13} r={2} fill={i < pips ? '#f4c542' : '#fffaf0'} stroke={INK} stroke-width={.9} />)}
    </g>
  );
}

export function Room({ seats, certs, cat, dog, winter }: { seats: RoomSeat[]; certs: number; cat: boolean; dog: boolean; winter: boolean }) {
  const n = Math.max(1, seats.length);
  const x0 = 46, x1 = 280, step = (x1 - x0) / n, k = Math.min(1, step / 58);
  const xs = seats.map((_, i) => x0 + step * (i + 0.5));
  return (
    <svg viewBox="0 0 360 196" class="room-art" role="group" aria-label="Дом изнутри">
      <defs>
        <linearGradient id="room-sky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color={winter ? '#dfeaf2' : '#bfe4f6'} /><stop offset="1" stop-color={winter ? '#f4f8fb' : '#e9f6dc'} /></linearGradient>
        <radialGradient id="room-fire" cx=".5" cy=".7" r=".6"><stop offset="0" stop-color="#ffe9a0" /><stop offset=".55" stop-color="#f6a23a" /><stop offset="1" stop-color="#9c3d1c" /></radialGradient>
        <radialGradient id="room-glow" cx=".85" cy=".72" r=".5"><stop offset="0" stop-color="#ffd27a" stop-opacity=".32" /><stop offset="1" stop-color="#ffd27a" stop-opacity="0" /></radialGradient>
      </defs>
      {/* log wall */}
      <rect width={360} height={126} fill="#d6a265" />
      {Array.from({ length: 7 }, (_, i) => (
        <g>
          <rect x={0} y={i * 18} width={360} height={18} fill={i % 2 ? '#d29b5d' : '#dcab6f'} />
          <path d={`M0 ${i * 18 + 3.5} H360`} stroke="#e8c08a" stroke-width={2} opacity={.7} />
          <path d={`M0 ${i * 18 + 17.5} H360`} stroke="#a8743f" stroke-width={2.4} />
          <path d={`M0 ${i * 18 + 16} H360`} stroke="#c2a26b" stroke-width={1.2} stroke-dasharray="3 7" opacity={.8} />
        </g>
      ))}
      <rect width={360} height={196} fill="url(#room-glow)" />
      {/* window with a carved frame and curtains */}
      <g stroke={INK} stroke-width={2} stroke-linejoin="round">
        <path d="M18 16 L61 4 L104 16 Z" fill="#f4ead2" />
        <path d="M44 12 Q61 6 78 12" fill="none" stroke="#6f9cc4" stroke-width={2} />
        <rect x={22} y={16} width={78} height={70} rx={3} fill="#f4ead2" />
        <rect x={30} y={22} width={62} height={56} fill="url(#room-sky)" />
        {!winter && <path d="M30 66 Q46 56 60 64 Q74 54 92 62 V78 H30 Z" fill="#9cc96a" stroke="none" />}
        {winter && <path d="M30 70 Q48 62 62 68 Q76 62 92 66 V78 H30 Z" fill="#fbfdff" stroke="none" />}
        <path d="M61 22 V78 M30 46 H92" stroke="#f4ead2" stroke-width={4} />
        <path d="M61 22 V78 M30 46 H92" stroke={INK} stroke-width={1.2} fill="none" />
        <rect x={30} y={22} width={62} height={56} fill="none" />
        <path d="M30 22 Q38 46 33 78 L30 78 Z" fill="#e57a5e" />
        <path d="M92 22 Q84 46 89 78 L92 78 Z" fill="#e57a5e" />
        <rect x={16} y={84} width={90} height={7} rx={2} fill="#b27947" />
        <path d="M24 91 L32 100 H90 L98 91" fill="#e9ddc0" stroke-width={1.6} />
        <g transform="translate(74 70)"><path d="M-7 4 H7 L5 14 H-5 Z" fill="#c4661a" /><path d="M0 4 V-6 M0 -2 Q-8 -8 -9 -1 Q-4 1 0 -2 Z M0 -4 Q7 -11 9 -4 Q5 -1 0 -4 Z" fill="#7cbc4a" stroke-width={1.3} /><circle cx={-3} cy={-9} r={2.6} fill="#f6b4cb" stroke-width={1.1} /></g>
      </g>
      {/* certificates of this farm */}
      <g transform="translate(122 20)">
        {Array.from({ length: Math.max(1, Math.min(4, certs)) }, (_, i) => (
          <g transform={`translate(${i * 30} ${i % 2 ? 6 : 0})`} opacity={certs ? 1 : .45}>
            <rect width={24} height={30} rx={2} fill="#b27947" stroke={INK} stroke-width={1.6} />
            <rect x={3} y={3} width={18} height={24} fill="#fff8e6" stroke={INK} stroke-width={.8} />
            {certs > 0 ? <g><path d="M7 9 H17 M7 13 H17 M7 17 H13" stroke="#b9a07a" stroke-width={1.1} /><circle cx={16} cy={21} r={3} fill="#e0473a" stroke={INK} stroke-width={.8} /></g> : <path d="M8 15 H16" stroke="#b9a07a" stroke-width={1} stroke-dasharray="2 2" />}
          </g>
        ))}
      </g>
      {/* wall clock: a little "khodiki" with a pendulum and two weights on chains */}
      <g transform="translate(262 30)" stroke={INK} stroke-width={1.6} stroke-linejoin="round">
        <path d="M-8.5 13 V30 M8.5 13 V22" stroke="#8a8f96" stroke-width={1} stroke-dasharray="1.6 1.2" />
        <path d="M-11.1 30 h5.2 l-.6 7 Q-8.5 40 -10.5 37 Z" fill="#c9a24a" stroke-width={1.2} />
        <path d="M5.9 22 h5.2 l-.6 7 Q8.5 32 6.5 29 Z" fill="#c9a24a" stroke-width={1.2} />
        <g class="clock-pendulum">
          <path d="M0 12 V31" stroke-width={1.3} />
          <circle cx={0} cy={33} r={3.4} fill="#e2b84f" />
          <circle cx={-1} cy={32} r={1} fill="#fff6d8" stroke="none" />
        </g>
        <path d="M-12 -10 L0 -19 L12 -10 Z" fill="#7c4f2b" />
        <rect x={-10} y={-10} width={20} height={23} rx={2} fill="#9a6438" />
        <circle cx={0} cy={0} r={7.4} fill="#fffaf0" />
        <path d="M0 -5.6 V-4.4 M5.6 0 H4.4 M0 5.6 V4.4 M-5.6 0 H-4.4" stroke-width={1} />
        <path d="M0 0 V-4.6 M0 0 L3.2 1.8" stroke-width={1.3} stroke-linecap="round" />
        <circle cx={0} cy={11} r={1.3} fill={INK} stroke="none" />
      </g>
      {/* floor */}
      <rect y={126} width={360} height={70} fill="#b27947" />
      {Array.from({ length: 4 }, (_, i) => <path d={`M0 ${132 + i * 17} H360`} stroke="#9a6438" stroke-width={1.6} />)}
      <path d="M0 126 H360" stroke="#7c4f2b" stroke-width={3} />
      {/* the stove */}
      <g stroke={INK} stroke-width={2} stroke-linejoin="round">
        <path d="M304 0 H332 V40 H304 Z" fill="#efe6d6" />
        <path d="M292 40 H360 V176 H292 Z" fill="#f3ece0" />
        <path d="M288 40 H360 V48 H288 Z" fill="#e3d7c3" />
        <path d="M298 160 H360 M298 168 H360" stroke="#d6c7ae" stroke-width={1.4} />
        <path d="M304 132 V106 Q304 92 318 92 H330 Q344 92 344 106 V132 Z" fill="#3a2418" />
        <path class="stove-fire" d="M310 132 Q309 116 318 110 Q318 118 324 114 Q328 104 334 112 Q340 120 338 132 Z" fill="url(#room-fire)" stroke="none" />
        <path d="M300 132 H348 V140 H300 Z" fill="#d9ccb5" />
        <path d="M296 58 h8 M312 66 h8 M330 58 h8 M300 76 h8 M322 80 h8 M342 72 h8" stroke="#ddcfb8" stroke-width={1.6} />
      </g>
      {cat && <g class="room-cat" transform="translate(300 2)"><Companion id="cat" size={44} pose="nap" /></g>}
      {/* table, with the people behind it */}
      <g class="room-crew">
        {seats.map((st, i) => st.kind === 'worker' ? (
          <g transform={`translate(${xs[i] - 32 * k} ${124 - 56 * k}) scale(${k})`}><SeatedWorker id={st.id} part="body" /></g>
        ) : <g transform={`translate(${xs[i]} 0)`}><Chair k={k} /></g>)}
      </g>
      <g stroke={INK} stroke-width={2} stroke-linejoin="round">
        <path d="M30 124 H296 L304 138 H22 Z" fill="#c58c55" />
        <path d="M60 126 H266 L270 136 H56 Z" fill="#f4ecd8" stroke-width={1.2} opacity={.92} />
        <path d="M60 126 H266 L270 136 H56 Z" fill="none" stroke="#e57a5e" stroke-width={1} stroke-dasharray="4 3" />
        <path d="M22 138 H304 V150 H22 Z" fill="#a8723f" />
        <path d="M32 150 V186 M294 150 V186" stroke-width={7} stroke="#7c4f2b" />
        <path d="M32 150 V186 M294 150 V186" stroke-width={3.4} stroke="#9a6438" />
      </g>
      <g class="room-hands">
        {seats.map((st, i) => st.kind === 'worker' ? (
          <g transform={`translate(${xs[i] - 32 * k} ${124 - 56 * k}) scale(${k})`}><SeatedWorker id={st.id} part="hands" /></g>
        ) : st.kind === 'away' ? (
          <g transform={`translate(${xs[i] - 9} 120)`}><path d="M0 8 L9 4 L18 8 L18 14 L9 10 L0 14 Z" fill="#3f7fbf" stroke={INK} stroke-width={1.3} stroke-linejoin="round" /><path d="M9 4 V10" stroke="#fff" stroke-width={1} /></g>
        ) : null)}
      </g>
      {seats.map((st, i) => (
        <Seat x={xs[i]} k={k} label={st.label} onOpen={st.onOpen} cls={st.kind}>
          {st.kind === 'worker' && <PlaceCard text={st.title} pips={st.level} />}
          {st.kind === 'away' && <PlaceCard text={`учёба · ${st.weeks} н.`} tone="away" />}
          {/* №7 · a free place is the empty chair behind the table and a plain card; «нанять» shows on focus */}
          {st.kind === 'free' && <g>
            <PlaceCard text="свободно" tone="free" />
            <text class="hire-hint" x={0} y={136} text-anchor="middle">нанять ›</text>
          </g>}
          <rect class="seat-ring" x={-29 * k} y={66} width={58 * k} height={94} rx={10} fill="none" />
        </Seat>
      ))}
      {dog && <g class="room-dog" transform="translate(300 146)"><Companion id="dog" size={50} pose="nap" /></g>}
      {!seats.length && <g transform="translate(160 96)" opacity={.6}>{icons.team()}</g>}
    </svg>
  );
}
