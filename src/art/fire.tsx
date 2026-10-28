// Fire pits on the corners of four beds (track «Костры»), in the farm's outline language.
// Level 1: a smudge pile in a ring of stones; level 2: a pot-bellied iron stove; level 3: a heat cannon.
// Drawn at the corner point: the ground is y = 0, everything rises above it.
import { P } from './palette';

const INK = { stroke: P.ink, 'stroke-width': 1.6, 'stroke-linejoin': 'round' as const, 'stroke-linecap': 'round' as const };

function Flames({ scale = 1, id }: { scale?: number; id: string }) {
  return (
    <g class="fp-flames" transform={`scale(${scale})`}>
      <path class="fp-flame f-out" d="M-12 0 Q-15 -14 -7 -22 Q-8 -14 -3 -12 Q-4 -26 4 -34 Q3 -22 9 -16 Q10 -22 8 -26 Q17 -16 13 0 Z" fill={`url(#${id}-out)`} stroke="#9c3d1c" stroke-width={1.2} stroke-linejoin="round" />
      <path class="fp-flame f-mid" d="M-7 0 Q-9 -10 -3 -15 Q-3 -9 0 -8 Q0 -19 5 -23 Q4 -14 8 -10 Q10 -5 7 0 Z" fill="#ffc94a" />
      <path class="fp-flame f-core" d="M-3 0 Q-4 -6 0 -10 Q1 -6 3 -5 Q5 -2 3 0 Z" fill="#fff4c2" />
    </g>
  );
}
function Sparks() {
  return (
    <g class="fp-sparks" fill="#ffd36b">
      {[[-6, 0], [4, 1], [-1, 2], [7, 3], [-8, 4]].map(([x, k]) => <circle class={`fp-spark s${k}`} cx={x} cy={-18} r={1.2} />)}
    </g>
  );
}
function Smoke({ x = 0, y = -30 }: { x?: number; y?: number }) {
  return (
    <g class="fp-smoke" transform={`translate(${x} ${y})`} fill="#e9e2d2" stroke="#b5aa94" stroke-width={0.6}>
      {[0, 1, 2, 3].map((k) => <circle class={`fp-puff p${k}`} cx={0} cy={0} r={4 + k * 0.6} />)}
    </g>
  );
}

export function FirePit({ lit, level = 1, uid = 'fp' }: { lit: boolean; level?: number; uid?: string }) {
  const id = `fpg-${uid}`;
  return (
    <g class={`fire-pit lv${level}${lit ? ' lit' : ''}`}>
      <defs>
        <radialGradient id={`${id}-out`} cx=".5" cy=".85" r=".8"><stop offset="0" stop-color="#ffe08a" /><stop offset=".5" stop-color="#f6a23a" /><stop offset="1" stop-color="#e2582a" /></radialGradient>
        <radialGradient id={`${id}-glow`} cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd27a" stop-opacity=".85" /><stop offset=".45" stop-color="#ff9a3c" stop-opacity=".35" /><stop offset="1" stop-color="#ff7a2a" stop-opacity="0" /></radialGradient>
      </defs>
      {lit && <ellipse class="fp-glow" cx={0} cy={-2} rx={44} ry={26} fill={`url(#${id}-glow)`} />}
      <ellipse cx={0} cy={2} rx={20} ry={5} fill="rgba(0,0,0,0.2)" />
      {level <= 1 && <>
        {/* the ring of stones round a heap of brushwood, with damp straw for the smoke */}
        <g {...INK}>
          {[[-16, -1, 5.5], [-10, 3, 5], [-2, 4.5, 5.5], [7, 4, 5], [14, 1, 5.2], [11, -4, 4.4], [-13, -5, 4.4]].map(([x, y, r], i) => (
            <ellipse cx={x} cy={y} rx={r} ry={r * 0.68} fill={i % 2 ? P.stone : '#b9b3a8'} />
          ))}
          <path d="M-12 -3 L10 -10 M-10 -10 L12 -3" stroke={P.woodDark} stroke-width={4.4} />
          <path d="M-12 -3 L10 -10 M-10 -10 L12 -3" stroke={P.wood} stroke-width={2.4} />
          <circle cx={10} cy={-10} r={2} fill={P.woodLight} />
          <circle cx={-10} cy={-10} r={2} fill={P.woodLight} />
        </g>
        {!lit && <path d="M-6 -5 q3 -3 6 0 q3 -3 6 0" fill="none" stroke="#7a6a58" stroke-width={1.2} stroke-linecap="round" />}
        {lit && <g transform="translate(0 -4)"><Flames id={id} /><Sparks /><Smoke y={-34} /></g>}
      </>}
      {level === 2 && <>
        {/* a pot-bellied iron stove with a crooked pipe */}
        <g {...INK}>
          <path d="M-9 0 l-2 4 M9 0 l2 4" stroke-width={2} />
          <path d="M-13 -4 Q-15 -16 -9 -24 H9 Q15 -16 13 -4 Q0 2 -13 -4 Z" fill="#5d5650" />
          <path d="M-10 -22 H10" stroke="#8f8780" />
          <rect x={-7} y={-16} width={14} height={9} rx={3} fill={lit ? '#ffb347' : '#2f2a26'} class="fp-door" />
          <path d="M-4 -16 V-7 M0 -16 V-7 M4 -16 V-7" stroke={lit ? '#c85a1e' : '#4a433d'} stroke-width={1} />
          <path d="M4 -24 V-38 H10 V-44" fill="none" stroke={P.ink} stroke-width={5.6} stroke-linecap="butt" />
          <path d="M4 -24 V-38 H10 V-44" fill="none" stroke="#6f6760" stroke-width={3.2} stroke-linecap="butt" />
        </g>
        {lit && <><g transform="translate(0 -9) scale(.42)" class="fp-door-fire"><Flames id={id} /></g><Smoke x={10} y={-48} /></>}
      </>}
      {level >= 3 && <>
        {/* a heat cannon: a drum on a little frame, its grille glowing */}
        <g {...INK}>
          <path d="M-12 0 L-7 -10 M12 0 L7 -10" stroke-width={2.2} />
          <circle cx={-12} cy={1} r={2.6} fill={P.stoneDark} />
          <circle cx={12} cy={1} r={2.6} fill={P.stoneDark} />
          <rect x={-17} y={-26} width={30} height={16} rx={6} fill="#c2473a" />
          <path d="M-12 -26 V-10 M-6 -26 V-10" stroke="#8c2d24" stroke-width={1.2} />
          <ellipse cx={14} cy={-18} rx={4.5} ry={8.5} fill={lit ? '#ffb347' : '#3a332e'} class="fp-door" />
          <path d="M12 -24 H16 M11.5 -20 H16.5 M11.5 -16 H16.5 M12 -12 H16" stroke={lit ? '#c85a1e' : '#5a524b'} stroke-width={1} />
          <rect x={-10} y={-31} width={10} height={5} rx={1.5} fill="#e9d36f" />
        </g>
        {lit && <g class="fp-heatwaves" fill="none" stroke="#ffb15c" stroke-width={1.6} stroke-linecap="round">
          {[0, 1, 2].map((k) => <path class={`fp-wave w${k}`} d="M22 -26 q4 4 0 8 q-4 4 0 8" />)}
        </g>}
      </>}
    </g>
  );
}

/** the square a lit fire warms and the beds round it, in bed units (drawn on the field under the plants' feet) */
export function FireAura({ core = true }: { core?: boolean }) {
  return core
    ? <rect class="fire-aura core" x={-96} y={-96} width={192} height={192} rx={26} />
    : <rect class="fire-aura ring" x={-196} y={-196} width={392} height={392} rx={44} />;
}

export function FireIcon() {
  return (
    <g>
      <ellipse cx={24} cy={40} rx={15} ry={4} fill={P.stone} stroke={P.ink} stroke-width={2} />
      <path d="M13 38 L35 31 M13 31 L35 38" stroke={P.woodDark} stroke-width={4} stroke-linecap="round" />
      <path d="M16 34 Q12 22 20 14 Q19 22 23 23 Q22 10 30 4 Q29 16 34 21 Q37 28 32 34 Z" fill="#f6a23a" stroke={P.ink} stroke-width={2.2} stroke-linejoin="round" />
      <path d="M21 33 Q19 26 24 22 Q24 27 27 28 Q29 31 27 33 Z" fill="#ffd36b" />
    </g>
  );
}
