import {useId} from 'preact/hooks';
import {CropSprite,cropStage} from './crops';
import {Locusts} from './locusts';
import {Beetles} from './beetles';
import type {PestHit,Plant} from '../engine/game';
export function NibbledPlant({plant,stage,hit}:{plant:Plant;stage:number;hit?:PestHit}){
 const mask=`nibble-${useId().replace(/[^a-zA-Z0-9_-]/g,'')}`;
 const destroy=hit?.kind==='locust';
 return <g class={hit?`pest-aftermath ${destroy?'locust-eaten':'beetle-eaten'}`:'chewed-plant'} pointer-events="none" data-loss={hit?.lost}>
  <defs><mask id={mask} maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120"><rect x="-10" y="-10" width="120" height="120" fill="white"/>
   {(destroy?[[22,28,25],[68,22,26],[85,55,25],[49,48,25],[25,65,29],[67,77,30],[48,90,34]]:[[30,35,7],[63,27,8],[72,54,9],[38,63,6]]).map(([x,y,r],i)=><circle key={i} class={hit?'bite-hole':''} cx={x} cy={y} r={r} fill="black" style={{'--bite-delay':`${i*(destroy?190:170)}ms`}}/>)}
  </mask></defs>
  <g class={destroy?'eaten-crop':''} mask={`url(#${mask})`}><CropSprite id={plant.id} stage={stage}/></g>
  {hit&&<><g class="leaf-crumbs" fill="#799145"><path d="M28 42 l6 -2 -2 6Z M63 53 l7 1 -4 5Z M40 71 l5 -4 2 6Z"/></g>{destroy?<Locusts/>:<Beetles/>}<text x="50" y="16" text-anchor="middle" class="pest-loss">−{hit.lost}</text></>}
 </g>;
}
