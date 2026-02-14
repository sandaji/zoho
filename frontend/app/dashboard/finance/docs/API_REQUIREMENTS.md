# Finance Dashboard API Requirements

## Overview
This document specifies the 4 new API endpoints required for the Coinest-style Finance Dashboard redesign.

---

## 1. Recent Transactions Endpoint

### **GET** `/v1/finance/transactions`

**Purpose:** Fetch recent financial transactions for display in the dashboard.

**Query Parameters:**
- `limit` (optional): Number of transactions to return (default: 5, max: 50)
- `type` (optional): Filter by "income" or "expense"
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response Schema:**
```typescript
{
  success: boolean;
  data: {
    transactions: [
      {
        id: string;                    // Unique transaction ID
        type: "income" | "expense";    // Transaction type
        category: string;              // e.g., "food", "utilities", "shopping", "income"
        amount: number;                // Positive number (currency in KES)
        date: string;                  // ISO 8601 date string
        description: string;           // Transaction description
        reference?: string;            // Optional reference number
      }
    ];
    total: number;                     // Total count of transactions
  };
}
```

**Example Request:**
```
GET /v1/finance/transactions?limit=5
```

**Example Response:**
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
      },
      {
        "id": "txn_002",
        "type": "income",
        "category": "income",
        "amount": 45000,
        "date": "2026-02-04T14:20:00Z",
        "description": "Customer Payment - ABC Corp"
      }
    ],
    "total": 2
  }
}
```

**Category Values:**
- For **expenses**: `food`, `utilities`, `shopping`, `internet`, `payroll`, `rent`, `supplies`, `marketing`, `other`
- For **income**: `income`, `sales`, `services`

---

## 2. Expense Categories Endpoint

### **GET** `/v1/finance/expense-categories`

**Purpose:** Get expense breakdown by category for the donut chart.

**Query Parameters:**
- `period` (optional): "today" | "week" | "month" | "year" (default: "month")
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response Schema:**
```typescript
{
  success: boolean;
  data: {
    categories: [
      {
        category: string;     // Category name
        amount: number;       // Total amount spent in this category
        count: number;        // Number of transactions
        percentage: number;   // Percentage of total expenses
      }
    ];
    totalExpenses: number;    // Sum of all categories
    period: string;           // Period covered
  };
}
```

**Example Request:**
```
GET /v1/finance/expense-categories?period=month
```

**Example Response:**
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
      },
      {
        "category": "Marketing",
        "amount": 168750,
        "count": 8,
        "percentage": 15.0
      },
      {
        "category": "Utilities",
        "amount": 112500,
        "count": 20,
        "percentage": 10.0
      },
      {
        "category": "Other",
        "amount": 56250,
        "count": 15,
        "percentage": 5.0
      }
    ],
    "totalExpenses": 1125000,
    "period": "2026-02"
  }
}
```

**Business Logic:**
- Categories should be aggregated from actual transaction data
- Top 5 categories by amount, with "Other" catching the rest
- Percentages should sum to 100%

---

## 3. Daily Spending Limit Endpoint

### **GET** `/v1/finance/daily-spending`

**Purpose:** Track daily spending against configured limits.

**Query Parameters:**
- `date` (optional): ISO date string (default: today)

**Response Schema:**
```typescript
{
  success: boolean;
  data: {
    spent: number;         // Amount spent today
    limit: number;         // Daily spending limit
    remaining: number;     // Limit - spent
    percentage: number;    // (spent / limit) * 100
    date: string;          // ISO date string
    transactions: number;  // Count of transactions today
  };
}
```

**Example Request:**
```
GET /v1/finance/daily-spending?date=2026-02-07
```

**Example Response:**
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

**Configuration:**
- Daily limit should be configurable per organization in settings
- Default limit: 50,000 KES
- If no limit set, return `limit: null` and `percentage: 0`

---

## 4. Savings Goals Endpoint

### **GET** `/v1/finance/savings-goals`

**Purpose:** Track progress toward savings goals.

**Query Parameters:**
- `status` (optional): "active" | "completed" | "all" (default: "active")

**Response Schema:**
```typescript
{
  success: boolean;
  data: {
    goals: [
      {
        id: string;           // Unique goal ID
        name: string;         // Goal name
        description?: string; // Optional description
        targetAmount: number; // Goal target
        currentAmount: number;// Current progress
        remaining: number;    // Target - current
        percentage: number;   // (current / target) * 100
        deadline?: string;    // Optional ISO date
        status: "active" | "completed";
        createdAt: string;    // ISO date
        updatedAt: string;    // ISO date
      }
    ];
    totalSaved: number;       // Sum of currentAmount across all active goals
    totalTarget: number;      // Sum of targetAmount across all active goals
  };
}
```

**Example Request:**
```
GET /v1/finance/savings-goals?status=active
```

**Example Response:**
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
      },
      {
        "id": "goal_002",
        "name": "Equipment Upgrade",
        "description": "New production equipment",
        "targetAmount": 500000,
        "currentAmount": 280000,
        "remaining": 220000,
        "percentage": 56.0,
        "deadline": "2026-06-30T23:59:59Z",
        "status": "active",
        "createdAt": "2026-01-15T00:00:00Z",
        "updatedAt": "2026-02-05T15:30:00Z"
      }
    ],
    "totalSaved": 730000,
    "totalTarget": 1500000
  }
}
```

**Additional Endpoints (CRUD):**

#### **POST** `/v1/finance/savings-goals`
Create a new savings goal.

**Request Body:**
```json
{
  "name": "New Equipment",
  "description": "Purchase new machinery",
  "targetAmount": 500000,
  "deadline": "2026-12-31"
}
```

#### **PATCH** `/v1/finance/savings-goals/:id`
Update goal progress or details.

**Request Body:**
```json
{
  "currentAmount": 300000,
  "name": "Updated Goal Name"
}
```

#### **DELETE** `/v1/finance/savings-goals/:id`
Delete a savings goal.

---

## Error Handling

All endpoints should return consistent error responses:

```typescript
{
  success: false;
  error: {
    code: string;        // e.g., "INVALID_PARAMETERS", "NOT_FOUND"
    message: string;     // Human-readable error message
    details?: any;       // Optional additional context
  };
}
```

**Common HTTP Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid parameters
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Authentication

All endpoints require authentication via:
- Bearer token in Authorization header
- Cookie-based session (depending on your auth setup)

**Example:**
```
Authorization: Bearer <token>
```

---

## Rate Limiting

Suggested rate limits:
- 100 requests per minute per user
- 1000 requests per hour per organization

---

## Data Retention & Privacy

- Transaction data: Retain per legal requirements (typically 7 years)
- Personal information: Handle per GDPR/data protection laws
- Ensure proper access controls and audit logging

---

## Testing Checklist

- [ ] All endpoints return correct data structure
- [ ] Query parameters work as expected
- [ ] Error responses are consistent
- [ ] Authentication is enforced
- [ ] Date ranges are handled correctly
- [ ] Pagination works (if implemented)
- [ ] Performance is acceptable (< 200ms response time)
- [ ] Currency formatting is consistent (KES)

---

## Contact

For questions or clarifications, contact the frontend team.
