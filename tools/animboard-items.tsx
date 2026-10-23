/** @jsxImportSource preact */
import type { JSX } from 'preact';
import { Farmer } from '../src/art/farmer';
import type { FarmerAction } from '../src/art/farm';
import { TileEffect } from '../src/ui/Scene';
import type { FxKind } from '../src/ui/Scene';
import { Bed } from '../src/art/beds';
import { CropSprite } from '../src/art/crops';
import { Companion } from '../src/art/companions';
import { Animal } from '../src/art/animals';
import { Crow, CrowFlying } from '../src/art/crows';
import { Locusts } from '../src/art/locusts';
type Item = [string, JSX.Element, number, number, string?];
const box = (el: JSX.Element, vb = '-50 -100 110 110') => <svg viewBox={vb} class="scene-svg">{el}</svg>;
const acts: FarmerAction[] = ['idle', 'water', 'plant', 'fertilizer', 'mulch', 'care', 'harvest', 'build', 'paper', 'coin'];
const fx: FxKind[] = ['seed', 'water', 'fert', 'mulch', 'care', 'weed', 'harvest', 'coin', 'wither', 'shield', 'build'];
const only = (process.env.BOARD || 'farmer,fx').split(',');
const sections: Record<string, () => Item[]> = {
  rest: () => [['rest', box(<g id="f-rest"><Farmer walking={false} action="idle" rest /></g>, '-40 -96 80 100'), 260, 320], ['rest small', <svg viewBox="-60 -100 120 110" class="scene-svg" style="background:#7dbb4f"><g transform="scale(.8)"><Farmer walking={false} action="idle" rest /></g></svg>, 120, 110]],
  farmer: () => [['walk', box(<g id="f-walk"><Farmer walking action="idle" /></g>), 220, 220], ...acts.map((a) => [a, box(<g id={`f-${a}`}><Farmer walking={false} action={a} /></g>), 220, 220] as Item)],
  fx: () => fx.map((k) => [`fx ${k}`, <svg viewBox="0 0 100 100" class="scene-svg"><Bed moisture={2} />{k !== 'seed' && k !== 'wither' && <CropSprite id="cabbage" stage={2} />}<g class={`tile-fx fx-${k}`}><TileEffect kind={k} /></g></svg>, 150, 150] as Item),
  pets: () => (['sit', 'walk', 'sniff', 'nap', 'play'] as const).flatMap((p) => (['cat', 'dog'] as const).map((id) => [`${id} ${p}`, <svg viewBox="0 0 100 100"><g class="pet-friend"><Companion id={id} size={100} pose={p} /></g></svg>, 130, 130] as Item)),
  animals: () => (['stand', 'walk', 'act', 'look'] as const).flatMap((p) => (['geese', 'hedgehog', 'goat'] as const).map((id) => [`${id} ${p}`, <svg viewBox="0 0 100 100"><Animal id={id} size={100} pose={p} /></svg>, 130, 130] as Item)),
  bugs: () => [
    ...([0, 1, 2] as const).map((w) => [`crow w${w}`, <svg viewBox="-30 -30 72 36" class="scene-svg"><g class="flock on"><g class={`crow-walk w${w}`}><Crow /></g></g></svg>, 216, 108] as Item),
    ['crow fly', <svg viewBox="-30 -30 60 50"><g transform="translate(0 -4)"><CrowFlying /></g></svg>, 180, 150],
    ['crow morning', <svg viewBox="-30 -30 60 36" class="scene-svg"><g class="morning m-crows"><g class="m-cell"><Crow /></g></g></svg>, 180, 108],
    ['locusts', <svg viewBox="0 0 100 100" class="scene-svg"><Bed moisture={2} /><CropSprite id="wheat" stage={2} /><Locusts /></svg>, 200, 200]],
};
export const ANIM: Item[] = only.flatMap((k) => sections[k]?.() ?? []);
