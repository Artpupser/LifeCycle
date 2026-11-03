import {useEffect,useState} from "react";
import {loadHolidayYear} from "./service";
import {holidayOccurrences} from "./holidays";
import {firstHolidayYear,lastHolidayYear,type HolidayOccurrence} from "./types";
type State={key:string;status:"loading"|"error"|"ready";items:HolidayOccurrence[];countries:string[]};
export function useHolidays(from:string,to:string) {
  const [state,setState]=useState<State|null>(null);
  const [attempt,retry]=useState(0);
  const key=`${from}/${to}/${attempt}`;
  useEffect(()=>{
    let active=true;
    const first=Math.max(firstHolidayYear,Number(from.slice(0,4))-1),last=Math.min(lastHolidayYear,Number(to.slice(0,4)));
    // Previous year matters for a multi-day observance crossing New Year.
    void Promise.resolve().then(()=>Promise.all(Array.from({length:last-first+1},(_,index)=>loadHolidayYear(first+index)))).then(years=>{
      if(active)setState({key,status:"ready",items:holidayOccurrences(years.flatMap(year=>year.holidays),from,to),countries:years.at(-1)?.countries??[]});
    }).catch(()=>{if(active)setState({key,status:"error",items:[],countries:[]});});
    return()=>{active=false;};
  },[from,to,key]);
  return {...(state?.key===key?state:{key,status:"loading" as const,items:[],countries:[]}),retry:()=>retry(value=>value+1)};
}
