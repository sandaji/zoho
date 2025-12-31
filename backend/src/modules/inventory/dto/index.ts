/**
 * Inventory Module - Data Transfer Objects
 */

export interface UpdateInventoryDTO {
  productId: string;
  warehouseId: string;
  quantity?: number;
  reserved?: number;
  status?: string;
}

export interface CreateInventoryDTO {
  productId: string;
  warehouseId: string;
  quantity: number;
  reserved?: number;
}

export interface InventoryResponseDTO {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  reserved: number;
  available: number;
  status: string;
  last_counted?: string;
}

export interface InventoryListQueryDTO {
  page?: number;
  limit?: number;
  status?: string;
  warehouseId?: string;
  productId?: string;
  lowStockOnly?: boolean;
}

export interface StockAdjustmentDTO {
  productId: string;
  warehouseId: string;
  quantity: number;
  reason: string;
  reference?: string;
}

/**
 * Inventory Adjustment - Increase/Decrease stock in a warehouse
 * Reasons: receipt, damage, theft, count_variance, expiry, return, promotion
 */
export interface AdjustInventoryDTO {
  productId: string;
  warehouseId: string;
  adjustmentType: "increase" | "decrease"; // increase (stock in/return) or decrease (damage/loss/theft)
  quantity: number; // Must be positive, adjustment type determines direction
  reason:
    | "receipt"
    | "damage"
    | "theft"
    | "count_variance"
    | "expiry"
    | "return"
    | "promotion"
    | "other";
  reference?: string; // PO number, RMA number, etc.
  notes?: string;
}

/**
 * Inventory Transfer - Move stock between warehouses
 * Multi-step atomic transaction
 */
export interface TransferInventoryDTO {
  productId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
  reason?: string; // Balancing, reorganization, branch movement, etc.
  reference?: string; // Transfer order number, etc.
  notes?: string;
  
  // Logistics Info
  truckRegNo?: string;
  driverName?: string;
  attendantName?: string;
}

/**
 * Confirm Stock Shipment Receipt
 */
export interface ConfirmTransferDTO {
  transferId: string;
  items: {
    productId: string;
    receivedQuantity: number;
    notes?: string;
  }[];
}

/**
 * Inventory Adjustment Response - Includes before/after snapshots
 */
export interface AdjustmentResponseDTO {
  id?: string;
  productId: string;
  warehouseId: string;
  adjustmentType: string;
  quantity: number;
  reason: string;
  reference?: string;
  notes?: string;
  beforeQuantity: number;
  afterQuantity: number;
  beforeReserved: number;
  afterReserved: number;
  timestamp: string;
}

/**
 * Inventory Transfer Response - Includes both warehouse updates
 */
export interface TransferResponseDTO {
  id?: string;
  productId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
  reason?: string;
  reference?: string;
  notes?: string;
  fromWarehouseBefore: { quantity: number; available: number };
  fromWarehouseAfter: { quantity: number; available: number };
  toWarehouseBefore: { quantity: number; available: number };
  toWarehouseAfter: { quantity: number; available: number };
  timestamp: string;
}

/**
 * Get Inventory Query with comprehensive filtering
 */
export interface GetInventoryQueryDTO {
  page?: number; // Default: 1
  limit?: number; // Default: 20, Max: 100
  status?: "in_stock" | "low_stock" | "out_of_stock" | "discontinued";
  warehouseId?: string;
  productId?: string;
  productSku?: string;
  lowStockOnly?: boolean; // Show only items below reorder level
  search?: string; // Search by product name or SKU
  sortBy?:
    | "quantity"
    | "available"
    | "reserved"
    | "product_name"
    | "warehouse_name"
    | "status"
    | "price"
    | "createdAt";
  sortOrder?: "asc" | "desc";
}

/**
 * Paginated Inventory List Response
 */
export interface InventoryListResponseDTO {
  data: InventoryItemDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Individual Inventory Item in list response
 */
export interface InventoryItemDTO {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  quantity: number;
  reserved: number;
  available: number;
  status: string;
  reorderLevel: number;
  lastCounted?: string;
  createdAt: string;
  updatedAt: string;
}
