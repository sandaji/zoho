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
  return apiClient.request<TransactionsResponse>(
    `/v1/finance/transactions${queryString}`,
    "GET"
  );
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
  return apiClient.request<SavingsGoalsResponse>(
    `/v1/finance/savings-goals${queryString}`,
    "GET"
  );
}

/**
 * Create a new savings goal
 * @param data - Savings goal data
 */
export async function createSavingsGoal(
  data: CreateSavingsGoalRequest
): Promise<ApiResponse<SavingsGoalsResponse>> {
  return apiClient.request<SavingsGoalsResponse>(
    "/v1/finance/savings-goals",
    "POST",
    data
  );
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
  return apiClient.request<SavingsGoalsResponse>(
    `/v1/finance/savings-goals/${id}`,
    "PATCH",
    data
  );
}

/**
 * Delete a savings goal
 * @param id - Goal ID
 */
export async function deleteSavingsGoal(
  id: string
): Promise<ApiResponse<void>> {
  return apiClient.request<void>(
    `/v1/finance/savings-goals/${id}`,
    "DELETE"
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
    const [
      summaryRes,
      chartRes,
      transactionsRes,
      categoriesRes,
      dailySpendingRes,
      savingsRes,
    ] = await Promise.allSettled([
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
        chartRes.status === "fulfilled" && chartRes.value.success
          ? chartRes.value.data
          : [],
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
  return new Intl.NumberFormat("en-US").format(num);
}

/**
 * Format date to readable string
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
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
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
