import { describe, expect, it } from "vitest";
import { formatDateTime } from "./dates";

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
