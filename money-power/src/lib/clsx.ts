/** Tiny class-name joiner (keeps the bundle free of a dependency for this). */
export type ClassValue = string | number | bigint | false | null | undefined;

export function clsx(...parts: ClassValue[]): string {
  return parts.filter((part): part is string => typeof part === "string" && part !== "").join(" ");
}
