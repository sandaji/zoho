import {
  requestStockTransfer,
  approveStockTransfer,
  startPickingStockTransfer,
  completePickingStockTransfer,
  verifyStockTransfer,
  dispatchStockTransfer,
  receiveStockTransfer,
  raiseTransferIssue,
  resolveTransferIssue,
  fetchTransferAuditLogs,
  fetchTransferAnalytics,
  RequestStockTransferPayload,
  ApproveStockTransferPayload,
  StartPickingPayload,
  CompletePickingPayload,
  VerifyTransferPayload,
  DispatchStockTransferPayload,
  ReceiveStockTransferPayload,
  RaiseTransferIssuePayload,
  ResolveTransferIssuePayload,
} from "./admin-api";
import { frontendEnv } from "./env";

const API_URL = frontendEnv.NEXT_PUBLIC_API_URL;

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
  status?: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "PICKING" | "VERIFIED" | "DISPATCHED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED" | "DISCREPANCY";
  sourceId?: string;
  targetId?: string;
  page?: number;
  limit?: number;
}

export const warehouseService = {
  /**
   * Stage 1: Request a new stock transfer
   */
  async requestTransfer(data: RequestStockTransferPayload, token: string) {
    return requestStockTransfer(token, data);
  },

  /**
   * Stage 2: Approve a stock transfer
   */
  async approveTransfer(id: string, data: ApproveStockTransferPayload, token: string) {
    return approveStockTransfer(token, id, data);
  },

  /**
   * Stage 3: Start picking (claims the pick task)
   */
  async startPicking(id: string, data: StartPickingPayload, token: string) {
    return startPickingStockTransfer(token, id, data);
  },

  /**
   * Stage 4: Complete picking (records picked quantities)
   */
  async completePicking(id: string, data: CompletePickingPayload, token: string) {
    return completePickingStockTransfer(token, id, data);
  },

  /**
   * Stage 5: Verify picked items
   */
  async verifyTransfer(id: string, data: VerifyTransferPayload, token: string) {
    return verifyStockTransfer(token, id, data);
  },

  /**
   * Stage 6: Dispatch a stock transfer
   */
  async dispatchTransfer(id: string, data: DispatchStockTransferPayload, token: string) {
    return dispatchStockTransfer(token, id, data);
  },

  /**
   * Stage 7: Receive a stock transfer
   */
  async receiveTransfer(id: string, data: ReceiveStockTransferPayload, token: string) {
    return receiveStockTransfer(token, id, data);
  },

  /**
   * Raise a transfer dispute / issue
   */
  async raiseIssue(id: string, data: RaiseTransferIssuePayload, token: string) {
    return raiseTransferIssue(token, id, data);
  },

  /**
   * Resolve a transfer dispute / issue
   */
  async resolveIssue(issueId: string, data: ResolveTransferIssuePayload, token: string) {
    return resolveTransferIssue(token, issueId, data);
  },

  /**
   * Get compliance audit logs for a transfer
   */
  async getTransferAuditLogs(id: string, token: string) {
    return fetchTransferAuditLogs(token, id);
  },

  /**
   * Get Transfer Analytics & KPI metrics
   */
  async getTransferAnalytics(token: string) {
    return fetchTransferAnalytics(token);
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

    const response = await fetch(`${API_URL}/v1/inventory/transfers?${queryParams}`, {
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
    const response = await fetch(`${API_URL}/v1/inventory/transfers/${id}`, {
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
   * Adjust stock
   */
  async adjustStock(data: AdjustStockInput, token: string) {
    const response = await fetch(`${API_URL}/v1/inventory/adjust`, {
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
    const response = await fetch(`${API_URL}/v1/warehouses`, {
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
