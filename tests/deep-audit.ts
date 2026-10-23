import * as G from '../src/engine/game';
import * as D from '../src/engine/data';
import {buildMorning} from '../src/ui/Morning';
import {testFixture,testDate,TEST_SCENARIOS} from '../src/engine/testLab';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const out:any={fixtures:[],hand:[],morning:[],forecasts:[],orders:[]};
for(const loc of D.LOCATION_IDS)for(const[id]of TEST_SCENARIOS){
 const s=testFixture(id,loc),before=JSON.stringify(s);
 try{let n=s.phase==='shortfall'?s:G.apply(s,{t:'endWeek'});assert.equal(JSON.stringify(s),before);assert.ok(Number.isFinite(n.money));assert.ok(n.hand.length<=G.handMax(n));out.fixtures.push({id,loc,phase:n.phase,report:n.lastReport,steps:buildMorning(s,n)});}catch(e){out.fixtures.push({id,loc,error:String(e)});}
}
for(const loc of D.LOCATION_IDS)for(let season=0;season<4;season++)for(const boundary of [false,true]){
 let s=testFixture('normal',loc);testDate(s,season);s.money=100000;s.temps.fill(20);s.plan=[];
 if(boundary){const add=D.LOCATIONS[loc].seasons[season]-1;s.week+=add;s.absWeek+=add;s.weekInSeason+=add;}
 while(s.hand.length<G.handMax(s))G.drawCards(s,1);
 const uids=s.hand.map(c=>c.uid);const n=G.endWeek(s);
 out.hand.push({loc,season,boundary,before:uids,retained:n.hand.filter(c=>uids.includes(c.uid)).length,after:n.hand.map(c=>c.uid)});
}
function rig(){const s=testFixture('fertilizers');testDate(s,1);s.temps.fill(20);s.money=10000;s.plan=[];s.flags={warm:false,dry:false,rain:false};s.strikes=[];for(const t of s.tiles){t.crop=null;t.moisture=3;t.structure=null;t.soil=3;}return s;}
function plant(s:G.GameState,x:number,y:number,id:D.CropId,grown:number){const t=G.tile(s,x,y);t.owned=true;t.crop={id,pid:s.nextPid++,mult:1,bonus:0,planted:s.absWeek,grown};return t.crop;}
function sample(id:string,s:G.GameState){const n=G.endWeek(s);const item={id,before:s,after:n,steps:buildMorning(s,n)};out.morning.push({id,steps:item.steps,harvests:n.lastReport?.harvests,lost:n.lastReport?.lost,stolen:n.lastReport?.stolen});return item;}
const browserFixtures:any={};
{
 const s=rig(),c=plant(s,1,1,'potato',3);s.levels.greenhouse=1;G.tile(s,1,1).structure='greenhouse';s.strikes=[{kind:'hail',ep:800,week:s.absWeek,cells:[[1,1,c.pid]],zone:false}];
 browserFixtures.hailHarvest=sample('hail on protected ripe potato',s).before;
}
{
 const s=rig(),c=plant(s,1,1,'bean',2);s.crows={week:s.absWeek,targets:[{x:1,y:1,pid:c.pid,type:'ripe'}],shoo:false,drone:false};
 browserFixtures.crowsHarvest=sample('crows peck ripe bean then harvest',s).before;
}
{
 const s=rig(),a=plant(s,1,1,'potato',3),b=plant(s,2,1,'potato',2);s.levels.greenhouse=1;G.tile(s,1,1).structure='greenhouse';s.thieves={week:s.absWeek,targets:[{x:1,y:1,pid:a.pid},{x:2,y:1,pid:b.pid}],talked:false};
 browserFixtures.thiefHarvest=sample('thieves steal one, protected other is harvested',s).before;
}
{
 const s=rig(),c=plant(s,1,1,'potato',3);s.strikes=[{kind:'hail',ep:800,week:s.absWeek,cells:[[1,1,c.pid]],zone:false}];browserFixtures.hailDamage=sample('hail damages ripe potato then harvest',s).before;
}
// Forecast calibration: no selling, no upgrades or relationship changes; ample cash isolates prices.
for(const precise of [false,true])for(const loc of D.LOCATION_IDS){
 const stats=new Map<number,{n:number,inBand:number,error:number,width:number}>();
 for(let seed=0;seed<6;seed++){
  let s=G.newGame({loc,seed:'FORECAST-AUDIT-'+seed});s.money=1000000;if(precise)s.levels.meteo=3;
  const pending:{week:number;crop:D.CropId;f:G.Forecast}[]=[];
  for(let w=0;w<48;w++){
   for(const p of pending.filter(p=>p.week===s.absWeek)){
    const actual=G.marketPrice(s,p.crop),r=stats.get(p.f.offset)||{n:0,inBand:0,error:0,width:0};r.n++;r.inBand+=Number(actual>=p.f.low&&actual<=p.f.high);r.error+=Math.abs(actual-p.f.price)/Math.max(.01,actual);r.width+=(p.f.high-p.f.low)/Math.max(.01,p.f.price);stats.set(p.f.offset,r);
   }
   for(const c of D.CROP_IDS)for(const offset of [1,2,4])pending.push({week:s.absWeek+offset,crop:c,f:G.forecast(s,c,offset)});
   s=G.endWeek(s);if(s.phase==='shortfall')s=G.apply(s,{t:'pay'});
  }
 }
 for(const[offset,r]of stats)out.forecasts.push({precise,loc,offset,n:r.n,coverage:r.inBand/r.n,mape:r.error/r.n,relativeBandWidth:r.width/r.n});
}
writeFileSync('../qa/deep-results.json',JSON.stringify(out,null,2));writeFileSync('../qa/morning-fixtures.json',JSON.stringify(browserFixtures));
console.log(JSON.stringify({fixtures:out.fixtures.length,fixtureErrors:out.fixtures.filter((x:any)=>x.error),hand:out.hand.map((x:any)=>({loc:x.loc,season:x.season,boundary:x.boundary,retained:x.retained})),morning:out.morning,forecasts:out.forecasts},null,2));
