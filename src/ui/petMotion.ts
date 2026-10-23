import type {Camera} from './Scene';
import type {PetPose} from '../art/companions';
import type {GameState} from '../engine/game';
export type PetArea={x:number;y:number;w:number;h:number};
// Pick a dry rectangle so the decorative route never crosses the river or swamp.
export function petArea(s:GameState):PetArea{
 let best:PetArea={x:1,y:1,w:1,h:1};
 for(let y=0;y<6;y++)for(let x=0;x<6;x++)for(let h=1;h<=6-y;h++)for(let w=1;w<=6-x;w++){
  if(w*h<=best.w*best.h)continue;let safe=true;
  for(let j=y;j<y+h&&safe;j++)for(let i=x;i<x+w;i++)if(['river','swamp','forest'].includes(s.tiles[j*6+i].terrain)||s.tiles[j*6+i].canal){safe=false;break;}
  if(safe)best={x,y,w,h};
 }return best;
}
export function petMoment(cam:Camera,id:'cat'|'dog',seconds:number,area?:PetArea){
 const a0=area??{x:cam.vx,y:cam.vy,w:cam.span,h:cam.span},zx=Math.max(cam.vx,a0.x),zy=Math.max(cam.vy,a0.y);
 const zone={x:zx,y:zy,w:Math.min(cam.vx+cam.span,a0.x+a0.w)-zx,h:Math.min(cam.vy+cam.span,a0.y+a0.h)-zy};
 const dog=id==='dog',left=22+(zone.x-cam.vx)*100,right=left+zone.w*100,mid=left+Math.floor(zone.w/2)*100;
 const top=cam.yard+22+(zone.y-cam.vy)*100,bottom=cam.H-24,row=top+Math.max(1,Math.floor(zone.h/2))*100;
 const yardX=(k:number)=>Math.max(left+20,Math.min(right-20,cam.W*k));
 // Feet follow bed boundaries. Moving legs are used only between destinations.
 const route=dog?[[yardX(.54),57],[left,top],[left,row],[right,row],[right,top],[yardX(.57),57]]:[[yardX(.34),57],[right,top],[right,row],[mid,row],[mid,top],[yardX(.44),57]];
 const cycle=108,t=((seconds%cycle)+cycle)%cycle,segment=Math.floor(t/18),part=t%18;
 const a=route[segment],b=route[(segment+1)%route.length];
 const moving=part>=7&&part<17,p=Math.max(0,Math.min(1,(part-7)/10)),ease=p*p*(3-2*p);
 const x=a[0]+(b[0]-a[0])*ease,y=a[1]+(b[1]-a[1])*ease;
 const pose:PetPose=moving?'walk':segment===5?'play':segment===2?'sniff':segment===3&&!dog?'nap':'sit';
 return{x,y:Math.min(bottom,y),pose,facing:b[0]<a[0]?-1:1};
}

// Farm animals keep to the field margins: geese along the lower edge, the goat on the left,
// the hedgehog on the right. A route is a list of short legs; the animal moves only during a
// "walk" leg, then stops to do its job, then pauses. Nothing travels while it acts.
import type {LifePose} from '../art/animals';
type Leg={pose:LifePose;t:number;to?:[number,number]};
export function lifeSize(cam:Camera,id:'geese'|'hedgehog'|'goat'){
 return id==='geese'?Math.max(76,cam.W*.14):id==='goat'?Math.max(74,cam.W*.13):Math.max(54,cam.W*.1);
}
function lifeRoute(cam:Camera,id:'geese'|'hedgehog'|'goat'):{start:[number,number];legs:Leg[]}{
 const bottom=cam.H-7,right=cam.W-14;
 if(id==='geese'){
  const a=cam.W*.24,b=cam.W*.46,c=cam.W*.7;
  return{start:[a,bottom],legs:[
   {pose:'stand',t:2.4},{pose:'walk',t:4.2,to:[b,bottom]},{pose:'act',t:5.2},{pose:'stand',t:1.6},
   {pose:'walk',t:4.6,to:[c,bottom]},{pose:'act',t:5.2},{pose:'look',t:2.2},
   {pose:'walk',t:4.4,to:[b+18,bottom]},{pose:'act',t:5.2},{pose:'walk',t:4.6,to:[a,bottom]},{pose:'look',t:2.6},
  ]};
 }
 if(id==='goat'){
  // the goat grazes in the yard strip, between the farmer and the compost heap
  const y=cam.yard+12,g1=cam.W*.16,g2=cam.W*.22,g3=cam.W*.27;
  return{start:[g1,y],legs:[
   {pose:'act',t:5.5},{pose:'look',t:2.4},{pose:'walk',t:3.2,to:[g2,y]},{pose:'stand',t:1.4},{pose:'act',t:6},
   {pose:'walk',t:2.8,to:[g3,y]},{pose:'look',t:2.6},{pose:'act',t:5},{pose:'walk',t:5,to:[g1,y]},
  ]};
 }
 // the hedgehog potters about the lower right corner: along the bottom edge, then up the side
 const b=cam.H-6,x1=cam.W*.8,x2=right-2,h1=cam.H-cam.span*34;
 return{start:[x1,b],legs:[
  {pose:'act',t:3.6},{pose:'walk',t:2.4,to:[x1+(x2-x1)*.5,b]},{pose:'act',t:3},{pose:'walk',t:2.2,to:[x2,b-4]},
  {pose:'look',t:2},{pose:'walk',t:3,to:[x2,h1]},{pose:'act',t:3.4},{pose:'stand',t:3.2},{pose:'walk',t:3,to:[x2,b-4]},
  {pose:'act',t:2.6},{pose:'walk',t:4,to:[x1,b]},
 ]};
}
export function lifeMoment(cam:Camera,id:'geese'|'hedgehog'|'goat',seconds:number){
 const r=lifeRoute(cam,id),total=r.legs.reduce((a,l)=>a+l.t,0);
 let t=((seconds%total)+total)%total,at:[number,number]=r.start,facing=1;
 // the facing of the last walk survives the stops that follow it
 for(const l of r.legs)if(l.to){facing=l.to[0]<at[0]-.5?-1:l.to[0]>at[0]+.5?1:facing;at=l.to;}
 at=r.start;
 for(const l of r.legs){
  if(t<l.t){
   if(l.pose==='walk'&&l.to){
    const p=t/l.t,e=p*p*(3-2*p);const dx=l.to[0]-at[0];
    if(Math.abs(dx)>.5)facing=dx<0?-1:1;
    return{x:at[0]+dx*e,y:at[1]+(l.to[1]-at[1])*e,pose:'walk' as LifePose,facing,duration:l.t};
   }
   return{x:at[0],y:at[1],pose:l.pose,facing,duration:l.t};
  }
  t-=l.t;if(l.to){const dx=l.to[0]-at[0];if(Math.abs(dx)>.5)facing=dx<0?-1:1;at=l.to;}
 }
 return{x:at[0],y:at[1],pose:'stand' as LifePose,facing,duration:1};
}
