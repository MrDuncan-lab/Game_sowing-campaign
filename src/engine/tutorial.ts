import { apply, newGame, tile, stockOf, workEffectCells, type Action, type GameState, type Card } from './game';
import { CARDS, CROPS, TRACKS, type CropId } from './data';

// The training farm, version 3: seven calm weeks instead of three crowded ones. Every week brings one
// or two new things and then leaves the player free time ("play*" steps) to try the farm out — plant,
// water, exchange cards — before ending the week. Projects in the lesson take one week, so nobody is
// taught to skip weeks while waiting.
//   week 1  plant · rotate · bean · night         planting and the working week
//   week 2  water · hail · play2                  care: water, cover from hail
//   week 3  visit · accept · deliver · sale · play3   the harvest: guests come for it, an order, the rest sold
//   week 4  weeds · lens · compost · play4        the land: weeds and soil
//   week 5  chapter · hire · lab · play5          chapter I is over; a helper and the first selection project
//   week 6  upgrade · play6                       an improvement
//   week 7  place · practice · done               a building, then on one's own
export const TUTORIAL_STEPS = ['plant','rotate','bean','night','water','hail','play2','visit','accept','deliver','sale','play3','weeds','lens','compost','play4','chapter','hire','lab','play5','upgrade','play6','place','practice','done'] as const;
export type TutorialStep = typeof TUTORIAL_STEPS[number];
export const FREE_STEPS: readonly TutorialStep[] = ['play2','play3','play4','play5','play6'];
export interface TutorialSession {
  version: 3; farm: GameState; step: TutorialStep; heldUid: number; labUid: number;
  watered: boolean; delivered: boolean; checkpoint?: Omit<TutorialSession,'checkpoint'>;
  plantedAt?: [number,number]; hiddenHintStep?: TutorialStep; orderNotice?: string; weedAt?: [number,number];
  chapterRead?: boolean;
}
export const TUTORIAL_KEY = 'posevnaya.tutorial.atlas.v3';
export const TUTORIAL_SEED = 'atlas-tutorial-v3';
const at=(i:number):[number,number]=>[i%6,Math.floor(i/6)];
const after=(t:TutorialSession,step:TutorialStep)=>TUTORIAL_STEPS.indexOf(t.step)>TUTORIAL_STEPS.indexOf(step);
export function createTutorial(): TutorialSession {
  const s = newGame({loc:'chernozem', seed:TUTORIAL_SEED});
  s.money=300; s.peak=300; s.guide=[]; s.plan=[]; s.temps=s.temps.map(()=>18);
  s.flags={warm:false,rain:false,dry:false};s.strikes=[];s.crows=null;s.thieves=null;
  s.levels.lab=1;s.levels.irrigation=1;s.candidates=['foreman'];
  for(const t of s.tiles) if(t.owned){t.moisture=1;t.weeds=false;t.soil=3;}
  tile(s,1,2).soil=1;
  const all=[...s.hand,...s.draw,...s.discard];
  const take=(def:string):Card=>{const i=all.findIndex(c=>c.def===def);return i<0?{uid:s.nextUid++,def}:all.splice(i,1)[0];};
  const radish=take('seed_radish'),bean=take('seed_bean'),compost=take('compost'),water=take('water'),research=take('seed_radish');
  s.hand=[radish,bean,compost,water,research];
  // Every week deals a fresh hand; the lesson's compost and the spare radish are put aside for their lessons
  // (the training farm has the planning notebook: two cards can wait).
  s.levels.planning=1;compost.keep=true;research.keep=true;
  const cover=all.findIndex(c=>c.def==='shelter');if(cover>=0)all.push(...all.splice(cover,1));
  s.draw=all;s.discard=[];
  for(const o of Object.values(s.orgs)){o.offer=null;o.active=null;o.wait=999;}
  return checkpoint({version:3,farm:s,step:'plant',heldUid:compost.uid,labUid:research.uid,watered:false,delivered:false});
}
function checkpoint(t:TutorialSession):TutorialSession {
  const {checkpoint:_,...bare}=t;
  return {...bare,checkpoint:JSON.parse(JSON.stringify(bare))};
}
function advance(t:TutorialSession,step:TutorialStep):TutorialSession {return checkpoint({...t,step,hiddenHintStep:undefined});}
export function tutorialPlant(t:TutorialSession):[number,number] {
  if(t.plantedAt)return t.plantedAt;
  const i=t.farm.tiles.findIndex(v=>v.crop?.id==='radish');
  return i<0?[2,2]:at(i);
}
export function tutorialReserve(t:TutorialSession):number {
  return Object.values(t.farm.orgs).flatMap(o=>(o.active??o.offer)?.lines??[]).find(l=>l.crop==='radish')?.qty??2;
}
/** The beds that are dry and have something growing — free time points at them, never insists. */
export function dryBeds(s:GameState):[number,number][] {
  return s.tiles.flatMap((v,i)=>v.owned&&v.crop&&!v.crop.rest&&v.moisture===0?[at(i)]:[]);
}
export function tutorialNext(t:TutorialSession):TutorialSession {
  // UI-only steps: the guests' visit, the lens, and the chapter's certificate
  const next:Partial<Record<TutorialStep,TutorialStep>>={visit:'accept',lens:'compost',chapter:'hire'};
  return next[t.step]?advance(t,next[t.step]!):t;
}
export function readTutorialChapter(t:TutorialSession):TutorialSession {
  return t.step==='chapter'?checkpoint({...t,chapterRead:true}):t;
}
export function restartTutorialStep(t:TutorialSession):TutorialSession {
  return t.checkpoint?normalizeTutorial(checkpoint({...JSON.parse(JSON.stringify(t.checkpoint)),hiddenHintStep:undefined})):createTutorial();
}
const FREE_ACTIONS:Action['t'][]=['endWeek','play','waterHand','weed','guard','exchangeCard','accept','deliver','sell','pay','borrow','repay','insure'];
export function tutorialProblem(t:TutorialSession,a:Action):string|null {
  if(a.t==='guide')return null;
  // A payment can interrupt any lesson. Its real controls must remain usable.
  if(t.farm.phase==='shortfall'&&['pay','emergency','restructure','giveUp','sell','borrow','repay','deliver'].includes(a.t))return null;
  const def=a.t==='play'?t.farm.hand.find(c=>c.uid===a.uid)?.def:null;
  const [px,py]=tutorialPlant(t);
  const one=(types:Action['t'][])=>types.includes(a.t)?null:'Сначала — то, что показывает Палыч. Свободное время будет в конце недели.';
  if(FREE_STEPS.includes(t.step)){
    // free time: anything a farmer does in a normal week, but the compost waits for its lesson and
    // nothing new is bought before the lesson that explains it
    if(!FREE_ACTIONS.includes(a.t))return 'Это Палыч покажет чуть позже. Сейчас — свободное время: сажайте, поливайте или завершите неделю.';
    if((a.t==='play'||a.t==='exchangeCard')&&a.uid===t.heldUid&&!after(t,'compost'))return 'Компост пригодится на следующей неделе — Палыч покажет, где он нужнее.';
    if(a.t==='sell'&&!after(t,'deliver'))return 'Редис пригодится для заказа — продадим потом.';
    return null;
  }
  switch(t.step){
    case 'plant':return a.t==='play'&&def==='seed_radish'?null:'Выберите любой редис и посадите на свободную грядку.';
    case 'rotate':return 'Коснитесь выбранной фасоли ещё раз — поверните фигуру.';
    case 'bean':return a.t==='play'&&def==='seed_bean'?null:'Посадите повёрнутую фасоль на свободные грядки.';
    case 'night':return one(['endWeek']);
    case 'water':return (a.t==='waterHand'&&a.tiles.some(([x,y])=>x===px&&y===py))||(a.t==='play'&&def==='water'&&!!a.tiles?.[0]&&workEffectCells(t.farm,'water',...a.tiles[0]).some(([x,y])=>x===px&&y===py))?null:'Полейте редис: картой «Полив» или лейкой из меню его грядки.';
    case 'hail':{const cells=t.farm.strikes.flatMap(st=>st.cells);const manual=a.t==='guard'&&cells.some(([x,y])=>x===a.x&&y===a.y);const cover=a.t==='play'&&def==='shelter'&&a.tiles?.[0]&&workEffectCells(t.farm,'shelter',...a.tiles[0]).some(([x,y])=>cells.some(([a,b])=>a===x&&b===y));return manual||cover?null:'Накройте фасоль картой «Укрытие» или щитом из меню её грядки.';}
    case 'visit':return 'К ферме идут гости — встретьте их.';
    case 'sale':return a.t==='sell'&&a.crop==='radish'&&a.qty>0?null:'Продайте оставшийся редис в амбаре.';
    case 'accept':return one(['accept']);
    case 'deliver':return one(['deliver']);
    case 'weeds':{const [wx,wy]=t.weedAt??[-1,-1];return a.t==='weed'&&a.x===wx&&a.y===wy?null:'Прополите грядку с сорняками — нажмите на неё.';}
    case 'compost':return a.t==='play'&&a.uid===t.heldUid&&a.tiles?.[0]&&workEffectCells(t.farm,'compost',...a.tiles[0]).some(([x,y])=>x===1&&y===2)?null:'Высыпьте компост на бедную грядку — она подсвечена.';
    case 'hire':return one(['hire']);
    case 'lab':return a.t==='labCell'?null:'Выберите семена в разделе «Селекция» и добавьте клетку к посеву.';
    case 'upgrade':return a.t==='track'&&a.track==='irrigation'?null:'Улучшите бочку до капельного полива.';
    case 'place':return a.t==='build'&&a.item==='drip'?null:'Поставьте готовую капельную линию на поле.';
    case 'practice':return one(['waterHand','play','accept','deliver','weed','sell','endWeek','pay','borrow','repay','exchangeCard','guard']);
    case 'done':return 'Обучение завершено. Здесь можно осмотреть ферму. Чтобы играть дальше, выберите ферму на карте.';
    default:return 'Продолжите урок по кнопке в подсказке.';
  }
}
function lessonWeather(s:GameState){
  s.plan=[];s.temps=s.temps.map(()=>18);s.flags={warm:false,rain:false,dry:false};s.crows=null;s.thieves=null;
  // Fixed lesson conditions are declared at entry; growth, costs and project clocks use the real engine.
  s.strikes=[];s.candidates=s.team.some(w=>w.id==='foreman')?[]:['foreman'];
  for(const o of Object.values(s.orgs))if(!o.active&&!o.offer)o.wait=999;
}
// the practice order asks for what the farm actually has: beans if there are two, else another crop
function practiceCrop(s:GameState):CropId {
  if(stockOf(s,'bean')>=2)return 'bean';
  const held=s.storage.reduce((m,l)=>m.set(l.crop,(m.get(l.crop)??0)+l.qty),new Map<CropId,number>());
  const stored=[...held.entries()].find(([,q])=>q>=2)?.[0];
  if(stored)return stored;
  const growing=s.tiles.find(v=>v.crop&&!v.crop.rest)?.crop?.id;
  if(growing)return growing;
  // The last exercise starts from this farm's actual means of production.
  // A novice who sold everything should not be asked to wait blindly for beans.
  const seedCrop=(cards:Card[])=>cards.map(c=>CARDS[c.def].crop).filter((c):c is CropId=>!!c).sort((a,b)=>CROPS[a].grow-CROPS[b].grow)[0];
  return seedCrop(s.hand)??seedCrop([...s.draw,...s.discard])??'radish';
}
export function practiceNeed(t:TutorialSession) {
  const s=t.farm;
  const line=Object.values(s.orgs).flatMap(o=>(o.active??o.offer)?.lines??[])[0];
  if(!line||t.delivered)return null;
  const {crop,qty}=line,have=stockOf(s,crop);
  const plants=s.tiles.flatMap((v,i)=>v.crop?.id===crop&&!v.crop.rest?[{at:at(i),dry:v.moisture===0}]:[]);
  const seed=s.hand.find(c=>CARDS[c.def].crop===crop);
  return {crop,qty,have,plants,seed};
}
function preparePracticeSeed(t:TutorialSession) {
  if(t.step!=='practice'||t.delivered)return;
  const need=practiceNeed(t);
  // the seed already in hand waits for the morning: it is put aside so the new week's hand keeps it
  if(need?.seed&&need.have<need.qty&&!need.plants.length&&!need.seed.keep){const c=t.farm.hand.find(c=>c.uid===need.seed!.uid);if(c&&!c.temp&&t.farm.hand.filter(h=>h.keep).length<1+Math.min(2,t.farm.levels.planning??0))c.keep=true;}
  if(!need||need.have>=need.qty||need.plants.length||need.seed)return;
  // Only this fixed lesson controls the next draw. Reuse an existing UID;
  // exchange still costs the normal day and replaces a real card.
  for(const pile of [t.farm.draw,t.farm.discard]){
    const i=pile.map(c=>CARDS[c.def].crop===need.crop).lastIndexOf(true);
    if(i>=0){const [seed]=pile.splice(i,1);t.farm.draw.push(seed);return;}
  }
}
function offer(s:GameState,second=false){
  const org=Object.keys(s.orgs)[0] as keyof typeof s.orgs;
  // On poor soil the first harvest is smaller. Leave something to sell and
  // something to deliver, without changing any crop yields or ordinary orders.
  const qty=second?2:Math.max(1,Math.min(2,Math.floor(stockOf(s,'radish'))-1));
  const crop=second?practiceCrop(s):'radish';
  s.orgs[org]!.offer={id:s.nextQuestId++,org,step:s.orgs[org]!.step,title:second?'К столу соседей':'Первый редис',text:second?'Немного урожая к обеду.':'Свежий редис к обеду.',lines:[{crop,qty}],pay:8,rel:1,weeks:5,deadline:s.absWeek+5,expires:s.absWeek+5,createdWeek:s.absWeek};
  s.orgs[org]!.idle=0;
}
// Only this adapter owns the lesson's orders. Run before the real engine too,
// so its weekly scheduler cannot create unrelated story offers between steps.
function lessonOrders(t:TutorialSession) {
  const first=['visit','accept','deliver'].includes(t.step);
  const second=t.step==='practice'&&!t.delivered;
  const title=first?'Первый редис':second?'К столу соседей':null;
  const org=Object.keys(t.farm.orgs)[0] as keyof typeof t.farm.orgs;
  for(const [id,o] of Object.entries(t.farm.orgs)){
    if(id!==org||o.offer?.title!==title)o.offer=null;
    if(id!==org||o.active?.title!==title)o.active=null;
    if(!o.offer&&!o.active)o.wait=999;
  }
  const o=t.farm.orgs[org]!;
  if(title&&!o.offer&&!o.active){
    offer(t.farm,second);
    if(second)t.orderNotice='Срок прошлого заказа вышел. Новый заказ уже в разделе «Заказы».';
    if(t.step==='deliver')t.step='accept';
  }
}
// weeds come up on a free bed near the house — or on any bed if every one is planted
function sowWeeds(t:TutorialSession):TutorialSession {
  const s=t.farm;
  const owned=s.tiles.map((v,i)=>[v,i] as const).filter(([v])=>v.owned&&!v.structure&&!v.canal);
  const pick=owned.find(([v])=>!v.crop)??owned.find(([v])=>v.crop?.id!=='bean')??owned[0];
  if(!pick)return t;
  pick[0].weeds=true;
  return {...t,weedAt:at(pick[1])};
}
export function normalizeTutorial(t:TutorialSession):TutorialSession {
  const n:TutorialSession=JSON.parse(JSON.stringify(t));
  lessonOrders(n);
  preparePracticeSeed(n);
  return n;
}
export function applyTutorial(t:TutorialSession,a:Action):TutorialSession {
  const why=tutorialProblem(t,a);if(why)throw new Error(why);
  const prepared=normalizeTutorial(t);
  const s=apply(prepared.farm,a);let n={...prepared,farm:s};
  if(a.t==='endWeek')lessonWeather(s);
  // the lesson's projects take one week: the player learns to start one, not to wait for it
  if(['labCell','labTrait','labVariety','labBio','track'].includes(a.t))for(const p of s.projects){p.weeks=Math.min(p.weeks,1);p.total=Math.min(p.total,1);}
  if(a.t==='track'){
    const p=s.projects.find(p=>p.kind==='track'&&p.track===a.track);
    const entry=s.feed[s.feed.length-1];
    if(p?.kind==='track'&&entry?.text.startsWith('Началась стройка:'))entry.text=`Началась стройка: ${TRACKS[p.track].levels[p.level-1].name}, ${p.weeks} неделя.`;
  }
  switch(t.step){
    case 'plant':if(a.t==='play'){const spare=s.hand.find(c=>c.def==='seed_radish');if(spare)spare.keep=true;n=advance({...n,plantedAt:a.tiles![0],labUid:spare?.uid??t.labUid},'rotate');}break;
    case 'rotate':if(a.t==='guide'&&a.lesson==='rotate')n=advance(n,'bean');break;
    case 'bean':if(a.t==='play')n=advance(n,'night');break;
    case 'night':if(a.t==='endWeek')n=advance(n,'water');break;
    case 'water':if(a.t==='waterHand'||a.t==='play'){
      // tonight hail is coming for the beans
      const i=s.tiles.findIndex(v=>v.crop?.id==='bean');
      if(i>=0)s.strikes=[{kind:'hail',week:s.absWeek,ep:0,cells:[[i%6,Math.floor(i/6),s.tiles[i].crop!.pid]],zone:false}];
      n=advance(n,'hail');
    }break;
    case 'hail':if(a.t==='guard'||a.t==='play')n=advance(n,'play2');break;
    // the harvest week: the order arrives with the morning — the guests come to the field for it
    case 'play2':if(a.t==='endWeek'){offer(s);n=advance(n,'visit');}break;
    case 'accept':if(a.t==='accept')n=advance(n,'deliver');break;
    case 'deliver':if(a.t==='deliver')n=advance(n,'sale');break;
    case 'sale':if(a.t==='sell')n=advance(n,'play3');break;
    case 'play3':if(a.t==='endWeek')n=advance(sowWeeds(n),'weeds');break;
    case 'weeds':if(a.t==='weed')n=advance(n,'lens');break;
    case 'compost':if(a.t==='play')n=advance(n,'play4');break;
    // chapter I ends with its last week: the certificate greets the player on the morning of week 5
    case 'play4':if(a.t==='endWeek')n=advance(n,'chapter');break;
    case 'hire':if(a.t==='hire')n=advance(n,'lab');break;
    case 'lab':if(a.t==='labCell')n=advance({...n,labUid:a.uid},'play5');break;
    case 'play5':if(a.t==='endWeek')n=advance(n,'upgrade');break;
    case 'upgrade':if(a.t==='track')n=advance(n,'play6');break;
    case 'play6':if(a.t==='endWeek'&&!s.projects.some(p=>p.kind==='track'&&p.track==='irrigation'))n=advance(n,'place');break;
    case 'place':if(a.t==='build'){offer(s,true);n=advance({...n,watered:false,delivered:false},'practice');}break;
    case 'practice':
      n={...n,watered:n.watered||((a.t==='waterHand'||a.t==='play'&&t.farm.hand.find(c=>c.uid===a.uid)?.def==='water')&&s.tiles.some((v,i)=>v.moisture>t.farm.tiles[i].moisture)),delivered:n.delivered||a.t==='deliver'};
      if(a.t==='accept'||a.t==='deliver')n.orderNotice=undefined;
      if(n.watered&&n.delivered)n=advance(n,'done');break;
  }
  lessonOrders(n);
  preparePracticeSeed(n);
  return n;
}
