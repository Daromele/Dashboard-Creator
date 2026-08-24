import { NextRequest } from "next/server";
import { handle } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseISODate } from "@/lib/dates";
import { settingsSchema } from "@/lib/validation";
import { ensureSettings } from "@/lib/workspace";

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    return { settings: await ensureSettings(user.id), clientName: user.clientName };
  });
}

export async function PATCH(request: NextRequest) {
  return handle(async () => {
    const user = await requireUser();
    const input = settingsSchema.parse(await request.json());
    const { clientName, nextPayday, ...rest } = input;

    if (clientName) {
      await prisma.userProfile.update({ where: { id: user.id }, data: { clientName } });
    }

    const data = {
      ...rest,
      ...(nextPayday !== undefined ? { nextPayday: nextPayday ? parseISODate(nextPayday) : null } : {}),
    };

    await ensureSettings(user.id);
    const settings = await prisma.financialSettings.update({ where: { userId: user.id }, data });
    return { settings };
  });
}
