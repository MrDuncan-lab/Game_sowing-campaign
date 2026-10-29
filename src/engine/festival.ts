// Поздняя игра дома (docs/PROGRESSION-v3.md §9.1): the harvest festival with Пряхин once the club stands, and the
// district rating — the villages round about and their strength. Static numbers only; the rules are in game.ts
// (festival at the first week of winter, the prize lot at the winter fair, districtTable).

/** the three judgings of the festival: the year's harvest, how many crops, the best bed */
export type FestCat = 'units' | 'kinds' | 'best';
export const FEST_CATS: FestCat[] = ['units', 'kinds', 'best'];
export const FEST_NAMES: Record<FestCat, string> = { units: 'Урожай года', kinds: 'Разнообразие', best: 'Лучшая грядка' };
export const FEST_UNITS: Record<FestCat, string> = { units: 'ед.', kinds: 'культур', best: 'ед. с грядки' };
/** Пряхин's showing in the k-th year of the farm (0 = the first): he grows every year, club or no club */
export const rivalShow = (k: number): Record<FestCat, number> => ({
  units: Math.round(200 * (1 + 0.1 * k)),
  kinds: Math.min(10, 5 + Math.floor(k / 3)),
  best: Math.round(10 + 1.5 * k),
});
/** glory for each judging won, and for winning two of three */
export const FEST_CAT_GLORY = 5;
export const FEST_WIN_GLORY = 15;
export const FEST_CERT = 'Победитель праздника урожая';
/** 29.10 · before the club there is a smaller show on the square every winter, with smaller rewards */
export const SMOTR_CAT_GLORY = 2;
export const SMOTR_WIN_GLORY = 5;
export const SMOTR_NAME = 'Смотр на площади';
export const FEST_NAME = 'Праздник урожая';
/** the farm's chronicle: six milestones of the home; all of them close it with an epilogue */
export type ChronicleId = 'owned' | 'house7' | 'yards' | 'club' | 'beat' | 'first';
export const CHRONICLE: { id: ChronicleId; name: string; hint: string }[] = [
  { id: 'owned', name: 'Дом выкуплен', hint: 'три осенних взноса по залогу' },
  { id: 'house7', name: 'Подворье', hint: 'дом 7-го уровня' },
  { id: 'yards', name: 'Деревня на ногах', hint: 'все пять дворов на второй стадии' },
  { id: 'club', name: 'Клуб в деревне', hint: 'общая постройка, толокой' },
  { id: 'beat', name: 'Пряхин обыгран', hint: 'победа на празднике урожая в клубе' },
  { id: 'first', name: 'Первые в районе', hint: 'первое место в районной сводке' },
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
