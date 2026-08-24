"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Callout, Card, EmptyState, Field, Input } from "@/components/ui";
import { apiRequest } from "@/lib/client";
import { applyRate, centsToInput, formatCents, tryParseMoneyToCents } from "@/lib/money";
import { formatDateLabel } from "@/lib/dates";

interface PlanRow {
  id: string;
  payday: string;
  netPay: number;
  billsEssentials: number;
  savings: number;
  debtExtra: number;
  flexibleSpending: number;
  cashCushion: number;
}

interface Draft {
  payday: string;
  netPay: string;
  billsEssentials: string;
  savings: string;
  debtExtra: string;
  flexibleSpending: string;
  cashCushion: string;
}

const ALLOCATION_FIELDS: Array<{ key: keyof Draft; label: string; hint?: string }> = [
  { key: "billsEssentials", label: "Bills & essentials" },
  { key: "savings", label: "Savings" },
  { key: "debtExtra", label: "Extra debt payment" },
  { key: "flexibleSpending", label: "Flexible spending" },
  { key: "cashCushion", label: "Cash cushion" },
];

function draftFromPlan(plan: PlanRow): Draft {
  return {
    payday: plan.payday,
    netPay: centsToInput(plan.netPay),
    billsEssentials: centsToInput(plan.billsEssentials),
    savings: centsToInput(plan.savings),
    debtExtra: centsToInput(plan.debtExtra),
    flexibleSpending: centsToInput(plan.flexibleSpending),
    cashCushion: centsToInput(plan.cashCushion),
  };
}

function unassignedOf(draft: Draft): number {
  const net = tryParseMoneyToCents(draft.netPay) ?? 0;
  const allocated = ALLOCATION_FIELDS.reduce(
    (sum, field) => sum + (tryParseMoneyToCents(draft[field.key]) ?? 0),
    0,
  );
  return net - allocated;
}

export function PaycheckManager({
  plans,
  nextPayday,
  takeHomePayPerCheck,
  savingsRateTarget,
  minimumCashCushion,
  confirmedBillTotal,
  billsDue,
}: {
  plans: PlanRow[];
  nextPayday: string | null;
  takeHomePayPerCheck: number | null;
  savingsRateTarget: number | null;
  minimumCashCushion: number | null;
  confirmedBillTotal: number;
  billsDue: Array<{
    id: string;
    merchant: string;
    nextDueDate: string;
    expectedAmount: number | null;
    confirmationStatus: string;
  }>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft | null>(null);

  const suggestedSavings = takeHomePayPerCheck && savingsRateTarget
    ? applyRate(takeHomePayPerCheck, savingsRateTarget)
    : 0;

  const [newDraft, setNewDraft] = useState<Draft>({
    payday: nextPayday ?? new Date().toISOString().slice(0, 10),
    netPay: centsToInput(takeHomePayPerCheck),
    billsEssentials: "",
    savings: suggestedSavings ? centsToInput(suggestedSavings) : "",
    debtExtra: "",
    flexibleSpending: "",
    cashCushion: centsToInput(minimumCashCushion),
  });
  const [adding, setAdding] = useState(false);

  const sorted = useMemo(() => [...plans].sort((a, b) => a.payday.localeCompare(b.payday)), [plans]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function body(draft: Draft) {
    return {
      payday: draft.payday,
      netPay: draft.netPay || "0",
      billsEssentials: draft.billsEssentials || "0",
      savings: draft.savings || "0",
      debtExtra: draft.debtExtra || "0",
      flexibleSpending: draft.flexibleSpending || "0",
      cashCushion: draft.cashCushion || "0",
    };
  }

  function billsDueBeforeNext(payday: string): typeof billsDue {
    const upcoming = sorted.map((p) => p.payday).filter((day) => day > payday);
    const until = upcoming[0] ?? null;
    return billsDue.filter((bill) => bill.nextDueDate >= payday && (until === null || bill.nextDueDate < until));
  }

  return (
    <div className="space-y-6">
      {error && <Callout tone="danger">{error}</Callout>}

      <Card
        title="Plan a paycheck"
        description={
          confirmedBillTotal > 0
            ? `Your confirmed bills total ${formatCents(confirmedBillTotal)} a month.`
            : "Confirm your recurring bills to get a bills-and-essentials suggestion."
        }
        action={
          <Button variant={adding ? "ghost" : "primary"} onClick={() => setAdding((value) => !value)}>
            {adding ? "Cancel" : "New paycheck plan"}
          </Button>
        }
      >
        {adding ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                await apiRequest("/api/paychecks", { method: "POST", body: body(newDraft) });
                setAdding(false);
              });
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="Payday">
                <Input
                  type="date"
                  required
                  value={newDraft.payday}
                  onChange={(event) => setNewDraft({ ...newDraft, payday: event.target.value })}
                />
              </Field>
              <Field label="Net pay">
                <Input
                  required
                  inputMode="decimal"
                  value={newDraft.netPay}
                  onChange={(event) => setNewDraft({ ...newDraft, netPay: event.target.value })}
                  placeholder="0.00"
                />
              </Field>
              {ALLOCATION_FIELDS.map((field) => (
                <Field
                  key={field.key}
                  label={field.label}
                  hint={
                    field.key === "savings" && suggestedSavings
                      ? `Suggested ${formatCents(suggestedSavings)}`
                      : field.key === "cashCushion" && minimumCashCushion
                        ? `Minimum ${formatCents(minimumCashCushion)}`
                        : undefined
                  }
                >
                  <Input
                    inputMode="decimal"
                    value={newDraft[field.key]}
                    onChange={(event) => setNewDraft({ ...newDraft, [field.key]: event.target.value })}
                    placeholder="0.00"
                  />
                </Field>
              ))}
            </div>

            <UnassignedBar draft={newDraft} />

            {billsDueBeforeNext(newDraft.payday).length > 0 && (
              <Callout tone="neutral" title="Bills due before your next paycheck">
                <ul className="mt-1 space-y-1">
                  {billsDueBeforeNext(newDraft.payday).map((bill) => (
                    <li key={bill.id} className="flex justify-between gap-4">
                      <span>
                        {bill.merchant} · {formatDateLabel(bill.nextDueDate)}
                        {bill.confirmationStatus !== "Confirmed" && " (unconfirmed)"}
                      </span>
                      <span className="numeric">
                        {bill.expectedAmount === null ? "Amount unknown" : formatCents(bill.expectedAmount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Callout>
            )}

            <Button type="submit" disabled={busy}>
              Save paycheck plan
            </Button>
          </form>
        ) : (
          <p className="text-sm text-body/80">
            {sorted.length === 0
              ? "No paychecks planned yet."
              : `${sorted.length} paycheck plan${sorted.length === 1 ? "" : "s"} saved.`}
          </p>
        )}
      </Card>

      {sorted.length === 0 && !adding && (
        <EmptyState title="Allocate your next paycheck">
          Plan a paycheck and the dashboard will start reporting your Next Check Left.
        </EmptyState>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {sorted.map((plan) => {
          const editing = editingId === plan.id && editDraft;
          const draft = editing ? editDraft : draftFromPlan(plan);
          const unassigned = unassignedOf(draft);
          const isNext = nextPayday === plan.payday;

          return (
            <Card
              key={plan.id}
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {formatDateLabel(plan.payday)}
                  {isNext && (
                    <span className="rounded-full bg-gold/20 px-2 py-0.5 text-xs font-semibold text-[#7a5f2f]">
                      Next payday
                    </span>
                  )}
                </span>
              }
              action={
                editing ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          await apiRequest(`/api/paychecks/${plan.id}`, {
                            method: "PATCH",
                            body: body(editDraft),
                          });
                          setEditingId(null);
                          setEditDraft(null);
                        })
                      }
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(null);
                        setEditDraft(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditingId(plan.id);
                        setEditDraft(draftFromPlan(plan));
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={busy}
                      onClick={() => void run(() => apiRequest(`/api/paychecks/${plan.id}`, { method: "DELETE" }))}
                    >
                      Delete
                    </Button>
                  </div>
                )
              }
            >
              {editing ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Payday">
                    <Input
                      type="date"
                      value={editDraft.payday}
                      onChange={(event) => setEditDraft({ ...editDraft, payday: event.target.value })}
                    />
                  </Field>
                  <Field label="Net pay">
                    <Input
                      inputMode="decimal"
                      value={editDraft.netPay}
                      onChange={(event) => setEditDraft({ ...editDraft, netPay: event.target.value })}
                    />
                  </Field>
                  {ALLOCATION_FIELDS.map((field) => (
                    <Field key={field.key} label={field.label}>
                      <Input
                        inputMode="decimal"
                        value={editDraft[field.key]}
                        onChange={(event) => setEditDraft({ ...editDraft, [field.key]: event.target.value })}
                      />
                    </Field>
                  ))}
                </div>
              ) : (
                <dl className="space-y-2 text-sm">
                  <Line label="Net pay" value={plan.netPay} strong />
                  {ALLOCATION_FIELDS.map((field) => (
                    <Line
                      key={field.key}
                      label={field.label}
                      value={tryParseMoneyToCents(draft[field.key]) ?? 0}
                    />
                  ))}
                </dl>
              )}

              <div className="mt-4">
                <UnassignedBar draft={draft} />
              </div>

              {unassigned > 0 && !editing && (
                <p className="mt-2 text-xs text-body/70">
                  Aim for zero — assign the rest, or keep it deliberately as extra cushion.
                </p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Line({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line/60 pb-1.5">
      <dt className={strong ? "font-semibold text-charcoal" : ""}>{label}</dt>
      <dd className={`numeric ${strong ? "font-semibold text-charcoal" : ""}`}>{formatCents(value)}</dd>
    </div>
  );
}

function UnassignedBar({ draft }: { draft: Draft }) {
  const unassigned = unassignedOf(draft);
  if (unassigned < 0) {
    return (
      <Callout tone="danger" title="Over-allocated">
        This paycheck assigns {formatCents(Math.abs(unassigned))} more than it brings home. Pull an
        allocation back before payday.
      </Callout>
    );
  }
  return (
    <Callout tone={unassigned === 0 ? "good" : "neutral"} title={`Unassigned ${formatCents(unassigned)}`}>
      {unassigned === 0
        ? "Zero-based: every dollar has a job."
        : "Assign the rest, or keep it on purpose as extra cushion."}
    </Callout>
  );
}
