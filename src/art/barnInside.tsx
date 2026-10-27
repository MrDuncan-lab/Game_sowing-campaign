// The barn from the inside: two long shelves of crates. Every slot is a share of the capacity,
// so the drawing itself shows how full the barn is; empty slots are chalked outlines. viewBox 0 0 340 116.
import type { CropId } from '../engine/data';
import { CropIcon } from './crops';
const INK = '#3f2a1d';

/** `tall` — the barn's screen: the same shelves with the roof beams and a lamp above, the floor with sacks below
 *  (viewBox 0 0 340 178). */
export function BarnInside({ lots, used, cap, yard, tall = false }: { lots: [CropId, number][]; used: number; cap: number; yard: number; tall?: boolean }) {
  const inner = <BarnShelves lots={lots} used={used} cap={cap} yard={yard} />;
  if (!tall) return <svg viewBox="0 0 340 116" class="barn-inside" aria-hidden="true">{inner}</svg>;
  return (
    <svg viewBox="0 0 340 178" class="barn-inside tall" aria-hidden="true">
      {/* the gable: boards, the tie beam, two rafters and a lamp on its cord */}
      {Array.from({ length: 12 }, (_, i) => <rect x={i * 30} y={0} width={30} height={40} fill={i % 2 ? '#a95b37' : '#b2633d'} />)}
      <path d="M0 40 L170 -6 L340 40" fill="none" stroke="#5a301b" stroke-width={9} stroke-linejoin="round" />
      <path d="M60 34 L84 10 M280 34 L256 10 M170 -2 V34" stroke="#5a301b" stroke-width={5} />
      <rect x={0} y={30} width={340} height={9} fill="#6a3a22" stroke="#3f2a1d" stroke-width={1.4} />
      <path d="M118 6 V22" stroke="#3f2a1d" stroke-width={1.4} />
      <g transform="translate(118 24)">
        <circle r={13} fill="#ffd77a" opacity={0.28} class="barn-glow" />
        <path d="M-6 -2 H6 L4 6 H-4 Z" fill="#3f2a1d" />
        <circle cy={7} r={3.4} fill="#ffe7a3" stroke="#3f2a1d" stroke-width={1} />
      </g>
      <path d="M232 10 q6 8 0 16 q-6 8 0 16" fill="none" stroke="#c9a15c" stroke-width={2.2} stroke-linecap="round" opacity={0.85} />
      <g transform="translate(0 38)">{inner}</g>
      {/* the floor: boards, two sacks, a barrel and a pitchfork against the wall */}
      <path d="M0 154 H340 V178 H0 Z" fill="#8a5a34" />
      {[0, 1, 2].map((i) => <path d={`M0 ${159 + i * 7} H340`} stroke="#6f4425" stroke-width={1.2} />)}
      <g stroke="#3f2a1d" stroke-width={1.6} stroke-linejoin="round">
        <path d="M14 172 q-4 -18 6 -26 l-3 -5 h14 l-3 5 q10 8 6 26 Z" fill="#d9bf8a" />
        <path d="M38 172 q-3 -14 5 -20 l-2 -4 h11 l-2 4 q8 6 5 20 Z" fill="#cfb27a" />
        <rect x={292} y={146} width={26} height={27} rx={6} fill="#a8723f" />
        <path d="M292 153 H318 M292 166 H318" stroke="#5a301b" stroke-width={2.2} />
        <path d="M268 174 L284 120" stroke="#8a5a33" stroke-width={2.6} />
        <path d="M280 122 l4 -10 M284 120 l2 -11 M288 122 l0 -10" stroke="#9aa3a8" stroke-width={1.8} stroke-linecap="round" />
      </g>
    </svg>
  );
}

function BarnShelves({ lots, used, cap, yard }: { lots: [CropId, number][]; used: number; cap: number; yard: number }) {
  const SLOTS = 20, per = 10;
  const full = Math.min(SLOTS, cap > 0 ? Math.round((used / cap) * SLOTS) : 0);
  const crates: CropId[] = [];
  const total = lots.reduce((a, [, q]) => a + q, 0) || 1;
  for (const [c, q] of lots) for (let i = 0; i < Math.max(1, Math.round((q / total) * full)); i++) crates.push(c);
  const shown = crates.slice(0, full);
  const slot = (i: number) => [16 + (i % per) * 31.2, i < per ? 14 : 56] as const;
  return (
    <>
      <defs>
        <linearGradient id="barn-light" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0" /><stop offset="1" stop-color="#2a170c" stop-opacity=".22" /></linearGradient>
      </defs>
      {Array.from({ length: 12 }, (_, i) => <rect x={i * 30} y={0} width={30} height={116} fill={i % 2 ? '#b2623c' : '#bb6c43'} />)}
      {Array.from({ length: 12 }, (_, i) => <path d={`M${i * 30} 0 V116`} stroke="#8d4528" stroke-width={1.6} />)}
      <rect width={340} height={116} fill="url(#barn-light)" />
      <path d="M0 4 H340" stroke="#6a3a22" stroke-width={7} />
      {[40, 82].map((y) => (
        <g stroke={INK} stroke-width={1.8} stroke-linejoin="round">
          <rect x={8} y={y} width={324} height={7} rx={1.5} fill="#8f5d34" />
          <path d={`M18 ${y + 7} l8 10 M314 ${y + 7} l-8 10 M166 ${y + 7} v10`} stroke="#6a3a22" stroke-width={3} />
        </g>
      ))}
      {Array.from({ length: SLOTS }, (_, i) => {
        const [x, y] = slot(i);
        const c = shown[i];
        if (!c) return <rect x={x} y={y + 6} width={27} height={20} rx={2.5} fill="none" stroke="#f4dcc0" stroke-width={1.3} stroke-dasharray="3 3" opacity={.55} />;
        return (
          <g transform={`translate(${x} ${y})`}><g class="barn-crate">
            <g transform="translate(.5 -12)"><CropIcon id={c} size={26} /></g>
            <rect x={0} y={9} width={27} height={17} rx={2.5} fill="#d9a466" stroke={INK} stroke-width={1.6} />
            <path d="M2 15 H25 M2 20.5 H25" stroke="#a8723f" stroke-width={1.2} />
          </g></g>
        );
      })}
      <path d="M0 108 H340" stroke="#6a3a22" stroke-width={2} />
      <path d="M0 110 H340 V116 H0 Z" fill="#8a5a34" />
      {[[30, 111], [96, 112], [210, 111], [290, 112]].map(([x, y]) => <path d={`M${x} ${y} l9 -2 M${x + 4} ${y + 1} l8 1`} stroke="#e7c46f" stroke-width={1.4} stroke-linecap="round" />)}
      {!lots.length && (
        <g transform="translate(170 64)">
          <path d="M-46 -14 H46 V12 H-46 Z" fill="#f4e4bf" stroke={INK} stroke-width={1.8} />
          <path d="M-30 -14 L-20 -30 M30 -14 L20 -30" stroke={INK} stroke-width={1.4} />
          <text y={4} text-anchor="middle" class="barn-sign">амбар пуст</text>
        </g>
      )}
      {yard > 0 && (
        <g transform="translate(300 86)" class="barn-yard">
          <rect x={0} y={0} width={30} height={20} rx={3} fill="#f08a24" stroke={INK} stroke-width={1.6} />
          <text x={15} y={14} text-anchor="middle" class="barn-sign small">+{yard}</text>
        </g>
      )}
    </>
  );
}
