import { describe, expect, it } from "vitest";
import {
  applyRate,
  basisPointsToInput,
  centsToInput,
  formatCents,
  formatCentsCompact,
  parseMoneyToCents,
  parsePercentToBasisPoints,
  sumCents,
} from "@/lib/money";

describe("parseMoneyToCents", () => {
  it("parses plain and formatted dollar amounts exactly", () => {
    expect(parseMoneyToCents("0.10")).toBe(10);
    expect(parseMoneyToCents("0.20")).toBe(20);
    expect(parseMoneyToCents("1,234.56")).toBe(123456);
    expect(parseMoneyToCents("$950")).toBe(95000);
    expect(parseMoneyToCents("6.05")).toBe(605);
    expect(parseMoneyToCents(".5")).toBe(50);
  });

  it("treats blank input as not entered", () => {
    expect(parseMoneyToCents("")).toBeNull();
    expect(parseMoneyToCents("   ")).toBeNull();
    expect(parseMoneyToCents(null)).toBeNull();
    expect(parseMoneyToCents(undefined)).toBeNull();
  });

  it("keeps negative amounts for refunds", () => {
    expect(parseMoneyToCents("-12.50")).toBe(-1250);
    expect(parseMoneyToCents("-$4.99")).toBe(-499);
  });

  it("rounds to the nearest cent", () => {
    expect(parseMoneyToCents("1.005")).toBe(101);
    expect(parseMoneyToCents("1.004")).toBe(100);
    expect(parseMoneyToCents(19.999)).toBe(2000);
  });

  it("rejects invalid input", () => {
    expect(() => parseMoneyToCents("abc")).toThrow();
    expect(() => parseMoneyToCents("1.2.3")).toThrow();
  });

  it("never drifts the way binary floats do", () => {
    // 0.1 + 0.2 !== 0.3 in binary floating point; in cents it is exact.
    const total = sumCents([parseMoneyToCents("0.1"), parseMoneyToCents("0.2")]);
    expect(total).toBe(30);
    let running = 0;
    for (let i = 0; i < 1000; i += 1) running += parseMoneyToCents("0.07")!;
    expect(running).toBe(7000);
  });
});

describe("formatting", () => {
  it("formats cents as currency", () => {
    expect(formatCents(123456)).toBe("$1,234.56");
    expect(formatCents(-499)).toBe("-$4.99");
    expect(formatCents(null)).toBe("—");
    expect(formatCents(0)).toBe("$0.00");
    expect(formatCents(50, { signed: true })).toBe("+$0.50");
  });

  it("formats compact chart labels", () => {
    expect(formatCentsCompact(123456)).toBe("$1.2k");
    expect(formatCentsCompact(60500)).toBe("$605");
  });

  it("round-trips input text", () => {
    expect(centsToInput(605)).toBe("6.05");
    expect(centsToInput(null)).toBe("");
    expect(parseMoneyToCents(centsToInput(95000))).toBe(95000);
  });
});

describe("percentages", () => {
  it("stores percentages as basis points", () => {
    expect(parsePercentToBasisPoints("12.5")).toBe(1250);
    expect(parsePercentToBasisPoints("10%")).toBe(1000);
    expect(parsePercentToBasisPoints("")).toBeNull();
    expect(basisPointsToInput(1250)).toBe("12.5");
  });

  it("applies a rate to cents without float drift", () => {
    expect(applyRate(200000, 1000)).toBe(20000); // 10% of $2,000.00
    expect(applyRate(133333, 1250)).toBe(16667);
  });
});
