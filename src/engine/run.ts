// The roguelite of expeditions (docs/PROGRESSION-v3.md §3.4, docs/CHARACTERS-v3.md §5): the plot's condition chosen
// at departure, finds that last one run, visitors at the camp, the new hazards of a region and what a folded farm
// brings home. Static data and pure functions only: the engine (game.ts) and the meta layer (meta.ts) use them.
import type { CropId, ExpeditionId, LocationId, Mats, Terrain, WorkerId } from './data';
import { GRID } from './data';
import { hashSeed, rand, randInt, shuffle } from './rng';

// ---------- conditions of the plot: one of three, picked at departure ----------
export type CondId =
  | 'floodplain' | 'spit' | 'aryks' | 'lgota' | 'melons'
  | 'burn' | 'cedar' | 'banya' | 'spring' | 'oldhives'
  | 'strip' | 'road' | 'school' | 'widow';
export interface CondDef { id: CondId; loc: ExpeditionId; name: string; plus: string; minus: string }
export const CONDITIONS: Record<CondId, CondDef> = {
  floodplain: { id: 'floodplain', loc: 'kuban', name: 'Пойма у самой воды', plus: 'река вплотную к участку, плодородие почвы 3 из 5', minus: 'паводок дважды в год' },
  spit: { id: 'spit', loc: 'kuban', name: 'Песчаная коса', plus: 'на песке бахча и гречка дают примерно на треть больше', minus: 'суховей дважды за лето' },
  aryks: { id: 'aryks', loc: 'kuban', name: 'Старые арыки', plus: 'оросительная сеть уже прокопана (4 клетки канала)', minus: 'участок завален камнями' },
  lgota: { id: 'lgota', loc: 'kuban', name: 'Льгота от станицы', plus: 'все платежи на 15% меньше', minus: 'станица встречает холодно' },
  melons: { id: 'melons', loc: 'kuban', name: 'Бахча по соседству', plus: 'две карты «сахарного» арбуза со свойством «урожайный»', minus: 'кабаны приходят дважды в год' },
  burn: { id: 'burn', loc: 'altai', name: 'Гарь', plus: 'лес вокруг выгорел, землю можно покупать без раскорчёвки, а плодородие почвы 3 из 5', minus: 'меньше грибов и брёвен' },
  cedar: { id: 'cedar', loc: 'altai', name: 'Кедровник', plus: 'походы за грибами вдвое богаче', minus: 'медведь приходит дважды в год' },
  banya: { id: 'banya', loc: 'altai', name: 'Заимка с баней', plus: 'времянка уже стоит', minus: 'платежи на 10% больше' },
  spring: { id: 'spring', loc: 'altai', name: 'У ключа', plus: 'в засуху земля не сохнет сильнее обычного', minus: 'у воды холоднее, заморозки на 2° злее' },
  oldhives: { id: 'oldhives', loc: 'altai', name: 'Брошенная пасека', plus: 'улей уже есть', minus: 'медведь знает дорогу и приходит дважды в год, первым делом к ульям' },
  strip: { id: 'strip', loc: 'rent', name: 'Пряхинская полоса', plus: 'аренда на 10% меньше', minus: 'Пряхин приходит с проверкой и за сорняки поднимает аренду' },
  road: { id: 'road', loc: 'rent', name: 'У трассы', plus: 'чайная платит на 20% больше', minus: 'от дорожной пыли нижний ряд участка летом сохнет быстрее' },
  school: { id: 'school', loc: 'rent', name: 'Земля при школе', plus: 'юннаты сразу дружат с вами, а летом прибавляется 1 рабочий день', minus: 'аренда на 10% больше' },
  widow: { id: 'widow', loc: 'rent', name: 'Огород вдовы', plus: 'плодородие почвы 4 из 5, лучшее в Заречье', minus: 'участок зарос сорняками и порослью' },
};
export const REGION_CONDS: Record<ExpeditionId, CondId[]> = {
  kuban: ['floodplain', 'spit', 'aryks', 'lgota', 'melons'],
  altai: ['burn', 'cedar', 'banya', 'spring', 'oldhives'],
  rent: ['strip', 'road', 'school', 'widow'],
};
/** payments on the plot: the condition's discount or surcharge */
export const COND_PAY: Partial<Record<CondId, number>> = { lgota: 0.85, banya: 1.1, strip: 0.9, school: 1.1 };

// ---------- finds: they last one run ----------
export type RelicId = 'axe' | 'laika' | 'rattle' | 'oldmap' | 'notebook' | 'bead' | 'accordion' | 'vane' | 'seedbag' | 'kettle' | 'burka' | 'receipt';
export interface RelicDef { id: RelicId; name: string; text: string; icon: string }
export const RELICS: Record<RelicId, RelicDef> = {
  axe: { id: 'axe', name: 'Дедов топор', text: 'дерево корчуется за 2 дня, а тайга на день быстрее', icon: 'axe' },
  laika: { id: 'laika', name: 'Лайка Пурга', text: 'раз в сезон отгоняет медведя или кабанов', icon: 'dog' },
  rattle: { id: 'rattle', name: 'Трещотка', text: 'ночной караул у грядок бесплатный', icon: 'shield' },
  oldmap: { id: 'oldmap', name: 'Старая карта', text: 'грибов вдвое больше, а камни убираются бесплатно', icon: 'map' },
  notebook: { id: 'notebook', name: 'Бабкина тетрадь засолок', text: 'скоропорт хранится на 2 недели дольше', icon: 'jar' },
  bead: { id: 'bead', name: 'Скифская бусина', text: '+2 славы за каждый сданный заказ', icon: 'star' },
  accordion: { id: 'accordion', name: 'Гармонь', text: '+1 рабочий день в первую неделю сезона', icon: 'note' },
  vane: { id: 'vane', name: 'Самодельный флюгер', text: 'набеги и пожары видны на неделю раньше', icon: 'wind' },
  seedbag: { id: 'seedbag', name: 'Мешок отборных семян', text: 'семена на 20% дешевле', icon: 'seed' },
  kettle: { id: 'kettle', name: 'Медный котелок', text: 'подработка платит вдвое', icon: 'coin' },
  burka: { id: 'burka', name: 'Бурка', text: 'заморозки на 1° мягче', icon: 'frost' },
  receipt: { id: 'receipt', name: 'Пряхинская расписка', text: 'следующий платёж на четверть меньше, один раз', icon: 'contract' },
};
export const RELIC_IDS = Object.keys(RELICS) as RelicId[];
// finds that only come from a visitor, never with the plot
const VISIT_ONLY: RelicId[] = ['laika', 'oldmap', 'bead'];

// ---------- visitors at the camp ----------
/** the visitor's portrait id (src/art/portraits.tsx VisitorPersonId) */
export type VisitorPortrait = 'pryakhin' | 'dasha' | 'yakov' | 'petro' | 'gordey' | 'afanasich' | 'alla' | 'nikolay' | 'kostya' | 'grisha' | 'nyura';
export type VisitId = 'archaeologists' | 'shepherd' | 'melonman' | 'patrol' | 'hunter' | 'geologist' | 'firefamily' | 'pinecones' | 'peddler' | 'postwoman' | 'inspection';
export interface VisitChoice { label: string; note: string }
export interface VisitDef { id: VisitId; where: ExpeditionId[]; who: string; name: string; portrait: VisitorPortrait; text: string; choices: VisitChoice[]; once: boolean; gone: string }
export const VISITS: Record<VisitId, VisitDef> = {
  archaeologists: {
    id: 'archaeologists', gone: 'Археологи не дождались ответа и ушли копать к соседям.', where: ['kuban'], who: 'Даша и профессор Семён Ильич', name: 'Студенты-археологи', portrait: 'dasha', once: true,
    text: 'Даша раскопала курган у соседей и уверена, что следующий — под вашим полем. «Можно шурф на одной грядке? Три недели, честное слово». Профессор кивает и рассказывает про скифов.',
    choices: [{ label: 'Пусть копают', note: 'Пустая грядка занята 3 недели. Находка — в половине случаев.' }, { label: 'Не сейчас', note: 'Они уйдут копать к соседям.' }],
  },
  shepherd: {
    id: 'shepherd', gone: 'Чабан постоял у забора и погнал отару дальше.', where: ['kuban'], who: 'Чабан Яков', name: 'Чабан с отарой', portrait: 'yakov', once: true,
    text: 'Бывший тракторист в бурке, даже летом. Молча показывает на отару, потом на ваши пустые грядки: «Навоз — тебе, трава — им».',
    choices: [{ label: 'Пустить отару', note: 'Пустые грядки (до четырёх) станут плодороднее на 1, но молодые всходы потеряют неделю роста.' }, { label: 'Взять плату', note: 'Чабан заплатит. Молодые всходы теряют неделю роста.' }, { label: 'Отказать', note: 'Отара пройдёт стороной.' }],
  },
  melonman: {
    id: 'melonman', gone: 'Бахчевник уехал, так и не продав свои семена.', where: ['kuban'], who: 'Петро Никифорович', name: 'Бахчевник', portrait: 'petro', once: true,
    text: '«Сахарный, урожайный. Сам вывел. Для хорошего человека — горсть дешевле, чем в лавке».',
    choices: [{ label: 'Купить семена', note: 'Карта арбуза со свойством «урожайный».' }, { label: 'Спасибо, не надо', note: '' }],
  },
  patrol: {
    id: 'patrol', gone: 'Разъезд поехал дальше по балке.', where: ['kuban'], who: 'Урядник Гордей', name: 'Казачий разъезд', portrait: 'gordey', once: true,
    text: 'Молодой и важный, на рыжем коне: «Кабаны в балке ходят. За четыре единицы урожая постоим у твоего поля, пока не уйдут».',
    choices: [{ label: 'Угостить разъезд', note: 'За 4 ед. урожая кабаны не придут 3 недели, а станица будет довольна.' }, { label: 'Сами справимся', note: '' }],
  },
  hunter: {
    id: 'hunter', gone: 'Афанасьич свистнул Пургу и ушёл в тайгу.', where: ['altai'], who: 'Афанасьич', name: 'Охотник с лайкой', portrait: 'afanasich', once: true,
    text: 'Восемьдесят лет в тайге. Лайка Пурга обнюхивает ваш сапог и садится. «Хромой к ручью ходит. Могу недели три посторожить. Или щенка от Пурги бери — за мёд».',
    choices: [{ label: 'Нанять сторожить', note: 'За плату он посторожит, и 3 недели медведь не подойдёт.' }, { label: 'Щенка за 4 ед. мёда или ягод', note: 'Вы получите находку «Лайка Пурга».' }, { label: 'Не надо', note: '' }],
  },
  geologist: {
    id: 'geologist', gone: 'Геолог переночевала у костра и ушла к перевалу.', where: ['altai'], who: 'Алла Викторовна', name: 'Геолог', portrait: 'alla', once: true,
    text: 'С молотком, рюкзаком и картой, исчерченной карандашом. «Переночевать пустите? Я плачу картами. У меня отмечены все грибные места до самого перевала».',
    choices: [{ label: 'Накормить и оставить', note: 'За 3 ед. урожая вы получите находку «Старая карта».' }, { label: 'Некуда', note: '' }],
  },
  firefamily: {
    id: 'firefamily', gone: 'Звягины отправились искать работу дальше.', where: ['altai'], who: 'Николай Звягин с семьёй', name: 'Погорельцы', portrait: 'nikolay', once: true,
    text: 'Деревню за перевалом зацепил пожар. Николай — плотник, рукастый и гордый, просит не милостыню, а работу. Дочка прячет за спиной спасённую кошку.',
    choices: [{ label: 'Взять на время', note: 'Николай проработает 6 недель без зарплаты.' }, { label: 'Дать денег', note: 'Вы получите +5 славы.' }, { label: 'Отказать', note: '' }],
  },
  pinecones: {
    id: 'pinecones', gone: 'Шишкари ушли бить кедрач в другую сторону.', where: ['altai'], who: 'Бригадир Костя', name: 'Шишкари', portrait: 'kostya', once: true,
    text: 'Это артель «Кедровая», люди шумные, с колотами и мешками. «Дай побить кедрач у твоего края — заплатим сразу, наличными».',
    choices: [{ label: 'Пусть бьют', note: 'Деньги сразу, но до зимы грибов будет вдвое меньше.' }, { label: 'Лес не трогать', note: '' }],
  },
  peddler: {
    id: 'peddler', gone: 'Коробейник звякнул звонком и укатил.', where: ['kuban', 'altai', 'rent'], who: 'Дядя Гриша', name: 'Коробейник', portrait: 'grisha', once: false,
    text: 'Объезжает хутора на велосипеде с прицепом. Достаёт из ящика старую вещь и держит на свету: «Нужная вещь. Последняя. Для вас — почти даром».',
    choices: [{ label: 'Купить находку', note: '' }, { label: 'Посмотреть и вернуть', note: '' }],
  },
  postwoman: {
    id: 'postwoman', gone: 'Нюра оставила письмо под камнем у палатки.', where: ['kuban', 'altai', 'rent'], who: 'Нюра', name: 'Почтальонка', portrait: 'nyura', once: false,
    text: 'Запыхалась, волосы растрепал ветер. «Вам письмо! Из дома. Толстое».',
    choices: [{ label: 'Прочитать', note: 'Письмо из дома.' }],
  },
  inspection: {
    id: 'inspection', gone: 'Пряхин не дождался вас, обошёл поле сам и всё записал в тетрадь.', where: ['rent'], who: 'Аркадий Семёнович Пряхин', name: 'Пряхин с проверкой', portrait: 'pryakhin', once: false,
    text: 'Пряхин обходит поле с карманной тетрадью и карандашом. Молча считает, а потом говорит: «Пырей у вас на грядке, и это я тоже отмечу».',
    choices: [{ label: 'Показать поле', note: 'Если поле чистое, аренда не вырастет. За каждую заросшую грядку она вырастет на 5%.' }, { label: 'Угостить чаем', note: 'За 2 ед. урожая Пряхин запишет не всё.' }],
  },
};
export const VISIT_IDS = Object.keys(VISITS) as VisitId[];
/** the first visitor comes in the third week; then one every 2–4 weeks, never in winter */
export const FIRST_VISIT = 3;

// ---------- hazards of a region (planned by calendar.ts in their own random stream) ----------
export interface HazardPlan { bear: number; boars: number; fire: number; sukhovey: number; floods: number }
export function hazardsFor(loc: LocationId, cond: CondId | undefined, year: number): HazardPlan {
  const h: HazardPlan = { bear: 0, boars: 0, fire: 0, sukhovey: 0, floods: 0 };
  // the first year is gentler: one visit of each kind; the conditions double them from the second year
  const twice = year >= 2 ? 2 : 1;
  if (loc === 'kuban') {
    h.boars = cond === 'melons' ? twice : 1;
    h.sukhovey = cond === 'spit' ? twice : 1;
    h.floods = cond === 'floodplain' ? 1 : 0;
  }
  if (loc === 'altai') {
    h.bear = cond === 'cedar' || cond === 'oldhives' ? twice : 1;
    h.fire = cond === 'burn' ? 0.3 : year === 1 ? 0.5 : 0.8;
  }
  return h;
}

// ---------- the map of a plot ----------
const inPlot = (x: number, y: number) => x >= 1 && x <= 3 && y >= 1 && y <= 3;
const ring = (x: number, y: number) => !inPlot(x, y) && Math.max(Math.abs(x - 2), Math.abs(y - 2)) === 2;
type Side = 'N' | 'E' | 'S' | 'W';
const edgeCells = (side: Side, inner = false): [number, number][] => {
  const k = inner ? (side === 'E' || side === 'S' ? GRID - 2 : 0) : side === 'E' || side === 'S' ? GRID - 1 : 0;
  return Array.from({ length: GRID }, (_, i) => (side === 'N' || side === 'S' ? [i, k] : [k, i]) as [number, number]);
};
/** A fresh 6×6 map for a run: the river on one side, then the region's sand, stones, swamps and taiga. The start
 *  plot (3×3 from 1,1) never holds water or taiga. */
export function runMap(loc: LocationId, seed: string, cond?: CondId): Terrain[] {
  const w = { rng: hashSeed(`${seed}|${loc}|map`) };
  const m: Terrain[] = Array.from({ length: GRID * GRID }, () => 'plain' as Terrain);
  const at = (x: number, y: number) => y * GRID + x;
  const set = (x: number, y: number, t: Terrain) => { m[at(x, y)] = t; };
  const get = (x: number, y: number) => m[at(x, y)];
  const sides: Side[] = ['N', 'E', 'S', 'W'];
  const free = (pred: (x: number, y: number) => boolean) => {
    const out: [number, number][] = [];
    for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (pred(x, y)) out.push([x, y]);
    return shuffle(w, out);
  };
  const scatter = (n: number, t: Terrain, pred: (x: number, y: number) => boolean) => { for (const [x, y] of free(pred).slice(0, n)) set(x, y, t); };
  const river = (side: Side, bend: number) => {
    // the outer edge, its first `bend` cells pushed in next to the plot (a meander), joined by a cell on the turn
    const outer = edgeCells(side), inner = edgeCells(side, true);
    const farSide = side === 'E' || side === 'S';
    for (let i = 0; i < GRID; i++) {
      const [x, y] = farSide && i < bend ? inner[i] : outer[i];
      set(x, y, 'river');
    }
    if (farSide && bend > 0 && bend < GRID) set(...outer[bend - 1], 'river');
  };
  if (loc === 'kuban') {
    const side = sides[randInt(w, 4)];
    const far = side === 'E' || side === 'S';
    // the river always touches the plot somewhere (canals are dug from it): a far side bends in for 3–4 cells,
    // the floodplain's along its whole length; a near side runs along the plot already
    river(side, far ? (cond === 'floodplain' ? 5 : 3 + randInt(w, 2)) : 0);
    const open = (x: number, y: number) => get(x, y) === 'plain' && !inPlot(x, y);
    // sand: a bank in one cluster off the plot; the spit also has two sandy beds inside it
    const sand = cond === 'spit' ? 5 + randInt(w, 3) : 2 + randInt(w, 3);
    const start = free(open)[0];
    if (start) {
      const got: [number, number][] = [start];
      set(...start, 'sand');
      for (let i = 0; i < got.length && got.length < sand; i++) {
        const next = shuffle(w, [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [got[i][0] + dx, got[i][1] + dy] as [number, number])
          .filter(([x, y]) => x >= 0 && y >= 0 && x < GRID && y < GRID && open(x, y)));
        for (const c of next) { if (got.length >= sand) break; set(...c, 'sand'); got.push(c); }
      }
    }
    if (cond === 'spit') scatter(2, 'sand', (x, y) => inPlot(x, y) && (x !== 2 || y !== 2));
    scatter(cond === 'aryks' ? 3 : randInt(w, 3), 'rock', open);
    if (cond === 'aryks') scatter(1, 'rock', (x, y) => inPlot(x, y) && get(x, y) === 'plain' && (x !== 2 || y !== 2));
    scatter(rand(w) < 0.4 ? 1 : 0, 'swamp', open);
  } else if (loc === 'altai') {
    const side = sides[randInt(w, 4)];
    for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (!inPlot(x, y)) set(x, y, 'forest');
    for (const [x, y] of edgeCells(side)) set(x, y, 'river');
    const inRing = (x: number, y: number) => ring(x, y) && get(x, y) === 'forest';
    scatter(1 + randInt(w, 3), 'swamp', inRing);
    scatter(1 + randInt(w, 2), 'rock', inRing);
    scatter(randInt(w, 3), 'plain', inRing); // a meadow in the taiga
    if (cond === 'burn') for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (ring(x, y) && get(x, y) === 'forest') set(x, y, 'plain');
  } else if (loc === 'rent') {
    if (rand(w) < 0.4) {
      const side = sides[randInt(w, 4)];
      const cells = edgeCells(side), from = randInt(w, 3);
      for (const [x, y] of cells.slice(from, from + 3 + randInt(w, 2))) set(x, y, 'river'); // a creek along a field edge
    }
    scatter(randInt(w, 3), 'rock', (x, y) => get(x, y) === 'plain' && !inPlot(x, y));
  }
  return m;
}

// ---------- what a folded farm brings home ----------
export type LootId =
  | 'bricks16' | 'glass6' | 'seedWatermelon' | 'settlerIrrigator' | 'settlerBeekeeper' | 'blacksoil' | 'melonCash'
  | 'logs24' | 'swarm' | 'seedSeabuckthorn' | 'settlerSoilsci' | 'settlerGreenhouser' | 'litter' | 'nutCash'
  | 'rentPremium' | 'levCut' | 'rentLogs' | 'rentBricks' | 'rentGlass';
export interface LootDef { id: LootId; loc: ExpeditionId; name: string; text: string; value: number; mats?: Mats; cash?: number; seed?: CropId; worker?: WorkerId }
export const LOOT: Record<LootId, LootDef> = {
  bricks16: { id: 'bricks16', loc: 'kuban', name: 'Кирпич ×16', text: 'обожжённый станичный кирпич', value: 64, mats: { bricks: 16 } },
  glass6: { id: 'glass6', loc: 'kuban', name: 'Стекло ×6', text: 'рамы с разобранной теплицы консервного завода', value: 42, mats: { glass: 6 } },
  seedWatermelon: { id: 'seedWatermelon', loc: 'kuban', name: 'Семена арбуза', text: 'семена попадут в семенной фонд, и арбуз сможет расти дома', value: 40, seed: 'watermelon' },
  settlerIrrigator: { id: 'settlerIrrigator', loc: 'kuban', name: 'Переселенец-поливальщик', text: 'Айдар поедет с вами, нанять его можно бесплатно', value: 50, worker: 'irrigator' },
  settlerBeekeeper: { id: 'settlerBeekeeper', loc: 'kuban', name: 'Переселенец-пчеловод', text: 'Пётр поедет с вами, нанять его можно бесплатно', value: 50, worker: 'beekeeper' },
  blacksoil: { id: 'blacksoil', loc: 'kuban', name: 'Кубанский чернозём', text: 'плодородие четырёх самых бедных грядок дома вырастет на 1', value: 45 },
  melonCash: { id: 'melonCash', loc: 'kuban', name: 'Выручка с бахчи', text: '30 ₽ сверх вашей доли, с поправкой на инфляцию', value: 30, cash: 30 },
  logs24: { id: 'logs24', loc: 'altai', name: 'Кедровые брёвна ×24', text: 'сплавом по реке до самого дома', value: 48, mats: { logs: 24 } },
  swarm: { id: 'swarm', loc: 'altai', name: 'Улей с роем', text: 'пасека дома станет на уровень выше, без стройки', value: 40 },
  seedSeabuckthorn: { id: 'seedSeabuckthorn', loc: 'altai', name: 'Саженцы облепихи', text: 'саженцы попадут в семенной фонд, и облепиха сможет расти дома', value: 40, seed: 'seabuckthorn' },
  settlerSoilsci: { id: 'settlerSoilsci', loc: 'altai', name: 'Переселенец-почвовед', text: 'Олег поедет с вами, нанять его можно бесплатно', value: 50, worker: 'soilsci' },
  settlerGreenhouser: { id: 'settlerGreenhouser', loc: 'altai', name: 'Переселенка-тепличница', text: 'Лиза поедет с вами, нанять её можно бесплатно', value: 50, worker: 'greenhouser' },
  litter: { id: 'litter', loc: 'altai', name: 'Таёжная подстилка', text: 'в колоду дома попадут 3 разовые карты компоста', value: 30 },
  nutCash: { id: 'nutCash', loc: 'altai', name: 'Кедровый орех', text: '30 ₽ сверх вашей доли, с поправкой на инфляцию', value: 30, cash: 30 },
  rentPremium: { id: 'rentPremium', loc: 'rent', name: 'Премия от Варвары', text: '25 ₽ сверх вашей доли, с поправкой на инфляцию', value: 25, cash: 25 },
  levCut: { id: 'levCut', loc: 'rent', name: 'Лёвин процент', text: '40 ₽ сверх вашей доли, с поправкой на инфляцию', value: 40, cash: 40 },
  rentLogs: { id: 'rentLogs', loc: 'rent', name: 'Брёвна со старого сарая', text: 'Пряхин разобрал сарай, вам достались 10 брёвен', value: 20, mats: { logs: 10 } },
  rentBricks: { id: 'rentBricks', loc: 'rent', name: 'Кирпич с фермы', text: '8 кирпичей с колхозной фермы', value: 32, mats: { bricks: 8 } },
  rentGlass: { id: 'rentGlass', loc: 'rent', name: 'Стекло из школьной теплицы', text: 'Нелли Марковна отдала старые рамы, это 4 стекла', value: 28, mats: { glass: 4 } },
};
export const LOOT_IDS = Object.keys(LOOT) as LootId[];
export const lootOf = (loc: ExpeditionId) => LOOT_IDS.filter((id) => LOOT[id].loc === loc);

// ---------- the three plots offered at departure ----------
export interface PlotOffer { cond: CondId; relic: RelicId }
export function plotOffers(loc: ExpeditionId, key: string): PlotOffer[] {
  const w = { rng: hashSeed(`${key}|${loc}|offers`) };
  const conds = shuffle(w, [...REGION_CONDS[loc]]).slice(0, 3);
  const relics = shuffle(w, RELIC_IDS.filter((r) => !VISIT_ONLY.includes(r)));
  return conds.map((cond, i) => ({ cond, relic: relics[i] }));
}
