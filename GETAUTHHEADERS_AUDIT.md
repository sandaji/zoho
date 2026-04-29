# getAuthHeaders() Usage Audit Report

**Date:** April 29, 2026  
**Purpose:** Identify components calling `getAuthHeaders()` without checking for token presence  
**Pattern:** Components that import and call `getAuthHeaders()` in fetch calls without verifying if a valid token exists

---

## Summary

**Total files using getAuthHeaders(): 16**  
**All files lack explicit token existence checks before using headers in fetch calls**

---

## Files Affected

### 1. **POS Components**

#### [frontend/components/pos/POSHistory.tsx](frontend/components/pos/POSHistory.tsx)

- **Line 75:** `headers: getAuthHeaders(),` (in `fetchSales()`)
- **Context:** Fetches POS sales data with date range and filters
- **Issue:** Makes unauthenticated request if no token exists; fails silently

#### [frontend/components/pos/POSDocuments.tsx](frontend/components/pos/POSDocuments.tsx)

- **Line 86:** `headers: getAuthHeaders(),` (in `fetchDocuments()`)
- **Line 113:** `headers: getAuthHeaders(),` (in `handleConvertToInvoice()`)
- **Context:** Fetches and manipulates sales documents
- **Issue:** Two fetch calls without token verification; both fail without auth

#### [frontend/components/pos/POSCustomerSelect.tsx](frontend/components/pos/POSCustomerSelect.tsx)

- **Line 56:** `{ headers: getAuthHeaders() }` (in `searchCustomers()`)
- **Line 109:** `headers: getAuthHeaders(),` (in `handleAddCustomer()`)
- **Context:** Customer search and creation during checkout
- **Issue:** Search requests fail silently during SSR hydration without token

#### [frontend/components/pos/AutocompleteProductSearch.tsx](frontend/components/pos/AutocompleteProductSearch.tsx)

- **Line 96:** `headers: getAuthHeaders(),` (in product search useEffect)
- **Context:** Real-time product search during POS entry
- **Issue:** Debounced search fires without token; affects user experience

---

### 2. **Finance Report Pages**

#### [frontend/app/dashboard/finance/reports/pnl/page.tsx](frontend/app/dashboard/finance/reports/pnl/page.tsx)

- **Line 51:** `headers: getAuthHeaders(),` (in `fetchReport()`)
- **Component Type:** "use client" (client component)
- **Context:** Profit & Loss report fetching
- **Issue:** No token check before fetch; report fails to load

#### [frontend/app/dashboard/finance/reports/cash-flow/page.tsx](frontend/app/dashboard/finance/reports/cash-flow/page.tsx)

- **Line 52:** `headers: getAuthHeaders(),` (in fetch call)
- **Component Type:** "use client"
- **Context:** Cash flow report fetching
- **Issue:** Unauthenticated request on every page load

#### [frontend/app/dashboard/finance/reports/balance-sheet/page.tsx](frontend/app/dashboard/finance/reports/balance-sheet/page.tsx)

- **Line 50:** `headers: getAuthHeaders(),` (in fetch call)
- **Component Type:** "use client"
- **Context:** Balance sheet report fetching
- **Issue:** No token check before API call

---

### 3. **Reconciliation Pages**

#### [frontend/app/dashboard/finance/reconciliation/page.tsx](frontend/app/dashboard/finance/reconciliation/page.tsx)

- **Line 41:** `headers: getAuthHeaders(),` (in fetch call)
- **Line 64:** `...getAuthHeaders(),` (in another fetch call)
- **Component Type:** "use client"
- **Context:** Bank reconciliation dashboard
- **Issue:** Two API calls without token verification

#### [frontend/app/dashboard/finance/reconciliation/[accountId]/page.tsx](frontend/app/dashboard/finance/reconciliation/%5BaccountId%5D/page.tsx)

- **Line 48:** `headers: getAuthHeaders(),` (in `fetchData()`)
- **Line 70:** `...getAuthHeaders(),` (in `handleMatch()`)
- **Component Type:** "use client"
- **Context:** Account-specific reconciliation
- **Issue:** Spreads headers without checking for authorization

---

### 4. **HR/Leave Module**

#### [frontend/app/dashboard/hr/leave/page.tsx](frontend/app/dashboard/hr/leave/page.tsx)

- **Line 24:** `fetch(getApiUrl(API_ENDPOINTS.LEAVE_BALANCE), { headers: getAuthHeaders() }),`
- **Line 25:** `fetch(getApiUrl(API_ENDPOINTS.LEAVE_MY_REQUESTS), { headers: getAuthHeaders() })`
- **Line 35:** `const pendingRes = await fetch(getApiUrl(API_ENDPOINTS.LEAVE_PENDING), { headers: getAuthHeaders() });`
- **Component Type:** "use client"
- **Context:** Leave balance and requests fetching
- **Issue:** Three parallel API calls without token checks

#### [frontend/app/dashboard/hr/leave/components/request-leave-dialog.tsx](frontend/app/dashboard/hr/leave/components/request-leave-dialog.tsx)

- **Line 49:** `fetch(getApiUrl(API_ENDPOINTS.LEAVE_TYPES), { headers: getAuthHeaders() })`
- **Line 64:** `headers: getAuthHeaders(),`
- **Context:** Leave request creation dialog
- **Issue:** Form submission without authorization verification

#### [frontend/app/dashboard/hr/leave/components/pending-approvals.tsx](frontend/app/dashboard/hr/leave/components/pending-approvals.tsx)

- **Line 37:** `headers: getAuthHeaders(),` (in PATCH request for status update)
- **Context:** Approve/reject leave requests
- **Issue:** Status update fails silently without token

---

### 5. **POS & Branch Pages**

#### [frontend/app/dashboard/pos/page.tsx](frontend/app/dashboard/pos/page.tsx)

- **Line 240:** `headers: getAuthHeaders(),`
- **Component Type:** "use client"
- **Context:** POS checkout page
- **Issue:** Main POS operations without token verification

#### [frontend/app/dashboard/pos/sales/[id]/page.tsx](frontend/app/dashboard/pos/sales/%5Bid%5D/page.tsx)

- **Line 79:** `headers: getAuthHeaders(),`
- **Component Type:** "use client"
- **Context:** Sales detail/receipt view
- **Issue:** Receipt data fails to load without token

#### [frontend/app/dashboard/pos/documents/[id]/page.tsx](frontend/app/dashboard/pos/documents/%5Bid%5D/page.tsx)

- **Line 48:** `headers: getAuthHeaders(),`
- **Context:** Document detail view
- **Issue:** No token check before fetching document

#### [frontend/app/dashboard/branch/[id]/page.tsx](frontend/app/dashboard/branch/%5Bid%5D/page.tsx)

- **Line 56:** `headers: getAuthHeaders(),`
- **Component Type:** "use client"
- **Context:** Branch dashboard data
- **Issue:** Dashboard fails to load without token

---

## Root Cause Analysis

### How getAuthHeaders() Works

```typescript
export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}
```

**Key Point:** The function ALWAYS returns an object with `Content-Type`, but the `Authorization` header is only added if a token exists.

### The Problem

1. **During SSR Hydration:** `localStorage` is not available on the server, causing the function to execute without a token
2. **No Token Check:** Components make fetch calls immediately without verifying:
   - If running on client-side
   - If a token is actually present in localStorage
   - If the headers object contains an Authorization field

3. **Silent Failures:** API calls fail with 401 Unauthorized but components don't handle this gracefully
   - Some requests retry on client-side
   - Creates duplicate API calls (performance penalty)
   - May cause race conditions during hydration

---

## Risk Assessment

| Severity        | Count | Impact                                       |
| --------------- | ----- | -------------------------------------------- |
| 🔴 **Critical** | 3     | POS operations, HR approvals, Reconciliation |
| 🟡 **High**     | 7     | Finance reports, Document viewing            |
| 🔵 **Medium**   | 6     | Search, Secondary operations                 |

---

## Recommended Fix Pattern

### Option 1: Check for Token Before Fetch (Recommended for Client Components)

```typescript
const fetchData = async () => {
  const token = localStorage.getItem("auth_token");
  if (!token) {
    // Skip fetching during SSR or if not authenticated
    setData(null);
    return;
  }

  const res = await fetch(url, { headers: getAuthHeaders() });
  // ... rest of logic
};
```

### Option 2: Use useEffect with Client-Side Check

```typescript
useEffect(() => {
  // This ensures fetch only runs on client
  fetchData();
}, []); // Only runs on mount (client-side)
```

### Option 3: Create Safe Wrapper Function

```typescript
export function useSafeAuthHeaders() {
  const [headers, setHeaders] = useState<HeadersInit | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      setHeaders(getAuthHeaders());
    }
  }, []);

  return headers;
}
```

---

## Action Items

- [ ] Audit all 16 files for required fixes
- [ ] Implement token presence checks in each file
- [ ] Test during SSR and hydration
- [ ] Monitor API logs for 401 errors
- [ ] Consider creating utility hook for safe auth headers usage
- [ ] Add ESLint rule to catch getAuthHeaders usage without checks

---

## Files Requiring Fixes (Priority Order)

**P0 (Critical - Core Operations):**

1. [frontend/app/dashboard/pos/page.tsx](frontend/app/dashboard/pos/page.tsx) - Line 240
2. [frontend/app/dashboard/hr/leave/page.tsx](frontend/app/dashboard/hr/leave/page.tsx) - Lines 24, 25, 35
3. [frontend/app/dashboard/finance/reconciliation/[accountId]/page.tsx](frontend/app/dashboard/finance/reconciliation/%5BaccountId%5D/page.tsx) - Lines 48, 70

**P1 (High - Data Fetching):** 4. [frontend/components/pos/POSDocuments.tsx](frontend/components/pos/POSDocuments.tsx) - Lines 86, 113 5. [frontend/components/pos/POSHistory.tsx](frontend/components/pos/POSHistory.tsx) - Line 75 6. [frontend/app/dashboard/finance/reports/pnl/page.tsx](frontend/app/dashboard/finance/reports/pnl/page.tsx) - Line 51

**P2 (Medium - User Features):** 7. [frontend/components/pos/POSCustomerSelect.tsx](frontend/components/pos/POSCustomerSelect.tsx) - Lines 56, 109 8. [frontend/components/pos/AutocompleteProductSearch.tsx](frontend/components/pos/AutocompleteProductSearch.tsx) - Line 96
9-16. All remaining files
