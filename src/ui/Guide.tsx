// The tutorial coach. Палыч, the village old-timer, talks the player through the lesson in a paper note:
// the lesson's name and progress on top, one clear instruction, a line of detail. A soft dim with a hole
// shows where to look and an engraved pointing hand acts the gesture out — tap, tap twice, drag a card,
// slide a slider. Every week ends with free time: a small note and no pointing at all.
// The spotlight follows its target every frame (a rAF loop writes transforms straight to the DOM, so it
// never lags behind a moving card or a scrolling page); the note itself re-renders a few times a second.
// The lesson logic lives in engine/tutorial.ts: this file only reads the screen and points.
import {useEffect,useLayoutEffect,useRef,useState} from 'preact/hooks';

import {AREA_IDS,areaOpen,dryBeds,lessonPrice,ownFarmDifferences,tutorialChapter,tutorialPlant,tutorialReserve,practiceNeed,saleProgress,wateringProgress,FREE_STEPS,TUTORIAL_STEPS,TUTORIAL_WEEK,CHAPTER_WEEKS,type TutorialArea,type TutorialSession,type TutorialStep} from '../engine/tutorial';
import type {VillageMode} from './Village';
import type {TabId} from './FarmScreen';
import {workEffectCells,shapeTiles,plantBlock,nextPayment,money,plural,unitsAcc,type Action} from '../engine/game';
import {CROPS} from '../engine/data';
import {PORTRAIT_IMAGES} from '../art/portraits';
import {BUYERS} from '../content/orderDialogue';
import {weekDate} from '../content/rules';
import {visibleCardFocus} from './coachGeometry';
import {useModal} from './common';
export interface TutorialControls {session:TutorialSession;onNext:()=>void;onExit:()=>void;onOwn?:()=>void;onRetry:()=>void;onReset:()=>void;onHideHint:(hidden:boolean)=>void;error?:string|null;precheck?:(a:Action)=>string|null}
const visible=(e:Element)=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.right>0&&r.left<innerWidth&&r.bottom>75&&r.top<innerHeight;};
const located=(e:Element)=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.right>0&&r.left<innerWidth;};
const q=(s:string)=>{const es=Array.from(document.querySelectorAll(s));return es.find(visible)??es.find(located)??null;};
const button=(text:string)=>Array.from(document.querySelectorAll('button,[role="button"]')).find(e=>located(e)&&((e.getAttribute('aria-label')??e.textContent??'').includes(text)))??null;
const nav=(tab:TabId)=>q(`[data-tab="${tab}"]`);
type Gesture='tap'|'double'|'drag'|'slide';
/** a level-style goal with its counter: «Полить ростки 1/3» */
interface Goal {label:string;done:number;of:number}
type Hint={text:string;target:Element|null;next?:boolean;nextLabel?:string;more?:string;hello?:string;area?:Element[];gesture?:Gesture;drop?:Element|null;check?:[string,boolean][];free?:boolean;goal?:Goal};

// every week of the lesson is a level with one goal (docs/ONBOARDING-v4.md)
const WEEK_GOAL:Record<number,string>={1:'Огород Палыча',2:'Первые деньги',3:'Деревня и погода',4:'Без подсказок',5:'Земля',6:'Помощник',7:'Селекция',8:'Улучшение',9:'Постройка',10:'Своё хозяйство'};
const weekLabel=(step:TutorialStep)=>{const w=TUTORIAL_WEEK[step],ch=tutorialChapter(step);return `Неделя ${ch==='I'?w:w-CHAPTER_WEEKS.I} из ${CHAPTER_WEEKS[ch]} · ${WEEK_GOAL[w]}`;};
// the note's bar: how far into the current chapter
const chapterProgress=(step:TutorialStep)=>{
  const i=TUTORIAL_STEPS.indexOf(step),c=TUTORIAL_STEPS.indexOf('chapter');
  return tutorialChapter(step)==='I'?i/c:(i-c-1)/(TUTORIAL_STEPS.length-c-2);
};
const PRAISE=['Получилось!','Отлично!','Верно!','Хорошо!'];
const CH1=['Посадка и поворот фигуры','Неделя и рабочие дни','Продажа урожая','Приём и сдача заказа','Полив','Деревня','Защита от града','Неделя без подсказок'];
const CH2=['Сорняки и плодородие','Помощник на ферме','Селекция семян','Улучшения','Постройки на поле','Заказ без подсказок'];
// what opens, said where it opens (shop and bank open with chapter II and are named in its first line)
const OPENED:Partial<Record<TutorialArea,{text:string;at:string}>>={
  barn:{text:'Амбар открыт!',at:'[data-tab="barn"]'},orders:{text:'Заказы открыты!',at:'[data-tab="orders"]'},village:{text:'Деревня открыта!',at:'.v-sign'},
  deck:{text:'Обмен открыт!',at:'.exchange-deck'},tools:{text:'Инструменты открыты!',at:'.toolbox-btn'},
  house:{text:'Дом открыт!',at:'[data-tab="house"]'},lab:{text:'Лаборатория открыта!',at:'[data-tab="lab"]'},
};
// free time: a quiet tip each week, never an instruction
const TIP:Partial<Record<TutorialStep,string>>={
  play2:'Можно посадить что-нибудь ещё или сразу завершить неделю.',
  play3:'Видите значки в небе над полем? Это прогноз: на эту неделю и на следующие. Заморозки, жару и град видно заранее.',
  play5:'Журнал в инструментах расскажет, что было за ночь.',
  play6:'С помощником в неделе стало больше рабочих дней.',
  play7:'К утру карта вернётся из лаборатории с новой клеткой.',
  play8:'К следующей неделе будет готово. Пока займитесь грядками.',
  play9:'Линия держит воду в своём ряду. Дальше будет заказ, уже без моих подсказок.',
};
// Палыч's line when the lesson moves to another section
const TO_SECTION:Partial<Record<TutorialStep,string>>={
  sale:'Доброе утро! Мой редис собран — ящики уже в амбаре.',
  visit:'Деньги получили! К ферме уже идут гости, так что вернёмся на поле.',
  water:'Заказ за вами, он подождёт, пока созреет редис. А ростки ждать не будут, они пить просят.',
  hail:'Заказ сдан! А теперь посмотрим на погоду.',
  weeds:'Начинаем вторую главу. Смотрите, на поле вылез сорняк.',
  hire:'Пора нанять помощника. Дом уже открыт.',
  lab:'Лаборатория открыта. Теперь улучшим семена.',
};

function hint(t:TutorialSession,tab:TabId,visitLate=false,village:VillageMode='field'):Hint{
  const s=t.farm,step=t.step;
  const guest=(()=>{const o=Object.values(s.orgs).map(o=>o?.offer??o?.active).find(Boolean);return o?BUYERS[o.org].name.split(' ').slice(0,2).join(' '):'Соседка';})();
  const goto=(id:TabId,hello?:string):Hint=>({text:`Загляните ${id==='barn'?'в амбар':id==='lab'?'в лабораторию':id==='house'?'в дом':id==='orders'?'в заказы':'на поле'}.`,target:nav(id),gesture:'tap',hello});
  const hand=(uid:number)=>q(`.fan-slot[data-uid="${uid}"] .card`);
  const card=(def:string)=>hand(s.hand.find(c=>c.def===def&&hand(c.uid)?.classList.contains('selected'))?.uid??s.hand.find(c=>c.def===def)?.uid??-1);
  const bed=(x:number,y:number)=>q(`[data-tile="${x},${y}"]`);
  const selected=(el:Element|null)=>el?.classList.contains('selected');
  const cancelCard=():Hint=>({text:'Сначала снимите выбор карты.',target:button('Отменить выбор'),gesture:'tap',more:'Потом нажмите на грядку, и откроется её меню.'});
  const menuAt=q('.field-view')?.getAttribute('data-bed-menu');
  const waterCells=(q('.field-view')?.getAttribute('data-water-cells')??'').split(';');
  if(s.phase==='shortfall')return{text:'Сначала решим вопрос с платежом.',target:button('Решить платёж'),gesture:'tap',more:'В помощи (?) можно повторить учебный шаг.'};
  if(step==='chapter'||step==='done')return{text:'',target:null};
  if(FREE_STEPS.includes(step)){
    const dry=dryBeds(s);
    const thirsty=dry.length?CROPS[s.tiles[dry[0][1]*6+dry[0][0]].crop!.id].name:null;
    return{text:'Свободное время.',target:null,free:true,more:TIP[step],hello:thirsty?`${thirsty} просит пить. Полейте, если хотите урожай.`:undefined};
  }
  const need:TabId=step==='sale'?'barn':['accept','deliver'].includes(step)?'orders':step==='lab'?'lab':['hire','upgrade'].includes(step)?'house':'field';
  if(step==='village'||(step==='deliver'&&tab==='field')){
    // the real game reaches its sections through the village above the field: the order is taken there
    const sign=q('.v-sign'),open=village==='village';
    const org=Object.keys(s.orgs)[0];
    if(open)return{text:step==='village'?'Это деревня.':'Нажмите на дом учительницы: там ждут заказ.',target:q(`.spot-g[data-k="${org}"]`)??q('.v-bubble')??q('.spot-g[data-k="board"]'),gesture:'tap',more:'Здесь стоят дом, амбар, лаборатория и доска заказов. Вернуться можно кнопкой «К полю» внизу.'};
    if(!sign&&step==='village')return{text:'Заказ ждёт в разделе «Заказы».',target:null,next:true,nextLabel:'К заказам',hello:'Утро! Ваш редис созрел.'};
    return{text:'Откройте деревню: нажмите «Деревня» над полем.',target:sign??nav('field'),gesture:'tap',hello:step==='village'?'Утро! Ваш редис созрел. Учительница ждёт его в деревне.':undefined,more:'Деревня находится над полем, её можно открыть и потянув небо вниз. Там дом, амбар, лаборатория и доска заказов.'};
  }
  // T07 · the selection line names the crop that was really improved
  const toSection=(st:TutorialStep)=>st==='upgrade'?(t.labCrop?`Селекция готова: семена «${CROPS[t.labCrop].name}» вернулись в колоду с новой клеткой.`:'Селекция готова: семена вернулись в колоду с новой клеткой.'):TO_SECTION[st];
  // T01 · a paid step without the money for it: raise it first (sell, a loan), the lesson waits
  const price=lessonPrice(t);
  if(price!==null&&s.money<price){
    const short=money(Math.ceil((price-s.money)*100)/100);
    if(tab!=='barn')return{...goto('barn'),hello:`На этот шаг нужно ${money(price)}, не хватает ${short}.`,more:'Продайте урожай или возьмите кредит в кассе амбара.'};
    return{text:`Не хватает ${short}: продайте урожай или возьмите кредит в «Кассе».`,target:q('.sale-row .sale-go')??q('.barn-links [role="tab"]:last-child'),gesture:'tap',more:'Когда денег хватит, продолжим.'};
  }
  if(step!=='practice'&&step!=='place'&&step!=='solo'&&tab!==need)return goto(need,toSection(step));
  // a lesson on the field while the village stands open: back to the field first
  if(need==='field'&&tab==='field'&&village!=='field'&&step!=='solo')return{text:'Вернитесь к полю: «К полю» внизу.',target:q('.v-back')??nav('field'),gesture:'tap',hello:toSection(step)};
  if(step==='sale'&&q('.barn-links [role="tab"]:first-child[aria-selected="false"]'))return{text:'В амбаре откройте «Урожай».',target:q('.barn-links [role="tab"]:first-child'),gesture:'tap'};
  if(step==='lab'&&q('.lab-pane .seg button:first-child:not(.on)'))return{text:'Откройте раздел «Селекция».',target:q('.lab-pane .seg button:first-child'),gesture:'tap'};
  if(['accept','deliver'].includes(step)&&q('.orders-pane .hall'))return{text:'Вернитесь из зала славы к заказам.',target:q('.orders-pane .back-link'),gesture:'tap'};
  const building=q('.field-view')?.getAttribute('data-build-item');
  if(tab==='field'&&building&&step!=='place'&&step!=='practice'&&step!=='solo')return{text:'Сначала закончите с постройками: нажмите на молоток.',target:button('Завершить постройки'),gesture:'tap'};
  if(tab==='field'&&q('.exchange-cancel')&&step!=='practice'&&step!=='solo')return{text:'Отмените обмен, и продолжим урок.',target:q('.exchange-cancel'),gesture:'tap'};
  switch(step){
    case 'plant':{
      const e=card('seed_radish'),other=q('.fan-slot .card.selected');
      const hello=t.plantedAt?undefined:'Здравствуйте! Я Палыч. Мой редис к утру поспеет, а вы посадите свой.';
      if(other&&!selected(e))return{text:'Эта карта пригодится позже. Начнём с редиса.',target:e,gesture:'tap',hello};
      // T04 · the first gesture is two taps: it lands exactly where the finger is (a drag aims above the finger)
      return selected(e)?{text:'Теперь нажмите на свободную грядку.',target:bed(2,2),gesture:'tap',more:'Подойдёт любая пустая грядка.'}
        :{text:'Нажмите на карту редиса.',target:e,gesture:'tap',more:'Потом нажмите на свободную грядку. Карту можно и перетащить: она встанет чуть выше пальца.',hello};
    }
    case 'rotate':{const e=card('seed_bean');return selected(e)?{text:'Нажмите на фасоль ещё раз, и фигура повернётся.',target:e,gesture:'double',more:'Каждое касание поворачивает посадку.'}:{text:'Фасоль сажают фигурой. Выберите её карту.',target:e,gesture:'tap',more:'На карте нарисовано, какие клетки займёт посадка.',hello:'Редис посажен. Теперь фигура посложнее.'};}
    case 'bean':{
      const c=s.hand.find(c=>c.def==='seed_bean'),e=card('seed_bean');
      if(!selected(e))return{text:'Снова выберите фасоль.',target:e,gesture:'tap'};
      const rot=Number(q('.field-view')?.getAttribute('data-card-rotation')??1);
      const anchors:[[number,number],...Array<[number,number]>]=[[3,2],[3,1],[2,2],[1,2],[1,3],[2,3]];
      const at=anchors.find(([x,y])=>c&&!plantBlock(s,c,shapeTiles(c,x,y,rot)))??[3,2];
      return{text:'Посадите фасоль на подсвеченные грядки.',target:bed(at[0],at[1]),gesture:'tap',more:'Нажмите на первую клетку фигуры.',area:c?shapeTiles(c,...at,rot).map(([x,y])=>bed(x,y)).filter((e):e is Element=>!!e):[]};
    }
    case 'night':return{text:'На сегодня хватит. Завершите неделю.',target:q('.end-week'),gesture:'tap',hello:'Утром соберём мой редис — увидите, как это бывает.',more:'Число в жёлтом кружке на карте показывает, сколько рабочих дней она займёт: большим посадкам нужно два. За ночь всё подрастёт, а спелое соберётся само.'};
    case 'sale':{
      const range=q('.sale-row[data-crop="radish"] input[type="range"]') as HTMLInputElement|null,all=!!range&&range.value===range.max;
      const prog=saleProgress(t),goal={label:'Продать редис',done:prog.done,of:prog.of};
      return all?{text:'Теперь нажмите зелёную кнопку «Продать».',target:q('.sale-row[data-crop="radish"] .sale-go'),gesture:'tap',more:'Деньги придут сразу. Стрелка у цены показывает, дорожает редис или дешевеет.',goal}
        :{text:'Продайте весь редис: сдвиньте ползунок до конца вправо.',target:range??q('.sale-row'),gesture:'slide',more:'Ползунок задаёт, сколько продать, а зелёная кнопка продаёт.',hello:prog.done?undefined:'Это мой урожай, продавайте смело.',goal};
    }
    case 'water':{
      const prog=wateringProgress(t),goal={label:'Полить ростки',done:prog.done,of:prog.of};
      const dry=(t.thirsty??[]).filter(([x,y])=>{const v=s.tiles[y*6+x];return !!v.crop&&v.moisture===0;});
      const first=dry[0]??tutorialPlant(t),isDry=(k:string|null|undefined)=>dry.some(([x,y])=>k===`${x},${y}`);
      const e=card('water');
      if(q('.water-confirm'))return waterCells.some(isDry)?{text:'Нажмите на лейку, чтобы полить.',target:q('.water-confirm'),gesture:'tap',goal}:{text:'Сухая грядка не выбрана. Отмените полив и нажмите на неё.',target:button('Отменить полив'),gesture:'tap',goal};
      if(q('.bed-popover'))return isDry(menuAt)?{text:'Нажмите лейку и выберите грядки.',target:button('Выбрать грядки'),gesture:'tap',more:'Лейка польёт до трёх грядок подряд в одну линию.',goal}:{text:'Откройте меню сухой грядки.',target:bed(...first),gesture:'tap',goal};
      if(selected(e))return{text:'Нажмите на сухую грядку.',target:bed(...first),gesture:'tap',more:'Карта польёт и соседние грядки крестом.',goal};
      // T09 · the can comes first: it costs no card, and on one's own farm water cards are few
      if(q('.fan-slot .card.selected'))return cancelCard();
      return{text:'Ростки просят пить, на них красная капля. Нажмите на сухую грядку.',target:bed(...first),gesture:'tap',more:'В меню грядки есть лейка, она не тратит карту. Подойдёт и карта «Полив».',hello:'Цифра на грядке показывает, сколько недель до урожая. Без воды рост встанет.',goal};
    }
    case 'hail':{
      const st=s.strikes[0]?.cells[0],e=card('shelter');
      if(button('Защитить на эту')&&st)return menuAt===`${st[0]},${st[1]}`?{text:'Щит закроет эту грядку до конца недели.',target:button('Защитить на эту'),gesture:'tap'}:{text:'Откройте меню грядки с фасолью.',target:bed(st[0],st[1]),gesture:'tap'};
      if(selected(e)&&st){
        const anchors:[[number,number],...Array<[number,number]>]=[[st[0]-1,st[1]-1],[st[0],st[1]-1],[st[0]-1,st[1]],[st[0],st[1]]];
        const at=anchors.find(([x,y])=>x>=1&&x<=2&&y>=1&&y<=2&&workEffectCells(s,'shelter',x,y).some(([a,b])=>a===st[0]&&b===st[1]))??[st[0],st[1]];
        return{text:'Накройте подсвеченный квадрат.',target:bed(at[0],at[1]),gesture:'tap',more:'Нажмите на его верхнюю левую грядку. Укрытие держится 3 недели.',area:workEffectCells(s,'shelter',...at).map(([x,y])=>bed(x,y)).filter((e):e is Element=>!!e)};
      }
      return{text:'Выберите «Укрытие», и накроем фасоль.',target:e??(st?bed(st[0],st[1]):q('.sky-token.bad')),gesture:'tap',more:'Град видно на грядке и в небе над полем. Грядку можно закрыть и щитом из её меню.',hello:'Ночью обещают град. Если не накроем, фасоль потеряет половину урожая.'};
    }
    case 'visit':return{text:'К ферме идут гости…',target:null,hello:'Продано! Слух о моём редисе дошёл до деревни.',more:'Гости приходят с заказами: вы сдаёте урожай и получаете деньги и дружбу.',...(visitLate?{next:true,nextLabel:'К заказам'}:{})};
    case 'accept':{
      // B-14а: a concrete date, not «the term starts at once» — the term runs from the offer itself
      const o=Object.values(s.orgs).map(o=>o?.offer).find(Boolean);
      return{text:`${guest} просит ${unitsAcc(tutorialReserve(t))} редиса. Возьмите заказ.`,target:button('Взять')??q('.org2'),gesture:'tap',hello:s.absWeek<=2?'Ваш редис ещё растёт — заказ подождёт, пока он созреет.':undefined,more:o?.deadline!==undefined?`Срок сдачи: ${weekDate(s,o.deadline)}. Если возьмёте заказ, он останется за вами. Если не возьмёте, штрафа не будет.`:'Если возьмёте заказ, он останется за вами. Если не возьмёте, штрафа не будет.'};
    }
    case 'deliver':return{text:'Сдайте заказ, дети ждут.',target:button('Сдать'),gesture:'tap',more:'Урожай сам к покупателю не уходит.'};
    case 'solo':{
      const g=t.solo??{planted:false,watered:false,sold:false,sell:false};
      const again=(g.weeks??1)>=2;
      const check:[string,boolean][]=[['Посадить',g.planted],['Полить',g.watered],...(g.sell?[['Продать урожай',g.sold] as [string,boolean]]:[])];
      const left=check.filter(([,ok])=>!ok).map(([l])=>l);
      const pay=nextPayment(s);
      const rent=`В конце весны будет взнос по залогу, ${money(pay.amount)}. Сумма видна вверху, деньги спишутся сами.`;
      const stuck=s.days<1&&left.every(l=>l!=='Продать урожай');
      if(!left.length||stuck)return tab!=='field'?{...goto('field'),check}
        :{text:stuck?'Дни закончились. Завершите неделю.':'Всё сделано. Завершите неделю.',target:q('.end-week'),gesture:'tap',check,more:rent,area:[q('.tb-pay')].filter((e):e is Element=>!!e)};
      if(again)return{text:`Ещё неделя. Осталось: ${left.join(', ').toLowerCase()}.`,target:null,free:true,check,hello:'Не беда, попробуем ещё раз. Если что, я рядом.',more:'Полить нужно посадку: сухая земля без ростков не в счёт.'};
      return{text:'Эта неделя ваша: посадите, полейте, продайте.',target:null,free:true,check,hello:g.planted||g.watered||g.sold?undefined:'Дальше вы уже сами. Если что, я рядом.',more:'Теперь в руке 7 карт, а рабочих дней по-прежнему 3. И обмен открыт.'};
    }
    case 'weeds':{
      const [wx,wy]=t.weedAt??[1,1];
      if(q('.fan-slot .card.selected'))return cancelCard();
      return{text:button('Прополоть')?'Прополите грядку.':'Вырос сорняк. Если его не прополоть, на заросшей грядке ничего не получится посадить.',target:button('Прополоть')??bed(wx,wy),gesture:'tap',more:button('Прополоть')?undefined:'Нажмите на грядку с сорняком: в её меню есть прополка.',hello:'Вторая глава началась. Лавка и касса в амбаре тоже открыты.'};
    }
    case 'lens':{
      // the lenses live in the toolbox under the field: open it, take «Линзы», then «Плодородие»
      const open=q('.toolbox.open'),soil=open&&q('.toolbox.lenses')?button('Плодородие'):null,lens=open&&!q('.toolbox.lenses')?button('Линзы'):null;
      return{text:soil?'Выберите линзу «Плодородие».':lens?'Нажмите «Линзы».':'Земля везде разная. Откройте инструменты: чемоданчик под полем.',target:soil??lens??q('.toolbox-btn'),gesture:'tap',more:'Бедная почва даёт меньше урожая: ×0,6 при плодородии 1 из 5, ×1,2 при 3 из 5. Когда посмотрите, нажмите «Готово».',hello:open?undefined:'Инструменты открыты: журнал, линзы и постройки.'};
    }
    case 'compost':{const e=hand(t.compostUid??-1);return{text:selected(e)?'Высыпьте компост на бедную грядку.':'Я принёс мешок компоста. Улучшим бедную землю.',target:selected(e)?bed(1,2):e,gesture:'tap',more:'Плодородие +1 на этой грядке и у соседей.'};}
    case 'hire':return{text:'Наймите помощника.',target:button('Нанять ·')??q('.candidate'),gesture:'tap',more:'Бригадир даст лишний рабочий день в неделю. Платить ему нужно каждую неделю.'};
    case 'lab':return{text:q('.breed-col:first-child .project-preview')?'Сравните расход и урожай, потом начните проект.':q('.shape-editor')?'Добавьте к фигуре одну клетку.':'Выберите семена для селекции.',target:q('.breed-col:first-child .project-preview')?q('.breed-col:first-child button'):q('.shape-editor .spot')??q(`.lab-pane [data-card-uid="${t.labUid}"]`)??q('.lab-pane .card'),gesture:'tap',more:'Проект займёт неделю: карта уйдёт в лабораторию и вернётся улучшенной.'};
    case 'upgrade':return{text:'Улучшите бочку до капельного полива.',target:q('[data-track="irrigation"] .track2-foot button'),gesture:'tap',more:'Работы займут неделю.'};
    case 'place':{
      const placing=building==='drip'&&!q('.field-view[data-build-moving="true"]');
      return tab==='house'?{text:'Поставьте капельный полив на поле.',target:button('Разместить на поле')??q('[data-track="irrigation"]'),gesture:'tap',hello:'Капельный полив готов.'}
        :{text:placing?'Нажмите на ряд, и линия ляжет вдоль него.':'Загляните в дом, там кнопка «Разместить на поле».',target:placing?bed(2,2):nav('house'),gesture:'tap',more:placing?'В своём ряду линия убирает обычное высыхание, но жара и засуха всё равно сушат. Сама она не поливает, так что сухие грядки сначала полейте.':undefined,hello:placing?undefined:'Капельный полив готов.'};
    }
    case 'practice':{
      if(tab==='orders'&&q('.orders-pane .hall')&&!t.delivered)return{text:'Вернитесь из зала славы к заказам.',target:q('.orders-pane .back-link'),gesture:'tap'};
      const need=practiceNeed(t),crop=need?.crop;
      const check:[string,boolean][]=[['Полив',t.watered],[`Заказ${crop?`: ${CROPS[crop].name.toLowerCase()}`:''}`,t.delivered]];
      if(need&&need.have<need.qty){
        const name=CROPS[need.crop].name;
        if(tab!=='field')return{...goto('field'),more:`Для заказа нужен урожай: ${name.toLowerCase()}. Сначала вырастим его.`,check};
        if(need.plants.length){
          const dry=need.plants.find(v=>v.dry);
          if(dry&&s.days<1)return{text:'Рабочие дни закончились. Завершите неделю.',target:q('.end-week'),gesture:'tap',more:'Утром рабочие дни вернутся. Первым делом полейте посадку для заказа.',check};
          if(dry&&q('.fan-slot .card.selected')&&!selected(card('water')))return cancelCard();
          return dry?{text:'Полейте посадку для заказа.',target:bed(...dry.at),gesture:'tap',more:'В сухой земле рост останавливается. Нажмите на грядку и выберите лейку.',check}
            :{text:'Посадка полита. Завершите неделю, и она подрастёт.',target:q('.end-week'),gesture:'tap',more:`Для заказа нужно ${unitsAcc(need.qty)} урожая (${name.toLowerCase()}). Проверяйте влагу каждую неделю.`,check};
        }
        if(need.seed){
          if(s.days<1)return{text:'Рабочие дни закончились. Завершите неделю.',target:q('.end-week'),gesture:'tap',more:`Семена останутся в руке. Утром посадите «${name}».`,check};
          const e=hand(need.seed.uid),rot=Number(q('.field-view')?.getAttribute('data-card-rotation')??0);
          const at=([[1,1],[2,1],[3,1],[1,2],[2,2],[3,2],[1,3],[2,3],[3,3]] as [number,number][]).find(([x,y])=>!plantBlock(s,need.seed!,shapeTiles(need.seed!,x,y,rot)));
          if(selected(e)&&at)return{text:`Посадите «${name}» на свободные грядки.`,target:bed(...at),gesture:'tap',area:shapeTiles(need.seed,...at,rot).map(([x,y])=>bed(x,y)).filter((e):e is Element=>!!e),more:'Потом полейте посадку и завершите неделю.',check};
          if(!at){
            // the beds are held by weeds: the player finds them on his own field, as on his own farm
            const w=s.tiles.findIndex(v=>v.owned&&v.weeds&&!v.crop);
            if(w>=0)return q('.fan-slot .card.selected')?cancelCard():{text:button('Прополоть')?'Прополите грядку.':'Грядки заросли. Прополите место для посева.',target:button('Прополоть')??bed(w%6,Math.floor(w/6)),gesture:'tap',more:'Нажмите на заросшую грядку и выберите прополку: 1 день за грядку.',check};
            return{text:'Освободите место для посева.',target:q('.end-week'),gesture:'tap',more:'Присмотрите за посадками и дождитесь урожая. Карту можно повернуть, тогда она займёт другое место.',check};
          }
          return{text:`Для заказа посадите «${name}». Выберите карту.`,target:e,gesture:'tap',more:`Нужно ${unitsAcc(need.qty)} урожая. После посадки не забывайте поливать.`,check};
        }
        const ready=s.days>0&&s.exchangeWeek!==s.absWeek;
        return ready?{text:q('.exchange-cancel')?'Выберите ненужную карту для обмена.':'Нужных семян в руке нет. Нажмите обмен на колоде.',target:q('.exchange-cancel')?hand(s.hand[0]?.uid):button('Обменять карту'),gesture:'tap',more:`Дальше в учебной колоде лежат нужные семена (${name.toLowerCase()}). Обмен стоит один рабочий день.`,check}
          :{text:'Завершите неделю, и обмен снова станет доступен.',target:q('.end-week'),gesture:'tap',more:`Нужны семена (${name.toLowerCase()}). В новую неделю рука пополнится из колоды, а обмен снова будет доступен.`,check};
      }
      if(need&&need.have>=need.qty&&!t.delivered)return tab==='orders'
        ?{text:'Урожай готов. Сдайте учебный заказ.',target:button('Сдать')??button('Взять заказ'),gesture:'tap',more:t.orderNotice,check}
        :{text:'Урожая достаточно. Откройте заказы.',target:nav('orders'),gesture:'tap',more:t.orderNotice,check};
      if(tab!=='field')return{...goto('field'),more:'Осталось полить грядку, и обучение пройдено.',check};
      const dry=s.tiles.findIndex(v=>v.owned&&!!v.crop&&!v.crop.rest&&v.moisture<3);
      const growing=s.tiles.some(v=>v.owned&&!!v.crop&&!v.crop.rest);
      if(dry>=0)return{text:'Осталось полить посадку.',target:bed(dry%6,Math.floor(dry/6)),gesture:'tap',more:'Нажмите на грядку с ростком и выберите лейку. Подойдёт и карта «Полив».',check};
      return growing?{text:'Посадки политы до краёв. Завершите неделю.',target:q('.end-week'),gesture:'tap',more:'Полейте, когда земля подсохнет: засчитывается полив посадки.',check}
        :{text:'Посадите любую культуру и полейте посадку.',target:q('.fan-slot .card'),gesture:'tap',more:'Засчитывается полив ростка, а не пустой земли.',check};
    }
    default:return{text:'Продолжайте работу на ферме.',target:null};
  }
}

// ---------- the engraved pointing hand ----------
function Manicule(){
  return <g class="g-hand-art" transform="rotate(-26)">
    <ellipse cx={9} cy={30} rx={13} ry={7} fill="rgba(40,24,10,.18)" transform="translate(4 6)"/>
    <path d="M-5.6 15 Q-6.4 12.6 -4 12.2 L4 12.6 Q6 11 8.6 12 Q10.8 10.6 13 12.2 Q15.4 11.4 17 13.6 Q18.6 15.6 18 19 L17 30 Q16 37 9 37.6 H0 Q-6 37 -7.6 31 L-10.4 22 Q-11.4 18 -8.6 17.4 Q-6.4 17.2 -5.6 19.6 Z" fill="#fff8e8" stroke="#3f2a1d" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M-3.9 16 V2.4 Q-3.9 -2.2 0 -2.2 Q3.9 -2.2 3.9 2.4 V14" fill="#fff8e8" stroke="#3f2a1d" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M-2 1 Q0 -.4 2 1" fill="none" stroke="#c9a77a" stroke-width="1"/>
    <path d="M7.4 12.6 V18 M11.8 12.2 V18.4 M15.6 13.8 V19" stroke="#a88a62" stroke-width="1" stroke-linecap="round"/>
    <path d="M-8 34 H18.6 L19.4 42 H-8.6 Z" fill="#e9d6ae" stroke="#3f2a1d" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M-8.4 42 l2.4 3 l2.4 -3 l2.4 3 l2.4 -3 l2.4 3 l2.4 -3 l2.4 3 l2.4 -3 l2.4 3 l2.4 -3" fill="none" stroke="#3f2a1d" stroke-width="1.1" stroke-linejoin="round"/>
  </g>;
}
function Gest({kind}:{kind:Gesture}){
  return <svg class={`g-root g-${kind}`} width="1" height="1" overflow="visible" aria-hidden="true">
    <circle class="g-ripple" r={9}/>{kind==='double'&&<circle class="g-ripple r2" r={9}/>}
    <g class="g-move">
      {kind==='drag'&&<g class="g-ghost"><rect x={-14} y={-40} width={28} height={39} rx={4.5}/><rect x={-14} y={-40} width={28} height={9} rx={4.5} class="g-ghost-band"/><rect x={-7} y={-25} width={14} height={13} rx={3} class="g-ghost-art"/></g>}
      <g class="g-press"><Manicule/></g>
    </g>
  </svg>;
}

// ---------- the chapter certificate ----------
// T11 · what is different on one's own farm, read once from a real new farm
let ownFarm:ReturnType<typeof ownFarmDifferences>|null=null;
const own=()=>ownFarm??=ownFarmDifferences();
function Certificate({chapter,soloPassed=true,onPrimary,primary,onSecondary,secondary}:{chapter:'I'|'II';soloPassed?:boolean;onPrimary:()=>void;secondary?:string;onSecondary?:()=>void;primary:string}){
  // T02 · the week on one's own is ticked only when it was done
  const items:[string,boolean][]=(chapter==='I'?CH1:CH2).map(it=>[it,it!=='Неделя без подсказок'||soloPassed]);
  const o=own();
  // PSV-007 · a real modal: focus on the first action, Tab stays inside, the farm behind is inert
  const ref=useRef<HTMLDivElement>(null);
  useModal(ref);
  return <div class="coach-cert-back">
    <div class="coach-cert" role="dialog" aria-modal="true" aria-labelledby="coach-cert-title" tabIndex={-1} ref={ref}>
      <div class="cc-seal" aria-hidden="true"><span>{chapter}</span></div>
      <small class="cc-kicker">учебная ферма · глава {chapter}</small>
      <h2 id="coach-cert-title">{chapter==='I'?'Первый урожай':'Своё хозяйство'}</h2>
      <p class="cc-lead">{chapter==='I'?'Четыре недели позади. Первый урожай собран, сдан и продан. Вот чему вы научились:':'Вы прошли всё обучение. Теперь вы умеете:'}</p>
      <ul class="cc-list">{items.map(([it,ok],i)=><li class={ok?'':'cc-skip'} style={{['--i' as string]:String(i)}}><i aria-hidden="true">{ok?'✓':''}</i>{it}{!ok&&<small> (потренируетесь на своей ферме)</small>}</li>)}</ul>
      <div class="cc-own"><b>На своей ферме будет по-другому</b><ul>
        <li>Вы стартуете с {money(o.money)}, а не с {money(o.lessonMoney)}.</li>
        <li>Лейка поливает {o.can} {plural(o.can,'грядку','грядки','грядок')} вместо {o.lessonCan}. Чтобы поливать больше, купите улучшение «Бочка и шланг».</li>
        <li>Погода настоящая: бывают заморозки, жара и град. Обращайте внимание на прогноз погоды в небе над полем.</li>
        {chapter==='II'&&<li>Стройки и селекция занимают от {o.projectWeeks} {plural(o.projectWeeks,'недели','недель','недель')}, а не одну неделю, как здесь.</li>}
      </ul></div>
      <div class="cc-palych"><img src={PORTRAIT_IMAGES.palych} alt=""/><p>{chapter==='I'?'«Хозяйство теперь ваше, можете идти на свою ферму. А если хотите, покажу ещё землю, помощников и селекцию. Вернуться сюда можно в любой момент с карты ферм.»':'«Дальше у вас свой дом. Он в залоге, и выкупить его нужно за три осени. Вас ждут ярмарка, соседи и смотр урожая, который судит Пряхин. А когда окрепнете, сможете собрать обоз в Заречье, на Кубань и на Алтай. Если запутаетесь, загляните в журнал: он подскажет.»'}</p></div>
      <div class="cc-actions"><button type="button" class="guide-next primary" onClick={onPrimary}>{primary}</button>{secondary&&<button type="button" class="guide-next" onClick={onSecondary}>{secondary}</button>}</div>
    </div>
  </div>;
}

interface Box {x:number;y:number;w:number;h:number}
const boxOf=(r:DOMRect,pad=0):Box=>({x:r.left-pad,y:r.top-pad,w:r.width+pad*2,h:r.height+pad*2});
const union=(bs:Box[]):Box=>{const x=Math.min(...bs.map(b=>b.x)),y=Math.min(...bs.map(b=>b.y));return{x,y,w:Math.max(...bs.map(b=>b.x+b.w))-x,h:Math.max(...bs.map(b=>b.y+b.h))-y};};
// hidden with visibility, not opacity: the layers' own fade/pulse animations drive opacity and would win
const show=(el:Element|null,on:boolean)=>{if(el)(el as HTMLElement).style.visibility=on?'':'hidden';};
const place=(el:HTMLElement|null,b:Box|null)=>{if(!el)return;if(!b){show(el,false);return;}show(el,true);el.style.transform=`translate(${b.x}px,${b.y}px)`;el.style.width=`${b.w}px`;el.style.height=`${b.h}px`;};
// where the hand presses: wide targets on their right part, tall ones a little above the middle
const pressPoint=(r:DOMRect):[number,number]=>[r.width>130?r.left+r.width*.72:r.left+r.width/2,r.top+r.height*(r.height>110?.45:.5)];
const handInteracting=()=>!!document.querySelector('.field-view[data-drag-active="true"], .field-view[data-peek-uid]:not([data-peek-uid=""])');

export function GuideHint({controls,tab,village='field',flyTo}:{controls:TutorialControls;tab:TabId;village?:VillageMode;flyTo?:(k:string)=>void}){
  const {session:t,onNext,onExit,onOwn,onRetry,onReset,onHideHint,error}=controls;
  const [,tick]=useState(0),[help,setHelp]=useState(false);
  const [cheer,setCheer]=useState<{text:string;x:number;y:number;key:number}|null>(null);
  const opening=useRef<TutorialArea[]>([]),openTimer=useRef(0);
  const ref=useRef<HTMLDivElement>(null),lastRect=useRef<DOMRect|null>(null),prevStep=useRef(t.step);
  const dimRef=useRef<SVGSVGElement>(null),spotRef=useRef<HTMLDivElement>(null),dropRef=useRef<HTMLDivElement>(null),gestRef=useRef<HTMLDivElement>(null),areaRef=useRef<HTMLDivElement>(null);
  const live=useRef<{target:Element|null;area:Element[];drop:Element|null;gesture?:Gesture;card:boolean;on:boolean;equivalent:number[]}>({target:null,area:[],drop:null,card:false,on:false,equivalent:[]});
  const collapsed=t.hiddenHintStep===t.step;
  // on the field the lesson usually speaks in one line; the whole note opens on request
  const [expanded,setExpanded]=useState(false);
  const stripRef=useRef<HTMLDivElement>(null),stripH_=useRef(48),fullH_=useRef({key:'',h:0}),fullKeyRef=useRef('');
  // the guests come by themselves; if they cannot (another window open, motion off), a button goes on after a while
  const [visitLate,setVisitLate]=useState(false);
  const idle=useRef({ms:0,seen:false});
  useEffect(()=>{
    setVisitLate(false);idle.current={ms:0,seen:false};if(t.step!=='visit')return;
    // count only quiet time on the field: the week's night and morning do not count, and once the guests came there is no button
    const id=setInterval(()=>{const I=idle.current;
      if(q('.visit-sheet')){I.seen=true;return;}
      if(I.seen||q('.field-view[data-busy="true"]')||q('[role="dialog"]')||!q('.field-stage'))return;
      I.ms+=300;if(I.ms>=5000){setVisitLate(true);clearInterval(id);}
    },300);return()=>clearInterval(id);
  },[t.step]);
  useEffect(()=>{const timer=setInterval(()=>tick(n=>n+1),180);return()=>clearInterval(timer);},[]);
  // Swiping between tabs moves every target under the note. Rather than chase them a few times a second,
  // the note and its pointer step aside while the pager moves and come back, placed anew, once it settles.
  // A scroll inside a tab re-places the note on the very next frame instead of waiting for the tick.
  const pagingRef=useRef(false);const [paging,setPaging]=useState(false);
  useEffect(()=>{
    let settle=0,raf=0;
    const onScroll=(e:Event)=>{
      const el=e.target as Element|null;
      if(el instanceof Element&&el.classList.contains('pager')){
        if(!pagingRef.current){pagingRef.current=true;setPaging(true);}
        clearTimeout(settle);settle=window.setTimeout(()=>{pagingRef.current=false;setPaging(false);},170);
        return;
      }
      cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>tick(n=>n+1));
    };
    document.addEventListener('scroll',onScroll,true);
    return()=>{document.removeEventListener('scroll',onScroll,true);clearTimeout(settle);cancelAnimationFrame(raf);};
  },[]);
  useEffect(()=>{
    setHelp(false);setExpanded(false);
    const was=prevStep.current,now=t.step;prevStep.current=now;
    const wi=TUTORIAL_STEPS.indexOf(was),ni=TUTORIAL_STEPS.indexOf(now);
    // what this step opens is celebrated where it opens, once the night and the morning have played
    if(ni>wi)opening.current.push(...AREA_IDS.filter(a=>OPENED[a]&&areaOpen(now,a)&&!areaOpen(was,a)));
    // Success is shown by the bed itself (a sprout, wet soil, no weeds). The stamp is kept for the end of a
    // week's lessons only — when free time begins — so it marks a finished lesson, not every small step.
    if(ni>wi&&FREE_STEPS.includes(now)&&!FREE_STEPS.includes(was)){
      const r=q('.field-stage')?.getBoundingClientRect()??lastRect.current,x=r?r.left+r.width/2:innerWidth/2,y=r?r.top+r.height*.42:innerHeight/2;
      setCheer({text:PRAISE[ni%PRAISE.length],x,y,key:Date.now()});
      const id=setTimeout(()=>setCheer(null),1300);return()=>clearTimeout(id);
    }
  },[t.step]);
  useEffect(()=>{
    const listener=(e:Event)=>{const el=e.target as Element;
      if(t.step==='lens'&&el.closest('[aria-label="Плодородие"]'))onNext();
    };document.addEventListener('click',listener);return()=>document.removeEventListener('click',listener);
  },[t.step,onNext]);
  // the village lesson is done once the village stands open
  useEffect(()=>{if(t.step==='village'&&village==='village')onNext();},[t.step,village]);
  // the order's house may stand far up the village: glide there so the finger finds it
  useEffect(()=>{if(t.step==='deliver'&&village==='village'){const id=setTimeout(()=>flyTo?.(Object.keys(t.farm.orgs)[0]),350);return()=>clearTimeout(id);}},[t.step,village]);
  const base=hint(t,tab,visitLate,village),busy=!!(q('.field-view[data-busy="true"]')||q('.visit-sheet'));
  useEffect(()=>{
    if(busy||paging||!opening.current.length)return;
    const a=opening.current[0],o=OPENED[a]!,el=q(o.at);
    if(!el)return;
    opening.current.shift();
    // the stamp is about 170 px wide: kept clear of the screen's edges
    const r=el.getBoundingClientRect(),y=r.top<140?r.bottom+30:r.top-14,x=Math.max(96,Math.min(innerWidth-96,r.left+r.width/2));
    setCheer({text:o.text,x,y,key:Date.now()});
    el.classList.add('just-opened');
    window.clearTimeout(openTimer.current);
    openTimer.current=window.setTimeout(()=>{el.classList.remove('just-opened');setCheer(null);},1700);
  });
  useEffect(()=>()=>window.clearTimeout(openTimer.current),[]);
  let h:Hint=base;
  const card=!!h.target?.matches('.card');
  const showSpot=!!h.target&&!busy&&!handInteracting()&&!collapsed&&!help&&t.step!=='chapter'&&t.step!=='done';
  const targetDef=card?t.farm.hand.find(c=>String(c.uid)===h.target?.getAttribute('data-card-uid'))?.def:undefined;
  live.current={target:h.target,area:h.area??[],drop:h.gesture==='drag'?h.drop??null:null,gesture:h.gesture,card,on:showSpot,equivalent:targetDef?t.farm.hand.filter(c=>c.def===targetDef).map(c=>c.uid):[]};
  // the spotlight and the hand follow their target every frame, straight in the DOM
  useEffect(()=>{
    let raf=0,marked:Element|null=null;
    const mark=(el:Element|null)=>{
      if(marked&&marked!==el)marked.classList.remove('lesson-card-target');
      if(el&&!el.classList.contains('lesson-card-target'))el.classList.add('lesson-card-target');
      marked=el;
    };
    const frame=()=>{
      const L=live.current;
      const dim=dimRef.current;
      const chosen=document.querySelector('.fan-slot .card.selected');
      const changingCopy=L.card&&chosen&&chosen!==L.target&&L.equivalent.includes(Number(chosen.getAttribute('data-card-uid')));
      const focus=L.card&&L.target&&!handInteracting()?visibleCardFocus(L.target as HTMLElement):null;
      if(!L.on||!L.target||pagingRef.current||handInteracting()||changingCopy||(L.card&&!focus)){
        mark(null);place(spotRef.current,null);place(dropRef.current,null);show(gestRef.current,false);show(dim,false);
        for(const el of Array.from(areaRef.current?.children??[]))show(el,false);
        raf=requestAnimationFrame(frame);return;
      }
      const r=L.target.getBoundingClientRect();lastRect.current=r;
      // One pointer per step (№21): the acting hand when the step is a gesture, otherwise a quiet ring.
      // No dimming of the farm — the player keeps seeing the beds the lesson talks about.
      mark(L.card&&!L.gesture?L.target:null);
      const area=L.area.filter(e=>e!==L.target).map(e=>boxOf(e.getBoundingClientRect(),3));
      const hole=union([boxOf(r,6),...area]);
      place(spotRef.current,L.gesture||L.card?null:hole);
      show(dim,false);
      if(spotRef.current)spotRef.current.classList.toggle('card-spot',L.card);
      const box=areaRef.current;
      if(box){const kids=box.children as HTMLCollectionOf<HTMLElement>;for(let i=0;i<kids.length;i++)place(kids[i],area[i]??null);}
      const d=L.drop?.getBoundingClientRect()??null;
      place(dropRef.current,d?boxOf(d,3):null);
      const g=gestRef.current;
      if(g&&L.gesture){
        const [x,y]=L.gesture==='drag'&&d?pressPoint(d):focus?.point??(L.gesture==='slide'?[r.left+Math.min(26,r.width*.2),r.top+r.height/2]:pressPoint(r));
        show(g,true);g.style.transform=`translate(${x}px,${y}px)`;
        if(L.gesture==='drag'&&d){const start=focus?.point??[r.left+r.width/2,r.top+r.height*.45];g.style.setProperty('--fx',`${start[0]-x}px`);g.style.setProperty('--fy',`${start[1]-y}px`);}
        if(L.gesture==='slide')g.style.setProperty('--sx',`${Math.round(Math.max(30,r.width*.55))}px`);
      }else show(g,false);
      raf=requestAnimationFrame(frame);
    };
    raf=requestAnimationFrame(frame);
    return()=>{cancelAnimationFrame(raf);mark(null);};
  },[]);
  useLayoutEffect(()=>{tick(n=>n+1);},[h.text,h.more,help,collapsed,busy,error,expanded,h.goal?.done]);
  // remember the real sizes for the next placement
  useLayoutEffect(()=>{
    if(stripRef.current?.isConnected)stripH_.current=stripRef.current.offsetHeight||stripH_.current;
    if(ref.current?.isConnected&&!help&&ref.current.offsetHeight)fullH_.current={key:fullKeyRef.current,h:ref.current.scrollHeight+3};
  });
  // bring the target into view by scrolling its own column only: scrollIntoView would also slide the tab pager
  useEffect(()=>{
    const el=h.target;if(!el)return;
    let box=el.parentElement;
    while(box&&!(box.scrollHeight>box.clientHeight+2&&/(auto|scroll)/.test(getComputedStyle(box).overflowY)))box=box.parentElement;
    if(!box)return;
    const r=el.getBoundingClientRect(),b=box.getBoundingClientRect();
    if(r.top>=b.top+8&&r.bottom<=b.bottom-8)return;
    box.scrollTop+=r.top-b.top-Math.max(16,(b.height-r.height)/2);
  },[h.target,t.step]);
  const layers=<>
    <svg class="coach-dim" width="100%" height="100%" aria-hidden="true" ref={dimRef}><defs><mask id="coach-hole" maskUnits="userSpaceOnUse"><rect width="100%" height="100%" fill="white"/><rect class="hole" rx={12} fill="black"/><path class="card-hole" fill="black"/></mask></defs><rect class="shade" width="100%" height="100%" mask="url(#coach-hole)"/></svg>
    <div class="coach-spot" ref={spotRef} aria-hidden="true"/>
    <div class="coach-areas" ref={areaRef} aria-hidden="true">{(h.area??[]).filter(e=>e!==h.target).map(()=><div class="coach-area"/>)}</div>
    <div class="coach-drop" ref={dropRef} aria-hidden="true"/>
    <div class="coach-gesture" ref={gestRef} aria-hidden="true">{showSpot&&h.gesture&&<Gest key={`${t.step}-${h.gesture}-${h.text}`} kind={h.gesture}/>}</div>
  </>;
  if(busy||paging)return <>{layers}{cheer&&<Cheer c={cheer}/>}</>;
  const stage=q('.field-stage')?.getBoundingClientRect(),farm=q('.farm')?.getBoundingClientRect(),tabs=q('.tabs')?.getBoundingClientRect();
  if(t.step==='done'&&collapsed)return <>{layers}<div class="tutorial-review-bar" role="status"><span>Обучение завершено, можно осмотреть ферму</span><button onClick={onExit}>На карту ферм</button><button onClick={()=>onHideHint(false)}>Итоги</button></div></>;
  if(collapsed){
    // on the field: the field's top corner; elsewhere the bottom corner, clear of the page's own header
    const pos=tab==='field'&&stage?{left:`${stage.left+8}px`,top:`${stage.top+8}px`}:{left:`${(farm?.left??0)+10}px`,bottom:'calc(12px + env(safe-area-inset-bottom, 0px))'};
    return <>{layers}<button class="guide-restore" style={pos} onClick={()=>onHideHint(false)}><img src={PORTRAIT_IMAGES.palych} alt=""/>Показать подсказку</button></>;
  }
  if(t.step==='chapter')return <>{layers}<Certificate chapter="I" soloPassed={t.soloPassed!==false} primary="Своя ферма" onPrimary={onOwn??onExit} secondary="Пройти 2-ю главу обучения" onSecondary={onNext}/>{cheer&&<Cheer c={cheer}/>}</>;
  if(t.step==='done')return <>{layers}<Certificate chapter="II" soloPassed={t.soloPassed!==false} primary="Своя ферма" onPrimary={onOwn??onExit} secondary="Ещё осмотрюсь" onSecondary={()=>onHideHint(true)}/>{cheer&&<Cheer c={cheer}/>}</>;

  const r=h.target?.getBoundingClientRect();
  const field=tab==='field'&&stage;
  const worried=!!error;
  // The thing being explained is not always the next button. Protect both:
  // the thirsty crop when pointing at a card, and the comparison before "Start".
  const subjects:Element[]=[];
  const protect=(sel:string)=>{const e=q(sel);if(e)subjects.push(e);return !!e;};
  if(t.step==='water'){const [x,y]=tutorialPlant(t);protect(`[data-tile="${x},${y}"]`);}
  if(t.step==='hail')for(const st of t.farm.strikes)for(const [x,y]of st.cells)protect(`[data-tile="${x},${y}"]`);
  if(t.step==='hail'||t.step==='play3')protect('.sky-token.bad')||protect('.sky-token');
  if(t.step==='lab'&&tab==='lab'){
    // The subject changes with the editor's stage: first the seed, then its
    // figure, then the before/after table. Protect the current explanation,
    // rather than reserving the entire scrolling lab and disabling details.
    protect(q('.project-preview')?'.project-preview':q('.shape-editor')?'.shape-editor':'.lab-pane .grid-card.picked');
  }
  if(t.step==='sale'&&tab==='barn')protect('.sale-row[data-crop="radish"]');
  if(t.step==='compost')protect('[data-tile="1,2"]');
  if(t.step==='weeds'&&t.weedAt)protect(`[data-tile="${t.weedAt.join(',')}"]`);
  if(t.step==='practice')for(const p of practiceNeed(t)?.plants??[])protect(`[data-tile="${p.at.join(',')}"]`);
  // A free-time note must leave the player's next move available too. The
  // cards and week button remain controls even when the coach has no target.
  if(field)for(const sel of ['.dock-top','.hand-row'])protect(sel);
  const guard:DOMRect[]=[...(r&&!h.target?.matches('.field-stage')?[r]:[]),...(h.area??[]).map(e=>e.getBoundingClientRect()),
    ...(h.drop?[h.drop.getBoundingClientRect()]:[]),
    ...subjects.map(e=>e.getBoundingClientRect()),
    ...['.fan-slot .card.selected','.bed-popover','.tile.hover','.precision-loupe','.drag-ghost'].map(sel=>q(sel)?.getBoundingClientRect()).filter((b):b is DOMRect=>!!b&&b.width>0)];
  const beds=field?t.farm.tiles.flatMap((v,i)=>{const el=v.owned?q(`[data-tile="${i%6},${Math.floor(i/6)}"]`):null;return el?[el.getBoundingClientRect()]:[];}):[];
  const topLimit=(tabs?.bottom??76)+6;
  // the full note on the field goes only where it covers no bed at all: the strip of free paper under a short
  // field, or beside a big one. Anywhere else the lesson speaks in one short line outside the field.
  const fullW=Math.min(h.free?280:318,(field?stage.width:farm?.width??innerWidth)-12,innerWidth-16);
  // measured once shown; until then estimated from the text, generously, so a guess never lands on a bed
  const lines=(txt:string|undefined,px:number)=>txt?Math.ceil(txt.length*px*.52/Math.max(120,fullW-30)):0;
  const fullKey=`${t.step}|${h.text}|${error??''}|${fullW}`;fullKeyRef.current=fullKey;
  const fullH=(fullH_.current.key===fullKey?fullH_.current.h:48+lines(h.hello,15)*18+lines(error??h.text,16)*21+lines(h.more,13.5)*17+(h.check?28:0)+(h.goal?26:0)+(h.next?46:0)+16)+(help?150:0);
  let mode:'full'|'strip'='full',left=0,top=0,W=fullW,maxH=innerHeight-12;
  const protectedRects=[...guard,...beds];
  // Find actual free vertical intervals. An expanded explanation may scroll
  // inside one; it never buys more space by covering the object being taught.
  const gaps=(x:number,w:number,minY:number)=>{
    const blocked=protectedRects.filter(b=>b.right>x-5&&b.left<x+w+5&&b.bottom>minY&&b.top<innerHeight-6)
      .map(b=>[Math.max(minY,b.top-7),Math.min(innerHeight-6,b.bottom+7)]).sort((a,b)=>a[0]-b[0]);
    const free:{y:number;h:number}[]=[];let cursor=minY;
    for(const [a,b]of blocked){if(a>cursor)free.push({y:cursor,h:a-cursor});cursor=Math.max(cursor,b);}
    if(cursor<innerHeight-6)free.push({y:cursor,h:innerHeight-6-cursor});return free;
  };
  const x0=Math.max((farm?.left??0)+6,Math.min((farm?.right??innerWidth)-fullW-6,r?r.x+r.width/2-fullW/2:(innerWidth-fullW)/2));
  const reading=expanded||help||h.next;
  // T03 · the note never covers the money, the days or the section tabs: everything it places starts below them.
  // Details scroll inside the room they find there instead of covering the beds or the card controls.
  const fullSpaces=gaps(x0,fullW,topLimit);
  const natural=fullSpaces.find(b=>b.h>=fullH+6);
  const bounded=reading?[...fullSpaces].sort((a,b)=>b.h-a.h).find(b=>b.h>=96):undefined;
  if(natural||bounded){
    const place=natural??bounded!;left=x0;top=place.y+2;maxH=place.h-4;
  }else{
    mode='strip';W=(farm?.width??innerWidth)-12;left=(farm?.left??0)+6;
    const sh=stripH_.current;
    const free=gaps(left,W,topLimit);
    const fit=free.find(b=>b.h>=sh);
    top=fit?fit.y:topLimit;
    maxH=fit?fit.h:sh;
  }
  const H=mode==='strip'?stripH_.current:Math.min(fullH,maxH);
  const x2=r?r.left+r.width/2:0;
  const below=!!r&&r.top>=top+H;
  const gap=r?(below?r.top-(top+H):top-r.bottom):0;
  const tail=mode==='full'&&!!r&&gap>4&&gap<180&&x2>left+12&&x2<left+W-12;
  const tailX=r?Math.max(22,Math.min(W-22,x2-left)):0;
  const label=<small class="guide-heading"><b title={`Глава ${tutorialChapter(t.step)}`}>{tutorialChapter(t.step)}</b>{weekLabel(t.step)}</small>;
  const goal=h.goal&&<div class="coach-goal" role="img" aria-label={`${h.goal.label}: ${h.goal.done} из ${h.goal.of}`}><span>{h.goal.label}</span><span class="cg-bar" aria-hidden="true"><i style={{width:`${(h.goal.done/Math.max(1,h.goal.of))*100}%`}}/></span><b>{h.goal.done}/{h.goal.of}</b></div>;
  const detail=!!(h.more||h.hello||h.check);
  if(mode==='strip'){
    // one short command and its pointer; the hello and the explanation open on request
    const second=h.free?(h.hello??h.more):h.hello;
    return <>
      {layers}
      <div class={`guide-note coach-strip${worried?' worried':''}${h.free?' free':''}`} ref={stripRef} style={{left,top,width:W}} role="status" aria-live="polite">
        <span class="coach-face"><img src={PORTRAIT_IMAGES[worried?'palych_worried':'palych']??PORTRAIT_IMAGES.palych} alt=""/></span>
        <div class="cs-body" key={`${t.step}-${h.text}`}>
          {second&&!error&&<p class="cs-hello">{second}</p>}
          <p class={`cs-text${error?' cs-error':''}`} role={error?'alert':undefined}>{error??h.text}</p>
          {goal}
          {h.check&&<ul class="cs-check">{h.check.map(([label,ok])=><li class={ok?'ok':''}><i aria-hidden="true">{ok?'✓':''}</i>{label}</li>)}</ul>}
        </div>
        {h.next&&<button class="guide-next primary cs-next" onClick={onNext}>{h.nextLabel??'Дальше'}</button>}
        <button class="cs-more" aria-label={detail?'Подробнее':'Помощь по обучению'} aria-expanded={false} onClick={()=>{setExpanded(true);if(!detail)setHelp(true);}}>{detail?'i':'?'}</button>
        <button class="cs-close" onClick={()=>onHideHint(true)} aria-label="Скрыть подсказку">×</button>
      </div>
      {cheer&&<Cheer c={cheer}/>}
    </>;
  }
  return <>
    {layers}
    <div class={`guide-note pal-note tutorial-bounded${h.next?' guide-intro':''}${worried?' worried':''}${h.free||h.check?' compact':''}${h.free?' free':''}`} ref={ref} style={{left,top,width:W,maxHeight:maxH,['--tail' as string]:`${tailX}px`}} role="status" aria-live="polite">
      {tail&&<span class={`coach-tail ${below?'down':'up'}`} aria-hidden="true"/>}
      <div class="coach-progress" aria-hidden="true"><i style={{width:`${Math.max(4,chapterProgress(t.step)*100)}%`}}/></div>
      <div class="coach-head">
        <span class="coach-face"><img src={PORTRAIT_IMAGES[worried?'palych_worried':'palych']??PORTRAIT_IMAGES.palych} alt=""/></span>
        {label}
        <button class="guide-help-toggle" aria-label="Помощь по обучению" aria-expanded={help} onClick={()=>setHelp(v=>!v)}>?</button>
        <button class="guide-close" onClick={()=>{if(expanded){setExpanded(false);setHelp(false);return;}onHideHint(true);setHelp(false);}} aria-label={expanded?'Свернуть подсказку':'Скрыть подсказку'}>{expanded?'–':'×'}</button>
      </div>
      <div class="coach-body" key={`${t.step}-${h.text}`}>
        {h.hello&&!error&&<p class="coach-hello">{h.hello}</p>}
        {error&&<p class="coach-error" key={error} role="alert">{error}</p>}
        <p>{h.text}</p>{h.more&&!error&&<small>{h.more}</small>}
        {goal}
        {h.check&&<ul class="coach-check">{h.check.map(([label,ok])=><li class={ok?'ok':''}><i aria-hidden="true">{ok?'✓':''}</i>{label}</li>)}</ul>}
      </div>
      {h.next&&<div class="guide-actions"><button class="guide-next primary" onClick={onNext}>{h.nextLabel??'Начать главу II'}</button></div>}
      {help&&<div class="guide-recovery"><p>Крестик только прячет подсказку, прогресс сохраняется.</p><button onClick={onRetry}>Повторить этот шаг</button><button onClick={onReset}>Начать обучение заново</button><button onClick={onExit}>На карту, продолжу позже</button></div>}
    </div>
    {cheer&&<Cheer c={cheer}/>}
  </>;
}
function Cheer({c}:{c:{text:string;x:number;y:number;key:number}}){
  const bits=Array.from({length:9},(_,i)=>{const a=(i/9)*Math.PI*2+.3,d=34+(i%3)*12;return{dx:Math.cos(a)*d,dy:Math.sin(a)*d-10,r:(i*47)%360,leaf:i%3!==0};});
  return <div class="coach-cheer" key={c.key} style={{left:c.x,top:c.y}} aria-hidden="true">
    {bits.map(b=><i class={b.leaf?'leaf':'spark'} style={{['--dx' as string]:`${b.dx}px`,['--dy' as string]:`${b.dy}px`,['--r' as string]:`${b.r}deg`}}/>)}
    <b>{c.text}</b>
  </div>;
}
