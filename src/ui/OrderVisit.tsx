import {useEffect,useState,useRef} from 'preact/hooks';
import {createPortal} from 'preact/compat';
import {Portrait,PORTRAIT_IMAGES} from '../art/portraits';
import {BUYERS,orderDialogue,pendingOrderVoices} from '../content/orderDialogue';
import {ORGS,OrgId} from '../engine/data';
import type {GameState,Quest} from '../engine/game';
import {Sheet,Btn,CropChip} from './common';
import {heardOrder,rememberOrder,readVoices,recordVoice,weekVoiceKey} from './voiceMemory';

// One visual-novel visit per week shares the two-remark budget with field events.
// lesson: the training farm's guests always come for their order, whatever was heard before; onDone tells the lesson they left
export function OrderVisit({s,canStart,onVisible,onOrder,lesson=false,onDone}:{s:GameState;canStart:boolean;onVisible:(v:boolean)=>void;onOrder:(o:OrgId)=>void;lesson?:boolean;onDone?:()=>void}){
 const touchedWeek=useRef('');
 const currentWeek=useRef(weekVoiceKey(s));currentWeek.current=weekVoiceKey(s);
 useEffect(()=>{const touch=()=>{touchedWeek.current=currentWeek.current;};document.addEventListener('pointerdown',touch,true);document.addEventListener('keydown',touch,true);return()=>{document.removeEventListener('pointerdown',touch,true);document.removeEventListener('keydown',touch,true);};},[]);
 const [quest,setQuest]=useState<Quest|null>(null);
 const [childAllowed,setChildAllowed]=useState(false);
 const signature=pendingOrderVoices(s).map(q=>q.key).join('|');
 useEffect(()=>{
  if(!canStart||quest||s.phase!=='week'||(!lesson&&document.hidden))return;
  if(lesson){
   const q=pendingOrderVoices(s).map(v=>s.orgs[v.org]?.offer).find(Boolean);if(!q)return;
   // wait for any open window to close, then come; checked again and again, not once
   const timer=window.setInterval(()=>{if(document.hidden||document.querySelector('[role="dialog"]'))return;clearInterval(timer);setChildAllowed(orderDialogue(q).length>1);setQuest(q);onVisible(true);},700);
   return()=>clearInterval(timer);
  }
  const key=weekVoiceKey(s),seen=readVoices(key);
  if(touchedWeek.current===key)return;
  if(seen.length>=2||seen.some(x=>x.startsWith('order:')))return;
  const next=pendingOrderVoices(s).find(q=>!heardOrder(s,q.key));
  const q=next&&s.orgs[next.org]?.offer;if(!q||!next)return;
  // Allow active sheets, animations and the player's current gesture to finish.
  const timer=window.setTimeout(()=>{
   if(touchedWeek.current===key||document.hidden||document.querySelector('[role="dialog"]'))return;
   const current=readVoices(key);if(current.length>=2||current.some(x=>x.startsWith('order:')))return;
   const child=orderDialogue(q).length>1&&current.length===0;
   rememberOrder(s,next.key);recordVoice(key,next.key);if(child)recordVoice(key,`child:${next.key}`);
   setChildAllowed(child);setQuest(q);onVisible(true);
  },0);
  return()=>clearTimeout(timer);
 },[canStart,signature,s.seed,s.loc,s.absWeek,s.phase,quest,lesson]);
 useEffect(()=>()=>onVisible(false),[]);
 function close(open=false){const org=quest?.org;setQuest(null);onVisible(false);if(open&&org)onOrder(org);onDone?.();}
 if(!quest)return null;
 const buyer=BUYERS[quest.org],lines=orderDialogue(quest),children=quest.org==='orphanage';
 return createPortal(<Sheet variant="visit" title={buyer.name} onClose={()=>close()}>
  <div class={`order-meeting${children?' with-children':''}`}>
   <div class="meeting-stage" aria-hidden="true">
    {PORTRAIT_IMAGES[buyer.person]?<img class="meeting-person" src={PORTRAIT_IMAGES[buyer.person]} alt=""/>:<span class="meeting-person vector"><Portrait id={buyer.person} size={170} ring={false}/></span>}
    {children&&<><img class="meeting-child katya" src={PORTRAIT_IMAGES.katya} alt=""/><img class="meeting-child misha" src={PORTRAIT_IMAGES.misha} alt=""/></>}
   </div>
   <section class="meeting-speech">
    <small class="meeting-org">{ORGS[quest.org].name}</small>
    <div class="meeting-lines"><p>{lines[0].text}</p>
     {childAllowed&&lines[1]&&<p class="meeting-child-line"><b>{lines[1].name}:</b> {lines[1].text}</p>}
    </div>
    <div class="meeting-request" aria-label="Нужно для заказа">{quest.lines.map(l=><CropChip key={l.crop} c={l.crop} qty={l.qty}/>)}</div>
    <div class="meeting-actions"><Btn tone="ghost" onClick={()=>close()}>Позже</Btn><Btn tone="primary" onClick={()=>close(true)}>Посмотреть заказ</Btn></div>
   </section>
  </div>
 </Sheet>,document.body);
}
