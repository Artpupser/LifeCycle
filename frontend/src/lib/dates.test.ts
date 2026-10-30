import { describe, expect, it } from "vitest";
import { dateLabel, dayDifference, instantLabel, localDate, minuteOfDay, shiftDate } from "./dates";

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
