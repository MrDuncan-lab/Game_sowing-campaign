// Соседи (docs/PROGRESSION-v3.md §7): five yards of the home village that the farm helps to put back on their feet,
// three stages each, and four shared buildings once three yards stand. Static definitions only; the rules live in
// game.ts (yardProblem, the 'yard' / 'common' projects, yardSwap, yardHelp, forge, the hooks in workerSlots,
// workshopSlots, trackWeeks, openFair, sellMult, deliver and the week of heat).
import type { CropId, Mats, WorkerId } from './data';

export type YardId = 'zina' | 'savva' | 'efim' | 'miller' | 'karpov';
export const YARD_IDS: YardId[] = ['zina', 'savva', 'efim', 'miller', 'karpov'];
export type CommonId = 'bridge' | 'club' | 'hostel' | 'pump';
export const COMMON_IDS: CommonId[] = ['bridge', 'club', 'hostel', 'pump'];

/** crops a stage or a swap takes: one crop, or any of a group (grain: wheat, rye, buckwheat) */
export type CropNeed = { crops: CropId[]; qty: number; name: string };
export const GRAIN: CropId[] = ['wheat', 'rye', 'buckwheat'];
export const VEG: CropId[] = ['potato', 'cabbage', 'carrot', 'onion', 'radish', 'bean', 'pumpkin', 'tomato', 'garlic'];
const potato = (qty: number): CropNeed => ({ crops: ['potato'], qty, name: 'картофеля' });
const cabbage = (qty: number): CropNeed => ({ crops: ['cabbage'], qty, name: 'капусты' });
const wheat = (qty: number): CropNeed => ({ crops: ['wheat'], qty, name: 'пшеницы' });
const grain = (qty: number): CropNeed => ({ crops: GRAIN, qty, name: 'зерна' });

export interface YardStage {
  name: string;
  /** what the player is asked to do, as the neighbour card says it: «починить крылья мельницы» */
  task: string;
  /** what stands once it is done, in a line */
  text: string;
  /** rubles of the first year (× inflation) */
  cost: number;
  mat: Mats;
  crop?: CropNeed;
  weeks: number;
}
export interface YardSwap {
  /** what the neighbour takes */
  take: CropNeed;
  /** what the neighbour gives, in words (the rule is in game.ts) */
  give: string;
  /** the button */
  verb: string;
}
export interface YardDef {
  id: YardId;
  name: string;
  /** the person, for the portrait (art/portraits) */
  person: 'zina' | 'savva' | 'efim' | 'matvey' | 'karpova';
  who: string;
  /** «у кого»: the name in the genitive */
  gen: string;
  /** how the yard stands before the farm comes, then after each stage */
  looks: [string, string, string, string];
  stages: [YardStage, YardStage, YardStage];
  /** opens with the first stage; once a season unless said otherwise */
  swap: YardSwap;
  /** what the second stage and the third bring, in words */
  second: string;
  third: string;
  /** a line the neighbour says at each stage (0 = before anything is done) */
  lines: [string, string, string, string];
}

export const YARDS: Record<YardId, YardDef> = {
  zina: {
    id: 'zina', name: 'Зина', person: 'zina', who: 'соседка через забор', gen: 'Зины',
    looks: ['Изба покосилась, крыша течёт, печь дымит в избу.', 'Крыша из тёса новая, больше не течёт.', 'Печь переложена, в избе тепло.', 'У избы стоит теплица, в ней растут помидоры.'],
    stages: [
      { name: 'Новая крыша', task: 'починить крышу', text: 'крыша из тёса больше не течёт', cost: 15, mat: { logs: 8 }, crop: potato(10), weeks: 3 },
      { name: 'Печь', task: 'переложить печь', text: 'печь переложена кирпичом', cost: 30, mat: { bricks: 8 }, crop: cabbage(12), weeks: 4 },
      { name: 'Теплица', task: 'поставить теплицу', text: 'теплица у избы', cost: 50, mat: { logs: 6, glass: 4 }, weeks: 5 },
    ],
    swap: { take: { crops: VEG, qty: 8, name: 'овощей' }, give: 'карта работы на выбор (компост, мульча или укрытие)', verb: 'Меняться' },
    second: 'мена каждую неделю, а не раз в сезон',
    third: 'раз в год Зина сосватает работника (внук Миша знает всех в районе), а каждый сезон отдаёт 2 стекла от теплицы',
    lines: [
      'Крыша течёт, а мне на неё уже не залезть. Подсобите — я в долгу не останусь.',
      'Сухо! Первую ночь за три года спала, не подставляя таз.',
      'Печь греет, хлеб пеку. Несите овощи, а я отдам вам, что под руку попадётся: хоть компост, хоть мульчу.',
      'Теплица — как у вас! Миша приедет на лето, а стекло лишнее — ваше.',
    ],
  },
  savva: {
    id: 'savva', name: 'Кузнец Савва', person: 'savva', who: 'кузнец', gen: 'Саввы',
    looks: ['Кузня брошена, горн холодный, крыша провалилась.', 'Горн сложен, в кузне горит огонь.', 'Есть навес и мехи, Савва куёт с утра до ночи.', 'В инструментальной подмастерье при деле.'],
    stages: [
      { name: 'Кузнечный горн', task: 'сложить кузнечный горн', text: 'горн сложен заново', cost: 20, mat: { bricks: 10 }, weeks: 3 },
      { name: 'Навес и мехи', task: 'сделать навес и мехи', text: 'навес над наковальней, кожаные мехи', cost: 35, mat: { logs: 12, bricks: 4 }, crop: grain(20), weeks: 4 },
      { name: 'Инструментальная', task: 'построить мастерскую', text: 'кирпичная мастерская с окном', cost: 60, mat: { bricks: 10, glass: 6 }, weeks: 6 },
    ],
    swap: { take: { crops: GRAIN, qty: 10, name: 'зерна' }, give: '5 кирпичей со старой кузни', verb: 'Меняться' },
    second: 'оборудование на ярмарке дешевле на 15%, а следующий уровень любой линии Савва выкует сам за 4 недели, но на 30% дороже ярмарки',
    third: 'подмастерье Саввы просится в механики',
    lines: [
      'Горн остыл, когда жена уехала. Руки помнят, а сердце не лежит… Может, вдвоём раздуем.',
      'Огонь! Кузня без огня — просто сарай. Несите зерно, а я отдам кирпич со старой кладки.',
      'Мехи дышат. Что на ярмарке дорого — скую сам, дайте только срок.',
      'Мальчишка мой, подмастерье, руками всё чует. Возьмите его механиком — не пожалеете.',
    ],
  },
  efim: {
    id: 'efim', name: 'Плотник Ефим', person: 'efim', who: 'плотник', gen: 'Ефима',
    looks: ['Двор пустой, в бурьяне пни и верстак под открытым небом.', 'Построен сарай для инструмента.', 'Работает пилорама, брёвна лежат в штабелях.', 'В столярке делают резные наличники на продажу.'],
    stages: [
      { name: 'Сарай', task: 'построить сарай', text: 'сарай для инструмента', cost: 15, mat: { logs: 10 }, weeks: 3 },
      { name: 'Пилорама', task: 'поставить пилораму', text: 'пилорама и штабеля брёвен', cost: 40, mat: { logs: 12, bricks: 6 }, weeks: 5 },
      { name: 'Столярка', task: 'открыть столярку', text: 'столярная мастерская', cost: 70, mat: { logs: 16, bricks: 6, glass: 2 }, weeks: 6 },
    ],
    swap: { take: { crops: VEG, qty: 10, name: 'урожая' }, give: '4 бревна, а с пилорамой 6', verb: 'Меняться' },
    second: 'мена даёт уже 6 брёвен, а все стройки идут на 20% быстрее',
    third: 'Ефим со своими ребятами — это ещё одно место в бригаде',
    lines: [
      'Руки есть, топор есть, а крыши над верстаком нет. Дождь — и стою, курю.',
      'Сарай что надо. Принесёте урожая — отдам брёвна, лес мне отец оставил.',
      'Пилорама поёт! Ваши стройки теперь пойдут бойчее — я подсоблю.',
      'Столярка! Ребят набрал — берите нас бригадой, вдвое быстрее управимся.',
    ],
  },
  miller: {
    id: 'miller', name: 'Мельник Матвей', person: 'matvey', who: 'мельник', gen: 'Матвея',
    looks: ['Мельница на холме стоит без крыльев.', 'Крылья машут над холмом.', 'Жернова мелют муку.', 'В амбаре мельницы мука для всей деревни.'],
    stages: [
      { name: 'Крылья мельницы', task: 'починить крылья мельницы', text: 'новые крылья мельницы', cost: 20, mat: { logs: 12 }, weeks: 4 },
      { name: 'Жернова', task: 'поставить жернова', text: 'жернова и привод', cost: 40, mat: { bricks: 12 }, crop: wheat(20), weeks: 5 },
      { name: 'Амбар для муки', task: 'построить амбар для муки', text: 'амбар для муки', cost: 70, mat: { logs: 16, bricks: 8 }, weeks: 6 },
    ],
    swap: { take: { crops: GRAIN, qty: 10, name: 'зерна' }, give: 'Матвей смелет зерно в муку и заплатит на 40% дороже рынка', verb: 'Смолоть' },
    second: 'пшеница, рожь и гречка идут через мельницу и продаются на 25% дороже',
    third: 'пекарня и сельсовет платят за заказы с зерном на 30% больше, потому что им везут муку',
    lines: [
      'Сорок лет махала, а теперь стоит, как журавль без крыльев. Вот бы ещё раз услышать, как скрипит.',
      'Машет! Везите зерно — смелю, мука дороже зерна.',
      'Жернова вертятся. Всё ваше зерно пусть идёт через меня, не прогадаете.',
      'Амбар полон муки. Пекарня с сельсоветом теперь за ваше зерно платят как за муку.',
    ],
  },
  karpov: {
    id: 'karpov', name: 'Карповы', person: 'karpova', who: 'вдова Татьяна и четверо детей', gen: 'Карповых',
    looks: ['Живут бедно, забор повален, огород зарос.', 'Забор поднят, огород вскопан.', 'Есть пристройка, у детей своя комната.', 'Новый дом стоит на месте старого.'],
    stages: [
      { name: 'Забор и огород', task: 'поднять забор и вскопать огород', text: 'забор и огород', cost: 10, mat: { logs: 6 }, crop: potato(20), weeks: 2 },
      { name: 'Пристройка', task: 'сделать пристройку', text: 'пристройка к дому', cost: 35, mat: { logs: 12, bricks: 4 }, weeks: 4 },
      { name: 'Новый дом', task: 'построить новый дом', text: 'новый дом', cost: 80, mat: { logs: 20, bricks: 16, glass: 4 }, weeks: 8 },
    ],
    swap: { take: { crops: VEG, qty: 8, name: 'овощей' }, give: 'карта «Помощь соседей» в руку, дети помогут на поле', verb: 'Меняться' },
    second: 'в пристройке есть 2 кровати для ваших работников',
    third: 'каждый год старшие дети приводят вам в работники кого-нибудь из своих, любой профессии',
    lines: [
      'Справимся сами, не впервой… Хотя забор бы поднять — коза соседская весь огород съела.',
      'Огород вскопали, дети сами сажали. Принесите овощей — мои вам на поле подсобят.',
      'В пристройке тепло. Ваши работники могут у нас жить — места хватит.',
      'Новый дом… Я и не мечтала. Старшие выросли, хотят работать — у вас.',
    ],
  },
};

export interface CommonDef { id: CommonId; name: string; text: string; cost: number; mat: Mats; weeks: number; place: string }
/** the shared buildings of the village: built by the whole village (толока, −30% weeks) once three yards stand */
export const COMMONS: Record<CommonId, CommonDef> = {
  bridge: { id: 'bridge', name: 'Мост', text: 'на ярмарку приезжают из-за реки, и каждый сезон появляется ещё один лот', cost: 60, mat: { logs: 14, bricks: 6 }, weeks: 6, place: 'через овраг к большаку' },
  club: { id: 'club', name: 'Клуб', text: 'смотр урожая на площади становится праздником урожая в клубе, а за победу над Пряхиным дают грамоту и призовой лот', cost: 90, mat: { logs: 16, bricks: 10, glass: 4 }, weeks: 8, place: 'на пустыре у сельсовета' },
  hostel: { id: 'hostel', name: 'Общежитие', text: 'ещё 2 кровати для работников', cost: 80, mat: { logs: 14, bricks: 12, glass: 2 }, weeks: 8, place: 'у дороги' },
  pump: { id: 'pump', name: 'Водокачка', text: 'в жаркую неделю каждая грядка получает +1 влаги', cost: 70, mat: { logs: 8, bricks: 12 }, weeks: 6, place: 'на холме за деревней' },
};
/** how many yards must stand at the second stage before the village takes up shared buildings */
export const COMMONS_NEED = 3;
export const TOLOKA = 0.7;
export const YARD_GLORY = [10, 10, 20];
export const COMMON_GLORY = 10;
/** Savva's work in place of the fair: the price of the level ×1.3, ready in 4 weeks */
export const FORGE_MULT = 1.3;
export const FORGE_WEEKS = 4;
/** a candidate a yard sends: who sends, in a line */
export const YARD_CANDIDATE: Partial<Record<YardId, string>> = {
  zina: 'сосватала Зина',
  savva: 'подмастерье Саввы',
  karpov: 'старший сын Карповых привёл',
};
/** the profession the smith's apprentice asks for */
export const SAVVA_APPRENTICE: WorkerId = 'mechanic';
