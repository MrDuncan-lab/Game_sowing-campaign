import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine/game';
import {applyTutorial,createTutorial,dryBeds,normalizeTutorial,practiceNeed,readTutorialChapter,restartTutorialStep,tutorialNext,tutorialPlant,tutorialProblem,tutorialReserve,FREE_STEPS,TUTORIAL_SEED,type TutorialSession,type TutorialStep} from '../src/engine/tutorial';
import {validFarm} from '../src/ui/persist';
import {CARDS} from '../src/engine/data';

const reload=(t:TutorialSession):TutorialSession=>{const n=JSON.parse(JSON.stringify(t));assert.equal(validFarm(n.farm),true,`stored tutorial farm at ${n.step}`);return n;};
const cards=(s:G.GameState)=>[...s.hand,...s.draw,...s.discard,...s.spare,...s.projects.flatMap(p=>'card'in p?[p.card]:[])];
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
function play(t:TutorialSession,until:TutorialStep,w:Way={},check?:(prev:TutorialSession,next:TutorialSession,a:G.Action|'next')=>void):TutorialSession {
 let n=t,guard=0;
 while(n.step!==until&&guard++<80){
  const a=lessonAction(n,w),before=JSON.stringify(n);
  const next=a==='next'?tutorialNext(n):applyTutorial(n,a);
  assert.equal(JSON.stringify(n),before,'transitions are immutable');
  check?.(n,next,a);n=reload(next);
 }
 assert.equal(n.step,until,`reached ${until}`);
 return n;
}

test('both chapters complete in seven calm weeks through real actions, reloading after every one',()=>{
 for(const waterCard of [true,false])for(const shelterCard of [true,false]){
  let money=0;
  const t=play(createTutorial(),'done',{waterCard,shelterCard},(p,n,a)=>{
   if(p.step==='hire')money=n.farm.money;
   // a lesson week never stacks more than two new lessons before free time
   if(a!=='next'&&a.t==='endWeek')assert.ok(FREE_STEPS.includes(p.step)||['night','practice'].includes(p.step),`the week ends from free time, not mid-lesson (${p.step})`);
  });
  assert.equal(t.farm.absWeek,7,'the lesson takes seven weeks');
  assert.ok(t.farm.money<money,'real salaries paid');
  assert.equal(G.lvl(t.farm,'irrigation'),2);assert.equal(t.farm.tiles.some(v=>v.drip),true);
  assert.equal(cards(t.farm).filter(c=>c.uid===t.labUid).length,1);
  assert.equal(cards(t.farm).find(c=>c.uid===t.labUid)!.extra!.length,1);
  assert.equal(t.farm.team.some(w=>w.id==='foreman'),true);
 }
});

test('lesson projects take one week, so nobody is taught to skip weeks',()=>{
 let t=play(createTutorial(),'lab');
 const week=t.farm.absWeek;
 t=play(t,'play5');
 assert.deepEqual(t.farm.projects.map(p=>[p.kind,p.weeks]),[['cell',1]]);
 t=play(t,'upgrade');assert.equal(t.farm.absWeek,week+1);assert.equal(t.farm.projects.length,0);
 t=play(t,'play6');assert.deepEqual(t.farm.projects.map(p=>[p.kind,p.weeks]),[['track',1]]);
 t=play(t,'place');assert.equal(t.farm.absWeek,week+2);assert.equal(G.lvl(t.farm,'irrigation'),2);
});

test('free time allows ordinary farming but guards what later lessons need',()=>{
 let t=play(createTutorial(),'play2');
 const saved=JSON.stringify(t);
 // things a later lesson explains are refused, atomically and kindly
 for(const a of [{t:'buyCard',def:'water'},{t:'track',track:'irrigation'},{t:'hire',id:'foreman'}] as G.Action[]){
  assert.throws(()=>applyTutorial(t,a),/позже/);assert.equal(JSON.stringify(t),saved);
 }
 assert.throws(()=>applyTutorial(t,{t:'play',uid:t.heldUid,tiles:[[1,2]]}),/Компост/);
 assert.throws(()=>applyTutorial(t,{t:'exchangeCard',uid:t.heldUid}),/Компост/);
 assert.equal(JSON.stringify(t),saved);
 // ordinary farming works: plant another seed, water, then end the week
 const seed=t.farm.hand.find(c=>CARDS[c.def].kind==='seed')!;
 const spot=G.placements(t.farm,seed)[0];
 t=applyTutorial(t,{t:'play',uid:seed.uid,tiles:spot.tiles});assert.equal(t.step,'play2');
 t=applyTutorial(t,{t:'endWeek'});assert.equal(t.step,'visit','the harvest week opens with the guests');
 assert.equal(cards(t.farm).filter(c=>c.uid===t.heldUid).length,1,'the compost card is still there');
 assert.equal(t.farm.orgs.orphanage!.offer?.title,'Первый редис','the teacher brings the first order');
 // nothing else while the guests are at the gate, and no selling before the order is delivered
 assert.throws(()=>applyTutorial(t,{t:'endWeek'}),/гости/);
 t=play(t,'accept');assert.ok(G.stockOf(t.farm,'radish')>tutorialReserve(t));
 assert.throws(()=>applyTutorial(t,{t:'sell',crop:'radish',qty:1}),/Палыч|заказ/);
});

test('lessons reject other actions atomically with a recovery checkpoint',()=>{
 let t=play(createTutorial(),'water');const saved=JSON.stringify(t);
 assert.throws(()=>applyTutorial(t,{t:'endWeek'}),/Полейте редис/);
 assert.throws(()=>applyTutorial(t,{t:'waterHand',tiles:[[1,1]]}),/редис/);
 assert.throws(()=>applyTutorial(play(t,'accept'),{t:'endWeek'}),/Палыч/);
 assert.equal(JSON.stringify(t),saved);
 const changed=applyTutorial(t,{t:'waterHand',tiles:[tutorialPlant(t)]});
 assert.equal(changed.step,'hail');assert.deepEqual(restartTutorialStep(reload(changed)).step,'hail');
 t=play(t,'sale');const before=JSON.stringify(t);
 assert.throws(()=>applyTutorial(t,{t:'endWeek'}),/редис/);assert.equal(JSON.stringify(t),before);
 assert.ok(G.stockOf(t.farm,'radish')>0,'something is left to sell after the order');
});

test('either identical radish starts the lesson on every legal bed, and every harvest supports sale and order',()=>{
 const t=createTutorial();
 assert.equal(t.step,'plant');assert.equal(t.farm.seed,TUTORIAL_SEED);
 assert.equal(G.tile(t.farm,1,2).soil,1);assert.equal(t.farm.tiles.some(v=>v.weeds),false,'weeds come later');
 const radishes=t.farm.hand.filter(c=>c.def==='seed_radish');assert.equal(radishes.length,2);
 for(const [ri,seed] of radishes.entries())for(const p of G.placements(t.farm,seed)){
  let n=applyTutorial(createTutorial(),{t:'play',uid:seed.uid,tiles:p.tiles});
  assert.equal(n.step,'rotate');assert.deepEqual(tutorialPlant(n),p.tiles[0]);
  assert.notEqual(n.labUid,seed.uid);
  const bean=n.farm.hand.find(c=>c.def==='seed_bean')!;
  n=applyTutorial(n,{t:'guide',lesson:'rotate'});
  n=play(n,'accept',{radish:ri,bed:p.tiles[0],beanTiles:G.placements(n.farm,bean)[0].tiles});
  const reserve=tutorialReserve(n),stock=G.stockOf(n.farm,'radish');
  assert.ok(stock>reserve&&reserve>0,`every first harvest supports both sale and delivery (${p.tiles[0]})`);
 }
 const restored=restartTutorialStep(reload(t));assert.equal(restored.step,'plant');
});

test('every legal bean placement still brings a deliverable practice order',()=>{
 let initial=applyTutorial(createTutorial(),{t:'play',uid:createTutorial().farm.hand.find(c=>c.def==='seed_radish')!.uid,tiles:[[2,2]]});
 initial=applyTutorial(initial,{t:'guide',lesson:'rotate'});
 const bean=initial.farm.hand.find(c=>c.def==='seed_bean')!;
 const possible=G.placements(initial.farm,bean);assert.ok(possible.length>3);
 for(const p of possible){
  const t=play(initial,'practice',{beanTiles:p.tiles});
  const line=t.farm.orgs[ORG(t)]!.offer!.lines[0];
  assert.ok(G.stockOf(t.farm,line.crop)>=line.qty,`practice order is deliverable (${JSON.stringify(p.tiles)})`);
  assert.equal(Object.values(t.farm.orgs).filter(o=>o.offer||o.active).length,1,'no ordinary offers in the lesson');
 }
});

test('weeds and the hail come one at a time, on beds the player actually has',()=>{
 let t=play(createTutorial(),'water');
 assert.equal(t.farm.strikes.length,0,'no threat while the player learns to water');
 t=play(t,'hail');assert.equal(t.farm.strikes[0].kind,'hail');
 const [x,y]=t.farm.strikes[0].cells[0];assert.equal(G.tile(t.farm,x,y).crop?.id,'bean');
 t=play(t,'sale');assert.equal(G.tile(t.farm,x,y).crop?.mult??1,1,'the covered bean came through');
 t=play(t,'weeds');assert.ok(t.weedAt);assert.equal(G.tile(t.farm,...t.weedAt!).weeds,true);
 assert.throws(()=>applyTutorial(t,{t:'endWeek'}),/Прополите/);
});

test('hidden hints survive normalization until the next step, and a bean turned early still counts',()=>{
 const hidden={...createTutorial(),hiddenHintStep:'plant' as const};assert.equal(normalizeTutorial(reload(hidden)).hiddenHintStep,'plant');
 let t=applyTutorial(hidden,{t:'guide',lesson:'rotate'});assert.equal(t.step,'plant');
 t=applyTutorial(t,{t:'play',uid:t.farm.hand.find(c=>c.def==='seed_radish')!.uid,tiles:[[2,2]]});assert.equal(t.hiddenHintStep,undefined);assert.equal(t.step,'rotate');
 t=applyTutorial(t,{t:'guide',lesson:'rotate'});assert.equal(t.step,'bean');
});

function practice(){return play(createTutorial(),'practice');}
test('final card watering counts actual water and expired offers recover without ordinary quests',()=>{
 let t=practice();const initial=t.farm.orgs[ORG(t)]!.offer!.id;
 const card=t.farm.hand.find(c=>c.def==='water');
 t=applyTutorial(t,card?{t:'play',uid:card.uid,tiles:[[2,2]]}:{t:'waterHand',tiles:[[2,2]]});assert.equal(t.watered,true);
 for(let i=0;i<6;i++)t=applyTutorial(t,{t:'endWeek'});
 const offer=t.farm.orgs[ORG(t)]!.offer!;assert.ok(offer);assert.notEqual(offer.id,initial);assert.equal(offer.title,'К столу соседей');assert.ok(offer.deadline!>t.farm.absWeek);assert.match(t.orderNotice!,/Срок/);
 assert.equal(Object.values(t.farm.orgs).filter(o=>o.offer||o.active).length,1);
 t.farm.storage=[{crop:offer.lines[0].crop,qty:2,age:0}];t=applyTutorial(t,{t:'accept',org:ORG(t)});t=applyTutorial(t,{t:'deliver',org:ORG(t)});assert.equal(t.step,'done');
});
test('accepted expiry and legacy stuck saves regain an achievable lesson order',()=>{
 let t=practice();t=applyTutorial(t,{t:'accept',org:ORG(t)});for(let i=0;i<6;i++)t=applyTutorial(t,{t:'endWeek'});
 assert.ok(t.farm.orgs[ORG(t)]!.offer);assert.equal(t.farm.orgs[ORG(t)]!.active,null);assert.match(t.orderNotice!,/Срок/);
 const broken=practice();broken.farm.orgs[ORG(broken)]!.offer=null;broken.farm.orgs[ORG(broken)]!.wait=999;
 const fixed=normalizeTutorial(reload(broken));assert.ok(fixed.farm.orgs[ORG(fixed)]!.offer);assert.equal(fixed.step,'practice');assert.equal(fixed.farm.money,broken.farm.money);
});
test('lesson debt supports each displayed financial action and checkpoint recovery',()=>{
 const base=practice();base.farm.phase='shortfall';base.farm.due={amount:62,name:'Поставщики',seasonEnd:false};base.farm.money=49.35;
 for(const action of ['emergency','restructure','giveUp'] as const){
  assert.equal(tutorialProblem(base,{t:action}),null);
  const n=applyTutorial(base,{t:action});assert.equal(n.farm.phase,action==='giveUp'?'gameover':'week');
  const recovered=restartTutorialStep(reload(n));assert.equal(recovered.farm.phase,'week');assert.equal(recovered.step,'practice');assert.ok(recovered.farm.orgs[ORG(recovered)]!.offer);
 }
 const funded={...base,farm:{...base.farm,money:62}};assert.equal(applyTutorial(funded,{t:'pay'}).farm.phase,'week');
});

test('shelter protects ordinary hail through its last week but not floods or locusts',()=>{
 const s=play(createTutorial(),'hail').farm;const st=s.strikes[0];const [x,y]=st.cells[0];
 assert.deepEqual(G.strikeVictims(s,st),[[x,y]]);
 for(const weeks of [1,2,3]){G.tile(s,x,y).shelter=weeks;assert.deepEqual(G.strikeVictims(s,st),[]);}
 assert.deepEqual(G.strikeVictims(s,{...st,kind:'flood'}),[[x,y]]);assert.deepEqual(G.strikeVictims(s,{...st,kind:'locust'}),[[x,y]]);
 G.tile(s,x,y).shelter=1;for(const v of s.tiles)if(v.crop)v.moisture=3;
 const n=G.endWeek(s);assert.equal(G.tile(n,x,y).crop?.mult,1);assert.equal(G.tile(n,x,y).shelter,0);
 assert.deepEqual(G.strikeVictims(n,{...st,week:n.absWeek}),[[x,y]]);
});

test('selling every radish and skipping optional care still gives a concrete recoverable practice crop',()=>{
 let t=play(createTutorial(),'practice',{freeWater:false});
 assert.equal(t.farm.storage.length,0);assert.equal(t.farm.tiles.some(v=>v.crop),false);
 let need=practiceNeed(t)!;
 assert.ok(need.seed,'practice asks for seed already in this hand');
 const initialWeek=t.farm.absWeek;
 t=applyTutorial(t,{t:'accept',org:ORG(t)});
 for(let i=0;i<35&&t.step!=='done';i++){
  need=practiceNeed(t)!;
  if(need.have>=need.qty)t=applyTutorial(t,{t:'deliver',org:ORG(t)});
  else if(need.seed&&!need.plants.length){
   const p=G.placements(t.farm,need.seed)[0];assert.ok(p);
   t=applyTutorial(t,{t:'play',uid:need.seed.uid,tiles:p.tiles});
  }else{
   const dry=need.plants.find(v=>v.dry);
   t=applyTutorial(t,dry&&t.farm.days>0?{t:'waterHand',tiles:[dry.at]}:{t:'endWeek'});
  }
  t=normalizeTutorial(reload(t));
 }
 assert.equal(t.step,'done');assert.ok(t.farm.absWeek-initialWeek<=5);
});

test('legacy empty practice directs a paid exchange to an existing needed seed without duplicating cards',()=>{
 let t=play(createTutorial(),'practice',{freeWater:false});
 const order=t.farm.orgs[ORG(t)]!.offer!;order.lines=[{crop:'bean',qty:2}];
 // a seven-card hand may already hold the bean: this case is about a hand without it
 for(const c of t.farm.hand.filter(c=>CARDS[c.def].crop==='bean')){t.farm.hand.splice(t.farm.hand.indexOf(c),1);t.farm.discard.push(c);}
 const ids=cards(t.farm).map(c=>c.uid).sort((a,b)=>a-b),money=t.farm.money,days=t.farm.days;
 const normalized=normalizeTutorial(t);
 assert.deepEqual(cards(normalized.farm).map(c=>c.uid).sort((a,b)=>a-b),ids);
 assert.equal(normalized.farm.draw.at(-1)!.def,'seed_bean');
 assert.equal(JSON.stringify(normalizeTutorial(reload(normalized))),JSON.stringify(normalized),'repeated load is stable');
 const out=normalized.farm.hand.find(c=>CARDS[c.def].kind!=='seed')!;
 const exchanged=applyTutorial(normalized,{t:'exchangeCard',uid:out.uid});
 assert.equal(practiceNeed(exchanged)!.seed!.def,'seed_bean');
 assert.equal(exchanged.farm.money,money);assert.equal(exchanged.farm.days,days-1);
 assert.deepEqual(cards(exchanged.farm).map(c=>c.uid).sort((a,b)=>a-b),ids);
});

test('chapter acknowledgement survives reload and checkpoint recovery',()=>{
 const before=play(createTutorial(),'chapter'),read=readTutorialChapter(before);
 assert.equal(before.chapterRead,undefined);
 assert.equal(normalizeTutorial(reload(read)).chapterRead,true);
 assert.equal(restartTutorialStep(reload(read)).chapterRead,true);
 assert.equal(tutorialNext(read).step,'hire');
});

test('tutorial construction history agrees with its real one-week project',()=>{
 const t=play(createTutorial(),'play6');
 assert.equal(t.farm.projects.find(p=>p.kind==='track')?.weeks,1);
 assert.match(t.farm.feed.at(-1)!.text,/Капельный полив, 1 неделя/);
});

test('completed tutorial describes review mode instead of a hidden pause',()=>{
 const t=play(createTutorial(),'done'),before=JSON.stringify(t);
 assert.match(tutorialProblem(t,{t:'endWeek'})!,/Обучение завершено.*осмотреть.*карте/);
 assert.throws(()=>applyTutorial(t,{t:'endWeek'}),/Обучение завершено/);
 assert.equal(JSON.stringify(t),before);
});
