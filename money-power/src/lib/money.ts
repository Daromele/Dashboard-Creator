/**
 * Money Power money handling.
 *
 * Every monetary value in this app is an integer number of cents. Binary
 * floating point is never used to hold or accumulate money. Parsing from user
 * input goes through string manipulation so that "0.1 + 0.2" style drift is
 * impossible.
 */

export const CENTS_PER_DOLLAR = 100;

/** Sum a list of cent amounts. */
export function sumCents(values: Array<number | null | undefined>): number {
  let total = 0;
  for (const v of values) {
    if (typeof v === "number" && Number.isFinite(v)) total += Math.trunc(v);
  }
  return total;
}

/**
 * Parse a user-entered money string into integer cents.
 * Accepts "1,234.56", "$1,234.56", "-12.5", "12", " " (=> null).
 * Returns null for blank input, and throws for genuinely invalid input so the
 * caller can surface a validation error.
 */
export function parseMoneyToCents(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") {
    if (!Number.isFinite(input)) throw new Error("Invalid amount");
    // Round half away from zero at the cent boundary.
    return Math.sign(input) * Math.round(Math.abs(input) * CENTS_PER_DOLLAR);
  }

  const raw = input.trim();
  if (raw === "") return null;

  const cleaned = raw.replace(/[$\s,]/g, "");
  const match = /^(-)?(\d*)(?:\.(\d*))?$/.exec(cleaned);
  if (!match || (match[2] === "" && (match[3] ?? "") === "")) {
    throw new Error(`"${input}" is not a valid amount`);
  }

  const negative = match[1] === "-";
  const whole = match[2] === "" ? "0" : match[2];
  const fractionRaw = match[3] ?? "";
  // Round to the nearest cent using the third decimal digit.
  const fraction = fractionRaw.padEnd(3, "0").slice(0, 3);
  let cents = Number(whole) * CENTS_PER_DOLLAR + Number(fraction.slice(0, 2));
  if (Number(fraction[2]) >= 5) cents += 1;

  return negative ? -cents : cents;
}

/** Like parseMoneyToCents but never throws — invalid input becomes null. */
export function tryParseMoneyToCents(input: string | number | null | undefined): number | null {
  try {
    return parseMoneyToCents(input);
  } catch {
    return null;
  }
}

/** Format integer cents as a currency string, e.g. 123456 -> "$1,234.56". */
export function formatCents(
  cents: number | null | undefined,
  options: { currency?: string; locale?: string; blank?: string; signed?: boolean } = {},
): string {
  const { currency = "USD", locale = "en-US", blank = "—", signed = false } = options;
  if (cents === null || cents === undefined || !Number.isFinite(cents)) return blank;
  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.trunc(cents) / CENTS_PER_DOLLAR);
  if (signed && cents > 0) return `+${formatted}`;
  return formatted;
}

/** Compact form used inside chart labels, e.g. 123456 -> "$1.2k". */
export function formatCentsCompact(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) return "—";
  const dollars = Math.trunc(cents) / CENTS_PER_DOLLAR;
  const abs = Math.abs(dollars);
  const sign = dollars < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}m`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

/** Editable text for a money input field. */
export function centsToInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) return "";
  return (Math.trunc(cents) / CENTS_PER_DOLLAR).toFixed(2);
}

/* ---------------------------------------------------------------------- *
 * Rates are stored as basis points (1 bp = 0.01%) so percentages are also
 * exact integers.
 * ---------------------------------------------------------------------- */

export function parsePercentToBasisPoints(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const raw = typeof input === "number" ? String(input) : input.trim().replace(/%/g, "");
  if (raw === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`"${input}" is not a valid percentage`);
  return Math.round(value * 100);
}

export function basisPointsToInput(bp: number | null | undefined): string {
  if (bp === null || bp === undefined || !Number.isFinite(bp)) return "";
  return String(Math.round(bp) / 100);
}

export function formatBasisPoints(bp: number | null | undefined, blank = "—"): string {
  if (bp === null || bp === undefined || !Number.isFinite(bp)) return blank;
  return `${(Math.round(bp) / 100).toFixed(bp % 100 === 0 ? 0 : 1)}%`;
}

/** Format a 0..1 ratio as a percentage string. */
export function formatRatio(ratio: number, digits = 0): string {
  if (!Number.isFinite(ratio)) return "0%";
  return `${(ratio * 100).toFixed(digits)}%`;
}

/** Apply a basis-point rate to a cent amount, rounding to the nearest cent. */
export function applyRate(cents: number, basisPoints: number): number {
  return Math.round((Math.trunc(cents) * Math.round(basisPoints)) / 10_000);
}
