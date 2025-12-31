"use strict";
/**
 * TypeScript type definitions and interfaces for the Zoho ERP system
 * Extends Prisma-generated types with custom interfaces
 *
 * Generated from: backend/prisma/schema.prisma
 * Last Updated: November 12, 2025
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTTP_STATUS_CODES = exports.VALIDATION_RULES = exports.PAGINATION_DEFAULTS = exports.PAYROLL_STATUS_LABELS = exports.TRANSACTION_TYPE_LABELS = exports.DELIVERY_STATUS_LABELS = exports.SALES_STATUS_LABELS = exports.INVENTORY_STATUS_LABELS = exports.USER_ROLE_LABELS = void 0;
exports.getPermissionsForRole = getPermissionsForRole;
exports.calculateNetSalary = calculateNetSalary;
exports.calculateAvailableInventory = calculateAvailableInventory;
exports.calculateSalesTotal = calculateSalesTotal;
exports.isLowStock = isLowStock;
exports.isSalesComplete = isSalesComplete;
exports.isDeliveryComplete = isDeliveryComplete;
// ============================================================================
// ENUM-BASED UTILITY TYPES
// ============================================================================
/**
 * Map of enum values to display labels
 */
exports.USER_ROLE_LABELS = {
    cashier: "Cashier",
    warehouse_staff: "Warehouse Staff",
    driver: "Driver",
    manager: "Manager",
    admin: "Administrator",
};
exports.INVENTORY_STATUS_LABELS = {
    in_stock: "In Stock",
    low_stock: "Low Stock",
    out_of_stock: "Out of Stock",
    discontinued: "Discontinued",
};
exports.SALES_STATUS_LABELS = {
    draft: "Draft",
    pending: "Pending",
    confirmed: "Confirmed",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
    returned: "Returned",
};
exports.DELIVERY_STATUS_LABELS = {
    pending: "Pending",
    assigned: "Assigned",
    in_transit: "In Transit",
    delivered: "Delivered",
    failed: "Failed",
    rescheduled: "Rescheduled",
};
exports.TRANSACTION_TYPE_LABELS = {
    income: "Income",
    expense: "Expense",
    transfer: "Transfer",
    adjustment: "Adjustment",
};
exports.PAYROLL_STATUS_LABELS = {
    draft: "Draft",
    submitted: "Submitted",
    approved: "Approved",
    paid: "Paid",
    reversed: "Reversed",
};
/**
 * Get permissions for a user role
 */
function getPermissionsForRole(role) {
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
// CONSTANTS
// ============================================================================
exports.PAGINATION_DEFAULTS = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
};
exports.VALIDATION_RULES = {
    MIN_SKU_LENGTH: 3,
    MAX_SKU_LENGTH: 50,
    MIN_PASSWORD_LENGTH: 8,
    MAX_NAME_LENGTH: 255,
    MIN_PRICE: 0,
    MAX_PRICE: 999999.99,
};
exports.HTTP_STATUS_CODES = {
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
function calculateNetSalary(baseSalary, allowances = 0, deductions = 0) {
    return baseSalary + allowances - deductions;
}
/**
 * Calculate available inventory
 */
function calculateAvailableInventory(quantity, reserved) {
    return quantity - reserved;
}
/**
 * Calculate sales total
 */
function calculateSalesTotal(subtotal, discount = 0, tax = 0) {
    return subtotal - discount + tax;
}
/**
 * Is inventory low stock?
 */
function isLowStock(quantity, reorderLevel) {
    return quantity < reorderLevel;
}
/**
 * Is sales order complete?
 */
function isSalesComplete(status) {
    return (status === "delivered" || status === "cancelled" || status === "returned");
}
/**
 * Is delivery complete?
 */
function isDeliveryComplete(status) {
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
 *
 * // In frontend:
 * import { USER_ROLE_LABELS, getPermissionsForRole } from '@/types';
 *
 * const role = user.role as UserRole;
 * const permissions = getPermissionsForRole(role);
 * const label = USER_ROLE_LABELS[role];
 */
