// frontend/lib/admin-global-api.ts
// Typed API wrappers for the Global Command Center endpoints.
// Uses getAuthHeadersWithToken — consistent with Task-8 unification.

import { API_BASE_URL } from "@/lib/api-config";
import { getAuthHeadersWithToken } from "@/lib/api-utils";

// ============================================================================
// TYPES
// ============================================================================

export interface BranchFinancials {
  branch: { id: string; name: string; code: string; city: string };
  revenue:    number;
  subtotal:   number;
  tax:        number;
  discount:   number;
  orderCount: number;
}

export interface GlobalFinancialsData {
  period_days:        number;
  gross_revenue:      number;
  net_global_revenue: number;
  total_tax:          number;
  total_discount:     number;
  total_expenses:     number;
  net_profit:         number;
  total_orders:       number;
  internal_transfers: number;
  branch_breakdown:   BranchFinancials[];
}

export interface IBTSummary {
  pending:         number;
  in_transit:      number;
  pending_receipt: number;
  discrepancy:     number;
}

export interface IBTTransfer {
  id:           string;
  transferNo:   string;
  status:       "PENDING" | "IN_TRANSIT" | "PENDING_RECEIPT" | "DISCREPANCY";
  notes:        string | null;
  truckRegNo:   string | null;
  driverName:   string | null;
  createdAt:    string;
  updatedAt:    string;
  sourceWarehouse: {
    id: string; name: string;
    branch: { id: string; name: string; code: string };
  };
  targetWarehouse: {
    id: string; name: string;
    branch: { id: string; name: string; code: string };
  };
  items: {
    id: string; quantity: number;
    product: { id: string; name: string; sku: string };
  }[];
  createdBy: { id: string; name: string };
}

export interface IBTMonitorData {
  summary:   IBTSummary;
  transfers: IBTTransfer[];
}

export interface SystemHealthData {
  health_score:       number;
  open_sessions:      number;
  pending_deliveries: number;
  low_stock_items:    number;
  pending_approvals:  number;
  active_users:       number;
  active_branches:    number;
  api_status:         string;
  checked_at:         string;
}

export interface AuditLogEntry {
  id:         string;
  entityType: string;
  entityId:   string;
  action:     "CREATE" | "UPDATE" | "DELETE";
  changes:    Record<string, any>;
  ipAddress:  string | null;
  timestamp:  string;
  user: { id: string; name: string; email: string } | null;
}

export interface AuditLogsResponse {
  logs:  AuditLogEntry[];
  total: number;
  page:  number;
  limit: number;
}

// ============================================================================
// PERMISSION HELPER
// Implements "Permission-First" approach as specified in the brief.
// Instead of checking role === 'admin', check canViewGlobalStats.
// ============================================================================

export type GlobalPermissions = {
  canViewGlobalStats:    boolean;
  canViewFinancials:     boolean;
  canViewIBT:            boolean;
  canViewAuditFeed:      boolean;
  canViewSystemHealth:   boolean;
  canManageRoles:        boolean;
};

export function resolveGlobalPermissions(
  role: string | undefined,
  permissions: string[] = []
): GlobalPermissions {
  const isAdmin = role === "admin" || role === "super_admin";
  const isManager = isAdmin || role === "manager" || role === "branch_manager";
  const hasPerm = (p: string) => permissions.includes(p);

  return {
    canViewGlobalStats:  isAdmin || hasPerm("admin.branch.manage"),
    canViewFinancials:   isAdmin || hasPerm("admin.finance.view"),
    canViewIBT:          isAdmin || hasPerm("admin.warehouse.view") || hasPerm("inventory.stock.adjust"),
    canViewAuditFeed:    isAdmin || hasPerm("admin.user.manage"),
    canViewSystemHealth: isAdmin || isManager,
    canManageRoles:      isAdmin || hasPerm("admin.user.manage"),
  };
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

export async function fetchGlobalFinancials(
  token: string,
  branchId: string = "all",
  periodDays: number = 30
): Promise<GlobalFinancialsData> {
  const params = new URLSearchParams({
    branchId,
    period: String(periodDays),
  });
  const res = await fetch(`${API_BASE_URL}/v1/admin/global-financials?${params}`, {
    headers: getAuthHeadersWithToken(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "Failed to fetch global financials");
  }
  const { data } = await res.json();
  return data;
}

export async function fetchIBTMonitor(token: string): Promise<IBTMonitorData> {
  const res = await fetch(`${API_BASE_URL}/v1/admin/ibt-monitor`, {
    headers: getAuthHeadersWithToken(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "Failed to fetch IBT monitor");
  }
  const { data } = await res.json();
  return data;
}

export async function fetchSystemHealth(token: string): Promise<SystemHealthData> {
  const res = await fetch(`${API_BASE_URL}/v1/admin/system-health`, {
    headers: getAuthHeadersWithToken(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "Failed to fetch system health");
  }
  const { data } = await res.json();
  return data;
}

export async function fetchAuditLogs(
  token: string,
  params: {
    page?:       number;
    limit?:      number;
    entityType?: string;
    action?:     string;
    highValue?:  boolean;
  } = {}
): Promise<AuditLogsResponse> {
  const query = new URLSearchParams({
    page:  String(params.page  ?? 1),
    limit: String(params.limit ?? 20),
    ...(params.entityType ? { entityType: params.entityType } : {}),
    ...(params.action     ? { action:     params.action     } : {}),
    ...(params.highValue  ? { highValue:  "true"            } : {}),
  });
  const res = await fetch(`${API_BASE_URL}/v1/audit-logs?${query}`, {
    headers: getAuthHeadersWithToken(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "Failed to fetch audit logs");
  }
  const { data } = await res.json();
  // Backend may return { logs, total, page, limit } or just an array
  if (Array.isArray(data)) {
    return { logs: data, total: data.length, page: 1, limit: data.length };
  }
  return data;
}
