// Trouble drawn on the bed itself instead of a ring and a badge: the shadow of a hail cloud with the first
// pellets, river water creeping in, weed fluff drifting onto bare soil, beetles crawling up to the potato.
// Each piece lives in a 100 × 100 tile, under the plant's own animations; pointer events are off.
import { Beetle } from './beetles';
import { icons } from './icons';

const PELLETS: [number, number][] = [[22, 30], [48, 22], [72, 34], [30, 60], [62, 66], [80, 56], [44, 82]];
export function HailShadow({ faint = false }: { faint?: boolean }) {
  return (
    <g class={`omen-hail${faint ? ' faint' : ''}`} pointer-events="none">
      <rect x={4} y={6} width={92} height={88} rx={12} fill="#26354a" fill-opacity={faint ? 0.14 : 0.32} />
      {!faint && PELLETS.map(([x, y], i) => (
        <circle cx={x} cy={y} r={3.4} fill="#f2f8ff" stroke="#5f7f99" stroke-width={1.4} class="omen-pellet" style={{ animationDelay: `${-i * 0.37}s` }} />
      ))}
      {faint && <path d="M12 16 h76 M12 84 h76" stroke="#26354a" stroke-opacity={0.25} stroke-width={2} stroke-dasharray="4 7" />}
    </g>
  );
}
export function FloodMark() {
  return (
    <g class="omen-flood" pointer-events="none">
      <rect x={4} y={6} width={92} height={88} rx={12} fill="#3f97d0" fill-opacity={0.22} />
      {[30, 52, 74].map((y, i) => <path d={`M14 ${y} q9 -6 18 0 t18 0 t18 0 t18 0`} stroke="#d6f1ff" stroke-width={2.4} fill="none" stroke-linecap="round" class="omen-wave" style={{ animationDelay: `${-i * 0.6}s` }} />)}
    </g>
  );
}
// dandelion-like fluff: drifting in over the bed during the warning week, settling on it in the week itself
export function WeedSeeds({ landing = false }: { landing?: boolean }) {
  const spots: [number, number][] = landing ? [[30, 62], [58, 44], [72, 70], [44, 30]] : [[18, 30], [46, 16], [70, 34]];
  return (
    <g class={`omen-weeds${landing ? ' landing' : ''}`} pointer-events="none">
      {spots.map(([x, y], i) => (
        <g transform={`translate(${x} ${y})`}><g class="omen-fluff" style={{ animationDelay: `${-i * 1.1}s` }}>
          <path d="M0 0 V7" stroke="#8a7a5c" stroke-width={1} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <path d="M0 0 V-5.5" stroke="#fffaf0" stroke-width={1.1} stroke-linecap="round" transform={`rotate(${a})`} />)}
          <circle r={1.3} fill="#c9b07e" />
        </g></g>
      ))}
      {landing && [[34, 74], [62, 58]].map(([x, y]) => <path d={`M${x} ${y} q-2 -6 -6 -7 M${x} ${y} q2 -7 6 -8`} stroke="#5f9a3a" stroke-width={2.2} fill="none" stroke-linecap="round" class="omen-sprout" />)}
    </g>
  );
}
// the warning week: two beetles crawl along the bed's lower edge toward the plant
export function BeetleScouts() {
  return (
    <g class="omen-beetles" pointer-events="none">
      {[[16, 80, -20, 0], [74, 84, 200, 1]].map(([x, y, r, i]) => (
        <g transform={`translate(${x} ${y}) rotate(${r})`}><g class="omen-crawl" style={{ animationDelay: `${-i * 2.6}s` }}><g transform="scale(1.45)"><Beetle /></g></g></g>
      ))}
    </g>
  );
}

// v3 · the raiders of the expeditions on the bed itself. This week: the beast or the flames stand at the bed's
// lower corner, over the plant, with their marks across the soil; the warning week: only their tracks along the
// lower edge (or smoke along the upper one), so the plant stays readable.
const PAW = (x: number, y: number, r: number, k = 1, i = 0) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${k})`} class="omen-print" style={{ animationDelay: `${i * 0.3}s` }}>
    <ellipse rx={6} ry={5} fill="#4a301d" />
    {[-6, -2, 2, 6].map((dx) => <circle cx={dx} cy={-7} r={1.8} fill="#4a301d" />)}
  </g>
);
export function BearTracks({ faint = false }: { faint?: boolean }) {
  if (faint) return <g class="omen-bear faint" pointer-events="none" opacity={0.75}>{[[14, 90, 70], [30, 86, 80], [46, 90, 70], [62, 86, 80]].map(([x, y, r], i) => PAW(x, y, r, 0.62, i))}</g>;
  return (
    <g class="omen-bear" pointer-events="none">
      <rect x={4} y={6} width={92} height={88} rx={12} fill="#5a3a24" fill-opacity={0.16} />
      {[[18, 84, -28], [36, 70, -18], [54, 58, -24]].map(([x, y, r], i) => PAW(x, y, r, 1, i))}
      <g transform="translate(58 56) scale(.8)"><circle cx={24} cy={24} r={21} fill="#fff6e0" stroke="#3f2a1d" stroke-width={2.4} />{icons.bear()}</g>
    </g>
  );
}
export function BoarFurrows({ faint = false }: { faint?: boolean }) {
  const hooves = (x: number, y: number, i: number) => <g transform={`translate(${x} ${y})`} class="omen-hoof" style={{ animationDelay: `${i * 0.35}s` }}><path d="M-2.4 0 l-1.4 4 M2.4 0 l1.4 4" stroke="#4a301d" stroke-width={2.4} stroke-linecap="round" /></g>;
  if (faint) return <g class="omen-boars faint" pointer-events="none">{[[12, 86], [26, 90], [40, 86], [54, 90], [68, 86]].map(([x, y], i) => hooves(x, y, i))}</g>;
  return (
    <g class="omen-boars" pointer-events="none">
      <rect x={4} y={6} width={92} height={88} rx={12} fill="#6c472d" fill-opacity={0.2} />
      <path d="M12 70 q8 -8 16 0 q8 8 16 0 M14 40 q8 -8 16 0" fill="none" stroke="#5a3a24" stroke-width={3} stroke-linecap="round" />
      <g transform="translate(56 56) scale(.8)"><circle cx={24} cy={24} r={21} fill="#fff6e0" stroke="#3f2a1d" stroke-width={2.4} />{icons.boar()}</g>
    </g>
  );
}
export function FireSmoke({ faint = false }: { faint?: boolean }) {
  return (
    <g class={`omen-fire${faint ? ' faint' : ''}`} pointer-events="none">
      {!faint && <rect x={4} y={6} width={92} height={88} rx={12} fill="#c4661a" fill-opacity={0.22} />}
      {[[22, faint ? 16 : 30], [50, faint ? 12 : 24], [78, faint ? 16 : 30]].map(([x, y], i) => (
        <circle cx={x} cy={y} r={faint ? 7 : 10} fill="#8a8580" fill-opacity={faint ? 0.35 : 0.5} class="omen-smoke" style={{ animationDelay: `${-i * 0.8}s` }} />
      ))}
      {!faint && <g transform="translate(58 54) scale(.8)"><circle cx={24} cy={24} r={21} fill="#fff6e0" stroke="#3f2a1d" stroke-width={2.4} />{icons.fire()}</g>}
    </g>
  );
}
