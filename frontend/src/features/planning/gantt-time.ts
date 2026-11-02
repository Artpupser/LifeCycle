export { dayStart } from "@/lib/dates";
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
