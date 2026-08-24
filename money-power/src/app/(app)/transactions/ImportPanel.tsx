"use client";

import { useState } from "react";
import { Button, Callout, Card, EmptyState, TableShell, Td, Th } from "@/components/ui";
import { apiRequest } from "@/lib/client";
import { parseTransactionsCsv, type ParsedImportRow } from "@/lib/import";
import { formatCents, parseMoneyToCents } from "@/lib/money";
import { formatDateLabel } from "@/lib/dates";
import type { CalcCategory } from "@/lib/calc";

interface ImportResult {
  importedCount: number;
  duplicates: number[];
  errors: Array<{ row: number; message: string }>;
}

export function ImportPanel({
  categories,
  onImported,
}: {
  categories: CalcCategory[];
  onImported: () => void;
}) {
  const [rows, setRows] = useState<ParsedImportRow[]>([]);
  const [parseErrors, setParseErrors] = useState<Array<{ row: number; message: string }>>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const knownCategories = new Set(categories.map((c) => c.name.toLowerCase()));

  async function readFile(file: File) {
    setError(null);
    setResult(null);
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseTransactionsCsv(text);
    setRows(parsed.rows);
    setParseErrors(parsed.errors);
    if (parsed.rows.length === 0 && parsed.errors.length === 0) {
      setError("No rows found. The file needs date, merchant, category and amount columns.");
    }
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const response = await apiRequest<ImportResult>("/api/transactions/import", {
        method: "POST",
        body: { rows, skipDuplicates: true },
      });
      setResult(response);
      setRows([]);
      onImported();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  const unknownCategoryRows = rows.filter((row) => !knownCategories.has(row.categoryName.toLowerCase()));

  return (
    <Card
      title="Import transactions from CSV"
      description="Columns: date, merchant, category, amount, and optionally payment method and note."
    >
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold hover:bg-blush">
          Choose CSV file
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void readFile(file);
            }}
          />
        </label>
        {fileName && <span className="text-sm text-body/80">{fileName}</span>}
        <a
          className="text-sm font-semibold text-charcoal underline"
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(
            "date,merchant,category,amount,payment method,note\n2026-08-04,Kroger,Groceries,84.19,Debit Card,weekly shop\n",
          )}`}
          download="money-power-template.csv"
        >
          Download a template
        </a>
      </div>

      {error && (
        <div className="mt-4">
          <Callout tone="danger">{error}</Callout>
        </div>
      )}

      {parseErrors.length > 0 && (
        <div className="mt-4">
          <Callout tone="warning" title={`${parseErrors.length} row(s) skipped`}>
            <ul className="mt-1 list-disc pl-5">
              {parseErrors.slice(0, 5).map((issue) => (
                <li key={issue.row}>
                  Row {issue.row}: {issue.message}
                </li>
              ))}
            </ul>
          </Callout>
        </div>
      )}

      {unknownCategoryRows.length > 0 && (
        <div className="mt-4">
          <Callout tone="warning" title="Unknown categories">
            {unknownCategoryRows.length} row(s) use a category you do not have yet. Add it under
            Categories &amp; Lists first, or those rows will be reported as errors.
          </Callout>
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-4 space-y-4">
          <TableShell>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Merchant</Th>
                <Th>Category</Th>
                <Th align="right">Amount</Th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 20).map((row, index) => (
                <tr key={`${row.date}-${row.merchant}-${index}`}>
                  <Td label="Date">{formatDateLabel(row.date)}</Td>
                  <Td label="Merchant">{row.merchant}</Td>
                  <Td label="Category">{row.categoryName}</Td>
                  <Td label="Amount" align="right">
                    <span className="numeric">{formatCents(parseMoneyToCents(row.amount))}</span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          {rows.length > 20 && (
            <p className="text-xs text-body/70">Showing the first 20 of {rows.length} rows.</p>
          )}
          <Button onClick={submit} disabled={busy}>
            {busy ? "Importing…" : `Import ${rows.length} transaction${rows.length === 1 ? "" : "s"}`}
          </Button>
        </div>
      )}

      {result && (
        <div className="mt-4">
          <Callout tone="good" title={`Imported ${result.importedCount} transaction(s)`}>
            {result.duplicates.length > 0 && (
              <p>{result.duplicates.length} duplicate row(s) were skipped.</p>
            )}
            {result.errors.length > 0 && (
              <ul className="mt-1 list-disc pl-5">
                {result.errors.slice(0, 5).map((issue) => (
                  <li key={issue.row}>
                    Row {issue.row}: {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </Callout>
        </div>
      )}

      {rows.length === 0 && !result && !error && parseErrors.length === 0 && (
        <div className="mt-4">
          <EmptyState title="No file loaded">
            Choose a CSV to preview it before anything is saved.
          </EmptyState>
        </div>
      )}
    </Card>
  );
}
