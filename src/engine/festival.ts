// Поздняя игра дома (docs/PROGRESSION-v3.md §9.1): the harvest festival with Пряхин once the club stands, and the
// district rating — the villages round about and their strength. Static numbers only; the rules are in game.ts
// (festival at the first week of winter, the prize lot at the winter fair, districtTable).

/** the three judgings of the festival: the year's harvest, how many crops, the best bed */
export type FestCat = 'units' | 'kinds' | 'best';
export const FEST_CATS: FestCat[] = ['units', 'kinds', 'best'];
export const FEST_NAMES: Record<FestCat, string> = { units: 'Урожай года', kinds: 'Разнообразие', best: 'Лучшая грядка' };
export const FEST_UNITS: Record<FestCat, string> = { units: 'ед.', kinds: 'культур', best: 'ед. с грядки' };
/** Пряхин's showing in the k-th year of the farm (0 = the first): he grows for the first six years, club or no club,
 *  then holds at his best (an old man's peak: the late game is the farm's own fight with the ordeals). A judging is
 *  won by beating him outright: a tie is his. Calibrated 29.10 on the builder bot (tools/progression-sim.ts): he takes
 *  the first two winters, an ordinary growing farm overtakes him in years 3–6, and a club built late is still a fight
 *  the farm can win if its harvest keeps up. */
export const RIVAL_PEAK = 5;
export const rivalShow = (k: number): Record<FestCat, number> => {
  const y = Math.min(Math.max(0, k), RIVAL_PEAK);
  return { units: 320 + 45 * y, kinds: 6 + Math.floor(y / 2), best: Math.round(22 + 2.5 * y) };
};
/** glory for each judging won, and for winning two of three */
export const FEST_CAT_GLORY = 5;
export const FEST_WIN_GLORY = 15;
export const FEST_CERT = 'Победитель праздника урожая';
/** 29.10 · before the club there is a smaller show on the square every winter, with smaller rewards */
export const SMOTR_CAT_GLORY = 2;
export const SMOTR_WIN_GLORY = 5;
export const SMOTR_NAME = 'Смотр урожая';
export const FEST_NAME = 'Праздник урожая';
/** the farm's chronicle: seven milestones of the home (the last one — a haul from each region); all of them close it
 *  with an epilogue */
export type ChronicleId = 'owned' | 'house7' | 'yards' | 'club' | 'beat' | 'first' | 'trips';
export const CHRONICLE: { id: ChronicleId; name: string; hint: string }[] = [
  { id: 'owned', name: 'Дом выкуплен', hint: 'три осенних взноса по залогу' },
  { id: 'house7', name: 'Подворье', hint: 'дом 7-го уровня' },
  { id: 'yards', name: 'Деревня на ногах', hint: 'все пять дворов на второй стадии' },
  { id: 'club', name: 'Клуб в деревне', hint: 'общая постройка, толокой' },
  { id: 'beat', name: 'Пряхин обыгран', hint: 'победа на празднике урожая в клубе' },
  { id: 'first', name: 'Первые в районе', hint: 'первое место в районной сводке' },
  // 29.10 · the home and the expeditions are one game: the chronicle closes only with a haul from every region
  { id: 'trips', name: 'Три края', hint: 'обоз с добычей из Заречья, с Кубани и с Алтая' },
];
export const CHRONICLE_GLORY = 50;
export const CHRONICLE_CERT = 'Летопись хозяйства';
export const DISTRICT_FIRST_GLORY = 20;
export const DISTRICT_FIRST_CERT = 'Первые в районе';
/** the prize lot at the winter fair after a win: the next level of an equipment line at this share of its price */
export const FEST_PRIZE = 0.6;

/** the district: neighbouring villages and the strength of their farms, growing a little every year */
export interface DistrictVillage { name: string; base: number; growth: number; note: string }
export const DISTRICT: DistrictVillage[] = [
  { name: 'Подворье Пряхина', base: 60, growth: 16, note: 'Заречье, крепкий хозяин' },
  { name: 'Ольховка', base: 70, growth: 9, note: 'большое село, старый колхоз' },
  { name: 'Красный Яр', base: 45, growth: 11, note: 'молодые фермеры' },
  { name: 'Каменка', base: 35, growth: 8, note: 'карьер и три фермы' },
  { name: 'Берёзовка', base: 25, growth: 7, note: 'пасеки и сады' },
  { name: 'Сосновка', base: 15, growth: 5, note: 'три двора и школа' },
];
