import { NextRequest } from "next/server";
import { handle } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseISODate } from "@/lib/dates";
import { paycheckPlanSchema } from "@/lib/validation";

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    return {
      plans: await prisma.paycheckPlan.findMany({
        where: { userId: user.id },
        orderBy: { payday: "asc" },
      }),
    };
  });
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    const user = await requireUser();
    const input = paycheckPlanSchema.parse(await request.json());
    const { payday, ...rest } = input;
    return {
      plan: await prisma.paycheckPlan.create({
        data: { ...rest, userId: user.id, payday: parseISODate(payday) },
      }),
    };
  });
}
