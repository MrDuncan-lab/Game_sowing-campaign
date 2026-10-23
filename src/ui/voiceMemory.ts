import type {GameState} from '../engine/game';
const memory=new Map<string,string[]>();
const orders=new Set<string>();
export const weekVoiceKey=(s:GameState)=>`posevnaya.voice.${s.loc}.${s.seed}.${s.absWeek}`;
export function readVoices(key:string):string[]{
 try{const v=JSON.parse(sessionStorage.getItem(key)||'null');if(Array.isArray(v)&&v.every(x=>typeof x==='string'))return v;}catch{}
 return memory.get(key)??[];
}
export function recordVoice(key:string,line:string){const seen=readVoices(key);if(!seen.includes(line)){const v=[...seen,line];memory.set(key,v);try{sessionStorage.setItem(key,JSON.stringify(v));}catch{}}}
const orderKey=(s:GameState,key:string)=>`posevnaya.order.${s.loc}.${s.seed}.${key}`;
export function heardOrder(s:GameState,key:string){const k=orderKey(s,key);try{return orders.has(k)||!!sessionStorage.getItem(k);}catch{return orders.has(k);}}
export function rememberOrder(s:GameState,key:string){const k=orderKey(s,key);orders.add(k);try{sessionStorage.setItem(k,'1');}catch{}}
