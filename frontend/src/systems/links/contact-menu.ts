import {linkIcon,phoneLinks,safeExternalUrl} from "./links";
import {t} from "@/systems/i18n/locale";
import type {ContextAction} from "@/systems/actions/context";

export function serviceName(service:ReturnType<typeof phoneLinks>[number]["service"]){return ({call:t("Позвонить"),sms:t("SMS"),whatsapp:"WhatsApp",telegram:"Telegram",viber:"Viber"})[service];}

/** The same protocol adapters supply card links and object menu actions. */
export function contactLinkActions(phones:string[]):ContextAction[]{
 return [...new Set(phones)].flatMap(phone=>phoneLinks(phone).map(link=>({
  id:`contact-${link.service}-${phone}`,label:`${serviceName(link.service)} · ${phone}`,icon:linkIcon(link.href,link.service),
  run:()=>{const href=safeExternalUrl(link.href);if(!href)return;if(/^https?:/i.test(href))window.open(href,"_blank","noopener,noreferrer");else window.location.assign(href);},
 })));
}
