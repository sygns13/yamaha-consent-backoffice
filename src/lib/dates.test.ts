import { describe, expect, it } from "vitest";
import { addDays, formatDateTime, isIsoDate, limaToday } from "./dates";

describe("formatDateTime (sección 8.7: dd/mm/aaaa HH:mm en hora de Lima)", () => {
  it.each([
    ["2026-11-15T10:35:00-05:00", "15/11/2026 10:35"],
    ["2026-11-15T15:35:00Z", "15/11/2026 10:35"],
    ["2026-01-01T03:05:00Z", "31/12/2025 22:05"],
    ["2026-11-15T00:00:00-05:00", "15/11/2026 00:00"],
  ])("%s → %s", (iso, expected) => {
    expect(formatDateTime(iso)).toBe(expected);
  });

  it.each([null, undefined, "", "no es fecha"])("%j → —", (value) => {
    expect(formatDateTime(value)).toBe("—");
  });
});

describe("fechas de los filtros de la bitácora (hora de Lima)", () => {
  it.each([
    ["2026-11-17T12:00:00-05:00", "2026-11-17"],
    ["2026-11-18T03:00:00Z", "2026-11-17"],
    ["2026-11-18T05:00:00Z", "2026-11-18"],
  ])("limaToday(%s) → %s", (now, expected) => {
    expect(limaToday(new Date(now))).toBe(expected);
  });

  it("addDays cruza meses y años", () => {
    expect(addDays("2026-11-17", -6)).toBe("2026-11-11");
    expect(addDays("2026-03-02", -6)).toBe("2026-02-24");
    expect(addDays("2026-01-03", -6)).toBe("2025-12-28");
  });

  it.each([
    ["2026-11-17", true],
    ["2026-02-30", false],
    ["2026-13-01", false],
    ["17/11/2026", false],
    ["", false],
  ])("isIsoDate(%j) → %s", (value, expected) => {
    expect(isIsoDate(value)).toBe(expected);
  });
});
