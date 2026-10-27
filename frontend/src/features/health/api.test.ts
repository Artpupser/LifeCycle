import { describe, expect, it } from "vitest";
import { parseReadiness } from "./api";

describe("readiness response validation", () => {
  it("preserves real partial dependency failures", () => {
    const response = { status: "unavailable", checks: { postgres: "ok", redis: "unavailable", garage: "ok" } };
    expect(parseReadiness(response)).toEqual(response);
  });

  it("rejects contradictory success to avoid showing false readiness", () => {
    expect(() => parseReadiness({ status: "ready", checks: { postgres: "ok", redis: "unavailable", garage: "ok" } })).toThrow();
  });

  it("rejects proxy error pages and incomplete payloads", () => {
    for (const payload of ["<html>502</html>", null, { status: "ready", checks: { postgres: "ok" } }]) {
      expect(() => parseReadiness(payload)).toThrow();
    }
  });
});
