// Знание культуры (docs/PROGRESSION-v3.md §8.1): every unit of a crop harvested on any farm of the profile, at home
// and on expeditions, counts towards knowing it. Knowledge opens the lab's work with that crop. Static rules only;
// the counting is in game.ts (harvestTile, cropKnow), the profile's sum in ui/persist (syncProfile, syncFarm).

/** units harvested for each level 1..5 */
export const KNOW_AT = [20, 60, 150, 300, 600];
/** level labels: shown after the crop's name in brackets, or after «знание»; 0 means the lab opens nothing of it yet */
export const KNOW_NAMES = ['не открыто', 'знаком', 'умеет', 'знаток', 'мастер', 'свой сорт'];
export const KNOW_SEED_SALE = 0.8;
export const KNOW_GLORY = 15;
const SALE_PCT = Math.round((1 - KNOW_SEED_SALE) * 100);
/** what a level opens, in words: it follows «Откроется:» in the crop book (index = level) */
export const KNOW_OPENS = ['', 'первое свойство', 'первая дополнительная клетка', `второе свойство и скидка ${SALE_PCT}% на семена этой культуры`, 'вторая дополнительная клетка', `третье свойство, третья клетка, грамота и +${KNOW_GLORY} славы`];
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
