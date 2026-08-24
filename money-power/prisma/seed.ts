/**
 * Seeds the first Money Power user, Diteria, with her categories, payment
 * methods, preliminary (unconfirmed) bill list and opening monthly plans.
 *
 * Re-running is safe: the seed is idempotent.
 */

import { PrismaClient } from "@prisma/client";
import {
  DITERIA_BILLS,
  DITERIA_INITIAL_PLANS,
  provisionDefaults,
} from "../src/lib/provision";

const prisma = new PrismaClient();

const SEED_EMAIL = process.env.SEED_EMAIL?.toLowerCase() ?? "diteria@example.com";
const SEED_MONTH = "2026-08";

async function main() {
  const user = await prisma.userProfile.upsert({
    where: { email: SEED_EMAIL },
    update: { clientName: "Diteria" },
    create: { email: SEED_EMAIL, clientName: "Diteria" },
  });

  await provisionDefaults(prisma, user.id);

  await prisma.financialSettings.update({
    where: { userId: user.id },
    data: { selectedMonth: SEED_MONTH },
  });

  const categories = await prisma.category.findMany({ where: { userId: user.id } });
  const byName = new Map(categories.map((c) => [c.name, c.id]));

  for (const bill of DITERIA_BILLS) {
    const categoryId = byName.get(bill.category);
    if (!categoryId) throw new Error(`Missing seed category ${bill.category}`);
    const existing = await prisma.recurringBill.findFirst({
      where: { userId: user.id, merchant: bill.merchant },
    });
    if (existing) continue;
    await prisma.recurringBill.create({
      data: {
        userId: user.id,
        merchant: bill.merchant,
        categoryId,
        expectedAmount: bill.expectedAmount,
        frequency: "Monthly",
        notes: bill.notes,
        // Everything off the photo starts unconfirmed, including the amounts
        // that are legible, because no due date has been verified yet.
        confirmationStatus: "NeedsConfirmation",
        source: "handwritten-photo",
      },
    });
  }

  for (const plan of DITERIA_INITIAL_PLANS) {
    const categoryId = byName.get(plan.category);
    if (!categoryId) throw new Error(`Missing seed category ${plan.category}`);
    await prisma.monthlyBudget.upsert({
      where: {
        userId_month_categoryId: { userId: user.id, month: SEED_MONTH, categoryId },
      },
      update: { plannedAmount: plan.plannedAmount },
      create: { userId: user.id, month: SEED_MONTH, categoryId, plannedAmount: plan.plannedAmount },
    });
  }

  const billCount = await prisma.recurringBill.count({ where: { userId: user.id } });
  console.log(`Seeded ${user.clientName} <${user.email}> with ${categories.length} categories and ${billCount} preliminary bills.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
