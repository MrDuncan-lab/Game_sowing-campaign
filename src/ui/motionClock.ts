// One frame scheduler for decorative walkers; hidden documents do not keep ticking.
const listeners=new Set<(now:number)=>void>();
let frame=0,last=0;
function tick(now:number){frame=0;if(document.hidden)return;if(now-last>=32){last=now;listeners.forEach(fn=>fn(now));}if(listeners.size)frame=requestAnimationFrame(tick);}
function wake(){if(listeners.size&&!frame&&!document.hidden){last=0;frame=requestAnimationFrame(tick);}}
export function motionFrame(fn:(now:number)=>void){listeners.add(fn);if(listeners.size===1)document.addEventListener('visibilitychange',wake);wake();return()=>{listeners.delete(fn);if(!listeners.size){cancelAnimationFrame(frame);frame=0;document.removeEventListener('visibilitychange',wake);}};}
