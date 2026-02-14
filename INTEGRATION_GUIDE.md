# Frontend-Backend Integration Guide

## Overview

The Finance Dashboard frontend is now fully integrated with the backend. This document shows how the frontend calls the backend endpoints and what to expect.

---

## Frontend API Client

The frontend uses a centralized API client located at:

```
frontend/lib/api-client.ts
```

### Making API Calls

The frontend makes requests like this:

```typescript
// Base configuration
const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

// Example: Fetch transactions
const response = await fetch(`${baseURL}/v1/finance/transactions?limit=5`, {
  method: "GET",
  headers,
});
```

---

## Integration Points

### 1. Transaction Widget

**Frontend Component:** `components/recent-transactions.tsx`

**Backend Endpoint:**

```
GET /api/v1/finance/transactions?limit=5
```

**Data Flow:**

```
Frontend Component
    ↓
Fetch transactions from backend
    ↓
Parse response (array of transactions)
    ↓
Display in transaction list
```

**Expected Data Structure:**

```typescript
{
  success: true,
  data: {
    transactions: [
      {
        id: string,
        type: 'income' | 'expense',
        category: string,
        amount: number,
        date: string (ISO 8601),
        description: string,
        reference?: string
      }
    ],
    total: number
  }
}
```

---

### 2. Expense Categories (Donut Chart)

**Frontend Component:** `components/expense-donut-chart.tsx`

**Backend Endpoint:**

```
GET /api/v1/finance/expense-categories?period=month
```

**Data Flow:**

```
Frontend Component
    ↓
Fetch expense categories from backend
    ↓
Parse response (category breakdown)
    ↓
Render donut chart with Recharts
```

**Expected Data Structure:**

```typescript
{
  success: true,
  data: {
    categories: [
      {
        category: string,      // e.g., "Operating", "Payroll"
        amount: number,        // Total amount for category
        count: number,         // Number of transactions
        percentage: number     // Percentage of total (0-100)
      }
    ],
    totalExpenses: number,     // Sum of all categories
    period: string            // Period covered (e.g., "2026-02")
  }
}
```

---

### 3. Daily Spending Progress

**Frontend Component:** `components/daily-limit-progress.tsx`

**Backend Endpoint:**

```
GET /api/v1/finance/daily-spending?date=2026-02-07
```

**Data Flow:**

```
Frontend Component
    ↓
Fetch daily spending from backend
    ↓
Parse response
    ↓
Calculate progress bar percentage
    ↓
Render progress widget
```

**Expected Data Structure:**

```typescript
{
  success: true,
  data: {
    spent: number,           // Amount spent today
    limit: number,           // Daily limit
    remaining: number,       // Limit - spent
    percentage: number,      // (spent / limit) * 100
    date: string,            // ISO date (e.g., "2026-02-07")
    transactions: number     // Count of transactions today
  }
}
```

---

### 4. Savings Goals

**Frontend Component:** `components/saving-plans.tsx`

**Backend Endpoint:**

```
GET /api/v1/finance/savings-goals?status=active
POST /api/v1/finance/savings-goals
PATCH /api/v1/finance/savings-goals/:id
DELETE /api/v1/finance/savings-goals/:id
```

**Data Flow (GET):**

```
Frontend Component
    ↓
Fetch active savings goals from backend
    ↓
Parse response (goals array)
    ↓
Render goal cards with progress
```

**Data Flow (CREATE):**

```
User fills form and clicks "Create Goal"
    ↓
Frontend sends POST request with goal data
    ↓
Backend validates and creates goal
    ↓
Frontend updates UI with new goal
```

**Data Flow (UPDATE):**

```
User updates goal progress
    ↓
Frontend sends PATCH request with updated data
    ↓
Backend validates and updates goal
    ↓
Frontend updates UI
```

**Data Flow (DELETE):**

```
User clicks delete on a goal
    ↓
Frontend sends DELETE request
    ↓
Backend deletes goal
    ↓
Frontend removes goal from UI
```

**Expected GET Response:**

```typescript
{
  success: true,
  data: {
    goals: [
      {
        id: string,
        name: string,
        description?: string,
        targetAmount: number,
        currentAmount: number,
        remaining: number,
        percentage: number,
        deadline?: string (ISO 8601),
        status: 'active' | 'completed',
        createdAt: string (ISO 8601),
        updatedAt: string (ISO 8601)
      }
    ],
    totalSaved: number,      // Sum of currentAmount
    totalTarget: number      // Sum of targetAmount
  }
}
```

---

## Authentication Flow

### 1. User Logs In

```
User enters credentials → Frontend auth API → JWT token returned
```

### 2. Token Storage

```
Frontend stores token in:
- localStorage (persists across sessions)
- Context/State (available to components)
```

### 3. API Requests

```
Every request includes:
Authorization: Bearer <jwt_token>
```

### 4. Token Expiration

```
If token expires:
  - Backend returns 401 Unauthorized
  - Frontend redirects to login
  - User re-authenticates
```

---

## Error Handling

### Backend Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

### Frontend Error Handling

```typescript
try {
  const response = await fetch(url, { headers });
  const data = await response.json();

  if (!data.success) {
    // Handle error
    console.error(data.error.message);
    showErrorToast(data.error.message);
  } else {
    // Use data
    setTransactions(data.data.transactions);
  }
} catch (error) {
  showErrorToast("Network error");
}
```

---

## Data Validation

### Frontend Validates:

- Required fields are present
- Data types match expectations
- Amounts are positive numbers
- Dates are valid ISO 8601 format

### Backend Validates:

- Authentication token is valid
- User has required permissions
- Input parameters are valid
- Business logic constraints are met

---

## Response Time Expectations

All endpoints should respond in < 500ms:

| Endpoint                  | Typical Response Time |
| ------------------------- | --------------------- |
| GET /transactions         | 50-100ms              |
| GET /expense-categories   | 100-200ms             |
| GET /daily-spending       | 50-100ms              |
| GET /savings-goals        | 50-100ms              |
| POST /savings-goals       | 100-150ms             |
| PATCH /savings-goals/:id  | 100-150ms             |
| DELETE /savings-goals/:id | 50-100ms              |

---

## Testing the Integration

### Manual Testing Steps

1. **Start Backend**

   ```bash
   cd backend
   npm run dev
   # Server should start on http://localhost:5000
   ```

2. **Start Frontend**

   ```bash
   cd frontend
   npm run dev
   # App should start on http://localhost:3000
   ```

3. **Login to Frontend**
   - Navigate to http://localhost:3000
   - Login with valid credentials
   - Token is automatically managed by frontend

4. **Navigate to Finance Dashboard**
   - Go to `/dashboard/finance`
   - Watch Network tab in browser DevTools
   - Should see API calls to backend

5. **Verify Data Loading**
   - Check if transaction list appears
   - Check if expense chart renders
   - Check if daily spending widget shows
   - Check if savings goals display

6. **Test CRUD Operations**
   - Click "Add Savings Goal"
   - Create a new goal
   - Watch for POST request in Network tab
   - Update goal progress
   - Watch for PATCH request
   - Delete goal
   - Watch for DELETE request

---

## Network Requests (DevTools)

When the dashboard loads, you should see these requests:

### Example Network Timeline:

```
1. GET /api/v1/finance/summary
   ↓ (100ms) ← Existing endpoint

2. GET /api/v1/finance/revenue-expense-chart
   ↓ (150ms) ← Existing endpoint

3. GET /api/v1/finance/transactions
   ↓ (80ms) ← NEW ENDPOINT

4. GET /api/v1/finance/expense-categories
   ↓ (120ms) ← NEW ENDPOINT

5. GET /api/v1/finance/daily-spending
   ↓ (60ms) ← NEW ENDPOINT

6. GET /api/v1/finance/savings-goals
   ↓ (90ms) ← NEW ENDPOINT
```

All requests use `Authorization: Bearer <token>` header.

---

## Common Issues & Solutions

### Issue: 401 Unauthorized

**Cause:** Invalid or expired token
**Solution:** Ensure user is logged in and has valid token

### Issue: 403 Forbidden

**Cause:** User lacks required permissions
**Solution:** Check RBAC roles; ensure user has `finance.gl.view` permission

### Issue: 404 Not Found

**Cause:** Endpoint path incorrect
**Solution:** Verify endpoint path matches exactly:

- Should be `/api/v1/finance/transactions` (not `/api/finance/transactions`)

### Issue: Empty Transaction List

**Cause:** No transactions in database
**Solution:** Seed test data or create transactions through other endpoints

### Issue: Wrong Category Names

**Cause:** Categories don't match predefined list
**Solution:** Use only predefined categories:

- `food`, `utilities`, `shopping`, `internet`, `payroll`, `rent`, `supplies`, `marketing`, `other`

---

## Environment Variables

### Frontend (.env.local)

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Backend (.env)

```
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://...
JWT_SECRET=your_secret_key
```

---

## Deployment Checklist

- [ ] Backend endpoints tested locally
- [ ] Frontend tested with backend
- [ ] All error cases handled
- [ ] Authentication working
- [ ] Permissions configured
- [ ] Database migrations applied
- [ ] Test data seeded
- [ ] Response times acceptable
- [ ] No console errors
- [ ] API documentation updated
- [ ] Ready for production

---

## Support & Debugging

### Enable Debug Logging

**Frontend:**

```typescript
// In your component
console.log("Request:", url);
console.log("Response:", data);
```

**Backend:**

```typescript
// Logger is already configured
logger.info("Fetching transactions...");
logger.error(error, "Failed to fetch transactions");
```

### Check Database

**Using Prisma Studio:**

```bash
cd backend
npx prisma studio
# Opens http://localhost:5555
```

### Monitor API Calls

**Browser DevTools:**

1. Open Network tab (F12)
2. Filter by XHR (XMLHttpRequest)
3. Click on requests to see details
4. Check Response tab for full data

---

## Next Steps

1. ✅ Backend implementation complete
2. ✅ Frontend ready to consume
3. Run integration tests
4. Deploy to staging
5. Run QA tests
6. Deploy to production
7. Monitor performance
8. Gather user feedback
9. Iterate and improve

The frontend and backend are now fully integrated and ready for testing!
