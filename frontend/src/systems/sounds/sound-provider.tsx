import { useEffect, type ReactNode } from "react";
import { useFoley } from "@foleyjs/react";
import { configureSounds, playSound, playTaskResult, type SoundPreferences } from "./sounds";
import { feedbackEvents, type Notice } from "@/lib/feedback";
export function SoundProvider({preferences,children}: {preferences:SoundPreferences;children:ReactNode}) {
  useFoley({muted:true,volume:.25,theme:"soft",hover:false});
  useEffect(()=>{configureSounds(preferences);return()=>configureSounds({sounds_enabled:false});},[preferences]);
  useEffect(()=>{
    const click=(event:MouseEvent)=>{if(!(event.target instanceof Element))return;const target=event.target.closest("button,a,summary,input[type=checkbox],input[type=radio]");if(!target||target.matches(":disabled,[aria-disabled=true],[data-silent]"))return;playSound(target.matches("input")?"switch":"tap");};
    const notice=(event:Event)=>{const kind=(event as CustomEvent<Notice>).detail.kind;playSound(kind==="error"?"error":kind==="success"?"success":"chime","notification");};
    const confirmation=()=>playSound("bubble");
    const result=(event:Event)=>playTaskResult((event as CustomEvent<{status:string}>).detail.status);
    feedbackEvents.addEventListener("task-result",result);document.addEventListener("click",click);feedbackEvents.addEventListener("notice",notice);feedbackEvents.addEventListener("confirm",confirmation);
    return()=>{feedbackEvents.removeEventListener("task-result",result);document.removeEventListener("click",click);feedbackEvents.removeEventListener("notice",notice);feedbackEvents.removeEventListener("confirm",confirmation);};
  },[]);
  return children;
}
