export type PetPose = 'sit' | 'walk' | 'sniff' | 'nap' | 'play';
// The cat and the dog in profile, facing right (viewBox 0 0 100 100, paws on y≈90) — the same drawing
// language as the geese, the goat and the hedgehog. Three bodies: standing (walk, sniff, play), sitting
// and curled up asleep. Every moving part is a group with its joint as the transform origin (CSS).
const INK = '#3f2a1d';

type Coat = { fur: string; far: string; light: string; mark: string; ear: string };
const CAT: Coat = { fur: '#e1a463', far: '#c98a4c', light: '#f6dcb4', mark: '#c2783a', ear: '#e99d91' };
const DOG: Coat = { fur: '#c58d60', far: '#a8714a', light: '#f3ddb8', mark: '#865735', ear: '#865735' };

function Leg({ cls, x, top, foot, color, w = 4.6 }: { cls: string; x: number; top: number; foot: number; color: string; w?: number }) {
  return (
    <g class={`c-leg ${cls}`} style={{ transformOrigin: `${x}px ${top}px` }}>
      <path d={`M${x} ${top} L${x + .6} ${foot - 2}`} stroke={INK} stroke-width={w + 2.2} stroke-linecap="round" />
      <path d={`M${x} ${top} L${x + .6} ${foot - 2}`} stroke={color} stroke-width={w} stroke-linecap="round" />
      <ellipse cx={x + 2.2} cy={foot - 1} rx={3.6} ry={2.1} fill={color} stroke={INK} stroke-width={1.4} />
    </g>
  );
}

// ---------- heads, drawn around a neck point so they can turn and dip ----------
function CatHead({ x, y, asleep }: { x: number; y: number; asleep?: boolean }) {
  return (
    <g class="c-head" style={{ transformOrigin: `${x - 6}px ${y + 6}px` }}>
      <path class="c-ear back-ear" style={{ transformOrigin: `${x - 2}px ${y - 8}px` }} d={`M${x - 6} ${y - 6} L${x - 4} ${y - 18} L${x + 3} ${y - 9} Z`} fill={CAT.far} stroke={INK} stroke-width={1.6} stroke-linejoin="round" />
      <path d={`M${x - 10} ${y + 2} Q${x - 10} ${y - 10} ${x} ${y - 10} Q${x + 9} ${y - 10} ${x + 11} ${y - 2} L${x + 14} ${y + 2} Q${x + 14} ${y + 6} ${x + 9} ${y + 7} Q${x + 4} ${y + 11} ${x - 3} ${y + 10} Q${x - 10} ${y + 8} ${x - 10} ${y + 2} Z`} fill={CAT.fur} stroke={INK} stroke-width={1.9} stroke-linejoin="round" />
      <path class="c-ear" style={{ transformOrigin: `${x + 4}px ${y - 8}px` }} d={`M${x + 1} ${y - 9} L${x + 5} ${y - 20} L${x + 10} ${y - 6} Z`} fill={CAT.fur} stroke={INK} stroke-width={1.6} stroke-linejoin="round" />
      <path d={`M${x + 3} ${y - 9} L${x + 5} ${y - 16} L${x + 8} ${y - 8} Z`} fill={CAT.ear} />
      <path d={`M${x + 4} ${y + 4} Q${x + 10} ${y + 2} ${x + 13} ${y + 4} Q${x + 10} ${y + 8} ${x + 4} ${y + 7} Z`} fill={CAT.light} />
      <path d={`M${x - 4} ${y - 8} q2 3 0 5 M${x - .4} ${y - 9.4} q2 3 0 5`} stroke={CAT.mark} stroke-width={1.3} fill="none" stroke-linecap="round" />
      {asleep
        ? <path d={`M${x + 3} ${y - 1.6} Q${x + 6} ${y + .8} ${x + 9} ${y - 1.4}`} fill="none" stroke={INK} stroke-width={1.3} stroke-linecap="round" />
        : <g class="c-eye" style={{ transformOrigin: `${x + 6}px ${y - 2}px` }}><path d={`M${x + 2.6} ${y - 2} Q${x + 6} ${y - 5.2} ${x + 9.4} ${y - 2} Q${x + 6} ${y + 1} ${x + 2.6} ${y - 2} Z`} fill="#b9c46a" stroke={INK} stroke-width={1} /><ellipse cx={x + 6.6} cy={y - 2} rx={.9} ry={2} fill={INK} /></g>}
      <path d={`M${x + 12.6} ${y + 1.4} l1.6 .6 l-1 1.4 Z`} fill="#c87978" stroke={INK} stroke-width={.6} />
      <path d={`M${x + 12} ${y + 3.6} Q${x + 10} ${y + 6.4} ${x + 7.6} ${y + 5}`} fill="none" stroke={INK} stroke-width={1} stroke-linecap="round" />
      <g stroke={INK} stroke-width={.6} opacity={.55}><path d={`M${x + 9} ${y + 3.4} l9 -1.6 M${x + 9} ${y + 4.6} l9 1.2`} /></g>
    </g>
  );
}
function DogHead({ x, y, asleep }: { x: number; y: number; asleep?: boolean }) {
  return (
    <g class="c-head" style={{ transformOrigin: `${x - 8}px ${y + 8}px` }}>
      <path d={`M${x - 10} ${y + 4} Q${x - 12} ${y - 10} ${x - 1} ${y - 13} Q${x + 9} ${y - 15} ${x + 12} ${y - 5} L${x + 20} ${y - 1} Q${x + 24} ${y + 4} ${x + 18} ${y + 7} L${x + 8} ${y + 9} Q${x - 6} ${y + 13} ${x - 10} ${y + 4} Z`} fill={DOG.fur} stroke={INK} stroke-width={1.9} stroke-linejoin="round" />
      <path d={`M${x + 8} ${y - 5} L${x + 19} ${y - 1} Q${x + 22} ${y + 4} ${x + 17} ${y + 6} L${x + 7} ${y + 7} Q${x + 4} ${y + 1} ${x + 8} ${y - 5} Z`} fill={DOG.light} />
      <path d={`M${x - 2} ${y - 13} Q${x + 2} ${y - 6} ${x + 7} ${y - 6}`} fill="none" stroke={DOG.light} stroke-width={3} stroke-linecap="round" />
      <ellipse cx={x + 21.4} cy={y + .4} rx={2.6} ry={2.1} fill={INK} />
      {asleep
        ? <path d={`M${x + 1.6} ${y - 4} Q${x + 4} ${y - 2} ${x + 6.6} ${y - 4}`} fill="none" stroke={INK} stroke-width={1.3} stroke-linecap="round" />
        : <g class="c-eye" style={{ transformOrigin: `${x + 4}px ${y - 4.4}px` }}><ellipse cx={x + 4} cy={y - 4.4} rx={1.9} ry={2.1} fill={INK} /><circle cx={x + 4.6} cy={y - 5.2} r={.6} fill="#fff" /></g>}
      <path d={`M${x + 9} ${y + 8} Q${x + 14} ${y + 10.4} ${x + 18} ${y + 7}`} fill="none" stroke={INK} stroke-width={1.2} stroke-linecap="round" />
      <path d={`M${x - 10} ${y + 4} Q${x - 6} ${y + 9} ${x} ${y + 9}`} fill="none" stroke="#c94b3a" stroke-width={2.6} />
      <g class="c-ear" style={{ transformOrigin: `${x - 3}px ${y - 11}px` }}>
        <path d={`M${x - 5} ${y - 12} Q${x - 14} ${y - 12} ${x - 13} ${y} Q${x - 12} ${y + 8} ${x - 6} ${y + 6} Q${x - 1} ${y - 3} ${x} ${y - 11} Z`} fill={DOG.ear} stroke={INK} stroke-width={1.6} stroke-linejoin="round" />
      </g>
    </g>
  );
}

// ---------- bodies ----------
function Standing({ id }: { id: 'cat' | 'dog' }) {
  const c = id === 'cat' ? CAT : DOG, cat = id === 'cat';
  return (
    <g class="c-stand">
      <ellipse cx={50} cy={90.5} rx={30} ry={3.4} fill="#3a2a1a24" />
      <Leg cls="fh" x={31} top={66} foot={90} color={c.far} />
      <Leg cls="ff" x={64} top={66} foot={90} color={c.far} />
      <g class="c-tail" style={{ transformOrigin: cat ? '24px 56px' : '23px 58px' }}>
        {cat
          ? <><path d="M25 57 C13 53 9 41 12 30 C13.4 25 18 25 17.4 30" fill="none" stroke={INK} stroke-width={7.4} stroke-linecap="round" /><path d="M25 57 C13 53 9 41 12 30 C13.4 25 18 25 17.4 30" fill="none" stroke={c.fur} stroke-width={4.8} stroke-linecap="round" /><path d="M11.6 40 l4 -1 M11.4 34 l4 0" stroke={c.mark} stroke-width={1.4} /></>
          : <><path d="M24 58 Q12 52 10 38" fill="none" stroke={INK} stroke-width={8} stroke-linecap="round" /><path d="M24 58 Q12 52 10 38" fill="none" stroke={c.fur} stroke-width={5.2} stroke-linecap="round" /><path d="M10.6 41 L10 37.4" stroke={c.light} stroke-width={5} stroke-linecap="round" /></>}
      </g>
      <g class="c-body" style={{ transformOrigin: '48px 70px' }}>
        <path d={cat ? 'M24 60 Q24 49 38 49 H60 Q72 48 74 57 Q75 67 64 70 H35 Q24 70 24 60 Z' : 'M22 61 Q22 48 37 48 H60 Q74 48 76 59 Q76 70 63 71 H34 Q22 71 22 61 Z'} fill={c.fur} stroke={INK} stroke-width={2.1} stroke-linejoin="round" />
        <path d={cat ? 'M34 69 Q50 72 66 68' : 'M33 70 Q50 73 66 69'} fill="none" stroke={c.light} stroke-width={3.6} stroke-linecap="round" />
        {cat ? <path d="M38 50 q2 5 0 9 M46 49.6 q2 5 0 9 M54 49.6 q2 5 0 9" fill="none" stroke={c.mark} stroke-width={1.6} stroke-linecap="round" />
          : <path d="M40 49 Q50 56 58 49" fill={c.mark} stroke="none" />}
      </g>
      <Leg cls="nh" x={35} top={66} foot={90} color={c.fur} />
      <Leg cls="nf" x={68} top={66} foot={90} color={c.fur} />
      {cat ? <CatHead x={78} y={44} /> : <DogHead x={78} y={42} />}
    </g>
  );
}
function Sitting({ id }: { id: 'cat' | 'dog' }) {
  const c = id === 'cat' ? CAT : DOG, cat = id === 'cat';
  return (
    <g class="c-sit">
      <ellipse cx={50} cy={90.5} rx={27} ry={3.4} fill="#3a2a1a24" />
      <g class="c-tail" style={{ transformOrigin: '30px 86px' }}>
        {cat
          ? <><path d="M30 87 C40 92 60 92 72 87 C76 85 74 82 70 84" fill="none" stroke={INK} stroke-width={7.2} stroke-linecap="round" /><path d="M30 87 C40 92 60 92 72 87 C76 85 74 82 70 84" fill="none" stroke={c.fur} stroke-width={4.6} stroke-linecap="round" /></>
          : <><path d="M28 86 Q16 86 12 78" fill="none" stroke={INK} stroke-width={8} stroke-linecap="round" /><path d="M28 86 Q16 86 12 78" fill="none" stroke={c.fur} stroke-width={5.2} stroke-linecap="round" /><path d="M12.6 80 L11.6 77" stroke={c.light} stroke-width={5} stroke-linecap="round" /></>}
      </g>
      <Leg cls="ff" x={58} top={62} foot={90} color={c.far} />
      <g class="c-body" style={{ transformOrigin: '44px 88px' }}>
        <path d={cat ? 'M28 88 Q24 70 34 60 Q44 48 56 46 Q64 50 64 62 L64 86 Q50 90 28 88 Z' : 'M26 88 Q22 70 32 58 Q42 46 56 44 Q66 48 66 60 L66 86 Q50 91 26 88 Z'} fill={c.fur} stroke={INK} stroke-width={2.1} stroke-linejoin="round" />
        <path d={cat ? 'M30 86 Q28 72 40 70 Q52 72 50 86 Z' : 'M28 86 Q26 72 39 69 Q52 71 50 86 Z'} fill={c.far} opacity={.5} />
        <path d={cat ? 'M30 87 Q30 74 40 72 Q50 74 48 87' : 'M28 87 Q28 74 39 71 Q50 73 48 87'} fill="none" stroke={INK} stroke-width={1.6} />
        <path d={cat ? 'M57 50 Q63 58 62 70' : 'M58 48 Q65 56 64 70'} fill="none" stroke={c.light} stroke-width={5} stroke-linecap="round" />
        {cat && <path d="M38 58 q3 3 2 7 M44 54 q3 3 2 7" fill="none" stroke={c.mark} stroke-width={1.5} stroke-linecap="round" />}
      </g>
      <Leg cls="nf" x={62} top={62} foot={90} color={c.fur} />
      {cat ? <CatHead x={60} y={38} /> : <DogHead x={60} y={34} />}
    </g>
  );
}
function Curled({ id }: { id: 'cat' | 'dog' }) {
  const c = id === 'cat' ? CAT : DOG, cat = id === 'cat';
  return (
    <g class="c-nap">
      <ellipse cx={50} cy={90} rx={34} ry={3.6} fill="#3a2a1a24" />
      <g class="c-body" style={{ transformOrigin: '50px 89px' }}>
        <path d={cat ? 'M18 88 Q14 66 34 62 Q52 58 66 64 Q78 70 76 88 Z' : 'M14 88 Q12 70 30 66 Q52 62 70 68 Q82 74 80 88 Z'} fill={c.fur} stroke={INK} stroke-width={2.1} stroke-linejoin="round" />
        {cat ? <path d="M30 65 q2 4 1 7 M40 62 q2 4 1 7 M50 62 q2 4 1 7" fill="none" stroke={c.mark} stroke-width={1.5} stroke-linecap="round" />
          : <path d="M32 67 Q44 72 56 66" fill={c.mark} stroke="none" />}
        <path d="M24 86 Q22 76 32 74 Q42 76 40 86" fill="none" stroke={INK} stroke-width={1.5} />
      </g>
      <g class="c-tail" style={{ transformOrigin: '20px 86px' }}>
        {cat
          ? <><path d="M20 86 C26 94 50 94 66 89" fill="none" stroke={INK} stroke-width={7} stroke-linecap="round" /><path d="M20 86 C26 94 50 94 66 89" fill="none" stroke={c.fur} stroke-width={4.4} stroke-linecap="round" /></>
          : <><path d="M16 86 Q8 88 4 84" fill="none" stroke={INK} stroke-width={7.4} stroke-linecap="round" /><path d="M16 86 Q8 88 4 84" fill="none" stroke={c.fur} stroke-width={4.8} stroke-linecap="round" /></>}
      </g>
      <ellipse cx={cat ? 72 : 76} cy={87.6} rx={6} ry={2.6} fill={c.light} stroke={INK} stroke-width={1.4} />
      {cat ? <CatHead x={70} y={74} asleep /> : <DogHead x={72} y={76} asleep />}
    </g>
  );
}

export function Companion({ id, size = 60, pose = 'sit' }: { id: 'cat' | 'dog'; size?: number; pose?: PetPose }) {
  const body = pose === 'nap' ? <Curled id={id} /> : pose === 'sit' ? <Sitting id={id} /> : <Standing id={id} />;
  return <svg viewBox="0 0 100 100" width={size} height={size} class={`pet companion pet-${id} pose-${pose}`} aria-hidden="true" overflow="visible">{body}</svg>;
}
