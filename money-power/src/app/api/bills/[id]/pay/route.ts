import { NextRequest } from "next/server";
import { handle, HttpError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseISODate, toISODate } from "@/lib/dates";
import { optionalCents } from "@/lib/validation";
import { z } from "zod";

const paySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: optionalCents,
  advanceDueDate: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

/**
 * Record a bill as paid: this is the only path that turns a recurring bill into
 * actual spending, and it requires both a real date and a real amount. An
 * unconfirmed bill with no amount can never leak into the month's actuals.
 */
export async function POST(request: NextRequest, { params }: Params) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;
    const input = paySchema.parse(await request.json());

    const bill = await prisma.recurringBill.findFirst({ where: { id, userId: user.id } });
    if (!bill) throw new HttpError("Bill not found", 404);

    const amount = input.amount ?? bill.expectedAmount;
    if (amount === null || amount === undefined) {
      throw new HttpError("Confirm this bill's amount before recording a payment", 422);
    }

    const date = parseISODate(input.date);
    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        date,
        merchant: bill.merchant,
        categoryId: bill.categoryId,
        amount,
        paymentMethodId: bill.paymentMethodId,
        recurringBillId: bill.id,
        note: `Recorded from recurring bill`,
        importSource: "recurring-bill",
        externalId: `bill:${bill.id}:${toISODate(date)}`,
      },
    });

    if (input.advanceDueDate !== false) {
      const next = new Date(date);
      switch (bill.frequency) {
        case "Weekly":
          next.setUTCDate(next.getUTCDate() + 7);
          break;
        case "Biweekly":
          next.setUTCDate(next.getUTCDate() + 14);
          break;
        case "Semimonthly":
          next.setUTCDate(next.getUTCDate() + 15);
          break;
        case "Quarterly":
          next.setUTCMonth(next.getUTCMonth() + 3);
          break;
        case "Annual":
          next.setUTCFullYear(next.getUTCFullYear() + 1);
          break;
        default:
          next.setUTCMonth(next.getUTCMonth() + 1);
      }
      await prisma.recurringBill.update({ where: { id }, data: { nextDueDate: next } });
    }

    return { transaction };
  });
}
