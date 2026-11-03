import {useCallback,useEffect,useSyncExternalStore} from "react";
import {api,errorMessage} from "@/lib/api";
import {loadResource,mutateResource,resourceSnapshot,subscribeResource,type Resource} from "@/systems/loading/cache";
export function prefetchResource(path:string){return loadResource(path,()=>api(path),errorMessage);}
export function useResource<T>(path:string|null){
 const subscribe=useCallback((listener:()=>void)=>subscribeResource(path,listener),[path]);
 const snapshot=useSyncExternalStore(subscribe,()=>resourceSnapshot(path),()=>resourceSnapshot(path));
 const request=useCallback((force=false)=>{if(path)void loadResource(path,()=>api<T>(path),errorMessage,force);},[path]);
 useEffect(()=>{request();const visible=()=>{if(document.visibilityState==="visible")request();};window.addEventListener("focus",visible);document.addEventListener("visibilitychange",visible);return()=>{window.removeEventListener("focus",visible);document.removeEventListener("visibilitychange",visible);};},[request]);
 const refresh=useCallback(()=>request(true),[request]);
 const mutate=useCallback((updater:(data:T)=>T)=>{if(path)mutateResource(path,updater);},[path]);
 return {resource:snapshot.resource as Resource<T>,refresh,retry:refresh,mutate,refreshing:snapshot.refreshing,refreshError:snapshot.error};
}
