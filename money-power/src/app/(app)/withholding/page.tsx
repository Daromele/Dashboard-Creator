import Link from "next/link";
import { Callout, Card, Metric } from "@/components/ui";
import { requireWorkspace } from "@/lib/session-workspace";
import { computeWithholding } from "@/lib/calc";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function WithholdingPage() {
  const workspace = await requireWorkspace();
  const s = workspace.settings;
  const result = computeWithholding(s);

  const change = result.changeToCurrentWithholdingPerCheck;
  const headline = !result.complete
    ? "Add a few numbers to run this estimate"
    : change < 0
      ? `Potential increase in spending power: you may be withholding ${formatCents(Math.abs(change))} more than this estimate per paycheck.`
      : change > 0
        ? `Potential tax shortfall: consider increasing withholding by ${formatCents(change)} per paycheck.`
        : "Your current withholding is aligned with this estimate.";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Withholding check</h1>
        <p className="mt-2 max-w-2xl text-sm text-body/80">
          A cash-flow estimate of whether your paycheck withholding is running high or low against
          your own tax assumptions.
        </p>
      </div>

      <Callout tone="warning" title="This is a planning estimate, not tax advice">
        Money Power cannot see your tax return and never changes your payroll. Confirm any change
        with current official tax guidance, your payroll department, or a qualified tax
        professional, then submit an updated withholding form yourself.
      </Callout>

      {!result.complete ? (
        <Card title="Missing inputs">
          <p className="text-sm text-body/90">
            Add the following in{" "}
            <Link href="/setup" className="font-semibold text-charcoal underline">
              Setup
            </Link>
            :
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {result.missingFields.map((field) => (
              <li key={field}>{field}</li>
            ))}
          </ul>
        </Card>
      ) : (
        <>
          <Card
            title="What this estimate says"
            className={change < 0 ? "bg-sage/30" : change > 0 ? "bg-watch-bg" : "bg-cream"}
          >
            <p className="text-lg font-semibold text-charcoal">{headline}</p>
            {s.remainingPaychecks === 0 && (
              <p className="mt-2 text-sm text-body/90">{result.message}</p>
            )}
          </Card>

          <Card title="The numbers">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Metric
                label="Current withholding per check"
                value={formatCents(result.currentWithholdingPerCheck)}
                hint="Regular plus additional"
              />
              <Metric
                label="Target per remaining check"
                value={formatCents(result.targetWithholdingPerRemainingCheck)}
              />
              <Metric
                label="Change per check"
                value={formatCents(change, { signed: true })}
                hint={change < 0 ? "Estimated over-withholding" : change > 0 ? "Estimated shortfall" : "Aligned"}
              />
              <Metric
                label="Projected total withholding"
                value={formatCents(result.projectedTotalWithholding)}
                hint="Year-to-date plus what is still scheduled"
              />
              <Metric
                label="Target remaining withholding"
                value={formatCents(result.targetRemainingWithholding)}
                hint="Liability plus buffer, less year-to-date"
              />
              <Metric
                label="Projected over / under after buffer"
                value={formatCents(result.projectedOverUnderAfterBuffer, { signed: true })}
              />
            </div>
          </Card>

          <Card title="Your assumptions">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Metric label="Estimated annual tax liability" value={formatCents(s.estimatedAnnualTaxLiability)} />
              <Metric label="Withheld year-to-date" value={formatCents(s.incomeTaxWithheldYTD)} />
              <Metric label="Regular withholding per check" value={formatCents(s.regularWithholdingPerCheck)} />
              <Metric
                label="Additional withholding per check"
                value={formatCents(s.additionalWithholdingPerCheck ?? 0)}
              />
              <Metric label="Remaining paychecks" value={s.remainingPaychecks ?? 0} />
              <Metric label="Desired safety buffer" value={formatCents(s.desiredTaxBuffer ?? 0)} />
            </div>
            <p className="mt-4 text-sm text-body/80">
              Change any of these in{" "}
              <Link href="/setup" className="font-semibold text-charcoal underline">
                Setup
              </Link>
              .
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
