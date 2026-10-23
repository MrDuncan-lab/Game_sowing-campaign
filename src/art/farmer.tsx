// The farmer: a grown-up figure in three-quarter view facing right, ground at y=0, hat top near y=-86.
// A small rig — every limb is a group whose joint is its transform origin (CSS: transform-box view-box,
// origin in local units), so the walk and each job are real motions. Tools sit in the hand
// (hand-centred coordinates). Motion is calm and weighted: no squash, no bounce.
import type { ComponentChildren } from 'preact';
import type { FarmerAction } from './farm';
import { P } from './palette';

const INK = '#45301f';
const SHIRT = '#b9563d', SHIRT_D = '#8f3f2c', DENIM = '#4b6d98', DENIM_D = '#3a5679', SKIN = '#e8bb95', SKIN_D = '#d29f7a', BOOT = '#5a3c26', BOOT_D = '#46301e';
const HAND: [number, number] = [1.1, -35.2];

function Leg({ back }: { back?: boolean }) {
  const d = back ? DENIM_D : DENIM;
  return (
    <g class={`f-leg ${back ? 'back' : 'front'}`}>
      <path d="M0 -34 L0 -19" stroke={INK} stroke-width={8.6} stroke-linecap="round" />
      <path d="M0 -34 L0 -19" stroke={d} stroke-width={6.8} stroke-linecap="round" />
      <g class="f-shin">
        <path d="M0 -19 L0 -5.6" stroke={INK} stroke-width={7.8} stroke-linecap="round" />
        <path d="M0 -19 L0 -5.6" stroke={d} stroke-width={6} stroke-linecap="round" />
        <path d="M-2.6 -11 H2.6" stroke={back ? '#2f4766' : '#3e5c84'} stroke-width={1} opacity={.6} />
        <path d="M-3.6 -7.4 H2.4 Q7.6 -7 8.4 -2.8 Q8.6 0 6.6 0 H-3.8 Q-4.6 0 -4.6 -1 V-6.4 Q-4.6 -7.4 -3.6 -7.4 Z" fill={back ? BOOT_D : BOOT} stroke={INK} stroke-width={1.2} stroke-linejoin="round" />
        <path d="M-4.2 -1.8 H8.2" stroke="#2c1b10" stroke-width={1} opacity={.45} />
      </g>
    </g>
  );
}

function Arm({ back, children }: { back?: boolean; children?: ComponentChildren }) {
  const s = back ? SHIRT_D : SHIRT;
  return (
    <g class={`f-arm ${back ? 'back' : 'front'}`}>
      <path d="M0 -58 L.5 -46.5" stroke={INK} stroke-width={7.4} stroke-linecap="round" />
      <path d="M0 -58 L.5 -46.5" stroke={s} stroke-width={5.6} stroke-linecap="round" />
      <g class="f-fore">
        <path d="M.5 -46.5 L1 -37.6" stroke={INK} stroke-width={6.6} stroke-linecap="round" />
        <path d="M.5 -46.5 L1 -38.4" stroke={s} stroke-width={4.8} stroke-linecap="round" />
        <path d="M-1.4 -39.4 H3.4" stroke={back ? '#7a3424' : '#e9d6b8'} stroke-width={1.3} stroke-linecap="round" />
        <g class="f-hand">
          <g transform={`translate(${HAND[0]} ${HAND[1]})`}>{children}</g>
          <circle cx={HAND[0]} cy={HAND[1]} r={2.9} fill={back ? SKIN_D : SKIN} stroke={INK} stroke-width={1.1} />
        </g>
      </g>
    </g>
  );
}

// ---------- tools, hand-centred ----------
function Can() {
  return (
    <g class="f-can">
      <path d="M-3.6 1 Q1 -4.6 5.6 1" fill="none" stroke={INK} stroke-width={1.3} />
      <path d="M-5 1.4 H7 L6 12.4 H-4 Z" fill="#8fb1c0" stroke={INK} stroke-width={1.2} stroke-linejoin="round" />
      <path d="M-4.4 4.6 H6.6" stroke="#c9dfe8" stroke-width={1.1} />
      <path d="M6.6 9 L15.6 2.4" stroke={INK} stroke-width={3.4} stroke-linecap="round" />
      <path d="M6.6 9 L15.6 2.4" stroke="#8fb1c0" stroke-width={1.7} stroke-linecap="round" />
      <ellipse cx={16.4} cy={1.8} rx={2} ry={1.3} transform="rotate(-36 16.4 1.8)" fill="#6d93a4" stroke={INK} stroke-width={.9} />
    </g>
  );
}
function Pouch({ white }: { white?: boolean }) {
  return (
    <g>
      <path d="M-3 .6 Q-5 9 .4 9.8 Q5.8 9 3.8 .6 Z" fill={white ? '#e6d6ad' : '#b99560'} stroke={INK} stroke-width={1.1} stroke-linejoin="round" />
      <path d="M-2.4 1.2 Q.4 -1 3.2 1.2" fill="none" stroke="#7a5230" stroke-width={1.1} />
    </g>
  );
}
function Fork() {
  return (
    <g class="f-fork">
      <path d="M-15 -13 L13 10" stroke={INK} stroke-width={3} stroke-linecap="round" />
      <path d="M-15 -13 L13 10" stroke="#9a6b40" stroke-width={1.6} stroke-linecap="round" />
      <path d="M11 9 L17.6 9.4 M12.4 7.6 L18.6 6.4 M11.6 10.6 L16.4 12.6" stroke="#7d8389" stroke-width={1.3} stroke-linecap="round" />
      <g class="f-forkload" stroke="#c4a05a" stroke-width={1.2} stroke-linecap="round"><path d="M15 6 l6 -1 M16 8 l6 2 M14 4 l4 -3 M17 6.6 l5 -2.4" /></g>
    </g>
  );
}
function Hoe() {
  return (
    <g class="f-hoe">
      <path d="M-3 -12 L8 29" stroke={INK} stroke-width={3} stroke-linecap="round" />
      <path d="M-3 -12 L8 29" stroke="#9a6b40" stroke-width={1.6} stroke-linecap="round" />
      <path d="M6.6 27.4 L15.6 26.2 L15.2 30.6 L7.6 31.4 Z" fill="#7d8389" stroke={INK} stroke-width={1} stroke-linejoin="round" />
    </g>
  );
}
function Hammer() {
  return (
    <g class="f-hammer">
      <path d="M-2 0 L13 0" stroke={INK} stroke-width={2.8} stroke-linecap="round" />
      <path d="M-2 0 L13 0" stroke="#c49460" stroke-width={1.4} stroke-linecap="round" />
      <rect x={12.4} y={-5.2} width={4.8} height={10.4} rx={1} fill="#8a8f96" stroke={INK} stroke-width={1.1} />
    </g>
  );
}
function Basket() {
  return (
    <g class="f-basket">
      <path d="M-6 6 Q.6 -2 7.2 6" fill="none" stroke={INK} stroke-width={1.2} />
      <path d="M-7.4 6 H9 L7.4 14.6 H-5.6 Z" fill="#c99b62" stroke={INK} stroke-width={1.2} stroke-linejoin="round" />
      <path d="M-6.6 9 H8.2 M-6 11.8 H7.8" stroke="#9a6b40" stroke-width={.8} />
      <circle cx={-2.6} cy={5.2} r={2.5} fill="#c0473a" stroke={INK} stroke-width={.8} />
      <circle cx={3.4} cy={4.8} r={2.6} fill="#d98a3a" stroke={INK} stroke-width={.8} />
      <g class="f-catch"><circle cx={.6} cy={4} r={2.3} fill="#c0473a" stroke={INK} stroke-width={.8} /></g>
    </g>
  );
}
function Sheet() {
  return (
    <g class="f-sheet" transform="rotate(-12)">
      <rect x={-3} y={-12} width={13} height={16} rx={1.2} fill="#fbf6ea" stroke={INK} stroke-width={1.1} />
      <path d="M-.6 -8.6 h8.6 M-.6 -5.6 h8.6 M-.6 -2.6 h5.4" stroke="#a89880" stroke-width={.8} />
    </g>
  );
}
function Pencil() {
  return <g class="f-pencil"><path d="M0 0 L5 -6" stroke={INK} stroke-width={2.2} stroke-linecap="round" /><path d="M0 0 L5 -6" stroke="#d8b14a" stroke-width={1.1} stroke-linecap="round" /></g>;
}
function Purse() {
  return (
    <g>
      <path d="M-3.4 .6 Q-6 9.6 .4 10.2 Q6.8 9.6 4.4 .6 Z" fill="#c9a77a" stroke={INK} stroke-width={1.1} />
      <path d="M-2.6 .8 Q.4 -2 3.6 .8" fill="none" stroke={INK} stroke-width={1} />
    </g>
  );
}

// ---------- head and body ----------
function Head() {
  return (
    <g class="f-head">
      <path d="M-.6 -63.4 h4.4 v3.6 h-4.4 Z" fill={SKIN_D} />
      <path d="M-6.8 -72 Q-8 -64.6 -2.6 -63 L-.6 -68.6 Z" fill="#6f4426" />
      <path d="M2 -78.6 C8.4 -78.6 10.6 -74.6 10.4 -71.4 L11.8 -69.4 Q12 -68.6 11 -68.4 L10.4 -68.2 Q10.4 -64.8 7.6 -63.4 Q4.6 -62 1.4 -62.6 Q-5.6 -63.6 -6.2 -70.6 Q-6.4 -78.6 2 -78.6 Z" fill={SKIN} stroke={INK} stroke-width={1.3} stroke-linejoin="round" />
      <path d="M-3.4 -70.6 q-2.4 -.4 -2.4 2 q0 2.4 2.4 2" fill={SKIN_D} stroke={INK} stroke-width={1} />
      <g class="f-eyes"><ellipse cx={6.6} cy={-71.4} rx={.95} ry={1.25} fill={INK} /><ellipse cx={2.2} cy={-71.5} rx={.8} ry={1.15} fill={INK} /></g>
      <path d="M5.2 -73.8 Q6.8 -74.6 8.4 -73.6 M1.2 -73.8 Q2.2 -74.4 3.2 -73.8" fill="none" stroke="#5a3a22" stroke-width={.9} stroke-linecap="round" />
      <path d="M6.4 -66.6 Q8 -65.6 9.4 -66.6" fill="none" stroke={INK} stroke-width={1} stroke-linecap="round" />
      <path d="M2.6 -64.4 Q6 -62.8 9.2 -64.6" fill="none" stroke="#a87b5a" stroke-width={.8} opacity={.6} />
      <ellipse cx={8.6} cy={-68.6} rx={1.6} ry={1} fill="#e08f78" opacity={.45} />
      <g class="f-hat">
        <path d="M-4.8 -77.4 Q-5.4 -86 2.4 -86.2 Q10 -86 9.6 -77.2 Z" fill="#e0c07a" stroke={INK} stroke-width={1.3} stroke-linejoin="round" />
        <path d="M-4.8 -79 Q2.4 -81 9.6 -78.8" stroke="#8f4a2a" stroke-width={2.2} fill="none" />
        <ellipse cx={2.4} cy={-77.2} rx={14.6} ry={3.4} transform="rotate(-4 2.4 -77.2)" fill="#e0c07a" stroke={INK} stroke-width={1.3} />
        <path d="M-10 -76.4 Q2.4 -73.8 15 -78" fill="none" stroke="#b8964e" stroke-width={.8} />
      </g>
    </g>
  );
}
function Torso() {
  return (
    <g>
      <path d="M-8.4 -59 Q-9.6 -46 -8.6 -31 H8.4 Q9.6 -46 8.2 -59 Q0 -62.4 -8.4 -59 Z" fill={SHIRT} stroke={INK} stroke-width={1.3} stroke-linejoin="round" />
      <path d="M-9 -52 H8.8 M-9.2 -45 H9.2 M-3 -61 V-31 M3.6 -61 V-31" stroke={SHIRT_D} stroke-width={1} opacity={.5} />
      <path d="M-8.8 -38.4 H8.8 L8.6 -29.4 H-8.6 Z" fill={DENIM} stroke={INK} stroke-width={1.2} stroke-linejoin="round" />
      <path d="M-4.4 -50.6 H7 V-37 H-4.4 Z" fill={DENIM} stroke={INK} stroke-width={1.2} stroke-linejoin="round" />
      <path d="M-4 -50.4 L-6.6 -59.6 M6.6 -50.4 L5.6 -60.4" stroke={DENIM} stroke-width={2.4} stroke-linecap="round" />
      <path d="M-1.6 -47 H4.4 V-43 H-1.6 Z" fill="none" stroke="#89a7cc" stroke-width={.8} />
      <circle cx={-3.4} cy={-49} r={1} fill="#d8b14a" stroke={INK} stroke-width={.5} /><circle cx={5.8} cy={-49} r={1} fill="#d8b14a" stroke={INK} stroke-width={.5} />
      <path d="M-.4 -61 Q2 -58.6 4.6 -61" fill="none" stroke="#e9d6b8" stroke-width={1.2} stroke-linecap="round" />
      <path d="M-8.6 -31 Q0 -33 8.4 -31" fill="none" stroke={DENIM_D} stroke-width={1} />
    </g>
  );
}

// ---------- at rest: facing the player, leaning on a rake ----------
// Front view, ground at y=0. Weight on his right leg, the left knee eased; right hand on the rake,
// left fist on the hip. Every few seconds he breathes, blinks, looks about, taps a foot and wipes his brow.
function FrontLeg({ side }: { side: -1 | 1 }) {
  const x = side * 4.2;
  const knee = side === 1 ? 5.6 : x;
  return (
    <g class={`fr-leg ${side < 0 ? 'l' : 'r'}`}>
      <path d={`M${x} -33 L${knee} -18 L${x + side * .4} -7`} stroke={INK} stroke-width={8.8} stroke-linecap="round" stroke-linejoin="round" fill="none" />
      <path d={`M${x} -33 L${knee} -18 L${x + side * .4} -7`} stroke={side < 0 ? DENIM_D : DENIM} stroke-width={7} stroke-linecap="round" stroke-linejoin="round" fill="none" />
      <path d={`M${x - 3.4} -9.6 H${x + 3.6}`} stroke="#89a7cc" stroke-width={1.6} stroke-linecap="round" />
      <g class={side === 1 ? 'fr-tap' : undefined}>
        <path d={`M${x - 4.6 + side * .6} 0 Q${x - 4.8 + side * .6} -6.8 ${x + side * .6} -7.2 Q${x + 4.8 + side * .6} -6.8 ${x + 4.6 + side * .6} 0 Z`} fill={side < 0 ? BOOT_D : BOOT} stroke={INK} stroke-width={1.2} stroke-linejoin="round" />
        <path d={`M${x - 3.6 + side * .6} -2.6 Q${x + side * .6} -3.6 ${x + 3.6 + side * .6} -2.6`} fill="none" stroke="#2c1b10" stroke-width={.8} opacity={.5} />
      </g>
    </g>
  );
}
function Rake() {
  return (
    <g class="fr-rake">
      <path d="M17.2 -2.6 L15 -61" stroke={INK} stroke-width={3.3} stroke-linecap="round" />
      <path d="M17.2 -2.6 L15 -61" stroke="#a87444" stroke-width={1.8} stroke-linecap="round" />
      <path d="M15.6 -40 L16.4 -20" stroke="#c49460" stroke-width={.6} opacity={.7} />
      <path d="M9.6 -3.4 H24.8" stroke={INK} stroke-width={3} stroke-linecap="round" />
      <path d="M9.6 -3.4 H24.8" stroke="#8a9096" stroke-width={1.4} stroke-linecap="round" />
      <path d="M10.6 -3.4 v3.2 M13.4 -3.4 v3.6 M16.2 -3.4 v3.8 M19 -3.4 v3.8 M21.8 -3.4 v3.6 M24.2 -3.4 v3.2" stroke={INK} stroke-width={1.1} stroke-linecap="round" />
    </g>
  );
}
function FrontHead() {
  return (
    <g class="fr-head">
      <path d="M-2.6 -64.6 h5.2 v4 h-5.2 Z" fill={SKIN_D} stroke={INK} stroke-width={.9} />
      <ellipse cx={-8.2} cy={-70} rx={1.8} ry={2.6} fill={SKIN_D} stroke={INK} stroke-width={1} />
      <ellipse cx={8.2} cy={-70} rx={1.8} ry={2.6} fill={SKIN_D} stroke={INK} stroke-width={1} />
      <ellipse cx={0} cy={-70.8} rx={8.2} ry={8.7} fill={SKIN} stroke={INK} stroke-width={1.3} />
      <path d="M-8 -74.6 Q-8.6 -70.6 -7.4 -68.4 L-6.4 -74.8 Z M8 -74.6 Q8.6 -70.6 7.4 -68.4 L6.4 -74.8 Z" fill="#6f4426" />
      <g class="fr-face">
        <g class="fr-eyes"><ellipse cx={-3.1} cy={-71.2} rx={.95} ry={1.25} fill={INK} /><ellipse cx={3.1} cy={-71.2} rx={.95} ry={1.25} fill={INK} /></g>
        <path d="M-4.6 -73.8 Q-3.1 -74.6 -1.6 -73.7 M1.6 -73.7 Q3.1 -74.6 4.6 -73.8" fill="none" stroke="#5a3a22" stroke-width={.9} stroke-linecap="round" />
        <path d="M.2 -70.4 Q1.4 -68.6 0 -67.8" fill="none" stroke="#b7835e" stroke-width={.9} stroke-linecap="round" />
        <path class="fr-mouth" d="M-2.4 -65.9 Q0 -64.2 2.4 -65.9" fill="none" stroke={INK} stroke-width={1} stroke-linecap="round" />
        <ellipse cx={-5.2} cy={-67.6} rx={1.6} ry={1} fill="#e08f78" opacity={.45} /><ellipse cx={5.2} cy={-67.6} rx={1.6} ry={1} fill="#e08f78" opacity={.45} />
      </g>
      <g class="fr-hat">
        <path d="M-7.6 -77.6 Q-8.2 -86.4 0 -86.8 Q8.2 -86.4 7.6 -77.6 Z" fill="#e0c07a" stroke={INK} stroke-width={1.3} stroke-linejoin="round" />
        <path d="M-7.8 -79.4 Q0 -81.2 7.8 -79.4" stroke="#8f4a2a" stroke-width={2.2} fill="none" />
        <path d="M-3 -84.6 Q0 -86 3 -84.6" stroke="#f0d79c" stroke-width={.8} fill="none" />
        <ellipse cx={0} cy={-77.4} rx={15.6} ry={3.6} fill="#e0c07a" stroke={INK} stroke-width={1.3} />
        <path d="M-12.6 -76.6 Q0 -73.8 12.6 -76.6" fill="none" stroke="#b8964e" stroke-width={.8} />
      </g>
    </g>
  );
}
function FrontTorso() {
  return (
    <g class="fr-torso">
      <path d="M-9.4 -58.4 Q-10.6 -46 -9.2 -33 H9.2 Q10.6 -46 9.4 -58.4 Q0 -62 -9.4 -58.4 Z" fill={SHIRT} stroke={INK} stroke-width={1.3} stroke-linejoin="round" />
      <path d="M-9.6 -50 H9.6 M-9.8 -42 H9.8" stroke={SHIRT_D} stroke-width={1} opacity={.45} />
      <path d="M-3.2 -60.4 L0 -56.6 L3.2 -60.4" fill="none" stroke="#e9d6b8" stroke-width={1.2} stroke-linejoin="round" />
      <path d="M-5.8 -51.2 H5.8 V-36 H-5.8 Z" fill={DENIM} stroke={INK} stroke-width={1.2} stroke-linejoin="round" />
      <path d="M-5 -51 L-6.8 -59.2 M5 -51 L6.8 -59.2" stroke={DENIM} stroke-width={2.6} stroke-linecap="round" />
      <path d="M-5 -51 L-6.8 -59.2 M5 -51 L6.8 -59.2" stroke={INK} stroke-width={.6} stroke-linecap="round" opacity={.5} />
      <path d="M-2.8 -47.6 H2.8 V-43.4 H-2.8 Z" fill="none" stroke="#89a7cc" stroke-width={.8} />
      <circle cx={-4.6} cy={-49.6} r={1} fill="#d8b14a" stroke={INK} stroke-width={.5} /><circle cx={4.6} cy={-49.6} r={1} fill="#d8b14a" stroke={INK} stroke-width={.5} />
      <path d="M-9.4 -37 H9.4 L9.8 -30.4 Q4.6 -28.8 0 -30.6 Q-4.6 -28.8 -9.8 -30.4 Z" fill={DENIM} stroke={INK} stroke-width={1.2} stroke-linejoin="round" />
      <path d="M0 -36 V-30.6" stroke={DENIM_D} stroke-width={.8} />
    </g>
  );
}
// an arm from the shoulder at (sx, -57): upper arm to the elbow, forearm to the hand
function FrontArm({ cls, s, e, h }: { cls: string; s: [number, number]; e: [number, number]; h: [number, number] }) {
  return (
    <g class={`fr-arm ${cls}`}>
      <path d={`M${s[0]} ${s[1]} L${e[0]} ${e[1]}`} stroke={INK} stroke-width={7.2} stroke-linecap="round" />
      <path d={`M${s[0]} ${s[1]} L${e[0]} ${e[1]}`} stroke={SHIRT} stroke-width={5.4} stroke-linecap="round" />
      <g class="fr-fore">
        <path d={`M${e[0]} ${e[1]} L${h[0]} ${h[1]}`} stroke={INK} stroke-width={6.4} stroke-linecap="round" />
        <path d={`M${e[0]} ${e[1]} L${h[0]} ${h[1]}`} stroke={SHIRT} stroke-width={4.6} stroke-linecap="round" />
        <circle class="fr-hand" cx={h[0]} cy={h[1]} r={2.9} fill={SKIN} stroke={INK} stroke-width={1.1} />
      </g>
    </g>
  );
}
export function FarmerRest() {
  return (
    <g class="farmer-rest">
      <ellipse class="f-shadow" cx={3} cy={.6} rx={16} ry={3.2} fill="rgba(40,26,12,0.24)" />
      <g class="fr-body">
        <FrontLeg side={-1} />
        <FrontLeg side={1} />
        <Rake />
        <g class="fr-upper">
          <FrontTorso />
          <FrontHead />
          <FrontArm cls="r" s={[9, -57]} e={[13.6, -47.4]} h={[15.2, -54.6]} />
          <path class="fr-grip" d="M13.2 -56.6 Q15.2 -58 17.2 -56.4" fill="none" stroke={INK} stroke-width={.8} stroke-linecap="round" />
          <FrontArm cls="l" s={[-9, -57]} e={[-14.6, -46.6]} h={[-9.6, -38]} />
        </g>
      </g>
    </g>
  );
}

/** What each job holds: [back hand, front hand]. */
function hands(action: FarmerAction): [ComponentChildren, ComponentChildren] {
  switch (action) {
    case 'water': return [null, <Can />];
    case 'plant': return [<Pouch />, null];
    case 'fertilizer': return [<Pouch white />, null];
    case 'mulch': return [null, <Fork />];
    case 'care': return [null, <Hoe />];
    case 'early': case 'harvest': return [<Basket />, null];
    case 'build': return [null, <Hammer />];
    case 'paper': return [<Sheet />, <Pencil />];
    case 'coin': return [<Purse />, null];
    default: return [null, null];
  }
}

export function Farmer({ action = 'idle', walking, rest }: { action?: FarmerAction; walking: boolean; bubble?: string | null; rest?: boolean }) {
  const act = walking ? 'idle' : action;
  if (rest && !walking && act === 'idle') return <FarmerRest />;
  const [backHand, frontHand] = hands(act);
  return (
    <g class={`farmer-rig${walking ? ' walking' : ''} fa-${act}`}>
      <ellipse class="f-shadow" cx={1.4} cy={.8} rx={13} ry={3.2} fill="rgba(40,26,12,0.24)" />
      <g class="f-dust" fill="#e6d8b8" opacity={.8}><circle class="d0" cx={-5} cy={-1.4} r={2.6} /><circle class="d1" cx={0} cy={-1.4} r={2.6} /></g>
      <g class="f-body">
        <g transform="translate(-2.6 0)"><Leg back /></g>
        <g transform="translate(2.6 0)"><Leg /></g>
        <g class="f-upper">
          <g transform="translate(-3.8 0)"><Arm back>{backHand}</Arm></g>
          <g class="f-torso"><Torso /><Head /></g>
          <g transform="translate(4.6 0)"><Arm>{frontHand}</Arm></g>
        </g>
      </g>
      <g class="f-fx">
        {act === 'water' && <g class="f-stream"><path d="M38.6 -34 Q43 -29.6 43.6 -18 Q44 -7 44.4 0" fill="none" stroke="#cfeaf7" stroke-width={2.4} stroke-linecap="round" stroke-dasharray="3 2.4" /><path d="M38.2 -34.4 Q42 -30 42.6 -18 Q42.9 -7 43.2 0" fill="none" stroke="#5fa9cf" stroke-width={1} stroke-linecap="round" stroke-dasharray="2 3.4" /></g>}
        {act === 'water' && [0, 1].map((i) => <ellipse class={`f-splash k${i}`} cx={44} cy={.4} rx={4.4} ry={1.3} fill="none" stroke="#cfeaf7" stroke-width={1.1} />)}
        {(act === 'plant' || act === 'fertilizer') && [0, 1, 2, 3, 4].map((i) => <circle class={`f-seed k${i}`} cx={30.6} cy={-58.7} r={act === 'plant' ? 1.25 : 1.1} fill={act === 'plant' ? '#7a5230' : '#f3ecda'} stroke={act === 'plant' ? 'none' : '#a89880'} stroke-width={.4} />)}
        {act === 'mulch' && [0, 1, 2, 3, 4, 5].map((i) => <path class={`f-hay k${i}`} d="M-2.4 .6 L2.4 -.6" stroke="#c4a05a" stroke-width={1.1} stroke-linecap="round" />)}
        {act === 'care' && [0, 1, 2, 3, 4].map((i) => <circle class={`f-clod k${i}`} r={1.2 - (i % 3) * .2} fill="#7a5638" />)}
        {act === 'build' && <g class="f-post"><path d="M8.8 0 V-19.6 L11.2 -21.4 L13.6 -19.6 V0 Z" fill="#c99b62" stroke={INK} stroke-width={1} stroke-linejoin="round" /><path d="M10 -16 V-4 M12.4 -14 V-6" stroke="#9a6b40" stroke-width={.6} /></g>}
        {act === 'build' && [0, 1, 2].map((i) => <path class={`f-chip k${i}`} d="M-1 -.5 L1 -.4 L.6 .6 Z" fill="#d8b98a" stroke={INK} stroke-width={.3} />)}
        {act === 'coin' && <g class="f-coin"><ellipse rx={2.6} ry={2.6} fill="#e2b84a" stroke={INK} stroke-width={.8} /></g>}
        {(act === 'harvest' || act === 'early') && <g class="f-pick"><path d="M0 -1 q-1 -5 .8 -7.6 q1.8 2.6 -.8 7.6" fill="#5e9a3a" stroke={INK} stroke-width={.7} /><circle cx={0} cy={0} r={2.4} fill="#c0473a" stroke={INK} stroke-width={.8} /></g>}
      </g>
    </g>
  );
}
