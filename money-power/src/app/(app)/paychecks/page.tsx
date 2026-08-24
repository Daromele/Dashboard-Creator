import { Callout } from "@/components/ui";
import { requireWorkspace } from "@/lib/session-workspace";
import { PaycheckManager } from "./PaycheckManager";
import { toISODate } from "@/lib/dates";
import { confirmedMonthlyBillTotal } from "@/lib/calc";

export const dynamic = "force-dynamic";

export default async function PaychecksPage() {
  const workspace = await requireWorkspace();
  const { settings } = workspace;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Paycheck plan</h1>
        <p className="mt-2 max-w-2xl text-sm text-body/80">
          Give every dollar a job before you spend it. A small deliberate cushion is fine — an
          over-allocated check is not.
        </p>
      </div>

      {settings.takeHomePayPerCheck === null && (
        <Callout tone="warning" title="Add your take-home pay">
          Setup → payroll. Money Power uses it to pre-fill each new paycheck.
        </Callout>
      )}

      <PaycheckManager
        plans={workspace.paycheckPlans.map((plan) => ({ ...plan, payday: toISODate(plan.payday) }))}
        nextPayday={settings.nextPayday ? toISODate(settings.nextPayday) : null}
        takeHomePayPerCheck={settings.takeHomePayPerCheck}
        savingsRateTarget={settings.savingsRateTarget}
        minimumCashCushion={settings.minimumCashCushion}
        confirmedBillTotal={confirmedMonthlyBillTotal(workspace.bills)}
        billsDue={workspace.bills
          .filter((bill) => bill.active && bill.nextDueDate)
          .map((bill) => ({
            id: bill.id,
            merchant: bill.merchant,
            nextDueDate: toISODate(bill.nextDueDate as Date),
            expectedAmount: bill.expectedAmount,
            confirmationStatus: bill.confirmationStatus,
          }))}
      />
    </div>
  );
}
