export type Resource<T>={status:"loading"}|{status:"error";message:string}|{status:"ready";data:T};
type Snapshot={resource:Resource<unknown>;refreshing:boolean;error:string|null};
type Entry={snapshot:Snapshot;listeners:Set<()=>void>;pending?:Promise<void>;updated:number;dirty:boolean;loader?:()=>Promise<unknown>;errorText?:(error:unknown)=>string};
const entries=new Map<string,Entry>();let epoch=0;
const empty:Snapshot={resource:{status:"loading"},refreshing:false,error:null};
function entry(path:string){let item=entries.get(path);if(!item){item={snapshot:empty,listeners:new Set(),updated:0,dirty:false};entries.set(path,item);}return item;}
export const resourceSnapshot=(path:string|null)=>path?entry(path).snapshot:empty;
export function subscribeResource(path:string|null,listener:()=>void){if(!path)return()=>{};const item=entry(path);item.listeners.add(listener);return()=>{item.listeners.delete(listener);};}
function publish(item:Entry,snapshot:Snapshot){item.snapshot=snapshot;item.listeners.forEach(listener=>listener());}
export function loadResource(path:string,loader:()=>Promise<unknown>,errorText:(error:unknown)=>string,force=false):Promise<void>{
 const item=entry(path);item.loader=loader;item.errorText=errorText;if(item.pending)return item.pending;
 if(!force&&item.snapshot.resource.status==="ready"&&Date.now()-item.updated<30_000)return Promise.resolve();
 if(typeof navigator!=="undefined"&&navigator.onLine===false&&item.snapshot.resource.status==="ready")return Promise.resolve();
 const version=epoch;item.dirty=false;publish(item,{...item.snapshot,refreshing:true,error:null});
 const request=Promise.resolve().then(loader).then(data=>{if(version!==epoch||item.dirty)return;item.updated=Date.now();publish(item,{resource:{status:"ready",data},refreshing:false,error:null});}).catch(error=>{if(version!==epoch||item.dirty)return;const message=errorText(error);publish(item,{resource:item.snapshot.resource.status==="ready"?item.snapshot.resource:{status:"error",message},refreshing:false,error:message});}).finally(()=>{if(item.pending===request)item.pending=undefined;if(version===epoch&&item.dirty&&item.listeners.size)void loadResource(path,loader,errorText,true);});
 item.pending=request;return request;
}
export function mutateResource<T>(path:string,updater:(data:T)=>T){const item=entry(path);if(item.pending)item.dirty=true;if(item.snapshot.resource.status==="ready")publish(item,{...item.snapshot,resource:{status:"ready",data:updater(item.snapshot.resource.data as T)}});}
export function invalidateResources(){for(const item of entries.values()){item.updated=0;if(item.pending)item.dirty=true;}}
export function clearResourceCache(){epoch++;if(typeof window!=="undefined")window.dispatchEvent(new Event("lifecycle:cache-cleared"));for(const item of entries.values()){item.pending=undefined;item.updated=0;publish(item,empty);}entries.clear();}

export function revalidateResource(path:string){const item=entries.get(path);if(item?.listeners.size&&item.loader&&item.errorText)void loadResource(path,item.loader,item.errorText,true);}
