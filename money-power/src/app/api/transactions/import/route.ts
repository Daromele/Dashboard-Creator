import { NextRequest } from "next/server";
import { handle, HttpError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseISODate } from "@/lib/dates";
import { importSchema } from "@/lib/validation";
import { duplicateKey } from "@/lib/import";

/**
 * Bulk CSV import. Unknown categories are rejected row-by-row rather than
 * silently guessed, and rows matching an existing date+merchant+amount are
 * reported as duplicates so nothing is double-counted.
 */
export async function POST(request: NextRequest) {
  return handle(async () => {
    const user = await requireUser();
    const { rows, skipDuplicates = true } = importSchema.parse(await request.json());

    const [categories, methods, existing] = await Promise.all([
      prisma.category.findMany({ where: { userId: user.id } }),
      prisma.paymentMethod.findMany({ where: { userId: user.id } }),
      prisma.transaction.findMany({
        where: { userId: user.id },
        select: { date: true, merchant: true, amount: true },
      }),
    ]);

    const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
    const methodByName = new Map(methods.map((m) => [m.name.toLowerCase(), m.id]));
    const existingKeys = new Set(existing.map((t) => duplicateKey(t.date, t.merchant, t.amount)));

    const imported: string[] = [];
    const duplicates: number[] = [];
    const errors: Array<{ row: number; message: string }> = [];

    for (const [index, row] of rows.entries()) {
      const categoryId = categoryByName.get(row.categoryName.toLowerCase());
      if (!categoryId) {
        errors.push({ row: index + 1, message: `Unknown category "${row.categoryName}"` });
        continue;
      }

      const date = parseISODate(row.date);
      const key = duplicateKey(date, row.merchant, row.amount);
      if (existingKeys.has(key)) {
        duplicates.push(index + 1);
        if (skipDuplicates) continue;
      }

      const created = await prisma.transaction.create({
        data: {
          userId: user.id,
          date,
          merchant: row.merchant,
          categoryId,
          amount: row.amount,
          paymentMethodId: row.paymentMethodName
            ? (methodByName.get(row.paymentMethodName.toLowerCase()) ?? null)
            : null,
          note: row.note ?? null,
          importSource: "csv",
        },
      });
      existingKeys.add(key);
      imported.push(created.id);
    }

    if (imported.length === 0 && errors.length > 0 && duplicates.length === 0) {
      throw new HttpError(errors[0].message, 422);
    }

    return { importedCount: imported.length, duplicates, errors };
  });
}
