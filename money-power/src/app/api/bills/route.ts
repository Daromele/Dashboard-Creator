import { NextRequest } from "next/server";
import { handle, HttpError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseISODate } from "@/lib/dates";
import { recurringBillSchema } from "@/lib/validation";

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    return {
      bills: await prisma.recurringBill.findMany({
        where: { userId: user.id },
        orderBy: [{ merchant: "asc" }],
      }),
    };
  });
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    const user = await requireUser();
    const input = recurringBillSchema.parse(await request.json());

    const category = await prisma.category.findFirst({
      where: { id: input.categoryId, userId: user.id },
    });
    if (!category) throw new HttpError("Category not found", 404);

    const { nextDueDate, ...rest } = input;
    return {
      bill: await prisma.recurringBill.create({
        data: {
          ...rest,
          userId: user.id,
          nextDueDate: nextDueDate ? parseISODate(nextDueDate) : null,
        },
      }),
    };
  });
}
