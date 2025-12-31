/**
 * Admin API Client
 * Handles all admin dashboard API calls
 * frontend/lib/api/admin-client.ts
 */

import type {
  Branch,
  Warehouse,
  User,
  Product,
  Sales,
  Delivery,
  Truck,
  FinanceTransaction,
  Payroll,
  DailySummary,
  ApiResponse,
  PaginatedResponse,
} from "@/lib/types/admin";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

class AdminApiClient {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem("auth_token");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options?.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error?.message || "Request failed");
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // Daily Summary
  async getDailySummary(params?: { branchId?: string; date?: string }): Promise<DailySummary> {
    const queryParams = new URLSearchParams();
    if (params?.branchId) queryParams.append("branch_id", params.branchId);
    if (params?.date) queryParams.append("date", params.date);

    const response = await this.request<DailySummary>(
      `/v1/pos/sales/daily-summary?${queryParams.toString()}`
    );
    return response.data!;
  }

  // Sales
  async listSales(params?: {
    page?: number;
    limit?: number;
    status?: string;
    branchId?: string;
    startDate?: string;
    endDate?: string;
    payment_method?: string;
  }): Promise<PaginatedResponse<Sales>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.status) queryParams.append("status", params.status);
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    if (params?.payment_method) queryParams.append("payment_method", params.payment_method);

    const response = this.request<PaginatedResponse<Sales>>(`/v1/pos/sales?${queryParams.toString()}`);
    return (await response).data!;
  }

  async getSaleById(id: string): Promise<Sales> {
    const response = await this.request<Sales>(`/v1/pos/sales/${id}`);
    return response.data!;
  }

  // We need to create backend endpoints for the following
  // For now, we'll create placeholders that you'll implement

  async listBranches(): Promise<Branch[]> {
    const response = await this.request<Branch[]>("/v1/branches");
    return response.data || [];
  }

  async listWarehouses(): Promise<Warehouse[]> {
    const response = await this.request<Warehouse[]>("/v1/warehouses");
    return response.data || [];
  }

  async listUsers(): Promise<User[]> {
    const response = await this.request<User[]>("/v1/users");
    return response.data || [];
  }

  async listProducts(params?: {
    page?: number;
    limit?: number;
    category?: string;
  }): Promise<Product[]> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.category) queryParams.append("category", params.category);

    const response = await this.request<Product[]>(`/v1/products?${queryParams.toString()}`);
    return response.data || [];
  }

  async listDeliveries(): Promise<Delivery[]> {
    const response = await this.request<Delivery[]>("/v1/deliveries");
    return response.data || [];
  }

  async listTrucks(): Promise<Truck[]> {
    const response = await this.request<Truck[]>("/v1/trucks");
    return response.data || [];
  }

  async listFinanceTransactions(params?: {
    type?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<FinanceTransaction[]> {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append("type", params.type);
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);

    const response = await this.request<FinanceTransaction[]>(
      `/v1/finance/transactions?${queryParams.toString()}`
    );
    return response.data || [];
  }

  async listPayroll(params?: { status?: string; userId?: string }): Promise<Payroll[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append("status", params.status);
    if (params?.userId) queryParams.append("userId", params.userId);

    const response = await this.request<Payroll[]>(`/v1/payroll?${queryParams.toString()}`);
    return response.data || [];
  }
}

export const adminApi = new AdminApiClient();
