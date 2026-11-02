import { expect, it } from "vitest";
import { taskTiming } from "./task-timing";
import { scheduleInZone } from "./schedule-time";
import { localDateTimeToInstant, zonedDateTimeInput } from "@/lib/dates";
import type { Task, Schedule } from "./types";
const rule: Schedule = { start_date: "2026-10-31", time: "23:30", timezone: "UTC", duration_minutes: 120, recurrence: "once", interval_days: 1, weekdays: [], end_date: null };
it("shows today for a task crossing midnight, including the selected display timezone", () => {
  const task = { schedule: rule } as Task;
  expect(taskTiming(task, Date.parse("2026-11-01T00:30Z"), "UTC")?.text).toBe("Сегодня");
  expect(taskTiming(task, Date.parse("2026-10-31T21:30Z"), "Europe/Moscow")?.text).toBe("Сегодня");
  expect(taskTiming(task, Date.parse("2026-10-29T20:00Z"), "UTC")?.text).toBe("Через 2 дня");
});
it("projects old rules for editing in the account timezone and roundtrips them", () => {
  const weekly = { ...rule, recurrence: "weekly" as const, weekdays: [6], end_date: "2026-11-07" };
  const projected = scheduleInZone(weekly, "Europe/Moscow");
  expect(projected).toMatchObject({ start_date: "2026-11-01", time: "02:30", weekdays: [7], end_date: "2026-11-08" });
  expect(scheduleInZone(projected, "UTC")).toEqual(weekly);
});
it("resolves settings-local input independently of browser zone and handles DST explicitly", () => {
  const instant = localDateTimeToInstant("2026-10-31T09:00", "Europe/Moscow")!;
  expect(new Date(instant).toISOString()).toBe("2026-10-31T06:00:00.000Z");
  expect(zonedDateTimeInput(instant, "America/Los_Angeles")).toBe("2026-10-30T23:00");
  expect(localDateTimeToInstant("2026-03-29T02:30", "Europe/Berlin")).toBeNull();
  expect(new Date(localDateTimeToInstant("2026-10-25T02:30", "Europe/Berlin")!).toISOString()).toBe("2026-10-25T00:30:00.000Z");
});
