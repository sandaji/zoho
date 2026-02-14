/**
 * TypeScript type definitions and interfaces for the Zoho ERP system
 * Extends Prisma-generated types with custom interfaces
 *
 * Generated from: backend/prisma/schema.prisma
 * Last Updated: November 12, 2025
 */

import {
  User,
  Branch,
  Warehouse,
  Product,
  Inventory,
  Truck,
  Delivery,
  FinanceTransaction,
  Payroll,
  CashierSession,
  SalesDocument,
} from "../generated/client.js";
import {
  InventoryStatus,
  DeliveryStatus,
  TransactionType,
  PayrollStatus,
  PaymentMethod,
  ProductType,
  ProductStatus,
  SalesDocumentType,
  SalesDocumentStatus,
  PaymentStatus,
  CashierSessionStatus,
  MovementType,
  TransferStatus,
  JournalType,
  FiscalStatus,
  AuditAction,
  ApprovalType,
  ApprovalStatus,
  PurchaseOrderStatus,
} from "../generated/enums.js";

// ============================================================================
// USER ROLE TYPE
// ============================================================================

/**
 * User role enumeration
 * Defines the different roles available in the system
 */
export type UserRole = "cashier" | "warehouse_staff" | "driver" | "manager" | "admin";

// ============================================================================
// AUTH & TOKEN TYPES
// ============================================================================

/**
 * JWT Token Payload
 * Used for authentication throughout the application
 */
export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  branchId?: string | null;
  iat?: number;
  exp?: number;
}

/**
 * Extended Express Request with user info
 */
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      authorizedBranchIds?: string[];
      onlyOwnedRecords?: boolean;
    }
  }
}

// ============================================================================
// EXTENDED MODEL TYPES (Models with their relations)
// ============================================================================

/**
 * User with full relations
 * Use this when you need complete user data including deliveries and payroll
 */
export interface UserWithRelations extends User {
  branch?: Branch | null;
  payrollRecords?: Payroll[];
  deliveries?: Delivery[];
}

/**
 * Branch with all related data
 * Use this when fetching branch details including staff and warehouses
 */
export interface BranchWithRelations extends Branch {
  users?: User[];
  warehouses?: Warehouse[];
}

/**
 * Warehouse with inventory details
 * Use this when viewing warehouse stock levels
 */
export interface WarehouseWithInventory extends Warehouse {
  branch?: Branch;
  inventory?: InventoryWithProduct[];
}

/**
 * Product with all warehouse inventory
 * Use this when viewing product availability across all warehouses
 */
export interface ProductWithInventory extends Product {
  inventory?: InventoryWithWarehouse[];
}

/**
 * Inventory with both product and warehouse details
 * Use this for stock level viewing/management
 */
export interface InventoryWithDetails extends Inventory {
  product?: Product;
  warehouse?: Warehouse;
}

/**
 * Inventory with just product info
 */
export interface InventoryWithProduct extends Inventory {
  product?: Product;
}

/**
 * Inventory with just warehouse info
 */
export interface InventoryWithWarehouse extends Inventory {
  warehouse?: Warehouse;
}

/**
 * Delivery with full logistics details
 * Use this for shipment tracking
 */
export interface DeliveryWithDetails extends Delivery {
  driver?: User;
  truck?: Truck;
}

/**
 * Truck with assigned deliveries
 * Use this for vehicle management
 */
export interface TruckWithDeliveries extends Truck {
  deliveries?: Delivery[];
}

/**
 * Finance transaction with linked documents
 * Use this for audit trail and reporting
 */
export interface FinanceTransactionWithLinks extends FinanceTransaction {
  payroll?: Payroll | null;
}

/**
 * Payroll record with employee and finance info
 * Use this for compensation management
 */
export interface PayrollWithDetails extends Payroll {
  user?: User;
  transactions?: FinanceTransaction[];
}

// ============================================================================
// REQUEST/RESPONSE DTO TYPES
// ============================================================================

/**
 * Create Product Request
 */
export interface CreateProductRequest {
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  category?: string;
  unit_price: number;
  cost_price: number;
  quantity?: number;
  reorder_level?: number;
}

/**
 * Update Inventory Request
 */
export interface UpdateInventoryRequest {
  productId: string;
  warehouseId: string;
  quantity?: number;
  reserved?: number;
  status?: InventoryStatus;
}

/**
 * Create Delivery Request
 */
export interface CreateDeliveryRequest {
  salesId: string;
  driverId: string;
  truckId: string;
  destination: string;
  estimated_km?: number;
  scheduled_date?: Date;
  notes?: string;
}

/**
 * Create Payroll Request
 */
export interface CreatePayrollRequest {
  payroll_no: string;
  userId: string;
  base_salary: number;
  allowances?: number;
  deductions?: number;
  period_start: Date;
  period_end: Date;
  notes?: string;
}

/**
 * Update User Request
 */
export interface UpdateUserRequest {
  name?: string;
  phone?: string;
  role?: UserRole;
  branchId?: string | null;
  isActive?: boolean;
}

/**
 * API Response Wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ============================================================================
// QUERY FILTER TYPES
// ============================================================================

/**
 * Product filters for search/list
 */
export interface ProductFilters {
  category?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}

/**
 * Inventory filters for search/list
 */
export interface InventoryFilters {
  status?: InventoryStatus;
  warehouseId?: string;
  productId?: string;
  lowStockOnly?: boolean; // quantity < reorder_level
}

/**
 * Delivery filters for search/list
 */
export interface DeliveryFilters {
  status?: DeliveryStatus;
  driverId?: string;
  truckId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string; // Searches delivery_no
}

/**
 * Payroll filters for search/list
 */
export interface PayrollFilters {
  status?: PayrollStatus;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string; // Searches payroll_no
}

// ============================================================================
// CALCULATION/BUSINESS LOGIC TYPES
// ============================================================================

/**
 * Inventory calculation result
 */
export interface InventoryCalculation {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalReserved: number;
  totalAvailable: number;
  byWarehouse: Array<{
    warehouseId: string;
    warehouseName: string;
    quantity: number;
    reserved: number;
    available: number;
    status: InventoryStatus;
  }>;
}

/**
 * Sales order totals calculation
 */
export interface SalesCalculation {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  itemCount: number;
}

/**
 * Payroll calculation result
 */
export interface PayrollCalculation {
  baseSalary: number;
  allowances: number;
  totalEarnings: number;
  deductions: number;
  netSalary: number;
  breakdown: {
    label: string;
    amount: number;
    percentage: number;
  }[];
}

/**
 * Dashboard statistics
 */
export interface DashboardStats {
  totalBranches: number;
  totalWarehouses: number;
  totalProducts: number;
  totalStaff: number;
  pendingSales: number;
  pendingDeliveries: number;
  lowStockProducts: number;
  monthlyRevenue: number;
}

// ============================================================================
// ENUM-BASED UTILITY TYPES
// ============================================================================

/**
 * Map of enum values to display labels
 */
export const INVENTORY_STATUS_LABELS: Record<InventoryStatus, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
  discontinued: "Discontinued",
};

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: "Pending",
  assigned: "Assigned",
  in_transit: "In Transit",
  delivered: "Delivered",
  failed: "Failed",
  rescheduled: "Rescheduled",
};

export const CASHIER_SESSION_STATUS_LABELS: Record<CashierSessionStatus, string> = {
  OPEN: "Open",
  CLOSED: "Closed",
  DISCREPANCY: "Discrepancy Detected",
  RECONCILED: "Reconciled",
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
  adjustment: "Adjustment",
};

export const PAYROLL_STATUS_LABELS: Record<PayrollStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  paid: "Paid",
  reversed: "Reversed",
};

// ============================================================================
// PERMISSION/AUTHORIZATION TYPES
// ============================================================================

/**
 * Permission levels based on user role
 */
export interface UserPermissions {
  canViewInventory: boolean;
  canEditInventory: boolean;
  canCreateSales: boolean;
  canApproveSales: boolean;
  canManageDelivery: boolean;
  canViewPayroll: boolean;
  canApprovePayroll: boolean;
  canManageUsers: boolean;
  canManageBranches: boolean;
  canViewReports: boolean;
}

/**
 * Get permissions for a user role
 */
export function getPermissionsForRole(role: UserRole): UserPermissions {
  switch (role) {
    case "cashier":
      return {
        canViewInventory: true,
        canEditInventory: false,
        canCreateSales: true,
        canApproveSales: false,
        canManageDelivery: false,
        canViewPayroll: false,
        canApprovePayroll: false,
        canManageUsers: false,
        canManageBranches: false,
        canViewReports: false,
      };
    case "warehouse_staff":
      return {
        canViewInventory: true,
        canEditInventory: true,
        canCreateSales: false,
        canApproveSales: false,
        canManageDelivery: false,
        canViewPayroll: false,
        canApprovePayroll: false,
        canManageUsers: false,
        canManageBranches: false,
        canViewReports: false,
      };
    case "driver":
      return {
        canViewInventory: false,
        canEditInventory: false,
        canCreateSales: false,
        canApproveSales: false,
        canManageDelivery: true,
        canViewPayroll: true,
        canApprovePayroll: false,
        canManageUsers: false,
        canManageBranches: false,
        canViewReports: false,
      };
    case "manager":
      return {
        canViewInventory: true,
        canEditInventory: true,
        canCreateSales: true,
        canApproveSales: true,
        canManageDelivery: true,
        canViewPayroll: true,
        canApprovePayroll: false,
        canManageUsers: true,
        canManageBranches: true,
        canViewReports: true,
      };
    case "admin":
      return {
        canViewInventory: true,
        canEditInventory: true,
        canCreateSales: true,
        canApproveSales: true,
        canManageDelivery: true,
        canViewPayroll: true,
        canApprovePayroll: true,
        canManageUsers: true,
        canManageBranches: true,
        canViewReports: true,
      };
    default:
      return {
        canViewInventory: false,
        canEditInventory: false,
        canCreateSales: false,
        canApproveSales: false,
        canManageDelivery: false,
        canViewPayroll: false,
        canApprovePayroll: false,
        canManageUsers: false,
        canManageBranches: false,
        canViewReports: false,
      };
  }
}

// ============================================================================
// EXPORT ALL PRISMA TYPES
// ============================================================================

export type {
  User,
  Branch,
  Warehouse,
  Product,
  Inventory,
  Truck,
  Delivery,
  FinanceTransaction,
  Payroll,
  CashierSession,
  SalesDocument,
};

export type {
  InventoryStatus,
  DeliveryStatus,
  TransactionType,
  PayrollStatus,
  PaymentMethod,
  ProductType,
  ProductStatus,
  SalesDocumentType,
  SalesDocumentStatus,
  PaymentStatus,
  CashierSessionStatus,
  MovementType,
  TransferStatus,
  JournalType,
  FiscalStatus,
  AuditAction,
  ApprovalType,
  ApprovalStatus,
  PurchaseOrderStatus,
};

// ============================================================================
// CONSTANTS
// ============================================================================

export const PAGINATION_DEFAULTS = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

export const VALIDATION_RULES = {
  MIN_SKU_LENGTH: 3,
  MAX_SKU_LENGTH: 50,
  MIN_PASSWORD_LENGTH: 8,
  MAX_NAME_LENGTH: 255,
  MIN_PRICE: 0,
  MAX_PRICE: 999999.99,
};

export const HTTP_STATUS_CODES = {
  SUCCESS: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_ERROR: 422,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate net salary for payroll
 */
export function calculateNetSalary(
  baseSalary: number,
  allowances: number = 0,
  deductions: number = 0
): number {
  return baseSalary + allowances - deductions;
}

/**
 * Calculate available inventory
 */
export function calculateAvailableInventory(
  quantity: number,
  reserved: number
): number {
  return quantity - reserved;
}

/**
 * Calculate sales total
 */
export function calculateSalesTotal(
  subtotal: number,
  discount: number = 0,
  tax: number = 0
): number {
  return subtotal - discount + tax;
}

/**
 * Is inventory low stock?
 */
export function isLowStock(quantity: number, reorderLevel: number): boolean {
  return quantity < reorderLevel;
}

/**
 * Is delivery complete?
 */
export function isDeliveryComplete(status: DeliveryStatus): boolean {
  return status === "delivered" || status === "failed";
}

// ============================================================================
// END OF FILE
// ============================================================================

/**
 * USAGE EXAMPLES:
 *
 * // In your API route:
 * import { SalesWithFullDetails, CreateSalesRequest, ApiResponse } from '@/types';
 *
 * export async function getSaleOrder(id: string): Promise<ApiResponse<SalesWithFullDetails>> {
 *   const sale = await prisma.sales.findUnique({
 *     where: { id },
 *     include: {
 *       branch: true,
 *       user: true,
 *       items: { include: { product: true } },
 *       delivery: true
 *     }
 *   });
 *
 *   return {
 *     success: !!sale,
 *     data: sale || undefined,
 *     timestamp: new Date().toISOString()
 *   };
 * }
 */
