import {api} from "@/lib/api";
import {confirmChoice,notify} from "@/lib/feedback";
import {t} from "@/systems/i18n/locale";
import {contactName,type Contact} from "./types";

/** Both the address book and its graph use the same deletion policy. */
export async function removeContact(contact:Contact):Promise<boolean>{
 const events=await confirmChoice({title:t("Удалить контакт"),message:t("Удалить «{v0}» безвозвратно? При сохранении связанные события получат снимок сведений контакта.",{v0:contactName(contact.data)}),confirmLabel:t("Подтвердить удаление контакта"),destructive:true,choiceLabel:t("Что сделать со связанными событиями"),choices:[{value:"keep",label:t("Сохранить как самостоятельные события")},{value:"delete",label:t("Удалить связанные события")}]});
 if(events===null)return false;
 await api(`/contacts/${contact.id}`,{method:"DELETE",body:{revision:contact.revision,events}});
 notify(t("Контакт удалён."));
 return true;
}
