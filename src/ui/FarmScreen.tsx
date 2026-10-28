import {GuideHint,type TutorialControls} from './Guide';
import {LessonLocks,QuickProjects} from './lesson';
import {Peek} from './Peek';
import {areaOpen,closedReason,type TutorialArea} from '../engine/tutorial';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren, JSX } from 'preact';
import { LOCATIONS, SEASON_NAMES } from '../engine/data';
import {
  GameState, deliverProblem, labBusy, labSlots, lvl, money, nextPayment, plural, seasonLen, storageCap, storageUsed, workshopBusy, workshopSlots,
  yardUsed, creditLimit, locOf, loanRate, outstanding, fmt, round2, weekDays,
} from '../engine/game';
import type { OrgId } from '../engine/data';
import type { BuildItem } from '../engine/game';
import { Icon } from '../art/icons';
import { Btn, Dispatch, Money, Sheet, compactMoney, reducedMotionNow, useModal } from './common';
import { FieldView } from './FieldView';
import type { VillageApi, VillageMode } from './Village';
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
// where each screen stands in the village: from the village a tab flies there first
// the training farm keeps these sections closed until their lesson (engine/tutorial.ts · AREA_OPENS)
const TAB_AREA: Partial<Record<TabId, TutorialArea>> = { lab: 'lab', house: 'house', barn: 'barn', orders: 'orders' };
const TAB_PLACE: Partial<Record<TabId, (s: GameState) => string>> = {
  lab: (s) => (lvl(s, 'lab') >= 1 ? 'lab' : 'lot-lab'),
  house: () => 'house',
  barn: () => 'barn',
  orders: () => 'board',
};

function ShortfallSheet({ s, act, onBarn, onOrders, onClose, onRetry }: { s: GameState; act: Dispatch; onBarn: () => void; onOrders: () => void; onClose: () => void; onRetry?:()=>void }) {
  const due = s.due!;
  const deficit = Math.max(0, due.amount - s.money);
  const sellable = storageUsed(s) + yardUsed(s) > 0;
  const deliverable = locOf(s).orgs.some((o) => s.orgs[o]?.active && !deliverProblem(s, o));
  const creditWhy = deficit <= 0 ? 'Уже хватает на платёж' : s.rating === 0 || creditLimit(s) < deficit ? 'Банк не даст столько' : null;
  // PSV-010 · the credit's terms are known before the choice, like the postponement's +20% and rating −2
  const ratePct = `${fmt(loanRate(s) * 100)}% в неделю`;
  const ratingHit = s.shortfallBorrowed ? '' : ' · рейтинг −1';
  const creditTerms = `Ставка ${ratePct} · долг станет ${money(round2(outstanding(s) + deficit))}${ratingHit}`;
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
      {main === 'credit' && <><Btn tone="primary" onClick={() => act({ t: 'emergency' })}>Экстренный кредит {money(deficit)}</Btn><p class="small credit-terms">{creditTerms}</p></>}
      {main === 'postpone' && <Btn tone="primary" disabled={s.restructured ? 'Переносить можно один раз' : null} onClick={() => act({ t: 'restructure' })}>Перенести платёж · +20%</Btn>}
      <div class="due-other">
        {main !== 'pay' && deficit > 0 && main !== 'barn' && sellable && <Btn small tone="ghost" onClick={onBarn}>Продать урожай</Btn>}
        {main !== 'orders' && deliverable && <Btn small tone="ghost" onClick={onOrders}>Сдать заказ</Btn>}
        {main !== 'credit' && deficit > 0 && <Btn small tone="ghost" disabled={creditWhy} title={creditTerms} onClick={() => act({ t: 'emergency' })}>Кредит {money(deficit)} · {ratePct}{ratingHit}</Btn>}
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

/** PSV-007 · the closed farm is a real modal: focus inside, Tab cycles its two actions, the farm behind is inert. */
export function ClosedLayer({ title, children }: { title: string; children: ComponentChildren }) {
  const ref = useRef<HTMLDivElement>(null);
  useModal(ref);
  return (
    <div class="gameover">
      <div class="panel" role="dialog" aria-modal="true" aria-labelledby="gameover-title" tabIndex={-1} ref={ref}>
        <h1 id="gameover-title">{title}</h1>
        {children}
      </div>
    </div>
  );
}

function GameOver({ s, onMap, onRestart }: { s: GameState; onMap: () => void; onRestart: () => void }) {
  return (
    <ClosedLayer title="Ферма закрыта">
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
    </ClosedLayer>
  );
}

export function FarmScreen({ s, dispatch, profile, fast, onFast, onMap, onRestart, error, onTest, testing=false, onTestTools, suspended=false, tutorial }: {
  s: GameState; dispatch: Dispatch; profile: Profile; fast: boolean; onFast: () => void; onMap: () => void; onRestart: () => void; error: string | null; onTest?:()=>void; testing?:boolean; onTestTools?:()=>void; suspended?:boolean; tutorial?:TutorialControls;
}) {
  const [tab, setTab] = useState<TabId>('field');
  // PSV-028 · while last week's events play, the top bar shows that week too (the save is already the new one)
  const [present, setPresent] = useState<GameState | null>(null);
  const hud = present && s.phase === 'week' ? present : s;
  const [menu, setMenu] = useState(false);
  const [orderTarget,setOrderTarget]=useState<{org:OrgId;key:number}|null>(null);
  const [paymentOpen, setPaymentOpen] = useState(s.phase === 'shortfall');
  const [barnTarget, setBarnTarget] = useState<{ tab: 'market' | 'shop' | 'bank'; key: number }>({ tab: 'market', key: 0 });
  const [placeRequest, setPlaceRequest] = useState<{ item: BuildItem; key: number } | null>(null);
  const villageApi = useRef<VillageApi | null>(null);
  const [fieldMode, setFieldMode] = useState<VillageMode>('field');
  useEffect(() => { setPaymentOpen(s.phase === 'shortfall'); }, [s.phase]);
  const pager = useRef<HTMLDivElement>(null);
  const tabRef = useRef<TabId>('field');
  const navigationTarget = useRef<TabId|null>(null);
  tabRef.current = tab;
  const idx = (t: TabId) => TABS.findIndex((x) => x.id === t);
  function go(t: TabId, smooth = true) {
    const el = pager.current;
    if (!el) return;
    const animate=smooth&&!reducedMotionNow();
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
  // PSV-006 · only the shown section is in the Tab order and the accessibility tree. Swiping still works:
  // the pager scrolls, and the section that settles in view becomes the live one.
  // 28.10 · a small tab row under the bar on every farm (the village stays a second way into the sections)
  const tabs = true;
  const lockOf = (area: TutorialArea) => tutorial && !areaOpen(tutorial.session.step, area) ? closedReason(area) : null;
  const tabLock = (id: TabId) => { const a = TAB_AREA[id]; return a ? lockOf(a) : null; };
  const paneProps = (id: TabId) => ({ id: `pane-${id}`, role: tabs ? 'tabpanel' as const : 'region' as const, ...(tabs ? { 'aria-labelledby': `tab-${id}` } : { 'aria-label': TABS[idx(id)].name }), inert: tab !== id, 'data-inert-base': String(tab !== id) });
  // a tablist with one Tab stop: arrows, Home and End move between sections
  function onTabKey(e: JSX.TargetedKeyboardEvent<HTMLElement>) {
    const at = idx(tabRef.current);
    const to = e.key === 'ArrowRight' ? Math.min(TABS.length - 1, at + 1) : e.key === 'ArrowLeft' ? Math.max(0, at - 1) : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : -1;
    if (to < 0) return;
    e.preventDefault();
    go(TABS[to].id);
    document.getElementById(`tab-${TABS[to].id}`)?.focus();
  }
  const np = nextPayment(hud);
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
  // Without the tab row the sections are reached through the village (its buildings) and from the menu;
  // on a section the bar's first button leads back to the field.
  const openSection = (t: TabId) => {
    setMenu(false);
    const v = villageApi.current, place = TAB_PLACE[t];
    if (tab === 'field' && v?.available && v.mode() !== 'field' && place) { void v.flyTo(place(s)).then(() => go(t)); return; }
    go(t);
  };
  const days = hud.days, daysOf = Math.max(weekDays(hud), days);
  return (
    <div class={`farm loc-${s.loc} season-${s.season} on-${tab}${tabs ? ' with-tabs' : ''}`}>
      {/* one thin bar over every section: money and the payment on the left, the week and its working days on the right */}
      <header class="topbar main-bar">
        {tab === 'field' || tabs
          ? <button type="button" class="icon-btn menu-btn" onClick={() => testing?onTestTools?.():setMenu(true)} aria-label={testing?"Инструменты проверки":"Меню и разделы"}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14" stroke="#3f2a1d" stroke-width="2.6" stroke-linecap="round" /></svg>
              {!tabs && (badges.barn || badges.orders) && <i class="menu-dot" aria-hidden="true" />}
            </button>
          : <button type="button" class="icon-btn back-btn" onClick={() => go('field')} aria-label="Назад к полю">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 L8 12 L15 19" fill="none" stroke="#3f2a1d" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </button>}
        <div class="tb-money"><Money v={hud.money} size={20} /></div>
        <button type="button" class={`tb-pay${hud.money >= np.amount ? ' ok' : ''}${s.phase === 'shortfall' ? ' due' : ''}`} onClick={() => s.phase === 'shortfall' ? setPaymentOpen(true) : openBarn('bank')} aria-label={s.due ? `Решить платёж ${money(s.due.amount)}` : `Платёж «${np.name}» ${money(np.amount)} через ${np.weeksLeft} нед.`}>
          <b>{compactMoney(s.due?.amount ?? np.amount)}</b>
          <small>{s.phase === 'shortfall' ? 'к оплате' : np.weeksLeft <= 1 ? 'в конце недели' : `через ${np.weeksLeft} нед.`}</small>
          <span class="pay-bar"><span style={{ width: `${Math.min(100, (hud.money / Math.max(1, np.amount)) * 100)}%` }} /></span>
        </button>
        <div class="tb-date">
          <b>{SEASON_NAMES[hud.season]} · {hud.weekInSeason}/{seasonLen(hud)}</b>
          <small>{present && hud === present ? 'прошлая неделя' : tutorial?'Учебная ферма':`${testing?'Проверка · ':''}${s.year}-й год`}</small>
        </div>
        <div class="tb-days" aria-label={`Рабочих дней осталось: ${days}`}>
          <b>{days}</b>
          <span><small>{plural(days, 'день', 'дня', 'дней')}</small>
            {daysOf <= 6 && <span class="day-pips" aria-hidden="true">{Array.from({ length: daysOf }, (_, i) => <i class={i < days ? 'on' : ''} />)}</span>}</span>
        </div>
      </header>
      {tabs && <nav class="tabs" role="tablist" aria-label="Разделы фермы" onKeyDown={onTabKey}>
        {TABS.map((t) => {
          const locked = tabLock(t.id);
          const b = locked ? null : badges[t.id];
          return (
            <button type="button" role="tab" id={`tab-${t.id}`} aria-controls={`pane-${t.id}`} tabIndex={tab === t.id ? 0 : -1} data-tab={t.id} aria-selected={tab === t.id} aria-label={locked ? `${t.name} — закрыто` : undefined} class={`tab${tab === t.id ? ' on' : ''}${t.id === 'field' ? ' main' : ''}${locked ? ' locked' : ''}`} onClick={() => {
                const v = villageApi.current;
                // the field's tab takes you to the field, and on the field between it and the village
                if (t.id === 'field') { if (tab === 'field' && v?.available) v.toggle(); else go('field'); return; }
                const place = TAB_PLACE[t.id];
                if (tab === 'field' && v?.available && v.mode() !== 'field' && place) { void v.flyTo(place(s)).then(() => go(t.id)); return; }
                go(t.id);
              }}>
              <Icon name={locked ? 'lock' : t.icon} size={t.id === 'field' ? 26 : 22} />
              <span>{t.id === 'field' && tab === 'field' && fieldMode !== 'field' ? 'Деревня' : t.short}</span>
              {b && <i aria-hidden="true" class={`tab-badge ${b.tone ?? ''}`}>{b.n}</i>}
            </button>
          );
        })}
      </nav>}
      {s.phase === 'shortfall' && !paymentOpen && (tab !== 'field' || fieldMode !== 'field') && <div class="payment-reminder" role="status"><div class="pr-chip"><span>Платёж ожидает решения</span><button type="button" onClick={()=>setPaymentOpen(true)}>Решить платёж</button></div></div>}
      <LessonLocks.Provider value={lockOf}><QuickProjects.Provider value={!!tutorial}><div class="pager" ref={pager}>
        <section class="pane" {...paneProps('lab')}><Peek area="lab" onBack={() => go('field')}><LabView s={s} act={dispatch} active={tab === 'lab' && !menu && !paymentOpen && !suspended && !tabLock('lab')} teaching={tutorial?.session.step === 'lab'} /></Peek></section>
        <section class="pane" {...paneProps('house')}><Peek area="house" onBack={() => go('field')}><HouseView s={s} act={dispatch} onPlace={(item) => { setPlaceRequest({ item, key: Date.now() }); go('field'); }} /></Peek></section>
        <section class="pane field-pane" {...paneProps('field')}><FieldView onPresent={setPresent} teaching={!!tutorial} precheck={tutorial?.precheck} lessonVisit={tutorial?.session.step==='visit'} onVisitDone={()=>{if(tutorial?.session.step==='visit')tutorial.onNext();}} onOrder={org=>{setOrderTarget({org,key:Date.now()});go('orders');}} onPayment={()=>setPaymentOpen(true)} onMap={onMap} villageApi={villageApi} onVillageMode={setFieldMode} testing={testing} s={s} dispatch={dispatch} fast={fast} active={tab === 'field' && !menu && !paymentOpen && !suspended} placeRequest={placeRequest} onGo={(t) => t === 'barn' ? openBarn() : go(t as TabId)} /></section>
        <section class="pane" {...paneProps('barn')}><Peek area="barn" onBack={() => go('field')}><BarnView s={s} act={dispatch} target={barnTarget} onPayment={()=>setPaymentOpen(true)} /></Peek></section>
        <section class="pane" {...paneProps('orders')}><Peek area="orders" onBack={() => go('field')}><OrdersView teaching={!!tutorial} target={orderTarget} s={s} act={dispatch} profile={profile} /></Peek></section>
      </div></QuickProjects.Provider></LessonLocks.Provider>
      {tutorial&&!menu&&!paymentOpen&&s.phase!=='gameover'&&<GuideHint controls={tutorial} tab={tab} village={fieldMode} flyTo={(k)=>{void villageApi.current?.flyTo(k);}}/>}
      {error && !(tutorial && !menu && !paymentOpen && s.phase !== 'gameover' && tutorial.session.hiddenHintStep !== tutorial.session.step) && <div class="toast" role="alert">{error}</div>}
      {s.phase === 'shortfall' && paymentOpen && <ShortfallSheet s={s} act={dispatch} onBarn={() => openBarn()} onOrders={() => { setPaymentOpen(false); go('orders'); }} onClose={() => setPaymentOpen(false)} onRetry={tutorial?.onRetry} />}
      {s.phase === 'gameover' && (tutorial?<ClosedLayer title="Учебная ферма закрыта"><p>Можно повторить последнее задание. Предыдущие уроки проходить заново не нужно.</p><div class="btn-row"><Btn tone="primary" onClick={tutorial.onRetry}>Повторить этот шаг</Btn><Btn onClick={onMap}>На карту</Btn></div></ClosedLayer>:<GameOver s={s} onMap={onMap} onRestart={onRestart} />)}
      {menu && (
        <Sheet title={`${loc.name} · ${loc.place}`} icon="map" onClose={() => setMenu(false)}>
          <div class="stack">
            {!tabs && <div class="menu-sections" role="group" aria-label="Разделы фермы">
              {TABS.filter((t) => t.id !== 'field').map((t) => {
                const b = badges[t.id];
                return <button type="button" class="menu-section" onClick={() => openSection(t.id)}><Icon name={t.icon} size={26} /><span>{t.name}</span>{b && <i class={`tab-badge ${b.tone ?? ''}`}>{b.n}</i>}</button>;
              })}
            </div>}
            {!tabs && villageApi.current?.available && <p class="small muted">Те же разделы стоят в деревне: потяните небо вниз или нажмите «Деревня».</p>}
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
