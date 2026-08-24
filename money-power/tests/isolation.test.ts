/**
 * Database-backed checks: multi-user isolation, session integrity and the rule
 * that unconfirmed bills never become actual spending.
 *
 * These need PostgreSQL; they skip themselves when DATABASE_URL is not set.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createSessionValue, readSessionValue } from "@/lib/auth";
import { loadWorkspace, assertOwnership } from "@/lib/workspace";
import { provisionDefaults } from "@/lib/provision";
import { computeDashboard } from "@/lib/calc";
import { parseISODate } from "@/lib/dates";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const prisma = new PrismaClient();

const suite = hasDatabase ? describe : describe.skip;

suite("multi-user isolation", () => {
  const emails = [`iso-a-${Date.now()}@example.com`, `iso-b-${Date.now()}@example.com`];
  let userA = "";
  let userB = "";

  beforeAll(async () => {
    process.env.AUTH_SECRET ??= "test-secret-value-1234567890";

    const a = await prisma.userProfile.create({ data: { email: emails[0], clientName: "Ann" } });
    const b = await prisma.userProfile.create({ data: { email: emails[1], clientName: "Ben" } });
    userA = a.id;
    userB = b.id;

    await provisionDefaults(prisma, userA);
    await provisionDefaults(prisma, userB);

    const aCategory = await prisma.category.findFirstOrThrow({
      where: { userId: userA, name: "Dining Out" },
    });
    const bCategory = await prisma.category.findFirstOrThrow({
      where: { userId: userB, name: "Dining Out" },
    });

    await prisma.financialSettings.update({
      where: { userId: userA },
      data: { selectedMonth: "2026-08", nextPayday: parseISODate("2026-08-28") },
    });
    await prisma.financialSettings.update({
      where: { userId: userB },
      data: { selectedMonth: "2026-08" },
    });

    await prisma.transaction.create({
      data: {
        userId: userA,
        date: parseISODate("2026-08-05"),
        merchant: "Ann's cafe",
        categoryId: aCategory.id,
        amount: 5000,
      },
    });
    await prisma.transaction.create({
      data: {
        userId: userB,
        date: parseISODate("2026-08-06"),
        merchant: "Ben's cafe",
        categoryId: bCategory.id,
        amount: 999999,
      },
    });

    await prisma.monthlyBudget.create({
      data: { userId: userA, month: "2026-08", categoryId: aCategory.id, plannedAmount: 10000 },
    });
    await prisma.paycheckPlan.create({
      data: {
        userId: userA,
        payday: parseISODate("2026-08-28"),
        netPay: 200000,
        billsEssentials: 150000,
        savings: 20000,
      },
    });
  });

  afterAll(async () => {
    await prisma.userProfile.deleteMany({ where: { email: { in: emails } } });
    await prisma.$disconnect();
  });

  it("never returns another user's transactions", async () => {
    const workspace = await loadWorkspace(userA);
    expect(workspace.transactions).toHaveLength(1);
    expect(workspace.transactions[0].merchant).toBe("Ann's cafe");
    expect(workspace.transactions.some((t) => t.amount === 999999)).toBe(false);
  });

  it("computes each user's dashboard from their own data only", async () => {
    const a = await loadWorkspace(userA);
    const b = await loadWorkspace(userB);
    expect(computeDashboard(a).monthlySpend).toBe(5000);
    expect(computeDashboard(b).monthlySpend).toBe(999999);
    expect(computeDashboard(b).totalPlan).toBe(0);
    expect(computeDashboard(a).totalPlan).toBe(10000);
  });

  it("keeps categories, budgets and paycheck plans separate", async () => {
    const a = await loadWorkspace(userA);
    const b = await loadWorkspace(userB);
    const aIds = new Set(a.categories.map((c) => c.id));
    expect(b.categories.some((c) => aIds.has(c.id))).toBe(false);
    expect(b.budgets).toHaveLength(0);
    expect(b.paycheckPlans).toHaveLength(0);
    expect(a.paycheckPlans).toHaveLength(1);
  });

  it("refuses ownership of another user's records", async () => {
    const aTransaction = await prisma.transaction.findFirstOrThrow({ where: { userId: userA } });
    expect(await assertOwnership("transaction", aTransaction.id, userA)).toBe(true);
    expect(await assertOwnership("transaction", aTransaction.id, userB)).toBe(false);
  });

  it("seeds each new user with their own starter categories", async () => {
    const a = await loadWorkspace(userA);
    expect(a.categories).toHaveLength(16);
    expect(a.paymentMethods).toHaveLength(6);
  });
});

suite("session cookies", () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = "test-secret-value-1234567890";
  });

  it("round-trips a signed session", () => {
    const value = createSessionValue("user-123");
    expect(readSessionValue(value)).toBe("user-123");
  });

  it("rejects a tampered payload", () => {
    const value = createSessionValue("user-123");
    const [, signature] = value.split(".");
    const forged = `${Buffer.from(JSON.stringify({ sub: "someone-else", exp: 9999999999 })).toString("base64url")}.${signature}`;
    expect(readSessionValue(forged)).toBeNull();
  });

  it("rejects an expired session", () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24 * 400);
    expect(readSessionValue(createSessionValue("user-123", past))).toBeNull();
  });

  it("rejects nonsense", () => {
    expect(readSessionValue(undefined)).toBeNull();
    expect(readSessionValue("")).toBeNull();
    expect(readSessionValue("not-a-session")).toBeNull();
  });
});

suite("unconfirmed bills stay out of actual spending", () => {
  const email = `bills-${Date.now()}@example.com`;
  let userId = "";

  beforeAll(async () => {
    const user = await prisma.userProfile.create({ data: { email, clientName: "Bill" } });
    userId = user.id;
    await provisionDefaults(prisma, userId);
    const category = await prisma.category.findFirstOrThrow({
      where: { userId, name: "Utilities" },
    });
    await prisma.recurringBill.create({
      data: {
        userId,
        merchant: "Vivint",
        categoryId: category.id,
        expectedAmount: null,
        confirmationStatus: "NeedsConfirmation",
        source: "handwritten-photo",
      },
    });
    await prisma.recurringBill.create({
      data: {
        userId,
        merchant: "T-Mobile",
        categoryId: category.id,
        expectedAmount: 30000,
        confirmationStatus: "NeedsConfirmation",
      },
    });
  });

  afterAll(async () => {
    await prisma.userProfile.deleteMany({ where: { email } });
  });

  it("reports zero spend even though bills exist", async () => {
    const workspace = await loadWorkspace(userId, "2026-08");
    expect(workspace.bills).toHaveLength(2);
    expect(workspace.transactions).toHaveLength(0);
    expect(computeDashboard(workspace).monthlySpend).toBe(0);
  });
});
