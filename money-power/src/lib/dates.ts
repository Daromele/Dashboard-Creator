/**
 * Date helpers.
 *
 * Calendar-only values (transaction dates, paydays, due dates) are stored as
 * SQL DATE and handled at UTC midnight so that a user's timezone can never
 * shift a transaction into the previous or next month.
 */

export type MonthKey = string; // "YYYY-MM"

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isMonthKey(value: string): value is MonthKey {
  return MONTH_RE.test(value);
}

/** Parse "YYYY-MM-DD" into a UTC-midnight Date. */
export function parseISODate(value: string): Date {
  if (!DATE_RE.test(value)) throw new Error(`"${value}" is not a YYYY-MM-DD date`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`"${value}" is not a valid date`);
  return date;
}

/** Format a Date as "YYYY-MM-DD" using its UTC parts. */
export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The "YYYY-MM" a date belongs to. */
export function monthKeyOf(date: Date): MonthKey {
  return date.toISOString().slice(0, 7);
}

/** True when the date falls inside the given calendar month. */
export function isInMonth(date: Date, month: MonthKey): boolean {
  return monthKeyOf(date) === month;
}

/** Inclusive start / exclusive end bounds for a calendar month. */
export function monthRange(month: MonthKey): { start: Date; end: Date } {
  if (!isMonthKey(month)) throw new Error(`"${month}" is not a YYYY-MM month`);
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  return {
    start: new Date(Date.UTC(year, monthIndex, 1)),
    end: new Date(Date.UTC(year, monthIndex + 1, 1)),
  };
}

/** Shift a month key by a number of months. */
export function addMonths(month: MonthKey, delta: number): MonthKey {
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1 + delta;
  const date = new Date(Date.UTC(year, monthIndex, 1));
  return monthKeyOf(date);
}

/** "August 2026" */
export function formatMonthLabel(month: MonthKey, locale = "en-US"): string {
  const { start } = monthRange(month);
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(start);
}

/** "Aug 24, 2026" */
export function formatDateLabel(date: Date | string | null | undefined, locale = "en-US"): string {
  if (!date) return "—";
  const value = typeof date === "string" ? parseISODate(date.slice(0, 10)) : date;
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

/** Whole days between two calendar dates (b - a). */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** The current month key in UTC. */
export function currentMonthKey(now: Date = new Date()): MonthKey {
  return monthKeyOf(now);
}
