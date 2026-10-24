import type { ComponentChildren } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { GameState } from '../engine/game';
import { camera, CELL, PAD, FIELD_YARD } from './Scene';

// Overlay only: opening it never participates in field/fan layout.
export function BedPopover({s, at, field, children, onClose}: {s: GameState; at: [number,number]; field: HTMLElement | null; children: ComponentChildren; onClose: () => void}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos,setPos] = useState({left:0,top:0,tip:30,below:false,ready:false});
  useLayoutEffect(() => {
    if (!field || !ref.current) return;
    const update = () => {
      const svg=field.querySelector('.scene-svg'); if(!svg || !ref.current)return;
      const f=field.getBoundingClientRect(), r=svg.getBoundingClientRect(), box=ref.current.getBoundingClientRect(), cam=camera(s,FIELD_YARD);
      const k=Math.min(r.width/cam.W,r.height/cam.H);
      const ox=r.left+(r.width-cam.W*k)/2-f.left, oy=r.top+(r.height-cam.H*k)/2-f.top;
      const cx=ox+(PAD+(at[0]-cam.vx+.5)*CELL)*k;
      const y=oy+(cam.yard+PAD+(at[1]-cam.vy)*CELL)*k;
      const left=Math.max(4,Math.min(Math.max(4,f.width-4-box.width),cx-box.width/2));
      const below=y-box.height-10<4;
      const top=Math.max(4,Math.min(f.height-box.height-4,below?y+CELL*k+8:y-box.height-8));
      setPos({left,top,tip:Math.max(16,Math.min(box.width-16,cx-left)),below,ready:true});
    };
    update(); const ro=new ResizeObserver(update);ro.observe(field);ro.observe(ref.current);
    const outside=(e:PointerEvent)=>{const el=e.target as Element;if(!ref.current?.contains(el)&&!el.closest('.tile, .corner-target'))onClose();};
    document.addEventListener('pointerdown',outside);
    return()=>{ro.disconnect();document.removeEventListener('pointerdown',outside);};
  },[field,at[0],at[1],s.tiles.length,children]);
  return <div ref={ref} class={`bed-popover${pos.below?' below':''}`} role="group" aria-label="Действия на выбранной грядке" style={{left:pos.left,top:pos.top,visibility:pos.ready?'visible':'hidden',['--tip' as string]:`${pos.tip}px`}}>{children}</div>;
}
