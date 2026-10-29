// The home's bad days in one picture (docs/PROGRESSION-v3.md §11 «Сцена банкротства»): the estate at its level and
// season, and over it — the bank's cart rolling up to the gate with Марат and his paper; the house shut and locked
// while its owner is away on work (a figure with a bundle walks off); or Пряхин at the gate, the house his.
import { Estate } from './estate';
import { PORTRAIT_IMAGES } from './portraits';

const INK = '#3f2a1d';

function BankCart({ amount }: { amount: string }) {
  return (
    <g class="bs-cart-art">
      <ellipse cx={4} cy={2} rx={34} ry={4.5} fill="#2e2414" opacity={0.18} />
      {/* the horse */}
      <g transform="translate(-58 0)">
        <path d="M-6 -22 C-2 -30 14 -30 20 -24 L22 -12 L18 -12 L16 -18 L2 -18 L0 -12 L-4 -12 Z" fill="#8a5a34" stroke={INK} stroke-width={1.2} stroke-linejoin="round" />
        <path d="M-6 -22 L-12 -34 L-6 -36 L-2 -26 Z" fill="#8a5a34" stroke={INK} stroke-width={1.2} stroke-linejoin="round" />
        <path d="M-10 -35 L-14 -40 L-8 -37" fill="#5c3a20" stroke={INK} stroke-width={1} />
        {[-2, 4, 12, 18].map((x) => <path d={`M${x} -12 L${x} 0`} stroke={INK} stroke-width={2} stroke-linecap="round" />)}
        <path d="M22 -22 Q30 -18 26 -8" fill="none" stroke="#5c3a20" stroke-width={2.4} stroke-linecap="round" />
      </g>
      <path d="M-40 -16 L-28 -14" stroke={INK} stroke-width={1.6} stroke-linecap="round" />
      <path d="M-28 -20 H24 L20 -6 H-24 Z" fill="#b27947" stroke={INK} stroke-width={1.3} stroke-linejoin="round" />
      <path d="M-18 -20 C-22 -38 -6 -46 2 -46 C10 -46 24 -38 18 -20 Z" fill="#f6c9bf" stroke={INK} stroke-width={1.3} stroke-linejoin="round" />
      <text x={0} y={-28} text-anchor="middle" class="bs-sum">{amount}</text>
      <text x={0} y={-36} text-anchor="middle" class="bs-bank">БАНК</text>
      {[-14, 12].map((x) => (
        <g transform={`translate(${x} 0)`}><g class="bs-wheel"><circle r={7.5} fill="#d9a466" stroke={INK} stroke-width={1.3} /><path d="M-7.5 0 H7.5 M0 -7.5 V7.5" stroke={INK} stroke-width={0.8} /></g></g>
      ))}
    </g>
  );
}

/** a figure with a bundle on a stick, walking off to work */
function Leaving() {
  return (
    <g class="bs-leave">
      <ellipse cx={0} cy={1} rx={8} ry={2} fill="#2e2414" opacity={0.18} />
      <path d="M-3 -2 L-5 0 M3 -2 L5 0" stroke={INK} stroke-width={2} stroke-linecap="round" />
      <path d="M-5 -16 H5 L4 -2 H-4 Z" fill="#5c6b7a" stroke={INK} stroke-width={1.1} stroke-linejoin="round" />
      <circle cx={0} cy={-20} r={4} fill="#f0c4a0" stroke={INK} stroke-width={1} />
      <path d="M-4 -22 Q0 -27 4 -22" fill="#5c3a20" stroke={INK} stroke-width={1} />
      <path d="M3 -14 L14 -28" stroke="#8a5a34" stroke-width={1.6} stroke-linecap="round" />
      <circle cx={15} cy={-29} r={4.4} fill="#c0567a" stroke={INK} stroke-width={1} />
      <path d="M12 -31 L18 -27 M12 -27 L18 -31" stroke="#fde3c4" stroke-width={0.8} />
    </g>
  );
}

export type BankSceneMode = 'cart' | 'arrest' | 'lost';
export function BankScene({ mode, level, season, amount }: { mode: BankSceneMode; level: number; season: number; amount?: string }) {
  const marat = PORTRAIT_IMAGES.marat_worried ?? PORTRAIT_IMAGES.marat;
  const pryakhin = PORTRAIT_IMAGES.pryakhin;
  return (
    <div class={`bank-scene bs-${mode}`} aria-hidden="true">
      <Estate level={level} building={0} season={season} owns={{}} />
      <svg class="bs-over" viewBox="0 0 360 210">
        {mode === 'arrest' && <>
          {/* boards across the door and a padlock, the house asleep */}
          <g transform="translate(232 150)">
            <path d="M-14 -24 L14 -2 M14 -24 L-14 -2" stroke="#b9a07a" stroke-width={5} stroke-linecap="round" />
            <path d="M-14 -24 L14 -2 M14 -24 L-14 -2" stroke={INK} stroke-width={0.8} />
            <rect x={-6} y={-12} width={12} height={10} rx={2} fill="#c8931f" stroke={INK} stroke-width={1.2} />
            <path d="M-3.5 -12 V-16 Q0 -20 3.5 -16 V-12" fill="none" stroke={INK} stroke-width={1.6} />
          </g>
          <g transform="translate(120 196)"><Leaving /></g>
        </>}
        {mode === 'cart' && <g transform="translate(296 198) scale(1.1)"><g class="bs-cart"><BankCart amount={amount ?? ''} /></g></g>}
      </svg>
      {mode === 'cart' && marat && <img class="bs-face bs-marat" src={marat} alt="" />}
      {mode === 'lost' && pryakhin && <img class="bs-face bs-pryakhin" src={pryakhin} alt="" />}
    </div>
  );
}
