// What the sky over the field says: one weather picture per known week (this week the biggest, the farther
// the smaller), fog past the forecast, and the raids seen coming. Read from the engine only; nothing guessed.
import { EPISODES, covers } from '../engine/calendar';
import { episodesAt, knownEpisodes, lookahead, lvl, strikeVictims, weekInfo, type GameState } from '../engine/game';
import { kidsAhead, kidsScouting } from './foresight';

export type SkyKind = 'sun' | 'hot' | 'dry' | 'warm' | 'cloud' | 'cold' | 'rain' | 'hail' | 'flood' | 'snow' | 'frost' | 'thaw' | 'wind';
export interface SkyToken { k: number; abs: number; kind: SkyKind; temp: number; bad: boolean; text: string }
export type SignKind = 'crows' | 'kids' | 'locust' | 'beetle' | 'weedsurge' | 'bear' | 'boars' | 'fire';
export interface RaidSign { kind: SignKind; ahead: number; cells: [number, number][]; text: string }

const tStr = (t: number) => `${t > 0 ? '+' : ''}${t}°`;
export const whenStr = (k: number) => (k === 0 ? 'Эта неделя' : k === 1 ? 'Через неделю' : `Через ${k} нед.`);
const BAD: SkyKind[] = ['hail', 'flood', 'frost', 'dry', 'wind'];

function phrase(kind: SkyKind, t: number, struck: boolean): string {
  switch (kind) {
    case 'sun': return `ясно, ${tStr(t)}`;
    case 'hot': return `жарко, ${tStr(t)}: земля сохнет быстрее`;
    case 'dry': return `засуха, ${tStr(t)}: каждую неделю земля теряет больше влаги`;
    case 'warm': return `тепло, ${tStr(t)}: политое растёт за неделю как за две`;
    case 'cloud': return `облачно, ${tStr(t)}`;
    case 'cold': return `холодно, ${tStr(t)}: теплолюбивые не растут`;
    case 'rain': return `дожди, ${tStr(t)}: открытые грядки польёт само`;
    case 'hail': return struck ? 'град: тень тучи лежит на грядках под ударом, теплица и укрытие спасают' : 'град: побьёт грядки вне теплиц, урожай вдвое меньше';
    case 'flood': return 'паводок: у реки урожай вдвое меньше';
    case 'snow': return `зима, ${tStr(t)}`;
    case 'frost': return `заморозок, ${tStr(t)}: ростки без укрытия погибнут`;
    case 'thaw': return 'оттепель, около нуля';
    case 'wind': return `суховей, ${tStr(t)}: сухие грядки гибнут сразу, открытые теряют ещё влагу. Спасают лес или дерево рядом, мульча, укрытие, капельница`;
  }
}

export function skyTokens(s: GameState): SkyToken[] {
  const out: SkyToken[] = [];
  const known = knownEpisodes(s);
  for (let k = 0; k <= lookahead(s); k++) {
    const info = weekInfo(s, k);
    const eps = (k === 0 ? episodesAt(s, info.absWeek) : known.filter((e) => covers(e, info.absWeek))).filter((e) => !EPISODES[e.kind].biotic);
    const has = (kind: string) => eps.some((e) => e.kind === kind);
    const strike = s.strikes.find((st) => st.week === info.absWeek && (st.kind === 'hail' || st.kind === 'flood'));
    let kind: SkyKind;
    if (strike?.kind === 'hail' || has('hail')) kind = 'hail';
    else if (strike?.kind === 'flood' || has('flood')) kind = 'flood';
    else if (has('frost')) kind = 'frost';
    else if (info.season === 3) kind = has('thaw') ? 'thaw' : 'snow';
    else if (has('sukhovey')) kind = 'wind';
    else if (has('dry')) kind = 'dry';
    else if (has('rain')) kind = 'rain';
    else if (has('warm')) kind = 'warm';
    else if (info.temp >= 26) kind = 'hot';
    else if (info.temp >= 15) kind = 'sun';
    else if (info.temp >= 6) kind = 'cloud';
    else kind = 'cold';
    out.push({ k, abs: info.absWeek, kind, temp: info.temp, bad: BAD.includes(kind), text: `${whenStr(k)}: ${phrase(kind, info.temp, !!strike)}.` });
  }
  return out;
}

export function fogText(s: GameState): string {
  const l = lvl(s, 'meteo');
  if (l >= 3) return 'Дальше шести недель погоду не знает никто.';
  return `Дальше ${lookahead(s) === 1 ? 'недели' : `${lookahead(s)} недель`} — туман. ${l === 0 ? 'Барометр' : 'Метеостанция побольше'} разгонит его.`;
}

const ahead = (n: number) => (n <= 1 ? 'на следующей неделе' : `через ${n} недели`);
export function raidSigns(s: GameState): RaidSign[] {
  const out: RaidSign[] = [];
  if (s.phase !== 'week') return out;
  for (const w of new Set(s.crowWarn ?? [])) if (w > s.absWeek)
    out.push({ kind: 'crows', ahead: w - s.absWeek, cells: [], text: `Вороны кружат над лесом: ${ahead(w - s.absWeek)} сядут на всходы и спелые грядки. Пугало или теплица их не пустят, прогнать можно за день.` });
  if (kidsScouting(s)) {
    const n = kidsAhead(s);
    out.push({ kind: 'kids', ahead: n, cells: [], text: `Дети из интерната высматривают спелые грядки: ${ahead(n)} придут за урожаем. Укройте грядки, заведите пса или сторожа.` });
  }
  for (const st of s.strikes) {
    if (st.week <= s.absWeek || !['beetle', 'locust', 'weedsurge', 'bear', 'boars', 'fire'].includes(st.kind)) continue;
    const n = st.week - s.absWeek;
    const cells = strikeVictims(s, st);
    if (st.kind === 'beetle') out.push({ kind: 'beetle', ahead: n, cells, text: `Колорадский жук ползёт к картошке: ${ahead(n)} съест половину урожая. Защитите грядки или посадите рядом чеснок.` });
    if (st.kind === 'locust') out.push({ kind: 'locust', ahead: n, cells, text: `Саранча на горизонте: ${ahead(n)} налетит на самую большую посадку.` });
    if (st.kind === 'weedsurge') out.push({ kind: 'weedsurge', ahead: n, cells, text: `Ветер несёт семена сорняков: ${ahead(n)} пустые грядки зарастут. Засейте их.` });
    if (st.kind === 'bear') out.push({ kind: 'bear', ahead: n, cells, text: `Медвежьи следы у ручья: ${ahead(n)} медведь придёт к ульям, ягодникам и грядкам у тайги. Покараульте их или позовите сторожа.` });
    if (st.kind === 'boars') out.push({ kind: 'boars', ahead: n, cells, text: `Кабаны в балке: ${ahead(n)} перероют край поля. Покараульте грядки — или пусть пёс и сторож их отгонят.` });
    if (st.kind === 'fire') out.push({ kind: 'fire', ahead: n, cells, text: `Дым над тайгой: ${ahead(n)} огонь подойдёт к полю. Полейте грядки у леса до краёв или окопайте их.` });
  }
  return out;
}
