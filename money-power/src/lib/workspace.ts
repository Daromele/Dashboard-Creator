/**
 * Every read of a user's financial data goes through here, and every query is
 * filtered by userId. That single choke point is what makes per-user isolation
 * verifiable (see tests/isolation.test.ts).
 */

import { prisma } from "./db";
import { monthRange, type MonthKey } from "./dates";
import type {
  CalcBudget,
  CalcCategory,
  CalcPaycheckPlan,
  CalcSettings,
  CalcTransaction,
} from "./calc";

export interface WorkspaceBill {
  id: string;
  merchant: string;
  categoryId: string;
  categoryName: string;
  expectedAmount: number | null;
  dueDay: number | null;
  nextDueDate: Date | null;
  frequency: string;
  paymentMethodId: string | null;
  autopay: boolean;
  notes: string | null;
  confirmationStatus: string;
  source: string;
  active: boolean;
}

export interface WorkspaceTransaction extends CalcTransaction {
  merchant: string;
  paymentMethodId: string | null;
  paymentMethodName: string | null;
  note: string | null;
  recurringBillId: string | null;
  importSource: string | null;
}

export interface Workspace {
  userId: string;
  clientName: string;
  email: string;
  settings: CalcSettings & { selectedMonth: MonthKey };
  categories: CalcCategory[];
  paymentMethods: Array<{ id: string; name: string; active: boolean }>;
  transactions: WorkspaceTransaction[];
  monthTransactions: WorkspaceTransaction[];
  budgets: CalcBudget[];
  paycheckPlans: CalcPaycheckPlan[];
  bills: WorkspaceBill[];
}

export async function ensureSettings(userId: string) {
  return prisma.financialSettings.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

/**
 * Load everything the screens need for one user and one month.
 * `month` overrides the stored selected month without persisting it.
 */
export async function loadWorkspace(userId: string, month?: MonthKey): Promise<Workspace> {
  const user = await prisma.userProfile.findUniqueOrThrow({ where: { id: userId } });
  const settingsRow = await ensureSettings(userId);
  const selectedMonth = (month ?? settingsRow.selectedMonth) as MonthKey;

  const [categories, paymentMethods, transactionRows, budgetRows, planRows, billRows] =
    await Promise.all([
      prisma.category.findMany({
        where: { userId },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.paymentMethod.findMany({
        where: { userId },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.transaction.findMany({
        where: { userId },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        include: { paymentMethod: true },
      }),
      prisma.monthlyBudget.findMany({ where: { userId } }),
      prisma.paycheckPlan.findMany({ where: { userId }, orderBy: { payday: "asc" } }),
      prisma.recurringBill.findMany({
        where: { userId },
        orderBy: [{ merchant: "asc" }],
        include: { category: true },
      }),
    ]);

  const transactions: WorkspaceTransaction[] = transactionRows.map((t) => ({
    id: t.id,
    date: t.date,
    merchant: t.merchant,
    categoryId: t.categoryId,
    amount: t.amount,
    paymentMethodId: t.paymentMethodId,
    paymentMethodName: t.paymentMethod?.name ?? null,
    note: t.note,
    recurringBillId: t.recurringBillId,
    importSource: t.importSource,
  }));

  const { start, end } = monthRange(selectedMonth);

  return {
    userId,
    clientName: user.clientName,
    email: user.email,
    settings: {
      selectedMonth,
      payFrequency: settingsRow.payFrequency,
      takeHomePayPerCheck: settingsRow.takeHomePayPerCheck,
      nextPayday: settingsRow.nextPayday,
      savingsRateTarget: settingsRow.savingsRateTarget,
      minimumCashCushion: settingsRow.minimumCashCushion,
      estimatedAnnualTaxLiability: settingsRow.estimatedAnnualTaxLiability,
      incomeTaxWithheldYTD: settingsRow.incomeTaxWithheldYTD,
      regularWithholdingPerCheck: settingsRow.regularWithholdingPerCheck,
      additionalWithholdingPerCheck: settingsRow.additionalWithholdingPerCheck,
      remainingPaychecks: settingsRow.remainingPaychecks,
      desiredTaxBuffer: settingsRow.desiredTaxBuffer,
    },
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      group: c.group,
      needWant: c.needWant,
      wasteFlag: c.wasteFlag,
      active: c.active,
    })),
    paymentMethods: paymentMethods.map((m) => ({ id: m.id, name: m.name, active: m.active })),
    transactions,
    monthTransactions: transactions.filter((t) => t.date >= start && t.date < end),
    budgets: budgetRows.map((b) => ({
      categoryId: b.categoryId,
      month: b.month,
      plannedAmount: b.plannedAmount,
      userSuggestedCut: b.userSuggestedCut,
      confirmedNewCap: b.confirmedNewCap,
    })),
    paycheckPlans: planRows.map((p) => ({
      id: p.id,
      payday: p.payday,
      netPay: p.netPay,
      billsEssentials: p.billsEssentials,
      savings: p.savings,
      debtExtra: p.debtExtra,
      flexibleSpending: p.flexibleSpending,
      cashCushion: p.cashCushion,
    })),
    bills: billRows.map((b) => ({
      id: b.id,
      merchant: b.merchant,
      categoryId: b.categoryId,
      categoryName: b.category.name,
      expectedAmount: b.expectedAmount,
      dueDay: b.dueDay,
      nextDueDate: b.nextDueDate,
      frequency: b.frequency,
      paymentMethodId: b.paymentMethodId,
      autopay: b.autopay,
      notes: b.notes,
      confirmationStatus: b.confirmationStatus,
      source: b.source,
      active: b.active,
    })),
  };
}

/** Assert a record belongs to the user before mutating it. */
export async function assertOwnership(
  model: "category" | "transaction" | "recurringBill" | "paycheckPlan" | "monthlyBudget" | "paymentMethod",
  id: string,
  userId: string,
): Promise<boolean> {
  switch (model) {
    case "category":
      return (await prisma.category.count({ where: { id, userId } })) > 0;
    case "transaction":
      return (await prisma.transaction.count({ where: { id, userId } })) > 0;
    case "recurringBill":
      return (await prisma.recurringBill.count({ where: { id, userId } })) > 0;
    case "paycheckPlan":
      return (await prisma.paycheckPlan.count({ where: { id, userId } })) > 0;
    case "monthlyBudget":
      return (await prisma.monthlyBudget.count({ where: { id, userId } })) > 0;
    case "paymentMethod":
      return (await prisma.paymentMethod.count({ where: { id, userId } })) > 0;
  }
}
