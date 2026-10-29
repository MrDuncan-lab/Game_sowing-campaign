// Соседи (docs/PROGRESSION-v3.md §7, §11): the sheet of a neighbour's yard — who they are, the three stages with
// what each takes, the swap, «Позвать соседа» and what the yard gives once it stands; the sheet of the shared
// buildings; the row of neighbours on the House screen. Opened from the village (a tap on a yard) and from the house.
import { createPortal } from 'preact/compat';
import { useState } from 'preact/hooks';
import { CARDS, CROPS, CropId, TRACKS } from '../engine/data';
import {
  GameState, ZINA_CARDS, ZinaCard, commonCost, commonProblem, commonWeeks, commonsOpen, cropNeedStock, forgeOffer, forgeOfferLines, forgeProblem, hasCommon,
  lvl, money, plural, seasonKey, stockOf, swapProblem, yardCost, yardHelpProblem, yardProblem, yardStage, yardWeeks, yardsStanding,
} from '../engine/game';
import { COMMONS, COMMONS_NEED, COMMON_IDS, CommonId, FORGE_WEEKS, TOLOKA, YARDS, YARD_IDS, YardId } from '../engine/neighbours';
import { PORTRAIT_IMAGES, Portrait, PersonId } from '../art/portraits';
import { CropIcon } from '../art/crops';
import { Icon } from '../art/icons';
import { Bar, Btn, Dispatch, Pips, Sheet } from './common';
import { ShedChips } from './Fair';
import { DistrictTable, FestivalStandings } from './Festival';
import { districtPlace } from '../engine/game';

/** «3 недели»: a span of work or a wait, in words */
const weeks = (n: number) => {
  const k = Math.ceil(n - 1e-9);
  return `${k} ${plural(k, 'неделя', 'недели', 'недель')}`;
};
const cap = (t: string) => `${t[0].toUpperCase()}${t.slice(1)}`;

export type NeighbourKey = YardId | 'commons';
/** the village's places that belong to a neighbour or a shared building (see tools/village: the yards' spots) */
export const PLACE_NEIGHBOUR: Record<string, NeighbourKey> = {
  'n-zina': 'zina', 'n-savva': 'savva', 'n-efim': 'efim', 'n-miller': 'miller', 'n-karpov': 'karpov',
  'c-bridge': 'commons', 'c-club': 'commons', 'c-hostel': 'commons', 'c-pump': 'commons',
};

function Person({ id, size }: { id: string; size: number }) {
  const img = PORTRAIT_IMAGES[id];
  return img ? <img class="nb-face" src={img} alt="" width={size} height={size} /> : <Portrait id={id as PersonId} size={size} />;
}

/** a crop need in a chip: have / need, the crops it can be */
function CropChip({ s, crops, qty, name }: { s: GameState; crops: CropId[]; qty: number; name: string }) {
  const have = cropNeedStock(s, crops);
  return (
    <span class={`shed-chip${have < qty ? ' short' : ''}`} title={crops.map((c) => CROPS[c].name).join(', ')}>
      {crops.length <= 3 ? crops.slice(0, 3).map((c) => <CropIcon id={c} size={18} />) : <Icon name="seeds" size={18} />}
      <b>{have}/{qty}</b><small>{name}</small>
    </span>
  );
}

function YardBody({ s, y, act, onFair }: { s: GameState; y: YardId; act: Dispatch; onFair: () => void }) {
  const D = YARDS[y];
  const now = yardStage(s, y);
  const proj = s.projects.find((p) => p.kind === 'yard' && p.yard === y);
  const next = D.stages[now];
  const why = yardProblem(s, y);
  const [card, setCard] = useState<ZinaCard>('compost');
  const swapWhy = swapProblem(s, y);
  const helpWhy = yardHelpProblem(s, y);
  const swapCrops = D.swap.take.crops.filter((c) => stockOf(s, c) >= D.swap.take.qty);
  return (
    <>
      <div class="nb-head">
        <Person id={D.person} size={96} />
        <div class="nb-say">
          <small>{cap(D.who)}. {D.looks[now]}</small>
          <p>«{D.lines[now]}»</p>
        </div>
      </div>
      <ol class="nb-stages" aria-label="Стадии двора">
        {D.stages.map((st, i) => {
          const state = i < now ? 'got' : proj && proj.kind === 'yard' && proj.stage === i + 1 ? 'busy' : i === now ? 'next' : 'later';
          return (
            <li class={`nb-stage ${state}`}>
              <span class="nb-step">{i < now ? '✓' : i + 1}</span>
              <span class="nb-stage-text">
                <b>{st.name}</b>
                <small>{i === 0 ? `Откроется мена: ${D.swap.give}` : cap(i === 1 ? D.second : D.third)}</small>
                {state === 'next' && (
                  <span class="nb-need">
                    <ShedChips s={s} need={st.mat} />
                    {st.crop && <CropChip s={s} {...st.crop} />}
                  </span>
                )}
                {state === 'busy' && proj && <span class="nb-progress"><Bar value={proj.total - proj.weeks} max={proj.total} tone="good" /><small>ещё {weeks(proj.weeks)}{s.season === 3 ? '. Зимой стройка идёт вдвое медленнее' : ''}</small></span>}
              </span>
            </li>
          );
        })}
      </ol>
      {next && !proj && (
        <div class="nb-act">
          <Btn tone={why ? undefined : 'primary'} disabled={why} onClick={() => act({ t: 'yardBuild', yard: y })}>
            Строить «{next.name}»: {money(yardCost(s, y, now + 1))}, {weeks(yardWeeks(s, y, now + 1))}
          </Btn>
          {why && <small class="muted">{why}{why.startsWith('Не хватает') && <>. <button type="button" class="link" onClick={onFair}>Материалы продаются на ярмарке</button></>}</small>}
          <small class="muted">Стройка займёт одно место в бригаде. За неё вы получите +{now === 2 ? 20 : 10} славы.</small>
        </div>
      )}
      {now >= 1 && (
        <section class="nb-swap">
          <h3>Мена{y === 'zina' && now >= 2 ? ': каждую неделю' : ': раз в сезон'}</h3>
          <p class="small">За {D.swap.take.qty} ед. {D.swap.take.name} одной культуры: {D.swap.give}.</p>
          {y === 'zina' && (
            <div class="seg" role="radiogroup" aria-label="Какую карту взять">
              {ZINA_CARDS.map((c) => <button type="button" role="radio" aria-checked={card === c} class={card === c ? 'on' : ''} onClick={() => setCard(c)}>{CARDS[c].name}</button>)}
            </div>
          )}
          {swapWhy ? <small class="muted">{swapWhy}</small> : (
            <div class="nb-crops">
              {swapCrops.map((c) => (
                <button type="button" class="nb-crop" onClick={() => act({ t: 'yardSwap', yard: y, crop: c, ...(y === 'zina' ? { card } : {}) })}>
                  <CropIcon id={c} size={26} /><span>{CROPS[c].name}</span><small>{stockOf(s, c)}</small>
                </button>
              ))}
            </div>
          )}
        </section>
      )}
      {now >= 2 && (
        <section class="nb-swap">
          <h3>Подмога</h3>
          <Btn small tone={helpWhy ? undefined : 'good'} disabled={helpWhy} onClick={() => act({ t: 'yardHelp', yard: y })}>Позвать соседа (+1 рабочий день)</Btn>
          <small class="muted">{helpWhy ?? 'Раз в сезон сосед придёт помочь на поле.'}</small>
        </section>
      )}
      {y === 'savva' && now >= 2 && <Forge s={s} act={act} />}
      {y === 'karpov' && now >= 2 && <p class="small nb-note"><Icon name="team" size={16} /> В пристройке есть 2 кровати для ваших работников.</p>}
      {y !== 'karpov' && now >= 2 && <p class="small nb-note"><Icon name="team" size={16} /> У {D.gen} есть кровать для вашего работника.</p>}
    </>
  );
}

function Forge({ s, act }: { s: GameState; act: Dispatch }) {
  const lines = forgeOfferLines(s);
  const f = s.forge;
  return (
    <section class="nb-swap">
      <h3>Кузня Саввы</h3>
      {f ? (
        <p class="small">Савва куёт «{TRACKS[f.track].levels[f.level - 1].name}», будет готово через {weeks(Math.max(1, f.week - s.absWeek))}.</p>
      ) : lines.length ? (
        <div class="nb-forge">
          {lines.map((t) => {
            const o = forgeOffer(s, t)!;
            const why = forgeProblem(s, t);
            return (
              <button type="button" class="nb-forge-line" disabled={!!why} title={why ?? undefined} onClick={() => act({ t: 'forge', track: t })}>
                <Icon name={TRACKS[t].icon} size={22} />
                <span><b>{TRACKS[t].levels[o.level - 1].name}</b><small>{TRACKS[t].name}{lvl(s, t) ? `, сейчас ${lvl(s, t)}-й уровень` : ''}</small></span>
                <b class="price">{money(o.price)}</b>
              </button>
            );
          })}
        </div>
      ) : <p class="small muted">Всё, что продают на ярмарке, у вас уже есть.</p>}
      <small class="muted">Дороже ярмарки на 30%, зато без очереди и без Пряхина. Работа займёт {weeks(FORGE_WEEKS)}.</small>
    </section>
  );
}

function CommonsBody({ s, act, onFair }: { s: GameState; act: Dispatch; onFair: () => void }) {
  const open = commonsOpen(s);
  return (
    <>
      <p class="small">{open
        ? `Три двора уже на ногах, и деревня берётся за общие постройки. Строить будут всем миром, толокой: это на ${Math.round((1 - TOLOKA) * 100)}% быстрее.`
        : `Когда ${COMMONS_NEED} двора дойдут до второй стадии, деревня возьмётся за общие постройки. Пока их ${yardsStanding(s)} из ${COMMONS_NEED}.`}</p>
      <div class="nb-commons">
        {COMMON_IDS.map((c) => {
          const D = COMMONS[c];
          const proj = s.projects.find((p) => p.kind === 'common' && p.id === c);
          const why = commonProblem(s, c);
          const done = hasCommon(s, c);
          return (
            <div class={`nb-common${done ? ' done' : ''}${proj ? ' busy' : ''}`}>
              <Icon name={COMMON_ICON[c]} size={30} />
              <span class="nb-common-text">
                <b>{D.name}</b><small>{D.text}</small>
                {!done && !proj && open && <span class="nb-need"><ShedChips s={s} need={D.mat} /></span>}
                {proj && <span class="nb-progress"><Bar value={proj.total - proj.weeks} max={proj.total} tone="good" /><small>ещё {weeks(proj.weeks)}</small></span>}
              </span>
              {done ? <span class="up small">стоит</span> : !proj && open ? (
                <Btn small tone={why ? undefined : 'primary'} disabled={why} onClick={() => act({ t: 'commonBuild', id: c })}>{money(commonCost(s, c))}, {Math.ceil(commonWeeks(s, c) - 1e-9)} нед.</Btn>
              ) : null}
            </div>
          );
        })}
      </div>
      {open && COMMON_IDS.some((c) => commonProblem(s, c)?.startsWith('Не хватает')) && <p class="small"><button type="button" class="link" onClick={onFair}>Материалы продаются на ярмарке</button></p>}
      <FestivalStandings s={s} />
      <details class="nb-district">
        <summary><Icon name="trophy" size={18} /> Район: {districtPlace(s)}-е место</summary>
        <DistrictTable s={s} />
      </details>
    </>
  );
}
export const COMMON_ICON: Record<CommonId, string> = { bridge: 'bridge', club: 'club', hostel: 'team', pump: 'pump' };

export function NeighbourSheet({ s, who, act, onClose, onFair }: { s: GameState; who: NeighbourKey; act: Dispatch; onClose: () => void; onFair: () => void }) {
  const title = who === 'commons' ? 'Общие постройки деревни' : YARDS[who].name;
  return createPortal(
    <Sheet title={title} icon={who === 'commons' ? 'village' : undefined} onClose={onClose}>
      <div class="nb-sheet">
        {who === 'commons' ? <CommonsBody s={s} act={act} onFair={onFair} /> : <YardBody s={s} y={who} act={act} onFair={onFair} />}
      </div>
    </Sheet>, document.body);
}

/** the neighbours in a row on the House screen: who, how far their yard has come, what is happening there */
export function NeighbourRow({ s, onOpen }: { s: GameState; onOpen: (k: NeighbourKey) => void }) {
  const key = seasonKey(s);
  return (
    <div class="nb-row">
      {YARD_IDS.map((y) => {
        const D = YARDS[y], st = yardStage(s, y);
        const busy = s.projects.some((p) => p.kind === 'yard' && p.yard === y);
        const swap = st >= 1 && !swapProblem(s, y);
        const help = st >= 2 && s.yards?.[y]?.help !== key;
        return (
          <button type="button" class={`nb-card${busy ? ' busy' : ''}`} onClick={() => onOpen(y)} aria-label={`${D.name}, стадия ${st} из 3`}>
            <Person id={D.person} size={56} />
            <b>{D.name.split(' ').at(-1)}</b>
            <Pips n={st} of={3} />
            <small>{busy ? 'строим' : swap ? 'мена' : help ? 'подмога' : st === 3 ? 'двор стоит' : D.stages[st].name}</small>
          </button>
        );
      })}
      <button type="button" class="nb-card commons" onClick={() => onOpen('commons')} aria-label="Общие постройки деревни">
        <span class="nb-commons-icon"><Icon name="village" size={40} /></span>
        <b>Деревня</b>
        <Pips n={(s.commons ?? []).length} of={COMMON_IDS.length} />
        <small>{commonsOpen(s) ? 'толока' : `${yardsStanding(s)}/${COMMONS_NEED} двора`}</small>
      </button>
    </div>
  );
}
