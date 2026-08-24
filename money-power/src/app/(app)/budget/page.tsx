import { requireWorkspace } from "@/lib/session-workspace";
import { buildBudgetRows } from "@/lib/calc";
import { BudgetTable } from "./BudgetTable";
import { formatMonthLabel } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function BudgetPage() {
  const workspace = await requireWorkspace();
  const month = workspace.settings.selectedMonth;
  const rows = buildBudgetRows(workspace.categories, workspace.budgets, workspace.transactions, month);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Monthly budget</h1>
        <p className="mt-2 max-w-2xl text-sm text-body/80">
          Plans, actuals and a decision for every category in {formatMonthLabel(month)}. A blank plan
          is not the same as a $0 plan.
        </p>
      </div>

      <BudgetTable month={month} rows={rows} />
    </div>
  );
}
