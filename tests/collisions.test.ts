import {test} from 'node:test';
import assert from 'node:assert/strict';
import {testFixture} from '../src/engine/testLab';
import {endWeek, type GameState} from '../src/engine/game';
import {buildWeekPlayback} from '../src/ui/weekPlayback';
import {crowMisses, kidMisses, pestMisses} from '../src/ui/collisions';
import {kidsScouting} from '../src/ui/foresight';

const at=(m:{x:number;y:number;cause:string}[])=>m.map(c=>`${c.x},${c.y}:${c.cause}`).sort();
test('a later trouble meets what an earlier one left: beetles, children and crows on emptied beds',()=>{
 const s=testFixture('collisions'),before=JSON.stringify(s),n=endWeek(s);
 assert.equal(JSON.stringify(s),before);
 assert.deepEqual(at(pestMisses(s,n)),['1,1:frost']);
 assert.deepEqual(at(kidMisses(s,n)),['1,1:frost','1,2:locust','2,1:dry']);
 assert.deepEqual(at(crowMisses(s,n)),['1,1:frost','2,1:dry']);
 const events=buildWeekPlayback(s,n),kinds=events.map(e=>e.morning?.kind??e.pests?.[0]?.kind??e.cue?.kind);
 // weather → bugs (hits, then the ones who found nothing) → children → crows (pecks, then the ones who found nothing)
 assert.deepEqual(kinds,['frost','dry','beetle','locust','bugmiss','thieves','crows','crowmiss']);
 const theft=events.find(e=>e.cue?.kind==='thieves')!.cue!;
 assert.deepEqual(theft.targets,[[2,2]]);assert.equal(theft.misses!.length,3);
 assert.deepEqual(theft.bugs!.map(String).sort(),['2,2','3,1']);
 assert(events.find(e=>e.morning?.kind==='crows')!.morning!.cells.every(c=>c.bugs));
 // every child goes to a bed of their own: one steals, three meet what is left
 assert.equal(new Set([...theft.targets!.map(String),...theft.misses!.map(m=>`${m.x},${m.y}`)]).size,4);
});
test('nothing stolen: every child meets an emptied bed, the named ones get their own reaction',()=>{
 const s=testFixture('emptyraid'),n=endWeek(s);
 assert.deepEqual(at(kidMisses(s,n)),['1,1:dry','2,2:locust']);
 const cue=buildWeekPlayback(s,n).find(e=>e.cue?.kind==='thieves')!.cue!;
 assert.equal(cue.visit!.outcome,'empty');assert.equal(cue.misses!.length,2);
});
test('the plain chain has no misses: hail and chewing leave the plant for the next visitor',()=>{
 const s=testFixture('eventchain'),n=endWeek(s);
 assert.equal(pestMisses(s,n).length+kidMisses(s,n).length+crowMisses(s,n).length,0);
});
test('the week before a raid the children are seen; in the raid week and with nothing ripe they are not',()=>{
 const s=testFixture('scouts');
 assert.equal(kidsScouting(s),true);
 const next=endWeek(s);assert(next.thieves&&next.thieves.week===next.absWeek);
 assert.equal(kidsScouting(next),false);
 const bare:GameState=JSON.parse(JSON.stringify(s));for(const t of bare.tiles)t.crop=null;
 assert.equal(kidsScouting(bare),false);
});
