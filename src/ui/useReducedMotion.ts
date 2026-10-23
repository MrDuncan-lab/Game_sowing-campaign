import {useLayoutEffect,useState} from 'preact/hooks';

const query='(prefers-reduced-motion: reduce)';

export function useReducedMotion(){
 const [reduced,setReduced]=useState(()=>typeof matchMedia==='function'&&matchMedia(query).matches);
 useLayoutEffect(()=>{
  if(typeof matchMedia!=='function')return;
  const media=matchMedia(query);
  const update=()=>setReduced(media.matches);
  update();
  if(typeof media.addEventListener==='function'){
   media.addEventListener('change',update);
   return()=>media.removeEventListener('change',update);
  }
  media.addListener(update);
  return()=>media.removeListener(update);
 },[]);
 return reduced;
}
