/**
 * Warehouse Module - Validation Schemas
 * Zod schemas for request validation
 */

import { z } from "zod";

/**
 * Schema for creating a stock transfer
 */
export const createTransferSchema = z.object({
  sourceId: z.string().min(1, "Source warehouse is required"),
  targetId: z.string().min(1, "Target warehouse is required"),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Product ID is required"),
        quantity: z.number().int().positive("Quantity must be positive"),
      })
    )
    .min(1, "At least one item is required"),
  notes: z.string().optional(),
}).refine((data) => data.sourceId !== data.targetId, {
  message: "Source and target warehouses must be different",
  path: ["targetId"],
});

/**
 * Schema for fulfilling/receiving a transfer
 */
export const fulfillTransferSchema = z.object({
  transferId: z.string().min(1, "Transfer ID is required"),
});

/**
 * Schema for adjusting stock
 */
export const adjustStockSchema = z.object({
  warehouseId: z.string().min(1, "Warehouse ID is required"),
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.number().int().refine((val) => val !== 0, {
    message: "Quantity cannot be zero",
  }),
  reason: z.string().min(3, "Reason for adjustment is required (minimum 3 characters)"),
});

/**
 * Schema for querying stock movements
 */
export const getStockMovementsSchema = z.object({
  warehouseId: z.string().optional(),
  productId: z.string().optional(),
  type: z.enum(["INBOUND", "OUTBOUND", "TRANSFER_IN", "TRANSFER_OUT", "ADJUSTMENT"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(50),
});

/**
 * Schema for querying transfers
 */
export const getTransfersSchema = z.object({
  status: z.enum(["PENDING", "IN_TRANSIT", "COMPLETED", "CANCELLED"]).optional(),
  sourceId: z.string().optional(),
  targetId: z.string().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(50),
});

/**
 * Schema for updating transfer status
 */
export const updateTransferStatusSchema = z.object({
  status: z.enum(["IN_TRANSIT", "CANCELLED"]),
  notes: z.string().optional(),
});

/**
 * TypeScript types derived from schemas
 */
export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type FulfillTransferInput = z.infer<typeof fulfillTransferSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type GetStockMovementsInput = z.infer<typeof getStockMovementsSchema>;
export type GetTransfersInput = z.infer<typeof getTransfersSchema>;
export type UpdateTransferStatusInput = z.infer<typeof updateTransferStatusSchema>;
