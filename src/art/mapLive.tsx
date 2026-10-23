// The live layer over the painted map: what moves on it. Kept light — a few small groups, CSS and one
// SMIL motion for the train. With reduced motion everything stands still in a sensible pose.
import { GLINTS, MILL_HUB, RAILWAY, SMOKE } from './mapLayout';
const INK = '#3d2a1b';

function Ship() {
  return <g class="ml-ship-art" stroke={INK} stroke-width={.6} stroke-linejoin="round">
    <path d="M-10 0 Q0 4.4 10 0 L8 -3 H-9 Z" fill="#8f5d34" />
    <path d="M-9 -3 H8" stroke="#5e3b20" stroke-width={.5} />
    <path d="M-2 -3 V-20 M5 -3 V-15" stroke-width={.7} />
    <path d="M-2 -19 Q4 -15 -2 -6 Z" fill="#fbf6ea" /><path d="M-2.4 -19 Q-9 -14 -2.4 -6 Z" fill="#efe4c8" />
    <path d="M5 -14.4 Q9.4 -11 5 -5.4 Z" fill="#fbf6ea" />
    <path d="M-2 -20 l5 1.6 l-5 1.2" fill="#b8473a" stroke-width={.4} />
  </g>;
}
function Sturgeon() {
  return <g stroke={INK} stroke-width={.5} stroke-linejoin="round">
    <path d="M-9 0 Q-2 -4 6 -1.4 L10 -3.6 L9.4 0 L10 3.4 L6 1.4 Q-2 4 -9 0 Z" fill="#8a9a9e" />
    <path d="M-6 -1 l1.4 -1.4 l1.2 1 M-2 -1.6 l1.4 -1.2 l1.2 1 M2 -1.4 l1.2 -1.2 l1.2 1" fill="none" stroke-width={.35} />
    <circle cx={-6.6} cy={-.4} r={.5} fill={INK} stroke="none" />
  </g>;
}
function Train() {
  return <g class="ml-train-art" stroke={INK} stroke-width={.5} stroke-linejoin="round">
    <rect x={-17} y={-4.6} width={6.4} height={4} rx={.6} fill="#a8723f" /><rect x={-10} y={-4.6} width={6.4} height={4} rx={.6} fill="#7a8a52" />
    <path d="M-3 -0.6 V-4 H3 V-6.6 H6 V-4 Q8.6 -4 8.6 -2 V-0.6 Z" fill="#3d2a1b" />
    <rect x={4} y={-9} width={1.6} height={3} fill="#3d2a1b" />
    {[-15, -12.6, -8, -5.6, -1, 2, 6].map((x) => <circle cx={x} cy={0} r={1} fill="#5e3b20" stroke-width={.3} />)}
    <g class="ml-steam">{[0, 1, 2].map((i) => <circle class={`ml-puff p${i}`} cx={4.8} cy={-10} r={1.6} fill="#fbf6ea" stroke="#b9a98a" stroke-width={.3} />)}</g>
  </g>;
}

export function MapLive({ still }: { still: boolean }) {
  return (
    <g class="map-live" pointer-events="none" aria-hidden="true">
      {GLINTS.map(([x, y], i) => <path class={`ml-glint g${i % 4}`} d={`M${x} ${y - 2.2} L${x + .6} ${y - .6} L${x + 2.2} ${y} L${x + .6} ${y + .6} L${x} ${y + 2.2} L${x - .6} ${y + .6} L${x - 2.2} ${y} L${x - .6} ${y - .6} Z`} fill="#fdfcf4" />)}
      <g transform="translate(97 260)"><g class="ml-ship"><Ship /></g></g>
      <g transform="translate(76 210)">
        <g class="ml-splash" fill="none" stroke="#e8f4f0" stroke-width={.6}><ellipse rx={5} ry={1.4} /><ellipse rx={8} ry={2.2} opacity={.6} /></g>
        <g class="ml-fish"><Sturgeon /></g>
      </g>
      <g transform={`translate(${MILL_HUB[0]} ${MILL_HUB[1]})`}>
        <g class="ml-sails" stroke={INK} stroke-width={.5} stroke-linejoin="round">
          {[0, 90, 180, 270].map((a) => <g transform={`rotate(${a})`}><path d="M0 0 V-11" stroke-width={.8} /><path d="M.4 -2.4 L3 -2.4 L3.2 -11 L.4 -11 Z" fill="#fbf6ea" /><path d="M.4 -5 H3.1 M.4 -8 H3.2" stroke-width={.3} /></g>)}
          <circle r={1.2} fill="#5e3b20" />
        </g>
      </g>
      {SMOKE.map(([x, y], i) => <g transform={`translate(${x} ${y})`}>{[0, 1, 2].map((k) => <circle class={`ml-smoke s${(i + k) % 3}`} cx={0} cy={0} r={1.4 + k * .3} fill="#efe6d2" stroke="#b9a98a" stroke-width={.25} />)}</g>)}
      {still
        ? <g transform="translate(236 151) rotate(8)"><Train /></g>
        : <g><Train /><animateMotion {...{ dur: "22s", repeatCount: "indefinite", rotate: "auto", path: RAILWAY, keyPoints: "0;1;1", keyTimes: "0;.8;1", calcMode: "linear" } as Record<string, string>} /></g>}
      <g class="ml-cranes" fill="none" stroke={INK} stroke-width={.6} stroke-linecap="round">
        {[[0, 0], [-6, 3], [-12, 6], [-6, -3], [-12, -6]].map(([x, y], i) => <path class={`ml-crane c${i % 2}`} d={`M${x - 2.4} ${y - 1.2} Q${x - 1} ${y - 2} ${x} ${y} Q${x + 1} ${y - 2} ${x + 2.4} ${y - 1.2}`} />)}
      </g>
    </g>
  );
}
