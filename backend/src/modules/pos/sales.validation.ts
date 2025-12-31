// backend/src/modules/sales/sales.validation.ts
import { z } from 'zod';

/**
 * Validation schemas for sales endpoints
 */

// Sales document item schema
const salesDocumentItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  taxRate: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
  total: z.number().nonnegative(),
});

// Create sales document schema
export const createSalesDocumentSchema = z.object({
  type: z.enum(['DRAFT', 'QUOTE', 'INVOICE', 'CREDIT_NOTE']),
  status: z.enum(['DRAFT', 'SENT', 'CONVERTED', 'PAID', 'UNPAID', 'VOID']).optional(),
  customerId: z.string().uuid().optional(),
  issueDate: z.string().or(z.date()),
  dueDate: z.string().or(z.date()).optional(),
  subtotal: z.number().nonnegative(),
  tax: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
  total: z.number().nonnegative(),
  notes: z.string().optional(),
  items: z.array(salesDocumentItemSchema).min(1),
  allowStockOverride: z.boolean().optional(), // For admin override on quotes
});

// List documents query schema
export const listDocumentsQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  type: z.enum(['DRAFT', 'QUOTE', 'INVOICE', 'CREDIT_NOTE']).optional(),
  status: z.enum(['DRAFT', 'SENT', 'CONVERTED', 'PAID', 'UNPAID', 'VOID']).optional(),
  customerId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
});

// Convert document schema
export const convertDocumentSchema = z.object({
  type: z.enum(['DRAFT', 'QUOTE', 'INVOICE', 'CREDIT_NOTE']),
});

// POS sale item schema
const posSaleItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive(),
  unit_price: z.number().nonnegative(),
  tax_rate: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
  discount_percent: z.number().nonnegative().default(0),
});

// Create POS sale schema
export const createPOSSaleSchema = z.object({
  branchId: z.string().uuid(),
  userId: z.string().uuid(),
  items: z.array(posSaleItemSchema).min(1),
  payment_method: z.enum(['cash', 'card', 'mpesa', 'cheque', 'bank_transfer']),
  amount_paid: z.number().positive(),
  discount: z.number().nonnegative().default(0),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  notes: z.string().optional(),
});

// Record payment schema
export const recordPaymentSchema = z.object({
  amount: z.number().positive(),
  payment_method: z.enum(['cash', 'card', 'mpesa', 'cheque', 'bank_transfer']),
  reference: z.string().optional(),
});

// Create credit note schema
export const createCreditNoteSchema = z.object({
  items: z.array(salesDocumentItemSchema).min(1),
  reason: z.string().min(10),
});

// Void document schema
export const voidDocumentSchema = z.object({
  reason: z.string().min(10),
});
