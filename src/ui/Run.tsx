// v3 · the roguelite of expeditions (docs/PROGRESSION-v3.md §3, docs/CHARACTERS-v3.md): the departure with its
// three plots and the cart, the visitor at the camp, the run's finds, folding the farm and the return home; the
// home's bankruptcy that can be worked off and its arrest.
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { createPortal } from 'preact/compat';
import { CARDS, EXPEDITION_IDS, LOCATIONS, MATERIALS, WORKERS, type ExpeditionId, type Terrain } from '../engine/data';
import {
  GameState, Card, buyoutPrice, foldProblem, foldValue, infl, lootCount, lootOffers, money, plural, visitOptions, randomSeed, matsList, chainsDone,
} from '../engine/game';
import { CONDITIONS, LOOT, RELICS, VISITS, runMap, type LootId, type PlotOffer, type RelicId } from '../engine/run';
import { CART_CARDS, cartCards, cartCashMax, cartWorkers, departProblem, departureOffers, expeditionOpen, type Cart } from '../engine/meta';
import { Icon } from '../art/icons';
import { Portrait, PORTRAIT_IMAGES, type PersonId } from '../art/portraits';
import { Btn, ClosedLayer, Dispatch, Sheet, reducedMotionNow } from './common';
import { CardView } from './Card';

const NB = ' ';
const TERRAIN_FILL: Record<Terrain, string> = { plain: '#cfdf9f', sand: '#ecd99c', river: '#7cc2e8', rock: '#b9b3a8', forest: '#4f7f4a', swamp: '#8fae8c' };

/** a run's plot as a little 6×6 plan: water, sand, stones, taiga; the start plot outlined */
export function PlotMap({ terrain, size = 108 }: { terrain: Terrain[]; size?: number }) {
  const c = 16;
  return (
    <svg viewBox={`0 0 ${6 * c + 4} ${6 * c + 4}`} width={size} height={size} class="plot-map" aria-hidden="true">
      <rect x={0} y={0} width={6 * c + 4} height={6 * c + 4} rx={6} fill="#f6ecd2" stroke="#3f2a1d" stroke-width={1.6} />
      {terrain.map((t, i) => {
        const x = 2 + (i % 6) * c, y = 2 + Math.floor(i / 6) * c;
        return <g>
          <rect x={x + 0.5} y={y + 0.5} width={c - 1} height={c - 1} rx={2.5} fill={TERRAIN_FILL[t]} />
          {t === 'forest' && <path d={`M${x + 8} ${y + 3} l5 9 h-10z`} fill="#2f5a2e" />}
          {t === 'rock' && <circle cx={x + 8} cy={y + 9} r={3.4} fill="#8a857c" />}
          {t === 'swamp' && <path d={`M${x + 4} ${y + 10} h8`} stroke="#5a7f5a" stroke-width={1.6} />}
        </g>;
      })}
      <rect x={2 + c} y={2 + c} width={3 * c} height={3 * c} rx={3} fill="none" stroke="#3f2a1d" stroke-width={2} stroke-dasharray="4 3" />
    </svg>
  );
}

export function RelicChip({ id }: { id: RelicId }) {
  return <span class="relic-chip" title={RELICS[id].text}><Icon name={RELICS[id].icon} size={18} /><b>{RELICS[id].name}</b></span>;
}

// ---------------------------------------------------------------- departure
/** The departure: three plots of the region (a condition and a find each), then the cart from home. */
export function Departure({ home, loc, glory, onCancel, onGo }: { home: GameState; loc: ExpeditionId; glory: number; onCancel: () => void; onGo: (offer: PlotOffer, cart: Cart, seed: string) => void }) {
  const [seed] = useState(() => `${randomSeed()}-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`);
  const offers = useMemo(() => departureOffers(home, loc), [home.seed, home.absWeek, loc]);
  const maps = useMemo(() => offers.map((o) => runMap(loc, seed, o.cond)), [offers, seed]);
  const [pick, setPick] = useState<number | null>(null);
  const [step, setStep] = useState<'plot' | 'cart' | 'go'>('plot');
  const [uids, setUids] = useState<number[]>([]);
  const [worker, setWorker] = useState<string | undefined>(undefined);
  const max = cartCashMax(home);
  const [cash, setCash] = useState(Math.min(max, Math.round(max / 2 / 5) * 5));
  const cart: Cart = { uids, cash, ...(worker ? { worker: worker as Cart['worker'] } : {}) };
  const why = departProblem(home, loc, glory, cart);
  const L = LOCATIONS[loc];
  const cards = cartCards(home).sort((a, b) => score(b) - score(a));
  useEffect(() => {
    if (step !== 'go') return;
    const t = window.setTimeout(() => onGo(offers[pick!], cart, seed), reducedMotionNow() ? 0 : 1900);
    return () => clearTimeout(t);
  }, [step]);
  if (step === 'go') return createPortal(
    <div class="departure-scene" role="status" aria-live="polite">
      <div class="dep-road"><span class="dep-cart"><Icon name="cart" size={72} /></span></div>
      <p><b>Обоз в пути</b><span>{L.name} · участок «{CONDITIONS[offers[pick!].cond].name}»</span></p>
    </div>, document.body);
  return (
    <Sheet title={step === 'plot' ? `Вылазка: ${L.name}` : 'Обоз'} icon="cart" onClose={onCancel} wide>
      {step === 'plot' && <>
        <p class="small muted">Участок каждый раз другой: река, песок, камни, тайга лягут по-новому. У каждого — своё условие и находка в сарае.</p>
        <div class="plot-offers" role="radiogroup" aria-label="Участки на выбор">
          {offers.map((o, i) => {
            const c = CONDITIONS[o.cond];
            return (
              <button type="button" role="radio" aria-checked={pick === i} class={`plot-offer${pick === i ? ' on' : ''}`} onClick={() => setPick(i)}>
                <PlotMap terrain={maps[i]} />
                <span class="po-body">
                  <b>{c.name}</b>
                  <span class="po-plus">+ {c.plus}</span>
                  <span class="po-minus">− {c.minus}</span>
                  <span class="po-find"><Icon name={RELICS[o.relic].icon} size={18} /><span><b>{RELICS[o.relic].name}</b>: {RELICS[o.relic].text}</span></span>
                </span>
              </button>
            );
          })}
        </div>
        <div class="btn-row"><Btn tone="primary" disabled={pick === null ? 'Выберите участок' : null} onClick={() => setStep('cart')}>Дальше: обоз</Btn><Btn tone="ghost" onClick={onCancel}>Отмена</Btn></div>
      </>}
      {step === 'cart' && <>
        <p class="small muted">На телегу помещается {CART_CARDS} карты из колоды дома, один работник и подъёмные. Всё вернётся домой, когда хозяйство свернёте; работник и карты дома пока не нужны.</p>
        <h3 class="cart-h">Карты <small>{uids.length}/{CART_CARDS}</small></h3>
        <div class="card-grid cart-cards">
          {cards.map((c) => {
            const on = uids.includes(c.uid);
            return <div class={`grid-card${on ? ' picked' : ''}`}><CardView s={home} card={c} mini noPrice selected={on} onClick={() => setUids(on ? uids.filter((u) => u !== c.uid) : uids.length < CART_CARDS ? [...uids, c.uid] : uids)} /></div>;
          })}
        </div>
        <h3 class="cart-h">Работник</h3>
        <div class="cart-workers" role="radiogroup" aria-label="Кто поедет">
          <button type="button" role="radio" aria-checked={!worker} class={`cart-worker${!worker ? ' on' : ''}`} onClick={() => setWorker(undefined)}><span class="cw-none">—</span><small>никто</small></button>
          {cartWorkers(home).map((w) => (
            <button type="button" role="radio" aria-checked={worker === w.id} class={`cart-worker${worker === w.id ? ' on' : ''}`} onClick={() => setWorker(w.id)}>
              <Portrait id={WORKERS[w.id].portrait as PersonId} size={44} /><small>{WORKERS[w.id].name}, {w.level}-й ур.</small>
            </button>
          ))}
        </div>
        <h3 class="cart-h">Подъёмные <small>до {money(max)}</small></h3>
        <label class="cart-cash"><input type="range" min={0} max={max} step={1} value={cash} disabled={!max} onInput={(e) => setCash(Number(e.currentTarget.value))} aria-label="Сколько денег взять с собой" /><b>{money(cash)}</b></label>
        <p class="small muted">Дома останется {money(Math.max(0, home.money - cash))}. На вылазке свои 70{NB}₽ от района плюс подъёмные.</p>
        {why && <p class="small bad">{why}</p>}
        <div class="btn-row"><Btn tone="primary" disabled={why} onClick={() => setStep('go')}><Icon name="cart" size={20} /> В путь</Btn><Btn tone="ghost" onClick={() => setStep('plot')}>Назад</Btn></div>
      </>}
    </Sheet>
  );
}
const score = (c: Card) => (c.traits?.length ?? 0) * 3 + (c.extra?.length ?? 0) * 3 + (CARDS[c.def].kind === 'seed' ? 1 : 0);

// ---------------------------------------------------------------- the visitor at the camp
export function VisitSheet({ s, act, onClose }: { s: GameState; act: Dispatch; onClose: () => void }) {
  const v = s.run?.visit;
  if (!v) return null;
  const d = VISITS[v.id], opts = visitOptions(s);
  const img = PORTRAIT_IMAGES[d.portrait];
  return createPortal(
    <Sheet variant="visit" title={d.name} onClose={onClose}>
      <div class="order-meeting run-visit">
        <div class="meeting-stage" aria-hidden="true">
          {img ? <img class="meeting-person" src={img} alt="" /> : <span class="meeting-person vector"><Portrait id={d.portrait as PersonId} size={170} ring={false} /></span>}
        </div>
        <section class="meeting-speech">
          <small class="meeting-org">{d.who}</small>
          <div class="meeting-lines"><p>{d.text}</p></div>
          <div class="visit-choices">
            {opts.map((o, i) => (
              <button type="button" class={`visit-choice${o.problem ? ' off' : ''}`} disabled={!!o.problem} onClick={() => { if (act({ t: 'answer', choice: i })) onClose(); }}>
                <b>{o.label}</b>{(o.problem || o.note) && <small>{o.problem ?? o.note}</small>}
              </button>
            ))}
          </div>
          <p class="small muted">Ответить можно до конца недели.</p>
        </section>
      </div>
    </Sheet>, document.body);
}

// ---------------------------------------------------------------- the run in the barn: condition, finds, folding
export function RunPanel({ s, act }: { s: GameState; act: Dispatch }) {
  const r = s.run!;
  const [fold, setFold] = useState(false);
  const c = CONDITIONS[r.cond];
  const v = foldValue(s);
  const why = foldProblem(s);
  return (
    <section class="panel barn-panel run-panel">
      <div class="run-cond">
        <Icon name="tent" size={30} />
        <span><b>Участок «{c.name}»</b><span class="po-plus">+ {c.plus}</span><span class="po-minus">− {c.minus}</span></span>
      </div>
      <h3 class="cart-h">Находки</h3>
      {r.relics.length ? <ul class="relic-list">{r.relics.map((id) => <li><Icon name={RELICS[id].icon} size={22} /><span><b>{RELICS[id].name}</b> — {RELICS[id].text}{id === 'receipt' && r.used.includes('receipt') ? ' (уже использована)' : id === 'laika' && r.used.includes(`laika-${s.year}-${s.season}`) ? ' (в этом сезоне уже)' : ''}</span></li>)}</ul> : <p class="small muted">Пока ничего. Находки приносят встречные и коробейник.</p>}
      {r.visit && <p class="run-guest"><Icon name="hand" size={20} /> У лагеря: {VISITS[r.visit.id].name.toLowerCase()}. Ответьте до конца недели.</p>}
      <h3 class="cart-h">Свернуть хозяйство</h3>
      <div class="fold-sum">
        <span>Касса <b>{money(v.cash)}</b></span>
        <span>Склад по цене перекупщика <b>{money(v.stock)}</b></span>
        {v.debts > 0 && <span>Долги <b class="bad">−{money(v.debts)}</b></span>}
        <span>Домой {Math.round(v.share * 100)}% <b class="good">{money(v.total)}</b></span>
      </div>
      <p class="small muted">Находок на выбор: {lootCount(s)} — по одной за год (до четырёх) и за каждую законченную цепочку заказов{chainsDone(s) ? ` (уже ${chainsDone(s)})` : ''}. Материалы из сарая лагеря поедут домой целиком. Каждый лишний год — ещё находка, но и платежи выше.</p>
      <Btn tone="primary" disabled={why} onClick={() => setFold(true)}><Icon name="cart" size={20} /> Свернуть и ехать домой</Btn>
      {fold && <FoldSheet s={s} act={act} onClose={() => setFold(false)} />}
    </section>
  );
}

export function FoldSheet({ s, act, onClose }: { s: GameState; act: Dispatch; onClose: () => void }) {
  const offers = lootOffers(s), n = Math.min(lootCount(s), offers.length);
  const [picks, setPicks] = useState<LootId[]>([]);
  const v = foldValue(s), k = infl(s.year);
  const mats = matsList(s.mats ?? {});
  const worker = s.run!.carried.worker;
  return (
    <Sheet title="Свернуть хозяйство" icon="cart" onClose={onClose} wide>
      <p>Домой поедут <b>{money(v.total)}</b> ({Math.round(v.share * 100)}% от кассы и склада за вычетом долгов){mats.length ? `, материалы: ${mats.map(([m, q]) => `${MATERIALS[m].name.toLowerCase()} ${q}`).join(', ')}` : ''}{worker ? `, ${WORKERS[worker].name}` : ''}{s.run!.carried.uids.length ? ` и карты обоза` : ''}.</p>
      <h3 class="cart-h">Находки <small>выберите {n}: {picks.length}/{n}</small></h3>
      <div class="loot-offers">
        {offers.map((id) => {
          const L = LOOT[id], on = picks.includes(id);
          return (
            <button type="button" class={`loot-card${on ? ' on' : ''}`} aria-pressed={on} onClick={() => setPicks(on ? picks.filter((x) => x !== id) : picks.length < n ? [...picks, id] : picks)}>
              <Icon name={L.mats ? (L.mats.logs ? 'logs' : L.mats.bricks ? 'bricks' : 'glass') : L.seed ? 'seed' : L.worker ? 'team' : L.cash ? 'coin' : id === 'swarm' ? 'hive' : id === 'litter' ? 'compost' : 'soil'} size={30} />
              <b>{L.name}</b><small>{L.cash ? `+${money(Math.round(L.cash * k))}` : L.text}</small>
            </button>
          );
        })}
      </div>
      <div class="btn-row">
        <Btn tone="primary" disabled={picks.length !== n ? `Выберите ${n} ${plural(n, 'находку', 'находки', 'находок')}` : null} onClick={() => { if (act({ t: 'fold', picks })) onClose(); }}>Собрать обоз</Btn>
        <Btn tone="ghost" onClick={onClose}>Ещё поработать</Btn>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- the end of a run, the bankrupt home, the arrest
export function RunOver({ s, onHome, onMap }: { s: GameState; onHome: () => void; onMap: () => void }) {
  const res = s.run?.result;
  const bust = !res || res.bankrupt;
  return (
    <ClosedLayer title={bust ? 'Вылазка прогорела' : 'Обоз собран'}>
      <p>{s.over?.reason}</p>
      {res && <ul class="run-back">
        {res.cash > 0 && <li><Icon name="coin" size={20} /> {money(res.cash)}</li>}
        {res.loot.map((id) => <li><Icon name="star" size={20} /> {LOOT[id].name}</li>)}
        {matsList(res.mats).map(([m, q]) => <li><Icon name={m} size={20} /> {MATERIALS[m].name}: {q}</li>)}
        {res.worker && <li><Portrait id={WORKERS[res.worker.id].portrait as PersonId} size={24} /> {WORKERS[res.worker.id].name} возвращается</li>}
        {res.cards.length > 0 && <li><Icon name="seeds" size={20} /> {res.cards.length} {plural(res.cards.length, 'карта', 'карты', 'карт')} обоза</li>}
      </ul>}
      <p class="small muted">{bust ? 'Работник и карты обоза возвращаются. Слава и грамоты остаются в профиле.' : 'Всё это уже дома. Слава и грамоты вылазки — в профиле.'}</p>
      <div class="btn-row"><Btn tone="primary" onClick={onHome}>Домой</Btn><Btn onClick={onMap}>На карту</Btn></div>
    </ClosedLayer>
  );
}

export function HomeBankrupt({ s, onRestart, onWork, onMap }: { s: GameState; onRestart: () => void; onWork: () => void; onMap: () => void }) {
  return (
    <ClosedLayer title="За домом приехал банк">
      <div class="bank-cart" aria-hidden="true"><Portrait id="marat" size={64} /><Icon name="cart" size={56} /></div>
      <p>{s.over?.reason}. Дом в залоге, и Марат из банка разводит руками.</p>
      <p>Можно <b>начать заново</b> — дом снова в залоге, профиль и слава остаются. Или <b>уйти на заработки</b>: дом под арестом, долг {money(s.over!.work!)} гасится на вылазках, две попытки. Закроете — дом проснётся следующей весной.</p>
      <div class="btn-row"><Btn tone="primary" onClick={onWork}><Icon name="cart" size={20} /> Уйти на заработки</Btn><Btn onClick={onRestart}>Начать заново</Btn><Btn tone="ghost" onClick={onMap}>На карту</Btn></div>
    </ClosedLayer>
  );
}

export function ArrestLayer({ s, glory, onExpedition, onMap, runFarm }: { s: GameState; glory: number; onExpedition: (l: ExpeditionId) => void; onMap: () => void; runFarm?: ComponentChildren }) {
  const a = s.arrest!;
  return (
    <ClosedLayer title="Дом под арестом">
      <div class="bank-cart" aria-hidden="true"><Portrait id="marat" size={64} /><Icon name="lock" size={48} /></div>
      <p>Долг банку <b>{money(a.debt)}</b>. Вылазок на погашение: <b>{a.runs}</b>. Свёрнутое хозяйство сначала закроет долг, остаток — в кассу дома.</p>
      {s.away ? <p>Обоз уже на вылазке: <b>{LOCATIONS[s.away.loc].name}</b>.</p> : <div class="btn-row">
        {EXPEDITION_IDS.map((l) => <Btn tone={l === 'rent' ? 'primary' : undefined} disabled={expeditionOpen(l, glory) ? null : `Слава ${LOCATIONS[l].glory}`} onClick={() => onExpedition(l)}>{LOCATIONS[l].name}</Btn>)}
      </div>}
      {runFarm}
      <div class="btn-row"><Btn tone="ghost" onClick={onMap}>На карту</Btn></div>
    </ClosedLayer>
  );
}

/** the home's mortgage and buyout in the barn's cash desk */
export function HomeDeed({ s, act }: { s: GameState; act: Dispatch }) {
  if (s.loc !== 'chernozem') return null;
  if (s.owned) return <p class="deed owned"><Icon name="cert" size={22} /><span><b>Дом выкуплен.</b> Раз в год, в конце осени — налог: 3{NB}₽ за клетку и 15{NB}₽ за уровень дома, с инфляцией. Не хватит — опись оборудования, а не банкротство.</span></p>;
  const paid = s.paidYears ?? 0;
  return (
    <details class="bank-more deed">
      <summary>Залог дома <span>выплачено {paid} из 3 осеней</span></summary>
      <p class="small">Третий осенний платёж выкупает дом: +30 славы и грамота. Можно раньше — остаток лестницы со скидкой 10%.</p>
      <BuyoutButton s={s} act={act} />
    </details>
  );
}
function BuyoutButton({ s, act }: { s: GameState; act: Dispatch }) {
  const price = buyoutPrice(s);
  if (price === null) return null;
  return <Btn small tone="primary" disabled={s.phase !== 'week' ? 'Сначала решите вопрос с платежом' : s.money < price ? `Нужно ${money(price)}` : null} onClick={() => act({ t: 'buyout' })}>Выкупить сейчас · {money(price)}</Btn>;
}

/** the home's side of an expedition: what the cart took and where it is */
export function AwayNote({ s }: { s: GameState }) {
  const a = s.away;
  if (!a) return null;
  return <p class="deed away"><Icon name="cart" size={22} /><span><b>Обоз на вылазке: {LOCATIONS[a.loc].name}.</b> {[a.cards.length ? `${a.cards.length} ${plural(a.cards.length, 'карта', 'карты', 'карт')}` : '', a.worker ? WORKERS[a.worker.id].name : '', a.cash ? money(a.cash) : ''].filter(Boolean).join(', ') || 'Налегке'}. Вернётся, когда хозяйство там свернут.</span></p>;
}
