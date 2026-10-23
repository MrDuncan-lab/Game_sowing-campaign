// №19 · Колорадский жук on the attacked plant, in the same visual language as the locusts: the insects
// themselves, a few of them, big enough to read on a phone. Each crawls a short way along a leaf, stops,
// turns and crawls back — calm, slow. No ring and no corner badge; the bed menu and the lens give details.
const SPOTS: [number, number, number, number][] = [[30, 40, 18, 7.4], [64, 34, -24, 8.6], [50, 62, 8, 6.8]];

export function Beetle() {
  return (
    <g class="bt-bug">
      <ellipse cx={0} cy={1.6} rx={6.4} ry={2} fill="rgba(40,30,10,.22)" />
      {/* legs */}
      <path d="M-3 -1 l-3 -2.4 M-3 1.6 l-3.4 1.2 M0 -1.8 l0 -3.6 M0 2.4 l0 3 M3 -1 l3 -2.4 M3 1.6 l3.4 1.2" stroke="#2a1e12" stroke-width={0.9} stroke-linecap="round" class="bt-legs" />
      {/* the striped shell, seen from above, head forward (+x) */}
      <ellipse cx={-0.6} cy={0} rx={5.6} ry={4.4} fill="#f2c94c" stroke="#2a1e12" stroke-width={0.9} />
      <path d="M-5.4 -1.4 Q-1 -2.6 4.4 -1.6 M-5.6 1.4 Q-1 2.6 4.4 1.6 M-4.6 -3 Q-1 -4.2 3 -3.2 M-4.6 3 Q-1 4.2 3 3.2" fill="none" stroke="#2a1e12" stroke-width={0.75} />
      <path d="M-6.1 0 H4.6" stroke="#2a1e12" stroke-width={0.6} />
      <ellipse cx={5.4} cy={0} rx={2} ry={2.4} fill="#e07a2a" stroke="#2a1e12" stroke-width={0.8} />
      <circle cx={5.2} cy={-0.8} r={0.45} fill="#2a1e12" /><circle cx={5.2} cy={0.8} r={0.45} fill="#2a1e12" />
    </g>
  );
}

export function Beetles({ phase = 0 }: { phase?: number }) {
  return <g class="beetle-crawl" pointer-events="none" aria-hidden="true">
    {SPOTS.map(([x, y, rot, dur], i) => <g transform={`translate(${x} ${y}) rotate(${rot}) scale(1.25)`}>
      <g class="bt-walk" style={{ ['--bt-dur' as string]: `${dur}s`, ['--bt-del' as string]: `${-(i * 2.1 + phase * 4)}s` }}><Beetle /></g>
    </g>)}
  </g>;
}
