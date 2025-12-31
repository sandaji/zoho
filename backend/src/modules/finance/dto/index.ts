/**
 * Finance Module - Data Transfer Objects
 */

export interface CreateTransactionDTO {
  type: string;
  reference_no: string;
  description: string;
  amount: number;
  salesId?: string;
  payrollId?: string;
  payment_method?: string;
  reference_doc?: string;
  notes?: string;
}

export interface UpdateTransactionDTO {
  description?: string;
  amount?: number;
  payment_method?: string;
  notes?: string;
}

export interface TransactionResponseDTO {
  id: string;
  type: string;
  reference_no: string;
  description: string;
  amount: number;
  salesId?: string;
  payrollId?: string;
  payment_method?: string;
  reference_doc?: string;
  notes?: string;
  createdAt: string;
}

export interface TransactionListQueryDTO {
  page?: number;
  limit?: number;
  type?: string;
  startDate?: string;
  endDate?: string;
  salesId?: string;
  payrollId?: string;
}

export interface FinancialReportDTO {
  period_start: string;
  period_end: string;
  income: number;
  expenses: number;
  transfers: number;
  adjustments: number;
  net: number;
}

export interface RevenueAnalyticsDTO {
  total_sales: number;
  total_revenue: number;
  average_order_value: number;
  discount_percentage: number;
  tax_amount: number;
}

// ============================================================================
// MONTHLY REPORT DTOs
// ============================================================================

export interface GetMonthlyReportQueryDTO {
  month: number; // 1-12
  year: number;
  includeExpenses?: boolean;
  includeRevenue?: boolean;
}

export interface MonthlyReportResponseDTO {
  month: number;
  year: string;
  period_start: string;
  period_end: string;

  // Revenue metrics
  total_revenue: number;
  total_sales: number;
  average_order_value: number;

  // Expense metrics
  total_expenses: number;
  expense_count: number;
  average_expense: number;

  // Payroll metrics
  total_payroll: number;
  payroll_count: number;
  average_salary: number;

  // Summary
  gross_profit: number;
  net_profit: number;
  margin_percentage: number;

  // Breakdown by type
  transactions_by_type: TransactionTypeBreakdown[];
  expenses_by_category: ExpenseCategoryBreakdown[];
}

export interface TransactionTypeBreakdown {
  type: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface ExpenseCategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

// ============================================================================
// PAYROLL DTOs
// ============================================================================

export interface PayrollRunDTO {
  period_start: string;
  period_end: string;
  month: number;
  year: number;
  include_allowances?: boolean;
  include_deductions?: boolean;
  notes?: string;
}

export interface PayrollRunResponseDTO {
  success: boolean;
  batch_id: string;
  payroll_count: number;
  total_amount: number;
  period_start: string;
  period_end: string;
  status: string;
  created_at: string;
  details: PayrollDetailResponseDTO[];
}

export interface PayrollDetailResponseDTO {
  payroll_id: string;
  payroll_no: string;
  user_id: string;
  user_name: string;
  base_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  status: string;
  transaction_id?: string;
  paid_date?: string;
}

export interface PayrollReportDTO {
  period_start: string;
  period_end: string;
  total_payroll_cost: number;
  payroll_count: number;
  average_salary: number;
  highest_salary: number;
  lowest_salary: number;
  total_allowances: number;
  total_deductions: number;
  paid_payrolls: number;
  pending_payrolls: number;
  by_status: PayrollStatusBreakdown[];
}

export interface PayrollStatusBreakdown {
  status: string;
  count: number;
  total_amount: number;
  percentage: number;
}

export interface PayrollAnalyticsDTO {
  period: string;
  total_employees: number;
  total_cost: number;
  average_salary: number;
  salary_range: {
    min: number;
    max: number;
    median: number;
  };
  department_breakdown: DepartmentPayrollBreakdown[];
  monthly_trend?: MonthlyPayrollTrend[];
}

export interface DepartmentPayrollBreakdown {
  department: string;
  employee_count: number;
  total_cost: number;
  average_salary: number;
}

export interface MonthlyPayrollTrend {
  month: string;
  total_cost: number;
  employee_count: number;
  average_salary: number;
}

// ============================================================================
// BRANCH DASHBOARD DTOs
// ============================================================================

export interface BranchKPIResponseDTO {
  branch_id: string;
  branch_name: string;
  branch_code?: string;
  location?: string;

  // Sales KPIs
  total_sales: number;
  total_revenue: number;
  average_order_value: number;
  sales_this_month: number;
  sales_growth_percentage: number;
  top_selling_products: TopProductDTO[];

  // Operational KPIs
  total_employees: number;
  active_employees: number;
  total_inventory_value: number;
  low_stock_items: number;
  total_trucks: number;
  active_deliveries: number;

  // Financial KPIs
  total_expenses: number;
  total_payroll: number;
  net_profit: number;
  profit_margin: number;

  // Performance
  delivery_success_rate: number;
  average_delivery_time: number;
  customer_satisfaction_score?: number;

  // Period
  period_start: string;
  period_end: string;
  generated_at: string;
}

export interface BranchSalesMetricsDTO {
  branch_id: string;
  period: string;
  total_sales: number;
  total_revenue: number;
  order_count: number;
  average_order_value: number;
  sales_by_product_category: SalesCategoryBreakdown[];
  daily_sales_trend: DailySalesTrendDTO[];
  top_customers: TopCustomerDTO[];
}

export interface BranchOperationsMetricsDTO {
  branch_id: string;
  period: string;

  // Staff
  total_employees: number;
  active_employees: number;
  employee_attendance_rate: number;
  departments: DepartmentDTO[];

  // Inventory
  total_inventory_value: number;
  total_items_in_stock: number;
  low_stock_items: number;
  out_of_stock_items: number;
  inventory_turnover_rate: number;

  // Fleet
  total_trucks: number;
  active_trucks: number;
  maintenance_pending: number;
  fuel_cost_total: number;
  utilization_rate: number;

  // Warehouse
  total_warehouses: number;
  warehouse_capacity_utilization: WarehouseCapacityDTO[];
}

export interface BranchPayrollMetricsDTO {
  branch_id: string;
  period: string;
  month: number;
  year: number;

  // Totals
  total_payroll_cost: number;
  total_allowances: number;
  total_deductions: number;
  total_taxes: number;

  // Employee breakdown
  total_employees_on_payroll: number;
  active_payroll_runs: number;
  pending_payments: number;

  // Statistics
  average_salary: number;
  highest_salary: number;
  lowest_salary: number;

  // Status breakdown
  paid_count: number;
  pending_count: number;
  failed_count: number;

  // Costs by department
  by_department: PayrollDepartmentBreakdown[];
}

export interface BranchDashboardDTO {
  branch_id: string;
  branch_name: string;
  branch_code?: string;
  location?: string;
  manager_name?: string;

  // KPIs
  kpis: BranchKPIResponseDTO;

  // Detailed metrics
  sales_metrics: BranchSalesMetricsDTO;
  operations_metrics: BranchOperationsMetricsDTO;
  payroll_metrics: BranchPayrollMetricsDTO;

  // Recent activity
  recent_sales: SalesActivityDTO[];
  recent_deliveries: DeliveryActivityDTO[];
  recent_transactions: TransactionActivityDTO[];

  // Alerts
  alerts: AlertDTO[];
}

// Supporting DTOs
export interface TopProductDTO {
  product_id: string;
  product_name: string;
  quantity_sold: number;
  revenue: number;
  percentage_of_total: number;
}

export interface SalesCategoryBreakdown {
  category: string;
  quantity: number;
  amount: number;
  percentage: number;
}

export interface DailySalesTrendDTO {
  date: string;
  sales_count: number;
  revenue: number;
  average_order_value: number;
}

export interface TopCustomerDTO {
  customer_id: string;
  customer_name: string;
  total_purchases: number;
  total_spent: number;
  order_count: number;
}

export interface DepartmentDTO {
  department_name: string;
  employee_count: number;
  total_salary: number;
  average_salary: number;
}

export interface WarehouseCapacityDTO {
  warehouse_id: string;
  warehouse_name: string;
  total_capacity: number;
  current_items: number;
  utilization_percentage: number;
}

export interface PayrollDepartmentBreakdown {
  department: string;
  employee_count: number;
  total_cost: number;
  average_salary: number;
  allowances: number;
  deductions: number;
}

export interface SalesActivityDTO {
  id: string;
  reference_no: string;
  customer_name: string;
  amount: number;
  status: string;
  created_at: string;
}

export interface DeliveryActivityDTO {
  id: string;
  delivery_no: string;
  destination: string;
  status: string;
  expected_delivery: string;
}

export interface TransactionActivityDTO {
  id: string;
  type: string;
  reference_no: string;
  amount: number;
  created_at: string;
}

export interface AlertDTO {
  id: string;
  severity: "critical" | "warning" | "info";
  message: string;
  action?: string;
  created_at: string;
}

export interface BranchSummaryDTO {
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
