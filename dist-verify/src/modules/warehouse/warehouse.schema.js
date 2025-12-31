"use strict";
/**
 * Warehouse Module - Validation Schemas
 * Zod schemas for request validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTransferStatusSchema = exports.getTransfersSchema = exports.getStockMovementsSchema = exports.adjustStockSchema = exports.fulfillTransferSchema = exports.createTransferSchema = void 0;
const zod_1 = require("zod");
/**
 * Schema for creating a stock transfer
 */
exports.createTransferSchema = zod_1.z.object({
    sourceId: zod_1.z.string().min(1, "Source warehouse is required"),
    targetId: zod_1.z.string().min(1, "Target warehouse is required"),
    items: zod_1.z
        .array(zod_1.z.object({
        productId: zod_1.z.string().min(1, "Product ID is required"),
        quantity: zod_1.z.number().int().positive("Quantity must be positive"),
    }))
        .min(1, "At least one item is required"),
    notes: zod_1.z.string().optional(),
    driverId: zod_1.z.string().optional(),
}).refine((data) => data.sourceId !== data.targetId, {
    message: "Source and target warehouses must be different",
    path: ["targetId"],
});
/**
 * Schema for fulfilling/receiving a transfer
 */
exports.fulfillTransferSchema = zod_1.z.object({
    transferId: zod_1.z.string().min(1, "Transfer ID is required"),
});
/**
 * Schema for adjusting stock
 */
exports.adjustStockSchema = zod_1.z.object({
    warehouseId: zod_1.z.string().min(1, "Warehouse ID is required"),
    productId: zod_1.z.string().min(1, "Product ID is required"),
    quantity: zod_1.z.number().int().refine((val) => val !== 0, {
        message: "Quantity cannot be zero",
    }),
    reason: zod_1.z.string().min(3, "Reason for adjustment is required (minimum 3 characters)"),
});
/**
 * Schema for querying stock movements
 */
exports.getStockMovementsSchema = zod_1.z.object({
    warehouseId: zod_1.z.string().optional(),
    productId: zod_1.z.string().optional(),
    type: zod_1.z.enum(["INBOUND", "OUTBOUND", "TRANSFER_IN", "TRANSFER_OUT", "ADJUSTMENT"]).optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    page: zod_1.z.number().int().positive().optional().default(1),
    limit: zod_1.z.number().int().positive().max(100).optional().default(50),
});
/**
 * Schema for querying transfers
 */
exports.getTransfersSchema = zod_1.z.object({
    status: zod_1.z.enum(["PENDING", "IN_TRANSIT", "COMPLETED", "CANCELLED"]).optional(),
    sourceId: zod_1.z.string().optional(),
    targetId: zod_1.z.string().optional(),
    page: zod_1.z.number().int().positive().optional().default(1),
    limit: zod_1.z.number().int().positive().max(100).optional().default(50),
});
/**
 * Schema for updating transfer status
 */
exports.updateTransferStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(["IN_TRANSIT", "CANCELLED"]),
    notes: zod_1.z.string().optional(),
});
