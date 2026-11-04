// backend/src/modules/sales/sales.validation.ts
import { z } from "zod";

/**
 * Validation schemas for sales endpoints
 */

// Sales document item schema
const salesDocumentItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  taxRate: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
  // `total` is computed server-side; accept it from the client but never rely on it
  total: z.number().nonnegative().optional(),
  description: z.string().optional(),
});

// Create sales document schema
export const createSalesDocumentSchema = z.object({
  type: z.enum(["DRAFT", "QUOTE", "INVOICE", "CREDIT_NOTE"]),
  status: z
    .enum(["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "CONVERTED", "VOID", "CLOSED"])
    .optional(),
  customerId: z.string().optional(),
  issueDate: z.string().or(z.date()).optional(),
  dueDate: z.string().or(z.date()).optional(),
  // Accept client-computed totals for reference; server always recalculates
  subtotal: z.number().nonnegative().optional(),
  tax: z.number().nonnegative().optional(),
  discount: z.number().nonnegative().default(0),
  total: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  // Optional payment method — used when creating an INVOICE directly
  paymentMethod: z.enum(["cash", "card", "mpesa", "cheque", "bank_transfer"]).optional(),
  items: z.array(salesDocumentItemSchema).min(1),
  allowStockOverride: z.boolean().optional(), // For admin override on quotes
});

// List documents query schema
export const listDocumentsQuerySchema = z.object({
  branchId: z.string().optional(),
  salespersonOnly: z.coerce.boolean().optional(),
  type: z.enum(["DRAFT", "QUOTE", "INVOICE", "CREDIT_NOTE"]).optional(),
  status: z
    .enum(["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "CONVERTED", "VOID", "CLOSED"])
    .optional(),
  customerId: z.string().optional(),
  sourceDocumentId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
});

// Convert document schema — type is accepted but ignored (convertToInvoice
// always produces an INVOICE); the frontend calls this with an empty body.
export const convertDocumentSchema = z.object({
  type: z.enum(["DRAFT", "QUOTE", "INVOICE", "CREDIT_NOTE"]).optional(),
  customerId: z.string().nullable().optional(),
  notes: z.string().optional(),
  amountPaid: z.number().nonnegative().optional(),
  paymentMethod: z.enum(["cash", "card", "mpesa", "cheque", "bank_transfer", "credit"]).optional(),
  paymentReference: z.string().trim().max(120).optional().nullable(),
  paymentConfirmed: z.boolean().optional(),
}).superRefine((data, ctx) => {
  const hasExternalPayment =
    (data.amountPaid ?? 0) > 0 &&
    !!data.paymentMethod &&
    data.paymentMethod !== "cash" &&
    data.paymentMethod !== "credit";
  if (!hasExternalPayment) return;
  if (!data.paymentConfirmed) {
    ctx.addIssue({
      code: "custom",
      path: ["paymentConfirmed"],
      message: "Confirm the external payment has been received and verified",
    });
  }
  if (!data.paymentReference?.trim()) {
    ctx.addIssue({
      code: "custom",
      path: ["paymentReference"],
      message: "A payment reference is required for external payments",
    });
  }
});

// Update document items schema (edit a saved Draft/Quote)
export const updateDocumentItemsSchema = z.object({
  customerId: z.string().nullable().optional(),
  notes: z.string().optional(),
  discount: z.number().nonnegative().optional(),
  allowStockOverride: z.boolean().optional(),
  items: z.array(salesDocumentItemSchema).min(1),
});

// POS sale item schema
const posSaleItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().positive(),
  unit_price: z.number().nonnegative(),
  tax_rate: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
  discount_percent: z.number().nonnegative().default(0),
});

// Create POS sale schema
export const createPOSSaleSchema = z.object({
  branchId: z.string(),
  userId: z.string(),
  items: z.array(posSaleItemSchema).min(1),
  payment_method: z.enum(["cash", "card", "mpesa", "cheque", "bank_transfer"]),
  amount_paid: z.number().positive(),
  payment_reference: z.string().trim().max(120).optional().nullable(),
  payment_confirmed: z.boolean().optional(),
  discount: z.number().nonnegative().default(0),
  customerId: z.string().optional(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.payment_method === "cash") return;
  if (!data.payment_confirmed) {
    ctx.addIssue({
      code: "custom",
      path: ["payment_confirmed"],
      message: "Confirm the external payment has been received and verified",
    });
  }
  if (!data.payment_reference?.trim()) {
    ctx.addIssue({
      code: "custom",
      path: ["payment_reference"],
      message: "A payment reference is required for external payments",
    });
  }
});

// Record payment schema
export const recordPaymentSchema = z.object({
  amount: z.number().positive(),
  payment_method: z.enum(["cash", "card", "mpesa", "cheque", "bank_transfer"]),
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

// Park sale schema
export const parkSaleSchema = z.object({
  branchId: z.string(),
  userId: z.string(),
  items: z.array(posSaleItemSchema).min(1),
  discount: z.number().nonnegative().default(0),
  payment_method: z
    .enum(["cash", "card", "mpesa", "cheque", "bank_transfer"])
    .optional(),
  customerId: z.string().optional(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  notes: z.string().optional(),
});

// Hold sale schema
export const holdSaleSchema = z.object({
  branchId: z.string(),
  userId: z.string(),
  items: z.array(posSaleItemSchema).min(1),
  discount: z.number().nonnegative().default(0),
  payment_method: z
    .enum(["cash", "card", "mpesa", "cheque", "bank_transfer"])
    .optional(),
  customerId: z.string().optional(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  notes: z.string().optional(),
});
