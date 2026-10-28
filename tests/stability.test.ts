import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine/game';
import * as D from '../src/engine/data';
import {testFixture,testDate} from '../src/engine/testLab';
import {buildMorning} from '../src/ui/Morning';

function quiet(){const s=testFixture('fertilizers');testDate(s,1);s.money=100000;s.temps.fill(20);s.plan=[];s.strikes=[];s.crows=null;s.thieves=null;s.flags={warm:false,dry:false,rain:false};for(const t of s.tiles){t.crop=null;t.moisture=3;t.structure=null;t.soil=4;t.weeds=false;}return s;}
function plant(s:G.GameState,x:number,y:number,id:D.CropId,grown:number){const t=G.tile(s,x,y);t.owned=true;t.crop={id,pid:s.nextPid++,mult:1,bonus:0,planted:s.absWeek,grown};return t.crop;}
const cards=(s:G.GameState)=>[...s.hand,...s.draw,...s.discard,...s.spare];

test('the whole unplayed hand survives every regional season and year boundary, topped up from the deck',()=>{
 for(const loc of D.LOCATION_IDS)for(let season=0;season<4;season++)for(const full of [false,true]){
  let s=testFixture('normal',loc);testDate(s,season);s.money=100000;s.plan=[];
  const n=D.LOCATIONS[loc].seasons[season]-1;s.week+=n;s.absWeek+=n;s.weekInSeason+=n;
  if(full)while(s.hand.length<G.handMax(s))G.drawCards(s,1);else s.discard.push(...s.hand.splice(2));
  s.hand[0]={...s.hand[0],traits:['fast'],extra:[[9,9]],temp:true};
  // 28.10 · every card not played stays exactly as it was (one-off cards too); the deck only tops the hand up
  s.hand[1]={...s.hand[1],keep:true}; // a mark from an older save is dropped
  const held=structuredClone(s.hand),count=G.deckCount(s);delete held[1].keep;s=G.endWeek(JSON.parse(JSON.stringify(s)));
  for(const c of held)assert.deepEqual(s.hand.find(x=>x.uid===c.uid),c);
  assert.deepEqual(s.hand.slice(0,held.length).map(c=>c.uid),held.map(c=>c.uid),'the cards that stay keep their places');
  assert.ok(s.hand.length<=G.handMax(s));assert.equal(G.deckCount(s),count);
 }
});
test('lab explicitly takes the selected hand UID and returns it once after research',()=>{
 for(const type of ['labCell','labTrait'] as const){
  let s=quiet();s.levels.lab=2;const card={uid:s.nextUid++,def:'seed_radish'};s.hand.push(card);
  const a:G.Action=type==='labCell'?{t:type,uid:card.uid,cell:G.upgradeSpots(s,card)[0]}:{t:type,uid:card.uid,trait:'fast'};
  s=G.apply(s,a);assert.equal(cards(s).filter(c=>c.uid===card.uid).length,0);
  assert.equal(s.projects.filter(p=>'card' in p&&p.card.uid===card.uid).length,1);
  assert.throws(()=>G.apply(s,a));
  for(let i=0;i<5;i++)s=G.endWeek(s);
  const returned=cards(s).filter(c=>c.uid===card.uid);assert.equal(returned.length,1);
  assert.ok(type==='labCell'?returned[0].extra?.length:returned[0].traits?.includes('fast'));
 }
});
test('damage trace separates protection, damage before harvest and complete theft',()=>{
 for(const kind of ['hail','thieves','crows'] as const){
  const s=quiet();const crop=kind==='crows'?'bean':'potato';const grown=kind==='crows'?2:3;
  const a=plant(s,1,1,crop,grown),b=plant(s,2,1,crop,grown);s.levels.greenhouse=1;G.tile(s,1,1).structure='greenhouse';
  if(kind==='hail')s.strikes=[{kind,ep:800,week:s.absWeek,cells:[[1,1,a.pid],[2,1,b.pid]],zone:false}];
  if(kind==='thieves')s.thieves={week:s.absWeek,targets:[{x:1,y:1,pid:a.pid},{x:2,y:1,pid:b.pid}],talked:false};
  if(kind==='crows')s.crows={week:s.absWeek,targets:[{x:1,y:1,pid:a.pid,type:'ripe'},{x:2,y:1,pid:b.pid,type:'ripe'}],shoo:false,drone:false};
  const n=G.endWeek(s),trace=n.lastReport!.fieldDamage!.filter(e=>e.kind===kind),steps=buildMorning(s,n).filter(e=>e.kind===kind);
  assert.equal(trace.length,1);assert.deepEqual([trace[0].x,trace[0].y],[2,1]);assert.equal(steps.length,1);assert.equal(steps[0].cells.length,1);
  assert.ok(n.lastReport!.harvests.some(h=>h.x===1&&h.y===1));
  if(kind==='thieves'){assert.equal(trace[0].after,null);assert.ok(!n.lastReport!.harvests.some(h=>h.x===2&&h.y===1));}
  else {assert.ok(trace[0].after);assert.ok(n.lastReport!.harvests.some(h=>h.x===2&&h.y===1));assert.equal(steps[0].cells[0].killed,false);}
 }
});
test('one paid side job per week survives save/load and does not charge rejected repeat',()=>{
 let s=quiet();s.days=12;s.hand=[{uid:s.nextUid++,def:'sidejob'},{uid:s.nextUid++,def:'sidejob'}];
 const first=s.hand[0].uid,second=s.hand[1].uid;const earned=G.sidejobPay(s),cash=s.money;
 s=G.apply(s,{t:'play',uid:first});assert.equal(s.money,cash+earned);
 s=JSON.parse(JSON.stringify(s));const snapshot=JSON.stringify(s);assert.throws(()=>G.apply(s,{t:'play',uid:second}),/неделе/);assert.equal(JSON.stringify(s),snapshot);
 s=G.endWeek(s);assert.ok(s.hand.some(c=>c.uid===second));assert.equal(G.cardBlockReason(s,s.hand.find(c=>c.uid===second)!),null);
});
test('acceptance never shifts offer deadline; ignored offers expire without relationship penalty',()=>{
 let s=quiet();const org=D.LOCATIONS[s.loc].orgs[0];const st=s.orgs[org]!;
 st.active=null;st.offer={id:999,org,step:0,title:'Контроль',text:'',lines:[{crop:'bean',qty:2}],pay:20,rel:10,weeks:4,createdWeek:s.absWeek-3,expires:s.absWeek+1};
 const before=s.absWeek;let n=G.apply(s,{t:'accept',org});assert.equal(n.orgs[org]!.active!.deadline,before+1);
 const rel=st.rel;n=G.endWeek(G.endWeek(s));assert.equal(n.orgs[org]!.rel,rel);assert.notEqual(n.orgs[org]!.offer?.id,999);
});
test('soil is spent on demanding crops, stays bounded and is not consumed by light crops',()=>{
 for(const crop of ['corn','cabbage','pumpkin','sunflower','radish','potato'] as D.CropId[])for(const soil of [1,4,5]){
  const s=quiet();s.temps.fill(24);const t=G.tile(s,1,1);plant(s,1,1,crop,D.CROPS[crop].grow-1);t.soil=soil;
  const n=G.endWeek(s);assert.ok(n.lastReport!.harvests.some(h=>h.x===1&&h.y===1),crop);
  assert.equal(G.tile(n,1,1).soil,Math.max(1,soil-G.soilHarvestCost(s,crop)),crop);
 }
});
