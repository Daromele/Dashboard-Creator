import { Callout } from "@/components/ui";
import { requireWorkspace } from "@/lib/session-workspace";
import { BillsManager } from "./BillsManager";
import { toISODate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function BillsPage() {
  const workspace = await requireWorkspace();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Recurring bills</h1>
        <p className="mt-2 max-w-2xl text-sm text-body/80">
          Confirm each bill&apos;s name, amount and due date. Nothing here counts as spending until
          you record a payment against it.
        </p>
      </div>

      <Callout tone="neutral" title="Where these came from">
        Bills marked <strong>Needs confirmation</strong> were transcribed from a handwritten list.
        Amounts and due dates are unverified, so they stay out of every actual-spending figure until
        you confirm them.
      </Callout>

      <BillsManager
        bills={workspace.bills.map((bill) => ({
          ...bill,
          nextDueDate: bill.nextDueDate ? toISODate(bill.nextDueDate) : null,
        }))}
        categories={workspace.categories}
        paymentMethods={workspace.paymentMethods}
      />
    </div>
  );
}
