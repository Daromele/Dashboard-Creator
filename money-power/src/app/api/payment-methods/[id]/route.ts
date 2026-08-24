import { NextRequest } from "next/server";
import { handle, HttpError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { paymentMethodSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;
    const input = paymentMethodSchema.partial().parse(await request.json());
    const owned = await prisma.paymentMethod.findFirst({ where: { id, userId: user.id } });
    if (!owned) throw new HttpError("Payment method not found", 404);
    return { paymentMethod: await prisma.paymentMethod.update({ where: { id }, data: input }) };
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;
    const owned = await prisma.paymentMethod.findFirst({ where: { id, userId: user.id } });
    if (!owned) throw new HttpError("Payment method not found", 404);

    const used = await prisma.transaction.count({ where: { paymentMethodId: id } });
    if (used > 0) {
      const paymentMethod = await prisma.paymentMethod.update({ where: { id }, data: { active: false } });
      return { paymentMethod, deactivated: true };
    }
    await prisma.paymentMethod.delete({ where: { id } });
    return { deleted: true };
  });
}
