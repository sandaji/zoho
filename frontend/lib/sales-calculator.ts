/**
 * Cart totals for the POS screen.
 *
 * This deliberately mirrors backend/src/shared/sales-calculator.ts so the total
 * shown to the cashier is the total the server will charge:
 *   - line subtotal = floor(qty * unitPrice)
 *   - line tax      = floor(subtotal * taxRate)   (on the PRE-discount amount)
 *   - line total    = floor(subtotal + tax - discount)
 *   - document totals are the sums of the lines
 *   - the whole-order discount is clamped to what is left to pay
 * If the backend rules change, change them here too. The server is the source of
 * truth: after a sale the receipt uses the server's figures.
 */
export interface CalcLine {
  quantity: number;
  unit_price: number;
  tax_rate: number;
  /** Absolute discount on the line. */
  discount: number;
}

export interface CartTotals {
  /** Sum of line subtotals (before tax and discounts). */
  subtotal: number;
  tax: number;
  /** Sum of per-line discounts (excludes the whole-order discount). */
  itemDiscount: number;
  /** Whole-order discount actually applied (after clamping). */
  orderDiscountApplied: number;
  grandTotal: number;
}

export function lineDiscount(line: CalcLine): number {
  const lineValue = Math.floor(line.quantity * line.unit_price);
  return Math.max(0, Math.min(Math.floor(line.discount || 0), lineValue));
}

export function computeCartTotals(
  lines: CalcLine[],
  orderDiscount: number,
): CartTotals {
  let subtotal = 0;
  let tax = 0;
  let itemDiscount = 0;
  let linesTotal = 0;

  for (const line of lines) {
    const lineSubtotal = Math.floor(line.quantity * line.unit_price);
    const lineTax = Math.floor(lineSubtotal * (line.tax_rate || 0));
    const discount = lineDiscount(line);
    subtotal += lineSubtotal;
    tax += lineTax;
    itemDiscount += discount;
    linesTotal += Math.floor(lineSubtotal + lineTax - discount);
  }

  const orderDiscountApplied = Math.max(
    0,
    Math.min(Math.floor(orderDiscount || 0), linesTotal),
  );

  return {
    subtotal,
    tax,
    itemDiscount,
    orderDiscountApplied,
    grandTotal: linesTotal - orderDiscountApplied,
  };
}
