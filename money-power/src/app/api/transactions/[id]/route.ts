import { NextRequest } from "next/server";
import { handle, HttpError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseISODate } from "@/lib/dates";
import { transactionUpdateSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;
    const input = transactionUpdateSchema.parse(await request.json());

    const owned = await prisma.transaction.findFirst({ where: { id, userId: user.id } });
    if (!owned) throw new HttpError("Transaction not found", 404);

    if (input.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: input.categoryId, userId: user.id },
      });
      if (!category) throw new HttpError("Category not found", 404);
    }

    const { date, ...rest } = input;
    return {
      transaction: await prisma.transaction.update({
        where: { id },
        data: { ...rest, ...(date ? { date: parseISODate(date) } : {}) },
      }),
    };
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;
    const owned = await prisma.transaction.findFirst({ where: { id, userId: user.id } });
    if (!owned) throw new HttpError("Transaction not found", 404);
    await prisma.transaction.delete({ where: { id } });
    return { deleted: true };
  });
}
