// Rules 3 art: the hooded crow on the field, the scarecrow, Karla's portrait and the withering stalk.
// Same outline language as the crops: warm palette, soft dark outlines. The field crow is slim and grey with a
// black head, wings and tail, a long beak and a wedge tail; it walks, stops, tilts its head and pecks — no round
// body, no big eye, no hopping with the whole body.
import { P } from './palette';

const CROW_GREY = '#9c9da4';
const CROW_GREY_LIGHT = '#b7b8be';
const CROW_BLACK = '#2a2a30';
const EYE = '#d99a2e';

// a field crow facing right, feet at (0, 0), about 46 units long. Rig: the legs swing from the belly
// (hips at x -0.6 / 2.6, y -8.6), the body tips forward over the feet to peck, the head turns at the neck (10, -16.5).
export function Crow() {
  return (
    <g class="crow-bird">
      <ellipse class="cr-shadow" cx={1} cy={0.8} rx={12} ry={2.1} fill="rgba(0,0,0,0.16)" />
      <g class="cr-leg cr-l1"><path d="M-0.6 -8.6 L-1.4 -4.4 L-1 0 M-1 0 h4.2 M-1 0 l2.6 1.1 M-1 0 h-2.6" stroke="#1f1f24" stroke-width={1.3} stroke-linecap="round" stroke-linejoin="round" fill="none" /></g>
      <g class="cr-leg cr-l2"><path d="M2.6 -8.6 L1.8 -4.4 L2.2 0 M2.2 0 h4.2 M2.2 0 l2.6 1.1 M2.2 0 h-2.6" stroke={CROW_BLACK} stroke-width={1.4} stroke-linecap="round" stroke-linejoin="round" fill="none" /></g>
      <g class="cr-body">
        {/* wedge tail, slightly fanned */}
        <path class="cr-tail" d="M-10.5 -13.2 L-24.4 -10.6 Q-25.4 -8.4 -23.6 -6.4 L-10 -9.4z" fill={CROW_BLACK} stroke={CROW_BLACK} stroke-width={0.9} stroke-linejoin="round" />
        <path d="M-14 -11.6 L-23.6 -8.6" stroke="#45454d" stroke-width={0.7} />
        {/* slim grey body: mantle and belly */}
        <path d="M-13 -11.5 Q-7 -19.5 5 -18.6 Q12.6 -17.4 13.4 -12 Q11.4 -7.2 2 -7.2 Q-7.6 -7.2 -13 -11.5z" fill={CROW_GREY} stroke={CROW_BLACK} stroke-width={1.3} stroke-linejoin="round" />
        <path d="M-3 -8.3 Q4.6 -8.1 10.4 -10.6" stroke={CROW_GREY_LIGHT} stroke-width={2.1} fill="none" stroke-linecap="round" opacity={0.8} />
        <path d="M-4 -10 l1.2 1 M0 -9.6 l1.2 1 M4 -10 l1 .9" stroke="#86878e" stroke-width={0.6} stroke-linecap="round" />
        {/* the folded black wing over the back, primaries crossing over the tail */}
        <path d="M-12.4 -12.6 Q-3 -19 8.2 -16.4 Q3.4 -11 -9.4 -9.8 L-16.6 -10.4z" fill={CROW_BLACK} />
        <path d="M-7 -12.4 Q0 -15.2 5 -14.8 M-10 -11.2 L-15.6 -10.6" stroke="#4a4a52" stroke-width={0.8} fill="none" stroke-linecap="round" />
        <g class="cr-head">
          <path d="M7.6 -15.8 Q8.6 -22.6 13.4 -23.3 Q18 -23.4 18.7 -19.7 Q18.5 -16.4 14 -15.5 Q10.4 -14.6 7.6 -15.8z" fill={CROW_BLACK} />
          {/* a long, slightly curved beak with a pale tip line */}
          <path d="M17.6 -20.7 Q22.2 -20.3 26.2 -18.8 Q22 -17.8 17.8 -18z" fill="#34343b" stroke={CROW_BLACK} stroke-width={0.7} stroke-linejoin="round" />
          <path d="M18.4 -19.3 Q22 -19 25 -18.8" stroke="#55555e" stroke-width={0.4} fill="none" />
          <circle class="cr-eye" cx={15.2} cy={-20.5} r={0.9} fill={EYE} />
          <circle cx={15.4} cy={-20.7} r={0.3} fill="#fff4d6" />
        </g>
      </g>
    </g>
  );
}

// a crow in flight, facing right, centred on its body: two wings beat around the shoulder (1, -2), the far one
// a little smaller and darker behind the body, the tail fanned, the feet tucked.
function Wing({ cls, fill, t }: { cls: string; fill: string; t?: string }) {
  return (
    <g transform={t}><g class={`cf-wing ${cls}`}>
      <path d="M5 -2.4 C5.2 -9 3.4 -15.4 -1.6 -21.6 L-3 -18.8 L-4.8 -20.6 L-5.6 -17.2 L-7.6 -18.4 L-7.8 -14.8 L-9.8 -15.2 Q-8.8 -8.4 -6 -1.6 Z" fill={fill} stroke={CROW_BLACK} stroke-width={0.6} stroke-linejoin="round" />
      <path d="M3.2 -4 Q1.6 -10.4 -2.6 -16 M0.4 -3.6 Q-1.6 -9 -5 -13" stroke="#4a4a54" stroke-width={0.6} fill="none" stroke-linecap="round" />
    </g></g>
  );
}
export function CrowFlying() {
  return (
    <g class="crow-flying">
      <g class="cf-bob">
        <Wing cls="far" fill="#1c1c21" t="translate(-2.2 -.6) scale(.9)" />
        <path d="M-9 -1.4 L-20.4 -3.6 Q-22.6 0.4 -20.4 4 L-9 2.2z" fill={CROW_BLACK} />
        <path d="M-11.2 0.4 Q-6 -4.4 4 -3.8 Q11 -3.2 13.2 -0.2 Q11 3.8 2 4 Q-6.4 4.2 -11.2 0.4z" fill={CROW_GREY} stroke={CROW_BLACK} stroke-width={1.2} stroke-linejoin="round" />
        <path d="M-4 3.4 l-3.6 1.6 M-2 3.6 l-3.4 1.8" stroke={CROW_BLACK} stroke-width={0.9} stroke-linecap="round" />
        <path d="M9.4 -2.6 Q10.8 -6.8 14.8 -6.6 Q18.6 -6.2 18.8 -2.9 Q18 0.6 14 0.8 Q10.6 1 9.4 -2.6z" fill={CROW_BLACK} />
        <path d="M18.2 -4.3 Q22 -3.9 24.8 -2.6 Q21.8 -1.6 18.2 -1.6z" fill="#34343b" />
        <circle cx={15.6} cy={-3.9} r={0.75} fill={EYE} />
        <Wing cls="near" fill={CROW_BLACK} />
      </g>
    </g>
  );
}

// the scarecrow, its base at (0, 0) — the point where four beds meet
export function Scarecrow() {
  return (
    <g class="scarecrow">
      <ellipse cx={0} cy={2} rx={13} ry={3.2} fill="rgba(0,0,0,0.18)" />
      <path d="M0 2 V-46" stroke={P.woodDark} stroke-width={3.6} stroke-linecap="round" />
      <path d="M-21 -31 H21" stroke={P.woodDark} stroke-width={3.2} stroke-linecap="round" />
      {/* a patched shirt with straw at the cuffs */}
      <path d="M-18 -34 Q0 -39 18 -34 L14 -15 Q0 -12 -14 -15z" fill="#c9774a" stroke={P.ink} stroke-width={1.7} stroke-linejoin="round" />
      <rect x={3} y={-26} width={7} height={6} rx={1} fill={P.parchment} stroke={P.ink} stroke-width={1.1} transform="rotate(-8 6 -23)" />
      <path d="M-4 -34 V-16" stroke="#a65f37" stroke-width={1.2} />
      <path d="M-19 -33 l-4 3 M-19 -31 l-5 0 M-19 -29 l-4 -2 M19 -33 l4 3 M19 -31 l5 0 M19 -29 l4 -2" stroke={P.wheatDark} stroke-width={1.6} stroke-linecap="round" />
      {/* sackcloth head and a straw hat */}
      <circle cx={0} cy={-43} r={7.5} fill="#e8d3a3" stroke={P.ink} stroke-width={1.7} />
      <circle cx={-2.8} cy={-44} r={1} fill={P.ink} />
      <circle cx={2.8} cy={-44} r={1} fill={P.ink} />
      <path d="M-3.4 -40 l1.4 1 l1.4 -1 l1.4 1 l1.4 -1 l1.4 1" stroke={P.ink} stroke-width={0.9} fill="none" />
      <ellipse cx={0} cy={-48.5} rx={12.5} ry={3.2} fill={P.wheat} stroke={P.ink} stroke-width={1.5} />
      <path d="M-6.5 -49 Q-5 -57 0 -57.5 Q5 -57 6.5 -49z" fill={P.wheatDark} stroke={P.ink} stroke-width={1.5} stroke-linejoin="round" />
      <g class="sc-ribbon">
        <path d="M18 -31 q6 2 5 9 q-3 -4 -7 -5z" fill={P.red} stroke={P.ink} stroke-width={1.1} stroke-linejoin="round" />
      </g>
    </g>
  );
}

// Karla, the curious and cheeky hooded crow, with a small ochre kerchief (portrait box 100×100)
export function CarlaFace() {
  return (
    <g>
      <path d="M8 104 Q14 70 44 64 Q72 60 90 82 L96 104z" fill={CROW_GREY} stroke={P.ink} stroke-width={2} />
      <path d="M58 66 Q80 70 92 90 L96 104 L74 104 Q72 86 58 76z" fill={CROW_BLACK} />
      <path d="M30 100 Q34 82 46 76" stroke={CROW_GREY_LIGHT} stroke-width={4} fill="none" stroke-linecap="round" opacity={0.7} />
      {/* kerchief */}
      <path d="M30 66 Q50 76 72 64 L68 74 Q50 84 34 76z" fill="#d9952f" stroke={P.ink} stroke-width={1.8} stroke-linejoin="round" />
      <path d="M50 76 l-6 12 l9 -4 l4 9 l1 -14z" fill="#c47f22" stroke={P.ink} stroke-width={1.6} stroke-linejoin="round" />
      <circle cx={40} cy={72} r={1.4} fill="#f6e3b0" />
      <circle cx={58} cy={71} r={1.4} fill="#f6e3b0" />
      {/* head */}
      <path d="M30 60 Q26 34 48 26 Q70 22 76 44 Q78 60 66 66 Q48 72 30 60z" fill={CROW_BLACK} stroke={P.ink} stroke-width={2} />
      <path d="M40 34 Q50 28 62 31" stroke="#4a4a52" stroke-width={2} fill="none" stroke-linecap="round" />
      {/* beak, a little open: curious */}
      <path d="M22 46 Q8 47 2 52 Q12 52 26 51z" fill="#3a3a42" stroke={P.ink} stroke-width={1.6} stroke-linejoin="round" />
      <path d="M24 52 Q12 55 6 55 Q14 58 28 55z" fill="#2f2f36" stroke={P.ink} stroke-width={1.4} stroke-linejoin="round" />
      {/* a lively amber eye */}
      <circle cx={40} cy={42} r={5.2} fill={EYE} stroke={P.ink} stroke-width={1.4} />
      <circle cx={39} cy={42} r={2.4} fill="#1d1d22" />
      <circle cx={38} cy={40.6} r={0.9} fill="#fff" />
      <path d="M33 35 Q40 32 47 36" stroke="#5a5a62" stroke-width={1.6} fill="none" stroke-linecap="round" />
    </g>
  );
}

// a dry stalk settling into the bed after the second dry night (shown once, ~300 ms)
export function Wither() {
  return (
    <g class="wither">
      <path d="M50 80 Q47 66 54 56" stroke="#9a8048" stroke-width={3} fill="none" stroke-linecap="round" />
      <path d="M52 62 Q42 62 38 70 M53 58 Q62 58 66 66" stroke="#b49a58" stroke-width={2.4} fill="none" stroke-linecap="round" />
      <ellipse cx={50} cy={82} rx={14} ry={3.6} fill="#8a6a3a" opacity={0.35} />
    </g>
  );
}
