// Read-only simulation. No modified starting cash, days, weather or crops.
import * as G from '../src/engine/game';
import * as D from '../src/engine/data';
import { writeFileSync } from 'node:fs';
const modes=['market','orders_accept','orders_ready','greenhouse','compost','exchange','jobs','regional','regional_pets','regional_goat','regional_guardpets','regional_soil','forage'] as const;
type Mode=typeof modes[number];
const horizon=Number(process.env.AUDIT_WEEKS||46),seeds=Number(process.env.AUDIT_SEEDS||12);
const selectedModes=(process.env.AUDIT_MODES?process.env.AUDIT_MODES.split(','):modes) as readonly Mode[];
const results:any[]=[];
function run(loc:D.LocationId,seed:string,mode:Mode){
 const pets: D.PetId[]=mode==='regional_pets'?['cat','dog','geese','hedgehog','goat']:mode==='regional_goat'?['goat']:mode==='regional_guardpets'?['cat','dog','geese','hedgehog']:[]; let s=G.newGame({loc,seed,pets});const regional=mode.startsWith('regional'); const jobCard=mode==='forage'?'forage':'sidejob'; const jobMode=mode==='jobs'||mode==='forage';const count:Record<string,number>={accepted:0,delivered:0,failed:0,exchange:0,compost:0,claimed:0,emergency:0,restructured:0};
 const soilTime=[0,0,0,0,0,0];const log:any[]=[];let weeks=0,maxNet=0,firstHouse4:number|null=null;
 const act=(a:G.Action)=>{try{const n=G.apply(s,a);s=n;return true;}catch(e){if(e instanceof G.GameError)return false;throw e;}};
 const orderMode=mode==='orders_accept'||mode==='orders_ready';
 function target(){
  const active=Object.entries(s.orgs).filter(([,q])=>q?.active).map(([o,q])=>[o,q!.active!] as const);
  if(active.length)return active[0];
  return Object.entries(s.orgs).filter(([,q])=>q?.offer).map(([o,q])=>[o,q!.offer!] as const)
   .filter(([,q])=>q.lines.every(l=>G.stockOf(s,l.crop)>=l.qty||G.shopCards(s).includes('seed_'+l.crop)))
   .sort((a,b)=>need(a[1])-need(b[1]))[0];
 }
 function need(q:G.Quest){return q.lines.reduce((n,l)=>n+Math.max(0,l.qty-G.stockOf(s,l.crop))/(D.CROPS[l.crop].yield)*D.CROPS[l.crop].grow,0);}
 function orders(){
  if(!orderMode)return;
  for(const o of D.LOCATIONS[loc].orgs)if(!G.deliverProblem(s,o)){act({t:'deliver',org:o});count.delivered++;}
  const t=target();if(!t)return;const[o,q]=t;
  if(!G.acceptProblem(s,o as D.OrgId)&&(mode==='orders_accept'||q.lines.every(l=>G.stockOf(s,l.crop)>=l.qty))){if(act({t:'accept',org:o as D.OrgId}))count.accepted++;}
  if(!G.deliverProblem(s,o as D.OrgId)){act({t:'deliver',org:o as D.OrgId});count.delivered++;}
 }
 function sell(all=false){
  const q=orderMode&&!all?target()?.[1]:null;
  for(const c of D.CROP_IDS){const keep=q?.lines.find(l=>l.crop===c)?.qty??0;const n=G.stockOf(s,c)-keep;if(n>0)act({t:'sell',crop:c,qty:n,allowReserved:all});}
 }
 function improvements(){
  if(jobMode && s.season===3){
   while([...G.deckList(s),...s.spare].filter(c=>c.def===jobCard).length<8 && s.money>G.cardShopPrice(s,jobCard)+10)if(!act({t:'buyCard',def:jobCard}))break;
   while(G.deckCount(s)>8){const c=G.deckList(s).find(c=>c.def!==jobCard);if(!c||!act({t:'deckOut',uid:c.uid}))break;}
   for(const c of [...s.spare].filter(c=>c.def===jobCard)){
    if(!act({t:'deckIn',uid:c.uid}))break;
    const other=G.deckList(s).find(k=>k.def!=='sidejob');if(other)act({t:'deckOut',uid:other.uid});
   }
  }
  if(jobMode && G.deckList(s).every(c=>c.def===jobCard))return;

  const reserve=G.nextPayment(s).amount+15;
  const queue:[D.TrackId,number][]=mode==='regional_soil'?[['compost',1],['barn',1],['apiary',1],['irrigation',1],['compost',2],['apiary',2],['apiary',3]]:regional&&loc==='kuban'?[['canal',1],['irrigation',1],['barn',1],['canal',2],['machinery',1]]:regional&&loc==='altai'?[['barn',1],['apiary',1],['irrigation',1],['clearing',1],['apiary',2],['machinery',1]]:mode==='greenhouse'?[['greenhouse',1],['irrigation',1],['barn',1],['greenhouse',2],['house',2],['greenhouse',3]]:mode==='compost'?[['compost',1],['irrigation',1],['barn',1],['compost',2]]:[['irrigation',1],['barn',1],['machinery',1]];
  const next=queue.find(([t,n])=>G.lvl(s,t)<n);
  if(next&&!G.trackProblem(s,next[0])&&s.money-G.trackCost(s,next[0],G.lvl(s,next[0])+1)>reserve)act({t:'track',track:next[0]});
  for(const item of ['greenhouse','drip','canal','hive'] as G.BuildItem[]){
   for(let j=0;j<7&&G.buildStock(s)[item].used<G.buildStock(s)[item].have;j++){
    const places=G.buildSpots(s,item);if(!places.length)break;
    places.sort((a,b)=> (G.tile(s,...b).crop?5:0)+(G.tile(s,...b).soil)-(G.tile(s,...a).crop?5:0)-(G.tile(s,...a).soil));
    if(!act({t:'build',item,x:places[0][0],y:places[0][1]}))break;
   }
  }
  if(regional&&s.season===3){const keep=loc==='kuban'?['seed_rice','seed_bean','seed_watermelon','seed_wheat','water','mulch','fertilizer']:['seed_radish','seed_potato','seed_buckwheat','seed_carrot','forage','water','shelter','mulch'];if(mode==='regional_soil')keep.push('seed_bean');for(const c of G.deckList(s))if(!keep.includes(c.def)&&G.deckCount(s)>9)act({t:'deckOut',uid:c.uid});for(const def of (mode==='regional_soil'?['seed_bean','seed_radish','seed_buckwheat','forage']:loc==='kuban'?['seed_rice','seed_bean']:['seed_radish','seed_buckwheat','forage']))if(G.shopCards(s).includes(def)&&G.deckList(s).filter(c=>c.def===def).length<2&&s.money>G.cardShopPrice(s,def)+reserve)act({t:'buyCard',def});}
  if(orderMode){const q=target()?.[1];if(q)for(const l of q.lines){const def='seed_'+l.crop;if(G.stockOf(s,l.crop)<l.qty&&!G.deckList(s).some(c=>c.def===def)&&G.shopCards(s).includes(def)&&s.money-G.cardShopPrice(s,def)>reserve)act({t:'buyCard',def});}}
 }
 function choose(){
  const actions:{a:G.Action;score:number}[]=[];
  const wanted=orderMode?target()?.[1]:null;
  const water=G.growthMoisture(s);
  const thirsty=G.ownedTiles(s).filter(([t,x,y])=>t.crop&&!t.crop.rest&&water[G.idx(x,y)]===0&&G.winterCareTarget(s,x,y));
  for(const[t,x,y]of thirsty){
   const other=G.neighbors4(x,y).find(([a,b])=>G.tile(s,a,b).owned&&!G.tile(s,a,b).canal&&water[G.idx(a,b)]<2&&G.winterCareTarget(s,a,b));
   actions.push({a:{t:'waterHand',tiles:[[x,y],...(other?[other]:[])]},score:22+(t.crop!.dry??0)*20});
  }
  for(const st of s.strikes.filter(st=>st.week===s.absWeek))for(const[x,y]of G.strikeVictims(s,st)){if(G.guardable(s,x,y)&&!G.isGuarded(s,x,y))actions.push({a:{t:'guard',x,y},score:35});}
  if(G.crowsOpen(s)&&!s.crows?.shoo&&!s.crows?.drone)actions.push({a:{t:'shoo'},score:29});
  for(const card of s.hand){
   const d=D.CARDS[card.def];if(G.cardBlockReason(s,card))continue;
   if(d.kind==='seed'){
    const crop=D.CROPS[d.crop!];let best:{a:G.Action;score:number}|undefined;
    for(const pl of G.placements(s,card)){
     let viable=true;let tempWeeks=0;
     for(const[x,y]of pl.tiles){const t=G.tile(s,x,y);let grow=0,delay=0;const shift=G.soilTemp(s,x,y)-G.airTemp(s);
      for(let j=0;j<18;j++){const info=G.weekInfo(s,j);if(info.season===3&&!(t.structure==='greenhouse'&&G.heated(s)))break;const soil=t.structure==='greenhouse'&&G.heated(s)?Math.max(18,info.temp+10):info.temp+shift;if(soil>=G.cropMinT(d.crop!,card.traits)&&(t.structure==='greenhouse'||!crop.maxT||soil<=crop.maxT))grow++;delay++;if(grow>=G.cropGrow(s,d.crop!,card.traits))break;}
      if(grow<G.cropGrow(s,d.crop!,card.traits)){viable=false;break;}tempWeeks=Math.max(tempWeeks,delay);
     }
     if(!viable)continue;
     const value=G.placementYield(s,card,pl.tiles)*G.marketPrice(s,d.crop!)-G.seedCost(s,d.crop!)*pl.tiles.length;
     const missing=Math.max(0,(wanted?.lines.find(l=>l.crop===d.crop)?.qty??0)-G.stockOf(s,d.crop!)-G.ownedTiles(s).filter(([t])=>t.crop?.id===d.crop).reduce((n,[,x,y])=>n+G.expectedYield(s,x,y),0));
     const score=value/Math.max(1,tempWeeks)/Math.max(1,G.cardDays(s,card,pl.tiles.length))+ (missing>0?20:0) + pl.tiles.reduce((n,[x,y])=>n+(G.nearCanal(s,x,y)?2:0)+(G.tile(s,x,y).moisture>=2?1:0),0);
     if(!best||score>best.score)best={a:{t:'play',uid:card.uid,tiles:pl.tiles},score};
    }
    if(best)actions.push(best);
   }else if(d.target==='none'){
    if(card.def==='sidejob'||card.def==='forage'||card.def==='helpers')actions.push({a:{t:'play',uid:card.uid},score:card.def==='helpers'?50:9});
   }else if(d.target==='line'){
    for(let row=0;row<D.GRID;row++)if(G.weedsOnLine(s,'row',row))actions.push({a:{t:'play',uid:card.uid,row},score:8*G.weedsOnLine(s,'row',row)});
   }else for(const[x,y]of G.playableTargets(s,card.def)){
    const pv=G.workCardPreview(s,card,x,y);if(pv.reason)continue;let score=-1;
    if(card.def==='water')score=pv.cells.reduce((v,[a,b])=>v+(G.tile(s,a,b).crop&&water[G.idx(a,b)]<1?24:water[G.idx(a,b)]<2?2:0),0);
    else if(card.def==='fertilizer'||card.def==='care')score=(pv.after-pv.before)*2/Math.max(1,pv.days)-pv.cost;
    else if(card.def==='compost'||card.def==='bio')score=pv.cells.length*2+(pv.after-pv.before)*1.5;
    else if(card.def==='mulch')score=pv.cells.filter(([a,b])=>G.tile(s,a,b).crop&&water[G.idx(a,b)]>=1).length*4;
    else if(card.def==='shelter')score=pv.cells.filter(([a,b])=>G.tile(s,a,b).crop&&G.frostKills(s,a,b)).length*40;
    else if(card.def==='early')score=G.frostKills(s,x,y)?45:-1;
    if(score>1)actions.push({a:d.target==='row'?{t:'play',uid:card.uid,row:y}:{t:'play',uid:card.uid,tiles:[[x,y]]},score});
   }
  }
  for(const[t,x,y]of G.ownedTiles(s))if(t.weeds)actions.push({a:{t:'weed',x,y},score:4});
  actions.sort((a,b)=>b.score-a.score);return actions;
 }
 while(s.phase!=='gameover'&&weeks<horizon){
  if(s.phase==='shortfall'){
   orders();sell(true);if(act({t:'pay'}))continue;
   if(act({t:'emergency'})){count.emergency++;continue;}
   if(act({t:'restructure'})){count.restructured++;continue;}
   act({t:'giveUp'});break;
  }
  orders();sell();improvements();for(const[t]of G.ownedTiles(s))soilTime[t.soil]++;
  if((mode==='compost'||mode==='regional_soil')&&s.compostReady&&s.hand.length<G.handMax(s)){if(act({t:'claimCompost'}))count.claimed++;}
  for(let i=0;i<18&&s.days>0;i++){
   if(mode==='regional_soil'&&s.compostReady&&s.hand.length<G.handMax(s)&&act({t:'claimCompost'}))count.claimed++;
   const options=choose();let done=false;for(const o of options)if(o.score>0&&act(o.a)){done=true;break;}
   if(done)continue;
   if((mode==='exchange'||mode==='compost'||regional)&&s.hand.length&&s.exchangeWeek!==s.absWeek){
    const card=s.hand.find(c=>G.cardBlockReason(s,c))??s.hand[0];
    const type=(mode==='compost'||mode==='regional_soil')&&G.lvl(s,'compost')&&!G.compostProblem(s,card.uid)?'compostCard':'exchangeCard';
    if(act({t:type,uid:card.uid})){count[type==='compostCard'?'compost':'exchange']++;continue;}
   }
   break;
  }
  orders();sell();
  const before=Object.entries(s.orgs).filter(([,q])=>q?.active).map(([o,q])=>({o,id:q!.active!.id,step:q!.step}));
  const prior=s;act({t:'endWeek'});weeks++;
  for(const q of before)if(!s.orgs[q.o as D.OrgId]?.active&&s.orgs[q.o as D.OrgId]?.step===q.step)count.failed++;
  maxNet=Math.max(maxNet,s.money-G.outstanding(s));if(G.lvl(s,'house')>=4&&!firstHouse4)firstHouse4=s.absWeek;
  if(seed.endsWith('-0'))log.push({week:prior.absWeek,season:prior.season,cash:s.money,debt:G.outstanding(s),harvest:s.lastReport?.harvests.reduce((n,l)=>n+l.qty,0),lost:s.lastReport?.lost,phase:s.phase});
 }
 return {loc,seed,mode,weeks,soilTime,survived:weeks===horizon&&s.phase!=='gameover',money:s.money,net:s.money-G.outstanding(s),maxNet,harvested:s.stats.harvested,lost:s.stats.lostUnits,sales:s.stats.sales,orderRevenue:s.stats.orders,levels:s.levels,pets:s.pets.length,finalDeck:G.deckList(s).map(c=>c.def),chains:Object.values(s.orgs).reduce((n,o)=>n+(o?.step??0),0),...count,log};
}
for(const loc of (process.env.AUDIT_LOCATIONS?.split(',')??D.LOCATION_IDS) as D.LocationId[])for(let seed=0;seed<seeds;seed++)for(const mode of selectedModes){const r=run(loc,`MATCHED-${seed}`,mode);results.push(r);if(results.length%36===0)console.log('Completed',results.length);}
const summary=([...new Set(results.map(r=>r.loc))] as D.LocationId[]).flatMap(loc=>selectedModes.map(mode=>{const a=results.filter(r=>r.loc===loc&&r.mode===mode);const mean=(k:string)=>Math.round(a.reduce((n,r)=>n+r[k],0)/a.length*100)/100;return{loc,mode,runs:a.length,survived:a.filter(r=>r.survived).length,weeks:mean('weeks'),net:mean('net'),harvested:mean('harvested'),orders:mean('orderRevenue'),accepted:mean('accepted'),delivered:mean('delivered'),failed:mean('failed'),exchange:mean('exchange'),compost:mean('compost'),claimed:mean('claimed')};}));
writeFileSync(`../qa/${process.env.AUDIT_OUTPUT||'strategy-results.json'}`,JSON.stringify({method:`${results.length} matched-seed legal-action runs, ${horizon} weeks, 70 starting money. Explicit regional_* pet ablations use newGame pets; other modes no bonuses. Forage mode converts winter deck to eight forage cards legally. Heuristic bots, not optimum strategies or human win rates.`,summary,results},null,2));console.table(summary);

