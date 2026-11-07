/**
 * Demand forecast + reorder suggestions.
 */
import { apiClient } from "./api-client";

export type Urgency = "STOCKOUT" | "CRITICAL" | "REORDER" | "OK" | "OVERSTOCK" | "NO_DEMAND";

export interface ForecastRow {
  productId: string;
  sku: string;
  name: string;
  category: string | null;
  vendorId: string | null;
  costPrice: number;
  onHand: number;
  onOrder: number;
  sold28: number;
  sold90: number;
  dailyDemand: number;
  forecastNext30: number;
  leadTimeDays: number;
  safetyStock: number;
  reorderPoint: number;
  daysOfCover: number | null;
  suggestedQty: number;
  suggestedCost: number;
  trend: "UP" | "DOWN" | "FLAT";
  urgency: Urgency;
}

export interface ForecastResult {
  generatedAt: string;
  coverDays: number;
  rows: ForecastRow[];
  summary: Record<string, number>;
}

const unwrap = <T,>(r: { success: boolean; data?: unknown; error?: unknown }): T => {
  if (!r.success) {
    const e = r.error as { message?: string } | string | undefined;
    throw new Error(typeof e === "string" ? e : e?.message || "Request failed");
  }
  const d = r.data as { data?: T } | T;
  return ((d as { data?: T })?.data ?? d) as T;
};

export const forecastService = {
  async get(params: { coverDays?: number; search?: string; onlyActionable?: boolean }) {
    const q = new URLSearchParams();
    if (params.coverDays) q.set("coverDays", String(params.coverDays));
    if (params.search) q.set("search", params.search);
    if (params.onlyActionable) q.set("onlyActionable", "true");
    const res = await apiClient.request<unknown>(`/v1/forecast?${q.toString()}`, "GET");
    return unwrap<ForecastResult>(res as never);
  },
  async createRequisition(body: { branchId: string; notes?: string; items: { productId: string; quantity: number }[] }) {
    const res = await apiClient.request<unknown>("/v1/forecast/requisition", "POST", body);
    return unwrap<{ id: string; requisitionNumber: string; estimatedTotal: number }>(res as never);
  },
  async branches() {
    const res = await apiClient.request<unknown>("/v1/branches", "GET");
    const d = unwrap<unknown>(res as never) as { branches?: { id: string; name: string }[] } | { id: string; name: string }[];
    return (Array.isArray(d) ? d : d?.branches ?? []) as { id: string; name: string }[];
  },
};
