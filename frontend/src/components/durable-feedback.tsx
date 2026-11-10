import {useEffect,useRef} from "react";
import {useAuth} from "@/features/auth/auth-context";
import {useResource} from "@/hooks/use-resource";
import {api} from "@/lib/api";
import {notifyDesktop,notificationRegistration} from "@/lib/feedback";
import type {Settings} from "@/features/settings/types";
import {t,useLanguage,resolveLanguage} from "@/systems/i18n/locale";
type Entry={id:string;message:string;parameters:Record<string,string|number>;href:string};
/** The existing feedback queue owns display; the API retains unread messages across sessions. */
export function DurableFeedback(){
 const {user}=useAuth();const language=useLanguage();const {resource:preferences}=useResource<Settings>(user?"/settings":null);const {resource,retry}=useResource<Entry[]>(user?"/notifications":null,{refreshIntervalMs:60_000});const pending=useRef(new Set<string>());
 useEffect(()=>{
  if(!user)return;
  void notificationRegistration();
  const receive=(event:MessageEvent)=>{if(event.data?.type==="feedback-refresh")retry();};
  navigator.serviceWorker?.addEventListener("message",receive);
  return()=>navigator.serviceWorker?.removeEventListener("message",receive);
 },[user,retry]);
 useEffect(()=>{
  if(!user||preferences.status!=="ready"||language!==resolveLanguage(preferences.data.language).language||resource.status!=="ready"||document.visibilityState!=="visible")return;
  const item=resource.data.find(item=>!pending.current.has(item.id));if(!item||pending.current.size)return;
  pending.current.add(item.id);
  notifyDesktop(t("Уведомления"),t(item.message,item.parameters),{key:`server:${item.id}`,href:item.href,onDismiss:()=>{void api(`/notifications/${encodeURIComponent(item.id)}/read`,{method:"POST"}).catch(()=>{}).finally(()=>{pending.current.delete(item.id);retry();});}});
 },[user,resource,retry,preferences,language]);
 return null;
}
