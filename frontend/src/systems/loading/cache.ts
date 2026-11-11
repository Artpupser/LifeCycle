import {QueryClient,QueryObserver,type QueryState} from "@tanstack/react-query";
import {requestCooldown,recordRequestFailure,recordRequestSuccess} from "./retry";
import {t} from "@/systems/i18n/locale";
export type Resource<T>={status:"loading"}|{status:"error";message:string}|{status:"ready";data:T};
export const queryClient=new QueryClient({defaultOptions:{queries:{staleTime:30_000,gcTime:300_000,retry:false,refetchOnWindowFocus:true,refetchOnReconnect:true},mutations:{retry:false}}});
export const resourceKey=(path:string)=>["api",path] as const;
type ResourceMeta={errorText:(error:unknown)=>string;version:number};
export function resourceOptions<T>(path:string,loader:()=>Promise<T>,errorText:(error:unknown)=>string){
 const meta=(queryClient.getQueryCache().find({queryKey:resourceKey(path),exact:true})?.meta as ResourceMeta|undefined)??{errorText,version:0};meta.errorText=errorText;
 return {queryKey:resourceKey(path),meta,queryFn:async()=>{
  // Invalidate a pending read without starting a parallel request. Repeat only after success.
  for(;;){
   const version=meta.version,cooldown=requestCooldown(path);
   if(cooldown)throw new Error(cooldown.message??t("Повторные запросы временно приостановлены после ошибки."));
   try{const data=await loader();recordRequestSuccess(path);if(version!==meta.version&&queryClient.getQueryCache().find({queryKey:resourceKey(path),exact:true})?.getObserversCount())continue;return data;}
   catch(error){recordRequestFailure(path,error,{status:(error as {status?:number})?.status??0,code:(error as {code?:string})?.code??"request_failed",message:errorText(error)});throw error;}
  }
 }};
}
export function stateResource<T>(state:Pick<QueryState<T>,"data"|"error"|"status">|undefined,errorText:(error:unknown)=>string=String):Resource<T>{
 if(state?.data!==undefined)return {status:"ready",data:state.data};
 return state?.status==="error"?{status:"error",message:errorText(state.error)}:{status:"loading"};
}
export function resourceSnapshot(path:string|null){
 const query=path?queryClient.getQueryCache().find({queryKey:resourceKey(path),exact:true}):undefined;
 const state=query?.state;const format=(query?.meta?.errorText as ((error:unknown)=>string)|undefined)??String;
 return {resource:stateResource(state,format),refreshing:state?.fetchStatus==="fetching",error:state?.error?format(state.error):null,retryAt:path?requestCooldown(path)?.retryAt??null:null};
}
export function subscribeResource(path:string|null,listener:()=>void){if(!path)return()=>{};const observer=new QueryObserver(queryClient,{queryKey:resourceKey(path),enabled:false});return observer.subscribe(listener);}
export async function loadResource(path:string,loader:()=>Promise<unknown>,errorText:(error:unknown)=>string,force=false){
 if(force)await queryClient.invalidateQueries({queryKey:resourceKey(path),exact:true,refetchType:"none"});
 try{await queryClient.fetchQuery(resourceOptions(path,loader,errorText));}catch{/* Errors are available through the single Query cache. */}
}
export function mutateResource<T>(path:string,updater:(data:T)=>T){const query=queryClient.getQueryCache().find({queryKey:resourceKey(path),exact:true});if(query?.state.fetchStatus==="fetching"&&query.meta)(query.meta as ResourceMeta).version++;queryClient.setQueryData<T>(resourceKey(path),current=>current===undefined?undefined:updater(current));}
function invalidate(queryKey?:readonly unknown[]){
 const queries=queryClient.getQueryCache().findAll({queryKey});
 for(const query of queries){
  if(query.state.fetchStatus==="fetching"){const meta=query.meta as ResourceMeta|undefined;if(meta)meta.version++;query.invalidate();}
  else{query.invalidate();if(query.getObserversCount()&&query.options.queryFn)void query.fetch().catch(()=>{});}
 }
}
export function invalidateResources(){invalidate(["api"]);}
export function revalidateResource(path:string){invalidate(resourceKey(path));}
export function revalidateActiveResources(prefixes:string[]){for(const query of queryClient.getQueryCache().findAll({queryKey:["api"]})){const path=query.queryKey[1];if(typeof path==="string"&&prefixes.some(prefix=>path===prefix||path.startsWith(`${prefix}?`)||path.startsWith(`${prefix}/`)))revalidateResource(path);}}
export function clearResourceCache(){void queryClient.cancelQueries();queryClient.clear();if(typeof window!=="undefined")window.dispatchEvent(new Event("lifecycle:cache-cleared"));}
