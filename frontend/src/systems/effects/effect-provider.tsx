import {useEffect,type ReactNode} from "react";
import {feedbackEvents,type Notice} from "@/lib/feedback";
import {effectEvents,effectsEnabled,rememberEffectOrigin,showEffect,type EffectRequest} from "./events";
import {clearParticles,playParticles} from "./particles";
export function EffectProvider({children}:{children:ReactNode}) {
  useEffect(()=>{
    let last=0;let frame=0;
    const pointer=(event:PointerEvent)=>rememberEffectOrigin({x:event.clientX/window.innerWidth,y:event.clientY/window.innerHeight});
    const keyboard=()=>{const rect=document.activeElement?.getBoundingClientRect();if(rect)rememberEffectOrigin({x:(rect.left+rect.width/2)/window.innerWidth,y:(rect.top+rect.height/2)/window.innerHeight});};
    const effect=(event:Event)=>{
      const request=(event as CustomEvent<EffectRequest>).detail;
      if(performance.now()-last<180 && !["complete","create","remove"].includes(request.kind))return;
      last=performance.now();cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{void playParticles(request).catch(clearParticles);});
    };
    const notice=(event:Event)=>showEffect((event as CustomEvent<Notice>).detail.kind==="error"?"error":"notice");
    const confirmation=()=>showEffect("confirm");
    const policy=()=>{if(!effectsEnabled())clearParticles();};
    const media=window.matchMedia("(prefers-reduced-motion: reduce)");const reduction=()=>{if(media.matches)clearParticles();};
    const visibility=()=>{if(document.hidden)clearParticles();};
    document.addEventListener("pointerdown",pointer,true);document.addEventListener("keydown",keyboard,true);document.addEventListener("visibilitychange",visibility);
    effectEvents.addEventListener("effect",effect);effectEvents.addEventListener("policy",policy);feedbackEvents.addEventListener("notice",notice);feedbackEvents.addEventListener("confirm",confirmation);media.addEventListener("change",reduction);
    return()=>{cancelAnimationFrame(frame);clearParticles();document.removeEventListener("pointerdown",pointer,true);document.removeEventListener("keydown",keyboard,true);document.removeEventListener("visibilitychange",visibility);effectEvents.removeEventListener("effect",effect);effectEvents.removeEventListener("policy",policy);feedbackEvents.removeEventListener("notice",notice);feedbackEvents.removeEventListener("confirm",confirmation);media.removeEventListener("change",reduction);};
  },[]);
  return children;
}
