// Progression v3 runs (docs/PROGRESSION-v3.md §12): a heuristic «builder» bot on the real engine, legal actions only.
// It plays the field like tests/strategy-astra.ts (market mode), and on top of that buys at the season's fair what
// its next building needs, buys equipment and a worker when the cash allows, uproots grown trees and clears stones
// with spare days, helps on the house site. Numbers are what this bot reaches, not human win rates.
//
//   npx tsx tools/progression-sim.ts            # 12 seeds × Черноземье, 230 weeks
//   SIM_SEEDS=16 SIM_WEEKS=115 SIM_LOC=kuban npx tsx tools/progression-sim.ts
//   SIM_LOC=altai SIM_COND=random SIM_FOLD=2 npx tsx tools/progression-sim.ts   # expeditions: a plot from the
//     departure offers (or a named condition), answers visitors, folds after SIM_FOLD autumns (0 = never)
import * as G from '../src/engine/game';
import * as D from '../src/engine/data';
import { plotOffers, type CondId } from '../src/engine/run';
import { COMMON_IDS, YARDS, YARD_IDS, type CommonId, type YardId } from '../src/engine/neighbours';
import { KNOW_NAMES } from '../src/engine/knowledge';

const seeds = Number(process.env.SIM_SEEDS || 12), horizon = Number(process.env.SIM_WEEKS || 230);
const loc = (process.env.SIM_LOC || 'chernozem') as D.LocationId;
// diagnostics: SIM_FAIR=0 never buys at the fair, SIM_BUILD=0 never builds, SIM_SPARE=0 leaves trees, stones and sites alone
const FAIR = process.env.SIM_FAIR !== '0', BUILD = process.env.SIM_BUILD !== '0', SPARE = process.env.SIM_SPARE !== '0';
// v3 §7 · SIM_NB=0 leaves the neighbours alone (no stages, swaps or help)
const NB = process.env.SIM_NB !== '0' && loc === 'chernozem';
const QUEUE: [D.TrackId, number][] = loc === 'chernozem'
  ? [['irrigation', 1], ['compost', 1], ['barn', 1], ['house', 2], ['house', 3], ['lab', 1], ['irrigation', 2], ['house', 4], ['barn', 2], ['greenhouse', 1], ['house', 5], ['lab', 2], ['planning', 1], ['house', 6], ['house', 7], ['barn', 3], ['greenhouse', 2], ['lab', 3]]
  : [['irrigation', 1], ['compost', 1], ['barn', 1], ['house', 2], ['house', 3], ['irrigation', 2], ['barn', 2]];

const COND = process.env.SIM_COND, FOLD = Number(process.env.SIM_FOLD || 0);
function run(seed: string) {
  const offer = COND ? (COND === 'random' ? plotOffers(loc as D.ExpeditionId, seed)[0] : { cond: COND as CondId, relic: plotOffers(loc as D.ExpeditionId, seed)[0].relic }) : null;
  let s = G.newGame({ loc, seed, ...(offer ? { run: { cond: offer.cond, relics: [offer.relic] } } : {}) });
  const hits: Record<string, number> = {}, visits: string[] = [];
  const act = (a: G.Action) => { try { s = G.apply(s, a); return true; } catch (e) { if (e instanceof G.GameError) return false; throw e; } };
  const got = { fair: 0, field: 0 }, reached: Record<number, number> = {}, cashByYear: number[] = [], lots = { player: 0, rival: 0, total: 0 };
  const seen = new Set<string>();
  let weeks = 0;
  const reserve = () => G.nextPayment(s).amount + 15;
  const nextBuild = () => QUEUE.find(([t, n]) => G.lvl(s, t) < n && !s.projects.some((p) => p.kind === 'track' && p.track === t));
  function fair() {
    if (!s.fair) return;
    for (const l of s.fair.lots) {
      const k = `${s.fair.year}|${s.fair.season}|${l.id}`;
      if (!seen.has(k)) { seen.add(k); lots.total++; }
      if (l.sold === 'rival' && !seen.has(`r${k}`)) { seen.add(`r${k}`); lots.rival++; }
    }
    const want = nextBuild();
    const need: D.Mats = want ? G.trackMats(s, want[0], G.lvl(s, want[0]) + 1) : {};
    for (const l of s.fair.lots) {
      if (l.sold || G.fairBuyProblem(s, l)) continue;
      const left = s.money - G.fairPayNow(l);
      let buy = false;
      if (l.kind === 'mat') buy = G.matsList(l.mats!).some(([k, n]) => (need[k] ?? 0) > G.matStock(s, k) || G.matStock(s, k) < 12) && left > reserve();
      if (l.kind === 'equip') buy = left > reserve() * 2;
      if (l.kind === 'worker') buy = left > reserve() + 40;
      if (buy) {
        const before = s.mats ? { ...s.mats } : null;
        if (act({ t: 'fairBuy', id: l.id })) {
          lots.player++;
          if (l.kind === 'mat') got.fair += G.matsList(l.mats!).reduce((n, [, q]) => n + q, 0);
          void before;
        }
      }
    }
  }
  function build() {
    const n = nextBuild();
    if (n && !G.trackProblem(s, n[0]) && s.money - G.trackCost(s, n[0], G.lvl(s, n[0]) + 1) > reserve()) act({ t: 'track', track: n[0] });
    for (const item of ['greenhouse', 'drip', 'canal', 'hive'] as G.BuildItem[])
      for (let j = 0; j < 7 && G.buildStock(s)[item].used < G.buildStock(s)[item].have; j++) {
        const places = G.buildSpots(s, item);
        if (!places.length || !act({ t: 'build', item, x: places[0][0], y: places[0][1] })) break;
      }
  }
  // the crops the next affordable yard stage needs stay in the barn
  const keepFor = (): Partial<Record<D.CropId, number>> => {
    if (!NB) return {};
    const y = nextYard();
    const st = y ? YARDS[y].stages[G.yardStage(s, y)] : undefined;
    return st?.crop ? { [st.crop.crops[0]]: st.crop.qty } : {};
  };
  function sell() { const keep = keepFor(); for (const c of D.CROP_IDS) { const n = G.stockOf(s, c) - (keep[c] ?? 0); if (n > 0) act({ t: 'sell', crop: c, qty: n }); } }
  // v3 §7 · the neighbours: the lowest yard first, the club first among the shared buildings
  // (a cautious neighbour: while the house is mortgaged it keeps its cash for the payments)
  const nextYard = (): YardId | undefined => G.lvl(s, 'house') < 2 || G.isMortgaged(s) ? undefined
    : [...YARD_IDS].filter((y) => G.yardStage(s, y) < 3 && !s.projects.some((p) => p.kind === 'yard' && p.yard === y)).sort((a, b) => G.yardStage(s, a) - G.yardStage(s, b))[0];
  const COMMON_ORDER: CommonId[] = ['club', 'hostel', 'pump', 'bridge'];
  function neighbours() {
    if (!NB) return;
    for (const y of YARD_IDS) {
      if (!G.yardHelpProblem(s, y)) act({ t: 'yardHelp', yard: y });
      const sw = YARDS[y].swap.take.crops.find((c) => !G.swapProblem(s, y, c));
      if (sw && (y !== 'miller' || G.yardStage(s, 'miller') >= 1)) act({ t: 'yardSwap', yard: y, crop: sw, ...(y === 'zina' ? { card: 'compost' as const } : {}) });
    }
    const c = COMMON_ORDER.find((c) => !G.commonProblem(s, c) && s.money - G.commonCost(s, c) > reserve() * 1.5);
    if (c) act({ t: 'commonBuild', id: c });
    const y = nextYard();
    if (y && !G.yardProblem(s, y) && s.money - G.yardCost(s, y, G.yardStage(s, y) + 1) > reserve() * 1.5) act({ t: 'yardBuild', yard: y });
  }
  // the field play of tests/strategy-astra.ts (market mode), verbatim, plus the v3 spare-day actions
 function choose(){
   const actions:{a:G.Action;score:number}[]=[];
   const wanted=null as G.Quest|null;
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
   // v3 · spare days: pull a sprout, uproot a grown tree, clear stones, help on the house site
   if(SPARE){
    for(const[t,x,y]of G.ownedTiles(s)){
     const st=G.treeStage(t);
     if(st===1)actions.push({a:{t:'fell',x,y},score:3.5});
     if(st===3)actions.push({a:{t:'fell',x,y},score:3});
     if(t.terrain==='rock'&&G.canClear(s,x,y)&&s.money>G.clearPrice(s,x,y)+reserve())actions.push({a:{t:'clear',x,y},score:2.5});
    }
    if(!G.helpProblem(s,'house'))actions.push({a:{t:'helpBuild',track:'house'},score:2});
   }
   actions.sort((a,b)=>b.score-a.score);return actions;
  }
  while (s.phase !== 'gameover' && weeks < horizon) {
    if (s.phase === 'shortfall') { sell(); if (act({ t: 'pay' }) || act({ t: 'emergency' }) || act({ t: 'restructure' }) || act({ t: 'seize' })) continue; act({ t: 'giveUp' }); break; }
    if (s.run?.visit && s.run.visit.week === s.absWeek) {
      // a visitor: the first answer the bot can afford (the last one is always «no»)
      const opts = G.visitOptions(s), i = opts.findIndex((o) => !o.problem);
      visits.push(`${s.run.visit.id}:${i}`);
      act({ t: 'answer', choice: i });
    }
    if (FOLD && s.run && s.run.autumns >= FOLD && !G.foldProblem(s)) {
      const offers = G.lootOffers(s), n = Math.min(G.lootCount(s), offers.length);
      act({ t: 'fold', picks: [...offers].sort((a, b) => b.length - a.length).slice(0, n) });
      break;
    }
    neighbours(); sell(); if (FAIR) fair(); if (BUILD) build(); neighbours();
    for (let i = 0; i < 18 && s.days > 0; i++) {
      const before = G.matStock(s, 'logs') + G.matStock(s, 'bricks');
      const o = choose().find((o) => o.score > 0 && act(o.a));
      if (!o) break;
      got.field += Math.max(0, G.matStock(s, 'logs') + G.matStock(s, 'bricks') - before);
    }
    sell();
    const year = s.year;
    act({ t: 'endWeek' });
    weeks++;
    for (const l of s.lastReport?.lost ?? []) { const k = l.split(':')[0]; if (['Медведь', 'Кабаны', 'Пожар', 'Засохли без воды', 'Паводок'].includes(k)) hits[k] = (hits[k] ?? 0) + 1; }
    if (s.year !== year) cashByYear.push(Math.round(s.money - G.outstanding(s)));
    const h = G.lvl(s, 'house');
    if (!reached[h]) reached[h] = s.absWeek;
  }
  const folded = s.run?.result && !s.run.result.bankrupt ? s.run.result : null;
  const stages = YARD_IDS.reduce((n, y) => n + G.yardStage(s, y), 0);
  const know = D.SOWN_IDS.map((c) => G.knowLevel(s, c)).filter((l) => l > 0).sort((a, b) => b - a);
  return { seed, weeks, alive: s.phase !== 'gameover' || !!folded, folded, cond: offer?.cond, relics: s.run?.relics ?? [], hits, visits, house: G.lvl(s, 'house'), reached, cashByYear, got, lots, levels: s.levels, team: s.team.length, mats: s.mats,
    stages, commons: s.commons ?? [], fests: (s.fests ?? []).length, festWins: (s.fests ?? []).filter((f) => f.win).length, place: loc === 'chernozem' ? G.districtPlace(s) : 0, know, glory: s.glory };
}

const res = Array.from({ length: seeds }, (_, i) => run(`V3SIM-${i}`));
const pct = (a: number[], p: number) => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * (b.length - 1) + 0.5))]; };
const yearOf = (w: number) => Math.floor((w - 1) / D.LOCATIONS[loc].seasons.reduce((a, b) => a + b, 0)) + 1;
console.log(`${loc}: ${seeds} seeds × ${horizon} weeks — alive ${res.filter((r) => r.alive).length}/${seeds}; died at weeks`, res.filter((r) => !r.alive).map((r) => r.weeks).join(', ') || '—');
for (const lv of [2, 3, 4, 5, 6, 7]) {
  const w = res.map((r) => r.reached[lv]).filter((x) => x !== undefined);
  console.log(`house ${lv}: ${w.length}/${seeds} runs; median week ${w.length ? pct(w, 0.5) : '—'} (year ${w.length ? yearOf(pct(w, 0.5)) : '—'}), p25–p75 ${w.length ? `${pct(w, 0.25)}–${pct(w, 0.75)}` : '—'}`);
}
const years = Math.max(...res.map((r) => r.cashByYear.length));
for (let y = 0; y < years; y++) {
  const c = res.map((r) => r.cashByYear[y]).filter((x) => x !== undefined);
  console.log(`end of year ${y + 1}: net cash median ${pct(c, 0.5)} (${c.length} runs)`);
}
const sum = (f: (r: typeof res[number]) => number) => res.reduce((n, r) => n + f(r), 0);
console.log(`materials per run: fair ${Math.round(sum((r) => r.got.fair) / seeds)}, field ${Math.round(sum((r) => r.got.field) / seeds)}; lots seen ${Math.round(sum((r) => r.lots.total) / seeds)}, bought by the bot ${Math.round(sum((r) => r.lots.player) / seeds)}, by Пряхин ${Math.round(sum((r) => r.lots.rival) / seeds)} (${Math.round(100 * sum((r) => r.lots.rival) / Math.max(1, sum((r) => r.lots.total)))}%)`);
if (loc === 'chernozem') {
  console.log(`neighbours: yard stages median ${pct(res.map((r) => r.stages), 0.5)}/15 (p25–p75 ${pct(res.map((r) => r.stages), 0.25)}–${pct(res.map((r) => r.stages), 0.75)}); shared buildings median ${pct(res.map((r) => r.commons.length), 0.5)}; club in ${res.filter((r) => r.commons.includes('club')).length}/${seeds}`);
  console.log(`festivals per run median ${pct(res.map((r) => r.fests), 0.5)}, won ${pct(res.map((r) => r.festWins), 0.5)}; district place median ${pct(res.map((r) => r.place), 0.5)} (best ${Math.min(...res.map((r) => r.place))}); farm glory median ${pct(res.map((r) => r.glory), 0.5)}`);
  console.log(`knowledge (first run): ${res[0].know.map((l) => KNOW_NAMES[l]).join(', ') || '—'}`);
}
console.log('final levels (first run):', JSON.stringify(res[0].levels), 'team', res[0].team, 'shed', JSON.stringify(res[0].mats));
if (COND) {
  const f = res.filter((r) => r.folded);
  console.log(`folded ${f.length}/${seeds}: cash home median ${f.length ? pct(f.map((r) => r.folded!.cash), 0.5) : '—'}, finds ${f.length ? pct(f.map((r) => r.folded!.loot.length), 0.5) : '—'}`);
  const hits: Record<string, number> = {};
  for (const r of res) for (const [k, n] of Object.entries(r.hits)) hits[k] = (hits[k] ?? 0) + n;
  console.log('hazard blows per run:', Object.entries(hits).map(([k, n]) => `${k} ${(n / seeds).toFixed(1)}`).join(', ') || '—');
  console.log('visits per run:', (res.reduce((n, r) => n + r.visits.length, 0) / seeds).toFixed(1), '· conditions:', res.map((r) => r.cond).join(' '));
}
