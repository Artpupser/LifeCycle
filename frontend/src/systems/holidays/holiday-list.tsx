import { ExternalLink } from "@/systems/links/external-link";
import {useState} from "react";
import {AppIcon} from "@/systems/icons/app-icon";
import {countryFlag,countryName} from "@/systems/phone/countries";
import {t,useLanguage} from "@/systems/i18n/locale";
import {dateLabel} from "@/lib/dates";
import {Button} from "@/components/ui/button";
import {AnimatedArticle} from "@/systems/animations/surfaces";
import {holidayKind,holidayName} from "./holidays";
import type {HolidayOccurrence} from "./types";

export function HolidayList({items,onDate,compact=false,preferredCountry}:{items:HolidayOccurrence[];onDate?:(date:string)=>void;compact?:boolean;preferredCountry?:string}) {
  useLanguage();
  const [limit,setLimit]=useState(30);
  const ordered=items.map(item=>preferredCountry&&item.countries.includes(preferredCountry)?{...item,countries:[preferredCountry,...item.countries.filter(code=>code!==preferredCountry)]}:item);
  return <div className="space-y-3">{!items.length?<p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">{t("Праздников по этому запросу нет.")}</p>:ordered.slice(0,compact?items.length:limit).map(item=><AnimatedArticle key={`${item.holiday.id}/${item.date}/${item.substitute}`} className="min-w-0 rounded-card border border-line bg-surface p-4" data-holiday-id={item.holiday.id}>
    <div className="flex items-start gap-3"><span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><AppIcon icon={item.holiday.scope==="international"?"tabler:world":"tabler:gift"}/></span><div className="min-w-0 flex-1"><h3 className="break-words font-medium">{holidayName(item.holiday)}</h3><p className="mt-1 text-xs text-muted-foreground">{dateLabel(item.date)}{item.through!==item.date?` — ${dateLabel(item.through)}`:""} · {item.kinds.map(holidayKind).join(" · ")}{item.substitute?` · ${t("Перенос праздника")}`:""}</p></div>{onDate&&<Button size="sm" variant="ghost" aria-label={t("Открыть дату праздника {name}",{name:holidayName(item.holiday)})} onClick={()=>onDate(item.date)}><AppIcon icon="tabler:arrow-up"/></Button>}</div>
    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">{item.holiday.scope==="international"?<span>{t("Международная дата")}</span>:item.countries.slice(0,3).map(code=><span key={code} className="inline-flex items-center gap-1.5"><AppIcon icon={countryFlag(code)} className="size-4"/>{countryName(code)}</span>)}{item.countries.length>3&&<details className="max-w-full"><summary className="cursor-pointer text-primary">{t("Ещё {count} стран",{count:item.countries.length-3})}</summary><div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-auto">{item.countries.slice(3).map(code=><span key={code} className="inline-flex items-center gap-1"><AppIcon icon={countryFlag(code)} className="size-4"/>{countryName(code)}</span>)}</div></details>}</div>
    <details className="mt-3 text-xs text-muted-foreground"><summary className="cursor-pointer">{t("О празднике и источнике")}</summary><div className="mt-2 space-y-2 leading-5"><p>{t("Это справочная дата. Праздник не всегда означает выходной; местные правила могут отличаться.")}</p><ExternalLink className="text-primary underline" href={item.holiday.source} target="_blank" rel="noopener noreferrer">{item.holiday.scope==="international"?t("Источник: ООН"):t("Источник: date-holidays · CC BY 3.0")}</ExternalLink>{item.holiday.countries.length>item.countries.length&&<p>{t("У праздника есть другие даты в других странах.")}</p>}</div></details>
  </AnimatedArticle>)}{!compact&&items.length>limit&&<Button variant="outline" onClick={()=>setLimit(limit+30)}>{t("Ещё праздники")}</Button>}</div>;
}
