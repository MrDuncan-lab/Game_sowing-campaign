// The season's fair (progression v3 §4): a few lots each season — equipment, building materials, a worker looking
// for a job. The region's rival (Пряхин at home and in Заречье, local dealers far away) eyes one lot a week and may buy it at the week's end; a deposit keeps a lot for
// the player to the end of the next week.
import { MATERIALS, MATERIAL_IDS, SEASON_GEN, TRACKS, WORKERS, type MaterialId } from '../engine/data';
import {
  GameState, FairLot, fairBuyProblem, fairDeposit, fairHeld, fairHoldProblem, fairPayNow, lotName, lvl, matStock, matsList, money, plural,
  RIVAL_MAX, seasonLen, workerSlots, isHome,
} from '../engine/game';
import { fairRival } from '../content/story';
import { Face } from './Story';
import { Icon } from '../art/icons';
import { Portrait, type PersonId } from '../art/portraits';
import { Btn, Dispatch } from './common';

const NB = ' ';
export const MAT_ICON: Record<MaterialId, string> = { logs: 'logs', bricks: 'bricks', glass: 'glass' };

/** The shed: what building materials the farm has, as small chips. */
export function ShedChips({ s, need }: { s: GameState; need?: Partial<Record<MaterialId, number>> }) {
  return (
    <span class="shed-chips" aria-label={`В сарае: ${MATERIAL_IDS.map((k) => `${MATERIALS[k].name.toLowerCase()} ${matStock(s, k)}`).join(', ')}`}>
      {MATERIAL_IDS.map((k) => {
        const n = need?.[k];
        if (need && !n) return null;
        const short = n !== undefined && matStock(s, k) < n;
        return (
          <span class={`shed-chip${short ? ' short' : ''}`} title={MATERIALS[k].name}>
            <Icon name={MAT_ICON[k]} size={18} />
            <b>{n !== undefined ? `${matStock(s, k)}/${n}` : matStock(s, k)}</b>
          </span>
        );
      })}
    </span>
  );
}

function LotArt({ l }: { l: FairLot }) {
  if (l.kind === 'worker') return <Portrait id={WORKERS[l.worker!].portrait as PersonId} size={48} />;
  if (l.kind === 'equip') return <span class="lot-icon"><Icon name={TRACKS[l.track!].icon} size={36} /></span>;
  const kinds = matsList(l.mats!).map(([k]) => k);
  return <span class={`lot-icon${kinds.length > 1 ? ' many' : ''}`}>{kinds.map((k) => <Icon name={MAT_ICON[k]} size={kinds.length > 1 ? 24 : 36} />)}</span>;
}

function lotNote(s: GameState, l: FairLot): string {
  if (l.kind === 'equip') {
    const L = TRACKS[l.track!].levels[l.level! - 1];
    const jump = l.level! - lvl(s, l.track!) > 1;
    return `${TRACKS[l.track!].name}${jump ? `, сразу ${l.level}-й уровень` : ''}: ${L.text}`;
  }
  if (l.kind === 'mat') {
    const n = matsList(l.mats!).reduce((a, [, q]) => a + q, 0);
    return l.special ? `целая подвода: всё сразу и дешевле, чем порознь` : `${n}${NB}ед., ${money(l.price / n)} за единицу`;
  }
  return WORKERS[l.worker!].levels[(l.wlevel ?? 1) - 1];
}

function LotCard({ s, l, act }: { s: GameState; l: FairLot; act: Dispatch }) {
  const eyed = s.fair?.eye === l.id && !l.sold;
  const held = fairHeld(s, l);
  const why = fairBuyProblem(s, l);
  const holdWhy = fairHoldProblem(s, l);
  return (
    <article class={`fair-lot kind-${l.kind}${l.sold ? ` sold sold-${l.sold}` : ''}${eyed ? ' eyed' : ''}${held ? ' held' : ''}`} data-lot={l.id}>
      <LotArt l={l} />
      <div class="lot-body">
        <b class="lot-name">{lotName(l)}</b>
        <small class="lot-note">{lotNote(s, l)}</small>
        <span class="lot-tags">
          {l.prize ? <span class="tag good"><Icon name="trophy" size={14} /> приз праздника</span> : l.special && <span class="tag good">особый лот</span>}
          {l.used && <span class="tag">б/у</span>}
          {eyed && <span class="tag warn"><Icon name="eye" size={14} /> {fairRival(s.loc).name} присматривается</span>}
          {held && <span class="tag good">за вами до конца {l.hold === s.absWeek ? 'этой' : 'следующей'} недели, задаток {money(l.deposit ?? 0)}</span>}
        </span>
      </div>
      <div class="lot-side">
        {l.sold === 'rival' ? <span class="lot-sold">купил {fairRival(s.loc).name}</span> : l.sold === 'player' ? <span class="lot-sold up">куплено</span> : (
          <>
            <b class="lot-price">{money(fairPayNow(l))}</b>
            <Btn small tone="primary" disabled={why} onClick={() => act({ t: 'fairBuy', id: l.id })}>Купить</Btn>
            {!held && <Btn small tone="ghost" disabled={holdWhy} onClick={() => act({ t: 'fairHold', id: l.id })}>Задаток {money(fairDeposit(l))}</Btn>}
          </>
        )}
      </div>
    </article>
  );
}

export function FairPanel({ s, act }: { s: GameState; act: Dispatch }) {
  const f = s.fair;
  if (!f) return <section class="panel fair-panel"><p class="small muted">Ярмарка откроется в новом сезоне.</p></section>;
  const left = seasonLen(s) - s.weekInSeason + 1;
  const open = f.lots.filter((l) => !l.sold), sold = f.lots.filter((l) => l.sold);
  const beds = workerSlots(s) - s.team.length;
  return (
    <section class="panel fair-panel" aria-label="Ярмарка сезона">
      <header class="fair-head">
        <Icon name="fair" size={34} />
        <span class="grow">
          <b>Ярмарка {SEASON_GEN[f.season]}</b>
          <small>{left > 1 ? `закроется через ${left}${NB}${plural(left, 'неделю', 'недели', 'недель')}` : 'последняя неделя, в новом сезоне будут новые лоты'}</small>
        </span>
        <ShedChips s={s} />
      </header>
      <p class="fair-rival">
        <Face who={fairRival(s.loc).who} size={40} />
        <span>
          {fairRival(s.loc).text}. Каждую неделю он присматривается к одному лоту и в конце недели может его купить. За сезон он может купить не больше {RIVAL_MAX} {plural(RIVAL_MAX, 'лота', 'лотов', 'лотов')}{f.rival ? `, уже купил ${f.rival}` : ''}.
          Задаток оставляет лот за вами до конца следующей недели. Если лот не выкупить вовремя, задаток пропадёт.
        </span>
      </p>
      <div class="fair-lots">
        {open.map((l) => <LotCard s={s} l={l} act={act} />)}
        {!open.length && <p class="small muted">Всё разобрали. Новые лоты появятся в новом сезоне.</p>}
      </div>
      {open.some((l) => l.kind === 'worker') && <p class="small muted">{beds > 0 ? `Свободных кроватей: ${beds}.` : isHome(s) ? 'Свободных кроватей нет. Улучшите дом, договоритесь о постое у соседей или постройте общежитие.' : 'Свободных кроватей нет. Нанять работника можно, когда вы улучшите лагерь.'}</p>}
      {sold.length > 0 && <details class="fair-sold"><summary>Продано в этом сезоне: {sold.length}</summary>{sold.map((l) => <LotCard s={s} l={l} act={act} />)}</details>}
    </section>
  );
}
