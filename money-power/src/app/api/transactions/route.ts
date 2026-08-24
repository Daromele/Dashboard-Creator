import { NextRequest } from "next/server";
import { handle, HttpError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { monthRange, parseISODate } from "@/lib/dates";
import { transactionSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  return handle(async () => {
    const user = await requireUser();
    const month = request.nextUrl.searchParams.get("month");
    const where = { userId: user.id } as Record<string, unknown>;
    if (month) {
      const { start, end } = monthRange(month);
      where.date = { gte: start, lt: end };
    }
    return {
      transactions: await prisma.transaction.findMany({
        where,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      }),
    };
  });
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    const user = await requireUser();
    const input = transactionSchema.parse(await request.json());

    const category = await prisma.category.findFirst({
      where: { id: input.categoryId, userId: user.id },
    });
    if (!category) throw new HttpError("Category not found", 404);

    if (input.paymentMethodId) {
      const method = await prisma.paymentMethod.findFirst({
        where: { id: input.paymentMethodId, userId: user.id },
      });
      if (!method) throw new HttpError("Payment method not found", 404);
    }

    const { date, ...rest } = input;
    return {
      transaction: await prisma.transaction.create({
        data: { ...rest, userId: user.id, date: parseISODate(date) },
      }),
    };
  });
}
