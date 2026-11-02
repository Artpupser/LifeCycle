import { useState } from "react";
import { Dialog } from "@/components/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterSearch } from "@/components/filter-search";
import { AppIcon } from "@/systems/icons/app-icon";
import { matchesFilter, parseFilterQuery } from "@/lib/filter-query";
import { callingCode, countries, countryCode, countryFlag, countryName, countryNames } from "./countries";
import { t, useLanguage } from "@/systems/i18n/locale";
export function CountryPicker({value,choose,close,phone=false}: {value:string;choose:(code:string)=>void;close:()=>void;phone?:boolean}) {
  useLanguage(); const [query,setQuery]=useState(""); const filters=parseFilterQuery(query,[]);
  const visible=countries.filter(code=>{const names=countryNames(code);return (!phone||callingCode(code))&&matchesFilter(filters,`${code} ${names.ru} ${names.en} +${callingCode(code)}`,{});}).sort((a,b)=>countryName(a).localeCompare(countryName(b)));
  return <Dialog title={t("Выберите страну")} onClose={close}><div className="space-y-4"><FilterSearch label={t("Поиск страны")} value={query} change={setQuery} specs={[]} placeholder={t("Название, код страны или телефонный код")}/><div className="max-h-[55svh] space-y-1 overflow-y-auto">{visible.map(code=><button type="button" key={code} aria-pressed={value===code} className={`flex min-h-12 w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-muted ${value===code?"bg-primary/10":""}`} onClick={()=>choose(code)}><AppIcon icon={countryFlag(code)} className="size-6"/><span className="min-w-0 flex-1 break-words">{countryName(code)}</span><span className="text-xs text-muted-foreground">{phone?`+${callingCode(code)}`:code}</span></button>)}</div>{!visible.length&&<p role="status">{t("Страна не найдена")}</p>}</div></Dialog>;
}
export function CountryInput({id,value,change}: {id:string;value:string;change:(value:string)=>void}) {
  useLanguage(); const [open,setOpen]=useState(false);const code=countryCode(value);
  return <div className="space-y-2"><div className="flex min-w-0 items-center gap-2"><AppIcon icon={code?countryFlag(code):"tabler:world"} className="size-6"/><Input id={id} value={code?countryName(code):value} maxLength={100} autoComplete="country-name" onChange={event=>change(event.target.value)}/></div><Button size="sm" variant="outline" onClick={()=>setOpen(true)}>{t("Выберите страну")}</Button>{open&&<CountryPicker value={code??""} close={()=>setOpen(false)} choose={next=>{change(next);setOpen(false);}}/>}</div>;
}
