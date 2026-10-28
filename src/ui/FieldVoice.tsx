import type {ComponentChildren} from 'preact';
import {useEffect,useRef,useState} from 'preact/hooks';
import {GameState,crowsOpen} from '../engine/game';
import {Portrait,PersonId} from '../art/portraits';
import type {SceneCue} from './useSceneQueue';
import type {OrgId} from '../engine/data';
import {readVoices,recordVoice,rememberOrder,heardOrder} from './voiceMemory';
import {pendingOrderVoices} from '../content/orderDialogue';
type Remark={key:string;who:PersonId;text:string;critical?:boolean;name?:string;org?:OrgId};
const sceneLines:Record<SceneCue['kind'],Omit<Remark,'key'>>={
 dogThieves:{who:'palych',text:'Гляньте, пёс ребят от грядок гонит! Урожай под защитой.',critical:true},
 watchman:{who:'marat',text:'Сторож гонит чужаков. Урожай под защитой.',critical:true},
 thieves:{who:'zina',text:'Ребята урожай тащат! Вам бы пса или сторожа — они грядки защитят.',critical:true},
 drone:{who:'vera',text:'Дрон отгоняет вредителей от грядок.'},
 geese:{who:'zina',text:'Гуси щиплют сорняки.'},
};
export function FieldVoice({s,active,onOpen,onOrder,cue=null,fallback,quiet=false,testReplay=false}:{s:GameState;active:boolean;onOpen:()=>void;onOrder?:(org:OrgId)=>void;cue?:SceneCue|null;fallback?:ComponentChildren;quiet?:boolean;testReplay?:boolean}){
 const[remark,setRemark]=useState<Remark|null>(null);
 const[revision,setRevision]=useState(0);
 const acknowledge=useRef<(()=>void)|undefined>();
 const report=JSON.stringify(s.lastReport);

 useEffect(()=>{
  setRemark(null);acknowledge.current=undefined;if(!active)return;
  const weekKey=`posevnaya.voice.${s.loc}.${s.seed}.${s.absWeek}${testReplay&&cue?`.replay.${cue.id}`:''}`;
  let seen=readVoices(weekKey);
  let next:Remark|undefined;
  if(cue){const base=sceneLines[cue.kind];
   // an earlier trouble got to the children's beds first (see collisions.ts)
   const causes=new Set((cue.misses??[]).map(m=>m.cause).filter(c=>c!=='gone'));
   const first=causes.size===1?{frost:'Мороз успел',dry:'Засуха успела',locust:'Саранча успела'}[[...causes][0] as 'frost'|'dry'|'locust']:causes.size?'Ненастья успели':'';
   const line=cue.visit?.outcome==='empty'?{...base,text:first?`${first} раньше детей — они ушли с пустыми руками.`:'Дети ушли с пустыми руками.'}:
    cue.kind==='thieves'&&first?{...base,text:`${first} раньше детей — но остальное они утащили.`}:cue.visit?.crows.length?{...base,text:'Дети разгоняют ворон — и сами лезут за урожаем.'}:base;next={...line,key:`${line.critical?'critical:':''}event:${cue.id}`};}
  else {
   const options:Remark[]=[];
   if(!quiet){
   if(crowsOpen(s))options.push({key:'crows',who:'zina',text:'Вороны уже на грядках. Надо прогнать.'});
   if(s.yard.length)options.push({key:'yard',who:'buyer',text:'Ящики во дворе так и стоят. Освободите место или продайте урожай.'});
   if(s.lastReport?.dried)options.push({key:'dry',who:'vera',text:'Часть посадок засохла. Остальным ещё можно помочь.'});
   if(s.lastReport?.done.length)options.push({key:'done',who:'marat',text:'В мастерской закончили работу — загляните.'});
   if(s.lastReport?.harvests.length)options.push({key:'harvest',who:'palych',text:'Урожай в амбаре. Можно приберечь для заказа.'});
   }
   next=options.find(x=>!seen.includes(x.key));
  }
  if(!next)return;
  // Keep one remark for the arriving customer; a harvest reminder must not use it.
  const orderWaiting=pendingOrderVoices(s).some(q=>!heardOrder(s,q.key));
  if(orderWaiting&&!next.critical)return;
  const limit=orderWaiting?1:next.critical||next.org||seen.some(k=>k.startsWith('critical:'))?2:1;
  if(!seen.includes(next.key)&&seen.length>=limit)return;
  setRemark(next);
  const selected=next;
  const markSeen=()=>{
   recordVoice(weekKey,selected.key);
  };
  acknowledge.current=markSeen;
  const commit=window.setTimeout(markSeen,600);
  const hide=cue?undefined:window.setTimeout(()=>{if(selected.org)rememberOrder(s,selected.key);setRemark(null);setRevision(v=>v+1);},6500);
  return()=>{acknowledge.current=undefined;clearTimeout(commit);clearTimeout(hide);};
 },[s.seed,s.loc,s.absWeek,report,!!s.crows,s.yard.length,active,cue?.id,quiet,testReplay,revision]);
 if(!remark)return <>{fallback}</>;
 return <button class={`field-voice${remark.org?' order-voice':''}`} type="button" onClick={()=>{acknowledge.current?.();if(remark.org){rememberOrder(s,remark.key);onOrder?.(remark.org);}else onOpen();}} aria-label={remark.org?`${remark.name}: ${remark.text} Открыть заказ`:`${remark.text} Открыть события недели`}>
  <Portrait id={remark.who} size={34}/><span>{remark.name&&<strong>{remark.name}</strong>}{remark.text}</span>
 </button>;
}
