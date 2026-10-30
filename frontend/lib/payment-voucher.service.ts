/**
 * Payment Voucher Service — general money out (draft -> submit -> approve -> pay).
 */

import { apiClient } from "./api-client";

export type VoucherStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "PAID"
  | "CANCELLED";

export type VoucherPerson = { id: string; name?: string | null; email: string } | null;

export interface PaymentVoucher {
  id: string;
  voucherNumber: string;
  status: VoucherStatus;
  payeeName: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  referenceNo?: string | null;
  paymentDate: string;
  expenseAccountId?: string | null;
  expenseAccount?: { id: string; account_code: string; account_name: string } | null;
  requestedById: string;
  requestedBy?: VoucherPerson;
  approvedBy?: VoucherPerson;
  paidBy?: VoucherPerson;
  submittedAt?: string | null;
  approvedAt?: string | null;
  paidAt?: string | null;
  rejectedReason?: string | null;
  createdAt: string;
}

export interface VoucherInput {
  payeeName: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  referenceNo?: string;
  paymentDate: string;
  expenseAccountId?: string;
  status?: "DRAFT" | "SUBMITTED";
}

// The finance routes answer { status: "success", data } — apiClient exposes
// that as res.data / res.success like the expense service relies on.
class PaymentVoucherService {
  async list(params: { status?: string } = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v) as [string, string][],
    ).toString();
    const res = await apiClient.request<{ vouchers: PaymentVoucher[]; total: number }>(
      `/v1/finance/vouchers${query ? `?${query}` : ""}`,
      "GET",
    );
    if (!res.success) throw new Error(res.error?.message || "Failed to fetch payment vouchers");
    return res.data!;
  }

  async getById(id: string) {
    const res = await apiClient.request<PaymentVoucher>(`/v1/finance/vouchers/${id}`, "GET");
    if (!res.success) throw new Error(res.error?.message || "Failed to fetch payment voucher");
    return res.data!;
  }

  async create(data: VoucherInput) {
    const res = await apiClient.request<PaymentVoucher>("/v1/finance/vouchers", "POST", data);
    if (!res.success) throw new Error(res.error?.message || "Failed to create payment voucher");
    return res.data!;
  }

  async updateStatus(id: string, status: string, rejectionReason?: string) {
    const res = await apiClient.request<PaymentVoucher>(
      `/v1/finance/vouchers/${id}/status`,
      "PATCH",
      { status, rejectionReason },
    );
    if (!res.success) throw new Error(res.error?.message || "Failed to update payment voucher");
    return res.data!;
  }

  async pay(id: string) {
    const res = await apiClient.request<PaymentVoucher>(`/v1/finance/vouchers/${id}/pay`, "POST");
    if (!res.success) throw new Error(res.error?.message || "Failed to pay voucher");
    return res.data!;
  }

  /** Expense accounts for the optional "charge to" picker. Needs finance.gl.view; empty otherwise. */
  async expenseAccounts(): Promise<{ id: string; account_code: string; account_name: string }[]> {
    try {
      const res = await apiClient.request<any>("/v1/finance/accounts", "GET");
      if (!res.success) return [];
      const d: any = res.data;
      const list: any[] = Array.isArray(d) ? d : (d?.accounts ?? d?.data ?? []);
      return list.filter((a) => a.account_type === "expense" && a.is_active !== false);
    } catch {
      return [];
    }
  }
}

export const paymentVoucherService = new PaymentVoucherService();

export const VOUCHER_STATUS_COLORS: Record<VoucherStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  SUBMITTED: "bg-blue-100 text-blue-800",
  APPROVED: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  REJECTED: "bg-red-100 text-red-800",
  PAID: "bg-slate-800 text-white",
  CANCELLED: "bg-slate-100 text-slate-500",
};

export const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "cheque", label: "Cheque" },
  { value: "card", label: "Card" },
];

export const VOUCHER_CATEGORIES = [
  "Rent",
  "Utilities",
  "Fuel & Transport",
  "Repairs & Maintenance",
  "Professional Services",
  "Office Supplies",
  "Marketing",
  "Taxes & Licences",
  "Other",
];
