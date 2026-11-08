import {t} from "@/systems/i18n/locale";
import {requestCooldown,recordRequestFailure,recordRequestSuccess} from "./retry";
export type Resource<T>={status:"loading"}|{status:"error";message:string}|{status:"ready";data:T};
type Snapshot={resource:Resource<unknown>;refreshing:boolean;error:string|null;retryAt:number|null};
type Entry={snapshot:Snapshot;listeners:Set<()=>void>;pending?:Promise<void>;updated:number;dirty:boolean;loader?:()=>Promise<unknown>;errorText?:(error:unknown)=>string;retryTimer?:ReturnType<typeof setTimeout>};
const entries=new Map<string,Entry>();let epoch=0;
const empty:Snapshot={resource:{status:"loading"},refreshing:false,error:null,retryAt:null};
function entry(path:string){let item=entries.get(path);if(!item){item={snapshot:empty,listeners:new Set(),updated:0,dirty:false};entries.set(path,item);}return item;}
export const resourceSnapshot=(path:string|null)=>path?entry(path).snapshot:empty;
export function subscribeResource(path:string|null,listener:()=>void){if(!path)return()=>{};const item=entry(path);item.listeners.add(listener);return()=>{item.listeners.delete(listener);};}
function publish(item:Entry,snapshot:Snapshot){item.snapshot=snapshot;item.listeners.forEach(listener=>listener());}
function pause(path:string,item:Entry,retryAt:number,message:string){
 clearTimeout(item.retryTimer);item.dirty=false;
 publish(item,{resource:item.snapshot.resource.status==="ready"?item.snapshot.resource:{status:"error",message},refreshing:false,error:message,retryAt});
 const version=epoch;
 item.retryTimer=setTimeout(()=>{if(version!==epoch)return;const cooldown=requestCooldown(path);if(cooldown){pause(path,item,cooldown.retryAt,cooldown.message??message);return;}publish(item,{...item.snapshot,retryAt:null});},Math.min(2_147_000_000,Math.max(1,retryAt-Date.now())));
}
export function loadResource(path:string,loader:()=>Promise<unknown>,errorText:(error:unknown)=>string,force=false):Promise<void>{
 const item=entry(path);item.loader=loader;item.errorText=errorText;if(item.pending)return item.pending;
 const cooldown=requestCooldown(path);
 if(cooldown){pause(path,item,cooldown.retryAt,item.snapshot.error??cooldown.message??t("Повторные запросы временно приостановлены после ошибки."));return Promise.resolve();}
 if(!force&&item.snapshot.resource.status==="ready"&&Date.now()-item.updated<30_000)return Promise.resolve();
 if(typeof navigator!=="undefined"&&navigator.onLine===false&&item.snapshot.resource.status==="ready")return Promise.resolve();
 const version=epoch;item.dirty=false;publish(item,{...item.snapshot,refreshing:true,error:null,retryAt:null});
 const request=Promise.resolve().then(loader).then(data=>{if(version!==epoch||item.dirty)return;clearTimeout(item.retryTimer);recordRequestSuccess(path);item.updated=Date.now();publish(item,{resource:{status:"ready",data},refreshing:false,error:null,retryAt:null});}).catch(error=>{
  if(version!==epoch)return;
  const message=errorText(error);const retryAt=recordRequestFailure(path,error,{status:(error as {status?:number})?.status??0,code:(error as {code?:string})?.code??"request_failed",message});
  // Failures must stop an invalidation-triggered retry too; otherwise mutations can create a loop.
  item.dirty=false;
  if(retryAt){pause(path,item,retryAt,message);return;}
  publish(item,{resource:item.snapshot.resource.status==="ready"?item.snapshot.resource:{status:"error",message},refreshing:false,error:message,retryAt:null});
 }).finally(()=>{if(item.pending===request)item.pending=undefined;if(version===epoch&&item.dirty&&item.listeners.size)void loadResource(path,loader,errorText,true);});
 item.pending=request;return request;
}
export function mutateResource<T>(path:string,updater:(data:T)=>T){const item=entry(path);if(item.pending)item.dirty=true;if(item.snapshot.resource.status==="ready")publish(item,{...item.snapshot,resource:{status:"ready",data:updater(item.snapshot.resource.data as T)}});}
export function invalidateResources(){for(const item of entries.values()){item.updated=0;if(item.pending)item.dirty=true;}}
export function clearResourceCache(){epoch++;if(typeof window!=="undefined")window.dispatchEvent(new Event("lifecycle:cache-cleared"));for(const item of entries.values()){clearTimeout(item.retryTimer);item.pending=undefined;item.updated=0;publish(item,empty);}entries.clear();}
export function revalidateResource(path:string){const item=entries.get(path);if(item?.listeners.size&&item.loader&&item.errorText){if(item.pending){item.dirty=true;item.updated=0;}else void loadResource(path,item.loader,item.errorText,true);}}
export function revalidateActiveResources(prefixes:string[]){for(const path of entries.keys())if(prefixes.some(prefix=>path===prefix||path.startsWith(`${prefix}?`)||path.startsWith(`${prefix}/`)))revalidateResource(path);}
