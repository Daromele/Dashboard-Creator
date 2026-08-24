/**
 * CSV parsing and duplicate detection for transaction import.
 *
 * The parser is deliberately small and dependency-free: it handles quoted
 * fields, embedded commas, escaped quotes and CRLF line endings.
 */

import { toISODate } from "./dates";
import { parseMoneyToCents } from "./money";

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export interface ParsedImportRow {
  date: string;
  merchant: string;
  categoryName: string;
  amount: string;
  paymentMethodName?: string;
  note?: string;
}

const HEADER_ALIASES: Record<string, keyof ParsedImportRow> = {
  date: "date",
  "transaction date": "date",
  posted: "date",
  merchant: "merchant",
  description: "merchant",
  payee: "merchant",
  name: "merchant",
  category: "categoryName",
  "budget category": "categoryName",
  amount: "amount",
  debit: "amount",
  "payment method": "paymentMethodName",
  method: "paymentMethodName",
  note: "note",
  notes: "note",
  memo: "note",
};

/** Normalise a variety of date spellings to YYYY-MM-DD. */
export function normaliseDate(value: string): string | null {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(trimmed);
  if (slash) {
    const [, month, day, yearRaw] = slash;
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) return toISODate(parsed);
  return null;
}

export interface CsvParseResult {
  rows: ParsedImportRow[];
  errors: Array<{ row: number; message: string }>;
  headers: string[];
}

/** Turn CSV text into import rows, reporting per-row problems. */
export function parseTransactionsCsv(text: string): CsvParseResult {
  const table = parseCsv(text);
  if (table.length === 0) return { rows: [], errors: [{ row: 0, message: "The file is empty" }], headers: [] };

  const headers = table[0].map((h) => h.trim().toLowerCase());
  const mapping = headers.map((h) => HEADER_ALIASES[h] ?? null);
  const rows: ParsedImportRow[] = [];
  const errors: Array<{ row: number; message: string }> = [];

  for (let i = 1; i < table.length; i += 1) {
    const cells = table[i];
    const record: Partial<ParsedImportRow> = {};
    mapping.forEach((field, index) => {
      if (field) record[field] = (cells[index] ?? "").trim();
    });

    const date = record.date ? normaliseDate(record.date) : null;
    if (!date) {
      errors.push({ row: i, message: "A valid date is required" });
      continue;
    }
    if (!record.merchant) {
      errors.push({ row: i, message: "Merchant is required" });
      continue;
    }
    if (!record.categoryName) {
      errors.push({ row: i, message: "Category is required" });
      continue;
    }
    let amount: number | null;
    try {
      amount = parseMoneyToCents(record.amount ?? "");
    } catch {
      amount = null;
    }
    if (amount === null) {
      errors.push({ row: i, message: "A valid amount is required" });
      continue;
    }

    rows.push({
      date,
      merchant: record.merchant,
      categoryName: record.categoryName,
      amount: String(amount / 100),
      paymentMethodName: record.paymentMethodName || undefined,
      note: record.note || undefined,
    });
  }

  return { rows, errors, headers: table[0].map((h) => h.trim()) };
}

/** Duplicate detection key: same day, same merchant, same amount. */
export function duplicateKey(date: Date | string, merchant: string, amount: number): string {
  const day = typeof date === "string" ? date.slice(0, 10) : toISODate(date);
  return `${day}|${merchant.trim().toLowerCase()}|${amount}`;
}

/** Rows within a batch that duplicate each other or an existing transaction. */
export function findDuplicateRows(
  rows: Array<{ date: string; merchant: string; amount: number }>,
  existingKeys: Set<string>,
): number[] {
  const seen = new Set(existingKeys);
  const duplicates: number[] = [];
  rows.forEach((row, index) => {
    const key = duplicateKey(row.date, row.merchant, row.amount);
    if (seen.has(key)) duplicates.push(index);
    else seen.add(key);
  });
  return duplicates;
}
