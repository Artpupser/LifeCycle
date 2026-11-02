export type Confirmation = {message:string;title?:string;confirmLabel?:string;cancelLabel?:string;destructive?:boolean};
export type Notice = {message:string;kind:"success"|"error"|"info"};
export const feedbackEvents = new EventTarget();
export function confirmAction(message:string|Confirmation):Promise<boolean> {
  const options=typeof message==="string"?{message,...(/удалить|безвозвратно/i.test(message)?{title:"Подтвердите удаление",confirmLabel:"Удалить",destructive:true}:{})}:message;
  return new Promise(resolve=>feedbackEvents.dispatchEvent(new CustomEvent("confirm",{detail:{...options,resolve}})));
}
export function notify(message:string,kind:Notice["kind"]="success") { feedbackEvents.dispatchEvent(new CustomEvent("notice",{detail:{message,kind}})); }
export async function alertMessage(message:string) { await confirmAction({message,title:"Уведомление",confirmLabel:"Понятно",cancelLabel:"Закрыть"}); }
