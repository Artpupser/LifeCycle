import { OperatorBadge } from "@/systems/operators/operator-badge";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppIcon } from "@/systems/icons/app-icon";
import { CountryPicker } from "./country-input";
import { callingCode, countryFlag, countryName, type CountryCode } from "./countries";
import { formatPhone, parsePhone, possiblePhone } from "./phone";
import { t, useLanguage } from "@/systems/i18n/locale";
export function PhoneInput({id,value,change}: {id:string;value:string;change:(value:string)=>void}) {
  const language=useLanguage();
  const [selected,setSelected]=useState<CountryCode>(parsePhone(value)?.country??(language==="ru"?"RU":"US"));
  const [open,setOpen]=useState(false);const [edited,setEdited]=useState(false);
  const country=parsePhone(value)?.country??selected;
  const error=edited&&Boolean(value.trim())&&!possiblePhone(value,country);
  return <div className="space-y-2"><Button size="sm" variant="outline" aria-label={t("Страна телефона")} onClick={()=>setOpen(true)}><AppIcon icon={countryFlag(country)}/><span className="max-w-48 truncate">{countryName(country)}</span><span className="text-muted-foreground">+{callingCode(country)}</span></Button><Input id={id} type="tel" autoComplete="tel" inputMode="tel" maxLength={80} value={value} aria-invalid={error} aria-describedby={error?`${id}-error`:undefined} ref={element=>{element?.setCustomValidity(error?t("Проверьте телефон и код страны."):"");}} onChange={event=>{setEdited(true);change(event.target.value);}} onBlur={()=>{if(possiblePhone(value,country))change(formatPhone(value,country));}}/>{error&&<p id={`${id}-error`} className="text-xs text-destructive" role="status">{t("Проверьте телефон и код страны.")}</p>}<OperatorBadge phone={parsePhone(value,country)?.number??value}/>{open&&<CountryPicker phone value={country} close={()=>setOpen(false)} choose={code=>{setSelected(code as CountryCode);if(value.trim())change(`+${callingCode(code)}${parsePhone(value,country)?.nationalNumber??value.replace(/\D/g,"")}`);setEdited(true);setOpen(false);}}/>}</div>;
}
