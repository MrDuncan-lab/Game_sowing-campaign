import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {apply,newGame,endWeek,tile,nearCanal,wetCanals,growNote,forecast,deckCount,weekOutlook,crowFood,expectedYield,priceOf,marketPrice,orderCropAvailable,handMax,nextPayment,workCardPreview} from '../src/engine/game';
import type {GameState,Card} from '../src/engine/game';
import {LOCATIONS,ORGS,CROPS,TRACKS} from '../src/engine/data';
function farm(loc:'chernozem'|'kuban'|'altai'='chernozem') {
 const s=newGame({loc,seed:'review-rules'});s.money=10000;s.days=8;s.plan=[];s.temps.fill(20);s.strikes=[];s.flags={warm:false,rain:false,dry:false};s.crows=null;s.thieves=null;
 for(const t of s.tiles)Object.assign(t,{owned:true,terrain:'plain',soil:2,moisture:2,crop:null,weeds:false,structure:null,canal:false});
 return s;
}
function plant(s:GameState,x=2,y=2,id:'wheat'|'rice'|'buckwheat'|'potato'='wheat') {const p={id,pid:s.nextPid++,grown:0,mult:1,bonus:0,planted:s.absWeek};tile(s,x,y).crop=p;return p;}
function date(s:GameState,season:number){s.season=season as any;s.week=LOCATIONS[s.loc].seasons.slice(0,season).reduce((a,b)=>a+b,0)+1;s.weekInSeason=1;s.absWeek=s.week;s.yearStart=1;}
function add(s:GameState,def:string,temp=false){const c={uid:s.nextUid++,def,temp};s.hand.push(c);return c;}

test('exchange takes one day, works with a full hand, never returns its own UID, and is limited weekly',()=>{
 let s=farm();s.hand=[];while(s.hand.length<handMax(s))add(s,'seed_radish');const out=s.hand[0];s.draw=[];s.discard=[{uid:s.nextUid++,def:'water'}];const n=deckCount(s);
 s=apply(s,{t:'exchangeCard',uid:out.uid});assert.equal(s.days,7);assert.equal(s.hand.length,handMax(s));assert.ok(!s.hand.some(c=>c.uid===out.uid));assert.equal(s.hand.at(-1)!.def,'water');assert.equal(deckCount(s),n);
 assert.throws(()=>apply(s,{t:'exchangeCard',uid:s.hand[0].uid}),/уже/);
});
test('empty exchange and invalid UID never spend a card or a day',()=>{
 const s=farm();s.draw=[];s.discard=[];const snapshot=JSON.stringify(s);assert.throws(()=>apply(s,{t:'exchangeCard',uid:s.hand[0].uid}));assert.equal(JSON.stringify(s),snapshot);
});
test('winter editor can move a hand card to reserve and still enforces permanent minimum',()=>{
 let s=farm();date(s,3);const uid=s.hand[0].uid;s=apply(s,{t:'deckOut',uid});assert.ok(s.spare.some(c=>c.uid===uid));assert.equal(s.days,8);
 while(deckCount(s)>8){const c=[...s.hand,...s.draw,...s.discard].find(c=>!c.temp)!;s=apply(s,{t:'deckOut',uid:c.uid});}
 assert.throws(()=>apply(s,{t:'deckOut',uid:[...s.hand,...s.draw,...s.discard][0].uid}),/8/);
});
test('compost waits outside hand and deck through full hands and seasons, then is claimed once',()=>{
 let s=farm();s.levels.compost=1;s.compostTick=2;const n=deckCount(s);s=endWeek(s);assert.equal(s.compostReady,true);assert.equal(deckCount(s),n);assert.ok(![...s.hand,...s.draw,...s.discard].some(c=>c.temp&&c.def==='compost'));
 while(s.hand.length<handMax(s))add(s,'helpers',true);assert.throws(()=>apply(s,{t:'claimCompost'}),/место/);
 s.discard.push(s.hand.pop()!);s=apply(s,{t:'claimCompost'});assert.equal(s.compostReady,false);assert.ok(s.hand.some(c=>c.temp&&c.def==='compost'));assert.equal(deckCount(s),n);assert.throws(()=>apply(s,{t:'claimCompost'}));
});
test('compost acceleration shares weekly exchange budget and cannot recycle its own output',()=>{
 let s=farm();s.levels.compost=1;s.compostTick=1;const uid=s.hand[0].uid,n=deckCount(s);s=apply(s,{t:'compostCard',uid});assert.equal(s.compostTick,2);assert.equal(s.days,7);assert.equal(deckCount(s),n);assert.throws(()=>apply(s,{t:'exchangeCard',uid:s.hand[0].uid}));
 const b=farm();b.levels.compost=1;for(const [def,temp] of [['compost',false],['bio',false],['helpers',true]] as const){const c=add(b,def,temp);assert.throws(()=>apply(b,{t:'compostCard',uid:c.uid}));}
});
test('disconnected canal loses irrigation and reconnecting restores it',()=>{
 const s=farm('kuban');tile(s,0,2).terrain='river';tile(s,0,2).owned=false;for(const x of [1,2,3])tile(s,x,2).canal=true;
 assert.ok(nearCanal(s,3,3));assert.equal(wetCanals(s).size,3);tile(s,2,2).canal=false;assert.ok(!nearCanal(s,3,3));assert.equal(wetCanals(s).size,1);tile(s,2,2).canal=true;assert.ok(nearCanal(s,3,3));
});
test('automatic water rescues a last-dry-week plant before growth; preview agrees',()=>{
 const s=farm();Object.assign(plant(s),{dry:1});tile(s,2,2).moisture=0;s.levels.irrigation=3;assert.equal(growNote(s,2,2),null);assert.equal(weekOutlook(s).dying,0);const n=endWeek(s);assert.equal(tile(n,2,2).crop?.grown,1);assert.equal(n.lastReport?.dried,0);
});
test('without water the second dry week still kills; rice at moisture 1-2 stalls without dying',()=>{
 const s=farm();Object.assign(plant(s),{dry:1});tile(s,2,2).moisture=0;assert.equal(weekOutlook(s).dying,1);assert.equal(tile(endWeek(s),2,2).crop,null);
 for(const m of [1,2]){const r=farm();plant(r,2,2,'rice');tile(r,2,2).moisture=m;assert.equal(growNote(r,2,2),'flood');const n=endWeek(r);assert.equal(tile(n,2,2).crop?.grown,0);assert.equal(tile(n,2,2).crop?.dry,0);}
});
test('greenhouse loses ordinary water, excludes rain and extra heat loss; mulch conserves water',()=>{
 const s=farm();tile(s,2,2).structure='greenhouse';tile(s,2,2).moisture=2;s.flags={warm:false,rain:true,dry:true};s.temps.fill(30);plant(s);assert.equal(tile(endWeek(s),2,2).moisture,1);
 tile(s,2,2).mulch=3;assert.equal(tile(endWeek(s),2,2).moisture,2);
});
test('heated winter greenhouse also needs water',()=>{
 const s=farm();date(s,3);s.levels.greenhouse=3;tile(s,2,2).structure='greenhouse';tile(s,2,2).moisture=2;plant(s);assert.equal(tile(endWeek(s),2,2).moisture,1);
});
test('honey needs a growing pollinated neighbour, including one harvested that week',()=>{
 const s=farm();date(s,1);s.levels.apiary=3;tile(s,2,2).structure='hive';assert.equal(endWeek(s).lastReport!.honey,0);
 const p=plant(s,2,3,'buckwheat');assert.equal(endWeek(s).lastReport!.honey,2);p.grown=CROPS.buckwheat.grow-1;assert.equal(endWeek(s).lastReport!.honey,2);
 tile(s,2,3).moisture=0;assert.equal(endWeek(s).lastReport!.honey,0);
});
test('insect trait no longer blocks crows while greenhouses still do',()=>{
 const s=farm();date(s,1);Object.assign(plant(s),{traits:['tough']});assert.ok(crowFood(s).young.some(([x,y])=>x===2&&y===2));tile(s,2,2).structure='greenhouse';assert.ok(!crowFood(s).young.some(([x,y])=>x===2&&y===2));
});
test('insurance pays bounded cash after physical locust loss, without restoring crop',()=>{
 const s=farm();const p=plant(s);s.insurance=1;s.strikes=[{kind:'locust',ep:99,week:s.absWeek,cells:[[2,2,p.pid]],zone:false}];const expect=Math.min(expectedYield(s,2,2)*priceOf(s,'wheat')*.6,nextPayment(s).amount);const n=endWeek(s);assert.equal(tile(n,2,2).crop,null);assert.equal(n.insurance,0);assert.ok(n.lastReport!.insurancePaid!>0);assert.ok(Math.abs(n.lastReport!.insurancePaid!-expect)<.011);assert.ok(n.stats.lostUnits>0);
});
test('drone preserves plants and insurance, and emits one event scene',()=>{
 const s=farm();const p=plant(s);s.insurance=1;s.levels.drone=2;s.strikes=[{kind:'locust',ep:99,week:s.absWeek,cells:[[2,2,p.pid]],zone:false}];const n=endWeek(s);assert.ok(tile(n,2,2).crop);assert.equal(n.insurance,1);assert.equal(n.dronesUsed,1);assert.equal(n.scenes?.filter(e=>e.kind==='drone').length,1);
});
test('unaccepted offers expire harmlessly including winter; accepted failures still cost relations',()=>{
 for(const season of [0,3]){const s=farm();date(s,season);const st=s.orgs.bakery!;st.rel=20;st.idle=6;st.offer={id:1,org:'bakery',step:0,title:'Хлеб',text:'',lines:[{crop:'wheat',qty:4}],pay:10,rel:18,weeks:4,expires:s.absWeek};const n=endWeek(s);assert.equal(n.orgs.bakery!.rel,20);assert.equal(n.orgs.bakery!.offer,null);}
 const s=farm();s.orgs.bakery!.active={id:1,org:'bakery',step:0,title:'Хлеб',text:'',lines:[{crop:'wheat',qty:4}],pay:10,rel:18,weeks:4,deadline:s.absWeek};assert.equal(endWeek(s).orgs.bakery!.rel,-20);
});
test('later story orders ask for distinct available goods while preserving a story ingredient',()=>{
 for(const loc of ['chernozem','kuban','altai'] as const){const s=farm(loc);s.levels.apiary=3;for(const o of LOCATIONS[loc].orgs){const st=s.orgs[o]!;st.step=Math.min(3,ORGS[o].steps.length-1);st.wait=0;}const n=endWeek(s);for(const o of LOCATIONS[loc].orgs){const q=n.orgs[o]?.offer;if(!q)continue;assert.ok(q.lines.some(l=>ORGS[o].steps[q.step].crops.includes(l.crop)));assert.equal(new Set(q.lines.map(l=>l.crop)).size,q.lines.length);assert.ok(q.lines.every(l=>orderCropAvailable(n,l.crop)));const available=new Set([...ORGS[o].steps[q.step].crops,...ORGS[o].wants].filter(c=>orderCropAvailable(n,c)));assert.ok(q.lines.length>=Math.min(2,available.size));}}
});
test('commercial deadline is fixed at offer creation, accepting later does not reset it',()=>{
 let s=farm();s.orgs.bakery!.step=ORGS.bakery.steps.length;s.orgs.bakery!.wait=0;s=endWeek(s);const q=s.orgs.bakery!.offer!;assert.ok(q.contract);assert.ok(q.lines.length>=2);const deadline=q.deadline;s=endWeek(s);s=apply(s,{t:'accept',org:'bakery'});assert.equal(s.orgs.bakery!.active!.deadline,deadline);
});
test('borrowing through either payment route has the same rating penalty, charged once',()=>{
 const s=farm();s.phase='shortfall';s.due={amount:20,name:'Весна',seasonEnd:true};s.money=0;s.rating=2;
 const normal=apply(apply(apply(s,{t:'borrow',amount:10}),{t:'borrow',amount:10}),{t:'pay'}), emergency=apply(s,{t:'emergency'});
 assert.equal(normal.rating,emergency.rating);assert.equal(normal.rating,1);assert.equal(normal.loans.reduce((a,l)=>a+l.principal,0),20);
});
test('station does not invent knowledge about independent price noise; uncertainty scales with year',()=>{
 const s=farm();s.levels.meteo=2;const p=forecast(s,'wheat',1);s.levels.meteo=3;assert.deepEqual(forecast(s,'wheat',1),p);s.year=8;const late=forecast(s,'wheat',1);assert.ok(late.high/late.low>p.high/p.low);assert.equal(forecast(s,'wheat',0).price,marketPrice(s,'wheat'));
});
test('dog blocks announced thieves and creates a chase exactly once',()=>{
 const s=farm();const p=plant(s);s.pets=['dog'];s.thieves={week:s.absWeek,targets:[{x:2,y:2,pid:p.pid}],talked:false};const n=endWeek(s);assert.ok(tile(n,2,2).crop);assert.equal(n.lastReport?.stolen,0);assert.equal(n.scenes?.filter(e=>e.kind==='dogThieves').length,1);
});
test('a destroyed flowering neighbour cannot produce honey later that week',()=>{
 const s=farm();date(s,1);s.levels.apiary=3;tile(s,2,2).structure='hive';const p=plant(s,2,3,'buckwheat');s.strikes=[{kind:'locust',ep:99,week:s.absWeek,cells:[[2,3,p.pid]],zone:false}];assert.equal(endWeek(s).lastReport!.honey,0);
});
test('soil and row-care previews equal committed yield changes',()=>{
 for(const def of ['compost','bio','care']) {const s=farm();plant(s,2,2);plant(s,3,2);const c=add(s,def);const preview=workCardPreview(s,c,2,2);const n=apply(s,def==='care'?{t:'play',uid:c.uid,row:2}:{t:'play',uid:c.uid,tiles:[[2,2]]});const total=preview.cells.reduce((sum,[x,y])=>sum+expectedYield(n,x,y),0);assert.equal(total,preview.after);assert.ok(total>preview.before);}
});
test('guidance advances on actions and does not mutate the source state',()=>{
 const s=farm();s.guide=[];const c=add(s,'seed_radish');let n=apply(s,{t:'play',uid:c.uid,tiles:[[2,2]]});assert.ok(n.guide?.includes('plant'));assert.deepEqual(s.guide,[]);n=apply(n,{t:'guide',lesson:'rotate'});assert.ok(n.guide?.includes('rotate'));n=apply(n,{t:'guide',lesson:'off'});assert.equal(n.guide,undefined);
});
test('previous interface fixture remains readable by the engine; house progression follows v3 §5.2',()=>{
 const fixtures=JSON.parse(readFileSync(new URL('./fixtures/browser-fixtures.json',import.meta.url),'utf8'));const next=apply(fixtures.initial,{t:'endWeek'});assert.equal(next.v,5);
 // 28.10 · progression v3: seven levels, a season to half a year each from the third, and materials
 assert.deepEqual(TRACKS.house.levels.map(l=>[l.cost,l.weeks]),[[0,0],[25,4],[50,6],[90,8],[150,10],[240,12],[360,14]]);
});
