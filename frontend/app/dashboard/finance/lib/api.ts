/**
 * Finance API Client
 *
 * Centralized API functions for the Finance Dashboard
 * Handles all data fetching with proper error handling and type safety
 */

import { apiClient } from "@/lib/api-client";
import type {
  ApiResponse,
  FinancialSummary,
  ChartData,
  TransactionsResponse,
  TransactionsQueryParams,
  ExpenseCategoriesResponse,
  ExpenseCategoriesQueryParams,
  DailySpendingResponse,
  DailySpendingQueryParams,
  SavingsGoalsResponse,
  SavingsGoalsQueryParams,
  CreateSavingsGoalRequest,
  UpdateSavingsGoalRequest,
  FinancialKPIsResponse,
  FiscalPeriodsResponse,
  FinancialAlertsResponse,
  BankAccountsResponse,
  ARAgingSummaryResponse,
  APStatusSummaryResponse,
  PLQuickPreviewResponse,
  TaxSummaryResponse,
  ReconciliationStatusResponse,
  PeriodComparisonTrendsResponse,
  TopCustomersVendorsResponse,
} from "../types";

// ============================================================================
// EXISTING API ENDPOINTS (Already implemented)
// ============================================================================

/**
 * Fetch financial summary data
 */
export async function fetchFinancialSummary(): Promise<ApiResponse<FinancialSummary>> {
  return apiClient.request<FinancialSummary>("/v1/finance/summary", "GET");
}

/**
 * Fetch revenue and expense chart data
 */
export async function fetchChartData(): Promise<ApiResponse<ChartData[]>> {
  return apiClient.request<ChartData[]>("/v1/finance/revenue-expense-chart", "GET");
}

// ============================================================================
// NEW API ENDPOINTS (To be implemented by backend)
// ============================================================================

/**
 * Fetch recent transactions
 * @param params - Query parameters for filtering transactions
 */
export async function fetchTransactions(
  params?: TransactionsQueryParams
): Promise<ApiResponse<TransactionsResponse>> {
  const queryString = params ? `?${new URLSearchParams(params as any).toString()}` : "";
  return apiClient.request<TransactionsResponse>(`/v1/finance/transactions${queryString}`, "GET");
}

/**
 * Fetch expense categories breakdown
 * @param params - Query parameters for filtering expense data
 */
export async function fetchExpenseCategories(
  params?: ExpenseCategoriesQueryParams
): Promise<ApiResponse<ExpenseCategoriesResponse>> {
  const queryString = params ? `?${new URLSearchParams(params as any).toString()}` : "";
  return apiClient.request<ExpenseCategoriesResponse>(
    `/v1/finance/expense-categories${queryString}`,
    "GET"
  );
}

/**
 * Fetch daily spending data
 * @param params - Query parameters (date)
 */
export async function fetchDailySpending(
  params?: DailySpendingQueryParams
): Promise<ApiResponse<DailySpendingResponse>> {
  const queryString = params ? `?${new URLSearchParams(params as any).toString()}` : "";
  return apiClient.request<DailySpendingResponse>(
    `/v1/finance/daily-spending${queryString}`,
    "GET"
  );
}

/**
 * Fetch savings goals
 * @param params - Query parameters for filtering goals
 */
export async function fetchSavingsGoals(
  params?: SavingsGoalsQueryParams
): Promise<ApiResponse<SavingsGoalsResponse>> {
  const queryString = params ? `?${new URLSearchParams(params as any).toString()}` : "";
  return apiClient.request<SavingsGoalsResponse>(`/v1/finance/savings-goals${queryString}`, "GET");
}

/**
 * Create a new savings goal
 * @param data - Savings goal data
 */
export async function createSavingsGoal(
  data: CreateSavingsGoalRequest
): Promise<ApiResponse<SavingsGoalsResponse>> {
  return apiClient.request<SavingsGoalsResponse>("/v1/finance/savings-goals", "POST", data);
}

/**
 * Update an existing savings goal
 * @param id - Goal ID
 * @param data - Updated goal data
 */
export async function updateSavingsGoal(
  id: string,
  data: UpdateSavingsGoalRequest
): Promise<ApiResponse<SavingsGoalsResponse>> {
  return apiClient.request<SavingsGoalsResponse>(`/v1/finance/savings-goals/${id}`, "PATCH", data);
}

/**
 * Delete a savings goal
 * @param id - Goal ID
 */
export async function deleteSavingsGoal(id: string): Promise<ApiResponse<void>> {
  return apiClient.request<void>(`/v1/finance/savings-goals/${id}`, "DELETE");
}

// ============================================================================
// PHASE 1 API ENDPOINTS - KPIs, Alerts, Periods, Bank Accounts
// ============================================================================

/**
 * Fetch financial KPIs (Key Performance Indicators)
 */
export async function fetchFinancialKPIs(): Promise<ApiResponse<FinancialKPIsResponse>> {
  return apiClient.request<FinancialKPIsResponse>("/v1/finance/kpis", "GET");
}

/**
 * Fetch fiscal periods
 * @param year - Optional year filter
 */
export async function fetchFiscalPeriods(
  year?: number
): Promise<ApiResponse<FiscalPeriodsResponse>> {
  const queryString = year ? `?year=${year}` : "";
  return apiClient.request<FiscalPeriodsResponse>(`/v1/finance/periods${queryString}`, "GET");
}

/**
 * Fetch financial alerts
 * Includes overdue invoices, upcoming payments, low cash warnings, etc.
 */
export async function fetchFinancialAlerts(): Promise<ApiResponse<FinancialAlertsResponse>> {
  return apiClient.request<FinancialAlertsResponse>("/v1/finance/alerts", "GET");
}

/**
 * Fetch bank accounts summary
 */
export async function fetchBankAccounts(): Promise<ApiResponse<BankAccountsResponse>> {
  return apiClient.request<BankAccountsResponse>("/v1/finance/bank/accounts", "GET");
}

// ============================================================================
// PHASE 2 API ENDPOINTS - AR Aging, AP Status, Bank Accounts, P&L Preview
// ============================================================================

/**
 * Fetch AR Aging summary
 */
export async function fetchARAgingSummary(): Promise<ApiResponse<ARAgingSummaryResponse>> {
  return apiClient.request<ARAgingSummaryResponse>("/v1/finance/ar/aging", "GET");
}

/**
 * Fetch AP Status summary
 */
export async function fetchAPStatusSummary(): Promise<ApiResponse<APStatusSummaryResponse>> {
  return apiClient.request<APStatusSummaryResponse>("/v1/finance/ap/status", "GET");
}

/**
 * Fetch P&L Quick Preview for current period
 * @param startDate - Optional start date for calculation
 * @param endDate - Optional end date for calculation
 */
export async function fetchPLQuickPreview(
  startDate?: string,
  endDate?: string
): Promise<ApiResponse<PLQuickPreviewResponse>> {
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  const queryString = params.toString() ? `?${params.toString()}` : "";
  return apiClient.request<PLQuickPreviewResponse>(`/v1/finance/pl-preview${queryString}`, "GET");
}

// ============================================================================
// PHASE 3 API ENDPOINTS - Tax Summary, Reconciliation, Trends, Top Customers
// ============================================================================

/**
 * Fetch tax summary for the current period
 */
export async function fetchTaxSummary(): Promise<ApiResponse<TaxSummaryResponse>> {
  return apiClient.request<TaxSummaryResponse>("/v1/finance/tax-summary", "GET");
}

/**
 * Fetch reconciliation status across all accounts
 */
export async function fetchReconciliationStatus(): Promise<
  ApiResponse<ReconciliationStatusResponse>
> {
  return apiClient.request<ReconciliationStatusResponse>(
    "/v1/finance/reconciliation-status",
    "GET"
  );
}

/**
 * Fetch period comparison trends
 * @param periods - Number of periods to compare (default: 12 for 12 months)
 */
export async function fetchPeriodComparisonTrends(
  periods?: number
): Promise<ApiResponse<PeriodComparisonTrendsResponse>> {
  const queryString = periods ? `?periods=${periods}` : "";
  return apiClient.request<PeriodComparisonTrendsResponse>(
    `/v1/finance/period-trends${queryString}`,
    "GET"
  );
}

/**
 * Fetch top customers and vendors
 * @param limit - Number of top items to return (default: 5)
 */
export async function fetchTopCustomersVendors(
  limit?: number
): Promise<ApiResponse<TopCustomersVendorsResponse>> {
  const queryString = limit ? `?limit=${limit}` : "";
  return apiClient.request<TopCustomersVendorsResponse>(
    `/v1/finance/top-customers-vendors${queryString}`,
    "GET"
  );
}

// ============================================================================
// BATCH FETCH FUNCTION
// ============================================================================

/**
 * Fetch all dashboard data in parallel
 * Returns an object with all the data or null for failed requests
 */
export async function fetchAllDashboardData() {
  try {
    const [summaryRes, chartRes, transactionsRes, categoriesRes, dailySpendingRes, savingsRes] =
      await Promise.allSettled([
        fetchFinancialSummary(),
        fetchChartData(),
        fetchTransactions({ limit: 5 }),
        fetchExpenseCategories({ period: "month" }),
        fetchDailySpending(),
        fetchSavingsGoals({ status: "active" }),
      ]);

    return {
      summary:
        summaryRes.status === "fulfilled" && summaryRes.value.success
          ? summaryRes.value.data
          : null,
      chartData:
        chartRes.status === "fulfilled" && chartRes.value.success ? chartRes.value.data : [],
      transactions:
        transactionsRes.status === "fulfilled" && transactionsRes.value.success
          ? transactionsRes.value.data?.transactions || []
          : [],
      expenseCategories:
        categoriesRes.status === "fulfilled" && categoriesRes.value.success
          ? categoriesRes.value.data?.categories || []
          : [],
      dailySpending:
        dailySpendingRes.status === "fulfilled" && dailySpendingRes.value.success
          ? dailySpendingRes.value.data
          : null,
      savingsGoals:
        savingsRes.status === "fulfilled" && savingsRes.value.success
          ? savingsRes.value.data?.goals || []
          : [],
      errors: {
        summary: summaryRes.status === "rejected" ? summaryRes.reason : null,
        chartData: chartRes.status === "rejected" ? chartRes.reason : null,
        transactions: transactionsRes.status === "rejected" ? transactionsRes.reason : null,
        expenseCategories: categoriesRes.status === "rejected" ? categoriesRes.reason : null,
        dailySpending: dailySpendingRes.status === "rejected" ? dailySpendingRes.reason : null,
        savingsGoals: savingsRes.status === "rejected" ? savingsRes.reason : null,
      },
    };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    throw error;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format currency amount to KES
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format currency amount to KES (compact notation)
 */
export function formatCurrencyCompact(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(amount);
}

/**
 * Format number with thousand separators
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-KE").format(num);
}

/**
 * Format date to readable string
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-KE", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format date to short string (no year)
 */
export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-KE", {
    month: "short",
    day: "numeric",
  });
}
