import { AnimationClock } from './animationClock';
import type {PestHit} from '../engine/game';
import { useSceneQueue, chooseScene, finishScenes, completed, type SceneCue } from './useSceneQueue';
import { buildWeekPlayback, CALENDAR_MS, theftStagger, type WeekEvent } from './weekPlayback';
import {readWeekResume,saveWeekResume,clearWeekResume,type WeekResume} from './weekResume';
import { PrecisionLoupe } from './PrecisionLoupe';
import { greenhouseYieldReady } from '../engine/game';

import { exchangeProblem, compostProblem, compostWeeks, growthMoisture, frostKills, wetCanals, idx, thievesBlocked, handMax as maxHand, exchangesUsed, exchangesPerWeek, nextDraw, keepSlots, keptCount } from '../engine/game';
import type { JSX } from 'preact';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { CARDS, CROPS, GRID, ORGS, SEASON_NAMES, TRACKS, TRAITS } from '../engine/data';
import type { CropId, OrgId } from '../engine/data';
import {
  Action, Card, GameState, Tile, BuildItem, airTemp, beanGain, blockCells, buildSpots, buildStock, canBuyLand, canClear, cardBlockReason, cardCells,
  cardCost, cardDays, clearDays, clearPrice, cropGrow, cropMinT, crowsOpen, drawProblem, expectedYield, frostVictims, growNote, guardPrice, guardable,
  trackCost, trackWeeks, trackProblem, handMax, handWaterMax, isGuarded, knownEpisodes, landPrice, lineCells, locOf, lookahead, money, neighbors4, ownedTiles, pidCells, placementYield,
  plantBlock, plantingYield, playableTargets, plural, ripenIn, seasonLen, shapeRotations, shapeTiles, soilMult, soilTemp, sowingSoil, tile, waterArea,
  weekInfo, weekOutlook, weedsOnLine, yieldParts, cardNeedDays, cellReasons, sortiesPerSeason, weeklyDraw, episodesAt, mischiefOn, frostLimit, frostShield, lvl, deckCount, buildMoveSpots, winterCareTarget,
} from '../engine/game';
import { EPISODES } from '../engine/calendar';
import type { Episode } from '../engine/calendar';
import { Icon } from '../art/icons';
import { CropIcon } from '../art/crops';
import type { FarmerAction } from '../art/farm';
import { CardArt, CardView, PinIcon, cardPrice, seedWeeks } from './Card';
import { CardReadout } from './CardReadout';
import { CELL, FarmerPos, FarmerState, Flock, Floater, FxKind, Highlight, Lens, PAD, QueueMark, Scene, TileFx, FIELD_YARD, camera, farmerXY, BuildView, type SkyView } from './Scene';
import { skyTokens, raidSigns, fogText, type SkyToken, type SkyKind } from './skyForecast';
import { SkyPicture } from '../art/sky';
import { Btn, Dispatch, Sheet, weeksShort } from './common';
import { SeasonFx } from './SeasonFx';
import { FieldVoice } from './FieldVoice';
import {OrderVisit} from './OrderVisit';
import { BedPopover } from './BedPopover';
import { morningCellDelay, type MorningStep } from './Morning';
import { kidsScouting, kidsAhead } from './foresight';
import {killers,kidMisses} from './collisions';
import { workEffectCells, workCardPreview } from '../engine/game';
export const TOUCH_AIM_OFFSET = 60;
// a rail of tools beside the field: up to a 42-px button and its gaps, at least a 34-px one
const RAIL_W = 52, RAIL_MIN = 44;

interface Step { pos: FarmerPos; action: FarmerAction; bubble?: string | null; reveal?: string[]; actMs?: number; fx?: { x: number; y: number; kind: FxKind }[]; mark?: string }
const HOME: FarmerPos = { kind: 'home' };
const IDLE: FarmerState = { pos: HOME, walking: false, action: 'idle', facing: 1, ms: 0, bubble: null };
const key = (x: number, y: number) => `${x},${y}`;
let floaterKey = 1;
let fxKey = 1;
export function reducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
function changedTiles(a: GameState, b: GameState): string[] {
  const out: string[] = [];
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (JSON.stringify(tile(a, x, y)) !== JSON.stringify(tile(b, x, y))) out.push(key(x, y));
  return out;
}
function walkOrder(cells: [number, number][]): [number, number][] {
  const left = [...cells];
  const path: [number, number][] = [];
  let cur = left.sort((a, b) => a[0] + a[1] - b[0] - b[1])[0];
  while (left.length) {
    left.sort((p, q) => Math.abs(p[0] - cur[0]) + Math.abs(p[1] - cur[1]) - (Math.abs(q[0] - cur[0]) + Math.abs(q[1] - cur[1])));
    cur = left.shift()!;
    path.push(cur);
  }
  return path;
}
function planFor(a: Action, prev: GameState, next: GameState): Step[] {
  const changed = changedTiles(prev, next);
  const at = (x: number, y: number, action: FarmerAction, kind: FxKind | null, ms = 700, last = true): Step => ({ pos: { kind: 'tile', x, y }, action, reveal: last ? changed : [key(x, y)], actMs: ms, fx: kind ? [{ x, y, kind }] : [] });
  switch (a.t) {
    case 'play': {
      const def = prev.hand.find((c) => c.uid === a.uid)?.def;
      if (!def) return [];
      const d = CARDS[def];
      if (d.kind === 'seed') {
        const order = walkOrder(a.tiles ?? []);
        return order.map(([x, y], i) => at(x, y, 'plant', 'seed', 480, i === order.length - 1));
      }
      if (d.target === 'none') return [{ pos: HOME, action: def === 'sidejob' ? 'build' : 'paper', bubble: def === 'sidejob' ? 'coin' : def === 'forage' ? 'forage' : 'star', reveal: changed, actMs: 800 }];
      if (d.target === 'line' || d.target === 'row') {
        const cells = (a.row !== undefined ? lineCells('row', a.row) : lineCells('col', a.col!)).filter(([x, y]) => changed.includes(key(x,y)));
        return cells.map(([x, y], i) => at(x, y, 'care', def === 'weeding' && tile(prev, x, y).weeds ? 'weed' : def === 'care' ? 'care' : null, 260, i === cells.length - 1));
      }
      const [x, y] = a.tiles?.[0] ?? [0, 0];
      const act: FarmerAction = def === 'early' ? 'harvest' : def === 'water' ? 'water' : def === 'fertilizer' ? 'fertilizer' : def === 'mulch' ? 'mulch' : 'care';
      const kind: FxKind = def === 'water' ? 'water' : def === 'fertilizer' || def === 'compost' || def === 'bio' ? 'fert' : def === 'mulch' || def === 'shelter' ? 'mulch' : def === 'early' ? 'harvest' : 'care';
      const area = changed.map((k) => k.split(',').map(Number) as [number, number]);
      return [{ pos: { kind: 'tile', x, y }, action: act, reveal: changed, actMs: 850, fx: (area.length ? area : [[x, y] as [number, number]]).map(([a2, b2]) => ({ x: a2, y: b2, kind })) }];
    }
    case 'waterHand':
      return a.tiles.map(([x, y], i) => at(x, y, 'water', 'water', 480, i === a.tiles.length - 1));
    case 'weed':
      return [at(a.x, a.y, 'care', 'weed', 650)];
    case 'plow':
      return [at(a.x, a.y, 'care', 'fert', 700)];
    case 'guard':
      return [at(a.x, a.y, 'build', 'shield', 700)];
    case 'clear':
    case 'buyLand':
    case 'build':
      return [at(a.x, a.y, 'build', 'build', 900)];
    case 'moveBuild':
      return [at(a.to[0], a.to[1], 'build', 'build', 650)];
    default:
      return changed.length ? [{ pos: HOME, action: 'idle', reveal: changed, actMs: 150 }] : [];
  }
}

// ---------- the weather plate ----------
function weatherOf(s: GameState, offset: number): { icon: string; name: string; temp: number; eps: Episode[] } {
  const info = weekInfo(s, offset);
  const eps = (offset === 0 ? episodesAt(s, info.absWeek) : knownEpisodes(s).filter((e) => e.start <= info.absWeek && e.start + e.len - 1 >= info.absWeek)).filter((e) => e.kind !== 'crows');
  const clim = eps.find((e) => EPISODES[e.kind].row === 'climate');
  const temp = info.temp;
  const strike=s.strikes.find(st=>st.week===info.absWeek&&(st.kind==='hail'||st.kind==='flood'));
  if(strike)return {icon:strike.kind,name:strike.kind==='hail'?'Град':'Паводок',temp,eps};
  if (clim) return { icon: EPISODES[clim.kind].icon, name: EPISODES[clim.kind].name, temp, eps };
  if (info.season === 3) return { icon: 'snow', name: 'Зима', temp, eps };
  if (temp >= 26) return { icon: 'heat', name: 'Жарко', temp, eps };
  if (temp >= 15) return { icon: 'sun', name: 'Ясно', temp, eps };
  return { icon: 'cloud', name: temp < 6 ? 'Холодно' : 'Прохладно', temp, eps };
}
const tStr = (t: number) => `${t > 0 ? '+' : ''}${t}°`;
function Thermo({ t }: { t: number }) {
  const k = Math.max(0, Math.min(1, (t + 20) / 55));
  const col = t <= 0 ? '#3f7fbf' : t < 10 ? '#7fb2e6' : t < 26 ? '#e0473a' : '#d9530f';
  return (
    <svg viewBox="0 0 24 64" width={18} height={48} aria-hidden="true" class="thermo">
      <rect x={7} y={3} width={10} height={46} rx={5} fill="#fff" stroke="#3f2a1d" stroke-width={2} />
      <rect x={10} y={6 + 40 * (1 - k)} width={4} height={40 * k + 6} fill={col} />
      <circle cx={12} cy={54} r={8} fill={col} stroke="#3f2a1d" stroke-width={2} />
      <path d="M17 16 h4 M17 28 h4 M17 40 h4" stroke="#3f2a1d" stroke-width={1.4} />
    </svg>
  );
}
function WeatherPlate({ s, onOpen }: { s: GameState; onOpen: () => void }) {
  const now = weatherOf(s, 0);
  const next = weatherOf(s, 1);
  return (
    <button type="button" class="weather-instrument" onClick={onOpen} aria-label={`Погода: сейчас ${tStr(now.temp)}, ${now.name}. ${['hail','flood'].includes(now.icon)?'Удар к концу этой недели. ':''}Следующая неделя ${tStr(next.temp)}, ${next.name}. Открыть прогноз`}>
      <Icon name={now.icon} size={25}/>{['hail','flood'].includes(now.icon)&&<small class="instrument-alert">{now.name}</small>}<Thermo t={now.temp}/><b>{tStr(now.temp)}</b>
      <span class="instrument-next"><small>далее</small><Icon name={next.icon} size={18}/><b>{tStr(next.temp)}</b></span>
    </button>
  );
}

function ForecastSheet({ s, onClose }: { s: GameState; onClose: () => void }) {
  const n = Math.max(2, lookahead(s) + 1);
  const eps = knownEpisodes(s);
  return (
    <Sheet title="Погода и приборы" icon="thermo" variant="info" onClose={onClose}>
      <div class="forecast-rows">
        {Array.from({ length: n }, (_, k) => {
          const w = weatherOf(s, k);
          const info = weekInfo(s, k);
          return (
            <div class={`fc-row${k === 0 ? ' now' : ''}`}>
              <span class="fc-when">{k === 0 ? 'Эта неделя' : k === 1 ? 'Следующая' : `Через ${k} нед.`}<small>{SEASON_NAMES[info.season].toLowerCase()}, {info.weekInSeason}-я</small></span>
              <Icon name={w.icon} size={28} />
              <b class="fc-temp">{tStr(w.temp)}</b>
              <span class="fc-name">{w.eps.filter((e) => e.kind !== 'helpers').map((e) => EPISODES[e.kind].name).join(', ') || w.name}</span>
            </div>
          );
        })}
      </div>
      {eps.length > 0 && (
        <div class="stack tight">
          <h4>Что известно</h4>
          {eps.map((e) => (
            <p class={`ep-line tone-${EPISODES[e.kind].bad ? 'bad' : 'good'}`}>
              <Icon name={EPISODES[e.kind].icon} size={18} /> <b>{EPISODES[e.kind].name}</b>
              {e.crop ? ` (${CROPS[e.crop].name.toLowerCase()})` : ''} — {e.start > s.absWeek ? `через ${e.start - s.absWeek} нед.` : 'сейчас.'} {EPISODES[e.kind].text}
            </p>
          ))}
        </div>
      )}
      <p class="note small">
        Здесь — температура воздуха. Температуру каждой грядки показывает линза. Минимум для роста указан на карте культуры.
      </p>
    </Sheet>
  );
}

// ---------- the summary chips: what happened, what burns ----------
interface Chip { text: string; tone: 'good' | 'bad' | 'info'; icon: string }
function summary(s: GameState): Chip[] {
  const out: Chip[] = [];
  const r = s.lastReport;
  if (r) {
    const q = r.harvests.reduce((a, h) => a + h.qty, 0);
    if (q) out.push({ text: `+${q} ед. урожая`, tone: 'good', icon: 'sack' });
    if (r.frost) out.push({ text: `мороз −${r.frost}`, tone: 'bad', icon: 'frost' });
    if (r.dried) out.push({ text: `засохло ${r.dried}`, tone: 'bad', icon: 'drop' });
    if (r.stolen) out.push({ text: `украли с ${r.stolen}`, tone: 'bad', icon: 'kids' });
    const other = r.lost.filter((l) => !/^(Мороз|Засохли|Утащили)/.test(l));
    for (const l of other.slice(0, 2)) {
      const short = l.replace(/ \(.*\)$/, '').replace('срок заказа вышел', 'заказ сгорел');
      out.push({ text: short.length > 26 ? `${short.slice(0, 25)}…` : short, tone: 'bad', icon: 'down' });
    }
    if (r.yardSold) out.push({ text: `автосбыт +${money(r.yardSold)}`, tone: 'bad', icon: 'coin' });
    if (r.done.length) out.push({ text: r.done[0].split(':')[0], tone: 'good', icon: 'build' });
    if (r.honey) out.push({ text: `мёд +${r.honey}`, tone: 'good', icon: 'hive' });
  }
  for (const o of locOf(s).orgs) {
    const q = s.orgs[o]?.active;
    if (q && q.deadline !== undefined && q.deadline - s.absWeek <= 1) out.push({ text: `${ORGS[o].short}: срок ${q.deadline - s.absWeek <= 0 ? 'сегодня' : 'неделя'}`, tone: 'bad', icon: 'orders' });
  }
  if (s.yard.length) out.push({ text: `во дворе ${s.yard.reduce((a, l) => a + l.qty, 0)} ед.`, tone: 'bad', icon: 'barn' });
  return out;
}
// The farm journal opens like a book. Two equal leaves (a leather board with a page each)
// meet at the spine. The closed book shows only the front cover; it swings over the spine and
// lands as the left leaf — its inside already carries the left page, so no page is ever blank.
// Phones show one leaf at a time and switch them with ribbon bookmarks.
type JournalPage = 'now' | 'log';
function SproutDoodle() {
  return <svg class="book-doodle" viewBox="0 0 48 40" aria-hidden="true"><path d="M6 36 Q24 31 42 36" fill="none" stroke="#8a6440" stroke-width="1.6" stroke-linecap="round"/><path d="M24 35 V20 M24 25 Q14 24 12 14 Q22 13 24 25 M24 21 Q31 12 40 13 Q38 23 24 21" fill="#d5e9b5" stroke="#6e5038" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>;
}
const WHEAT = <svg class="cover-emblem" viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="26" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="30" cy="30" r="22" fill="none" stroke="currentColor" stroke-width=".8" stroke-dasharray="2 2.4"/><path d="M30 48 V16 M30 22 q-7 -2 -8 -9 q7 1 8 9 M30 22 q7 -2 8 -9 q-7 1 -8 9 M30 30 q-7 -2 -8 -9 q7 1 8 9 M30 30 q7 -2 8 -9 q-7 1 -8 9 M30 38 q-7 -2 -8 -9 q7 1 8 9 M30 38 q7 -2 8 -9 q-7 1 -8 9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>;
interface JournalCtx { s: GameState; act: Dispatch; onGo: (tab: string) => void; onClose: () => void; outlook: ReturnType<typeof weekOutlook> | null }
function journalFlags({ s, outlook }: JournalCtx) {
  const deadlines = summary(s).filter(c => c.icon === 'orders');
  const thievesNow = s.thieves?.week === s.absWeek && !s.thieves.talked && !thievesBlocked(s);
  const scouting = kidsScouting(s);
  const risky = !!outlook && (outlook.frost > 0 || outlook.dying > 0 || outlook.threats.some(t => t.guard !== 'дрон'));
  const quiet = !crowsOpen(s) && !thievesNow && !scouting && !s.yard.length && !deadlines.length && !risky;
  return { deadlines, thievesNow, scouting, risky, quiet };
}
function JournalNow(c: JournalCtx & {compact?:boolean}) {
  const { s, act, onGo, onClose, outlook } = c;
  const { deadlines, thievesNow, scouting, risky, quiet } = journalFlags(c);
  return (
    <section class="book-page page-now" aria-label="Эта неделя">
      <p class="page-date">{SEASON_NAMES[s.season]} · {s.weekInSeason}-я неделя из {seasonLen(s)} · {s.year}-й год</p>
      <h3 class="page-title">Эта неделя</h3>
      {quiet && <div class="book-calm"><SproutDoodle /><p>Срочных дел нет. Можно спокойно сажать и ухаживать за грядками.</p></div>}
      {deadlines.map(d => <p class="ink-line bad" key={d.text}>{d.text}</p>)}
      {s.weekInSeason === seasonLen(s) && <p class="ink-line">После этой недели сменится сезон. Отложенные карты останутся в руке, остальные уйдут в колоду.</p>}
      {crowsOpen(s) && <div class="book-note"><Icon name="crow" size={30} /><div class="grow"><b>Вороны на поле</b><p>Задержат рост молодых всходов или поклюют созревающий урожай. Теплицы и пугала защищают.</p></div><div class="book-acts"><Btn small disabled={s.days < 1 ? 'Нужен рабочий день' : null} onClick={() => act({ t: 'shoo' })}>Отогнать · 1 д.</Btn>{sortiesPerSeason(s) > s.dronesUsed && <Btn small onClick={() => act({ t: 'droneCrows' })}>Дрон</Btn>}</div></div>}
      {risky && outlook && <div class="book-note"><Icon name="thermo" size={28} /><div class="grow"><b>К концу этой недели</b>{outlook.frost > 0 && <p class="bad">Мороз угрожает {outlook.frost} грядкам. Проверьте укрытия.</p>}{outlook.dying > 0 && <p class="bad">Без полива погибнет {outlook.dying} грядок.</p>}{outlook.threats.map(t => <p class={t.guard === 'дрон' ? 'up' : 'bad'}>{t.name}: {t.beds} гр. · {t.guard === 'дрон' ? 'защитит дрон' : t.guard ? 'урожай пострадает; страховка выплатит деньги' : 'нужна защита'}.</p>)}</div><div class="book-acts"><Btn small onClick={onClose}>На поле</Btn></div></div>}
      {scouting && <div class="book-note"><Icon name="kids" size={28} /><div class="grow"><b>У поля крутятся дети</b><p>{thievesBlocked(s) ? 'Ребята из интерната приглядываются к спелым грядкам, но пёс и сторож их не подпустят.' : 'Ребята из интерната приглядываются к спелым грядкам. На следующей неделе могут прийти за урожаем — укройте грядки или заведите пса либо сторожа.'}</p></div></div>}
      {thievesNow && <div class="book-note"><Icon name="kids" size={28} /><div class="grow"><b>У поля чужие следы</b><p>Кто-то присматривается к урожаю. Можно поговорить заранее.</p></div><div class="book-acts"><Btn small disabled={s.days < 1 ? 'Нужен рабочий день' : null} onClick={() => act({ t: 'talkKids' })}>Поговорить · 1 д.</Btn></div></div>}
      {s.yard.length > 0 && <div class="book-note"><Icon name="barn" size={28} /><div class="grow"><b>Урожай во дворе</b><p>{s.yard.reduce((a, l) => a + l.qty, 0)} ед. ждут места в амбаре.</p></div><div class="book-acts"><Btn small onClick={() => { onClose(); onGo('barn'); }}>В амбар</Btn></div></div>}
      {!c.compact&&<><h4 class="page-sub">В хозяйстве</h4>
      <dl class="book-ledger">
        <div><dt>Рабочих дней</dt><dd>{s.days}</dd></div>
        <div><dt>В кассе</dt><dd>{money(s.money)}</dd></div>
        <div><dt>Воздух</dt><dd>{airTemp(s) > 0 ? '+' : ''}{airTemp(s)}°</dd></div>
        <div><dt>Засеяно грядок</dt><dd>{s.tiles.filter(t => t.owned && t.crop).length} из {s.tiles.filter(t => t.owned && !t.canal).length}</dd></div>
        <div><dt>Карт в руке</dt><dd>{s.hand.length} из {handMax(s)}</dd></div>
      </dl></>}
      {s.season === 3 && <p class="ink-line muted">До весны: {seasonLen(s) - s.weekInSeason + 1} нед.{s.projects.length ? ` Ближайший проект завершится через ${Math.min(...s.projects.map(p => p.weeks))} нед.` : ''} Зарплаты и проценты продолжают начисляться.</p>}
    </section>
  );
}
function JournalLog({ s }: { s: GameState }) {
  const r = s.lastReport;
  const harvest = r ? [...r.harvests.reduce((m, h) => m.set(h.crop, (m.get(h.crop) ?? 0) + h.qty), new Map<CropId, number>())] : [];
  const weeks = new Map<number, typeof s.feed>();
  for (const f of [...s.feed].reverse().slice(0, 40)) { const w = weeks.get(f.week) ?? []; w.push(f); weeks.set(f.week, w); }
  const ago = (w: number) => w >= s.absWeek ? 'Эта неделя' : w === s.absWeek - 1 ? 'Прошлая неделя' : `${s.absWeek - w} нед. назад`;
  return (
    <section class="book-page page-log" aria-label="Итоги и летопись">
      <h3 class="page-title">Прошлая неделя</h3>
      {!r && <p class="ink-line muted">Первая неделя: итогов пока нет. Они появятся здесь, когда вы завершите неделю.</p>}
      {r && <>
        {harvest.length > 0 ? <ul class="book-harvest">{harvest.map(([c, q]) => <li><CropIcon id={c} size={24} /><span>{CROPS[c].name}</span><b>+{q}</b></li>)}</ul> : <p class="ink-line muted">Урожай не собирали.</p>}
        {r.overflow > 0 && <p class="ink-line bad">Не влезло в амбар: {r.overflow} ед. стоят во дворе неделю.</p>}
        {r.lost.map((l) => <p class="ink-line bad">{l}</p>)}
        {r.done.map((l) => <p class="ink-line up">{l}</p>)}
        {!!r.insurancePaid && <p class="ink-line up">Страховая выплата: +{money(r.insurancePaid)}</p>}
        {r.costs.length > 0 && <p class="ink-line muted">Списано: {r.costs.map((c) => `${c.label} ${money(c.amount)}`).join(', ')}</p>}
      </>}
      <h3 class="page-title log-title">Летопись</h3>
      {!weeks.size && <p class="ink-line muted">Записей пока нет.</p>}
      <ol class="book-log">
        {[...weeks].map(([w, items]) => <li><span class="log-week">{ago(w)}</span>{items.map((f) => <p class={`ink-line tone-${f.tone}`}>{f.text}</p>)}</li>)}
      </ol>
    </section>
  );
}
let bookOpenedOnce = false;
function JournalSheet({ s, act, onGo, onClose }: { s: GameState; act: Dispatch; onGo: (tab: string) => void; onClose: () => void }) {
  const outlook = useMemo(() => s.phase === 'week' ? weekOutlook(s) : null, [s]);
  const ctx: JournalCtx = { s, act, onGo, onClose, outlook };
  const [page, setPage] = useState<JournalPage>(() => journalFlags(ctx).quiet && s.lastReport ? 'log' : 'now');
  const [history,setHistory]=useState(false);
  // №13 · the cover opens with ceremony once per session; after that the book is simply open
  const [opened, setOpened] = useState(() => bookOpenedOnce || matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => { if (!history) return; const t = window.setTimeout(() => { setOpened(true); bookOpenedOnce = true; }, 1600); return () => clearTimeout(t); }, [history]);
  if(!history)return <Sheet title="Журнал фермы" icon="journal" variant="info" onClose={onClose}><div class="journal-quick"><JournalNow {...ctx} compact/><Btn tone="ghost" onClick={()=>setHistory(true)}>Открыть летопись</Btn></div></Sheet>;
  const tabs: [JournalPage, string][] = [['now', 'Эта неделя'], ['log', 'Итоги и летопись']];
  return (
    <Sheet title="Журнал фермы" icon="journal" variant="book" onClose={onClose}>
      <div class={`book${opened ? ' opened' : ''}`} data-page={page}>
        <nav class="book-ribbons" aria-label="Разделы журнала">
          {tabs.map(([id, name]) => <button type="button" class={`ribbon r-${id}${page === id ? ' on' : ''}`} aria-pressed={page === id} onClick={() => setPage(id)}>{name}</button>)}
        </nav>
        <div class="book-spread">
          <div class="leaf leaf-left"><div class="leaf-page"><JournalNow {...ctx} /></div></div>
          <div class="leaf leaf-right"><div class="leaf-page"><JournalLog s={s} /></div></div>
          {!opened && <div class="book-cover" aria-hidden="true" onAnimationEnd={(e) => { if (e.animationName === 'cover-open' || e.animationName === 'cover-open-phone') setOpened(true); }}>
            <div class="cover-front">{WHEAT}<b>Журнал фермы</b><small>{s.year}-й год</small></div>
            <div class="cover-back" inert><div class="leaf leaf-left"><div class="leaf-page"><JournalNow {...ctx} /></div></div></div>
          </div>}
        </div>
      </div>
    </Sheet>
  );
}

// ---------- the bed panel ----------
const NOTE_TEXT: Record<string, string> = {
  dry: 'сухо — без воды не растёт, вторую сухую неделю не переживёт',
  cold: 'холодно — почва не прогрелась до минимума культуры',
  hot: 'жарко — культура стоит, пока не спадёт жара',
  flood: 'рису нужна полная влага: 3/3. Канал поддерживает её автоматически',
  dormant: 'зимует под снегом',
  rest: 'отплодоносило, отдыхает до весны',
};
function TileDetails({ s, x, y, act, onClose }: { s: GameState; x: number; y: number; act: Dispatch; onClose: () => void }) {
  const t = tile(s, x, y);
  const doIt = (a: Action) => {
    if (act(a)) onClose();
  };
  const p = t.crop;
  const soilT = soilTemp(s, x, y);
  if (!t.owned) {
    const buy = canBuyLand(s, x, y);
    const clear = canClear(s, x, y);
    return (
      <div class="tile-details">
        <div class="ts-head">
          <b>{t.terrain === 'forest' ? 'Тайга' : t.terrain === 'river' ? 'Река' : 'Чужой участок'}</b>
        </div>
        {clear && <Btn tone="primary" disabled={s.season === 3 ? 'Зимой корчевать нельзя' : s.days < clearDays(s, x, y) ? 'Не хватает дней' : null} onClick={() => doIt({ t: 'clear', x, y })}>Раскорчевать · {clearDays(s, x, y)} дн. · {money(clearPrice(s, x, y))}</Btn>}
        {buy && <Btn tone="primary" disabled={s.money < landPrice(s) ? `Нужно ${money(landPrice(s))}` : null} onClick={() => doIt({ t: 'buyLand', x, y })}>Купить участок · {money(landPrice(s))}</Btn>}
        {!buy && !clear && <p class="small muted">Сюда не расшириться: участок должен граничить с вашим полем.</p>}
      </div>
    );
  }
  const note = p ? growNote(s, x, y) : null;
  const k = p ? ripenIn(s, x, y, { knownOnly: true }) : null;
  const parts = p ? yieldParts(s, x, y, p.id) : [];
  return (
    <div class="tile-details">
      <div class="ts-head">
        {p && <CropIcon id={p.id} size={34} />}
        <b>{p ? CROPS[p.id].name : t.weeds ? 'Сорняки' : t.canal ? 'Канал' : t.terrain === 'rock' ? 'Камни' : t.terrain === 'swamp' ? 'Болото' : 'Пустая грядка'}</b>
        {p?.traits?.map((tr) => <span class="tag">{TRAITS[tr].short}</span>)}
      </div>
      <div class="ts-grid">
        <span><Icon name="drop" size={16} /> вода {t.moisture}/3{t.mulch > 0 ? ' · мульча' : ''}{t.drip ? ' · капельный' : ''}</span>
        <span><Icon name="compost" size={16} /> плодородие {t.soil}/5 · урожай ×{String(soilMult(t.soil)).replace('.', ',')}</span>
        <span><Icon name="thermo" size={16} /> почва {tStr(soilT)}{p ? ` · нужно от ${tStr(cropMinT(p.id, p.traits))}` : ''}</span>
        {p && <span><Icon name="calendar" size={16} /> {p.rest ? 'отдыхает до весны' : k === null ? 'срок пока неясен' : k === 0 ? 'созреет в конце недели' : `созреет ≈через ${k + 1} нед.`} · ≈{expectedYield(s, x, y)} ед.</span>}
        {p && <span><Icon name="frost" size={16} /> гибнет при {tStr(frostLimit(p) - frostShield(s, t))} и ниже</span>}
      </div>
      {t.structure==='greenhouse' && !greenhouseYieldReady(s,t) && (lvl(s,'greenhouse')>=4 || s.team.some(w=>w.id==='greenhouser'&&w.away<=0)) && <p class="small muted">Защита уже работает. Бонус урожая — со следующей недели.</p>}
      {p && frostKills(s,x,y) && <p class="small bad">Не переживёт заморозок этой недели. Нужно укрытие или ранний сбор.</p>}
      {p && !note && <p class="small up">На этой неделе будет расти.{t.structure==='greenhouse' ? ' Теплица защищает и от перегрева.' : ''}</p>}
      {p && growthMoisture(s)[idx(x,y)]!==t.moisture && <p class="small">До роста дождь и орошение дадут влагу {growthMoisture(s)[idx(x,y)]}/3.</p>}
      {t.canal && !wetCanals(s).has(idx(x,y)) && <p class="small bad">Сухой канал: восстановите соединение с рекой.</p>}
      {note && <p class={`ts-note${note === 'dormant' || note === 'rest' ? '' : ' bad'}`}>{note === 'dry' ? `Без воды не растёт. ${(p?.dry??0)+1 >= (p?.traits?.includes('drought')?3:2) ? 'Без полива погибнет в конце этой недели.' : `Сухих недель подряд: ${(p?.dry??0)+1} из ${p?.traits?.includes('drought')?3:2}.`}` : NOTE_TEXT[note]}</p>}
      {parts.some(q=>!q.label.startsWith('плодородие')) && <p class="small muted">Бонусы: {parts.filter(q=>!q.label.startsWith('плодородие')).map((q) => `${q.label} ×${String(q.mult).replace('.', ',')}`).join(' · ')}</p>}
      {p && k !== null && <p class="small muted">Срок — при поливе, с учётом известной погоды.</p>}
      <div class="ts-actions">
        {t.weeds && <Btn small tone="primary" disabled={s.days < 1 ? 'Нет рабочих дней' : null} onClick={() => doIt({ t: 'weed', x, y })}>Прополоть · 1 день</Btn>}
        {guardable(s, x, y) && <Btn small tone="primary" disabled={s.days < 1 || s.money < guardPrice(s) ? 'Нужен день и деньги' : null} onClick={() => doIt({ t: 'guard', x, y })}>Защитить · 1 день · {money(guardPrice(s))}</Btn>}
        {isGuarded(s, x, y) && <span class="tag good">под защитой</span>}
        {p && CROPS[p.id].sidereal && p.grown >= 2 && s.season !== 3 && <Btn small disabled={s.days < 1 ? 'Нет рабочих дней' : null} onClick={() => doIt({ t: 'plow', x, y })}>Запахать всю посадку: почва +1</Btn>}
        {canClear(s, x, y) && <Btn small disabled={s.days < 1 ? 'Нет рабочих дней' : null} onClick={() => doIt({ t: 'clear', x, y })}>{t.terrain === 'rock' ? 'Убрать камни' : 'Осушить'} · {money(clearPrice(s, x, y))}</Btn>}
      </div>
    </div>
  );
}

// ---------- the build palette ----------
const BUILD_NAMES: Record<BuildItem, { name: string; icon: string; track: string; place: string }> = {
  greenhouse: { name: 'Теплица', icon: 'greenhouse', track: 'greenhouse', place: 'свободная грядка' },
  hive: { name: 'Улей', icon: 'hive', track: 'apiary', place: 'пустая грядка' },
  drip: { name: 'Капельный полив', icon: 'drip', track: 'irrigation', place: 'ряд' },
  scarecrow: { name: 'Пугало', icon: 'scarecrow', track: 'guard', place: 'стык 4 грядок' },
  canal: { name: 'Канал', icon: 'canal', track: 'canal', place: 'у реки или канала' },
};

// ---------- the fan of cards ----------
export const FAN_PIVOT = 2.2;
// the browsed card lifts clearly but stays below the dock, where its full name and facts are read
const PEEK_SCALE = 1.04;
// `grow` — extra card width the screen can afford (see the room planner in FieldView)
function fanLayout(width: number, n: number, selected: number, peek = -1, short = false, grow = 0) {
  // five cards at most: a phone fan stays compact and leaves the height to the field
  const base = (short ? 86 : width < 340 ? 90 : width < 420 ? 98 : width < 700 ? 112 : 122) + grow;
  const fit = n > 1 ? Math.floor((width - 8) / (1 + (n - 1) * 0.86)) : base;
  const cw = Math.max(base - 8, Math.min(base, fit));
  const h = cw * 1.4;
  const pivot = FAN_PIVOT * h;
  const natural = cw + 8;
  const span = Math.max(0, width - cw - 8);
  const step = n > 1 ? Math.min(natural, span / (n - 1)) : 0;
  const overlap = n > 1 ? Math.max(0, Math.min(1, (cw - step) / (cw * 0.6))) : 0;
  const per = n > 1 ? Math.min(4, Math.max(1.5, 1.5 + 2.5 * overlap), 22 / (n - 1)) : 0;
  const first = (width - step * Math.max(0, n - 1)) / 2;
  const mid = (n - 1) / 2;
  const slots = Array.from({ length: n }, (_, i) => {
    const cx = first + i * step;
    const fanRot = (i - mid) * per;
    const left = cx - cw / 2 - pivot * Math.sin((fanRot * Math.PI) / 180);
    const isPeek = i === peek, out = isPeek || i === selected;
    const grow = isPeek ? (cw * (PEEK_SCALE - 1)) / 2 : 0;
    const straight = Math.max(grow, Math.min(width - cw - grow, cx - cw / 2));
    return { cx, left, rot: out ? 0 : fanRot, tx: out ? straight - left : 0, dy: isPeek ? -8 : i === selected ? -14 : 0, sc: isPeek ? PEEK_SCALE : 1, z: isPeek ? 70 : i === selected ? 60 : 10 + i };
  });
  const sink = n > 1 ? Math.ceil(pivot * (1 - Math.cos((mid * per * Math.PI) / 180)) + (cw / 2) * Math.sin((mid * per * Math.PI) / 180)) : 0;
  return { cw, slots, sink, tight: step < cw * 0.7 };
}
type FanSlot = ReturnType<typeof fanLayout>['slots'][number];
interface Drag { uid: number; sx: number; sy: number; x: number; y: number; active: boolean; touch: boolean }
/** How a finger on the fan is read. `wait` — no intent yet; `browse` — sliding along the fan, the card under the
 *  finger lifts; `lift` — the finger went up, and the card it holds is fixed until it is let go. */
type FanIntent = 'wait' | 'browse' | 'lift';
// distances in CSS px; the same rules in the lesson and in ordinary play
const INTENT_DEAD = 10, BROWSE_RATIO = 2, LIFT_RISE = 22;

// A calendar page; the coming week's page carries what is already known about it: its sky and the raids on the way.
interface CalPage { season: string; num: string; sub: string; winter: boolean; of: number; sky?: SkyKind; temp?: number; signs: string[]; bad: string[] }
const SKY_BAD: Partial<Record<SkyKind, string>> = { hail: 'град', flood: 'паводок', frost: 'заморозок', dry: 'засуха' };
function calendarPage(s: GameState, offset: number): CalPage {
  const i = weekInfo(s, offset);
  const of = seasonLen(s, i.season);
  const page: CalPage = { season: `${SEASON_NAMES[i.season]} · ${i.year}-й год`, num: String(i.weekInSeason), sub: `неделя из ${of}`, winter: i.season === 3, of, signs: [], bad: [] };
  if (offset > 0) {
    const tok = skyTokens(s)[offset];
    if (tok) { page.sky = tok.kind; page.temp = tok.temp; if (SKY_BAD[tok.kind]) page.bad.push(SKY_BAD[tok.kind]!); }
    const abs = s.absWeek + offset;
    const add = (icon: string, word: string) => { if (!page.signs.includes(icon)) { page.signs.push(icon); page.bad.push(word); } };
    if (s.crowWarn?.includes(abs)) add('crow', 'вороны');
    if (s.kidsWarn?.includes(abs) && !thievesBlocked(s)) add('kids', 'дети за урожаем');
    for (const st of s.strikes) if (st.week === abs) {
      if (st.kind === 'beetle') add('beetle', 'жуки');
      if (st.kind === 'locust') add('locust', 'саранча');
      if (st.kind === 'weedsurge') add('weeds', 'сорняки');
    }
  }
  return page;
}

export function FieldView({ s, dispatch, fast, active, onGo, onOrder, onPayment, placeRequest, testing=false, teaching=false, precheck, lessonVisit=false, onVisitDone }: { s: GameState; dispatch: Dispatch; fast: boolean; active: boolean; onGo: (tab: string) => void; onOrder?:(org:OrgId)=>void; onPayment?:()=>void; placeRequest?: { item: BuildItem; key: number } | null; testing?:boolean; teaching?:boolean; precheck?:(a:Action)=>string|null; lessonVisit?:boolean; onVisitDone?:()=>void }) {
  const [resume]=useState(()=>testing||teaching?null:readWeekResume(s));
  const playbackRecord=useRef<WeekResume|null>(resume);
  const playbackTimer=useRef<number|null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [rot, setRot] = useState(0);
  const rotRef = useRef(0);
  rotRef.current = rot;
  const [hover, setHover] = useState<string | null>(null);
  const [info, setInfo] = useState<[number, number] | null>(null);
  // 'card' — the exchange picks a card; 'compost' — the ready compost takes the place of a card in a full hand
  const [exchanging,setExchanging]=useState<false|'card'|'compost'>(false);
  const [compostOpen,setCompostOpen]=useState(false);
  const [compostPulse,setCompostPulse]=useState(0);
  const [overCompost,setOverCompost]=useState(false);
  const [compostAt,setCompostAt]=useState<{top:number;right:number;tip:number}|null>(null);
  const [meetingOpen,setMeetingOpen]=useState(false);
  const [pestHits,setPestHits]=useState<PestHit[]>([]);
  const [weekPlaying,setWeekPlaying]=useState(!!resume);
  const [weekCue,setWeekCue]=useState<SceneCue|null>(null);
  const [morning,setMorning]=useState<MorningStep|null>(null);
  const pendingEvents=useRef<WeekEvent[]>([]);
  const pendingHarvest=useRef<{prev:GameState;next:GameState;rm:boolean}|null>(null);
  const morningTimers=useRef<number[]>([]);
  const morningHeld=useRef<Set<string>>(new Set());
  const [compostFlight,setCompostFlight]=useState<{card:Card;x:number;y:number;dx:number;dy:number;claim:boolean}|null>(null);
  const [compostArrival,setCompostArrival]=useState<number|null>(null);
  const [sheet, setSheet] = useState<'forecast' | 'journal' | 'bed' | null>(null);
  const [details, setDetails] = useState<[number,number] | null>(null);
  const [watering, setWatering] = useState<[number,number][] | null>(null);
  const [lensMenu, setLensMenu] = useState(false);
  const [layers, setLayers] = useState<[number,number] | null>(null);
  function closeContext() { setInfo(null); setWatering(null); setLayers(null); }
  function openSheet(next: 'forecast' | 'journal') { closeContext(); setLensMenu(false); setSheet(next); }
  useEffect(() => { if (!info) setWatering(null); }, [info]);
  const [lens, setLens] = useState<Lens>(null);
  const [build, setBuild] = useState<BuildItem | null | 'menu'>(null);
  const [moveFrom, setMoveFrom] = useState<[number, number] | null>(null);
  const [farmer, setFarmerState] = useState<FarmerState>(IDLE);
  const [hidden, setHidden] = useState<Map<string, Tile>>(() => new Map(resume?.hidden));
  const hiddenRef=useRef(hidden);hiddenRef.current=hidden;
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [tileFx, setTileFx] = useState<TileFx[]>([]);
  const [marks, setMarks] = useState<Map<string, QueueMark>>(() => new Map());
  const [drag, setDrag] = useState<Drag | null>(null);
  const [peek, setPeek] = useState<number | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [px, setPx] = useState(0.5);
  const [fanW, setFanW] = useState(360);
  const viewRef = useRef<HTMLDivElement | null>(null);
  const [room, setRoom] = useState({ grow: 0, read: 0, top: 0, fanMin: 0 });
  // the field's tools beside it, on rails, when the screen is short and the field leaves paper at its sides
  const [rails, setRails] = useState(0);
  const railsRef = useRef(0);
  const roomRef = useRef(room);
  const [night, setNight] = useState<'off' | 'in' | 'out' | 'hold' | 'fade'>('off');
  const [pages, setPages] = useState<[CalPage, CalPage] | null>(null);
  const [dealt, setDealt] = useState<number[]>([]);
  const [leaving,setLeaving]=useState<{card:Card;style:string;rot:number}[]>([]);
  const [flock, setFlock] = useState<Flock>(() => (crowsOpen(s) ? 'on' : 'off'));
  const canVisit=active && !weekPlaying && night==='off' && !selected && !build && !lens && !sheet && !drag && peek===null && !compostOpen && !info && !pestHits.length && !morning && !farmer.walking && farmer.action==='idle';
  const sceneActive=canVisit && !meetingOpen;
  const ambientCue=useSceneQueue(s,sceneActive);
  const sceneCue=(night==='off'||night==='fade')?(weekCue??(!weekPlaying?ambientCue:null)):null;
  const lifeActive=(weekPlaying?active&&!sheet&&!meetingOpen:sceneActive)&&(night==='off'||night==='fade');
  // A queue briefly has no mounted actor between two scenes. A visitor must wait
  // for pending scenes too, and let harvest/card effects finish without pausing them.
  const visitReady=canVisit&&!sceneCue&&!chooseScene(s,e=>completed(s,e))&&
    !floaters.length&&!tileFx.length&&!dealt.length&&!leaving.length&&!compostFlight&&compostArrival===null;
  const sRef = useRef(s);
  sRef.current = s;
  const fRef = useRef(farmer);
  const queue = useRef<Step[]>([]);
  const running = useRef(false);
  const ending = useRef(false);
  const endGuardUntil = useRef(0);
  const endRequested=useRef(false);
  const [endWaiting,setEndWaiting]=useState(false);
  const timers = useRef<number[]>([]);
  const dragRef = useRef<Drag | null>(null);
  const dragStop = useRef<(() => void) | null>(null);
  const selectedRef = useRef<number | null>(null);
  selectedRef.current = selected;
  const justDragged = useRef(false);
  const fanRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const flashTimer = useRef<number | null>(null);
  useEffect(() => {
    // A message belongs to the tool that produced it, not the next tool.
    setFlash(null);
    if (flashTimer.current !== null) clearTimeout(flashTimer.current);
    flashTimer.current = null;
  }, [build, lens, lensMenu]);
  const turnTimer = useRef<number | null>(null);
  const turnNext = useRef<(() => void) | null>(null);
  const turnSkip = useRef(false);
  const seenHand = useRef<Set<number> | null>(null);
  const pace = fast ? 0.45 : 1;
  const clock=useRef(new AnimationClock()).current;
  function storePlayback(){
    const r=playbackRecord.current;if(!r||testing||teaching)return;
    const left=playbackTimer.current===null?null:clock.remaining(playbackTimer.current);
    saveWeekResume({...r,elapsed:left===null?r.elapsed:Math.max(0,r.events[0].duration-left),hidden:[...hiddenRef.current]});
  }
  useLayoutEffect(()=>{
    const save=()=>storePlayback();
    window.addEventListener('pagehide',save);window.addEventListener('beforeunload',save);
    if(resume){
      ending.current=true;pendingHarvest.current={prev:resume.prev,next:resume.next,rm:reducedMotion()};
      morningHeld.current=new Set(resume.hidden.map(([k])=>k));
      if(reducedMotion())finishHarvest();else runMorning(resume.events,resume.elapsed);
    }
    return()=>{save();window.removeEventListener('pagehide',save);window.removeEventListener('beforeunload',save);};
  },[]);
  const [pageVisible,setPageVisible]=useState(()=>!document.hidden);
  useLayoutEffect(()=>{
    const paused=!active||document.hidden||!!sheet||meetingOpen;
    clock.setPaused(paused);
    const record=playbackRecord.current;
    if(!weekPlaying||!record||(!morning&&!pestHits.length&&!weekCue))return;
    const event=record.events[0];
    const left=playbackTimer.current===null?null:clock.remaining(playbackTimer.current);
    const elapsed=left===null?record.elapsed:Math.max(0,event.duration-left);
    const animations=new Set<Animation>();
    viewRef.current?.querySelectorAll('.morning,.m-plant,.pest-aftermath,.bed-aftermath,.event-scene').forEach(n=>n.getAnimations({subtree:true}).forEach(a=>animations.add(a)));
    // CSS may start a frame late on a busy phone. Bind it to the same origin as
    // impact timers, rather than restarting at zero after DOM/layout work.
    const now=performance.now();
    animations.forEach(a=>{
      const target=(a.effect as KeyframeEffect|null)?.target;
      const actor=target instanceof Element&&!!target.closest('.event-scene');
      const rate=actor?(event.cue?.rate??1):1;
      const time=actor?(event.cue?.elapsed??0)+elapsed*rate:elapsed;
      a.playbackRate=rate;
      if(paused)a.currentTime=time;else a.startTime=now-time/rate;
    });
  },[morning,pestHits,weekCue,weekPlaying,active,pageVisible,sheet,meetingOpen]);
  useEffect(()=>{const fn=()=>{clock.setPaused(!active||document.hidden||!!sheet||meetingOpen);setPageVisible(!document.hidden);};fn();document.addEventListener('visibilitychange',fn);return()=>document.removeEventListener('visibilitychange',fn);},[active,sheet,meetingOpen]);
  useEffect(()=>()=>clock.dispose(),[]);
  const yard = FIELD_YARD;
  useEffect(() => {
    if (!placeRequest) return;
    setSelected(null); setInfo(null); setLens(null); setMoveFrom(null); setBuild(placeRequest.item);
  }, [placeRequest?.key]);

  useEffect(() => () => {timers.current.forEach(t=>clock.cancel(t));morningTimers.current.forEach(t=>clock.cancel(t));if(turnTimer.current!==null)clock.cancel(turnTimer.current);if(flashTimer.current!==null)clearTimeout(flashTimer.current);}, []);
  const later = (ms: number, fn: () => void) => timers.current.push(clock.schedule(fn, ms));
  const setFarmer = (f: FarmerState) => {
    fRef.current = f;
    setFarmerState(f);
  };
  const reveal = (keys: string[]) => {
    if (!keys.length) return;
    setHidden((h) => {
      const m = new Map(h);
      for (const k of keys) m.delete(k);
      return m;
    });
  };
  const say = (text: string) => {
    setFlash(text);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 2600);
  };
  function markQueue(k: string, state: QueueMark['state']) {
    setMarks((m) => {
      const q = m.get(k);
      if (!q) return m;
      const n = new Map(m);
      n.set(k, { ...q, state });
      return n;
    });
  }
  function runNext() {
    const step = queue.current.shift();
    if (!step) {
      running.current = false;
      setFarmer({ ...fRef.current, walking: false, action: 'idle', bubble: null, ms: 0 });
      if(endRequested.current){endRequested.current=false;setEndWaiting(false);endWeek();}
      return;
    }
    const rm = reducedMotion();
    const hurry = (queue.current.length >= 2 ? 0.6 : 1) * pace;
    const cam = camera(sRef.current, yard);
    const [x0, y0] = farmerXY(cam, fRef.current.pos);
    // at a bed he comes up to the nearer edge and turns to face the bed, so the work lands on it
    const pos = step.pos.kind === 'tile' ? { ...step.pos, side: (x0 > farmerXY(cam, { ...step.pos, side: 1 })[0] + 28 ? -1 : 1) as 1 | -1 } : step.pos;
    const [x1, y1] = farmerXY(cam, pos);
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const walkMs = rm || dist < 4 ? 0 : Math.round(Math.min(900, Math.max(200, dist / 0.5)) * hurry);
    const walkFacing: 1 | -1 = Math.abs(x1 - x0) < 2 ? fRef.current.facing : x1 > x0 ? 1 : -1;
    const workFacing: 1 | -1 = pos.kind === 'tile' ? pos.side ?? 1 : walkFacing;
    setFarmer({ pos, walking: walkMs > 0, action: 'idle', facing: walkMs > 0 ? walkFacing : workFacing, ms: walkMs, bubble: null });
    if (step.mark) markQueue(step.mark, 'working');
    later(walkMs + 16, () => {
      const actMs = rm ? 0 : Math.round(Math.max(step.actMs ?? 700, 1200) * pace);
      setFarmer({ ...fRef.current, walking: false, facing: workFacing, action: step.action, bubble: step.bubble ?? null, ms: 0, cycle: actMs });
      if (step.fx?.length && !rm) {
        const items: TileFx[] = step.fx.map((f, i) => ({ key: fxKey++, ...f, delay: i * 40 }));
        setTileFx((prev) => [...prev, ...items]);
        later(1100, () => setTileFx((prev) => prev.filter((p) => !items.includes(p))));
      }
      later(Math.round(actMs * .65), () => reveal(step.reveal ?? []));
      later(actMs + (rm ? 0 : 80), () => {
        if (step.mark) {
          const k = step.mark;
          markQueue(k, 'done');
          later(rm ? 0 : 700, () => setMarks((m) => {
            if (!m.has(k)) return m;
            const n = new Map(m);
            n.delete(k);
            return n;
          }));
        }
        runNext();
      });
    });
  }
  function enqueue(steps: Step[]) {
    queue.current.push(...steps);
    if (!running.current) {
      running.current = true;
      runNext();
    }
  }
  // every field action: the state changes at once, the farmer then walks over and shows it
  const act: Dispatch = (a) => {
    if (ending.current || endRequested.current || morning || pestHits.length) return null;
    const prev = sRef.current;
    const out = (a.t==='exchangeCard' || a.t==='compostCard') ? prev.hand.find(c=>c.uid===a.uid) : undefined;
    const outSlot = out ? fanRef.current?.querySelector<HTMLElement>(`.fan-slot[data-uid="${out.uid}"]`) : null;
    const outStyle = outSlot?.style.cssText;
    const next = dispatch(a);
    if(next && teaching && a.t==='build'){setBuild(null);setMoveFrom(null);}
    if (!next) return null;
    sRef.current = next;
    setPestHits([]);
    if(morningHeld.current.size||morningTimers.current.length)cancelMorning();
    if(out && outStyle && a.t!=='compostCard' && !reducedMotion()) {
      setLeaving(list=>[...list,{card:out,style:outStyle,rot:selectedRef.current===out.uid?rotRef.current:0}]);
      later(520,()=>setLeaving(list=>list.filter(l=>l.card.uid!==out.uid)));
    }
    if((a.t==='compostCard'||a.t==='claimCompost')&&!reducedMotion()){
      const pile=fieldRef.current?.querySelector('.compost-button')?.getBoundingClientRect();
      const c=a.t==='compostCard'?out:next.hand.find(k=>!prev.hand.some(p=>p.uid===k.uid));
      if(pile&&c){const from=outSlot?.getBoundingClientRect();const claim=a.t==='claimCompost';
        if(claim)setCompostArrival(c.uid);
        requestAnimationFrame(()=>{const dest=fanRef.current?.querySelector(`[data-uid="${c.uid}"]`)?.getBoundingClientRect();
          const a=claim?pile:from,b=claim?dest:pile;
          if(a&&b)setCompostFlight({card:c,x:a.x+a.width/2,y:a.y+a.height/2,dx:b.x+b.width/2-a.x-a.width/2,dy:b.y+b.height/2-a.y-a.height/2,claim});
        });
        later(720,()=>{setCompostFlight(null);setCompostArrival(null);});
      }
    }
    if(a.t==='compostCard'){if(reducedMotion())setCompostPulse(p=>p+1);else later(560,()=>setCompostPulse(p=>p+1));}
    const steps = planFor(a, prev, next);
    const walk = steps.filter((st) => st.pos.kind === 'tile');
    if (a.t === 'play' && walk.length >= 2)
      setMarks((m) => {
        const n = new Map(m);
        walk.forEach((st, i) => {
          const p = st.pos as { x: number; y: number };
          st.mark = key(p.x, p.y);
          n.set(st.mark, { n: i + 1, state: 'queued' });
        });
        return n;
      });
    if (steps.length) {
      const keys = new Set(steps.flatMap((st) => st.reveal ?? []));
      if (keys.size)
        setHidden((h) => {
          const m = new Map(h);
          for (const k of keys)
            if (!m.has(k)) {
              const [x, y] = k.split(',').map(Number);
              m.set(k, tile(prev, x, y));
            }
          return m;
        });
      enqueue(steps);
    }
    return next;
  };
  function flushAnimations() {
    timers.current.forEach((t) => clock.cancel(t));
    timers.current = [];
    queue.current = [];
    pendingHarvest.current=null;
    running.current = false;
    setLeaving([]);setCompostFlight(null);setCompostArrival(null);setPestHits([]);
    setFloaters([]);
    morningTimers.current.forEach(t=>clock.cancel(t));morningTimers.current=[];pendingEvents.current=[];morningHeld.current=new Set();setMorning(null);setWeekCue(null);setWeekPlaying(false);
    setHidden(new Map());
    setTileFx([]);
    setMarks(new Map());
    setFarmer(IDLE);
  }

  // ---------- the end of the week: one transition with the tear-off calendar ----------
  function stage(ms: number, fn: () => void) {
    if (turnSkip.current || ms <= 0) return fn();
    turnNext.current = fn;
    turnTimer.current = clock.schedule(() => {
      turnTimer.current = null;
      turnNext.current = null;
      fn();
    }, ms);
  }
  function skipTurn() {
    if (night === 'off' || !turnNext.current) return;
    turnSkip.current = true;
    if (turnTimer.current !== null) clock.cancel(turnTimer.current);
    turnTimer.current = null;
    const fn = turnNext.current;
    turnNext.current = null;
    fn();
  }
  function finishHarvest(){
    clearWeekResume(sRef.current);playbackRecord.current=null;playbackTimer.current=null;
    reveal([...morningHeld.current]);morningHeld.current.clear();
    const h=pendingHarvest.current;pendingHarvest.current=null;
    setWeekPlaying(false);setWeekCue(null);ending.current=false;
    if(h)showHarvest(h.prev,h.next,h.rm);
  }
  function finishTurn() {
    turnSkip.current = false;
    setNight('fade');
    // Characters can enter during the short fade; their impact happens later.
    const events=pendingEvents.current;pendingEvents.current=[];
    runMorning(events);
    stage(reducedMotion()?0:Math.round(CALENDAR_MS.fade*pace)+32,()=>setNight('off'));
  }
  // the morning: each night event plays over the beds it touched, then those beds show the result
  function revealMorning(st: MorningStep){
    const keys=st.cells.map(c=>`${c.x},${c.y}`);
    setHidden(h=>{const m=new Map(h);st.cells.forEach(c=>{const k=key(c.x,c.y);m.set(k,{...tile(sRef.current,c.x,c.y),crop:c.after ?? null});});return m;});
    const notes=st.cells.filter(c=>c.note);
    if(notes.length){setFloaters(f=>[...f,...notes.map((c,i)=>({key:floaterKey++,x:c.x,y:c.y,text:c.note!,tone:'bad' as const,delay:i*90}))]);const ks=new Set(notes.map(c=>`${c.x},${c.y}`));morningTimers.current.push(clock.schedule(()=>setFloaters(f=>f.filter(x=>!(x.tone==='bad'&&ks.has(`${x.x},${x.y}`)))),2100+notes.length*90));}
    // Weather removes the fading original plant, leaving its own remains. A generic
    // green wither sprite would otherwise look like a new plant appearing here.
    const wither:TileFx[]=['thieves','frost','dry'].includes(st.kind)?[]:st.cells.filter(c=>c.killed).map((c,i)=>({key:fxKey++,x:c.x,y:c.y,kind:'wither' as const,delay:i*60}));
    if(wither.length){setTileFx(p=>[...p,...wither]);morningTimers.current.push(clock.schedule(()=>setTileFx(p=>p.filter(f=>!wither.includes(f))),900));}
  }
  function runMorning(events: WeekEvent[],elapsed=0){
    morningTimers.current.forEach(t=>clock.cancel(t));morningTimers.current=[];
    setFloaters(f=>f.filter(x=>x.tone!=='bad'));setTileFx([]);
    setMorning(null);setPestHits([]);setWeekCue(null);
    if(!events.length){finishHarvest();return;}
    const [event,...rest]=events;
    const h=pendingHarvest.current;
    if(h){playbackRecord.current={version:1,prev:h.prev,next:h.next,events,elapsed,hidden:[...hiddenRef.current]};playbackTimer.current=null;}
    setWeekCue(event.cue?{...event.cue,elapsed:(event.cue.elapsed??0)+elapsed*(event.cue.rate??1)}:null);
    if(event.morning){
      const st=event.morning;
      if(!elapsed)setHidden(h=>{const m=new Map(h);st.cells.forEach(c=>{if(c.before)m.set(key(c.x,c.y),{...tile(sRef.current,c.x,c.y),crop:c.before});});return m;});
      setMorning(st);
      // Consequences follow each actor/effect's own arrival at its bed.
      st.cells.forEach((c,i)=>{
        const impact=st.reveal+(st.kind==='thieves'?theftStagger(i)/(event.cue?.rate??1):morningCellDelay(i));
        if(impact>elapsed)morningTimers.current.push(clock.schedule(()=>revealMorning({...st,cells:[c]}),impact-elapsed));
        else setHidden(h=>{const m=new Map(h);m.set(key(c.x,c.y),{...tile(sRef.current,c.x,c.y),crop:c.after??null});return m;});
      });
    }
    if(event.pests){
      setPestHits(event.pests);
      morningTimers.current.push(clock.schedule(()=>{
        setHidden(h=>{const m=new Map(h);for(const hit of event.pests!){
          const after=hit.after!==undefined?hit.after:hit.kind==='locust'?null:tile(sRef.current,hit.x,hit.y).crop;
          m.set(key(hit.x,hit.y),{...tile(sRef.current,hit.x,hit.y),crop:after});
        }return m;});
      },Math.max(0,event.duration-elapsed)));
    }
    // Geese bring their own little animated weed patch. Hide the static patch underneath.
    if(event.cue?.kind==='geese'&&event.cue.at){const [x,y]=event.cue.at;setHidden(h=>{const m=new Map(h),t=m.get(key(x,y))??tile(sRef.current,x,y);m.set(key(x,y),{...t,weeds:false});return m;});}
    playbackTimer.current=clock.schedule(()=>runMorning(rest),Math.max(0,event.duration-elapsed));
    morningTimers.current.push(playbackTimer.current);
    storePlayback();
  }
  function cancelMorning(){
    // The skip button becomes End week in place. Absorb the second tap of that gesture.
    endGuardUntil.current=performance.now()+500;
    morningTimers.current.forEach(t=>clock.cancel(t));morningTimers.current=[];pendingEvents.current=[];
    setMorning(null);setPestHits([]);setWeekCue(null);setFloaters([]);setTileFx([]);finishHarvest();
  }
  function endWeek() {
    if(performance.now()<endGuardUntil.current)return;
    setExchanging(false);setCompostOpen(false);
    if (ending.current || night!=='off' || sRef.current.phase !== 'week' || morning || pestHits.length) return;
    if(running.current && !reducedMotion()){endRequested.current=true;setEndWaiting(true);return;}
    // in the lesson a week that may not end yet is refused before the night starts, not halfway through it
    if(precheck?.({ t: 'endWeek' })){dispatch({ t: 'endWeek' });return;}
    ending.current = true;
    stopDrag();
    flushAnimations();
    setSelected(null);
    setInfo(null);
    setBuild(null);
    setLens(null);setLensMenu(false);closeContext();
    const rm = reducedMotion();
    const carried:SceneCue[]=(sRef.current.scenes??[]).filter(e=>e.kind!=='thieves'&&e.week>=sRef.current.absWeek-1&&!completed(sRef.current,e)).map(e=>{
      const animation=viewRef.current?.querySelector('.event-scene')?.getAnimations()[0];
      return {...e,elapsed:ambientCue?.id===e.id?Number(animation?.currentTime??ambientCue.elapsed??0):0};
    });
    finishScenes(sRef.current,sRef.current.scenes??[]);
    setWeekPlaying(true);
    setPeek(null);
    setPages([calendarPage(sRef.current, 0), calendarPage(sRef.current, 1)]);
    setNight('in');
    turnSkip.current = false;
    const prev = sRef.current;
    stage(rm ? 0 : Math.round(CALENDAR_MS.enter * pace), () => {
      const next = dispatch({ t: 'endWeek' });
      if (!next) return finishTurn();
      sRef.current = next;
      const events=rm?[]:buildWeekPlayback(prev,next,fast?2.25:1.6,carried);
      pendingEvents.current=events;
      // The timeline owns these cues from now on, including after reload or skip.
      finishScenes(next,(next.scenes??[]).filter(e=>!(prev.scenes??[]).some(p=>p.id===e.id)));
      const held=new Set(prev.tiles.map((_,i)=>key(i%GRID,Math.floor(i/GRID))));
      morningHeld.current=held;
      setHidden(new Map(prev.tiles.map((t,i)=>[key(i%GRID,Math.floor(i/GRID)),t])));
      pendingHarvest.current={prev,next,rm};
      if(events.length){
        playbackRecord.current={version:1,prev,next,events,elapsed:0,hidden:prev.tiles.map((t,i)=>[key(i%GRID,Math.floor(i/GRID)),t])};
        if(!testing&&!teaching)saveWeekResume(playbackRecord.current);
      }
      if (next.phase !== 'week') return finishTurn();
      setNight('out');
      stage(rm ? 0 : Math.round(CALENDAR_MS.tear * pace), () => {
        setNight('hold');
        stage(rm ? 0 : Math.round(CALENDAR_MS.settle * pace), finishTurn);
      });
    });
  }
  function showHarvest(prev: GameState, next: GameState, rm: boolean, held: Set<string> = new Set()) {
    const hs = next.lastReport?.harvests ?? [];
    if (hs.length && !rm) {
      setFloaters(hs.map((h, i) => ({ key: floaterKey++, x: h.x, y: h.y, text: `+${h.qty}`, crop: h.crop, delay: 120 + i * 70 })));
      later(2000 + hs.length * 70, () => setFloaters([]));
    }
    if (rm) return;
    const gone: TileFx[] = [];
    for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (!held.has(`${x},${y}`) && !next.lastReport?.fieldDamage?.some(h=>h.x===x&&h.y===y) && !next.lastReport?.pestHits?.some(h=>h.x===x&&h.y===y) && tile(prev, x, y).crop && !tile(next, x, y).crop && !hs.some((h) => h.x === x && h.y === y)) gone.push({ key: fxKey++, x, y, kind: 'wither' });
    if (gone.length) {
      setTileFx((p) => [...p, ...gone]);
      later(700, () => setTileFx((p) => p.filter((f) => !gone.includes(f))));
    }
  }

  const card = selected !== null ? s.hand.find((c) => c.uid === selected) ?? null : null;
  const def = card ? CARDS[card.def] : null;
  // the card read in full in the dock: the one being browsed under the finger, else the picked one
  const peekCard = peek !== null ? s.hand.find((c) => c.uid === peek) ?? null : null;
  const shown = peekCard ?? card;
  useEffect(() => {
    if (selected !== null && !s.hand.some((c) => c.uid === selected)) setSelected(null);
  }, [s, selected]);
  useEffect(() => {
    if (!active) {
      stopDrag();
      setSelected(null);
      closeContext(); setLensMenu(false); setLens(null); setBuild(null); setMoveFrom(null); setSheet(null);
    }
  }, [active]);
  const crowKey = `${s.crows?.week ?? 0}:${crowsOpen(s)}`;
  const crowPrev = useRef(crowKey);
  useEffect(() => {
    const was = crowPrev.current;
    crowPrev.current = crowKey;
    if (crowsOpen(s)) return setFlock('on');
    if (was.endsWith(':true') && s.crows && (s.crows.shoo || s.crows.drone) && !reducedMotion()) {
      setFlock('leave');
      const id = clock.schedule(() => setFlock('off'), 1150);
      return () => clock.cancel(id);
    }
    setFlock('off');
  }, [crowKey]);

  function rotate() {
    if (!card || !def) return;
    if (def.target === 'line') return setRot(rot % 2 ? 0 : 1);
    if (def.kind !== 'seed') return;
    const rots = shapeRotations(card);
    // in the lesson every turn counts: a curious player may turn the bean before its own lesson comes
    if(rots.length>1 && s.guide && (teaching || !s.guide.includes('rotate'))) dispatch({t:'guide',lesson:'rotate'});
    setRot(rots[(rots.indexOf(rot) + 1) % rots.length] ?? 0);
  }
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExchanging(false);setCompostOpen(false);
        setSelected(null);
        setInfo(null);
        setBuild(null); setLens(null); setLensMenu(false); setWatering(null); setLayers(null);
      } else if ((e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') && !e.ctrlKey && !e.metaKey) rotate();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const buildItem = build && build !== 'menu' ? build : null;
  const buildView: BuildView | null = useMemo(() => {
    if (!build) return null;
    const spots = new Set<string>();
    const removable = new Set<string>();
    if (buildItem) {
      const st = buildStock(s)[buildItem];
      const valid = moveFrom ? buildMoveSpots(s, buildItem, moveFrom) : st.used < st.have ? buildSpots(s, buildItem) : [];
      if (buildItem !== 'scarecrow') for (const [x, y] of valid) {
        if (buildItem === 'drip') for (const [, a, b] of ownedTiles(s).filter(([, , b]) => b === y)) spots.add(key(a,b));
        else spots.add(key(x,y));
      }
      if (moveFrom) {
        if (buildItem === 'drip') for (const [, a, b] of ownedTiles(s).filter(([, , b]) => b === moveFrom[1])) removable.add(key(a,b));
        else removable.add(key(...moveFrom));
      }
    }
    return { item: buildItem ?? '', spots, rows: buildItem === 'drip', corners: buildItem === 'scarecrow', removable };
  }, [s, build, moveFrom]);

  const highlight: Highlight = useMemo(() => {
    const h: Highlight = { tiles: new Set(), selected: new Set(), rows: false, area: new Set() };
    if (watering) {
      h.areaKind='water';
      for(const [x,y] of watering) {h.selected.add(key(x,y));h.area.add(key(x,y));}
      for(const [,x,y] of ownedTiles(s)) if(waterSelectionValid([...watering,[x,y]]) && !watering.some(([a,b])=>a===x&&b===y)) h.tiles.add(key(x,y));
      return h;
    }
    if(info) h.selected.add(key(...info));
    if (buildItem === 'scarecrow') {
      const st = buildStock(s).scarecrow;
      h.corners = moveFrom ? buildMoveSpots(s, 'scarecrow', moveFrom) : st.used < st.have ? buildSpots(s, 'scarecrow') : [];
      if (hover?.startsWith('corner:')) h.block = hover.slice(7).split(',').map(Number) as [number, number];
      return h;
    }
    if (build || lens || !card || !def || cardBlockReason(s, card)) return h;
    if (def.kind === 'seed') {
      h.options = true;
      h.minT = cropMinT(def.crop!, card.traits);
      for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (tile(s, x, y).owned && !plantBlock(s, card, shapeTiles(card, x, y, rot))) h.tiles.add(key(x, y));
      if (hover && !hover.startsWith('corner')) {
        const [x, y] = hover.split(',').map(Number);
        const cells = shapeTiles(card, x, y, rot);
        const why = cellReasons(s, card, cells);
        h.preview = { cells, why, crop: def.crop };
        h.anchor = hover;
        h.soil = sowingSoil(s, card, cells);
        if (CROPS[def.crop!].legume && why.every((w) => !w)) h.gain = beanGain(s, cells);
        for (const c of cells) h.tiles.delete(key(c[0], c[1]));
      }
      return h;
    }
    if (def.target === 'line') {
      const dir = rot % 2 ? 'col' : 'row';
      for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (tile(s, x, y).owned && weedsOnLine(s, dir, dir === 'row' ? y : x)) h.tiles.add(key(x, y));
      if (hover && !hover.startsWith('corner')) {
        const [x, y] = hover.split(',').map(Number);
        for (const [a, b] of lineCells(dir, dir === 'row' ? y : x)) if (tile(s, a, b).owned) h.area.add(key(a, b));
        h.anchor = hover;
      }
      return h;
    }
    if (def.target === 'row') h.rows = true;
    h.areaKind = card.def === 'water' ? 'water' : card.def === 'mulch' ? 'mulch' : card.def === 'fertilizer' ? 'fert' : card.def === 'shelter' ? 'warm' : card.def === 'compost' || card.def === 'bio' ? 'soil' : undefined;
    for (const [x, y] of playableTargets(s, card.def)) if (!workCardPreview(s,card,x,y).reason) h.tiles.add(key(x, y));
    if (hover && h.tiles.has(hover)) {
      h.anchor = hover;
      const [x, y] = hover.split(',').map(Number);
      for (const [a,b] of workEffectCells(s,card.def,x,y)) h.area.add(key(a,b));
    }
    return h;
  }, [s, card, def, hover, rot, buildItem, moveFrom, lens, info, watering]);

  function playAt(uid: number, x: number, y: number): boolean {
    const st = sRef.current;
    const c = st.hand.find((h) => h.uid === uid);
    if (!c) return false;
    const d = CARDS[c.def];
    const block = cardBlockReason(st, c);
    if (block) return say(block), false;
    if (d.kind === 'seed') {
      const cells = shapeTiles(c, x, y, rotRef.current);
      const why = plantBlock(st, c, cells);
      if (why) return say(`Не встанет: ${why}`), false;
      return !!act({ t: 'play', uid, tiles: cells });
    }
    if (d.target === 'line') {
      const col = rotRef.current % 2 === 1;
      if (!weedsOnLine(st, col ? 'col' : 'row', col ? x : y)) return say(col ? 'В этом столбце сорняков нет' : 'В этом ряду сорняков нет'), false;
      return !!act(col ? { t: 'play', uid, col: x } : { t: 'play', uid, row: y });
    }
    if (d.target === 'row') return !!act({ t: 'play', uid, row: y });
    if (d.target === 'none') return !!act({ t: 'play', uid });
    const preview = workCardPreview(st,c,x,y);
    if (preview.reason) return say(preview.reason), false;
    return !!act({ t: 'play', uid, tiles: [[x, y]] });
  }
  function waterSelectionValid(cells: [number,number][]) {
    if(cells.length>handWaterMax(s))return false;
    if(!cells.every(([x,y])=>tile(s,x,y).owned && !tile(s,x,y).canal && winterCareTarget(s,x,y)))return false;
    const line=cells.every(([x])=>x===cells[0][0])||cells.every(([,y])=>y===cells[0][1]);
    const span=Math.max(...cells.map(([x,y])=>x+y))-Math.min(...cells.map(([x,y])=>x+y));
    return cells.length===1 || line && span===cells.length-1;
  }
  function onTile(x: number, y: number) {
    if(ending.current)return;
    setLensMenu(false);
    if(watering) {
      const found=watering.some(([a,b])=>a===x&&b===y);
      const next: [number,number][]=found?watering.filter(([a,b])=>a!==x||b!==y):[...watering,[x,y]];
      if(!next.length){closeContext();return;}
      if(!waterSelectionValid(next)){say(`Выберите до ${handWaterMax(s)} соседних грядок в одну линию`);return;}
      setWatering(next);return;
    }
    if (build) {
      if (buildItem && moveFrom && key(x, y) === key(...moveFrom)) {
        const t = tile(s,x,y);
        const layers: BuildItem[] = [...(t.structure ? [t.structure] : []), ...(t.canal ? ['canal' as const] : []), ...(t.drip ? ['drip' as const] : [])];
        const nextLayer = layers[layers.indexOf(buildItem) + 1];
        if (nextLayer) setBuild(nextLayer);
        else { setMoveFrom(null); setBuild('menu'); }
        return;
      }
      if (buildItem && buildView?.spots.has(key(x, y))) {
        const a: Action = moveFrom ? { t: 'moveBuild', item: buildItem, from: moveFrom, to: [x, y] } : { t: 'build', item: buildItem, x, y };
        if (act(a)) { setMoveFrom(null); setBuild(teaching ? null : 'menu'); }
        else say('Сюда не поставить');
        return;
      }
      const t = tile(s, x, y);
      const item: BuildItem | null = t.structure === 'greenhouse' || t.structure === 'hive' ? t.structure : t.canal ? 'canal' : t.drip ? 'drip' : null;
      if (item) {
        if ((t.structure?1:0)+(t.drip?1:0)+(t.canal?1:0)>1) { setLayers([x,y]); setMoveFrom(null); setBuild('menu'); }
        else { setBuild(item); setMoveFrom([x,y]); setLayers(null); }
      }
      else say(buildItem ? 'Выберите подсвеченное место' : 'Коснитесь постройки, которую хотите переместить');
      return;
    }
    if (card && def && def.target !== 'none') {
      if (playAt(card.uid, x, y)) setSelected(null);
      return;
    }
    setInfo(info && info[0] === x && info[1] === y ? null : [x, y]);
  }
  function onCorner(x: number, y: number) {
    if(ending.current)return;
    if (!build) return;
    if (s.scarecrows.some(([a, b]) => a === x && b === y)) {
      setBuild('scarecrow'); setMoveFrom([x, y]); return;
    }
    if (buildItem !== 'scarecrow') return;
    const a: Action = moveFrom ? { t: 'moveBuild', item: 'scarecrow', from: moveFrom, to: [x, y] } : { t: 'build', item: 'scarecrow', x, y };
    if (act(a)) { setMoveFrom(null); setBuild('menu'); }
  }
  function pickCard(uid: number) {
    if(exchanging) {
      if(act(exchanging==='compost'?{t:'claimCompost',uid}:{t:'exchangeCard',uid})) {setExchanging(false);setSelected(null);setCompostOpen(false);}
      return;
    }
    closeContext(); setLensMenu(false);
    setBuild(null);
    setMoveFrom(null); setLens(null);
    if (selectedRef.current === uid) {
      const c = s.hand.find((h) => h.uid === uid);
      if (c && (CARDS[c.def].target === 'line' || (CARDS[c.def].kind === 'seed' && shapeRotations(c).length > 1))) rotate();
      return;
    }
    setSelected(uid);
    setRot(0);
  }

  // ---------- drag & drop from the fan ----------
  function tileUnder(cx: number, cy: number): string | null {
    const svg = fieldRef.current?.querySelector('.scene-svg');
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    const cam = camera(sRef.current, yard);
    const k = Math.min(r.width / cam.W, r.height / cam.H);
    const ox = r.left + (r.width - cam.W * k) / 2;
    const oy = r.top + (r.height - cam.H * k) / 2;
    const sx = (cx - ox) / k;
    const sy = (cy - oy) / k;
    const x = Math.floor((sx + cam.vx * CELL - PAD) / CELL);
    const y = Math.floor((sy - cam.yard + cam.vy * CELL - PAD) / CELL);
    if (sy < cam.yard || x < Math.floor(cam.vx) || y < Math.floor(cam.vy) || x >= cam.vx + cam.span || y >= cam.vy + cam.span) return null;
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) return null;
    return key(x, y);
  }
  function stopDrag() {
    dragStop.current?.();
  }
  function onCardPointerDown(e: JSX.TargetedPointerEvent<HTMLButtonElement>, uid: number) {
    if(exchanging) return;
    setBuild(null); setMoveFrom(null); setLens(null); setLensMenu(false); closeContext();
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (s.phase !== 'week' || ending.current || dragRef.current) return;
    const touch = e.pointerType !== 'mouse';
    const pid = e.pointerId;
    const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('.fan-slot[data-uid]');
    const hitUid = Number(hit?.dataset.uid);
    if (s.hand.some((c) => c.uid === hitUid)) uid = hitUid;
    dragRef.current = { uid, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, active: false, touch };
    // a mouse has no browsing: any move takes the card it pressed
    let intent: FanIntent = touch ? 'wait' : 'lift';
    // the lowest point of a browse and where it was: a rise from there means "take this one"
    let low = { x: e.clientX, y: e.clientY };
    if (touch) setPeek(uid);
    const aim = (ev: PointerEvent) => tileUnder(ev.clientX, ev.clientY - (touch ? TOUCH_AIM_OFFSET : 0));
    const fanEl = fanRef.current;
    // Freeze the browsing geometry before a card is lifted. Its raised DOM
    // rectangle must not swallow the hit areas of its neighbours (B-21).
    const browseCenters = fan.slots.map((slot, i) => ({ x: slot.cx, uid: s.hand[i].uid }));
    const browseWidth = fanW;
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pid) return;
      const d = dragRef.current;
      if (!d) return;
      const fr = fanEl?.getBoundingClientRect();
      const inFan = fr && ev.clientX >= fr.left && ev.clientX <= fr.right && ev.clientY > fr.top - 10 && ev.clientY <= fr.bottom + 10;
      if (!d.active) {
        const dx = ev.clientX - d.sx, dy = ev.clientY - d.sy;
        // One recogniser for the lesson and ordinary play (B-01). Nothing changes until the finger shows intent:
        // a mostly horizontal slide inside the fan browses; any move that heads up takes the card held now.
        if (intent === 'wait') {
          if (Math.hypot(dx, dy) < INTENT_DEAD) return;
          intent = inFan && Math.abs(dx) > Math.abs(dy) * BROWSE_RATIO ? 'browse' : dy < 0 ? 'lift' : 'browse';
          low = { x: ev.clientX, y: ev.clientY };
        }
        if (intent === 'browse') {
          if (ev.clientY >= low.y) low = { x: ev.clientX, y: ev.clientY };
          const rise = low.y - ev.clientY, side = Math.abs(ev.clientX - low.x);
          const left = !inFan && ev.clientY < (fr?.top ?? 0);
          if (left || (rise >= LIFT_RISE && rise > side)) intent = 'lift';
          else {
            if (!inFan) return;
            const x = (ev.clientX - fr!.left) * browseWidth / fr!.width;
            const index = browseCenters.findIndex((center, i) =>
              i === browseCenters.length - 1 || x < (center.x + browseCenters[i + 1].x) / 2);
            const u = browseCenters[index]?.uid;
            if (u !== undefined && u !== d.uid && sRef.current.hand.some((c) => c.uid === u)) {
              d.uid = u;
              setPeek(u);
            }
            return;
          }
        }
        // lift: d.uid is the card the player sees raised; from here on it never changes
        if (Math.hypot(dx, dy) < (touch ? 10 : 6)) return;
        d.active = true;
        setPeek(null);
        if (selectedRef.current !== d.uid) {
          setSelected(d.uid);
          setRot(0);
        }
        setInfo(null);
      }
      d.x = ev.clientX;
      d.y = ev.clientY;
      setHover(aim(ev));
      {const pit=fieldRef.current?.querySelector('.compost-button')?.getBoundingClientRect();const ty=ev.clientY-(touch?TOUCH_AIM_OFFSET:0);
       const on=!!pit&&ev.clientX>=pit.left&&ev.clientX<=pit.right&&ty>=pit.top&&ty<=pit.bottom;setOverCompost(v=>v===on?v:on);}
      setDrag({ ...d });
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pid) return;
      const d = dragRef.current;
      const k = d?.active ? aim(ev) : null;
      stop();
      if (!d) return;
      justDragged.current = true;
      window.setTimeout(() => (justDragged.current = false), d.active ? 60 : 400);
      if (!d.active) return pickCard(d.uid);
      const pit=fieldRef.current?.querySelector('.compost-button')?.getBoundingClientRect();
      const targetY=ev.clientY-(d.touch?TOUCH_AIM_OFFSET:0);
      if(pit && ev.clientX>=pit.left && ev.clientX<=pit.right && targetY>=pit.top && targetY<=pit.bottom) {
        if(lvl(s,'compost')===0){setCompostOpen(true);return;}
        if(act({t:'compostCard',uid:d.uid})) {setSelected(null);setCompostOpen(true);}
        return;
      }
      if (k) {
        const [x, y] = k.split(',').map(Number);
        if (playAt(d.uid, x, y)) setSelected(null);
      }
    };
    const cancel = (ev: PointerEvent) => {
      if (ev.pointerId === pid) stop();
    };
    const reshape = () => {
      if (dragRef.current?.active) say('Экран повернулся, карту придётся перетащить заново');
      stop();
    };
    const vv = window.visualViewport;
    const stop = () => {
      dragRef.current = null;
      dragStop.current = null;
      setDrag(null);
      setOverCompost(false);
      setHover(null);
      setPeek(null);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('resize', reshape);
      vv?.removeEventListener('resize', reshape);
    };
    dragStop.current = stop;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('resize', reshape);
    vv?.addEventListener('resize', reshape);
  }
  useEffect(() => {
    const cancel = () => stopDrag();
    const hiddenTab = () => document.hidden && stopDrag();
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', hiddenTab);
    return () => {
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', hiddenTab);
      stopDrag();
      if (turnTimer.current !== null) clock.cancel(turnTimer.current);
    };
  }, []);
  // №4 · one height for the field, the action row and the hand. A field bound by the screen's width leaves
  // paper under it; that room goes first to a third line of the card readout, then to slightly bigger cards.
  // It is planned for a full hand and per screen size only — never per card played or tool opened — so the
  // beds never move.
  useEffect(() => {
    const view = viewRef.current, wrap = fieldRef.current;
    if (!view || !wrap || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const row = wrap.querySelector<HTMLElement>('.field-row'), dock = view.querySelector<HTMLElement>('.dock');
      const top = view.querySelector<HTMLElement>('.dock-top'), fanEl = fanRef.current;
      if (!row || !dock || !top || !fanEl) return;
      const was = roomRef.current;
      const cs = getComputedStyle(wrap), rs = getComputedStyle(row);
      const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom), padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      {
        // bound by the height, the field leaves paper at both sides: wide enough for a rail of tools each, use it
        const cam0 = camera(sRef.current, yard), innerW = wrap.clientWidth - padX, innerH = wrap.clientHeight - padY;
        const slack = innerW - Math.min(innerH, innerW / (cam0.W / cam0.H)) * (cam0.W / cam0.H);
        const want = slack >= 2 * RAIL_MIN ? Math.min(RAIL_W, Math.floor(slack / 2)) : 0;
        if (want !== railsRef.current) { railsRef.current = want; setRails(want); }
      }
      // only where the dock stands under the field (phones); side by side there is nothing to share
      if (dock.getBoundingClientRect().top < wrap.getBoundingClientRect().bottom - 2) { if (was.grow || was.read || was.fanMin) { roomRef.current = { grow: 0, read: 0, top: 0, fanMin: 0 }; setRoom(roomRef.current); } return; }
      // the side column may be gone (0 px): only a missing value falls back to the old instrument width
      const sideV = parseFloat(rs.getPropertyValue('--side')), gapV = parseFloat(rs.getPropertyValue('--gap'));
      const side = Number.isFinite(sideV) ? sideV : 44, gap = Number.isFinite(gapV) ? gapV : 4;
      const c = camera(sRef.current, yard), arn = c.W / c.H;
      const fieldNeed = (wrap.clientWidth - padX - side - gap) / arn + padY;
      const n = Math.max(handMax(sRef.current), sRef.current.hand.length);
      const short = innerHeight < 700, fw = fanEl.clientWidth || fanW;
      const fanH = (grow: number) => { const f = fanLayout(fw, n, -1, -1, short, grow); return f.cw * 1.4 + f.sink; };
      const cur = fanLayout(fw, sRef.current.hand.length, -1, -1, short, was.grow);
      const fanConst = fanEl.offsetHeight - (cur.cw * 1.4 + cur.sink);
      const topBase = top.offsetHeight - was.read;
      // the dock as it would be with a full hand and no extra room: paddings, the action row, the fan
      const dockBase = dock.offsetHeight - fanEl.offsetHeight - was.read + fanConst + fanH(0);
      const free = Math.floor(view.clientHeight - fieldNeed - dockBase - 6);
      // a third line (status) from 34 px of room; the card's rule in words from 76 px
      const read = free >= 76 ? 56 : free >= 34 ? 22 : 0;
      const cap = fw >= 400 ? 34 : 24;
      let grow = Math.max(0, Math.min(cap, Math.floor(((free - read - 10) * 0.7) / 1.4)));
      while (grow > 0 && read + fanH(grow) - fanH(0) > free - 4) grow -= 2;
      // the fan keeps the height of a full hand, so playing a card never shifts what is above it
      const fanMin = Math.ceil(fanH(grow) + fanConst);
      if (grow !== was.grow || read !== was.read || fanMin !== was.fanMin) { roomRef.current = { grow, read, top: topBase, fanMin }; setRoom(roomRef.current); }
    };
    const ro = new ResizeObserver(measure);
    ro.observe(view);
    measure();
    return () => ro.disconnect();
  }, [s.bought, yard]);
  useEffect(() => {
    const el = fanRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => { if (entry.contentRect.width > 0) setFanW(entry.contentRect.width); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const el = fieldRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const svg = el.querySelector('.scene-svg');
      if (!svg) return;
      const r = svg.getBoundingClientRect();
      const cam = camera(sRef.current, yard);
      const k = Math.min(r.width / cam.W, r.height / cam.H);
      if (k > 0 && Math.abs(k - px) > 0.01) setPx(k);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [s.bought, px]);
  // cards that just arrived slide in from the deck
  const handKey = s.hand.map((c) => c.uid).join(',');
  useEffect(() => {
    const now = new Set(s.hand.map((c) => c.uid));
    const before = seenHand.current;
    seenHand.current = now;
    if (!before) return;
    const add = [...now].filter((u) => !before.has(u));
    if (add.length) setDealt((f) => [...f.filter((u) => now.has(u)), ...add]);
  }, [handKey]);
  useEffect(() => {
    if (night !== 'off' || !dealt.length) return;
    const t = clock.schedule(() => setDealt([]), 1500 + dealt.length * 110);
    return () => clock.cancel(t);
  }, [night, dealt.join(',')]);

  const hand = s.hand;
  // a phone held sideways leaves little height: smaller cards
  const short = typeof window !== 'undefined' && window.innerHeight < 700;
  const fan = fanLayout(fanW, hand.length, hand.findIndex((c) => c.uid === selected), hand.findIndex((c) => c.uid === peek), short, room.grow);
  const blockReason = card ? cardBlockReason(s, card) : null;
  const rotatable = !!card && !!def && (def.target === 'line' || (def.kind === 'seed' && shapeRotations(card).length > 1));
  const outlook = useMemo(() => (s.phase === 'week' ? weekOutlook(s) : null), [s]);
  const ready = s.phase === 'week' && (s.days === 0 || s.hand.every((c) => !!cardBlockReason(s, c)));
  const chips = summary(s);
  const compostBuilt=lvl(s,'compost')>0;
  const cam = camera(s, yard);
  // the compost card hangs under the heap itself, never over it
  useEffect(()=>{
    if(!compostOpen){setCompostAt(null);return;}
    const place=()=>{
      const f=fieldRef.current,b=f?.querySelector('.compost-button')?.getBoundingClientRect(),fr=f?.getBoundingClientRect();
      if(!b||!fr)return;
      setCompostAt({top:Math.round(b.bottom-fr.top+6),right:Math.max(4,Math.round(fr.right-b.right)),tip:Math.max(18,Math.round(b.width/2))});
    };
    place();const ro=typeof ResizeObserver==='undefined'?null:new ResizeObserver(place);if(fieldRef.current)ro?.observe(fieldRef.current);
    return()=>ro?.disconnect();
  },[compostOpen,px]);
  const compostProject=s.projects.find(p=>p.kind==='track'&&p.track==='compost');
  const compostBuildProblem=s.phase!=='week'?'Вы не можете это сделать, не решив вопрос с платежом':trackProblem(s,'compost');
  const winter = s.season === 3;
  const presentation=weekPlaying?(pendingHarvest.current??resume):null;
  const fieldState=presentation?.prev??s;
  const aftermath=presentation?new Map([...killers(presentation.next)].filter(([k])=>hidden.has(k)&&!hidden.get(k)!.crop)):new Map();
  const spentDry=presentation&&!(playbackRecord.current?.events??[]).some(e=>e.cue?.kind==='thieves')
    ?new Set(kidMisses(presentation.prev,presentation.next).filter(m=>m.cause==='dry').map(m=>key(m.x,m.y))):new Set<string>();
  const crowsNow = crowsOpen(s);
  const thievesNow = !!s.thieves && s.thieves.week === s.absWeek && !s.thieves.talked && !thievesBlocked(s);
  // the week before a raid (the engine's own next morning, computed on a copy and cached per state)
  const scouting = kidsScouting(s);
  // the sky: this week's picture and the coming weeks; raids seen coming. The week being played shows its own sky.
  const tokens = useMemo(() => skyTokens(fieldState), [fieldState]);
  const signs = useMemo(() => (weekPlaying || night !== 'off' ? [] : raidSigns(fieldState)), [fieldState, weekPlaying, night]);
  const lastToken = useRef<{ abs: number; at: number } | null>(null);
  const skyView: SkyView = {
    tokens, signs, meteoMax: lvl(fieldState, 'meteo') >= 3,
    // a second tap on the same picture opens the full forecast
    onToken: (t: SkyToken) => { const was = lastToken.current; lastToken.current = { abs: t.abs, at: performance.now() }; if (was && was.abs === t.abs && performance.now() - was.at < 2600) { lastToken.current = null; openSheet('forecast'); } else say(t.text); },
    onFog: () => say(fogText(fieldState)),
    onSign: (sg) => say(sg.text),
    clear: rails > 0,
  };
  const dragCard = drag ? s.hand.find((c) => c.uid === drag.uid) : null;

  function cardLine(): { text: string; tone: 'instr' | 'up' | 'down' } {
    if (!card || !def) return { text: '', tone: 'instr' };
    if (blockReason) return { text: blockReason, tone: 'down' };
    const pv = highlight.preview;
    if (flash && !pv) return { text: flash, tone: 'down' };
    if (def.kind === 'seed') {
      const w = pv ? seedWeeks(s, def.crop!, card.traits, pv.cells) : cropGrow(s, def.crop!, card.traits);
      if (pv) {
        const bad = new Map<string, number>();
        for (const why of pv.why) if (why) bad.set(why, (bad.get(why) ?? 0) + 1);
        if (bad.size) return { text: `Не встанет: ${[...bad].map(([why, n]) => (n > 1 ? `${why} (${n})` : why)).join(', ')}`, tone: 'down' };
        const q = placementYield(s, card, pv.cells);
        const cold = pv.cells.filter(([x, y]) => soilTemp(s, x, y) < cropMinT(def.crop!, card.traits)).length;
        const days = cardDays(s, card, pv.cells.length);
        const shift = highlight.soil?.size ? ` · повтор: почва −1` : '';
        // the days are in the readout's head; repeat them only when this footprint costs a different number
        const dayNote = days !== cardNeedDays(s, card) ? ` · ${days} ${plural(days, 'день', 'дня', 'дней')}` : '';
        return { text: `≈${q} ед.${w ? ` через ≈${w} нед.` : ' · сейчас не созреет'}${dayNote}${cold ? ` · холодно: ${cold}` : ''}${shift}`, tone: cold || shift || !w ? 'down' : 'up' };
      }
      if (w === null) return { text: '❄ до холодов не успеет', tone: 'down' };
      // growth and temperature are in the readout's facts; here only what to do
      return { text: rotatable ? 'На грядку — перетащите или коснитесь · ещё тап — поворот' : 'Перетащите на грядку или коснитесь её', tone: 'instr' };
    }
    if (hover && !hover.startsWith('corner') && def.target !== 'none' && def.target !== 'line') {
      const [x,y]=hover.split(',').map(Number), pv=workCardPreview(s,card,x,y);
      if(pv.reason)return {text:pv.reason,tone:'down'};
      if(card.def==='fertilizer')return {text:`Урожай ${pv.before} → ${pv.after} ед. · ${pv.days} дн. · ${money(pv.cost)}`,tone:'up'};
      if(card.def==='compost'||card.def==='bio')return {text:`Почва ↑ · ${pv.cells.length} гр.${pv.after>pv.before?` · урожай ${pv.before} → ${pv.after}`:''} · ${pv.days} дн.`,tone:'up'};
      if(card.def==='care')return {text:`Урожай ряда ${pv.before} → ${pv.after} ед. · ${pv.days} дн.`,tone:'up'};
      if(card.def==='early')return {text:`Сейчас ${Math.round(pv.before*(lvl(s,'machinery')>=3?1:.7))} ед. вместо ${pv.before}`,tone:'up'};
    }
    const hint: Record<string, string> = { row: 'Выбери ряд', line: `Прополка: весь ${rot % 2 ? 'столбец' : 'ряд'} · ещё касание — ${rot % 2 ? 'ряд' : 'столбец'}`, none: 'Нажми «Сыграть»', block: 'Квадрат 2×2: выбери его левую верхнюю грядку' };
    return { text: hint[def.target] ?? 'Перетащи на поле или коснись грядки', tone: 'instr' };
  }
  const previewOk = !!highlight.preview && highlight.preview.why.every((w) => !w);
  useEffect(() => {
    if (previewOk && flash) setFlash(null);
  }, [previewOk]);

  const endText = (() => {
    if (!outlook) return '';
    const parts: string[] = [];
    if (outlook.frost) parts.push(`❄ −${outlook.frost}`);
    if (outlook.dying) parts.push(`засохнет ${outlook.dying}`);
    const open = outlook.threats.filter((t) => t.guard!=='дрон');
    if (open.length) parts.push(`⚠ ${open.map((t) => t.name.toLowerCase()).join(', ')}`);
    if (outlook.thieves) parts.push(`воры: ${outlook.thieves}`);
    if (outlook.ripe) parts.push(`созреет ${outlook.ripe}`);
    if (outlook.payment) parts.push(outlook.payment.short > 0 ? `платёж: −${money(outlook.payment.short)}` : 'платёж');
    return parts.slice(0, 2).join(' · ');
  })();
  const endBad = !!outlook && (outlook.frost > 0 || outlook.dying > 0 || (outlook.payment?.short ?? 0) > 0);

  return (
    <div style={{['--arn' as string]:String(cam.W/cam.H)}} data-week-event={weekCue?.kind??morning?.kind??(pestHits.length?'pests':'')} data-busy={night!=='off'||weekPlaying||!!morning||!!pestHits.length||farmer.walking||farmer.action!=='idle'} data-drag-active={drag?.active ? 'true' : 'false'} data-peek-uid={peek ?? ''} data-building={!!build} data-build-item={build??''} data-build-moving={!!moveFrom} data-bed-menu={info?.join(',')??''} data-water-cells={watering?.map(p=>p.join(',')).join(';')??''} data-card-rotation={rot} ref={viewRef} class={`field-view${!active||!pageVisible||!!sheet||meetingOpen?' scene-paused':''}${drag ? ' dragging' : ''}${card ? ' picking' : ''}`}>
      <div class={`field-wrap${!active||!pageVisible||!!sheet||meetingOpen?' scene-paused':''}${room.fanMin ? ' balanced' : ''}${rails ? ' rails' : ''}`} style={rails ? { ['--rail' as string]: `${rails}px`, ['--rail2' as string]: `${rails * 2}px` } : undefined} ref={fieldRef}>
        <div class="field-row" style={{ ['--arn' as string]: String(cam.W / cam.H) }}>
          <div class="field-stage">
            <Scene
              s={fieldState}
              hidden={hidden}
              aftermath={aftermath} spentDry={spentDry}
              highlight={highlight}
              onTile={onTile}
              onCorner={onCorner}
              hoverTile={hover}
              onHover={(k) => { if (!dragRef.current) setHover(k); }}
              farmer={farmer}
              floaters={floaters}
              effects={tileFx}
              yard={yard}
              px={px}
              queue={marks}
              flock={weekPlaying||night!=='off'?'off':flock}
              lens={lens}
              build={buildView}
              pets={s.pets}
              lifeActive={lifeActive&&pageVisible}
              showWarnings={!weekPlaying&&night==='off'}
              sceneCue={sceneCue}
              pestHits={pestHits} morning={morning}
              scouts={scouting && kidsAhead(s) <= 1}
              onScouts={() => say(thievesBlocked(s) ? 'Дети из интерната что-то высматривают у спелых грядок. Пёс и сторож их приметили — на набег не решатся.' : `Дети из интерната высматривают спелые грядки. ${kidsAhead(s) >= 2 ? 'Через две недели' : 'На следующей неделе'} полезут за урожаем: укройте грядки, заведите пса или сторожа.`)}
              sky={skyView}
              compost={{built:compostBuilt,building:!!compostProject,ready:!!s.compostReady,fill:compostBuilt?s.compostTick/Math.max(1,compostWeeks(s)):0,selected:!!card&&!compostProblem(s,card.uid),open:compostOpen,over:overCompost,pulse:compostPulse,onClick:()=>setCompostOpen(v=>!v)}}
            />
            {!weekPlaying&&night==='off'&&<SeasonFx kind={(['spring', 'summer', 'autumn', 'winter'] as const)[s.season]} rain={!winter && s.flags.rain} heat={!winter && (s.flags.dry || airTemp(s) >= 28)} />}
            <div class="field-tools sky-tools sky-left">
              <button type="button" class={`tool-btn journal-button${chips.some(c=>c.tone==='bad')||crowsNow||thievesNow||endBad?' urgent':''}`} onClick={()=>openSheet('journal')} title="Журнал фермы" aria-label="События недели и действия"><Icon name="journal" size={29}/><i aria-hidden="true"/></button>
            </div>
            <div class="field-tools sky-tools sky-right" role="toolbar" aria-label="Приборы поля">
              <button type="button" class={`tool-btn${lens ? ' on' : ''}`} disabled={weekPlaying} aria-pressed={!!lens} onClick={() => { setBuild(null); setMoveFrom(null); setSelected(null); closeContext(); if(lens){setLens(null);setLensMenu(false);}else setLensMenu(!lensMenu); }} aria-label={`Линзы${lens ? `: ${lens === 'water' ? 'влага' : lens === 'soil' ? 'плодородие' : 'температура'}` : ''}`} title="Линзы">
                <Icon name={lens === 'water' ? 'drop' : lens === 'soil' ? 'compost' : lens === 'temp' ? 'thermo' : 'lens'} size={22} />
              </button>
              <button type="button" class={`tool-btn${build ? ' on' : ''}`} disabled={weekPlaying} aria-pressed={!!build} onClick={() => { setLens(null); setLensMenu(false); setMoveFrom(null); setSelected(null); closeContext(); setBuild(build ? null : 'menu'); }} aria-label={build ? "Завершить перемещение построек" : "Постройки"} title="Постройки">
                <Icon name="build" size={22} />
              </button>
              {lensMenu && <div class="lens-picker" role="group" aria-label="Выберите линзу">{(['water','soil','temp'] as const).map(l=><button type="button" class="tool-btn" aria-label={l==='water'?'Влага':l==='soil'?'Плодородие':'Температура почвы'} onClick={()=>{setLens(l);setLensMenu(false);}}><Icon name={l==='water'?'drop':l==='soil'?'compost':'thermo'} size={23}/></button>)}</div>}
            </div>
          </div>
        </div>

        {compostOpen && <div class="compost-popover" role="group" aria-label="Компостная куча" style={compostAt?{top:`${compostAt.top}px`,right:`${compostAt.right}px`,maxWidth:`min(250px, calc(100% - ${compostAt.right+8}px))`,['--tip' as string]:`${compostAt.tip}px`}:{visibility:'hidden'}}>
          <button type="button" class="compost-close" aria-label="Закрыть" onClick={()=>setCompostOpen(false)}>×</button>
          {!compostBuilt ? (compostProject
            ? <><b>Куча строится</b><small>Готово через {weeksShort(compostProject.weeks)}</small></>
            : <><b>Компостная куча</b><small>Карта «Компост» раз в {compostWeeks({...s,levels:{...s.levels,compost:1}})} нед.</small>
                <Btn small tone="primary" disabled={compostBuildProblem} onClick={()=>act({t:'track',track:'compost'})}>Обустроить · {money(trackCost(s,'compost',1))} · {weeksShort(trackWeeks(s,'compost',1))}</Btn></>)
          : s.compostReady
            ? <><b>Компост готов</b>{s.hand.length>=maxHand(s)
                ? <Btn small tone="primary" onClick={()=>{closeContext();setSelected(null);setExchanging('compost');}}>Забрать вместо карты</Btn>
                : <Btn small tone="primary" onClick={()=>{if(act({t:'claimCompost'}))setCompostOpen(false);}}>Забрать карту</Btn>}</>
            : <><b>Созреет через {weeksShort(Math.max(1,compostWeeks(s)-s.compostTick))}</b>
                {card ? <Btn small tone="primary" disabled={compostProblem(s,card.uid)} onClick={()=>{if(act({t:'compostCard',uid:card.uid}))setSelected(null);}}>Бросить «{CARDS[card.def].name}» · −1 нед.</Btn>
                  : <small>Бросьте сюда ненужную карту — созреет на неделю раньше.</small>}</>}
        </div>}
        {layers && build && <BedPopover s={s} at={layers} field={fieldRef.current} onClose={()=>setLayers(null)}>{([tile(s,...layers).structure,tile(s,...layers).drip?'drip':null,tile(s,...layers).canal?'canal':null].filter(Boolean) as BuildItem[]).map(item=><button type="button" class="bed-action" aria-label={`Переместить: ${BUILD_NAMES[item].name}`} onClick={()=>{setBuild(item);setMoveFrom(layers);setLayers(null);}}><Icon name={BUILD_NAMES[item].icon} size={26}/></button>)}</BedPopover>}
        {info && !card && !build && <BedPopover s={s} at={info} field={fieldRef.current} onClose={closeContext}>
          {watering ? <>
            <span class="water-count">{watering.length}/{handWaterMax(s)}</span>
            <button type="button" class="bed-action water-confirm" disabled={s.days<1 || !watering.some(([x,y])=>tile(s,x,y).moisture<3)} aria-label={`Полить выбранные грядки (${watering.length}) за 1 день`} onClick={()=>{if(act({t:'waterHand',tiles:watering}))closeContext();}}><Icon name="water" size={28}/><small>1 д.</small></button>
            <button type="button" class="bed-action" aria-label="Отменить полив" onClick={closeContext}>✕</button>
          </> : <>
            {tile(s,...info).owned && !tile(s,...info).canal && winterCareTarget(s,...info) && <button type="button" class="bed-action" disabled={s.days<1 || tile(s,...info).moisture>=3} aria-label={tile(s,...info).moisture>=3?'Грядка уже полита':'Выбрать грядки для полива'} onClick={()=>setWatering([info])}><Icon name="water" size={28}/><small>{tile(s,...info).moisture>=3?'3/3':'1 д.'}</small></button>}
            {tile(s,...info).owned && <span class="bed-moisture"><Icon name="drop" size={13}/>{tile(s,...info).moisture}/3</span>}
            {guardable(s,...info) && <button type="button" class="bed-action" aria-label={`Защитить на эту неделю: 1 день и ${money(guardPrice(s))}`} disabled={s.days<1||s.money<guardPrice(s)} onClick={()=>{if(act({t:'guard',x:info[0],y:info[1]}))closeContext();}}><Icon name="shield" size={25}/><small>1 д. · {money(guardPrice(s))}</small></button>}
            {tile(s,...info).weeds && <button type="button" class="bed-action" aria-label="Прополоть за 1 день" disabled={s.days<1} onClick={()=>{if(act({t:'weed',x:info[0],y:info[1]}))closeContext();}}><Icon name="weeding" size={25}/><small>1 д.</small></button>}
            <button type="button" class="bed-action bed-info" aria-label="Подробнее о грядке" onClick={()=>{setDetails(info);closeContext();setSheet('bed');}}>i</button>
          </>}
        </BedPopover>}
        {flash && <div class="flash" role="status">{flash}</div>}
      </div>

      <footer class={`dock${card ? ' picking' : ''}${shown ? ' reading' : ''}${room.read ? ' roomy' : ''}${room.read > 40 ? ' roomy-2' : ''}${build || lens ? ' viewing' : ''}`}>
        <div class="dock-top" style={room.read ? { height: `${room.top + room.read}px` } : undefined}>
          <div class="days" aria-label={`Рабочих дней: ${s.days}`}>
            <b>{s.days}</b>
            <Icon name="day" size={18} />
            <small>{plural(s.days, 'день', 'дня', 'дней')}</small>
          </div>
          <button type="button" class={`deck-pile dock exchange-deck${exchanging?' choosing':''}`} disabled={weekPlaying} aria-pressed={exchanging==='card'} onClick={()=>{
            const why=exchangeProblem(s,card?.uid); if(why)return say(why);
            if(card) {if(act({t:'exchangeCard',uid:card.uid}))setSelected(null);}
            else {closeContext();setBuild(null);setLens(null);setExchanging(exchanging==='card'?false:'card');}
          }} title="Заменить одну карту за 1 день · раз в неделю" aria-label="Обменять карту за 1 день">
            <span class="deck-back" aria-hidden="true"><i/><i/><i/><svg class="exchange-ring" viewBox="0 0 32 32" fill="none"><path d="M25 11a10 10 0 1 0 1 8M25 4v8h-8" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
            <small>{exchangesUsed(s)>=exchangesPerWeek(s)?'обменён':exchangesPerWeek(s)-exchangesUsed(s)>1?`обмен ×${exchangesPerWeek(s)-exchangesUsed(s)} · 1 д.`:'обмен · 1 д.'}</small>
            {nextDraw(s) && <span class="deck-next" title="Следующая карта колоды"><CardArt def={nextDraw(s)!.def} size={18} /></span>}
          </button>
          {shown ? (
            <CardReadout s={s} card={shown} browsing={shown !== card} desc={room.read > 40} status={shown === card ? cardLine() : { text: 'Отпустите — выбрать · вверх — на поле', tone: 'instr' }} />
          ) : (
            <div class="info hand-summary">
              {weekPlaying ? <FieldVoice s={s} active={lifeActive&&pageVisible} cue={weekCue} quiet={true} testReplay={testing} onOpen={()=>openSheet('journal')} fallback={<span class="hand-count">События недели</span>}/> : exchanging ? <><strong>{exchanging==='compost'?'Выберите карту, которую заменит компост':'Выберите карту для обмена'}</strong><small>{exchanging==='compost'?'карта уйдёт в сброс':'1 день · обмены этой недели'}</small><button class="exchange-cancel" onClick={()=>setExchanging(false)}>Отмена</button></> : watering ? <><strong>Полив {watering.length}/{handWaterMax(s)}</strong><small>Отметьте соседние грядки · подтвердите лейкой</small></> : build ? <><strong>{buildItem ? BUILD_NAMES[buildItem].name : 'Перемещение'}</strong><small>{buildItem === 'scarecrow' ? 'Коснитесь угла грядки' : moveFrom || buildItem ? 'Коснитесь подсветки' : 'Коснитесь постройки'}</small></> : lens ? <><strong>{lens === 'water' ? 'Влага 0–3' : lens === 'soil' ? 'Плодородие 1–5' : 'Температура почвы'}</strong><small>{lens === 'water' ? 'Без воды рост останавливается' : lens === 'soil' ? 'Урожай ×0,6…×1,6' : 'Минимум роста — на карте'}</small></> : <><FieldVoice onOrder={onOrder ?? (()=>onGo('orders'))} testReplay={testing} s={s} active={sceneActive} cue={sceneCue} quiet={teaching} onOpen={() => openSheet('journal')} fallback={<span class="hand-count">Рука {hand.length}/{handMax(s)}<small>колода {deckCount(s)} · отложено {keptCount(s)}/{keepSlots(s)}</small></span>}/></>}

            </div>
          )}
          {card && def && (
            <div class="card-tools">

              {def.target === 'none' && !blockReason && <button type="button" class="btn primary tool" onClick={() => { if (act({ t: 'play', uid: card.uid })) setSelected(null); }}>Сыграть</button>}

              {!card.temp && s.phase === 'week' && <button type="button" class={`icon-btn keep-btn${card.keep ? ' on' : ''}`} aria-pressed={!!card.keep}
                title={card.keep ? 'Отложена на следующую неделю' : `Отложить на следующую неделю: ${keptCount(s)} из ${keepSlots(s)}`}
                aria-label={card.keep ? 'Не откладывать карту' : 'Отложить карту на следующую неделю'}
                onClick={() => { if (!card.keep && keptCount(s) >= keepSlots(s)) return say(keepSlots(s) === 1 ? 'Отложить можно одну карту: снимите булавку с другой' : `Отложить можно не больше ${keepSlots(s)} карт`); act({ t: 'keepCard', uid: card.uid }); }}><PinIcon /></button>}
              <button type="button" class="icon-btn tool-x" onClick={() => setSelected(null)} aria-label="Отменить выбор">✕</button>
            </div>
          )}
          {!shown && s.phase === 'shortfall' && onPayment && <button type="button" class="btn end-week pay-due" onClick={onPayment}>
            <span>Решить платёж</span><small class="bad">к оплате {money(s.due?.amount ?? 0)}</small>
          </button>}
          {!shown && !(s.phase === 'shortfall' && onPayment) && <button type="button" class={`btn end-week${ready ? ' ready' : ''}${weekPlaying?' skip-morning':''}`} disabled={night!=='off'&&night!=='fade'||!weekPlaying&&(s.phase !== 'week'||endWaiting)} onClick={weekPlaying?cancelMorning:endWeek}>
            <span>{weekPlaying?'Пропустить анимацию':endWaiting?'Завершаем работы…':'Завершить неделю'}</span>
            {!weekPlaying && endText && <small class={endBad ? 'bad' : ''}>{endText}</small>}
          </button>}
        </div>
        <div class="hand-row" style={{ ['--cw' as string]: `${fan.cw}px` }}>
          <div
            class={`hand fan${fan.tight ? ' tight' : ''}${peek !== null ? ' peeking' : ''}`}
            ref={(el) => { fanRef.current = el; }}
            role="list"
            aria-label={`Карты в руке: ${hand.length}`}
            style={{ ['--cw' as string]: `${fan.cw}px`, ['--sink' as string]: `${fan.sink}px`, ['--pivot' as string]: `${FAN_PIVOT * 100}%`, ...(room.fanMin ? { minHeight: `${room.fanMin}px` } : {}) }}
          >
            {hand.map((c: Card, i) => {
              const slot: FanSlot = fan.slots[i];
              return (
                <div
                  role="listitem"
                  data-uid={c.uid}
                  class={`fan-slot${drag?.uid === c.uid && drag.active ? ' slot-empty' : ''}${night === 'off' && dealt.includes(c.uid) ? ' dealt' : ''}${peek === c.uid ? ' peek' : ''}${compostArrival===c.uid?' compost-arriving':''}`}
                  style={{ left: `${slot.left}px`, zIndex: slot.z, ['--rot' as string]: `${slot.rot}deg`, ['--tx' as string]: `${slot.tx}px`, ['--dy' as string]: `${slot.dy}px`, ['--sc' as string]: String(slot.sc), ['--deal' as string]: `${Math.max(0, dealt.indexOf(c.uid)) * 110}ms` }}
                >
                  <CardView s={s} card={c} rot={selected === c.uid ? rot : 0} rotHint selected={selected === c.uid} blocked={cardBlockReason(s, c)} onClick={() => { if (justDragged.current) { justDragged.current = false; return; } pickCard(c.uid); }} onPointerDown={(e) => onCardPointerDown(e, c.uid)} />
                </div>
              );
            })}
            {leaving.map(l=><div key={`leaving-${l.card.uid}`} class="fan-slot leaving" style={l.style} aria-hidden="true" inert><CardView s={s} card={l.card} rot={l.rot}/></div>)}
            {!hand.length && <span class="muted hand-empty">Рука пуста: новые карты придут на следующей неделе.</span>}
          </div>
        </div>
      </footer>

      {compostFlight&&<div class={`compost-flight${compostFlight.claim?' claiming':''}`} style={{left:compostFlight.x,top:compostFlight.y,'--fly-x':`${compostFlight.dx}px`,'--fly-y':`${compostFlight.dy}px`}} aria-hidden="true"><CardView s={s} card={compostFlight.card}/></div>}
      {drag?.active && drag.touch && hover && CELL*px<44 && <PrecisionLoupe s={s} hover={hover} highlight={highlight} x={drag.x} y={drag.y-TOUCH_AIM_OFFSET}/> }
      {drag?.active && dragCard && (
        <div class={`drag-ghost${hover ? ' over' : ''}${drag.touch ? ' touch' : ''}`} style={{ transform: drag.touch ? `translate(${drag.x}px, ${drag.y - TOUCH_AIM_OFFSET}px)` : `translate(${drag.x + 40}px, ${drag.y + 40}px)` }} aria-hidden="true">
          <span class="ghost-badge"><CardArt def={dragCard.def} size={30} /></span>
        </div>
      )}

      <div class={`weekturn weekturn-${night}`} style={{'--cal-tear':`${CALENDAR_MS.tear*pace}ms`,'--cal-settle':`${CALENDAR_MS.settle*pace}ms`,'--cal-fade':`${CALENDAR_MS.fade*pace}ms`}} aria-hidden={night === 'off'} onClick={skipTurn}>
        {pages && (
          <div class="wt-box">
            <div class="wt-cal">
              <div class={`wt-page wt-next${pages[1].winter ? ' wt-winter' : ''}`}><div class="wt-head">{pages[1].season}</div><div class="wt-num">{pages[1].num}</div><div class="wt-sub">{pages[1].sub}</div>
                {(pages[1].sky || pages[1].signs.length > 0) && <div class={`wt-omen${pages[1].bad.length ? ' bad' : ''}`}>
                  {pages[1].sky && <svg class="wt-sky" viewBox="-42 -38 84 84" aria-hidden="true"><SkyPicture kind={pages[1].sky} /></svg>}
                  {pages[1].temp !== undefined && <b>{pages[1].temp > 0 ? '+' : ''}{pages[1].temp}°</b>}
                  {pages[1].signs.map((ic) => <Icon name={ic} size={20} />)}
                </div>}
              </div>
              <div class={`wt-page wt-cur${pages[0].winter ? ' wt-winter' : ''}`}><div class="wt-head">{pages[0].season}</div><div class="wt-num">{pages[0].num}</div><div class="wt-sub">{pages[0].sub}</div></div>
            </div>
            <div class="wt-caption">
              {night === 'hold' ? `Неделя ${pages[1].num}` : 'Неделя прошла'}
              <small>{night === 'hold' ? `${pages[1].season.split(' · ')[0].toLowerCase()}, ${pages[1].num}-я из ${pages[1].of}${pages[1].bad.length ? ` · впереди: ${pages[1].bad.join(', ')}` : ''}` : 'всё подросло, созревшее собрано'}</small>
            </div>
            <div class="wt-skip">пропустить ›</div>
          </div>
        )}
      </div>

      <OrderVisit s={s} lesson={teaching} onDone={onVisitDone} canStart={(teaching?lessonVisit:true)&&visitReady&&!running.current&&!ending.current} onVisible={setMeetingOpen} onOrder={onOrder??(()=>onGo('orders'))}/>
      {sheet === 'bed' && details && <Sheet title="Грядка" variant="info" onClose={()=>setSheet(null)}><TileDetails s={s} x={details[0]} y={details[1]} act={act} onClose={()=>setSheet(null)}/></Sheet>}
      {sheet === 'forecast' && <ForecastSheet s={fieldState} onClose={() => setSheet(null)} />}
      {sheet === 'journal' && <JournalSheet s={s} act={act} onGo={onGo} onClose={() => setSheet(null)} />}
      {false && onGo}
    </div>
  );
}
export { mischiefOn, airTemp };
