import {useEffect,useSyncExternalStore,type ReactNode} from "react";
import {MotionConfig} from "motion/react";
import {animate,press} from "motion";
import {animationsEnabled,motionAllowed,subscribeAnimations} from "./policy";
import {transitions} from "./presets";
import "./animations.css";
export function AnimationProvider({children}:{children:ReactNode}) {
  const enabled=useSyncExternalStore(subscribeAnimations,animationsEnabled,()=>true);
  useEffect(()=>{
    const gestures=new Map<Element,()=>void>();
    const selector="button,a,summary";
    const attach=(element:Element)=>{
      if(gestures.has(element))return;
      gestures.set(element,press(element,()=>{
        if(!motionAllowed()||element.matches(":disabled,[aria-disabled=true],[data-no-motion]")||element.closest("[data-dragging=true]"))return;
        const animation=animate(element,{scale:.975},transitions.quick);
        return()=>{animation.stop();void animate(element,{scale:1},motionAllowed()?transitions.quick:{duration:0});};
      }));
    };
    const scan=(node:Node)=>{if(!(node instanceof Element))return;if(node.matches(selector))attach(node);node.querySelectorAll(selector).forEach(attach);};
    scan(document.body);
    const observer=new MutationObserver(records=>{
      for(const record of records)record.addedNodes.forEach(scan);
      for(const [element,cleanup] of gestures)if(!element.isConnected){cleanup();gestures.delete(element);}
    });
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>{observer.disconnect();gestures.forEach(cleanup=>cleanup());};
  },[]);
  return <MotionConfig reducedMotion={enabled?"user":"always"} transition={enabled?transitions.surface:{duration:0}}>{children}</MotionConfig>;
}
