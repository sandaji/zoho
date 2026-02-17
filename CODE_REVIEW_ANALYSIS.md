# 🔍 Frontend-Backend Integration Code Review

## Executive Summary

The codebase has **significant inconsistencies and duplication** in API integration. Multiple conflicting API clients, configurations, and patterns exist. This document outlines critical issues and recommendations.

---

## 🚨 CRITICAL ISSUES

### 1. **Multiple API Configuration Files** (Contradictory)

**Files**:

- `frontend/lib/api-config.ts` ✅ MAIN (has complete endpoints)
- `frontend/lib/api/config.ts` ❌ DUPLICATE (incomplete, outdated)

**Problem**:

```typescript
// api-config.ts (CORRECT)
export const API_BASE_URL = "http://localhost:5000";
export const API_ENDPOINTS = {
  /* complete list */
};

// api/config.ts (OUTDATED - REMOVE)
export const API_BASE_URL = "http://localhost:5000/";
export const API_ENDPOINTS = {
  /* missing most endpoints */
};
```

**Impact**: Code is importing from both files, causing path confusion.
**Resolution**: ✅ DELETE `frontend/lib/api/config.ts` - use only `api-config.ts`

---

### 2. **Conflicting API Base URLs** (3 Different Values)

**Currently defined as**:

```typescript
// api-config.ts
const API_BASE_URL = "http://localhost:5000";

// admin-api.ts
const API_BASE_URL = "/api"; // PROXIED (wrong prefix path)

// rbac-api.ts
const API_BASE_URL = "/api/rbac"; // HARDCODED PROXY (wrong)
```

**Backend expects**: `/v1/*` routes
**Frontend sends**: Mixed `/api/*`, `/api/rbac/*`, direct `http://localhost:5000/*`

**Issue**: Next.js proxy in `next.config.ts` rewrites `/api/*` to `http://localhost:5000/v1/*`

- `/api/admin/branches` → `http://localhost:5000/v1/admin/branches` ✅ Works
- `/api/rbac/roles` → `http://localhost:5000/v1/rbac/roles` ✅ Works
- `http://localhost:5000/rbac/roles` → Wrong, bypasses proxy ❌

**Resolution**: Use official API_BASE_URL from `api-config.ts` everywhere

---

### 3. **Multiple API Client Implementations** (Duplication)

**Files with duplicate functionality**:

#### A. Admin API - TWO IMPLEMENTATIONS

```typescript
// frontend/lib/admin-api.ts - OLD STYLE
export const fetchBranches = async (token) => {
  const response = await fetch(`${API_BASE_URL}/admin/branches`, {
    headers: getAuthHeaders(token),
  });
  // ... duplicate error handling
};

// frontend/lib/api/admin-client.ts - NEW STYLE (Class)
class AdminApiClient {
  async listBranches(): Promise<Branch[]> {
    const response = await this.request<Branch[]>("/v1/branches");
    return response.data || [];
  }
}
export const adminApi = new AdminApiClient();
```

**Issue**: Two different calling patterns, same endpoints.

---

### 4. **Service Classes Making Raw API Calls **

**Files**:

- `employee.service.ts`
- `branch.service.ts`
- `dashboard.service.ts`
- `warehouse.service.ts`

**Problem**: Services use raw `fetch` instead of API clients

```typescript
// ❌ WRONG - In employee.service.ts
export const employeeService = {
  async getAllEmployees(token: string) {
    const response = await fetch(`${API_URL}/employees?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
  },
};

// ✅ CORRECT - Should use apiClient
const employees = await apiClient.request("/v1/employees", "GET");
```

**Impact**:

- No centralized error handling
- Duplicate authentication logic
- Inconsistent response handling
- Hard to maintain

---

### 5. **getAuthHeaders() Defined in Multiple Places**

```typescript
// api-config.ts (no token parameter)
export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("auth_token");
  return { Authorization: `Bearer ${token}` };
}

// admin-api.ts (takes token parameter)
const getAuthHeaders = (token: string) => {
  return { Authorization: `Bearer ${token}` };
};

// rbac-api.ts (takes token parameter)
const getAuthHeaders = (token: string) => {
  return { Authorization: `Bearer ${token}` };
};

// api/admin-client.ts (different implementation)
private getHeaders(): HeadersInit {
  const token = localStorage.getItem("auth_token");
  return { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) };
}
```

**Issue**: Different signatures, different implementations. Which one is correct?

---

### 6. **Endpoint Path Inconsistencies**

```typescript
// In api-config.ts
BRANCHES: "/v1/branches",           // ✅ CORRECT
STUDENTS: "/v1/students",           // ✅ CORRECT
LEAVE_TYPES: "/hr/leaves/types",    // ❌ MISSING /v1/
BANK_UPLOAD: `${API_BASE_URL}/finance/bank/upload`,  // ❌ INCLUDES FULL URL (wrong)
```

**Backend expects**: All endpoints to start with `/v1/`
**Frontend sends**: Mixed formats

---

### 7. **Response Handling Inconsistency**

```typescript
// Some expect: { success: true, data: T }
const result = await apiClient.request(endpoint);
// result.success, result.data

// Some expect: { data: T }
const result = await adminApi.getDailySummary();
// result.data

// Some expect: T directly
const products = await getProducts();
// returns ApiResponse<PaginatedResponse<Product>>
```

---

### 8. **Unnecessary Code Duplication - Query Parameter Building**

```typescript
// Repeated in multiple files:
const params = new URLSearchParams();
if (filters?.search) params.append("search", filters.search);
if (filters?.role) params.append("role", filters.role);
if (filters?.branchId) params.append("branchId", filters.branchId);
```

**Should be**: Helper function in utils

---

## 📋 DETAILED FINDINGS

### API Client Analysis

```
✅ GOOD:
- apiClient.ts (base class, centralized, has auth)
- api-config.ts (has complete endpoints)

⚠️ PROBLEMATIC:
- admin-api.ts (outdated, uses old pattern)
- api/admin-client.ts (new but has own request method)
- rbac-api.ts (hardcoded proxy path)
- finance/lib/api.ts (finance-specific, good scope)
- inventory/api.ts (inventory-specific, good scope)

❌ SHOULD BE REMOVED:
- api/config.ts (complete duplicate)
```

### Service Classes Analysis

```
ALL SHOULD BE REFACTORED to use apiClient instead of raw fetch:

❌ employee.service.ts - Raw fetch with Authorization header
❌ branch.service.ts - Raw fetch with Authorization header
❌ dashboard.service.ts - Raw fetch (some use apiClient, mixed)
❌ warehouse.service.ts - Raw fetch with Authorization header
```

---

## 🔧 RECOMMENDED REFACTORING

### Phase 1: Clean Up Configurations

```typescript
// ✅ CONSOLIDATE: Single source of truth for API config
frontend/lib/api-config.ts
  - Correct: API_BASE_URL = "http://localhost:5000"
  - Correct: All endpoints with /v1/ prefix
  - Keep: getApiUrl(), getAuthHeaders()

// ❌ DELETE
frontend/lib/api/config.ts (DUPLICATE)

// ⚠️ UPDATE
frontend/lib/rbac-api.ts - Use API_BASE_URL from api-config.ts
frontend/lib/admin-api.ts - Use API_BASE_URL from api-config.ts
```

### Phase 2: Consolidate API Clients

```typescript
// Keep ONLY ONE admin API client
✅ Keep: frontend/lib/api/admin-client.ts (class pattern is cleaner)
❌ Remove: frontend/lib/admin-api.ts (old function pattern)

// Refactor to use apiClient.request() internally
// Or extend base ApiClient class
```

### Phase 3: Refactor Service Classes

```typescript
// Convert all services to use apiClient

// BEFORE:
async getAllEmployees(token: string) {
  return fetch(`${API_URL}/employees`).then(r => r.json());
}

// AFTER (Option A - remove services entirely):
const employees = await apiClient.request("/v1/employees", "GET");

// AFTER (Option B - have services wrap apiClient):
async getAllEmployees() {
  return apiClient.request("/v1/employees", "GET");
}
```

### Phase 4: Create Reusable Utilities

```typescript
// NEW: frontend/lib/api-utils.ts
export function buildQueryString(filters: Record<string, any>): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  return params.toString();
}

// USAGE:
const query = buildQueryString({ search: "John", role: "cashier" });
const response = await apiClient.request(`/v1/employees?${query}`);
```

---

## 📊 Code Reusability Opportunities

### 1. **Query Parameter Builder**

Currently repeated in:

- `employee.service.ts` (lines 59-64)
- `branch.service.ts` (lines 43-46)
- `api/admin-client.ts` (multiple places)
- `app/dashboard/finance/lib/api.ts` (multiple places)

**Extract to**: `lib/api-utils.ts`

### 2. **API Request Method**

Defined identically in:

- `api/admin-client.ts` (private request method)
- `api/inventory.api.ts` (apiRequest function)

**Solution**: Extend from `apiClient.ts` instead

### 3. **Token & Headers**

```typescript
// Three implementations of the same thing:

// api-config.ts
export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

// admin-api.ts
const getAuthHeaders = (token: string) => {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

// rbac-api.ts
const getAuthHeaders = (token: string) => {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};
```

**Solution**: Use the one from `api-config.ts` everywhere, OR enhance ApiClient to handle this

---

## 🎯 Next Steps

### Immediate Actions (High Priority)

1. ✅ Delete `frontend/lib/api/config.ts`
2. ✅ Delete `frontend/lib/admin-api.ts` (use admin-client.ts instead)
3. ✅ Update `rbac-api.ts` to use `API_BASE_URL` from `api-config.ts`
4. ✅ Fix all endpoints missing `/v1/` prefix

### Short Term (Medium Priority)

5. ✅ Consolidate `getAuthHeaders()` implementations
6. ✅ Create `lib/api-utils.ts` with query builder
7. ✅ Create `lib/api/base-client.ts` for common request logic

### Long Term (Low Priority)

8. ✅ Refactor service classes to use apiClient
9. ✅ Create service-specific API clients (e.g., `EmployeeApiClient`)
10. ✅ Add request/response interceptors for error handling

---

## 📝 Inconsistencies Summary Table

| Issue           | File A                  | File B        | Resolution                   |
| --------------- | ----------------------- | ------------- | ---------------------------- |
| API Base URL    | `http://localhost:5000` | `/api`        | Use api-config.ts value      |
| Get Headers     | Takes token param       | No param      | Standardize in api-config.ts |
| Response Format | `{success, data}`       | `{data}`      | Document standard            |
| Endpoint Prefix | `/v1/branches`          | `/branches`   | Always use `/v1/`            |
| API Client      | Function pattern        | Class pattern | Use class pattern everywhere |

---

## 🔐 Impact on Security & Stability

**Current Issues**:

- ✅ Token handling works but is duplicated
- ❌ No centralized error logging
- ❌ No request/response interceptors
- ⚠️ Hard to audit all API calls

**After Refactoring**:

- ✅ Single point for auth headers
- ✅ Centralized error handling
- ✅ Easy to add logging/monitoring
- ✅ Easier to implement security measures (rate limiting, etc.)

---

## Generated: 2026-02-15
