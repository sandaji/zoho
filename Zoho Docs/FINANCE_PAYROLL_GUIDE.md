# Finance & Payroll Management System - Complete Guide

## 📋 System Overview

The Finance & Payroll Management System provides comprehensive tools for managing financial transactions, generating detailed reports, and processing employee payroll. The system includes atomic transactions, validation, role-based access control, and detailed analytics.

### Key Features

- ✅ **Financial Transaction Management** - Record and track all financial transactions
- ✅ **Monthly Financial Reports** - Comprehensive revenue, expense, and profitability analysis
- ✅ **Payroll Processing** - Atomic payroll batch processing with automatic calculations
- ✅ **Advanced Analytics** - Department breakdowns, salary ranges, and trend analysis
- ✅ **Interactive Dashboards** - Real-time visualization with charts and metrics
- ✅ **Accordion-based Details** - Expandable payslip information with earnings/deductions breakdown

---

## 🔌 Backend API Endpoints

### Finance Endpoints

#### 1. POST /finance/transactions

**Create a financial transaction**

```bash
curl -X POST "http://localhost:3001/api/finance/transactions" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "income",
    "reference_no": "INV-001",
    "description": "Sales - Batch 001",
    "amount": 15000,
    "payment_method": "bank_transfer",
    "reference_doc": "INV-001",
    "notes": "Monthly sales"
  }'
```

**Request Body:**

- `type` (string, required): Transaction type - "income", "expense", "transfer", "payroll", "adjustment"
- `reference_no` (string, required): Unique reference number
- `description` (string, required): Transaction description
- `amount` (number, required): Transaction amount
- `payment_method` (string, optional): "bank_transfer", "credit_card", "cash"
- `reference_doc` (string, optional): Document reference
- `notes` (string, optional): Additional notes

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "fin_123",
    "type": "income",
    "reference_no": "INV-001",
    "description": "Sales - Batch 001",
    "amount": 15000,
    "payment_method": "bank_transfer",
    "createdAt": "2025-11-15T10:30:00Z"
  }
}
```

---

#### 2. GET /finance/reports/monthly

**Get comprehensive monthly financial report**

```bash
curl -X GET "http://localhost:3001/api/finance/reports/monthly?month=11&year=2025" \
  -H "Authorization: Bearer JWT_TOKEN"
```

**Query Parameters:**

- `month` (number, required): Month 1-12
- `year` (number, required): Year (e.g., 2025)
- `includeExpenses` (boolean, optional): Default true
- `includeRevenue` (boolean, optional): Default true

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "month": 11,
    "year": "2025",
    "period_start": "2025-11-01",
    "period_end": "2025-11-30",
    "total_revenue": 125000,
    "total_sales": 8,
    "average_order_value": 15625,
    "total_expenses": 45000,
    "expense_count": 12,
    "average_expense": 3750,
    "total_payroll": 35000,
    "payroll_count": 5,
    "average_salary": 7000,
    "gross_profit": 80000,
    "net_profit": 45000,
    "margin_percentage": 36,
    "transactions_by_type": [
      {
        "type": "income",
        "amount": 125000,
        "count": 8,
        "percentage": 65
      },
      {
        "type": "expense",
        "amount": 45000,
        "count": 12,
        "percentage": 23
      }
    ],
    "expenses_by_category": [
      {
        "category": "office",
        "amount": 12000,
        "percentage": 26.7
      },
      {
        "category": "travel",
        "amount": 15000,
        "percentage": 33.3
      }
    ]
  }
}
```

**Key Metrics:**

- **Gross Profit** = Total Revenue - Expenses
- **Net Profit** = Gross Profit - Payroll
- **Margin %** = (Net Profit / Revenue) \* 100

---

### Payroll Endpoints

#### 3. POST /payroll/run

**Run payroll batch for all employees**

```bash
curl -X POST "http://localhost:3001/api/payroll/run" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "period_start": "2025-11-01",
    "period_end": "2025-11-30",
    "month": 11,
    "year": 2025,
    "include_allowances": true,
    "include_deductions": true,
    "notes": "November 2025 Payroll"
  }'
```

**Request Body:**

- `period_start` (string, required): Period start date (ISO 8601)
- `period_end` (string, required): Period end date (ISO 8601)
- `month` (number, required): Month 1-12
- `year` (number, required): Year
- `include_allowances` (boolean, optional): Include allowances (default: true, 15% of base)
- `include_deductions` (boolean, optional): Include deductions (default: true, 10% of base)
- `notes` (string, optional): Batch notes

**Response (201 Created):**

```json
{
  "success": true,
  "batch_id": "PAY-1731643500000-abc123",
  "payroll_count": 5,
  "total_amount": 28750,
  "period_start": "2025-11-01",
  "period_end": "2025-11-30",
  "status": "completed",
  "created_at": "2025-11-15T10:30:00Z",
  "details": [
    {
      "payroll_id": "p1",
      "payroll_no": "PAY-emp1-2025-11",
      "user_id": "emp1",
      "user_name": "John Doe",
      "base_salary": 5000,
      "allowances": 750,
      "deductions": 500,
      "net_salary": 5250,
      "status": "processed",
      "transaction_id": "txn_123"
    }
  ]
}
```

**Processing Details:**

- Creates atomic transaction for all employees
- Auto-generates payroll numbers: `PAY-{empId}-{year}-{month}`
- Calculates: Net = Base + Allowances - Deductions
- Creates finance transaction for each payroll entry
- All-or-nothing guarantee via database transaction

---

#### 4. PATCH /payroll/:id/status

**Update payroll status**

```bash
curl -X PATCH "http://localhost:3001/api/payroll/p1/status" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "paid",
    "paid_date": "2025-11-05"
  }'
```

**Request Body:**

- `status` (string, required): "draft" → "processed" → "paid"
  - Valid transitions:
    - `draft` → `processed` | `failed`
    - `processed` → `paid` | `failed`
    - `paid` → (terminal, no further changes)
    - `failed` → `processed` | `draft`
- `paid_date` (string, optional): Payment date (ISO 8601)

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "p1",
    "payroll_no": "PAY-emp1-2025-11",
    "status": "paid",
    "paid_date": "2025-11-05T00:00:00Z",
    "net_salary": 5250
  },
  "message": "Payroll status updated to paid"
}
```

---

#### 5. GET /payroll/reports/summary

**Get payroll summary report**

```bash
curl -X GET "http://localhost:3001/api/payroll/reports/summary?startDate=2025-11-01&endDate=2025-11-30" \
  -H "Authorization: Bearer JWT_TOKEN"
```

**Query Parameters:**

- `startDate` (string, required): Start date (ISO 8601)
- `endDate` (string, required): End date (ISO 8601)

**Response:**

```json
{
  "success": true,
  "data": {
    "period_start": "2025-11-01",
    "period_end": "2025-11-30",
    "total_payroll_cost": 28750,
    "payroll_count": 5,
    "average_salary": 5750,
    "highest_salary": 6825,
    "lowest_salary": 5250,
    "total_allowances": 4312.5,
    "total_deductions": 2875,
    "paid_payrolls": 3,
    "pending_payrolls": 2,
    "by_status": [
      {
        "status": "paid",
        "count": 3,
        "total_amount": 17325,
        "percentage": 60
      },
      {
        "status": "processed",
        "count": 2,
        "total_amount": 11425,
        "percentage": 40
      }
    ]
  }
}
```

---

#### 6. GET /payroll/analytics/trends

**Get payroll analytics with trends**

```bash
curl -X GET "http://localhost:3001/api/payroll/analytics/trends?startDate=2025-09-01&endDate=2025-11-30" \
  -H "Authorization: Bearer JWT_TOKEN"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "period": "2025-09-01 to 2025-11-30",
    "total_employees": 15,
    "total_cost": 87500,
    "average_salary": 5833,
    "salary_range": {
      "min": 3500,
      "max": 8000,
      "median": 5500
    },
    "department_breakdown": [
      {
        "department": "Engineering",
        "employee_count": 6,
        "total_cost": 38000,
        "average_salary": 6333
      },
      {
        "department": "Sales",
        "employee_count": 5,
        "total_cost": 28000,
        "average_salary": 5600
      }
    ],
    "monthly_trend": [
      {
        "month": "2025-09-01",
        "total_cost": 82000,
        "employee_count": 15,
        "average_salary": 5467
      }
    ]
  }
}
```

---

## 🎨 Frontend Components

### Chart Component

**Location:** `frontend/components/ui/chart.tsx`

```typescript
// Line Chart - Shows trends over time
<LineChart
  data={[
    { label: "Week 1", value: 28000 },
    { label: "Week 2", value: 32000 },
    { label: "Week 3", value: 35000 },
    { label: "Week 4", value: 30000 },
  ]}
  title="Weekly Revenue"
  color="#3b82f6"
/>

// Bar Chart - Categorical comparison
<BarChart
  data={[
    { label: "Office", value: 12000 },
    { label: "Travel", value: 15000 },
    { label: "Marketing", value: 10000 },
  ]}
  title="Expenses by Category"
/>

// Pie Chart - Proportion breakdown
<PieChart
  data={[
    { label: "Salary", value: 35000 },
    { label: "Benefits", value: 5000 },
    { label: "Taxes", value: 2000 },
  ]}
  title="Payroll Breakdown"
/>

// Stat Card - Key metrics
<StatCard
  label="Total Revenue"
  value={125000}
  color="blue"
  trend={12}
  icon={<MdAttachMoney />}
/>
```

**Features:**

- Pure SVG rendering (no external charting library)
- Responsive design
- Animated transitions
- Accessible color schemes
- Multiple variants (Line, Bar, Pie)

---

### Accordion Component

**Location:** `frontend/components/ui/accordion.tsx`

```typescript
// Generic Accordion
<Accordion
  items={[
    {
      title: "Earnings",
      description: "Base + Allowances",
      defaultOpen: true,
      children: <div>Detailed breakdown</div>,
    },
    {
      title: "Deductions",
      description: "Taxes + Other",
      children: <div>Deduction details</div>,
    },
  ]}
  allowMultiple={true}
/>

// Payslip Accordion
<PayslipAccordion
  payroll_no="PAY-2025-11-01"
  employee_name="John Doe"
  period="November 2025"
  details={{
    baseSalary: 5000,
    allowances: 750,
    deductions: 500,
    netSalary: 5250,
  }}
/>
```

**Features:**

- Expandable/collapsible sections
- Multi-expand or single-expand modes
- Specialized PayslipAccordion with automatic formatting
- Smooth animations
- Icon support

---

### Finance Dashboard

**Location:** `frontend/app/dashboard/finance/page.tsx`

**Tabs:**

1. **Overview** - Key metrics, charts, and profit analysis
2. **Reports** - Monthly financial reports with date selection
3. **Transactions** - Transaction history with filtering
4. **Payroll** - Payroll processing and status management

**Features:**

- Real-time metric cards
- Revenue trend visualization
- Expense breakdown charts
- Transaction history table
- Payroll processing interface
- Status update buttons with confirmation

---

### Payroll Dashboard

**Location:** `frontend/app/dashboard/payroll/page.tsx`

**Tabs:**

1. **Overview** - Employee count, total cost, salary analysis
2. **Payslips** - Individual payslip accordions with details
3. **Analytics** - Department breakdown, salary distribution, trends

**Features:**

- Department payroll breakdown
- Salary range analysis
- Monthly cost trend chart
- Employee count by status
- Expandable payslip details
- Export functionality

---

## 🔐 Authentication & Authorization

### Required Roles by Endpoint

| Endpoint                    | Method | Required Role |
| --------------------------- | ------ | ------------- |
| `/finance/transactions`     | POST   | Manager/Admin |
| `/finance/transactions/:id` | PATCH  | Manager/Admin |
| `/finance/reports/monthly`  | GET    | Manager/Admin |
| `/payroll/run`              | POST   | Manager/Admin |
| `/payroll/:id/status`       | PATCH  | Manager/Admin |
| `/payroll/reports/summary`  | GET    | Manager/Admin |
| `/payroll/analytics/trends` | GET    | Manager/Admin |

### Middleware

```typescript
authMiddleware; // Validates JWT token
managerOrAdmin; // Checks role: "manager" or "admin"
```

---

## 💾 Database Schema

### Payroll Model

```prisma
model Payroll {
  id            String    @id @default(cuid())
  payroll_no    String    @unique
  status        String    @default("draft")

  userId        String
  user          User      @relation(...)

  base_salary   Float
  allowances    Float     @default(0)
  deductions    Float     @default(0)
  net_salary    Float

  period_start  DateTime
  period_end    DateTime
  paid_date     DateTime?

  transactions  FinanceTransaction[]

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

### Finance Transaction Model

```prisma
model FinanceTransaction {
  id              String    @id @default(cuid())
  type            String    // income, expense, transfer, payroll, adjustment
  reference_no    String    @unique
  description     String
  amount          Float

  salesId         String?
  payrollId       String?
  payment_method  String?
  reference_doc   String?
  notes           String?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

---

## 🧪 Testing Scenarios

### Scenario 1: Complete Monthly Payroll Run

```bash
# 1. Get current month
MONTH=11
YEAR=2025

# 2. Run payroll
curl -X POST "http://localhost:3001/api/payroll/run" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"period_start\": \"2025-11-01\",
    \"period_end\": \"2025-11-30\",
    \"month\": $MONTH,
    \"year\": $YEAR,
    \"include_allowances\": true,
    \"include_deductions\": true
  }"

# 3. Get payroll report
curl -X GET "http://localhost:3001/api/payroll/reports/summary?startDate=2025-11-01&endDate=2025-11-30" \
  -H "Authorization: Bearer JWT_TOKEN"

# 4. Update individual payrolls to paid
curl -X PATCH "http://localhost:3001/api/payroll/PAYROLL_ID/status" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "paid",
    "paid_date": "2025-11-05"
  }'
```

### Scenario 2: Monthly Financial Reporting

```bash
# 1. Create income transaction
curl -X POST "http://localhost:3001/api/finance/transactions" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "income",
    "reference_no": "INV-001",
    "description": "Sales Revenue",
    "amount": 50000,
    "payment_method": "bank_transfer"
  }'

# 2. Create expense transactions
curl -X POST "http://localhost:3001/api/finance/transactions" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "expense",
    "reference_no": "EXP-001",
    "description": "Office Supplies",
    "amount": 2500,
    "payment_method": "credit_card"
  }'

# 3. Generate monthly report
curl -X GET "http://localhost:3001/api/finance/reports/monthly?month=11&year=2025" \
  -H "Authorization: Bearer JWT_TOKEN"
```

### Scenario 3: Analytics & Trends

```bash
# Get payroll analytics with trends
curl -X GET "http://localhost:3001/api/payroll/analytics/trends?startDate=2025-09-01&endDate=2025-11-30" \
  -H "Authorization: Bearer JWT_TOKEN"

# Get financial report for comparison
curl -X GET "http://localhost:3001/api/finance/reports/monthly?month=11&year=2025" \
  -H "Authorization: Bearer JWT_TOKEN"
```

---

## 🚀 Deployment Checklist

### Backend Deployment

- [ ] Verify database migrations applied: `npx prisma migrate deploy`
- [ ] Set JWT secret in environment variables
- [ ] Configure payment method options
- [ ] Set up logging/monitoring
- [ ] Enable CORS for frontend domain
- [ ] Test all endpoints with real data
- [ ] Set up error tracking (Sentry/similar)
- [ ] Configure rate limiting
- [ ] Backup database
- [ ] Set up automated backups

### Frontend Deployment

- [ ] Update API URL in environment variables
- [ ] Build Next.js project: `npm run build`
- [ ] Test all dashboard pages
- [ ] Verify chart rendering
- [ ] Test responsive design on mobile
- [ ] Enable gzip compression
- [ ] Set up CDN for static assets
- [ ] Configure error boundary
- [ ] Test authentication flow
- [ ] Verify dashboard data loading

### Post-Deployment

- [ ] Monitor error logs
- [ ] Test payroll run with live data
- [ ] Verify financial reports accuracy
- [ ] Check user feedback
- [ ] Monitor performance metrics

---

## 📊 Performance Optimization

### Database Indexing

```prisma
// Existing indexes (automatic)
@@index([userId])           // Payroll queries
@@index([status])           // Status filtering
@@index([payroll_no])       // Lookup by number
@@index([createdAt])        // Date range queries
```

### Query Optimization

- Payroll run uses atomic transaction (single query)
- Financial reports use aggregation pipeline
- Analytics uses indexed queries with date filters
- Dashboard data loading parallelized with Promise.all()

### Caching Strategy

- Monthly reports can be cached for 1 hour
- Analytics cached for 2 hours (after each payroll run)
- Dashboard stats cached for 5 minutes
- Employee list cached with invalidation on updates

---

## 🔍 Troubleshooting

**Q: Payroll run fails with "No active employees found"**
A: Ensure employees have status="active" and role="employee" in database

**Q: Monthly report shows zero amounts**
A: Verify transactions have createdAt within the specified month date range

**Q: Charts not displaying in browser**
A: Check browser console for SVG rendering errors, verify data format

**Q: Payroll status transition fails**
A: Verify you're following valid transition paths (draft→processed→paid)

**Q: API returns 403 Forbidden**
A: Verify user has "manager" or "admin" role for restricted endpoints

---

## 📚 Related Modules

- **POS Module** - Sales orders that trigger income transactions
- **HR Module** - Employee management, salary definitions
- **Fleet Module** - Delivery costs that become expenses
- **Inventory Module** - Product costs for COGS calculations

---

## 📞 Support & Maintenance

**System Status Dashboard:** `/admin/system-health`

**Database Maintenance:**

```bash
# Backup
pg_dump dbname > backup.sql

# Check transaction logs
SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 10;
```

**Common Maintenance Tasks:**

- Weekly: Review failed payroll attempts
- Monthly: Verify financial report accuracy
- Quarterly: Audit transaction logs
- Annually: Archive old payroll records

---

**Last Updated:** November 15, 2025  
**Version:** 1.0.0  
**Status:** Production Ready ✅
