// The barn from the inside: two long shelves of crates. Every slot is a share of the capacity,
// so the drawing itself shows how full the barn is; empty slots are chalked outlines. viewBox 0 0 340 116.
import type { CropId } from '../engine/data';
import { CropIcon } from './crops';
const INK = '#3f2a1d';

export function BarnInside({ lots, used, cap, yard }: { lots: [CropId, number][]; used: number; cap: number; yard: number }) {
  const SLOTS = 20, per = 10;
  const full = Math.min(SLOTS, cap > 0 ? Math.round((used / cap) * SLOTS) : 0);
  const crates: CropId[] = [];
  const total = lots.reduce((a, [, q]) => a + q, 0) || 1;
  for (const [c, q] of lots) for (let i = 0; i < Math.max(1, Math.round((q / total) * full)); i++) crates.push(c);
  const shown = crates.slice(0, full);
  const slot = (i: number) => [16 + (i % per) * 31.2, i < per ? 14 : 56] as const;
  return (
    <svg viewBox="0 0 340 116" class="barn-inside" aria-hidden="true">
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
    </svg>
  );
}
