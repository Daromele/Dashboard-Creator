import Link from "next/link";
import { Callout, Card } from "@/components/ui";

export const metadata = { title: "Help · Money Power" };

const STEPS = [
  { title: "Set payroll and tax assumptions", href: "/setup", body: "Take-home pay, next payday, savings rate, cash cushion and your tax numbers." },
  { title: "Log every purchase or import it", href: "/transactions", body: "Add purchases as they happen, or import a CSV from your bank." },
  { title: "Allocate each paycheck before spending", href: "/paychecks", body: "Bills, savings, extra debt, flexible spending and cushion — until nothing is unassigned." },
  { title: "Set caps and review actuals", href: "/budget", body: "Give each category a monthly plan, then watch variance and percent used." },
  { title: "Attack the largest cuts first", href: "/cut-list", body: "Take the top one or two items. That is the whole job for the week." },
];

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Quick start</h1>
        <p className="mt-2 max-w-2xl text-sm text-body/80">
          Protect savings and essential bills first. Money Power then exposes the flexible spending
          that can actually be cut—without turning every purchase into a moral failure.
        </p>
      </div>

      <Card title="Five steps">
        <ol className="space-y-3">
          {STEPS.map((step, index) => (
            <li key={step.href} className="flex gap-3 rounded-xl border border-line bg-white p-4">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold/20 text-sm font-bold text-[#7a5f2f]">
                {index + 1}
              </span>
              <div>
                <Link href={step.href} className="font-semibold text-charcoal underline">
                  {step.title}
                </Link>
                <p className="mt-1 text-sm text-body/85">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card title="What the labels mean">
        <dl className="grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="mp-label">Group</dt>
            <dd className="text-sm">
              <strong>Essential</strong> keeps the lights on. <strong>Flexible</strong> is where
              choices live. <strong>Goals</strong> is money moving toward your future.
            </dd>
          </div>
          <div>
            <dt className="mp-label">Need / Want</dt>
            <dd className="text-sm">
              A plain description, not a judgement. Wants are where cuts are found first.
            </dd>
          </div>
          <div>
            <dt className="mp-label">Waste signal</dt>
            <dd className="text-sm">
              <strong>Core</strong> — untouchable essentials. <strong>Protected</strong> — savings and
              goals you refuse to raid. <strong>Watch</strong> — keep an eye on it.{" "}
              <strong>Cut</strong> — the first place Money Power looks for money.
            </dd>
          </div>
          <div>
            <dt className="mp-label">Decision status</dt>
            <dd className="text-sm">
              <strong>CUT / RESET</strong> when actual is over plan. <strong>WATCH</strong> above 80%
              of plan. <strong>ON TRACK</strong> otherwise.
            </dd>
          </div>
          <div>
            <dt className="mp-label">Suggested cut</dt>
            <dd className="text-sm">
              For a CUT category, the larger of the overspend or half of what you actually spent.
              Everywhere else, just the overspend. Always editable.
            </dd>
          </div>
          <div>
            <dt className="mp-label">Unassigned</dt>
            <dd className="text-sm">
              Net pay minus every allocation on a paycheck. Negative means you have promised money
              you do not have.
            </dd>
          </div>
        </dl>
      </Card>

      <Card title="Importing transactions">
        <ul className="list-disc space-y-2 pl-5 text-sm">
          <li>
            CSV columns: <code>date, merchant, category, amount</code>, plus optional{" "}
            <code>payment method</code> and <code>note</code>. Common bank header names (description,
            payee, memo) are recognised too.
          </li>
          <li>Dates may be YYYY-MM-DD or M/D/YYYY. Amounts may include $ and commas.</li>
          <li>A category has to exist before rows using it can import.</li>
          <li>Rows matching an existing date, merchant and amount are skipped as duplicates.</li>
          <li>Refunds import as negative amounts.</li>
        </ul>
      </Card>

      <Card title="Recurring bills and actual spending">
        <p className="text-sm">
          Bills are expectations, not spending. A bill only becomes actual spending when you record
          a payment against it with a real date and amount, which is why an unconfirmed bill can
          never quietly inflate your month.
        </p>
      </Card>

      <Callout tone="warning" title="Tax disclaimer">
        The Withholding Check is a cash-flow planning estimate based on numbers you enter. It is not
        tax advice and Money Power never changes your payroll withholding. Confirm any change with
        current official tax guidance, your payroll department, or a qualified tax professional.
      </Callout>
    </div>
  );
}
