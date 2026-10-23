// Timers advance only while the scene is visible. No animation is consumed off-screen.
export class AnimationClock {
 private tasks=new Map<number,{left:number;began:number;timer?:number;fn:()=>void}>();
 private next=0;
 private paused=false;
 schedule(fn:()=>void,ms:number){const id=++this.next;this.tasks.set(id,{left:ms,began:0,fn});if(!this.paused)this.arm(id);return id;}
 private arm(id:number){const t=this.tasks.get(id);if(!t)return;t.began=performance.now();t.timer=window.setTimeout(()=>{this.tasks.delete(id);t.fn();},Math.max(0,t.left));}
 cancel(id:number){const t=this.tasks.get(id);if(t?.timer!==undefined)window.clearTimeout(t.timer);this.tasks.delete(id);}
 remaining(id:number){const t=this.tasks.get(id);return t?Math.max(0,t.left-(this.paused?0:performance.now()-t.began)):null;}
 setPaused(value:boolean){if(value===this.paused)return;this.paused=value;for(const[id,t]of this.tasks){if(value){if(t.timer!==undefined)window.clearTimeout(t.timer);t.left=Math.max(0,t.left-(performance.now()-t.began));t.timer=undefined;}else this.arm(id);}}
 dispose(){for(const id of this.tasks.keys())this.cancel(id);}
}
