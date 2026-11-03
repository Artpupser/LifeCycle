import {phoneLinks} from "./links";
import {ExternalLink} from "./external-link";
import {t,useLanguage} from "@/systems/i18n/locale";
export function ContactActions({phone}:{phone:string}){useLanguage();const labels={call:t("Позвонить"),sms:t("SMS"),whatsapp:"WhatsApp",telegram:"Telegram",viber:"Viber"};return <div className="flex flex-wrap gap-2">{phoneLinks(phone).map(link=><ExternalLink key={link.service} service={link.service} href={link.href} aria-label={`${labels[link.service]} · ${phone}`} className="inline-flex min-h-9 items-center rounded-lg border border-border px-2 text-xs hover:bg-muted">{labels[link.service]}</ExternalLink>)}</div>;}
