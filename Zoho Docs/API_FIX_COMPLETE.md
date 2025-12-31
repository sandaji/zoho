# API URL Fix - Complete Summary

## Problem
Frontend was calling wrong API endpoints causing 404 errors:
```
POST http://localhost:3000/api/pos/products/search 404 (Not Found)
```

The backend expects URLs like: `http://localhost:5000/v1/pos/products/search`
But frontend was calling: `/api/pos/products/search` (missing host, `/v1`, and wrong path)

## Root Causes

1. **Hardcoded URLs**: Multiple fetch calls scattered throughout codebase with hardcoded URLs
2. **Inconsistent paths**: Some calls used `/api/`, others used `http://localhost:5000/`, missing `/v1/` prefix
3. **No centralized API configuration**: Each component managed its own API URLs

## Solution Applied

### 1. Created Centralized API Configuration
**File**: `frontend/lib/api-config.ts`

Created a single source of truth for all API endpoints:

```typescript
// Backend API base URL
export const API_BASE_URL = "http://localhost:5000";

// All API endpoints in one place
export const API_ENDPOINTS = {
  // POS
  POS_PRODUCTS_SEARCH: "/v1/pos/products/search",
  POS_SALES: "/v1/pos/sales",
  POS_RECEIPT: (id: string) => `/v1/pos/sales/${id}/receipt`,
  POS_DISCOUNT_APPROVE: "/v1/pos/discount/approve",
  // ... other endpoints
};

// Helper functions
export function getApiUrl(endpoint: string): string {
  return `${API_BASE_URL}${endpoint}`;
}

export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}
```

### 2. Updated POS Pages

#### Dashboard POS (`frontend/app/dashboard/pos/page.tsx`)

**Before**:
```typescript
const res = await fetch("/api/pos/products/search", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
  },
  // ...
});
```

**After**:
```typescript
import { getApiUrl, API_ENDPOINTS, getAuthHeaders } from "@/lib/api-config";

const res = await fetch(getApiUrl(API_ENDPOINTS.POS_PRODUCTS_SEARCH), {
  method: "POST",
  headers: getAuthHeaders(),
  // ...
});
```

#### Standalone POS (`frontend/app/pos/page.tsx`)

Fixed all 5 API calls:
1. Product search - `POS_PRODUCTS_SEARCH`
2. Create sale - `POS_SALES`
3. Create sale with discount - `POS_SALES`
4. Approve discount - `POS_DISCOUNT_APPROVE`
5. Fetch receipt - `POS_RECEIPT(saleId)`

## Benefits

### ✅ Maintainability
- Single source of truth for all API endpoints
- Easy to update URLs (e.g., changing from localhost to production)
- No scattered hardcoded URLs throughout codebase

### ✅ Consistency
- All API calls use the same helper functions
- Consistent error handling
- Standardized header management

### ✅ Type Safety
- TypeScript ensures correct endpoint usage
- Function parameters for dynamic URLs (e.g., `POS_RECEIPT(id)`)

### ✅ Environment-Aware
- Can use `process.env.NEXT_PUBLIC_API_URL` for different environments
- Easy to switch between dev/staging/production

## Files Modified

1. **Created**: `frontend/lib/api-config.ts` - Centralized API configuration
2. **Updated**: `frontend/app/dashboard/pos/page.tsx` - Fixed 2 API calls
3. **Updated**: `frontend/app/pos/page.tsx` - Fixed 5 API calls

## Testing

### 1. Product Search
```bash
# Should work now
Search for: "LAP-001"
Expected: Product added to cart
```

### 2. Complete Sale
```bash
# Should work now
Add product → Select payment → Complete Sale
Expected: Sale created, receipt shown
```

### 3. Network Tab Verification
Open DevTools → Network tab:
```
✅ POST http://localhost:5000/v1/pos/products/search - 200 OK
✅ POST http://localhost:5000/v1/pos/sales - 201 Created
✅ GET http://localhost:5000/v1/pos/sales/{id}/receipt - 200 OK
```

## Common API Patterns

### Making a GET Request
```typescript
const response = await fetch(getApiUrl(API_ENDPOINTS.SALES), {
  headers: getAuthHeaders(),
});
```

### Making a POST Request
```typescript
const response = await fetch(getApiUrl(API_ENDPOINTS.POS_SALES), {
  method: "POST",
  headers: getAuthHeaders(),
  body: JSON.stringify(data),
});
```

### Dynamic URL with Parameter
```typescript
const response = await fetch(getApiUrl(API_ENDPOINTS.SALE_BY_ID(saleId)), {
  headers: getAuthHeaders(),
});
```

## Future Recommendations

### 1. Add Environment Variables
Create `.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Update `api-config.ts`:
```typescript
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
```

### 2. Create API Client Class
```typescript
class ApiClient {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = API_BASE_URL;
  }
  
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(getApiUrl(endpoint), {
      headers: getAuthHeaders(),
    });
    return response.json();
  }
  
  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(getApiUrl(endpoint), {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  }
}
```

### 3. Add Request/Response Interceptors
For consistent error handling, logging, and token refresh logic.

## Backend API Structure

All backend endpoints follow this pattern:
```
http://localhost:5000/v1/{module}/{resource}
```

Examples:
- `/v1/pos/products/search` - POS product search
- `/v1/pos/sales` - Create/list sales
- `/v1/auth/login` - Authentication
- `/v1/branches` - Branch management

## Quick Reference

| Frontend | Backend Endpoint |
|----------|-----------------|
| Product Search | `/v1/pos/products/search` |
| Create Sale | `/v1/pos/sales` |
| Get Receipt | `/v1/pos/sales/:id/receipt` |
| Approve Discount | `/v1/pos/discount/approve` |
| Login | `/v1/auth/login` |
| Register | `/v1/auth/register` |

## What Changed

### Before ❌
- Hardcoded URLs: `/api/pos/...`, `http://localhost:5000/pos/...`
- Missing `/v1/` prefix
- Inconsistent header management
- Scattered API calls

### After ✅
- Centralized configuration in `api-config.ts`
- Correct URLs: `http://localhost:5000/v1/pos/...`
- Helper functions for URLs and headers
- Easy to maintain and update

## Debugging Tips

If you still get 404 errors:

1. **Check the Network tab** in DevTools:
   - Verify the full URL being called
   - Check if `/v1/` is in the path
   - Confirm port is `:5000`

2. **Check backend is running**:
   ```bash
   cd backend
   npm run dev
   ```
   Should show: `Server running on http://localhost:5000`

3. **Check frontend is importing correctly**:
   ```typescript
   import { getApiUrl, API_ENDPOINTS, getAuthHeaders } from "@/lib/api-config";
   ```

4. **Verify backend routes**:
   Backend routes should be defined with `/v1` prefix in Express router.
