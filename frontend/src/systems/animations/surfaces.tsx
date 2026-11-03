import {AnimatePresence,animate,motion,useReducedMotion,type HTMLMotionProps} from "motion/react";
import {useEffect,useRef,useSyncExternalStore,type ComponentProps,type ReactNode} from "react";
import {animationsEnabled,prefersReducedMotion,subscribeAnimations} from "./policy";
import {entrances,transitions} from "./presets";
function useMovement(){const enabled=useSyncExternalStore(subscribeAnimations,animationsEnabled,()=>true);const reduced=useReducedMotion();return enabled&&!(reduced??prefersReducedMotion());}
export function AnimatedSurface({kind="card",...props}:Omit<HTMLMotionProps<"div">,"initial"|"animate"|"exit"|"transition">&{kind?:keyof typeof entrances}) {
  const movement=useMovement();
  return <motion.div initial={movement?entrances[kind]:false} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0}} transition={movement?transitions.surface:{duration:0}} {...props}/>;
}
export function AnimatedArticle(props:ComponentProps<"article">) {
  const movement=useMovement();
  const ref=useRef<HTMLElement>(null);
  useEffect(()=>{
    if(!movement||!ref.current)return;
    const animation=animate(ref.current,{opacity:[0,1],y:[5,0]},transitions.quick);
    return()=>{animation.complete();};
  },[movement]);
  return <article {...props} ref={ref}/>;
}
export function AnimatedNavigation({children,className}:{children:ReactNode;className?:string}) {
  const movement=useMovement();
  return <motion.aside className={className} layout={movement?"size":false} transition={movement?transitions.surface:{duration:0}}>{children}</motion.aside>;
}
export function Presence({children}:{children:ReactNode}) {return <AnimatePresence initial={false}>{children}</AnimatePresence>;}
export function Spinner({children}:{children:ReactNode}) {
  const movement=useMovement();
  return <motion.span className="inline-flex shrink-0 align-middle" animate={{rotate:movement?360:0}} transition={movement?{duration:1,repeat:Infinity,ease:"linear"}:{duration:0}}>{children}</motion.span>;
}
export function Pulse({children,className,role}:{children?:ReactNode;className?:string;role?:"status"}) {
  const movement=useMovement();
  return <motion.span role={role} className={className} animate={{opacity:movement?[.5,1,.5]:1}} transition={movement?{duration:1.4,repeat:Infinity}:{duration:0}}>{children}</motion.span>;
}
