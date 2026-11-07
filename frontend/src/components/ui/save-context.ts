import {createContext,useCallback,useState} from "react";
export const SaveFormTarget=createContext<HTMLElement|null>(null);
export const SaveHeaderContext=createContext<{target:HTMLElement|null;count:number;register:(id:string)=>()=>void}|null>(null);
export function useSaveHeader(){
 const [target,setTarget]=useState<HTMLElement|null>(null);const [ids,setIds]=useState<Set<string>>(()=>new Set());
 const register=useCallback((id:string)=>{setIds(current=>new Set([...current,id]));return()=>setIds(current=>{const next=new Set(current);next.delete(id);return next;});},[]);
 return {target,setTarget,count:ids.size,register};
}
