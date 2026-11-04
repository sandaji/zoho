/**
 * Role dashboards — read-only aggregates for executives, inventory and sales leads.
 */
import { apiClient } from "./api-client";

export interface Money {
  total: number;
  count: number;
  refunds: number;
}
export interface PendingApproval {
  entityType: string;
  count: number;
  amount: number;
}

export interface ExecutiveDash {
  generatedAt: string;
  sales: { today: Money; monthToDate: Money; previousMonthSamePeriod: number; growthPct: number | null };
  branches: { branchId: string; name: string; revenue: number }[];
  receivables: { outstanding: number; overdue: number; overdueCount: number };
  payables: { outstanding: number; overdue: number; overdueCount: number };
  cashflow: { collectedThisMonth: number };
  inventory: { value: number; lowStock: number; outOfStock: number };
  expenses: { pendingCount: number; pendingAmount: number };
  approvals: PendingApproval[];
  pendingApprovalCount: number;
  auditFindings: Record<string, number>;
}

export interface InventoryDash {
  generatedAt: string;
  value: { value: number; lowStock: number; outOfStock: number };
  needsAttention: { id: string; product?: string; sku?: string; warehouse?: string; quantity: number; available: number; status: string }[];
  movementsLast7Days: { type: string; count: number; units: number }[];
  stockByWarehouse: { warehouse: string; units: number }[];
  pendingApprovals: PendingApproval[];
}

export interface SalesDash {
  generatedAt: string;
  today: Money;
  monthToDate: Money;
  daily: { date: string; total: number }[];
  topSellers: { userId: string; name: string; revenue: number; documents: number }[];
  topProducts: { productId: string; name: string; revenue: number; units: number }[];
  overdueReceivables: { amount: number; count: number };
  pendingApprovals: PendingApproval[];
}

async function get<T>(path: string): Promise<T> {
  const res = await apiClient.request<T>(path, "GET");
  if (!res.success) throw new Error(res.error?.message || "Could not load the dashboard");
  return res.data as T;
}

export const dashboardsService = {
  executive: () => get<ExecutiveDash>("/v1/dashboards/executive"),
  inventory: () => get<InventoryDash>("/v1/dashboards/inventory"),
  sales: () => get<SalesDash>("/v1/dashboards/sales"),
};

export const ENTITY_LABELS: Record<string, string> = {
  CREDIT_NOTE: "Customer refunds",
  PRICE_OVERRIDE: "Price overrides",
  EXPENSE_REPORT: "Expense reports",
  STOCK_TRANSFER: "Stock transfers",
  STOCK_ADJUSTMENT: "Stock adjustments",
  PAYROLL_RUN: "Payroll runs",
};
