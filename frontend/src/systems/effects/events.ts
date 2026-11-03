export type EffectKind="complete"|"create"|"remove"|"notice"|"confirm"|"error";
export type EffectOrigin={x:number;y:number};
export type EffectRequest={kind:EffectKind;origin?:EffectOrigin};
export const effectEvents=new EventTarget();
let enabled=true;
let origin:EffectOrigin={x:.5,y:.6};
export function configureEffects(next:boolean){enabled=next;effectEvents.dispatchEvent(new Event("policy"));}
export const effectsEnabled=()=>enabled;
export const effectOrigin=()=>({...origin});
export function rememberEffectOrigin(next:EffectOrigin){origin=next;}
export function showEffect(kind:EffectKind,position?:EffectOrigin){if(enabled)effectEvents.dispatchEvent(new CustomEvent<EffectRequest>("effect",{detail:{kind,origin:position??effectOrigin()}}));}
/** Interpret successful mutations once; components never infer success from clicks. */
export function mutationEffect(path:string,method:string,body:unknown,result:unknown):EffectKind|null {
  const clean=path.split("?")[0];
  if(!/^\/(tasks|habits|boards|notes|contacts|countdowns|exercises|workouts|workout-sessions|pomodoro|sex|task-tags)(\/|$)/.test(clean))return null;
  const record=(value:unknown):Record<string,unknown>=>value&&typeof value==="object"?value as Record<string,unknown>:{};
  const input=record(body),output=record(result);
  if(method==="DELETE")return "remove";
  const status=record(output.habit_mark).status??output.status??input.status;
  if(method!=="GET"&&(status==="completed"||(status===undefined&&input.completed===true)))return "complete";
  if(method==="POST"&&clean==="/notes/bulk"&&input.action==="delete")return "remove";
  if(method==="POST"&&/^\/(notes\/folders|boards\/[^/]+\/columns|pomodoro\/configs)$/.test(clean))return "create";
  if(method==="POST"&&!/\/(marks|occurrences|pause|resume|cancel|finish|stop|start|import|bulk)(\/|$)/.test(clean)&&clean.split("/").length===2)return "create";
  if(method==="POST"&&/\/(marks|occurrences)\//.test(clean))return "notice";
  return null;
}
