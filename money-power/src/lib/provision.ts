/**
 * Default data for a brand-new Money Power user, plus the Diteria seed.
 *
 * Amounts are integer cents.
 */

import type { PrismaClient } from "@prisma/client";

export const DEFAULT_CATEGORIES = [
  { name: "Housing", group: "Essential", needWant: "Need", wasteFlag: "Core" },
  { name: "Utilities", group: "Essential", needWant: "Need", wasteFlag: "Core" },
  { name: "Groceries", group: "Essential", needWant: "Need", wasteFlag: "Core" },
  { name: "Transport", group: "Essential", needWant: "Need", wasteFlag: "Core" },
  { name: "Insurance", group: "Essential", needWant: "Need", wasteFlag: "Core" },
  { name: "Debt Payments", group: "Essential", needWant: "Need", wasteFlag: "Core" },
  { name: "Health", group: "Essential", needWant: "Need", wasteFlag: "Core" },
  { name: "Savings", group: "Goals", needWant: "Need", wasteFlag: "Protected" },
  { name: "Dining Out", group: "Flexible", needWant: "Want", wasteFlag: "Watch" },
  { name: "Shopping", group: "Flexible", needWant: "Want", wasteFlag: "Watch" },
  { name: "Subscriptions", group: "Flexible", needWant: "Want", wasteFlag: "Cut" },
  { name: "Entertainment", group: "Flexible", needWant: "Want", wasteFlag: "Watch" },
  { name: "Personal Care", group: "Flexible", needWant: "Want", wasteFlag: "Watch" },
  { name: "Travel", group: "Flexible", needWant: "Want", wasteFlag: "Watch" },
  { name: "Kids Allowance", group: "Essential", needWant: "Need", wasteFlag: "Core" },
  { name: "Other", group: "Flexible", needWant: "Want", wasteFlag: "Watch" },
] as const;

export const DEFAULT_PAYMENT_METHODS = [
  "Debit Card",
  "Credit Card",
  "Cash",
  "Bank Transfer",
  "Mobile Pay",
  "Other",
] as const;

/**
 * Preliminary bills transcribed from Diteria's handwritten list. Everything
 * uncertain stays NeedsConfirmation and none of it is a transaction: an
 * unconfirmed, undated bill never counts as actual spending.
 */
export const DITERIA_BILLS: Array<{
  merchant: string;
  category: string;
  expectedAmount: number | null;
  notes: string;
}> = [
  { merchant: "T-Mobile", category: "Utilities", expectedAmount: 30000, notes: "Confirm due date" },
  { merchant: "Insurance", category: "Insurance", expectedAmount: 95000, notes: "Confirm provider and due date" },
  { merchant: "Vivint", category: "Utilities", expectedAmount: null, notes: "Confirm amount and due date" },
  { merchant: "Toyota / Vivint", category: "Debt Payments", expectedAmount: null, notes: "Handwriting unclear; confirm name, amount, due date" },
  { merchant: "Toyota / Coast card", category: "Debt Payments", expectedAmount: null, notes: "Handwriting unclear; confirm name, amount, due date" },
  { merchant: "Dillard's", category: "Debt Payments", expectedAmount: null, notes: "Confirm amount and due date" },
  { merchant: "Allowance for Kids", category: "Kids Allowance", expectedAmount: 17500, notes: "Confirm timing" },
  { merchant: "Old Navy", category: "Debt Payments", expectedAmount: null, notes: "Confirm amount and due date" },
  { merchant: "Comenity 1", category: "Debt Payments", expectedAmount: null, notes: "Identify account, amount, due date" },
  { merchant: "Comenity 2", category: "Debt Payments", expectedAmount: null, notes: "Identify account, amount, due date" },
  { merchant: "Kay account", category: "Debt Payments", expectedAmount: null, notes: "Confirm account name, amount, due date" },
  { merchant: "Best Buy", category: "Debt Payments", expectedAmount: null, notes: "Confirm amount and due date" },
  { merchant: "Student Loan", category: "Debt Payments", expectedAmount: null, notes: "Confirm amount and due date" },
  { merchant: "Kaufman Water Bill", category: "Utilities", expectedAmount: null, notes: "Confirm amount and due date" },
  { merchant: "Ismay", category: "Other", expectedAmount: null, notes: "Handwriting unclear; confirm name, amount, due date" },
  { merchant: "ATC — Homeowners Association", category: "Housing", expectedAmount: null, notes: "Confirm association name, amount, due date" },
  { merchant: "Comenity 3", category: "Debt Payments", expectedAmount: null, notes: "Identify account, amount, due date" },
  { merchant: "American Home Shield", category: "Insurance", expectedAmount: null, notes: "Confirm amount and due date" },
  { merchant: "AUR Service Fee", category: "Other", expectedAmount: 605, notes: "Confirm company name and due date" },
];

/**
 * Opening plans for Diteria, from the amounts that are actually known.
 *
 * The source spreadsheet folded the $6.05 AUR service fee into a $306.05
 * Utilities plan even though the fee is categorised as Other. That is resolved
 * here by planning Utilities at the $300.00 T-Mobile amount and putting the
 * $6.05 in Other, which keeps the $1,431.05 known monthly total intact.
 * Every other category is left blank — blank means "not entered yet" and is
 * deliberately different from a $0 budget.
 */
export const DITERIA_INITIAL_PLANS: Array<{ category: string; plannedAmount: number }> = [
  { category: "Utilities", plannedAmount: 30000 },
  { category: "Insurance", plannedAmount: 95000 },
  { category: "Kids Allowance", plannedAmount: 17500 },
  { category: "Other", plannedAmount: 605 },
];

/** Create the starter categories and payment methods for a user. */
export async function provisionDefaults(prisma: PrismaClient, userId: string): Promise<void> {
  const existing = await prisma.category.count({ where: { userId } });
  if (existing === 0) {
    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((category, index) => ({
        userId,
        name: category.name,
        group: category.group,
        needWant: category.needWant,
        wasteFlag: category.wasteFlag,
        sortOrder: index,
      })),
    });
  }

  const methods = await prisma.paymentMethod.count({ where: { userId } });
  if (methods === 0) {
    await prisma.paymentMethod.createMany({
      data: DEFAULT_PAYMENT_METHODS.map((name, index) => ({ userId, name, sortOrder: index })),
    });
  }

  await prisma.financialSettings.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}
