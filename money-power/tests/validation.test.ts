import { describe, expect, it } from "vitest";
import {
  budgetSchema,
  paycheckPlanSchema,
  settingsSchema,
  transactionSchema,
} from "@/lib/validation";

describe("transaction validation", () => {
  it("converts a dollar string into integer cents", () => {
    const parsed = transactionSchema.parse({
      date: "2026-08-04",
      merchant: "Kroger",
      categoryId: "abc",
      amount: "$1,084.19",
    });
    expect(parsed.amount).toBe(108419);
  });

  it("requires a date and an amount", () => {
    expect(() =>
      transactionSchema.parse({ merchant: "Kroger", categoryId: "abc", amount: "10" }),
    ).toThrow();
    expect(() =>
      transactionSchema.parse({ date: "2026-08-04", merchant: "Kroger", categoryId: "abc", amount: "" }),
    ).toThrow(/amount is required/i);
  });

  it("rejects a malformed date", () => {
    expect(() =>
      transactionSchema.parse({ date: "08/04/2026", merchant: "K", categoryId: "abc", amount: "10" }),
    ).toThrow();
  });

  it("requires a category", () => {
    expect(() =>
      transactionSchema.parse({ date: "2026-08-04", merchant: "K", categoryId: "", amount: "10" }),
    ).toThrow(/category is required/i);
  });

  it("allows a negative amount so refunds can be modelled explicitly", () => {
    const parsed = transactionSchema.parse({
      date: "2026-08-04",
      merchant: "Target",
      categoryId: "abc",
      amount: "-25.00",
    });
    expect(parsed.amount).toBe(-2500);
  });
});

describe("budget validation", () => {
  it("keeps a blank plan distinct from a zero plan", () => {
    expect(budgetSchema.parse({ month: "2026-08", categoryId: "a", plannedAmount: "" }).plannedAmount).toBeNull();
    expect(budgetSchema.parse({ month: "2026-08", categoryId: "a", plannedAmount: "0" }).plannedAmount).toBe(0);
  });

  it("rejects a malformed month", () => {
    expect(() => budgetSchema.parse({ month: "2026-8", categoryId: "a" })).toThrow();
  });
});

describe("settings validation", () => {
  it("stores percentages as basis points", () => {
    expect(settingsSchema.parse({ savingsRateTarget: "12.5" }).savingsRateTarget).toBe(1250);
  });

  it("bounds the savings rate", () => {
    expect(() => settingsSchema.parse({ savingsRateTarget: "150" })).toThrow(/between 0 and 100/i);
  });

  it("requires remaining paychecks to be a whole number of 0 or more", () => {
    expect(settingsSchema.parse({ remainingPaychecks: "8" }).remainingPaychecks).toBe(8);
    expect(settingsSchema.parse({ remainingPaychecks: "0" }).remainingPaychecks).toBe(0);
    expect(settingsSchema.parse({ remainingPaychecks: "" }).remainingPaychecks).toBeNull();
    expect(() => settingsSchema.parse({ remainingPaychecks: "-1" })).toThrow();
    expect(() => settingsSchema.parse({ remainingPaychecks: "2.5" })).toThrow();
  });
});

describe("paycheck validation", () => {
  it("rejects negative allocations", () => {
    expect(() => paycheckPlanSchema.parse({ payday: "2026-08-28", netPay: "-1" })).toThrow(
      /cannot be negative/i,
    );
  });

  it("accepts a full allocation set", () => {
    const parsed = paycheckPlanSchema.parse({
      payday: "2026-08-28",
      netPay: "2000",
      billsEssentials: "1500",
      savings: "200",
      cashCushion: "300",
    });
    expect(parsed.netPay).toBe(200000);
    expect(parsed.cashCushion).toBe(30000);
  });
});
