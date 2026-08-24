import { NextRequest } from "next/server";
import { handle, jsonOk } from "@/lib/api";
import { createLoginToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendMagicLink } from "@/lib/mail";
import { provisionDefaults } from "@/lib/provision";
import { signInSchema } from "@/lib/validation";

/** Request a magic link. New email addresses get an account with starter data. */
export async function POST(request: NextRequest) {
  return handle(async () => {
    const { email, clientName } = signInSchema.parse(await request.json());

    let user = await prisma.userProfile.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.userProfile.create({
        data: { email, clientName: clientName?.trim() || email.split("@")[0] },
      });
      await provisionDefaults(prisma, user.id);
    }

    const token = await createLoginToken(user.id);
    const origin = process.env.APP_URL ?? request.nextUrl.origin;
    const link = `${origin}/api/auth/callback?token=${encodeURIComponent(token)}`;
    const delivery = await sendMagicLink(user.email, link);

    return jsonOk({
      ok: true,
      emailed: delivery.delivered,
      // Only present when no SMTP transport is configured (local/self-hosted).
      link: delivery.link ?? null,
    });
  });
}
