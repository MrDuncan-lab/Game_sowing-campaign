// The game's through-line (29.10): the home in Черноземье is in the bank's pledge, and Аркадий Семёнович Пряхин —
// a dry, proud farmer from Заречье who wanted the house at the auction — keeps an eye on it from the first morning.
// He buys up lots at the fair, sees the cart off, judges the yearly show, and when beaten at the club's harvest
// festival gives a cutting of his late wife's antonovka and first says «сосед». See docs/CHARACTERS-v3.md §1.
//
// A story beat is raised by the engine (game.ts `beat`), once per farm: a sheet (a few people speaking in turn, the
// player reads it once) or a remark (one line in the field's voice bubble). The texts live here.
import type { PersonId } from '../art/portraits';

export interface StoryLine { who: PersonId; name: string; text: string }
export interface StoryBeat { kind: 'sheet' | 'remark'; title?: string; lines: StoryLine[]; note?: string }

export const PRYAKHIN = 'Аркадий Семёнович Пряхин';
const P = (text: string): StoryLine => ({ who: 'pryakhin', name: 'Пряхин', text });
const MARAT = (text: string): StoryLine => ({ who: 'marat', name: 'Марат, банк', text });
const PALYCH = (text: string): StoryLine => ({ who: 'palych', name: 'Палыч', text });
const ZINA = (text: string): StoryLine => ({ who: 'zina', name: 'Зина', text });

export const STORY: Record<string, StoryBeat> = {
  // ---- sheets
  start: {
    kind: 'sheet', title: 'Первое утро',
    lines: [
      MARAT('С приездом! Дом в залоге у банка: весной, летом и осенью — взносы. Три осенних взноса — и дом ваш, дальше только налог раз в год.'),
      P('Пряхин. Аркадий Семёнович. Через реку живу, в Заречье. Я этот дом на торгах присматривал — банк вам отдал. Прежний хозяин тоже начинал с редиски… Записал вас в тетрадь. Посмотрим, что скажет осень.'),
      PALYCH('Не робейте, он со всеми так. Заказы — на доске у колодца, раз в сезон — ярмарка, а зимой — смотр урожая на площади. Окрепнете — у дороги указатель: обоз в Заречье, а там и на Кубань с Алтаем.'),
    ],
    note: 'Цель: выкупить дом за три осени и обойти Пряхина.',
  },
  buyout: {
    kind: 'sheet', title: 'Дом ваш',
    lines: [
      MARAT('Залог снят. Дом ваш — от души поздравляю! Дальше только налог, раз в год осенью.'),
      P('Записал. Выкупили, значит… Ну, теперь посмотрим, каким вы будете соседом.'),
      ZINA('Теперь и до нас руки дойдут? Крыша у меня течёт, кузня у Саввы холодная, Карповым тяжко. А поднимем три двора — вся деревня клуб строить выйдет.'),
    ],
    note: 'Новая глава: соседи, клуб и праздник урожая, место в районе.',
  },
  'fest-pact': {
    kind: 'sheet', title: 'Черенок антоновки',
    lines: [
      P('Записал: проиграл. Первый раз с восемьдесят седьмого года… Вот, держите. Черенок пряхинской антоновки, жена сажала. У меня сад засох, а у вас приживётся.'),
      P('Ну что… с праздником, сосед.'),
      PALYCH('Слыхали? «Сосед»! Сорок лет его знаю — никому так не говорил.'),
    ],
    note: 'Во дворе растёт пряхинская антоновка. Грамота «Победитель праздника урожая».',
  },
  'district-first': {
    kind: 'sheet', title: 'Первые в районе',
    lines: [
      PALYCH('В райцентре сводку вывесили: наше хозяйство — первое в районе! Ольховку обошли, Подворье Пряхина обошли.'),
      P('Первое место. Записал. Карандаш сточил, пока записывал.'),
    ],
    note: 'Грамота «Первые в районе», +20 славы.',
  },
  epilogue: {
    kind: 'sheet', title: 'Летопись хозяйства',
    lines: [
      PALYCH('Помню, как вы с редиски начинали и как Пряхин вас в тетрадь записал. А теперь гляньте: дом ваш, дворы стоят, клуб гудит.'),
      ZINA('Внук мой говорит — в районе про нашу деревню теперь пишут. А всё с одной избы началось.'),
      P('Тетрадь моя с восемьдесят седьмого года. Ваша страница в ней — самая длинная. Приходите зимой на праздник, сосед: без вас скучно.'),
    ],
    note: 'Летопись закрыта: грамота «Летопись хозяйства» и +50 славы. Игра продолжается: испытания крепнут, а Пряхин каждую зиму ждёт вас на празднике.',
  },
  // ---- remarks: one line in the field's voice
  'rival-buy': { kind: 'remark', lines: [P('Кто зевает на ярмарке, тот покупает у меня. Записал.')] },
  'rival-beaten': { kind: 'remark', lines: [P('Шустро. Ничего, ярмарка не последняя.')] },
  'first-shortfall': { kind: 'remark', lines: [P('Земля любит хозяина, а не мечтателя. Банк — тоже.')] },
  'house-3': { kind: 'remark', lines: [P('Мастерская… Неплохо. Для приезжего — неплохо.')] },
  'house-5': { kind: 'remark', lines: [P('Усадьба. Прежний хозяин до погреба не дотянул.')] },
  'house-7': { kind: 'remark', lines: [P('Подворье, как у меня. Ну-ну. Тетрадь всё помнит.')] },
  'first-yard': { kind: 'remark', lines: [P('Чужие крыши латаете? Свою бы не проморгали.')] },
  'first-common': { kind: 'remark', lines: [P('Толокой строите… При колхозе тоже так начинали.')] },
  'arrive-rent': { kind: 'remark', lines: [P('Ко мне, значит, в аренду. Сорняков не терплю — каждую грядку запишу.')] },
  'arrive-kuban': { kind: 'remark', lines: [P('На Кубань собрались? Там свои перекупщики, не чета мне. Обоз не растеряйте.')] },
  'arrive-altai': { kind: 'remark', lines: [P('На Алтай? Медведь — не банк, отсрочку не даёт.')] },
  'cart-back': { kind: 'remark', lines: [P('Привезли? Покажите-ка… Записал.')] },
  'trial-held': { kind: 'remark', lines: [P('Выстояли. Я в восемьдесят девятом тоже выстоял. Записал.')] },
  'know-5': { kind: 'remark', lines: [P('Свой сорт… У меня тоже был — антоновка. Сад засох, как жены не стало.')] },
  'district-pass': { kind: 'remark', lines: [P('Обошли меня по району? Тетрадь не врёт… пока.')] },
  'smotr-win': { kind: 'remark', lines: [P('На площади вы первые. Смотр — не праздник: вот клуб построите, тогда и поговорим.')] },
};

/** what Пряхин says at the yearly show or festival, by the result and the year (so it is not the same every winter) */
export function rivalVerdict(win: boolean, any: boolean, year: number): string {
  const lines = win
    ? ['Ну… ваш год. Записал. Но на будущий — посмотрим.', 'Обошли. Карандаш у меня не дрожит, а запись — ваша.', 'Опять вы. Записал. Тетрадь скоро кончится.']
    : any
      ? ['Недурно. Но смотр мой. Приходите на будущий год.', 'Одна номинация ваша. Одна. Записал.', 'Почти. В нашем деле «почти» — это неурожай.']
      : ['Кто ж так урожай собирает? Учитесь, пока я жив.', 'Земля любит хозяина, а не мечтателя. Записал.', 'Пустовато у вас на столе. Ничего, все с этого начинали.'];
  return lines[(year - 1) % lines.length];
}

/** the rival at a region's fair: Пряхин at home and in Заречье, local dealers on the expeditions far away
 *  (the name reads well both at the start and in the middle of a sentence) */
export const FAIR_RIVAL: Record<string, { name: string; who: PersonId; text: string }> = {
  chernozem: { name: 'Пряхин', who: 'pryakhin', text: `${PRYAKHIN} из Заречья тоже ходит на ярмарку` },
  rent: { name: 'Пряхин', who: 'pryakhin', text: `${PRYAKHIN}, ваш арендодатель, тоже ходит на ярмарку` },
  kuban: { name: 'Жора-перекупщик', who: 'trader', text: 'Жора-перекупщик со станичного рынка скупает всё, что плохо лежит' },
  altai: { name: 'Кеша-скупщик', who: 'trader', text: 'Кеша-скупщик из райцентра возит товар на «буханке» и берёт лучшее' },
};
export const fairRival = (loc: string) => FAIR_RIVAL[loc] ?? FAIR_RIVAL.chernozem;
