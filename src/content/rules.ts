// The rule texts the interface shows, each in the same order: effect → where → price or time
// (style review №24; audit B-07, B-14). The engine's data keeps its own strings untouched; where a
// string there promises more or less than the engine does, the player reads the wording below.
import { CROP_IDS, CROPS, SEASON_NAMES, TRACKS } from '../engine/data';
import type { TrackId } from '../engine/data';
import type { GameState } from '../engine/game';
import { seasonLen, weekInfo } from '../engine/game';

const names = (pick: (c: (typeof CROPS)[keyof typeof CROPS]) => boolean | undefined) =>
  CROP_IDS.filter((c) => pick(CROPS[c])).map((c) => CROPS[c].name.toLowerCase()).join(', ');
/** crops that spoil (tomatoes, strawberries, mushrooms) and crops mice eat (grain, potatoes, rice…) */
export const PERISHABLE = names((c) => !!c.perishable);
export const STORABLE = names((c) => c.storable);

const LEVEL: Partial<Record<TrackId, Record<number, string>>> = {
  irrigation: {
    // B-07: a line keeps the water a bed already has; it does not add any
    // PSV-023: it cancels the ordinary weekly drying only — heat and drought still take their share
    1: '2 капельные линии. Линия отменяет обычное недельное высыхание в своём ряду; жара и засуха всё равно сушат грядки. Сама не поливает — сухие сначала полейте. Ставятся в режиме построек',
    3: '4 капельные линии; засеянные грядки с влагой меньше 2 каждую неделю сами получают +2',
  },
  house: {
    // B-14б: the cellar keeps every perishable crop a week longer, not only tomatoes
    1: `колода до 16 · скоропорт (${PERISHABLE}) хранится на неделю дольше`,
  },
  apiary: {
    // PSV-021: like a moved greenhouse, a hive pollinates from the week after it was set down
    0: '1 улей: гречка рядом ×1,5, тыква и подсолнечник ×1,25. Опыляет со следующей недели после установки или переноса',
  },
  barn: {
    // B-14в: mice take every storable crop, potatoes included
    1: `амбар на 90 ед.; мыши больше не трогают запасы (${STORABLE})`,
    2: `амбар на 130 ед.; скоропорт (${PERISHABLE}) хранится на 2 недели дольше`,
  },
};
/** The text of level `i` (0-based) of a track, as the player should read it. */
export function levelText(track: TrackId, i: number): string {
  return LEVEL[track]?.[i] ?? TRACKS[track].levels[i]?.text ?? '';
}

/** A concrete calendar date for a week number, in the top bar's own form: «весна · 4/4». */
export function weekDate(s: GameState, absWeek: number): string {
  const i = weekInfo(s, Math.max(0, absWeek - s.absWeek));
  return `${SEASON_NAMES[i.season].toLowerCase()} · ${i.weekInSeason}/${seasonLen(s, i.season)}`;
}
