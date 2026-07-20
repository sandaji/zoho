# POS Module — Enterprise Readiness Audit & Refactor Roadmap

**Scope reviewed:** `frontend/app/dashboard/pos/**`, `frontend/components/pos/**`, `backend/src/modules/pos/**`
**Benchmark:** Odoo POS (multi-terminal retail, offline-capable, GL-integrated)
**Audience:** Coding agent doing the refactor. Each item names exact files/functions so no re-discovery is needed.

---

## 1. Fix first — correctness bugs & dead code paths

These aren't "nice to have," they're active defects sitting in production-shaped code.

1. **Hardcoded tax rate on add-to-cart.**
   `frontend/app/dashboard/pos/page.tsx` → `addToCart()` sets `tax_rate: 0.16` unconditionally instead of using `product.tax_rate` from the search result. Any product with a different VAT class (zero-rated, exempt, different rate) will be invoiced wrong. This is a tax-compliance bug, not cosmetic.

2. **Two parallel sales architectures still coexist.**
   `pos.controller.ts` mixes a legacy `PosService` (`this.posService`) with the new static `SalesService`. Half the endpoints are marked `⚠️ USING LEGACY SERVICE` or `⚠️ NOT YET IMPLEMENTED` in the docblocks themselves:
   - `updateSales` — TODO, not implemented against `SalesDocument`
   - `getDailySummary` — legacy service
   - `getReceipt` — legacy service, TODO to migrate
   - `approveDiscount` — legacy service, TODO to migrate
   Pick one model (`SalesDocument`, since it's clearly the direction of travel — GL-integrated, prefix-aware, credit-note-aware) and finish the migration. Delete `PosService` once nothing references it. Running two sources of truth for sales data is the single biggest risk to data integrity in this module.

3. **Reconciliation button is a stub.**
   `page.tsx` → `onReconcileClick={() => toast("Reconciliation can only be done by managers", "info")}`. There's no reconciliation flow at all — it's a toast pretending to be a feature. Cashier session reconciliation (expected vs. actual cash, over/short reporting) needs a real implementation; the `SessionStatusCard`/`CloseSessionDialog` scaffolding already exists to build on.

4. **No idempotency on sale creation.**
   `handleCheckout()` POSTs to `POS_SALES` with no idempotency key. A double-click, a slow network retry, or a POS terminal reconnect after a dropped response can create duplicate `SalesDocument`s and double-deduct stock. Add a client-generated UUID (`Idempotency-Key` header) and have `SalesService.createPOSSale` (and `PrefixedDocumentController.createPrefixedInvoice`) upsert against it.

5. **N+1 queries in stock deduction.**
   `prefixed-document.controller.ts` → `createPrefixedInvoice()`, the FIFO batch-depletion loop does a `findUnique` + `update` on `Inventory` and `BranchInventory` *per batch per item*, inside the transaction. At real POS volume (multiple terminals, baskets of 10–20 SKUs) this is a lot of round-trips inside a single DB transaction and increases lock contention/timeout risk. Batch these into fewer queries (`findMany` up front, single `updateMany`/bulk write, or a stored procedure) — this is also called out as a scaling risk for a multi-branch enterprise rollout.

6. **Ad hoc role checks instead of RBAC middleware.**
   `sales.controller.ts` → `approveCreditNote()` hardcodes `const allowedRoles = ["admin", "super_admin", "manager"]` inline instead of using the existing `requirePermission(code)` middleware pattern documented for this codebase. Same risk pattern likely applies elsewhere — grep for other inline `role ===` / `allowedRoles` checks in the POS/sales controllers and route them through RBAC consistently, or permission drift will happen silently as roles evolve.

---

## 2. Missing for real retail floor use (functional gaps vs. Odoo POS)

7. **No barcode scanner input path.** `AutocompleteProductSearch.tsx` is a text/autocomplete box. Real POS scanners act as keyboard-wedge (HID) input firing fast keystrokes + Enter, or need a dedicated camera-scan mode on tablets. Add scan-detection (fast keystroke burst heuristic) and route it straight to `addToCart` by exact SKU/barcode match, bypassing the debounce used for typed search.



9. **No split/multi-tender payment.** `POSPayment.tsx` only allows one `paymentMethod` per sale. Real retail needs "pay 2000 cash + 3000 M-Pesa" in one transaction. `createPOSSaleSchema` and `SalesService.createPOSSale` would need to accept an array of `{method, amount}` tenders instead of a single `payment_method`/`amount_paid` pair; the `Payment` model creation logic in `prefixed-document.controller.ts` already creates one `Payment` row per call — extend to loop over tenders.

10. **No dedicated returns/exchange screen.** Backend already supports credit notes (`SalesService.createCreditNote`, `approveCreditNote`), but there's no POS UI to scan a receipt, select returned items, and issue a credit/refund at the till. This is a core retail POS function — build `POSReturn.tsx` against the existing credit-note endpoints rather than a purely back-office workflow.

11. **No "recall parked/held sale" UI.** `parkSale`/`holdSale` endpoints and handlers exist in `page.tsx`, but there's no list/search UI to bring a parked sale back into the cart. Right now sales can be parked but effectively not resumed from the POS screen — check if this exists elsewhere (`POSDocuments.tsx`/`POSHistory.tsx`) and if not, it's a gap that makes the park/hold feature nearly unusable.

12. **No promotions/pricing engine.** Discounts are manual, line-by-line, percentage-or-amount (`updateDiscount` in `page.tsx`). No BOGO, tiered quantity pricing, customer-group price lists, or time-bound promotions — all standard in Odoo POS. If multi-branch/enterprise retail is the goal, a pricing-rules service (evaluated server-side at checkout, not just client-computed) will eventually be needed so promotions can't be bypassed by a modified client request.




15. **No loyalty/gift card support** — common in enterprise retail POS, absent here (`Customer` model referenced but no points/wallet fields visible in this module).

---

## 3. Architecture upgrades for multi-branch/enterprise scale

16. **Consolidate on `SalesDocument`** (see #2) as the single sales model — this also cleans up the two-controller split between `POSController` (legacy-leaning) and `SalesController`/`PrefixedDocumentController` (current). Decide: is `POSController` still needed at all, or should `/pos/*` routes simply proxy to `SalesController`? Right now a coding agent reading this module has to know which of three controllers owns a given endpoint.

17. **Event-driven audit trail.** Currently sale creation just does `logger.info(...)`. For enterprise multi-branch operations you'll want a proper audit/activity trail (who voided what, discount overrides, stock overrides) queryable per document — not just structured logs. Given `backend/src/subscribers` already exists as a pattern in this codebase, emit domain events (`sale.created`, `sale.voided`, `discount.overridden`, `stock.overridden`) from `SalesService` and let subscribers handle audit logging, GL posting confirmation, and notifications, rather than inlining side effects in controllers.

18. **Server-side total recalculation everywhere.** Good news: `sales.validation.ts` already notes `total` is "computed server-side; accept it from the client but never rely on it" — confirm this discipline is actually followed in every write path (especially `createPrefixedInvoice`, which does trust `item.taxRate` from the client via `calcItemTotals(item, productTaxRate)` — verify client-supplied `taxRate` can't override the product's real rate, tying back to bug #1).

19. **Multi-terminal concurrency.** With multiple cashiers per branch, verify stock deduction (`StockValidationService`, FIFO batch loop) is safe under concurrent checkouts — the `prisma.$transaction` with a 20s timeout in `createPrefixedInvoice` helps, but under real concurrent load with many small `findUnique`/`update` round-trips (see #5) that timeout could start getting hit. Load-test this specifically before rollout.

20. **Testing.** Wasn't in scope of this file-level review, but worth confirming: are there integration tests around checkout, void, credit-note, and stock-deduction paths? These are the highest-blast-radius code paths in the whole ERP (money + inventory) and deserve the most test coverage, especially before the `SalesService` migration in #2 is completed.

---

## Suggested execution order for the coding agent

1. Fix #1 (tax rate bug) — 5 minutes, real money impact.
2. Fix #4 (idempotency) — prevents duplicate sales/stock double-deduction, cheap to add.
3. Finish #2 (retire legacy `PosService`, complete `SalesService` migration for `updateSales`, `getDailySummary`, `getReceipt`, `approveDiscount`).
4. Fix #5 (batch the FIFO deduction queries) and #19 (concurrency test) together — they're the same subsystem.
5. Build #6 (RBAC consistency pass) as a search-and-replace style task across POS/sales controllers.
6. Then tackle functional gaps (#7–#15) in order of what the business actually needs first — likely barcode input (#7), split payment (#9), and returns UI (#11) before promotions engine or loyalty, which are bigger scope.
7. Treat #14 (eTIMS) as a separate compliance workstream with business sign-off, not a routine refactor task.

---

*This module already has solid bones for enterprise use: double-entry GL integration via `AccountingService`, branch-scoped RBAC isolation checks, FIFO stock batches, cashier session tracking, and a prefix-aware document numbering system most retail ERPs don't bother building. The gaps above are mostly about finishing the migration that's clearly already in progress, closing correctness holes, and adding the handful of floor-level retail features (offline, split tender, returns, barcode) that separate a back-office sales module from an actual point-of-sale terminal.*