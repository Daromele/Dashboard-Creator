"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Callout, Card, EmptyState, Input, TableShell, Td, Th } from "@/components/ui";
import { apiRequest } from "@/lib/client";
import { centsToInput, formatCents, tryParseMoneyToCents } from "@/lib/money";
import { WASTE_FLAG_TONE } from "@/lib/labels";
import type { CutListRow } from "@/lib/calc";

export function CutListTable({ month, rows }: { month: string; rows: CutListRow[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recoverable = rows.reduce((sum, row) => sum + row.suggestedCut, 0);

  async function save(row: CutListRow, options: { confirmCap?: boolean } = {}) {
    setBusyId(row.categoryId);
    setError(null);
    const suggested = drafts[row.categoryId] ?? centsToInput(row.suggestedCut);
    const suggestedCents = tryParseMoneyToCents(suggested) ?? 0;
    const newCap =
      row.plannedAmount === null ? 0 : Math.max(0, row.plannedAmount - suggestedCents);

    try {
      await apiRequest("/api/budgets", {
        method: "PUT",
        body: {
          month,
          categoryId: row.categoryId,
          userSuggestedCut: suggested,
          ...(options.confirmCap
            ? { confirmedNewCap: centsToInput(newCap), plannedAmount: centsToInput(newCap) }
            : {}),
        },
      });
      setDrafts((current) => {
        const next = { ...current };
        delete next[row.categoryId];
        return next;
      });
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save");
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <EmptyState title="Nothing to cut yet">
        Log transactions for this month and Money Power will rank what is actually worth cutting.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      {error && <Callout tone="danger">{error}</Callout>}

      <Callout tone={recoverable > 0 ? "warning" : "good"} title="Recoverable this month">
        {recoverable > 0
          ? `${formatCents(recoverable)} across ${rows.filter((row) => row.suggestedCut > 0).length} categor${
              rows.filter((row) => row.suggestedCut > 0).length === 1 ? "y" : "ies"
            }. Start at the top.`
          : "Nothing is over plan and no CUT categories have spending. Keep going."}
      </Callout>

      <Card title="Ranked cuts">
        <TableShell>
          <thead>
            <tr>
              <Th>Category</Th>
              <Th>Signal</Th>
              <Th align="right">Monthly plan</Th>
              <Th align="right">Actual</Th>
              <Th align="right">Overspend</Th>
              <Th align="right">Suggested cut</Th>
              <Th align="right">New cap</Th>
              <Th align="right">Action</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const draft = drafts[row.categoryId] ?? centsToInput(row.suggestedCut);
              const draftCents = tryParseMoneyToCents(draft) ?? 0;
              const newCap =
                row.plannedAmount === null ? null : Math.max(0, row.plannedAmount - draftCents);
              return (
                <tr key={row.categoryId} className={row.signal === "Cut" ? "bg-cut-bg/40" : ""}>
                  <Td label="Category">
                    <span className="font-medium text-charcoal">{row.categoryName}</span>
                    {row.isProtected && (
                      <span className="block text-xs text-body/70">Protected — cuts stay conservative</span>
                    )}
                    {row.confirmedNewCap !== null && (
                      <span className="block text-xs text-sage-deep">
                        Cap confirmed at {formatCents(row.confirmedNewCap)}
                      </span>
                    )}
                  </Td>
                  <Td label="Signal">
                    <Badge tone={WASTE_FLAG_TONE[row.signal]}>{row.signal}</Badge>
                  </Td>
                  <Td label="Monthly plan" align="right">
                    <span className="numeric">
                      {row.plannedAmount === null ? "Blank" : formatCents(row.plannedAmount)}
                    </span>
                  </Td>
                  <Td label="Actual" align="right">
                    <span className="numeric">{formatCents(row.actual)}</span>
                  </Td>
                  <Td label="Overspend" align="right">
                    <span className="numeric">{formatCents(row.overspend)}</span>
                  </Td>
                  <Td label="Suggested cut" align="right">
                    <Input
                      inputMode="decimal"
                      aria-label={`${row.categoryName} suggested cut`}
                      className="w-28 text-right"
                      value={draft}
                      onChange={(event) =>
                        setDrafts((current) => ({ ...current, [row.categoryId]: event.target.value }))
                      }
                    />
                    {row.userSuggestedCut === null && row.defaultSuggestedCut > 0 && (
                      <span className="block text-xs text-body/70">
                        Suggested {formatCents(row.defaultSuggestedCut)}
                      </span>
                    )}
                  </Td>
                  <Td label="New cap" align="right">
                    <span className="numeric font-semibold text-charcoal">
                      {newCap === null ? "Set a plan first" : formatCents(newCap)}
                    </span>
                  </Td>
                  <Td label="Action" align="right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busyId === row.categoryId}
                        onClick={() => void save(row)}
                      >
                        Save cut
                      </Button>
                      <Button
                        size="sm"
                        disabled={busyId === row.categoryId || row.plannedAmount === null}
                        onClick={() => void save(row, { confirmCap: true })}
                      >
                        Accept new cap
                      </Button>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableShell>
        <p className="mt-3 text-xs text-body/70">
          Accepting a cap sets this month&apos;s plan for that category to the new cap and records it as confirmed. Core and
          Protected categories are never pushed below their overspend.
        </p>
      </Card>
    </div>
  );
}
