// Испытания года: one announced ordeal a year from the third year on. Static definitions only;
// the rules live in game.ts (planTrial, trialMorning, the frost/drought steps of resolveWeek, settleTrial).
import type { LocationId } from './data';

export type TrialKind = 'frost' | 'locust' | 'drought';
export type TrialGrade = 0 | 1 | 2 | 3;

export interface TrialDef {
  kind: TrialKind;
  name: string;
  art: 'earlyfrost' | 'plague' | 'droughtyear';
  /** the omen in a sentence, shown on the announcement */
  omen: string;
  /** when, in words, before the exact week is known */
  window: string;
  /** what helps, in the order the player is most likely to reach for it */
  counters: { icon: string; text: string }[];
  cert: string;
}

export const TRIAL_FIRST_YEAR = 3;
/** below this many planted beds the farm sat the ordeal out rather than stood it */
export const TRIAL_MIN_BEDS = 4;
export const TRIAL_PASS = 0.85;
export const TRIAL_HOLD = 0.55;
export const TRIAL_GLORY: Record<TrialGrade, number> = { 0: 3, 1: 0, 2: 10, 3: 20 };
export const TRIAL_GRADE_NAME: Record<TrialGrade, string> = { 0: 'Переждали', 1: 'Потрепало', 2: 'Устояли', 3: 'Выстояли' };

export const TRIALS: Record<TrialKind, TrialDef> = {
  frost: {
    kind: 'frost', name: 'Чёрный заморозок', art: 'earlyfrost',
    omen: 'Старики говорят: в этом году мороз придёт раньше времени — одной ясной ночью, когда поле ещё полно урожая.',
    window: 'в конце лета или начале осени',
    counters: [
      { icon: 'fire', text: 'Разожгите костры в ночь заморозка: рядом с ними теплее' },
      { icon: 'shelter', text: 'Укрытия, мульча и теплицы защищают от холода' },
      { icon: 'frost', text: 'Сажайте холодостойкие культуры и сорта, например капусту, чеснок и рожь' },
      { icon: 'early', text: 'Соберите заранее то, что не спасти (карта «Ранний сбор»)' },
    ],
    cert: 'Победитель заморозков',
  },
  locust: {
    kind: 'locust', name: 'Великая саранча', art: 'plague',
    omen: 'С юга идёт туча саранчи. Она пройдёт по полю полосами, неделя за неделей, и съест всё, что не защищено.',
    window: 'в середине лета',
    counters: [
      { icon: 'fire', text: 'Разожгите дымовые костры: саранча не садится у огня' },
      { icon: 'guard', text: 'Охрана грядки под ударом стоит рабочий день' },
      { icon: 'greenhouse', text: 'Теплицы, чеснок по соседству и сорта против насекомых' },
      { icon: 'early', text: 'Соберите урожай или не сейте на полосе, куда идёт стая' },
    ],
    cert: 'Гроза саранчи',
  },
  drought: {
    kind: 'drought', name: 'Великая сушь', art: 'droughtyear',
    omen: 'Колодцы мелеют уже весной. Летом придёт сушь: несколько недель зноя, открытая земля сохнет за неделю, и одной сухой недели хватит, чтобы растение погибло.',
    window: 'в первой половине лета',
    counters: [
      { icon: 'drip', text: 'Капельные линии и мульча: под ними сушь не забирает лишнюю влагу' },
      { icon: 'sprinkler', text: 'Дождеватель и автоматика поливают сами' },
      { icon: 'drop', text: 'Засухоустойчивые сорта и подсолнечник' },
      { icon: 'water', text: 'Поливайте вручную и картами каждую неделю' },
    ],
    cert: 'Хозяин воды',
  },
};

/** which ordeals a region can face */
export const TRIAL_POOL: Record<LocationId, TrialKind[]> = {
  chernozem: ['frost', 'locust', 'drought'],
  kuban: ['locust', 'drought', 'frost'],
  altai: ['frost', 'locust'],
  rent: ['frost', 'locust', 'drought'],
};

/** the strength of the ordeal: 1 in the third year, 4 from the sixth; a home bought out lives on, and from the
 *  eighth year the ordeal grows again every other year up to 6 (v3 §9.1: «испытания года жёстче») */
export const trialPower = (year: number) => {
  const n = year - TRIAL_FIRST_YEAR + 1;
  return Math.max(1, n <= 4 ? n : Math.min(6, 4 + Math.floor((n - 4) / 2)));
};
export const trialFrostTemp = (power: number) => -4 - power;
export const trialWaves = (power: number) => (power >= 5 ? 4 : power >= 3 ? 3 : 2);
export const trialDroughtLen = (power: number) => (power >= 5 ? 5 : power >= 3 ? 4 : 3);

export function trialGrade(beds: number, saved: number): TrialGrade {
  if (beds < TRIAL_MIN_BEDS) return 0;
  if (saved >= TRIAL_PASS) return 3;
  if (saved >= TRIAL_HOLD) return 2;
  return 1;
}

// ---------- fires (костры) ----------
/** frost shield in degrees on the 2×2 around a lit fire, and on the beds touching that square */
export const FIRE_HEAT: [number, number][] = [[0, 0], [5, 2], [7, 3], [9, 4]];
export const FIRE_WOOD = [0, 3, 4, 5]; // ₽ per fire per night, year 1
export const firesAllowed = (level: number) => [0, 2, 4, 6][level] ?? 6;
export const fireCore = (x: number, y: number): [number, number][] => [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]];
export const fireRing = (x: number, y: number): [number, number][] => [
  [x - 1, y], [x - 1, y + 1], [x + 2, y], [x + 2, y + 1], [x, y - 1], [x + 1, y - 1], [x, y + 2], [x + 1, y + 2],
];
