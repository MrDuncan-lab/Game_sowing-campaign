import {Companion,PetPose} from '../art/companions';
import {petMoment,petArea,PetArea,lifeMoment,lifeSize,startGlide,glideAt,type Glide} from './petMotion';
import {motionFrame} from './motionClock';
import {AnimationClock} from './animationClock';
import {useReducedMotion} from './useReducedMotion';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Animal, LifePose } from '../art/animals';
import { KidRunner, WatchmanRunner, KID_SCALE, type KidVariant, type KidMood } from '../art/people';
import { Breath, Dust, FlickedBeetle, KidLocust, Say } from '../art/collisions';
import { kidDelay, sceneDuration, type MissCause } from './collisions';
import { Crow, CrowFlying } from '../art/crows';
import { DogRunner, Bark, DroneCraft, Beetle } from '../art/chase';
import { GRID } from '../engine/data';
import { Icon } from '../art/icons';
import { PETS, PetId } from '../engine/data';
import { GameState, lvl } from '../engine/game';
import type { Camera } from './Scene';

import type {SceneCue} from './useSceneQueue';
const ink='#5b3b25';

// A greeting finishes its whole gesture, including when the field is put away.
function useGreeting(paused:boolean,duration:number){
 const [react,setReact]=useState(false),clock=useRef(new AnimationClock());
 useEffect(()=>{clock.current.setPaused(paused);},[paused]);
 useEffect(()=>()=>clock.current.dispose(),[]);
 const greet=()=>{if(paused||react)return;setReact(true);clock.current.schedule(()=>setReact(false),duration);};
 return {react,greet};
}

// A change of pose has weight (motion.css «the animals»): a push-off into a walk, a settle when the walk stops,
// a slow sink into a nap, a hop when greeted or startled. One short WAAPI squash on the wrapper round the sprite.
const ARRIVE='cubic-bezier(.22,1,.36,1)';
function poseShift(el:SVGGElement|null,from:string,to:string){
 if(!el||typeof el.animate!=='function'||from===to)return;
 const k=(...f:[string,number?][])=>f.map(([transform,offset])=>offset===undefined?{transform}:{transform,offset});
 if(to==='walk')el.animate(k(['none'],['scale(1.05,.92)',.35],['scale(.98,1.03)',.7],['none']),{duration:260,easing:ARRIVE});
 else if(to==='nap')el.animate(k(['none'],['scale(1.03,.94)',.6],['none']),{duration:600,easing:'cubic-bezier(.37,0,.63,1)'});
 else if(to==='play'||to==='look')el.animate(k(['none'],['scale(1.06,.9)',.15],['translateY(-7px) scale(.96,1.06)',.4],['scale(1.05,.93)',.7],['none']),{duration:480,easing:ARRIVE});
 else if(from==='walk')el.animate(k(['translateY(-3px) scale(.97,1.04)'],['scale(1.04,.95)',.55],['none']),{duration:320,easing:ARRIVE});
}
function usePoseShift(pose:string,reducedMotion:boolean){
 const ref=useRef<SVGGElement>(null),last=useRef(pose);
 useLayoutEffect(()=>{const was=last.current;last.current=pose;if(!reducedMotion)poseShift(ref.current,was,pose);},[pose]);
 return ref;
}
/** where the dog is and whether it is on the move: the geese and the hedgehog notice it running past */
type Spots=Map<string,{x:number;y:number;moving:boolean}>;

// the drone sweeps the owned beds row by row: down the first row, back along the middle, out along the last
function droneRoute(s:GameState,cam:Camera){
 let x0=GRID,x1=0,y0=GRID,y1=0;
 s.tiles.forEach((t,i)=>{if(!t.owned||t.terrain==='river')return;const x=i%GRID,y=Math.floor(i/GRID);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);});
 if(x0>x1){x0=x1=Math.floor(cam.vx+cam.span/2);y0=y1=Math.floor(cam.vy+cam.span/2);}
 const cx=(x:number)=>22+(x-cam.vx)*100+50,cy=(y:number)=>cam.yard+22+(y-cam.vy)*100+50;
 const X0=cx(x0)-20,X1=cx(x1)+20,Y0=cy(y0),Y1=cy(y1),YM=(Y0+Y1)/2;
 // beetles on a few beds; each one leaves when the drone passes over it
 const legs:[number,number,number,number,number][]=[[X0,X1,Y0,.16,.32],[X1,X0,YM,.40,.56],[X0,X1,Y1,.64,.80]];
 const bugs:{x:number;y:number;t:number;dx:number}[]=[];
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
  const t=s.tiles[y*GRID+x];if(!t.owned||(x+y*2)%3===1)continue;
  const bx=cx(x)+((x+y)%2?14:-12),by=cy(y)+(y%2?12:-8);
  const leg=legs.reduce((a,l)=>Math.abs(l[2]-by)<Math.abs(a[2]-by)?l:a);
  const f=Math.max(0,Math.min(1,(bx-leg[0])/((leg[1]-leg[0])||1)));
  bugs.push({x:bx,y:by,t:(leg[3]+(leg[4]-leg[3])*f)*5,dx:(x+y)%2?1:-1});
 }
 return {X0,X1,Y0,Y1,YM,bugs:bugs.slice(0,7)};
}

function RoamingCompanion({id,cam,px,interactive,paused,area,hidden,reducedMotion,spots}:{id:'cat'|'dog';cam:Camera;px:number;interactive:boolean;paused:boolean;area:PetArea;hidden:boolean;reducedMotion:boolean;spots:Spots}){
 const root=useRef<SVGGElement>(null),clock=useRef(0),last=useRef(0);
 // PSV-017 · where the pet really stands, and a glide from there when its route is rebuilt (a canal, a new field)
 const at=useRef<[number,number]|null>(null),glide=useRef<Glide|null>(null);
 const {react,greet}=useGreeting(paused,id==='cat'?1900:2600);
 const [pose,setPose]=useState<PetPose>('sit'),[facing,setFacing]=useState(1);
 const shift=usePoseShift(pose,reducedMotion);
 const size=Math.max(64,cam.W*.115),hit=Math.max(size,45/Math.max(.1,px));
 const doors=(area.reach??[]).join(',');
 useLayoutEffect(()=>{
  last.current=0;let moved='';
  const start=petMoment(cam,id,clock.current,area);
  glide.current=reducedMotion?null:startGlide(at.current,start,clock.current);
  const tick=(now:number)=>{
   if(last.current&&!paused&&!react&&!document.hidden&&!reducedMotion)clock.current+=Math.min(80,now-last.current)/1000;
   last.current=now;const m=petMoment(cam,id,clock.current,area);
   let x=m.x,y=m.y,walking=false;const g=glide.current;
   if(g){const o=glideAt(g,clock.current);x+=o.dx;y+=o.dy;walking=!o.done;if(o.done)glide.current=null;}
   at.current=[x,y];spots.set(id,{x,y,moving:(walking||m.pose==='walk')&&!paused});
   const transform=`translate(${Math.max(0,Math.min(cam.W-size,x-size/2)).toFixed(2)}px, ${Math.max(0,y-size*.9).toFixed(2)}px)`;
   if(transform!==moved){if(root.current)root.current.style.transform=transform;moved=transform;}
   setPose(react?'play':walking?'walk':m.pose);setFacing(walking&&g&&Math.abs(g.dx)>1?(g.dx>0?-1:1):m.facing);
  };tick(performance.now());if(reducedMotion||paused||react)return;return motionFrame(tick);
 },[cam.W,cam.H,cam.yard,id,paused,react,reducedMotion,area.x,area.y,area.w,area.h,doors]);
 return <g ref={root} class={`roaming-companion ${paused?'paused':''}`} data-pet={id} data-pose={pose} style={{visibility:hidden?'hidden':undefined}}>
  <g class={`pet-friend${react?' greeted':''}`} role={interactive?'button':undefined} tabindex={interactive?0:undefined} aria-label={`Погладить: ${PETS[id].name}`} pointer-events={interactive?'auto':'none'} onPointerDown={e=>{e.stopPropagation();greet();}} onClick={e=>{e.stopPropagation();greet();}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();greet();}}}>
   <rect class="pet-hit" x={(size-hit)/2} y={(size-hit)/2} width={hit} height={hit} fill="transparent"/>
   <g transform={facing<0?`translate(${size} 0) scale(-1 1)`:undefined}><g class="pose-shift" ref={shift}><Companion id={id} size={size} pose={pose}/></g></g>
   {react&&<path class="pet-heart" d={`M${size/2} 4 c-12 -10 -16 3 0 12 c16 -9 12 -22 0 -12`} fill="#d76158" stroke={ink} stroke-width="1.4"/>}
  </g>
 </g>;
}

// geese, the hedgehog and the goat: the same clock-driven walker as the cat and the dog,
// but each animal only travels during a walk and works or rests in place otherwise
function RoamingAnimal({id,cam,px,interactive,paused,hidden,reducedMotion,spots}:{id:'geese'|'hedgehog'|'goat';cam:Camera;px:number;interactive:boolean;paused:boolean;hidden:boolean;reducedMotion:boolean;spots:Spots}){
 const root=useRef<SVGGElement>(null),clock=useRef(0),last=useRef(0);
 const {react,greet}=useGreeting(paused,id==='geese'?2200:id==='goat'?2400:2000);
 // the dog running past: the geese jump and honk, the hedgehog snorts (not the goat — it has seen dogs)
 const {react:startled,greet:startle}=useGreeting(paused,1300),lastStartle=useRef(-1e9),dogWas=useRef<[number,number]|null>(null);
 const [pose,setPose]=useState<LifePose>('stand'),[facing,setFacing]=useState(1);
 const shift=usePoseShift(pose,reducedMotion);
 const size=lifeSize(cam,id),hit=Math.max(size*.8,45/Math.max(.1,px));
 useLayoutEffect(()=>{
  last.current=0;let moved='',duration=0;
  const tick=(now:number)=>{
   if(last.current&&!paused&&!react&&!startled&&!document.hidden&&!reducedMotion)clock.current+=Math.min(80,now-last.current)/1000;
   last.current=now;const m=lifeMoment(cam,id,clock.current);
   // the dog trotting towards them from across the yard: the geese honk, the hedgehog snorts (once in a while)
   const dog=id==='goat'?null:spots.get('dog'),was=dogWas.current;dogWas.current=dog?.moving?[dog.x,dog.y]:null;
   if(dog?.moving&&was&&!paused&&!react&&!startled&&now-lastStartle.current>20000){
    const vx=dog.x-was[0],vy=dog.y-was[1],dx=m.x-dog.x,dy=m.y-dog.y;
    if(Math.hypot(vx,vy)>.05&&vx*dx+vy*dy>0&&Math.hypot(dx,dy)<size*5){lastStartle.current=now;startle();}
   }
   if(m.duration!==duration){root.current?.style.setProperty('--pose-duration',`${m.duration}s`);duration=m.duration;}
   const transform=`translate(${Math.max(-size*.15,Math.min(cam.W-size*.85,m.x-size/2)).toFixed(2)}px, ${(m.y-size*.9).toFixed(2)}px)`;
   if(transform!==moved){if(root.current)root.current.style.transform=transform;moved=transform;}
   setPose(react||startled?'look':m.pose);setFacing(m.facing);
  };tick(performance.now());if(reducedMotion||paused||react||startled)return;return motionFrame(tick);
 },[cam.W,cam.H,cam.yard,id,paused,react,startled,reducedMotion]);
 return <g ref={root} class={`roaming-animal${paused?' paused':''}`} data-pet={id} data-pose={pose} style={{visibility:hidden?'hidden':undefined}}>
  <g class={`pet-friend${react?' greeted':''}`} role={interactive?'button':undefined} tabindex={interactive?0:undefined} aria-label={`Погладить: ${PETS[id].name}`} pointer-events={interactive?'auto':'none'} onPointerDown={e=>{e.stopPropagation();greet();}} onClick={e=>{e.stopPropagation();greet();}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();greet();}}}>
   <rect class="pet-hit" x={(size-hit)/2} y={size*.9-hit} width={hit} height={hit} fill="transparent"/>
   <g transform={facing<0?`translate(${size} 0) scale(-1 1)`:undefined}><g class="pose-shift" ref={shift}><Animal id={id} size={size} pose={pose}/></g></g>
   {startled&&!react&&<Say cls="pet-say" x={size*.55} y={size*.08} text={id==='geese'?'Га-га!':'Фыр!'}/>}
   {react&&<path class="pet-heart" d={`M${size/2} 4 c-12 -10 -16 3 0 12 c16 -9 12 -22 0 -12`} fill="#d76158" stroke={ink} stroke-width="1.4"/>}
  </g>
 </g>;
}

// The children of a raid. Those with something to take sneak in, pull and run off with it (a beetle on
// the plant gets flicked off first). Those whose bed something else emptied meet what is left of it:
// the frozen bed, the dried-up stalk, the locust — and walk back with nothing. Each child is a different one.
const MISS_MOOD:Record<MissCause,KidMood>={frost:'cold',dry:'sad',locust:'startle',gone:'sad'};
const MISS_WORD:Record<MissCause,string>={frost:'Брр!',dry:'Апчхи!',locust:'Ай!',gone:'Пусто…'};
const bedX=(cam:Camera,x:number)=>22+(x-cam.vx)*100, bedY=(cam:Camera,y:number)=>cam.yard+22+(y-cam.vy)*100;
function Kid({v,mood,sack}:{v:KidVariant;mood?:KidMood;sack?:boolean}){
  return <g transform={KID_SCALE[v]===1?undefined:`scale(${KID_SCALE[v]})`}><KidRunner variant={v} mood={mood} sack={sack}/></g>;
}
function TheftKids({cue,cam}:{cue:SceneCue;cam:Camera}){
  const empty=cue.visit?.outcome==='empty';
  const steal=empty?[]:(cue.targets?.length?cue.targets:null);
  const misses=cue.misses?.length?cue.misses:empty?(cue.targets??[]).map(([x,y])=>({x,y,cause:'gone' as MissCause})):[];
  const bugs=new Set((cue.bugs??[]).map(([x,y])=>`${x},${y}`));
  const shoo=!!cue.visit?.crows.length;
  const thieves=steal??[null,null];
  return <>
    {misses.map((m,j)=><g key={`bed-${m.x}-${m.y}`} class={`kid-bed cause-${m.cause} kid-k${(thieves.length+j)%4}`} transform={`translate(${bedX(cam,m.x)-10} ${bedY(cam,m.y)})`}>
      {m.cause==='locust'&&<g transform="translate(62 72)"><KidLocust/></g>}
    </g>)}
    {steal?.map((t,k)=>bugs.has(`${t[0]},${t[1]}`)&&<g key={`bug-${k}`} class={`kid-bed bug-bed kid-k${k%4}`} transform={`translate(${bedX(cam,t[0])+44} ${bedY(cam,t[1])+52})`}><FlickedBeetle/></g>)}
    {thieves.map((t,k)=>{const v=(k%4) as KidVariant;return <g key={`steal-${k}`} class={`chase-person steal kid-k${v} person-${k%2?'b':'a'}`} style={t?{
      '--steal-x':`${bedX(cam,t[0])+58}px`,'--steal-y':`${bedY(cam,t[1])+78}px`}:undefined}>
      <g class="kid-sneak"><g class="kid-crouch"><Kid v={v} mood={shoo?'shoo':'normal'}/></g></g>
      <g class="kid-run"><Kid v={v} sack/></g>
      {t&&bugs.has(`${t[0]},${t[1]}`)&&<Say cls="kid-say kid-fu" x={4} y={-62*KID_SCALE[v]-12} text="Фу!"/>}
    </g>;})}
    {misses.map((m,j)=>{const k=thieves.length+j,v=(k%4) as KidVariant;return <g key={`miss-${m.x}-${m.y}`} class={`chase-person miss cause-${m.cause} kid-k${v}`} style={{
      '--steal-x':`${bedX(cam,m.x)+4}px`,'--steal-y':`${bedY(cam,m.y)+80}px`}}>
      <g class="kid-flip">
        <g class="kid-walk"><Kid v={v}/></g>
        <g class="kid-react"><Kid v={v} mood={MISS_MOOD[m.cause]}/></g>
        <g class="kid-back"><Kid v={v} mood="sad"/></g>
      </g>
      {m.cause==='frost'&&<g transform={`scale(${KID_SCALE[v]})`}><Breath/></g>}
      {m.cause==='dry'&&<g transform={`scale(${KID_SCALE[v]})`}><Dust/></g>}
      <Say cls="kid-say" x={6} y={-66*KID_SCALE[v]-12} text={MISS_WORD[m.cause]}/>
    </g>;})}
  </>;
}

export function FarmLife({s,cam,px,active,interactive,cue}: {s:GameState;cam:Camera;px:number;active:boolean;interactive:boolean;cue:SceneCue|null}) {
  const reducedMotion=useReducedMotion();
  const eventRoot=useRef<SVGGElement>(null);
  const startedRoot=useRef<SVGGElement|null>(null);
  useLayoutEffect(()=>{if(cue)eventRoot.current?.getAnimations({subtree:true}).forEach(a=>{
    a.playbackRate=cue.rate??1;
    // Week playback and its impacts share AnimationClock. CSS keeps its time on pause.
    if(active&&(!cue.managed||startedRoot.current!==eventRoot.current))a.currentTime=cue.elapsed??0;
  });startedRoot.current=eventRoot.current;},[cue?.id,active]);
  const width=cam.W, middle=cam.yard+(cam.H-cam.yard)*.48;
  const area=useMemo(()=>petArea(s),[s.tiles]);
  const spots=useRef<Spots>(new Map()).current;
  return <g class={`farm-life${!active?' paused':''}`} pointer-events="none">
    {s.pets.map((p)=>p==='cat'||p==='dog'?<RoamingCompanion key={p} id={p} spots={spots} area={area} cam={cam} px={px} interactive={interactive&&active&&!cue} paused={!active||!!cue} hidden={cue?.kind==='dogThieves'&&p==='dog'} reducedMotion={reducedMotion}/>:<RoamingAnimal key={p} id={p} spots={spots} cam={cam} px={px} interactive={interactive&&active&&!cue} paused={!active||!!cue} hidden={cue?.kind==='geese'&&p==='geese'} reducedMotion={reducedMotion}/>)}
    {lvl(s,'drone')>0 && cue?.kind!=='drone' && <g class="resident-drone" style={{'--flight-x':`${Math.max(30,width-150)}px`,'--flight-y':`${cam.yard+40}px`,'--home-y':`${Math.max(22,cam.yard-42)}px`}} transform="translate(70 34)"><g class="drone-bob"><Icon name="drone" size={34}/></g></g>}
    {cue&&<g ref={eventRoot} key={cue.id} class={`event-scene event-${cue.kind}${cue.visit?.outcome==='empty'?' visit-empty':''}${cue.visit?.crows.length?' visit-shoo':''}`} data-outcome={cue.visit?.outcome} aria-label={cue.kind==='dogThieves'?'Собака гонит ребят от грядок':cue.kind==='thieves'?(cue.visit?.outcome==='empty'?'Ребята разводят руками и уходят':cue.visit?.crows.length?'Ребята прогоняют ворон и забирают урожай':'Ребята забирают урожай'):cue.kind==='watchman'?'Сторож гонит чужаков':cue.kind==='geese'?'Гуси щиплют сорняки':cue.kind==='bear'?'Медведь у поля':cue.kind==='boars'?'Кабаны у поля':cue.kind==='fire'?'Пожар у края поля':cue.kind==='buyout'?'Дом выкуплен':'Дрон защищает поле'} style={{'--scene-width':`${width}px`,'--scene-mid':`${middle}px`,'--scene-ms':`${sceneDuration(cue)}ms`}}>
      {cue.kind==='thieves'&&<>
        {cue.visit?.outcome!=='empty'&&<g class="dropped-carrot"><g class="carrot-fall"><path d="M0 0 L-2.4 -11 Q0 -13 2.4 -11 Z" fill="#e07a2a" stroke="#3f2a1d" stroke-width="1.1" stroke-linejoin="round"/><path d="M0 -12 l-2 -5 M0 -12 l0 -6 M0 -12 l2 -5" stroke="#4c8e2d" stroke-width="1.6" stroke-linecap="round"/></g></g>}
        {cue.visit?.crows.map(([x,y],i)=><g key={`crow-${x}-${y}`} class="visit-crow" transform={`translate(${22+(x-cam.vx)*100+45} ${cam.yard+22+(y-cam.vy)*100+48})`} style={{'--bird-delay':`${kidDelay(Math.max(0,cue.targets?.findIndex(t=>t[0]===x&&t[1]===y)??i))}ms`}}>
          <g class="visit-crow-wait"><Crow/></g>
          <g class="visit-crow-flee"><CrowFlying/></g>
        </g>)}
        <TheftKids cue={cue} cam={cam}/>
      </>}
      {cue.kind==='dogThieves'&&<>
        <g class="chase-person person-a"><g class="kid-startle"><KidRunner/></g></g>
        <g class="chase-person person-b"><g class="kid-startle"><g transform="scale(.9)"><KidRunner variant={1}/></g></g></g>
        <g class="dog-chase"><g class="dog-face">
          <g class="dog-pose-run"><DogRunner/></g>
          <g class="dog-pose-bark"><DogRunner pose="bark"/><g transform="translate(34 -80)"><Bark/></g></g>
        </g></g>
      </>}
      {cue.kind==='watchman'&&<>
        <g class="chase-person person-a"><g class="kid-startle"><KidRunner/></g></g>
        <g class="chase-person person-b"><g class="kid-startle"><g transform="scale(.9)"><KidRunner variant={1}/></g></g></g>
        <g class="watch-route"><g class="watch-face">
          <g class="watch-walk"><WatchmanRunner/></g>
          <g class="watch-stand"><g class="still-runner"><WatchmanRunner/></g>
            <g class="whistle" fill="none" stroke="#3f2a1d" stroke-width="1.6" stroke-linecap="round"><path d="M22 -74 q6 -3 10 1"/><path d="M24 -68 q8 -1 12 4"/><path d="M22 -80 q5 -6 11 -6"/></g>
          </g>
        </g></g>
      </>}
      {cue.kind==='drone'&&(()=>{const r=droneRoute(s,cam);return <g class="drone-scene" style={{'--x0':`${r.X0}px`,'--x1':`${r.X1}px`,'--y0':`${r.Y0}px`,'--ym':`${r.YM}px`,'--y1':`${r.Y1}px`}}>
        {r.bugs.map(b=><g transform={`translate(${b.x} ${b.y})`}><g class="bug-flee" style={{animationDelay:`${b.t.toFixed(2)}s`,'--bug-dx':`${b.dx*34}px`}}><g transform="scale(1.5)"><Beetle/></g></g></g>)}
        <g class="drone-route"><g class="drone-shadow-at"><ellipse rx={34} ry={7} fill="#26343c" opacity={.2}/></g></g>
        <g class="drone-route"><g class="drone-lift"><g class="drone-tilt"><g transform="scale(1.15)"><DroneCraft/></g></g></g></g>
      </g>;})()}
      {(cue.kind==='bear'||cue.kind==='boars')&&<g class="beast-route"><g class="beast-face">{cue.kind==='bear'?<g transform="translate(-40 -70) scale(1.7)"><Icon name="bear" size={48}/></g>:<><g transform="translate(-36 -50) scale(1.2)"><Icon name="boar" size={48}/></g><g transform="translate(-86 -34)"><Icon name="boar" size={48}/></g></>}</g></g>}
      {cue.kind==='fire'&&<g class="fire-drift">{[0,1,2,3].map(i=><circle cx={width*(.2+i*.2)} cy={cam.yard+30} r={26+i*4} fill="#8a8580" opacity={.35} class={`fire-puff p${i}`}/>)}</g>}
      {cue.kind==='buyout'&&<g class="buyout-banner" transform={`translate(${width/2} ${cam.yard+70})`}>
        <path d="M-120 -26 H120 L108 0 L120 26 H-120 L-108 0 Z" fill="#f6e9c6" stroke="#3f2a1d" stroke-width="2.4" stroke-linejoin="round"/>
        <text y={9} text-anchor="middle" class="buyout-text">Дом наш!</text>
        {Array.from({length:14},(_,i)=><rect class={`confetti c${i%4}`} x={-110+i*16} y={-40} width={6} height={10} rx={1.5} fill={['#e0473a','#f4c542','#5dad3c','#4fb3e3'][i%4]} style={{animationDelay:`${(i%5)*.12}s`}}/>)}
      </g>}
      {cue.kind==='geese'&&<g class="geese-work" transform={`translate(${cue.at?22+(cue.at[0]-cam.vx)*100+8:width*.55} ${cue.at?cam.yard+22+(cue.at[1]-cam.vy)*100+8:cam.H*.65})`}>
        <g class="goose-weeds" stroke="#3f2a1d" stroke-width="1.3">{[[66,74],[78,80],[58,84]].map(([x,y],i)=><path class={`weed-tuft w${i}`} d={`M${x} ${y} C${x-7} ${y-5} ${x-9} ${y-12} ${x-7} ${y-16} C${x-3} ${y-11} ${x} ${y-7} ${x} ${y} C${x+2} ${y-9} ${x+5} ${y-14} ${x+9} ${y-16} C${x+9} ${y-9} ${x+5} ${y-4} ${x} ${y}z`} fill={i%2?'#6aa843':'#86c94e'}/>)}</g>
        <Animal id="geese" size={84} pose="act"/>
      </g>}
    </g>}
  </g>;
}
