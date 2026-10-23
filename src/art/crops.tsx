// Crop sprites, drawn side-on on a 100×100 tile, base of the stem at (50, 80).
// stage 0: sprout, 1: growing, 2: the last week before harvest (fruit visible).
import type { CropId } from '../engine/data';
import { P } from './palette';
import { NEW_CROPS, NewSprout } from './extra';

const SW = 1.8;

function Leaf({ x, y, rx, ry, rot, fill = P.leaf }: { x: number; y: number; rx: number; ry: number; rot: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <ellipse rx={rx} ry={ry} fill={fill} stroke={P.ink} stroke-width={SW} />
      <path d={`M${-rx * 0.75} 0 L${rx * 0.75} 0`} stroke={P.leafDark} stroke-width={1.1} stroke-linecap="round" />
    </g>
  );
}

function Mound({ wide = 15 }: { wide?: number }) {
  return <ellipse cx={50} cy={82} rx={wide} ry={4.5} fill={P.soilLip} opacity={0.55} />;
}

// pointed leaf with a midrib, tip to the right of (x, y) before rotation
function Blade({ x, y, len, w, rot, fill = P.leaf }: { x: number; y: number; len: number; w: number; rot: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d={`M0 0 Q${len * 0.45} ${-w} ${len} 0 Q${len * 0.45} ${w} 0 0z`} fill={fill} stroke={P.ink} stroke-width={1.6} stroke-linejoin="round" />
      <path d={`M${len * 0.12} 0 L${len * 0.82} 0`} stroke={P.leafDark} stroke-width={1} stroke-linecap="round" />
    </g>
  );
}

// ---------- sprouts: one silhouette per crop, so a young field still reads ----------
// Each grows from the same root point (50, 80) and keeps the character of the grown plant.
function Sprout({ id }: { id: CropId }) {
  const stem = (d: string, w = 3) => <path d={d} stroke={P.stem} stroke-width={w} fill="none" stroke-linecap="round" />;
  switch (id) {
    case 'radish': // two round seed leaves and the red shoulder of the root
      return (
        <g>
          <Mound />
          {stem('M50 79 Q50 72 50 65')}
          <ellipse cx={40} cy={61} rx={10} ry={7} fill={P.leafLight} stroke={P.ink} stroke-width={SW} transform="rotate(-18 40 61)" />
          <ellipse cx={60} cy={61} rx={10} ry={7} fill={P.leafLight} stroke={P.ink} stroke-width={SW} transform="rotate(18 60 61)" />
          <path d="M37 61 Q41 59 45 62 M63 61 Q59 59 55 62" stroke={P.leafDark} stroke-width={1.1} fill="none" />
          <ellipse cx={50} cy={80} rx={7} ry={4} fill={P.red} stroke={P.ink} stroke-width={1.6} />
        </g>
      );
    case 'bean': // a hooked stem, two fat seed halves and the first pair of true leaves
      return (
        <g>
          <Mound />
          {stem('M50 80 C49 72 51 66 50 56', 3.4)}
          <ellipse cx={44} cy={70} rx={6.5} ry={4.2} fill="#cbd774" stroke={P.ink} stroke-width={1.6} transform="rotate(-20 44 70)" />
          <ellipse cx={56} cy={70} rx={6.5} ry={4.2} fill="#cbd774" stroke={P.ink} stroke-width={1.6} transform="rotate(20 56 70)" />
          <Blade x={50} y={56} len={17} w={8} rot={-150} />
          <Blade x={50} y={56} len={17} w={8} rot={-30} fill={P.leafLight} />
        </g>
      );
    case 'potato': // a low, wide rosette of dark compound leaves
      return (
        <g>
          <Mound wide={18} />
          {stem('M50 80 Q50 74 50 70', 3.4)}
          <Leaf x={37} y={72} rx={9} ry={6} rot={-20} fill={P.leafDark} />
          <Leaf x={63} y={72} rx={9} ry={6} rot={20} fill={P.leafDark} />
          <Leaf x={43} y={64} rx={7.5} ry={5.5} rot={-55} />
          <Leaf x={57} y={64} rx={7.5} ry={5.5} rot={55} />
          <Leaf x={50} y={60} rx={6} ry={5} rot={90} fill={P.leafLight} />
        </g>
      );
    case 'buckwheat': // a red stem with two arrow-shaped leaves
      return (
        <g>
          <Mound />
          <path d="M50 80 Q49 66 51 52" stroke="#b4574c" stroke-width={3.2} fill="none" stroke-linecap="round" />
          <path d="M50 64 C44 58 34 58 32 64 C36 66 40 70 50 64z" fill={P.leaf} stroke={P.ink} stroke-width={SW} stroke-linejoin="round" />
          <path d="M51 56 C57 50 67 50 69 56 C65 58 61 62 51 56z" fill={P.leafLight} stroke={P.ink} stroke-width={SW} stroke-linejoin="round" />
          <circle cx={51} cy={51} r={2.6} fill="#e9a3b4" stroke={P.ink} stroke-width={1.2} />
        </g>
      );
    case 'pumpkin': // one broad lobed leaf on a short stalk and a curling tendril
      return (
        <g>
          <Mound wide={17} />
          <ellipse cx={42} cy={76} rx={6} ry={3.6} fill={P.leafLight} stroke={P.ink} stroke-width={1.5} transform="rotate(-15 42 76)" />
          {stem('M50 80 Q52 72 55 66', 3.2)}
          <path d="M55 66 C45 66 40 58 44 51 C47 46 52 49 54 47 C57 43 63 45 64 49 C68 48 72 53 69 58 C70 63 64 67 55 66z" fill={P.leaf} stroke={P.ink} stroke-width={SW} stroke-linejoin="round" />
          <path d="M55 65 L52 52 M55 65 L62 51 M55 65 L67 57" stroke={P.leafDark} stroke-width={1.2} fill="none" stroke-linecap="round" />
          <path d="M60 76 q8 -2 8 -8 q0 -4 -4 -4 q-3 0 -2 3" stroke={P.stem} stroke-width={1.8} fill="none" stroke-linecap="round" />
        </g>
      );
    case 'wheat': // a tuft of thin blades
      return (
        <g>
          <Mound />
          {[[-12, 56], [-5, 50], [3, 48], [10, 54], [15, 62]].map(([dx, top], i) => (
            <g>
              <path d={`M${48 + i} 81 Q${50 + dx * 0.4} ${(81 + top) / 2} ${50 + dx} ${top}`} stroke={P.ink} stroke-width={4.4} fill="none" stroke-linecap="round" />
              <path d={`M${48 + i} 81 Q${50 + dx * 0.4} ${(81 + top) / 2} ${50 + dx} ${top}`} stroke={i % 2 ? P.leafLight : P.leaf} stroke-width={2.4} fill="none" stroke-linecap="round" />
            </g>
          ))}
        </g>
      );
    case 'sunflower': // a thick stem, two broad seed leaves and a folded bud
      return (
        <g>
          <Mound />
          {stem('M50 81 L50 52', 4.2)}
          <ellipse cx={39} cy={60} rx={11} ry={6} fill={P.leaf} stroke={P.ink} stroke-width={SW} transform="rotate(-15 39 60)" />
          <ellipse cx={61} cy={60} rx={11} ry={6} fill={P.leafLight} stroke={P.ink} stroke-width={SW} transform="rotate(15 61 60)" />
          <path d="M50 54 C45 50 45 44 50 41 C55 44 55 50 50 54z" fill={P.leafDark} stroke={P.ink} stroke-width={1.6} />
        </g>
      );
    case 'corn': // upright strap leaves out of a sheath
      return (
        <g>
          <Mound />
          {['M50 80 Q47 64 41 50', 'M50 80 Q52 60 52 44', 'M50 80 Q55 68 63 60'].map((d, i) => (
            <g>
              <path d={d} stroke={P.ink} stroke-width={7} fill="none" stroke-linecap="round" />
              <path d={d} stroke={i === 1 ? P.leafLight : P.leaf} stroke-width={4.4} fill="none" stroke-linecap="round" />
            </g>
          ))}
          <path d="M47 80 L48 69 L53 69 L54 80z" fill={P.leafDark} stroke={P.ink} stroke-width={1.4} />
        </g>
      );
    case 'tomato': // narrow seed leaves, a jagged true leaf and a little stake
      return (
        <g>
          <Mound />
          <rect x={60} y={50} width={4} height={32} rx={1.2} fill={P.woodLight} stroke={P.ink} stroke-width={1.6} />
          {stem('M50 80 Q50 70 51 58', 3)}
          <Blade x={50} y={68} len={13} w={3.6} rot={-160} fill={P.leafLight} />
          <Blade x={50} y={68} len={13} w={3.6} rot={-20} fill={P.leafLight} />
          <path d="M51 59 l-4 -3 l1 -4 l-4 -2 l3 -4 l3 1 l2 -4 l3 3 l3 -1 l0 4 l4 2 l-3 3 l1 4 l-5 0z" fill={P.leaf} stroke={P.ink} stroke-width={1.5} stroke-linejoin="round" />
        </g>
      );
    default:
      return <NewSprout id={id} />;
  }
}

function Radish({ stage }: { stage: number }) {
  if (stage === 1)
    return (
      <g>
        <Mound />
        <Leaf x={38} y={68} rx={12} ry={5.5} rot={-35} />
        <Leaf x={62} y={68} rx={12} ry={5.5} rot={35} />
        <Leaf x={45} y={60} rx={12} ry={5.5} rot={-75} fill={P.leafLight} />
        <Leaf x={55} y={60} rx={12} ry={5.5} rot={75} fill={P.leafLight} />
        <ellipse cx={50} cy={80} rx={7} ry={4.5} fill={P.red} stroke={P.ink} stroke-width={1.6} />
      </g>
    );
  return (
    <g>
      <Mound />
      <Leaf x={38} y={64} rx={13} ry={5.5} rot={-40} />
      <Leaf x={62} y={64} rx={13} ry={5.5} rot={40} />
      <Leaf x={45} y={56} rx={13} ry={5.5} rot={-75} fill={P.leafLight} />
      <Leaf x={55} y={56} rx={13} ry={5.5} rot={75} fill={P.leafLight} />
      <circle cx={50} cy={77} r={9} fill={P.red} stroke={P.ink} stroke-width={SW} />
      <ellipse cx={46.5} cy={74} rx={3} ry={2} fill="#ff98a6" />
    </g>
  );
}

function Bean({ stage }: { stage: number }) {
  const top = stage === 1 ? 36 : 18;
  return (
    <g>
      <Mound />
      <rect x={47.5} y={top} width={5} height={82 - top} rx={1.5} fill={P.woodLight} stroke={P.ink} stroke-width={SW} />
      <path d={stage === 1 ? 'M50 80 Q41 70 50 61 Q59 52 50 43 Q44 38 50 36' : 'M50 80 Q40 70 50 60 Q60 50 50 40 Q40 30 50 22'} stroke={P.stem} stroke-width={3} fill="none" stroke-linecap="round" />
      <Leaf x={41} y={68} rx={9} ry={5.5} rot={-30} />
      <Leaf x={59} y={56} rx={9} ry={5.5} rot={30} />
      {stage === 1 && <Leaf x={42} y={46} rx={8} ry={5} rot={-30} fill={P.leafLight} />}
      {stage === 2 && (
        <g>
          <Leaf x={41} y={44} rx={8} ry={5} rot={-30} fill={P.leafLight} />
          <Leaf x={59} y={32} rx={8} ry={5} rot={30} />
          <Leaf x={43} y={24} rx={7} ry={4.5} rot={-30} fill={P.leafLight} />
          {[[60, 66], [38, 52], [61, 42]].map(([x, y]) => (
            <path d={`M${x} ${y} q3 9 -1 15 q-4 -6 1 -15z`} fill="#7dcc4c" stroke={P.ink} stroke-width={1.5} />
          ))}
        </g>
      )}
    </g>
  );
}

function Potato({ stage }: { stage: number }) {
  if (stage === 1)
    return (
      <g>
        <Mound wide={19} />
        <Leaf x={34} y={72} rx={11} ry={7} rot={-20} fill={P.leafDark} />
        <Leaf x={66} y={72} rx={11} ry={7} rot={20} fill={P.leafDark} />
        <Leaf x={41} y={62} rx={10} ry={7} rot={-35} />
        <Leaf x={59} y={62} rx={10} ry={7} rot={35} />
        <Leaf x={50} y={56} rx={9} ry={6.5} rot={0} fill={P.leafLight} />
      </g>
    );
  return (
    <g>
      <Mound />
      <Leaf x={36} y={70} rx={12} ry={8} rot={-20} fill={P.leafDark} />
      <Leaf x={64} y={70} rx={12} ry={8} rot={20} fill={P.leafDark} />
      <Leaf x={42} y={58} rx={12} ry={8} rot={-30} />
      <Leaf x={58} y={58} rx={12} ry={8} rot={30} />
      <Leaf x={50} y={50} rx={11} ry={7} rot={0} fill={P.leafLight} />
      {[[44, 46], [56, 44], [50, 40]].map(([x, y]) => (
        <g>
          <circle cx={x} cy={y} r={4} fill={P.flowerWhite} stroke={P.ink} stroke-width={1.3} />
          <circle cx={x} cy={y} r={1.6} fill={P.flowerYellow} />
        </g>
      ))}
    </g>
  );
}

function Buckwheat({ stage }: { stage: number }) {
  const h = stage === 1 ? 54 : 34;
  const stems = [36, 46, 56, 64];
  return (
    <g>
      <Mound />
      {stems.map((x, i) => (
        <path d={`M50 80 Q${(50 + x) / 2} ${(80 + h) / 2} ${x} ${h + (i % 2) * 6}`} stroke="#b4574c" stroke-width={2.4} fill="none" stroke-linecap="round" />
      ))}
      <Leaf x={40} y={70} rx={9} ry={6} rot={-30} />
      <Leaf x={60} y={66} rx={9} ry={6} rot={30} />
      {stage === 1 && <Leaf x={43} y={58} rx={8} ry={5} rot={-40} fill={P.leafLight} />}
      {stage === 2 &&
        stems.map((x, i) => {
          const y = h + (i % 2) * 6;
          return (
            <g>
              <circle cx={x} cy={y - 2} r={6} fill={i % 2 ? P.flowerPink : P.flowerWhite} stroke={P.ink} stroke-width={1.4} />
              <circle cx={x - 2.5} cy={y - 4} r={2} fill="#fff" opacity={0.85} />
              <circle cx={x + 2.5} cy={y} r={1.6} fill={P.flowerPink} />
            </g>
          );
        })}
    </g>
  );
}

function Pumpkin({ stage }: { stage: number }) {
  if (stage === 1)
    return (
      <g>
        <Mound wide={19} />
        <path d="M50 80 Q64 74 80 78 M50 80 Q36 76 24 80" stroke={P.stem} stroke-width={3} fill="none" stroke-linecap="round" />
        <path d="M80 78 q6 -2 6 -7 q0 -3 -3 -3" stroke={P.stem} stroke-width={1.8} fill="none" stroke-linecap="round" />
        <Leaf x={40} y={66} rx={13} ry={10} rot={-15} />
        <Leaf x={62} y={64} rx={13} ry={10} rot={15} fill={P.leafLight} />
        <circle cx={70} cy={76} r={4} fill={P.flowerYellow} stroke={P.ink} stroke-width={1.2} />
      </g>
    );
  return (
    <g>
      <Leaf x={30} y={70} rx={11} ry={8} rot={-20} fill={P.leafDark} />
      <Leaf x={72} y={68} rx={11} ry={8} rot={20} />
      <ellipse cx={51} cy={68} rx={23} ry={16} fill={P.pumpkin} stroke={P.ink} stroke-width={SW} />
      <path d="M41 54 Q36 68 41 82 M51 52 Q51 68 51 84 M61 54 Q66 68 61 82" stroke={P.pumpkinDark} stroke-width={1.8} fill="none" />
      <ellipse cx={40} cy={62} rx={4} ry={6} fill="#ffb867" opacity={0.8} />
      <path d="M51 53 q-2 -8 5 -10" stroke={P.ink} stroke-width={4} fill="none" stroke-linecap="round" />
      <path d="M51 53 q-2 -8 5 -10" stroke="#7a5a2a" stroke-width={2.2} fill="none" stroke-linecap="round" />
    </g>
  );
}

function Wheat({ stage }: { stage: number }) {
  const xs = [38, 44, 50, 56, 62];
  if (stage === 1)
    return (
      <g>
        <Mound />
        {xs.map((x, i) => (
          <path d={`M${x} 82 Q${x + (i - 2) * 2} 66 ${x + (i - 2) * 3} ${52 + (i % 2) * 6}`} stroke={P.leaf} stroke-width={3} fill="none" stroke-linecap="round" />
        ))}
      </g>
    );
  return (
    <g>
      <Mound />
      {xs.map((x, i) => {
        const tx = x + (i - 2) * 3;
        const ty = 22 + (i % 2) * 8;
        return (
          <g>
            <path d={`M${x} 82 Q${x + (i - 2) * 1.5} 56 ${tx} ${ty + 14}`} stroke={P.wheatDark} stroke-width={2.6} fill="none" stroke-linecap="round" />
            {[0, 1, 2, 3].map((k) => (
              <g>
                <ellipse cx={tx - 2.5} cy={ty + 14 - k * 4.5} rx={2.6} ry={3.4} fill={P.wheat} stroke={P.ink} stroke-width={1} transform={`rotate(-20 ${tx - 2.5} ${ty + 14 - k * 4.5})`} />
                <ellipse cx={tx + 2.5} cy={ty + 12 - k * 4.5} rx={2.6} ry={3.4} fill={P.wheat} stroke={P.ink} stroke-width={1} transform={`rotate(20 ${tx + 2.5} ${ty + 12 - k * 4.5})`} />
              </g>
            ))}
            <path d={`M${tx} ${ty - 4} l0 -6`} stroke={P.wheatDark} stroke-width={1.2} />
          </g>
        );
      })}
    </g>
  );
}

function Sunflower({ stage }: { stage: number }) {
  if (stage === 1)
    return (
      <g>
        <Mound />
        <path d="M50 81 L50 44" stroke={P.stem} stroke-width={4} stroke-linecap="round" />
        <Leaf x={40} y={62} rx={11} ry={6} rot={-25} />
        <Leaf x={60} y={54} rx={11} ry={6} rot={25} fill={P.leafLight} />
        <circle cx={50} cy={42} r={5} fill={P.leaf} stroke={P.ink} stroke-width={SW} />
      </g>
    );
  const petals = Array.from({ length: 12 }, (_, k) => k * 30);
  return (
    <g>
      <Mound />
      <path d="M50 81 L50 26" stroke={P.stem} stroke-width={4.5} stroke-linecap="round" />
      <Leaf x={38} y={64} rx={13} ry={7} rot={-25} />
      <Leaf x={62} y={52} rx={13} ry={7} rot={25} fill={P.leafLight} />
      <Leaf x={40} y={42} rx={11} ry={6} rot={-30} fill={P.leafDark} />
      <g transform="translate(50 18)">
        {petals.map((a) => (
          <ellipse rx={5} ry={10} cy={-12} fill={P.flowerYellow} stroke={P.ink} stroke-width={1.3} transform={`rotate(${a})`} />
        ))}
        <circle r={10} fill="#6b3f1f" stroke={P.ink} stroke-width={SW} />
        {[[-4, -3], [3, -4], [0, 2], [-5, 4], [5, 3]].map(([x, y]) => <circle cx={x} cy={y} r={1.4} fill="#3a2010" />)}
      </g>
    </g>
  );
}

function Corn({ stage }: { stage: number }) {
  if (stage === 1)
    return (
      <g>
        <Mound />
        <path d="M50 81 L50 34" stroke={P.stem} stroke-width={4.4} stroke-linecap="round" />
        {[['M50 72 Q32 62 26 72', P.leaf], ['M50 60 Q68 50 74 60', P.leafLight], ['M50 48 Q34 38 30 46', P.leafDark], ['M50 38 Q60 28 64 34', P.leaf]].map(([d, c]) => (
          <g>
            <path d={d} stroke={P.ink} stroke-width={6.8} fill="none" stroke-linecap="round" />
            <path d={d} stroke={c} stroke-width={4.2} fill="none" stroke-linecap="round" />
          </g>
        ))}
      </g>
    );
  return (
    <g>
      <Mound />
      <path d="M50 81 L50 14" stroke={P.stem} stroke-width={5} stroke-linecap="round" />
      {[['M50 72 Q30 62 24 74', P.leaf], ['M50 58 Q72 46 78 58', P.leafLight], ['M50 44 Q30 32 26 42', P.leafDark], ['M50 30 Q66 20 72 28', P.leaf]].map(([d, c]) => (
        <g>
          <path d={d} stroke={P.ink} stroke-width={7} fill="none" stroke-linecap="round" />
          <path d={d} stroke={c} stroke-width={4.4} fill="none" stroke-linecap="round" />
        </g>
      ))}
      <g transform="rotate(18 58 50)">
        <ellipse cx={58} cy={50} rx={6} ry={13} fill={P.flowerYellow} stroke={P.ink} stroke-width={SW} />
        <path d="M58 38 v24 M54.5 41 v18 M61.5 41 v18" stroke="#d9b22e" stroke-width={1.2} />
        <path d="M52 62 Q54 48 58 36 Q50 46 52 62z" fill="#9ccc5a" stroke={P.ink} stroke-width={1.4} />
      </g>
      {[-8, 0, 8].map((dx) => <path d={`M50 14 q${dx / 2} -6 ${dx} -9`} stroke="#d8b46a" stroke-width={2} fill="none" stroke-linecap="round" />)}
    </g>
  );
}

function Tomato({ stage }: { stage: number }) {
  const top = stage === 1 ? 34 : 22;
  return (
    <g>
      <Mound />
      <rect x={60} y={top} width={4.5} height={82 - top} rx={1.4} fill={P.woodLight} stroke={P.ink} stroke-width={SW} />
      <path d={`M50 80 Q46 ${(80 + top) / 2} 56 ${top + 6}`} stroke={P.stem} stroke-width={3.4} fill="none" stroke-linecap="round" />
      <Leaf x={42} y={66} rx={9} ry={6} rot={-25} />
      <Leaf x={58} y={58} rx={9} ry={6} rot={25} fill={P.leafLight} />
      {stage === 1 && <Leaf x={45} y={48} rx={8} ry={5.5} rot={-25} fill={P.leafDark} />}
      {stage === 1 && <circle cx={55} cy={44} r={3} fill={P.flowerYellow} stroke={P.ink} stroke-width={1.1} />}
      {stage === 2 && (
        <g>
          <Leaf x={44} y={42} rx={9} ry={6} rot={-25} fill={P.leafDark} />
          <Leaf x={58} y={32} rx={8} ry={5} rot={20} />
          {[[42, 56], [54, 48], [47, 34], [40, 74]].map(([x, y]) => (
            <g>
              <circle cx={x} cy={y} r={6.5} fill={P.red} stroke={P.ink} stroke-width={SW} />
              <circle cx={x - 2.2} cy={y - 2.2} r={1.8} fill="#ff8a72" />
              <path d={`M${x - 2} ${y - 6} l2 2 l2 -2`} stroke={P.leafDark} stroke-width={1.4} fill="none" />
            </g>
          ))}
        </g>
      )}
    </g>
  );
}

const BY_ID: Partial<Record<CropId, (p: { stage: number }) => any>> = {
  radish: Radish, bean: Bean, potato: Potato, buckwheat: Buckwheat, pumpkin: Pumpkin,
  wheat: Wheat, sunflower: Sunflower, corn: Corn, tomato: Tomato,
};

export function CropSprite({ id, stage }: { id: CropId; stage: number }) {
  // sprouts are drawn a little larger than life so a young field still reads on a phone
  if (stage <= 0 && (id === 'honey' || id === 'mushrooms')) return NEW_CROPS[id]!({ stage: 2 });
  if (stage <= 0)
    return (
      <g transform="translate(50 80) scale(1.24) translate(-50 -80)">
        <Sprout id={id} />
      </g>
    );
  const C = BY_ID[id] ?? NEW_CROPS[id];
  if (!C) return <NewSprout id={id} />;
  return <C stage={stage >= 2 ? 2 : 1} />;
}

export function cropStage(grown: number, grow: number): number {
  if (grown <= 0) return 0;
  if (grown >= grow - 1) return 2;
  return 1;
}

// Standalone icon of a ripe crop (cards, storage, market).
export function CropIcon({ id, size = 48 }: { id: CropId; size?: number }) {
  return (
    <svg viewBox="-4 -6 108 108" width={size} height={size} class="crop-icon" aria-hidden="true">
      <CropSprite id={id} stage={2} />
    </svg>
  );
}
