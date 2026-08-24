import { describe, expect, it } from "vitest";
import {
  duplicateKey,
  findDuplicateRows,
  normaliseDate,
  parseCsv,
  parseTransactionsCsv,
} from "@/lib/import";
import { parseISODate } from "@/lib/dates";

describe("CSV parsing", () => {
  it("handles quoted fields, embedded commas and CRLF", () => {
    const table = parseCsv('a,b\r\n"one, two",three\r\n');
    expect(table).toEqual([
      ["a", "b"],
      ["one, two", "three"],
    ]);
  });

  it("handles escaped quotes", () => {
    expect(parseCsv('name\n"He said ""hi"""')).toEqual([["name"], ['He said "hi"']]);
  });

  it("maps common bank header names", () => {
    const result = parseTransactionsCsv(
      ["Date,Description,Category,Amount,Memo", "8/4/2026,Kroger,Groceries,\"$1,084.19\",weekly"].join("\n"),
    );
    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      {
        date: "2026-08-04",
        merchant: "Kroger",
        categoryName: "Groceries",
        amount: "1084.19",
        paymentMethodName: undefined,
        note: "weekly",
      },
    ]);
  });

  it("keeps refunds negative", () => {
    const result = parseTransactionsCsv("date,merchant,category,amount\n2026-08-04,Target,Shopping,-25.00");
    expect(result.rows[0].amount).toBe("-25");
  });

  it("reports rows without a valid date or amount instead of importing them", () => {
    const result = parseTransactionsCsv(
      [
        "date,merchant,category,amount",
        ",Kroger,Groceries,10.00",
        "2026-08-04,,Groceries,10.00",
        "2026-08-04,Kroger,Groceries,abc",
        "2026-08-04,Kroger,Groceries,10.00",
      ].join("\n"),
    );
    expect(result.rows).toHaveLength(1);
    expect(result.errors.map((e) => e.row)).toEqual([1, 2, 3]);
  });

  it("normalises date spellings", () => {
    expect(normaliseDate("2026-08-04")).toBe("2026-08-04");
    expect(normaliseDate("8/4/2026")).toBe("2026-08-04");
    expect(normaliseDate("08/04/26")).toBe("2026-08-04");
    expect(normaliseDate("nonsense")).toBeNull();
  });
});

describe("duplicate detection", () => {
  it("matches on the same day, merchant and amount", () => {
    expect(duplicateKey(parseISODate("2026-08-04"), " Kroger ", 8419)).toBe(
      duplicateKey("2026-08-04", "kroger", 8419),
    );
  });

  it("does not match a different amount or day", () => {
    expect(duplicateKey("2026-08-04", "Kroger", 8419)).not.toBe(
      duplicateKey("2026-08-04", "Kroger", 8420),
    );
    expect(duplicateKey("2026-08-05", "Kroger", 8419)).not.toBe(
      duplicateKey("2026-08-04", "Kroger", 8419),
    );
  });

  it("flags duplicates inside a single batch as well as against existing rows", () => {
    const existing = new Set([duplicateKey("2026-08-01", "T-Mobile", 30000)]);
    const rows = [
      { date: "2026-08-01", merchant: "T-Mobile", amount: 30000 },
      { date: "2026-08-04", merchant: "Kroger", amount: 8419 },
      { date: "2026-08-04", merchant: "Kroger", amount: 8419 },
    ];
    expect(findDuplicateRows(rows, existing)).toEqual([0, 2]);
  });
});
