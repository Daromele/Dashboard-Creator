import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureSettings } from "@/lib/workspace";
import type { MonthKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");

  const user = await prisma.userProfile.findUnique({ where: { id: userId } });
  if (!user) redirect("/sign-in");

  const settings = await ensureSettings(user.id);

  return (
    <AppShell clientName={user.clientName} selectedMonth={settings.selectedMonth as MonthKey}>
      {children}
    </AppShell>
  );
}
