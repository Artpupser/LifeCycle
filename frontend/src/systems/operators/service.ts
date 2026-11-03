import {api} from "@/lib/api";
import {parsePhone} from "@/systems/phone/phone";
import {rangeOperator,type OperatorResult} from "./ranges";
const cache=new Map<string,{expires:number;value:OperatorResult|null}>();
const pending=new Map<string,Promise<OperatorResult|null>>();
export function clearOperatorCache(){cache.clear();pending.clear();}
export function retryFallbackOperators(){for(const [key,item] of cache)if(item.value?.source!=="online"&&item.value?.source!=="cache")cache.delete(key);}
let epoch=0;
let active=0;const waiters:Array<()=>void>=[];
async function slot<T>(work:()=>Promise<T>){if(active<2)active++;else await new Promise<void>(resolve=>waiters.push(resolve));try{return await work();}finally{const next=waiters.shift();if(next)next();else active--;}}

export function resetOperators(){epoch++;clearOperatorCache();}
export async function lookupOperator(input:string):Promise<OperatorResult|null>{const phone=parsePhone(input);if(phone?.country!=="RU")return null;const key=phone.number,now=Date.now();const cached=cache.get(key);if(cached&&cached.expires>now)return cached.value;const request=pending.get(key);if(request)return request;const generation=epoch;const next=(async()=>{const fallback=rangeOperator(key);if(typeof navigator!=="undefined"&&navigator.onLine===false)return fallback;try{const value=await slot(()=>generation===epoch?api<OperatorResult|null>("/operators/lookup",{method:"POST",body:{phone:key}}):Promise.resolve(null));return value?.operator?value:fallback;}catch{return fallback;}})().then(value=>{if(generation===epoch){cache.set(key,{expires:now+(value?.source==="range"?5*60_000:24*60*60_000),value});if(cache.size>1000)cache.delete(cache.keys().next().value!);}return value;}).finally(()=>{if(generation===epoch)pending.delete(key);});pending.set(key,next);return next;}

if(typeof window!=="undefined")window.addEventListener("lifecycle:cache-cleared",resetOperators);
if(typeof window!=="undefined")window.addEventListener("online",retryFallbackOperators);
