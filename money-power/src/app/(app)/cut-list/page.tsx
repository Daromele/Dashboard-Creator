import { requireWorkspace } from "@/lib/session-workspace";
import { buildCutList } from "@/lib/calc";
import { CutListTable } from "./CutListTable";
import { formatMonthLabel } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function CutListPage() {
  const workspace = await requireWorkspace();
  const month = workspace.settings.selectedMonth;
  const rows = buildCutList(workspace.categories, workspace.budgets, workspace.transactions, month);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Cut list</h1>
        <p className="mt-2 max-w-2xl text-sm text-body/80">
          The largest actionable savings in {formatMonthLabel(month)}, ordered by what they are worth.
          Take one or two — this is not a verdict on you.
        </p>
      </div>

      <CutListTable month={month} rows={rows} />
    </div>
  );
}
