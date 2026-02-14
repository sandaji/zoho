# Finance Dashboard API - Testing Guide

## Base URL

```
http://localhost:5000/api/v1/finance
```

## Authentication

All requests require a valid JWT token:

```
Authorization: Bearer <your_jwt_token>
```

---

## 1. Get Transactions

### Request

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5000/api/v1/finance/transactions?limit=5&type=expense"
```

### Query Parameters

- `limit` - Number of transactions (1-50, default: 5)
- `type` - "income" or "expense" (optional)
- `startDate` - ISO date string (optional)
- `endDate` - ISO date string (optional)

### Example Response

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
    "total": 20
  }
}
```

---

## 2. Get Expense Categories

### Request

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5000/api/v1/finance/expense-categories?period=month"
```

### Query Parameters

- `period` - "today", "week", "month", or "year" (default: "month")
- `startDate` - ISO date string (optional)
- `endDate` - ISO date string (optional)

### Example Response

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

---

## 3. Get Daily Spending

### Request

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5000/api/v1/finance/daily-spending?date=2026-02-07"
```

### Query Parameters

- `date` - ISO date string (optional, defaults to today)

### Example Response

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

---

## 4. Get Savings Goals

### Request

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5000/api/v1/finance/savings-goals?status=active"
```

### Query Parameters

- `status` - "active", "completed", or "all" (default: "active")

### Example Response

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

---

## 5. Create Savings Goal

### Request

```bash
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Equipment",
    "description": "Purchase new machinery",
    "targetAmount": 500000,
    "deadline": "2026-12-31"
  }' \
  "http://localhost:5000/api/v1/finance/savings-goals"
```

### Request Body

```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "targetAmount": "number (required)",
  "deadline": "ISO date string (optional)"
}
```

### Example Response

```json
{
  "success": true,
  "data": {
    "id": "goal_new_001",
    "name": "New Equipment",
    "description": "Purchase new machinery",
    "targetAmount": 500000,
    "currentAmount": 0,
    "remaining": 500000,
    "percentage": 0,
    "deadline": "2026-12-31T00:00:00Z",
    "status": "active",
    "createdAt": "2026-02-07T12:00:00Z",
    "updatedAt": "2026-02-07T12:00:00Z"
  }
}
```

---

## 6. Update Savings Goal

### Request

```bash
curl -X PATCH -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentAmount": 300000,
    "name": "Updated Goal Name"
  }' \
  "http://localhost:5000/api/v1/finance/savings-goals/goal_001"
```

### Request Body

```json
{
  "name": "string (optional)",
  "description": "string (optional)",
  "targetAmount": "number (optional)",
  "currentAmount": "number (optional)",
  "deadline": "ISO date string (optional)",
  "status": "string (optional)"
}
```

---

## 7. Delete Savings Goal

### Request

```bash
curl -X DELETE -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5000/api/v1/finance/savings-goals/goal_001"
```

### Example Response

```json
{
  "success": true,
  "data": {
    "message": "Goal deleted successfully"
  }
}
```

---

## Error Handling

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### Common Error Codes

- `INVALID_PARAMETERS` - Missing or invalid request parameters
- `NOT_FOUND` - Resource not found
- `UNAUTHORIZED` - Missing or invalid authentication token
- `TRANSACTION_FETCH_ERROR` - Error fetching transactions
- `CATEGORY_FETCH_ERROR` - Error fetching expense categories
- `DAILY_SPENDING_ERROR` - Error fetching daily spending
- `SAVINGS_GOALS_ERROR` - Error fetching savings goals
- `CREATE_GOAL_ERROR` - Error creating savings goal
- `UPDATE_GOAL_ERROR` - Error updating savings goal
- `DELETE_GOAL_ERROR` - Error deleting savings goal

---

## Postman Collection

You can import this into Postman:

### 1. Create Environment Variable

- Variable: `token`
- Value: Your JWT token

### 2. Create Requests

**Transaction List**

- Method: GET
- URL: `{{baseURL}}/api/v1/finance/transactions`
- Params: limit=5

**Expense Categories**

- Method: GET
- URL: `{{baseURL}}/api/v1/finance/expense-categories`
- Params: period=month

**Daily Spending**

- Method: GET
- URL: `{{baseURL}}/api/v1/finance/daily-spending`

**Savings Goals**

- Method: GET
- URL: `{{baseURL}}/api/v1/finance/savings-goals`
- Params: status=active

**Create Goal**

- Method: POST
- URL: `{{baseURL}}/api/v1/finance/savings-goals`
- Body: JSON with name, targetAmount

**Update Goal**

- Method: PATCH
- URL: `{{baseURL}}/api/v1/finance/savings-goals/:id`
- Body: JSON with fields to update

**Delete Goal**

- Method: DELETE
- URL: `{{baseURL}}/api/v1/finance/savings-goals/:id`

---

## Testing Checklist

- [ ] All endpoints return HTTP 200 for valid requests
- [ ] Response structure matches documentation
- [ ] Error responses have proper error codes
- [ ] Filtering works (type, period, date range)
- [ ] Pagination works (limit parameter)
- [ ] Calculations are correct (percentages, remaining)
- [ ] Dates are in ISO 8601 format
- [ ] All amounts are in KES
- [ ] CRUD operations work for savings goals
- [ ] Proper error messages for invalid input

---

## Performance Notes

Expected response times (< 200ms):

- **GET /transactions** - Simple query with limit
- **GET /expense-categories** - Aggregation query
- **GET /daily-spending** - Real-time calculation
- **GET /savings-goals** - Simple list query
- **POST/PATCH/DELETE goals** - Write operations

---

## Notes

- Ensure you have a valid JWT token for all requests
- All dates should be in ISO 8601 format
- All amounts are in KES (Kenya Shilling)
- The limit parameter has a maximum of 50 (enforced server-side)
- Transaction filtering is optional; omit parameters to get all transactions
