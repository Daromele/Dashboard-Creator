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
import { formatDateLabel, formatMonthLabel, monthKeyOf, parseISODate } from "@/lib/dates";
import { WASTE_FLAG_TONE } from "@/lib/labels";
import type { CalcCategory } from "@/lib/calc";
import { ImportPanel } from "./ImportPanel";

interface Row {
  id: string;
  date: string;
  merchant: string;
  categoryId: string;
  amount: number;
  paymentMethodId: string | null;
  note: string | null;
  importSource: string | null;
}

interface Draft {
  date: string;
  merchant: string;
  categoryId: string;
  amount: string;
  paymentMethodId: string;
  note: string;
}

export function TransactionsManager({
  selectedMonth,
  categories,
  paymentMethods,
  transactions,
}: {
  selectedMonth: string;
  categories: CalcCategory[];
  paymentMethods: Array<{ id: string; name: string; active: boolean }>;
  transactions: Row[];
}) {
  const router = useRouter();
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const methodById = useMemo(() => new Map(paymentMethods.map((m) => [m.id, m])), [paymentMethods]);

  const today = new Date().toISOString().slice(0, 10);
  const emptyDraft: Draft = {
    date: today,
    merchant: "",
    categoryId: categories[0]?.id ?? "",
    amount: "",
    paymentMethodId: "",
    note: "",
  };

  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [flagFilter, setFlagFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState<"selected" | "all">("selected");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const derived = categoryById.get(draft.categoryId);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (monthFilter === "selected" && monthKeyOf(parseISODate(t.date)) !== selectedMonth) return false;
      if (categoryFilter && t.categoryId !== categoryFilter) return false;
      if (flagFilter && categoryById.get(t.categoryId)?.wasteFlag !== flagFilter) return false;
      if (term) {
        const haystack = `${t.merchant} ${t.note ?? ""} ${categoryById.get(t.categoryId)?.name ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [transactions, monthFilter, selectedMonth, categoryFilter, flagFilter, search, categoryById]);

  const filteredTotal = filtered.reduce((sum, t) => sum + t.amount, 0);

  // Same day, same merchant, same amount — flagged so nothing is counted twice.
  const duplicateIds = useMemo(() => {
    const seen = new Map<string, string>();
    const duplicates = new Set<string>();
    for (const t of [...transactions].reverse()) {
      const key = `${t.date}|${t.merchant.trim().toLowerCase()}|${t.amount}`;
      if (seen.has(key)) duplicates.add(t.id);
      else seen.set(key, t.id);
    }
    return duplicates;
  }, [transactions]);

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

  function draftBody(values: Draft) {
    return {
      date: values.date,
      merchant: values.merchant,
      categoryId: values.categoryId,
      amount: values.amount,
      paymentMethodId: values.paymentMethodId || null,
      note: values.note || null,
    };
  }

  return (
    <div className="space-y-6">
      {error && <Callout tone="danger">{error}</Callout>}

      <Card title="Log a purchase">
        <form
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6"
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              await apiRequest("/api/transactions", { method: "POST", body: draftBody(draft) });
              setDraft({ ...emptyDraft, date: draft.date });
            });
          }}
        >
          <Field label="Date">
            <Input
              type="date"
              required
              value={draft.date}
              onChange={(event) => setDraft({ ...draft, date: event.target.value })}
            />
          </Field>
          <Field label="Merchant">
            <Input
              required
              value={draft.merchant}
              onChange={(event) => setDraft({ ...draft, merchant: event.target.value })}
              placeholder="Kroger"
            />
          </Field>
          <Field label="Category">
            <Select
              required
              value={draft.categoryId}
              onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}
            >
              {categories
                .filter((category) => category.active !== false)
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Amount" hint="Use a minus sign for a refund.">
            <Input
              required
              inputMode="decimal"
              placeholder="0.00"
              value={draft.amount}
              onChange={(event) => setDraft({ ...draft, amount: event.target.value })}
            />
          </Field>
          <Field label="Payment method">
            <Select
              value={draft.paymentMethodId}
              onChange={(event) => setDraft({ ...draft, paymentMethodId: event.target.value })}
            >
              <option value="">Not set</option>
              {paymentMethods
                .filter((method) => method.active)
                .map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Note">
            <Input value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} />
          </Field>

          <div className="sm:col-span-2 xl:col-span-6 flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={busy}>
              Add transaction
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowImport((value) => !value)}>
              {showImport ? "Close import" : "Import CSV"}
            </Button>
            {derived && (
              <p className="text-sm text-body/80">
                Auto-filled: <strong className="text-charcoal">{derived.group}</strong> ·{" "}
                <strong className="text-charcoal">{derived.needWant}</strong> ·{" "}
                <Badge tone={WASTE_FLAG_TONE[derived.wasteFlag]}>{derived.wasteFlag}</Badge>
              </p>
            )}
          </div>
        </form>
      </Card>

      {showImport && (
        <ImportPanel
          categories={categories}
          onImported={() => {
            setShowImport(false);
            router.refresh();
          }}
        />
      )}

      <Card
        title={`Transactions — ${monthFilter === "selected" ? formatMonthLabel(selectedMonth) : "all time"}`}
        description={`${filtered.length} shown · ${formatCents(filteredTotal)} total`}
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Search">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Merchant, note or category"
            />
          </Field>
          <Field label="Category">
            <Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Waste signal">
            <Select value={flagFilter} onChange={(event) => setFlagFilter(event.target.value)}>
              <option value="">All signals</option>
              <option value="Cut">Cut</option>
              <option value="Watch">Watch</option>
              <option value="Core">Core</option>
              <option value="Protected">Protected</option>
            </Select>
          </Field>
          <Field label="Period">
            <Select
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value as "selected" | "all")}
            >
              <option value="selected">{formatMonthLabel(selectedMonth)}</option>
              <option value="all">All time</option>
            </Select>
          </Field>
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="Nothing here yet">
            Log a purchase above, or import a CSV from your bank.
          </EmptyState>
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Merchant</Th>
                <Th>Category</Th>
                <Th>Group</Th>
                <Th>Signal</Th>
                <Th align="right">Amount</Th>
                <Th>Method</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((transaction) => {
                const category = categoryById.get(transaction.categoryId);
                const editing = editingId === transaction.id && editDraft;

                if (editing) {
                  return (
                    <tr key={transaction.id}>
                      <td colSpan={8} className="border-b border-line px-3 py-4">
                        <form
                          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"
                          onSubmit={(event) => {
                            event.preventDefault();
                            void run(async () => {
                              await apiRequest(`/api/transactions/${transaction.id}`, {
                                method: "PATCH",
                                body: draftBody(editDraft),
                              });
                              setEditingId(null);
                              setEditDraft(null);
                            });
                          }}
                        >
                          <Field label="Date">
                            <Input
                              type="date"
                              value={editDraft.date}
                              onChange={(event) => setEditDraft({ ...editDraft, date: event.target.value })}
                            />
                          </Field>
                          <Field label="Merchant">
                            <Input
                              value={editDraft.merchant}
                              onChange={(event) => setEditDraft({ ...editDraft, merchant: event.target.value })}
                            />
                          </Field>
                          <Field label="Category">
                            <Select
                              value={editDraft.categoryId}
                              onChange={(event) => setEditDraft({ ...editDraft, categoryId: event.target.value })}
                            >
                              {categories.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.name}
                                </option>
                              ))}
                            </Select>
                          </Field>
                          <Field label="Amount">
                            <Input
                              inputMode="decimal"
                              value={editDraft.amount}
                              onChange={(event) => setEditDraft({ ...editDraft, amount: event.target.value })}
                            />
                          </Field>
                          <Field label="Payment method">
                            <Select
                              value={editDraft.paymentMethodId}
                              onChange={(event) =>
                                setEditDraft({ ...editDraft, paymentMethodId: event.target.value })
                              }
                            >
                              <option value="">Not set</option>
                              {paymentMethods.map((method) => (
                                <option key={method.id} value={method.id}>
                                  {method.name}
                                </option>
                              ))}
                            </Select>
                          </Field>
                          <Field label="Note">
                            <Input
                              value={editDraft.note}
                              onChange={(event) => setEditDraft({ ...editDraft, note: event.target.value })}
                            />
                          </Field>
                          <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-6">
                            <Button type="submit" disabled={busy}>
                              Save
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                setEditingId(null);
                                setEditDraft(null);
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
                  <tr
                    key={transaction.id}
                    className={category?.wasteFlag === "Cut" ? "bg-cut-bg/40" : category?.wasteFlag === "Watch" ? "bg-watch-bg/40" : ""}
                  >
                    <Td label="Date">{formatDateLabel(transaction.date)}</Td>
                    <Td label="Merchant">
                      <span className="font-medium text-charcoal">{transaction.merchant}</span>
                      {duplicateIds.has(transaction.id) && (
                        <Badge tone="watch" className="ml-2">
                          Possible duplicate
                        </Badge>
                      )}
                      {transaction.note && <span className="block text-xs text-body/70">{transaction.note}</span>}
                    </Td>
                    <Td label="Category">{category?.name ?? "—"}</Td>
                    <Td label="Group">{category?.group ?? "—"}</Td>
                    <Td label="Signal">
                      {category && <Badge tone={WASTE_FLAG_TONE[category.wasteFlag]}>{category.wasteFlag}</Badge>}
                    </Td>
                    <Td label="Amount" align="right">
                      <span
                        className={`numeric font-semibold ${
                          transaction.amount < 0 ? "text-sage-deep" : "text-charcoal"
                        }`}
                      >
                        {formatCents(transaction.amount)}
                      </span>
                      {transaction.amount < 0 && <span className="block text-xs text-body/70">Refund</span>}
                    </Td>
                    <Td label="Method">
                      {transaction.paymentMethodId
                        ? (methodById.get(transaction.paymentMethodId)?.name ?? "—")
                        : "—"}
                    </Td>
                    <Td label="Actions" align="right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditingId(transaction.id);
                            setEditDraft({
                              date: transaction.date,
                              merchant: transaction.merchant,
                              categoryId: transaction.categoryId,
                              amount: centsToInput(transaction.amount),
                              paymentMethodId: transaction.paymentMethodId ?? "",
                              note: transaction.note ?? "",
                            });
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={busy}
                          onClick={() =>
                            void run(() =>
                              apiRequest(`/api/transactions/${transaction.id}`, { method: "DELETE" }),
                            )
                          }
                        >
                          Delete
                        </Button>
                      </div>
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
