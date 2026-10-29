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
      MARAT('С приездом! Дом пока в залоге у банка, поэтому платить придётся весной, летом и осенью. Внесите три осенних взноса, и дом станет вашим. Дальше останется только налог раз в год.'),
      P('Пряхин, Аркадий Семёнович, живу через реку, в Заречье. Этот дом я присматривал на торгах, а достался он вам. Прежний хозяин тоже начинал с редиски, так что внесу вас в тетрадь и посмотрю, что скажет осень.'),
      PALYCH('Не робейте, он со всеми так. Заказы смотрите на доске у колодца. Ярмарка у нас раз в сезон, а зимой на площади смотр урожая. Как окрепнете, у дороги появится указатель: оттуда можно собрать обоз в Заречье, а потом на Кубань и на Алтай.'),
    ],
    note: 'Цель: выкупить дом за три осени и обойти Пряхина.',
  },
  buyout: {
    kind: 'sheet', title: 'Дом ваш',
    lines: [
      MARAT('Залог снят, дом теперь ваш. От души поздравляю! Дальше останется только налог, раз в год, осенью.'),
      P('Значит, всё-таки выкупили. Что ж, внесу это в тетрадь, а теперь посмотрим, каким вы окажетесь соседом.'),
      ZINA('Теперь и до нас руки дойдут? У меня крыша течёт, в кузне у Саввы холодно, Карповым тяжело. А вот поднимем три двора, и вся деревня выйдет клуб строить.'),
    ],
    note: 'Начинается новая глава. Помогайте соседям, стройте клуб, где пройдёт праздник урожая, и боритесь за место в районе.',
  },
  'fest-pact': {
    kind: 'sheet', title: 'Черенок антоновки',
    lines: [
      P('Впервые с восемьдесят седьмого года я проиграл, и это тоже внесу в тетрадь. Вот, возьмите черенок: пряхинская антоновка, её жена сажала. У меня сад засох, а у вас, думаю, приживётся.'),
      P('Ну что ж, с праздником вас, сосед.'),
      PALYCH('Слыхали? «Сосед»! Сорок лет его знаю, а он никому так не говорил.'),
    ],
    note: 'Во дворе теперь растёт пряхинская антоновка. Вы получили грамоту «Победитель праздника урожая».',
  },
  'district-first': {
    kind: 'sheet', title: 'Первые в районе',
    lines: [
      PALYCH('В райцентре сводку вывесили: наше хозяйство — первое в районе! Ольховку обошли, Подворье Пряхина тоже.'),
      P('Первое место в районе, надо же. Пока записывал, карандаш сточил.'),
    ],
    note: 'Вы получили грамоту «Первые в районе» и +20 славы.',
  },
  epilogue: {
    kind: 'sheet', title: 'Летопись хозяйства',
    lines: [
      PALYCH('Помню, как вы с редиски начинали и как Пряхин вас в тетрадь записал. А теперь гляньте: дом ваш, дворы стоят, клуб гудит, и обозы из трёх краёв вернулись.'),
      ZINA('Внук мой говорит, что в районе про нашу деревню теперь пишут. А всё с одной избы началось.'),
      P('Тетрадь я веду с восемьдесят седьмого года, и ваша страница в ней самая длинная. Приходите зимой на праздник, сосед, без вас там скучно.'),
    ],
    note: 'Летопись закрыта. Вы получили грамоту «Летопись хозяйства» и +50 славы. Игра продолжается: испытания будут становиться сложнее, а Пряхин каждую зиму ждёт вас на празднике.',
  },
  // ---- remarks: one line in the field's voice
  'rival-buy': { kind: 'remark', lines: [P('Кто зевает на ярмарке, тот покупает у меня. Не обессудьте, лот мне приглянулся.')] },
  'rival-beaten': { kind: 'remark', lines: [P('Шустро вы управились, но ярмарка не последняя, ещё посмотрим.')] },
  'first-shortfall': { kind: 'remark', lines: [P('Земля любит хозяина, а не мечтателя, и банк, замечу, тоже.')] },
  'house-3': { kind: 'remark', lines: [P('Мастерская у вас появилась. Для приезжего это неплохо, должен признать.')] },
  'house-5': { kind: 'remark', lines: [P('Уже усадьба. Прежний хозяин до погреба и то не дотянул.')] },
  'house-7': { kind: 'remark', lines: [P('Подворье у вас теперь, как у меня. Посмотрим, надолго ли, тетрадь-то всё помнит.')] },
  'first-yard': { kind: 'remark', lines: [P('Вы чужие крыши латаете, а свою бы не проморгали.')] },
  'first-common': { kind: 'remark', lines: [P('Толокой строите. При колхозе мы тоже так начинали.')] },
  'arrive-rent': { kind: 'remark', lines: [P('Значит, вы ко мне в аренду. Сорняков я не терплю и каждую грядку запишу, так и знайте.')] },
  'arrive-kuban': { kind: 'remark', lines: [P('На Кубань собрались? Там свои перекупщики, не чета мне, так что обоз не растеряйте.')] },
  'arrive-altai': { kind: 'remark', lines: [P('На Алтай? Будьте осторожны: медведь не банк, отсрочку он не даёт.')] },
  'cart-back': { kind: 'remark', lines: [P('Привезли? Дайте-ка взглянуть. Хорошо, внесу в тетрадь.')] },
  // 29.10 · the first haul from each region
  'trip-rent': { kind: 'remark', lines: [P('С моей земли, да ещё с прибылью. Внесу в тетрадь, а аренду, пожалуй, поднимать не буду.')] },
  'trip-kuban': { kind: 'remark', lines: [P('Вернулись с Кубани. Арбуз у нас не вызревает, но у вас, как я погляжу, вызревает всё.')] },
  'trip-altai': { kind: 'remark', lines: [P('Рад, что вы вернулись с Алтая живыми. Медведю при случае передайте от меня поклон.')] },
  'trial-held': { kind: 'remark', lines: [P('Вы выстояли. Я в восемьдесят девятом тоже выстоял, так что мне это знакомо.')] },
  'know-5': { kind: 'remark', lines: [P('Свой сорт, значит. У меня тоже был, антоновка, но сад засох, когда жены не стало.')] },
  'district-pass': { kind: 'remark', lines: [P('Вы обошли меня по району. Тетрадь не врёт, но так будет не всегда.')] },
  'smotr-win': { kind: 'remark', lines: [P('На площади вы первые, но смотр ещё не праздник. Вот построите клуб, тогда и поговорим всерьёз.')] },
};

/** what Пряхин says at the yearly show or festival, by the result and the year (so it is not the same every winter) */
export function rivalVerdict(win: boolean, any: boolean, year: number): string {
  const lines = win
    ? ['Что ж, этот год ваш. Внесу в тетрадь, а на будущий мы ещё посмотрим.', 'Вы меня обошли. Рука у меня не дрогнула: запись будет в вашу пользу.', 'Опять вы. Если так пойдёт дальше, тетрадь у меня скоро закончится.']
    : any
      ? ['Недурно, но смотр остаётся за мной. Приходите на будущий год.', 'Одна номинация ваша, и только одна. Её я тоже внесу в тетрадь.', 'Почти получилось, но в нашем деле «почти» означает неурожай.']
      : ['Разве так собирают урожай? Учитесь, пока я жив.', 'Земля любит хозяина, а не мечтателя, и в тетради я это отмечу.', 'Стол у вас пустоват, но не расстраивайтесь, все с этого начинали.'];
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
