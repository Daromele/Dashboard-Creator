import { describe, expect, it } from "vitest";
import {
  addMonths,
  formatMonthLabel,
  isInMonth,
  isMonthKey,
  monthKeyOf,
  monthRange,
  parseISODate,
  toISODate,
} from "@/lib/dates";

describe("month filtering", () => {
  it("includes the first and last day of the month", () => {
    expect(isInMonth(parseISODate("2026-08-01"), "2026-08")).toBe(true);
    expect(isInMonth(parseISODate("2026-08-31"), "2026-08")).toBe(true);
  });

  it("excludes the days either side of the month", () => {
    expect(isInMonth(parseISODate("2026-07-31"), "2026-08")).toBe(false);
    expect(isInMonth(parseISODate("2026-09-01"), "2026-08")).toBe(false);
  });

  it("handles the year boundary", () => {
    expect(isInMonth(parseISODate("2025-12-31"), "2026-01")).toBe(false);
    expect(isInMonth(parseISODate("2026-01-01"), "2026-01")).toBe(true);
    expect(isInMonth(parseISODate("2026-12-31"), "2026-12")).toBe(true);
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });

  it("handles February in a leap year", () => {
    expect(isInMonth(parseISODate("2028-02-29"), "2028-02")).toBe(true);
    expect(toISODate(monthRange("2028-02").end)).toBe("2028-03-01");
  });

  it("uses UTC so a timezone cannot shift a transaction into another month", () => {
    // Midnight on the first of the month must never fall back into July.
    const first = parseISODate("2026-08-01");
    expect(monthKeyOf(first)).toBe("2026-08");
    expect(first.getUTCHours()).toBe(0);
  });

  it("produces inclusive/exclusive month bounds", () => {
    const { start, end } = monthRange("2026-08");
    expect(toISODate(start)).toBe("2026-08-01");
    expect(toISODate(end)).toBe("2026-09-01");
  });

  it("validates and labels month keys", () => {
    expect(isMonthKey("2026-08")).toBe(true);
    expect(isMonthKey("2026-13")).toBe(false);
    expect(isMonthKey("2026-8")).toBe(false);
    expect(formatMonthLabel("2026-08")).toBe("August 2026");
  });
});
