// Seeing next week's trouble early, honestly: the engine announces a raid of the orphanage children a week ahead
// (two with the scout drone) and keeps it in the farm state. Nothing is guessed here.
import type { GameState } from '../engine/game';

/** True while a raid is announced for a coming week: children are seen hiding by the field. Not shown in the
 *  raid week itself (then they are at the fence) or when nothing grows that they could come for. */
export function kidsScouting(s: GameState): boolean {
  if (s.phase !== 'week') return false;
  if (s.thieves && s.thieves.week === s.absWeek && !s.thieves.talked) return false;
  if (!(s.kidsWarn ?? []).some((w) => w > s.absWeek)) return false;
  return s.tiles.some((t) => t.owned && !!t.crop && !t.crop.rest);
}
/** Weeks until the announced raid (1 or 2), or 0. */
export function kidsAhead(s: GameState): number {
  const w = (s.kidsWarn ?? []).filter((x) => x > s.absWeek).sort((a, b) => a - b)[0];
  return w ? w - s.absWeek : 0;
}
