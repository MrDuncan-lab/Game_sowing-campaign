import {test} from 'node:test';
import assert from 'node:assert/strict';
import {testFixture} from '../src/engine/testLab';
import {endWeek, type GameState} from '../src/engine/game';
import {buildWeekPlayback, SCENE_MS, THEFT_IMPACT_MS} from '../src/ui/weekPlayback';
import {validFarm} from '../src/ui/persist';
import {morningCellDelay} from '../src/ui/Morning';
const quiet=(s:GameState)=>{for(const o of Object.values(s.orgs))if(o)o.wait=1000;return s;};

test('morning layers outlive the last staggered bird or weather animation',()=>{
 for(const id of ['crows','frost','hail','drought','flood'] as const){
  const s=quiet(testFixture(id)),events=buildWeekPlayback(s,endWeek(s));
  const layers=events.filter(e=>e.morning);assert(layers.length>0,id);
  for(const e of layers){const m=e.morning!;for(let i=0;i<m.cells.length;i++){
   assert(e.duration>=m.dur+morningCellDelay(i),`${id}: layer cut off bed ${i}`);
   assert(m.reveal+morningCellDelay(i)<e.duration,`${id}: impact outside layer`);
  }}
 }
});
test('theft damage and actors share one step, impact occurs while the actors are taking crops',()=>{
 const s=quiet(testFixture('thieves')),n=endWeek(s),before=JSON.stringify(n);
 const events=buildWeekPlayback(s,n),theft=events.filter(e=>e.cue?.kind==='thieves');
 assert.equal(theft.length,1);assert.equal(theft[0].morning?.kind,'thieves');
 assert.equal(theft[0].morning?.reveal,THEFT_IMPACT_MS/1.6);
 // Four children leave at 5.00, 5.15, 5.30 and 5.45 native seconds.
 assert(theft[0].duration>=5450/1.6,'last child clipped before completing its route');
 assert(theft[0].duration<5800/1.6,'unnecessary wait after departure');
 assert.deepEqual(theft[0].cue?.targets,n.lastReport?.fieldDamage?.map(e=>[e.x,e.y]));
 assert.equal(JSON.stringify(n),before);
});
test('protected ripe plants get a defense scene before visual harvest, without any theft impact',()=>{
 for(const id of ['dog','watchman'] as const){
  const s=quiet(testFixture(id));s.tiles.forEach(t=>{if(t.crop)t.crop.grown=3;});
  const n=endWeek(s),events=buildWeekPlayback(s,n);
  assert.equal(n.lastReport!.stolen,0);assert(n.lastReport!.harvests.length>0);
  assert(events.some(e=>e.cue?.kind===(id==='dog'?'dogThieves':'watchman')));
  assert(!events.some(e=>e.morning?.kind==='thieves'));
 }
});
test('a partly played guard continues its remaining time, not a new five second chase',()=>{
 const s=quiet(testFixture('dog'));s.scenes=[{id:`${s.absWeek}:dogThieves`,kind:'dogThieves',week:s.absWeek}];
 const e=buildWeekPlayback(s,endWeek(s),1.6,[{...s.scenes[0],elapsed:1600}]).find(e=>e.cue?.kind==='dogThieves')!;
 assert.equal(e.duration,(SCENE_MS-1600)/1.6);assert.equal(e.cue?.elapsed,1600);
 const n=endWeek(s);n.scenes!.push({id:'new-drone',kind:'drone',week:n.absWeek});
 const ordered=buildWeekPlayback(s,n,1.6,[{...s.scenes[0],elapsed:1600}]);
 assert.equal(ordered[0].cue?.kind,'dogThieves');assert.equal(ordered[1].cue?.kind,'drone');
});
test('pest report preserves the real intermediate plant before a later harvest',()=>{
 const s=quiet(testFixture('beetle'));s.tiles.forEach(t=>{if(t.crop)t.crop.grown=3;});
 const n=endWeek(s),hits=n.lastReport!.pestHits!;
 assert(n.lastReport!.harvests.length>0);
 for(const hit of hits){assert(hit.after);assert.equal(hit.after.mult,.5);assert.equal(hit.after.chewed,true);assert.equal(hit.plant.mult,1);}
 const events=buildWeekPlayback(s,n);assert.equal(events.filter(e=>e.pests).length,1);
});
test('climate, pests and thieves follow one ordered sequence and do not duplicate actors',()=>{
 const s=quiet(testFixture('thieves'));s.strikes=[{kind:'beetle',ep:901,week:s.absWeek,cells:[[1,1,s.tiles[7].crop!.pid]],zone:false}];
 const n=endWeek(s),events=buildWeekPlayback(s,n);
 assert(events.findIndex(e=>e.pests)<events.findIndex(e=>e.cue?.kind==='thieves'));
 assert.equal(events.filter(e=>e.cue?.kind==='thieves').length,1);
});
test('optional pest snapshots remain compatible with old saves and reject malformed new data',()=>{
 const n=endWeek(quiet(testFixture('beetle')));
 assert(validFarm(n));delete n.lastReport!.pestHits![0].after;assert(validFarm(n));
 n.lastReport!.pestHits![0].after={id:'nonexistent'} as any;assert(!validFarm(n));
});
