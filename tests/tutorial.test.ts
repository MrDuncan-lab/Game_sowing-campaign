import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine/game';
import {readFileSync} from 'node:fs';
import {applyTutorial,areaOpen,createTutorial,lessonReserve,ownFarmDifferences,dryBeds,normalizeTutorial,practiceNeed,restartTutorialStep,saleProgress,tutorialAccepted,tutorialNext,tutorialPlant,tutorialProblem,tutorialReserve,wateringProgress,AREA_IDS,AREA_OPENS,FREE_STEPS,HAND_BY_WEEK,PALYCH_BEDS,TUTORIAL_SEED,TUTORIAL_STEPS,TUTORIAL_WEEK,type TutorialSession,type TutorialStep} from '../src/engine/tutorial';
import {cards,play,reload,ORG} from './lesson-walk';
import {validFarm} from '../src/ui/persist';
import {CARDS} from '../src/engine/data';

const ordinary=(s:G.GameState)=>s.hand.filter(c=>!c.temp).length;

test('both chapters complete through real actions, reloading after every one',()=>{
 for(const waterCard of [true,false])for(const shelterCard of [true,false]){
  let money=0;
  const t=play(createTutorial(),'done',{waterCard,shelterCard},(p,n,a)=>{
   if(p.step==='hire')money=n.farm.money;
   // a lesson week never stacks its lessons into the night: the week ends from free time
   if(a!=='next'&&a.t==='endWeek')assert.ok(FREE_STEPS.includes(p.step)||['night','solo','practice'].includes(p.step),`the week ends from free time, not mid-lesson (${p.step})`);
  });
  assert.ok(t.farm.money<money,'real salaries paid');
  assert.equal(G.lvl(t.farm,'irrigation'),2);assert.equal(t.farm.tiles.some(v=>v.drip),true);
  assert.equal(cards(t.farm).find(c=>c.uid===t.labUid)!.extra!.length,1);
  assert.equal(t.farm.team.some(w=>w.id==='foreman'),true);
 }
});

test('chapter I takes four weeks and the first harvest comes with the first morning',()=>{
 let t=createTutorial();
 assert.equal(t.farm.absWeek,1);
 for(const [x,y] of PALYCH_BEDS)assert.equal(G.tile(t.farm,x,y).crop?.id,'radish','Палыч\'s radish is on the field');
 assert.equal(G.stockOf(t.farm,'radish'),0);
 t=play(t,'night');
 const actions=3;// radish, rotate, bean
 t=applyTutorial(t,{t:'endWeek'});
 assert.equal(t.step,'sale');assert.ok(G.stockOf(t.farm,'radish')>=8,'both beds of Палыч\'s radish are in the barn');
 for(const [x,y] of PALYCH_BEDS)assert.equal(G.tile(t.farm,x,y).crop,null);
 assert.ok(actions<=3);
 const before=t.farm.money;
 t=play(t,'water');assert.ok(t.farm.money>before,'the first money comes in the second week');
 t=play(t,'chapter');assert.equal(t.farm.absWeek,5,'the certificate greets the morning of week 5');
 assert.ok(G.stockOf(t.farm,'bean')+t.farm.stats.harvested>0);
});

test('the hand grows week by week and holds what each lesson needs',()=>{
 let t=createTutorial();
 assert.deepEqual(t.farm.hand.map(c=>c.def),['seed_radish','seed_bean','water']);
 const deck=G.deckCount(t.farm);
 t=play(t,'sale');assert.equal(ordinary(t.farm),HAND_BY_WEEK[2]);assert.ok(t.farm.hand.some(c=>c.def==='water'));
 t=play(t,'village');assert.equal(ordinary(t.farm),HAND_BY_WEEK[3]);
 t=play(t,'hail');assert.ok(t.farm.hand.some(c=>c.def==='shelter'),'the hail lesson has its cover in hand');
 t=play(t,'solo');assert.equal(ordinary(t.farm),G.handMax(t.farm),'the full hand from week 4');
 assert.equal(G.deckCount(t.farm),deck,'the lesson never adds cards to the deck');
 // no compost in chapter I; Палыч brings a one-off bag with chapter II
 for(const s of [createTutorial(),play(createTutorial(),'solo')])assert.equal(cards(s.farm).some(c=>c.def==='compost'),false);
 t=tutorialNext(play(t,'chapter'));
 assert.equal(t.step,'weeds');const bag=t.farm.hand.find(c=>c.uid===t.compostUid);
 assert.equal(bag?.def,'compost');assert.equal(bag?.temp,true);assert.equal(G.deckCount(t.farm),deck);
 assert.equal(restartTutorialStep(reload(t)).farm.hand.some(c=>c.uid===t.compostUid),true);
});

test('closed parts open exactly at their lesson and refuse their actions until then',()=>{
 const seen:Record<string,boolean>={};
 play(createTutorial(),'done',{},(p)=>{
  for(const area of AREA_IDS){
   const open=areaOpen(p.step,area);
   assert.equal(open,TUTORIAL_STEPS.indexOf(p.step)>=TUTORIAL_STEPS.indexOf(AREA_OPENS[area]));
   seen[`${area}:${open}`]=true;
  }
 });
 for(const area of AREA_IDS)assert.ok(seen[`${area}:false`]&&seen[`${area}:true`],`${area} is closed first and open later`);
 const t=play(createTutorial(),'play2'),saved=JSON.stringify(t);
 assert.match(tutorialProblem(t,{t:'exchangeCard',uid:t.farm.hand[0].uid})!,/Обмен карт откроется/);
 assert.match(tutorialProblem(t,{t:'buyCard',def:'water'})!,/Лавка/);
 assert.match(tutorialProblem(t,{t:'borrow',amount:10})!,/Касса/);
 assert.match(tutorialProblem(t,{t:'hire',id:'foreman'})!,/Дом/);
 assert.match(tutorialProblem(t,{t:'labCell',uid:t.farm.hand[0].uid,cell:[0,0]})!,/Лаборатория/);
 assert.throws(()=>applyTutorial(t,{t:'track',track:'irrigation'}),/Дом/);assert.equal(JSON.stringify(t),saved);
 const solo=play(createTutorial(),'solo');
 assert.equal(tutorialProblem(solo,{t:'exchangeCard',uid:solo.farm.hand[0].uid}),null,'the exchange opens with the full hand');
});

test('every legal radish bed and bean placement brings a sale, a deliverable order and the certificate',()=>{
 const start=createTutorial();
 const seed=start.farm.hand.find(c=>c.def==='seed_radish')!;
 for(const p of G.placements(start.farm,seed)){
  let n=applyTutorial(createTutorial(),{t:'play',uid:seed.uid,tiles:p.tiles});
  assert.equal(n.step,'rotate');assert.deepEqual(tutorialPlant(n),p.tiles[0]);
  n=applyTutorial(n,{t:'guide',lesson:'rotate'});
  const bean=n.farm.hand.find(c=>c.def==='seed_bean')!;
  for(const b of G.placements(n.farm,bean)){
   let m=play(n,'deliver',{bed:p.tiles[0],beanTiles:b.tiles});
   const reserve=tutorialReserve(m),stock=G.stockOf(m.farm,'radish');
   assert.ok(stock>=reserve&&reserve>0,`the first order can be delivered (${p.tiles[0]} · ${JSON.stringify(b.tiles)})`);
   m=play(m,'chapter',{bed:p.tiles[0],beanTiles:b.tiles});
   assert.equal(m.farm.phase,'week');
  }
 }
});

test('the watering lesson counts the dry sprouts and waits for all of them',()=>{
 let t=play(createTutorial(),'water');
 const prog=wateringProgress(t);assert.equal(prog.done,0);assert.equal(prog.of,3,'the radish and both cells of the bean');
 // the can, one bed at a time: the counter moves, the lesson waits
 t=applyTutorial(t,{t:'waterHand',tiles:[t.thirsty![0]]});
 assert.equal(t.step,'water');assert.equal(wateringProgress(t).done,1);
 assert.throws(()=>applyTutorial(t,{t:'endWeek'}),/Полейте ростки/);
 const wet=t.farm.tiles.findIndex((v,i)=>v.owned&&!v.crop&&!t.thirsty!.some(([x,y])=>x===i%6&&y===Math.floor(i/6))&&![[1,1],[2,1]].some(([x,y])=>x===i%6&&y===Math.floor(i/6)));
 assert.throws(()=>applyTutorial(t,{t:'waterHand',tiles:[[wet%6,Math.floor(wet/6)]]}),/Полейте ростки/);
 t=play(t,'play2');assert.equal(wateringProgress(t).done,3);assert.equal(dryBeds(t.farm).length,0);
});

test('the hail comes once, after the order, over the beans the player has; the covered beans are harvested',()=>{
 let t=play(createTutorial(),'deliver');
 assert.equal(t.farm.strikes.length,0,'no threat while the player learns the order');
 t=play(t,'hail');assert.equal(t.farm.strikes[0].kind,'hail');
 const [x,y]=t.farm.strikes[0].cells[0];assert.equal(G.tile(t.farm,x,y).crop?.id,'bean');
 t=play(t,'solo');
 assert.ok(G.stockOf(t.farm,'bean')>0,'the covered beans came through to the harvest');
 assert.equal(t.solo!.sell,true);
});

test('the week on one\'s own: goals are counted from real actions; an unpaid rent keeps the week until it is settled',()=>{
 let t=play(createTutorial(),'solo');
 assert.deepEqual({...t.solo},{planted:false,watered:false,sold:false,sell:true,weeks:1});
 const seed=t.farm.hand.find(c=>CARDS[c.def].kind==='seed'&&G.placements(t.farm,c).length)!;
 t=applyTutorial(t,{t:'play',uid:seed.uid,tiles:G.placements(t.farm,seed)[0].tiles});assert.equal(t.solo!.planted,true);
 const lot=t.farm.storage[0];t=applyTutorial(t,{t:'sell',crop:lot.crop,qty:lot.qty});assert.equal(t.solo!.sold,true);
 const bare=t.farm.tiles.findIndex(v=>v.owned&&!v.crop&&v.moisture<3);
 if(bare>=0){t=applyTutorial(t,{t:'waterHand',tiles:[[bare%6,Math.floor(bare/6)]]});assert.equal(t.solo!.watered,false,'bare soil is not a planting');}
 const dry=t.farm.tiles.findIndex(v=>v.owned&&!!v.crop&&v.moisture<3);
 t=applyTutorial(t,{t:'waterHand',tiles:[[dry%6,Math.floor(dry/6)]]});assert.equal(t.solo!.watered,true);
 assert.equal(t.step,'solo','ending the week is the player\'s own choice');
 // the spring rent falls at the end of this week; without the money the week waits for the payment
 const poor=reload(t);poor.farm.money=5;
 let n=applyTutorial(poor,{t:'endWeek'});
 assert.equal(n.farm.phase,'shortfall');assert.equal(n.step,'solo');
 n=applyTutorial(n,{t:'emergency'});
 assert.equal(n.farm.phase,'week');assert.equal(n.step,'chapter');
 const paid=applyTutorial(t,{t:'endWeek'});assert.equal(paid.step,'chapter');assert.ok(paid.farm.stats.payments>0,'the rent was paid by itself');
});

test('hidden hints survive normalization until the next step, and a bean turned early still counts',()=>{
 const hidden={...createTutorial(),hiddenHintStep:'plant' as const};assert.equal(normalizeTutorial(reload(hidden)).hiddenHintStep,'plant');
 let t=applyTutorial(hidden,{t:'guide',lesson:'rotate'});assert.equal(t.step,'plant');
 t=applyTutorial(t,{t:'play',uid:t.farm.hand.find(c=>c.def==='seed_radish')!.uid,tiles:[[2,2]]});assert.equal(t.hiddenHintStep,undefined);assert.equal(t.step,'rotate');
 t=applyTutorial(t,{t:'guide',lesson:'rotate'});assert.equal(t.step,'bean');
});

test('lessons reject other actions atomically, and Палыч\'s radish is never mistaken for the player\'s',()=>{
 let t=createTutorial();const saved=JSON.stringify(t);
 assert.throws(()=>applyTutorial(t,{t:'endWeek'}),/редис/);
 assert.throws(()=>applyTutorial(t,{t:'play',uid:t.farm.hand.find(c=>c.def==='seed_radish')!.uid,tiles:[[1,1]]}),/Не встанет/);
 assert.equal(JSON.stringify(t),saved);
 t=applyTutorial(t,{t:'play',uid:t.farm.hand.find(c=>c.def==='seed_radish')!.uid,tiles:[[3,3]]});
 assert.deepEqual(tutorialPlant({...t,plantedAt:undefined}),[3,3]);
 t=play(t,'sale',{bed:[3,3],beanTiles:[[2,2],[2,3]]});
 assert.throws(()=>applyTutorial(t,{t:'endWeek'}),/урожай Палыча/);
 const all=G.stockOf(t.farm,'radish');
 // the first sale counts down to the last radish: part of it keeps the lesson where it is
 const part=applyTutorial(t,{t:'sell',crop:'radish',qty:1});
 assert.equal(part.step,'sale');assert.deepEqual(saleProgress(part),{done:1,of:all});
 const changed=applyTutorial(part,{t:'sell',crop:'radish',qty:all-1});
 assert.equal(changed.step,'visit');assert.equal(restartTutorialStep(reload(changed)).step,'visit');
});

test('the chapter certificate offers both roads: the map (the step waits) or chapter II',()=>{
 const t=play(createTutorial(),'chapter');
 assert.match(tutorialProblem(t,{t:'endWeek'})!,/Глава I пройдена/);
 assert.equal(normalizeTutorial(reload(t)).step,'chapter','leaving for the map keeps the certificate');
 const two=tutorialNext(t);
 assert.equal(two.step,'weeds');assert.ok(two.weedAt);assert.equal(G.tile(two.farm,...two.weedAt!).weeds,true);
 assert.notDeepEqual(two.weedAt,[1,2],'the weed never lands on the compost lesson\'s poor bed while it is free');
 assert.throws(()=>applyTutorial(two,{t:'endWeek'}),/Прополите/);
});

function practice(){return play(createTutorial(),'practice');}
test('final card watering counts actual water and expired offers recover without ordinary quests',()=>{
 let t=practice();const initial=t.farm.orgs[ORG(t)]!.offer!.id;
 // a planting to water: what the order asks for, sown from the hand
 const need=practiceNeed(t)!;
 for(const v of t.farm.tiles)v.weeds=false; // this check is about water, not weeds
 if(!need.plants.length){const p=G.placements(t.farm,need.seed!)[0];t=applyTutorial(t,{t:'play',uid:need.seed!.uid,tiles:p.tiles});}
 const at=practiceNeed(t)!.plants[0].at;G.tile(t.farm,...at).moisture=0;
 const card=t.farm.hand.find(c=>c.def==='water');
 t=applyTutorial(t,card?{t:'play',uid:card.uid,tiles:[at]}:{t:'waterHand',tiles:[at]});assert.equal(t.watered,true);
 for(let i=0;i<6;i++)t=applyTutorial(t,t.farm.phase==='shortfall'?{t:'emergency'}:{t:'endWeek'});
 const offer=t.farm.orgs[ORG(t)]!.offer!;assert.ok(offer);assert.notEqual(offer.id,initial);assert.equal(offer.title,'К столу соседей');assert.ok(offer.deadline!>t.farm.absWeek);assert.match(t.orderNotice!,/Срок/);
 assert.equal(Object.values(t.farm.orgs).filter(o=>o.offer||o.active).length,1);
 t.farm.storage=[{crop:offer.lines[0].crop,qty:2,age:0}];t=applyTutorial(t,{t:'accept',org:ORG(t)});t=applyTutorial(t,{t:'deliver',org:ORG(t)});assert.equal(t.step,'done');
});
test('accepted expiry and stuck saves regain an achievable lesson order',()=>{
 let t=practice();t=applyTutorial(t,{t:'accept',org:ORG(t)});for(let i=0;i<6;i++)t=applyTutorial(t,t.farm.phase==='shortfall'?{t:'emergency'}:{t:'endWeek'});
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
});

test('selling everything and skipping optional care still gives a concrete recoverable practice crop',()=>{
 let t=play(createTutorial(),'practice',{freeWater:false});
 let need=practiceNeed(t)!;
 assert.ok(need.seed||need.plants.length||need.have>=need.qty,'practice asks for something this farm can make');
 const initialWeek=t.farm.absWeek;
 t=applyTutorial(t,{t:'accept',org:ORG(t)});
 for(let i=0;i<35&&t.step!=='done';i++){
  if(t.farm.phase==='shortfall'){t=applyTutorial(t,{t:'emergency'});continue;}
  if(t.delivered&&!t.watered){const i=t.farm.tiles.findIndex(v=>v.owned&&!v.drip&&v.moisture<3);t=applyTutorial(t,i>=0&&t.farm.days>0?{t:'waterHand',tiles:[[i%6,Math.floor(i/6)]]}:{t:'endWeek'});}
  else if((need=practiceNeed(t)!).have>=need.qty)t=applyTutorial(t,{t:'deliver',org:ORG(t)});
  else if(need.seed&&!need.plants.length&&t.farm.days>0){
   const p=G.placements(t.farm,need.seed)[0];
   const w=t.farm.tiles.findIndex(v=>v.owned&&v.weeds&&!v.crop);
   if(p)t=applyTutorial(t,{t:'play',uid:need.seed.uid,tiles:p.tiles});
   else{assert.ok(w>=0,'no room only because of weeds');t=applyTutorial(t,{t:'weed',x:w%6,y:Math.floor(w/6)});}
  }else{
   const dry=need.plants.find(v=>v.dry);
   t=applyTutorial(t,dry&&t.farm.days>0?{t:'waterHand',tiles:[dry.at]}:{t:'endWeek'});
  }
  t=normalizeTutorial(reload(t));
 }
 assert.equal(t.step,'done');assert.ok(t.farm.absWeek-initialWeek<=6);
});

test('tutorial construction history agrees with its real one-week project',()=>{
 const t=play(createTutorial(),'play8');
 assert.equal(t.farm.projects.find(p=>p.kind==='track')?.weeks,1);
 assert.match(t.farm.feed.at(-1)!.text,/Капельный полив, 1 неделя/);
});

test('completed tutorial describes review mode instead of a hidden pause',()=>{
 const t=play(createTutorial(),'done'),before=JSON.stringify(t);
 assert.match(tutorialProblem(t,{t:'endWeek'})!,/Обучение завершено.*осмотреть.*карте/);
 assert.throws(()=>applyTutorial(t,{t:'endWeek'}),/Обучение завершено/);
 assert.equal(JSON.stringify(t),before);
});

test('a stored lesson is continued only by its own version; every step of this one is accepted',()=>{
 const saved:Record<string,TutorialSession>={};
 play(createTutorial(),'done',{},(p)=>{saved[p.step]??=reload(p);});
 assert.equal(Object.keys(saved).length,TUTORIAL_STEPS.length-1);
 for(const [step,v] of Object.entries(saved)){
  assert.equal(tutorialAccepted(v,validFarm),true,`${step} accepted`);
  assert.equal(TUTORIAL_WEEK[v.step]>=1,true);
 }
 const v3={...createTutorial(),version:3,heldUid:1};
 assert.equal(tutorialAccepted(v3,validFarm),false,'a version-3 lesson starts anew');
 assert.equal(tutorialAccepted({...createTutorial(),farm:{...createTutorial().farm,seed:'other'}},validFarm),false);
 assert.equal(createTutorial().farm.seed,TUTORIAL_SEED);
});

test('the order comes before its harvest and is taken through the village',()=>{
 let t=play(createTutorial(),'accept');
 assert.equal(t.farm.absWeek,2);assert.equal(G.stockOf(t.farm,'radish'),0,'Палыч\'s radish is all sold');
 const offer=t.farm.orgs[ORG(t)]!.offer!;
 const [x,y]=tutorialPlant(t);
 assert.equal(G.tile(t.farm,x,y).crop?.id,'radish');
 assert.ok(offer.lines[0].qty<=Math.max(1,Math.floor(G.expectedYield(t.farm,x,y))-1),'it asks for less than the growing radish will give');
 t=applyTutorial(t,{t:'accept',org:ORG(t)});
 assert.equal(t.step,'water','the sprouts come next, the order waits');
 t=play(t,'play2');
 assert.throws(()=>applyTutorial(t,{t:'deliver',org:ORG(t)}),/./,'nothing to deliver before the harvest');
 t=play(t,'village');
 assert.equal(t.farm.absWeek,3);assert.ok(G.stockOf(t.farm,'radish')>=offer.lines[0].qty,'the morning brought the radish');
 assert.equal(areaOpen(t.step,'village'),true);
 assert.match(tutorialProblem(t,{t:'deliver',org:ORG(t)})!,/деревне/);
 t=tutorialNext(t);assert.equal(t.step,'deliver');
 t=applyTutorial(t,{t:'deliver',org:ORG(t)});assert.equal(t.step,'hail');
});

test('chapter II gives every topic a week of its own',()=>{
 const weeks:Partial<Record<TutorialStep,number>>={};
 play(createTutorial(),'done',{},(p)=>{weeks[p.step]??=p.farm.absWeek;});
 for(const step of ['weeds','hire','lab','upgrade','place','practice'] as const)assert.equal(weeks[step],TUTORIAL_WEEK[step],`${step} in week ${TUTORIAL_WEEK[step]}`);
 assert.deepEqual(['weeds','hire','lab','upgrade','place','practice'].map(s=>TUTORIAL_WEEK[s as TutorialStep]),[5,6,7,8,9,10]);
});

// ---------- the review of 28.10 (POSEVNAYA_REAL_TUTORIAL_AUDIT): one check per finding the engine can show ----------
test('T01 · shopping never strands a paid lesson: free time keeps the reserve, a paid step can raise its money',()=>{
 let t=play(createTutorial(),'play5');
 assert.ok(lessonReserve(t)>0);
 const def=G.shopCards(t.farm)[0];
 let refused='';
 for(let i=0;i<80&&!refused;i++){try{t=applyTutorial(t,{t:'buyCard',def});}catch(e){refused=(e as Error).message;}}
 assert.match(refused,/отложим/,'the shop stops before the reserve');
 assert.ok(t.farm.money>=lessonReserve(t));
 t=play(t,'hire');
 assert.ok(t.farm.money>=G.hirePrice(t.farm,'foreman'),'the helper is affordable');
 assert.ok(restartTutorialStep(reload(t)).farm.money>=G.hirePrice(t.farm,'foreman'),'a retry lands on a doable step');
 // and if the money is gone anyway, the paid step allows a loan and a sale and goes on
 const poor=reload(t);poor.farm.money=1.6;
 assert.equal(tutorialProblem(poor,{t:'borrow',amount:30}),null);
 assert.equal(tutorialProblem(poor,{t:'sell',crop:'bean',qty:1}),null);
 let n=applyTutorial(poor,{t:'borrow',amount:30});n=applyTutorial(n,{t:'hire',id:'foreman'});
 assert.equal(n.step,'play6');
});

test('T02 · an empty week on one\'s own gets one more try, then an honest certificate',()=>{
 let t=play(createTutorial(),'solo');
 t=applyTutorial(t,{t:'endWeek'});
 assert.equal(t.step,'solo','nothing done: the week is tried again');assert.equal(t.solo!.weeks,2);
 t=applyTutorial(t,{t:'endWeek'});
 assert.equal(t.step,'chapter');assert.equal(t.soloPassed,false,'not ticked as learned');
 assert.equal(play(createTutorial(),'chapter').soloPassed,true,'a week done in full is ticked');
});

test('T05, T06, T12 · the lesson\'s words agree with the engine and the screen',()=>{
 const src=readFileSync(new URL('../src/ui/Guide.tsx',import.meta.url),'utf8');
 assert.match(src,/фасоль потеряет половину урожая/);
 for(const wrong of [/погибнет/,/справа/,/Каждая карта стоит рабочий день/,/weather-instrument/])assert.doesNotMatch(src,wrong);
 // an uncovered hail halves the beans' harvest; they live on
 const t=play(createTutorial(),'hail');const [x,y]=t.farm.strikes[0].cells[0];
 const n=G.endWeek(JSON.parse(JSON.stringify(t.farm)));
 const hit=n.lastReport!.fieldDamage!.find(d=>d.kind==='hail'&&d.x===x&&d.y===y)!;
 assert.ok(hit,'the hail struck the beans');assert.notEqual(hit.after,null,'the beans live');
 assert.equal(hit.after!.mult,hit.before.mult*0.5);
});

test('T07 · the selection lesson remembers the crop it improved',()=>{
 let t=play(createTutorial(),'lab');
 const potato=G.deckList(t.farm).find(c=>c.def==='seed_potato')!;
 t=applyTutorial(t,{t:'labCell',uid:potato.uid,cell:G.upgradeSpots(t.farm,potato)[0]});
 assert.equal(t.labCrop,'potato');
});

test('T08 · a card not played in free time stays in the next week\'s hand (rule of 28.10, no put-aside button)',()=>{
 let t=play(createTutorial(),'play2');
 const c=t.farm.hand.find(c=>!c.temp)!;
 t=applyTutorial(t,{t:'endWeek'});
 assert.ok(t.farm.hand.some(h=>h.uid===c.uid),'the unplayed card is still in hand');
 assert.equal(t.farm.hand.filter(h=>!h.temp).length,HAND_BY_WEEK[3]);
 assert.ok(t.farm.hand.some(h=>h.def==='shelter'),'the hail lesson still has its cover');
});

test('T10 · the final order is grown, and only watering a planting counts',()=>{
 for(const freeWater of [true,false]){
  const t=play(createTutorial(),'practice',{freeWater});
  const need=practiceNeed(t)!;
  assert.ok(need.have<need.qty,`the order is not already in the barn (${need.crop})`);
  const bare=t.farm.tiles.findIndex(v=>v.owned&&!v.crop&&!v.drip&&v.moisture<3);
  if(bare>=0)assert.equal(applyTutorial(t,{t:'waterHand',tiles:[[bare%6,Math.floor(bare/6)]]}).watered,false,'bare soil is not a planting');
 }
});

test('T11 · the certificate\'s own-farm notes come from a real new farm',()=>{
 const d=ownFarmDifferences();
 assert.equal(d.money,G.newGame({loc:'chernozem',seed:'x'}).money);
 assert.ok(d.lessonMoney>d.money);assert.ok(d.lessonCan>d.can);assert.ok(d.projectWeeks>1);
});

test('review 28.10 · a lesson saved before crop knowledge still passes the lab', async () => {
  const T = await import('../src/engine/tutorial');
  const t = T.createTutorial();
  delete (t.farm as { knowBase?: unknown }).knowBase;
  if (t.checkpoint) delete (t.checkpoint.farm as { knowBase?: unknown }).knowBase;
  const n = T.normalizeTutorial(t);
  assert.ok((n.farm.knowBase?.radish ?? 0) >= 60);
  assert.ok((n.checkpoint?.farm.knowBase?.potato ?? 0) >= 60);
});
