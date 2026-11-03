import {useResource} from "@/hooks/use-resource";
export type HistoryQuery=
 |{kind:"task"|"habit";id:string}
 |{kind:"pomodoro";offset?:number}
 |{kind:"workout";before?:string;workoutId?:string}
 |{kind:"ai";before?:string};
export function historyPath(query:HistoryQuery){
 if(query.kind==="task"||query.kind==="habit")return `/${query.kind==="task"?"tasks":"habits"}/${encodeURIComponent(query.id)}/history`;
 if(query.kind==="pomodoro")return `/pomodoro/history?offset=${query.offset??0}`;
 const params=new URLSearchParams();
 if("before" in query&&query.before)params.set("before",query.before);
 if(query.kind==="workout"&&query.workoutId)params.set("workout_id",query.workoutId);
 return `${query.kind==="workout"?"/workout-sessions":"/ai/actions"}${params.size?`?${params}`:""}`;
}
export function useHistory<T>(query:HistoryQuery){return useResource<T>(historyPath(query));}
