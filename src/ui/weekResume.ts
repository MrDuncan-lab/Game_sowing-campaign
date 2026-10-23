import type {GameState,Tile} from '../engine/game';
import type {WeekEvent} from './weekPlayback';
import {validFarm} from './persist';

// Presentation only. Restoring this record never dispatches an engine action.
export interface WeekResume {
 version:1; prev:GameState; next:GameState; events:WeekEvent[]; elapsed:number;
 hidden:[string,Tile][];
}
const key=(s:GameState)=>`posevnaya.playback.${s.loc}.${s.seed}`;
export function saveWeekResume(r:WeekResume){try{sessionStorage.setItem(key(r.next),JSON.stringify(r));}catch{}}
export function clearWeekResume(s:GameState){try{sessionStorage.removeItem(key(s));}catch{}}
export function readWeekResume(s:GameState):WeekResume|null{
 try{
  const r=JSON.parse(sessionStorage.getItem(key(s))||'null');
  if(!r)return null;
  if(r.version!==1||!validFarm(r.prev)||!validFarm(r.next)||r.next.seed!==s.seed||r.next.loc!==s.loc||r.next.absWeek!==s.absWeek||JSON.stringify(r.next.lastReport)!==JSON.stringify(s.lastReport))throw Error('stale playback');
  if(!Array.isArray(r.events)||!r.events.length||!r.events.every((e:WeekEvent)=>Number.isFinite(e.duration)&&e.duration>0&&e.duration<30000)||!Number.isFinite(r.elapsed)||r.elapsed<0||r.elapsed>r.events[0].duration)throw Error('invalid clock');
  if(!Array.isArray(r.hidden)||r.hidden.length!==s.tiles.length||!r.hidden.every((e:any)=>Array.isArray(e)&&/^[0-5],[0-5]$/.test(e[0])&&e[1]&&typeof e[1]==='object')||new Set(r.hidden.map((e:any)=>e[0])).size!==s.tiles.length)throw Error('invalid pictures');
  const pictures=new Map(r.hidden);
  if(!validFarm({...r.prev,tiles:r.prev.tiles.map((_:Tile,i:number)=>pictures.get(`${i%6},${Math.floor(i/6)}`))}))throw Error('invalid plants');
  return r;
 }catch{clearWeekResume(s);return null;}
}
