import type { ComponentChildren } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { GameState } from '../engine/game';
import { camera, CELL, PAD, YARD } from './Scene';

// Overlay only: opening it never participates in field/fan layout.
export function BedPopover({s, at, field, children, onClose}: {s: GameState; at: [number,number]; field: HTMLElement | null; children: ComponentChildren; onClose: () => void}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos,setPos] = useState({left:0,top:0,tip:30,below:false,ready:false});
  useLayoutEffect(() => {
    if (!field || !ref.current) return;
    const update = () => {
      const svg=field.querySelector('.scene-svg'); if(!svg || !ref.current)return;
      const f=field.getBoundingClientRect(), r=svg.getBoundingClientRect(), box=ref.current.getBoundingClientRect(), cam=camera(s,YARD);
      const k=Math.min(r.width/cam.W,r.height/cam.H);
      const ox=r.left+(r.width-cam.W*k)/2-f.left, oy=r.top+(r.height-cam.H*k)/2-f.top;
      const cx=ox+(PAD+(at[0]-cam.vx+.5)*CELL)*k;
      const y=oy+(cam.yard+PAD+(at[1]-cam.vy)*CELL)*k;
      const left=Math.max(4,Math.min(Math.max(4,f.width-54-box.width),cx-box.width/2));
      const below=y-box.height-10<4;
      const top=Math.max(4,Math.min(f.height-box.height-4,below?y+CELL*k+8:y-box.height-8));
      setPos({left,top,tip:Math.max(16,Math.min(box.width-16,cx-left)),below,ready:true});
    };
    update(); const ro=new ResizeObserver(update);ro.observe(field);ro.observe(ref.current);
    const outside=(e:PointerEvent)=>{const el=e.target as Element;if(!ref.current?.contains(el)&&!el.closest('.tile, .corner-target'))onClose();};
    document.addEventListener('pointerdown',outside);
    return()=>{ro.disconnect();document.removeEventListener('pointerdown',outside);};
  },[field,at[0],at[1],s.tiles.length,children]);
  // PSV-033 · opened from a focused bed (keyboard or tap), the menu takes focus at once; Escape gives it back to the bed
  const bed = () => field?.querySelector<SVGGElement>(`[data-tile="${at[0]},${at[1]}"]`) ?? null;
  useLayoutEffect(() => {
    if (!pos.ready || !ref.current) return;
    if (document.activeElement && document.activeElement === bed()) {
      ref.current.querySelector<HTMLElement>('button:not([disabled]), [tabindex="0"]')?.focus({ preventScroll: true });
    }
  }, [pos.ready, at[0], at[1]]);
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    e.preventDefault(); e.stopPropagation();
    const back = bed();
    onClose();
    back?.focus({ preventScroll: true });
  };
  return <div ref={ref} id="bed-menu" class={`bed-popover${pos.below?' below':''}`} role="group" aria-label={`Действия на грядке ${at[0]+1}:${at[1]+1}`} onKeyDown={onKey} style={{left:pos.left,top:pos.top,visibility:pos.ready?'visible':'hidden',['--tip' as string]:`${pos.tip}px`}}>{children}</div>;
}
