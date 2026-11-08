import { getLocale } from "@/systems/i18n/locale";
import { t } from "@/systems/i18n/locale";
export function localDate(timezone: string, instant: string | number | Date = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(instant));
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10);
}

export function dayDifference(from: string, to: string) {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

export function dateLabel(date: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" }) {
  return new Intl.DateTimeFormat(getLocale(), { ...options, timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

export function instantLabel(instant: string | number, timezone: string, format: "12h" | "24h" = "24h", seconds = false) {
  return new Intl.DateTimeFormat(getLocale(), { timeZone: timezone, hour: "2-digit", minute: "2-digit", ...(seconds ? { second: "2-digit" as const } : {}), hourCycle: format === "12h" ? "h12" : "h23" }).format(new Date(instant));
}

export function dateTimeLabel(instant: string | number, timezone: string, format: "12h" | "24h" = "24h") {
  return `${dateLabel(localDate(timezone, instant), { day: "numeric", month: "long", year: "numeric" })} · ${instantLabel(instant, timezone, format)}`;
}

export function minuteOfDay(instant: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(instant));
  return Number(parts.find((part) => part.type === "hour")!.value) * 60 + Number(parts.find((part) => part.type === "minute")!.value);
}

/** A datetime-local value in the account's selected timezone, never the browser's zone. */
export function zonedDateTimeInput(instant: string | number, timezone: string, seconds = false) {
  const date = new Date(instant);
  const minute = minuteOfDay(date.toISOString(), timezone);
  return `${localDate(timezone, date)}T${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}${seconds ? `:${String(date.getUTCSeconds()).padStart(2, "0")}` : ""}`;
}
export function localDateTimeCandidates(value: string, timezone: string): number[] {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return [];
  const naive = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(naive) || new Date(naive).toISOString().slice(0, 16) !== value) return [];
  const offsets = new Set<number>();
  for (let hours = -36; hours <= 36; hours += 6) {
    const instant = naive + hours * 3_600_000;
    offsets.add(Date.parse(`${zonedDateTimeInput(instant, timezone)}:00Z`) - instant);
  }
  return [...offsets].map((offset) => naive - offset).filter((instant) => zonedDateTimeInput(instant, timezone) === value).sort((a, b) => a - b);
}
export function localDateTimeToInstant(value: string, timezone: string): number | null {
  return localDateTimeCandidates(value, timezone)[0] ?? null;
}

/** Calendar-only values are validated without interpreting them in the browser timezone. */
export function isCalendarDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
export function toInstant(value: string | number) { return new Date(value).toISOString(); }
export function weekday(date: string) { return new Date(`${date}T12:00:00Z`).getUTCDay(); }
export function shiftMonth(date: string, months: number) {
  const value = new Date(`${date.slice(0, 7)}-01T12:00:00Z`);
  value.setUTCMonth(value.getUTCMonth() + months);
  return value.toISOString().slice(0, 10);
}
export function shiftLocalMinutes(value: string, minutes: number) {
  return new Date(Date.parse(`${value}:00Z`) + minutes * 60_000).toISOString().slice(0, 16);
}
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

export function dayStart(date: string, timezone: string): number {
  const noon = Date.parse(`${date}T12:00:00Z`);let low=Math.floor((noon-48*3_600_000)/60_000);let high=Math.ceil((noon+48*3_600_000)/60_000);
  while(low<high){const middle=Math.floor((low+high)/2);if(localDate(timezone,middle*60_000)<date)low=middle+1;else high=middle;}
  return low*60_000;
}

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

export function isoWeekday(date:string){const day=new Date(`${date}T12:00:00Z`).getUTCDay();return day===0?7:day;}
export type CountdownUnit="days"|"seconds"|"minutes"|"weeks"|"months";
export function countdownAmount(start:string,end:string,timezone:string,unit:CountdownUnit,precise:boolean){
 const a=localDate(timezone,Date.parse(start)),b=localDate(timezone,Date.parse(end));const days=Math.abs(Date.parse(`${b}T00:00:00Z`)-Date.parse(`${a}T00:00:00Z`))/86400000;const seconds=precise?Math.abs(Date.parse(end)-Date.parse(start))/1000:days*86400;
 if(unit==="months"){const [first,last]=a<=b?[a,b]:[b,a];let months=(Number(last.slice(0,4))-Number(first.slice(0,4)))*12+Number(last.slice(5,7))-Number(first.slice(5,7));const lastDay=new Date(Date.UTC(Number(last.slice(0,4)),Number(last.slice(5,7)),0)).getUTCDate();if(Number(last.slice(8))<Math.min(Number(first.slice(8)),lastDay))months--;return Math.max(0,months);}
 return Math.floor(seconds/({seconds:1,minutes:60,days:86400,weeks:604800})[unit]);
}

/** Conventional western zodiac by civil birthday; never shift it through a timezone. */
export function zodiacCode(birthDate:string|null|undefined){
 if(!birthDate||!/^\d{4}-\d{2}-\d{2}$/.test(birthDate))return null;
 const parsed=new Date(`${birthDate}T12:00:00Z`);if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==birthDate)return null;
 const month=Number(birthDate.slice(5,7)),day=Number(birthDate.slice(8,10));
 const boundaries=[20,19,21,20,21,21,23,23,23,23,22,22];
 const signs=["capricorn","aquarius","pisces","aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn"] as const;
 return signs[month-1+(day>=boundaries[month-1]?1:0)];
}

/** Retry-After is an HTTP duration or GMT instant, independent of civil-date preferences. */
export function retryAfterMilliseconds(value:string|null,now=Date.now()){
 if(!value)return 0;const text=value.trim();
 if(/^\d+$/.test(text)){const seconds=Number(text);return Number.isSafeInteger(seconds)?Math.min(seconds*1000,2_147_000_000):0;}
 const at=Date.parse(text);return Number.isFinite(at)?Math.max(0,Math.min(at-now,2_147_000_000)):0;
}
export function secondsUntil(instant:number,now=Date.now()){return Math.max(0,Math.ceil((instant-now)/1000));}

/** Announcements with dates only retain their civil date in every user timezone. */
export function eventDateLabel(instant:string,allDay:boolean,timezone:string,format:"12h"|"24h"="24h") {return allDay?dateLabel(instant.slice(0,10),{day:"numeric",month:"long",year:"numeric"}):dateTimeLabel(instant,timezone,format);}
