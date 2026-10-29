import {offerDeadline} from '../engine/game';
import { useEffect, useRef, useState } from 'preact/hooks';
import { CROPS, GLORY_SOURCES, LOCATIONS, ORGS, OrgId, PETS, RANKS, WORKERS, rankOf, relTier } from '../engine/data';
import type { Reward } from '../engine/data';
import { GameState, acceptProblem, deliverProblem, locOf, money, questSlots, stockOf, mischiefOn, plural, thievesBlocked, IGNORED_OFFER_WEEKS } from '../engine/game';
import { Icon } from '../art/icons';
import { CropIcon } from '../art/crops';
import { Emblem, Pet } from '../art/extra';
import { Bar, Btn, CropChip, Dispatch, Sheet } from './common';
import type { Profile } from './persist';
import {BUYERS,orderDialogue} from '../content/orderDialogue';
import {Portrait} from '../art/portraits';
import {weekDate} from '../content/rules';

function RewardLine({ r }: { r?: Reward }) {
  if (!r) return null;
  const parts: preact.JSX.Element[] = [];
  if (r.pet) parts.push(<span class="rw"><Pet id={r.pet} size={26} /> {PETS[r.pet].kind.toLowerCase()} {PETS[r.pet].name}</span>);
  if (r.cert) parts.push(<span class="rw"><Icon name="cert" size={20} /> «{r.cert}»</span>);
  if (r.seeds) parts.push(<span class="rw"><CropIcon id={r.seeds} size={22} /> семена: {CROPS[r.seeds].name.toLowerCase()}</span>);
  if (r.worker) parts.push(<span class="rw"><Icon name="team" size={20} /> {WORKERS[r.worker].title.toLowerCase()} · наём без платы</span>);
  if (r.money) parts.push(<span class="rw"><Icon name="coin" size={20} /> премия</span>);
  if (r.card) parts.push(<span class="rw"><Icon name="bio" size={20} /> карта</span>);
  if (r.glory) parts.push(<span class="rw"><Icon name="trophy" size={20} /> +{r.glory} славы</span>);
  return <span class="rewards">{parts}</span>;
}

function OrgCard({ s, o, act, teaching=false }: { s: GameState; o: OrgId; act: Dispatch; teaching?:boolean }) {
  const d = ORGS[o];
  const st = s.orgs[o]!;
  const tier = relTier(st.rel);
  const q = st.active ?? st.offer;
  const angry = mischiefOn(s, o);
  const accepting = !st.active && !!st.offer;
  const dWhy = st.active ? deliverProblem(s, o) : null;
  const left = st.active?.deadline !== undefined ? st.active.deadline - s.absWeek : null;
  const buyer=BUYERS[o];
  return (
    <article data-org={o} class={`org2 tone-${tier.tone}${angry ? ' angry' : ''}${st.active ? ' has-active' : q ? ' has-offer' : ''}`}>
      <header class="org2-head">
        <div class={`org-people${o==='orphanage'?' with-children':''}`} role="img" aria-label={o==='orphanage'?'Ольга Петровна, Катя и Миша':buyer.name}>
          <Portrait id={buyer.person} size={48}/>
          {o==='orphanage'&&<span class="org-children"><Portrait id="katya" size={26}/><Portrait id="misha" size={26}/></span>}
        </div>
        <div class="grow">
          <h3>{d.name}</h3>
          <small>{buyer.name} · {buyer.role.toLowerCase()}</small>
        </div>
        <span class={`rel-chip t-${tier.tone}`} title="Отношения">{tier.name}</span>
      </header>
      {angry && <p class="org-warn"><Icon name={d.mischief === 'thieves' ? 'kids' : 'down'} size={18} /> {d.mischiefText}{d.mischief === 'thieves' && thievesBlocked(s) ? ' — но пёс и сторож не пускают' : ''}</p>}
      {q ? (
        <div class={`quest2${st.active ? ' active' : ''}`}>
          <div class="quest2-title">
            <b>{q.title}</b>
            {st.active ? <span class={`deadline${left !== null && left <= 1 ? ' hot' : ''}`}>{left !== null && left <= 0 ? 'до конца недели' : `срок: ${weekDate(s, st.active.deadline!)} · ещё ${left} нед.`}</span> : <span class="deadline soft">{`срок: ${weekDate(s, offerDeadline(s,q))} · ${Math.max(0,offerDeadline(s,q)-s.absWeek)} нед.`}</span>}
          </div>
          <div class="quest-lines">
            {q.lines.map((l) => <CropChip c={l.crop} qty={l.qty} have={stockOf(s, l.crop)} />)}
          </div>
          <div class="quest2-pay">
            <span class="pay"><Icon name="coin" size={18} /><b>{money(q.pay)}</b></span>
            {q.reward && <RewardLine r={q.reward} />}
          </div>
          
          {accepting ? (
            <Btn tone="primary" disabled={acceptProblem(s, o)} onClick={() => act({ t: 'accept', org: o })}>Взять заказ</Btn>
          ) : (
            <Btn tone={dWhy ? undefined : 'good'} disabled={dWhy} onClick={() => act({ t: 'deliver', org: o })}>{dWhy ?? `Сдать · +${money(q.pay)}`}</Btn>
          )}
          {accepting && <small class="quest2-note">Можно пропустить без штрафа — предложение ещё {Math.max(0,(q.expires??s.absWeek+IGNORED_OFFER_WEEKS-st.idle)-s.absWeek)} нед.</small>}
          {st.active && left!==null && left<=1 && <small class="quest2-note bad">Сдайте кнопкой до конца недели: урожай этой ночи уже опоздает.</small>}
        </div>
      ) : (
        <p class="quest-empty">{teaching?'Учебный заказ появится, когда он понадобится в уроке.':s.season === 3 ? 'Зимой новых заказов нет.' : angry && d.mischief === 'silence' ? 'Обиделись и молчат. Со временем остынут.' : st.wait > 0 ? `Новый заказ через ${st.wait} нед.` : 'Новый заказ скоро.'}</p>
      )}
      <OrgRelations s={s} o={o} />
    </article>
  );
}

// the story of a buyer: relations, the chain of orders, their words — opened on request
function OrgRelations({ s, o, open }: { s: GameState; o: OrgId; open?: boolean }) {
  const d = ORGS[o];
  const st = s.orgs[o]!;
  const tier = relTier(st.rel);
  const q = st.active ?? st.offer;
  const chainLen = d.steps.length;
  const done = st.step >= chainLen;
  const finalReward = d.steps[chainLen - 1]?.reward;
  const buyer = BUYERS[o];
  const dialogue = q ? orderDialogue(q) : [];
  return (
    <details class="org-more" open={open}>
      <summary>Отношения и награды <span class="chain-mini" aria-label={`Цепочка: ${Math.min(st.step, chainLen)} из ${chainLen}`}>{d.steps.map((_, i) => <i class={i < st.step ? 'done' : i === st.step ? 'now' : ''} />)}</span></summary>
      <div class="rel">
        <span class="rel-meter" aria-label={`Отношения: ${tier.name}`}><i style={{ left: `${(st.rel + 100) / 2}%` }} /></span>
        <span class={`rel-name t-${tier.tone}`}>{tier.name}</span>
      </div>
      {st.rel >= 25 ? <p class="org-perk"><Icon name="star" size={16} /> {d.perk}</p> : <p class="org-perk muted">С дружбы: {d.perk.toLowerCase()}</p>}
      {!done && finalReward && <p class="org-goal">В конце цепочки: <RewardLine r={finalReward.pet || finalReward.cert ? { pet: finalReward.pet, cert: finalReward.cert } : finalReward} /></p>}
      {done && <p class="org-goal up">Цепочка пройдена · постоянные заказы</p>}
      {q && st.active && <p class="org-goal">За сдачу: отношения +{q.rel}</p>}
      {dialogue.length > 0 && <div class="order-dialogue" aria-label={`Слова заказчика: ${buyer.name}`}>
        {dialogue.map((line,i)=><div class={`order-line${i?' child-line':''}`} key={line.who}>
          {i>0&&<Portrait id={line.who} size={26}/>}
          <p>{i>0&&<b>{line.name}: </b>}{line.text}</p>
        </div>)}
      </div>}
    </details>
  );
}

// №11 · a buyer with nothing on the table is one quiet row; their story opens on tap
function OrgRow({ s, o, teaching }: { s: GameState; o: OrgId; teaching?: boolean }) {
  const d = ORGS[o];
  const st = s.orgs[o]!;
  const tier = relTier(st.rel);
  const angry = mischiefOn(s, o);
  const buyer = BUYERS[o];
  const status = teaching ? 'Учебный заказ появится, когда он понадобится в уроке.' : s.season === 3 ? 'Зимой новых заказов нет.' : angry && d.mischief === 'silence' ? 'Обиделись и молчат.' : st.wait > 0 ? `Новый заказ через ${st.wait} нед.` : 'Новый заказ скоро.';
  return (
    <details data-org={o} class={`org-row tone-${tier.tone}${angry ? ' angry' : ''}`}>
      <summary>
        <Portrait id={buyer.person} size={36} />
        <span class="grow"><b>{d.name}</b><small>{status}</small></span>
        <span class={`rel-chip t-${tier.tone}`} title="Отношения">{tier.name}</span>
      </summary>
      {angry && <p class="org-warn"><Icon name={d.mischief === 'thieves' ? 'kids' : 'down'} size={18} /> {d.mischiefText}{d.mischief === 'thieves' && thievesBlocked(s) ? ' — но пёс и сторож не пускают' : ''}</p>}
      <p class="small muted org-who">{buyer.name} · {buyer.role.toLowerCase()}</p>
      <OrgRelations s={s} o={o} open />
    </details>
  );
}

function HallView({ s, profile, onBack }: { s: GameState; profile: Profile; onBack: () => void }) {
  const glory = profile.glory;
  const r = rankOf(glory);
  return (
    <div class="hall">
      <div class="hall-top">
        <button type="button" class="back-link" onClick={onBack}><span aria-hidden="true">‹</span> Заказы</button>
        <h2>Зал славы</h2>
      </div>
      <section class="panel hall-body">
      <div class="hall-rank">
        <Icon name="trophy" size={48} />
        <div class="grow">
          <h3>{r.name}</h3>
          <small class="muted">слава {glory}{r.next ? ` · до «${r.next.name}» ещё ${r.next.min - glory}` : ''}</small>
          {r.next && <Bar value={glory - r.min} max={r.next.min - r.min} tone="gold" />}
        </div>
      </div>
      <ol class="ranks">
        {RANKS.map((k, i) => <li class={i <= r.index ? 'got' : ''}>{k.name} <small>{k.min} · {k.opens}</small></li>)}
      </ol>
      <p class="small muted">Слава даётся за {GLORY_SOURCES}. Она общая для всех ферм.</p>
      <h4>Грамоты со всех ферм</h4>
      {profile.certs.length ? (
        <div class="certs">
          {profile.certs.map((c) => (
            <div class="cert">
              <Icon name="cert" size={30} />
              <span><b>{c.name}</b><small>{LOCATIONS[c.loc].name}, {c.year}-й год</small></span>
            </div>
          ))}
        </div>
      ) : <p class="small muted">Грамоты дают заказчики в конце цепочек, выкуп дома, праздник урожая, испытания года, знание культур и летопись хозяйства.</p>}
      <h4>Питомцы</h4>
      {profile.pets.length ? <div class="chips">{profile.pets.map((p) => <span class="chip"><Pet id={p} size={28} /> {PETS[p].kind} {PETS[p].name}</span>)}</div> : <p class="small muted">Пока нет. Питомцы переезжают с вами на любую ферму.</p>}
      <h4>Семенной фонд</h4>
      {profile.seedBank.length ? <div class="chips">{profile.seedBank.map((c) => <span class="chip"><CropIcon id={c} size={24} /> {CROPS[c].name}</span>)}</div> : <p class="small muted">Редкие семена из наград доступны потом на всех подходящих фермах.</p>}
      <h4>Заказчики</h4>
      <p class="small">Цепочки заказов здесь: {locOf(s).orgs.filter(o=>(s.orgs[o]?.step??0)>=ORGS[o].steps.length).length} из {locOf(s).orgs.length} пройдены до конца. {s.loc === 'chernozem' ? 'Главная цель дома — летопись хозяйства (Дом → «Летопись»): выкуп, подворье, соседи, клуб, победа над Пряхиным, первое место в районе.' : 'На вылазке цепочки дают находки, когда хозяйство свернёте.'}</p>
      <h4>Личные рекорды</h4><p class="small muted">Лучшие результаты всех ваших ферм на этом устройстве.</p>
      <div class="bank-grid">
        <div class="kv"><span>Лет на одной ферме</span><b>{profile.best.years}</b></div>
        <div class="kv"><span>Больше всего денег</span><b>{money(profile.best.money)}</b></div>
        <div class="kv"><span>Собрано за партию</span><b>{profile.best.harvest} ед.</b></div>
        <div class="kv"><span>Слава с этой фермы</span><b>{s.glory}</b></div>
      </div>
      {profile.history.length > 0 && (
        <>
          <h4>Прошлые фермы</h4>
          {profile.history.map((h) => <p class="small">{LOCATIONS[h.loc].name}: {h.years} {plural(h.years, 'год', 'года', 'лет')}, слава {h.glory}. {h.reason}</p>)}
        </>
      )}
      </section>
    </div>
  );
}

export function OrdersView({ s, act, profile, target, teaching=false }: { s: GameState; act: Dispatch; profile: Profile; target?:{org:OrgId;key:number}|null; teaching?:boolean }) {
  const [hall, setHall] = useState(false);
  const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(target)setHall(false);},[target?.key]);
  // The buyer cards only exist after leaving the hall. Wait for that render
  // before looking up the destination, including when a visit opens this tab.
  useEffect(()=>{if(!target||hall)return;const el=root.current?.querySelector<HTMLElement>(`[data-org="${target.org}"]`);const pane=root.current?.closest('.pane');if(!el||!pane)return;
   const frame=requestAnimationFrame(()=>{pane.scrollTo({top:pane.scrollTop+el.getBoundingClientRect().top-pane.getBoundingClientRect().top-8,behavior:'auto'});el.classList.add('order-arrival');});
   const timer=window.setTimeout(()=>el.classList.remove('order-arrival'),1800);
   return()=>{cancelAnimationFrame(frame);clearTimeout(timer);el.classList.remove('order-arrival');};
  },[target?.key,hall]);
  const r = rankOf(profile.glory);
  const active = Object.values(s.orgs).filter((x) => x?.active).length;
  const orgs = teaching?locOf(s).orgs.slice(0,1):locOf(s).orgs;
  // ready to hand over first, then active by the nearest date, then offers; buyers with nothing on the table below
  const score = (o: OrgId) => (s.orgs[o]?.active ? (deliverProblem(s, o) ? 1 : 0) : s.orgs[o]?.offer ? 2 : 3);
  const due = (o: OrgId) => s.orgs[o]?.active?.deadline ?? (s.orgs[o]?.offer ? offerDeadline(s, s.orgs[o]!.offer!) : 1e9);
  const order = [...orgs].sort((a, b) => score(a) - score(b) || due(a) - due(b));
  const busyOrgs = order.filter((o) => score(o) < 3), quietOrgs = order.filter((o) => score(o) === 3);
  function showHall(v: boolean) {
    setHall(v);
    requestAnimationFrame(() => root.current?.closest('.pane')?.scrollTo({ top: 0 }));
  }
  if (hall) return <div class="pane-inner orders-pane" ref={root}><HallView s={s} profile={profile} onBack={() => showHall(false)} /></div>;
  return (
    <div class="pane-inner orders-pane" ref={root}>
      <div class="orders-top"><b>В работе {active}/{questSlots(s)}</b><button type="button" class="hall-link" onClick={()=>showHall(true)} aria-label="Открыть зал славы"><Icon name="trophy" size={20}/>{r.name}</button></div>
      <div class="orgs">
        {/* PSV-035 · stable keys: an open «details» and focus stay with their organisation when the list re-sorts */}
        {busyOrgs.map((o) => <OrgCard key={o} s={s} o={o} act={act} teaching={teaching} />)}
        {!busyOrgs.length && <p class="quest-empty orders-none">{teaching ? 'Учебный заказ появится, когда он понадобится в уроке.' : s.season === 3 ? 'Зимой новых заказов нет.' : 'Сейчас заказов нет — покупатели ниже скажут, когда придут.'}</p>}
      </div>
      {quietOrgs.length > 0 && <section class="org-list" aria-label="Знакомые покупатели">
        <h3>Знакомые покупатели</h3>
        {quietOrgs.map((o) => <OrgRow key={o} s={s} o={o} teaching={teaching} />)}
      </section>}
    </div>
  );
}
