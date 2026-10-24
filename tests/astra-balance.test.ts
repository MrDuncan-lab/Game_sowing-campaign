import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine/game';
import {testDate} from '../src/engine/testLab';
import {saveFarm,loadFarm} from '../src/ui/persist';
const saved=new Map<string,string>();
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>saved.get(k)??null,setItem:(k:string,v:string)=>saved.set(k,v),removeItem:(k:string)=>saved.delete(k)}});

function winter(){
 const s=G.newGame({loc:'chernozem',seed:'ASTRA-WATER'});testDate(s,3);
 s.money=10000;s.temps.fill(-10);s.plan=[];s.strikes=[];s.crows=null;s.thieves=null;s.flags={rain:false,dry:false,warm:false};s.levels.greenhouse=3;
 for(const t of s.tiles){t.crop=null;t.moisture=0;t.structure=null;t.drip=false;}
 const t=G.tile(s,2,2);t.structure='greenhouse';t.crop={id:'tomato',pid:s.nextPid++,grown:0,mult:1,bonus:0,planted:s.absWeek,dry:1};
 return s;
}

test('Altai forage pays its original first yield, rejects repeats atomically across real save/load, and resets next week',()=>{
 let s=G.newGame({loc:'altai',seed:'ASTRA-FORAGE'});testDate(s,1);s.money=10000;
 s.hand=[{uid:s.nextUid++,def:'forage'},{uid:s.nextUid++,def:'forage'}];
 const [first,second]=s.hand,days=s.days,edge=G.ownedTiles(s).filter(([,x,y])=>G.nearTerrain(s,x,y,'forest')).length;
 s=G.apply(s,{t:'play',uid:first.uid});const amount=G.stockOf(s,'mushrooms'),base=3+Math.min(5,Math.floor(edge/2));
 assert.ok(amount===base||amount===base+1);assert.equal(s.days,days-1);
 assert.equal(saveFarm(s),true);s=loadFarm(s.loc)!;const snapshot=JSON.stringify(s);
 assert.match(G.cardBlockReason(s,second)!,/неделе/);assert.throws(()=>G.apply(s,{t:'play',uid:second.uid}),/неделе/);assert.equal(JSON.stringify(s),snapshot);
 s=G.apply(s,{t:'keepCard',uid:second.uid});s=G.endWeek(s);assert.equal(G.cardBlockReason(s,second),null);s=G.apply(s,{t:'play',uid:second.uid});assert.equal(s.forageWeek,s.absWeek);
});

test('sprinklers, automation and a skilled irrigator sustain heated greenhouse growth in winter',()=>{
 for(const source of ['sprinkler','automatic','worker'] as const){
  const s=winter();if(source==='worker')s.team=[{id:'irrigator',level:3,away:0}];else s.levels.irrigation=source==='sprinkler'?3:4;
  const before=JSON.stringify(s),moisture=G.growthMoisture(s);assert.equal(JSON.stringify(s),before);
  assert.ok(moisture[G.idx(2,2)]>=1,source);assert.equal(G.growNote(s,2,2),null,source);
  const n=G.endWeek(s);assert.equal(G.tile(n,2,2).crop?.grown,1,source);assert.equal(G.tile(n,2,2).crop?.dry,0,source);assert.equal(n.lastReport!.dried,0,source);
 }
});

test('winter automatic water leaves outdoor and unheated beds frozen; rain and rivers do not water heated greenhouse',()=>{
 const s=winter();s.flags.rain=true;G.tile(s,1,2).terrain='river';s.levels.irrigation=0;
 assert.equal(G.growthMoisture(s)[G.idx(2,2)],0);
 s.levels.irrigation=4;s.team=[{id:'irrigator',level:3,away:0}];
 G.tile(s,3,2).crop={id:'rye',pid:s.nextPid++,grown:0,mult:1,bonus:0,planted:s.absWeek};
 assert.equal(G.growthMoisture(s)[G.idx(3,2)],0);
 s.levels.greenhouse=2;assert.equal(G.growthMoisture(s)[G.idx(2,2)],0);
});

test('irrigator targets up to three active crops and ignores resting perennial plants',()=>{
 const s=G.newGame({loc:'chernozem',seed:'ASTRA-WORKER'});s.team=[{id:'irrigator',level:3,away:0}];s.flags={rain:false,dry:false,warm:false};
 const owned=G.ownedTiles(s);for(const [t] of owned){t.moisture=0;t.crop={id:'strawberry',pid:s.nextPid++,grown:0,mult:1,bonus:0,planted:s.absWeek,rest:true};}
 const growing=owned.slice(-4);for(const [t] of growing)t.crop!.rest=false;
 const m=G.growthMoisture(s);assert.equal(growing.filter(([,x,y])=>m[G.idx(x,y)]===2).length,3);
 for(const [t,x,y] of owned)if(t.crop!.rest)assert.equal(m[G.idx(x,y)],0);
});

