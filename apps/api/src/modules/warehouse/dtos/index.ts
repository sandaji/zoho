/**
 * Warehouse Module - Data Transfer Objects
 */

export interface CreateWarehouseDTO {
  code: string;
  name: string;
  location: string;
  capacity: number;
  branchId: string;
}

export interface UpdateWarehouseDTO {
  name?: string;
  location?: string;
  capacity?: number;
  isActive?: boolean;
}

export interface WarehouseResponseDTO {
  id: string;
  code: string;
  name: string;
  location: string;
  capacity: number;
  branchId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseListQueryDTO {
  page?: number;
  limit?: number;
  branchId?: string;
  isActive?: boolean;
  search?: string;
}

export interface WarehouseStockDTO {
  warehouseId: string;
  totalCapacity: number;
  usedCapacity: number;
  availableCapacity: number;
  products: Array<{
    productId: string;
    productName: string;
    quantity: number;
  }>;
}
