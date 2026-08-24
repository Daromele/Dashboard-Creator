import { NextRequest } from "next/server";
import { handle, HttpError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { categorySchema } from "@/lib/validation";

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    return {
      categories: await prisma.category.findMany({
        where: { userId: user.id },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
    };
  });
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    const user = await requireUser();
    const input = categorySchema.parse(await request.json());

    // Category names are unique per user, case-insensitively.
    const clash = await prisma.category.findFirst({
      where: { userId: user.id, name: { equals: input.name, mode: "insensitive" } },
    });
    if (clash) throw new HttpError(`You already have a category called "${clash.name}"`, 409);

    const count = await prisma.category.count({ where: { userId: user.id } });
    const category = await prisma.category.create({
      data: { ...input, userId: user.id, sortOrder: input.sortOrder ?? count },
    });
    return { category };
  });
}
