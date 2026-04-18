/**
 * Finance Dashboard Type Definitions
 *
 * This file contains all TypeScript interfaces for the Finance Module
 * to ensure type safety across components and API calls.
 */

// ============================================================================
// EXISTING API TYPES (Already implemented)
// ============================================================================

export interface FinancialSummary {
  cashBalance: number;
  accountsReceivable: number;
  accountsPayable: number;
  revenue: number;
  profit: number;
  expenses: number;
  grossMargin: number;
  netMargin: number;
  salesCount: number;
  activeProducts: number;
  lowStockProducts: number;
  payrollExpenses: number;
}

export interface ChartData {
  name: string;
  month: number;
  revenue: number;
  expenses: number;
  profit: number;
}

// ============================================================================
// NEW API TYPES (To be implemented)
// ============================================================================

/**
 * Transaction Type
 * Represents a single financial transaction
 */
export interface Transaction {
  id: string;
  type: "income" | "expense";
  category: TransactionCategory;
  amount: number;
  date: string; // ISO 8601 date string
  description: string;
  reference?: string;
}

export type TransactionCategory =
  // Expense categories
  | "food"
  | "utilities"
  | "shopping"
  | "internet"
  | "payroll"
  | "rent"
  | "supplies"
  | "marketing"
  | "other"
  // Income categories
  | "income"
  | "sales"
  | "services";

/**
 * Transactions API Response
 */
export interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
}

/**
 * Expense Category
 * Used for the donut chart breakdown
 */
export interface ExpenseCategory {
  category: string;
  amount: number;
  count: number;
  percentage: number;
  color?: string; // Optional color override
}

/**
 * Expense Categories API Response
 */
export interface ExpenseCategoriesResponse {
  categories: ExpenseCategory[];
  totalExpenses: number;
  period: string;
}

/**
 * Daily Spending Data
 * Tracks spending against daily limits
 */
export interface DailySpending {
  spent: number;
  limit: number;
  remaining: number;
  percentage: number;
  date: string; // ISO 8601 date string
  transactions: number;
}

/**
 * Daily Spending API Response
 */
export type DailySpendingResponse = DailySpending;

/**
 * Savings Goal
 * Represents a financial goal/target
 */
export interface SavingsGoal {
  id: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  remaining: number;
  percentage: number;
  deadline?: string; // ISO 8601 date string
  status: "active" | "completed";
  createdAt: string; // ISO 8601 date string
  updatedAt: string; // ISO 8601 date string
  icon?: string; // Optional icon name
  color?: string; // Optional color for UI
}

/**
 * Savings Goals API Response
 */
export interface SavingsGoalsResponse {
  goals: SavingsGoal[];
  totalSaved: number;
  totalTarget: number;
}

/**
 * Create Savings Goal Request
 */
export interface CreateSavingsGoalRequest {
  name: string;
  description?: string;
  targetAmount: number;
  deadline?: string;
}

/**
 * Update Savings Goal Request
 */
export interface UpdateSavingsGoalRequest {
  name?: string;
  description?: string;
  targetAmount?: number;
  currentAmount?: number;
  deadline?: string;
  status?: "active" | "completed";
}

// ============================================================================
// API QUERY PARAMETERS
// ============================================================================

export interface TransactionsQueryParams {
  limit?: number;
  type?: "income" | "expense";
  startDate?: string;
  endDate?: string;
}

export interface ExpenseCategoriesQueryParams {
  period?: "today" | "week" | "month" | "year";
  startDate?: string;
  endDate?: string;
}

export interface DailySpendingQueryParams {
  date?: string;
}

export interface SavingsGoalsQueryParams {
  status?: "active" | "completed" | "all";
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

/**
 * Props for CreditCardWidget component
 */
export interface CreditCardWidgetProps {
  balance: number;
  cardNumber?: string;
  expiryDate?: string;
  holderName?: string;
  className?: string;
}

/**
 * Props for CashflowChart component
 */
export interface CashflowChartProps {
  data: Array<{
    name: string;
    revenue: number;
    expenses: number;
  }>;
}

/**
 * Props for ExpenseDonutChart component
 */
export interface ExpenseDonutChartProps {
  data: ExpenseCategory[];
}

/**
 * Props for RecentTransactions component
 */
export interface RecentTransactionsProps {
  transactions: Transaction[];
  onViewAll?: () => void;
}

/**
 * Props for DailyLimitProgress component
 */
export interface DailyLimitProgressProps {
  spent: number;
  limit: number;
  className?: string;
}

/**
 * Props for SavingPlans component
 */
export interface SavingPlansProps {
  plans: SavingsGoal[];
  onAddGoal?: () => void;
  className?: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Loading state for async operations
 */
export type LoadingState = "idle" | "loading" | "success" | "error";

/**
 * Dashboard data aggregation
 */
export interface DashboardData {
  summary: FinancialSummary | null;
  chartData: ChartData[];
  transactions: Transaction[];
  expenseCategories: ExpenseCategory[];
  dailySpending: DailySpending | null;
  savingsGoals: SavingsGoal[];
}

/**
 * Dashboard loading states
 */
export interface DashboardLoadingStates {
  summary: LoadingState;
  chartData: LoadingState;
  transactions: LoadingState;
  expenseCategories: LoadingState;
  dailySpending: LoadingState;
  savingsGoals: LoadingState;
}

// ============================================================================
// PHASE 1 TYPES - KPIs, Alerts, Period Management
// ============================================================================

/**
 * Financial KPIs / Key Performance Indicators
 */
export interface FinancialKPIs {
  grossProfitMargin: number;
  netProfitMargin: number;
  returnOnSales: number;
  currentRatio: number;
  quickRatio: number;
  salesGrowth: number;
  expenseRatio: number;
  averageSaleValue: number;
  cashPosition: number;
  outstandingReceivables: number;
}

/**
 * Fiscal Period
 */
export interface FiscalPeriod {
  id: string;
  year: number;
  quarter?: number;
  month?: number;
  startDate: string;
  endDate: string;
  status: "open" | "locked" | "closed";
  isLocked: boolean;
  lockedDate?: string;
}

/**
 * Financial Alert
 */
export type AlertSeverity = "critical" | "warning" | "info";

export interface FinancialAlert {
  id: string;
  type:
    | "overdue_invoice"
    | "upcoming_payment"
    | "low_cash"
    | "locked_period"
    | "reconciliation_pending";
  severity: AlertSeverity;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  timestamp: string;
  read: boolean;
}

/**
 * Bank Account Summary
 */
export interface BankAccount {
  id: string;
  accountName: string;
  accountNumber: string;
  balance: number;
  lastReconciliationDate?: string;
  unreconciliedTransactions: number;
  currency?: string;
}

/**
 * API Responses for Phase 1
 */

export interface FinancialKPIsResponse {
  kpis: FinancialKPIs;
  timestamp: string;
}

export interface FiscalPeriodsResponse {
  periods: FiscalPeriod[];
  currentPeriod: FiscalPeriod;
}

export interface FinancialAlertsResponse {
  alerts: FinancialAlert[];
  totalCount: number;
  criticalCount: number;
  warningCount: number;
}

export interface BankAccountsResponse {
  accounts: BankAccount[];
  totalBalance: number;
}

// ============================================================================
// PHASE 2 TYPES - AR Aging, AP Status, Bank Accounts, P&L Preview
// ============================================================================

/**
 * AR Aging Bucket
 */
export interface ARAgingBucket {
  bucket: "current" | "1-30_days" | "31-60_days" | "61-90_days" | "over_90_days";
  label: string;
  amount: number;
  count: number;
  percentage: number;
}

/**
 * AR Aging Report
 */
export interface ARAgingReport {
  current: number;
  "1-30_days": number;
  "31-60_days": number;
  "61-90_days": number;
  over_90_days: number;
  total: number;
}

/**
 * AR Aging Summary Response
 */
export interface ARAgingSummaryResponse {
  aging: ARAgingReport;
  buckets: ARAgingBucket[];
  totalOutstanding: number;
  criticalOverdue: number; // over 90 days
}

/**
 * AP Status Item
 */
export interface APStatusItem {
  status: "outstanding" | "partial" | "scheduled" | "paid";
  label: string;
  count: number;
  totalAmount: number;
  percentage: number;
  color?: string;
}

/**
 * AP Status Summary Response
 */
export interface APStatusSummaryResponse {
  items: APStatusItem[];
  totalPayables: number;
  upcomingPayments: number; // Due within 30 days
  overdueAmount: number;
}

/**
 * P&L Quick Preview
 */
export interface PLQuickPreview {
  period: string; // Current period or date range
  revenue: number;
  cogs: number; // Cost of Goods Sold
  grossProfit: number;
  grossMarginPercent: number;
  operatingExpenses: number;
  operatingIncome: number;
  netIncome: number;
  netMarginPercent: number;
  ebitda: number; // Earnings Before Interest, Tax, Depreciation, Amortization
}

/**
 * P&L Quick Preview Response
 */
export interface PLQuickPreviewResponse {
  current: PLQuickPreview;
  previous?: PLQuickPreview; // For comparison
}

// ============================================================================
// PHASE 3 TYPES - Tax Summary, Reconciliation Status, Trends, Top Customers
// ============================================================================

/**
 * Tax Category Item
 */
export interface TaxCategory {
  category: string;
  rate: number;
  baseAmount: number;
  taxAmount: number;
  percentage: number;
}

/**
 * Tax Summary Response
 */
export interface TaxSummaryResponse {
  period: string;
  categories: TaxCategory[];
  totalTaxable: number;
  totalTax: number;
  effectiveRate: number;
  filingStatus: "filed" | "pending" | "due" | "overdue";
  filingDeadline?: string;
}

/**
 * Reconciliation Item
 */
export interface ReconciliationItem {
  accountId: string;
  accountName: string;
  status: "reconciled" | "pending" | "in_progress" | "discrepancy";
  lastReconciliationDate: string;
  transactionCount: number;
  amount: number;
  variance?: number; // Difference between book and bank
  daysOverdue: number;
}

/**
 * Reconciliation Status Response
 */
export interface ReconciliationStatusResponse {
  items: ReconciliationItem[];
  totalAccounts: number;
  reconciledCount: number;
  pendingCount: number;
  discrepancyCount: number;
  totalAmount: number;
}

/**
 * Trend Data Point
 */
export interface TrendDataPoint {
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
}

/**
 * Period Comparison Trends Response
 */
export interface PeriodComparisonTrendsResponse {
  trends: TrendDataPoint[];
  currentPeriod: TrendDataPoint;
  previousPeriod: TrendDataPoint;
  revenueGrowth: number;
  expenseChange: number;
  profitChange: number;
  marginTrend: number;
}

/**
 * Top Customer Item
 */
export interface TopCustomer {
  customerId: string;
  customerName: string;
  totalRevenue: number;
  invoiceCount: number;
  averageInvoiceValue: number;
  outstandingBalance: number;
  lastTransactionDate: string;
  trend: number; // Percentage change from previous period
}

/**
 * Top Customers & Vendors Response
 */
export interface TopCustomersVendorsResponse {
  topCustomers: TopCustomer[];
  topVendors: TopCustomer[];
  totalCustomerRevenue: number;
  totalVendorExpenses: number;
  periodStart: string;
  periodEnd: string;
}
