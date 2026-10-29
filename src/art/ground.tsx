// 29.10 · the region's ground around the beds, beyond the grass itself (meadow.tsx GROUND):
// - the taiga's shade: a plot next to a taiga cell lies in the trees' shadow, darker towards the forest (the forest
//   also cools its neighbours by 2°, so the shade tells the rule);
// - the temporary camp's plot on an expedition: the rented beds are roped off on stakes, a rag on each corner stake.
// Pure decoration: nothing here is clickable.
import { GRID } from '../engine/data';
import { tile, type GameState } from '../engine/game';
import { P } from './palette';

export type Side = 'n' | 's' | 'w' | 'e';
const STEP: Record<Side, [number, number]> = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] };
const at = (s: GameState, x: number, y: number) => (x < 0 || y < 0 || x >= GRID || y >= GRID ? null : tile(s, x, y));

/** the sides of a plot that face a taiga cell */
export function forestSides(s: GameState, x: number, y: number): Side[] {
  return (Object.keys(STEP) as Side[]).filter((d) => at(s, x + STEP[d][0], y + STEP[d][1])?.terrain === 'forest');
}

/** the gradients the shade uses, once per scene (inside <defs>) */
export function ShadeDefs() {
  const stop = (o: number) => <><stop offset="0" stop-color="#16301c" stop-opacity={o} /><stop offset="1" stop-color="#16301c" stop-opacity="0" /></>;
  return (
    <>
      <linearGradient id="fshade-n" x1="0" x2="0" y1="0" y2="1">{stop(.34)}</linearGradient>
      <linearGradient id="fshade-s" x1="0" x2="0" y1="1" y2="0">{stop(.34)}</linearGradient>
      <linearGradient id="fshade-w" x1="0" x2="1" y1="0" y2="0">{stop(.3)}</linearGradient>
      <linearGradient id="fshade-e" x1="1" x2="0" y1="0" y2="0">{stop(.3)}</linearGradient>
    </>
  );
}

/** the trees' shade over a plot, from each side that faces the taiga (drawn under the plants) */
export function ForestEdge({ sides }: { sides: Side[] }) {
  return (
    <g class="forest-shade" pointer-events="none">
      {sides.map((d) => d === 'n' ? <rect x={0} y={0} width={100} height={46} fill="url(#fshade-n)" />
        : d === 's' ? <rect x={0} y={54} width={100} height={46} fill="url(#fshade-s)" />
        : d === 'w' ? <rect x={0} y={0} width={42} height={100} fill="url(#fshade-w)" />
        : <rect x={58} y={0} width={42} height={100} fill="url(#fshade-e)" />)}
      {/* a few needles blown out of the forest onto the edge */}
      {sides.includes('n') && <path d="M18 8 l5 -1 M46 12 l4 1.4 M76 6 l5 -1" stroke="#5a4a2a" stroke-width={1.1} stroke-linecap="round" opacity={.5} />}
      {sides.includes('w') && <path d="M6 30 l1.4 5 M10 64 l-1 5" stroke="#5a4a2a" stroke-width={1.1} stroke-linecap="round" opacity={.5} />}
      {sides.includes('e') && <path d="M94 26 l-1.4 5 M90 70 l1 5" stroke="#5a4a2a" stroke-width={1.1} stroke-linecap="round" opacity={.5} />}
    </g>
  );
}

/** the rented plot of an expedition's camp: a rope on stakes along the edge between the farm's beds and the land
 *  round about, a stake with a red rag at every outer corner. Coordinates in the field's cells (CELL 100, PAD). */
export function CampRope({ s, pad, cell, visible, winter }: { s: GameState; pad: number; cell: number; visible: (x: number, y: number) => boolean; winter: boolean }) {
  const mine = (x: number, y: number) => !!at(s, x, y)?.owned;
  const ropes: string[] = [];
  const stakes: [number, number][] = [];
  const X = (x: number) => pad + x * cell, Y = (y: number) => pad + y * cell;
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    if (!mine(x, y) || !visible(x, y)) continue;
    const sag = 4;
    if (!mine(x, y - 1)) ropes.push(`M${X(x)} ${Y(y)} Q${X(x) + cell / 2} ${Y(y) + sag} ${X(x + 1)} ${Y(y)}`);
    if (!mine(x, y + 1)) ropes.push(`M${X(x)} ${Y(y + 1)} Q${X(x) + cell / 2} ${Y(y + 1) + sag} ${X(x + 1)} ${Y(y + 1)}`);
    if (!mine(x - 1, y)) ropes.push(`M${X(x)} ${Y(y)} Q${X(x) - sag / 2} ${Y(y) + cell / 2} ${X(x)} ${Y(y + 1)}`);
    if (!mine(x + 1, y)) ropes.push(`M${X(x + 1)} ${Y(y)} Q${X(x + 1) + sag / 2} ${Y(y) + cell / 2} ${X(x + 1)} ${Y(y + 1)}`);
  }
  // a corner is an outer corner of the plot when exactly one of the four cells round it is the farm's
  for (let y = 0; y <= GRID; y++) for (let x = 0; x <= GRID; x++) {
    const n = [mine(x - 1, y - 1), mine(x, y - 1), mine(x - 1, y), mine(x, y)].filter(Boolean).length;
    if (n === 1 && (visible(x, y) || visible(x - 1, y - 1) || visible(x - 1, y) || visible(x, y - 1))) stakes.push([X(x), Y(y)]);
  }
  if (!ropes.length) return null;
  return (
    <g class="camp-rope" pointer-events="none">
      <path d={ropes.join(' ')} fill="none" stroke="rgba(40,30,20,0.25)" stroke-width={3.4} transform="translate(1.5 2.5)" stroke-linecap="round" />
      <path d={ropes.join(' ')} fill="none" stroke={winter ? '#b9a27a' : '#d9b77a'} stroke-width={2.2} stroke-linecap="round" />
      <path d={ropes.join(' ')} fill="none" stroke="#8a6a3a" stroke-width={.8} stroke-dasharray="2 4" stroke-linecap="round" />
      {stakes.map(([x, y]) => (
        <g transform={`translate(${x} ${y})`}>
          <ellipse cx={2} cy={3} rx={5} ry={1.8} fill="rgba(0,0,0,0.2)" />
          <path d="M-2 3 V-15 L0 -18 L2 -15 V3 Z" fill="#9a6a3a" stroke={P.ink} stroke-width={1.2} stroke-linejoin="round" />
          <path d="M1.6 -13 L11 -10.4 L4 -7.4 L9 -4.6 L1.6 -5.4 Z" fill="#d0443a" stroke={P.ink} stroke-width={.9} stroke-linejoin="round" />
        </g>
      ))}
    </g>
  );
}
