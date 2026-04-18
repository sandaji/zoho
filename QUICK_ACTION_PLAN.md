# 🚀 ERP System - Quick Action Plan

## Immediate Fixes (Next 48 Hours)

---

## 🔴 BLOCKING ISSUES (Fix First)

### Issue #1: Authentication Broken (401 Errors)

**File:** `/error.txt` shows multiple 401 errors  
**Root Cause:** Token not being sent properly in requests

**Quick Fix:**

```tsx
// frontend/lib/api-utils.ts
export const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");

  // DEBUG: Log to verify token exists
  console.log("Auth token:", token ? "EXISTS" : "MISSING");

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};
```

**Test:**

```bash
# 1. Login and check browser localStorage
# Open DevTools > Application > LocalStorage
# Look for 'authToken' key

# 2. Test API directly with curl
TOKEN="your_token_from_localStorage"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/v1/admin/stats
```

**If still failing:**

- Check backend: Does `authMiddleware` properly validate token?
- Check env vars: Is JWT_SECRET set correctly?
- Check CORS: Is frontend URL in `allowedOrigins`?

**Time to fix:** 30 minutes

---

### Issue #2: Wrong API Endpoint URLs (404 Errors)

**File:** `frontend/lib/warehouse.service.ts:217` calls `/warehouse` instead of `/v1/warehouse`

**Fix All Services:**

1. `frontend/lib/warehouse.service.ts` - Change `/warehouse` → `/v1/warehouse`
2. `frontend/lib/purchasing.service.ts` - Verify all endpoints have `/v1` prefix
3. `frontend/lib/branch.service.ts` - Verify all endpoints have `/v1` prefix
4. Create a constant file:

```typescript
// frontend/lib/api-config.ts (already exists, ADD TO IT)
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const API_ENDPOINTS = {
  ADMIN: {
    STATS: `${API_BASE_URL}/v1/admin/stats`,
    BRANCHES: `${API_BASE_URL}/v1/admin/branches`,
    USERS: `${API_BASE_URL}/v1/admin/users`,
  },
  WAREHOUSE: {
    LIST: `${API_BASE_URL}/v1/warehouse`,
    GET: (id: string) => `${API_BASE_URL}/v1/warehouse/${id}`,
    CREATE: `${API_BASE_URL}/v1/warehouse`,
  },
  PURCHASING: {
    VENDORS: `${API_BASE_URL}/v1/purchasing/vendors`,
    ORDERS: `${API_BASE_URL}/v1/purchasing/orders`,
  },
  // ... add all others
};
```

**Time to fix:** 45 minutes

---

### Issue #3: TypeScript Errors Blocking Build

**Files Affected:** `components/ui/stats.tsx`, `lib/env.ts`, `components/admin/*`

**Quick Fixes:**

**A) Icon imports (components/ui/stats.tsx)**

```typescript
// ❌ WRONG - These Material Design icons don't exist
import {
  MdShoppingCart,
  MdAttachMoney,
  MdTrendingUp,
  MdPeople,
  MdWarehouse,
  MdDirectionsCar,
  MdPercent,
} from "react-icons/md";

// ✅ CORRECT - Use lucide-react
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Users,
  Warehouse,
  Navigation,
  Percent,
} from "lucide-react";

// Or use react-icons/md but with correct names:
import { MdShoppingCart } from "react-icons/md"; // This exists
// But MdAttachMoney, etc. need different import
```

**B) Environment configuration (lib/env.ts)**

```typescript
// ❌ WRONG
z.string().transform(Boolean).default("true"); // string default for boolean
z.string().transform(Number).default("5000"); // string default for number

// ✅ CORRECT
z.string()
  .transform(Boolean)
  .default(() => "true"); // function that returns string
z.string()
  .transform(Number)
  .default(() => "5000"); // function that returns string
```

**C) Admin component exports**

```typescript
// ❌ admin/AdminOverview.tsx
export const AdminOverview = () => { ... }

// ✅ CORRECT (one of two options)
export default AdminOverview  // default export
// OR
export { AdminOverview }  // keep as named export

// ✅ Then in admin/index.ts
import AdminOverview from "./AdminOverview"  // if default
// OR
import { AdminOverview } from "./AdminOverview"  // if named
```

**Time to fix:** 1 hour

---

## 🟠 HIGH PRIORITY (Complete Today)

### Issue #4: Finance Dashboard - 4 Missing Endpoints

**Status:** UI is 100% complete, just needs backend

**Implement These Endpoints:**

```typescript
// backend/src/modules/finance/finance.routes.ts

// 1. GET /v1/finance/transactions?limit=5
router.get("/transactions", authMiddleware, async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const transactions = await prisma.financeTransaction.findMany({
    take: limit,
    orderBy: { transactionDate: "desc" },
    select: {
      id: true,
      description: true,
      amount: true,
      type: true,
      transactionDate: true,
      category: true,
    },
  });
  res.json({ success: true, data: transactions });
});

// 2. GET /v1/finance/expense-categories?period=month
router.get("/expense-categories", authMiddleware, async (req, res) => {
  const transactions = await prisma.financeTransaction.groupBy({
    by: ["category"],
    where: { type: "expense" },
    _sum: { amount: true },
  });

  const formatted = transactions.map((t) => ({
    category: t.category || "Uncategorized",
    amount: t._sum.amount || 0,
  }));

  res.json({ success: true, data: formatted });
});

// 3. GET /v1/finance/daily-spending
router.get("/daily-spending", authMiddleware, async (req, res) => {
  const today = new Date().toDateString();
  const spent = await prisma.financeTransaction.aggregate({
    where: {
      type: "expense",
      transactionDate: {
        gte: new Date(today),
        lt: new Date(new Date(today).getTime() + 86400000),
      },
    },
    _sum: { amount: true },
  });

  const limit = 50000; // Or from config
  res.json({
    success: true,
    data: {
      spent: spent._sum.amount || 0,
      limit: limit,
      remaining: limit - (spent._sum.amount || 0),
      percentage: ((spent._sum.amount || 0) / limit) * 100,
    },
  });
});

// 4. GET/POST /v1/finance/savings-goals
router.get("/savings-goals", authMiddleware, async (req, res) => {
  const goals = await prisma.savingsGoal.findMany({
    where: { status: "active" },
  });
  res.json({ success: true, data: goals });
});

router.post("/savings-goals", authMiddleware, async (req, res) => {
  const { name, targetAmount, deadline } = req.body;
  const goal = await prisma.savingsGoal.create({
    data: { name, targetAmount, deadline, currentAmount: 0 },
  });
  res.json({ success: true, data: goal });
});

router.patch("/savings-goals/:id", authMiddleware, async (req, res) => {
  const goal = await prisma.savingsGoal.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json({ success: true, data: goal });
});
```

**Then Register Routes:**

```typescript
// src/routes/index.ts
import financeRoutes from "../modules/finance/finance.routes";
router.use("/finance", authMiddleware, financeRoutes);
```

**Time to implement:** 1-2 hours

---

### Issue #5: Standardize API Response Format

**Current Issue:** Different endpoints return different formats

**Solution:**

```typescript
// backend/lib/response.ts (NEW FILE)
export const successResponse = <T>(data: T, meta?: any) => ({
  success: true,
  data,
  ...(meta && { meta }),
});

export const errorResponse = (
  code: string,
  message: string,
  statusCode = 400,
) => ({
  success: false,
  error: { code, message },
});

export const paginatedResponse = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
) => ({
  success: true,
  data,
  meta: { total, page, limit, pages: Math.ceil(total / limit) },
});
```

**Update All Endpoints:**

```typescript
// ❌ BEFORE
res.json({ data: products });

// ✅ AFTER
res.json(successResponse(products));

// ❌ BEFORE (pagination)
res.json({ products, total, page: 1 });

// ✅ AFTER
res.json(paginatedResponse(products, total, 1, 20));
```

**Time to implement:** 2 hours (find-replace across codebase)

---

## 🟡 MEDIUM PRIORITY (This Week)

### Issue #6: Role Type Mismatch

**Problem:** Frontend defines `UserRole` that doesn't match backend

```typescript
// ❌ WRONG - frontend/types/admin.ts
type UserRole =
  | "admin"
  | "manager"
  | "cashier"
  | "warehouse_staff"
  | "driver"
  | "user";

// ✅ CORRECT - Remove "user" as it's not a valid role
type UserRole = "admin" | "manager" | "cashier" | "warehouse_staff" | "driver";

// Verify against backend User schema
// backend/prisma/schema.prisma
// role String @default("warehouse_staff") // cashier, warehouse_staff, driver, manager, admin
```

**Time to fix:** 15 minutes

---

### Issue #7: POS Module TODOs

**Incomplete Features in `pos.controller.ts`:**

```typescript
// TODO Line 238: Implement sales document update
async updateSales(req, res, next) {
  const { id } = req.params;
  const updates = req.body;

  try {
    const updated = await SalesService.updateDocument(id, updates);
    res.json(successResponse(updated));
  } catch (error) {
    next(error);
  }
}

// TODO Line 296: Implement receipt generation
async generateReceipt(req, res, next) {
  const { id } = req.params;
  try {
    const receipt = await SalesService.generateReceipt(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(receipt);
  } catch (error) {
    next(error);
  }
}

// TODO Line 328: Discount approval workflow
async approveDiscount(req, res, next) {
  const { id, discountAmount, approvedBy } = req.body;
  try {
    const result = await SalesService.approveDiscount(id, discountAmount, approvedBy);
    res.json(successResponse(result));
  } catch (error) {
    next(error);
  }
}
```

**Time to implement:** 2-3 hours each

---

## 📋 Testing Checklist

After making fixes, verify with this checklist:

### 1. Authentication Test

```bash
# Login
curl -X POST http://localhost:5000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Should return token
# Copy token and test protected endpoint
TOKEN="eyJ0eXAi..."
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/v1/admin/stats
# Should return 200 with data
```

### 2. API Endpoint Test

```bash
# Test warehouse endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/v1/warehouse

# Test finance endpoints
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/v1/finance/transactions

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/v1/finance/daily-spending
```

### 3. Frontend Test

```bash
# Start frontend
cd frontend && npm run dev

# Check:
1. Admin Dashboard > Stats should show numbers
2. Warehouse > Inventory should show data
3. Finance > Dashboard should show real transactions
4. POS > Search should work
5. Browser console: No 401 errors
6. Browser console: No TypeScript errors
```

### 4. Database Test

```bash
# Test database connection
npx prisma studio
# Should open UI showing all data

# Verify user can be created
npx prisma db seed
# Should run seed script
```

---

## 🎯 Success Criteria

After implementing above fixes, you should have:

✅ **No TypeScript compilation errors**

```bash
cd frontend && npx tsc --noEmit
# Should complete with 0 errors
```

✅ **No 401 errors in browser**

- Open DevTools Network tab
- All requests should return 200-level status

✅ **Finance dashboard functional**

- Transactions widget shows recent transactions
- Expense chart shows breakdown
- Daily spending shows progress bar
- Savings goals show list

✅ **Admin section functional**

- Can view branches, users, products
- Can create new records
- No type errors

✅ **POS functional**

- Can search products
- Can create sales
- Can view history
- Can close and reconcile

---

## 🔗 Related Documentation

- Full assessment: `COMPREHENSIVE_ERP_ASSESSMENT.md`
- Finance API specs: `frontend/app/dashboard/finance/docs/API_REQUIREMENTS.md`
- Backend setup: `backend/README.md`
- Frontend setup: `frontend/README.md`

---

## 📞 Support

For each issue above:

1. **Read the description** - understand root cause
2. **Apply the fix** - use code examples provided
3. **Test** - use commands in testing section
4. **Verify** - check success criteria

If stuck on any issue:

1. Check error messages in browser console
2. Check backend logs: `docker logs zoho-backend`
3. Check database: `npx prisma studio`
4. Verify environment variables: `cat backend/.env`

---

**Expected Completion Time:** 4-6 hours for all blocking issues  
**Target Completion Date:** Today or tomorrow  
**Confidence Level:** High - All issues have known solutions

**Next Step:** Start with Issue #1 (Authentication)
