import type {HolidayYear} from "./types";
let worker:Worker|null=null;
const cache=new Map<number,Promise<HolidayYear>>();
const pending=new Map<number,{resolve:(value:HolidayYear)=>void;reject:()=>void;timer:ReturnType<typeof setTimeout>}>();
function resetWorker() {
  worker?.terminate();worker=null;
  for(const [year,item] of pending){clearTimeout(item.timer);cache.delete(year);item.reject();}
  pending.clear();
}
export function loadHolidayYear(year:number):Promise<HolidayYear> {
  const cached=cache.get(year);if(cached)return cached;
  if(!worker) {
    worker=new Worker(new URL("./holidays.worker.ts",import.meta.url),{type:"module"});
    worker.onmessage=(event:MessageEvent<{year:number;value?:HolidayYear;error?:boolean}>)=>{
      const entry=pending.get(event.data.year);if(!entry)return;
      clearTimeout(entry.timer);pending.delete(event.data.year);
      if(event.data.value)entry.resolve(event.data.value);else{cache.delete(event.data.year);entry.reject();}
    };
    worker.onerror=resetWorker;
  }
  const request=new Promise<HolidayYear>((resolve,reject)=>{
    pending.set(year,{resolve,reject:()=>reject(new Error("holiday-data-unavailable")),timer:setTimeout(resetWorker,30_000)});
    worker!.postMessage({year});
  });
  cache.set(year,request);
  // Keep a small working set when the user moves through years.
  for(const key of cache.keys()){if(cache.size<=4)break;if(!pending.has(key))cache.delete(key);}
  return request;
}
