# Money Power

A personal cash-flow and withholding planning app.

> See where it went, protect the next paycheck, and cut waste without guilt.

Money Power answers four questions: where the money went, how the next paycheck
should be allocated before it is spent, whether payroll withholding is running
high or low, and which spending is actually worth cutting.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · PostgreSQL via Prisma ·
Zod · Recharts · Vitest · Playwright.

## Getting started

Requires Node 20+ and a PostgreSQL 14+ database.

```bash
npm install
cp .env.example .env          # then fill in DATABASE_URL and AUTH_SECRET
npx prisma migrate deploy     # or `npm run db:migrate` while developing
npm run db:seed               # seeds Diteria's categories, bills and plans
npm run dev
```

Open http://localhost:3000, enter an email, and follow the sign-in link.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string. |
| `AUTH_SECRET` | yes | Signs session cookies. Generate with `openssl rand -hex 32`. |
| `APP_URL` | production | Public origin, e.g. `https://money-power.example.com`. Magic links and the post-sign-in redirect use it, and an `https://` value turns on Secure cookies. |
| `SMTP_URL` | no | e.g. `smtp://user:pass@host:587`. When set, sign-in links are emailed. When unset, the link is logged and returned to the browser so a local or self-hosted install still works. |
| `MAIL_FROM` | no | From address for those emails. |
| `SEED_EMAIL` | no | Email used by `npm run db:seed` (default `diteria@example.com`). |

### Authentication

Passwordless. Requesting a link mints a random token, stores only its SHA-256
hash, and expires it in 20 minutes; following the link exchanges it for an
HMAC-signed, HttpOnly session cookie. A first-time email address gets an account
with the starter categories and payment methods. Every query is scoped by the
userId in that cookie — see `src/lib/workspace.ts`, the one place data is read.

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Development server. |
| `npm run build` / `npm start` | Production build and server. |
| `npm test` | Vitest — all financial calculations plus database-backed isolation checks. |
| `npm run test:e2e` | Playwright — seven critical user flows through the real UI. |
| `npm run lint` / `npm run typecheck` | ESLint and TypeScript. |
| `npm run db:migrate` / `db:deploy` / `db:seed` / `db:reset` | Prisma. |

`npm test` skips the database-backed suites when `DATABASE_URL` is unset.
`npm run test:e2e` builds the app and starts it on port 3100; set
`CHROMIUM_PATH` to reuse a pre-installed Chromium, or `E2E_BASE_URL` to test a
server that is already running.

## Screens

- **Dashboard** — four KPIs (monthly spend, plan left, waste to cut, next check
  left), at-a-glance metrics, quick-start actions, and two charts: where the
  month is going by group, and plan vs actual for priority categories.
- **Setup** — payroll, savings target, cash cushion, tax assumptions.
- **Categories & Lists** — CRUD for categories (group, Need/Want, waste flag,
  priority) and payment methods.
- **Recurring Bills** — confirm names, amounts and due dates; record a payment
  to turn a bill into an actual transaction.
- **Transactions** — add, edit, delete, search, filter, CSV import with
  duplicate detection.
- **Paycheck Plan** — allocate each check; unassigned money is computed and an
  over-allocation is called out.
- **Monthly Budget** — plan, actual, variance, percent used, decision status.
- **Cut List** — ranked, editable, actionable savings.
- **Withholding Check** — informational estimate with a standing disclaimer.
- **Help** — the five-step start, every definition, import guidance.

## How the money works

Money is stored and computed as **integer cents**, never floating point.
Percentages are stored as **basis points** (1000 = 10.00%). User input is parsed
by string manipulation in `src/lib/money.ts`, so `0.1 + 0.2` is exactly `0.30`.

Calendar values (transaction dates, paydays, due dates) are SQL `DATE` columns
handled at UTC midnight, so a timezone can never shift a transaction into an
adjacent month.

Group, Need/Want and waste signal are **derived from the category** and are
never copied onto a transaction — reclassifying a category updates its whole
history at once.

### The rules, verbatim

```text
monthlySpend  = sum of transactions whose date is in the selected month
planLeft      = totalPlan - monthlySpend
budgetUsed    = totalPlan > 0 ? monthlySpend / totalPlan : 0
variance      = plan - actual                    (null when the plan is blank)
percentUsed   = plan is blank or 0 ? 0 : actual / plan

decision:
  actual > plan       -> CUT / RESET
  percentUsed > 0.80  -> WATCH
  otherwise           -> ON TRACK

overspend     = max(0, actual - plan)
suggestedCut  = signal == "Cut" ? max(overspend, actual * 0.50) : overspend
newCap        = max(0, plan - suggestedCut)

unassigned    = netPay - (bills + savings + debtExtra + flexible + cushion)
nextCheckLeft = unassigned on the plan whose payday == settings.nextPayday

projectedTotalWithholding = withheldYTD +
  (regularPerCheck + additionalPerCheck) * remainingPaychecks
targetRemainingWithholding = max(0, liability + buffer - withheldYTD)
targetPerRemainingCheck = remaining > 0 ? targetRemaining / remaining : 0
changeToCurrentPerCheck = targetPerRemainingCheck - currentPerCheck
projectedOverUnderAfterBuffer = projectedTotal - (liability + buffer)
```

A **blank plan is not a $0 plan**. Blank means "not decided yet" and reports 0%
used; an explicit $0 is a real budget, and anything spent against it reads as
CUT / RESET.

## Bills are not spending

A recurring bill is an expectation. It becomes actual spending only when a
payment is recorded against it with a real date and amount, which is why the
preliminary bills transcribed from Diteria's handwritten list — most of them
missing an amount or a due date — sit in `Needs confirmation` without inflating
a single figure. Bills whose amount is unknown cannot be paid until confirmed.

The known preliminary total is **$1,431.05**: T-Mobile $300.00, Insurance
$950.00, Kids Allowance $175.00, AUR Service Fee $6.05. It is incomplete because
most amounts are still unknown.

The source spreadsheet folded the $6.05 service fee into a $306.05 Utilities
plan even though the fee is categorised as Other. The seed resolves that: the
Utilities plan is the $300.00 T-Mobile amount and the $6.05 sits in Other.

## Tax guidance

The Withholding Check is a cash-flow planning estimate built from numbers the
user enters. It is **not tax advice**, and the app never automates a payroll
change. Every withholding result carries a disclaimer directing the user to
current official tax guidance, payroll, or a qualified tax professional.

## Deployment

1. Provision PostgreSQL (Supabase, Neon, RDS — any Postgres works).
2. Set `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`, and optionally `SMTP_URL` /
   `MAIL_FROM`. Without SMTP, sign-in links are shown in the browser rather
   than emailed — configure SMTP before opening the app to real users.
3. `npx prisma migrate deploy` on release.
4. `npm run build && npm start`, or deploy to any Node host (Vercel included;
   `npm run build` runs `prisma generate` first).
5. Optionally `npm run db:seed` for the initial user.

## Tests

`npm test` covers month filtering across month and year boundaries, leap years
and timezone safety; budget variance and the 80% WATCH threshold; CUT / RESET;
suggested-cut logic for Cut versus non-Cut categories; paycheck unassigned and
the negative warning; withholding math including missing inputs, zero remaining
paychecks and both directions; category-derived classification; refunds; CSV
parsing and duplicate detection; validation; session-cookie integrity; and
multi-user data isolation against a real database.

`npm run test:e2e` drives sign-in, transaction logging with derived
classification, budget decisions, the Cut List cap flow, paycheck
over-allocation, the withholding estimate, and the rule that unconfirmed bills
never count as spending.
