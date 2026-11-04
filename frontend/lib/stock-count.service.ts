/**
 * Stock counts — blind counting, variance review and approved posting.
 */
import { apiClient } from "./api-client";

export interface CountLine {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  countedQty: number | null;
  note?: string | null;
  applied: boolean;
  // Present only once the count is in review (blind counting hides them before)
  systemQty?: number | null;
  variance?: number | null;
  varianceValue?: number | null;
  stale?: boolean;
}
export interface CountSummary {
  id: string;
  countNumber: string;
  warehouseId: string;
  warehouse: string;
  type: string;
  status: string;
  blind: boolean;
  category?: string | null;
  notes?: string | null;
  lineCount?: number;
  countedCount?: number;
  totalVarianceValue?: number | null;
  createdAt: string;
  postedAt?: string | null;
}
export interface CountDetail extends CountSummary {
  systemVisible: boolean;
  lines: CountLine[];
  summary: { lines: number; withVariance: number; stale: number; netValue: number; absValue: number } | null;
}

async function call<T>(path: string, method: "GET" | "POST" | "PUT", body?: unknown) {
  const res = await apiClient.request<T>(path, method as any, body);
  if (!res.success) throw new Error(res.error?.message || "Request failed");
  return res.data as T;
}

export const stockCountService = {
  warehouses: () => call<{ warehouses: { id: string; name: string; code: string }[]; categories: string[] }>("/v1/stock-counts/warehouses", "GET"),
  list: (status?: string) => call<CountSummary[]>(`/v1/stock-counts${status ? `?status=${status}` : ""}`, "GET"),
  get: (id: string) => call<CountDetail>(`/v1/stock-counts/${id}`, "GET"),
  create: (d: { warehouseId: string; type: string; category?: string; notes?: string; blind?: boolean }) =>
    call<CountDetail>("/v1/stock-counts", "POST", d),
  start: (id: string) => call<CountDetail>(`/v1/stock-counts/${id}/start`, "POST"),
  enter: (id: string, lineId: string, d: { countedQty: number; note?: string }) =>
    call(`/v1/stock-counts/${id}/lines/${lineId}`, "PUT", d),
  submit: (id: string) => call<CountDetail>(`/v1/stock-counts/${id}/submit`, "POST"),
  recount: (id: string, d: { lineIds?: string[]; stale?: boolean }) => call<CountDetail>(`/v1/stock-counts/${id}/recount`, "POST", d),
  post: (id: string) => call<{ count: CountDetail; approval: { instanceNumber: string } | null }>(`/v1/stock-counts/${id}/post`, "POST"),
  cancel: (id: string, reason?: string) => call<CountDetail>(`/v1/stock-counts/${id}/cancel`, "POST", { reason }),
};

export const COUNT_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  COUNTING: "bg-sky-100 text-sky-700",
  REVIEW: "bg-amber-100 text-amber-700",
  PENDING_APPROVAL: "bg-violet-100 text-violet-700",
  POSTED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};
