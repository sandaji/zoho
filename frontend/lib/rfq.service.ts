/**
 * RFQs, quote comparison and supplier scorecards.
 */
import { apiClient } from "./api-client";

export interface VendorScore {
  vendorId: string;
  onTimePct: number | null;
  fillRatePct: number | null;
  poCount: number;
  systemScore: number | null;
  manual: { overall: number; count: number; delivery: number; quality: number; price: number; service: number } | null;
  combined: number | null;
}
export interface RfqRow {
  id: string;
  rfqNumber: string;
  title: string;
  status: string;
  closingDate: string;
  itemCount: number;
  invited: number;
  submitted: number;
  createdAt: string;
}
export interface RfqQuote {
  id: string;
  vendorId: string;
  vendor: { id: string; name: string; code: string } | null;
  status: string;
  leadTimeDays: number | null;
  paymentTerms: string | null;
  validUntil: string | null;
  expired: boolean;
  notes: string | null;
  prices: Record<string, number>;
  total: number | null;
  performance: VendorScore | null;
}
export interface RfqDetail extends Omit<RfqRow, "itemCount" | "invited" | "submitted"> {
  notes: string | null;
  exceptionReason: string | null;
  awardReason: string | null;
  warehouseId: string | null;
  createdById: string;
  items: { id: string; productId: string | null; description: string; quantity: number }[];
  quotes: RfqQuote[];
  po: { id: string; poNumber: string; status: string } | null;
  comparison: {
    weights: { price: number; performance: number; leadTime: number };
    ranking: { quoteId: string; score: number; parts: { price: number; performance: number; leadTime: number } }[];
    recommendedQuoteId: string | null;
    lowestPriceQuoteId: string | null;
    lowestPerItem: Record<string, number | null>;
  };
}
export interface Scorecard {
  vendor: { id: string; code: string; name: string; paymentTerms: string; leadTimeDays: number };
  score: VendorScore;
  quotesSubmitted: number;
  evaluations: { id: string; period: string; delivery: number; quality: number; price: number; service: number; overall: number; comments: string | null; evaluator: string }[];
}

async function call<T>(path: string, method: "GET" | "POST", body?: unknown) {
  const res = await apiClient.request<T>(path, method as any, body);
  if (!res.success) throw new Error(res.error?.message || "Request failed");
  return res.data as T;
}

export const rfqService = {
  options: () =>
    call<{ vendors: { id: string; code: string; name: string }[]; warehouses: { id: string; name: string }[] }>("/v1/rfqs/options", "GET"),
  products: (search: string) => call<{ id: string; name: string; sku: string; vendorId: string | null }[]>(`/v1/rfqs/products?search=${encodeURIComponent(search)}`, "GET"),
  requisitions: () => call<{ id: string; number: string; estimatedTotal: number; items: number }[]>("/v1/rfqs/requisitions", "GET"),
  list: (status?: string) => call<RfqRow[]>(`/v1/rfqs${status ? `?status=${status}` : ""}`, "GET"),
  get: (id: string) => call<RfqDetail>(`/v1/rfqs/${id}`, "GET"),
  create: (d: Record<string, unknown>) => call<RfqDetail>("/v1/rfqs", "POST", d),
  send: (id: string) => call<RfqDetail>(`/v1/rfqs/${id}/send`, "POST"),
  extend: (id: string, closingDate: string) => call<RfqDetail>(`/v1/rfqs/${id}/extend`, "POST", { closingDate }),
  recordQuote: (id: string, vendorId: string, d: Record<string, unknown>) => call<RfqDetail>(`/v1/rfqs/${id}/quotes/${vendorId}`, "POST", d),
  declineQuote: (id: string, vendorId: string, reason?: string) => call<RfqDetail>(`/v1/rfqs/${id}/quotes/${vendorId}/decline`, "POST", { reason }),
  close: (id: string) => call<RfqDetail>(`/v1/rfqs/${id}/close`, "POST"),
  cancel: (id: string, reason?: string) => call<RfqDetail>(`/v1/rfqs/${id}/cancel`, "POST", { reason }),
  award: (id: string, d: { quoteId: string; reason?: string }) => call<RfqDetail>(`/v1/rfqs/${id}/award`, "POST", d),

  scorecards: (search?: string) =>
    call<{ id: string; code: string; name: string; score: VendorScore }[]>(`/v1/supplier-performance${search ? `?search=${encodeURIComponent(search)}` : ""}`, "GET"),
  scorecard: (vendorId: string) => call<Scorecard>(`/v1/supplier-performance/${vendorId}`, "GET"),
  evaluate: (vendorId: string, d: { delivery: number; quality: number; price: number; service: number; comments?: string }) =>
    call<Scorecard>(`/v1/supplier-performance/${vendorId}/evaluations`, "POST", d),
};

export const RFQ_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  OPEN: "bg-sky-100 text-sky-700",
  CLOSED: "bg-amber-100 text-amber-700",
  AWARDED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};
