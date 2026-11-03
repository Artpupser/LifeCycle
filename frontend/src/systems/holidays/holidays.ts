import { getLanguage, t } from "@/systems/i18n/locale";
import { countries, countryNames } from "@/systems/phone/countries";
import { matchesFilter, type FilterQuery, type FilterSpec } from "@/lib/filter-query";
import type {Holiday, HolidayKind, HolidayOccurrence} from "./types";

export const holidayName=(holiday:Holiday)=>holiday.name[getLanguage()];
export function holidayKind(kind:HolidayKind) {return {public:t("Государственный праздник"),bank:t("Банковский выходной"),optional:t("Необязательный выходной"),school:t("Школьный праздник"),observance:t("Памятная дата")}[kind];}
export const holidayFilters:FilterSpec[]=[
  {key:"country",aliases:["страна"],get label(){return t("Страна");},get example(){return t("страна:RU");}},
  {key:"kind",aliases:["тип"],get label(){return t("Тип праздника");},get example(){return t("тип:памятный");},values:["public","bank","optional","school","observance","государственный","банковский","необязательный","школьный","памятный"]},
];
const kindAliases:Record<HolidayKind,string>={public:"государственный",bank:"банковский",optional:"необязательный",school:"школьный",observance:"памятный"};
export function holidayOccurrences(holidays:Holiday[],from:string,to:string):HolidayOccurrence[] {
  const result:HolidayOccurrence[]=[];
  for(const holiday of holidays) {
    const groups=new Map<string,HolidayOccurrence>();
    for(const item of holiday.observances) {
      if(item.date>to||item.through<from)continue;
      const key=`${item.date}/${item.through}/${item.substitute}`;
      let occurrence=groups.get(key);
      if(!occurrence){occurrence={holiday,date:item.date,through:item.through,countries:[],kinds:[],substitute:item.substitute};groups.set(key,occurrence);}
      if(item.country&&!occurrence.countries.includes(item.country))occurrence.countries.push(item.country);
      if(!occurrence.kinds.includes(item.kind))occurrence.kinds.push(item.kind);
    }
    result.push(...groups.values());
  }
  return result.sort((a,b)=>a.date.localeCompare(b.date)||a.holiday.id.localeCompare(b.holiday.id));
}
export function matchesHoliday(query:FilterQuery,item:HolidayOccurrence) {
  const codes=item.holiday.scope==="international"?countries:item.countries;
  const names=codes.flatMap(code=>{const name=countryNames(code);return [code,name.ru,name.en];});
  return matchesFilter(query,`${item.holiday.name.ru} ${item.holiday.name.en} ${names.join(" ")}`,{country:names,kind:item.kinds.flatMap(kind=>[kind,kindAliases[kind]])});
}
