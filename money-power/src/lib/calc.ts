/**
 * Money Power financial calculations.
 *
 * Everything here is pure and framework-free so it can be unit tested without a
 * database. All money arguments and results are integer cents.
 */

import { isInMonth, monthKeyOf, toISODate, type MonthKey } from "./dates";
import { applyRate, sumCents } from "./money";

export type CategoryGroup = "Essential" | "Flexible" | "Goals";
export type NeedWant = "Need" | "Want";
export type WasteFlag = "Core" | "Protected" | "Watch" | "Cut";
export type PayFrequency = "Weekly" | "Biweekly" | "Semimonthly" | "Monthly" | "Irregular";
export type BudgetDecision = "CUT / RESET" | "WATCH" | "ON TRACK";

export interface CalcCategory {
  id: string;
  name: string;
  group: CategoryGroup;
  needWant: NeedWant;
  wasteFlag: WasteFlag;
  active?: boolean;
}

export interface CalcTransaction {
  id: string;
  date: Date;
  categoryId: string;
  amount: number; // cents; negative amounts are refunds
}

export interface CalcBudget {
  categoryId: string;
  month: MonthKey;
  plannedAmount: number | null; // null = blank, which is NOT the same as 0
  userSuggestedCut?: number | null;
  confirmedNewCap?: number | null;
}

export interface CalcPaycheckPlan {
  id: string;
  payday: Date;
  netPay: number;
  billsEssentials: number;
  savings: number;
  debtExtra: number;
  flexibleSpending: number;
  cashCushion: number;
}

export interface CalcSettings {
  selectedMonth: MonthKey;
  payFrequency: PayFrequency | null;
  takeHomePayPerCheck: number | null;
  nextPayday: Date | null;
  savingsRateTarget: number | null; // basis points
  minimumCashCushion: number | null;
  estimatedAnnualTaxLiability: number | null;
  incomeTaxWithheldYTD: number | null;
  regularWithholdingPerCheck: number | null;
  additionalWithholdingPerCheck: number | null;
  remainingPaychecks: number | null;
  desiredTaxBuffer: number | null;
}

/* ------------------------------------------------------------------ *
 * Month filtering
 * ------------------------------------------------------------------ */

export function transactionsInMonth<T extends { date: Date }>(transactions: T[], month: MonthKey): T[] {
  return transactions.filter((t) => isInMonth(t.date, month));
}

export function paycheckPlansInMonth<T extends { payday: Date }>(plans: T[], month: MonthKey): T[] {
  return plans.filter((p) => isInMonth(p.payday, month));
}

/* ------------------------------------------------------------------ *
 * Category-derived classification
 * ------------------------------------------------------------------ */

export interface DerivedClassification {
  group: CategoryGroup;
  needWant: NeedWant;
  wasteFlag: WasteFlag;
}

/**
 * Group, Need/Want and waste signal are always read from the category — they
 * are never stored on the transaction.
 */
export function deriveClassification(
  categories: CalcCategory[],
  categoryId: string,
): DerivedClassification | null {
  const category = categories.find((c) => c.id === categoryId);
  if (!category) return null;
  return { group: category.group, needWant: category.needWant, wasteFlag: category.wasteFlag };
}

/* ------------------------------------------------------------------ *
 * Spend aggregates
 * ------------------------------------------------------------------ */

export function monthlySpend(transactions: CalcTransaction[], month: MonthKey): number {
  return sumCents(transactionsInMonth(transactions, month).map((t) => t.amount));
}

export function spendByCategory(
  transactions: CalcTransaction[],
  month: MonthKey,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const t of transactionsInMonth(transactions, month)) {
    totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount);
  }
  return totals;
}

export function spendByGroup(
  transactions: CalcTransaction[],
  categories: CalcCategory[],
  month: MonthKey,
): Record<CategoryGroup, number> {
  const totals: Record<CategoryGroup, number> = { Essential: 0, Flexible: 0, Goals: 0 };
  for (const t of transactionsInMonth(transactions, month)) {
    const category = categories.find((c) => c.id === t.categoryId);
    if (!category) continue;
    totals[category.group] += t.amount;
  }
  return totals;
}

/** Spend in categories carrying a given waste signal. */
export function spendByWasteFlag(
  transactions: CalcTransaction[],
  categories: CalcCategory[],
  month: MonthKey,
  flag: WasteFlag,
): number {
  const ids = new Set(categories.filter((c) => c.wasteFlag === flag).map((c) => c.id));
  return sumCents(transactionsInMonth(transactions, month).filter((t) => ids.has(t.categoryId)).map((t) => t.amount));
}

export function totalPlan(budgets: CalcBudget[], month: MonthKey): number {
  return sumCents(budgets.filter((b) => b.month === month).map((b) => b.plannedAmount));
}

/** actual / plan, or 0 when the plan is blank or zero. */
export function percentUsed(actual: number, plan: number | null): number {
  if (plan === null || plan === 0) return 0;
  return actual / plan;
}

/* ------------------------------------------------------------------ *
 * Monthly budget rows
 * ------------------------------------------------------------------ */

export interface BudgetRow {
  categoryId: string;
  categoryName: string;
  group: CategoryGroup;
  wasteFlag: WasteFlag;
  plannedAmount: number | null;
  actual: number;
  variance: number | null; // plan - actual; null when the plan is blank
  percentUsed: number;
  decision: BudgetDecision;
}

/**
 * Decision rule, verbatim from the specification:
 *   actual > plan            -> CUT / RESET
 *   percentUsed > 0.80       -> WATCH
 *   otherwise                -> ON TRACK
 * A blank plan cannot be overspent, so it reports ON TRACK until a plan exists.
 */
export function decideBudgetStatus(actual: number, plan: number | null): BudgetDecision {
  if (plan !== null && actual > plan) return "CUT / RESET";
  if (percentUsed(actual, plan) > 0.8) return "WATCH";
  return "ON TRACK";
}

export function buildBudgetRows(
  categories: CalcCategory[],
  budgets: CalcBudget[],
  transactions: CalcTransaction[],
  month: MonthKey,
): BudgetRow[] {
  const actuals = spendByCategory(transactions, month);
  return categories
    .filter((c) => c.active !== false)
    .map((category) => {
      const budget = budgets.find((b) => b.month === month && b.categoryId === category.id);
      const plannedAmount = budget?.plannedAmount ?? null;
      const actual = actuals.get(category.id) ?? 0;
      return {
        categoryId: category.id,
        categoryName: category.name,
        group: category.group,
        wasteFlag: category.wasteFlag,
        plannedAmount,
        actual,
        variance: plannedAmount === null ? null : plannedAmount - actual,
        percentUsed: percentUsed(actual, plannedAmount),
        decision: decideBudgetStatus(actual, plannedAmount),
      };
    });
}

/* ------------------------------------------------------------------ *
 * Cut List
 * ------------------------------------------------------------------ */

export interface CutListRow {
  categoryId: string;
  categoryName: string;
  signal: WasteFlag;
  plannedAmount: number | null;
  actual: number;
  overspend: number;
  suggestedCut: number; // the user's edit when present, otherwise the default
  defaultSuggestedCut: number;
  userSuggestedCut: number | null;
  confirmedNewCap: number | null;
  newCap: number; // max(0, plan - suggestedCut)
  isProtected: boolean;
}

export function overspendOf(actual: number, plan: number | null): number {
  if (plan === null) return 0;
  return Math.max(0, actual - plan);
}

/**
 * Default suggested cut, inherited from the spreadsheet:
 *   Cut signal  -> max(overspend, actual * 50%)
 *   otherwise   -> overspend
 * Core and Protected categories are never targeted aggressively; their
 * suggestion stays at the overspend amount.
 */
export function defaultSuggestedCut(signal: WasteFlag, actual: number, plan: number | null): number {
  const overspend = overspendOf(actual, plan);
  if (signal === "Cut") return Math.max(overspend, Math.round(actual / 2));
  return overspend;
}

export function buildCutList(
  categories: CalcCategory[],
  budgets: CalcBudget[],
  transactions: CalcTransaction[],
  month: MonthKey,
): CutListRow[] {
  const actuals = spendByCategory(transactions, month);
  const rows: CutListRow[] = categories
    .filter((c) => c.active !== false)
    .map((category) => {
      const budget = budgets.find((b) => b.month === month && b.categoryId === category.id);
      const plannedAmount = budget?.plannedAmount ?? null;
      const actual = actuals.get(category.id) ?? 0;
      const fallback = defaultSuggestedCut(category.wasteFlag, actual, plannedAmount);
      const userSuggestedCut = budget?.userSuggestedCut ?? null;
      const suggestedCut = userSuggestedCut ?? fallback;
      return {
        categoryId: category.id,
        categoryName: category.name,
        signal: category.wasteFlag,
        plannedAmount,
        actual,
        overspend: overspendOf(actual, plannedAmount),
        suggestedCut,
        defaultSuggestedCut: fallback,
        userSuggestedCut,
        confirmedNewCap: budget?.confirmedNewCap ?? null,
        newCap: plannedAmount === null ? 0 : Math.max(0, plannedAmount - suggestedCut),
        isProtected: category.wasteFlag === "Core" || category.wasteFlag === "Protected",
      };
    })
    .filter((row) => row.actual > 0 || row.suggestedCut > 0);

  // Cut items first, then by suggested cut descending, then by actual spend.
  return rows.sort((a, b) => {
    const aCut = a.signal === "Cut" ? 0 : 1;
    const bCut = b.signal === "Cut" ? 0 : 1;
    if (aCut !== bCut) return aCut - bCut;
    if (b.suggestedCut !== a.suggestedCut) return b.suggestedCut - a.suggestedCut;
    return b.actual - a.actual;
  });
}

/* ------------------------------------------------------------------ *
 * Paycheck plans
 * ------------------------------------------------------------------ */

export function paycheckAllocated(plan: CalcPaycheckPlan): number {
  return sumCents([
    plan.billsEssentials,
    plan.savings,
    plan.debtExtra,
    plan.flexibleSpending,
    plan.cashCushion,
  ]);
}

/** Unassigned = net pay − every allocation. Negative means over-allocated. */
export function paycheckUnassigned(plan: CalcPaycheckPlan): number {
  return plan.netPay - paycheckAllocated(plan);
}

export function isOverAllocated(plan: CalcPaycheckPlan): boolean {
  return paycheckUnassigned(plan) < 0;
}

/** The plan whose payday matches settings.nextPayday, if there is one. */
export function planForPayday<T extends { payday: Date }>(plans: T[], payday: Date | null): T | null {
  if (!payday) return null;
  const key = toISODate(payday);
  return plans.find((p) => toISODate(p.payday) === key) ?? null;
}

export function nextCheckLeft(plans: CalcPaycheckPlan[], nextPayday: Date | null): number | null {
  const plan = planForPayday(plans, nextPayday);
  return plan ? paycheckUnassigned(plan) : null;
}

export function paycheckSavingsForMonth(plans: CalcPaycheckPlan[], month: MonthKey): number {
  return sumCents(paycheckPlansInMonth(plans, month).map((p) => p.savings));
}

/** Number of paychecks a frequency produces in one month, for targets. */
export function checksPerMonth(frequency: PayFrequency | null): number {
  switch (frequency) {
    case "Weekly":
      return 52 / 12;
    case "Biweekly":
      return 26 / 12;
    case "Semimonthly":
      return 2;
    case "Monthly":
      return 1;
    default:
      return 1;
  }
}

/** Suggested savings for a paycheck: net pay × savings rate target. */
export function suggestedSavings(netPay: number, savingsRateTargetBp: number | null): number {
  if (!savingsRateTargetBp || netPay <= 0) return 0;
  return applyRate(netPay, savingsRateTargetBp);
}

/* ------------------------------------------------------------------ *
 * Withholding check
 * ------------------------------------------------------------------ */

export interface WithholdingInputs {
  estimatedAnnualTaxLiability: number | null;
  incomeTaxWithheldYTD: number | null;
  regularWithholdingPerCheck: number | null;
  additionalWithholdingPerCheck: number | null;
  remainingPaychecks: number | null;
  desiredTaxBuffer: number | null;
}

export type WithholdingDirection = "over-withholding" | "under-withholding" | "aligned";

export interface WithholdingResult {
  complete: boolean;
  missingFields: string[];
  currentWithholdingPerCheck: number;
  projectedTotalWithholding: number;
  targetRemainingWithholding: number;
  targetWithholdingPerRemainingCheck: number;
  changeToCurrentWithholdingPerCheck: number;
  projectedOverUnderAfterBuffer: number;
  direction: WithholdingDirection;
  message: string;
}

const WITHHOLDING_FIELD_LABELS: Record<string, string> = {
  estimatedAnnualTaxLiability: "Estimated annual tax liability",
  incomeTaxWithheldYTD: "Income tax withheld year-to-date",
  regularWithholdingPerCheck: "Regular withholding per check",
  remainingPaychecks: "Remaining paychecks this year",
};

/**
 * Withholding estimate. Purely informational: this is a cash-flow planning
 * estimate, never tax advice, and the app never automates a payroll change.
 */
export function computeWithholding(inputs: WithholdingInputs): WithholdingResult {
  const missingFields: string[] = [];
  for (const key of Object.keys(WITHHOLDING_FIELD_LABELS)) {
    const value = inputs[key as keyof WithholdingInputs];
    if (value === null || value === undefined) missingFields.push(WITHHOLDING_FIELD_LABELS[key]);
  }

  const liability = inputs.estimatedAnnualTaxLiability ?? 0;
  const withheldYTD = inputs.incomeTaxWithheldYTD ?? 0;
  const regular = inputs.regularWithholdingPerCheck ?? 0;
  const additional = inputs.additionalWithholdingPerCheck ?? 0;
  const buffer = inputs.desiredTaxBuffer ?? 0;
  const remaining = Math.max(0, Math.trunc(inputs.remainingPaychecks ?? 0));

  const currentWithholdingPerCheck = regular + additional;
  const projectedTotalWithholding = withheldYTD + currentWithholdingPerCheck * remaining;
  const targetRemainingWithholding = Math.max(0, liability + buffer - withheldYTD);
  // Guard against division by zero when the year has no paychecks left.
  const targetWithholdingPerRemainingCheck =
    remaining > 0 ? Math.round(targetRemainingWithholding / remaining) : 0;
  const changeToCurrentWithholdingPerCheck =
    targetWithholdingPerRemainingCheck - currentWithholdingPerCheck;
  const projectedOverUnderAfterBuffer = projectedTotalWithholding - (liability + buffer);

  const complete = missingFields.length === 0;
  let direction: WithholdingDirection = "aligned";
  if (changeToCurrentWithholdingPerCheck < 0) direction = "over-withholding";
  else if (changeToCurrentWithholdingPerCheck > 0) direction = "under-withholding";

  let message: string;
  if (!complete) {
    message = `Add ${missingFields.join(", ")} to run this estimate.`;
  } else if (remaining === 0) {
    message =
      "No paychecks remain in the calendar year, so per-check withholding cannot be changed for this year.";
  } else if (direction === "over-withholding") {
    message = "Potential increase in spending power: you may be withholding more than this estimate per paycheck.";
  } else if (direction === "under-withholding") {
    message = "Potential tax shortfall: consider increasing withholding per paycheck.";
  } else {
    message = "Your current withholding is aligned with this estimate.";
  }

  return {
    complete,
    missingFields,
    currentWithholdingPerCheck,
    projectedTotalWithholding,
    targetRemainingWithholding,
    targetWithholdingPerRemainingCheck,
    changeToCurrentWithholdingPerCheck,
    projectedOverUnderAfterBuffer,
    direction,
    message,
  };
}

/* ------------------------------------------------------------------ *
 * Dashboard
 * ------------------------------------------------------------------ */

export interface DashboardMetrics {
  month: MonthKey;
  monthlySpend: number;
  totalPlan: number;
  planLeft: number;
  wasteToCut: number;
  nextCheckLeft: number | null;
  flexibleSpend: number;
  budgetUsed: number;
  taxMovePerCheck: number | null;
  savingsPlanned: number;
  savingsTarget: number | null;
  biggestAction: string;
  biggestActionAmount: number | null;
  nextPayday: Date | null;
  paycheckCushion: number | null;
  cashWarning: "Over-allocated" | "Funds available";
  fastestWin: string;
  spendByGroup: Record<CategoryGroup, number>;
}

export interface DashboardInput {
  settings: CalcSettings;
  categories: CalcCategory[];
  transactions: CalcTransaction[];
  budgets: CalcBudget[];
  paycheckPlans: CalcPaycheckPlan[];
}

export function computeDashboard({
  settings,
  categories,
  transactions,
  budgets,
  paycheckPlans,
}: DashboardInput): DashboardMetrics {
  const month = settings.selectedMonth;
  const spend = monthlySpend(transactions, month);
  const plan = totalPlan(budgets, month);
  const groups = spendByGroup(transactions, categories, month);
  const waste = spendByWasteFlag(transactions, categories, month, "Cut");
  const nextPlan = planForPayday(paycheckPlans, settings.nextPayday);
  const left = nextPlan ? paycheckUnassigned(nextPlan) : null;

  const withholding = computeWithholding(settings);
  const cutList = buildCutList(categories, budgets, transactions, month);
  const topCut = cutList.find((row) => row.suggestedCut > 0) ?? null;

  const monthPlans = paycheckPlansInMonth(paycheckPlans, month);
  const savingsPlanned = sumCents(monthPlans.map((p) => p.savings));

  // Savings target: the rate applied to the net pay actually planned this
  // month; when nothing is planned yet, fall back to take-home pay per check
  // across the number of checks the pay frequency produces.
  let savingsTarget: number | null = null;
  if (settings.savingsRateTarget !== null) {
    const plannedNetPay = sumCents(monthPlans.map((p) => p.netPay));
    if (plannedNetPay > 0) {
      savingsTarget = applyRate(plannedNetPay, settings.savingsRateTarget);
    } else if (settings.takeHomePayPerCheck) {
      const monthlyNet = Math.round(settings.takeHomePayPerCheck * checksPerMonth(settings.payFrequency));
      savingsTarget = applyRate(monthlyNet, settings.savingsRateTarget);
    }
  }

  return {
    month,
    monthlySpend: spend,
    totalPlan: plan,
    planLeft: plan - spend,
    wasteToCut: waste,
    nextCheckLeft: left,
    flexibleSpend: groups.Flexible,
    budgetUsed: plan > 0 ? spend / plan : 0,
    taxMovePerCheck: withholding.complete ? withholding.changeToCurrentWithholdingPerCheck : null,
    savingsPlanned,
    savingsTarget,
    biggestAction: topCut ? topCut.categoryName : "Add missing bill amounts",
    biggestActionAmount: topCut ? topCut.suggestedCut : null,
    nextPayday: settings.nextPayday,
    paycheckCushion: nextPlan ? nextPlan.cashCushion : settings.minimumCashCushion,
    cashWarning: left !== null && left < 0 ? "Over-allocated" : "Funds available",
    fastestWin:
      waste > 0
        ? "Pause your CUT items this week to recover that spending."
        : "No CUT items yet—keep logging transactions.",
    spendByGroup: groups,
  };
}

/** Priority categories for the plan-vs-actual chart, largest plan first. */
export function priorityBudgetRows(rows: BudgetRow[], limit = 8): BudgetRow[] {
  return [...rows]
    .filter((row) => (row.plannedAmount ?? 0) > 0 || row.actual > 0)
    .sort((a, b) => Math.max(b.plannedAmount ?? 0, b.actual) - Math.max(a.plannedAmount ?? 0, a.actual))
    .slice(0, limit);
}

/** Confirmed monthly bill total used by paycheck-planning suggestions. */
export function confirmedMonthlyBillTotal(
  bills: Array<{ expectedAmount: number | null; confirmationStatus: string; active?: boolean; frequency?: string }>,
): number {
  return sumCents(
    bills
      .filter((b) => b.active !== false && b.confirmationStatus === "Confirmed" && b.expectedAmount !== null)
      .map((b) => monthlyEquivalent(b.expectedAmount ?? 0, b.frequency ?? "Monthly")),
  );
}

/** Normalise a bill amount to its monthly equivalent. */
export function monthlyEquivalent(amount: number, frequency: string): number {
  switch (frequency) {
    case "Weekly":
      return Math.round((amount * 52) / 12);
    case "Biweekly":
      return Math.round((amount * 26) / 12);
    case "Semimonthly":
      return amount * 2;
    case "Quarterly":
      return Math.round(amount / 3);
    case "Annual":
      return Math.round(amount / 12);
    default:
      return amount;
  }
}

/** Bills falling due strictly before the next paycheck after `payday`. */
export function billsDueBefore<T extends { nextDueDate: Date | null; active?: boolean }>(
  bills: T[],
  from: Date,
  until: Date,
): T[] {
  return bills.filter((b) => {
    if (b.active === false || !b.nextDueDate) return false;
    return b.nextDueDate >= from && b.nextDueDate < until;
  });
}

export { monthKeyOf };
