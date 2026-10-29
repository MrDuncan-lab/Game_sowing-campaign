// Поздняя игра дома (docs/PROGRESSION-v3.md §9.1): the harvest festival's result with Пряхин, the standings of the
// year so far, the district's table, and the rating sheet: the profile's records on this device and a result to
// send to friends in Telegram. A shared table of all players needs a server the game does not have yet: the sheet
// says so plainly.
import { createPortal } from 'preact/compat';
import { useState } from 'preact/hooks';
import { CROPS, EXPEDITION_IDS, LOCATIONS } from '../engine/data';
import { GameState, chronicle, tripDone, districtPlace, districtTable, festClub, festInClub, festOpen, festRival, festShow, isHome, plural } from '../engine/game';
import { FEST_CATS, FEST_CAT_GLORY, FEST_CERT, FEST_NAME, FEST_NAMES, FEST_PRIZE, FEST_UNITS, FEST_WIN_GLORY, SMOTR_CAT_GLORY, SMOTR_NAME, SMOTR_WIN_GLORY } from '../engine/festival';
import { rivalVerdict } from '../content/story';
import { LOOT } from '../engine/run';
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
          const win = you[c] > rival[c];
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
  // the certificate comes with the first win in the club only
  const certNow = f.win && festInClub(f) && s.fests?.find((x) => x.win && festInClub(x)) === f;
  return createPortal(
    <Sheet title={`${festInClub(f) ? FEST_NAME : SMOTR_NAME}, ${f.year}-й год`} icon="trophy" onClose={onClose}>
      <div class="fest-sheet">
        <div class="nb-head">
          <Rival />
          <div class="nb-say">
            <small>Аркадий Семёнович Пряхин, Заречье</small>
            <p>«{rivalVerdict(f.win, f.won.length > 0, f.year)}»</p>
          </div>
        </div>
        <Judging you={f.you} rival={f.rival} done />
        {f.bestCrop && <p class="small muted">Ваша лучшая грядка — {CROPS[f.bestCrop].name.toLowerCase()}, {f.you.best} ед.</p>}
        <p class={`fest-result ${f.win ? 'up' : ''}`}>
          {f.win ? (festInClub(f)
            ? <>Победа! Вы получаете +{f.glory} славы{certNow ? <> и грамоту «{FEST_CERT}»</> : ''}. На зимней ярмарке вас ждёт призовой лот за {Math.round(FEST_PRIZE * 100)}% цены, Пряхин его не тронет.</>
            : <>Смотр выиграли вы: +{f.glory} славы. Настоящий праздник урожая, с грамотой и призом, будет, когда деревня построит клуб.</>)
            : f.won.length ? <>Одна номинация ваша, это +{f.glory} славы. Для победы нужны две из трёх.</> : <>В этот раз без наград. Чтобы обойти Пряхина, растите урожай, число культур и лучшую грядку.</>}
        </p>
        <Btn tone="primary" onClick={onClose}>Дальше</Btn>
      </div>
    </Sheet>, document.body);
}

/** this year's standings before the winter show: on the square, or the festival in the club */
export function FestivalStandings({ s }: { s: GameState }) {
  if (!festOpen(s)) return null;
  const done = s.fests?.find((f) => f.year === s.year);
  const wins = (s.fests ?? []).filter((f) => f.win).length;
  const club = festClub(s);
  return (
    <section class="nb-swap fest-standings">
      <h3><Icon name="trophy" size={18} /> {club ? FEST_NAME : SMOTR_NAME}</h3>
      {done ? <p class="small">В этом году {club ? 'праздник' : 'смотр'} уже прошёл: {done.win ? 'вы обошли Пряхина' : 'победил Пряхин'}. Следующий будет в первую неделю зимы.</p>
        : <p class="small">В первую неделю зимы {club ? 'в клубе пройдёт праздник урожая' : 'на площади пройдёт смотр урожая'}. Обойдите Пряхина в двух номинациях из трёх: за каждую вы получите +{club ? FEST_CAT_GLORY : SMOTR_CAT_GLORY} славы, а за общую победу ещё +{club ? FEST_WIN_GLORY : SMOTR_WIN_GLORY}.{club ? ' За победу в клубе дают грамоту и призовой лот.' : ' Когда в деревне построят клуб, смотр станет праздником урожая, с грамотой и призовым лотом.'}</p>}
      <Judging you={done ? done.you : festShow(s)} rival={done ? done.rival : festRival(s)} done={!!done} />
      {wins > 0 && <small class="muted">Побед над Пряхиным: {wins}.</small>}
    </section>
  );
}

/** 29.10 · «Летопись хозяйства»: the home's six milestones; all six close it with an epilogue */
export function Chronicle({ s }: { s: GameState }) {
  const items = chronicle(s);
  const n = items.filter((c) => c.done).length;
  return (
    <div class="chronicle">
      <ol class="chronicle-list">
        {items.map((c) => (
          <li class={`${c.done ? 'done' : ''}${c.id === 'trips' ? ' wide' : ''}`}>
            <span class="chronicle-mark" aria-hidden="true">{c.done ? '✓' : ''}</span>
            <span><b>{c.name}</b><small>{c.hint}</small>
              {c.id === 'trips' && <span class="trip-chips">{EXPEDITION_IDS.map((l) => <i class={tripDone(s, l) ? 'on' : ''}>{tripDone(s, l) ? '✓ ' : ''}{LOCATIONS[l].name}</i>)}</span>}
            </span>
          </li>
        ))}
      </ol>
      {(s.trips ?? []).length > 0 && <div class="trip-log">
        <b>Привезено из краёв</b>
        {(s.trips ?? []).slice(-6).reverse().map((t) => <p class="small"><span>{LOCATIONS[t.loc].name}, {t.year}-й год:</span> {t.loot.length ? t.loot.map((l) => LOOT[l].name).join(', ') : 'деньги'}</p>)}
      </div>}
      <p class="small muted">{n === items.length ? 'Летопись закрыта. Игра продолжается: испытания становятся сильнее, а Пряхин каждую зиму ждёт вас на празднике.' : `Записано ${n} из ${items.length}. Когда закроются все, вас ждут эпилог, грамота и +50 славы.`}</p>
    </div>
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
  const parts = [`Посевная: слава ${p.glory}`, `лучший срок ${p.best.years} ${plural(p.best.years, 'год', 'года', 'лет')}`];
  const w = festWins(p);
  if (w) parts.push(`побед на празднике урожая: ${w}`);
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
    <Sheet title="Район и рекорды" icon="trophy" onClose={onClose}>
      <div class="stack rating-sheet">
        {isHome(s) && <>
          <h3>Район: {districtPlace(s)}-е место</h3>
          <p class="small muted">Сила хозяйства складывается из дома, построек, дворов соседей, общих построек и побед на празднике урожая. Соседние сёла тоже растут каждый год.</p>
          <DistrictTable s={s} />
        </>}
        <h3>Ваши рекорды</h3>
        <div class="kv"><span>Слава профиля</span><b>{profile.glory}</b></div>
        <div class="kv"><span>Дольше всего продержались</span><b>{profile.best.years} {plural(profile.best.years, 'год', 'года', 'лет')}</b></div>
        <div class="kv"><span>Больше всего урожая на ферме</span><b>{profile.best.harvest} ед.</b></div>
        <div class="kv"><span>Праздников урожая выиграно</span><b>{festWins(profile)}</b></div>
        {rows.length > 0 && <>
          <h4>Прошлые фермы</h4>
          <ol class="district past">
            {rows.map((r, i) => <li><b class="place">{i + 1}</b><span><b>{LOCATIONS[r.loc].name}</b><small>{r.years} {plural(r.years, 'год', 'года', 'лет')}. {r.reason}</small></span><b class="strength">{r.glory}</b></li>)}
          </ol>
        </>}
        <h3>Рейтинг игроков</h3>
        <p class="small">Общая таблица игроков появится, когда у игры будет свой сервер. Пока рейтинг хранится на этом устройстве, а результат можно отправить друзьям в Telegram.</p>
        <p class="share-text">«{text}»</p>
        <div class="btn-row">
          <Btn tone="primary" onClick={() => shareToTelegram(text)}><Icon name="send" size={18} /> Отправить в Telegram</Btn>
          <Btn tone="ghost" onClick={copy}>{copied ? 'Скопировано' : 'Скопировать'}</Btn>
        </div>
      </div>
    </Sheet>, document.body);
}
