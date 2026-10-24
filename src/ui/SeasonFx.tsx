// Ambient weather over the farm. Spring: apple petals tumbling down. Summer: a few cabbage-white
// butterflies and drifting pollen. Autumn: birch and maple leaves turning as they fall. Winter: snow
// that sways. Rain: slanted streaks and rings opening on the ground. Everything is light and slow.
export type FxKind = 'spring' | 'summer' | 'autumn' | 'winter';

function r(i: number, k: number) {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const COUNT: Record<FxKind, number> = { spring: 12, summer: 10, autumn: 12, winter: 44 };
const DUR: Record<FxKind, [number, number]> = { spring: [10, 16], summer: [14, 22], autumn: [8, 13], winter: [8, 15] };
const PETAL = ['#f8d3df', '#fdeef3', '#f3bccd'];
const LEAF = ['#d9822f', '#c4502f', '#e2b13c'];

function Petal({ c }: { c: string }) {
  return <svg viewBox="-6 -6 12 12" width="10" height="10"><path d="M0 -5 C4 -4 5 1 0 5 C-5 1 -4 -4 0 -5 Z" fill={c} stroke="#d99aae" stroke-width=".5" /><path d="M0 -3 V3" stroke="#e6aabd" stroke-width=".4" /></svg>;
}
function Leaf({ c, birch }: { c: string; birch: boolean }) {
  return birch
    ? <svg viewBox="-8 -8 16 16" width="12" height="12"><path d="M0 -6 C5 -4 5 3 0 6 C-5 3 -5 -4 0 -6 Z" fill={c} stroke="#7a4a22" stroke-width=".6" /><path d="M0 -5 V7" stroke="#7a4a22" stroke-width=".5" /></svg>
    : <svg viewBox="-8 -8 16 16" width="15" height="15"><path d="M0 -7 L1.6 -3 L5.6 -4.4 L4 -.4 L7 1.4 L2.6 2.4 L2 6 L0 4 L-2 6 L-2.6 2.4 L-7 1.4 L-4 -.4 L-5.6 -4.4 L-1.6 -3 Z" fill={c} stroke="#7a3a1e" stroke-width=".6" stroke-linejoin="round" /><path d="M0 7.4 V-4 M0 2 L4 -1 M0 2 L-4 -1" stroke="#7a3a1e" stroke-width=".4" /></svg>;
}
function Butterfly() {
  return (
    <svg viewBox="-10 -8 20 16" width="18" height="14" class="bfly-art">
      <g class="bw l"><path d="M0 0 C-3 -7 -9 -7 -8 -2 C-7 1 -3 1 0 0 Z M0 0 C-3 2 -7 4 -6 6 C-4 7 -1 4 0 0 Z" fill="#fbf8ee" stroke="#6b5a48" stroke-width=".5" /><circle cx={-5.4} cy={-3.4} r={.9} fill="#4a4038" /></g>
      <g class="bw r"><path d="M0 0 C3 -7 9 -7 8 -2 C7 1 3 1 0 0 Z M0 0 C3 2 7 4 6 6 C4 7 1 4 0 0 Z" fill="#f4f0e0" stroke="#6b5a48" stroke-width=".5" /><circle cx={5.4} cy={-3.4} r={.9} fill="#4a4038" /></g>
      <path d="M0 -3 V4" stroke="#4a4038" stroke-width="1.2" stroke-linecap="round" />
    </svg>
  );
}

export function SeasonFx({ kind, rain, heat }: { kind: FxKind; rain?: boolean; heat?: boolean }) {
  const n = COUNT[kind];
  const [d0, d1] = DUR[kind];
  return (
    <div class={`fx fx-${kind}`} aria-hidden="true">
      {kind !== 'summer' && Array.from({ length: n }, (_, i) => {
        const dur = d0 + r(i, 1) * (d1 - d0);
        return (
          <i
            class={`p v${i % 3}`}
            style={{
              left: `${r(i, 2) * 100}%`,
              animationDuration: `${dur}s`,
              animationDelay: `${-r(i, 3) * dur}s`,
              ['--drift' as string]: `${(r(i, 4) - 0.5) * 140}px`,
              ['--spin' as string]: `${(r(i, 5) - 0.5) * 720}deg`,
              ['--s' as string]: `${0.7 + r(i, 6) * 0.6}`,
              ['--sway' as string]: `${2.4 + r(i, 7) * 2.4}s`,
            }}
          >
            <span class="tumble" style={{ animationDuration: `${1.6 + r(i, 8) * 2}s`, animationDelay: `${-r(i, 9) * 2}s` }}>
              {kind === 'spring' ? <Petal c={PETAL[i % 3]} /> : kind === 'autumn' ? <Leaf c={LEAF[i % 3]} birch={i % 2 === 0} /> : null}
            </span>
          </i>
        );
      })}
      {kind === 'summer' && <>
        {!rain && Array.from({ length: 3 }, (_, i) => (
          <i class={`bfly b${i}`} style={{ top: `${18 + i * 24}%`, animationDuration: `${20 + i * 6}s`, animationDelay: `${-i * 7}s` }}>
            <span class="bfly-bob" style={{ animationDuration: `${1.8 + i * .4}s` }}><Butterfly /></span>
          </i>
        ))}
        {Array.from({ length: n }, (_, i) => {
          const dur = d0 + r(i, 1) * (d1 - d0);
          return <b class="mote" style={{ left: `${r(i, 2) * 100}%`, animationDuration: `${dur}s`, animationDelay: `${-r(i, 3) * dur}s`, ['--drift' as string]: `${(r(i, 4) - 0.5) * 90}px` }} />;
        })}
      </>}
      {heat && <div class="heat-haze">{Array.from({ length: 6 }, (_, i) => (
        <i style={{ left: `${4 + i * 16 + r(i, 21) * 6}%`, animationDelay: `${-r(i, 22) * 4}s`, animationDuration: `${3.4 + r(i, 23) * 1.6}s` }}>
          <svg viewBox="0 0 20 80" width="20" height="80"><path d="M10 80 q-6 -10 0 -20 t0 -20 t0 -20 t0 -20" fill="none" stroke="#fff6e0" stroke-width="2.4" stroke-linecap="round" /></svg>
        </i>
      ))}</div>}
      {rain && <>
        {Array.from({ length: 40 }, (_, i) => (
          <b class="rain" style={{ left: `${r(i, 7) * 110 - 5}%`, animationDuration: `${0.5 + r(i, 8) * 0.3}s`, animationDelay: `${-r(i, 9)}s` }} />
        ))}
        {Array.from({ length: 14 }, (_, i) => (
          <b class="ripple" style={{ left: `${6 + r(i, 11) * 88}%`, top: `${18 + r(i, 12) * 76}%`, animationDelay: `${-r(i, 13) * 1.6}s`, animationDuration: `${1.3 + r(i, 14) * .6}s` }} />
        ))}
      </>}
    </div>
  );
}
