/**
 * Purchase Requisition Service
 * API calls for the pre-PO requisition workflow (finance-department
 * roadmap Phase 1/2 — see erp-finance-gap-analysis.md §2.1).
 */

import { apiClient } from "./api-client";

export interface RequisitionItem {
  id?: string;
  description: string;
  quantity: number;
  estimatedUnitCost: number;
  estimatedSubtotal?: number;
  productId?: string;
}

export interface Requisition {
  id: string;
  requisitionNumber: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "CONVERTED" | "CANCELLED";
  requestedById: string;
  requestedBy?: { id: string; name?: string; email: string };
  approvedBy?: { id: string; name?: string; email: string } | null;
  branchId: string;
  departmentId?: string | null;
  department?: { id: string; name: string } | null;
  projectCode?: string | null;
  estimatedTotal: number;
  notes?: string | null;
  rejectedReason?: string | null;
  items: RequisitionItem[];
  createdAt: string;
}

class RequisitionService {
  async list(params: { status?: string; departmentId?: string } = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v) as [string, string][],
    ).toString();
    const res = await apiClient.request<{ requisitions: Requisition[]; total: number }>(
      `/v1/purchasing/requisitions${query ? `?${query}` : ""}`,
      "GET",
    );
    if (!res.success) throw new Error(res.error?.message || "Failed to fetch requisitions");
    return res.data!;
  }

  async getById(id: string) {
    const res = await apiClient.request<Requisition>(`/v1/purchasing/requisitions/${id}`, "GET");
    if (!res.success) throw new Error(res.error?.message || "Failed to fetch requisition");
    return res.data!;
  }

  async create(data: {
    branchId: string;
    departmentId?: string;
    projectCode?: string;
    items: RequisitionItem[];
    notes?: string;
    status?: "DRAFT" | "SUBMITTED";
  }) {
    const res = await apiClient.request<Requisition>("/v1/purchasing/requisitions", "POST", data);
    if (!res.success) throw new Error(res.error?.message || "Failed to create requisition");
    return res.data!;
  }

  async updateStatus(id: string, status: string, rejectionReason?: string) {
    const res = await apiClient.request<Requisition>(
      `/v1/purchasing/requisitions/${id}/status`,
      "PATCH",
      { status, rejectionReason },
    );
    if (!res.success) throw new Error(res.error?.message || "Failed to update requisition");
    return res.data!;
  }

  async convertToPurchaseOrder(
    id: string,
    data: {
      vendorId: string;
      warehouseId?: string;
      items: { requisitionItemId: string; productId: string; unitPrice: number }[];
    },
  ) {
    const res = await apiClient.request(`/v1/purchasing/requisitions/${id}/convert`, "POST", data);
    if (!res.success) throw new Error(res.error?.message || "Failed to convert requisition");
    return res.data!;
  }
}

export const requisitionService = new RequisitionService();
