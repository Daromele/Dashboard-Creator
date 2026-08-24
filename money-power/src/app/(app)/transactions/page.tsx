import { requireWorkspace } from "@/lib/session-workspace";
import { TransactionsManager } from "./TransactionsManager";
import { toISODate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const workspace = await requireWorkspace();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Transactions</h1>
        <p className="mt-2 max-w-2xl text-sm text-body/80">
          Pick a category and Money Power fills in the group, Need/Want and waste signal for you.
        </p>
      </div>

      <TransactionsManager
        selectedMonth={workspace.settings.selectedMonth}
        categories={workspace.categories}
        paymentMethods={workspace.paymentMethods}
        transactions={workspace.transactions.map((t) => ({
          id: t.id,
          date: toISODate(t.date),
          merchant: t.merchant,
          categoryId: t.categoryId,
          amount: t.amount,
          paymentMethodId: t.paymentMethodId,
          note: t.note,
          importSource: t.importSource,
        }))}
      />
    </div>
  );
}
