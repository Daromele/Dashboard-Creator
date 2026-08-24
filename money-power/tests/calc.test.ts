import { describe, expect, it } from "vitest";
import { parseISODate } from "@/lib/dates";
import {
  buildBudgetRows,
  buildCutList,
  computeDashboard,
  computeWithholding,
  decideBudgetStatus,
  defaultSuggestedCut,
  deriveClassification,
  isOverAllocated,
  monthlySpend,
  paycheckSavingsForMonth,
  paycheckUnassigned,
  percentUsed,
  spendByGroup,
  suggestedSavings,
  type CalcBudget,
  type CalcCategory,
  type CalcPaycheckPlan,
  type CalcSettings,
  type CalcTransaction,
} from "@/lib/calc";

const categories: CalcCategory[] = [
  { id: "util", name: "Utilities", group: "Essential", needWant: "Need", wasteFlag: "Core" },
  { id: "ins", name: "Insurance", group: "Essential", needWant: "Need", wasteFlag: "Core" },
  { id: "sav", name: "Savings", group: "Goals", needWant: "Need", wasteFlag: "Protected" },
  { id: "dine", name: "Dining Out", group: "Flexible", needWant: "Want", wasteFlag: "Watch" },
  { id: "subs", name: "Subscriptions", group: "Flexible", needWant: "Want", wasteFlag: "Cut" },
];

function tx(id: string, date: string, categoryId: string, amount: number): CalcTransaction {
  return { id, date: parseISODate(date), categoryId, amount };
}

function plan(payday: string, netPay: number, parts: Partial<CalcPaycheckPlan> = {}): CalcPaycheckPlan {
  return {
    id: `plan-${payday}`,
    payday: parseISODate(payday),
    netPay,
    billsEssentials: 0,
    savings: 0,
    debtExtra: 0,
    flexibleSpending: 0,
    cashCushion: 0,
    ...parts,
  };
}

describe("category-derived classification", () => {
  it("derives group, need/want and waste signal from the category", () => {
    expect(deriveClassification(categories, "subs")).toEqual({
      group: "Flexible",
      needWant: "Want",
      wasteFlag: "Cut",
    });
  });

  it("returns null for an unknown category", () => {
    expect(deriveClassification(categories, "nope")).toBeNull();
  });

  it("reclassifying a category changes every transaction's signal at once", () => {
    const updated = categories.map((c) => (c.id === "dine" ? { ...c, wasteFlag: "Cut" as const } : c));
    expect(deriveClassification(updated, "dine")?.wasteFlag).toBe("Cut");
  });
});

describe("monthly spend", () => {
  const transactions = [
    tx("a", "2026-07-31", "dine", 5000),
    tx("b", "2026-08-01", "dine", 2500),
    tx("c", "2026-08-31", "subs", 4000),
    tx("d", "2026-09-01", "subs", 9900),
  ];

  it("only counts transactions inside the selected month", () => {
    expect(monthlySpend(transactions, "2026-08")).toBe(6500);
    expect(monthlySpend(transactions, "2026-07")).toBe(5000);
    expect(monthlySpend(transactions, "2026-09")).toBe(9900);
  });

  it("groups spend by category group", () => {
    expect(spendByGroup(transactions, categories, "2026-08")).toEqual({
      Essential: 0,
      Flexible: 6500,
      Goals: 0,
    });
  });

  it("subtracts refunds recorded as negative amounts", () => {
    const withRefund = [...transactions, tx("r", "2026-08-15", "dine", -1500)];
    expect(monthlySpend(withRefund, "2026-08")).toBe(5000);
    expect(spendByGroup(withRefund, categories, "2026-08").Flexible).toBe(5000);
  });

  it("can drive a category negative when a refund exceeds the month's spend", () => {
    const refundOnly = [tx("r", "2026-08-15", "dine", -1500)];
    expect(monthlySpend(refundOnly, "2026-08")).toBe(-1500);
    expect(decideBudgetStatus(-1500, 10000)).toBe("ON TRACK");
  });
});

describe("budget decisions", () => {
  it("flags CUT / RESET when actual exceeds plan", () => {
    expect(decideBudgetStatus(10001, 10000)).toBe("CUT / RESET");
  });

  it("flags WATCH above 80% but at or under plan", () => {
    expect(decideBudgetStatus(8001, 10000)).toBe("WATCH");
    expect(decideBudgetStatus(10000, 10000)).toBe("WATCH");
  });

  it("stays ON TRACK at exactly 80%", () => {
    expect(decideBudgetStatus(8000, 10000)).toBe("ON TRACK");
  });

  it("treats a blank plan as 0% used, not as an overspend", () => {
    expect(percentUsed(5000, null)).toBe(0);
    expect(decideBudgetStatus(5000, null)).toBe("ON TRACK");
  });

  it("treats a deliberate $0 plan as overspent once anything is spent", () => {
    expect(percentUsed(5000, 0)).toBe(0);
    expect(decideBudgetStatus(5000, 0)).toBe("CUT / RESET");
    expect(decideBudgetStatus(0, 0)).toBe("ON TRACK");
  });

  it("computes variance only when a plan exists", () => {
    const budgets: CalcBudget[] = [
      { categoryId: "util", month: "2026-08", plannedAmount: 30000 },
      { categoryId: "dine", month: "2026-08", plannedAmount: null },
    ];
    const rows = buildBudgetRows(categories, budgets, [tx("a", "2026-08-05", "util", 12000)], "2026-08");
    const utilities = rows.find((r) => r.categoryId === "util")!;
    const dining = rows.find((r) => r.categoryId === "dine")!;
    expect(utilities.variance).toBe(18000);
    expect(utilities.percentUsed).toBeCloseTo(0.4);
    expect(dining.variance).toBeNull();
  });

  it("ignores budgets from other months", () => {
    const budgets: CalcBudget[] = [{ categoryId: "util", month: "2026-07", plannedAmount: 30000 }];
    const rows = buildBudgetRows(categories, budgets, [], "2026-08");
    expect(rows.find((r) => r.categoryId === "util")!.plannedAmount).toBeNull();
  });
});

describe("cut list", () => {
  it("suggests half of actual for Cut categories, or the overspend if larger", () => {
    expect(defaultSuggestedCut("Cut", 10000, 8000)).toBe(5000); // half beats the $20 overspend
    expect(defaultSuggestedCut("Cut", 10000, 2000)).toBe(8000); // overspend beats half
    expect(defaultSuggestedCut("Cut", 10001, null)).toBe(5001); // rounds to whole cents
  });

  it("suggests only the overspend for non-Cut categories", () => {
    expect(defaultSuggestedCut("Watch", 10000, 8000)).toBe(2000);
    expect(defaultSuggestedCut("Core", 10000, 8000)).toBe(2000);
    expect(defaultSuggestedCut("Protected", 10000, 12000)).toBe(0);
  });

  it("never suggests a cut against an under-plan protected category", () => {
    const budgets: CalcBudget[] = [{ categoryId: "sav", month: "2026-08", plannedAmount: 50000 }];
    const rows = buildCutList(categories, budgets, [tx("s", "2026-08-02", "sav", 30000)], "2026-08");
    const savings = rows.find((r) => r.categoryId === "sav")!;
    expect(savings.suggestedCut).toBe(0);
    expect(savings.isProtected).toBe(true);
  });

  it("sorts Cut items first, then by suggested cut descending", () => {
    const budgets: CalcBudget[] = [
      { categoryId: "dine", month: "2026-08", plannedAmount: 10000 },
      { categoryId: "subs", month: "2026-08", plannedAmount: 5000 },
      { categoryId: "util", month: "2026-08", plannedAmount: 10000 },
    ];
    const transactions = [
      tx("a", "2026-08-02", "dine", 40000), // Watch, $300 overspend
      tx("b", "2026-08-03", "subs", 6000), // Cut, half = $30
      tx("c", "2026-08-04", "util", 30000), // Core, $200 overspend
    ];
    const rows = buildCutList(categories, budgets, transactions, "2026-08");
    expect(rows.map((r) => r.categoryId)).toEqual(["subs", "dine", "util"]);
    expect(rows[0].suggestedCut).toBe(3000);
  });

  it("computes the new cap and honours a user-edited suggested cut", () => {
    const budgets: CalcBudget[] = [
      { categoryId: "subs", month: "2026-08", plannedAmount: 5000, userSuggestedCut: 1000 },
    ];
    const rows = buildCutList(categories, budgets, [tx("b", "2026-08-03", "subs", 6000)], "2026-08");
    const subs = rows[0];
    expect(subs.defaultSuggestedCut).toBe(3000);
    expect(subs.suggestedCut).toBe(1000);
    expect(subs.newCap).toBe(4000);
  });

  it("clamps the new cap at zero", () => {
    const budgets: CalcBudget[] = [{ categoryId: "subs", month: "2026-08", plannedAmount: 1000 }];
    const rows = buildCutList(categories, budgets, [tx("b", "2026-08-03", "subs", 9000)], "2026-08");
    expect(rows[0].suggestedCut).toBe(8000);
    expect(rows[0].newCap).toBe(0);
  });
});

describe("paycheck plans", () => {
  it("computes unassigned money", () => {
    const p = plan("2026-09-04", 200000, {
      billsEssentials: 120000,
      savings: 20000,
      debtExtra: 10000,
      flexibleSpending: 30000,
      cashCushion: 10000,
    });
    expect(paycheckUnassigned(p)).toBe(10000);
    expect(isOverAllocated(p)).toBe(false);
  });

  it("goes negative and warns when a paycheck is over-allocated", () => {
    const p = plan("2026-09-04", 200000, { billsEssentials: 190000, savings: 20000 });
    expect(paycheckUnassigned(p)).toBe(-10000);
    expect(isOverAllocated(p)).toBe(true);
  });

  it("is exactly zero for a zero-based plan", () => {
    const p = plan("2026-09-04", 100000, { billsEssentials: 60000, savings: 25000, flexibleSpending: 15000 });
    expect(paycheckUnassigned(p)).toBe(0);
    expect(isOverAllocated(p)).toBe(false);
  });

  it("suggests savings as net pay times the savings rate", () => {
    expect(suggestedSavings(200000, 1000)).toBe(20000);
    expect(suggestedSavings(200000, null)).toBe(0);
  });

  it("only counts savings from paydays inside the selected month", () => {
    const plans = [
      plan("2026-07-31", 100000, { savings: 5000 }),
      plan("2026-08-14", 100000, { savings: 7000 }),
      plan("2026-08-28", 100000, { savings: 8000 }),
      plan("2026-09-11", 100000, { savings: 9000 }),
    ];
    expect(paycheckSavingsForMonth(plans, "2026-08")).toBe(15000);
  });
});

describe("withholding check", () => {
  const base = {
    estimatedAnnualTaxLiability: 800000, // $8,000
    incomeTaxWithheldYTD: 600000, // $6,000
    regularWithholdingPerCheck: 40000, // $400
    additionalWithholdingPerCheck: 0,
    remainingPaychecks: 8,
    desiredTaxBuffer: 0,
  };

  it("reproduces the specification formulas", () => {
    const result = computeWithholding(base);
    expect(result.projectedTotalWithholding).toBe(600000 + 40000 * 8);
    expect(result.targetRemainingWithholding).toBe(200000);
    expect(result.targetWithholdingPerRemainingCheck).toBe(25000);
    expect(result.changeToCurrentWithholdingPerCheck).toBe(-15000);
    expect(result.projectedOverUnderAfterBuffer).toBe(120000);
  });

  it("reports a negative change as recoverable spending power", () => {
    const result = computeWithholding(base);
    expect(result.direction).toBe("over-withholding");
    expect(result.message).toMatch(/increase in spending power/i);
  });

  it("reports a positive change as a potential shortfall", () => {
    const result = computeWithholding({ ...base, regularWithholdingPerCheck: 10000 });
    expect(result.changeToCurrentWithholdingPerCheck).toBe(15000);
    expect(result.direction).toBe("under-withholding");
    expect(result.message).toMatch(/shortfall/i);
  });

  it("reports alignment when the change is zero", () => {
    const result = computeWithholding({ ...base, regularWithholdingPerCheck: 25000 });
    expect(result.changeToCurrentWithholdingPerCheck).toBe(0);
    expect(result.direction).toBe("aligned");
    expect(result.message).toMatch(/aligned/i);
  });

  it("includes the desired safety buffer in the target", () => {
    const result = computeWithholding({ ...base, desiredTaxBuffer: 80000 });
    expect(result.targetRemainingWithholding).toBe(280000);
    expect(result.targetWithholdingPerRemainingCheck).toBe(35000);
    expect(result.projectedOverUnderAfterBuffer).toBe(40000);
  });

  it("never divides by zero when no paychecks remain", () => {
    const result = computeWithholding({ ...base, remainingPaychecks: 0 });
    expect(Number.isFinite(result.targetWithholdingPerRemainingCheck)).toBe(true);
    expect(result.targetWithholdingPerRemainingCheck).toBe(0);
    expect(result.message).toMatch(/no paychecks remain/i);
  });

  it("clamps the remaining target at zero when already over-withheld", () => {
    const result = computeWithholding({ ...base, incomeTaxWithheldYTD: 900000 });
    expect(result.targetRemainingWithholding).toBe(0);
    expect(result.targetWithholdingPerRemainingCheck).toBe(0);
    expect(result.changeToCurrentWithholdingPerCheck).toBe(-40000);
  });

  it("lists missing inputs instead of guessing", () => {
    const result = computeWithholding({
      estimatedAnnualTaxLiability: null,
      incomeTaxWithheldYTD: null,
      regularWithholdingPerCheck: null,
      additionalWithholdingPerCheck: null,
      remainingPaychecks: null,
      desiredTaxBuffer: null,
    });
    expect(result.complete).toBe(false);
    expect(result.missingFields).toHaveLength(4);
    expect(result.message).toMatch(/Estimated annual tax liability/);
  });
});

describe("dashboard", () => {
  const settings: CalcSettings = {
    selectedMonth: "2026-08",
    payFrequency: "Biweekly",
    takeHomePayPerCheck: 200000,
    nextPayday: parseISODate("2026-08-28"),
    savingsRateTarget: 1000,
    minimumCashCushion: 25000,
    estimatedAnnualTaxLiability: 800000,
    incomeTaxWithheldYTD: 600000,
    regularWithholdingPerCheck: 40000,
    additionalWithholdingPerCheck: 0,
    remainingPaychecks: 8,
    desiredTaxBuffer: 0,
  };

  const budgets: CalcBudget[] = [
    { categoryId: "util", month: "2026-08", plannedAmount: 30000 },
    { categoryId: "ins", month: "2026-08", plannedAmount: 95000 },
    { categoryId: "subs", month: "2026-08", plannedAmount: 5000 },
  ];

  const transactions = [
    tx("a", "2026-08-02", "util", 30000),
    tx("b", "2026-08-05", "subs", 9000),
    tx("c", "2026-08-09", "dine", 12000),
    tx("d", "2026-07-30", "dine", 99900), // previous month, must be ignored
  ];

  const plans = [
    plan("2026-08-14", 200000, { billsEssentials: 150000, savings: 20000, flexibleSpending: 30000 }),
    plan("2026-08-28", 200000, { billsEssentials: 180000, savings: 20000, cashCushion: 25000 }),
  ];

  it("computes the four headline KPIs", () => {
    const d = computeDashboard({ settings, categories, transactions, budgets, paycheckPlans: plans });
    expect(d.monthlySpend).toBe(51000);
    expect(d.totalPlan).toBe(130000);
    expect(d.planLeft).toBe(79000);
    expect(d.wasteToCut).toBe(9000);
    expect(d.nextCheckLeft).toBe(-25000);
  });

  it("warns when the next check is over-allocated", () => {
    const d = computeDashboard({ settings, categories, transactions, budgets, paycheckPlans: plans });
    expect(d.cashWarning).toBe("Over-allocated");
  });

  it("reports funds available when the next check still has room", () => {
    const relaxed = plans.map((p) =>
      p.id === "plan-2026-08-28" ? { ...p, billsEssentials: 100000 } : p,
    );
    const d = computeDashboard({ settings, categories, transactions, budgets, paycheckPlans: relaxed });
    expect(d.nextCheckLeft).toBe(55000);
    expect(d.cashWarning).toBe("Funds available");
  });

  it("leaves next check left unknown when no plan matches the next payday", () => {
    const d = computeDashboard({
      settings: { ...settings, nextPayday: parseISODate("2026-09-11") },
      categories,
      transactions,
      budgets,
      paycheckPlans: plans,
    });
    expect(d.nextCheckLeft).toBeNull();
    expect(d.cashWarning).toBe("Funds available");
  });

  it("computes at-a-glance metrics", () => {
    const d = computeDashboard({ settings, categories, transactions, budgets, paycheckPlans: plans });
    expect(d.flexibleSpend).toBe(21000);
    expect(d.budgetUsed).toBeCloseTo(51000 / 130000);
    expect(d.taxMovePerCheck).toBe(-15000);
    expect(d.savingsPlanned).toBe(40000);
    expect(d.savingsTarget).toBe(40000); // 10% of $4,000 planned net pay
    expect(d.biggestAction).toBe("Subscriptions");
    expect(d.fastestWin).toMatch(/Pause your CUT items/);
  });

  it("falls back to a prompt when there is nothing to cut", () => {
    const d = computeDashboard({
      settings,
      categories,
      transactions: [],
      budgets,
      paycheckPlans: plans,
    });
    expect(d.biggestAction).toBe("Add missing bill amounts");
    expect(d.fastestWin).toMatch(/No CUT items yet/);
  });

  it("recomputes everything when the selected month changes", () => {
    const july = computeDashboard({
      settings: { ...settings, selectedMonth: "2026-07" },
      categories,
      transactions,
      budgets,
      paycheckPlans: plans,
    });
    expect(july.monthlySpend).toBe(99900);
    expect(july.totalPlan).toBe(0);
    expect(july.budgetUsed).toBe(0);
    expect(july.savingsPlanned).toBe(0);
  });

  it("never divides by zero when nothing is planned", () => {
    const d = computeDashboard({ settings, categories, transactions, budgets: [], paycheckPlans: [] });
    expect(d.budgetUsed).toBe(0);
    expect(d.planLeft).toBe(-51000);
  });
});
