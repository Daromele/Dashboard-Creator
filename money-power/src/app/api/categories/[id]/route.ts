import { NextRequest } from "next/server";
import { handle, HttpError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { categoryUpdateSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;
    const input = categoryUpdateSchema.parse(await request.json());

    const owned = await prisma.category.findFirst({ where: { id, userId: user.id } });
    if (!owned) throw new HttpError("Category not found", 404);

    if (input.name) {
      const clash = await prisma.category.findFirst({
        where: { userId: user.id, id: { not: id }, name: { equals: input.name, mode: "insensitive" } },
      });
      if (clash) throw new HttpError(`You already have a category called "${clash.name}"`, 409);
    }

    return { category: await prisma.category.update({ where: { id }, data: input }) };
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;

    const owned = await prisma.category.findFirst({ where: { id, userId: user.id } });
    if (!owned) throw new HttpError("Category not found", 404);

    // A category still carrying history is deactivated rather than deleted, so
    // existing transactions keep their classification.
    const [transactions, bills] = await Promise.all([
      prisma.transaction.count({ where: { categoryId: id } }),
      prisma.recurringBill.count({ where: { categoryId: id } }),
    ]);

    if (transactions > 0 || bills > 0) {
      const category = await prisma.category.update({ where: { id }, data: { active: false } });
      return { category, deactivated: true };
    }

    await prisma.category.delete({ where: { id } });
    return { deleted: true };
  });
}
