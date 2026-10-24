import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine/game';
import * as D from '../src/engine/data';
import {TEST_SCENARIOS,testFixture,testDate,testAnimation} from '../src/engine/testLab';
import {chooseScene} from '../src/ui/useSceneQueue';
import {saveFarm,loadFarm,syncFarm,emptyProfile} from '../src/ui/persist';
const values=new Map<string,string>();
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)}});
function allCards(s:G.GameState){return [...s.hand,...s.draw,...s.discard,...s.spare];}
function card(s:G.GameState,def:string){return {uid:s.nextUid++,def};}

test('moving greenhouse preserves protection but cannot multiply two early harvests in the same week',()=>{
 let s=testFixture('greenhouse');const start=JSON.stringify(s),base=G.expectedYield(s,2,1),boosted=G.expectedYield(s,1,1),days=s.days;
 const early=s.hand.filter(c=>c.def==='early');
 assert.ok(boosted>base);s=G.apply(s,{t:'play',uid:early[0].uid,tiles:[[1,1]]});const first=G.stockOf(s,'potato');
 s=G.apply(s,{t:'moveBuild',item:'greenhouse',from:[1,1],to:[2,1]});
 assert.equal(G.greenhouseYieldReady(s,G.tile(s,2,1)),false);assert.equal(G.expectedYield(s,2,1),base);
 assert.ok(G.soilTemp(s,2,1)>G.airTemp(s));assert.equal(G.frostKills(s,2,1,-3),false);
 assert.equal(saveFarm(s),true);s=loadFarm(s.loc)!;assert.equal(G.expectedYield(s,2,1),base);
 s=G.apply(s,{t:'play',uid:early[1].uid,tiles:[[2,1]]});assert.equal(G.stockOf(s,'potato')-first,Math.round(base*.7));assert.equal(s.days,days-2);
 assert.ok(JSON.parse(start).tiles[7].structure==='greenhouse');
});
test('new greenhouse yield unlocks next week, old saves retain established bonuses, failed move is atomic',()=>{
 let s=testFixture('greenhouse');const old=G.expectedYield(s,1,1);
 assert.equal(G.greenhouseYieldReady(s,G.tile(s,1,1)),true);
 s=G.apply(s,{t:'moveBuild',item:'greenhouse',from:[1,1],to:[2,1]});const snapshot=JSON.stringify(s);
 assert.throws(()=>G.apply(s,{t:'moveBuild',item:'greenhouse',from:[2,1],to:[-1,0]}));assert.equal(JSON.stringify(s),snapshot);
 s=G.endWeek(s);assert.equal(G.greenhouseYieldReady(s,G.tile(s,2,1)),true);assert.equal(G.expectedYield(s,2,1),old);
});
test('canal building/moving cannot refill tiles; only the connected weekly network irrigates',()=>{
 let s=testFixture('canal','kuban');G.tile(s,1,2).canal=false;G.tile(s,2,2).canal=false;const days=s.days;
 s=G.apply(s,{t:'build',item:'canal',x:1,y:2});s=G.apply(s,{t:'moveBuild',item:'canal',from:[1,2],to:[1,3]});
 assert.equal(G.tile(s,1,2).moisture,0);assert.equal(G.tile(s,1,3).moisture,0);assert.equal(s.days,days);
 assert.equal(G.growthMoisture(s)[3*6+2],3);assert.equal(G.growthMoisture(s)[1*6+3],0);
 s=G.endWeek(s);assert.ok(G.tile(s,2,3).moisture>=2);assert.equal(G.tile(s,3,1).moisture,0);
});
test('greenhouse relocation cannot instantly bypass the forest yield penalty either',()=>{
 let s=testFixture('greenhouse','altai');G.tile(s,3,1).terrain='forest';const base=G.expectedYield(s,2,1);
 s=G.apply(s,{t:'moveBuild',item:'greenhouse',from:[1,1],to:[2,1]});assert.equal(G.expectedYield(s,2,1),base);
 s=G.endWeek(s);assert.ok(G.expectedYield(s,2,1)>base);
});
test('orders distinguish an unresearched culture from its seeds and required equipment',()=>{
 const s=G.newGame({loc:'chernozem',seed:'orders'});const c=D.LOCATIONS.chernozem.lab.find(c=>!G.shopCards(s).includes(`seed_${c}`)&&!D.CROPS[c].greenhouseOnly&&!D.CROPS[c].swamp)!;
 assert.ok(c);assert.equal(G.orderCropAvailable(s,c),false);s.spare.push(card(s,`seed_${c}`));assert.equal(G.orderCropAvailable(s,c),true);
 s.unlocked.push('tomato');assert.equal(G.orderCropAvailable(s,'tomato'),false);G.tile(s,2,2).structure='greenhouse';assert.equal(G.orderCropAvailable(s,'tomato'),true);
 s.levels.apiary=3;assert.equal(G.orderCropAvailable(s,'honey'),false);G.tile(s,2,1).structure='hive';assert.equal(G.orderCropAvailable(s,'honey'),true);
 s.spare.push(card(s,'seed_cranberry'));for(const t of s.tiles)if(t.terrain==='swamp')t.owned=false;assert.equal(G.orderCropAvailable(s,'cranberry'),false);Object.assign(G.tile(s,3,2),{terrain:'swamp',owned:true});
 // PSV-020: one isolated swamp cannot take the two-cell cranberry; a pair can
 assert.equal(G.orderCropAvailable(s,'cranberry'),false);Object.assign(G.tile(s,4,2),{terrain:'swamp',owned:false});assert.equal(G.orderCropAvailable(s,'cranberry'),true);
});
test('repair removes inaccessible offers without penalising reputation or altering accepted contracts',()=>{
 const s=testFixture('orders');const org=D.LOCATIONS[s.loc].orgs[0],active=s.orgs[org]!.active!;active.lines=[{crop:'honey',qty:8}];
 const other=D.LOCATIONS[s.loc].orgs[1],st=s.orgs[other]!;st.offer={...structuredClone(active),org:other,id:s.nextQuestId++};st.rel=20;
 const before=JSON.stringify(s),n=syncFarm(emptyProfile(),s);assert.equal(JSON.stringify(s),before);assert.equal(n.orgs[other]!.offer,null);assert.equal(n.orgs[other]!.rel,20);assert.deepEqual(n.orgs[org]!.active,active);
});
test('profile seed-bank unlock is applied before repairing an existing offer',()=>{
 const s=testFixture('normal','chernozem'),p=emptyProfile();const c=D.CROP_IDS.find(c=>D.SEED_BANK_OK[c]?.includes(s.loc)&&!D.LOCATIONS[s.loc].shop.includes(c)&&!D.CROPS[c].greenhouseOnly&&!D.CROPS[c].swamp)!;assert.ok(c);p.seedBank.push(c);
 const org=D.LOCATIONS[s.loc].orgs[0];s.orgs[org]!.offer={id:s.nextQuestId++,org,step:0,title:'Existing',text:'',lines:[{crop:c,qty:3}],pay:10,rel:18,weeks:5};assert.ok(syncFarm(p,s).orgs[org]!.offer);
});
test('60 controlled starts produce no locked-crop offers through the first 15 weeks',()=>{
 for(const loc of D.LOCATION_IDS)for(let i=0;i<20;i++){
  let s=G.newGame({loc,seed:`OFFERS-${i}`});s.money=10000;
  for(let j=0;j<15;j++){if(s.phase==='shortfall')s=G.apply(s,{t:'pay'});s=G.apply(s,{t:'endWeek'});for(const q of Object.values(s.orgs))if(q?.offer)assert.ok(q.offer.lines.every(l=>G.orderCropAvailable(s,l.crop)),`${loc}/${i}/${j}`);}
 }
});
test('exchange skips matching copies in draw and discard while conserving permanent cards',()=>{
 for(const inDraw of [true,false]){
  const s=testFixture('exchange'),out=s.hand[0];s.draw=[card(s,'seed_radish')];s.discard=[card(s,'seed_radish')];(inDraw?s.draw:s.discard).unshift(card(s,'water'));
  const ids=allCards(s).map(c=>c.uid).sort(),before=JSON.stringify(s),n=G.apply(s,{t:'exchangeCard',uid:out.uid});
  assert.equal(n.hand.at(-1)!.def,'water');assert.deepEqual(allCards(n).map(c=>c.uid).sort(),ids);assert.equal(n.days,s.days-1);assert.equal(n.hand.length,s.hand.length);assert.equal(JSON.stringify(s),before);
  assert.equal(saveFarm(n),true);assert.throws(()=>G.apply(loadFarm(n.loc)!,{t:'exchangeCard',uid:n.hand[0].uid}),/уже/);
 }
});
test('exchange falls back only with no alternatives and recognises upgraded variants',()=>{
 const s=testFixture('exchange'),out=s.hand[0];s.draw=[card(s,'seed_radish')];s.discard=[];
 let n=G.apply(s,{t:'exchangeCard',uid:out.uid});assert.equal(n.hand.at(-1)!.def,'seed_radish');assert.notEqual(n.hand.at(-1)!.uid,out.uid);
 s.discard=[{...card(s,'seed_radish'),extra:[[1,0]]}];n=G.apply(s,{t:'exchangeCard',uid:out.uid});assert.deepEqual(n.hand.at(-1)!.extra,[[1,0]]);
 assert.equal(G.exchangeIdentity({def:'seed_radish',extra:[[0,1]]}),G.exchangeIdentity({def:'seed_radish',extra:[[1,0]]}));
 s.discard=[{...card(s,'seed_radish'),traits:['tough']}];n=G.apply(s,{t:'exchangeCard',uid:out.uid});assert.deepEqual(n.hand.at(-1)!.traits,['tough']);
});
test('scene queue prefers protection, advances after completion, and shows all actual effects without a dialogue cap',()=>{
 const s=testFixture('guide');s.scenes=[{id:'a',kind:'drone',week:s.absWeek},{id:'b',kind:'dogThieves',week:s.absWeek},{id:'c',kind:'geese',week:s.absWeek}];const done=new Set<string>();const pick=()=>chooseScene(s,e=>done.has(e.id));
 assert.equal(pick()?.kind,'dogThieves');done.add('b');assert.equal(pick()?.kind,'drone');done.add('a');assert.equal(pick()?.kind,'geese');done.add('c');assert.equal(pick(),null);
});
test('4800 adversarial exchange/compost attempts preserve cards, costs and alternative-card rule',()=>{
 for(let k=0;k<40;k++){
  let s=testFixture('compost');s.seed=`repeatable-stress-${k}`;let rng=k+1;
  for(let j=0;j<120;j++){
   rng=(Math.imul(rng,1664525)+1013904223)>>>0;const n=rng%8,uid=n===7?-1:s.hand[rng%Math.max(1,s.hand.length)]?.uid??-1;
   const a:G.Action=n<2?{t:'exchangeCard',uid}:n<4?{t:'compostCard',uid}:n<6?{t:'claimCompost'}:n===6?{t:'endWeek'}:{t:'exchangeCard',uid};
   if(s.phase==='shortfall')s=G.apply(s,{t:'pay'});
   const before=JSON.stringify(s),count=G.deckCount(s),out=s.hand.find(c=>c.uid===uid),alternative=out&&[...s.draw,...s.discard].some(c=>G.exchangeIdentity(c)!==G.exchangeIdentity(out));
   try{const next=G.apply(s,a);assert.equal(JSON.stringify(s),before);assert.equal(G.deckCount(next),count);assert.equal(new Set(allCards(next).map(c=>c.uid)).size,allCards(next).length);assert.ok(next.hand.length<=G.handMax(next));
    if(a.t==='exchangeCard'||a.t==='compostCard'){assert.equal(next.days,s.days-1);assert.equal(next.money,s.money);assert.equal(next.exchangeWeek,s.absWeek);}
    if(a.t==='exchangeCard'&&alternative)assert.notEqual(G.exchangeIdentity(next.hand.at(-1)!),G.exchangeIdentity(out!));
    s=JSON.parse(JSON.stringify(next));
   }catch(e){if(!(e instanceof G.GameError))throw e;assert.equal(JSON.stringify(s),before);}
  }
 }
});
test('all 99 regional test scenarios are valid states and survive a genuine engine transition',()=>{
 for(const loc of D.LOCATION_IDS)for(const[id]of TEST_SCENARIOS){let s=testFixture(id,loc);assert.equal(saveFarm(s),true,`${loc}/${id}`);assert.ok(loadFarm(loc),`${loc}/${id}`);const before=JSON.stringify(s);s=G.apply(s,s.phase==='shortfall'?{t:'borrow',amount:32}:{t:'endWeek'});assert.ok(s);assert.ok(before);assert.ok(s.hand.length<=G.handMax(s));assert.equal(new Set(allCards(s).map(c=>c.uid)).size,allCards(s).length);}
});
test('changing a test date keeps coherent clocks and greenhouse placement dates',()=>{
 const s=testFixture('greenhouse');G.tile(s,1,1).greenhousePlacedWeek=200;testDate(s,0,1);assert.equal(s.absWeek,1);assert.equal(G.tile(s,1,1).greenhousePlacedWeek,0);testDate(s,3,5);assert.equal(s.absWeek,s.yearStart+s.week-1);assert.equal(s.temps.length,D.LOCATIONS[s.loc].seasons.reduce((a,b)=>a+b,0));
});
test('animation replay changes scene cues only, without granting pets or changing randomness',()=>{
 const s=testFixture('normal'),before=structuredClone(s);testAnimation(s,'dogThieves');assert.equal(s.scenes?.[0].kind,'dogThieves');delete s.scenes;delete before.scenes;assert.deepEqual(s,before);
});
test('test presets reproduce actual danger, protection, honey and frost rather than just drawings',()=>{
 const dry=G.endWeek(testFixture('drought'));assert.ok(dry.lastReport!.dried>=4);
 const frost=G.endWeek(testFixture('frost'));assert.ok(frost.lastReport!.frost>=4);
 const dog=G.endWeek(testFixture('dog'));assert.equal(dog.lastReport!.stolen,0);assert.ok(dog.scenes?.some(e=>e.kind==='dogThieves'));
 const drone=G.endWeek(testFixture('drone'));assert.equal(drone.dronesUsed,1);assert.ok(drone.scenes?.some(e=>e.kind==='drone'));
 const bees=G.endWeek(testFixture('bees'));assert.ok(bees.lastReport!.honey>0);
 const hail=G.endWeek(testFixture('hail'));assert.ok(hail.lastReport!.insurancePaid!>0);
 const locust=G.endWeek(testFixture('locust'));assert.ok(G.ownedTiles(locust).every(([t])=>!t.crop));
});
