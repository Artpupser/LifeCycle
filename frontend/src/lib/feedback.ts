import { t } from "@/systems/i18n/locale";
export type Confirmation = {message:string;title?:string;confirmLabel?:string;cancelLabel?:string;destructive?:boolean;choiceLabel?:string;choices?:{value:string;label:string}[]};
export type Notice = {message:string;kind:"success"|"error"|"info";key?:string;href?:string;onDismiss?:()=>void};
export const feedbackEvents = new EventTarget();
export function confirmAction(message:string|Confirmation):Promise<boolean> {
  const options=typeof message==="string"?{message,...(/удалить|безвозвратно|delete|permanently/i.test(message)?{title:t("Подтвердите удаление"),confirmLabel:t("Удалить"),destructive:true}:{})}:message;
  return new Promise(resolve=>feedbackEvents.dispatchEvent(new CustomEvent("confirm",{detail:{...options,resolve}})));
}
export function notify(message:string,kind:Notice["kind"]="success",options:Omit<Notice,"message"|"kind">={}) { feedbackEvents.dispatchEvent(new CustomEvent("notice",{detail:{message,kind,...options}})); }
export async function alertMessage(message:string) { await confirmAction({message,title:t("Уведомление"),confirmLabel:t("Понятно"),cancelLabel:t("Закрыть")}); }

/** Choice confirmations use the same queue, keyboard handling and cancellation lifecycle. */
export function confirmChoice(options: Confirmation & {choices:{value:string;label:string}[]}): Promise<string | null> {
  return new Promise(resolve=>feedbackEvents.dispatchEvent(new CustomEvent("confirm",{detail:{...options,resolve:(value:string|boolean)=>resolve(typeof value === "string" ? value : null)}})));
}
export function notificationPermission(): NotificationPermission | "unavailable" { return typeof Notification === "undefined" ? "unavailable" : Notification.permission; }
export async function enableNotifications() {
 if(typeof Notification === "undefined")return "unavailable" as const;
 const permission=await Notification.requestPermission();
 if(permission==="granted")await subscribePush();
 return permission;
}
export function notifyDesktop(title: string, message: string,options:Omit<Notice,"message"|"kind">={}) {
  notify(message, "info",options);
  if(notificationPermission()==="granted")void notificationRegistration().then(registration=>{
   const data={href:options.href};
   if(registration)return registration.showNotification(title,{body:message,silent:true,tag:options.key,data});
   try {const notice=new Notification(title,{body:message,silent:true,tag:options.key});notice.onclick=()=>{window.focus();if(options.href?.startsWith("/")&&!options.href.startsWith("//"))window.location.assign(options.href);notice.close();};}catch{/* In-app delivery remains available. */}
  }).catch(()=>{});
}

let registration:Promise<ServiceWorkerRegistration|null>|null=null;
export function notificationRegistration(){
 if(import.meta.env.DEV&&import.meta.env.VITE_MOCK_API==="true")return Promise.resolve(null);
 if(!globalThis.isSecureContext||!("serviceWorker" in navigator))return Promise.resolve(null);
 registration??=navigator.serviceWorker.register("/feedback-sw.js",{scope:"/",updateViaCache:"none"}).then(()=>navigator.serviceWorker.ready).catch(()=>{registration=null;return null;});
 return registration;
}
export async function subscribePush(){
 if(notificationPermission()!=="granted")return false;
 const {api}=await import("./api");
 const config=await api<{public_key:string|null}>("/notifications/push");
 if(!config.public_key)return false;
 const owner=await notificationRegistration();if(!owner||!("PushManager" in window))return false;
 const key=Uint8Array.from(atob(config.public_key.replaceAll("-","+").replaceAll("_","/")),character=>character.charCodeAt(0));
 const subscription=await owner.pushManager.getSubscription()??await owner.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
 await api("/notifications/push",{method:"PUT",body:subscription.toJSON()});
 return true;
}
export async function disablePush(){
 const owner=await notificationRegistration();const subscription=await owner?.pushManager.getSubscription();
 if(!subscription)return;
 const {api}=await import("./api");
 await api("/notifications/push",{method:"DELETE",body:{endpoint:subscription.endpoint}});
 await subscription.unsubscribe();
}

export async function pushSubscriptionStatus(subscriptions:readonly string[]){
 const owner=await notificationRegistration(),subscription=await owner?.pushManager?.getSubscription();
 if(!subscription)return false;
 const hash=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(subscription.endpoint));
 const endpoint=Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,"0")).join("");
 return subscriptions.includes(endpoint);
}
