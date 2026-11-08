import {integrationProviders} from "@/systems/integrations/types";
import {retryAfterMilliseconds} from "@/lib/dates";
export type RequestCooldown={failures:number;retryAt:number;status:number;code:string;message?:string};
const cooldowns=new Map<string,RequestCooldown>();
let failures=new WeakSet<object>();
const STORAGE="lifecycle:request-cooldowns";
// Only public section names and timing metadata persist; no account IDs, query strings or content.
const providers=new Set(integrationProviders.map(provider=>provider.id));
const operations=new Set(["list","read","settings","disconnect","external"]);
/** Provider calls share their pause; local settings and metadata remain independently editable. */
function scope(path:string,method="GET"){
 const section=`/${path.split(/[/?]/).filter(Boolean)[0]??""}`;
 if(section!=="/integrations")return section;
 const [provider,action]=path.split("?")[0].split("/").filter(Boolean).slice(1);
 if(!providers.has(provider))return "/integrations/list";
 const operation=action==="connect"||action==="sync"||action==="authorize"?"external":method==="PUT"?"settings":method==="DELETE"?"disconnect":"read";
 return `/integrations/${provider}/${operation}`;
}
function publicScope(key:string){
 if(key==="*"||/^\/[a-z][a-z0-9-]*$/.test(key)||key==="/integrations/list")return true;
 const match=key.match(/^\/integrations\/([a-z][a-z0-9-]*)\/([a-z]+)$/);
 return !!match&&providers.has(match[1])&&operations.has(match[2]);
}
function read(){
 try{
  if(typeof window==="undefined")return;
  const stored:unknown=JSON.parse(window.localStorage.getItem(STORAGE)??"{}");
  if(!stored||typeof stored!=="object")return;
  let migrated=false;
  for(const [key,raw]of Object.entries(stored).slice(0,64)){
   if(!publicScope(key)||!raw||typeof raw!=="object")continue;
   const value=raw as RequestCooldown;
   if(!Number.isFinite(value.retryAt)||value.retryAt<Date.now()-86_400_000||value.retryAt>Date.now()+2_147_000_000||!Number.isInteger(value.failures)||value.failures<1||value.failures>32||!Number.isInteger(value.status)||typeof value.code!=="string"||value.code.length>100)continue;
   // Old releases paused every integration. Preserve those deadlines on provider calls only.
   const targets=key==="/integrations"?[...providers].map(provider=>`/integrations/${provider}/external`):[key];
   if(key==="/integrations"){cooldowns.delete(key);migrated=true;}
   for(const target of targets){const old=cooldowns.get(target);if(!old||old.retryAt<value.retryAt)cooldowns.set(target,{failures:value.failures,retryAt:value.retryAt,status:value.status,code:value.code,message:old?.message});}
  }
  if(migrated)write();
 }catch{/* Storage may be unavailable; in-memory protection remains active. */}
}
function write(){
 try{if(typeof window!=="undefined")window.localStorage.setItem(STORAGE,JSON.stringify(Object.fromEntries([...cooldowns].slice(-64).map(([key,{failures,retryAt,status,code}])=>[key,{failures,retryAt,status,code}]))));}catch{/* Storage is optional. */}
}
export function requestCooldown(path:string,method="GET"):RequestCooldown|null{
 read();const now=Date.now();const local=cooldowns.get(scope(path,method)),global=cooldowns.get("*");
 return [local,global].filter((value):value is RequestCooldown=>!!value&&value.retryAt>now).sort((a,b)=>b.retryAt-a.retryAt)[0]??null;
}
export function recordRequestFailure(path:string,error:unknown,details?:{status:number;code:string;retryAfter?:string|null;message?:string;global?:boolean},method="GET"){
 const object=error&&typeof error==="object"?error:null;
 if(object&&failures.has(object)){const active=requestCooldown(path,method);if(active)return active.retryAt;}
 const data=error as {status?:number;code?:string;name?:string}|null;
 if(data?.code==="request_cooldown"||data?.name==="AbortError")return requestCooldown(path,method)?.retryAt??null;
 const status=details?.status??data?.status??0;
 if(status!==0&&status!==408&&status!==425&&status!==429&&status<500)return null;
 if(object)failures.add(object);read();
 const key=details?.global?"*":scope(path,method);const previous=cooldowns.get(key);
 const count=Math.min(32,(previous?.failures??0)+1);
 const base=status===429?300_000:30_000,maximum=status===429?1_800_000:300_000;
 const delay=Math.max(Math.min(maximum,base*2**Math.min(count-1,10)),retryAfterMilliseconds(details?.retryAfter??null));
 const value={failures:count,retryAt:Date.now()+delay,status,code:details?.code??data?.code??"request_failed",message:details?.message};
 cooldowns.set(key,value);write();return value.retryAt;
}
export function recordRequestSuccess(path:string,method="GET"){
 read();const value=cooldowns.get(scope(path,method));
 // A concurrent response must not cancel a pause established by a failed request.
 if(value&&value.retryAt<=Date.now()){cooldowns.delete(scope(path,method));write();}
}
export function clearRequestCooldowns(){cooldowns.clear();failures=new WeakSet();try{if(typeof window!=="undefined")window.localStorage.removeItem(STORAGE);}catch{/* Storage is optional. */}}
