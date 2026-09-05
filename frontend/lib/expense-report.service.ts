/**
 * Expense Report Service
 * API calls for employee expense submission (finance-department roadmap
 * Phase 1/2 — see erp-finance-gap-analysis.md §1.1).
 */

import { apiClient } from "./api-client";

export interface ExpenseItem {
  id?: string;
  expenseDate: string;
  vendor: string;
  category: string;
  amount: number;
  description?: string;
  receiptUrl?: string;
}

export interface ExpenseReport {
  id: string;
  expenseNumber: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "POSTED" | "CANCELLED";
  employeeId: string;
  employee?: { id: string; name?: string; email: string };
  approvedBy?: { id: string; name?: string; email: string } | null;
  departmentId?: string | null;
  department?: { id: string; name: string } | null;
  totalAmount: number;
  notes?: string | null;
  rejectedReason?: string | null;
  items: ExpenseItem[];
  createdAt: string;
}

class ExpenseReportService {
  async list(params: { status?: string; departmentId?: string } = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v) as [string, string][],
    ).toString();
    const res = await apiClient.request<{ reports: ExpenseReport[]; total: number }>(
      `/v1/finance/expenses${query ? `?${query}` : ""}`,
      "GET",
    );
    if (!res.success) throw new Error(res.error?.message || "Failed to fetch expense reports");
    return res.data!;
  }

  async getById(id: string) {
    const res = await apiClient.request<ExpenseReport>(`/v1/finance/expenses/${id}`, "GET");
    if (!res.success) throw new Error(res.error?.message || "Failed to fetch expense report");
    return res.data!;
  }

  async create(data: {
    branchId?: string;
    departmentId?: string;
    items: ExpenseItem[];
    notes?: string;
    status?: "DRAFT" | "SUBMITTED";
  }) {
    const res = await apiClient.request<ExpenseReport>("/v1/finance/expenses", "POST", data);
    if (!res.success) throw new Error(res.error?.message || "Failed to create expense report");
    return res.data!;
  }

  async updateStatus(id: string, status: string, rejectionReason?: string) {
    const res = await apiClient.request<ExpenseReport>(
      `/v1/finance/expenses/${id}/status`,
      "PATCH",
      { status, rejectionReason },
    );
    if (!res.success) throw new Error(res.error?.message || "Failed to update expense report");
    return res.data!;
  }

  async postToGL(id: string) {
    const res = await apiClient.request<ExpenseReport>(`/v1/finance/expenses/${id}/post`, "POST");
    if (!res.success) throw new Error(res.error?.message || "Failed to post expense report");
    return res.data!;
  }
}

export const expenseReportService = new ExpenseReportService();
