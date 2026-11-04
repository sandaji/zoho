/**
 * Promotions: percent off, amount off, buy X get Y.
 */
import { apiClient } from "./api-client";

export interface Promotion {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: "PERCENT_OFF" | "AMOUNT_OFF" | "BUY_X_GET_Y";
  value: number;
  buyQty: number | null;
  getQty: number | null;
  scope: "ALL" | "CATEGORY" | "PRODUCT";
  categories: string[];
  productIds: string[];
  branchIds: string[];
  minQuantity: number;
  startsAt: string;
  endsAt: string;
  allowBelowCost: boolean;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "ENDED";
  createdById: string;
  activatedById: string | null;
  redemptions: number;
  discountGiven: number;
}

type Method = "GET" | "POST" | "PUT";
async function call<T>(path: string, method: Method, body?: unknown) {
  const res = await apiClient.request<T>(path, method as any, body);
  if (!res.success) throw new Error(res.error?.message || "Request failed");
  return res.data as T;
}

export const promotionService = {
  list: (status?: string) => call<Promotion[]>(`/v1/promotions${status ? `?status=${status}` : ""}`, "GET"),
  options: () => call<{ categories: string[]; branches: { id: string; name: string }[] }>("/v1/promotions/options", "GET"),
  products: (search: string) =>
    call<{ id: string; name: string; sku: string; unit_price: number }[]>(`/v1/promotions/products?search=${encodeURIComponent(search)}`, "GET"),
  create: (d: Record<string, unknown>) => call<Promotion>("/v1/promotions", "POST", d),
  update: (id: string, d: Record<string, unknown>) => call<Promotion>(`/v1/promotions/${id}`, "PUT", d),
  activate: (id: string) => call<Promotion>(`/v1/promotions/${id}/activate`, "POST"),
  pause: (id: string) => call<Promotion>(`/v1/promotions/${id}/pause`, "POST"),
  resume: (id: string) => call<Promotion>(`/v1/promotions/${id}/resume`, "POST"),
  end: (id: string) => call<Promotion>(`/v1/promotions/${id}/end`, "POST"),
  /** For the till: what the server would discount for this cart. */
  preview: (branchId: string | null, items: { productId: string; quantity: number }[]) =>
    call<{ productId: string; discount: number; promotion: { code: string; name: string; amount: number } | null }[]>(
      "/v1/promotions/preview",
      "POST",
      { branchId, items },
    ),
};

export const PROMO_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  PAUSED: "bg-amber-100 text-amber-700",
  ENDED: "bg-slate-100 text-slate-500",
};

export function describePromotion(p: Pick<Promotion, "type" | "value" | "buyQty" | "getQty" | "minQuantity">) {
  const min = p.minQuantity > 1 ? ` (min ${p.minQuantity})` : "";
  if (p.type === "PERCENT_OFF") return `${p.value}% off${min}`;
  if (p.type === "AMOUNT_OFF") return `KSh ${p.value.toLocaleString()} off each${min}`;
  return `Buy ${p.buyQty}, get ${p.getQty} free${min}`;
}
