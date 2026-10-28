// Поздняя игра дома (docs/PROGRESSION-v3.md §9.1): the harvest festival with Пряхин once the club stands, and the
// district rating — the villages round about and their strength. Static numbers only; the rules are in game.ts
// (festival at the first week of winter, the prize lot at the winter fair, districtTable).

/** the three judgings of the festival: the year's harvest, how many crops, the best bed */
export type FestCat = 'units' | 'kinds' | 'best';
export const FEST_CATS: FestCat[] = ['units', 'kinds', 'best'];
export const FEST_NAMES: Record<FestCat, string> = { units: 'Урожай года', kinds: 'Разнообразие', best: 'Лучшая грядка' };
export const FEST_UNITS: Record<FestCat, string> = { units: 'ед.', kinds: 'культур', best: 'ед. с грядки' };
/** Пряхин's showing at his k-th festival (0 = the first): he grows every year */
export const rivalShow = (k: number): Record<FestCat, number> => ({
  units: Math.round(220 * (1 + 0.15 * k)),
  kinds: Math.min(12, 5 + Math.floor(k / 2)),
  best: 10 + 2 * k,
});
/** glory for each judging won, and for winning two of three */
export const FEST_CAT_GLORY = 5;
export const FEST_WIN_GLORY = 15;
export const FEST_CERT = 'Победитель праздника урожая';
/** the prize lot at the winter fair after a win: the next level of an equipment line at this share of its price */
export const FEST_PRIZE = 0.6;

/** the district: neighbouring villages and the strength of their farms, growing a little every year */
export interface DistrictVillage { name: string; base: number; growth: number; note: string }
export const DISTRICT: DistrictVillage[] = [
  { name: 'Подворье Пряхина', base: 60, growth: 16, note: 'скупает всё на ярмарке' },
  { name: 'Ольховка', base: 70, growth: 9, note: 'большое село, старый колхоз' },
  { name: 'Красный Яр', base: 45, growth: 11, note: 'молодые фермеры' },
  { name: 'Заречье', base: 35, growth: 8, note: 'сдают землю в аренду' },
  { name: 'Берёзовка', base: 25, growth: 7, note: 'пасеки и сады' },
  { name: 'Сосновка', base: 15, growth: 5, note: 'три двора и школа' },
];
