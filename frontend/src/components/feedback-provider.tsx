import {Link} from "react-router";
import {DurableFeedback} from "./durable-feedback";
import {FormField} from "./form-field";
import {ChoiceField} from "./ui/choice-picker";
import { AnimatedSurface, Presence } from "@/systems/animations/surfaces";
import { t, useLanguage } from "@/systems/i18n/locale";
import {useEffect,useRef,useState,type ReactNode} from "react";
import {CheckCircle2,Info,TriangleAlert,X} from "@/components/icons";
import {Dialog} from "./dialog";

import {Button} from "./ui/button";
import {feedbackEvents,type Confirmation,type Notice} from "@/lib/feedback";
type Request=Confirmation&{id:number;resolve:(value:boolean|string)=>void};
export function FeedbackProvider({children}:{children:ReactNode}) {
  useLanguage();
  const [requests,setRequests]=useState<Request[]>([]);
  const [notices,setNotices]=useState<(Notice&{id:number})[]>([]);
  const serial=useRef(0);const pending=useRef(new Set<Request>());
  useEffect(()=>{
    const confirm=(event:Event)=>{const request={...(event as CustomEvent<Request>).detail,id:++serial.current};pending.current.add(request);setRequests(items=>[...items,request]);};
    const notice=(event:Event)=>{const value=(event as CustomEvent<Notice>).detail;setNotices(items=>[...items.filter(item=>item.key&&item.key!==value.key),...items.filter(item=>!item.key&&(item.message!==value.message||item.kind!==value.kind)).slice(-1),{...value,id:++serial.current}]);};
    const queue=pending.current;
    feedbackEvents.addEventListener("confirm",confirm);feedbackEvents.addEventListener("notice",notice);
    return()=>{feedbackEvents.removeEventListener("confirm",confirm);feedbackEvents.removeEventListener("notice",notice);queue.forEach(request=>request.resolve(false));queue.clear();};
  },[]);
  useEffect(()=>{if(!notices.length)return;const first=notices[0];const timer=setTimeout(()=>{first.onDismiss?.();setNotices(items=>items.filter(item=>item.id!==first.id));},6000);return()=>clearTimeout(timer);},[notices]);
  function settle(value:boolean|string){const request=requests[0];if(!request)return;request.resolve(value);pending.current.delete(request);setRequests(items=>items.slice(1));}
  function dismiss(id:number){notices.find(item=>item.id===id)?.onDismiss?.();setNotices(items=>items.filter(item=>item.id!==id));}
  const request=requests[0];
  return <>{children}<DurableFeedback/><div className="pointer-events-none fixed bottom-24 right-5 z-[100] flex w-[min(24rem,calc(100vw-2.5rem))] flex-col gap-2" aria-label={t("Уведомления")}><Presence>{notices.slice(0,2).map(notice=><AnimatedSurface kind="notice" key={notice.id} role={notice.kind==="error"?"alert":"status"} className="pointer-events-auto flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-sm text-foreground shadow-xl">{notice.kind==="error"?<TriangleAlert className="size-5 shrink-0 text-destructive"/>:notice.kind==="success"?<CheckCircle2 className="size-5 shrink-0 text-primary"/>:<Info className="size-5 shrink-0"/>}<p className="min-w-0 flex-1 break-words">{notice.href&&notice.href.startsWith("/")&&!notice.href.startsWith("//")?<Link to={notice.href} className="underline underline-offset-4" onClick={()=>dismiss(notice.id)}>{notice.message}</Link>:notice.message}</p><button aria-label={t("Закрыть уведомление")} onClick={()=>dismiss(notice.id)}><X className="size-4"/></button></AnimatedSurface>)}</Presence></div>{request&&<Dialog key={request.id} title={request.title??t("Подтвердите действие")} role="alertdialog" onClose={()=>settle(false)}><form onSubmit={event=>{event.preventDefault();settle(request.choices ? String(new FormData(event.currentTarget).get("choice")) : true);}}><p className="whitespace-pre-line text-sm leading-6">{request.message}</p>{request.choices && <div className="mt-4"><FormField id="confirmation-choice" label={request.choiceLabel??t("Действие")}><ChoiceField id="confirmation-choice" name="choice" defaultValue={request.choices[0]?.value}>{request.choices.map(choice=><option key={choice.value} value={choice.value}>{choice.label}</option>)}</ChoiceField></FormField></div>}<div className="mt-6 flex justify-end gap-2"><Button autoFocus variant="outline" onClick={()=>settle(false)}>{request.cancelLabel??t("Отмена")}</Button><Button className={request.destructive?"bg-destructive text-white hover:bg-destructive/90":undefined} type="submit">{request.confirmLabel??t("Подтвердить")}</Button></div></form></Dialog>}</>;
}
