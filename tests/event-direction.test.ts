import {test} from 'node:test';
import assert from 'node:assert/strict';
import {testFixture} from '../src/engine/testLab';
import {endWeek,tile,weekOutlook, type GameState} from '../src/engine/game';
import {buildWeekPlayback,THEFT_IMPACT_MS, theftDelay} from '../src/ui/weekPlayback';
import {validFarm} from '../src/ui/persist';

const visit=(s:GameState)=>s.scenes?.find(e=>e.kind==='thieves')?.visit;
test('weather resolves before beetles regardless of stored strike order; children precede birds',()=>{
 for(const reversed of [false,true]){
  const s=testFixture('eventchain');if(reversed)s.strikes.reverse();
  const before=JSON.stringify(s),n=endWeek(s),r=n.lastReport!;
  const hail=r.fieldDamage!.find(d=>d.kind==='hail')!;
  assert.equal(hail.before.mult,1);assert(!hail.before.chewed);
  assert.equal(r.pestHits![0].plant.mult,.5);assert.equal(r.pestHits![0].after!.mult,.25);
  const theft=r.fieldDamage!.find(d=>d.kind==='thieves')!;
  assert.equal(theft.before.mult,.25);assert(theft.before.chewed);
  const events=buildWeekPlayback(s,n),kinds=events.map(e=>e.morning?.kind??e.pests?.[0]?.kind??e.cue?.kind);
  assert.deepEqual(kinds,['hail','beetle','thieves','crows']);
  assert.equal(JSON.stringify(s),before);assert(validFarm(n));
 }
});
test('children shoo shared-target birds; other birds still act, without double-counting lost crops',()=>{
 const s=testFixture('crowraid'),n=endWeek(s),r=n.lastReport!;
 assert.deepEqual(visit(n)?.crows,[[1,1]]);assert.equal(visit(n)?.outcome,'stolen');
 assert.equal(r.stolen,2);
 assert.deepEqual(r.fieldDamage!.filter(d=>d.kind==='crows').map(d=>[d.x,d.y]),[[1,2]]);
 assert.equal(r.fieldDamage!.find(d=>d.kind==='thieves'&&d.x===1)!.before.mult,1);
 const e=buildWeekPlayback(s,n).find(e=>e.cue?.kind==='thieves')!;
 assert.equal(e.morning!.reveal,(THEFT_IMPACT_MS+500)/1.6);assert.equal(theftDelay(e.cue),500);
});
test('destroyed targets yield an empty-handed visit after the damage, no theft report or hidden victims',()=>{
 const s=testFixture('emptyraid'),n=endWeek(s),r=n.lastReport!,v=visit(n)!;
 assert.equal(v.outcome,'empty');assert.equal(r.stolen,0);assert.equal(v.crows.length,0);
 assert(!r.fieldDamage?.some(d=>d.kind==='thieves'));
 const events=buildWeekPlayback(s,n);assert.deepEqual(events.map(e=>e.morning?.kind??e.pests?.[0]?.kind??e.cue?.kind),['dry','locust','thieves']);
 assert.equal(events.at(-1)!.morning,undefined);assert.deepEqual(events.at(-1)!.cue!.targets,v.targets);
 assert(r.harvests.length>0);assert(validFarm(JSON.parse(JSON.stringify(n))));
});
test('a partially destroyed raid targets only surviving matching plants',()=>{
 const s=testFixture('crowraid');tile(s,2,2).moisture=0;tile(s,2,2).crop!.dry=1;
 const n=endWeek(s);assert.deepEqual(visit(n)?.targets,[[1,1]]);assert.equal(n.lastReport!.stolen,1);
});
test('replacing a targeted plant never allows children to steal the replacement',()=>{
 const s=testFixture('crowraid');for(const g of s.thieves!.targets)tile(s,g.x,g.y).crop!.pid=s.nextPid++;
 const n=endWeek(s);assert.equal(n.lastReport!.stolen,0);assert.equal(visit(n)?.outcome,'empty');
});
test('global and local protection still prevent theft and retain their defense scenes',()=>{
 for(const defense of ['dog','watchman','greenhouse','guard'] as const){
  const s=testFixture('crowraid');
  if(defense==='dog')s.pets.push('dog');
  if(defense==='watchman')s.team.push({id:'watchman',level:1,away:0});
  if(defense==='guard')s.levels.guard=3;
  if(defense==='greenhouse')for(const g of s.thieves!.targets)tile(s,g.x,g.y).structure='greenhouse';
  const n=endWeek(s);assert.equal(n.lastReport!.stolen,0,defense);assert(!visit(n)?.crows.length);
  if(defense!=='greenhouse')assert(n.scenes?.some(e=>e.kind===(defense==='dog'?'dogThieves':'watchman')));
 }
});
test('scene metadata accepts older saves and validates newly recorded targets',()=>{
 const n=endWeek(testFixture('crowraid'));assert(validFarm(n));
 const cue=n.scenes!.find(e=>e.visit)!;cue.visit!.crows=[[100,1]];assert(!validFarm(n));delete cue.visit;assert(validFarm(n));
});
test('outlook and actual resolution agree on harvest despite overlapping events',()=>{
 const s=testFixture('eventchain');const o=weekOutlook(s),n=endWeek(s);
 // The predictor must use the same engine order and remain non-mutating.
 assert.equal(o.thieves,n.lastReport!.stolen);assert.equal(o.ripe,n.lastReport!.harvests.length);assert.equal(visit(n)!.crows.length,1);
});
