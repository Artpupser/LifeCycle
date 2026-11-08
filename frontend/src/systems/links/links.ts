import gamePlatforms from "../../../../shared/game-platforms.json";
import {parsePhone} from "@/systems/phone/phone";
export type LinkService="web"|"whatsapp"|"telegram"|"viber"|"sms"|"call"|"mail";
export function phoneLinks(value:string){const phone=parsePhone(value);if(!phone?.isPossible())return [];const number=phone.number,digits=number.slice(1);return [
 {service:"call" as const,href:`tel:${number}`},{service:"sms" as const,href:`sms:${number}`},
 {service:"whatsapp" as const,href:`https://wa.me/${digits}`},{service:"telegram" as const,href:`https://t.me/+${digits}`},
 {service:"viber" as const,href:`viber://chat?number=${encodeURIComponent(number)}`},
 ];}
export function safeExternalUrl(value:string){try{const url=new URL(value);if(url.username||url.password)return "";if(["https:","http:"].includes(url.protocol))return url.href;if(["tel:","sms:"].includes(url.protocol)&&/^\+\d{7,15}$/.test(url.pathname))return url.href;if(url.protocol==="mailto:"&&!/[\r\n]/.test(value)&&!/%0[ad]/i.test(value))return url.href;if(url.protocol==="viber:"&&url.hostname==="chat"&&/^\+\d{7,15}$/.test(url.searchParams.get("number")??""))return url.href;return "";}catch{return "";}}
export function linkIcon(href:string,service?:LinkService){if(service)return {web:"tabler:external-link",whatsapp:"simple-icons:whatsapp",telegram:"simple-icons:telegram",viber:"simple-icons:viber",sms:"tabler:message-circle",call:"tabler:phone",mail:"tabler:mail"}[service];try{const host=new URL(href).hostname.replace(/^www\./,"");const gamePlatform=gamePlatforms.find(platform=>platform.hosts.some(value=>value.replace(/^www\./,"")===host));if(gamePlatform)return gamePlatform.icon;return ({"t.me":"simple-icons:telegram","wa.me":"simple-icons:whatsapp","github.com":"simple-icons:github","youtube.com":"simple-icons:youtube","instagram.com":"simple-icons:instagram"} as Record<string,string>)[host]??"tabler:external-link";}catch{return "tabler:external-link";}}

export function openExternalUrl(value:string){const safe=safeExternalUrl(value);if(safe)window.open(safe,"_blank","noopener,noreferrer");}
