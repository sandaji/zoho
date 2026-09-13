import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind-safe className utility
 * - supports conditional classes
 * - merges Tailwind conflicting styles
 * - removes null/undefined/false
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Kenyan currency formatter
 * Safely coerces Prisma Decimal strings, null, and undefined to a number
 * so we never display "Ksh NaN".
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  const value = Number(amount ?? 0);
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
  }).format(isNaN(value) ? 0 : value);
}

/**
 * Safely format a date string or Date object.
 * Returns a fallback string instead of "Invalid Date".
 */
export function safeFormatDate(
  date: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-KE", options ?? { dateStyle: "short", timeStyle: "short" });
}
