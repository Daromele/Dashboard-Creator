"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Callout, Card, Input, TableShell, Td, Th } from "@/components/ui";
import { apiRequest } from "@/lib/client";
import { centsToInput, formatCents, formatRatio } from "@/lib/money";
import { DECISION_TONE } from "@/lib/labels";
import type { BudgetRow } from "@/lib/calc";

export function BudgetTable({ month, rows }: { month: string; rows: BudgetRow[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totals = rows.reduce(
    (accumulator, row) => ({
      plan: accumulator.plan + (row.plannedAmount ?? 0),
      actual: accumulator.actual + row.actual,
    }),
    { plan: 0, actual: 0 },
  );

  async function save(categoryId: string) {
    setBusyId(categoryId);
    setError(null);
    try {
      await apiRequest("/api/budgets", {
        method: "PUT",
        body: { month, categoryId, plannedAmount: drafts[categoryId] ?? "" },
      });
      setDrafts((current) => {
        const next = { ...current };
        delete next[categoryId];
        return next;
      });
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the plan");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && <Callout tone="danger">{error}</Callout>}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="mp-card p-4">
          <p className="mp-label">Total plan</p>
          <p className="numeric text-2xl font-semibold text-charcoal">{formatCents(totals.plan)}</p>
        </div>
        <div className="mp-card bg-rose p-4">
          <p className="mp-label">Total actual</p>
          <p className="numeric text-2xl font-semibold text-charcoal">{formatCents(totals.actual)}</p>
        </div>
        <div className={`mp-card p-4 ${totals.plan - totals.actual < 0 ? "bg-cut-bg" : "bg-sage"}`}>
          <p className="mp-label">Plan left</p>
          <p className="numeric text-2xl font-semibold text-charcoal">
            {formatCents(totals.plan - totals.actual)}
          </p>
        </div>
      </div>

      <Card title="Categories">
        <TableShell>
          <thead>
            <tr>
              <Th>Category</Th>
              <Th>Group</Th>
              <Th align="right">Monthly plan</Th>
              <Th align="right">Actual</Th>
              <Th align="right">Variance</Th>
              <Th align="right">% used</Th>
              <Th>Decision</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const draft = drafts[row.categoryId];
              const dirty = draft !== undefined && draft !== centsToInput(row.plannedAmount);
              return (
                <tr key={row.categoryId}>
                  <Td label="Category">
                    <span className="font-medium text-charcoal">{row.categoryName}</span>
                  </Td>
                  <Td label="Group">{row.group}</Td>
                  <Td label="Monthly plan" align="right">
                    <div className="flex items-center justify-end gap-2">
                      <Input
                        inputMode="decimal"
                        aria-label={`${row.categoryName} monthly plan`}
                        className="w-28 text-right"
                        placeholder="Blank"
                        value={draft ?? centsToInput(row.plannedAmount)}
                        onChange={(event) =>
                          setDrafts((current) => ({ ...current, [row.categoryId]: event.target.value }))
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") void save(row.categoryId);
                        }}
                      />
                      {dirty && (
                        <Button
                          size="sm"
                          disabled={busyId === row.categoryId}
                          onClick={() => void save(row.categoryId)}
                        >
                          Save
                        </Button>
                      )}
                    </div>
                  </Td>
                  <Td label="Actual" align="right">
                    <span className="numeric">{formatCents(row.actual)}</span>
                  </Td>
                  <Td label="Variance" align="right">
                    <span
                      className={`numeric ${
                        row.variance !== null && row.variance < 0 ? "font-semibold text-cut-text" : ""
                      }`}
                    >
                      {row.variance === null ? "—" : formatCents(row.variance)}
                    </span>
                  </Td>
                  <Td label="% used" align="right">
                    <span className="numeric">{formatRatio(row.percentUsed)}</span>
                  </Td>
                  <Td label="Decision">
                    <Badge tone={DECISION_TONE[row.decision]}>{row.decision}</Badge>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableShell>
        <p className="mt-3 text-xs text-body/70">
          Leave a plan blank while you have not decided. Enter 0 only when you mean a deliberate $0
          budget — anything spent against it reads as CUT / RESET.
        </p>
      </Card>
    </div>
  );
}
