// Посевная v4 — static game data. Numbers are starting values, not a calibrated balance.

// ---------- locations ----------
export type LocationId = 'chernozem' | 'kuban' | 'altai' | 'rent';
export const LOCATION_IDS: LocationId[] = ['chernozem', 'kuban', 'altai', 'rent'];
/** the regions an expedition goes to from the home farm (v3 §3.4) */
export type ExpeditionId = 'rent' | 'kuban' | 'altai';
export const EXPEDITION_IDS: ExpeditionId[] = ['rent', 'kuban', 'altai'];

export type Terrain = 'plain' | 'river' | 'sand' | 'rock' | 'forest' | 'swamp';
export const TERRAIN: Record<Terrain, { name: string; text: string; plantable: boolean; buyable: boolean }> = {
  plain: { name: 'Поле', text: '', plantable: true, buyable: true },
  river: { name: 'Река', text: 'К началу недели у грядок возле воды остаётся не меньше 1 влаги. Весной река может разлиться.', plantable: false, buyable: false },
  sand: { name: 'Песок', text: 'Прогревается на 2° сильнее. В засуху теряет на 1 влаги больше. Бахча и гречка на песке дают на треть больше.', plantable: true, buyable: true },
  rock: { name: 'Камни', text: 'Камни нужно расчистить: это стоит рабочий день и немного денег. Под ними хорошая почва, а сам камень идёт на фундамент и засчитывается как кирпич.', plantable: false, buyable: true },
  forest: { name: 'Тайга', text: 'Лес холодит соседние грядки на 2°. На заимке лес можно раскорчевать: под ним жирная лесная почва.', plantable: false, buyable: false },
  swamp: { name: 'Болото', text: 'На болоте растёт только клюква. Болото можно осушить: это стоит рабочий день и немного денег.', plantable: false, buyable: true },
};
const MAP_CODE: Record<string, Terrain> = { '.': 'plain', '~': 'river', s: 'sand', r: 'rock', f: 'forest', w: 'swamp' };
export const parseMap = (rows: string[]): Terrain[] => rows.join('').split('').map((ch) => MAP_CODE[ch] ?? 'plain');

export interface LocationDef {
  id: LocationId;
  name: string;
  place: string;
  tagline: string;
  text: string;
  unique: string[]; // what is special here, in short lines for the map
  /** 29.10 · the home's card in its later states: the mortgage is paid off, or the bank has the house under arrest */
  states?: Partial<Record<'owned' | 'arrest', Pick<LocationDef, 'tagline' | 'text' | 'unique'>>>;
  map: string[];
  soil: number; // starting soil life of the start plot
  seasons: [number, number, number, number]; // weeks: spring, summer, autumn, winter
  temp: { spring: [number, number]; summer: [number, number]; autumn: [number, number]; winter: [number, number] }; // °C, start→peak/end
  glory: number; // profile glory needed to open
  starter: string[]; // starter deck
  shop: CropId[]; // crops sold at the market from the start
  lab: CropId[]; // varieties the lab can breed here
  orgs: OrgId[];
  extra: TrackId[]; // workshop tracks only this location has
  mild?: boolean; rainy?: boolean; hot?: boolean;
  payMult: number;
}

// ---------- crops and products ----------
export type CropId =
  | 'radish' | 'bean' | 'potato' | 'buckwheat' | 'pumpkin' | 'wheat' | 'sunflower' | 'corn' | 'tomato'
  | 'carrot' | 'onion' | 'cabbage' | 'garlic' | 'rye' | 'strawberry' | 'watermelon' | 'rice' | 'seabuckthorn' | 'cranberry'
  | 'honey' | 'mushrooms';

export interface CropDef {
  id: CropId;
  name: string;
  gen: string; // «12 ед. пшеницы»
  seedCost: number; // ₽ per cell, year 1
  grow: number; // weeks of growth
  yield: number; // units per cell at soil life 2
  price: number; // ₽ per unit, year 1
  shape: [number, number][];
  minT: number; // the soil must be at least this warm for the plant to grow, °C
  maxT?: number; // above this the plant stops (bolts)
  frost: number; // an established plant dies when the air drops to this, °C
  flowering?: boolean; legume?: boolean; perishable?: number; greenhouseOnly?: boolean;
  winter?: boolean; // sown in autumn, sleeps through winter, ripens in spring
  perennial?: number; // fruits every year for this many years
  sidereal?: boolean; // can be ploughed in as green manure
  flood?: boolean; // needs a flooded bed (by a canal)
  swamp?: boolean; // grows only on a swamp
  sandBonus?: boolean;
  product?: boolean; // not sown: honey, mushrooms
  storable?: boolean; // grain and the like: mice nibble it in a barn without a cat
  note: string;
}

const c = (d: CropDef) => d;
export const CROPS: Record<CropId, CropDef> = {
  radish: c({ id: 'radish', name: 'Редис', gen: 'редиса', seedCost: 2, grow: 2, yield: 4, price: 3, shape: [[0, 0]], minT: 4, maxT: 27, frost: -4, note: 'Быстрая культура: растёт 2 недели при достаточной влаге и тепле. Любит прохладу, а в жару перестаёт расти.' }),
  bean: c({ id: 'bean', name: 'Фасоль', gen: 'фасоли', seedCost: 3, grow: 3, yield: 4, price: 4, shape: [[0, 0], [1, 0]], minT: 10, frost: 0, legume: true, note: 'После сбора повышает плодородие соседних грядок по сторонам на 1.' }),
  potato: c({ id: 'potato', name: 'Картофель', gen: 'картофеля', seedCost: 4, grow: 4, yield: 10, price: 2, shape: [[0, 0], [1, 0], [0, 1]], minT: 7, frost: -1, storable: true, note: 'Большой урожай. Ботва боится заморозка, а клубни — колорадского жука.' }),
  buckwheat: c({ id: 'buckwheat', name: 'Гречка', gen: 'гречки', seedCost: 4, grow: 3, yield: 5, price: 4, shape: [[0, 0], [1, 1]], minT: 10, frost: -1, flowering: true, storable: true, sandBonus: true, note: 'Медонос: рядом с ульем урожай ×1,5. Сажается по диагонали.' }),
  pumpkin: c({ id: 'pumpkin', name: 'Тыква', gen: 'тыквы', seedCost: 4, grow: 5, yield: 6, price: 4, shape: [[0, 0], [1, 0], [0, 1], [1, 1]], minT: 12, frost: 0, flowering: true, note: 'Занимает квадрат 2×2. Любит тепло. Осенью и зимой стоит дороже.' }),
  wheat: c({ id: 'wheat', name: 'Пшеница', gen: 'пшеницы', seedCost: 5, grow: 6, yield: 14, price: 2, shape: [[0, 0], [1, 0], [2, 0]], minT: 3, frost: -3, storable: true, note: 'Сажается линией из трёх клеток. Растёт уже при +3°. Пекарни берут охотно.' }),
  sunflower: c({ id: 'sunflower', name: 'Подсолнечник', gen: 'подсолнечника', seedCost: 5, grow: 6, yield: 7, price: 5, shape: [[1, 0], [0, 1], [1, 1], [2, 1]], minT: 8, frost: -2, flowering: true, storable: true, note: 'Засуха не сушит его грядку сильнее обычного, но без воды он погибнет. После сбора истощает почву на 1.' }),
  corn: c({ id: 'corn', name: 'Кукуруза', gen: 'кукурузы', seedCost: 5, grow: 5, yield: 9, price: 3, shape: [[0, 0], [1, 0], [1, 1], [2, 1]], minT: 10, frost: -1, note: '«Три сёстры»: рядом с фасолью и тыквой урожай всей посадки ×1,25.' }),
  tomato: c({ id: 'tomato', name: 'Томаты', gen: 'томатов', seedCost: 6, grow: 3, yield: 6, price: 5, shape: [[0, 0]], minT: 15, frost: 0, perishable: 1, greenhouseOnly: true, note: 'Растут только в теплице, при почве от +15°. Хранятся неделю.' }),
  carrot: c({ id: 'carrot', name: 'Морковь', gen: 'моркови', seedCost: 3, grow: 4, yield: 7, price: 3, shape: [[0, 0], [2, 0]], minT: 5, maxT: 30, frost: -4, note: 'Сажается через грядку. Рядом с луком урожай ×1,2, при этом считаются и диагональные соседи.' }),
  onion: c({ id: 'onion', name: 'Лук', gen: 'лука', seedCost: 2, grow: 4, yield: 5, price: 3, shape: [[0, 0]], minT: 3, frost: -4, note: 'Холодостойкий. Рядом с морковью урожай ×1,2.' }),
  cabbage: c({ id: 'cabbage', name: 'Капуста', gen: 'капусты', seedCost: 3, grow: 6, yield: 9, price: 2.5, shape: [[1, 0], [0, 1], [2, 1], [1, 2]], minT: 5, maxT: 28, frost: -6, note: 'Четыре кочана ромбом, середина остаётся свободной. Взрослая капуста погибает при −6° и ниже, а молодые всходы без укрытия — уже при −3°.' }),
  garlic: c({ id: 'garlic', name: 'Чеснок', gen: 'чеснока', seedCost: 4, grow: 6, yield: 5, price: 6, shape: [[0, 0], [1, 1], [2, 2]], minT: 0, frost: -30, winter: true, note: 'Можно сеять осенью для зимовки или в тёплый сезон. Защищает соседей от жука и саранчи до своего сбора.' }),
  rye: c({ id: 'rye', name: 'Озимая рожь', gen: 'ржи', seedCost: 3, grow: 7, yield: 9, price: 2, shape: [[0, 0], [0, 1], [0, 2]], minT: 1, frost: -30, winter: true, sidereal: true, storable: true, note: 'Озимая. После двух недель роста всю посадку можно запахать вместо сбора: плодородие +1. Зимой запахать нельзя.' }),
  strawberry: c({ id: 'strawberry', name: 'Клубника', gen: 'клубники', seedCost: 8, grow: 5, yield: 5, price: 7, shape: [[0, 0], [1, 0], [1, 1]], minT: 7, maxT: 30, frost: -30, perennial: 3, perishable: 1, note: 'Многолетняя: даёт до трёх урожаев, между ними отдыхает до весны. Ягода хранится неделю.' }),
  watermelon: c({ id: 'watermelon', name: 'Арбуз', gen: 'арбузов', seedCost: 5, grow: 6, yield: 9, price: 3, shape: [[0, 0], [1, 1], [2, 0]], minT: 15, frost: 0, sandBonus: true, note: 'Сажается галочкой. Нужна почва от +15°, на песке урожай ×1,4.' }),
  rice: c({ id: 'rice', name: 'Рис', gen: 'риса', seedCost: 4, grow: 5, yield: 12, price: 3, shape: [[0, 0], [1, 0]], minT: 14, frost: 0, flood: true, storable: true, note: 'Растёт при влаге 3 из 3, при влаге 1–2 ждёт, а без влаги засыхает. Канал с водой поддерживает рост.' }),
  seabuckthorn: c({ id: 'seabuckthorn', name: 'Облепиха', gen: 'облепихи', seedCost: 10, grow: 8, yield: 8, price: 8, shape: [[0, 0]], minT: 4, frost: -40, perennial: 4, note: 'Кустарник. Первый урожай даёт после 8 тёплых недель, повторные — через 10 тёплых недель после весеннего пробуждения. Всего четыре урожая.' }),
  cranberry: c({ id: 'cranberry', name: 'Клюква', gen: 'клюквы', seedCost: 6, grow: 6, yield: 4, price: 9, shape: [[0, 0], [1, 0]], minT: 4, frost: -30, swamp: true, perennial: 3, note: 'Растёт только на болоте и плодоносит несколько лет подряд.' }),
  honey: c({ id: 'honey', name: 'Мёд', gen: 'мёда', seedCost: 0, grow: 0, yield: 0, price: 9, shape: [[0, 0]], minT: 0, frost: -99, product: true, note: 'Летом его дают ульи третьего уровня рядом с растущими медоносами.' }),
  mushrooms: c({ id: 'mushrooms', name: 'Грибы', gen: 'грибов', seedCost: 0, grow: 0, yield: 0, price: 6, shape: [[0, 0]], minT: 0, frost: -99, product: true, perishable: 1, note: 'Собирают в лесу у заимки летом и осенью.' }),
};
export const CROP_IDS = Object.keys(CROPS) as CropId[];
export const SOWN_IDS = CROP_IDS.filter((c) => !CROPS[c].product);

// Seasonal demand: spring, summer, autumn, winter. Storable crops get dearer in winter.
export const SEASON_DEMAND: Record<CropId, [number, number, number, number]> = {
  radish: [1.25, 1, 0.85, 1.3], bean: [1.05, 1, 0.95, 1.15], potato: [1.2, 1.05, 0.85, 1.3], buckwheat: [1, 0.95, 1.12, 1.2],
  pumpkin: [0.9, 0.95, 1.25, 1.2], wheat: [1.15, 1, 0.85, 1.2], sunflower: [1.1, 1, 0.9, 1.15], corn: [1, 1.08, 0.92, 1.1],
  tomato: [1.3, 0.85, 1.1, 1.6], carrot: [1.2, 1, 0.9, 1.25], onion: [1.2, 1, 0.9, 1.2], cabbage: [1.15, 1, 0.9, 1.25],
  garlic: [1.1, 1, 1, 1.2], rye: [1.1, 1, 0.9, 1.1], strawberry: [1.4, 1, 1.2, 1.6], watermelon: [1.2, 1, 0.9, 1.1],
  rice: [1.05, 1, 0.95, 1.1], seabuckthorn: [1.1, 1.1, 1, 1.3], cranberry: [1.2, 1.1, 1, 1.3], honey: [1.1, 1, 1, 1.2], mushrooms: [1, 1, 1.1, 1.3],
};

// ---------- traits bred in the lab ----------
export type TraitId = 'fast' | 'drought' | 'cold' | 'yield' | 'tough';
export const TRAITS: Record<TraitId, { name: string; short: string; icon: string; text: string }> = {
  fast: { name: 'Скороспелость', short: 'скороспелый', icon: 'fast', text: 'Созревает на неделю раньше, но не быстрее чем за неделю.' },
  drought: { name: 'Засухоустойчивость', short: 'засухоустойчивый', icon: 'drop', text: 'Гибнет только после третьей сухой недели подряд. Засуха не сушит его грядку сильнее обычного.' },
  cold: { name: 'Холодостойкость', short: 'холодостойкий', icon: 'frost', text: 'Растёт при температуре на 4° ниже обычной и переносит заморозки на 4° сильнее.' },
  yield: { name: 'Урожайность', short: 'урожайный', icon: 'up', text: 'Каждая клетка даёт на 1 единицу урожая больше.' },
  tough: { name: 'Устойчивость к насекомым', short: 'против насекомых', icon: 'guard', text: 'Жук и саранча не повреждают посадку. От ворон нужна отдельная защита.' },
};
export const TRAIT_IDS = Object.keys(TRAITS) as TraitId[];

// ---------- cards ----------
export type CardKind = 'seed' | 'work';
export type TargetKind = 'none' | 'emptyTile' | 'tile' | 'cropTile' | 'row' | 'line' | 'block';
export interface CardDef { id: string; kind: CardKind; name: string; days: number; cost?: number; target: TargetKind; crop?: CropId; text: string; shop: number; winterOnly?: boolean; noWinter?: boolean }

const seedCard = (d: CropDef): CardDef => ({
  id: `seed_${d.id}`, kind: 'seed', name: d.name, days: 1, target: 'emptyTile', crop: d.id,
  text: d.note, shop: 3 + d.seedCost,
});
export const CARDS: Record<string, CardDef> = {
  ...Object.fromEntries(SOWN_IDS.map((id) => [`seed_${id}`, seedCard(CROPS[id])])),
  water: { id: 'water', kind: 'work', name: 'Полив', days: 1, target: 'tile', text: 'Выбранная грядка и грядки рядом по сторонам получают +2 влаги, но не больше 3.', shop: 5, noWinter: true },
  fertilizer: { id: 'fertilizer', kind: 'work', name: 'Подкормка', days: 1, cost: 5, target: 'cropTile', text: 'Базовый урожай посадки ×1,5. Каждую грядку можно подкормить один раз.', shop: 6, noWinter: true },
  mulch: { id: 'mulch', kind: 'work', name: 'Мульча', days: 1, cost: 2, target: 'tile', text: 'Крест из 5 грядок на 3 недели удерживает воду. В холод греет почву на 2°, в жару охлаждает на 3°.', shop: 6, noWinter: true },
  care: { id: 'care', kind: 'work', name: 'Уход', days: 1, target: 'row', text: 'Каждая растущая грядка в ряду даст на 1 единицу урожая больше.', shop: 7, noWinter: true },
  weeding: { id: 'weeding', kind: 'work', name: 'Прополка', days: 1, target: 'line', text: 'Убирает сорняки в ряду или столбце. Следующие 4 недели земля не зарастает.', shop: 4, noWinter: true },
  early: { id: 'early', kind: 'work', name: 'Ранний сбор', days: 1, target: 'cropTile', text: 'Собирает грядку раньше срока, начиная с половины роста. Урожай на 30% меньше.', shop: 5 },
  helpers: { id: 'helpers', kind: 'work', name: 'Помощь соседей', days: 0, target: 'none', text: 'Ещё один рабочий день на этой неделе.', shop: 8 },
  sidejob: { id: 'sidejob', kind: 'work', name: 'Подработка', days: 1, target: 'none', text: 'Приносит деньги за рабочий день. Сыграть можно один раз в неделю, а сумма с годами растёт.', shop: 4 },
  shelter: { id: 'shelter', kind: 'work', name: 'Укрытие', days: 1, cost: 2, target: 'block', text: 'Укрывает квадрат 2×2 на 3 недели. Защищает от града, греет почву на 5° и смягчает заморозок на 5°.', shop: 6 },
  compost: { id: 'compost', kind: 'work', name: 'Компост', days: 1, target: 'tile', text: 'Плодородие +1 у грядки и её соседей по сторонам, но не выше 5.', shop: 9 },
  bio: { id: 'bio', kind: 'work', name: 'Биопрепарат', days: 1, target: 'block', text: 'Плодородие +1 у квадрата 2×2, но не выше 5. Готовится в лаборатории.', shop: 0 },
  snow: { id: 'snow', kind: 'work', name: 'Снегозадержание', days: 1, target: 'row', text: 'Сыграть можно только зимой. Щиты в ряду копят снег, и весной этот ряд начнёт с полной влагой и плодородием +1.', shop: 4, winterOnly: true },
  forage: { id: 'forage', kind: 'work', name: 'Поход в лес', days: 1, target: 'none', text: 'Сыграть можно раз в неделю, летом и осенью. Приносит грибы из тайги, а если поле граничит с лесом, то больше.', shop: 5, noWinter: true },
};
export const isSeed = (def: string) => CARDS[def]?.kind === 'seed';

// ---------- building materials (progression v3 §4.2) ----------
export type MaterialId = 'logs' | 'bricks' | 'glass';
export const MATERIAL_IDS: MaterialId[] = ['logs', 'bricks', 'glass'];
export const MATERIALS: Record<MaterialId, { name: string; one: string; gen: string; short: string; price: number; lot: [number, number] }> = {
  logs: { name: 'Брёвна', one: 'бревно', gen: 'брёвен', short: 'Б', price: 2, lot: [8, 14] },
  bricks: { name: 'Кирпич', one: 'кирпич', gen: 'кирпича', short: 'К', price: 4, lot: [6, 10] },
  glass: { name: 'Стекло', one: 'стекло', gen: 'стекла', short: 'С', price: 7, lot: [3, 5] },
};
export type Mats = Partial<Record<MaterialId, number>>;

// ---------- workshop ----------
export type TrackId = 'house' | 'irrigation' | 'greenhouse' | 'apiary' | 'drone' | 'barn' | 'meteo' | 'machinery' | 'guard' | 'fires' | 'planning' | 'compost' | 'lab' | 'canal' | 'clearing';
export interface TrackLevel { name: string; cost: number; weeks: number; text: string; needHouse?: number; mat?: Mats }
/** equipment: bought ready-made at the season's fair (v3 §4.1), never built in the workshop */
export interface TrackDef { id: TrackId; name: string; icon: string; text: string; levels: TrackLevel[]; place?: 'tile' | 'row' | 'corner'; equipment?: boolean }
// levels[0] is level 1 (level 0 = nothing built)
export const TRACKS: Record<TrackId, TrackDef> = {
  house: {
    id: 'house', name: 'Дом', icon: 'house', text: 'От уровня дома зависят число кроватей для работников, размер колоды и число мест в бригаде.',
    levels: [
      { name: 'Изба', cost: 0, weeks: 0, text: '1 кровать. Колода до 14 карт. 3 рабочих дня в неделю, зимой 2.' },
      { name: 'Погреб', cost: 25, weeks: 4, mat: { logs: 6, bricks: 6 }, text: 'Колода до 16 карт. Скоропортящийся урожай хранится на неделю дольше.' },
      { name: 'Мастерская', cost: 50, weeks: 6, mat: { logs: 12, bricks: 6, glass: 2 }, text: '2 кровати. Колода до 18 карт. Ещё 1 рабочий день в неделю.' },
      { name: 'Светёлка', cost: 90, weeks: 8, mat: { logs: 14, bricks: 10, glass: 4 }, text: 'Колода до 20 карт. Бригада ведёт 2 стройки сразу. В работе может быть 4 заказа.' },
      { name: 'Усадьба', cost: 150, weeks: 10, mat: { logs: 18, bricks: 16, glass: 6 }, text: '3 кровати. Колода до 22 карт. Ещё 1 обмен карты в неделю.' },
      { name: 'Флигель', cost: 240, weeks: 12, mat: { logs: 24, bricks: 22, glass: 8 }, text: '4 кровати. Колода до 24 карт. Гостевая позволяет вести до 5 заказов сразу.' },
      { name: 'Подворье', cost: 360, weeks: 14, mat: { logs: 30, bricks: 30, glass: 12 }, text: '5 кроватей. Бригада ведёт 3 стройки сразу.' },
    ],
  },
  lab: {
    id: 'lab', name: 'Лаборатория', icon: 'flask', text: 'Селекция культур, новые сорта и препараты для почвы.',
    levels: [
      { name: 'Лаборатория', cost: 40, weeks: 6, mat: { logs: 6, bricks: 4, glass: 2 }, text: '1 проект одновременно. На карту можно добавить 1 клетку и 1 свойство.' },
      { name: 'Селекционный отдел', cost: 80, weeks: 8, mat: { logs: 8, bricks: 8, glass: 4 }, text: '2 проекта одновременно. На карту можно добавить до 2 клеток и 2 свойств.', needHouse: 3 },
      { name: 'Научный центр', cost: 140, weeks: 10, mat: { logs: 10, bricks: 12, glass: 8 }, text: 'Проекты идут на неделю быстрее. На карту можно добавить до 3 клеток и 3 свойств.', needHouse: 4 },
    ],
  },
  irrigation: {
    id: 'irrigation', name: 'Полив', icon: 'water', text: 'От ведра до автоматики.', place: 'row',
    levels: [
      { name: 'Бочка и шланг', cost: 20, weeks: 1, text: 'Ручной полив: можно выбрать до 3 соседних грядок в одной линии.' },
      { name: 'Капельный полив', cost: 45, weeks: 3, mat: { logs: 4 }, text: '2 капельные линии. Ряд с линией не сохнет от обычного испарения, но жара и засуха всё равно его сушат. Линии ставятся в режиме построек.' },
      { name: 'Дождеватель', cost: 90, weeks: 5, mat: { bricks: 6 }, text: 'Каждую неделю все грядки получают +1 влаги.', needHouse: 2 },
      { name: 'Автоматика', cost: 160, weeks: 6, mat: { bricks: 8, glass: 4 }, text: 'Всего 4 капельные линии. Засеянные грядки, где влаги меньше 2, каждую неделю сами получают +2 влаги.', needHouse: 3 },
    ],
  },
  greenhouse: {
    id: 'greenhouse', name: 'Теплица', icon: 'greenhouse', text: 'Защищает от града, вредителей и перегрева. Дождь не поливает.', place: 'tile',
    levels: [
      { name: 'Парник', cost: 25, weeks: 3, mat: { logs: 4, glass: 3 }, text: 'Можно поставить 1 теплицу. Почва внутри теплее на 8°, град и вредители не страшны.' },
      { name: 'Две теплицы', cost: 40, weeks: 4, mat: { logs: 4, glass: 4 }, text: 'Можно поставить 2 теплицы.' },
      { name: 'Отопление', cost: 80, weeks: 6, mat: { bricks: 6, glass: 2 }, text: 'Внутри не холоднее +18° даже зимой. Зимой каждая теплица обходится в 2 ₽ в неделю.', needHouse: 2 },
      { name: 'Тепличный комплекс', cost: 120, weeks: 8, mat: { logs: 8, bricks: 6, glass: 8 }, text: 'Можно поставить 3 теплицы. Урожай в них ×1,5.', needHouse: 3 },
    ],
  },
  apiary: {
    id: 'apiary', name: 'Пасека', icon: 'hive', text: 'Ульи опыляют цветущие культуры.', place: 'tile',
    levels: [
      { name: 'Улей', cost: 32, weeks: 1, text: '1 улей. Гречка рядом даёт урожай ×1,5, тыква и подсолнечник ×1,25.' },
      { name: 'Пасека', cost: 40, weeks: 2, mat: { logs: 6 }, text: 'Можно поставить 2 улья.' },
      { name: 'Медогонка', cost: 70, weeks: 4, mat: { logs: 4, glass: 2 }, text: 'Каждый улей даёт 2 единицы мёда за летнюю неделю, если рядом растёт медонос.' },
    ],
  },
  drone: {
    id: 'drone', name: 'Дрон', icon: 'drone', text: 'Разведка и защита с воздуха. Продаётся на ярмарке.', equipment: true,
    levels: [
      { name: 'Разведчик', cost: 25, weeks: 0, text: 'Набеги видны за 2 недели, а зона града — за неделю' },
      { name: 'Защитник', cost: 50, weeks: 0, text: '1 вылет за сезон против жука, саранчи или ворон' },
      { name: 'Опрыскиватель', cost: 100, weeks: 0, text: '2 вылета за сезон', needHouse: 3 },
    ],
  },
  barn: {
    id: 'barn', name: 'Амбар', icon: 'barn', text: 'Определяет, сколько урожая можно хранить.',
    levels: [
      { name: 'Пристройка', cost: 25, weeks: 2, mat: { logs: 8 }, text: 'Амбар вмещает 60 единиц.' },
      { name: 'Сусеки', cost: 45, weeks: 3, mat: { logs: 10, bricks: 4 }, text: 'Амбар вмещает 90 единиц. Мыши больше не грызут зерно.' },
      { name: 'Холодильник', cost: 90, weeks: 5, mat: { bricks: 6, glass: 4 }, text: 'Амбар вмещает 130 единиц. Скоропортящийся урожай хранится на 2 недели дольше.', needHouse: 2 },
      { name: 'Элеватор', cost: 150, weeks: 8, mat: { logs: 12, bricks: 16 }, text: 'Амбар вмещает 180 единиц.', needHouse: 3 },
    ],
  },
  meteo: {
    id: 'meteo', name: 'Метеостанция', icon: 'sensor', text: 'Определяет, насколько далеко вперёд видны погода и угрозы. Приборы продаются на ярмарке.', equipment: true,
    levels: [
      { name: 'Барометр', cost: 15, weeks: 0, text: 'Прогноз на 2 недели вперёд' },
      { name: 'Метеостанция', cost: 40, weeks: 0, text: 'Прогноз на 4 недели вперёд, видны рыночные события' },
      { name: 'Агрометеоцентр', cost: 80, weeks: 0, text: 'Погода и известные рыночные события на 6 недель вперёд. Случайные цены прибор не предсказывает', needHouse: 3 },
    ],
  },
  machinery: {
    id: 'machinery', name: 'Техника', icon: 'tractor', text: 'Машины экономят деньги и рабочие дни. Продаются на ярмарке.', equipment: true,
    levels: [
      { name: 'Сеялка', cost: 22, weeks: 0, text: 'Семена на треть дешевле' },
      { name: 'Трактор', cost: 45, weeks: 0, text: 'Первый посев каждой недели занимает на 1 день меньше' },
      { name: 'Комбайн', cost: 100, weeks: 0, text: 'Весь урожай на 10% больше, ранний сбор без потерь', needHouse: 3 },
    ],
  },
  guard: {
    id: 'guard', name: 'Охрана', icon: 'scarecrow', text: 'Пугала и сторожка.', place: 'corner',
    levels: [
      { name: 'Пугало', cost: 12, weeks: 1, text: '1 пугало защищает квадрат 2×2 от ворон.' },
      { name: 'Два пугала', cost: 22, weeks: 1, text: 'Можно поставить 2 пугала.' },
      { name: 'Сторожка', cost: 50, weeks: 4, mat: { logs: 10, bricks: 4 }, text: 'Воры не заходят на ферму, а одна стая ворон за лето улетает сама.' },
    ],
  },
  fires: {
    id: 'fires', name: 'Костры', icon: 'fire', text: 'Кострища на стыке четырёх грядок. В холодную ночь их разжигают: у огня теплее, а дым гонит саранчу.', place: 'corner',
    levels: [
      { name: 'Дымовые кучи', cost: 18, weeks: 1, text: '2 кострища. У огня теплее на 5°, рядом на 2°, а дым гонит саранчу.' },
      { name: 'Печки-буржуйки', cost: 40, weeks: 2, text: '4 печки. У огня теплее на 7°, рядом на 3°.' },
      { name: 'Тепловые пушки', cost: 90, weeks: 2, text: '6 пушек. У огня теплее на 9°, рядом на 4°. Разжигаются, не тратя рабочий день.', needHouse: 2 },
    ],
  },
  planning: {
    id: 'planning', name: 'Планёрка', icon: 'calendar', text: 'Несыгранные карты остаются в руке, а каждую неделю рука добирается до 7 карт. Планёрка помогает менять ненужные.',
    levels: [
      { name: 'Блокнот', cost: 30, weeks: 1, text: 'Обмен карты не тратит рабочий день.' },
      { name: 'Доска планов', cost: 50, weeks: 2, mat: { logs: 4 }, text: 'Два обмена карт в неделю.' },
      { name: 'Штаб', cost: 90, weeks: 5, mat: { logs: 6, bricks: 6, glass: 2 }, text: 'Видна следующая карта колоды. Ещё 1 рабочий день в неделю.', needHouse: 3 },
    ],
  },
  compost: {
    id: 'compost', name: 'Компостная яма', icon: 'soil', text: 'Готовый компост хранится здесь, пока вы его не заберёте.',
    levels: [
      { name: 'Яма', cost: 18, weeks: 1, text: 'Компост созревает за 3 недели. Готовую карту можно забрать, когда она понадобится.' },
      { name: 'Вермикомпост', cost: 35, weeks: 3, mat: { logs: 6 }, text: 'Компост созревает за 2 недели, а готовая порция ждёт в яме.' },
    ],
  },
  canal: {
    id: 'canal', name: 'Каналы', icon: 'flood', text: 'Арыки от реки заливают соседние грядки.', place: 'tile',
    levels: [
      { name: 'Арык', cost: 0, weeks: 0, text: 'Можно прокопать 2 клетки канала.' },
      { name: 'Оросительная сеть', cost: 35, weeks: 3, mat: { bricks: 6 }, text: 'Можно прокопать 4 клетки канала.' },
      { name: 'Шлюзы', cost: 80, weeks: 5, mat: { logs: 6, bricks: 10 }, text: 'Можно прокопать 7 клеток канала. Весенний паводок поле не заливает.', needHouse: 2 },
    ],
  },
  clearing: {
    id: 'clearing', name: 'Раскорчёвка', icon: 'axe', text: 'Инструменты и приёмы, чтобы отвоевать землю у тайги.',
    levels: [
      { name: 'Топор и пила', cost: 0, weeks: 0, text: 'Раскорчёвка клетки леса занимает 2 рабочих дня, стоит денег и даёт 4 бревна.' },
      { name: 'Бензопила', cost: 40, weeks: 2, text: 'Раскорчёвка занимает 1 рабочий день и стоит дешевле.' },
      { name: 'Тёплые грядки', cost: 70, weeks: 4, mat: { logs: 8, bricks: 4 }, text: 'Почва на раскорчёванной земле теплее на 3°.' },
    ],
  },
};
/** The house on an expedition is a camp (v3 §3.4): three levels, the same rules by level. */
export const CAMP: TrackDef = {
  id: 'house', name: 'Лагерь', icon: 'house', text: 'Здесь вместо дома лагерь. От его уровня зависят число кроватей, размер колоды и рабочие дни.',
  levels: [
    { name: 'Палатка', cost: 0, weeks: 0, text: '1 кровать. Колода до 14 карт. 3 рабочих дня в неделю, зимой 2.' },
    { name: 'Времянка', cost: 20, weeks: 3, mat: { logs: 8 }, text: 'Колода до 16 карт. Скоропортящийся урожай хранится на неделю дольше.' },
    { name: 'Полевой стан', cost: 45, weeks: 5, mat: { logs: 10, bricks: 6 }, text: '2 кровати. Колода до 18 карт. Ещё 1 рабочий день в неделю.' },
  ],
};
/** The equipment lines the fair sells (v3 §4.1). */
export const EQUIPMENT: TrackId[] = ['machinery', 'drone', 'meteo'];
/** Beds by house (or camp) level: workers are hired onto a free bed. */
export const HOUSE_BEDS = [1, 1, 2, 2, 3, 4, 5];
export const COMMON_TRACKS: TrackId[] = ['irrigation', 'greenhouse', 'apiary', 'drone', 'barn', 'meteo', 'machinery', 'guard', 'fires', 'planning', 'compost'];
export const BARN_CAP = [40, 60, 90, 130, 180];

// ---------- workers ----------
export type WorkerId = 'foreman' | 'agronomist' | 'irrigator' | 'beekeeper' | 'marketer' | 'mechanic' | 'breeder' | 'soilsci' | 'watchman' | 'greenhouser';
export interface WorkerDef { id: WorkerId; name: string; gender: 'm' | 'f'; title: string; price: number; salary: number; levels: [string, string, string]; portrait: string; color: string }
export const WORKERS: Record<WorkerId, WorkerDef> = {
  foreman: { id: 'foreman', name: 'Степан', gender: 'm', title: 'Бригадир', price: 18, salary: 2, portrait: 'foreman', color: '#d9822b', levels: ['Ещё 1 рабочий день в неделю.', 'Ещё 1 рабочий день и 1 обмен карты в неделю.', 'Ещё 2 рабочих дня и 1 обмен карты в неделю.'] },
  agronomist: { id: 'agronomist', name: 'Нина', gender: 'f', title: 'Агроном', price: 20, salary: 2, portrait: 'agronomist', color: '#7cae4a', levels: ['Каждая собранная грядка даёт на 1 единицу урожая больше.', 'Повторная посадка той же культуры не портит почву.', 'Каждая собранная грядка даёт на 2 единицы больше.'] },
  irrigator: { id: 'irrigator', name: 'Айдар', gender: 'm', title: 'Поливальщик', price: 22, salary: 1, portrait: 'irrigator', color: '#3f8fbf', levels: ['Полив захватывает весь ряд и столбец.', 'Засуха сушит землю на 1 влаги меньше.', 'Каждую неделю сам поливает 3 самые сухие посадки.'] },
  beekeeper: { id: 'beekeeper', name: 'Пётр', gender: 'm', title: 'Пчеловод', price: 22, salary: 1, portrait: 'beekeeper', color: '#e9c45c', levels: ['Улей действует на все 8 соседних грядок.', 'Мёда становится вдвое больше.', 'Бонус улья умножается ещё на 1,2.'] },
  marketer: { id: 'marketer', name: 'Ксения', gender: 'f', title: 'Продавец', price: 24, salary: 2, portrait: 'marketer', color: '#e0607a', levels: ['Цены на рынке выше на 10%.', 'Цены на рынке выше на 15%.', 'Цены на рынке выше на 20%, а награды за заказы на 10%.'] },
  mechanic: { id: 'mechanic', name: 'Руслан', gender: 'm', title: 'Механик', price: 28, salary: 2, portrait: 'mechanic', color: '#56616b', levels: ['Стройки идут на 15% быстрее.', 'Стройки обходятся на 15% дешевле.', 'В бригаде появляется ещё одно место.'] },
  breeder: { id: 'breeder', name: 'Мария', gender: 'f', title: 'Селекционер', price: 30, salary: 2, portrait: 'breeder', color: '#9fb86b', levels: ['Проекты лаборатории идут на неделю быстрее.', 'В лаборатории можно вести ещё один проект одновременно.', 'На карту можно добавить ещё одно свойство.'] },
  soilsci: { id: 'soilsci', name: 'Олег', gender: 'm', title: 'Почвовед', price: 26, salary: 1, portrait: 'soilsci', color: '#8c6a43', levels: ['Фасоль после сбора повышает плодородие соседних грядок на 2.', 'Компост и биопрепарат повышают плодородие на 2.', 'Подсолнечник больше не истощает почву.'] },
  watchman: { id: 'watchman', name: 'Михалыч', gender: 'm', title: 'Сторож', price: 16, salary: 1, portrait: 'logist', color: '#3a6b4a', levels: ['Воры обходят ферму стороной.', 'Отгоняет одну стаю ворон за лето.', 'Каждую неделю сам защищает до 2 грядок, которым грозит набег.'] },
  greenhouser: { id: 'greenhouser', name: 'Лиза', gender: 'f', title: 'Тепличница', price: 28, salary: 1, portrait: 'greenhouser', color: '#3fa37a', levels: ['Урожай в теплицах выше в 1,5 раза.', 'В теплицах теплее ещё на 4°.', 'Скоропортящийся урожай хранится на 2 недели дольше.'] },
};
export const WORKER_IDS = Object.keys(WORKERS) as WorkerId[];

// ---------- pets ----------
export type PetId = 'dog' | 'cat' | 'geese' | 'hedgehog' | 'goat';
export const PETS: Record<PetId, { name: string; kind: string; text: string }> = {
  dog: { name: 'Дружок', kind: 'Пёс', text: 'Сторожит поле: воры не лезут, стая ворон клюёт на одну грядку меньше.' },
  cat: { name: 'Барсик', kind: 'Кот', text: 'Ловит мышей: зерно в амбаре не пропадает.' },
  geese: { name: 'Га-Га', kind: 'Гуси', text: 'Каждую неделю выщипывают сорняки на одной грядке.' },
  hedgehog: { name: 'Фыр', kind: 'Ёжик', text: 'Ест вредителей: колорадский жук отнимает вдвое меньше.' },
  goat: { name: 'Маня', kind: 'Коза', text: 'Даёт молоко: приносит 3 ₽ каждую неделю, с годами больше.' },
};
export const PET_IDS = Object.keys(PETS) as PetId[];

// ---------- organisations and their quest chains ----------
export type OrgId =
  | 'orphanage' | 'council' | 'bakery' | 'restaurant' | 'college'
  | 'cannery' | 'ricemill' | 'stanitsa' | 'beekeepers'
  | 'camp' | 'forestry' | 'apiarists' | 'sanatorium'
  | 'teahouse' | 'school' | 'steward' | 'club';
export type Mischief = 'thieves' | 'fine' | 'silence' | 'review' | 'training';
export interface Reward { money?: number; pet?: PetId; cert?: string; seeds?: CropId; worker?: WorkerId; glory?: number; card?: string }
export interface StepDef { title: string; crops: CropId[]; qty: number; lines?: number; weeks: number; pay: number; reward?: Reward; text: string }
export interface OrgDef {
  id: OrgId; name: string; short: string; who: string; emblem: string; color: string;
  wants: CropId[]; // crops of repeat orders after the chain
  steps: StepDef[];
  perk: string; // what friendship (rel ≥ 25) gives
  mischief: Mischief; mischiefText: string;
}
export const ORGS: Record<OrgId, OrgDef> = {
  orphanage: {
    id: 'orphanage', name: 'Интернат «Солнышко»', short: 'Интернат', who: 'Воспитательница Ольга Петровна', emblem: 'sun', color: '#f4b942',
    wants: ['radish', 'carrot', 'potato', 'cabbage', 'strawberry', 'pumpkin'],
    steps: [
      { title: 'Витамины к обеду', crops: ['radish', 'carrot', 'onion'], qty: 6, weeks: 4, pay: 0.9, text: 'Ребятам не хватает свежих овощей. Поможете?' },
      { title: 'Овощи на месяц', crops: ['potato', 'cabbage'], qty: 14, weeks: 5, pay: 1, reward: { cert: 'Благодарность интерната' }, text: 'Столовая просит запас на месяц.' },
      { title: 'Экскурсия на ферму', crops: ['carrot', 'radish', 'pumpkin'], qty: 8, lines: 2, weeks: 5, pay: 1, reward: { pet: 'dog' }, text: 'Ребята хотят увидеть, где растёт еда, и привезут вам щенка из приюта.' },
      { title: 'Осенний утренник', crops: ['pumpkin', 'strawberry', 'potato', 'cabbage'], qty: 12, lines: 2, weeks: 6, pay: 1.2, reward: { cert: 'Шеф интерната «Солнышко»', glory: 20 }, text: 'Большой праздник — и вы почётный гость.' },
    ],
    perk: 'Ребята летом помогают, и у вас на 1 рабочий день в неделю больше',
    mischief: 'thieves', mischiefText: 'Голодные ребята лазают в огород и таскают урожай',
  },
  council: {
    id: 'council', name: 'Сельсовет', short: 'Сельсовет', who: 'Глава поселения Анна Сергеевна', emblem: 'flag', color: '#d0503c',
    wants: ['wheat', 'potato', 'cabbage', 'onion', 'pumpkin'],
    steps: [
      { title: 'Ярмарка выходного дня', crops: ['onion', 'carrot', 'radish', 'potato'], qty: 6, lines: 2, weeks: 4, pay: 1.1, text: 'Поселению нужна витрина: привезите два вида овощей.' },
      { title: 'Запас для ветеранов', crops: ['potato', 'cabbage', 'onion'], qty: 12, weeks: 5, pay: 1, reward: { cert: 'Почётная грамота сельсовета' }, text: 'Наборы для ветеранов к празднику.' },
      { title: 'Хлеб для района', crops: ['wheat', 'rye'], qty: 20, weeks: 6, pay: 1.1, reward: { money: 40 }, text: 'Районная мельница простаивает.' },
      { title: 'Районная выставка', crops: ['pumpkin', 'cabbage', 'tomato', 'watermelon'], qty: 10, lines: 3, weeks: 7, pay: 1.3, reward: { cert: 'Лучший садовод района', glory: 40 }, text: 'Покажите на выставке три разные культуры.' },
    ],
    perk: 'Земля на 30% дешевле',
    mischief: 'fine', mischiefText: 'Проверка из района штрафует за непорядок',
  },
  bakery: {
    id: 'bakery', name: 'Пекарня «Колосок»', short: 'Пекарня', who: 'Пекарь Тимофей', emblem: 'bread', color: '#c4982f',
    wants: ['wheat', 'buckwheat', 'rye', 'sunflower'],
    steps: [
      { title: 'Мука для батонов', crops: ['wheat'], qty: 12, weeks: 7, pay: 1.2, text: 'Свежее зерно — свежий хлеб.' },
      { title: 'Гречневые блины', crops: ['buckwheat'], qty: 8, weeks: 5, pay: 1.2, reward: { pet: 'cat' }, text: 'У нашей кошки котята — одного отдадим вам.' },
      { title: 'Хлеб на прилавок', crops: ['rye', 'wheat'], qty: 16, weeks: 8, pay: 1.2, reward: { money: 30 }, text: 'Нужен ржаной хлеб к Масленице.' },
      { title: 'Хлеб из вашей партии', crops: ['wheat', 'sunflower', 'buckwheat'], qty: 14, lines: 2, weeks: 7, pay: 1.3, reward: { cert: 'Поставщик пекарни «Колосок»', glory: 15 }, text: 'Хлеб с вашим именем на витрине.' },
    ],
    perk: '+10% к рыночной цене пшеницы, ржи и гречки',
    mischief: 'silence', mischiefText: 'Пекарня обиделась и не присылает заказов',
  },
  restaurant: {
    id: 'restaurant', name: 'Ресторан «Печь»', short: 'Ресторан', who: 'Шеф Арсений', emblem: 'chef', color: '#8a3a2a',
    wants: ['tomato', 'pumpkin', 'cabbage', 'garlic', 'strawberry', 'onion'],
    steps: [
      { title: 'Зелёный сезон', crops: ['radish', 'onion', 'carrot'], qty: 6, weeks: 3, pay: 1.5, text: 'Шефу нужна свежесть, и он хорошо платит.' },
      { title: 'Тыквенный суп', crops: ['pumpkin'], qty: 10, weeks: 7, pay: 1.4, reward: { seeds: 'strawberry' }, text: 'Шеф поделится саженцами клубники «Виктория».' },
      { title: 'Овощи на квашение', crops: ['cabbage', 'garlic'], qty: 10, weeks: 8, pay: 1.4, reward: { money: 40 }, text: 'Квашеная капуста с чесноком — хит сезона.' },
      { title: 'Ужин от фермера', crops: ['tomato', 'strawberry', 'pumpkin', 'garlic'], qty: 8, lines: 3, weeks: 8, pay: 1.6, reward: { cert: 'Поставщик ресторана «Печь»', glory: 20 }, text: 'Сет из ваших продуктов в меню.' },
    ],
    perk: '+15% к рыночной цене томатов, тыквы и клубники',
    mischief: 'review', mischiefText: 'Шеф оставил плохой отзыв, и рынок 3 недели платит на 10% меньше',
  },
  college: {
    id: 'college', name: 'Агроколледж', short: 'Колледж', who: 'Преподаватель Борис Ильич', emblem: 'cap', color: '#3f6fb0',
    wants: ['bean', 'buckwheat', 'corn', 'sunflower', 'garlic'],
    steps: [
      { title: 'Образцы для практикума', crops: ['bean', 'buckwheat', 'potato'], qty: 4, lines: 2, weeks: 5, pay: 1.2, text: 'Студентам нужны образцы двух культур.' },
      { title: 'Опытная делянка', crops: ['corn', 'sunflower', 'bean'], qty: 8, weeks: 7, pay: 1.2, reward: { worker: 'agronomist' }, text: 'Выпускница Нина ищет работу — возьмёте?' },
      { title: 'Семенной фонд', crops: ['garlic', 'rye', 'wheat'], qty: 10, weeks: 8, pay: 1.2, reward: { card: 'bio' }, text: 'Обменяемся семенами и препаратами.' },
      { title: 'Образцы для диплома', crops: ['corn', 'sunflower', 'buckwheat', 'bean'], qty: 8, lines: 3, weeks: 8, pay: 1.3, reward: { cert: 'Почётный наставник колледжа', glory: 20 }, text: 'Ваша ферма — тема дипломной работы.' },
    ],
    perk: 'Учёба работников на 30% дешевле',
    mischief: 'training', mischiefText: 'Колледж обиделся: учёба работников вдвое дороже',
  },
  // ---- Кубань
  cannery: {
    id: 'cannery', name: 'Консервный завод «Кубанские дары»', short: 'Консервный', who: 'Технолог Ирина', emblem: 'jar', color: '#c0392b',
    wants: ['tomato', 'pumpkin', 'corn', 'watermelon'],
    steps: [
      { title: 'Сладкая кукуруза', crops: ['corn'], qty: 14, weeks: 6, pay: 1.2, text: 'Линия консервации ждёт сырья.' },
      { title: 'Тыквенное пюре', crops: ['pumpkin'], qty: 14, weeks: 7, pay: 1.2, reward: { money: 50 }, text: 'Детское питание — серьёзный заказ.' },
      { title: 'Арбузный мёд', crops: ['watermelon'], qty: 16, weeks: 8, pay: 1.3, reward: { cert: 'Поставщик «Кубанских даров»', glory: 15 }, text: 'Нардек — кубанская классика.' },
      { title: 'Ассорти', crops: ['tomato', 'corn', 'pumpkin', 'watermelon'], qty: 12, lines: 3, weeks: 9, pay: 1.4, reward: { glory: 25, money: 80 }, text: 'Большой контракт на ассорти.' },
    ],
    perk: '+15% к рыночной цене тыквы и арбузов', mischief: 'silence', mischiefText: 'Завод пока работает с другим поставщиком',
  },
  ricemill: {
    id: 'ricemill', name: 'Рисовый комбинат', short: 'Рисовый', who: 'Мастер Георгий', emblem: 'rice', color: '#9aa05a',
    wants: ['rice', 'wheat'],
    steps: [
      { title: 'Первая партия риса', crops: ['rice'], qty: 10, weeks: 7, pay: 1.2, text: 'Посмотрим, какой рис даёт пойма.' },
      { title: 'Зерно для круп', crops: ['rice', 'wheat'], qty: 20, weeks: 8, pay: 1.2, reward: { pet: 'geese' }, text: 'Гуси с комбината — лучшие полольщики.' },
      { title: 'Большая партия риса', crops: ['rice'], qty: 24, weeks: 9, pay: 1.3, reward: { cert: 'Рисовод Кубани', glory: 20 }, text: 'Рис на экспорт.' },
      { title: 'Постоянные поставки', crops: ['rice', 'wheat'], qty: 30, weeks: 10, pay: 1.3, reward: { money: 120, glory: 20 }, text: 'Надёжный партнёр на годы.' },
    ],
    perk: '+10% к рыночной цене риса и пшеницы', mischief: 'silence', mischiefText: 'Комбинат пока не звонит',
  },
  stanitsa: {
    id: 'stanitsa', name: 'Станичный рынок', short: 'Станица', who: 'Атаман Иван Савельич', emblem: 'flag', color: '#2d6a8f',
    wants: ['watermelon', 'sunflower', 'onion', 'radish', 'tomato'],
    steps: [
      { title: 'Базарный день', crops: ['radish', 'onion', 'bean'], qty: 6, lines: 2, weeks: 4, pay: 1.1, text: 'Станица любит свежее.' },
      { title: 'Семечки к празднику', crops: ['sunflower'], qty: 12, weeks: 7, pay: 1.2, reward: { cert: 'Грамота станицы' }, text: 'Какой праздник без семечек.' },
      { title: 'Арбузная ярмарка', crops: ['watermelon'], qty: 14, weeks: 7, pay: 1.3, reward: { pet: 'goat', glory: 20 }, text: 'Собираем партию для ярмарки. Нужны арбузы — самые сладкие, к столу.' },
      { title: 'Казачья ярмарка', crops: ['watermelon', 'tomato', 'sunflower', 'onion'], qty: 10, lines: 3, weeks: 8, pay: 1.4, reward: { cert: 'Арбузный король Кубани', glory: 30 }, text: 'Главная ярмарка года.' },
    ],
    perk: 'Земля на 30% дешевле', mischief: 'fine', mischiefText: 'Станичный совет штрафует за самозахват воды',
  },
  beekeepers: {
    id: 'beekeepers', name: 'Хутор Медовый', short: 'Пасечники', who: 'Пасечник Захар', emblem: 'bee', color: '#e2a92b',
    wants: ['buckwheat', 'sunflower', 'honey'],
    steps: [
      { title: 'Цветущее поле', crops: ['buckwheat', 'sunflower'], qty: 8, weeks: 6, pay: 1.2, text: 'Пчёлам нужен взяток.' },
      { title: 'Мёд на пробу', crops: ['honey', 'buckwheat'], qty: 6, weeks: 8, pay: 1.3, reward: { pet: 'hedgehog' }, text: 'Ёжик с хутора спасёт от жука.' },
      { title: 'Подсолнечный мёд', crops: ['honey', 'sunflower'], qty: 12, weeks: 9, pay: 1.3, reward: { cert: 'Друг пчёл', glory: 20 }, text: 'Особый мёд.' },
      { title: 'Медовый спас', crops: ['honey', 'buckwheat', 'sunflower'], qty: 12, lines: 2, weeks: 10, pay: 1.4, reward: { money: 100, glory: 20 }, text: 'Праздник на хуторе.' },
    ],
    perk: '+20% к рыночной цене мёда', mischief: 'silence', mischiefText: 'Пасечники обиделись и не присылают заказов',
  },
  // ---- Алтай
  camp: {
    id: 'camp', name: 'Турбаза «Кедр»', short: 'Турбаза', who: 'Хозяйка Светлана', emblem: 'tent', color: '#3d7a4a',
    wants: ['mushrooms', 'potato', 'strawberry', 'honey', 'cabbage'],
    steps: [
      { title: 'Ужин туристам', crops: ['potato', 'cabbage', 'radish'], qty: 10, weeks: 5, pay: 1.2, text: 'Сезон начался, туристы голодные.' },
      { title: 'Грибная похлёбка', crops: ['mushrooms'], qty: 8, weeks: 6, pay: 1.3, reward: { cert: 'Друг турбазы «Кедр»' }, text: 'Фирменное блюдо — только из местных грибов.' },
      { title: 'Ягодный десерт', crops: ['strawberry', 'seabuckthorn', 'cranberry', 'honey'], qty: 6, weeks: 8, pay: 1.4, reward: { money: 60 }, text: 'Таёжный десерт.' },
      { title: 'Гастрофестиваль', crops: ['mushrooms', 'honey', 'potato', 'seabuckthorn'], qty: 10, lines: 3, weeks: 9, pay: 1.5, reward: { cert: 'Вкус Алтая', glory: 30 }, text: 'Фестиваль таёжной кухни.' },
    ],
    perk: '+15% к рыночной цене грибов и ягод', mischief: 'review', mischiefText: 'Хозяйка оставила плохой отзыв, и рынок 3 недели платит на 10% меньше',
  },
  forestry: {
    id: 'forestry', name: 'Лесхоз', short: 'Лесхоз', who: 'Лесничий Егор', emblem: 'tree', color: '#4a6b2f',
    wants: ['potato', 'cabbage', 'onion', 'rye'],
    steps: [
      { title: 'Обед лесорубам', crops: ['potato', 'onion'], qty: 10, weeks: 5, pay: 1.1, text: 'Бригада на делянке.' },
      { title: 'Урожай для питомника', crops: ['rye', 'bean', 'buckwheat'], qty: 10, weeks: 8, pay: 1.2, reward: { money: 40 }, text: 'Питомнику нужен ваш опыт с почвой.' },
      { title: 'Разрешение на расчистку', crops: ['cabbage', 'potato', 'carrot'], qty: 16, lines: 2, weeks: 7, pay: 1.1, reward: { cert: 'Разрешение лесхоза', glory: 10 }, text: 'Поможете — выдадим разрешение лесхоза и отметим вашу помощь.' },
      { title: 'Обед лесной бригаде', crops: ['seabuckthorn', 'rye', 'cabbage'], qty: 12, weeks: 9, pay: 1.3, reward: { cert: 'Хранитель тайги', glory: 25 }, text: 'Бригада восстанавливает лес. Привезите продукты для её кухни.' },
    ],
    perk: 'Раскорчёвка на 40% дешевле', mischief: 'fine', mischiefText: 'Штраф за вырубку без разрешения',
  },
  apiarists: {
    id: 'apiarists', name: 'Пасечное товарищество', short: 'Пасечники', who: 'Председатель Фёдор', emblem: 'bee', color: '#d99a1e',
    wants: ['buckwheat', 'honey', 'seabuckthorn'],
    steps: [
      { title: 'Гречишное поле', crops: ['buckwheat'], qty: 8, weeks: 6, pay: 1.2, text: 'Алтайский мёд начинается с гречки.' },
      { title: 'Продукты в обмен на облепиху', crops: ['buckwheat', 'potato'], qty: 12, weeks: 7, pay: 1.2, reward: { seeds: 'seabuckthorn' }, text: 'Поделимся саженцами облепихи.' },
      { title: 'Алтайский мёд', crops: ['honey'], qty: 12, weeks: 9, pay: 1.3, reward: { pet: 'goat', cert: 'Пасечник Алтая' }, text: 'Мёд на всероссийскую выставку.' },
      { title: 'Медовуха к празднику', crops: ['honey', 'seabuckthorn', 'buckwheat'], qty: 10, lines: 2, weeks: 10, pay: 1.4, reward: { money: 100, glory: 25 }, text: 'Большой праздник товарищества.' },
    ],
    perk: '+15% к рыночной цене мёда и гречки', mischief: 'silence', mischiefText: 'Товарищество обиделось и не присылает заказов',
  },
  sanatorium: {
    id: 'sanatorium', name: 'Санаторий «Сосны»', short: 'Санаторий', who: 'Главврач Лидия Андреевна', emblem: 'cross', color: '#5aa0a8',
    wants: ['cabbage', 'carrot', 'cranberry', 'seabuckthorn', 'honey'],
    steps: [
      { title: 'Диетическое меню', crops: ['carrot', 'cabbage', 'onion'], qty: 8, lines: 2, weeks: 5, pay: 1.2, text: 'Отдыхающим нужны овощи.' },
      { title: 'Овощи в обмен на клюкву', crops: ['cabbage', 'carrot'], qty: 12, weeks: 6, pay: 1.2, reward: { seeds: 'cranberry' }, text: 'Отдадим вам клюквенную рассаду для болотца.' },
      { title: 'Витаминный курс', crops: ['cranberry', 'seabuckthorn', 'honey'], qty: 8, weeks: 9, pay: 1.4, reward: { cert: 'Здоровье Алтая', glory: 15 }, text: 'Таёжные витамины.' },
      { title: 'Зимний запас', crops: ['cabbage', 'carrot', 'potato', 'cranberry'], qty: 14, lines: 3, weeks: 10, pay: 1.3, reward: { money: 120, glory: 25 }, text: 'Санаторий работает и зимой.' },
    ],
    perk: '+10% к рыночной цене клюквы, облепихи и капусты', mischief: 'review', mischiefText: 'Главврач пожаловалась в район, и рынок 3 недели платит на 10% меньше',
  },
  // ---- Заречье (Аренда у Пряхина): docs/CHARACTERS-v3.md §2
  teahouse: {
    id: 'teahouse', name: 'Чайная «Самовар»', short: 'Чайная', who: 'Хозяйка Варвара Кузьминична', emblem: 'samovar', color: '#c8553d',
    wants: ['potato', 'cabbage', 'onion', 'pumpkin', 'carrot'],
    steps: [
      { title: 'Пирожки для трассы', crops: ['potato', 'cabbage', 'onion'], qty: 10, weeks: 5, pay: 1.2, text: 'Голубчик, у меня фура к обеду, а начинка кончилась.' },
      { title: 'Борщ на сто тарелок', crops: ['cabbage', 'potato', 'carrot', 'onion'], qty: 14, lines: 2, weeks: 6, pay: 1.2, reward: { money: 40 }, text: 'Трасса голодная: ставлю самую большую кастрюлю.' },
      { title: 'Свадьба племянницы', crops: ['pumpkin', 'potato', 'cabbage', 'carrot'], qty: 12, lines: 3, weeks: 7, pay: 1.3, reward: { cert: 'Друг чайной «Самовар»', glory: 10 }, text: 'Гуляем всем селом — Пряхина тоже позвала, пусть видит.' },
      { title: 'Чайная в путеводителе', crops: ['potato', 'cabbage', 'onion', 'pumpkin'], qty: 16, lines: 3, weeks: 8, pay: 1.4, reward: { glory: 25, money: 60 }, text: 'Про нас напишут в путеводителе по трассе. На вывеске будет ваша ферма.' },
    ],
    perk: '+15% к рыночной цене картофеля и капусты', mischief: 'review', mischiefText: 'Хозяйка рассказала всей трассе, и рынок 3 недели платит на 10% меньше',
  },
  school: {
    id: 'school', name: 'Кружок юннатов', short: 'Юннаты', who: 'Учительница Нелли Марковна', emblem: 'book', color: '#4f8a5b',
    wants: ['bean', 'corn', 'sunflower', 'buckwheat', 'radish'],
    steps: [
      { title: 'Образцы для практикума', crops: ['bean', 'radish', 'carrot'], qty: 5, lines: 2, weeks: 4, pay: 1.2, text: 'Гипотеза: фасоль рядом с кукурузой даст больше. Начнём с образцов.' },
      { title: 'Опытная делянка', crops: ['bean', 'corn', 'sunflower'], qty: 8, weeks: 6, pay: 1.2, reward: { card: 'bio' }, text: 'Дети подписали каждую грядку. Поделимся школьным биопрепаратом.' },
      { title: 'Районная олимпиада', crops: ['sunflower', 'corn', 'buckwheat', 'bean'], qty: 10, lines: 2, weeks: 7, pay: 1.3, reward: { cert: 'Наставник юннатов', glory: 10 }, text: 'Нужен контрольный образец. То есть самый обычный. Не надо его хвалить.' },
      { title: 'Школьный сорт', crops: ['corn', 'sunflower', 'bean', 'pumpkin'], qty: 10, lines: 3, weeks: 8, pay: 1.3, reward: { glory: 25, money: 50 }, text: 'Выводим свой сорт вместе с вами. Название придумают дети.' },
    ],
    perk: 'Юннаты летом помогают, и у вас на 1 рабочий день в неделю больше', mischief: 'silence', mischiefText: 'Нелли Марковна увела кружок на другую ферму',
  },
  steward: {
    id: 'steward', name: 'Приказчик Лёва', short: 'Лёва', who: 'Приказчик Лёва Пряхин', emblem: 'abacus', color: '#5d6fa8',
    wants: ['wheat', 'buckwheat', 'rye', 'sunflower'],
    steps: [
      { title: 'Пробная партия', crops: ['wheat', 'buckwheat'], qty: 12, weeks: 6, pay: 1.15, text: 'Дядя сказал взять подешевле. Я записал среднюю цену.' },
      { title: 'Контракт на крупу', crops: ['buckwheat', 'wheat', 'rye'], qty: 18, weeks: 7, pay: 1.2, reward: { money: 40 }, text: 'Ровные крупные поставки — дядя такое уважает.' },
      { title: 'Тайная поставка', crops: ['wheat', 'sunflower', 'buckwheat'], qty: 16, lines: 2, weeks: 7, pay: 1.3, reward: { cert: 'Поставщик лавки Лёвы', glory: 10 }, text: 'Это для моей лавки в райцентре. Только дяде ни слова.' },
      { title: 'Открытие лавки', crops: ['wheat', 'buckwheat', 'potato', 'sunflower'], qty: 18, lines: 3, weeks: 9, pay: 1.4, reward: { glory: 25, money: 80 }, text: 'Лавка открывается. Дядя обещал прийти. Кажется.' },
    ],
    perk: 'Земля на 30% дешевле', mischief: 'fine', mischiefText: 'Дядя узнал о просрочке и выписал штраф по договору аренды',
  },
  club: {
    id: 'club', name: 'Сельский клуб', short: 'Клуб', who: 'Завклубом Роза Ахметовна', emblem: 'mask', color: '#b0477a',
    wants: ['pumpkin', 'sunflower', 'strawberry', 'tomato', 'cabbage'],
    steps: [
      { title: 'Осенний концерт', crops: ['sunflower', 'pumpkin'], qty: 6, weeks: 5, pay: 1.2, text: 'Без подсолнухов сцена — как без занавеса!' },
      { title: 'Спектакль «Репка»', crops: ['radish', 'carrot', 'potato'], qty: 8, lines: 2, weeks: 5, pay: 1.2, reward: { money: 30 }, text: 'Нужна настоящая репа. То есть редис! Зритель не заметит.' },
      { title: 'Вечёрка в клубе', crops: ['pumpkin', 'sunflower', 'strawberry', 'cabbage'], qty: 12, lines: 3, weeks: 7, pay: 1.3, reward: { cert: 'Душа праздника', glory: 15 }, text: 'Самая большая тыква. Самая! Это не каприз, это декорация.' },
      { title: 'Смотр с Пряхиным', crops: ['pumpkin', 'sunflower', 'tomato', 'strawberry'], qty: 12, lines: 3, weeks: 8, pay: 1.5, reward: { glory: 30, money: 60 }, text: 'Пряхин записался в жюри. Он всегда ставит четвёрки. Даже себе.' },
    ],
    perk: '+15% к рыночной цене тыквы и подсолнечника', mischief: 'silence', mischiefText: 'Клуб обиделся и вычеркнул вас из афиши',
  },
};
export const ORG_IDS = Object.keys(ORGS) as OrgId[];
// relationship tiers
export const REL_TIERS: { min: number; name: string; tone: 'bad' | 'cold' | 'ok' | 'good' | 'best' }[] = [
  { min: -100, name: 'Обида', tone: 'bad' },
  { min: -39, name: 'Холодно', tone: 'cold' },
  { min: 0, name: 'Нейтрально', tone: 'ok' },
  { min: 25, name: 'Дружба', tone: 'good' },
  { min: 60, name: 'Партнёрство', tone: 'best' },
];
export const relTier = (rel: number) => [...REL_TIERS].reverse().find((t) => rel >= t.min)!;

// ---------- ranks ----------
/** profile ranks by glory, and what each opens (29.10: every rank gives something) */
export const RANKS: { min: number; name: string; opens: string }[] = [
  { min: 0, name: 'Новичок', opens: 'родной дом и вылазка в Заречье' },
  { min: 40, name: 'Хозяин', opens: 'вылазка на Кубань' },
  { min: 120, name: 'Крепкий хозяин', opens: 'вылазка на Алтай' },
  { min: 250, name: 'Мастер урожая', opens: 'в обоз можно взять 4 карты' },
  { min: 450, name: 'Лучший садовод района', opens: 'вдвое больше денег с собой в обоз' },
  { min: 750, name: 'Гордость области', opens: 'высшее звание' },
];
/** where glory comes from, in a line */
export const GLORY_SOURCES = 'заказы и цепочки заказчиков, первые урожаи культур, каждый прожитый год, стройки дома, выкуп дома, дворы соседей и общие постройки, смотр и праздник урожая, испытания года, своё знание культур';
export const rankOf = (glory: number) => {
  let i = 0;
  for (let k = 0; k < RANKS.length; k++) if (glory >= RANKS[k].min) i = k;
  return { index: i, ...RANKS[i], next: RANKS[i + 1] ?? null };
};

// ---------- the three farms ----------
export const LOCATIONS: Record<LocationId, LocationDef> = {
  chernozem: {
    id: 'chernozem', name: 'Черноземье', place: 'Родной дом', tagline: 'Жирная земля, дом в залоге',
    text: 'Сейчас ваш родной дом находится в залоге у банка. Чтобы выкупить его, нужно погасить три осенних взноса. Но будьте осторожны: Пряхин из Заречья присматривал этот дом на торгах и следит за новым хозяином. Зато почва живая, а в деревне пять заказчиков и соседи, которым нужна помощь. Раз в сезон проходит ярмарка.',
    unique: ['Дом можно выкупить за три осени', 'Соседи, клуб и праздник урожая', 'Отсюда уходит обоз на вылазки'],
    states: {
      owned: {
        tagline: 'Жирная земля, свой дом',
        text: 'Дом выкуплен и теперь ваш. Остаётся только налог раз в год, в конце осени. Теперь дело за деревней: помогайте соседям, стройте вместе с ними клуб и обходите Пряхина на празднике урожая и в районе. Почва живая, в деревне пять заказчиков, раз в сезон проходит ярмарка, а отсюда уходит обоз на вылазки.',
        unique: ['Соседи, клуб и праздник урожая', 'Летопись хозяйства из семи вех', 'Отсюда уходит обоз на вылазки'],
      },
      arrest: {
        tagline: 'Жирная земля, дом под арестом',
        text: 'Банк взял дом под арест. Чтобы вернуть его, погасите долг на вылазках: хозяйство, которое вы там свернёте, сначала идёт в счёт долга. Если не успеете за отпущенные вылазки, дом купит Пряхин.',
        unique: ['Долг гасится на вылазках', 'Остаток после долга идёт в кассу дома', 'Если не успеть, дом достанется Пряхину'],
      },
    },
    map: ['......', '......', '......', '......', '......', '......'],
    soil: 3, seasons: [4, 12, 4, 3],
    temp: { spring: [6, 16], summer: [18, 27], autumn: [13, 3], winter: [-6, -12] },
    glory: 0, mild: true, payMult: 1.15,
    starter: ['seed_radish', 'seed_radish', 'seed_potato', 'seed_potato', 'seed_bean', 'seed_carrot', 'seed_onion', 'seed_cabbage', 'seed_wheat', 'water', 'water', 'fertilizer', 'mulch', 'shelter'],
    shop: ['radish', 'bean', 'potato', 'buckwheat', 'pumpkin', 'wheat', 'carrot', 'onion', 'cabbage'],
    lab: ['tomato', 'corn', 'sunflower', 'garlic', 'rye'],
    orgs: ['orphanage', 'council', 'bakery', 'restaurant', 'college'],
    extra: [],
  },
  kuban: {
    id: 'kuban', name: 'Кубанская пойма', place: 'Хутор у реки', tagline: 'Жара, река и арыки',
    text: 'Лето здесь длинное и жаркое. Без воды ничего не растёт, зато каналы от реки заливают рисовые грядки, а на песке зреют арбузы.',
    unique: ['Арыки от реки заливают грядки под рис', 'На песке бахча и гречка дают больше урожая', 'В жару редис и капуста перестают расти'],
    map: ['....~.', '....~.', '....~.', '....~~', 'ss...~', 'sss..~'],
    soil: 2, seasons: [3, 14, 4, 2],
    temp: { spring: [10, 19], summer: [20, 30], autumn: [17, 7], winter: [-1, -5] },
    glory: 40, hot: true, payMult: 1.23,
    starter: ['seed_radish', 'seed_bean', 'seed_corn', 'seed_sunflower', 'seed_watermelon', 'seed_rice', 'seed_pumpkin', 'seed_wheat', 'water', 'water', 'water', 'mulch', 'mulch', 'fertilizer'],
    shop: ['radish', 'bean', 'corn', 'sunflower', 'watermelon', 'rice', 'pumpkin', 'wheat', 'onion', 'buckwheat'],
    lab: ['tomato', 'garlic', 'potato', 'carrot'],
    orgs: ['cannery', 'ricemill', 'stanitsa', 'beekeepers'],
    extra: ['canal'],
  },
  altai: {
    id: 'altai', name: 'Алтайская заимка', place: 'Заимка в тайге', tagline: 'Холод, тайга и мёд',
    text: 'Лето здесь короткое, а зима долгая. Землю приходится отвоёвывать у тайги, а тепло беречь укрытиями и теплицами. Зато лес кормит грибами.',
    unique: ['Землю отвоёвывают у тайги, а не покупают', 'Грибы собирают в тайге летом и осенью', 'Облепиха, клюква и алтайский мёд'],
    map: ['~fffff', '~...rf', '~...ff', '~...wf', '~fwwff', '~fffff'],
    soil: 2, seasons: [4, 9, 3, 5],
    temp: { spring: [3, 13], summer: [15, 23], autumn: [9, 0], winter: [-10, -22] },
    glory: 120, rainy: true, payMult: 1.26,
    starter: ['seed_radish', 'seed_radish', 'seed_potato', 'seed_potato', 'seed_cabbage', 'seed_carrot', 'seed_onion', 'seed_buckwheat', 'seed_buckwheat', 'water', 'mulch', 'shelter', 'shelter', 'forage'],
    shop: ['radish', 'potato', 'cabbage', 'carrot', 'onion', 'buckwheat', 'wheat', 'bean'],
    lab: ['garlic', 'rye', 'strawberry', 'pumpkin'],
    orgs: ['camp', 'forestry', 'apiarists', 'sanatorium'],
    extra: ['clearing'],
  },
  rent: {
    id: 'rent', name: 'Заречье', place: 'Аренда у Пряхина', tagline: 'Чужая земля, своё село',
    text: 'Это полоса Аркадия Семёновича Пряхина за рекой. Климат здесь как дома, но земля чужая: платежи за аренду растут из года в год, хозяин обходит поле с тетрадкой, а заказы дают жители Заречья.',
    unique: ['Эта вылазка открыта всегда', 'Четыре заказчика из Заречья', 'Свёрнутое хозяйство отдаёт дому 70% вместо обычных 50%'],
    map: ['......', '......', '......', '......', '......', '~~~...'],
    soil: 3, seasons: [4, 12, 4, 3],
    temp: { spring: [6, 16], summer: [18, 27], autumn: [13, 3], winter: [-6, -12] },
    glory: 0, mild: true, payMult: 1.15,
    starter: ['seed_radish', 'seed_radish', 'seed_potato', 'seed_potato', 'seed_bean', 'seed_carrot', 'seed_onion', 'seed_cabbage', 'seed_wheat', 'water', 'water', 'fertilizer', 'mulch', 'shelter'],
    shop: ['radish', 'bean', 'potato', 'buckwheat', 'pumpkin', 'wheat', 'carrot', 'onion', 'cabbage'],
    lab: ['tomato', 'corn', 'sunflower', 'garlic', 'rye'],
    orgs: ['teahouse', 'school', 'steward', 'club'],
    extra: [],
  },
};

// where a rare crop from the profile's seed bank can be grown
export const SEED_BANK_OK: Partial<Record<CropId, LocationId[]>> = {
  strawberry: ['chernozem', 'kuban', 'altai', 'rent'],
  seabuckthorn: ['chernozem', 'altai', 'rent'],
  cranberry: ['altai'],
  watermelon: ['kuban', 'chernozem', 'rent'],
  rice: ['kuban'],
};

export const SEASON_NAMES = ['Весна', 'Лето', 'Осень', 'Зима'] as const;
export const SEASON_GEN = ['весны', 'лета', 'осени', 'зимы'] as const;
export const PAYMENT_NAMES = ['Аренда', 'Поставщики', 'Годовой платёж', ''] as const;
/** v3 §3.1–3.2 · the home farm: the third autumn payment buys it out; a bought-out home pays a yearly tax */
export const BUYOUT_YEARS = 3;
export const BUYOUT_NAME = 'Выкуп дома';
export const TAX_NAME = 'Налог';
export const BASE_PAYMENTS: [number, number, number] = [32, 62, 112];

export const RATINGS = ['D', 'C', 'B', 'A', 'AA', 'AAA'] as const;
export const RATING_RATE = [NaN, 0.05, 0.03, 0.02, 0.015, 0.01];
export const RATING_LIMIT = [0, 1, 1.5, 2, 2.5, 3];

export const GRID = 6;
export const HAND_BASE = 7;
export const DECK_LIMIT = [14, 16, 18, 20, 22, 24, 24];
export const DECK_MIN = 8;
