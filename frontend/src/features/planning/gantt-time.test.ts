import { describe, expect, it } from "vitest";
import { changedInterval, dayStart } from "./gantt-time";
describe("Gantt real-time scale", () => {
  it("measures 23/25-hour days and skips a missing calendar date", () => {
    expect(dayStart("2026-03-30", "Europe/Berlin") - dayStart("2026-03-29", "Europe/Berlin")).toBe(23 * 3_600_000);
    expect(dayStart("2026-10-26", "Europe/Berlin") - dayStart("2026-10-25", "Europe/Berlin")).toBe(25 * 3_600_000);
    expect(dayStart("2011-12-30", "Pacific/Apia")).toBe(dayStart("2011-12-31", "Pacific/Apia"));
  });
  it("preserves the opposite edge while resizing across midnight and bounds durations", () => {
    const start = Date.parse("2026-10-31T23:30:00Z");
    const resized = changedInterval(start, 120, 45, "start");
    expect(new Date(resized.start).toISOString()).toBe("2026-11-01T00:15:00.000Z");
    expect(resized.start + resized.duration * 60_000).toBe(start + 120 * 60_000);
    expect(changedInterval(start, 120, 2000, "end").duration).toBe(1440);
    expect(changedInterval(start, 120, 2000, "start").duration).toBe(1);
  });
});
