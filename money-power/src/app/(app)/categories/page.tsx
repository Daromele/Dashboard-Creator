import { requireWorkspace } from "@/lib/session-workspace";
import { prisma } from "@/lib/db";
import { CategoriesManager } from "./CategoriesManager";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const workspace = await requireWorkspace();
  const rows = await prisma.category.findMany({
    where: { userId: workspace.userId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Categories &amp; lists</h1>
        <p className="mt-2 max-w-2xl text-sm text-body/80">
          A category carries its group, Need/Want and waste signal. Change it here and every
          transaction in that category follows automatically.
        </p>
      </div>

      <CategoriesManager
        categories={rows.map((c) => ({
          id: c.id,
          name: c.name,
          group: c.group,
          needWant: c.needWant,
          wasteFlag: c.wasteFlag,
          priority: c.priority,
          active: c.active,
        }))}
        paymentMethods={workspace.paymentMethods}
      />
    </div>
  );
}
