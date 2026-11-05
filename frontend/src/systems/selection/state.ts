import {useLayoutEffect,useRef,useState} from "react";
import {errorMessage} from "@/lib/api";
export function toggleKeys<T>(values:T[],item:T,enabled:boolean,key:(item:T)=>string=String){
  return enabled?values.some(value=>key(value)===key(item))?values:[...values,item]:values.filter(value=>key(value)!==key(item));
}
export function useSelection<T>({items,itemKey,scope="",limit=Infinity,initial=[],load,selectable=()=>true,prune=false}:{items:T[];itemKey:(item:T)=>string;scope?:string;limit?:number;initial?:T[];load?:(count:number|null,signal?:AbortSignal)=>Promise<T[]>;selectable?:(item:T)=>boolean;prune?:boolean}){
  const [state,setState]=useState(()=>({scope,items:initial.slice(0,limit)}));
  const [pending,setPending]=useState<{scope:string;version:number}|null>(null);
  const loading=pending?.scope===scope;
  const [error,setError]=useState<string|null>(null);
  const controller=useRef<AbortController|null>(null);
  const request=useRef(0);const activeScope=useRef(scope);
  useLayoutEffect(()=>{const activeRequest=request;const activeController=controller;activeScope.current=scope;activeRequest.current++;return()=>{activeRequest.current++;activeController.current?.abort();};},[scope]);
  const available=new Set(items.map(itemKey));
  const selected=state.scope===scope?state.items.filter(item=>!prune||available.has(itemKey(item))):[];
  const keys=new Set(selected.map(itemKey));
  const has=(item:T)=>keys.has(itemKey(item));
  const replace=(values:T[])=>{controller.current?.abort();request.current++;setPending(null);setError(null);const unique=new Map(values.filter(selectable).map(item=>[itemKey(item),item]));const chosen=[...unique.values()].slice(0,limit);setState({scope,items:chosen});return chosen.length;};
  const clear=()=>replace([]);
  function toggle(item:T,enabled:boolean){if(enabled&&(!selectable(item)||selected.length>=limit))return;replace(toggleKeys(selected,item,enabled,itemKey));}
  async function first(count:number|null){
    controller.current?.abort();const active=new AbortController();controller.current=active;
    const version=++request.current;setPending({scope,version});setError(null);
    try {
      const amount=count===null?Number.isFinite(limit)?limit:null:Math.min(limit,Math.max(0,Math.floor(count)));
      const values=load?await load(amount,active.signal):items.filter(selectable).slice(0,amount??undefined);
      if(version===request.current&&activeScope.current===scope){const unique=new Map(values.filter(selectable).map(item=>[itemKey(item),item]));const chosen=[...unique.values()].slice(0,limit);setState({scope,items:chosen});return chosen.length;}
    } catch(failure){if(!active.signal.aborted&&version===request.current&&activeScope.current===scope){setError(errorMessage(failure));throw failure;}}
    finally{setPending(current=>current?.version===version?null:current);}
  }
  return {selected,count:selected.length,has,toggle,replace,clear,first,loading,error,limit,canSelect:selectable,remove:(keys:string[])=>setState(current=>current.scope===scope?{scope,items:current.items.filter(item=>!keys.includes(itemKey(item)))}:current)};
}
export type Selection<T>=ReturnType<typeof useSelection<T>>;
