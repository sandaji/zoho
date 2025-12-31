# 🏢 Branch Dashboard System - Complete Guide

## Overview

The Branch Dashboard System provides comprehensive operational visibility for individual branches across the enterprise. It aggregates data from sales, payroll, inventory, and fleet operations to present unified KPIs and metrics for branch managers and administrators.

**Key Features:**

- ✅ Real-time KPI aggregation from multiple modules
- ✅ Sales analytics and trend tracking
- ✅ Operations monitoring (inventory, fleet, warehouse)
- ✅ Payroll metrics and employee statistics
- ✅ Quick action popovers for common tasks
- ✅ Alert system for critical issues
- ✅ Responsive UI with Cards, Charts, and Stats

---

## Architecture

### Backend Structure

```
backend/src/modules/finance/
├── dto/
│   └── index.ts                          # 15+ Branch DTOs
├── service/
│   └── branch.service.ts                 # ~800 lines aggregation logic
└── controller/
    └── branch.controller.ts              # Branch endpoint handlers
```

### Frontend Structure

```
frontend/
├── components/ui/
│   ├── stats.tsx                         # StatCard component variants
│   ├── popover.tsx                       # Quick action popover
│   ├── chart.tsx                         # LineChart, BarChart (existing)
│   └── accordion.tsx                     # Collapsible content (existing)
└── app/dashboard/
    ├── branches/page.tsx                 # Branch list view
    └── branch/
        └── [id]/page.tsx                 # Individual branch dashboard
```

---

## API Endpoints

### GET /branches/:id/dashboard

Get complete branch dashboard with all KPIs and metrics.

**Authentication:** Required (Manager or Admin role)

**Request:**

```bash
curl -X GET http://localhost:3001/api/branches/br-1/dashboard \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "branch_id": "br-1",
    "branch_name": "Downtown Branch",
    "branch_code": "BR-001",
    "location": "123 Main St, City Center",
    "manager_name": "John Smith",
    "kpis": {
      "total_sales": 450,
      "total_revenue": 1250000,
      "average_order_value": 2778,
      "sales_this_month": 125000,
      "sales_growth_percentage": 12.5,
      "top_selling_products": [
        {
          "product_id": "prod-1",
          "product_name": "Premium Laptop",
          "quantity_sold": 150,
          "revenue": 450000,
          "percentage_of_total": 36
        }
      ],
      "total_employees": 45,
      "active_employees": 42,
      "total_inventory_value": 580000,
      "low_stock_items": 8,
      "total_trucks": 12,
      "active_deliveries": 5,
      "total_expenses": 345000,
      "total_payroll": 180000,
      "net_profit": 725000,
      "profit_margin": 58,
      "delivery_success_rate": 96.5,
      "average_delivery_time": 2.5,
      "period_start": "2025-11-01T00:00:00.000Z",
      "period_end": "2025-11-30T23:59:59.999Z",
      "generated_at": "2025-11-15T10:30:00.000Z"
    },
    "sales_metrics": {
      "branch_id": "br-1",
      "period": "2025-11",
      "total_sales": 450,
      "total_revenue": 1250000,
      "order_count": 450,
      "average_order_value": 2778,
      "sales_by_product_category": [
        {
          "category": "Electronics",
          "quantity": 50,
          "amount": 500000,
          "percentage": 40
        }
      ],
      "daily_sales_trend": [
        {
          "date": "2025-11-01",
          "sales_count": 15,
          "revenue": 42000,
          "average_order_value": 2800
        }
      ],
      "top_customers": [
        {
          "customer_id": "cust-1",
          "customer_name": "ABC Corporation",
          "total_purchases": 45,
          "total_spent": 125000,
          "order_count": 45
        }
      ]
    },
    "operations_metrics": {
      "total_employees": 45,
      "active_employees": 42,
      "employee_attendance_rate": 93.3,
      "departments": [
        {
          "department_name": "Sales",
          "employee_count": 15,
          "total_salary": 60000,
          "average_salary": 5000
        }
      ],
      "total_inventory_value": 580000,
      "total_items_in_stock": 2450,
      "low_stock_items": 8,
      "out_of_stock_items": 2,
      "inventory_turnover_rate": 0.58,
      "total_trucks": 12,
      "active_trucks": 10,
      "maintenance_pending": 2,
      "fuel_cost_total": 15000,
      "utilization_rate": 83,
      "warehouse_capacity_utilization": [
        {
          "warehouse_id": "wh-1",
          "warehouse_name": "Main Warehouse",
          "total_capacity": 1600,
          "current_items": 1200,
          "utilization_percentage": 75
        }
      ]
    },
    "payroll_metrics": {
      "branch_id": "br-1",
      "period": "2025-11",
      "month": 11,
      "year": 2025,
      "total_payroll_cost": 180000,
      "total_allowances": 36000,
      "total_deductions": 18000,
      "total_taxes": 18000,
      "total_employees_on_payroll": 42,
      "active_payroll_runs": 40,
      "pending_payments": 2,
      "average_salary": 4286,
      "highest_salary": 8500,
      "lowest_salary": 2000,
      "paid_count": 40,
      "pending_count": 2,
      "failed_count": 0,
      "by_department": [
        {
          "department": "Sales",
          "employee_count": 15,
          "total_cost": 60000,
          "average_salary": 5000,
          "allowances": 12000,
          "deductions": 6000
        }
      ]
    },
    "recent_sales": [
      {
        "id": "s-1",
        "reference_no": "SAL-001",
        "customer_name": "ABC Corp",
        "amount": 45000,
        "status": "completed",
        "created_at": "2025-11-15T10:00:00.000Z"
      }
    ],
    "recent_deliveries": [
      {
        "id": "d-1",
        "delivery_no": "DEL-001",
        "destination": "City Center",
        "status": "in_transit",
        "expected_delivery": "2025-11-15T16:00:00.000Z"
      }
    ],
    "recent_transactions": [
      {
        "id": "t-1",
        "type": "income",
        "reference_no": "TRX-001",
        "amount": 50000,
        "created_at": "2025-11-15T09:30:00.000Z"
      }
    ],
    "alerts": [
      {
        "id": "alert-stock-br-1",
        "severity": "warning",
        "message": "8 items running low on stock",
        "action": "Review Inventory",
        "created_at": "2025-11-15T10:30:00.000Z"
      }
    ]
  }
}
```

**Error Responses:**

```json
{
  "success": false,
  "error": "Branch not found",
  "status": 404
}
```

---

## Frontend Components

### StatCard Component

Display KPI statistics with icons, values, trends, and variants.

**Usage:**

```tsx
import { StatCard } from "@/components/ui/stats";

<StatCard
  title="Total Revenue"
  value={1250000}
  icon={<MdAttachMoney />}
  variant="success"
  prefix="$"
  trend={{ value: 12.5, direction: "up" }}
  size="md"
/>;
```

**Props:**

```typescript
interface StatCardProps {
  title: string; // Card title
  value: number | string; // KPI value
  icon?: React.ReactNode; // Icon component
  variant?: "default" | "success" | "warning" | "danger" | "info";
  subtext?: string; // Optional subtext
  trend?: { value: number; direction: "up" | "down" }; // Trend indicator
  prefix?: string; // Value prefix (e.g., "$")
  suffix?: string; // Value suffix (e.g., "%")
  size?: "sm" | "md" | "lg"; // Card size
}
```

**Predefined Cards:**

```tsx
import {
  SalesStatCard,
  RevenueStatCard,
  ExpenseStatCard,
  ProfitStatCard,
  EmployeeStatCard,
  InventoryStatCard,
  FleetStatCard,
  PercentageStatCard,
} from "@/components/ui/stats";

// Usage
<RevenueStatCard value={1250000} trend={{ value: 12.5, direction: "up" }} />;
```

### Popover Component

Quick action menu for common tasks and confirmations.

**Usage:**

```tsx
import { Popover, QuickActionButtons } from "@/components/ui/popover";

const actions = [
  {
    label: "Export Report",
    icon: <MdFileDownload />,
    onClick: () => exportReport(),
    variant: "default",
  },
  {
    label: "Delete",
    icon: <MdDelete />,
    onClick: () => deleteBranch(),
    variant: "danger",
  },
];

<Popover actions={actions} trigger="click" />;
```

**Props:**

```typescript
interface PopoverProps {
  actions: PopoverAction[];
  trigger?: "click" | "hover";
  placement?: "top" | "bottom" | "left" | "right";
  children?: React.ReactNode; // Custom trigger content
  className?: string;
}

interface PopoverAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger" | "success";
  divider?: boolean;
}
```

### Dashboard Pages

#### Branches List Page

Location: `/dashboard/branches`

**Features:**

- List all branches with summary cards
- Search by branch name or code
- Sort by revenue or employee count
- Navigate to individual branch dashboards
- Quick view stats (revenue, employees, inventory)

**Mock Data Structure:**

```typescript
interface BranchSummary {
  id: string;
  name: string;
  code: string;
  location: string;
  manager_name?: string;
  total_revenue: number;
  total_employees: number;
  inventory_value: number;
  sales_growth: number;
  profit_margin: number;
}
```

#### Individual Branch Dashboard

Location: `/dashboard/branch/[id]`

**Four Tabs:**

1. **Overview Tab**
   - Key KPIs (Revenue, Sales, Employees, Profit Margin)
   - Financial summary (Revenue, Expenses, Payroll, Net Profit)
   - Operations status (Inventory, Trucks, Delivery Rate, Pending)

2. **Sales Tab**
   - Sales count, revenue, average order value
   - 30-day revenue trend chart
   - Top customers list with purchase amounts

3. **Operations Tab**
   - Employee stats with attendance rate
   - Inventory status (total, low stock, out of stock)
   - Fleet utilization (active trucks, maintenance)
   - Warehouse capacity visualization

4. **Payroll Tab**
   - Payroll cost, average salary, payment status
   - Salary range (min/max/avg)
   - Allowances and deductions breakdown
   - Department-wise payroll distribution

---

## KPI Calculations

### Financial KPIs

```
Total Revenue = SUM(Sales.total) for branch
Average Order Value = Total Revenue / Number of Sales
Profit Margin % = (Net Profit / Total Revenue) × 100
Net Profit = Total Revenue - Total Expenses - Total Payroll
Sales Growth % = ((Current Month Revenue - Last Month Revenue) / Last Month Revenue) × 100
```

### Operational KPIs

```
Active Employees = COUNT(Users where status='active' and branchId=branch)
Inventory Value = SUM(Product.price × Inventory.quantity) for warehouse in branch
Low Stock Items = COUNT(Inventory where quantity < 10)
Fleet Utilization % = (Active Trucks / Total Trucks) × 100
Delivery Success Rate % = (Completed Deliveries / Total Deliveries) × 100
Average Delivery Time = AVERAGE(Delivery.expected_delivery - Delivery.created_at)
```

### Payroll KPIs

```
Total Payroll Cost = SUM(Payroll.net_salary) for month
Average Salary = Total Payroll Cost / Number of Employees
Salary Range = [MIN(Payroll.net_salary), MAX(Payroll.net_salary)]
Total Taxes = Total Payroll Cost × 0.10 (approximate)
Paid Percentage = (Paid Count / Total Count) × 100
```

---

## Testing Scenarios

### Scenario 1: View Branch Dashboard

```bash
# 1. Get branch dashboard
curl -X GET http://localhost:3001/api/branches/br-1/dashboard \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json"

# Expected: 200 OK with complete dashboard data
```

**Verification:**

- ✓ KPIs calculated correctly
- ✓ Sales metrics aggregated
- ✓ Operations data included
- ✓ Payroll information present
- ✓ Alerts generated for low stock, pending deliveries

### Scenario 2: Filter and Sort Branches

```bash
# 1. Navigate to /dashboard/branches
# 2. Search for "downtown"
# 3. Expected: Display only "Downtown Branch"
# 4. Sort by "Highest Revenue"
# 5. Expected: Branches ordered by revenue (descending)
```

### Scenario 3: Export Report

```bash
# 1. Click "Export Report" button
# 2. Select export format (PDF/CSV)
# 3. Expected: Report downloads with branch dashboard data
```

---

## Database Models

### Key Relations

```
Branch
├── Users (staff)
├── Warehouses
│   └── Inventory
├── Sales
│   └── SalesItems
├── Deliveries
├── Trucks
├── Payroll
└── FinanceTransactions
```

### Indexes for Performance

```sql
CREATE INDEX idx_sales_branch_date ON sales(branchId, createdAt);
CREATE INDEX idx_delivery_branch_status ON delivery(branchId, status);
CREATE INDEX idx_inventory_warehouse ON inventory(warehouseId);
CREATE INDEX idx_payroll_branch_month ON payroll(createdAt);
CREATE INDEX idx_finance_type_date ON finance_transaction(type, createdAt);
```

---

## Security

### Authentication

- All endpoints require valid JWT token
- Manager/Admin role verification
- Branch-specific data access control

### Data Privacy

- Only managers and admins can access dashboards
- Employee payroll data sanitized
- Customer information protected

### Rate Limiting

- Dashboard API: 100 requests/minute per user
- List endpoint: 50 requests/minute per user

---

## Performance Optimization

### Caching Strategy

```typescript
// Cache dashboard for 5 minutes
const DASHBOARD_CACHE_TTL = 5 * 60 * 1000;

// Cache key structure
const cacheKey = `branch-dashboard-${branchId}-${period}`;
```

### Query Optimization

1. **Parallel Queries:**
   - Fetch KPIs, sales, operations, payroll in parallel
   - Use Promise.all() for concurrent execution

2. **Data Aggregation:**
   - Pre-aggregate data in service layer
   - Avoid N+1 queries

3. **Pagination:**
   - Limit recent items to 5-10 records
   - Use offset/limit for lists

---

## Troubleshooting

### Issue: Dashboard loading slowly

**Solution:**

1. Check database indexes are created
2. Verify no N+1 queries in service
3. Enable result caching
4. Use query pagination

### Issue: Incorrect KPI values

**Solution:**

1. Verify calculation logic in branch.service.ts
2. Check date range filtering
3. Validate data relationships (branchId foreign keys)
4. Run test calculations manually

### Issue: Missing alerts

**Solution:**

1. Check alert generation threshold values
2. Verify inventory, delivery, truck queries return data
3. Confirm alert storage mechanism

### Issue: API returns 403 Forbidden

**Solution:**

1. Verify user has Manager or Admin role
2. Check JWT token validity
3. Confirm authorization middleware enabled

---

## Deployment Checklist

- [ ] Database migrations applied (branch indexes)
- [ ] Environment variables configured (API_URL, JWT_SECRET)
- [ ] API endpoints tested with curl commands
- [ ] Frontend dashboard pages load without errors
- [ ] StatCard variants render correctly
- [ ] Popover actions function properly
- [ ] Charts display data accurately
- [ ] Responsive design tested on mobile/tablet
- [ ] Authentication middleware active
- [ ] Error handling comprehensive
- [ ] Performance tested (response time < 2s)
- [ ] Caching mechanism enabled
- [ ] Monitoring alerts configured
- [ ] Logs reviewed for errors

---

## Metrics & Monitoring

### Key Metrics to Track

```
- Dashboard API response time
- Cache hit ratio
- Error rate by endpoint
- User access patterns
- Top viewed branches
- Most used filters
```

### Alerts to Configure

```
- Dashboard API response time > 3s
- Error rate > 5%
- Database query time > 1s
- Cache size > 500MB
```

---

## Related Documentation

- Finance Module: `FINANCE_PAYROLL_GUIDE.md`
- Payroll System: `FINANCE_PAYROLL_GUIDE.md`
- Inventory Management: Backend inventory module
- Fleet Operations: Backend fleet module
- Sales Module: Backend POS module

---

## Version History

| Version | Date       | Changes                                                                     |
| ------- | ---------- | --------------------------------------------------------------------------- |
| 1.0.0   | 2025-11-15 | Initial release with KPI aggregation, multi-tab dashboard, branch list view |

---

**Status:** ✅ Production Ready

Last Updated: November 15, 2025
