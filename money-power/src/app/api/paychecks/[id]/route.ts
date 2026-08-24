import { NextRequest } from "next/server";
import { handle, HttpError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseISODate } from "@/lib/dates";
import { paycheckPlanUpdateSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;
    const input = paycheckPlanUpdateSchema.parse(await request.json());
    const owned = await prisma.paycheckPlan.findFirst({ where: { id, userId: user.id } });
    if (!owned) throw new HttpError("Paycheck plan not found", 404);

    const { payday, ...rest } = input;
    return {
      plan: await prisma.paycheckPlan.update({
        where: { id },
        data: { ...rest, ...(payday ? { payday: parseISODate(payday) } : {}) },
      }),
    };
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;
    const owned = await prisma.paycheckPlan.findFirst({ where: { id, userId: user.id } });
    if (!owned) throw new HttpError("Paycheck plan not found", 404);
    await prisma.paycheckPlan.delete({ where: { id } });
    return { deleted: true };
  });
}
