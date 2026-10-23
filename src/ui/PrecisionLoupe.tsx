import {CropSprite,cropStage} from '../art/crops';
import {GameState,inGrid,tile,targetGrow} from '../engine/game';
import type {Highlight} from './Scene';
// A temporary 3×3 close-up. It never captures input or changes the field camera.
export function PrecisionLoupe({s,hover,highlight,x,y}:{s:GameState;hover:string;highlight:Highlight;x:number;y:number}){
 if(hover.startsWith('corner'))return null;
 const[cx,cy]=hover.split(',').map(Number),size=116;
 const left=Math.max(5,Math.min(window.innerWidth-size-5,x-size/2));
 const above=y-size-18,top=above>=6?above:Math.min(window.innerHeight-size-6,y+24);
 return <div class="precision-loupe" style={{left,top}} role="img" aria-label="Увеличенный участок при посадке">
  <svg viewBox="0 0 108 108" width="108" height="108">
   {Array.from({length:9},(_,i)=>{const xx=cx+i%3-1,yy=cy+Math.floor(i/3)-1,ox=(i%3)*36,oy=Math.floor(i/3)*36;
    if(!inGrid(xx,yy))return <rect x={ox} y={oy} width={36} height={36} fill="#a4b884"/>;
    const t=tile(s,xx,yy),k=`${xx},${yy}`,index=highlight.preview?.cells.findIndex(([a,b])=>a===xx&&b===yy)??-1;
    const preview=index>=0,marked=preview||highlight.area.has(k),bad=preview&&!!highlight.preview?.why[index];
    return <g transform={`translate(${ox} ${oy})`}>
     <rect x={1} y={1} width={34} height={34} rx={4} fill={t.terrain==='river'?'#72b5d4':t.owned?'#bd945e':'#95b868'} stroke={marked?bad?'#b54431':'#fff3a4':'#826c40'} stroke-width={marked?3:1}/>
     {t.crop&&<svg x={4} y={3} width={28} height={29} viewBox="-4 -6 108 108"><CropSprite id={t.crop.id} stage={cropStage(t.crop.grown,targetGrow(s,t.crop))}/></svg>}
     {preview&&!bad&&highlight.preview?.crop&&<svg x={6} y={5} width={24} height={25} viewBox="-4 -6 108 108" opacity={.8}><CropSprite id={highlight.preview.crop} stage={0}/></svg>}
     {bad&&<path d="M8 8L28 28M28 8L8 28" stroke="#a8352c" stroke-width={2.5}/>}
    </g>;
   })}
   <path d="M48 42h-6v6m18-6h6v6m0 12v6h-6m-12 0h-6v-6" fill="none" stroke="#fff" stroke-width={2.5}/>
  </svg>
 </div>;
}
