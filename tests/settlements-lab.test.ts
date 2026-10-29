// 29.10 · the test mode's «Поселения»: every place's rule has a ready farm, and each one does what its card says.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine/game';
import * as R from '../src/engine/run';
import {SETTLEMENT_TESTS,settlementFixture,visitorLoc} from '../src/engine/testLab';

test('every settlement scenario builds a farm of its own region and lives through a week',()=>{
 const ids=new Set<string>();
 for(const t of SETTLEMENT_TESTS){
  assert.ok(!ids.has(t.id),t.id);ids.add(t.id);
  assert.ok(t.when&&t.how&&t.why,`${t.id}: когда / как / зачем`);
  const s=settlementFixture(t.id);
  if(t.id!=='visitor')assert.equal(s.loc,t.loc,t.id);
  assert.equal(!!s.run,s.loc!=='chernozem',t.id);
  if(s.phase==='week')assert.doesNotThrow(()=>G.endWeek(structuredClone(s)),t.id);
 }
});

test('home: the third autumn buys the house out, the square and the club hold the harvest show, the chronicle closes',()=>{
 let s=settlementFixture('home-buyout');assert.ok(!s.owned);
 s=G.endWeek(s);assert.ok(s.owned,'дом выкуплен');
 s=G.endWeek(settlementFixture('home-show'));
 const show=s.fests?.find(f=>f.year===s.year);assert.ok(show&&!G.festInClub(show),'смотр на площади');
 s=G.endWeek(settlementFixture('home-festival'));
 const fest=s.fests?.find(f=>f.year===s.year);assert.ok(fest&&G.festInClub(fest),'праздник в клубе');
 s=settlementFixture('home-chronicle');assert.ok(G.chronicleDone(s));
 s=G.endWeek(s);assert.ok(s.told?.includes('epilogue'),'эпилог');
});

test('home: the bank and the arrest are the two ends of a missed payment',()=>{
 assert.equal(settlementFixture('home-bank').phase,'gameover');
 const a=settlementFixture('arrest');assert.equal(a.phase,'arrest');assert.ok(a.arrest!.runs>0);
});

test('expeditions: the troubles are announced for this week, the fold is open after an autumn',()=>{
 for(const [id,kind] of [['kuban-boars','boars'],['altai-bear','bear'],['altai-fire','fire']] as const){
  const s=settlementFixture(id);
  assert.ok(s.strikes.some(k=>k.kind===kind&&k.cells.length>0),id);
  assert.ok(s.plan.some(e=>e.kind===kind&&e.start===s.absWeek),id);
 }
 const w=settlementFixture('kuban-wind');assert.ok(w.plan.some(e=>e.kind==='sukhovey'&&e.start===w.absWeek));
 assert.equal(G.foldProblem(settlementFixture('kuban-fold')),null);
 assert.equal(settlementFixture('rent-inspection').run!.visit!.id,'inspection');
});

test('every visitor can be met in the test mode, in its own region, with its choices',()=>{
 for(const id of R.VISIT_IDS){
  const s=settlementFixture('visitor',id);
  assert.equal(s.loc,visitorLoc(id),id);assert.equal(s.run!.visit!.id,id);
  assert.ok(G.visitOptions(s).length>0,id);
 }
});

test('a visitor met in the test mode is the week\'s guest: it does not come back the next week',()=>{
 for(const id of R.VISIT_IDS){
  const s=G.endWeek(settlementFixture('visitor',id));
  assert.notEqual(s.run!.visit?.id,id,id);
 }
 assert.notEqual(G.endWeek(settlementFixture('rent-inspection')).run!.visit?.id,'inspection');
});

test('the scenarios show only their own story; the bear is not driven off by a find; the cranberry has a bog',()=>{
 for(const t of SETTLEMENT_TESTS)if(t.id!=='home-start')assert.equal(settlementFixture(t.id).beats?.length??0,0,t.id);
 assert.ok(settlementFixture('home-start').beats?.some(b=>b.id==='start'));
 assert.ok(!settlementFixture('altai-bear').run!.relics.includes('laika'));
 const taiga=settlementFixture('altai-taiga');
 assert.ok(taiga.hand.some(c=>c.def==='seed_cranberry'));
 assert.ok(G.ownedTiles(taiga).filter(([t])=>t.terrain==='swamp').length>=2);
 for(const l of ['rent','kuban','altai'] as const)assert.equal(settlementFixture(`run-${l}`).loc,l);
});
