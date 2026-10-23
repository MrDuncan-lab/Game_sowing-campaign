import {test} from 'node:test';
import assert from 'node:assert/strict';
import {apply,newGame,tile,workCardPreview,workEffectCells,expectedYield,plantingYield,cardNeedDays,handWaterMax,waterArea} from '../src/engine/game';
import type {GameState} from '../src/engine/game';
function base(){const s=newGame({loc:'chernozem',seed:'interface-regression'});s.money=100;s.days=10;s.hand=[];s.plan=[];s.temps.fill(20);s.strikes=[];s.crows=null;s.thieves=null;s.flags={rain:false,warm:false,dry:false};for(const t of s.tiles)Object.assign(t,{owned:true,terrain:'plain',soil:2,moisture:2,crop:null,weeds:false,structure:null});return s;}
function card(s:GameState,def:string){const c={uid:s.nextUid++,def};s.hand.push(c);return c;}
function plant(s:GameState,x:number,y:number,pid=1){tile(s,x,y).crop={id:'wheat',pid,planted:s.absWeek,grown:0,mult:1,bonus:0};s.nextPid=Math.max(s.nextPid,pid+1);}
test('max fertility rejects compost and bio atomically; a rich anchor may still improve neighbours',()=>{
 for(const def of ['compost','bio']){const s=base();s.tiles.forEach(t=>t.soil=5);const c=card(s,def),before=JSON.stringify(s);assert.throws(()=>apply(s,{t:'play',uid:c.uid,tiles:[[2,2]]}),/5\/5/);assert.equal(JSON.stringify(s),before);tile(s,3,2).soil=3;const pv=workCardPreview(s,c,2,2);assert.deepEqual(pv.cells,[[3,2]]);const n=apply(s,{t:'play',uid:c.uid,tiles:[[2,2]]});assert.equal(tile(n,3,2).soil,4);assert.equal(n.days,s.days-1);}
});
test('winter fertilizer preview and effect share eligible beds, including repeat after moving a greenhouse',()=>{
 let s=base();plant(s,2,2);plant(s,3,2);tile(s,2,2).structure='greenhouse';tile(s,1,1).structure='greenhouse';s.levels.greenhouse=3;s.season=3;
 let c=card(s,'fertilizer');let pv=workCardPreview(s,c,2,2);assert.deepEqual(pv.cells,[[2,2]]);s=apply(s,{t:'play',uid:c.uid,tiles:[[2,2]]});assert.equal(expectedYield(s,2,2),pv.after);assert.equal(tile(s,3,2).crop!.mult,1);
 s=apply(s,{t:'moveBuild',item:'greenhouse',from:[1,1],to:[3,2]});c=card(s,'fertilizer');pv=workCardPreview(s,c,3,2);assert.deepEqual(pv.cells,[[3,2]]);s=apply(s,{t:'play',uid:c.uid,tiles:[[3,2]]});assert.equal(expectedYield(s,3,2),pv.after);assert.equal(tile(s,2,2).crop!.mult,1.5);assert.equal(tile(s,3,2).crop!.mult,1.5);
 c=card(s,'fertilizer');assert.throws(()=>apply(s,{t:'play',uid:c.uid,tiles:[[2,2]]}));
});
test('per-target fertilizer affordability is honest while minimum cost remains usable',()=>{
 const s=base();plant(s,1,1,1);for(const [x,y]of [[2,2],[3,2],[2,3],[3,3]])plant(s,x,y,2);s.days=1;const c=card(s,'fertilizer');assert.equal(cardNeedDays(s,c),1);assert.equal(workCardPreview(s,c,1,1).reason,null);assert.match(workCardPreview(s,c,2,2).reason!,/Нужно 2/);const before=JSON.stringify(s);assert.throws(()=>apply(s,{t:'play',uid:c.uid,tiles:[[2,2]]}),/Нужно 2/);assert.equal(JSON.stringify(s),before);
});
test('water card can use a full centre with dry neighbours; fully watered area is rejected',()=>{
 const s=base();s.tiles.forEach(t=>t.moisture=3);tile(s,3,2).moisture=0;const c=card(s,'water');assert.deepEqual(workEffectCells(s,'water',2,2),[[3,2]]);let n=apply(s,{t:'play',uid:c.uid,tiles:[[2,2]]});assert.equal(tile(n,3,2).moisture,2);n.tiles.forEach(t=>t.moisture=3);const c2=card(n,'water');assert.throws(()=>apply(n,{t:'play',uid:c2.uid,tiles:[[2,2]]}),/политы/);
});
test('manual watering preserves costs and hose bonus but changes only explicitly selected beds',()=>{
 const s=base();assert.equal(handWaterMax(s),2);let n=apply(s,{t:'waterHand',tiles:[[1,1],[1,2]]});assert.equal(n.days,s.days-1);assert.equal(tile(n,1,1).moisture,3);assert.equal(tile(n,1,2).moisture,3);assert.equal(tile(n,2,1).moisture,2);assert.throws(()=>apply(n,{t:'waterHand',tiles:[[1,1],[1,2]]}),/уже политы/);assert.throws(()=>apply(s,{t:'waterHand',tiles:[[1,1],[3,3]]}),/линию/);s.levels.irrigation=1;assert.equal(handWaterMax(s),3);n=apply(s,{t:'waterHand',tiles:[[1,1],[1,2],[1,3]]});assert.equal(n.days,s.days-1);
});
test('soil scientist caps actual effects at five and does not change planted growth',()=>{
 const s=base();s.team=[{id:'soilsci',level:2,away:0}];plant(s,2,2);tile(s,2,2).soil=4;const c=card(s,'bio');const n=apply(s,{t:'play',uid:c.uid,tiles:[[2,2]]});assert.equal(tile(n,2,2).soil,5);assert.equal(tile(n,3,2).soil,4);assert.equal(tile(n,2,2).crop!.grown,0);
});
test('payment block uses requested text and an already funded payment cannot create a negative emergency loan',()=>{
 const s=base();s.phase='shortfall';s.due={amount:32,name:'Test'};s.money=50;assert.throws(()=>apply(s,{t:'waterHand',tiles:[[1,1]]}),/Вы не можете это сделать, не решив вопрос с платежом/);assert.throws(()=>apply(s,{t:'emergency'}),/уже хватает/);
});
