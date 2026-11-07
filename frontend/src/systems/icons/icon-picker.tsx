import {genderIcons,genderName,genders} from "./gender";
import {zodiacNames} from "./zodiac";
import {ExternalLink} from "@/systems/links/external-link";
import {habitIcons} from "./habits";
import { countryName, countryNames } from "@/systems/phone/countries";
import { useState } from "react";
import { Dialog } from "@/components/dialog";
import { FilterSearch } from "@/components/filter-search";
import { Button } from "@/components/ui/button";
import { matchesFilter, parseFilterQuery, type FilterSpec } from "@/lib/filter-query";
import { iconCatalog, loadIconPack, resolveIcon } from "./catalog";
import { AppIcon } from "./app-icon";
import { t, useLanguage } from "@/systems/i18n/locale";

export function IconPicker({id,value,change,label=t("Выбрать значок")}: {id?:string;value:string;change:(value:string)=>void;label?:string}) {
  useLanguage();
  const [open,setOpen]=useState(false);
  return <><Button id={id} variant="outline" aria-label={t(label)} onClick={()=>setOpen(true)}><AppIcon icon={value}/><span>{t(label)}</span></Button>{open && <IconBrowser value={value} choose={next=>{change(next);setOpen(false);}} close={()=>setOpen(false)}/>}</>;
}
function IconBrowser({value,choose,close}: {value:string;choose:(value:string)=>void;close:()=>void}) {
  useLanguage();
  const [query,setQuery]=useState(""); const [limit,setLimit]=useState(100);
  const specs:FilterSpec[]=[{key:"pack",aliases:["пак","набор"],label:t("Набор"),example:t("набор:флаги"),values:["genders","гендеры","zodiac","зодиак","эмодзи","emoji","twemoji","habits","привычки","tabler","circle-flags","simple-icons","lifecycle","интерфейс","флаги","бренды","приложение","interface","flags","brands","app"]}];
  const filters=parseFilterQuery(query,specs);
  const packAliases={twemoji:["эмодзи","emoji"],tabler:["интерфейс","interface"],"circle-flags":["флаги","flags"],"simple-icons":["бренды","brands"],lifecycle:["приложение","app"]};
  const visible=iconCatalog.filter(icon=>{
    const names=icon.pack==="circle-flags"?countryNames(icon.name.toUpperCase()):null;
    const gender=genders.find(gender=>gender!=="unspecified"&&genderIcons[gender]===icon.id);
    const zodiac=icon.id.startsWith("tabler:zodiac-")?zodiacNames[icon.id.slice("tabler:zodiac-".length) as keyof typeof zodiacNames]:null;
    return matchesFilter(filters,`${gender?genderName(gender):""} ${zodiac??""} ${icon.name} ${icon.id} ${names?.ru??""} ${names?.en??""}`,{pack:[...(gender?["genders","гендеры"]:[]),icon.pack,...packAliases[icon.pack],...(icon.id.startsWith("tabler:zodiac-")?["зодиак","zodiac"]:[]),...(habitIcons.has(icon.id)?["habits","привычки"]:[])]});
  });
  return <Dialog title={t("Все значки")} onClose={close}><div className="space-y-4"><FilterSearch label={t("Поиск значков")} value={query} change={next=>{setQuery(next);setLimit(100);}} specs={specs} placeholder={t("Название или набор:флаги")}/><Button size="sm" variant="outline" onClick={()=>{setQuery("набор:привычки");setLimit(100);}}>{t("Привычки")}</Button><Button size="sm" variant="outline" onClick={()=>{setQuery("набор:зодиак");setLimit(100);}}>{t("Зодиак")}</Button><Button size="sm" variant="outline" onClick={()=>{setQuery("набор:эмодзи");setLimit(100);}}>{t("Эмодзи")}</Button><Button size="sm" variant="outline" onClick={()=>{setQuery("набор:гендеры");setLimit(100);}}>{t("Гендеры")}</Button><p className="text-xs text-muted-foreground">{t("Интерфейс, украшения, бренды и флаги — один каталог. Любой значок можно выбрать для любого объекта.")}</p><div className="grid max-h-[52svh] grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-7" aria-label={t("Каталог значков")}>{visible.slice(0,limit).map(icon=><button type="button" key={icon.id} title={icon.id} aria-label={icon.id} aria-pressed={resolveIcon(value)===icon.id} onPointerEnter={()=>void loadIconPack(icon.pack).catch(()=>{})} className={`flex min-h-20 min-w-0 flex-col items-center justify-center gap-2 rounded-xl border p-2 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring ${resolveIcon(value)===icon.id?"border-primary bg-primary/10":"border-border"}`} onClick={()=>choose(icon.id)}><AppIcon icon={icon.id} className="size-7"/><span className="w-full truncate text-[10px] text-muted-foreground">{icon.pack==="circle-flags"?countryName(icon.name.toUpperCase()):icon.id.startsWith("tabler:zodiac-")?t(zodiacNames[icon.id.slice("tabler:zodiac-".length) as keyof typeof zodiacNames]):icon.name}</span></button>)}</div><p className="text-xs text-muted-foreground">Twemoji © Twitter — <ExternalLink href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</ExternalLink></p>{!visible.length && <p role="status">{t("Значки не найдены")}</p>}{visible.length>limit && <Button variant="outline" onClick={()=>setLimit(limit+100)}>{t("Ещё значки")}</Button>}</div></Dialog>;
}
