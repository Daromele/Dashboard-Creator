import { NextRequest } from "next/server";
import { handle } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { paymentMethodSchema } from "@/lib/validation";

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    return {
      paymentMethods: await prisma.paymentMethod.findMany({
        where: { userId: user.id },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
    };
  });
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    const user = await requireUser();
    const input = paymentMethodSchema.parse(await request.json());
    const count = await prisma.paymentMethod.count({ where: { userId: user.id } });
    return {
      paymentMethod: await prisma.paymentMethod.create({
        data: { ...input, userId: user.id, sortOrder: count },
      }),
    };
  });
}
