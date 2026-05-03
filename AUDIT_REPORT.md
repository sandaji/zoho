7# POS System Audit Report

**Date:** April 29, 2026  
**Scope:** Frontend (Next.js) & Backend (Prisma/Express) Integration  
**Status:** Comprehensive audit completed

---

## Executive Summary

This audit identified **4 critical bugs**, **6 broken stubs**, **5+ missing features**, and **1 dead component** across the POS system. The most severe issues directly break core functionality: cashier sessions are non-functional, checkout receipts show wrong branch data, and unauthenticated SSR requests occur on every page load.

**Severity Distribution:**

- 🔴 **Critical (4):** Core functionality broken, user-facing data loss/errors
- 🟡 **High (6):** Visible UI elements that don't work
- 🔵 **Medium (5+):** Missing features, unimplemented flows

---

## 🔴 Critical Bugs (Fix First)

### 1. **Cashier Sessions API Route Mismatch**

**File:** [frontend/hooks/cashier/useCashierSession.ts](frontend/hooks/cashier/useCashierSession.ts)  
**Severity:** CRITICAL  
**Impact:** Entire session lifecycle is non-functional; every open/close request silently 404s

**Problem:**

- Hook calls `/api/cashier/sessions/...` (Next.js API route)
- Actual backend API is at `/v1/cashier/sessions/...`
- No error handling for 404 responses
- Sessions are never persisted to database

**Evidence:**

```typescript
// Current (broken)
fetch('/api/cashier/sessions/open', ...)  // Route doesn't exist

// Should be
fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/cashier/sessions/open`, ...)
```

**Fix Priority:** 1/4 (blocks all POS operations)  
**Effort:** 15 min

---

### 2. **Checkout Receipt Missing Branch Data**

**File:** [frontend/components/pos/POSSaleSuccess.tsx](frontend/components/pos/POSSaleSuccess.tsx)  
**Severity:** CRITICAL  
**Impact:** Receipt always shows company defaults instead of actual branch

**Problem:**

- After checkout, `lastSale` object is built manually without copying `json.data.branch` from API response
- `branch` value comes from env vars instead of actual transaction branch
- Receipts are printed/emailed with wrong location info

**Evidence:**

```typescript
// Current
const lastSale = {
  id: response.data.id,
  amount: response.data.total,
  // Missing: branch from response.data.branch
};

// Should include
branch: response.data.branch,
```

**Fix Priority:** 2/4 (data integrity issue)  
**Effort:** 10 min

---

### 3. **Discount Dialog State Leak Across Cart Items**

**File:** [frontend/components/pos/POSCart.tsx](frontend/components/pos/POSCart.tsx)  
**Severity:** CRITICAL  
**Impact:** Applying discount to one item applies to all items; users can't apply targeted discounts

**Problem:**

- Discount dialog state is managed at cart level, not item level
- Opening discount for Item A and setting 10% applies to entire cart
- No per-item discount support despite UI suggesting it

**Fix Priority:** 3/4 (functional but incorrect behavior)  
**Effort:** 45 min (requires state restructure)

---

### 4. **Unauthenticated SSR Requests Without Token**

**Files:**

- [frontend/components/dashboard/DashboardWidget.tsx](frontend/components/dashboard/DashboardWidget.tsx)
- [frontend/components/pos/POSCheckout.tsx](frontend/components/pos/POSCheckout.tsx)
- [frontend/hooks/use-permissions.ts](frontend/hooks/use-permissions.ts)
- (+ 1 more component)

**Severity:** CRITICAL  
**Impact:** 4 components call `getAuthHeaders()` without checking for token during SSR hydration; fires unauthenticated requests on every page load

**Problem:**

- `getAuthHeaders()` returns undefined token during SSR
- Components don't check for token existence before making requests
- Fails silently on server side, then re-requests on client

**Evidence:**

```typescript
// Current (broken during SSR)
const headers = getAuthHeaders(); // undefined on server
fetch(url, { headers }); // Sends without Authorization header

// Should check
const token = getAuthHeaders();
if (!token) return null; // Skip request during SSR
fetch(url, { headers: token });
```

**Fix Priority:** 4/4 (performance/security issue)  
**Effort:** 30 min

---

## 🟡 Broken Stubs (Visible but Non-Functional)

### 5. **Park Sale Button**

**File:** [frontend/components/pos/POSCheckout.tsx](frontend/components/pos/POSCheckout.tsx)  
**Status:** Hard-coded disabled or fires "Not implemented" toast

**Fix Effort:** 45 min (backend endpoint exists, needs frontend wiring)

---

### 6. **Hold Sale Button**

**File:** [frontend/components/pos/POSCheckout.tsx](frontend/components/pos/POSCheckout.tsx)  
**Status:** Hard-coded disabled or fires "Not implemented" toast

**Fix Effort:** 45 min (backend endpoint exists, needs frontend wiring)

---

### 7. **Email Receipt Button**

**File:** [frontend/components/pos/POSSaleSuccess.tsx](frontend/components/pos/POSSaleSuccess.tsx)  
**Status:** Renders as disabled button

**Backend Endpoint Available:** POST `/v1/sales/{id}/email`  
**Fix Effort:** 20 min

---

### 8. **Download PDF Receipt Button**

**File:** [frontend/components/pos/POSSaleSuccess.tsx](frontend/components/pos/POSSaleSuccess.tsx)  
**Status:** Renders as disabled button

**Backend Endpoint Available:** GET `/v1/sales/{id}/pdf`  
**Fix Effort:** 15 min

---

### 9. **Export Button in Sales History**

**File:** [frontend/components/pos/POSSalesHistory.tsx](frontend/components/pos/POSSalesHistory.tsx)  
**Status:** Shows "Not implemented" toast

**Backend Endpoint Available:** GET `/v1/sales/export`  
**Fix Effort:** 25 min

---

### 10. **Eye/Print Buttons on Sales History Rows**

**File:** [frontend/components/pos/POSSalesHistory.tsx](frontend/components/pos/POSSalesHistory.tsx)  
**Status:** Links to `/pos/sales/:id` which doesn't exist as a route

**Related Issue:** Missing individual sale detail page (see #3 under Missing Features)  
**Fix Effort:** 60 min (requires new route + detail component)

---

## 🔵 Missing Features (Not Present)

### 11. **Barcode Scanner Integration**

**File:** [frontend/components/pos/POSInventory.tsx](frontend/components/pos/POSInventory.tsx)  
**Status:** Placeholder comment exists; no implementation

**Scope:**

- Scanner input event listeners
- SKU lookup and add-to-cart
- Duplicate item handling (increment qty vs add new)

**Backend Support:** ✓ Exists  
**Effort:** 2-3 hours

---

### 12. **Split Payment / Multi-Tender Support**

**Files:**

- [frontend/components/pos/POSCheckout.tsx](frontend/components/pos/POSCheckout.tsx)
- [frontend/lib/api-client.ts](frontend/lib/api-client.ts)

**Status:** No UI or API calls for multiple payment methods

**Scope:**

- UI to add multiple payment lines
- Amount allocation per tender
- Validation that sum equals total

**Backend Support:** ✗ Needs implementation  
**Effort:** 4-5 hours (frontend + backend)

---

### 13. **Refund/Return Flow**

**Backend Status:** CREDIT_NOTE type exists in database  
**Frontend Status:** No UI to initiate refunds

**Scope:**

- Refund trigger from sales history
- Reason selection
- Amount (full vs partial)
- Approval workflow (if configured)

**Backend Endpoints:** Exist but untested  
**Effort:** 3-4 hours

---

### 14. **Manager Approval for Large Discounts**

**Backend Status:** Endpoint exists at POST `/v1/discounts/approve`  
**Frontend Status:** No UI trigger

**Scope:**

- Discount amount threshold
- Approval request modal
- Manager review interface
- Notification integration

**Effort:** 2-3 hours (mostly frontend)

---

### 15. **Individual Sale Detail Page**

**Route:** Missing `/pos/sales/:id`  
**Status:** Multiple components link to this route (Eye icon in history, Print buttons)

**Scope:**

- Detail view of single transaction
- Receipt display
- Actions: print, email, refund, return
- Related transactions

**Effort:** 1.5-2 hours

---

## 🗑️ Dead Code

### 16. **Duplicate PostSaleSuccessModal.tsx**

**File:** [frontend/components/pos/PostSaleSuccessModal.tsx](frontend/components/pos/PostSaleSuccessModal.tsx)  
**Status:** Never imported anywhere; duplicates POSSaleSuccess.tsx

**Action:** Remove or consolidate with POSSaleSuccess.tsx  
**Effort:** 15 min

---

## Recommendations & Prioritization

### Phase 1: Critical Bug Fixes (2-3 hours)

**Must fix before any further development:**

1. Cashier sessions API route (15 min)
2. Checkout branch data (10 min)
3. Unauthenticated SSR requests (30 min)
4. Discount state architecture (45 min)

### Phase 2: Broken Stubs Enablement (3-4 hours)

**Quick wins that unblock existing backend endpoints:**

- Email Receipt + Download PDF (35 min)
- Export Sales History (25 min)
- Sales Detail Page (2 hours) — enables Eye/Print buttons
- Park/Hold Sale (90 min)

### Phase 3: Missing Features (8-10 hours)

**Requires more development; prioritize by business value:**

1. Barcode Scanner (highest ROI for POS speed)
2. Refund/Return Flow (regulatory requirement)
3. Manager Approval (controls discount abuse)
4. Split Payment (business requirement for mixed tenders)

---

## Audit Methodology

✓ Traced API calls from frontend components to backend endpoints  
✓ Verified environment variable usage and routing  
✓ Checked component imports and dead code  
✓ Cross-referenced frontend routes with Next.js app structure  
✓ Reviewed cashier session and checkout workflows  
✓ Identified missing UI controls and broken state management

---

## Next Steps

1. **Create GitHub Issues** from the issues list below
2. **Assign Phase 1 fixes** to sprint
3. **Update test coverage** after critical bugs are fixed
4. **Regression test** cashier session workflow end-to-end
5. **Plan Phase 2 enablement** as parallel track

---

_Audit conducted: April 29, 2026_
