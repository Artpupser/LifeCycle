import { localDate } from "@/lib/dates";
export function dayStart(date: string, timezone: string): number {
  const noon = Date.parse(`${date}T12:00:00Z`);let low=Math.floor((noon-48*3_600_000)/60_000);let high=Math.ceil((noon+48*3_600_000)/60_000);
  while(low<high){const middle=Math.floor((low+high)/2);if(localDate(timezone,new Date(middle*60_000))<date)low=middle+1;else high=middle;}
  return low*60_000;
}
export function changedInterval(start: number, duration: number, delta: number, mode: "move"|"start"|"end", step=1, maximum=1440) {
  const snap=(value:number)=>Math.round(value/(step*60_000))*step*60_000;
  const finish=start+duration*60_000;
  if(mode==="move")return {start:snap(start+delta*60_000),duration};
  if(mode==="start"){
    const latest=Math.floor((finish-60_000)/(step*60_000))*step*60_000;
    const next=Math.max(finish-maximum*60_000,Math.min(latest,snap(start+delta*60_000)));
    return {start:next,duration:Math.round((finish-next)/60_000)};
  }
  const earliest=(Math.floor(start/(step*60_000))+1)*step*60_000;
  const next=Math.min(start+maximum*60_000,Math.max(earliest,snap(finish+delta*60_000)));
  return {start,duration:Math.round((next-start)/60_000)};
}
