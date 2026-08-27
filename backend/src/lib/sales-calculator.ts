/**
 * Sales Calculator — SINGLE SOURCE OF TRUTH for line-item and document totals.
 *
 * This module replaces the duplicated `calculateItemTotals` /
 * `calculateDocumentTotals` helper functions that were copy-pasted into:
 *   - modules/pos/service/sales.service.ts  (4 copies)
 *   - modules/pos/controller/prefixed-document.controller.ts  (calcItemTotals / calcDocumentTotals)
 *   - modules/pos/service/index.ts  (calculateSubtotal / calculateTax as instance methods)
 *
 * Rule: every place that computes item-level or document-level money must
 * call these functions — never reimplement inline.
 */

export interface LineItemInput {
  quantity: number;
  unitPrice: number;
  /**
   * As a decimal fraction (e.g. 0.16 for 16 % VAT).
   * Defaults to 0 when omitted.
   */
  taxRate?: number;
  /**
   * Absolute monetary discount on this line item (not a percentage).
   * Defaults to 0 when omitted.
   */
  discount?: number;
}

export interface LineItemTotals {
  subtotal: number;    // quantity × unitPrice (before tax, before discount)
  taxAmount: number;   // subtotal × taxRate   (tax is on the pre-discount base)
  discount: number;    // line-level discount amount (from input)
  total: number;       // subtotal + taxAmount − discount
  taxRate: number;     // echoed back for convenience
}

export interface DocumentTotals {
  subtotal: number;  // sum of line subtotals
  tax: number;       // sum of line taxAmounts
  discount: number;  // sum of line discounts (+ order-level discount, once applied)
  total: number;     // subtotal + tax − discount
}

/**
 * Compute all monetary fields for a single line item.
 *
 * Tax is applied to the pre-discount subtotal — the same convention used
 * throughout the original helpers.  If your jurisdiction requires tax on
 * the after-discount base, adjust taxAmount to `(subtotal - discount) * taxRate`.
 * 
 * All amounts are truncated (floored) to the nearest whole shilling — we
 * never round up a customer-facing charge.
 */
export function calculateItemTotals(item: LineItemInput): LineItemTotals {
  const subtotal = Math.floor(item.quantity * item.unitPrice);
  const taxRate = item.taxRate ?? 0;
  const taxAmount = Math.floor(subtotal * taxRate);
  const discount = Math.floor(item.discount ?? 0);
  const total = Math.floor(subtotal + taxAmount - discount);

  return { subtotal, taxAmount, discount, total, taxRate };
}

/**
 * Sum up line-item results into document-level totals.
 * All amounts are truncated (floored) to the nearest whole shilling.
 */
export function calculateDocumentTotals(
  lines: Pick<LineItemTotals, "subtotal" | "taxAmount" | "discount">[],
): DocumentTotals {
  let subtotal = 0;
  let tax = 0;
  let discount = 0;

  for (const line of lines) {
    subtotal += line.subtotal;
    tax += line.taxAmount;
    discount += line.discount;
  }

  const total = Math.floor(subtotal + tax - discount);
  return { subtotal, tax, discount, total };
}

/**
 * Apply a whole-order discount on top of already-summed line totals
 * (section 7B: "order-level discount" — separate from any per-item
 * discounts already folded into `totals`).
 *
 * The order discount is deducted from the document total the same way a
 * line-level discount is deducted from a line total — after tax, never
 * exceeding the total that's actually left to discount. It's folded into
 * `discount` so reporting (receipts, daily summaries) sees one combined
 * discount figure.
 *
 * All amounts are truncated (floored) to the nearest whole shilling.
 */
export function applyOrderDiscount(
  totals: DocumentTotals,
  orderDiscount: number,
): DocumentTotals {
  const requested = Math.floor(Math.max(0, orderDiscount || 0));
  // Never discount past zero — clamp to what's actually left on the total.
  const applied = Math.min(requested, totals.total);
  return {
    subtotal: totals.subtotal,
    tax: totals.tax,
    discount: totals.discount + applied,
    total: totals.total - applied,
  };
}

/**
 * Convenience: compute subtotal (no tax, no discount) from a list of items.
 * Mirrors the old PosService.calculateSubtotal instance method.
 * Amount is truncated (floored) to the nearest whole shilling.
 */
export function calculateSubtotal(
  items: Array<{ quantity: number; unitPrice: number }>,
): number {
  return Math.floor(items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0));
}

/**
 * Convenience: compute total tax across all items.
 * Mirrors the old PosService.calculateTax instance method.
 * Amount is truncated (floored) to the nearest whole shilling.
 */
export function calculateTax(
  items: Array<{
    quantity: number;
    unitPrice: number;
    taxRate?: number;
    discount?: number;
  }>,
): number {
  return Math.floor(items.reduce((sum, i) => {
    const sub = i.quantity * i.unitPrice;
    const disc = i.discount ?? 0;
    const taxable = sub - disc;
    const rate = i.taxRate ?? 0.16;
    return sum + taxable * rate;
  }, 0));
}
