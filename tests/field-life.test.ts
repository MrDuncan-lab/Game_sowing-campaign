import {test} from 'node:test';
import assert from 'node:assert/strict';
import {testFixture} from '../src/engine/testLab';
import {apply,endWeek,tile,expectedYield,GameState} from '../src/engine/game';
import {saveFarm,loadFarm} from '../src/ui/persist';
import {camera} from '../src/ui/Scene';
import {petMoment} from '../src/ui/petMotion';
const saved=new Map<string,string>();
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>saved.get(k)??null,setItem:(k:string,v:string)=>saved.set(k,v)}});
function quiet(s:GameState){for(const o of Object.values(s.orgs))if(o)o.wait=1000;return s;}
test('beetle report records real damage without destroying potatoes, with or without hedgehog',()=>{
 for(const hedge of [false,true]){
  const s=quiet(testFixture('beetle'));if(hedge)s.pets=['hedgehog'];const before=JSON.stringify(s),n=endWeek(s),hits=n.lastReport!.pestHits!;
  assert.equal(hits.length,4);for(const h of hits){assert.equal(h.kind,'beetle');assert.equal(h.plant.mult,1);assert.equal(tile(n,h.x,h.y).crop!.mult,hedge?.75:.5);assert.ok(tile(n,h.x,h.y).crop!.chewed);assert.ok(h.lost>0);}
  assert.equal(JSON.stringify(s),before);assert.ok(saveFarm(n));assert.deepEqual(loadFarm(n.loc)!.lastReport!.pestHits,hits);
 }
});
test('locust bites only actual unprotected targets; greenhouse and a manual guard remain intact',()=>{
 let s=quiet(testFixture('locust'));s.levels.greenhouse=1;tile(s,1,1).structure='greenhouse';s=apply(s,{t:'guard',x:2,y:1});
 const n=endWeek(s),hits=n.lastReport!.pestHits!;assert.deepEqual(hits.map(h=>[h.x,h.y]),[[1,2],[2,2]]);
 for(const h of hits){assert.equal(h.kind,'locust');assert.equal(tile(n,h.x,h.y).crop,null);assert.equal(h.lost,expectedYield(s,h.x,h.y));}
 assert.ok(tile(n,1,1).crop);assert.ok(tile(n,2,1).crop);
});
test('drone protection creates no false bite animation or chewed marks',()=>{
 const n=endWeek(quiet(testFixture('drone')));assert.equal(n.lastReport!.pestHits?.length??0,0);assert.ok(n.tiles.filter(t=>t.crop).every(t=>!t.crop!.chewed));assert.ok(n.scenes?.some(e=>e.kind==='drone'));
});
test('geese scene identifies the bed they actually weeded and records no imaginary work',()=>{
 const s=quiet(testFixture('weeds')),n=endWeek(s),scene=n.scenes!.find(e=>e.kind==='geese')!;assert.ok(scene.at);const[x,y]=scene.at;assert.equal(tile(s,x,y).weeds,true);assert.equal(tile(n,x,y).weeds,false);
 assert.ok(saveFarm(n));assert.deepEqual(loadFarm(n.loc)!.scenes,n.scenes);
 for(const t of s.tiles)t.weeds=false;s.scenes=[];assert.equal(endWeek(s).scenes?.filter(e=>e.kind==='geese').length??0,0);
});
test('old saves without aftermath remain loadable and malformed hits cannot poison a save',()=>{
 const s=quiet(testFixture('beetle'));assert.ok(saveFarm(s));assert.ok(loadFarm(s.loc));
 const n=endWeek(s);n.lastReport!.pestHits![0].x=999;assert.equal(saveFarm(n),false);
});
test('pet cycle contains rest, walking and sniffing with continuous cyclic positions',()=>{
 for(const loc of ['chernozem','kuban','altai'] as const)for(const id of ['cat','dog'] as const){
  const cam=camera(testFixture('pets',loc)),poses=new Set<string>();let prev=petMoment(cam,id,0);
  for(let i=0;i<=1080;i++){const v=petMoment(cam,id,i/10);poses.add(v.pose);assert.ok(v.x>=0&&v.x<=cam.W&&v.y>=0&&v.y<=cam.H);assert.ok(Math.hypot(v.x-prev.x,v.y-prev.y)<12);prev=v;}
  assert.ok(poses.has('walk')&&poses.has('sit')&&poses.has('sniff'));assert.deepEqual(petMoment(cam,id,0),petMoment(cam,id,108));
 }
});
