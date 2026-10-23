// Seeing next week's trouble a week early, honestly: the engine itself is asked what the coming morning
// brings if the week ended now. Nothing is guessed and nothing is changed — `endWeek` works on a copy.
import { endWeek } from '../engine/game';
import type { GameState } from '../engine/game';

const scouting = new WeakMap<GameState, boolean>();

/** True in the week before an orphanage raid: if the player ended the week as things stand, the kids
 *  would come for the ripe beds next week. Shown as children loitering by the field. Anything the player
 *  does this week (harvesting, a delivered order) is taken into account, because the question is asked
 *  again for every new state. */
export function kidsScouting(s: GameState): boolean {
  const known = scouting.get(s);
  if (known !== undefined) return known;
  let v = false;
  try {
    const now = !!s.thieves && s.thieves.week === s.absWeek && !s.thieves.talked;
    if (s.phase === 'week' && !now) {
      const next = endWeek(s);
      v = !!next.thieves && next.thieves.week === next.absWeek && next.thieves.targets.length > 0;
    }
  } catch { v = false; }
  scouting.set(s, v);
  return v;
}
