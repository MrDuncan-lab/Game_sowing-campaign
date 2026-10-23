// The compost bin in the yard: a wooden box seen slightly from above (box 0..92 × 0..64, ground at y≈60).
// empty — an open box with straw on the floor and a fork; building — posts and loose planks;
// built — loose dark mass, straw and peelings above the front boards.
const INK = '#3f2a1d';
const PLANK = '#c58f57', PLANK_LIGHT = '#dcaa6e', PLANK_DARK = '#8f5d34', INSIDE = '#6e4a2c';

function Planks({ y0, n, x0 = 6, x1 = 86, h = 9, fill = PLANK }: { y0: number; n: number; x0?: number; x1?: number; h?: number; fill?: string }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const y = y0 + i * (h + 0.8);
        return (
          <g>
            <path d={`M${x0} ${y} H${x1} V${y + h} H${x0} Z`} fill={fill} stroke={INK} stroke-width={1.8} stroke-linejoin="round" />
            <path d={`M${x0 + 2} ${y + 2} H${x1 - 3}`} stroke={PLANK_LIGHT} stroke-width={1.4} stroke-linecap="round" opacity={0.8} />
            <path d={`M${x0 + 18 + i * 9} ${y + h - 2.6} q5 -1 9 0`} stroke={PLANK_DARK} stroke-width={1} fill="none" opacity={0.7} />
            <circle cx={x0 + 4} cy={y + h / 2} r={0.95} fill={INK} /><circle cx={x1 - 4} cy={y + h / 2} r={0.95} fill={INK} />
          </g>
        );
      })}
    </g>
  );
}
function Straw({ d }: { d: string }) {
  return <path d={d} fill="none" stroke="#e7c46f" stroke-width={1.8} stroke-linecap="round" />;
}

// №18 · a built heap reads its state from the box itself: `fill` 0 — the floor shows with a few remains;
// 0…1 — the dark mass rises as the weeks pass; `ready` — ripe crumbly humus and a sack of fertiliser in front.
export function CompostHeap({ built = true, building = false, fill = 1, ready = false }: { built?: boolean; building?: boolean; fill?: number; ready?: boolean }) {
  const working = built && !ready && fill > 0;
  const level = ready ? 1 : Math.max(0.35, Math.min(1, fill));
  return (
    <g class={`compost-art${built ? ' built' : building ? ' building' : ' empty'}${built ? (ready ? ' state-ready' : working ? ' state-working' : ' state-empty') : ''}`} stroke-linejoin="round">
      <ellipse cx={46} cy={60} rx={44} ry={5} fill="#3a2a1a26" />
      {/* back wall and posts */}
      <path d="M12 12 H80 V34 H12 Z" fill={PLANK_DARK} stroke={INK} stroke-width={1.8} />
      <path d="M12 19.5 H80 M12 27 H80" stroke="#6f4627" stroke-width={1.4} />
      <rect x={10} y={8} width={5} height={30} rx={1.5} fill={PLANK_DARK} stroke={INK} stroke-width={1.6} />
      <rect x={77} y={8} width={5} height={30} rx={1.5} fill={PLANK_DARK} stroke={INK} stroke-width={1.6} />
      {/* side boards in perspective */}
      <path d="M12 12 L6 22 V58 L12 36 Z" fill="#a8723f" stroke={INK} stroke-width={1.6} />
      <path d="M80 12 L86 22 V58 L80 36 Z" fill="#a8723f" stroke={INK} stroke-width={1.6} />
      {built && !ready && fill <= 0 ? (
        <g class="compost-floor">
          <path d="M12 36 H80 L84 44 H8 Z" fill={INSIDE} stroke={INK} stroke-width={1.6} />
          {/* what is left after the last claim: a little dark crumb and two peelings */}
          <path d="M18 41 q6 -3 12 0 q5 -2 9 1 M50 41 q6 -2 11 0" fill="none" stroke="#4a301c" stroke-width={2.4} stroke-linecap="round" />
          <path d="M60 39 q4 -3 7 0 q-3 2 -7 0 Z" fill="#e2834a" stroke={INK} stroke-width={1} />
          <path d="M28 38 q3 -3 6 -1 q-2 3 -6 1 Z" fill="#9db35c" stroke={INK} stroke-width={1} />
        </g>
      ) : built ? (
        <g class="compost-mass" transform={`translate(0 ${(1 - level) * 22})`}>
          <path d="M8 40 Q9 26 20 25 Q24 15 35 18 Q42 9 53 15 Q63 11 69 20 Q81 21 83 33 L84 42 H8 Z" fill="#5b3c25" stroke={INK} stroke-width={1.9} />
          <path d="M14 33 Q22 27 30 30 Q38 22 47 26 Q56 21 63 26 Q71 24 77 31" fill="none" stroke="#7c5634" stroke-width={4} stroke-linecap="round" opacity={0.85} />
          <g fill="#3e2716"><circle cx={24} cy={34} r={1.3} /><circle cx={40} cy={30} r={1.1} /><circle cx={57} cy={31} r={1.3} /><circle cx={68} cy={35} r={1.1} /><circle cx={33} cy={37} r={1} /><circle cx={50} cy={36} r={1.2} /></g>
          <g class="compost-straw">
            <Straw d="M18 26 l9 -4 M29 21 l7 3 M44 14 l8 -4 M55 17 l6 4 M64 21 l9 -2 M37 26 l-6 -4 M60 27 l8 -3 M22 30 l-6 -2" />
            <path d="M47 13 l6 -5 M70 22 l4 -6" stroke="#cfa652" stroke-width={1.6} stroke-linecap="round" />
          </g>
          {ready && <g class="compost-humus" fill="#2f1d10" opacity={0.55}><path d="M12 36 Q30 30 46 33 Q62 29 80 35 L82 40 H10 Z" /></g>}
          <g class="compost-leaves" stroke={INK} stroke-width={1.3} opacity={ready ? 0.45 : 1}>
            <path d="M24 24 Q14 15 13 25 Q17 30 24 24 Z" fill="#9db35c" />
            <path d="M51 15 Q53 4 63 10 Q61 18 51 15 Z" fill="#d6a14a" />
            <path d="M66 22 Q74 14 79 21 Q74 27 66 22 Z" fill="#86a64a" />
            <path d="M36 21 q4 -5 9 -2 q-2 4 -9 2 Z" fill="#e2834a" />
          </g>
        </g>
      ) : (
        <g class="compost-floor">
          <path d="M12 36 H80 L84 44 H8 Z" fill={INSIDE} stroke={INK} stroke-width={1.6} />
          <Straw d="M20 40 l8 -2 M33 41 l7 1 M48 39 l6 2 M60 41 l8 -1 M70 39 l5 2" />
        </g>
      )}
      {/* front boards: three when built, two on an empty box so the inside shows */}
      {building ? (
        <g>
          <Planks y0={46} n={1} />
          <g transform="rotate(-6 40 56)"><path d="M18 52 H70 V58 H18 Z" fill={PLANK_LIGHT} stroke={INK} stroke-width={1.6} /></g>
          <path d="M60 30 L70 22 M65 26 l3 3" stroke="#7a7f86" stroke-width={3} stroke-linecap="round" />
          <path d="M60 30 L70 22" stroke={INK} stroke-width={1} fill="none" />
        </g>
      ) : (
        <Planks y0={built && (ready || working) ? 33 : 41} n={built && (ready || working) ? 3 : 2} />
      )}
      <rect x={4} y={20} width={6} height={40} rx={1.6} fill={PLANK} stroke={INK} stroke-width={1.7} />
      <rect x={82} y={20} width={6} height={40} rx={1.6} fill={PLANK} stroke={INK} stroke-width={1.7} />
      {ready && (
        <g class="compost-sack" transform="translate(58 30)" stroke={INK} stroke-linejoin="round">
          <ellipse cx={13} cy={30} rx={13} ry={2.6} fill="#3a2a1a33" stroke="none" />
          <path d="M3 30 Q1 16 5 9 L8 4 Q13 1 18 4 L21 9 Q26 16 24 30 Z" fill="#d9b678" stroke-width={1.8} />
          <path d="M8 4 Q13 7 18 4 M7 8 q6 2 13 0" fill="none" stroke="#9c7a44" stroke-width={1.3} />
          <path d="M6 13 q7 2 15 0 M5 20 q8 2 17 0" fill="none" stroke="#c49c5c" stroke-width={1} />
          <rect x={7.5} y={15} width={12} height={10} rx={2} fill="#fff6dc" stroke-width={1.2} />
          <path d="M13.5 24 V18 M13.5 21 q-4 -4 -4 -1 q2 2 4 1 M13.5 19.5 q4 -4 4 -1 q-2 2 -4 1" fill="#7c9c48" stroke="#4f6b2c" stroke-width={0.9} />
          <path d="M9 4 Q13 -1 17 4" fill="none" stroke="#7a5a2a" stroke-width={1.6} stroke-linecap="round" />
        </g>
      )}
      {!built && !building && (
        <g class="compost-fork" transform="rotate(16 76 30)" stroke={INK} stroke-linecap="round">
          <path d="M76 2 V44" stroke={INK} stroke-width={4.4} />
          <path d="M76 2 V44" stroke="#d9b47a" stroke-width={2.2} />
          <path d="M70 44 V54 M74 44 V55 M78 44 V55 M82 44 V54 M70 44 H82" fill="none" stroke="#8b9096" stroke-width={2} />
        </g>
      )}
      {working && <g class="compost-steam" stroke="#fbf1d6" stroke-width={2.4} fill="none" stroke-linecap="round" opacity={0.7}><path d="M32 10 Q27 5 32 0 M52 7 Q47 2 52 -3" /></g>}
    </g>
  );
}
