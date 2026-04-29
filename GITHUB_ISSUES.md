# GitHub Issues - POS Audit

## CRITICAL ISSUES

---

### Issue #1: Cashier Sessions API Route Mismatch

**Severity:** 🔴 CRITICAL  
**Priority:** P0 - Blocks POS Operations  
**Component:** Cashier Session Hook  
**Labels:** `bug`, `critical`, `cashier`, `api`

**Description:**

The cashier session lifecycle is completely non-functional. The `useCashierSession` hook calls `/api/cashier/sessions/...` which is a Next.js API route that doesn't exist, instead of calling the backend API at `/v1/cashier/sessions/...`. This causes every session open and close request to silently 404.

**Steps to Reproduce:**

1. Open POS
2. Click "Open Cashier Session"
3. Check browser network tab — request goes to `/api/cashier/sessions/open`
4. Request returns 404
5. No error displayed to user
6. Session is never persisted

**Expected Behavior:**

- Request should go to `/v1/cashier/sessions/open` (backend API)
- Response should be stored in session state
- User should see success confirmation

**Current Behavior:**

- Request hits wrong endpoint
- 404 response is silently ignored
- Session state never updates

**Files Affected:**

- `frontend/hooks/cashier/useCashierSession.ts`
- `frontend/lib/api-client.ts`

**Root Cause:**

```typescript
// WRONG
fetch('/api/cashier/sessions/open', { ... })

// RIGHT
fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/cashier/sessions/open`, { ... })
```

**Solution:**
Update all cashier session API calls to use the correct backend URL with proper error handling.

**Acceptance Criteria:**

- [ ] Session open request succeeds and returns session data
- [ ] Session close request succeeds and persists
- [ ] Error messages display if requests fail
- [ ] Manual testing confirms end-to-end session workflow

**Effort:** 15 minutes  
**Assigned to:** @developer

---

### Issue #2: Checkout Receipt Missing Branch Data

**Severity:** 🔴 CRITICAL  
**Priority:** P0 - Data Integrity  
**Component:** POSSaleSuccess  
**Labels:** `bug`, `critical`, `checkout`, `data-integrity`

**Description:**

After a successful checkout, the `lastSale` object is built manually without copying the `branch` field from the API response. This causes receipts to always display the company defaults from environment variables instead of the actual branch where the transaction occurred.

**Impact:**

- Customers receive receipts with wrong branch/location info
- Multiple branch locations appear as single location
- Data integrity issue on permanent receipt records

**Example:**

```
Expected Branch: "NYC Store (Branch #2)"
Actual Receipt Shows: "Zoho Company Name (from env var)"
```

**Files Affected:**

- `frontend/components/pos/POSSaleSuccess.tsx`

**Root Cause:**

```typescript
// CURRENT (WRONG)
const lastSale = {
  id: response.data.id,
  amount: response.data.total,
  items: response.data.items,
  // Missing: branch data
};

// SHOULD BE
const lastSale = {
  id: response.data.id,
  amount: response.data.total,
  items: response.data.items,
  branch: response.data.branch, // ADD THIS
};
```

**Solution:**
Copy the `branch` object from the API response to the `lastSale` object. The backend is already returning this data.

**Acceptance Criteria:**

- [ ] `branch` data is captured from checkout response
- [ ] Receipt displays actual branch name/details
- [ ] Verified with multi-branch testing
- [ ] Email and PDF receipts also show correct branch

**Effort:** 10 minutes  
**Assigned to:** @developer

---

### Issue #3: Discount Dialog State Leak Across Cart Items

**Severity:** 🔴 CRITICAL  
**Priority:** P0 - Incorrect Business Logic  
**Component:** POSCart  
**Labels:** `bug`, `critical`, `discount`, `state-management`

**Description:**

When applying a discount to a cart item, the discount is applied to all items in the cart instead of just the selected item. This is due to discount dialog state being managed at the cart level rather than the item level.

**Steps to Reproduce:**

1. Add multiple items to cart (Item A: $100, Item B: $200)
2. Click discount icon on Item A
3. Apply 10% discount to Item A
4. **BUG:** Both Item A and Item B show 10% discount
5. **EXPECTED:** Only Item A should have 10% discount

**Impact:**

- Users cannot apply targeted discounts
- Prices are incorrectly reduced
- Revenue loss due to unintended discounts

**Files Affected:**

- `frontend/components/pos/POSCart.tsx`
- `frontend/components/pos/POSCartItem.tsx`

**Root Cause:**
Discount modal state is stored in parent cart component instead of individual items.

**Solution:**
Refactor discount state to be per-item:

1. Move discount state from cart to individual cart items
2. Pass item-specific handlers to discount dialog
3. Apply discount only to target item

**Acceptance Criteria:**

- [ ] Discount can be applied to individual items without affecting others
- [ ] Each item tracks its own discount amount/percentage
- [ ] Cart total correctly sums individual discounts
- [ ] Checkout correctly processes per-item discounts
- [ ] Manual testing: verify discounts don't leak across items

**Effort:** 45 minutes  
**Assigned to:** @developer

---

### Issue #4: Unauthenticated SSR Requests During Hydration

**Severity:** 🔴 CRITICAL  
**Priority:** P0 - Performance & Security  
**Component:** Multiple (DashboardWidget, POSCheckout, use-permissions hook)  
**Labels:** `bug`, `critical`, `ssr`, `auth`, `performance`

**Description:**

Four frontend components call `getAuthHeaders()` without checking for token presence during server-side rendering (SSR). This causes unauthenticated API requests to fire during hydration because the auth token is not available on the server. These requests fail silently and are re-requested on the client side, causing:

- Duplicate API calls (performance penalty)
- Potential 401 errors in logs
- Race conditions during hydration

**Files Affected:**

- `frontend/components/dashboard/DashboardWidget.tsx`
- `frontend/components/pos/POSCheckout.tsx`
- `frontend/hooks/use-permissions.ts`
- (1 additional component)

**Current Pattern (BROKEN):**

```typescript
const headers = getAuthHeaders(); // undefined during SSR
fetch(url, { headers }); // Sends request without token
```

**Correct Pattern:**

```typescript
const headers = getAuthHeaders();
if (!headers) return null; // Skip during SSR
fetch(url, { headers });
```

**Solution:**

1. Add token existence check before making authenticated requests
2. Skip data fetching during SSR if token is unavailable
3. Let client-side React take over for authenticated requests
4. Or use Next.js middleware to handle auth at request level

**Acceptance Criteria:**

- [ ] No API requests sent during SSR without valid token
- [ ] Network tab shows only authenticated requests
- [ ] No duplicate requests on page load
- [ ] Performance: page load time reduced (fewer requests)
- [ ] Console shows no 401 or auth-related errors

**Effort:** 30 minutes  
**Assigned to:** @developer

---

## HIGH PRIORITY ISSUES

---

### Issue #5: Park Sale Feature Broken

**Severity:** 🟡 HIGH  
**Priority:** P1  
**Component:** POSCheckout  
**Labels:** `bug`, `pos`, `checkout`, `feature-incomplete`

**Description:**

The "Park Sale" button is either hard-coded as disabled or shows a "Not implemented" toast. Backend endpoint exists but frontend has no wiring.

**Backend Endpoint:** POST `/v1/sales/park`  
**Current Status:** Button exists, functionality missing

**Acceptance Criteria:**

- [ ] Park Sale button is clickable
- [ ] Click opens modal or form to collect reason/notes
- [ ] Request sent to backend with sale data + reason
- [ ] Success message displayed
- [ ] Sale can be resumed/completed later

**Effort:** 45 minutes

---

### Issue #6: Hold Sale Feature Broken

**Severity:** 🟡 HIGH  
**Priority:** P1  
**Component:** POSCheckout  
**Labels:** `bug`, `pos`, `checkout`, `feature-incomplete`

**Description:**

The "Hold Sale" button is either hard-coded as disabled or shows a "Not implemented" toast. Backend endpoint exists but frontend has no wiring.

**Backend Endpoint:** POST `/v1/sales/hold`  
**Current Status:** Button exists, functionality missing

**Acceptance Criteria:**

- [ ] Hold Sale button is clickable
- [ ] Click opens modal to collect reason/notes
- [ ] Request sent to backend with sale data + reason
- [ ] Success message displayed
- [ ] Held sales appear in separate queue

**Effort:** 45 minutes

---

### Issue #7: Email Receipt Button Non-Functional

**Severity:** 🟡 HIGH  
**Priority:** P1  
**Component:** POSSaleSuccess  
**Labels:** `bug`, `pos`, `email`, `feature-incomplete`

**Description:**

The "Email Receipt" button is disabled or non-functional. Backend endpoint exists and is ready.

**Backend Endpoint:** POST `/v1/sales/{id}/email`  
**Current Status:** Button disabled

**Acceptance Criteria:**

- [ ] Email Receipt button is clickable
- [ ] Click opens email input dialog
- [ ] Request sent with customer email
- [ ] Success toast shows "Receipt sent to email@example.com"
- [ ] User receives email with formatted receipt

**Effort:** 20 minutes

---

### Issue #8: Download PDF Receipt Button Non-Functional

**Severity:** 🟡 HIGH  
**Priority:** P1  
**Component:** POSSaleSuccess  
**Labels:** `bug`, `pos`, `pdf`, `feature-incomplete`

**Description:**

The "Download PDF" button is disabled. Backend endpoint exists and returns PDF.

**Backend Endpoint:** GET `/v1/sales/{id}/pdf`  
**Current Status:** Button disabled

**Acceptance Criteria:**

- [ ] Download PDF button is clickable
- [ ] Click triggers PDF download from backend
- [ ] File named appropriately (e.g., `receipt_[sale-id].pdf`)
- [ ] PDF is readable and matches receipt display
- [ ] Works in all browsers

**Effort:** 15 minutes

---

### Issue #9: Export Sales History Non-Functional

**Severity:** 🟡 HIGH  
**Priority:** P1  
**Component:** POSSalesHistory  
**Labels:** `bug`, `pos`, `export`, `feature-incomplete`

**Description:**

The "Export" button in sales history shows a "Not implemented" toast. Backend supports CSV and Excel export.

**Backend Endpoint:** GET `/v1/sales/export?format=csv|excel`  
**Current Status:** Button exists, no functionality

**Acceptance Criteria:**

- [ ] Export button is clickable
- [ ] Click opens format selection (CSV / Excel)
- [ ] Request sent with selected format
- [ ] File downloads to user's computer
- [ ] File contains all sales data with proper formatting

**Effort:** 25 minutes

---

### Issue #10: Sales History Row Actions Broken

**Severity:** 🟡 HIGH  
**Priority:** P1  
**Component:** POSSalesHistory  
**Labels:** `bug`, `pos`, `navigation`, `missing-route`

**Description:**

Eye icon and Print buttons on each sales history row link to `/pos/sales/:id` which doesn't exist as a route. Users cannot view individual sale details.

**Related Issue:** Missing individual sale detail page (Issue #15)

**Acceptance Criteria:**

- [ ] Clicking eye/print icon navigates to detail page
- [ ] Detail page displays complete sale information
- [ ] Detail page supports print and email actions
- [ ] Links are tested and working

**Effort:** 60 minutes (depends on Issue #15)

---

## MEDIUM PRIORITY ISSUES

---

### Issue #11: Barcode Scanner Integration Missing

**Severity:** 🔵 MEDIUM  
**Priority:** P2  
**Component:** POSInventory  
**Labels:** `feature`, `pos`, `inventory`, `hardware-integration`

**Description:**

Barcode scanner functionality is mentioned in a placeholder comment but not implemented. This is a core POS feature that significantly speeds up item entry.

**Scope:**

- Listen for scanner input events
- Perform SKU lookup against inventory
- Auto-add matching item to cart
- Handle duplicate items (increment qty vs new line)
- Error handling for invalid SKUs

**Backend Support:** ✓ SKU lookup endpoint exists

**Acceptance Criteria:**

- [ ] Scanner input is detected and captured
- [ ] SKU is parsed from scanner input
- [ ] Item added to cart automatically
- [ ] Duplicate handling works (quantity increment)
- [ ] Invalid SKU shows error message

**Effort:** 2-3 hours

---

### Issue #12: Split Payment / Multi-Tender Support Missing

**Severity:** 🔵 MEDIUM  
**Priority:** P2  
**Component:** POSCheckout  
**Labels:** `feature`, `pos`, `payment`, `checkout`

**Description:**

No support for split payments across multiple payment methods (e.g., $50 cash + $30 card). This is a business requirement for handling mixed-tender transactions.

**Scope:**

- UI to add multiple payment lines
- Payment method selection per line
- Amount allocation per tender
- Validation that sum equals total
- Backend integration

**Backend Support:** ✗ Needs implementation

**Acceptance Criteria:**

- [ ] UI supports adding multiple payment methods
- [ ] Amount can be allocated to each tender
- [ ] Total validation works (sum must equal cart total)
- [ ] Checkout processes multi-tender transaction
- [ ] Receipt shows all payment methods

**Effort:** 4-5 hours (frontend + backend)

---

### Issue #13: Refund/Return Flow Missing

**Severity:** 🔵 MEDIUM  
**Priority:** P2  
**Component:** POSSalesHistory  
**Labels:** `feature`, `pos`, `refund`, `return`

**Description:**

Backend supports refunds via CREDIT_NOTE type but no frontend UI exists to initiate the refund workflow.

**Scope:**

- Refund button on sales detail/history
- Reason selection dropdown
- Amount selection (full vs partial)
- Manager approval workflow (if configured)
- Notification to customer

**Backend Support:** ✓ Endpoints exist (untested)

**Acceptance Criteria:**

- [ ] Refund button visible on sales history
- [ ] Clicking opens refund dialog
- [ ] User can select reason and amount
- [ ] Manager approval works if required
- [ ] Credit note is created
- [ ] Customer receives notification

**Effort:** 3-4 hours

---

### Issue #14: Manager Approval for Large Discounts Missing

**Severity:** 🔵 MEDIUM  
**Priority:** P2  
**Component:** POSCheckout/Discount Dialog  
**Labels:** `feature`, `pos`, `discount`, `approval-workflow`

**Description:**

Backend endpoint for approving discounts exists but no frontend UI triggers the approval workflow. This is needed to prevent cashiers from giving excessive discounts.

**Backend Endpoint:** POST `/v1/discounts/approve`

**Scope:**

- Define discount threshold (config setting)
- Show approval request when threshold exceeded
- Manager review interface
- Approve/reject UI
- Notification integration

**Acceptance Criteria:**

- [ ] Discount amount threshold is configurable
- [ ] Discounts below threshold apply instantly
- [ ] Discounts above threshold request manager approval
- [ ] Manager can approve/reject in real-time or later
- [ ] Audit log tracks approvals
- [ ] Notification sent to manager

**Effort:** 2-3 hours

---

### Issue #15: Individual Sale Detail Page Missing

**Severity:** 🔵 MEDIUM  
**Priority:** P2  
**Component:** Routing / New Component  
**Labels:** `feature`, `pos`, `routing`, `ui`

**Description:**

Route `/pos/sales/:id` does not exist. Multiple components (eye icon, print button) link to this non-existent page. Need to create detail view for individual sales.

**Scope:**

- New dynamic route: `app/pos/sales/[id]/page.tsx`
- Display complete transaction details
- Show items, payment method, discounts
- Receipt display/preview
- Action buttons: Print, Email, Refund, Return

**Acceptance Criteria:**

- [ ] Route created and accessible
- [ ] Detail page displays all sale information
- [ ] Print button works
- [ ] Email button works
- [ ] Refund button visible (when Issue #13 complete)
- [ ] Return button visible
- [ ] Related transactions shown if applicable

**Effort:** 1.5-2 hours

---

## CLEANUP ISSUES

---

### Issue #16: Remove Dead Component - PostSaleSuccessModal.tsx

**Severity:** 🔵 LOW  
**Priority:** P3  
**Component:** POSComponents  
**Labels:** `cleanup`, `dead-code`, `refactor`

**Description:**

`frontend/components/pos/PostSaleSuccessModal.tsx` exists but is never imported or used anywhere. It duplicates functionality from `POSSaleSuccess.tsx`.

**Action:**

- [ ] Review both components
- [ ] Decide: remove duplicate or consolidate
- [ ] Delete file or refactor as shared component
- [ ] Verify no broken imports remain

**Effort:** 15 minutes

---

## Summary by Phase

### Phase 1: Critical Fixes (2-3 hours) — P0

- Issue #1: Cashier sessions API route
- Issue #2: Checkout branch data
- Issue #3: Discount state leak
- Issue #4: SSR unauthenticated requests

### Phase 2: Feature Enablement (3-4 hours) — P1

- Issue #5: Park Sale
- Issue #6: Hold Sale
- Issue #7: Email Receipt
- Issue #8: Download PDF Receipt
- Issue #9: Export Sales History
- Issue #10: Sales Detail Page

### Phase 3: New Features (8-10 hours) — P2

- Issue #11: Barcode Scanner
- Issue #12: Split Payment
- Issue #13: Refund/Return Flow
- Issue #14: Manager Approval
- Issue #15: Sale Detail Page

### Phase 4: Cleanup (15 min) — P3

- Issue #16: Remove dead component

---

**Total Effort Estimate:** 15-20 hours  
**Critical Path:** Phase 1 (must complete before other phases)
