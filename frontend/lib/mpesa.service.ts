/**
 * M-Pesa STK push (Daraja): request a payment on the customer's phone and follow its result.
 */
import { apiClient } from "./api-client";

export interface MpesaRequest {
  id: string;
  checkoutRequestId: string | null;
  phone: string;
  amount: number;
  accountReference: string;
  description: string | null;
  branchId: string | null;
  salesDocumentId: string | null;
  status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED" | "TIMEOUT";
  resultCode: number | null;
  resultDesc: string | null;
  receiptNumber: string | null;
  paidAmount: number | null;
  transactionDate: string | null;
  createdAt: string;
}

type Method = "GET" | "POST";
async function call<T>(path: string, method: Method, body?: unknown) {
  const res = await apiClient.request<T>(path, method as any, body);
  if (!res.success) throw new Error(res.error?.message || "Request failed");
  return res.data as T;
}

export const mpesaService = {
  status: () => call<{ configured: boolean; environment: string; transactionType: string }>("/v1/mpesa/status", "GET"),
  request: (d: { phone: string; amount: number; reference?: string; description?: string }) => call<MpesaRequest>("/v1/mpesa/stk", "POST", d),
  list: (q: { status?: string; search?: string } = {}) => {
    const p = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => v && p.set(k, v));
    const s = p.toString();
    return call<MpesaRequest[]>(`/v1/mpesa/requests${s ? `?${s}` : ""}`, "GET");
  },
  get: (id: string) => call<MpesaRequest>(`/v1/mpesa/requests/${id}`, "GET"),
  /** Ask Safaricom directly when the callback has not arrived. */
  query: (id: string) => call<MpesaRequest>(`/v1/mpesa/requests/${id}/query`, "POST"),
  verify: (code: string) => call<{ known: boolean; status?: string; amount?: number; phone?: string; usedOnSale?: boolean }>(`/v1/mpesa/verify/${encodeURIComponent(code)}`, "GET"),
};

export const MPESA_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-sky-100 text-sky-700",
  SUCCESS: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-rose-100 text-rose-700",
  CANCELLED: "bg-amber-100 text-amber-700",
  TIMEOUT: "bg-slate-100 text-slate-600",
};
