import {GuideHint,type TutorialControls} from './Guide';
import {QuickProjects} from './lesson';
import { useEffect, useRef, useState } from 'preact/hooks';
import { LOCATIONS, SEASON_NAMES } from '../engine/data';
import {
  GameState, deliverProblem, labBusy, labSlots, lvl, money, nextPayment, plural, seasonLen, storageCap, storageUsed, workshopBusy, workshopSlots,
  yardUsed, creditLimit, locOf,
} from '../engine/game';
import type { OrgId } from '../engine/data';
import type { BuildItem } from '../engine/game';
import { Icon } from '../art/icons';
import { Btn, Dispatch, Money, Sheet, compactMoney } from './common';
import { FieldView } from './FieldView';
import { HouseView } from './House';
import { LabView } from './Lab';
import { BarnView } from './Barn';
import { OrdersView } from './Orders';
import type { Profile } from './persist';

export const TABS = [
  { id: 'lab', name: 'Лаборатория', short: 'Лаба', icon: 'flask' },
  { id: 'house', name: 'Дом', short: 'Дом', icon: 'house' },
  { id: 'field', name: 'Поле', short: 'Поле', icon: 'field' },
  { id: 'barn', name: 'Амбар', short: 'Амбар', icon: 'barn' },
  { id: 'orders', name: 'Заказы', short: 'Заказы', icon: 'orders' },
] as const;
export type TabId = (typeof TABS)[number]['id'];

function ShortfallSheet({ s, act, onBarn, onOrders, onClose, onRetry }: { s: GameState; act: Dispatch; onBarn: () => void; onOrders: () => void; onClose: () => void; onRetry?:()=>void }) {
  const due = s.due!;
  const deficit = Math.max(0, due.amount - s.money);
  const sellable = storageUsed(s) + yardUsed(s) > 0;
  const deliverable = locOf(s).orgs.some((o) => s.orgs[o]?.active && !deliverProblem(s, o));
  const creditWhy = deficit <= 0 ? 'Уже хватает на платёж' : s.rating === 0 || creditLimit(s) < deficit ? 'Банк не даст столько' : null;
  // one clear next step, the other ways stay below in a quiet list
  const main = deficit <= 0 ? 'pay' : sellable ? 'barn' : deliverable ? 'orders' : !creditWhy ? 'credit' : 'postpone';
  return (
    <Sheet title={`Платёж «${due.name}»`} icon="bank" onClose={onClose}>
      <div class="due-line">
        <span><small>к оплате</small><b>{money(due.amount)}</b></span>
        <span><small>на счету</small><b>{money(s.money)}</b></span>
        {deficit > 0 && <span class="bad"><small>не хватает</small><b>{money(deficit)}</b></span>}
      </div>
      {main === 'pay' && <Btn tone="primary" onClick={() => act({ t: 'pay' })}>Внести {money(due.amount)}</Btn>}
      {main === 'barn' && <Btn tone="primary" onClick={onBarn}>Продать урожай в амбаре</Btn>}
      {main === 'orders' && <Btn tone="primary" onClick={onOrders}>Сдать готовый заказ</Btn>}
      {main === 'credit' && <Btn tone="primary" onClick={() => act({ t: 'emergency' })}>Экстренный кредит {money(deficit)}</Btn>}
      {main === 'postpone' && <Btn tone="primary" disabled={s.restructured ? 'Переносить можно один раз' : null} onClick={() => act({ t: 'restructure' })}>Перенести платёж · +20%</Btn>}
      <div class="due-other">
        {main !== 'pay' && deficit > 0 && main !== 'barn' && sellable && <Btn small tone="ghost" onClick={onBarn}>Продать урожай</Btn>}
        {main !== 'orders' && deliverable && <Btn small tone="ghost" onClick={onOrders}>Сдать заказ</Btn>}
        {main !== 'credit' && deficit > 0 && <Btn small tone="ghost" disabled={creditWhy} onClick={() => act({ t: 'emergency' })}>Кредит {money(deficit)} · рейтинг −1</Btn>}
        {main !== 'postpone' && deficit > 0 && <Btn small tone="ghost" disabled={s.restructured ? 'Переносить можно один раз' : null} onClick={() => act({ t: 'restructure' })}>Перенести · +20%, рейтинг −2</Btn>}
      </div>
      {onRetry&&<div class="stack tight"><p class="small muted">Это учебная ферма. Можно вернуться к началу задания и попробовать ещё раз.</p><Btn onClick={onRetry}>Повторить этот шаг</Btn></div>}
      <details class="more"><summary>Закрыть ферму</summary>
        <p class="small muted">{onRetry?'Учебная ферма закроется. После этого можно повторить шаг или вернуться на карту.':'Партия закончится. Слава, грамоты и питомцы останутся в профиле.'}</p>
        <Btn small tone="danger" onClick={() => act({ t: 'giveUp' })}>Закрыть ферму</Btn>
      </details>
    </Sheet>
  );
}

function GameOver({ s, onMap, onRestart }: { s: GameState; onMap: () => void; onRestart: () => void }) {
  return (
    <div class="gameover">
      <div class="panel">
        <h1>Ферма закрыта</h1>
        <p>{s.over?.reason}</p>
        <div class="bank-grid">
          <div class="kv"><span>Прожито лет</span><b>{s.yearsCompleted}</b></div>
          <div class="kv"><span>Заработано</span><b>{money(s.earned)}</b></div>
          <div class="kv"><span>Слава фермы</span><b>{s.glory}</b></div>
          <div class="kv"><span>Собрано урожая</span><b>{s.stats.harvested} ед.</b></div>
        </div>
        <p class="small muted">Грамоты, питомцы, семенной фонд и слава остаются в профиле — со следующей фермой будет легче.</p>
        <div class="btn-row">
          <Btn tone="primary" onClick={onRestart}>Начать заново</Btn>
          <Btn onClick={onMap}>На карту</Btn>
        </div>
      </div>
    </div>
  );
}

export function FarmScreen({ s, dispatch, profile, fast, onFast, onMap, onRestart, error, onTest, testing=false, onTestTools, suspended=false, tutorial }: {
  s: GameState; dispatch: Dispatch; profile: Profile; fast: boolean; onFast: () => void; onMap: () => void; onRestart: () => void; error: string | null; onTest?:()=>void; testing?:boolean; onTestTools?:()=>void; suspended?:boolean; tutorial?:TutorialControls;
}) {
  const [tab, setTab] = useState<TabId>('field');
  const [menu, setMenu] = useState(false);
  const [orderTarget,setOrderTarget]=useState<{org:OrgId;key:number}|null>(null);
  const [paymentOpen, setPaymentOpen] = useState(s.phase === 'shortfall');
  const [barnTarget, setBarnTarget] = useState<{ tab: 'market' | 'shop' | 'bank'; key: number }>({ tab: 'market', key: 0 });
  const [placeRequest, setPlaceRequest] = useState<{ item: BuildItem; key: number } | null>(null);
  useEffect(() => { setPaymentOpen(s.phase === 'shortfall'); }, [s.phase]);
  const pager = useRef<HTMLDivElement>(null);
  const tabRef = useRef<TabId>('field');
  const navigationTarget = useRef<TabId|null>(null);
  tabRef.current = tab;
  const idx = (t: TabId) => TABS.findIndex((x) => x.id === t);
  function go(t: TabId, smooth = true) {
    const el = pager.current;
    if (!el) return;
    const animate=smooth&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    navigationTarget.current=t;
    el.scrollTo({ left: idx(t) * el.clientWidth, behavior: animate ? 'smooth' : 'auto' });
    setTab(t);
  }
  function openBarn(target: 'market' | 'shop' | 'bank' = 'market') {
    setBarnTarget(v => ({ tab: target, key: v.key + 1 }));
    setPaymentOpen(false);
    go('barn');
  }
  useEffect(() => {
    const el = pager.current;
    if (!el) return;
    el.scrollLeft = idx('field') * el.clientWidth;
    let t = 0;
    const onScroll = () => {
      cancelAnimationFrame(t);
      t = requestAnimationFrame(() => {
        // A smooth programmatic scroll passes through other tabs. Those are
        // not visits: deactivating the field here would cancel a build request.
        if(navigationTarget.current){
          if(Math.abs(el.scrollLeft-idx(navigationTarget.current)*el.clientWidth)>1)return;
          navigationTarget.current=null;
        }
        const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
        const id = TABS[Math.max(0, Math.min(TABS.length - 1, i))].id;
        if (id !== tabRef.current) setTab(id);
      });
    };
    const cancelNavigation=()=>{navigationTarget.current=null;};
    const onResize = () => {navigationTarget.current=null;el.scrollLeft = idx(tabRef.current) * el.clientWidth;};
    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('pointerdown',cancelNavigation,{passive:true});
    el.addEventListener('wheel',cancelNavigation,{passive:true});
    window.addEventListener('resize', onResize);
    return () => {
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('pointerdown',cancelNavigation);
      el.removeEventListener('wheel',cancelNavigation);
      cancelAnimationFrame(t);
      window.removeEventListener('resize', onResize);
    };
  }, []);
  const np = nextPayment(s);
  const loc = LOCATIONS[s.loc];
  const ready = locOf(s).orgs.filter((o) => s.orgs[o]?.active && !deliverProblem(s, o)).length;
  const offers = locOf(s).orgs.filter((o) => s.orgs[o]?.offer && !s.orgs[o]?.active).length;
  const badges: Record<TabId, { n?: number | string; tone?: string } | null> = {
    lab: null,
    house: null,
    field: null,
    barn: yardUsed(s) > 0 || storageUsed(s) >= storageCap(s) ? { n: '!', tone: 'hot' } : null,
    orders: ready ? { n: ready, tone: 'good' } : null,
  };
  return (
    <div class={`farm loc-${s.loc} season-${s.season}`}>
      <header class="topbar">
        <button type="button" class="icon-btn menu-btn" onClick={() => testing?onTestTools?.():setMenu(true)} aria-label={testing?"Инструменты проверки":"Меню"}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14" stroke="#3f2a1d" stroke-width="2.6" stroke-linecap="round" /></svg>
        </button>
        <div class="tb-date">
          <b>{SEASON_NAMES[s.season]} · {s.weekInSeason}/{seasonLen(s)}</b>
          <small>{tutorial?'Учебная ферма':`${testing?'Проверка · ':''}${s.year}-й год`}</small>
        </div>
        <div class="tb-money"><Money v={s.money} size={20} /></div>
        <button type="button" class={`tb-pay${s.money >= np.amount ? ' ok' : ''}${s.phase === 'shortfall' ? ' due' : ''}`} onClick={() => s.phase === 'shortfall' ? setPaymentOpen(true) : openBarn('bank')} aria-label={s.due ? `Решить платёж ${money(s.due.amount)}` : `Платёж «${np.name}» ${money(np.amount)} через ${np.weeksLeft} нед.`}>
          <small>{s.phase === 'shortfall' ? 'к оплате' : np.weeksLeft <= 1 ? 'в конце недели' : `через ${np.weeksLeft} нед.`}</small>
          <b>{compactMoney(s.due?.amount ?? np.amount)}</b>
          <span class="pay-bar"><span style={{ width: `${Math.min(100, (s.money / Math.max(1, np.amount)) * 100)}%` }} /></span>
        </button>
      </header>
      <nav class="tabs" role="tablist" aria-label="Разделы фермы">
        {TABS.map((t) => {
          const b = badges[t.id];
          return (
            <button type="button" role="tab" data-tab={t.id} aria-selected={tab === t.id} class={`tab${tab === t.id ? ' on' : ''}${t.id === 'field' ? ' main' : ''}`} onClick={() => go(t.id)}>
              <Icon name={t.icon} size={t.id === 'field' ? 26 : 22} />
              <span>{t.short}</span>
              {b && <i aria-hidden="true" class={`tab-badge ${b.tone ?? ''}`}>{b.n}</i>}
            </button>
          );
        })}
      </nav>
      {s.phase === 'shortfall' && !paymentOpen && <div class="payment-reminder" role="status"><span>Платёж ожидает решения</span><button type="button" onClick={()=>setPaymentOpen(true)}>Решить платёж</button></div>}
      <QuickProjects.Provider value={!!tutorial}><div class="pager" ref={pager}>
        <section class="pane" aria-label="Лаборатория"><LabView s={s} act={dispatch} active={tab === 'lab' && !menu && !paymentOpen && !suspended} teaching={tutorial?.session.step === 'lab'} /></section>
        <section class="pane" aria-label="Дом"><HouseView s={s} act={dispatch} onPlace={(item) => { setPlaceRequest({ item, key: Date.now() }); go('field'); }} /></section>
        <section class="pane field-pane" aria-label="Поле"><FieldView teaching={!!tutorial} precheck={tutorial?.precheck} lessonVisit={tutorial?.session.step==='visit'} onVisitDone={()=>{if(tutorial?.session.step==='visit')tutorial.onNext();}} onOrder={org=>{setOrderTarget({org,key:Date.now()});go('orders');}} testing={testing} s={s} dispatch={dispatch} fast={fast} active={tab === 'field' && !menu && !paymentOpen && !suspended} placeRequest={placeRequest} onGo={(t) => t === 'barn' ? openBarn() : go(t as TabId)} /></section>
        <section class="pane" aria-label="Амбар"><BarnView s={s} act={dispatch} target={barnTarget} onPayment={()=>setPaymentOpen(true)} /></section>
        <section class="pane" aria-label="Заказы"><OrdersView teaching={!!tutorial} target={orderTarget} s={s} act={dispatch} profile={profile} /></section>
      </div></QuickProjects.Provider>
      {tutorial&&!menu&&!paymentOpen&&s.phase!=='gameover'&&<GuideHint controls={tutorial} tab={tab}/>}
      {error && !(tutorial && !menu && !paymentOpen && s.phase !== 'gameover' && tutorial.session.hiddenHintStep !== tutorial.session.step) && <div class="toast" role="alert">{error}</div>}
      {s.phase === 'shortfall' && paymentOpen && <ShortfallSheet s={s} act={dispatch} onBarn={() => openBarn()} onOrders={() => { setPaymentOpen(false); go('orders'); }} onClose={() => setPaymentOpen(false)} onRetry={tutorial?.onRetry} />}
      {s.phase === 'gameover' && (tutorial?<div class="gameover"><div class="panel"><h1>Учебная ферма закрыта</h1><p>Можно повторить последнее задание. Предыдущие уроки проходить заново не нужно.</p><div class="btn-row"><Btn tone="primary" onClick={tutorial.onRetry}>Повторить этот шаг</Btn><Btn onClick={onMap}>На карту</Btn></div></div></div>:<GameOver s={s} onMap={onMap} onRestart={onRestart} />)}
      {menu && (
        <Sheet title={`${loc.name} · ${loc.place}`} icon="map" onClose={() => setMenu(false)}>
          <div class="stack">
            <Btn tone="primary" onClick={() => { setMenu(false); onMap(); }}><Icon name="map" size={20} /> Карта ферм</Btn>
            <Btn onClick={onFast}>{fast ? '⏩ Быстрая анимация' : '▶ Обычная анимация'}</Btn>
            {onTest&&<Btn onClick={()=>{setMenu(false);onTest();}}>Режим проверки</Btn>}
            <p class="small muted">{loc.text}</p>
            <p class="small muted">Ферма сохраняется сама после каждого действия.</p>
          </div>
        </Sheet>
      )}
    </div>
  );
}
