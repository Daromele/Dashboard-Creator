import { Card, Callout } from "@/components/ui";
import { requireWorkspace } from "@/lib/session-workspace";
import { SetupForm } from "./SetupForm";
import { toISODate } from "@/lib/dates";
import { basisPointsToInput, centsToInput } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const workspace = await requireWorkspace();
  const s = workspace.settings;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Setup</h1>
        <p className="mt-2 max-w-2xl text-sm text-body/80">
          Payroll, savings and tax assumptions. Everything else in Money Power is built from these.
        </p>
      </div>

      <Callout tone="warning" title="Planning estimate, not tax advice">
        Money Power estimates cash flow and withholding. Confirm any payroll change with current
        official tax guidance, your payroll department, or a qualified tax professional. The app
        never changes your withholding for you.
      </Callout>

      <SetupForm
        initial={{
          clientName: workspace.clientName,
          selectedMonth: s.selectedMonth,
          payFrequency: s.payFrequency ?? "",
          takeHomePayPerCheck: centsToInput(s.takeHomePayPerCheck),
          nextPayday: s.nextPayday ? toISODate(s.nextPayday) : "",
          savingsRateTarget: basisPointsToInput(s.savingsRateTarget),
          minimumCashCushion: centsToInput(s.minimumCashCushion),
          estimatedAnnualTaxLiability: centsToInput(s.estimatedAnnualTaxLiability),
          incomeTaxWithheldYTD: centsToInput(s.incomeTaxWithheldYTD),
          regularWithholdingPerCheck: centsToInput(s.regularWithholdingPerCheck),
          additionalWithholdingPerCheck: centsToInput(s.additionalWithholdingPerCheck),
          remainingPaychecks: s.remainingPaychecks === null ? "" : String(s.remainingPaychecks),
          desiredTaxBuffer: centsToInput(s.desiredTaxBuffer),
        }}
      />

      <Card title="Your weekly rhythm">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-body/90">
          <li>Add the transactions from the past week, or import them.</li>
          <li>Check the Cut List and pick one or two items to act on.</li>
          <li>Review the plan for your next paycheck before you spend it.</li>
        </ol>
      </Card>
    </div>
  );
}
