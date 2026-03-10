export interface CreateTransferInput {
  sourceId: string;
  targetId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  notes?: string;
  driverId?: string;
}

export interface AdjustStockInput {
  warehouseId: string;
  productId: string;
  quantity: number;
  reason: string;
}

export interface StockMovementParams {
  warehouseId?: string;
  productId?: string;
  type?: "INBOUND" | "OUTBOUND" | "TRANSFER_IN" | "TRANSFER_OUT" | "ADJUSTMENT";
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface TransferParams {
  status?: "PENDING" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED";
  sourceId?: string;
  targetId?: string;
  page?: number;
  limit?: number;
}

import { frontendEnv } from "./env";

const API_URL = frontendEnv.NEXT_PUBLIC_API_URL;

export const warehouseService = {
  /**
   * Create a new stock transfer
   */
  async createTransfer(data: CreateTransferInput, token: string) {
    const response = await fetch(`${API_URL}/v1/warehouse/transfer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to create transfer");
    }

    return response.json();
  },

  /**
   * Get all transfers with filtering
   */
  async getTransfers(params: TransferParams, token: string) {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append("status", params.status);
    if (params.sourceId) queryParams.append("sourceId", params.sourceId);
    if (params.targetId) queryParams.append("targetId", params.targetId);
    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());

    const response = await fetch(`${API_URL}/v1/warehouse/transfers?${queryParams}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch transfers");
    }

    return response.json();
  },

  /**
   * Get a single transfer by ID
   */
  async getTransferById(id: string, token: string) {
    const response = await fetch(`${API_URL}/v1/warehouse/transfers/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch transfer");
    }

    return response.json();
  },

  /**
   * Fulfill/receive a transfer
   */
  async fulfillTransfer(id: string, token: string) {
    const response = await fetch(`${API_URL}/v1/warehouse/transfer/${id}/receive`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to fulfill transfer");
    }

    return response.json();
  },

  /**
   * Update transfer status
   */
  async updateTransferStatus(
    id: string,
    data: { status: "IN_TRANSIT" | "CANCELLED"; notes?: string },
    token: string
  ) {
    const response = await fetch(`${API_URL}/v1/warehouse/transfers/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to update transfer status");
    }

    return response.json();
  },

  /**
   * Adjust stock
   */
  async adjustStock(data: AdjustStockInput, token: string) {
    const response = await fetch(`${API_URL}adjust`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to adjust stock");
    }

    return response.json();
  },

  /**
   * Get stock movements
   */
  async getStockMovements(params: StockMovementParams, token: string) {
    const queryParams = new URLSearchParams();
    if (params.warehouseId) queryParams.append("warehouseId", params.warehouseId);
    if (params.productId) queryParams.append("productId", params.productId);
    if (params.type) queryParams.append("type", params.type);
    if (params.startDate) queryParams.append("startDate", params.startDate);
    if (params.endDate) queryParams.append("endDate", params.endDate);
    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());

    const response = await fetch(`${API_URL}/v1/warehouse/movements?${queryParams}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch stock movements");
    }

    return response.json();
  },

  /**
   * Get warehouse statistics
   */
  async getWarehouseStats(warehouseId: string | undefined, token: string) {
    const queryParams = warehouseId ? `?warehouseId=${warehouseId}` : "";

    const response = await fetch(`${API_URL}/v1/warehouse/stats${queryParams}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch warehouse stats");
    }

    return response.json();
  },

  /**
   * Get warehouses list
   */
  async getWarehouses(token: string) {
    const response = await fetch(`${API_URL}/v1/warehouse/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch warehouses");
    }

    return response.json();
  },

  /**
   * Get products list with filtering
   */
  async getProducts(token: string, params?: { vendorId?: string; search?: string; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.vendorId) queryParams.append("vendorId", params.vendorId);
    if (params?.search) queryParams.append("search", params.search);
    if (params?.limit) queryParams.append("limit", params.limit.toString());

    const response = await fetch(`${API_URL}/v1/products?${queryParams.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch products");
    }

    return response.json();
  },
};
