// The morning after a week: what the night did to the field is shown before the beds change.
// Each event holds the affected beds in their old state, plays over them, then reveals the result.
// The engine supplies actual damage, so harvesting never masquerades as destruction.
import type { GameState, Plant } from '../engine/game';
import { frostVictims, growthMoisture, tile, crowsOpen } from '../engine/game';
import { GRID } from '../engine/data';
import { Crow, CrowFlying } from '../art/crows';
import type { MissCause } from './collisions';
import { CrowMiss, BugMiss, CrowSnack, CrowDust } from '../art/collisions';
import { icons } from '../art/icons';

export type MorningKind = 'frost' | 'dry' | 'hail' | 'flood' | 'crows' | 'thieves' | 'crowmiss' | 'bugmiss' | 'bear' | 'boars' | 'fire';
export interface MorningCell { x: number; y: number; note?: string; killed?: boolean; before?: Plant; after?: Plant | null;
  /** crowmiss / bugmiss: what had already taken the plant */ cause?: MissCause; pest?: 'beetle' | 'locust';
  /** crows: beetles were chewing this plant, the crow takes one */ bugs?: boolean }
export interface MorningStep { id: number; kind: MorningKind; cells: MorningCell[]; dur: number; reveal: number }
export const MORNING_STAGGER_MS = 140;
export const morningCellDelay = (index:number) => (index % 4) * MORNING_STAGGER_MS;

// [whole layer, the moment the bed shows the result], ms. The crows play in three acts (motion.css): arrive 620,
// the first strike at 1120 (the loss shows then), gone by 2430. A miss is one beat and leaves early.
const TIMING: Record<MorningKind, [number, number]> = {
  frost: [2700, 1500], dry: [2500, 1500], hail: [2700, 1600], flood: [2700, 1600], crows: [2450, 1120], thieves: [2100, 1150],
  crowmiss: [2400, 1100], bugmiss: [2000, 1800],
  bear: [2600, 1300], boars: [2400, 1200], fire: [2700, 1500],
};
let stepId = 0;
export function morningStep(kind: MorningKind, cells: MorningCell[]): MorningStep {
  return { id: ++stepId, kind, cells, dur: TIMING[kind][0], reveal: TIMING[kind][1] };
}
const k = (x: number, y: number) => `${x},${y}`;

export function buildMorning(_prev: GameState, next: GameState): MorningStep[] {
  const events=next.lastReport?.fieldDamage ?? [];
  const steps:MorningStep[]=[];
  for(const e of events){
    const c={x:e.x,y:e.y,note:e.note ?? (e.lost>0 && e.after ? `−${e.lost} ед.` : undefined),killed:!e.after,before:e.before,after:e.after};
    const prev=steps.at(-1);
    if(prev?.kind===e.kind && !prev.cells.some(t=>t.x===e.x&&t.y===e.y))prev.cells.push(c);
    else steps.push({id:++stepId,kind:e.kind,cells:[c],dur:TIMING[e.kind][0],reveal:TIMING[e.kind][1]});
  }
  return steps;
}

/** Cells whose plants should look affected (shake, frost-bitten, drooping) while a step plays. */
export function morningPlantClass(step: MorningStep | null): Map<string, string> {
  const m = new Map<string, string>();
  if (step) step.cells.forEach((c, i) => m.set(k(c.x, c.y), `m-plant m-plant-${step.kind} mi${i % 4}`));
  return m;
}

const PAD = 22, CELL = 100;
function Hailstones({ seed }: { seed: number }) {
  // thin slanted streaks, then pellets lying on the soil for a moment before they melt
  return <g>
    <g class="m-hailstreaks" stroke="#eef6fb" stroke-width={1.1} stroke-linecap="round">{Array.from({ length: 12 }, (_, i) => {
      const x = 8 + ((i * 37 + seed * 13) % 84), d = ((i * 53 + seed * 7) % 12) * .05;
      return <path class="m-streak" style={{ animationDelay: `${d}s` }} d={`M${x + 8} ${-14} l-5 14`} />;
    })}</g>
    <g class="m-pellets" fill="#f6fbfe" stroke="#9fb8c8" stroke-width={.4}>{Array.from({ length: 16 }, (_, i) => {
      const x = 12 + ((i * 41 + seed * 11) % 76), y = 22 + ((i * 29 + seed * 5) % 68);
      return <circle class="m-pellet" style={{ animationDelay: `${.15 + (i % 8) * .06}s` }} cx={x} cy={y} r={1 + (i % 3) * .3} />;
    })}</g>
  </g>;
}
export function MorningLayer({ step }: { step: MorningStep | null }) {
  if (!step) return null;
  return (
    <g class={`morning m-${step.kind}`} key={step.id} pointer-events="none" aria-hidden="true" style={{ ['--m-dur' as string]: `${step.dur}ms` }}>
      {step.cells.map((c, i) => (
        <g transform={`translate(${PAD + c.x * CELL} ${PAD + c.y * CELL})`} style={{ ['--mi' as string]: String(i % 4), ['--d' as string]: `${morningCellDelay(i)}ms` }} class="m-cell">
          {step.kind === 'crows' && <>
            <g transform="translate(46 50)">
              <CrowDust />
              <g class="mc-in"><g transform="translate(1 -16) scale(1.3)"><CrowFlying /></g></g>
              <g class="mc-stand"><g transform="scale(1.3)"><Crow /></g></g>
              {c.bugs && <CrowSnack />}
              <g class="mc-out"><g transform="translate(1 -16) scale(1.3)"><CrowFlying /></g></g>
            </g>
            {/* what flies off the beak on each strike, and a feather shaken loose on landing */}
            <g stroke="#3f2a1d" stroke-width={.7}>
              <ellipse class="mc-bit b0" cx={80} cy={44} rx={4.2} ry={2.2} fill="#93d25a" />
              <ellipse class="mc-bit b1" cx={80} cy={44} rx={3.4} ry={1.8} fill="#5dad3c" />
            </g>
            <path class="mc-feather" d="M40 30 q4 -6 9 -3 q-3 5 -9 3z" fill="#3a3a42" />
          </>}
          {step.kind === 'frost' && <g class="m-frost-art">
            <rect class="m-rime" x={6} y={8} width={88} height={82} rx={12} fill="rgba(222,238,248,.42)" stroke="rgba(240,248,255,.9)" stroke-width={1.6} />
            <g class="m-hoar" fill="#ffffff">{Array.from({ length: 40 }, (_, j) => <circle cx={10 + ((j * 37 + c.x * 7) % 80)} cy={12 + ((j * 23 + c.y * 5) % 74)} r={.5 + (j % 3) * .3} opacity={.55 + (j % 4) * .1} />)}</g>
            <path class="m-rimeedge" d="M12 14 h76 M10 20 v62 M90 22 v60" stroke="#ffffff" stroke-width={.8} stroke-dasharray="1 2.4" opacity={.8} />
          </g>}
          {step.kind === 'dry' && <g class="m-dry-art">
            <path class="m-crack" d="M18 30 l10 8 l-3 9 l8 6 M70 24 l-6 9 l5 8 M58 62 l9 6 l-2 10 M26 70 l9 -4 l5 7" stroke="rgba(63,42,29,.65)" stroke-width={2} fill="none" stroke-linecap="round" stroke-linejoin="round" />
            <circle class="m-heat" cx={50} cy={48} r={40} fill="rgba(255,196,96,.22)" />
          </g>}
          {step.kind === 'hail' && <Hailstones seed={c.x * 3 + c.y} />}
          {step.kind === 'flood' && <g class="m-flood-art">
            <rect class="m-water" x={6} y={8} width={88} height={82} rx={12} fill="rgba(79,159,207,.55)" stroke="#bfe3f7" stroke-width={2} />
            <path class="m-wave" d="M14 40 q8 -6 16 0 t16 0 t16 0 t16 0 M14 62 q8 -6 16 0 t16 0 t16 0 t16 0" stroke="#e1f4ff" stroke-width={2.6} fill="none" stroke-linecap="round" />
          </g>}
          {step.kind === 'crowmiss' && <CrowMiss cause={c.cause ?? 'gone'} />}
          {step.kind === 'bugmiss' && <BugMiss cause={c.cause ?? 'gone'} pest={c.pest ?? 'beetle'} />}
          {step.kind === 'bear' && <g class="m-bear-art">
            {[[18, 86, -28], [34, 70, -18], [52, 60, -24], [70, 46, -16]].map(([x, y, rr], j) => <g class={`m-step s${j}`} transform={`translate(${x} ${y}) rotate(${rr})`} fill="#4a301d" opacity={.75}><ellipse rx={6} ry={5} />{[-6, -2, 2, 6].map((dx) => <circle cx={dx} cy={-7} r={1.8} />)}</g>)}
            <g class="m-bear-walk"><g transform="translate(26 30) scale(1.05)">{icons.bear()}</g></g>
          </g>}
          {step.kind === 'boars' && <g class="m-boar-art">
            <path class="m-crack" d="M14 70 q8 -8 16 0 q8 8 16 0 M46 46 q8 -8 16 0 q8 8 16 0 M24 30 q6 -6 12 0" stroke="#5a3a24" stroke-width={3} fill="none" stroke-linecap="round" />
            <g class="m-boar-run"><g transform="translate(20 34) scale(.95)">{icons.boar()}</g></g>
          </g>}
          {step.kind === 'fire' && <g class="m-fire-art">
            <g class="m-flames">{[[22, 70], [50, 58], [76, 72]].map(([x, y], j) => <g transform={`translate(${x - 12} ${y - 22}) scale(.5)`} style={{ animationDelay: `${j * .12}s` }} class="m-flame">{icons.fire()}</g>)}</g>
            <rect class="m-ash" x={6} y={8} width={88} height={82} rx={12} fill="rgba(70,62,56,.45)" />
          </g>}
          {step.kind === 'thieves' && <g class="m-thief-art" fill="#6b4a33" opacity={.7}>
            {[[16, 92, -20], [28, 78, 15], [40, 66, -15], [52, 54, 15]].map(([x, y, rr], j) => <ellipse class={`m-step s${j}`} cx={x} cy={y} rx={4.5} ry={7} transform={`rotate(${rr} ${x} ${y})`} />)}
          </g>}
        </g>
      ))}
    </g>
  );
}
