// Event-scene actors: the farm dog in profile (gallop and bark) and the crop-spraying drone.
// Both stand on y=0 and face right, in the same ink-and-paper language as the people and animals.
const INK = '#513a2d';
const FUR = '#c58d60', LIGHT = '#f6dfba', EAR = '#865735', FAR = '#a8714a';

function Leg({ x, far, cls }: { x: number; far?: boolean; cls: string }) {
  return (
    <g class={`dog-leg ${cls}`}>
      <path d={`M${x} -27 L${x + 1} -4`} fill="none" stroke={INK} stroke-width={8.4} stroke-linecap="round" />
      <path d={`M${x} -27 L${x + 1} -4`} fill="none" stroke={far ? FAR : FUR} stroke-width={4.8} stroke-linecap="round" />
      <ellipse cx={x + 3} cy={-2.4} rx={4.6} ry={2.6} fill={far ? FAR : LIGHT} stroke={INK} stroke-width={1.6} />
    </g>
  );
}

/** The dog in profile. `run` gallops (legs, ears and tail animated by CSS), `bark` stands with the head raised. */
export function DogRunner({ pose = 'run' }: { pose?: 'run' | 'bark' }) {
  const run = pose === 'run';
  return (
    <g class={`dog-runner pose-${pose}`} stroke-linejoin="round" stroke-linecap="round">
      <ellipse cx={0} cy={0} rx={30} ry={4} fill="#3a2a1a26" />
      <g class="dog-gallop">
        {/* far legs behind the body */}
        <Leg x={15} far cls="front far" />
        <Leg x={-19} far cls="back far" />
        <g class="dog-tail">
          <path d="M-27 -38 Q-40 -42 -44 -57" fill="none" stroke={INK} stroke-width={8.6} />
          <path d="M-27 -38 Q-40 -42 -44 -57" fill="none" stroke={FUR} stroke-width={5} />
          <path d="M-43.6 -54 L-44.4 -58" fill="none" stroke={LIGHT} stroke-width={5} />
        </g>
        <path d="M-31 -34 Q-31 -47 -15 -47 H13 Q29 -47 31 -34 Q31 -22 17 -21 H-18 Q-31 -21 -31 -34 Z" fill={FUR} stroke={INK} stroke-width={2.2} />
        <path d="M-20 -22.4 Q0 -27 18 -22.2" fill="none" stroke={LIGHT} stroke-width={4} />
        <path d="M-12 -46 Q-4 -41 4 -46" fill="none" stroke={EAR} stroke-width={5} />
        <Leg x={19} cls="front near" />
        <Leg x={-15} cls="back near" />
        <g class="dog-head">
          <path d="M23 -45 Q21 -58 30 -64 Q41 -69 48 -60 L58 -55 Q62 -49 56 -45 L45 -42 Q30 -38 23 -45 Z" fill={FUR} stroke={INK} stroke-width={2.2} />
          <path d="M45 -58 L57 -54 Q60 -49 55 -46 L44 -44 Q41 -50 45 -58 Z" fill={LIGHT} stroke="none" />
          <circle cx={58.4} cy={-53.6} r={2.8} fill={INK} stroke="none" />
          <circle cx={39.5} cy={-58} r={2.3} fill={INK} stroke="none" />
          <circle cx={40.2} cy={-58.8} r={.8} fill="#fff" stroke="none" />
          {run
            ? <path class="dog-tongue" d="M50 -44 Q52 -37 56 -41 L55 -45" fill="#dc9390" stroke={INK} stroke-width={1.3} />
            : <path d="M44 -45 Q50 -40 56 -45" fill="#7a3b30" stroke={INK} stroke-width={1.4} />}
          <path d="M22 -50 Q27 -42 32 -44" fill="none" stroke="#d6473a" stroke-width={4} />
          <g class="dog-ear">
            <path d="M30 -62 Q19 -63 19 -50 Q19 -41 26 -42 Q32 -49 34 -60 Z" fill={EAR} stroke={INK} stroke-width={2} />
          </g>
        </g>
      </g>
    </g>
  );
}

/** A two-line "ГАВ!" with sound strokes, anchored at the dog's nose. */
export function Bark() {
  return (
    <g class="dog-bark-text">
      <path d="M2 -4 l7 -5 M3 3 l9 0 M2 10 l7 5" fill="none" stroke={INK} stroke-width={2.2} stroke-linecap="round" />
      <text x={16} y={8} class="bark-word">Гав!</text>
    </g>
  );
}

/** The drone in a three-quarter view, body centre at (0,0). Rotors blur by CSS; a mist falls from the nozzles. */
export function DroneCraft() {
  const ink = '#3f2a1d';
  const rotors: [number, number][] = [[-36, -13], [36, -13], [-29, 3], [29, 3]];
  return (
    <g class="drone-craft" stroke-linejoin="round" stroke-linecap="round">
      <g class="drone-mist" fill="#eaf6ff" stroke="none">
        {[-7, 0, 7].map((x, i) => <path d={`M${x} 16 L${x * 2.6 - 9} 64 Q${x * 2.6} 69 ${x * 2.6 + 9} 64 Z`} opacity={.3 + i * .05} />)}
        {[[-14, 30], [6, 38], [-4, 50], [16, 52], [-20, 56], [10, 26]].map(([x, y], i) => <circle class={`mist-drop m${i % 3}`} cx={x} cy={y} r={1.8} fill="#d6efff" />)}
      </g>
      {rotors.map(([x, y]) => <path d={`M${x * .3} ${y * .3 - 1} L${x} ${y}`} stroke={ink} stroke-width={5.4} />)}
      {rotors.map(([x, y]) => <path d={`M${x * .3} ${y * .3 - 1} L${x} ${y}`} stroke="#9aa6ad" stroke-width={2.6} />)}
      {rotors.map(([x, y]) => <path d={`M${x} ${y} v-4`} stroke={ink} stroke-width={2.4} />)}
      <rect x={-10} y={4} width={20} height={11} rx={3.5} fill="#7fc2ea" stroke={ink} stroke-width={1.8} />
      <path d="M-6 15 v3 M0 15 v3 M6 15 v3" stroke={ink} stroke-width={2} />
      <path d="M-15 -3 Q-15 -11 -6 -11 H6 Q15 -11 15 -3 V3 Q15 7 9 7 H-9 Q-15 7 -15 3 Z" fill="#eef2f3" stroke={ink} stroke-width={2} />
      <path d="M-11 -6 H11" stroke="#c5ced3" stroke-width={2} />
      <circle cx={0} cy={1.5} r={3.2} fill="#3f4a54" stroke={ink} stroke-width={1.2} />
      <circle cx={-1} cy={.6} r={.9} fill="#fff" stroke="none" />
      <circle class="drone-light red" cx={-36} cy={-11} r={2} fill="#e0473a" stroke="none" />
      <circle class="drone-light green" cx={36} cy={-11} r={2} fill="#5aae3a" stroke="none" />
      {rotors.map(([x, y], i) => (
        <g transform={`translate(${x} ${y - 4})`}>
          <ellipse rx={14} ry={3.6} fill="rgba(214,226,232,.55)" stroke={ink} stroke-width={.9} />
          <g class={`rotor-blade b${i % 2}`}><path d="M-13 0 H13" stroke={ink} stroke-width={2} /></g>
          <circle r={2.2} fill="#56616b" stroke={ink} stroke-width={1} />
        </g>
      ))}
    </g>
  );
}

/** A small beetle seen from above, head to the right. */
export function Beetle() {
  return (
    <g class="beetle" stroke="#2c1f15" stroke-width={1.2} stroke-linecap="round">
      <path d="M-5 -4 l-3 -3 M-1 -5 l0 -4 M3 -4 l3 -3 M-5 4 l-3 3 M-1 5 l0 4 M3 4 l3 3" fill="none" />
      <ellipse cx={-1} cy={0} rx={6.4} ry={5} fill="#6a4a2e" />
      <path d="M-7 0 H5" stroke="#2c1f15" stroke-width={1} />
      <circle cx={6.2} cy={0} r={2.6} fill="#2c1f15" />
      <circle cx={-3} cy={-2.2} r={1} fill="#e9c45c" stroke="none" /><circle cx={-3} cy={2.2} r={1} fill="#e9c45c" stroke="none" />
    </g>
  );
}
