import {useResource} from "@/hooks/use-resource";
import {countryCode} from "@/systems/phone/countries";
import {parseFilterQuery} from "@/lib/filter-query";
import {useHolidays} from "./use-holidays";
import {holidayFilters,matchesHoliday} from "./holidays";
import {HolidayList} from "./holiday-list";
import {t,useLanguage} from "@/systems/i18n/locale";
import {Button} from "@/components/ui/button";
export function DayHolidays({date}:{date:string}){useLanguage();const profile=useResource<{residence_country:string}>("/profile");const home=profile.resource.status==="ready"?countryCode(profile.resource.data.residence_country??""):null;const data=useHolidays(date,date);const filter=parseFilterQuery(home?`country:${home}`:"",holidayFilters);const items=data.items.filter(item=>matchesHoliday(filter,item));return <section aria-label={t("Праздники дня")} className="space-y-3">{data.status==="ready"&&items.length>0&&<><h2 className="text-xl font-semibold">{t("Праздники дня")}</h2><HolidayList items={items} compact preferredCountry={home??undefined}/></>}{data.status==="error"&&<Button variant="ghost" onClick={data.retry}>{t("Повторить загрузку праздников")}</Button>}</section>;}
