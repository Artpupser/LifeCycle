export function localDate(timezone: string, instant = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instant);
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
  return new Intl.DateTimeFormat("ru-RU", { ...options, timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

export function instantLabel(instant: string, timezone: string, format: "12h" | "24h" = "24h") {
  return new Intl.DateTimeFormat("ru-RU", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: format === "12h" ? "h12" : "h23" }).format(new Date(instant));
}

export function dateTimeLabel(instant: string, timezone: string, format: "12h" | "24h" = "24h") {
  return `${dateLabel(localDate(timezone, new Date(instant)), { day: "numeric", month: "long", year: "numeric" })} · ${instantLabel(instant, timezone, format)}`;
}

export function minuteOfDay(instant: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(instant));
  return Number(parts.find((part) => part.type === "hour")!.value) * 60 + Number(parts.find((part) => part.type === "minute")!.value);
}

export function localDateTimeInput(instant: string) {
  const date = new Date(instant);
  const two = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}T${two(date.getHours())}:${two(date.getMinutes())}`;
}

/** A datetime-local value in the account's selected timezone, never the browser's zone. */
export function zonedDateTimeInput(instant: string | number, timezone: string) {
  const date = new Date(instant);
  const minute = minuteOfDay(date.toISOString(), timezone);
  return `${localDate(timezone, date)}T${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
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
