import Link from "next/link";
import { Card, Callout, KpiCard, Metric } from "@/components/ui";
import { GroupDonut, PlanVsActualBars } from "@/components/DashboardCharts";
import { requireWorkspace } from "@/lib/session-workspace";
import { buildBudgetRows, computeDashboard, priorityBudgetRows } from "@/lib/calc";
import { formatCents, formatRatio } from "@/lib/money";
import { formatDateLabel, formatMonthLabel } from "@/lib/dates";

export const dynamic = "force-dynamic";

const QUICK_START = [
  { label: "Set payroll and tax assumptions", href: "/setup" },
  { label: "Log every purchase or import it", href: "/transactions" },
  { label: "Allocate each paycheck before spending", href: "/paychecks" },
  { label: "Set caps and review actuals", href: "/budget" },
  { label: "Attack the largest cuts first", href: "/cut-list" },
];

export default async function DashboardPage() {
  const workspace = await requireWorkspace();
  const { settings, categories, transactions, budgets, paycheckPlans } = workspace;
  const month = settings.selectedMonth;

  const metrics = computeDashboard({ settings, categories, transactions, budgets, paycheckPlans });
  const budgetRows = buildBudgetRows(categories, budgets, transactions, month);
  const priorityRows = priorityBudgetRows(budgetRows);

  const donutData = [
    { name: "Essential", value: metrics.spendByGroup.Essential },
    { name: "Flexible", value: metrics.spendByGroup.Flexible },
    { name: "Goals", value: metrics.spendByGroup.Goals },
  ];

  const barData = priorityRows.map((row) => ({
    category: row.categoryName,
    plan: row.plannedAmount ?? 0,
    actual: row.actual,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">
          Hello, {workspace.clientName} · {formatMonthLabel(month)} dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-body/80">
          See where it went, protect the next paycheck, and cut waste without guilt.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Monthly spend" value={formatCents(metrics.monthlySpend)} tone="rose" emphasis />
        <KpiCard
          label="Plan left"
          value={formatCents(metrics.planLeft)}
          tone={metrics.planLeft < 0 ? "rose" : "sage"}
          hint={`Total plan ${formatCents(metrics.totalPlan)}`}
        />
        <KpiCard
          label="Waste to cut"
          value={formatCents(metrics.wasteToCut)}
          tone="cream"
          hint="Spending in CUT-flagged categories"
        />
        <KpiCard
          label="Next check left"
          value={metrics.nextCheckLeft === null ? "No plan yet" : formatCents(metrics.nextCheckLeft)}
          tone={metrics.nextCheckLeft !== null && metrics.nextCheckLeft < 0 ? "rose" : "blush"}
          hint={
            metrics.nextPayday
              ? `Payday ${formatDateLabel(metrics.nextPayday)}`
              : "Set your next payday in Setup"
          }
        />
      </div>

      {metrics.cashWarning === "Over-allocated" && (
        <Callout tone="danger" title="Over-allocated">
          Your next paycheck assigns more money than it brings home. Open the{" "}
          <Link className="underline" href="/paychecks">
            paycheck plan
          </Link>{" "}
          and pull an allocation back.
        </Callout>
      )}

      <Card title="At a glance">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Metric label="Flexible spending" value={formatCents(metrics.flexibleSpend)} />
          <Metric label="Budget percent used" value={formatRatio(metrics.budgetUsed)} />
          <Metric
            label="Tax move per check"
            value={metrics.taxMovePerCheck === null ? "Add tax inputs" : formatCents(metrics.taxMovePerCheck, { signed: true })}
            hint={
              metrics.taxMovePerCheck === null
                ? "Setup → tax assumptions"
                : metrics.taxMovePerCheck < 0
                  ? "Estimated over-withholding"
                  : metrics.taxMovePerCheck > 0
                    ? "Estimated shortfall"
                    : "Aligned with this estimate"
            }
          />
          <Metric label="Savings planned" value={formatCents(metrics.savingsPlanned)} />
          <Metric
            label="Savings target"
            value={metrics.savingsTarget === null ? "Set a rate" : formatCents(metrics.savingsTarget)}
          />
          <Metric
            label="Biggest action"
            value={metrics.biggestAction}
            hint={metrics.biggestActionAmount ? `Suggested cut ${formatCents(metrics.biggestActionAmount)}` : undefined}
          />
          <Metric
            label="Next payday"
            value={metrics.nextPayday ? formatDateLabel(metrics.nextPayday) : "Not set"}
          />
          <Metric
            label="Paycheck cushion"
            value={metrics.paycheckCushion === null ? "Not set" : formatCents(metrics.paycheckCushion)}
          />
          <Metric
            label="Cash warning"
            value={metrics.cashWarning}
            hint={metrics.cashWarning === "Over-allocated" ? "Pull back an allocation" : "Nothing over-committed"}
          />
        </div>
        <div className="mt-4">
          <Callout tone={metrics.wasteToCut > 0 ? "warning" : "good"} title="Fastest win">
            {metrics.wasteToCut > 0
              ? `${metrics.fastestWin} That is ${formatCents(metrics.wasteToCut)} back in your pocket.`
              : metrics.fastestWin}
          </Callout>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Where the month is going" description="Essential, Flexible and Goals spending.">
          <GroupDonut data={donutData} />
        </Card>
        <Card
          title="Plan vs actual — priority categories"
          description="The categories carrying the largest plans or spend this month."
        >
          <PlanVsActualBars data={barData} />
        </Card>
      </div>

      <Card title="Quick start" description="The weekly rhythm that keeps this working.">
        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {QUICK_START.map((step, index) => (
            <li key={step.href}>
              <Link
                href={step.href}
                className="flex h-full items-center gap-3 rounded-xl border border-line bg-white p-4 transition hover:border-gold"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold/20 text-sm font-bold text-[#7a5f2f]">
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-charcoal">{step.label}</span>
              </Link>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
