import { useEffect, useState } from 'preact/hooks';
import { CARDS, CROPS, CROP_IDS, CropId, RATINGS, isSeed } from '../engine/data';
import {
  GameState, priceOf, rub, cardShopPrice, creditLimit, deckLimit, deckList, forecast, insurancePrice, locOf, loanRate, lookahead, marketPrice, money, nextPayment,
  outstanding, plural, shopCards, stockOf, miceTargets, storageCap, storageUsed, weeklyCosts, yardUsed, fmt, lvl, obtainable, freeStock, reservedStock, storageKeepWeeks, deckCount,
} from '../engine/game';
import { Icon } from '../art/icons';
import { CropSprite } from '../art/crops';
import { BarnInside } from '../art/barnInside';

// units the accepted orders still need, per crop
function ORGS_ACTIVE_NEED(s: GameState): Map<CropId, number> {
  const m = new Map<CropId, number>();
  for (const st of Object.values(s.orgs)) for (const l of st?.active?.lines ?? []) m.set(l.crop, (m.get(l.crop) ?? 0) + l.qty);
  return m;
}
import { P } from '../art/palette';
import { Bar, Btn, Dispatch, weeksIn } from './common';
import { Peek } from './Peek';
import { useLessonLock } from './lesson';
import { CardView, cardPrice, cardDescription, cardDaysText } from './Card';
import { FairPanel } from './Fair';
import { AwayNote, HomeDeed, RunPanel } from './Run';

// №9 · One horizon at a time. The words, the range and the arrow always speak of the same week — the next one
// unless the player taps another point of the chart; the chart itself still shows several weeks.
const horizonOf = (s: GameState) => Math.max(4, Math.min(8, lookahead(s) + 2));
type Dir = 'up' | 'down' | 'flat';
function dirAt(s: GameState, c: CropId, k: number): Dir {
  if (k === 0) return 'flat';
  const now = forecast(s, c, 0).price, then = forecast(s, c, k).price;
  return then > now * 1.03 ? 'up' : then < now * 0.97 ? 'down' : 'flat';
}
const whenOf = (k: number) => (k === 0 ? 'Сейчас' : k === 1 ? 'Через неделю' : `Через ${k} ${plural(k, 'неделю', 'недели', 'недель')}`);
function TrendArrow({ dir }: { dir: Dir }) {
  return (
    <svg viewBox="-9 -9 18 18" width={16} height={16} aria-hidden="true" class={`trend-arrow ${dir}`}>
      {dir === 'flat' ? <path d="M-5 0 H5 M1.6 -3.2 L5 0 L1.6 3.2" /> : <path d={dir === 'up' ? 'M0 5 V-5 M-3.4 -1.6 L0 -5 L3.4 -1.6' : 'M0 -5 V5 M-3.4 1.6 L0 5 L3.4 1.6'} />}
    </svg>
  );
}
function ForecastChart({ s, c, at, onPick }: { s: GameState; c: CropId; at: number; onPick: (k: number) => void }) {
  const H = horizonOf(s);
  const pts = Array.from({ length: H + 1 }, (_, k) => forecast(s, c, k));
  const vals = pts.flatMap((p) => [p.low, p.high]);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const W = 96, Ht = 30;
  const X = (k: number) => 3 + (k / H) * (W - 6);
  const Y = (v: number) => 3 + (1 - (v - lo) / Math.max(1e-6, hi - lo)) * (Ht - 6);
  const band = `M${pts.map((p, k) => `${X(k)} ${Y(p.high)}`).join(' L')} L${[...pts].reverse().map((p, k) => `${X(H - k)} ${Y(p.low)}`).join(' L')}z`;
  // the line's colour tells the general course over the whole chart; it is a quiet ink, not an alarm
  const overall = dirAt(s, c, H);
  const col = overall === 'up' ? '#4b7f35' : overall === 'down' ? '#9a5a3c' : '#8a6a4a';
  return (
    <svg viewBox={`0 0 ${W} ${Ht}`} width={W} height={Ht} class="spark forecast-chart" role="slider" tabindex={0} aria-label={`Прогноз цены: ${CROPS[c].name}`} aria-valuemin={0} aria-valuemax={H} aria-valuenow={at} aria-valuetext={`${whenOf(at)}: ${money(pts[at].low)}–${money(pts[at].high)}`}
      onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onPick(Math.max(0, Math.min(H, Math.round(((e.clientX - r.x) / r.width) * H)))); }}
      onKeyDown={(e) => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) { e.preventDefault(); onPick(e.key === 'Home' ? 0 : e.key === 'End' ? H : Math.max(0, Math.min(H, at + (e.key === 'ArrowRight' ? 1 : -1)))); } }}>
      <path d={band} fill={col} opacity={0.13} />
      <path d={`M${pts.map((p, k) => `${X(k)} ${Y(p.price)}`).join(' L')}`} fill="none" stroke={col} stroke-width={1.8} stroke-dasharray="4 3" />
      <circle cx={X(0)} cy={Y(pts[0].price)} r={2.6} fill={col} />
      {/* the week the words speak of: a tick across the band and a ring on the line */}
      <line x1={X(at)} x2={X(at)} y1={Y(pts[at].high) - 1} y2={Y(pts[at].low) + 1} stroke="#3f2a1d" stroke-width={1.2} stroke-linecap="round" opacity={0.55} />
      <circle cx={X(at)} cy={Y(pts[at].price)} r={3.6} fill="#fffaf0" stroke="#3f2a1d" stroke-width={1.5} />
    </svg>
  );
}
function Forecast({ s, c }: { s: GameState; c: CropId }) {
  const [pick, setPick] = useState(1);
  const at = Math.min(pick, horizonOf(s));
  const p = forecast(s, c, at), dir = dirAt(s, c, at);
  return (
    <div class="forecast">
      <span class={`fc-line ${dir}`} aria-live="polite"><TrendArrow dir={dir} /><span><b>{whenOf(at)}:</b> {rub(p.low)}–{rub(p.high)} ₽</span></span>
      <ForecastChart s={s} c={c} at={at} onPick={setPick} />
    </div>
  );
}
// the crop in a round paper medallion, zoomed in on the plant so it reads at phone size
function CropMedal({ c, size = 48 }: { c: CropId; size?: number }) {
  return (
    <span class="crop-medal" style={{ width: `${size}px`, height: `${size}px` }} aria-hidden="true">
      <svg viewBox="12 8 76 80" width={size - 8} height={size - 8}><CropSprite id={c} stage={2} /></svg>
    </span>
  );
}

function SaleControls({ s, c, act }: { s: GameState; c: CropId; act: Dispatch }) {
  const [includeReserved, setIncludeReserved] = useState(false);
  const [qty, setQty] = useState(1);
  const reserved = Math.min(stockOf(s, c), reservedStock(s, c));
  const available = includeReserved ? stockOf(s, c) : freeStock(s, c);
  const amount = Math.max(0, Math.min(available, Math.floor(qty)));
  const price = marketPrice(s, c);
  // This component is keyed by crop. An on-mount reset can overwrite the first
  // slider gesture before effects flush, causing a sale of one instead of N.
  useEffect(() => { setQty(q => Math.min(Math.max(1, q), Math.max(1, available))); }, [available]);
  const oldest = Math.max(0, ...s.storage.filter(l => l.crop === c).map(l => l.age));
  const keep = storageKeepWeeks(s, c);
  const inYard = s.yard.filter(l => l.crop === c).reduce((a, l) => a + l.qty, 0);
  return <div class="sale-ctl">
    <div class="sale-line">
      <div class="sale-range">
        <button type="button" aria-label="Продать на одну единицу меньше" disabled={amount <= 1} onClick={() => setQty(amount - 1)}>−</button>
        <input type="range" aria-label={`Количество для продажи: ${CROPS[c].name}`} min={0} max={Math.max(1, available)} step={1} value={amount} disabled={available === 0} onInput={e => setQty(Number(e.currentTarget.value))} />
        <button type="button" aria-label="Продать на одну единицу больше" disabled={amount >= available} onClick={() => setQty(amount + 1)}>+</button>
      </div>
      <Btn tone="primary" class="sale-go" disabled={amount < 1 ? reserved ? 'Отложено для заказов' : 'Нет урожая' : null} onClick={() => act({ t: 'sell', crop: c, qty: amount, allowReserved: includeReserved })}>
        <span>Продать {amount} ед.</span> <b>{money(amount * price)}</b>
      </Btn>
    </div>
    
    {amount > freeStock(s, c) && <p class="small bad">Из резерва заказа будет продано {amount - freeStock(s, c)} ед.</p>}
    {(reserved > 0 || inYard > 0 || CROPS[c].perishable) && <details class="sale-more"><summary>{reserved > 0 ? `Хранение (резерв ${reserved})` : 'Хранение'}</summary>
      <p>В амбаре {s.storage.filter(l=>l.crop===c).reduce((a,l)=>a+l.qty,0)} ед.{inYard ? ` Во дворе ${inYard} ед.` : ''} {CROPS[c].perishable ? (keep - oldest > 0 ? `Не испортится ещё ${weeksIn(keep - oldest)}.` : 'Скоро испортится.') : 'Не портится.'}</p>
      {reserved > 0 && <label class="reserve-choice"><input type="checkbox" checked={includeReserved} onChange={e => setIncludeReserved(e.currentTarget.checked)} />Можно продать резерв заказа ({reserved})</label>}
    </details>}
  </div>;
}

export type BarnTab = 'market' | 'fair' | 'shop' | 'bank' | 'run';
export function BarnView({ s, act, target, onPayment }: { s: GameState; act: Dispatch; target?: { tab: BarnTab; key: number }; onPayment: () => void }) {
  const [tab, setTab] = useState<BarnTab>('market');
  const lock = useLessonLock();
  const [shopPick,setShopPick]=useState<string|null>(null);
  const [bought,setBought]=useState<{def:string|null;n:number}>({def:null,n:0});
  useEffect(()=>{setBought(b=>b.def===shopPick?b:{def:null,n:0});},[shopPick]);
  useEffect(() => { if (target) setTab(target.tab); }, [target?.key]);
  const used = storageUsed(s), cap = storageCap(s);
  const yard = yardUsed(s);
  const np = nextPayment(s);
  const costs = weeklyCosts(s);
  const priceCrops = CROP_IDS.filter(c => obtainable(s, c) || stockOf(s, c) > 0).sort((a,b) => Number(stockOf(s,b)>0)-Number(stockOf(s,a)>0));
  const deckN = deckCount(s);
  const stocked=priceCrops.filter(c=>stockOf(s,c)>0), absent=priceCrops.filter(c=>stockOf(s,c)===0);
  const lots = new Map<CropId, number>();
  for (const l of s.storage) lots.set(l.crop, (lots.get(l.crop) ?? 0) + l.qty);
  const yardLoss = s.yard.reduce((n,l)=>n+l.qty*priceOf(s,l.crop)*0.6,0);
  // B-14: mice take every storable crop (grain, potatoes, rice…), and only from a lot of ten or more
  // PSV-032 · only what lies inside the barn: the yard is sold off at the week's end, mice never reach it
  const nibbled = miceTargets(s);
  const mice = nibbled.length > 0;
  function row(c: CropId) {
    const have=stockOf(s,c), reserved=Math.min(have,reservedStock(s,c));
    return <div key={c} class="sale-row" data-crop={c} data-stock={have}>
      <div class="sale-top">
        <CropMedal c={c}/>
        <span class="grow"><b>{CROPS[c].name}</b><small>{have} ед.{reserved>0?`, в резерве ${reserved}`:''}</small></span>
        <span class="sale-price"><b>{money(marketPrice(s,c))}</b><small>за 1 ед.</small></span>
      </div>
      <Forecast s={s} c={c}/>
      <SaleControls key={c} s={s} c={c} act={act}/>
    </div>;
  }
  function priceRow(c: CropId) {
    const next = forecast(s, c, 1), dir = dirAt(s, c, 1);
    return <div key={c} class="price-row">
      <CropMedal c={c} size={38}/><span class="grow">{CROPS[c].name}<small><TrendArrow dir={dir}/> через неделю {rub(next.low)}–{rub(next.high)} ₽</small></span>
      <b>{money(marketPrice(s,c))}</b>
    </div>;
  }
  const short = Math.max(0, np.amount - s.money);
  return (
    <div class="pane-inner barn-pane">
      {/* the barn from inside, big, like the house and the lab: its shelves fill as the harvest comes in */}
      <div class="hero estate-hero barn-hero2">
        <div class="barn-art">
          <BarnInside lots={[...lots.entries()]} used={used} cap={cap} yard={yard} tall />
          <div class="estate-plaque barn-plaque">
            <h2>Амбар</h2><span class={used >= cap ? 'bad' : ''}>{used} / {cap}</span>
            <Bar value={used} max={cap} tone={used >= cap ? 'bad' : used > cap * 0.8 ? 'warn' : 'good'} label="Заполнение амбара" />
          </div>
        </div>
        <nav class="estate-links barn-links" role="tablist" aria-label="Разделы амбара">
          <button type="button" role="tab" aria-selected={tab==='market'} class={tab === 'market' ? 'on' : ''} onClick={() => setTab('market')}><Icon name="sack" size={18} /><span>Урожай</span></button>
          {/* v3 · the season's fair: equipment, building materials, workers (the lesson opens it with the shop) */}
          <button type="button" role="tab" aria-selected={tab==='fair'} class={`${tab === 'fair' ? 'on' : ''}${lock('shop') ? ' locked' : ''}`} onClick={() => setTab('fair')}><Icon name={lock('shop') ? 'lock' : 'fair'} size={18} /><span>Ярмарка</span></button>
          <button type="button" role="tab" aria-selected={tab==='shop'} class={`${tab === 'shop' ? 'on' : ''}${lock('shop') ? ' locked' : ''}`} onClick={() => setTab('shop')}><Icon name={lock('shop') ? 'lock' : 'seeds'} size={18} /><span>Лавка</span></button>
          <button type="button" role="tab" aria-selected={tab==='bank'} class={`${tab === 'bank' ? 'on' : ''}${lock('bank') ? ' locked' : ''}`} onClick={() => setTab('bank')}><Icon name={lock('bank') ? 'lock' : 'bank'} size={18} /><span>Касса</span></button>
          {s.run && <button type="button" role="tab" aria-selected={tab==='run'} class={tab === 'run' ? 'on' : ''} onClick={() => setTab('run')}><Icon name="cart" size={18} /><span>Вылазка</span></button>}
        </nav>
      </div>
      {yard > 0 && <p class="barn-warn"><Icon name="sack" size={20}/><span><b>Во дворе {yard} ед.</b> Продайте до конца недели, иначе их заберут за 60% цены (не больше {money(yardLoss)}).</span></p>}
      {mice && <p class="barn-hint">Мыши каждую неделю грызут запасы от 10 ед.: {nibbled.map(c => CROPS[c].name.toLowerCase()).join(', ')}. Спасут кот или сусеки (амбар 2-го уровня).</p>}
      {tab === 'market' && (
        <section class="panel barn-panel">
          <p class="market-key">График показывает цену на {horizonOf(s)} {plural(horizonOf(s), 'неделю', 'недели', 'недель')} вперёд. Пунктир — ориентир, полоса — разброс, но цена может выйти за её границы. Строка у графика относится к отмеченной неделе, а чтобы выбрать другую, коснитесь графика.</p>
          {stocked.length ? <div class="sale-list">{stocked.map(row)}</div> : (
            <div class="empty-stock">
              <Icon name="sack" size={34}/>
              <b>Продавать пока нечего</b>
              <small>{s.phase==='shortfall' ? 'Взять кредит или перенести платёж можно в окне платежа.' : 'Собранный урожай попадёт сюда сам.'}</small>
            </div>
          )}
          {!!absent.length && <details class="price-list"><summary>Цены на остальное · {absent.length}</summary>{absent.map(priceRow)}</details>}
        </section>
      )}

      {tab === 'fair' && <Peek area="shop"><FairPanel s={s} act={act} /></Peek>}
      {tab === 'run' && s.run && <RunPanel s={s} act={act} />}
      {tab === 'shop' && <Peek area="shop">{(
        <section class="panel barn-panel">
          <p class="panel-note">{deckN < deckLimit(s) ? `Покупка ляжет в колоду: сейчас в ней ${deckN} из ${deckLimit(s)} карт.` : 'Колода полна, поэтому покупка ляжет в запас.'}</p>
          <div class="card-grid shop-grid">
            {shopCards(s).map((def) => {
              const price = cardShopPrice(s, def);
              const winterOnly = CARDS[def].winterOnly;
              const picked = shopPick === def;
              return (
                <div class={`grid-card shop-card${picked ? ' picked' : ''}`}>
                  <CardView s={s} card={{ def }} mini noPrice selected={picked} onClick={()=>setShopPick(picked?null:def)} />
                  <button type="button" class="buy-tag" onClick={()=>setShopPick(picked?null:def)} aria-pressed={picked} aria-controls="shop-choice" aria-label={`${CARDS[def].name}, ${money(price)}: выбрать`}><Icon name="coin" size={16}/>{money(price)}{winterOnly?<small> зима</small>:null}</button>
                </div>
              );
            })}
          </div>
          {/* PSV-003 · the chosen card and its «Купить» stay pinned to the bottom of the screen, next to the
              catalogue the player is looking at; it says what the purchase costs now, later, and where it goes */}
          {shopPick && (() => {
            const def = shopPick, price = cardShopPrice(s, def), use = cardPrice(s, def);
            const why = s.phase==='shortfall'?'Сначала решите вопрос с платежом':s.money<price?'Не хватает денег':null;
            return <div class="shop-choice" id="shop-choice" role="region" aria-label={`Покупка: ${CARDS[def].name}`}>
              <div class="shop-choice-head">
                <b>{CARDS[def].name}</b>
                <button type="button" class="icon-btn shop-choice-x" onClick={()=>setShopPick(null)} aria-label="Закрыть выбор">✕</button>
              </div>
              <p>{cardDescription(s,def)}</p>
              <small>При применении: {use > 0 ? `${money(use)}, ` : ''}{cardDaysText(s, { def })}{CARDS[def].winterOnly ? ', только зимой' : CARDS[def].noWinter ? ', не зимой' : ''}.</small>
              <small>{deckN < deckLimit(s) ? `Ляжет в колоду (${deckN} из ${deckLimit(s)}).` : 'Колода полна, карта ляжет в запас.'} После покупки на счету останется {money(Math.max(0, s.money - price))}.</small>
              <Btn tone="primary" disabled={why} onClick={()=>{ if (act({t:'buyCard',def})) setBought(b=>({def,n:b.def===def?b.n+1:1})); }}>Купить · {money(price)}</Btn>
              <span class="sr-only" aria-live="polite">{bought.def===def&&bought.n?`Куплено: ${CARDS[def].name}${bought.n>1?` ×${bought.n}`:''}`:''}</span>
              {bought.def===def&&bought.n>0&&<small class="shop-bought" aria-hidden="true">✓ Куплено{bought.n>1?` ×${bought.n}`:''}</small>}
            </div>;
          })()}
          {s.unlocked.length > 0 && <p class="panel-note">Открыто здесь: {s.unlocked.map((c) => CROPS[c].name.toLowerCase()).join(', ')}.</p>}
        </section>
      )}</Peek>}

      {tab === 'bank' && <Peek area="bank">{(
        <section class="panel barn-panel bank">
          <div class="pay-now">
            <span class="pay-label">{s.phase === 'shortfall' && s.due ? `Платёж «${s.due.name}»` : np.weeksLeft <= 1 ? `Платёж «${np.name}» в конце недели` : `Платёж «${np.name}» через ${weeksIn(np.weeksLeft)}`}</span>
            <b class="pay-amount">{money(s.due?.amount ?? np.amount)}</b>
            <Bar value={s.money} max={Math.max(1, s.due?.amount ?? np.amount)} tone={s.money >= (s.due?.amount ?? np.amount) ? 'good' : 'warn'} label="Накоплено к платежу" />
            <span class="pay-have">На счету {money(s.money)}.{short > 0 ? <em> Не хватает {money(short)}.</em> : <em class="ok"> Денег хватает.</em>}</span>
          </div>
          <HomeDeed s={s} act={act} />
          <AwayNote s={s} />
          <details class="bank-more">
            <summary>Кредит <span>{outstanding(s) > 0 ? `долг ${money(outstanding(s))}` : `до ${money(creditLimit(s))}`}</span></summary>
            <div class="btn-row">
              {[10, 25, 50].map((v) => <Btn small disabled={creditLimit(s) < v ? 'Банк столько не даст' : null} onClick={() => act({ t: 'borrow', amount: v })}>Взять {v} ₽</Btn>)}
              {s.loans.map((l) => <Btn small tone="good" disabled={s.money <= 0 ? 'Нет денег' : null} onClick={() => act({ t: 'repay', id: l.id, amount: Math.min(s.money, l.principal) })}>Погасить {money(Math.min(s.money, l.principal))}</Btn>)}
            </div>
            <p class="small muted">Ставка {fmt(loanRate(s) * 100)}% в неделю. Ваш рейтинг: <span class="rating-badge" data-r={RATINGS[s.rating]}>{RATINGS[s.rating]}</span>. Он растёт за сезоны без просрочек.{s.phase==='shortfall'?' Новый кредит после срока снижает рейтинг на 1.':''}</p>
          </details>
          <details class="bank-more">
            <summary>Страховка <span>{s.insurance ? `полисов ${s.insurance}` : money(insurancePrice(s))}</span></summary>
            <p class="small">Полис покрывает один удар града, паводка, жука или саранчи: вернёт 60% стоимости потерь, но не больше {money(np.amount)}.</p>
            <Btn small tone="primary" disabled={s.insurance >= 2 ? 'Уже куплено два полиса' : s.money < insurancePrice(s) ? 'Не хватает денег' : null} onClick={() => act({ t: 'insure' })}>Купить полис · {money(insurancePrice(s))}</Btn>
          </details>
          <details class="bank-more">
            <summary>Расходы <span>−{money(costs.total)} в неделю</span></summary>
            <p class="small muted">{[costs.salaries ? `зарплаты ${money(costs.salaries)}` : '', costs.interest ? `проценты ${money(costs.interest)}` : '', costs.heating ? `отопление ${money(costs.heating)}` : ''].filter(Boolean).join(', ') || 'Постоянных расходов нет'}. Неоплаченное добавляется к долгу.</p>
          </details>
        </section>
      )}</Peek>}
    </div>
  );
}
