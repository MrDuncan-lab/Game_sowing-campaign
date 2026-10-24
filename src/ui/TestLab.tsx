import {useEffect,useRef,useState} from 'preact/hooks';
import * as D from '../engine/data';
import * as G from '../engine/game';
import {TEST_SCENARIOS,TestScenario,testFixture,testHand,testDate,testAnimation,testOrderFixture} from '../engine/testLab';
import {BUYERS} from '../content/orderDialogue';
import {FarmScreen} from './FarmScreen';
import {emptyProfile,syncProfile} from './persist';
import {Btn,Sheet} from './common';
type Panel='scenarios'|'cards'|'conditions'|'animations';
export function TestLab({onExit,initialLoc='chernozem'}:{onExit:()=>void;initialLoc?:D.LocationId}){
 const[s,setS]=useState(()=>testFixture('planting',initialLoc)),[preset,setPreset]=useState<TestScenario>('planting');
 const[profile,setProfile]=useState(()=>({...emptyProfile(),glory:500,settings:{fast:false,intro:true}}));
 const[open,setOpen]=useState(true),[panel,setPanel]=useState<Panel>('scenarios'),[frame,setFrame]=useState(0),[error,setError]=useState<string|null>(null),[fast,setFast]=useState(false);
 const[cardDef,setCardDef]=useState('seed_radish'),[temperature,setTemperature]=useState(()=>G.airTemp(s)),[season,setSeason]=useState<number>(s.season),[year,setYear]=useState(s.year);
 const[buyer,setBuyer]=useState<D.OrgId>('orphanage'),[story,setStory]=useState(0);
 const[dialogueDemo,setDialogueDemo]=useState<{org:D.OrgId;step:number}|null>(null);
 const[exportState,setExportState]=useState<string|null>(null);
 const exportText=useRef<HTMLTextAreaElement>(null);
 const ref=useRef(s),errTimer=useRef<number>();ref.current=s;
 useEffect(()=>()=>clearTimeout(errTimer.current),[]);
 function show(n:G.GameState,remount=false){ref.current=n;setS(n);setProfile(p=>syncProfile(p,n));setError(null);if(remount)setFrame(k=>k+1);}
 function update(fn:(n:G.GameState)=>void,close=false){const n=structuredClone(ref.current);fn(n);show(n,true);if(close)setOpen(false);}
 function load(id:TestScenario,loc=s.loc){setDialogueDemo(null);setPreset(id);const n=testFixture(id,loc);show(n,true);setSeason(n.season);setYear(n.year);setTemperature(G.airTemp(n));setOpen(false);}
 function loadDialogue(org:D.OrgId,step:number){const n=testOrderFixture(org,step);setDialogueDemo({org,step});show(n,true);setSeason(n.season);setYear(n.year);setTemperature(G.airTemp(n));setOpen(false);}
 function reset(){if(dialogueDemo)loadDialogue(dialogueDemo.org,dialogueDemo.step);else load(preset);}
 function dispatch(a:G.Action):G.GameState|null {
  try{const n=G.apply(ref.current,a);show(n);return n;}catch(e){if(!(e instanceof G.GameError))throw e;setError(e.message);clearTimeout(errTimer.current);errTimer.current=window.setTimeout(()=>setError(null),2600);return null;}
 }
 const label=dialogueDemo?['dialogue',`Заказчик: ${BUYERS[dialogueDemo.org].name}`,'Новая реплика и переход к предложению. Обычные награды не меняются.']:TEST_SCENARIOS.find(x=>x[0]===preset)!;
 return <>
  <FarmScreen key={frame} s={s} profile={profile} dispatch={dispatch} fast={fast} onFast={()=>setFast(v=>!v)} onMap={onExit} onRestart={reset} error={error} testing onTestTools={()=>setOpen(true)} suspended={open}/>
  {open&&<Sheet title="Режим проверки" onClose={()=>setOpen(false)}>
   <p class="test-isolation">Отдельная тестовая ферма. Обычные сохранения и награды не меняются. После перезагрузки тест начинается заново.</p>
   <div class="test-current"><b>{label[1]}</b><small>{label[2]}</small><Btn small tone="primary" onClick={()=>setOpen(false)}>Вернуться на поле</Btn></div>
   <label class="test-select">Регион<select aria-label="Регион теста" value={s.loc} onChange={e=>load(preset,e.currentTarget.value as D.LocationId)}>{D.LOCATION_IDS.map(l=><option value={l}>{D.LOCATIONS[l].name}</option>)}</select></label>
   <nav class="seg test-tabs">{([['scenarios','Ситуации'],['cards','Карты'],['conditions','Условия'],['animations','Анимации']] as const).map(([id,name])=><button type="button" class={panel===id?'on':''} onClick={()=>setPanel(id)}>{name}</button>)}</nav>
   {panel==='scenarios'&&<div class="test-scenarios">{TEST_SCENARIOS.map(([id,name,desc])=><button type="button" class={`test-scenario${preset===id?' chosen':''}`} onClick={()=>load(id)}><b>{name}</b><small>{desc}</small></button>)}</div>}
   {panel==='cards'&&<div class="stack">
    <label class="test-select">Карта<select aria-label="Карта для проверки" value={cardDef} onChange={e=>setCardDef(e.currentTarget.value)}>{Object.values(D.CARDS).map(c=><option value={c.id}>{c.name}</option>)}</select></label>
    <Btn tone="primary" onClick={()=>update(n=>testHand(n,[cardDef]),true)}>Оставить в руке выбранную карту</Btn>
    <Btn disabled={s.hand.length>=G.handMax(s)?'Рука заполнена':null} onClick={()=>update(n=>n.hand.push({uid:n.nextUid++,def:cardDef}),true)}>Добавить карту в руку</Btn>
    <Btn onClick={()=>load('exchange')}>Подготовить полную руку для обмена</Btn>
    <Btn onClick={()=>update(n=>{testHand(n,Array.from({length:G.handMax(n)},()=>cardDef));},true)}>Полная рука этой карты для проверки веера</Btn>
    <p class="small muted">Выдача не обходит правила применения. Например, томатам всё ещё нужна теплица, а зимним картам — зима.</p>
   </div>}
   {panel==='conditions'&&<div class="stack">
    <div class="btn-row"><Btn small onClick={()=>update(n=>n.money+=1000)}>+1000 ₽</Btn><Btn small onClick={()=>update(n=>n.days+=3)}>+3 дня</Btn></div>
    <div class="btn-row"><Btn small onClick={()=>update(n=>n.tiles.forEach(t=>{if(t.owned)t.moisture=3;}))}>Влага 3/3</Btn><Btn small onClick={()=>update(n=>n.tiles.forEach(t=>{if(t.owned)t.moisture=0;}))}>Влага 0/3</Btn></div>
    <div class="btn-row"><Btn small onClick={()=>update(n=>n.tiles.forEach(t=>{if(t.owned)t.soil=1;}))}>Почва 1/5</Btn><Btn small onClick={()=>update(n=>n.tiles.forEach(t=>{if(t.owned)t.soil=5;}))}>Почва 5/5</Btn></div>
    <Btn onClick={()=>update(n=>n.tiles.forEach(t=>{if(t.crop){t.crop.rest=false;t.crop.grown=Math.max(0,G.targetGrow(n,t.crop)-1);t.moisture=3;t.crop.dry=0;}}),true)}>Посевы готовы к последней неделе роста</Btn>
    <label class="test-select">Воздух, °C<input aria-label="Температура теста" type="number" min={-30} max={45} value={temperature} onInput={e=>setTemperature(Number(e.currentTarget.value))}/></label>
    <Btn onClick={()=>update(n=>{n.temps[n.week-1]=Math.max(-30,Math.min(45,Number.isFinite(temperature)?temperature:20));},true)}>Применить температуру этой недели</Btn>
    <div class="test-date"><label class="test-select">Сезон<select aria-label="Сезон теста" value={season} onChange={e=>setSeason(Number(e.currentTarget.value))}>{D.SEASON_NAMES.map((name,i)=><option value={i}>{name}</option>)}</select></label><label class="test-select">Год<input aria-label="Год теста" type="number" min={1} max={20} value={year} onInput={e=>setYear(Number(e.currentTarget.value))}/></label></div>
    <Btn onClick={()=>update(n=>{testDate(n,season,Math.max(1,Math.min(20,Math.floor(year)||1)));n.days=8;},true)}>Перейти к началу сезона</Btn>
    <small class="muted">Переход очищает текущую погоду и угрозы. Для событий используйте готовые ситуации.</small>
    <Btn onClick={()=>update(n=>{for(const t of Object.keys(D.TRACKS) as D.TrackId[])if(G.trackAvailable(n,t))n.levels[t]=D.TRACKS[t].levels.length;n.levels.house=5;},true)}>Все улучшения — только в тесте</Btn>
    <Btn onClick={()=>update(n=>{n.levels.house=5;n.team=D.WORKER_IDS.map(id=>({id,level:3,away:0}));},true)}>Все работники-мастера — только в тесте</Btn>
    <Btn onClick={()=>update(n=>n.pets=Object.keys(D.PETS) as D.PetId[],true)}>Выдать всех питомцев</Btn>
   </div>}
   {panel==='animations'&&<div class="stack">
    <p class="small muted">Эти кнопки повторяют только сценку и реплику. Для проверки потерь, защиты и наград выберите соответствующую ситуацию и завершите неделю.</p>
    {([['dogThieves','Собака прогоняет воров'],['thieves','Воры убегают'],['watchman','Сторож прогоняет воров'],['drone','Вылет дрона'],['geese','Гуси пропалывают'],['queue','Очередь: собака → дрон']] as const).map(([id,name])=><Btn onClick={()=>update(n=>{testAnimation(n,id);},true)}>{name}</Btn>)}
    <Btn onClick={()=>setFast(v=>!v)}>{fast?'Включить обычную скорость':'Включить быструю посадку'}</Btn>
    <small class="muted">Если в системе включено уменьшение движения, сценки будут статичными. Последовательную посадку проверяйте картами.</small>
    <h4>Заказчики</h4>
    <label class="test-select">Персонаж<select aria-label="Персонаж заказчика" value={buyer} onChange={e=>{setBuyer(e.currentTarget.value as D.OrgId);setStory(0);}}>{D.ORG_IDS.map(o=><option value={o}>{BUYERS[o].name} · {D.ORGS[o].short}</option>)}</select></label>
    <label class="test-select">Просьба<select aria-label="Реплика заказа" value={story} onChange={e=>setStory(Number(e.currentTarget.value))}>{D.ORGS[buyer].steps.map((q,i)=><option value={i}>{q.title}</option>)}<option value={D.ORGS[buyer].steps.length}>Повторная поставка</option></select></label>
    <Btn onClick={()=>loadDialogue(buyer,story)}>Показать новый заказ и диалог</Btn>
    <small class="muted">Загрузится отдельный пример нужного региона. Нажмите на реплику над картами — откроется этот заказ.</small>
   </div>}
   <div class="test-footer"><Btn small onClick={reset}>Сбросить ситуацию</Btn><Btn small onClick={()=>setExportState(JSON.stringify({mode:'test',scenario:dialogueDemo?`dialogue:${dialogueDemo.org}:${dialogueDemo.step}`:preset,farm:ref.current},null,2))}>Состояние для отчёта</Btn><Btn small tone="ghost" onClick={onExit}>Выйти из проверки</Btn></div>
  </Sheet>}
  {exportState&&<Sheet title="Состояние тестовой фермы" onClose={()=>setExportState(null)}>
   <p class="small">Если нашли ошибку, приложите этот текст к описанию действий.</p>
   <textarea class="test-state" aria-label="Состояние тестовой фермы" readOnly value={exportState} ref={exportText}/>
   <Btn onClick={()=>{exportText.current?.focus();exportText.current?.select();}}>Выделить всё</Btn>
  </Sheet>}
 </>;
}
