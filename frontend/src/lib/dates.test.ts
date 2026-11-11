import { describe, expect, it } from "vitest";
import { dateLabel, dayDifference, instantLabel, localDate, minuteOfDay, shiftDate } from "./dates";
import {calendarMonth,dateInputError,isMonthDay,birthdayLabel,zodiacCode} from "./dates";

it("validates custom date/time input bounds, steps and yearless leap birthdays",()=>{
 expect(isMonthDay("--02-29")).toBe(true);expect(isMonthDay("--02-30")).toBe(false);
 expect(birthdayLabel("--02-29")).toBe("29 февраля");expect(zodiacCode("--03-21")).toBe("aries");
 expect(dateInputError("--02-29","date","1900-01-01","2026-11-11",undefined,true)).toBe("");
 expect(dateInputError("--02-29","date")).not.toBe("");
 expect(dateInputError("2025-02-29","date")).not.toBe("");
 expect(dateInputError("2026-11-12","date",undefined,"2026-11-11")).not.toBe("");
 expect(dateInputError("2026-11-11","date","2026-11-10",undefined,2)).not.toBe("");
 expect(dateInputError("12:30","time","12:30:00","12:30:00")).toBe("");
 expect(dateInputError("24:00","time")).not.toBe("");
 expect(dateInputError("12:31","time",undefined,undefined,900)).not.toBe("");
 expect(dateInputError("2026-11-11T12:30:47","datetime-local",undefined,undefined,1)).toBe("");
 expect(calendarMonth("2026-11-01")[0]).toBe("2026-10-26");
 expect(calendarMonth("2026-11-01","sunday")[0]).toBe("2026-11-01");
});

describe("calendar dates and timezones", () => {
  it("uses account timezone around UTC midnight and year boundaries", () => {
    const instant = new Date("2026-12-31T22:30:00Z");
    expect(localDate("Europe/Moscow", instant)).toBe("2027-01-01");
    expect(localDate("America/Los_Angeles", instant)).toBe("2026-12-31");
    expect(localDate("Pacific/Kiritimati", new Date("2026-01-01T00:15:00Z"))).toBe("2026-01-01");
    expect(localDate("Pacific/Honolulu", new Date("2026-01-01T00:15:00Z"))).toBe("2025-12-31");
  });

  it("counts calendar days across DST, leap days and year boundaries", () => {
    expect(dayDifference("2026-03-07", "2026-03-09")).toBe(2);
    expect(dayDifference("2026-10-31", "2026-11-02")).toBe(2);
    expect(dayDifference("2024-02-28", "2024-03-01")).toBe(2);
    expect(shiftDate("2024-02-28", 1)).toBe("2024-02-29");
    expect(shiftDate("2027-01-01", -1)).toBe("2026-12-31");
  });

  it("formats instants in account timezone without shifting date-only labels", () => {
    expect(instantLabel("2026-06-01T22:15:00Z", "Europe/Moscow")).toBe("01:15");
    expect(instantLabel("2026-06-01T22:15:00Z", "America/New_York")).toBe("18:15");
    expect(dateLabel("2024-02-29")).toBe("29 февраля");
  });
});

describe("profile time preferences", () => {
  it("displays the same instant in the profile day and chosen clock format", () => {
    const instant = "2026-10-28T15:30:00Z";
    expect(localDate("Asia/Tokyo", new Date(instant))).toBe("2026-10-29");
    expect(instantLabel(instant, "America/Los_Angeles", "24h")).toBe("08:30");
    expect(instantLabel(instant, "America/Los_Angeles", "12h")).toBe("08:30 AM");
  });

  it("keeps midnight and Gantt positions numeric across formats and DST", () => {
    expect(minuteOfDay("2026-10-28T15:30:00Z", "Asia/Tokyo")).toBe(30);
    expect(instantLabel("2026-10-29T00:00:00Z", "UTC")).toBe("00:00");
    expect(instantLabel("2026-10-29T00:00:00Z", "UTC", "12h")).toBe("12:00 AM");
    expect(instantLabel("2026-10-29T12:00:00Z", "UTC", "12h")).toBe("12:00 PM");
    expect(minuteOfDay("2026-10-25T00:30:00Z", "Europe/Berlin")).toBe(150);
    expect(minuteOfDay("2026-10-25T01:30:00Z", "Europe/Berlin")).toBe(150);
  });
});

import { clockFields, dateTimeLabel, durationClock, isCalendarDate, localDateTimeCandidates, shiftMonth, zonedDateTimeInput } from "./dates";

it("keeps seconds when editing historical instants in the account timezone", () => {
  const instant = "2026-10-25T01:30:47Z";
  expect(zonedDateTimeInput(instant, "Europe/Berlin", true)).toBe("2026-10-25T02:30:47");
  expect(clockFields(instant, "Europe/Berlin")).toEqual({target_date:"2026-10-25",target_time:"02:30:47"});
  expect(localDateTimeCandidates("2026-10-25T02:30", "Europe/Berlin")).toHaveLength(2);
  expect(localDateTimeCandidates("2026-03-29T02:30", "Europe/Berlin")).toEqual([]);
  expect(dateTimeLabel(instant, "America/Los_Angeles", "12h")).toContain("06:30 PM");
});
it("validates real calendar dates and navigates month and year boundaries", () => {
  expect(isCalendarDate("2024-02-29")).toBe(true);
  expect(isCalendarDate("2026-02-29")).toBe(false);
  expect(isCalendarDate("2026-04-31")).toBe(false);
  expect(isCalendarDate("not-a-date")).toBe(false);
  expect(shiftMonth("2026-12-01", 1)).toBe("2027-01-01");
  expect(shiftMonth("2026-01-01", -1)).toBe("2025-12-01");
  expect(durationClock(65)).toBe("01:05");
  expect(durationClock(-90061, true)).toBe("1 д. 01:01:01");
});

import { addClockMinutes, dateTimePresets } from "./dates";
it("centralizes midnight carry and preference-aware picker presets", () => {
  expect(addClockMinutes("23:30", 60)).toEqual({time:"00:30",days:1});
  const now = Date.parse("2026-11-02T15:30:47Z");
  expect(dateTimePresets("date",now,"Asia/Tokyo","12h")[0]).toEqual(["Сегодня","2026-11-03"]);
  expect(dateTimePresets("time",now,"Asia/Tokyo","12h",true)[0]).toEqual(["Сейчас","00:30:47"]);
  expect(dateTimePresets("time",now,"Asia/Tokyo","12h")).toContainEqual(["Вечер · 06:00 PM","18:00"]);
});

it("counts all-day countdowns by civil days and complete calendar months",async()=>{const {countdownAmount}=await import("./dates");expect(countdownAmount("2026-11-03T22:00:00Z","2026-11-05T21:00:00Z","Europe/Moscow","days",false)).toBe(2);expect(countdownAmount("2026-01-31T12:00:00Z","2026-02-28T12:00:00Z","UTC","months",false)).toBe(1);expect(countdownAmount("2026-11-03T12:00:00Z","2026-11-03T12:01:30Z","UTC","seconds",true)).toBe(90);});
