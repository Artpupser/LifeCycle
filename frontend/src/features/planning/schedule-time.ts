import { shiftLocalMinutes, dayDifference, localDateTimeToInstant, shiftDate, zonedDateTimeInput } from "@/lib/dates";
import type { Schedule } from "./types";
// Preserve stored instants/rules when an older schedule is edited from another display zone.
export function scheduleInZone(value: Schedule, timezone: string): Schedule {
  if (value.timezone === timezone || !value.time) return { ...value, timezone };
  let input = `${value.start_date}T${value.time.slice(0, 5)}`;
  let instant = localDateTimeToInstant(input, value.timezone);
  // Schedule's established rule moves a missing local minute to the next real minute.
  for (let i = 0; instant === null && i < 1440; i++) {
    input = shiftLocalMinutes(input, 1);
    instant = localDateTimeToInstant(input, value.timezone);
  }
  if (instant === null) return value;
  const local = zonedDateTimeInput(instant, timezone);
  const delta = dayDifference(value.start_date, local.slice(0, 10));
  return { ...value, timezone, start_date: local.slice(0, 10), time: local.slice(11), end_date: value.end_date ? shiftDate(value.end_date, delta) : null, weekdays: value.weekdays.map((day) => ((day - 1 + delta) % 7 + 7) % 7 + 1).sort() };
}
