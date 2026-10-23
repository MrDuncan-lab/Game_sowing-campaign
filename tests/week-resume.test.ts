import {test} from 'node:test';
import assert from 'node:assert/strict';
import {testFixture} from '../src/engine/testLab';
import {endWeek} from '../src/engine/game';
import {buildWeekPlayback} from '../src/ui/weekPlayback';
import {readWeekResume,saveWeekResume,clearWeekResume,type WeekResume} from '../src/ui/weekResume';

test('visual resume retains progress without changing committed farm state and expires on the next week',()=>{
 const memory=new Map<string,string>();
 const old=globalThis.sessionStorage;
 Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>memory.set(k,v),removeItem:(k:string)=>memory.delete(k)}});
 try{
  const prev=testFixture('eventchain'),next=endWeek(prev),before=JSON.stringify(next);
  const r:WeekResume={version:1,prev,next,events:buildWeekPlayback(prev,next),elapsed:1200,hidden:prev.tiles.map((t,i)=>[`${i%6},${Math.floor(i/6)}`,t])};
  saveWeekResume(r);assert.deepEqual(readWeekResume(next),JSON.parse(JSON.stringify(r)));assert.equal(JSON.stringify(next),before);
  assert.equal(readWeekResume({...next,absWeek:next.absWeek+1}),null);assert.equal(memory.size,0);
  saveWeekResume(r);clearWeekResume(next);assert.equal(readWeekResume(next),null);
  saveWeekResume({...r,hidden:r.hidden.slice(1)});assert.equal(readWeekResume(next),null);
  saveWeekResume({...r,elapsed:Infinity});assert.equal(readWeekResume(next),null);
  saveWeekResume({...r,hidden:r.hidden.map((v,i)=>i===0?[v[0],{...v[1],crop:{id:'invalid'} as any}]:v)});assert.equal(readWeekResume(next),null);
 }finally{Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:old});}
});
