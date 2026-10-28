// Поздняя игра дома (docs/PROGRESSION-v3.md §9.1): the harvest festival's result with Пряхин, the standings of the
// year so far, the district's table, and the rating sheet: the profile's records on this device and a result to
// send to friends in Telegram. A shared table of all players needs a server the game does not have yet: the sheet
// says so plainly.
import { createPortal } from 'preact/compat';
import { useState } from 'preact/hooks';
import { CROPS, LOCATIONS } from '../engine/data';
import { GameState, districtPlace, districtTable, festOpen, festRival, festShow, isHome } from '../engine/game';
import { FEST_CATS, FEST_CAT_GLORY, FEST_NAMES, FEST_UNITS, FEST_WIN_GLORY } from '../engine/festival';
import { PORTRAIT_IMAGES } from '../art/portraits';
import { Icon } from '../art/icons';
import { Btn, Sheet } from './common';
import type { Profile } from './persist';

const seenKey = (s: GameState, year: number) => `posevnaya.fest.${s.seed}.${year}`;
const seenNow = new Set<string>();
export function festSeen(s: GameState, year: number) {
  const k = seenKey(s, year);
  if (seenNow.has(k)) return true;
  try { return !!localStorage.getItem(k); } catch { return false; }
}
export function markFestSeen(s: GameState, year: number) {
  const k = seenKey(s, year);
  seenNow.add(k);
  try { localStorage.setItem(k, '1'); } catch { /* the session remembers it */ }
}
/** the festival of this year, while it has not been looked at */
export const festToShow = (s: GameState) => {
  const f = s.fests?.at(-1);
  return f && f.year === s.year && s.season === 3 && !festSeen(s, f.year) ? f : null;
};

function Rival({ size = 88 }: { size?: number }) {
  return PORTRAIT_IMAGES.pryakhin ? <img class="nb-face fest-face" src={PORTRAIT_IMAGES.pryakhin} alt="" width={size} height={size} /> : <Icon name="trophy" size={size} />;
}

/** the three judgings side by side: you and Пряхин */
function Judging({ you, rival, done }: { you: Record<string, number>; rival: Record<string, number>; done: boolean }) {
  return (
    <table class="fest-table">
      <thead><tr><th></th><th>Вы</th><th>Пряхин</th></tr></thead>
      <tbody>
        {FEST_CATS.map((c) => {
          const win = you[c] >= rival[c];
          return (
            <tr class={win ? 'win' : 'lose'}>
              <th scope="row">{FEST_NAMES[c]}<small>{FEST_UNITS[c]}</small></th>
              <td>{you[c]}{win && done && <span class="fest-mark" aria-label="победа"> ✓</span>}</td>
              <td>{rival[c]}{!win && done && <span class="fest-mark" aria-label="победа Пряхина"> ✓</span>}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function FestivalSheet({ s, onClose }: { s: GameState; onClose: () => void }) {
  const f = s.fests?.at(-1);
  if (!f) return null;
  return createPortal(
    <Sheet title={`Праздник урожая · ${f.year}-й год`} icon="trophy" onClose={onClose}>
      <div class="fest-sheet">
        <div class="nb-head">
          <Rival />
          <div class="nb-say">
            <small>Пряхин, сосед-соперник</small>
            <p>{f.win ? '«Ну… твой год. Запиши себе. Но на будущий — посмотрим.»' : f.won.length ? '«Недурно. Но смотр мой. Приходи на будущий год.»' : '«Кто ж так урожай собирает? Учись, пока я жив.»'}</p>
          </div>
        </div>
        <Judging you={f.you} rival={f.rival} done />
        {f.bestCrop && <p class="small muted">Ваша лучшая грядка — {CROPS[f.bestCrop].name.toLowerCase()}, {f.you.best} ед.</p>}
        <p class={`fest-result ${f.win ? 'up' : ''}`}>
          {f.win ? <>Победа! Слава +{f.glory} · грамота «Победитель праздника урожая» · на зимней ярмарке ждёт призовой лот — за 60% цены, Пряхин его не тронет.</>
            : f.won.length ? <>Одна номинация ваша: слава +{f.glory}. Для победы нужны две из трёх.</> : <>В этот раз без наград. Пряхин крепчает каждый год — растите урожай, культуры и лучшую грядку.</>}
        </p>
        <Btn tone="primary" onClick={onClose}>Дальше</Btn>
      </div>
    </Sheet>, document.body);
}

/** this year's standings before the festival (the club's place in the village sheet) */
export function FestivalStandings({ s }: { s: GameState }) {
  if (!festOpen(s)) return null;
  const done = s.fests?.find((f) => f.year === s.year);
  const wins = (s.fests ?? []).filter((f) => f.win).length;
  return (
    <section class="nb-swap fest-standings">
      <h3><Icon name="trophy" size={18} /> Праздник урожая</h3>
      {done ? <p class="small">В этом году смотр прошёл: {done.win ? 'вы победили' : 'первый — Пряхин'}. Следующий — в первую неделю зимы.</p>
        : <p class="small">В первую неделю зимы — смотр хозяйств. Нужно обойти Пряхина в двух номинациях из трёх: +{FEST_CAT_GLORY} славы за каждую и +{FEST_WIN_GLORY} за победу.</p>}
      <Judging you={done ? done.you : festShow(s)} rival={done ? done.rival : festRival(s)} done={!!done} />
      {wins > 0 && <small class="muted">Побед на празднике: {wins}.</small>}
    </section>
  );
}

/** the district's table: the farm among the villages round about */
export function DistrictTable({ s }: { s: GameState }) {
  const rows = districtTable(s);
  return (
    <ol class="district">
      {rows.map((r, i) => (
        <li class={r.you ? 'you' : ''}>
          <b class="place">{i + 1}</b>
          <span><b>{r.name}</b><small>{r.note}</small></span>
          <b class="strength">{r.strength}</b>
        </li>
      ))}
    </ol>
  );
}

const GAME_URL = 'https://github.com/MrDuncan-lab/Game_sowing-campaign';
const festWins = (p: Profile) => p.applied.filter((id) => id.includes('|fest-win-')).length;
/** the result in a line, for the share */
export function shareText(s: GameState, p: Profile) {
  const parts = [`Посевная: слава ${p.glory}`, `лучший срок — ${p.best.years} ${p.best.years === 1 ? 'год' : p.best.years < 5 && p.best.years > 1 ? 'года' : 'лет'}`];
  const w = festWins(p);
  if (w) parts.push(`праздников урожая выиграно: ${w}`);
  if (isHome(s)) parts.push(`${districtPlace(s)}-е место в районе`);
  return `${parts.join(', ')}. Обгонишь?`;
}
function shareUrl(text: string) {
  const here = typeof location !== 'undefined' && /^https?:/.test(location.protocol) ? location.href.split('#')[0] : GAME_URL;
  return `https://t.me/share/url?url=${encodeURIComponent(here)}&text=${encodeURIComponent(text)}`;
}
function shareToTelegram(text: string) {
  const url = shareUrl(text);
  const tg = (window as unknown as { Telegram?: { WebApp?: { openTelegramLink?: (u: string) => void } } }).Telegram?.WebApp;
  if (tg?.openTelegramLink) tg.openTelegramLink(url);
  else window.open(url, '_blank', 'noopener');
}

/** «Рейтинг»: the district (at home), the profile's records on this device, the share to Telegram */
export function RatingSheet({ s, profile, onClose }: { s: GameState; profile: Profile; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const text = shareText(s, profile);
  const rows = [...profile.history].sort((a, b) => b.glory - a.glory).slice(0, 8);
  const copy = async () => {
    try { await navigator.clipboard.writeText(`${text} ${GAME_URL}`); setCopied(true); } catch { setCopied(false); }
  };
  return createPortal(
    <Sheet title="Рейтинг" icon="trophy" onClose={onClose}>
      <div class="stack rating-sheet">
        {isHome(s) && <>
          <h3>Район · {districtPlace(s)}-е место</h3>
          <p class="small muted">Сила хозяйства: дом, постройки, дворы соседей, общие постройки и победы на празднике урожая. Соседние сёла тоже растут каждый год.</p>
          <DistrictTable s={s} />
        </>}
        <h3>Ваши рекорды</h3>
        <div class="kv"><span>Слава профиля</span><b>{profile.glory}</b></div>
        <div class="kv"><span>Дольше всего продержались</span><b>{profile.best.years} г.</b></div>
        <div class="kv"><span>Больше всего урожая на ферме</span><b>{profile.best.harvest} ед.</b></div>
        <div class="kv"><span>Праздников урожая выиграно</span><b>{festWins(profile)}</b></div>
        {rows.length > 0 && <>
          <h4>Прошлые фермы</h4>
          <ol class="district past">
            {rows.map((r, i) => <li><b class="place">{i + 1}</b><span><b>{LOCATIONS[r.loc].name}</b><small>{r.years} г. · {r.reason}</small></span><b class="strength">{r.glory}</b></li>)}
          </ol>
        </>}
        <h3>Рейтинг игроков</h3>
        <p class="small">Общая таблица игроков появится, когда у игры будет свой сервер. Пока рейтинг хранится на этом устройстве, а результат можно отправить друзьям в Telegram:</p>
        <p class="share-text">«{text}»</p>
        <div class="btn-row">
          <Btn tone="primary" onClick={() => shareToTelegram(text)}><Icon name="send" size={18} /> Отправить в Telegram</Btn>
          <Btn tone="ghost" onClick={copy}>{copied ? 'Скопировано' : 'Скопировать'}</Btn>
        </div>
      </div>
    </Sheet>, document.body);
}
