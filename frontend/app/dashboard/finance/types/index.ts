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
