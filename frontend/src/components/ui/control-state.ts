import {useCallback,useImperativeHandle,useRef,useState,type Ref} from "react";
/** Portal choices mirror the actual control's native fieldset/legend disabled semantics. */
export function useControlState(disabled=false,forwardedRef?:Ref<HTMLInputElement>){
 const elementRef=useRef<HTMLInputElement|null>(null);const [inherited,setInherited]=useState(false);
 useImperativeHandle(forwardedRef,()=>elementRef.current!,[]);
 const bindRef=useCallback((node:HTMLInputElement|null)=>{
  elementRef.current=node;if(!node)return;
  const sync=()=>setInherited(node.matches(":disabled"));sync();
  const observer=new MutationObserver(sync);observer.observe(node,{attributes:true,attributeFilter:["disabled"]});
  for(let parent=node.parentElement;parent;parent=parent.parentElement)if(parent instanceof HTMLFieldSetElement)observer.observe(parent,{attributes:true,attributeFilter:["disabled"],childList:true});
  return()=>{observer.disconnect();elementRef.current=null;};
 },[]);
 return [bindRef,elementRef,disabled||inherited,()=>disabled||Boolean(elementRef.current?.matches(":disabled"))] as const;
}
