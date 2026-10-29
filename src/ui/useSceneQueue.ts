import {useEffect,useState} from 'preact/hooks';
import type {GameState} from '../engine/game';
import {sceneDuration, type Miss} from './collisions';
// misses: children who came to a bed something else had emptied; bugs: beds the beetles were chewing
export type SceneCue=NonNullable<GameState['scenes']>[number] & {elapsed?:number;managed?:boolean;targets?:[number,number][];rate?:number;misses?:Miss[];bugs?:[number,number][]};
const done=new Set<string>();
const priority:Record<SceneCue['kind'],number>={buyout:-1,dogThieves:0,watchman:1,thieves:2,bear:2,boars:2,fire:2,drone:3,geese:4};
const key=(s:GameState,e:SceneCue)=>`posevnaya.scene.${s.loc}.${s.seed}.${e.id}`;
export function completed(s:GameState,e:SceneCue){const k=key(s,e);try{return done.has(k)||!!sessionStorage.getItem(k);}catch{return done.has(k);}}
export function finishScenes(s:GameState,scenes:SceneCue[]){
 for(const e of scenes){const k=key(s,e);done.add(k);try{sessionStorage.setItem(k,'1');}catch{}}
}
export function chooseScene(s:GameState,isDone:(e:SceneCue)=>boolean):SceneCue|null {
 const all=s.scenes??[];
 return all.filter(e=>e.week>=s.absWeek-1&&e.week<=s.absWeek&&!isDone(e))
  .sort((a,b)=>priority[a.kind]-priority[b.kind]||a.week-b.week)[0]??null;
}
type SceneRun={cue:SceneCue;farm:string;storageKey:string;remaining:number};
// Motion and dialogue share this cue. Pauses retain the same scene and its clock.
export function useSceneQueue(s:GameState,active:boolean){
 const[visible,setVisible]=useState(()=>!document.hidden),[run,setRun]=useState<SceneRun|null>(null);
 const farm=`${s.seed}|${s.loc}`;
 const signature=(s.scenes??[]).map(e=>`${e.id}:${e.week}`).join('|');
 useEffect(()=>{const fn=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',fn);return()=>document.removeEventListener('visibilitychange',fn);},[]);
 useEffect(()=>{
  if(run){
   // A new week pauses playback; it does not restart an unfinished visit.
   if(run.farm!==farm||completed(s,run.cue)||!(s.scenes??[]).some(e=>e.id===run.cue.id))setRun(null);
   return;
  }
  if(!active||!visible)return;
  const next=chooseScene(s,e=>completed(s,e));
  if(next)setRun({cue:next,farm,storageKey:key(s,next),remaining:sceneDuration(next)});
 },[farm,s.absWeek,signature,active,visible,run]);
 useEffect(()=>{
  if(!run||run.farm!==farm||!active||!visible)return;
  const began=performance.now();
  const timer=window.setTimeout(()=>{
   done.add(run.storageKey);
   try{sessionStorage.setItem(run.storageKey,'1');}catch{}
   setRun(current=>current===run?null:current);
  },run.remaining);
  // Each run owns its clock, so cleanup cannot shorten a newly queued scene.
  return()=>{clearTimeout(timer);run.remaining=Math.max(0,run.remaining-(performance.now()-began));};
 },[run,farm,active,visible]);
 return run&&run.farm===farm?{...run.cue,elapsed:sceneDuration(run.cue)-run.remaining}:null;
}
