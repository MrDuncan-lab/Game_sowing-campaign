// Art for the meetings of the week's troubles on one bed (see ui/collisions.ts). Same ink-and-paper
// language as the crops. Bed pieces are drawn in a bed's own 100 × 100 units; the children's pieces
// in a runner's units (feet at y = 0, facing right).
import type { MissCause } from '../ui/collisions';
import { Crow, CrowFlying } from './crows';
import { Beetle } from './beetles';
import { Hopper } from './locusts';
const INK = '#3f2a1d';

/** A word said out loud, in the same lettering as the dog's «Гав!». */
export function Say({ text, x = 0, y = 0, cls = '' }: { text: string; x?: number; y?: number; cls?: string }) {
  return <g transform={`translate(${x} ${y})`}><g class={`say ${cls}`}><text class="say-word" text-anchor="middle">{text}</text></g></g>;
}

/** What is left on the bed after the plant is gone, so the late visitor has something to look at. */
export function BedLeftovers({ cause }: { cause: MissCause }) {
  if (cause === 'frost') return (
    <g class="bed-left bl-frost" stroke-linecap="round" stroke-linejoin="round">
      <rect x={10} y={14} width={80} height={74} rx={14} fill="rgba(222,238,248,.55)" stroke="rgba(244,250,255,.95)" stroke-width={1.6} />
      <path d="M20 30 l8 6 M64 24 l6 7 M30 70 l9 -4 M70 62 l-7 8" stroke="#ffffff" stroke-width={1.2} opacity={.85} />
      {/* the frozen stalk, bent and glassy */}
      <path d="M50 74 Q49 62 54 54 Q58 48 64 50" fill="none" stroke={INK} stroke-width={4.2} />
      <path d="M50 74 Q49 62 54 54 Q58 48 64 50" fill="none" stroke="#8fb2c4" stroke-width={2.2} />
      <path d="M53 58 Q44 54 42 60 Q47 63 53 58 Z M57 52 Q60 44 67 45 Q65 51 57 52 Z" fill="#b9d3df" stroke={INK} stroke-width={1.2} />
      <g class="bl-sparkle" fill="#ffffff" stroke="none">
        <path d="M40 40 l1.4 3.4 l3.4 1.4 l-3.4 1.4 l-1.4 3.4 l-1.4 -3.4 l-3.4 -1.4 l3.4 -1.4 Z" />
        <path d="M70 70 l1 2.4 l2.4 1 l-2.4 1 l-1 2.4 l-1 -2.4 l-2.4 -1 l2.4 -1 Z" />
      </g>
    </g>
  );
  if (cause === 'dry') return (
    <g class="bed-left bl-dry" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 32 l10 8 l-3 9 l8 6 M72 26 l-6 9 l5 8 M58 66 l9 6 l-2 8 M24 72 l9 -4 l5 7" stroke="rgba(63,42,29,.55)" stroke-width={1.8} fill="none" />
      {/* the dried stalk: it crumbles when touched */}
      <g class="bl-stalk">
        <path d="M50 76 Q51 64 47 56 Q44 50 38 50" fill="none" stroke={INK} stroke-width={4} />
        <path d="M50 76 Q51 64 47 56 Q44 50 38 50" fill="none" stroke="#b08a4a" stroke-width={2} />
        <path d="M48 60 Q56 54 60 58 Q56 62 48 60 Z M45 54 Q40 46 34 48 Q38 53 45 54 Z" fill="#c9a35a" stroke={INK} stroke-width={1.1} />
      </g>
      <g class="bl-crumbs" fill="#b08a4a" stroke="none">{[[44, 78], [53, 80], [58, 77], [40, 75]].map(([x, y]) => <circle cx={x} cy={y} r={1.4} />)}</g>
    </g>
  );
  if (cause === 'locust') return (
    <g class="bed-left bl-locust" stroke-linecap="round">
      {/* gnawed stubs where the plant was */}
      <path d="M42 74 v-7 M50 76 v-10 M58 74 v-6" stroke={INK} stroke-width={3.4} />
      <path d="M42 74 v-7 M50 76 v-10 M58 74 v-6" stroke="#8fae54" stroke-width={1.6} />
      <path d="M41 67 l2 -1 M49 66 l2 -1 M57 68 l2 -1" stroke={INK} stroke-width={1} />
    </g>
  );
  return null;
}

/** A crow that came for a plant that is no longer there: lands, pecks, finds nothing — and reacts. */
export function CrowMiss({ cause }: { cause: MissCause }) {
  return (
    <g class={`crow-miss cm-${cause}`}>
      {cause === 'locust' && <g class="cm-hopper" transform="translate(66 64) scale(1.3)"><Hopper /></g>}
      <g transform="translate(40 66)">
        <g class="mc-in"><g transform="translate(1 -16) scale(1.3)"><CrowFlying /></g></g>
        <g class="mc-stand"><g class="cm-skid"><g transform="scale(1.3)"><Crow /></g></g></g>
        <g class="mc-out"><g transform="translate(1 -16) scale(1.3)"><CrowFlying /></g></g>
      </g>
      {cause === 'frost' && <g class="cm-scratch" stroke="#ffffff" stroke-width={1.6} stroke-linecap="round" fill="none"><path d="M30 70 l16 1 M32 74 l14 0" /></g>}
      {cause === 'dry' && <g class="cm-dust" fill="#d9c08c" stroke="none" opacity={.85}><circle cx={74} cy={62} r={4} /><circle cx={80} cy={58} r={3} /><circle cx={70} cy={57} r={2.6} /></g>}
      <Say cls="cm-say" x={62} y={22} text={cause === 'locust' ? 'Ням!' : cause === 'frost' ? 'Кар?!' : cause === 'dry' ? 'Кхар!' : 'Кар?'} />
    </g>
  );
}

/** A beetle sitting on the chewed plant; the crow that comes for the plant takes the beetle too. */
export function CrowSnack() {
  return (
    <g class="crow-snack">
      <g transform="translate(72 52) rotate(-150) scale(1.3)"><g class="cs-bug"><Beetle /></g></g>
      <Say cls="cs-say" x={70} y={18} text="Ням!" />
    </g>
  );
}

/** Beetles or locusts sent to a bed the frost or the drought had already taken. */
export function BugMiss({ cause, pest }: { cause: MissCause; pest: 'beetle' | 'locust' }) {
  const spots: [number, number][] = [[34, 44], [56, 62], [66, 38]];
  return (
    <g class={`bug-miss bm-${cause} bm-${pest}`}>
      {spots.map(([x, y], i) => (
        <g transform={`translate(${x} ${y})`}>
          <g class={`bm-go b${i}`}><g class="bm-act">
            <g transform={pest === 'locust' ? 'scale(1.6)' : 'scale(1.5)'}>{pest === 'locust' ? <Hopper /> : <Beetle />}</g>
          </g></g>
        </g>
      ))}
      <Say cls="bm-say" x={50} y={24} text={cause === 'frost' ? 'Скользко!' : 'Пусто…'} />
    </g>
  );
}

/** Frosty breath for the child at the frozen bed. */
export function Breath() {
  return <g class="kid-breath" fill="#ffffff" stroke="#c9dbe6" stroke-width={.8}>
    <circle class="kb b0" cx={22} cy={-44} r={3} /><circle class="kb b1" cx={28} cy={-47} r={3.8} /><circle class="kb b2" cx={35} cy={-51} r={4.4} />
  </g>;
}

/** A dust cloud for the sneeze over the dried-up stalk. */
export function Dust() {
  return <g class="kid-dust" fill="#e2cb98" stroke="none">
    <circle class="kd d0" cx={24} cy={-20} r={6} /><circle class="kd d1" cx={33} cy={-26} r={5} /><circle class="kd d2" cx={28} cy={-34} r={4} /><circle class="kd d3" cx={38} cy={-16} r={4.4} />
  </g>;
}

/** The locust left on the gnawed bed, which jumps at the child. */
export function KidLocust() {
  return <g class="kid-locust"><g class="kl-hop"><g transform="scale(-1.7 1.7)"><Hopper /></g></g></g>;
}

/** The beetle the child flicks off the chewed plant before taking it. */
export function FlickedBeetle() {
  return <g class="kid-flick"><g class="kf-fly"><g transform="scale(1.4)"><Beetle /></g></g></g>;
}
