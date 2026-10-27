// A plant on its bed, alive: it sways in the week's wind and, when it grows a stage, grows in front of the player.
// The drawing stays in art/crops; this file only decides how it moves. Curves and keyframes: motion.css.
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { Plant } from '../engine/game';
import type { CropId } from '../engine/data';
import { CropSprite } from '../art/crops';
import { NibbledPlant } from '../art/pestDamage';
import { reducedMotionNow } from './common';
import type { SkyKind } from './skyForecast';

/** tall crops catch more wind */
const TALL = new Set<CropId>(['wheat', 'sunflower', 'corn', 'rye', 'buckwheat', 'rice', 'seabuckthorn']);
/** a hive and a mushroom bed do not sway */
const STILL = new Set<CropId>(['honey', 'mushrooms']);

export type Wind = 'none' | 'calm' | 'breeze' | 'storm';
/** The week's wind from its sky: rain, hail and flood bend the field, clouds stir it, clear weather barely moves it.
 *  Winter is still: the beds lie under snow. */
export function windFor(kind: SkyKind | undefined, winter: boolean): Wind {
  if (winter || !kind) return winter ? 'none' : 'calm';
  if (kind === 'rain' || kind === 'hail' || kind === 'flood') return 'storm';
  if (kind === 'cloud' || kind === 'cold' || kind === 'frost' || kind === 'thaw') return 'breeze';
  return 'calm';
}

/** One bed's growth on screen after its wave delay: the squat (260) overlaps the rise (150 + 580). */
export const GROW_MS = 730;
/** The wave crosses the field a column every 90 ms and a row every 45 ms, after the calendar has faded (160 ms). */
export const growWave = (col: number, row: number) => Math.round(160 + Math.max(0, col) * 90 + Math.max(0, row) * 45);

function Sprite({ plant, stage }: { plant: Plant; stage: number }) {
  return plant.chewed ? <NibbledPlant plant={plant} stage={stage} /> : <CropSprite id={plant.id} stage={stage} />;
}

// soil jumping at the root, leaves flying off the top, a flash on a plant that has just ripened
function GrowFx({ stage, tall, wave }: { stage: number; tall: boolean; wave: number }) {
  const top = stage >= 2 ? (tall ? 16 : 32) : stage === 1 ? 46 : 58;
  const v = (o: Record<string, string>) => o as Record<string, string>;
  return (
    <g class="grow-fx" style={{ ['--gw' as string]: `${wave}ms` }} pointer-events="none">
      <g fill="#7a5236">
        {[-15, -5, 5, 15].map((dx, i) => <ellipse class="gf-crumb" cx={50} cy={81} rx={3.2} ry={2.2} style={v({ '--dx': `${dx}px`, '--dy': `${-4 - (i % 2) * 3}px` })} />)}
      </g>
      <g stroke="#3f2a1d" stroke-width={0.6}>
        {[-1, 0, 1].map((k, i) => {
          const dx = k * 16 + 4, up = -14 - (i % 2) * 6;
          return <ellipse class="gf-leaf" cx={50} cy={top} rx={3} ry={1.5} fill={i % 2 ? '#93d25a' : '#5dad3c'}
            style={v({ '--x1': `${dx * .6}px`, '--y1': `${up}px`, '--r1': `${dx * 4}deg`, '--x2': `${dx}px`, '--y2': `${up + 18}px`, '--r2': `${dx * 9}deg` })} />;
        })}
      </g>
      {stage >= 2 && <g transform={`translate(68 ${top + 6})`}>
        <path class="gf-glint" d="M0 -7 L1.6 -1.6 L7 0 L1.6 1.6 L0 7 L-1.6 1.6 L-7 0 L-1.6 -1.6 Z" fill="#fff6c8" stroke="#e0a92e" stroke-width={0.8} />
      </g>}
    </g>
  );
}

/**
 * The plant inside its bed's `.plant` group: the sway (the wind), the gust (a storm's push) and the sprite.
 * When the stage goes up the old sprite stays a moment to squat while the new one rises; then it is dropped.
 * col/row: the bed's place in the frame, for the wind's phase and the growth wave.
 */
export function PlantBody({ plant, stage, col, row }: { plant: Plant; stage: number; col: number; row: number }) {
  const shown = useRef(stage);
  const [from, setFrom] = useState<number | null>(null);
  const wave = growWave(col, row);
  useLayoutEffect(() => {
    const was = shown.current;
    shown.current = stage;
    if (stage <= was || reducedMotionNow()) { setFrom(null); return; }
    setFrom(was);
    // the rise's animationend drops the old sprite; this is the backstop for a field that never painted it
    const t = window.setTimeout(() => setFrom(null), wave + GROW_MS + 1500);
    return () => window.clearTimeout(t);
  }, [stage]);
  const tall = TALL.has(plant.id);
  const sway = STILL.has(plant.id) ? undefined : `sway${tall ? ' tall' : ''}`;
  const growing = from !== null;
  return (
    <g class={sway} style={sway ? { ['--sw' as string]: `${-(Math.max(0, col) * .28 + Math.max(0, row) * .12).toFixed(2)}s` } : undefined}>
      <g class="gust" style={{ ['--gc' as string]: `${Math.round(Math.max(0, col) * 120)}ms` }}>
        {growing && <g class="grow-old" style={{ ['--gw' as string]: `${wave}ms` }}><Sprite plant={plant} stage={from!} /></g>}
        <g key={stage} class={growing ? 'grow-new' : undefined} style={growing ? { ['--gw' as string]: `${wave}ms` } : undefined}
          onAnimationEnd={(e) => { if (e.animationName === 'grow-rise') setFrom(null); }}>
          <Sprite plant={plant} stage={stage} />
        </g>
        {growing && <GrowFx stage={stage} tall={tall} wave={wave} />}
      </g>
    </g>
  );
}
