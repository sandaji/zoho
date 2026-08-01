/**
 * Shared Money Utilities
 * Provides precise financial arithmetic and currency formatting without raw Number/parseFloat calls
 */

export type MoneyInput = number | string | { toString(): string } | null | undefined;

/**
 * Normalizes input money value to a clean number safely
 */
export function toMoneyNumber(val: MoneyInput): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const parsed = parseFloat(val.toString());
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Rounds currency to specified decimals (default 2)
 */
export function roundCurrency(val: MoneyInput, decimals: number = 2): number {
  const num = toMoneyNumber(val);
  const factor = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * factor) / factor;
}

/**
 * Sums an array of money values safely
 */
export function sum(...amounts: MoneyInput[]): number {
  const total = amounts.reduce<number>((acc, curr) => acc + toMoneyNumber(curr), 0);
  return roundCurrency(total);
}

/**
 * Subtracts b from a safely: a - b
 */
export function subtract(a: MoneyInput, b: MoneyInput): number {
  return roundCurrency(toMoneyNumber(a) - toMoneyNumber(b));
}

/**
 * Multiplies an amount by a multiplier/factor safely
 */
export function multiply(amount: MoneyInput, factor: MoneyInput): number {
  return roundCurrency(toMoneyNumber(amount) * toMoneyNumber(factor));
}

/**
 * Calculates percentage of an amount (e.g. 15% of 100 = 15)
 */
export function percentage(amount: MoneyInput, percent: MoneyInput): number {
  const amt = toMoneyNumber(amount);
  const pct = toMoneyNumber(percent);
  return roundCurrency((amt * pct) / 100);
}

/**
 * Calculates VAT components for an amount
 * @param amount Base or total amount
 * @param rate VAT rate in percentage (e.g. 15 for 15%)
 * @param isInclusive Whether the input amount includes VAT
 */
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

/**
 * Applies discount to an amount
 * @param amount Subtotal amount
 * @param discountVal Discount amount or percentage value
 * @param type 'percent' or 'fixed'
 */
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

/**
 * Formats money value for output with currency symbol
 */
export function formatCurrency(amount: MoneyInput, currency: string = "USD"): string {
  const num = roundCurrency(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}
