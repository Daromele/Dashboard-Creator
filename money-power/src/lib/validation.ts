/**
 * Zod schemas shared by API routes and forms.
 *
 * Money arrives from the client as a string (or number) and is converted to
 * integer cents here, so no route ever sees a float dollar amount.
 */

import { z } from "zod";
import { parseMoneyToCents, parsePercentToBasisPoints } from "./money";
import { isMonthKey } from "./dates";

const moneyInput = z.union([z.string(), z.number(), z.null()]);

/** Optional money field -> cents or null. */
export const optionalCents = moneyInput.optional().transform((value, ctx) => {
  try {
    return parseMoneyToCents(value ?? null);
  } catch {
    ctx.addIssue({ code: "custom", message: "Enter a valid amount" });
    return z.NEVER;
  }
});

/** Required money field -> cents. */
export const requiredCents = moneyInput.transform((value, ctx) => {
  let cents: number | null;
  try {
    cents = parseMoneyToCents(value ?? null);
  } catch {
    ctx.addIssue({ code: "custom", message: "Enter a valid amount" });
    return z.NEVER;
  }
  if (cents === null) {
    ctx.addIssue({ code: "custom", message: "An amount is required" });
    return z.NEVER;
  }
  return cents;
});

/** Non-negative money field -> cents. */
export const nonNegativeCents = requiredCents.refine((cents) => cents >= 0, {
  message: "Amount cannot be negative",
});

export const optionalPercent = moneyInput.optional().transform((value, ctx) => {
  try {
    const bp = parsePercentToBasisPoints(value ?? null);
    if (bp !== null && (bp < 0 || bp > 10_000)) {
      ctx.addIssue({ code: "custom", message: "Enter a percentage between 0 and 100" });
      return z.NEVER;
    }
    return bp;
  } catch {
    ctx.addIssue({ code: "custom", message: "Enter a valid percentage" });
    return z.NEVER;
  }
});

export const monthKey = z.string().refine(isMonthKey, "Use a YYYY-MM month");
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date");
export const optionalIsoDate = z
  .union([isoDate, z.literal(""), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

export const categoryGroup = z.enum(["Essential", "Flexible", "Goals"]);
export const needWant = z.enum(["Need", "Want"]);
export const wasteFlag = z.enum(["Core", "Protected", "Watch", "Cut"]);
export const priority = z.enum(["CutNow", "Reduce", "Review", "Keep"]);
export const payFrequency = z.enum(["Weekly", "Biweekly", "Semimonthly", "Monthly", "Irregular"]);
export const billFrequency = z.enum([
  "Weekly",
  "Biweekly",
  "Semimonthly",
  "Monthly",
  "Quarterly",
  "Annual",
]);
export const confirmationStatus = z.enum(["NeedsConfirmation", "Confirmed"]);

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  clientName: z.string().trim().min(1).max(80).optional(),
});

export const settingsSchema = z.object({
  clientName: z.string().trim().min(1, "Client name is required").max(80).optional(),
  selectedMonth: monthKey.optional(),
  payFrequency: payFrequency.nullable().optional(),
  takeHomePayPerCheck: optionalCents,
  nextPayday: optionalIsoDate,
  savingsRateTarget: optionalPercent,
  minimumCashCushion: optionalCents,
  estimatedAnnualTaxLiability: optionalCents,
  incomeTaxWithheldYTD: optionalCents,
  regularWithholdingPerCheck: optionalCents,
  additionalWithholdingPerCheck: optionalCents,
  remainingPaychecks: z
    .union([z.number(), z.string(), z.null()])
    .optional()
    .transform((value, ctx) => {
      if (value === null || value === undefined || value === "") return null;
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed < 0) {
        ctx.addIssue({ code: "custom", message: "Remaining paychecks must be a whole number of 0 or more" });
        return z.NEVER;
      }
      return parsed;
    }),
  desiredTaxBuffer: optionalCents,
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  group: categoryGroup,
  needWant,
  wasteFlag,
  priority: priority.optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const categoryUpdateSchema = categorySchema.partial();

export const paymentMethodSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40),
  active: z.boolean().optional(),
});

export const recurringBillSchema = z.object({
  merchant: z.string().trim().min(1, "Merchant is required").max(80),
  categoryId: z.string().min(1, "Category is required"),
  expectedAmount: optionalCents,
  dueDay: z
    .union([z.number(), z.string(), z.null()])
    .optional()
    .transform((value, ctx) => {
      if (value === null || value === undefined || value === "") return null;
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 31) {
        ctx.addIssue({ code: "custom", message: "Due day must be between 1 and 31" });
        return z.NEVER;
      }
      return parsed;
    }),
  nextDueDate: optionalIsoDate,
  frequency: billFrequency.optional(),
  paymentMethodId: z.string().nullable().optional(),
  autopay: z.boolean().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  confirmationStatus: confirmationStatus.optional(),
  active: z.boolean().optional(),
});

export const recurringBillUpdateSchema = recurringBillSchema.partial();

export const transactionSchema = z.object({
  date: isoDate,
  merchant: z.string().trim().min(1, "Merchant is required").max(120),
  categoryId: z.string().min(1, "Category is required"),
  amount: requiredCents,
  paymentMethodId: z.string().nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
  recurringBillId: z.string().nullable().optional(),
  importSource: z.string().max(40).nullable().optional(),
  externalId: z.string().max(120).nullable().optional(),
});

export const transactionUpdateSchema = transactionSchema.partial();

export const importRowSchema = z.object({
  date: isoDate,
  merchant: z.string().trim().min(1).max(120),
  categoryName: z.string().trim().min(1),
  amount: requiredCents,
  paymentMethodName: z.string().trim().optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
});

export const importSchema = z.object({
  rows: z.array(importRowSchema).min(1, "No rows to import").max(2000),
  skipDuplicates: z.boolean().optional(),
});

export const budgetSchema = z.object({
  month: monthKey,
  categoryId: z.string().min(1),
  plannedAmount: optionalCents,
  userSuggestedCut: optionalCents,
  confirmedNewCap: optionalCents,
});

export const paycheckPlanSchema = z.object({
  payday: isoDate,
  netPay: nonNegativeCents,
  billsEssentials: nonNegativeCents.optional(),
  savings: nonNegativeCents.optional(),
  debtExtra: nonNegativeCents.optional(),
  flexibleSpending: nonNegativeCents.optional(),
  cashCushion: nonNegativeCents.optional(),
  note: z.string().trim().max(500).nullable().optional(),
});

export const paycheckPlanUpdateSchema = paycheckPlanSchema.partial();
