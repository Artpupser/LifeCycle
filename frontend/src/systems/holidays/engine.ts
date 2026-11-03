import Holidays, {type HolidaysTypes} from "date-holidays";
import { localDate } from "@/lib/dates";
import { internationalDays } from "./international";
import { firstHolidayYear, lastHolidayYear, type Holiday, type HolidayYear } from "./types";

// Shared identities are explicit. An unrelated national day with a generic
// English name never becomes the same holiday merely because names coincide.
const sharedNames = new Set(["New Year's Day", "Christmas Day", "Christmas Eve", "Boxing Day", "New Year's Eve", "Labour Day", "International Women's Day", "Valentine's Day", "Halloween", "Easter Sunday", "Easter Monday", "Good Friday", "All Saints' Day", "All Souls' Day", "Epiphany", "Pentecost", "Whit Monday", "Ascension Day", "Orthodox Christmas Day"]);
export function holidayIdentity(country: string, name: string, rule: string) {
  return sharedNames.has(name) ? `shared:${name}` : `country:${country}:${name}:${rule}`;
}
export function buildHolidayYear(year: number): HolidayYear {
  if (!Number.isInteger(year) || year < firstHolidayYear || year > lastHolidayYear) throw new Error("unsupported-year");
  const countries=Object.keys(new Holidays().getCountries()).sort();
  const catalog=new Map<string,Holiday>();
  for (const country of countries) {
    const source=new Holidays(country,{languages:["ru","en"],timezone:"UTC"});
    const rules=new Map((source.getRules() as unknown as HolidaysTypes.HolidayRule[]).map(rule=>[rule.rule,rule]));
    for(const item of source.getHolidays(year)) {
      const rule=rules.get(item.rule);
      const names=rule?.name;
      const en=typeof names==="object" ? names.en ?? item.name : names ?? item.name;
      const ru=typeof names==="object" ? names.ru ?? en : en;
      const id=holidayIdentity(country,en,item.rule);
      let holiday=catalog.get(id);
      if(!holiday) {
        holiday={id,name:{ru,en},countries:[],scope:"countries",source:"https://github.com/commenthol/date-holidays",observances:[]};
        catalog.set(id,holiday);
      }
      if(holiday.name.ru===holiday.name.en && ru!==en)holiday.name.ru=ru;
      if(!holiday.countries.includes(country))holiday.countries.push(country);
      holiday.observances.push({country,date:item.date.slice(0,10),through:localDate("UTC",item.end.getTime()-1),kind:item.type,substitute:Boolean(item.substitute)});
    }
  }
  for(const [date,ru,en,slug] of internationalDays) {
    catalog.set(`un:${slug}`,{id:`un:${slug}`,name:{ru,en},countries:[],scope:"international",source:`https://www.un.org/en/observances/${slug}`,observances:[{country:"",date:`${year}-${date}`,through:`${year}-${date}`,kind:"observance",substitute:false}]});
  }
  return {year,countries,holidays:[...catalog.values()]};
}
