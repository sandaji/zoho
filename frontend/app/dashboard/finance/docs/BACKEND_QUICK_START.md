# 🚀 Backend Team - Quick Start Guide

## 📋 TL;DR - What You Need to Build

You need to implement **4 new API endpoints** for the Finance Dashboard. All specifications are in `API_REQUIREMENTS.md`, but here's the quick reference:

---

## 1️⃣ Transactions Endpoint

### GET `/v1/finance/transactions?limit=5`

**What it does:** Returns recent financial transactions

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "txn_001",
        "type": "expense",
        "category": "food",
        "amount": 12500,
        "date": "2026-02-05T10:30:00Z",
        "description": "Restaurant Supplies",
        "reference": "INV-2026-001"
      }
    ],
    "total": 5
  }
}
```

**Categories:**
- Expense: `food`, `utilities`, `shopping`, `internet`, `payroll`, `rent`, `supplies`, `marketing`, `other`
- Income: `income`, `sales`, `services`

**Query params:** `limit`, `type`, `startDate`, `endDate`

---

## 2️⃣ Expense Categories Endpoint

### GET `/v1/finance/expense-categories?period=month`

**What it does:** Returns expense breakdown by category for donut chart

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "category": "Operating",
        "amount": 450000,
        "count": 45,
        "percentage": 40.0
      },
      {
        "category": "Payroll",
        "amount": 337500,
        "count": 12,
        "percentage": 30.0
      }
    ],
    "totalExpenses": 1125000,
    "period": "2026-02"
  }
}
```

**Logic:**
- Top 5 categories by amount
- "Other" catches everything else
- Percentages must sum to 100%

**Query params:** `period` (today/week/month/year), `startDate`, `endDate`

---

## 3️⃣ Daily Spending Endpoint

### GET `/v1/finance/daily-spending?date=2026-02-07`

**What it does:** Tracks daily spending against configured limit

**Response:**
```json
{
  "success": true,
  "data": {
    "spent": 42000,
    "limit": 50000,
    "remaining": 8000,
    "percentage": 84.0,
    "date": "2026-02-07",
    "transactions": 7
  }
}
```

**Config:**
- Default limit: 50,000 KES (should be configurable per org)
- If no limit set, return `limit: null`, `percentage: 0`

**Query params:** `date` (optional, defaults to today)

---

## 4️⃣ Savings Goals Endpoint

### GET `/v1/finance/savings-goals?status=active`

**What it does:** Returns savings goals with progress tracking

**Response:**
```json
{
  "success": true,
  "data": {
    "goals": [
      {
        "id": "goal_001",
        "name": "Emergency Fund",
        "description": "6 months operating expenses",
        "targetAmount": 1000000,
        "currentAmount": 450000,
        "remaining": 550000,
        "percentage": 45.0,
        "deadline": "2026-12-31T23:59:59Z",
        "status": "active",
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-02-07T10:00:00Z"
      }
    ],
    "totalSaved": 730000,
    "totalTarget": 1500000
  }
}
```

**Also implement:**
- POST `/v1/finance/savings-goals` - Create new goal
- PATCH `/v1/finance/savings-goals/:id` - Update goal
- DELETE `/v1/finance/savings-goals/:id` - Delete goal

**Query params:** `status` (active/completed/all)

---

## ✅ Implementation Checklist

### For Each Endpoint:

- [ ] Create route handler
- [ ] Implement database queries
- [ ] Add error handling
- [ ] Return correct JSON structure
- [ ] Test with Postman/curl
- [ ] Check response times (< 500ms)
- [ ] Add authentication check
- [ ] Deploy to staging

---

## 🧪 Testing Your Endpoints

### Quick Test Script

```bash
# Replace with your actual backend URL and auth token
BASE_URL="http://localhost:8000/api"
TOKEN="your_auth_token_here"

# Test 1: Transactions
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/v1/finance/transactions?limit=5"

# Test 2: Expense Categories
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/v1/finance/expense-categories?period=month"

# Test 3: Daily Spending
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/v1/finance/daily-spending"

# Test 4: Savings Goals
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/v1/finance/savings-goals?status=active"
```

### Expected Results:
- ✅ Status 200
- ✅ Response matches JSON structure above
- ✅ No console errors
- ✅ Response time < 500ms

---

## 🚨 Common Mistakes to Avoid

### ❌ Wrong Response Structure
```json
// WRONG - No success field
{
  "data": { ... }
}
```

```json
// CORRECT - Has success field
{
  "success": true,
  "data": { ... }
}
```

### ❌ Wrong Date Format
```json
// WRONG - Not ISO 8601
"date": "02/07/2026"
```

```json
// CORRECT - ISO 8601
"date": "2026-02-07T10:30:00Z"
```

### ❌ Wrong Category Names
```json
// WRONG - Random categories
"category": "Meals"
```

```json
// CORRECT - Predefined categories
"category": "food"
```

### ❌ Missing Error Handling
```json
// WRONG - Server crashes on error
throw new Error("Database error");
```

```json
// CORRECT - Returns error response
{
  "success": false,
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Failed to fetch transactions"
  }
}
```

---

## 📚 Full Documentation

For complete specifications, see:
- **API Requirements:** `docs/API_REQUIREMENTS.md`
- **Type Definitions:** `types/index.ts`
- **Testing Guide:** `docs/TESTING_GUIDE.md`

---

## 🤝 Frontend Integration Points

The frontend calls your endpoints like this:

```typescript
// In lib/api.ts
export async function fetchTransactions(params) {
  return apiClient.request(
    `/v1/finance/transactions?${params}`,
    "GET"
  );
}
```

**Base URL** comes from environment variable:
```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

**Authentication** is handled by `apiClient` (adds token to headers)

---

## 🏃 Development Workflow

### Step 1: Pick an Endpoint
Start with the easiest: **Daily Spending** (simple calculation)

### Step 2: Implement
1. Create route
2. Write database query
3. Format response

### Step 3: Test
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/v1/finance/daily-spending
```

### Step 4: Deploy to Staging
```bash
git push origin staging
```

### Step 5: Notify Frontend
"Daily spending endpoint is ready on staging!"

### Step 6: Integration Test
Frontend team tests with real endpoint

### Step 7: Production
Once all 4 endpoints are done and tested

---

## 💡 Tips for Success

### Performance
- Add database indexes on frequently queried fields
- Cache results for 1-5 minutes where appropriate
- Use `LIMIT` in SQL queries to prevent loading too much data

### Error Handling
```typescript
try {
  const data = await db.query(...);
  return { success: true, data };
} catch (error) {
  console.error(error);
  return {
    success: false,
    error: {
      code: "QUERY_FAILED",
      message: "Failed to fetch data",
    }
  };
}
```

### Data Validation
```typescript
// Validate query parameters
if (limit && (limit < 1 || limit > 50)) {
  return {
    success: false,
    error: {
      code: "INVALID_LIMIT",
      message: "Limit must be between 1 and 50"
    }
  };
}
```

---

## 📊 Priority Order

Implement in this order for maximum impact:

1. **Transactions** (most visible widget)
2. **Expense Categories** (visual impact of donut chart)
3. **Savings Goals** (user engagement feature)
4. **Daily Spending** (optional feature)

---

## 🆘 Need Help?

**Questions about:**
- Response structure → Check `API_REQUIREMENTS.md`
- TypeScript types → Check `types/index.ts`
- Frontend integration → Ask frontend team

**Stuck on:**
- Database queries → Ask senior backend dev
- Performance → Check indexes and explain plans
- Authentication → Check existing endpoint implementations

---

## ✅ Ready to Start?

1. Read full specs: `docs/API_REQUIREMENTS.md`
2. Create a branch: `git checkout -b feature/finance-api-endpoints`
3. Implement endpoint #1: Transactions
4. Test it thoroughly
5. Push to staging
6. Notify frontend team
7. Repeat for other 3 endpoints

---

## 🎯 Success = All These Work

```bash
# All should return 200 OK with correct data
✅ GET /v1/finance/transactions
✅ GET /v1/finance/expense-categories
✅ GET /v1/finance/daily-spending
✅ GET /v1/finance/savings-goals

# CRUD for savings goals
✅ POST /v1/finance/savings-goals
✅ PATCH /v1/finance/savings-goals/:id
✅ DELETE /v1/finance/savings-goals/:id
```

---

**Questions?** Contact the frontend team or check the detailed docs!

🚀 **Let's build this!**
