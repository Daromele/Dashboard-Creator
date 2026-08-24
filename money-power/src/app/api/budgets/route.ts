import { NextRequest } from "next/server";
import { handle, HttpError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { budgetSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  return handle(async () => {
    const user = await requireUser();
    const month = request.nextUrl.searchParams.get("month") ?? undefined;
    return {
      budgets: await prisma.monthlyBudget.findMany({
        where: { userId: user.id, ...(month ? { month } : {}) },
      }),
    };
  });
}

/** Upsert one category's plan for one month. */
export async function PUT(request: NextRequest) {
  return handle(async () => {
    const user = await requireUser();
    const input = budgetSchema.parse(await request.json());

    const category = await prisma.category.findFirst({
      where: { id: input.categoryId, userId: user.id },
    });
    if (!category) throw new HttpError("Category not found", 404);

    const { month, categoryId, ...values } = input;
    const budget = await prisma.monthlyBudget.upsert({
      where: { userId_month_categoryId: { userId: user.id, month, categoryId } },
      update: values,
      create: { userId: user.id, month, categoryId, ...values },
    });
    return { budget };
  });
}
