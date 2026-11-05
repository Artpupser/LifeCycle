let enabled=true;
const listeners=new Set<()=>void>();
export function configureAnimations(next:boolean){enabled=next;listeners.forEach(listener=>listener());if(typeof document!=="undefined")document.documentElement.dataset.animations=next?"on":"off";}
export const animationsEnabled=()=>enabled;
export const subscribeAnimations=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
export function prefersReducedMotion(){return typeof window!=="undefined"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;}
export const motionAllowed=()=>enabled&&!prefersReducedMotion();
export function scrollElement(element:HTMLElement|null,options:{left?:number;top?:number;relative?:boolean;immediate?:boolean}) {
  if(!element)return;
  const {relative,immediate,...position}=options;
  element[relative?"scrollBy":"scrollTo"]({...position,behavior:!immediate&&motionAllowed()?"smooth":"instant"});
}
