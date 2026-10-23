// People of the farm drawn in the same ink-and-paper language as the crops.
// Runners stand on y=0 and face right; seated workers use viewBox 0 0 64 76 with the table top at y≈66.
import type { WorkerId } from '../engine/data';
const INK = '#3f2a1d';
const SKIN = '#f1c8a0';
const SW = 2.1;

// ---------- the orphanage kids who raid the beds ----------
// Four children, each with a look of their own, so a raid of three or four is not one child copied:
// 0 — Петька: green cap, striped shirt, a sack; 1 — Галя: red kerchief, blue dress, a carrot;
// 2 — little Сёмка: pom-pom hat, a sweater too big for him, hugs a beet; 3 — tall Витёк: flat cap,
// patched jacket, a basket — the lookout. Moods: the usual sneak, `sad` (a shrug), `shoo` (waves at crows),
// `cold` (hugs himself at a frozen bed), `startle` (both hands up).
export type KidVariant = 0 | 1 | 2 | 3;
export type KidMood = 'normal' | 'sad' | 'shoo' | 'cold' | 'startle';
const KID = [
  { top: '#e8d6ad', pants: '#5d6b7c', skin: SKIN },
  { top: '#5d7fa8', pants: '#5d7fa8', skin: SKIN },
  { top: '#e98a3a', pants: '#4f7d9c', skin: '#f6d2b2' },
  { top: '#8a6440', pants: '#3f4a54', skin: '#e3b088' },
] as const;
export const KID_SCALE = [1, 1, .82, 1.1] as const;
export function KidRunner({ variant = 0, sack = false, mood = 'normal' }: { variant?: KidVariant; sack?: boolean; mood?: KidMood }) {
  const girl = variant === 1, small = variant === 2, tall = variant === 3;
  const { top, pants, skin } = KID[variant];
  const arms = mood === 'sad' || mood === 'cold' || mood === 'startle';
  return (
    <g class={`little-runner model-kid variant-${variant} mood-${mood}`} stroke={INK} stroke-width={SW} stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx={0} cy={1} rx={15} ry={3.4} fill="#3a2a1a22" stroke="none" />
      <g class="runner-leg leg-a">
        <path d={tall ? 'M-3 -19 L-8 -4' : 'M-3 -17 L-8 -4'} fill="none" stroke={INK} stroke-width={7} />
        <path d={tall ? 'M-3 -19 L-8 -4' : 'M-3 -17 L-8 -4'} fill="none" stroke={pants} stroke-width={4} />
        {small && <path d="M-6.4 -8.6 L-7.6 -5.4" stroke={skin} stroke-width={3.4} />}
        <path d="M-13 -1 Q-12 -6 -7 -5 L-4 -2 Q-6 1 -13 -1 Z" fill={small ? '#a8423a' : '#6b4a33'} />
      </g>
      <g class="runner-leg leg-b">
        <path d={tall ? 'M3 -19 L8 -5' : 'M3 -17 L8 -5'} fill="none" stroke={INK} stroke-width={7} />
        <path d={tall ? 'M3 -19 L8 -5' : 'M3 -17 L8 -5'} fill="none" stroke={pants} stroke-width={4} />
        {small && <path d="M6.6 -9 L7.6 -6" stroke={skin} stroke-width={3.4} />}
        <path d="M5 -2 Q6 -7 10 -5 L14 -2 Q12 1 5 -2 Z" fill={small ? '#a8423a' : '#6b4a33'} />
      </g>
      <g class="runner-body">
        {sack && variant === 0 && (
          <g>
            <path d="M-6 -36 Q-24 -40 -23 -24 Q-22 -13 -10 -15 Q-4 -18 -6 -36 Z" fill="#c9a56a" />
            <path d="M-19 -26 Q-15 -24 -11 -26" fill="none" stroke="#9c7a45" stroke-width={1.3} />
            <path d="M-12 -38 l-2 -6 M-10 -38 l2 -7" fill="none" stroke="#4c8e2d" stroke-width={2.4} />
          </g>
        )}
        {girl ? (
          <path d="M-9 -34 Q0 -39 9 -34 L13 -14 Q0 -11 -13 -14 Z" fill={top} />
        ) : small ? (
          <g>
            {/* a sweater two sizes too big: long hem, ribbed */}
            <path d="M-10 -34 Q0 -39 10 -34 L12 -12 Q0 -9 -12 -12 Z" fill={top} />
            <path d="M-11.4 -15 Q0 -12.4 11.4 -15" fill="none" stroke="#c96a22" stroke-width={2.2} />
            <path d="M-4 -33 v4 M0 -34 v4 M4 -33 v4" stroke="#c96a22" stroke-width={1.2} />
          </g>
        ) : tall ? (
          <g>
            <path d="M-10 -38 Q0 -43 10 -38 L11 -17 H-11 Z" fill={top} />
            <path d="M0 -40 V-17" stroke="#6b4a2e" stroke-width={1.3} />
            <rect x={-8} y={-27} width={6} height={6} rx={1} fill="#b9a07a" stroke-width={1.2} transform="rotate(-8 -5 -24)" />
            <path d="M-7 -25 h4 M-5 -27 v4" stroke="#8a6a4a" stroke-width={.8} />
            {/* a scarf */}
            <path d="M-8 -39 Q0 -35 8 -39 L8 -36 Q0 -32 -8 -36 Z" fill="#b9563d" stroke-width={1.3} />
            <path d="M-4 -35 L-6 -27 L-2 -27 L-1 -35" fill="#b9563d" stroke-width={1.2} />
          </g>
        ) : (
          <g>
            <path d="M-9 -35 Q0 -40 9 -35 L10 -16 H-10 Z" fill={top} />
            <path d="M-9.5 -29 H9.6 M-10 -23 H10" stroke="#c9634a" stroke-width={2.4} />
          </g>
        )}
        {!arms && <path class="runner-arm" d={girl ? 'M6 -31 L15 -25 L21 -29' : tall ? 'M6 -35 L14 -27 L20 -32' : 'M6 -32 L14 -25 L20 -31'} fill="none" stroke={top} stroke-width={5} />}
        {girl && sack && <g stroke-width={1.4}><path d="M19 -31 Q24 -38 31 -40 Q29 -33 22 -28 Z" fill="#f08a24" /><path d="M30 -40 l3 -4 M30.5 -39.5 l5 -1 M29.5 -40 l0 -5" fill="none" stroke="#4c8e2d" stroke-width={1.8} /></g>}
        {small && sack && <g stroke-width={1.4}><circle cx={15} cy={-24} r={6.4} fill="#8e2f52" /><path d="M15 -30 Q13 -38 9 -40 M15 -30 Q18 -38 22 -38" fill="none" stroke="#4c8e2d" stroke-width={2} /><path d="M12 -22 q3 2 6 0" fill="none" stroke="#b9577a" stroke-width={1} /></g>}
        {tall && sack && <g stroke-width={1.4}><path d="M14 -30 Q20 -42 28 -30" fill="none" stroke="#9c7a45" stroke-width={2.2} /><path d="M11 -30 H31 L28 -18 H14 Z" fill="#c9a56a" /><path d="M13 -25 H29 M16 -30 V-18 M21 -30 V-18 M26 -30 V-18" stroke="#9c7a45" stroke-width={1} /><circle cx={17} cy={-32} r={3} fill="#e0473a" /><circle cx={23} cy={-33} r={3.4} fill="#7cbc4a" /></g>}
        {mood==='sad'&&<g class="shrug-arms" fill="none">
          <g class="shrug-left"><path d="M-7 -32 L-18 -27 L-24 -34" stroke={top} stroke-width={5}/><path d="M-28 -34 Q-24 -30 -20 -34" stroke={skin} stroke-width={4}/></g>
          <g class="shrug-right"><path d="M7 -32 L18 -27 L24 -34" stroke={top} stroke-width={5}/><path d="M20 -34 Q24 -30 28 -34" stroke={skin} stroke-width={4}/></g>
        </g>}
        {mood==='cold'&&<g class="cold-arms" fill="none">
          {/* hugging himself: forearms crossed on the chest, hands on the shoulders */}
          <path d="M-7 -32 Q-12 -24 -2 -22 L8 -30" stroke={INK} stroke-width={7}/><path d="M-7 -32 Q-12 -24 -2 -22 L8 -30" stroke={top} stroke-width={4.4}/>
          <path d="M7 -32 Q12 -24 2 -21 L-8 -29" stroke={INK} stroke-width={7}/><path d="M7 -32 Q12 -24 2 -21 L-8 -29" stroke={top} stroke-width={4.4}/>
          <circle cx={8.6} cy={-30.6} r={2.6} fill={skin} stroke-width={1.2}/><circle cx={-8.6} cy={-29.6} r={2.6} fill={skin} stroke-width={1.2}/>
        </g>}
        {mood==='startle'&&<g class="startle-arms" fill="none">
          <path d="M-6 -33 L-14 -44 L-13 -54" stroke={INK} stroke-width={7}/><path d="M-6 -33 L-14 -44 L-13 -54" stroke={top} stroke-width={4.4}/>
          <path d="M6 -33 L15 -43 L16 -53" stroke={INK} stroke-width={7}/><path d="M6 -33 L15 -43 L16 -53" stroke={top} stroke-width={4.4}/>
          <circle cx={-13} cy={-56} r={2.8} fill={skin} stroke-width={1.2}/><circle cx={16} cy={-55} r={2.8} fill={skin} stroke-width={1.2}/>
        </g>}
        <g class="kid-head">
        <circle cx={2} cy={-48} r={11.5} fill={skin} />
        <circle cx={-6} cy={-47} r={2.6} fill={small ? '#efb898' : '#e9b28c'} stroke-width={1.4} />
        {girl ? (
          <g>
            <path d="M-12 -48 Q-12 -62 2 -62 Q15 -61 14 -49 Q8 -55 -2 -54 Q-8 -53 -12 -48 Z" fill="#d6473a" />
            <circle cx={-3} cy={-58} r={1.1} fill="#fff" stroke="none" /><circle cx={5} cy={-59} r={1.1} fill="#fff" stroke="none" /><circle cx={10} cy={-55} r={1.1} fill="#fff" stroke="none" />
            <g fill="#a8673a" stroke-width={1.4}><ellipse cx={-12.5} cy={-44} rx={3.2} ry={4} /><ellipse cx={-14} cy={-38.5} rx={2.7} ry={3.4} /></g>
            <path d="M-16 -35 l-3 3 l5 0 Z M-12 -35 l3 3 l-5 0 Z" fill="#d6473a" stroke-width={1.2} />
          </g>
        ) : small ? (
          <g>
            {/* a knitted hat pulled over the ears, with a pom-pom */}
            <path d="M-10.6 -48 Q-11 -62 2 -62 Q14 -62 13.6 -48 Z" fill="#e9c45c" />
            <path d="M-11 -50.6 H13.8" stroke="#d6473a" stroke-width={2.6} />
            <path d="M-5 -60 v3 M1 -61.4 v3 M7 -60 v3" stroke="#c9a23a" stroke-width={1.1} />
            <circle cx={2} cy={-64.6} r={4} fill="#d6473a" stroke-width={1.5} />
          </g>
        ) : tall ? (
          <g>
            {/* hair over the forehead and a flat cap with a short peak */}
            <path d="M-9 -50 Q-6 -55 0 -52 Q4 -55 9 -51" fill="#6b4a2e" stroke-width={1.3} />
            <path d="M-11 -51 Q-12 -62 2 -62 Q15 -62 14 -52 Q2 -55 -11 -51 Z" fill="#6b6f78" />
            <path d="M8 -53 Q15 -55 21 -52 Q15 -50 8 -51 Z" fill="#555962" />
            <path d="M-6 -59 Q2 -61 9 -58" fill="none" stroke="#878b94" stroke-width={1.1} />
          </g>
        ) : (
          <g>
            <path d="M-10 -51 Q-10 -62 2 -62 Q14 -62 13 -51 Z" fill="#7c8b52" />
            <path d="M8 -52 Q17 -53 22 -50 Q16 -48 8 -49 Z" fill="#66733f" />
            <path d="M-10 -51 H13" fill="none" />
          </g>
        )}
        <circle cx={7} cy={-48} r={small ? 1.7 : 1.5} fill={INK} stroke="none" />
        {small && <circle cx={7.6} cy={-48.6} r={.5} fill="#fff" stroke="none" />}
        <path d={mood==='sad'||mood==='cold'?"M4 -41 Q8 -44 11 -41":mood==='startle'?"M6 -42.6 a2.4 2.6 0 1 0 .1 0":"M4 -42.5 Q8 -40 11 -43"} fill={mood==='startle'?'#7a3a2a':'none'} stroke-width={1.5} />
        {(variant === 0 || variant === 2) && <g fill="#d99a72" stroke="none"><circle cx={9.5} cy={-45} r={0.9} /><circle cx={11.5} cy={-46.5} r={0.8} />{small && <circle cx={10.6} cy={-43.6} r={0.7} />}</g>}
        {mood==='cold' && <path d="M4 -51.6 Q7 -53 10 -51.6" fill="none" stroke-width={1.2} />}
        </g>
      </g>
    </g>
  );
}

// ---------- Mikhalych, the night watchman: a tall grown-up in a quilted jacket ----------
export function WatchmanRunner() {
  return (
    <g class="little-runner model-watchman" stroke={INK} stroke-width={SW} stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx={0} cy={1} rx={20} ry={4} fill="#3a2a1a22" stroke="none" />
      <g class="runner-leg leg-a">
        <path d="M-4 -30 L-10 -9" fill="none" stroke={INK} stroke-width={9} />
        <path d="M-4 -30 L-10 -9" fill="none" stroke="#4e4a46" stroke-width={6} />
        <path d="M-15 -1 L-13 -12 L-6 -11 L-6 -3 Q-6 1 -12 1 Z" fill="#8c837a" />
      </g>
      <g class="runner-leg leg-b">
        <path d="M4 -30 L10 -9" fill="none" stroke={INK} stroke-width={9} />
        <path d="M4 -30 L10 -9" fill="none" stroke="#4e4a46" stroke-width={6} />
        <path d="M6 -2 L6 -12 L13 -12 L17 -3 Q17 1 11 1 Z" fill="#8c837a" />
      </g>
      <g class="runner-body">
        <path d="M-13 -61 Q0 -67 13 -61 L15 -27 Q0 -23 -15 -27 Z" fill="#5d6e4c" />
        <path d="M-7 -62 V-26 M0 -64 V-24 M7 -62 V-26" stroke="#47563a" stroke-width={1.3} />
        <path d="M-15 -36 H15" stroke="#3c2f24" stroke-width={3.4} />
        <rect x={-3} y={-38.5} width={6} height={5} rx={1} fill="#c9a24a" stroke-width={1.2} />
        <g class="runner-arm">
          <path d="M9 -56 L19 -46 L26 -48" fill="none" stroke={INK} stroke-width={8.5} />
          <path d="M9 -56 L19 -46 L26 -48" fill="none" stroke="#5d6e4c" stroke-width={5.5} />
          <g transform="translate(27 -50)"><g class="watchman-lantern">
            <ellipse cx={3} cy={8} rx={13} ry={13} fill="#ffe7a0" opacity={0.25} stroke="none" />
            <path d="M-2 0 H8 L7 14 H-1 Z" fill="#ffd66b" />
            <path d="M-3 0 H9 M-2 14 H8 M0 0 Q3 -6 6 0" fill="none" />
            <path d="M3 4 V10" stroke="#f08a24" stroke-width={2} />
          </g></g>
        </g>
        <circle cx={1} cy={-74} r={11.5} fill="#ecc19a" />
        <path d="M6 -71 Q10 -71 11 -68" fill="none" stroke-width={1.4} />
        <circle cx={9.5} cy={-73} r={2.6} fill="#e59d82" stroke-width={1.3} />
        <path d="M-1 -66 Q5 -63 13 -67 Q9 -61 3 -62 Q-1 -63 -1 -66 Z" fill="#d9d4cc" />
        <path d="M3 -79 l5 -1" stroke-width={2.4} stroke="#8d8579" />
        <circle cx={6} cy={-76} r={1.4} fill={INK} stroke="none" />
        <path d="M-12 -77 Q-13 -92 1 -92 Q15 -92 14 -78 Z" fill="#8a6440" />
        <path d="M-12 -80 Q1 -84 14 -80 L14 -77 Q1 -80 -12 -77 Z" fill="#a98157" />
        <path d="M-12 -79 Q-17 -70 -11 -66 Q-8 -72 -9 -78 Z" fill="#a98157" />
        <path d="M-6 -88 q4 -2 8 0 M3 -89 q3 -1 6 1" fill="none" stroke="#6b4a2e" stroke-width={1.2} />
      </g>
    </g>
  );
}

// two heads and four hands over the yard fence: the kids are planning a raid
export function KidsPeek() {
  return (
    <g class="kids-peek-art" stroke={INK} stroke-width={1.8} stroke-linejoin="round" stroke-linecap="round">
      <g class="peek-a">
        <circle cx={14} cy={18} r={9} fill={SKIN} />
        <path d="M5 16 Q5 7 14 7 Q23 7 23 16 Z" fill="#7c8b52" />
        <path d="M19 15 Q26 15 29 17 Q24 18 19 17 Z" fill="#66733f" />
        <circle cx={17} cy={19} r={1.3} fill={INK} stroke="none" /><circle cx={11.5} cy={19} r={1.3} fill={INK} stroke="none" />
      </g>
      <g class="peek-b">
        <circle cx={38} cy={20} r={8.5} fill={SKIN} />
        <path d="M29.5 19 Q30 9 38 9 Q47 9 46.5 19 Q42 14 38 14 Q33 14 29.5 19 Z" fill="#d6473a" />
        <circle cx={41} cy={21} r={1.3} fill={INK} stroke="none" /><circle cx={35.5} cy={21} r={1.3} fill={INK} stroke="none" />
      </g>
      <rect x={-2} y={26} width={56} height={5} rx={1.5} fill="#b27947" />
      <g fill={SKIN} stroke-width={1.4}>{[7, 20, 31, 44].map((x) => <path d={`M${x - 3.2} 28.5 Q${x - 3.4} 24 ${x} 24 Q${x + 3.4} 24 ${x + 3.2} 28.5 Z`} />)}</g>
      <path d="M5.5 25.6 v2.2 M8.5 25.6 v2.2 M18.5 25.6 v2.2 M21.5 25.6 v2.2 M29.5 25.6 v2.2 M32.5 25.6 v2.2 M42.5 25.6 v2.2 M45.5 25.6 v2.2" stroke="#c99a74" stroke-width={0.9} />
    </g>
  );
}

// ---------- workers seated at the house table ----------
type Hat = 'cap' | 'kerchief' | 'veil' | 'ushanka' | 'straw' | 'beret' | 'none';
type Hair = 'short' | 'bun' | 'braids' | 'bob' | 'bald' | 'curly' | 'long';
type Tool = 'clipboard' | 'sprout' | 'can' | 'honey' | 'scales' | 'wrench' | 'tube' | 'jar' | 'lantern' | 'tomato';
interface Look { skin: string; hair: string; style: Hair; hat: Hat; hatColor?: string; beard?: 'mustache' | 'full' | 'grey'; glasses?: boolean; shirt: string; trim?: string; tool: Tool; wide?: boolean }
export const WORKER_LOOK: Record<WorkerId, Look> = {
  foreman: { skin: '#eebd94', hair: '#5a3a24', style: 'short', hat: 'cap', hatColor: '#c44a36', beard: 'mustache', shirt: '#d9822b', trim: '#8a5a2b', tool: 'clipboard', wide: true },
  agronomist: { skin: '#f3cfab', hair: '#a5622f', style: 'braids', hat: 'straw', hatColor: '#e9c46a', shirt: '#7cae4a', trim: '#4f7d2a', tool: 'sprout' },
  irrigator: { skin: '#d9a77c', hair: '#2f2620', style: 'short', hat: 'cap', hatColor: '#2c86b8', shirt: '#3f8fbf', trim: '#2a6286', tool: 'can' },
  beekeeper: { skin: '#eebd94', hair: '#8c7a62', style: 'short', hat: 'veil', hatColor: '#efe6cf', beard: 'full', shirt: '#e9c45c', trim: '#b38b2c', tool: 'honey', wide: true },
  marketer: { skin: '#f6d2b2', hair: '#3b2a22', style: 'bob', hat: 'none', shirt: '#e0607a', trim: '#a8405a', tool: 'scales' },
  mechanic: { skin: '#e8b78d', hair: '#2b241f', style: 'short', hat: 'beret', hatColor: '#3f5a73', beard: 'mustache', shirt: '#56616b', trim: '#e9c45c', tool: 'wrench' },
  breeder: { skin: '#f3d0ad', hair: '#6a4a2e', style: 'bun', hat: 'none', glasses: true, shirt: '#f4f1e8', trim: '#9fb86b', tool: 'tube' },
  soilsci: { skin: '#e9b98f', hair: '#7a5432', style: 'curly', hat: 'none', glasses: true, beard: 'full', shirt: '#8c6a43', trim: '#5e4528', tool: 'jar', wide: true },
  watchman: { skin: '#ecc19a', hair: '#b9b2a6', style: 'short', hat: 'ushanka', hatColor: '#8a6440', beard: 'grey', shirt: '#5d6e4c', trim: '#47563a', tool: 'lantern', wide: true },
  greenhouser: { skin: '#f4d3b3', hair: '#d9a441', style: 'long', hat: 'kerchief', hatColor: '#3fa37a', shirt: '#cfe8d2', trim: '#3fa37a', tool: 'tomato' },
};

function ToolArt({ tool }: { tool: Tool }) {
  switch (tool) {
    case 'clipboard': return <g transform="translate(36 47)"><rect width={15} height={19} rx={2} fill="#b27947" stroke={INK} stroke-width={1.6} /><rect x={2.5} y={3} width={10} height={14} fill="#fffaf0" stroke={INK} stroke-width={1} /><path d="M4.5 7 h6 M4.5 10 h6 M4.5 13 h4" stroke="#8a6a4a" stroke-width={1} /><rect x={5} y={-1.5} width={5} height={3.5} rx={1} fill="#9aa3a9" stroke={INK} stroke-width={1} /></g>;
    case 'sprout': return <g transform="translate(37 48)"><path d="M1 8 H15 L13 18 H3 Z" fill="#c4661a" stroke={INK} stroke-width={1.6} stroke-linejoin="round" /><path d="M8 9 V1" stroke="#4c8e2d" stroke-width={2} /><path d="M8 4 Q1 -1 0 4 Q4 7 8 4 Z M8 2 Q14 -4 16 1 Q12 5 8 2 Z" fill="#7cbc4a" stroke={INK} stroke-width={1.3} /></g>;
    case 'can': return <g transform="translate(35 50)"><path d="M2 2 H14 L13 16 H3 Z" fill="#8fb7c9" stroke={INK} stroke-width={1.6} stroke-linejoin="round" /><path d="M14 5 L22 -1" stroke={INK} stroke-width={4} stroke-linecap="round" /><path d="M14 5 L22 -1" stroke="#8fb7c9" stroke-width={1.8} stroke-linecap="round" /><path d="M4 2 Q8 -5 12 2" fill="none" stroke={INK} stroke-width={1.5} /></g>;
    case 'honey': return <g transform="translate(37 47)"><rect x={1} y={4} width={14} height={15} rx={3} fill="#f2b33a" stroke={INK} stroke-width={1.6} /><rect x={0} y={1} width={16} height={4.5} rx={1.5} fill="#e9dcc0" stroke={INK} stroke-width={1.3} /><path d="M4 9 Q8 7 12 9" fill="none" stroke="#fff3c2" stroke-width={1.6} stroke-linecap="round" /></g>;
    case 'scales': return <g transform="translate(34 46)"><path d="M10 4 V18 M4 19 H16" stroke={INK} stroke-width={1.8} stroke-linecap="round" /><path d="M1 6 H19" stroke={INK} stroke-width={1.8} stroke-linecap="round" /><path d="M-2 11 Q2 15 6 11 Z M14 11 Q18 15 22 11 Z" fill="#e9c45c" stroke={INK} stroke-width={1.3} /><circle cx={2} cy={9.5} r={2.2} fill="#e0473a" stroke={INK} stroke-width={1} /></g>;
    case 'wrench': return <g transform="translate(36 52) rotate(-30)"><path d="M0 6 H15" stroke={INK} stroke-width={6} stroke-linecap="round" /><path d="M0 6 H15" stroke="#a7b0b6" stroke-width={3} stroke-linecap="round" /><path d="M14 0 Q22 1 21 7 Q20 12 14 12 L16 8 L15 4 Z" fill="#a7b0b6" stroke={INK} stroke-width={1.4} stroke-linejoin="round" /></g>;
    case 'tube': return <g transform="translate(39 44)"><rect x={2} y={0} width={7} height={20} rx={3.5} fill="#e9f7ff" stroke={INK} stroke-width={1.6} /><rect x={2} y={9} width={7} height={11} rx={3.5} fill="#8fd16a" /><rect x={2} y={0} width={7} height={20} rx={3.5} fill="none" stroke={INK} stroke-width={1.6} /><path d="M10 16 Q14 10 13 5" fill="none" stroke="#4c8e2d" stroke-width={1.6} /><path d="M13 6 Q17 3 17 8 Q14 9 13 6 Z" fill="#7cbc4a" stroke={INK} stroke-width={1} /></g>;
    case 'jar': return <g transform="translate(36 48)"><path d="M2 3 H14 V17 Q14 19 12 19 H4 Q2 19 2 17 Z" fill="#e3f6ff" stroke={INK} stroke-width={1.6} /><path d="M2.5 9 H13.5 V17 Q13.5 18.5 12 18.5 H4 Q2.5 18.5 2.5 17 Z" fill="#7a5233" /><path d="M2.5 13 H13.5" stroke="#5a3a22" stroke-width={1} /><rect x={1} y={0} width={14} height={4} rx={1.5} fill="#c9a24a" stroke={INK} stroke-width={1.3} /></g>;
    case 'lantern': return <g transform="translate(38 44)"><ellipse cx={7} cy={13} rx={11} ry={11} fill="#ffe7a0" opacity={0.35} /><path d="M2 5 H12 L11 21 H3 Z" fill="#ffd66b" stroke={INK} stroke-width={1.6} stroke-linejoin="round" /><path d="M1 5 H13 M2 21 H12 M4 5 Q7 -2 10 5" fill="none" stroke={INK} stroke-width={1.5} /><path d="M7 9 V16" stroke="#f08a24" stroke-width={2} /></g>;
    case 'tomato': return <g transform="translate(36 48)"><path d="M1 9 H15 L13 19 H3 Z" fill="#c4661a" stroke={INK} stroke-width={1.6} stroke-linejoin="round" /><path d="M8 10 V2" stroke="#4c8e2d" stroke-width={1.8} /><circle cx={4.5} cy={4} r={3.6} fill="#e0473a" stroke={INK} stroke-width={1.2} /><circle cx={12} cy={6} r={3.2} fill="#e0473a" stroke={INK} stroke-width={1.2} /></g>;
  }
}

function HairBack({ l }: { l: Look }) {
  if (l.style === 'braids') return <g fill={l.hair} stroke={INK} stroke-width={1.6}><path d="M19 26 Q15 38 18 46 Q22 44 23 32 Z" /><path d="M45 26 Q49 38 46 46 Q42 44 41 32 Z" /></g>;
  if (l.style === 'long') return <path d="M19 22 Q16 40 22 46 H42 Q48 40 45 22 Z" fill={l.hair} stroke={INK} stroke-width={1.6} />;
  if (l.style === 'bob') return <path d="M18 24 Q17 38 23 39 H41 Q47 38 46 24 Q44 10 32 10 Q20 10 18 24 Z" fill={l.hair} stroke={INK} stroke-width={1.6} />;
  return null;
}
function HairFront({ l }: { l: Look }) {
  if (l.hat !== 'none' && l.hat !== 'straw' && l.hat !== 'beret') return null;
  switch (l.style) {
    case 'bun': return <g fill={l.hair} stroke={INK} stroke-width={1.6}><circle cx={32} cy={9} r={6} /><path d="M20 22 Q21 11 32 11 Q43 11 44 22 Q38 16 32 16 Q26 16 20 22 Z" /></g>;
    case 'bob': return <path d="M20 22 Q21 11 32 11 Q43 11 44 22 Q36 15 28 18 Q23 19 20 22 Z" fill={l.hair} stroke={INK} stroke-width={1.6} />;
    case 'curly': return <g fill={l.hair} stroke={INK} stroke-width={1.5}>{[[22, 17], [27, 12], [33, 11], [39, 13], [43, 18]].map(([x, y]) => <circle cx={x} cy={y} r={5} />)}</g>;
    case 'braids': case 'long': return <path d="M20 22 Q21 11 32 11 Q43 11 44 22 Q40 17 32 18 Q24 17 20 22 Z" fill={l.hair} stroke={INK} stroke-width={1.6} />;
    case 'bald': return null;
    default: return <path d="M20 21 Q21 11 32 11 Q43 11 44 21 Q38 15 30 17 Q24 17 20 21 Z" fill={l.hair} stroke={INK} stroke-width={1.6} />;
  }
}
function HatArt({ l }: { l: Look }) {
  const c = l.hatColor ?? '#7c4f2b';
  switch (l.hat) {
    case 'cap': return <g stroke={INK} stroke-width={1.6} stroke-linejoin="round"><path d="M19 20 Q19 8 32 8 Q45 8 45 20 Z" fill={c} /><path d="M19 20 Q30 17 47 21 Q38 24 19 22 Z" fill={c} /><circle cx={32} cy={8.5} r={1.6} fill={c} /></g>;
    case 'straw': return <g stroke={INK} stroke-width={1.6} stroke-linejoin="round"><ellipse cx={32} cy={17} rx={19} ry={4.5} fill={c} /><path d="M23 16 Q23 6 32 6 Q41 6 41 16 Z" fill={c} /><path d="M23 14 H41" stroke="#c4661a" stroke-width={2.4} /></g>;
    case 'kerchief': return <g stroke={INK} stroke-width={1.6} stroke-linejoin="round"><path d="M18 24 Q17 8 32 8 Q47 8 46 24 Q40 16 32 16 Q24 16 18 24 Z" fill={c} /><circle cx={27} cy={12} r={1} fill="#fff" stroke="none" /><circle cx={36} cy={11} r={1} fill="#fff" stroke="none" /><circle cx={41} cy={16} r={1} fill="#fff" stroke="none" /></g>;
    case 'beret': return <g stroke={INK} stroke-width={1.6}><path d="M18 17 Q18 7 33 7 Q47 8 45 16 Q34 13 18 17 Z" fill={c} /><circle cx={33} cy={6.5} r={1.6} fill={c} /></g>;
    case 'ushanka': return <g stroke={INK} stroke-width={1.6} stroke-linejoin="round"><path d="M18 20 Q17 4 32 4 Q47 4 46 20 Z" fill={c} /><path d="M17 17 Q32 12 47 17 L47 21 Q32 17 17 21 Z" fill="#b08860" /><path d="M17 19 Q12 30 18 34 Q21 28 21 20 Z M47 19 Q52 30 46 34 Q43 28 43 20 Z" fill="#b08860" /></g>;
    case 'veil': return <g stroke={INK} stroke-width={1.6} stroke-linejoin="round"><path d="M14 30 Q15 20 20 18 H44 Q49 20 50 30 Z" fill="#f5efdf" opacity={0.75} /><path d="M17 31 V24 M24 31 V22 M32 31 V21 M40 31 V22 M47 31 V24" stroke="#c9bfa8" stroke-width={0.9} /><ellipse cx={32} cy={17} rx={18} ry={4.5} fill={c} /><path d="M23 16 Q23 5 32 5 Q41 5 41 16 Z" fill={c} /></g>;
    default: return null;
  }
}

export function SeatedWorker({ id, away = false, part = 'all' }: { id: WorkerId; away?: boolean; part?: 'all' | 'body' | 'hands' }) {
  const l = WORKER_LOOK[id];
  const sh = l.wide ? 26 : 23;
  return (
    <g class={`seated-worker w-${id}${away ? ' away' : ''}`}>
      {part !== 'hands' && <g class="sw-breathe">
        <HairBack l={l} />
        <path d={`M${32 - sh} 76 Q${32 - sh} 44 32 42 Q${32 + sh} 44 ${32 + sh} 76 Z`} fill={l.shirt} stroke={INK} stroke-width={SW} stroke-linejoin="round" />
        {l.trim && <path d="M26 43.5 L32 52 L38 43.5" fill="none" stroke={l.trim} stroke-width={2.6} stroke-linejoin="round" />}
        {id === 'breeder' && <path d="M32 52 V76 M24 58 h5" stroke="#cfc8b8" stroke-width={1.4} />}
        {id === 'watchman' && <path d="M24 46 V76 M32 52 V76 M40 46 V76" stroke={l.trim} stroke-width={1.2} />}
        {id === 'greenhouser' && <path d="M22 54 Q32 50 42 54 V76 H22 Z" fill="#f3efe2" stroke={INK} stroke-width={1.4} />}
        {id === 'mechanic' && <path d="M24 46 V76 M40 46 V76" stroke={l.trim} stroke-width={2.4} />}
        <rect x={27.5} y={33} width={9} height={10} fill={l.skin} stroke={INK} stroke-width={1.6} />
        <circle class="sw-head" cx={32} cy={24} r={12} fill={l.skin} stroke={INK} stroke-width={SW} />
        <ellipse cx={20} cy={25} rx={2.4} ry={3.2} fill={l.skin} stroke={INK} stroke-width={1.4} />
        <ellipse cx={44} cy={25} rx={2.4} ry={3.2} fill={l.skin} stroke={INK} stroke-width={1.4} />
        <HairFront l={l} />
        {l.beard === 'full' && <path d="M21 26 Q22 39 32 40 Q42 39 43 26 Q39 33 32 33 Q25 33 21 26 Z" fill={l.hair} stroke={INK} stroke-width={1.5} />}
        {l.beard === 'grey' && <path d="M22 28 Q24 37 32 38 Q40 37 42 28 Q38 33 32 33 Q26 33 22 28 Z" fill="#dcd6cc" stroke={INK} stroke-width={1.4} />}
        <g class="sw-eyes">
          <circle cx={27.5} cy={24} r={1.6} fill={INK} />
          <circle cx={36.5} cy={24} r={1.6} fill={INK} />
        </g>
        {l.glasses && <g fill="none" stroke={INK} stroke-width={1.3}><circle cx={27.5} cy={24} r={3.8} /><circle cx={36.5} cy={24} r={3.8} /><path d="M31.3 24 h1.4" /></g>}
        <ellipse cx={24.5} cy={28.5} rx={2.4} ry={1.5} fill="#e99a86" opacity={0.6} />
        <ellipse cx={39.5} cy={28.5} rx={2.4} ry={1.5} fill="#e99a86" opacity={0.6} />
        {l.beard === 'mustache' || l.beard === 'grey' ? <path d="M26 30 Q29 28 32 30 Q35 28 38 30 Q35 33 32 31.5 Q29 33 26 30 Z" fill={l.beard === 'grey' ? '#cfc8bb' : l.hair} stroke={INK} stroke-width={1.2} /> : l.beard !== 'full' && <path d="M28.5 30 Q32 32.5 35.5 30" fill="none" stroke={INK} stroke-width={1.4} stroke-linecap="round" />}
        <HatArt l={l} />
      </g>}
      {/* forearms resting on the table and the tool of the trade in front */}
      {part !== 'body' && <g class="sw-hands">
      <path d={`M${32 - sh + 2} 60 Q20 66 30 66`} fill="none" stroke={INK} stroke-width={7.4} stroke-linecap="round" />
      <path d={`M${32 - sh + 2} 60 Q20 66 30 66`} fill="none" stroke={l.shirt} stroke-width={4.4} stroke-linecap="round" />
      <circle cx={31} cy={65.5} r={3.4} fill={l.skin} stroke={INK} stroke-width={1.5} />
      <ToolArt tool={l.tool} />
      <path d={`M${32 + sh - 2} 61 Q46 67 50 66`} fill="none" stroke={INK} stroke-width={7.4} stroke-linecap="round" />
      <path d={`M${32 + sh - 2} 61 Q46 67 50 66`} fill="none" stroke={l.shirt} stroke-width={4.4} stroke-linecap="round" />
      <circle cx={51} cy={65.5} r={3.4} fill={l.skin} stroke={INK} stroke-width={1.5} />
      </g>}
    </g>
  );
}
