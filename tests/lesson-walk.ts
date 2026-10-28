// The careful learner of the training farm (engine/tutorial.ts, version 4): the action they take at each step.
// Shared by the lesson's tests, the persistence tests and the screenshot tools.
import assert from 'node:assert/strict';
import * as G from '../src/engine/game';
import {applyTutorial,dryBeds,tutorialNext,type TutorialSession,type TutorialStep} from '../src/engine/tutorial';
import {validFarm} from '../src/ui/persist';
import {CARDS} from '../src/engine/data';

export const reload=(t:TutorialSession):TutorialSession=>{const n=JSON.parse(JSON.stringify(t));assert.equal(validFarm(n.farm),true,`stored tutorial farm at ${n.step}`);return n;};
export const cards=(s:G.GameState)=>[...s.hand,...s.draw,...s.discard,...s.spare,...s.projects.flatMap(p=>'card'in p?[p.card]:[])];
export const ORG=(t:TutorialSession)=>Object.keys(t.farm.orgs)[0] as keyof typeof t.farm.orgs;
export interface Way {waterCard?:boolean;shelterCard?:boolean;beanTiles?:[number,number][];bed?:[number,number];freeWater?:boolean;sellAll?:boolean}
// the action a careful player takes at each step; free time waters what is dry, then ends the week
export function lessonAction(t:TutorialSession,w:Way={}):G.Action|'next' {
 const s=t.farm;
 switch(t.step){
  case 'plant':return{t:'play',uid:s.hand.find(c=>c.def==='seed_radish')!.uid,tiles:[w.bed??[2,2]]};
  case 'rotate':return{t:'guide',lesson:'rotate'};
  case 'bean':return{t:'play',uid:s.hand.find(c=>c.def==='seed_bean')!.uid,tiles:w.beanTiles??[[3,2],[3,3]]};
  case 'night':return{t:'endWeek'};
  case 'sale':return{t:'sell',crop:'radish',qty:w.sellAll===false?1:G.stockOf(s,'radish')};
  case 'water':{
   const dry=dryBeds(s).filter(d=>t.thirsty!.some(([x,y])=>x===d[0]&&y===d[1]));
   const card=s.hand.find(c=>c.def==='water');
   return w.waterCard&&card?{t:'play',uid:card.uid,tiles:[dry[0]]}:{t:'waterHand',tiles:[dry[0]]};
  }
  case 'hail':{const [x,y]=s.strikes[0].cells[0];
   if(w.shelterCard){const c=s.hand.find(c=>c.def==='shelter')!;const at=([[x-1,y-1],[x,y-1],[x-1,y],[x,y]] as [number,number][]).find(([a,b])=>G.workEffectCells(s,'shelter',a,b).some(([p,q])=>p===x&&q===y))!;return{t:'play',uid:c.uid,tiles:[at]};}
   return{t:'guard',x,y};}
  case 'accept':return{t:'accept',org:ORG(t)};
  case 'deliver':return{t:'deliver',org:ORG(t)};
  case 'solo':{
   const g=t.solo!;
   if(!g.planted){
    for(const c of s.hand.filter(c=>CARDS[c.def].kind==='seed')){const p=G.placements(s,c)[0];if(p&&s.days>0)return{t:'play',uid:c.uid,tiles:p.tiles};}
   }
   if(!g.watered&&s.days>0){const i=s.tiles.findIndex(v=>v.owned&&!v.canal&&v.moisture<3);if(i>=0)return{t:'waterHand',tiles:[[i%6,Math.floor(i/6)]]};}
   if(g.sell&&!g.sold){const lot=s.storage[0];if(lot)return{t:'sell',crop:lot.crop,qty:lot.qty};}
   return{t:'endWeek'};
  }
  case 'weeds':return{t:'weed',x:t.weedAt![0],y:t.weedAt![1]};
  case 'visit':case 'village':case 'lens':case 'chapter':return 'next';
  case 'compost':return{t:'play',uid:t.compostUid!,tiles:[[1,2]]};
  case 'hire':return{t:'hire',id:'foreman'};
  case 'lab':{const c=G.deckList(s).find(c=>c.def==='seed_radish')!;return{t:'labCell',uid:c.uid,cell:G.upgradeSpots(s,c)[0]};}
  case 'upgrade':return{t:'track',track:'irrigation'};
  case 'place':return{t:'build',item:'drip',x:2,y:2};
  case 'practice':{
   if(!t.watered){const owned=s.tiles.findIndex(v=>v.owned&&!v.drip&&v.moisture<3);return{t:'waterHand',tiles:[[owned%6,Math.floor(owned/6)]]};}
   const o=s.orgs[ORG(t)]!;if(o.offer)return{t:'accept',org:ORG(t)};
   const need=o.active?.lines[0];if(need&&G.stockOf(s,need.crop)>=need.qty)return{t:'deliver',org:ORG(t)};
   const dry=dryBeds(s);return dry.length?{t:'waterHand',tiles:[dry[0]]}:{t:'endWeek'};}
  default:{
   const dry=dryBeds(s);
   if(w.freeWater!==false&&dry.length&&s.days>0)return{t:'waterHand',tiles:dry.slice(0,G.handWaterMax(s))};
   return{t:'endWeek'};}
 }
}
export function play(t:TutorialSession,until:TutorialStep,w:Way={},check?:(prev:TutorialSession,next:TutorialSession,a:G.Action|'next')=>void):TutorialSession {
 let n=t,guard=0;
 while(n.step!==until&&guard++<90){
  const a=lessonAction(n,w),before=JSON.stringify(n);
  const next=a==='next'?tutorialNext(n):applyTutorial(n,a);
  assert.equal(JSON.stringify(n),before,'transitions are immutable');
  check?.(n,next,a);n=reload(next);
 }
 assert.equal(n.step,until,`reached ${until}`);
 return n;
}
