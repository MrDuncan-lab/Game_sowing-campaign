// Locusts on the attacked bed: a few olive grasshoppers with long hind legs. Each one sits and twitches its
// antennae, then hops — wings flash open in the air — rests, turns round and hops back. No badge, label or ring.
const SPOTS: [number, number, number, number][] = [[24, 38, 1, 4.6], [62, 26, -1, 5.4], [74, 56, 1, 4.2], [40, 70, -1, 5]];

export function Hopper() {
  return (
    <g class="lc-bug">
      <ellipse class="lc-shadow" cx={0} cy={2.6} rx={6} ry={1.2} fill="rgba(40,30,10,.22)" />
      <path class="lc-open" d="M-.6 -1.4 Q-5.6 -9.6 -10.4 -5.6 Q-6.4 -2.6 -.6 -1.4 Z M.4 -1.6 Q-2 -10.4 -7 -9.4 Q-4 -4.4 .4 -1.6 Z" fill="rgba(238,214,140,.78)" stroke="#8a7a3c" stroke-width={.4} />
      {/* far legs */}
      <path d="M-.4 .6 L-4.2 -3.4 L-6.8 2.2 M1.8 .8 l.8 2 M3.4 .6 l1.6 1.8" stroke="#3f4b25" stroke-width={.8} fill="none" stroke-linecap="round" stroke-linejoin="round" opacity={.7} />
      <path d="M-5.6 .6 Q-4.4 -2 .6 -2 Q4.2 -2 5.4 -.4 Q5 1.6 .6 1.7 Q-4 1.8 -5.6 .6Z" fill="#7a8c3e" stroke="#33401e" stroke-width={.75} stroke-linejoin="round" />
      <path class="lc-fold" d="M-6.4 -.2 Q-1.6 -3 3.4 -1.8 Q-1 -.6 -6.4 .5Z" fill="#a39a56" stroke="#5f5a2c" stroke-width={.45} stroke-linejoin="round" />
      <path d="M-4 .9 h1 M-2 1 h1 M0 1.1 h1" stroke="#5d6b2e" stroke-width={.45} />
      <circle cx={5.4} cy={-.7} r={1.7} fill="#8c9d48" stroke="#33401e" stroke-width={.6} />
      <circle cx={6} cy={-1.1} r={.5} fill="#2a2a18" />
      <g class="lc-ant"><path d="M6.2 -2.2 Q8.6 -5 10.8 -4.6 M5.6 -2.3 Q7.2 -5.8 9.2 -6.2" stroke="#3a4524" stroke-width={.5} fill="none" stroke-linecap="round" /></g>
      {/* the near hind leg, folded: femur up and back, tibia down to the ground */}
      <path class="lc-hind" d="M.2 .2 L-4.6 -3.8 L-7.4 2.4 l-1.4 .2" stroke="#3a4622" stroke-width={1.15} fill="none" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M2.4 1.2 l.6 2.2 M4 1 l1.4 2" stroke="#3a4622" stroke-width={.8} fill="none" stroke-linecap="round" />
    </g>
  );
}

export function Locusts({ phase = 0 }: { phase?: number }) {
  return <g class="locust-swarm" pointer-events="none" aria-hidden="true">
    {SPOTS.map(([x, y, dir, dur], i) => <g transform={`translate(${x} ${y}) scale(${dir * 0.95} .95)`}>
      <g class="lc-hop" style={{ ['--lc-dur' as string]: `${dur}s`, ['--lc-del' as string]: `${-(i * 1.37 + phase * 3)}s` }}><Hopper /></g>
    </g>)}
  </g>;
}
