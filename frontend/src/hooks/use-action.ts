import {useRef} from "react";
import {useMutation} from "@tanstack/react-query";
import {notify} from "@/lib/feedback";
import {errorMessage} from "@/lib/api";
/** One mutation owner; domain callbacks retain conflict handling and confirmed-success effects. */
export function useAction(options?:{notifyError?:boolean;settled?:()=>void}){
 const locked=useRef(false);
 const mutation=useMutation({mutationFn:(action:()=>Promise<unknown>)=>action(),onError:failure=>{if(options?.notifyError!==false)notify(errorMessage(failure),"error");},onSettled:()=>options?.settled?.()});
 async function run(action:()=>Promise<unknown>,completed?:()=>void){
  if(locked.current)return false;locked.current=true;
  try{await mutation.mutateAsync(action);completed?.();return true;}catch{return false;}finally{locked.current=false;}
 }
 return {busy:mutation.isPending,error:mutation.error?errorMessage(mutation.error):null,run};
}
