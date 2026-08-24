"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Callout,
  Card,
  EmptyState,
  Field,
  Input,
  Select,
  TableShell,
  Td,
  Th,
} from "@/components/ui";
import { apiRequest } from "@/lib/client";
import { centsToInput, formatCents } from "@/lib/money";
import { confirmedMonthlyBillTotal, monthlyEquivalent, type CalcCategory } from "@/lib/calc";
import { BILL_FREQUENCIES } from "@/lib/labels";
import { formatDateLabel } from "@/lib/dates";

interface BillRow {
  id: string;
  merchant: string;
  categoryId: string;
  categoryName: string;
  expectedAmount: number | null;
  dueDay: number | null;
  nextDueDate: string | null;
  frequency: string;
  paymentMethodId: string | null;
  autopay: boolean;
  notes: string | null;
  confirmationStatus: string;
  source: string;
  active: boolean;
}

interface Draft {
  merchant: string;
  categoryId: string;
  expectedAmount: string;
  nextDueDate: string;
  frequency: string;
  paymentMethodId: string;
  autopay: boolean;
  notes: string;
  confirmationStatus: string;
}

function toDraft(bill: BillRow): Draft {
  return {
    merchant: bill.merchant,
    categoryId: bill.categoryId,
    expectedAmount: centsToInput(bill.expectedAmount),
    nextDueDate: bill.nextDueDate ?? "",
    frequency: bill.frequency,
    paymentMethodId: bill.paymentMethodId ?? "",
    autopay: bill.autopay,
    notes: bill.notes ?? "",
    confirmationStatus: bill.confirmationStatus,
  };
}

export function BillsManager({
  bills,
  categories,
  paymentMethods,
}: {
  bills: BillRow[];
  categories: CalcCategory[];
  paymentMethods: Array<{ id: string; name: string; active: boolean }>;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payAmount, setPayAmount] = useState("");

  const totals = useMemo(() => {
    const confirmed = confirmedMonthlyBillTotal(bills);
    const known = bills
      .filter((b) => b.active && b.expectedAmount !== null)
      .reduce((sum, b) => sum + monthlyEquivalent(b.expectedAmount ?? 0, b.frequency), 0);
    const unknown = bills.filter((b) => b.active && b.expectedAmount === null).length;
    const unconfirmed = bills.filter((b) => b.active && b.confirmationStatus !== "Confirmed").length;
    return { confirmed, known, unknown, unconfirmed };
  }, [bills]);

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

  function body(values: Draft) {
    return {
      merchant: values.merchant,
      categoryId: values.categoryId,
      expectedAmount: values.expectedAmount,
      nextDueDate: values.nextDueDate,
      frequency: values.frequency,
      paymentMethodId: values.paymentMethodId || null,
      autopay: values.autopay,
      notes: values.notes || null,
      confirmationStatus: values.confirmationStatus,
    };
  }

  const emptyDraft: Draft = {
    merchant: "",
    categoryId: categories[0]?.id ?? "",
    expectedAmount: "",
    nextDueDate: "",
    frequency: "Monthly",
    paymentMethodId: "",
    autopay: false,
    notes: "",
    confirmationStatus: "Confirmed",
  };

  return (
    <div className="space-y-6">
      {error && <Callout tone="danger">{error}</Callout>}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="mp-card bg-white p-4">
          <p className="mp-label">Confirmed monthly total</p>
          <p className="numeric text-2xl font-semibold text-charcoal">{formatCents(totals.confirmed)}</p>
          <p className="mt-1 text-xs text-body/70">Used by paycheck planning suggestions.</p>
        </div>
        <div className="mp-card bg-cream p-4">
          <p className="mp-label">Known amounts (all bills)</p>
          <p className="numeric text-2xl font-semibold text-charcoal">{formatCents(totals.known)}</p>
          <p className="mt-1 text-xs text-body/70">Incomplete while amounts are unknown.</p>
        </div>
        <div className="mp-card bg-rose p-4">
          <p className="mp-label">Still to confirm</p>
          <p className="numeric text-2xl font-semibold text-charcoal">{totals.unconfirmed}</p>
          <p className="mt-1 text-xs text-charcoal/70">{totals.unknown} missing an amount.</p>
        </div>
      </div>

      <Card
        title="Bills"
        action={
          <Button
            variant={adding ? "ghost" : "primary"}
            onClick={() => {
              setAdding((value) => !value);
              setDraft(adding ? null : emptyDraft);
              setEditingId(null);
            }}
          >
            {adding ? "Cancel" : "Add a bill"}
          </Button>
        }
      >
        {adding && draft && (
          <form
            className="mb-6 grid gap-4 rounded-xl border border-line bg-blush/60 p-4 sm:grid-cols-2 xl:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                await apiRequest("/api/bills", { method: "POST", body: body(draft) });
                setAdding(false);
                setDraft(null);
              });
            }}
          >
            <BillFields draft={draft} setDraft={setDraft} categories={categories} paymentMethods={paymentMethods} />
            <div className="flex items-end">
              <Button type="submit" disabled={busy}>
                Save bill
              </Button>
            </div>
          </form>
        )}

        {bills.length === 0 ? (
          <EmptyState title="No recurring bills yet">
            Add the bills you pay every month so Money Power can protect them in your paycheck plan.
          </EmptyState>
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Bill</Th>
                <Th>Category</Th>
                <Th align="right">Expected</Th>
                <Th>Due</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {bills.map((bill) => {
                const editing = editingId === bill.id && draft;
                if (editing) {
                  return (
                    <tr key={bill.id}>
                      <td colSpan={6} className="border-b border-line px-3 py-4">
                        <form
                          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                          onSubmit={(event) => {
                            event.preventDefault();
                            void run(async () => {
                              await apiRequest(`/api/bills/${bill.id}`, { method: "PATCH", body: body(draft) });
                              setEditingId(null);
                              setDraft(null);
                            });
                          }}
                        >
                          <BillFields
                            draft={draft}
                            setDraft={setDraft}
                            categories={categories}
                            paymentMethods={paymentMethods}
                          />
                          <div className="flex items-end gap-2">
                            <Button type="submit" disabled={busy}>
                              Save
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                setEditingId(null);
                                setDraft(null);
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={bill.id}>
                    <Td label="Bill">
                      <span className="font-medium text-charcoal">{bill.merchant}</span>
                      {bill.notes && <span className="block text-xs text-body/70">{bill.notes}</span>}
                    </Td>
                    <Td label="Category">{bill.categoryName}</Td>
                    <Td label="Expected" align="right">
                      <span className="numeric">
                        {bill.expectedAmount === null ? (
                          <span className="text-body/60">Unknown</span>
                        ) : (
                          formatCents(bill.expectedAmount)
                        )}
                      </span>
                    </Td>
                    <Td label="Due">
                      {bill.nextDueDate ? formatDateLabel(bill.nextDueDate) : <span className="text-body/60">Not set</span>}
                      <span className="block text-xs text-body/60">{bill.frequency}</span>
                    </Td>
                    <Td label="Status">
                      {bill.confirmationStatus === "Confirmed" ? (
                        <Badge tone="calm">Confirmed</Badge>
                      ) : (
                        <Badge tone="watch">Needs confirmation</Badge>
                      )}
                    </Td>
                    <Td label="Actions" align="right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditingId(bill.id);
                            setDraft(toDraft(bill));
                            setAdding(false);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setPayingId(payingId === bill.id ? null : bill.id);
                            setPayAmount(centsToInput(bill.expectedAmount));
                          }}
                        >
                          Record payment
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={busy}
                          onClick={() => void run(() => apiRequest(`/api/bills/${bill.id}`, { method: "DELETE" }))}
                        >
                          Delete
                        </Button>
                      </div>

                      {payingId === bill.id && (
                        <form
                          className="mt-3 flex flex-wrap items-end justify-end gap-2 text-left"
                          onSubmit={(event) => {
                            event.preventDefault();
                            void run(async () => {
                              await apiRequest(`/api/bills/${bill.id}/pay`, {
                                method: "POST",
                                body: { date: payDate, amount: payAmount },
                              });
                              setPayingId(null);
                            });
                          }}
                        >
                          <Field label="Paid on" className="w-40">
                            <Input
                              type="date"
                              required
                              value={payDate}
                              onChange={(event) => setPayDate(event.target.value)}
                            />
                          </Field>
                          <Field label="Amount" className="w-32">
                            <Input
                              required
                              inputMode="decimal"
                              value={payAmount}
                              onChange={(event) => setPayAmount(event.target.value)}
                              placeholder="0.00"
                            />
                          </Field>
                          <Button size="sm" type="submit" disabled={busy}>
                            Log it
                          </Button>
                        </form>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        )}
      </Card>
    </div>
  );
}

function BillFields({
  draft,
  setDraft,
  categories,
  paymentMethods,
}: {
  draft: Draft;
  setDraft: (draft: Draft) => void;
  categories: CalcCategory[];
  paymentMethods: Array<{ id: string; name: string; active: boolean }>;
}) {
  return (
    <>
      <Field label="Merchant or account">
        <Input
          required
          value={draft.merchant}
          onChange={(event) => setDraft({ ...draft, merchant: event.target.value })}
        />
      </Field>
      <Field label="Category">
        <Select
          required
          value={draft.categoryId}
          onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Expected amount" hint="Leave blank while it is unknown.">
        <Input
          inputMode="decimal"
          placeholder="0.00"
          value={draft.expectedAmount}
          onChange={(event) => setDraft({ ...draft, expectedAmount: event.target.value })}
        />
      </Field>
      <Field label="Next due date">
        <Input
          type="date"
          value={draft.nextDueDate}
          onChange={(event) => setDraft({ ...draft, nextDueDate: event.target.value })}
        />
      </Field>
      <Field label="Frequency">
        <Select
          value={draft.frequency}
          onChange={(event) => setDraft({ ...draft, frequency: event.target.value })}
        >
          {BILL_FREQUENCIES.map((frequency) => (
            <option key={frequency}>{frequency}</option>
          ))}
        </Select>
      </Field>
      <Field label="Payment method">
        <Select
          value={draft.paymentMethodId}
          onChange={(event) => setDraft({ ...draft, paymentMethodId: event.target.value })}
        >
          <option value="">Not set</option>
          {paymentMethods.map((method) => (
            <option key={method.id} value={method.id}>
              {method.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Confirmation">
        <Select
          value={draft.confirmationStatus}
          onChange={(event) => setDraft({ ...draft, confirmationStatus: event.target.value })}
        >
          <option value="NeedsConfirmation">Needs confirmation</option>
          <option value="Confirmed">Confirmed</option>
        </Select>
      </Field>
      <Field label="Notes">
        <Input value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
      </Field>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input
          type="checkbox"
          checked={draft.autopay}
          onChange={(event) => setDraft({ ...draft, autopay: event.target.checked })}
          className="h-4 w-4 rounded border-line"
        />
        Autopay
      </label>
    </>
  );
}
