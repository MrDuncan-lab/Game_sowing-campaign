// Знание культуры (docs/PROGRESSION-v3.md §8.1): every unit of a crop harvested on any farm of the profile, at home
// and on expeditions, counts towards knowing it. Knowledge opens the lab's work with that crop. Static rules only;
// the counting is in game.ts (harvestTile, cropKnow), the profile's sum in ui/persist (syncProfile, syncFarm).

/** units harvested for each level 1..5 */
export const KNOW_AT = [20, 60, 150, 300, 600];
export const KNOW_NAMES = ['не знаком', 'знаком', 'умеет', 'знаток', 'мастер', 'свой сорт'];
/** what a level opens, in words */
export const KNOW_OPENS = ['', '1-й признак', '1-я лишняя клетка', '2-й признак · семена −20%', '2-я лишняя клетка', '3-й признак и 3-я клетка · грамота и +15 славы'];
export const knowLevelOf = (units: number) => KNOW_AT.filter((t) => units >= t).length;
/** how many traits / extra cells the knowledge of a crop lets the lab give a card of it */
export const knowTraits = (level: number) => (level >= 5 ? 3 : level >= 3 ? 2 : level >= 1 ? 1 : 0);
export const knowCells = (level: number) => (level >= 5 ? 3 : level >= 4 ? 2 : level >= 2 ? 1 : 0);
/** the level a card's next trait / next cell needs */
export const traitNeeds = (k: number) => [1, 3, 5][k] ?? 6;
export const cellNeeds = (k: number) => [2, 4, 5][k] ?? 6;
/** a new variety in the lab needs this knowledge in this many different crops */
export const VARIETY_KNOW = 2;
export const VARIETY_CROPS = 3;
export const KNOW_SEED_SALE = 0.8;
export const KNOW_GLORY = 15;
