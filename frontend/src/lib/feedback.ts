import { t } from "@/systems/i18n/locale";
export type Confirmation = {message:string;title?:string;confirmLabel?:string;cancelLabel?:string;destructive?:boolean;choiceLabel?:string;choices?:{value:string;label:string}[]};
export type Notice = {message:string;kind:"success"|"error"|"info"};
export const feedbackEvents = new EventTarget();
export function confirmAction(message:string|Confirmation):Promise<boolean> {
  const options=typeof message==="string"?{message,...(/удалить|безвозвратно|delete|permanently/i.test(message)?{title:t("Подтвердите удаление"),confirmLabel:t("Удалить"),destructive:true}:{})}:message;
  return new Promise(resolve=>feedbackEvents.dispatchEvent(new CustomEvent("confirm",{detail:{...options,resolve}})));
}
export function notify(message:string,kind:Notice["kind"]="success") { feedbackEvents.dispatchEvent(new CustomEvent("notice",{detail:{message,kind}})); }
export async function alertMessage(message:string) { await confirmAction({message,title:t("Уведомление"),confirmLabel:t("Понятно"),cancelLabel:t("Закрыть")}); }

/** Choice confirmations use the same queue, keyboard handling and cancellation lifecycle. */
export function confirmChoice(options: Confirmation & {choices:{value:string;label:string}[]}): Promise<string | null> {
  return new Promise(resolve=>feedbackEvents.dispatchEvent(new CustomEvent("confirm",{detail:{...options,resolve:(value:string|boolean)=>resolve(typeof value === "string" ? value : null)}})));
}
export function notificationPermission(): NotificationPermission | "unavailable" { return typeof Notification === "undefined" ? "unavailable" : Notification.permission; }
export async function enableNotifications() { return typeof Notification === "undefined" ? "unavailable" as const : Notification.requestPermission(); }
export function notifyDesktop(title: string, message: string) {
  notify(message, "info");
  if (notificationPermission() === "granted") { try { new Notification(title, {body:message,silent:true}); } catch { /* In-app delivery remains available. */ } }
}
