/**
 * Shared Money Utilities (Frontend)
 * Single source of truth for money calculations and currency formatting
 */

export type MoneyInput = number | string | { toString(): string } | null | undefined;

export function toMoneyNumber(val: MoneyInput): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const parsed = parseFloat(val.toString());
  return isNaN(parsed) ? 0 : parsed;
}

export function roundCurrency(val: MoneyInput, decimals: number = 2): number {
  const num = toMoneyNumber(val);
  const factor = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * factor) / factor;
}

export function sum(...amounts: MoneyInput[]): number {
  const total = amounts.reduce<number>((acc, curr) => acc + toMoneyNumber(curr), 0);
  return roundCurrency(total);
}

export function subtract(a: MoneyInput, b: MoneyInput): number {
  return roundCurrency(toMoneyNumber(a) - toMoneyNumber(b));
}

export function multiply(amount: MoneyInput, factor: MoneyInput): number {
  return roundCurrency(toMoneyNumber(amount) * toMoneyNumber(factor));
}

export function percentage(amount: MoneyInput, percent: MoneyInput): number {
  const amt = toMoneyNumber(amount);
  const pct = toMoneyNumber(percent);
  return roundCurrency((amt * pct) / 100);
}

export function vat(
  amount: MoneyInput,
  rate: number = 15,
  isInclusive: boolean = false
): { net: number; vat: number; gross: number } {
  const amt = toMoneyNumber(amount);
  if (isInclusive) {
    const net = roundCurrency(amt / (1 + rate / 100));
    const vatAmount = roundCurrency(amt - net);
    return { net, vat: vatAmount, gross: amt };
  } else {
    const vatAmount = percentage(amt, rate);
    const gross = roundCurrency(amt + vatAmount);
    return { net: amt, vat: vatAmount, gross };
  }
}

export function discount(
  amount: MoneyInput,
  discountVal: MoneyInput,
  type: "percent" | "fixed" = "fixed"
): number {
  const amt = toMoneyNumber(amount);
  const val = toMoneyNumber(discountVal);

  if (type === "percent") {
    const discountAmount = percentage(amt, val);
    return roundCurrency(Math.max(0, amt - discountAmount));
  } else {
    return roundCurrency(Math.max(0, amt - val));
  }
}

export function formatCurrency(amount: MoneyInput, currency: string = "USD"): string {
  const num = roundCurrency(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}
