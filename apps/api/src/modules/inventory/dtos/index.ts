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
  // Cost basis for an "increase" adjustment, so it creates a real StockBatch
  // cost lot instead of a bare quantity bump. If omitted, falls back to the
  // product's reference cost_price. Ignored for "decrease".
  unitCost?: number;
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

export interface RequestTransferDTO {
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  items: {
    productId: string;
    requested_qty: number;
  }[];
  notes?: string;
}

export interface ApproveTransferDTO {
  notes?: string;
}

/**
 * Stage: Start Picking (APPROVED -> PICKING). Claims the pick task; no
 * item data required yet.
 */
export interface StartPickingDTO {
  notes?: string;
}

/**
 * Stage: Complete Picking (stays in PICKING, sets pickingCompletedAt).
 * Records what was actually pulled off the shelf per line item —
 * separate from dispatched_qty, which is set later at dispatch and may
 * differ if the verifier catches a discrepancy.
 */
export interface CompletePickingDTO {
  items: {
    productId: string;
    picked_qty: number;
  }[];
  notes?: string;
}

/**
 * Stage: Verify (PICKING -> VERIFIED). Requires pickingCompletedAt to
 * already be set — i.e. someone must have recorded picked quantities
 * before this can run. Deliberately a different action/permission from
 * picking itself, so picker and verifier can be different people.
 */
export interface VerifyTransferDTO {
  notes?: string;
}

export interface DispatchTransferDTO {
  items: {
    productId: string;
    dispatched_qty: number;
  }[];
  dispatchMode: "RIDER" | "TRUCK";
  driverId: string;
  truckId?: string; // required when dispatchMode is TRUCK and the truck is fleet-tracked
  vehicleRegistration?: string; // required for RIDER; for TRUCK, auto-filled from the selected Truck's registration if omitted
}

export interface ReceiveTransferDTO {
  items: {
    productId: string;
    received_qty: number;
    damaged_qty: number;
  }[];
  notes?: string;
}

/**
 * Raise a dispute/discrepancy against a transfer. Available on
 * DISCREPANCY, PARTIALLY_RECEIVED, and RECEIVED (issues can surface
 * after the fact too, not only at the moment DISCREPANCY is set).
 */
export interface RaiseTransferIssueDTO {
  category: "quantity_variance" | "damage" | "lost_in_transit" | "wrong_item" | "other";
  description: string;
}

/**
 * Resolve or dismiss an open issue.
 */
export interface ResolveTransferIssueDTO {
  status: "RESOLVED" | "DISMISSED";
  resolution: string;
}
