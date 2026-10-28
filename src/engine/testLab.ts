// Isolated fixtures for the user-facing test mode. Never used by newGame or normal saves.
import * as G from './game';
import * as D from './data';
import {EpisodeKind,baseTemp} from './calendar';
export const TEST_SCENARIOS=[
 ['planting','Посадка и поворот','Выберите карту; повторный тап поворачивает фигуру.'],
 ['fullfield','Полное поле и полная рука','Перетащите карту: прицел выше пальца, на маленьких клетках появляется увеличение.'],
 ['gallery','Все растения','Разные стадии роста. Линзы показывают влагу, почву и температуру.'],
 ['exchange','Обмен','В руке редис; в колоде его копия и другая карта. Стрелка должна выдать другую.'],
 ['compost','Компост','Яма почти готова; отправьте карту или дождитесь конца недели.'],
 ['fertilizers','Удобрения','Одна посадка на бедной почве: сравните подкормку, компост, биопрепарат и уход.'],
 ['water','Полив и мульча','Выберите две соседние грядки вручную или примените карту.'],
 ['drought','Последняя сухая неделя','Без полива растения погибнут в конце недели.'],
 ['rain','Дождь и теплица','Дождь польёт открытые грядки до роста, но не теплицу.'],
 ['frost','Заморозок','Укройте растения, перенесите теплицу или примените ранний сбор.'],
 ['heat','Жара','Редис снаружи стоит, теплица защищает его от жары.'],
 ['greenhouse','Перенос теплицы','Соберите одну грядку, перенесите теплицу, проверьте второй ранний сбор.'],
 ['canal','Каналы у реки','Перестановка не поливает мгновенно. Вода придёт по связной сети в конце недели.'],
 ['crows','Вороны','Стая выбрала молодые посевы. Пугало и теплица защищают, птиц можно прогнать.'],
 ['locust','Саранча','Сейчас время защиты. При завершении недели погибнут атакованные незащищённые грядки.'],
 ['beetle','Колорадский жук','Защитите картофель или проверьте потери при завершении недели.'],
 ['hail','Град и страховка','Урожай пострадает, страховка возместит часть стоимости.'],
 ['flood','Паводок','Проверьте удар у воды и защиту канальной системы.'],
 ['weeds','Сорняки','Прополка по ряду или столбцу, ручная прополка, работа гусей.'],
 ['thieves','Воры без защиты','После завершения недели проверьте потери и сценку.'],
 ['eventchain','Погода → жук → дети → вороны','Несколько событий, сбор урожая и новый заказ в одну неделю.'],
 ['emptyraid','Дети у пустых грядок','Засуха и саранча уничтожат их цели. Дети уйдут с пустыми руками.'],
 ['crowraid','Дети и вороны','Дети разгонят птиц на своих грядках и заберут урожай.'],
 ['collisions','Ненастья наперегонки','Мороз, засуха, саранча и жук успевают к грядкам раньше детей и ворон. Четверо разных детей.'],
 ['scouts','Дети высматривают поле','За неделю до набега двое детей прячутся за кустом у двора. Нажмите на куст.'],
 ['flockwarn','Стая над лесом','Вороны кружат за неделю до налёта. Нажмите на стаю: на следующей неделе она сядет на всходы.'],
 ['pestwarn','Жуки, саранча и сорняки на подходе','Жуки ползут к картошке, саранча на горизонте, ветер несёт сорняки — за неделю до удара.'],
 ['omens','Дрон-разведчик: набеги за две недели','С разведчиком всё видно за две недели: стая, саранча, дети вдалеке.'],
 ['dog','Собака против воров','Завершите неделю: урожай сохранится, появятся погоня и реплика.'],
 ['watchman','Сторож против воров','Завершите неделю: сторож защитит поле.'],
 ['drone','Защитный вылет дрона','Завершите неделю: дрон остановит удар насекомых.'],
 ['bees','Улей и опыление','Медонос рядом с ульем; конец недели даст мёд.'],
 ['orders','Готовый заказ','Ручная сдача двух культур, резерв и награда-питомец.'],
 ['barn','Амбар и двор','Разные запасы, резерв, ползунок продажи и переполнение.'],
 ['debt','Платёж без урожая','Откройте пустой амбар и вернитесь к решению платежа.'],
 ['winter','Зима и отопление','Посев под теплицами, вода, снегозадержание, перебор колоды.'],
 ['lab','Лаборатория и обучение работников','Начните исследование или обучение; завершайте недели для прогресса.'],
 ['equipment','Все постройки','Приборы куплены; размещайте их через мастерскую и двигайте на поле.'],
 ['pets','Все питомцы','Коснитесь питомца: он остановится и отреагирует.'],
 ['guide','Обучение и событие','Погоня с репликой временно заменяет подсказку, затем обучение продолжается.'],
 ['trialAnnounce','Испытание года: объявление','Третий год начинается: появляется карточка испытания. Значок в небе ведёт счёт неделям.'],
 ['trialFrost','Испытание: чёрный заморозок','Ночь −6°. Два кострища стоят — разожгите их, укройте грядки и завершите неделю.'],
 ['trialLocust','Испытание: великая саранча','Первая волна идёт с запада. Разожгите дымовые костры, поставьте охрану и завершите неделю.'],
 ['trialDrought','Испытание: великая сушь','Сушь: открытые грядки сохнут за неделю. Полейте, замульчируйте и завершите неделю.'],
 ['fires','Костры','Кострища построены: поставьте их на стык грядок в режиме построек и разожгите перед заморозком.'],
 ['normal','Обычный старт','Чистая партия выбранного региона; кнопки теста по-прежнему доступны.'],
] as const;
export type TestScenario=typeof TEST_SCENARIOS[number][0];
let serial=0;
export function testDate(s:G.GameState,season:number,year=s.year){
 const loc=D.LOCATIONS[s.loc];s.year=year;s.yearStart=(year-1)*loc.seasons.reduce((a,b)=>a+b,0)+1;
 s.week=loc.seasons.slice(0,season).reduce((a,b)=>a+b,0)+1;s.absWeek=s.yearStart+s.week-1;s.season=season as G.GameState['season'];s.weekInSeason=1;
 s.temps=loc.seasons.flatMap((n,k)=>Array.from({length:n},(_,i)=>Math.round(baseTemp(loc,k,i+1))));
 s.plan=[];s.flags={rain:false,dry:false,warm:false};s.strikes=[];s.crows=null;s.thieves=null;s.scenes=[];s.lastReport=null;s.phase='week';s.due=null;
 delete s.exchangeWeek;delete s.shortfallBorrowed;
 for(const t of s.tiles){if(t.greenhousePlacedWeek!==undefined)t.greenhousePlacedWeek=Math.min(t.greenhousePlacedWeek,s.absWeek-1);if(t.hivePlacedWeek!==undefined)t.hivePlacedWeek=Math.min(t.hivePlacedWeek,s.absWeek-1);}
}
export function testHand(s:G.GameState,defs:string[]){
 s.discard.push(...s.hand);s.hand=defs.slice(0,G.handMax(s)).map(def=>({uid:s.nextUid++,def}));
}
function crop(s:G.GameState,x:number,y:number,id:D.CropId,grown=0,pid=s.nextPid++){
 const t=G.tile(s,x,y);Object.assign(t,{owned:true,terrain:D.CROPS[id].swamp?'swamp':'plain',weeds:false,canal:false});
 t.crop={id,grown,pid,mult:1,bonus:0,planted:s.absWeek,...(D.CROPS[id].perennial?{years:D.CROPS[id].perennial}:{})};
 if(D.CROPS[id].greenhouseOnly){t.structure='greenhouse';s.levels.greenhouse=Math.max(1,G.lvl(s,'greenhouse'));}
 return t;
}
function climate(s:G.GameState,kind:EpisodeKind,temp:number){
 s.plan=[{id:900,kind,start:s.absWeek,len:3}];s.flags={rain:kind==='rain',dry:kind==='dry',warm:kind==='warm'};
 s.temps[s.week-1]=temp;
}
export function testAnimation(s:G.GameState,kind:NonNullable<G.GameState['scenes']>[number]['kind']|'queue'){
 const kinds=kind==='queue'?['dogThieves','drone'] as const:[kind];
 s.scenes=kinds.map(k=>({id:`test-${++serial}:${k}`,kind:k,week:s.absWeek}));
}
export function testFixture(which:TestScenario,loc:D.LocationId='chernozem'):G.GameState{
 if(which==='collisions'){
  // Every trouble arrives in the engine's order and finds what the earlier one left:
  // (1,1) frost → beetles skid, a child shivers, a crow skids; (2,1) drought → a sneeze, a crow in the dust;
  // (1,2) locusts → a grasshopper jumps at a child; (2,2) beetles chew → a child flicks one off and takes the crop;
  // (3,1) beetles chew → the crow eats a beetle with its peck.
  const s=testFixture('thieves',loc);
  for(const t of s.tiles)if(t.owned){t.moisture=3;if(t.crop)t.crop.grown=3;}
  s.levels.barn=2;
  for(const[x,y]of [[2,1],[1,2],[2,2]] as [number,number][])G.tile(s,x,y).crop!.id='cabbage';
  crop(s,3,1,'cabbage',3);G.tile(s,3,1).moisture=3;
  climate(s,'frost',-2);
  G.tile(s,2,1).moisture=0;G.tile(s,2,1).crop!.dry=1;
  const pid=(x:number,y:number)=>G.tile(s,x,y).crop!.pid;
  s.strikes=[
   {kind:'beetle',week:s.absWeek,ep:900,cells:[[1,1,pid(1,1)],[2,2,pid(2,2)],[3,1,pid(3,1)]],zone:false},
   {kind:'locust',week:s.absWeek,ep:900,cells:[[1,2,pid(1,2)]],zone:false},
  ];
  s.crows={week:s.absWeek,targets:[[1,1],[2,1],[3,1]].map(([x,y])=>({x,y,pid:pid(x,y),type:'ripe' as const})),shoo:false,drone:false};
  return s;
 }
 if(which==='scouts'){
  // The week before a raid: an angry orphanage, ripe beds, no guard. The raid is announced for next week.
  const s=testFixture('thieves',loc);s.thieves=null;
  for(const t of s.tiles)if(t.owned){t.moisture=3;if(t.crop)t.crop.grown=2;}
  for(const o of D.LOCATIONS[s.loc].orgs)if(D.ORGS[o].mischief==='thieves'&&s.orgs[o])s.orgs[o]!.rel=-50;
  s.kidsWarn=[s.absWeek+1];s.kidsRolled=[s.absWeek+1];
  return s;
 }
 if(which==='eventchain'||which==='emptyraid'||which==='crowraid'){
  const s=testFixture('thieves',loc);
  for(const t of s.tiles)if(t.owned){t.moisture=3;if(t.crop)t.crop.grown=3;}
  s.levels.barn=2;
  s.thieves!.targets=s.thieves!.targets.filter(t=>t.x===1&&t.y===1||t.x===2&&t.y===2);
  const strike=(kind:G.StrikeKind,cells:[number,number][])=>({kind,week:s.absWeek,ep:900,cells:cells.map(([x,y])=>[x,y,G.tile(s,x,y).crop!.pid] as [number,number,number]),zone:false});
  if(which==='emptyraid'){
   G.tile(s,1,1).moisture=0;G.tile(s,1,1).crop!.dry=1;s.strikes=[strike('locust',[[2,2]])];
  }else{
   s.crows={week:s.absWeek,targets:[{x:1,y:1,pid:G.tile(s,1,1).crop!.pid,type:'ripe'},{x:1,y:2,pid:G.tile(s,1,2).crop!.pid,type:'young'}],shoo:false,drone:false};
   G.tile(s,1,2).crop!.grown=0;
   if(which==='eventchain')s.strikes=[strike('beetle',[[1,1],[2,1]]),strike('hail',[[1,1],[2,1]])];
  }
  return s;
 }
 const s=G.newGame({loc,seed:`TEST-${which}-${Date.now()}-${++serial}`});
 if(which==='normal')return s;
 if(which==='trialAnnounce'){testDate(s,0,3);delete s.trial;G.planTrial(s);s.money=400;return s;}
 if(which==='trialFrost'||which==='trialLocust'||which==='trialDrought'||which==='fires'){
  const kind=which==='trialFrost'?'frost':which==='trialLocust'?'locust':'drought';
  testDate(s,1,which==='fires'?1:3);s.money=1000;s.days=8;s.plan=[];s.strikes=[];s.crows=null;s.thieves=null;s.crowWarn=[];s.kidsWarn=[];s.flags={rain:false,dry:false,warm:false};s.temps.fill(18);delete s.trial;
  for(const o of Object.values(s.orgs))if(o){o.offer=null;o.active=null;o.wait=1000;}
  for(const t of s.tiles)Object.assign(t,{owned:false,crop:null,weeds:false,moisture:2,soil:3,structure:null,shelter:0,mulch:0,drip:false,canal:false});
  for(let y=1;y<=4;y++)for(let x=1;x<=4;x++)Object.assign(G.tile(s,x,y),{owned:true,terrain:'plain'});
  const plan:[number,number,D.CropId][]=[[1,1,'potato'],[2,1,'potato'],[3,1,'cabbage'],[4,1,'carrot'],[1,2,'potato'],[2,2,'bean'],[3,2,'cabbage'],[4,2,'carrot'],[1,3,'corn'],[2,3,'corn'],[3,3,'pumpkin'],[4,3,'onion'],[1,4,'wheat'],[2,4,'wheat'],[3,4,'radish'],[4,4,'sunflower']];
  for(const[x,y,c]of plan)if(D.CROPS[c])crop(s,x,y,c,which==='fires'?1:Math.max(1,D.CROPS[c].grow-2));
  s.levels.fires=which==='fires'?1:2;
  if(which==='fires'){climate(s,'frost',-2);s.fires=[];testHand(s,['shelter','seed_radish','water']);return s;}
  s.fires=kind==='drought'?[]:[[1,1],[2,3]];
  if(kind==='drought'){s.levels.irrigation=2;for(let x=0;x<6;x++)G.tile(s,x,4).drip=true;G.tile(s,3,2).mulch=3;for(const t of s.tiles)if(t.owned)t.moisture=1;}
  G.planTrial(s,kind,s.absWeek);
  if(kind==='locust'){s.trial!.dir='w';G.trialMorning(s);}
  if(kind==='drought')s.flags.dry=true;
  testHand(s,kind==='frost'?['shelter','shelter','mulch','early']:kind==='locust'?['early','early','water']:['water','water','mulch','mulch']);
  return s;
 }
 s.money=1000;s.days=8;s.plan=[];s.strikes=[];s.crows=null;s.thieves=null;s.flags={rain:false,dry:false,warm:false};s.temps.fill(20);
 for(const o of Object.values(s.orgs))if(o){o.offer=null;o.active=null;o.wait=1;}
 for(const t of s.tiles)if(t.owned)Object.assign(t,{terrain:'plain',crop:null,soil:3,moisture:2,weeds:false});
 testHand(s,['seed_radish','seed_bean','seed_potato','water','mulch','fertilizer']);
 if(['fullfield','gallery','pets','equipment','canal','flood'].includes(which))for(const t of s.tiles)Object.assign(t,{owned:true,terrain:'plain',crop:null,weeds:false,moisture:2,soil:3});
 if(which==='fullfield')testHand(s,Array.from({length:7},(_,i)=>['seed_radish','seed_bean','seed_potato'][i%3]));
 if(which==='gallery'){
  D.CROP_IDS.filter(c=>!D.CROPS[c].product).forEach((c,i)=>crop(s,i%6,Math.floor(i/6),c,Math.floor(D.CROPS[c].grow*(i%3)/3)));
  s.unlocked=D.CROP_IDS.filter(c=>!D.CROPS[c].product);testHand(s,['water','mulch','fertilizer','compost','bio','early']);
 }
 if(which==='exchange'){
  testHand(s,['seed_radish','seed_radish','seed_bean','water','mulch','fertilizer','shelter','care','weeding']);
  s.draw=[{uid:s.nextUid++,def:'seed_potato'},{uid:s.nextUid++,def:'seed_radish'}];s.discard=[];
 }
 if(which==='compost'){s.levels.compost=1;s.compostTick=2;for(const t of s.tiles)if(t.owned)t.soil=1;}
 if(which==='fertilizers'){
  const pid=s.nextPid++;for(const[x,y]of [[1,1],[2,1],[1,2]]){const t=crop(s,x,y,'potato',2,pid);t.soil=1;}
  testHand(s,['fertilizer','fertilizer','compost','bio','care','early']);
 }
 if(['water','drought','rain','frost','heat','greenhouse','locust','beetle','hail','thieves','dog','watchman','drone','guide'].includes(which)){
  testDate(s,1);s.temps.fill(20);s.days=8;
  for(const[x,y]of [[1,1],[2,1],[1,2],[2,2]])crop(s,x,y,'potato',2);
 }
 if(which==='water'||which==='drought'){
  for(const t of s.tiles)if(t.owned){t.moisture=0;if(t.crop)t.crop.dry=which==='drought'?1:0;}
  testHand(s,['water','water','mulch','care']);if(which==='drought')climate(s,'dry',30);
 }
 if(which==='rain'){climate(s,'rain',18);s.levels.greenhouse=1;G.tile(s,1,1).structure='greenhouse';for(const t of s.tiles)if(t.owned)t.moisture=0;}
 if(which==='frost'){climate(s,'frost',-4);s.levels.greenhouse=1;testHand(s,['shelter','early','mulch','seed_radish']);}
 if(which==='heat'){climate(s,'dry',31);crop(s,1,1,'radish');crop(s,2,1,'radish');G.tile(s,1,1).structure='greenhouse';s.levels.greenhouse=1;}
 if(which==='greenhouse'){
  s.levels.greenhouse=4;s.team=[{id:'greenhouser',level:1,away:0}];G.tile(s,1,1).structure='greenhouse';testHand(s,['early','early','early','water']);
 }
 if(which==='canal'||which==='flood'){
  for(let y=0;y<6;y++){const t=G.tile(s,0,y);t.terrain='river';t.owned=false;}
  s.levels.canal=2;for(const t of s.tiles)t.moisture=0;G.tile(s,1,2).canal=true;G.tile(s,2,2).canal=true;
  crop(s,2,1,'rice');crop(s,3,2,'rice');testHand(s,['seed_rice','water','mulch']);
 }
 if(['locust','beetle','hail','flood','drone'].includes(which)){
  const kind: G.StrikeKind=which==='drone'?'locust':which as G.StrikeKind;
  const beds=G.ownedTiles(s).filter(([t])=>t.crop).map(([t,x,y])=>[x,y,t.crop!.pid] as [number,number,number]);
  s.strikes=[{kind,ep:901,week:s.absWeek,cells:beds,zone:false}];s.plan=[{id:901,kind,start:s.absWeek,len:3}];
  if(which==='hail')s.insurance=1;if(which==='drone')s.levels.drone=2;
  testHand(s,['early','shelter','water','mulch']);
 }
 if(which==='crows'){
  testDate(s,1);s.temps.fill(20);s.days=8;
  for(const[x,y]of [[1,1],[2,1],[1,2],[2,2]])crop(s,x,y,'potato');
  s.levels.greenhouse=1;s.levels.guard=1;G.tile(s,1,1).structure='greenhouse';
  s.crows={week:s.absWeek,targets:G.ownedTiles(s).filter(([t])=>t.crop&&t.structure!=='greenhouse').map(([t,x,y])=>({x,y,pid:t.crop!.pid,type:'young'})),shoo:false,drone:false};
 }
 if(['thieves','dog','watchman','guide'].includes(which)){
  s.thieves={week:s.absWeek,targets:G.ownedTiles(s).filter(([t])=>t.crop).map(([t,x,y])=>({x,y,pid:t.crop!.pid})),talked:false};
  if(which==='dog'||which==='guide')s.pets=['dog'];
  if(which==='watchman')s.team=[{id:'watchman',level:1,away:0}];
  if(which==='guide'){s.guide=[];s.thieves=null;testAnimation(s,'dogThieves');}
 }
 if(which==='flockwarn'||which==='pestwarn'||which==='omens'){
  // raids seen coming: a week ahead, two with the scout drone
  testDate(s,1);s.temps.fill(20);s.days=8;
  const pid=s.nextPid++;for(const[x,y]of [[1,1],[2,1],[1,2]])crop(s,x,y,'potato',1,pid);
  crop(s,2,2,'bean',0);crop(s,3,1,'bean',0);crop(s,3,2,'wheat',1);
  const lead=which==='omens'?2:1;if(which==='omens')s.levels.drone=1;
  const at=s.absWeek+lead;
  if(which!=='pestwarn'){s.plan.push({id:910,kind:'crows',start:at,len:1});s.crowWarn=[at];s.crowRolled=[at];}
  if(which!=='flockwarn'){
   const potato=G.ownedTiles(s).filter(([t])=>t.crop?.id==='potato').map(([t,x,y])=>[x,y,t.crop!.pid] as [number,number,number]);
   s.plan.push({id:911,kind:'beetle',start:at-1,len:2});s.strikes.push({kind:'beetle',ep:911,week:at,cells:potato,zone:false});
   const wheat=G.ownedTiles(s).filter(([t])=>t.crop?.id==='wheat'||t.crop?.id==='bean').map(([t,x,y])=>[x,y,t.crop!.pid] as [number,number,number]);
   s.plan.push({id:912,kind:'locust',start:at-1,len:3});s.strikes.push({kind:'locust',ep:912,week:at,cells:wheat,zone:false});
   const free=G.ownedTiles(s).filter(([t])=>!t.crop).slice(0,2).map(([,x,y])=>[x,y,0] as [number,number,number]);
   s.plan.push({id:913,kind:'weedsurge',start:at,len:1});s.strikes.push({kind:'weedsurge',ep:913,week:at,cells:free,zone:true});
  }
  if(which==='omens'){for(const o of D.LOCATIONS[s.loc].orgs)if(D.ORGS[o].mischief==='thieves'&&s.orgs[o])s.orgs[o]!.rel=-50;s.kidsWarn=[at];s.kidsRolled=[s.absWeek+1,at];}
 }
 if(which==='weeds'){for(const[x,y]of [[1,1],[2,1],[3,1],[2,2]])G.tile(s,x,y).weeds=true;s.pets=['geese'];testHand(s,['weeding','weeding','seed_radish']);}
 if(which==='bees'){testDate(s,1);s.temps.fill(20);s.days=8;s.levels.apiary=3;G.tile(s,2,2).structure='hive';crop(s,2,1,'buckwheat',1);testHand(s,['seed_buckwheat','seed_pumpkin','water']);}
 if(which==='orders'||which==='barn'){
  s.storage=[{crop:'radish',qty:8,age:0},{crop:'potato',qty:20,age:0},{crop:'tomato',qty:2,age:0}];
  const o=D.LOCATIONS[loc].orgs[0];s.orgs[o]!.active={id:s.nextQuestId++,org:o,step:0,title:'Проверочная поставка',text:'Сдайте обе культуры вручную.',lines:[{crop:'radish',qty:6},{crop:'potato',qty:12}],pay:60,rel:18,weeks:4,deadline:s.absWeek+4,reward:{pet:'cat'}};
  if(which==='barn')s.yard=[{crop:'potato',qty:14,age:0,bornWeek:s.absWeek}];
 }
 if(which==='debt'){s.money=0;s.storage=[];s.yard=[];s.phase='shortfall';s.due={amount:32,name:'Проверочный платёж',seasonEnd:true};}
 if(which==='winter'){
  testDate(s,3);s.levels.house=2;s.levels.greenhouse=3;s.days=8;G.tile(s,1,1).structure='greenhouse';G.tile(s,2,1).structure='greenhouse';
  s.unlocked.push('tomato');testHand(s,['seed_tomato','seed_bean','seed_radish','water','snow','mulch']);
 }
 if(which==='lab'){s.levels.house=3;s.levels.lab=2;s.team=[{id:'agronomist',level:1,away:0}];}
 if(which==='equipment'){for(const id of Object.keys(D.TRACKS) as D.TrackId[])if(G.trackAvailable(s,id))s.levels[id]=D.TRACKS[id].levels.length;s.levels.house=5;}
 if(which==='pets'){s.pets=Object.keys(D.PETS) as D.PetId[];s.levels.drone=2;}
 return s;
}

// Dialogue showcase uses ordinary offers. No rewards or purchases are applied.
export function testOrderFixture(org:D.OrgId,step=0):G.GameState{
 const loc=D.LOCATION_IDS.find(l=>D.LOCATIONS[l].orgs.includes(org))!;
 const s=testFixture('normal',loc),def=D.ORGS[org],story=def.steps[step];
 for(const st of Object.values(s.orgs))if(st){st.offer=null;st.active=null;st.wait=2;}
 const crops=story?.crops??def.wants;
 const q:G.Quest={id:s.nextQuestId++,org,step,title:story?.title??'Поставка к сроку',text:story?.text??'',lines:crops.slice(0,story?.lines??1).map(c=>({crop:c,qty:story?.qty??8})),pay:40,rel:18,weeks:story?.weeks??6,reward:story?.reward,createdWeek:s.absWeek,expires:s.absWeek+6};
 s.orgs[org]!.step=step;s.orgs[org]!.offer=q;
 return s;
}
