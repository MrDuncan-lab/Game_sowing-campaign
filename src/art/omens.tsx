// Trouble drawn on the bed itself instead of a ring and a badge: the shadow of a hail cloud with the first
// pellets, river water creeping in, weed fluff drifting onto bare soil, beetles crawling up to the potato.
// Each piece lives in a 100 × 100 tile, under the plant's own animations; pointer events are off.
import { Beetle } from './beetles';

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
