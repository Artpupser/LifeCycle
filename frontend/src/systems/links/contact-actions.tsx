import {phoneLinks} from "./links";
import {ExternalLink} from "./external-link";
import {useLanguage} from "@/systems/i18n/locale";
import {serviceName} from "./contact-menu";

export function ContactActions({phone}:{phone:string}){useLanguage();return <div className="flex flex-wrap gap-2">{phoneLinks(phone).map(link=><ExternalLink key={link.service} service={link.service} href={link.href} aria-label={`${serviceName(link.service)} · ${phone}`} className="inline-flex min-h-9 items-center rounded-lg border border-border px-2 text-xs hover:bg-muted">{serviceName(link.service)}</ExternalLink>)}</div>;}
