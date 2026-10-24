// The year plan: weather periods, declared threats, market windows and the weekly air temperature.
// Built once when a year starts, from its own random stream; nothing the player does changes it.
import type { CropId, LocationDef } from './data';
import { hashSeed, rand, randInt, shuffle } from './rng';

export type EpisodeKind =
  | 'dry' | 'rain' | 'warm' | 'frost' | 'thaw'
  | 'hail' | 'flood' | 'beetle' | 'locust' | 'weedsurge'
  | 'export' | 'fair' | 'glut' | 'seeds'
  | 'helpers' | 'crows';
export type EpisodeRow = 'climate' | 'threat' | 'market' | 'help';
export interface EpisodeDef { kind: EpisodeKind; name: string; icon: string; row: EpisodeRow; bad: boolean; biotic?: boolean; text: string }

export const EPISODES: Record<EpisodeKind, EpisodeDef> = {
  dry: { kind: 'dry', name: 'Засуха', icon: 'sun', row: 'climate', bad: true, text: 'Жарко (+5°), каждую неделю земля теряет на 1 влагу больше, песок — на 2.' },
  rain: { kind: 'rain', name: 'Дожди', icon: 'rain', row: 'climate', bad: false, text: 'Прохладнее (−2°). Открытые грядки сами получают +1 влагу.' },
  warm: { kind: 'warm', name: 'Тепло', icon: 'warm', row: 'climate', bad: false, text: 'Теплее на 4°. Политое и прогретое растёт за неделю как за две.' },
  frost: { kind: 'frost', name: 'Заморозок', icon: 'frost', row: 'climate', bad: true, text: 'Ночью ниже нуля. Ростки и нежные культуры без укрытия погибнут.' },
  thaw: { kind: 'thaw', name: 'Оттепель', icon: 'warm', row: 'climate', bad: false, text: 'Зимняя оттепель: около нуля, снег оседает.' },
  hail: { kind: 'hail', name: 'Град', icon: 'hail', row: 'threat', bad: true, text: 'Град побьёт отмеченные грядки вне теплиц: урожай вдвое меньше.' },
  flood: { kind: 'flood', name: 'Паводок', icon: 'flood', row: 'threat', bad: true, text: 'Река разольётся: у воды урожай вдвое меньше.' },
  beetle: { kind: 'beetle', name: 'Колорадский жук', icon: 'beetle', row: 'threat', bad: true, biotic: true, text: 'Жуки ползут к посадке картофеля. Неделю спустя съедят половину урожая.' },
  locust: { kind: 'locust', name: 'Саранча', icon: 'locust', row: 'threat', bad: true, biotic: true, text: 'Стая видна за неделю до каждого из двух ударов по самой большой посадке.' },
  weedsurge: { kind: 'weedsurge', name: 'Сорняки', icon: 'weeds', row: 'threat', bad: true, biotic: true, text: 'Ветер несёт семена сорняков: пустые грядки зарастут к концу следующей недели.' },
  export: { kind: 'export', name: 'Спрос на зерно', icon: 'up', row: 'market', bad: false, text: 'Пшеница и рис дороже в 1,6 раза.' },
  fair: { kind: 'fair', name: 'Ярмарка', icon: 'up', row: 'market', bad: false, text: 'Тыква, томаты, клубника и мёд дороже в 1,4 раза.' },
  glut: { kind: 'glut', name: 'Падение цены', icon: 'down', row: 'market', bad: true, text: 'Одна культура на 40% дешевле.' },
  seeds: { kind: 'seeds', name: 'Семена дешевле', icon: 'seed', row: 'market', bad: false, text: 'Семена одной культуры на 25% дешевле.' },
  helpers: { kind: 'helpers', name: 'Соседи помогают', icon: 'hand', row: 'help', bad: false, text: 'На этой неделе на один рабочий день больше.' },
  crows: { kind: 'crows', name: 'Вороны', icon: 'crow', row: 'threat', bad: true, biotic: true, text: 'Стая кружит над лесом за неделю до того, как сесть на поле.' },
};

// start and len in absolute weeks once the game shifts them; planYear works in weeks of the year (1-based)
export interface Episode { id: number; kind: EpisodeKind; start: number; len: number; crop?: CropId }
export const episodeEnd = (e: Episode) => e.start + e.len - 1;
export const covers = (e: Episode, w: number) => w >= e.start && w <= episodeEnd(e);

export function marketMult(e: Episode, c: CropId): number {
  if (e.kind === 'export') return c === 'wheat' || c === 'rice' ? 1.6 : 1;
  if (e.kind === 'fair') return c === 'pumpkin' || c === 'tomato' || c === 'strawberry' || c === 'honey' ? 1.4 : 1;
  if (e.kind === 'glut') return e.crop === c ? 0.6 : 1;
  return 1;
}

export interface PlanInput { key: string; year: number; loc: LocationDef; river: boolean; crops: CropId[] }
export interface YearPlan { episodes: Episode[]; temps: number[] } // temps[i] = air °C of week i+1 of the year

// the base temperature of a week: a straight line across spring and autumn, an arch over summer, a dip in winter
export function baseTemp(loc: LocationDef, season: number, w: number): number {
  const n = loc.seasons[season];
  const t = n <= 1 ? 0 : (w - 1) / (n - 1);
  const lerp = (a: [number, number]) => a[0] + (a[1] - a[0]) * t;
  if (season === 0) return lerp(loc.temp.spring);
  if (season === 2) return lerp(loc.temp.autumn);
  if (season === 1) {
    const [lo, hi] = loc.temp.summer;
    return lo + (hi - lo) * Math.sin(Math.PI * Math.min(1, Math.max(0, (w - 0.5) / n)));
  }
  const [a, b] = loc.temp.winter;
  return a + (b - a) * Math.sin(Math.PI * Math.min(1, Math.max(0, (w - 0.5) / n)));
}

export function seasonOf(loc: LocationDef, weekOfYear: number): { season: 0 | 1 | 2 | 3; w: number } {
  let w = weekOfYear;
  for (let s = 0; s < 4; s++) {
    if (w <= loc.seasons[s]) return { season: s as 0 | 1 | 2 | 3, w };
    w -= loc.seasons[s];
  }
  return { season: 3, w: loc.seasons[3] };
}

export function planYear(p: PlanInput): YearPlan {
  const w = { rng: hashSeed(p.key) };
  const { year: y, loc } = p;
  const [sp, su, au, wi] = loc.seasons;
  const N = sp + su + au + wi;
  const S0 = sp + 1, S1 = sp + su, A0 = S1 + 1, A1 = S1 + au, W0 = A1 + 1;
  const pick = <T,>(items: T[]) => items[randInt(w, items.length)];
  const weighted = <T,>(items: [T, number][]) => {
    let r = rand(w) * items.reduce((a, [, x]) => a + x, 0);
    for (const [it, x] of items) if ((r -= x) <= 0) return it;
    return items[items.length - 1][0];
  };
  const eps: Episode[] = [];
  const add = (kind: EpisodeKind, start: number, len: number, crop?: CropId) => {
    const s = Math.max(1, start);
    const l = Math.max(1, Math.min(len, N - s + 1));
    eps.push({ id: 0, kind, start: s, len: l, ...(crop ? { crop } : {}) });
  };
  const overlaps = (row: EpisodeRow, s: number, l: number, gap = 0) =>
    eps.some((e) => EPISODES[e.kind].row === row && s <= episodeEnd(e) + gap && s + l - 1 >= e.start - gap);
  const climateLen = (k: EpisodeKind) => (k === 'dry' ? 2 + randInt(w, 2) : k === 'rain' ? (loc.rainy ? 3 : 2) : k === 'frost' || k === 'thaw' ? 1 : 2);
  const placeClimate = (k: EpisodeKind, lo: number, hi: number) => {
    if (hi < lo) return;
    const len = climateLen(k);
    for (let t = 0; t < 10; t++) {
      const s = lo + randInt(w, Math.max(1, hi - lo - len + 2));
      const opposite = k === 'dry' ? 'rain' : k === 'rain' ? 'dry' : null;
      const clash = overlaps('climate', s, len, 0) || (opposite && eps.some((e) => e.kind === opposite && s <= episodeEnd(e) + 1 && s + len - 1 >= e.start - 1));
      if (!clash && s + len - 1 <= hi) return add(k, s, len);
    }
  };
  const placeThreat = (k: EpisodeKind, lo: number, hi: number) => {
    const len = k === 'beetle' ? 2 : k === 'locust' ? 3 : 1;
    for (let t = 0; t < 10; t++) {
      const s = lo + randInt(w, Math.max(1, hi - lo - len + 2));
      if (s + len - 1 <= hi && !overlaps('threat', s, len, 1)) return add(k, s, len);
    }
  };
  const marketCrop = () => (p.crops.length ? pick(p.crops) : undefined);
  const placeMarket = (k: EpisodeKind, lo: number, hi: number) => {
    for (let t = 0; t < 10; t++) {
      const s = lo + randInt(w, Math.max(1, hi - lo));
      if (s + 1 <= N && !overlaps('market', s, 2)) return add(k, s, 2, k === 'glut' || k === 'seeds' ? marketCrop() : undefined);
    }
  };

  // spring: a late frost is the classic spring trap (not in the very first weeks of the first year)
  if (rand(w) < (y === 1 ? 0.5 : 0.7)) placeClimate('frost', y === 1 ? Math.min(sp, 3) : 2, sp);
  if (rand(w) < 0.45) placeClimate(weighted<EpisodeKind>([['rain', 1], ['warm', 1]]), 1, sp);
  if (rand(w) < 0.35) add('helpers', 1 + randInt(w, sp), 1);
  if (y > 1 && rand(w) < 0.35) placeMarket(weighted<EpisodeKind>([['seeds', 1], ['fair', 1], ['glut', 0.6]]), 1, sp);

  // summer
  const firstWeek = S0 + (y === 1 ? 1 : 0);
  const climates = y === 1 ? 1 : 2;
  for (let i = 0; i < climates; i++) {
    const k = weighted<EpisodeKind>([['dry', loc.hot ? 0.6 : loc.mild ? 0.3 : 0.4], ['rain', loc.rainy ? 0.5 : loc.mild ? 0.4 : 0.25], ['warm', loc.rainy ? 0.15 : 0.3]]);
    placeClimate(k, firstWeek, S1);
  }
  if (su > 10 && rand(w) < 0.5) placeClimate(loc.hot ? 'dry' : 'warm', firstWeek + 4, S1);
  placeMarket(pick<EpisodeKind>(['fair', 'seeds', 'export', ...(y > 1 ? (['glut'] as EpisodeKind[]) : [])]), firstWeek + 1, S1);
  if (rand(w) < 0.5) add('helpers', firstWeek + randInt(w, Math.max(1, S1 - firstWeek + 1)), 1);
  const threatPool: EpisodeKind[] = ['hail', 'beetle', ...(p.river ? (['flood'] as EpisodeKind[]) : []), ...(y >= 2 ? (['locust', 'weedsurge'] as EpisodeKind[]) : [])];
  placeThreat(pick(threatPool), firstWeek + 1, S1);
  if (y >= 3 && su >= 10) placeThreat(pick(threatPool), firstWeek + 1, S1);

  // autumn: an early frost, a market window
  if (rand(w) < 0.6) placeClimate('frost', A0 + 1, A1);
  if (rand(w) < 0.35) placeMarket(weighted<EpisodeKind>([['fair', 1], ['seeds', 0.6], ['glut', 0.6], ['export', 0.6]]), A0, A1);

  // winter: sometimes a thaw
  if (wi >= 3 && rand(w) < 0.4) placeClimate('thaw', W0 + 1, N);

  // the weeks the flock may use: free threat slots in summer after the first week
  const cands: number[] = [];
  for (let wk = firstWeek; wk <= S1; wk++) if (!eps.some((e) => covers(e, wk) && EPISODES[e.kind].row === 'threat')) cands.push(wk);
  shuffle(w, cands);
  for (const wk of cands.slice(0, y === 1 ? 2 : 4)) eps.push({ id: 0, kind: 'crows', start: wk, len: 1 });

  eps.sort((a, b) => a.start - b.start || a.kind.localeCompare(b.kind));
  eps.forEach((e, i) => (e.id = y * 1000 + i + 1));

  // temperatures: the base curve, a little noise, and the periods on top
  const temps: number[] = [];
  for (let wk = 1; wk <= N; wk++) {
    const { season, w: ws } = seasonOf(loc, wk);
    let t = baseTemp(loc, season, ws) + (rand(w) - 0.5) * 3;
    for (const e of eps) {
      if (!covers(e, wk)) continue;
      if (e.kind === 'warm') t += 4;
      if (e.kind === 'dry') t += 5;
      if (e.kind === 'rain') t -= 2;
      if (e.kind === 'thaw') t = Math.max(t, 1);
      if (e.kind === 'frost') t = Math.min(t, -2 - randInt(w, 2));
    }
    temps.push(Math.round(t));
  }
  return { episodes: eps, temps };
}
