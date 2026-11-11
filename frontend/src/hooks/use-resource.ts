import {useCallback,useMemo,useEffect,useReducer} from "react";
import {useQuery} from "@tanstack/react-query";
import {api,errorMessage} from "@/lib/api";
import {loadResource,mutateResource,resourceOptions,stateResource} from "@/systems/loading/cache";
import {requestCooldown} from "@/systems/loading/retry";
export function prefetchResource(path:string){return loadResource(path,()=>api(path),errorMessage);}
export function useResource<T>(path:string|null,options?:{refreshIntervalMs?:number;refreshWhile?:(data:T)=>boolean}){
 const query=useQuery({...resourceOptions(path??"",()=>api<T>(path!),errorMessage),enabled:!!path,refetchInterval:current=>{
  const data=current.state.data;if(!path||requestCooldown(path)||options?.refreshWhile&&(data===undefined||!options.refreshWhile(data)))return false;
  return options?.refreshIntervalMs===undefined?false:Math.max(15_000,options.refreshIntervalMs);
 }});
 const resourceError=query.data===undefined?query.error:null;
 const resourceStatus=query.data===undefined?query.status:"success";
 const resource=useMemo(()=>stateResource<T>({data:query.data,error:resourceError,status:resourceStatus},errorMessage),[query.data,resourceError,resourceStatus]);
 const retryAt=path?requestCooldown(path)?.retryAt??null:null;const [,tick]=useReducer(value=>value+1,0);
 useEffect(()=>{if(retryAt===null)return;const timer=setTimeout(tick,Math.max(1,Math.min(2_147_000_000,retryAt-Date.now()+1)));return()=>clearTimeout(timer);},[retryAt]);
 const {refetch}=query;
 const refresh=useCallback(()=>{if(path&&!requestCooldown(path))void refetch();},[path,refetch]);
 const mutate=useCallback((updater:(data:T)=>T)=>{if(path)mutateResource(path,updater);},[path]);
 return {resource,refresh,retry:refresh,mutate,refreshing:query.isFetching,refreshError:query.error?errorMessage(query.error):null,retryAt};
}
