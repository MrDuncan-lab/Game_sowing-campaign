// QA fixtures for the lesson (bean, water, hail and place steps): npx tsx tools/learning-fixtures.ts
import {writeFileSync} from 'node:fs';
import * as G from '../src/engine/game';
import {applyTutorial,createTutorial,dryBeds,tutorialNext,tutorialPlant,tutorialReserve,type TutorialSession} from '../src/engine/tutorial';
const ORG=(t:TutorialSession)=>Object.keys(t.farm.orgs)[0] as keyof typeof t.farm.orgs;
interface Way {waterCard?:boolean;shelterCard?:boolean;beanTiles?:[number,number][];radish?:number;bed?:[number,number];freeWater?:boolean}
// the action a careful player takes at each step; free time waters what is dry, then ends the week
function lessonAction(t:TutorialSession,w:Way={}):G.Action|'next' {
 const s=t.farm;
 switch(t.step){
  case 'plant':{const r=s.hand.filter(c=>c.def==='seed_radish')[w.radish??0]!;return{t:'play',uid:r.uid,tiles:[w.bed??[2,2]]};}
  case 'rotate':return{t:'guide',lesson:'rotate'};
  case 'bean':return{t:'play',uid:s.hand.find(c=>c.def==='seed_bean')!.uid,tiles:w.beanTiles??[[3,2],[3,3]]};
  case 'night':return{t:'endWeek'};
  case 'water':return w.waterCard?{t:'play',uid:s.hand.find(c=>c.def==='water')!.uid,tiles:[tutorialPlant(t)]}:{t:'waterHand',tiles:[tutorialPlant(t)]};
  case 'hail':{const [x,y]=s.strikes[0].cells[0];
   if(w.shelterCard){const c=s.hand.find(c=>c.def==='shelter')!;const at=([[x-1,y-1],[x,y-1],[x-1,y],[x,y]] as [number,number][]).find(([a,b])=>G.workEffectCells(s,'shelter',a,b).some(([p,q])=>p===x&&q===y))!;return{t:'play',uid:c.uid,tiles:[at]};}
   return{t:'guard',x,y};}
  case 'sale':return{t:'sell',crop:'radish',qty:G.stockOf(s,'radish')};
  case 'accept':return{t:'accept',org:ORG(t)};
  case 'deliver':return{t:'deliver',org:ORG(t)};
  case 'weeds':return{t:'weed',x:t.weedAt![0],y:t.weedAt![1]};
  case 'visit':case 'lens':case 'chapter':return 'next';
  case 'compost':return{t:'play',uid:t.heldUid,tiles:[[1,2]]};
  case 'hire':return{t:'hire',id:'foreman'};
  case 'lab':{const c=G.deckList(s).find(c=>c.uid===t.labUid)??G.deckList(s).find(c=>c.def==='seed_radish')!;return{t:'labCell',uid:c.uid,cell:G.upgradeSpots(s,c)[0]};}
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
const keep:Record<string,TutorialSession>={};
let t=createTutorial(),guard=0;
while(t.step!=='practice'&&guard++<120){
 if(['bean','water','hail','place'].includes(t.step)&&!keep[t.step])keep[t.step]=JSON.parse(JSON.stringify(t));
 const a=lessonAction(t,{waterCard:true,shelterCard:true});
 t=a==='next'?tutorialNext(t):applyTutorial(t,a);
}
writeFileSync(new URL('../../qa/tutorial-fixtures.json',import.meta.url),JSON.stringify(keep));
