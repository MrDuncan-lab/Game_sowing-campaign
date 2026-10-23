// Farm animals with real silhouettes and small purposeful motions (viewBox 0 0 100 100, feet at y≈90).
// Poses: stand — at rest; walk — legs move while the body travels; act — the animal does its job
// (goose plucks, hedgehog sniffs, goat chews); look — a short pause with the head turned.
export type LifePose = 'stand' | 'walk' | 'act' | 'look';
const INK = '#3f2a1d';

// ---------- goose ----------
function Goose({ delay = 0 }: { delay?: number }) {
  const d = { '--d': `${delay}s` } as Record<string, string>;
  const neck = 'M63 60 C68 48 67 37 73 27';
  return (
    <g class="goose" style={d}>
      <ellipse cx={50} cy={91} rx={25} ry={3.6} fill="#3a2a1a22" />
      <g class="goose-leg leg-back">
        <path d="M45 76 L44 88" stroke={INK} stroke-width={5.4} stroke-linecap="round" />
        <path d="M45 76 L44 88" stroke="#e98a2a" stroke-width={2.6} stroke-linecap="round" />
        <path d="M44 88 L37 91.5 L50 91.5 Z" fill="#e98a2a" stroke={INK} stroke-width={1.6} stroke-linejoin="round" />
      </g>
      {/* neck outline sits behind the body so the joint stays soft */}
      <g class="goose-neck">
        <path d={neck} fill="none" stroke={INK} stroke-width={12.5} stroke-linecap="round" />
        <g class="goose-head"><ellipse cx={76.5} cy={24} rx={9.6} ry={8.6} fill={INK} /></g>
      </g>
      <g class="goose-body">
        <path d="M13 51 Q20 57 28 55 Q34 47 48 47 Q62 47 69 55 Q75 63 71 72 Q66 81 50 81 Q32 81 25 71 Q20 62 13 51 Z" fill="#fbf8f0" stroke={INK} stroke-width={2.2} stroke-linejoin="round" />
        <path d="M27 71 Q36 79 51 79 Q63 79 69 71 Q60 75 48 75 Q35 75 27 71 Z" fill="#e8e1d2" />
        <path d="M29 59 Q41 50 58 56 Q64 61 59 68 Q50 74 36 69 Q27 66 29 59 Z" fill="#efe9dc" stroke={INK} stroke-width={1.8} stroke-linejoin="round" />
        <path d="M37 61 Q46 57 54 61 M35 65.5 Q44 63 52 66.5" fill="none" stroke="#bfb3a0" stroke-width={1.5} stroke-linecap="round" />
        <path d="M16 53 L24 56 M18.5 57 L26 58.5" stroke="#cfc4b2" stroke-width={1.4} stroke-linecap="round" />
      </g>
      <g class="goose-leg leg-front">
        <path d="M54 77 L56 88" stroke={INK} stroke-width={5.4} stroke-linecap="round" />
        <path d="M54 77 L56 88" stroke="#f39a36" stroke-width={2.6} stroke-linecap="round" />
        <path d="M56 88 L50 91.5 L63 91.5 Z" fill="#f39a36" stroke={INK} stroke-width={1.6} stroke-linejoin="round" />
      </g>
      <g class="goose-neck">
        <path d={neck} fill="none" stroke="#fbf8f0" stroke-width={8} stroke-linecap="round" />
        <g class="goose-head">
          <ellipse cx={76.5} cy={24} rx={8} ry={7} fill="#fbf8f0" />
          <path d="M83 20.5 Q92 21 96.5 25.5 Q92 29 83 27.5 Z" fill="#f39a36" stroke={INK} stroke-width={1.6} stroke-linejoin="round" />
          <path d="M84 24.2 Q90 24.6 95 25.6" fill="none" stroke="#b4581a" stroke-width={1} />
          <circle cx={84.5} cy={19.8} r={2.2} fill="#e07a22" stroke={INK} stroke-width={1.2} />
          <circle cx={79} cy={21.5} r={1.7} fill={INK} />
          <circle cx={79.6} cy={20.9} r={0.55} fill="#fff" />
        </g>
      </g>
    </g>
  );
}
export function GeesePair() {
  return (
    <g>
      <g transform="translate(1 31) scale(.64)"><Goose delay={-0.9} /></g>
      <g transform="translate(29 25) scale(.71)"><Goose /></g>
    </g>
  );
}

// ---------- hedgehog ----------
function spikes(): string {
  // a dome of short backward-leaning spines from the tail round to the forehead
  const pts: string[] = [];
  const cx = 42, cy = 78, rx = 33, ry = 31;
  const from = 188, to = 22, n = 15;
  for (let i = 0; i <= n * 2; i++) {
    const t = from + ((to - from) * i) / (n * 2);
    const out = i % 2 ? 1.2 : 1;
    const lean = i % 2 ? 9 : 0;
    const a = ((t + lean) * Math.PI) / 180;
    pts.push(`${(cx + Math.cos(a) * rx * out).toFixed(1)} ${(cy - Math.sin(a) * ry * out).toFixed(1)}`);
  }
  return `M${pts.join(' L')} Q70 70 66 86 L12 86 Z`;
}
const SPIKES = spikes();
export function Hedgehog() {
  return (
    <g class="hedgehog">
      <ellipse cx={52} cy={90} rx={34} ry={3.8} fill="#3a2a1a22" />
      <g class="hh-feet" fill="#c58c6c" stroke={INK} stroke-width={1.6}>
        <ellipse class="hh-foot fa" cx={26} cy={87.5} rx={5} ry={3} />
        <ellipse class="hh-foot fb" cx={40} cy={88.5} rx={5} ry={3} />
        <ellipse class="hh-foot fa" cx={62} cy={88.5} rx={5} ry={3} />
        <ellipse class="hh-foot fb" cx={74} cy={87.5} rx={5} ry={3} />
      </g>
      <g class="hh-body">
        <path d="M58 60 Q71 52 82 61 Q89 67 95 69.5 Q100 72 97.5 76.5 Q94 80.5 85 80.5 L67 86 Q57 85 55 76 Z" fill="#ebcfa6" stroke={INK} stroke-width={2.1} stroke-linejoin="round" />
        <path d="M62 80 Q75 82 88 79 Q80 84 68 85.5 Z" fill="#d6b388" />
        <path d={SPIKES} fill="#7a5233" stroke={INK} stroke-width={2.1} stroke-linejoin="round" />
        <g fill="none" stroke="#b98a5a" stroke-width={1.6} stroke-linecap="round">
          <path d="M20 70 l-5 -4 M27 61 l-5 -5 M36 55 l-4 -6 M46 52 l-3 -6 M56 54 l-1 -6 M24 77 l-5 -3 M33 69 l-5 -4 M43 63 l-4 -5 M53 62 l-2 -6 M38 77 l-5 -3 M48 71 l-4 -4" />
        </g>
        <g fill="none" stroke="#5a3a22" stroke-width={1.4} stroke-linecap="round" opacity={0.75}>
          <path d="M18 62 l-4 -3 M30 50 l-3 -5 M42 46 l-2 -5 M58 47 l0 -5" />
        </g>
        <circle cx={63.5} cy={59} r={4.2} fill="#e0b98e" stroke={INK} stroke-width={1.6} />
        <circle cx={63.5} cy={59.4} r={1.8} fill="#b98d68" />
        <g class="hh-snout">
          <circle class="hh-nose" cx={96} cy={72.5} r={3.4} fill={INK} />
          <circle cx={95} cy={71.4} r={0.9} fill="#fff" opacity={0.8} />
          <path d="M88 76.5 Q91 78 94 76.8" fill="none" stroke={INK} stroke-width={1.3} stroke-linecap="round" />
        </g>
        <ellipse class="hh-eye" cx={77.5} cy={64.5} rx={2.3} ry={2.7} fill={INK} />
        <circle cx={78.2} cy={63.6} r={0.75} fill="#fff" />
        <ellipse cx={82} cy={71} rx={3.4} ry={2} fill="#e9a58a" opacity={0.55} />
      </g>
    </g>
  );
}

// ---------- goat ----------
function Leg({ x, far, cls }: { x: number; far?: boolean; cls: string }) {
  return (
    <g class={`goat-leg ${cls}`}>
      <path d={`M${x} 62 L${x} 85`} stroke={INK} stroke-width={7.2} stroke-linecap="round" />
      <path d={`M${x} 62 L${x} 84`} stroke={far ? '#dcd3c3' : '#f6f2e8'} stroke-width={4} stroke-linecap="round" />
      <path d={`M${x - 3.2} 84.5 H${x + 3.4} L${x + 3} 90 H${x - 3.4} Z`} fill="#4b3a2c" stroke={INK} stroke-width={1.4} stroke-linejoin="round" />
    </g>
  );
}
export function Goat() {
  return (
    <g class="goat">
      <ellipse cx={50} cy={91} rx={31} ry={3.8} fill="#3a2a1a22" />
      <Leg x={34} far cls="la" />
      <Leg x={66} far cls="lb" />
      <path class="goat-tail" d="M27 45 Q18 38 21 31 Q27 34 30 42 Z" fill="#f6f2e8" stroke={INK} stroke-width={1.8} stroke-linejoin="round" />
      <g class="goat-body">
        <path d="M25 50 Q25 40 37 40 L60 40 Q72 40 74 50 L74 57 Q74 67 63 67 L36 67 Q25 67 25 57 Z" fill="#f6f2e8" stroke={INK} stroke-width={2.2} stroke-linejoin="round" />
        <path d="M30 62 Q46 68 70 61 Q68 66 62 66.5 L37 66.5 Q31 66 30 62 Z" fill="#e2d9c8" />
        <path d="M33 44 Q42 41 47 47 Q49 55 41 57 Q33 57 31 51 Z" fill="#c9a77e" opacity={0.85} />
      </g>
      <Leg x={29} cls="lb" />
      <Leg x={61} cls="la" />
      <g class="goat-head">
        <path d="M60 47 Q62 34 70 26 L79.5 29 Q75 37 72.5 51 Z" fill="#f6f2e8" stroke={INK} stroke-width={2.1} stroke-linejoin="round" />
        <ellipse cx={66} cy={48} rx={7.5} ry={5} fill="#f6f2e8" />
        <path d="M74 17.5 Q71 8 62.5 7.5" fill="none" stroke={INK} stroke-width={6} stroke-linecap="round" />
        <path d="M74 17.5 Q71 8 62.5 7.5" fill="none" stroke="#b7a07a" stroke-width={3.2} stroke-linecap="round" />
        <path d="M78.5 16.5 Q77 6 68.5 4" fill="none" stroke={INK} stroke-width={6} stroke-linecap="round" />
        <path d="M78.5 16.5 Q77 6 68.5 4" fill="none" stroke="#c9b48c" stroke-width={3.2} stroke-linecap="round" />
        <path d="M71 20 Q80 13.5 88 19.5 Q92 23 95 30.5 Q97 36 92 37.6 Q86 39 80 35 Q72.5 30 71 20 Z" fill="#f6f2e8" stroke={INK} stroke-width={2.1} stroke-linejoin="round" />
        <path d="M86 33 Q90 37.5 95.5 34" fill="#e7c9b2" stroke="none" />
        <path class="goat-ear" d="M73 24.5 Q63 25 57.5 30.5 Q64.5 33 73.5 29 Z" fill="#efe7d7" stroke={INK} stroke-width={1.8} stroke-linejoin="round" />
        <ellipse cx={82} cy={23.5} rx={2.9} ry={2.4} fill="#f0cf72" stroke={INK} stroke-width={1.2} />
        <rect x={80.4} y={22.9} width={3.4} height={1.3} rx={0.6} fill={INK} />
        <path d="M92.5 31.5 l1.6 0.6" stroke={INK} stroke-width={1.5} stroke-linecap="round" />
        <g class="goat-jaw">
          <path d="M85.5 36.8 Q90 39.6 94.5 37" fill="none" stroke={INK} stroke-width={1.5} stroke-linecap="round" />
          <path class="goat-beard" d="M84 37 Q82 45.5 86.5 50 Q88.5 44 88.6 38.2 Z" fill="#e6dfd0" stroke={INK} stroke-width={1.6} stroke-linejoin="round" />
        </g>
      </g>
    </g>
  );
}

// one svg for a farm animal; the pose drives purely local CSS motion
export function Animal({ id, size = 48, pose = 'stand' }: { id: 'geese' | 'hedgehog' | 'goat'; size?: number; pose?: LifePose }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" class={`pet animal pet-${id} pose-${pose}`} overflow="visible">
      {id === 'geese' ? <GeesePair /> : id === 'hedgehog' ? <Hedgehog /> : <Goat />}
    </svg>
  );
}
