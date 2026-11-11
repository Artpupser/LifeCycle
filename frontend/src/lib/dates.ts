import {DateTime} from "luxon";
import { getLocale } from "@/systems/i18n/locale";
import { t } from "@/systems/i18n/locale";
function instant(value:string|number|Date,zone="UTC") {
 return (typeof value==="number"?DateTime.fromMillis(value):value instanceof Date?DateTime.fromJSDate(value):DateTime.fromISO(value,{setZone:true})).setZone(zone);
}
function civil(value:string){return DateTime.fromISO(value,{zone:"UTC"});}
export function localDate(timezone:string,value:string|number|Date=Date.now()){return instant(value,timezone).toISODate()!;}
export function shiftDate(date:string,days:number){return civil(date).plus({days}).toISODate()!;}
export function dayDifference(from:string,to:string){return civil(to).diff(civil(from),"days").days;}
export function dateLabel(date:string,options:Intl.DateTimeFormatOptions={day:"numeric",month:"long"}){return civil(date).setLocale(getLocale()).toLocaleString(options);}
export function instantLabel(value:string|number,timezone:string,format:"12h"|"24h"="24h",seconds=false){return instant(value,timezone).setLocale(getLocale()).toLocaleString({hour:"2-digit",minute:"2-digit",...(seconds?{second:"2-digit" as const}:{}),hourCycle:format==="12h"?"h12":"h23"});}
export function dateTimeLabel(value:string|number,timezone:string,format:"12h"|"24h"="24h"){return `${dateLabel(localDate(timezone,value),{day:"numeric",month:"long",year:"numeric"})} · ${instantLabel(value,timezone,format)}`;}
export function minuteOfDay(value:string,timezone:string){const date=instant(value,timezone);return date.hour*60+date.minute;}
export function zonedDateTimeInput(value:string|number,timezone:string,seconds=false){return instant(value,timezone).toFormat(seconds?"yyyy-MM-dd'T'HH:mm:ss":"yyyy-MM-dd'T'HH:mm");}
/** Reject DST gaps; preserve both possible instants in an overlap, earliest first. */
export function localDateTimeCandidates(value:string,timezone:string):number[]{
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return [];
 const date=DateTime.fromISO(value,{zone:timezone});
 if(!date.isValid||date.toFormat("yyyy-MM-dd'T'HH:mm")!==value)return [];
 return [...new Set(date.getPossibleOffsets().map(item=>item.toMillis()))].sort((a,b)=>a-b);
}
export function localDateTimeToInstant(value:string,timezone:string):number|null{return localDateTimeCandidates(value,timezone)[0]??null;}
export function isCalendarDate(value:string){const date=civil(value);return /^\d{4}-\d{2}-\d{2}$/.test(value)&&date.isValid&&date.toISODate()===value;}
export function toInstant(value:string|number){return instant(value).toISO()!;}
export function weekday(date:string){return civil(date).weekday%7;}
export function shiftMonth(date:string,months:number){return civil(date).startOf("month").plus({months}).toISODate()!;}
export function shiftLocalMinutes(value:string,minutes:number){return civil(value).plus({minutes}).toFormat("yyyy-MM-dd'T'HH:mm");}
export function clockFields(instant: string, timezone: string) {
  const local = zonedDateTimeInput(instant, timezone, true);
  return { target_date: local.slice(0, 10), target_time: local.slice(11) };
}
export function durationClock(seconds: number, days = false) {
  const n = Math.max(0, Math.floor(Math.abs(seconds)));
  const two = (value: number) => String(value).padStart(2, "0");
  return days ? t("{v0} д. {v1}:{v2}:{v3}", {v0: Math.floor(n / 86400), v1: two(Math.floor(n / 3600) % 24), v2: two(Math.floor(n / 60) % 60), v3: two(n % 60)}) : `${two(Math.floor(n / 60))}:${two(n % 60)}`;
}
export function durationLabel(seconds: number) { return seconds % 60 === 0 ? t("{v0} мин.", {v0: seconds / 60}) : t("{v0} сек.", {v0: seconds}); }
export function supportedTimezones() { return Intl.supportedValuesOf("timeZone"); }
export function defaultTimePreferences() { return { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, time_format: "24h" as const }; }

export function dayStart(date:string,timezone:string):number{return DateTime.fromISO(date,{zone:timezone}).startOf("day").toMillis();}

/** Add wall-clock minutes; callers can apply the calendar carry to their selected date. */
export function addClockMinutes(time: string, minutes: number) {
  const total = Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)) + minutes;
  const dayMinutes = ((total % 1440) + 1440) % 1440;
  return { time: `${String(Math.floor(dayMinutes / 60)).padStart(2, "0")}:${String(dayMinutes % 60).padStart(2, "0")}`, days: Math.floor(total / 1440) };
}
/** Native picker values remain machine-readable; preset labels follow the selected clock format. */
export function dateTimePresets(kind: string | undefined, now: number, timezone: string, format: "12h" | "24h", seconds = false) {
  const today = localDate(timezone, now);
  const local = zonedDateTimeInput(now, timezone, seconds);
  const rounded = zonedDateTimeInput(Math.ceil(now / 900_000) * 900_000, timezone, seconds);
  const label = (time: string) => instantLabel(`2000-01-01T${time}:00Z`, "UTC", format);
  if (kind === "date") return [[t("Сегодня"), today], [t("Завтра"), shiftDate(today, 1)], [t("Через неделю"), shiftDate(today, 7)]];
  if (kind === "time") return [[t("Сейчас"), local.slice(11)], [t("Ближайшие 15 минут"), rounded.slice(11)], ...[[t("Утро"), "09:00"], [t("День"), "12:00"], [t("Вечер"), "18:00"]].map(([name,time])=>[`${name} · ${label(time)}`, seconds ? `${time}:00` : time])];
  return [[t("Сейчас"), local], [t("Ближайшие 15 минут"), rounded], [t("Завтра · {v0}", {v0: label("09:00")}), `${shiftDate(today, 1)}T09:00${seconds ? ":00" : ""}`]];
}

export function countdownParts(seconds: number) {
  const n=Math.floor(Math.abs(seconds));
  return {days:Math.floor(n/86400),clock:`${String(Math.floor(n/3600)%24).padStart(2,"0")}:${String(Math.floor(n/60)%60).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`};
}

/** Birthday ages use civil dates and the same Feb-29 clamp as event recurrence. */
export function birthdayAges(birth:string|null|undefined,next:string|null|undefined,timezone:string,now:number=Date.now()) {
 if(!birth||!isCalendarDate(birth))return null;
 const today=localDate(timezone,now);if(birth>today)return null;
 const year=Number(today.slice(0,4)),born=Number(birth.slice(0,4));
 const anniversary=`${year}-${birth.slice(5)}`;
 const clamped=isCalendarDate(anniversary)?anniversary:`${year}-02-28`;
 const current=year-born-(today<clamped?1:0);
 return {current,next:Math.max(current,next?Number(next.slice(0,4))-born:current+1),today:today===clamped};
}

export function isoWeekday(date:string){return civil(date).weekday;}
export type CountdownUnit="days"|"seconds"|"minutes"|"weeks"|"months";
export function countdownAmount(start:string,end:string,timezone:string,unit:CountdownUnit,precise:boolean){
 const a=localDate(timezone,start),b=localDate(timezone,end),days=Math.abs(dayDifference(a,b));
 const seconds=precise?Math.abs(instant(end).diff(instant(start),"seconds").seconds):days*86400;
 if(unit==="months"){const [first,last]=a<=b?[civil(a),civil(b)]:[civil(b),civil(a)];return Math.max(0,Math.floor(last.diff(first,"months").months));}
 return Math.floor(seconds/({seconds:1,minutes:60,days:86400,weeks:604800})[unit]);
}

/** Conventional western zodiac by civil birthday; never shift it through a timezone. */
export function zodiacCode(birthDate:string|null|undefined){
 if(!birthDate||!/^\d{4}-\d{2}-\d{2}$/.test(birthDate))return null;
 if(!isCalendarDate(birthDate))return null;
 const month=Number(birthDate.slice(5,7)),day=Number(birthDate.slice(8,10));
 const boundaries=[20,19,21,20,21,21,23,23,23,23,22,22];
 const signs=["capricorn","aquarius","pisces","aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn"] as const;
 return signs[month-1+(day>=boundaries[month-1]?1:0)];
}

/** Retry-After is an HTTP duration or GMT instant, independent of civil-date preferences. */
export function retryAfterMilliseconds(value:string|null,now=Date.now()){
 if(!value)return 0;const text=value.trim();
 if(/^\d+$/.test(text)){const seconds=Number(text);return Number.isSafeInteger(seconds)?Math.min(seconds*1000,2_147_000_000):0;}
 const at=DateTime.fromHTTP(text,{zone:"UTC"}).toMillis();return Number.isFinite(at)?Math.max(0,Math.min(at-now,2_147_000_000)):0;
}
export function secondsUntil(instant:number,now=Date.now()){return Math.max(0,Math.ceil((instant-now)/1000));}

/** Announcements with dates only retain their civil date in every user timezone. */
export function eventDateLabel(instant:string,allDay:boolean,timezone:string,format:"12h"|"24h"="24h") {return allDay?dateLabel(instant.slice(0,10),{day:"numeric",month:"long",year:"numeric"}):dateTimeLabel(instant,timezone,format);}
