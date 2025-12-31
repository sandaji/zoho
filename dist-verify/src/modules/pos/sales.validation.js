"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voidDocumentSchema = exports.createCreditNoteSchema = exports.recordPaymentSchema = exports.createPOSSaleSchema = exports.convertDocumentSchema = exports.listDocumentsQuerySchema = exports.createSalesDocumentSchema = void 0;
// backend/src/modules/sales/sales.validation.ts
const zod_1 = require("zod");
/**
 * Validation schemas for sales endpoints
 */
// Sales document item schema
const salesDocumentItemSchema = zod_1.z.object({
    productId: zod_1.z.string().uuid(),
    quantity: zod_1.z.number().positive(),
    unitPrice: zod_1.z.number().nonnegative(),
    taxRate: zod_1.z.number().nonnegative(),
    discount: zod_1.z.number().nonnegative().default(0),
    total: zod_1.z.number().nonnegative(),
});
// Create sales document schema
exports.createSalesDocumentSchema = zod_1.z.object({
    type: zod_1.z.enum(['DRAFT', 'QUOTE', 'INVOICE', 'CREDIT_NOTE']),
    status: zod_1.z.enum(['DRAFT', 'SENT', 'CONVERTED', 'PAID', 'UNPAID', 'VOID']).optional(),
    customerId: zod_1.z.string().uuid().optional(),
    issueDate: zod_1.z.string().or(zod_1.z.date()),
    dueDate: zod_1.z.string().or(zod_1.z.date()).optional(),
    subtotal: zod_1.z.number().nonnegative(),
    tax: zod_1.z.number().nonnegative(),
    discount: zod_1.z.number().nonnegative().default(0),
    total: zod_1.z.number().nonnegative(),
    notes: zod_1.z.string().optional(),
    items: zod_1.z.array(salesDocumentItemSchema).min(1),
    allowStockOverride: zod_1.z.boolean().optional(), // For admin override on quotes
});
// List documents query schema
exports.listDocumentsQuerySchema = zod_1.z.object({
    branchId: zod_1.z.string().uuid().optional(),
    type: zod_1.z.enum(['DRAFT', 'QUOTE', 'INVOICE', 'CREDIT_NOTE']).optional(),
    status: zod_1.z.enum(['DRAFT', 'SENT', 'CONVERTED', 'PAID', 'UNPAID', 'VOID']).optional(),
    customerId: zod_1.z.string().uuid().optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    limit: zod_1.z.string().optional(),
    offset: zod_1.z.string().optional(),
});
// Convert document schema
exports.convertDocumentSchema = zod_1.z.object({
    type: zod_1.z.enum(['DRAFT', 'QUOTE', 'INVOICE', 'CREDIT_NOTE']),
});
// POS sale item schema
const posSaleItemSchema = zod_1.z.object({
    productId: zod_1.z.string().uuid(),
    quantity: zod_1.z.number().positive(),
    unit_price: zod_1.z.number().nonnegative(),
    tax_rate: zod_1.z.number().nonnegative(),
    discount: zod_1.z.number().nonnegative().default(0),
    discount_percent: zod_1.z.number().nonnegative().default(0),
});
// Create POS sale schema
exports.createPOSSaleSchema = zod_1.z.object({
    branchId: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    items: zod_1.z.array(posSaleItemSchema).min(1),
    payment_method: zod_1.z.enum(['cash', 'card', 'mpesa', 'cheque', 'bank_transfer']),
    amount_paid: zod_1.z.number().positive(),
    discount: zod_1.z.number().nonnegative().default(0),
    customer_name: zod_1.z.string().optional(),
    customer_phone: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
// Record payment schema
exports.recordPaymentSchema = zod_1.z.object({
    amount: zod_1.z.number().positive(),
    payment_method: zod_1.z.enum(['cash', 'card', 'mpesa', 'cheque', 'bank_transfer']),
    reference: zod_1.z.string().optional(),
});
// Create credit note schema
exports.createCreditNoteSchema = zod_1.z.object({
    items: zod_1.z.array(salesDocumentItemSchema).min(1),
    reason: zod_1.z.string().min(10),
});
// Void document schema
exports.voidDocumentSchema = zod_1.z.object({
    reason: zod_1.z.string().min(10),
});
