// backend/src/modules/pos/service/sales.service.ts
import { prisma } from "../../../lib/db";
import {
  SalesDocumentType,
  SalesDocumentStatus,
  PaymentStatus,
  PaymentMethod,
  MovementType,
} from "../../../generated";
import { SequenceService } from "../../sequences/sequence.service";
import { AccountingService } from "../../finance/services/accounting.service";
import { StockValidationService } from "./stock-validation.service";
import { AppError, ErrorCode } from "../../../lib/errors";
import { synchronizeBranchInventory } from "../../../lib/inventory-sync";

// -----------------------------
// Helpers
// -----------------------------
function calculateItemTotals(item: {
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discount?: number;
}) {
  const subtotal = item.quantity * item.unitPrice;
  const taxAmount = subtotal * (item.taxRate || 0);
  const discount = item.discount || 0;
  const total = subtotal + taxAmount - discount;

  return { subtotal, taxAmount, discount, total };
}

function calculateDocumentTotals(
  items: {
    subtotal: number;
    taxAmount: number;
    discount: number;
    total: number;
  }[],
) {
  let subtotal = 0;
  let tax = 0;
  let discount = 0;

  for (const item of items) {
    subtotal += item.subtotal;
    tax += item.taxAmount;
    discount += item.discount;
  }

  return {
    subtotal,
    tax,
    discount,
    total: subtotal + tax - discount,
  };
}

// -----------------------------
// Service
// -----------------------------
export class SalesService {
  // =============================
  // Create Draft / Quote / Invoice
  // =============================
  static async createDocument(
    input: {
      type: SalesDocumentType;
      status?: SalesDocumentStatus;
      customerId?: string;
      issueDate?: Date;
      dueDate?: Date | null;
      notes?: string;
      paymentMethod?: string; // Required for direct INVOICE creation
      items: {
        productId: string;
        description?: string;
        quantity: number;
        unitPrice: number;
        taxRate?: number;
        discount?: number;
      }[];
      allowStockOverride?: boolean;
    },
    branchId: string,
    userId: string,
  ) {
    // ── Direct Invoice creation ───────────────────────────────────────────────
    // When type is INVOICE we run full stock validation + deduction inside a
    // transaction, produce an SENT/UNPAID invoice, and record no upfront
    // payment (the cashier will record payment separately via the AR flow).
    if (input.type === SalesDocumentType.INVOICE) {
      return SalesService._createDirectInvoice(input, branchId, userId);
    }

    // ── Draft / Quote ─────────────────────────────────────────────────────────
    if (input.type === SalesDocumentType.DRAFT) {
      await StockValidationService.validateOrThrow(
        branchId,
        input.items,
        userId,
        false,
      );
    }

    if (input.type === SalesDocumentType.QUOTE) {
      await StockValidationService.validateOrThrow(
        branchId,
        input.items,
        userId,
        input.allowStockOverride || false,
      );
    }

    if (input.type === SalesDocumentType.CREDIT_NOTE) {
      throw new AppError(
        ErrorCode.BAD_REQUEST,
        400,
        "Credit notes must be created via the credit-note endpoint.",
      );
    }

    const documentId = await SequenceService.getNextNumber(input.type, branchId);

    const preparedItems = input.items.map((item) => {
      const totals = calculateItemTotals(item);
      return {
        productId: item.productId,
        description: item.description || "Sale item",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate || 0,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        discount: totals.discount,
        total: totals.total,
      };
    });

    const totals = calculateDocumentTotals(preparedItems);

    let finalIssueDate = input.issueDate || new Date();
    let finalDueDate = input.dueDate;

    if (input.type === SalesDocumentType.QUOTE) {
      finalIssueDate = new Date();
      const validUntil = new Date(finalIssueDate);
      validUntil.setDate(validUntil.getDate() + 3);
      finalDueDate = validUntil;
    }

    return prisma.salesDocument.create({
      data: {
        documentId,
        type: input.type,
        status: input.status || SalesDocumentStatus.DRAFT,
        branchId,
        customerId: input.customerId || null,
        issueDate: finalIssueDate,
        dueDate: finalDueDate || null,
        subtotal: totals.subtotal,
        tax: totals.tax,
        discount: totals.discount,
        total: totals.total,
        balance: totals.total,
        notes: input.notes || null,
        createdById: userId,
        items: { create: preparedItems },
      },
      include: { items: true, customer: true },
    });
  }

  // ── Private: direct INVOICE creation with stock deduction ─────────────────
  private static async _createDirectInvoice(
    input: {
      customerId?: string;
      issueDate?: Date;
      dueDate?: Date | null;
      notes?: string;
      paymentMethod?: string;
      items: {
        productId: string;
        description?: string;
        quantity: number;
        unitPrice: number;
        taxRate?: number;
        discount?: number;
      }[];
    },
    branchId: string,
    userId: string,
  ) {
    // Validate stock availability (no override allowed for direct invoices)
    await StockValidationService.validateOrThrow(branchId, input.items, userId, false);

    const documentId = await SequenceService.getNextNumber(
      SalesDocumentType.INVOICE,
      branchId,
    );

    const preparedItems = input.items.map((item) => {
      const totals = calculateItemTotals(item);
      return {
        productId: item.productId,
        description: item.description || "Invoice item",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate || 0,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        discount: totals.discount,
        total: totals.total,
      };
    });

    const totals = calculateDocumentTotals(preparedItems);

    return prisma.$transaction(
      async (tx) => {
        // Create the invoice in SENT / UNPAID state — payment recorded separately
        const invoice = await tx.salesDocument.create({
          data: {
            documentId,
            type: SalesDocumentType.INVOICE,
            status: SalesDocumentStatus.SENT,
            paymentStatus: PaymentStatus.UNPAID,
            branchId,
            customerId: input.customerId || null,
            issueDate: input.issueDate || new Date(),
            dueDate: input.dueDate || null,
            subtotal: totals.subtotal,
            tax: totals.tax,
            discount: totals.discount,
            total: totals.total,
            balance: totals.total,
            paidAmount: 0,
            notes: input.notes || null,
            createdById: userId,
            items: { create: preparedItems },
          },
          include: { items: true, customer: true },
        });

        // Resolve the branch's default warehouse
        const warehouse = await tx.warehouse.findFirst({ where: { branchId } });
        if (!warehouse) {
          throw new AppError(
            ErrorCode.NOT_FOUND,
            404,
            "No warehouse found for this branch — cannot deduct stock.",
          );
        }

        // Deduct stock and record movements for every line
        for (const item of preparedItems) {
          const inventoryUpdate = await tx.inventory.updateMany({
            where: {
              productId: item.productId,
              warehouseId: warehouse.id,
              available: { gte: item.quantity },
            },
            data: {
              quantity: { decrement: item.quantity },
              available: { decrement: item.quantity },
            },
          });

          if (inventoryUpdate.count !== 1) {
            throw new AppError(
              ErrorCode.INSUFFICIENT_INVENTORY,
              400,
              `Insufficient stock for product ${item.productId} — inventory may have changed.`,
            );
          }

          await tx.stockMovement.create({
            data: {
              type: MovementType.OUTBOUND,
              quantity: item.quantity,
              productId: item.productId,
              warehouseId: warehouse.id,
              salesId: invoice.id,
              reference: `Direct Invoice ${invoice.documentId}`,
              createdById: userId,
            },
          });
        }

        // Sync branch-level aggregate inventory for all affected products
        const uniqueProductIds = new Set(preparedItems.map((i) => i.productId));
        for (const productId of uniqueProductIds) {
          await synchronizeBranchInventory(tx, productId, branchId);
        }

        // Update customer's outstanding balance if a customer is attached
        if (invoice.customerId) {
          await tx.customer.update({
            where: { id: invoice.customerId },
            data: { currentBalance: { increment: invoice.total } },
          });
        }

        return invoice;
      },
      { timeout: 30000 },
    );
  }

  // =============================
  // Convert Quote / Draft → Invoice
  // =============================
  static async convertToInvoice(
    sourceId: string,
    branchId: string,
    userId: string,
  ) {
    const source = await prisma.salesDocument.findUnique({
      where: { id: sourceId },
      include: { items: true },
    });

    if (!source)
      throw new AppError(ErrorCode.NOT_FOUND, 404, "Source document not found");
    if (source.type === SalesDocumentType.INVOICE)
      throw new AppError(ErrorCode.BAD_REQUEST, 400, "Already an invoice");
    if (source.type === SalesDocumentType.CREDIT_NOTE)
      throw new AppError(
        ErrorCode.BAD_REQUEST,
        400,
        "Cannot convert credit note to invoice",
      );

    // REQUIREMENT 5: Validate stock before converting
    await StockValidationService.validateOrThrow(
      branchId,
      source.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      userId,
      false, // No override on conversion
    );

    const documentId = await SequenceService.getNextNumber(
      SalesDocumentType.INVOICE,
      branchId,
    );

    return prisma.$transaction(async (tx) => {
      // Create invoice
      const invoice = await tx.salesDocument.create({
        data: {
          documentId,
          type: SalesDocumentType.INVOICE,
          status: SalesDocumentStatus.SENT,
          paymentStatus: PaymentStatus.UNPAID,
          branchId,
          customerId: source.customerId,
          issueDate: new Date(),
          dueDate: source.dueDate,
          subtotal: source.subtotal,
          tax: source.tax,
          discount: source.discount,
          total: source.total,
          balance: source.total,
          notes: source.notes,
          sourceDocumentId: source.id,
          createdById: userId,
          items: {
            create: source.items.map((item) => ({
              productId: item.productId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
              subtotal: item.subtotal,
              taxAmount: item.taxAmount,
              discount: item.discount,
              total: item.total,
            })),
          },
        },
        include: { items: true },
      });

      // REQUIREMENT 5: Deduct stock when invoice is created
      const warehouse = await tx.warehouse.findFirst({
        where: { branchId },
      });

      if (!warehouse) {
        throw new AppError(
          ErrorCode.NOT_FOUND,
          404,
          "No warehouse found for this branch",
        );
      }

      // Update inventory & create stock movements
      for (const item of source.items) {
        // Decrement inventory
        const inventoryUpdate = await tx.inventory.updateMany({
          where: {
            productId: item.productId,
            warehouseId: warehouse.id,
            available: { gte: item.quantity },
          },
          data: {
            quantity: { decrement: item.quantity },
            available: { decrement: item.quantity },
          },
        });

        if (inventoryUpdate.count !== 1) {
          throw new AppError(ErrorCode.INSUFFICIENT_INVENTORY, 400, "Stock changed before this invoice could be created");
        }

        // (product global quantity update removed)

        // Create stock movement
        await tx.stockMovement.create({
          data: {
            type: MovementType.OUTBOUND,
            quantity: item.quantity,
            productId: item.productId,
            warehouseId: warehouse.id,
            salesId: invoice.id,
            reference: `Invoice ${invoice.documentId} (converted from ${source.type})`,
            createdById: userId,
          },
        });
      }

      for (const productId of new Set(source.items.map((item) => item.productId))) {
        await synchronizeBranchInventory(tx, productId, branchId);
      }

      // REQUIREMENT 2: Handle source document based on type
      if (source.type === SalesDocumentType.DRAFT) {
        // PERMANENTLY DELETE the draft
        await tx.salesDocument.delete({
          where: { id: sourceId },
        });
      } else if (source.type === SalesDocumentType.QUOTE) {
        // Keep the quote for audit/history, mark as CONVERTED
        await tx.salesDocument.update({
          where: { id: sourceId },
          data: { status: SalesDocumentStatus.CONVERTED },
        });
      }

      // Update customer's balance when converting to an invoice
      if (invoice.customerId) {
        await tx.customer.update({
          where: { id: invoice.customerId },
          data: { currentBalance: { increment: invoice.balance } },
        });
      }

      return invoice;
    });
  }

  // =============================
  // POS Sale (Paid Invoice)
  // =============================
  static async createPOSSale(input: {
    branchId: string;
    userId: string;
    items: {
      productId: string;
      description?: string;
      quantity: number;
      unitPrice: number;
      taxRate?: number;
      discount?: number;
    }[];
    paymentMethod: string;
    amountPaid: number;
    notes?: string;
    customerId?: string;
    idempotencyKey?: string;
  }) {
    const {
      branchId,
      userId,
      items,
      paymentMethod,
      amountPaid,
      notes,
      customerId,
      idempotencyKey,
    } = input;

    // Idempotency check: if idempotency key provided, check for existing sale
    if (idempotencyKey) {
      const existingSale = await prisma.salesDocument.findFirst({
        where: {
          idempotencyKey,
          branchId,
          type: SalesDocumentType.INVOICE,
        },
        include: { items: true, payments: true },
      });

      if (existingSale) {
        logger.info(
          { idempotencyKey, existingSaleId: existingSale.id },
          "Returning existing sale for idempotency key"
        );
        return existingSale;
      }
    }

    // Validate stock
    await StockValidationService.validateOrThrow(
      branchId,
      items,
      userId,
      false,
    );

    const documentId = await SequenceService.getNextNumber(
      SalesDocumentType.INVOICE,
      branchId,
    );

    const preparedItems = items.map((item) => {
      const totals = calculateItemTotals(item);
      return {
        productId: item.productId,
        description: item.description || "POS item",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate || 0,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        discount: totals.discount,
        total: totals.total,
      };
    });

    const totals = calculateDocumentTotals(preparedItems);

    return prisma.$transaction(
      async (tx) => {
        const balance = Math.max(0, totals.total - amountPaid);
        const isPaid = balance <= 0;

        const invoice = await tx.salesDocument.create({
          data: {
            documentId,
            type: SalesDocumentType.INVOICE,
            status: isPaid
              ? SalesDocumentStatus.PAID
              : SalesDocumentStatus.PARTIALLY_PAID,
            paymentStatus: isPaid
              ? PaymentStatus.PAID
              : PaymentStatus.PARTIALLY_PAID,
            branchId,
            customerId: customerId || null,
            issueDate: new Date(),
            subtotal: totals.subtotal,
            tax: totals.tax,
            discount: totals.discount,
            total: totals.total,
            balance: balance,
            paidAmount: amountPaid,
            notes: notes || null,
            createdById: userId,
            idempotencyKey: idempotencyKey || null,
            items: { create: preparedItems },
          },
          include: { items: true },
        });

        await tx.payment.create({
          data: {
            salesDocumentId: invoice.id,
            customerId: customerId || null,
            amount: amountPaid,
            method: paymentMethod as PaymentMethod,
            paymentDate: new Date(),
            createdById: userId,
          },
        });

        // Update customer balance if they bought on credit/partial payment
        if (customerId && balance > 0) {
          await tx.customer.update({
            where: { id: customerId },
            data: {
              currentBalance: { increment: balance },
            },
          });
        }

        // Resolve warehouse
        const warehouse = await tx.warehouse.findFirst({
          where: { branchId },
        });

        if (!warehouse) {
          throw new AppError(
            ErrorCode.NOT_FOUND,
            404,
            "No warehouse found for this branch",
          );
        }

        // Update inventory & create stock movements
        for (const item of preparedItems) {
          const inventoryUpdate = await tx.inventory.updateMany({
            where: {
              productId: item.productId,
              warehouseId: warehouse.id,
              available: { gte: item.quantity },
            },
            data: {
              quantity: { decrement: item.quantity },
              available: { decrement: item.quantity },
            },
          });

          if (inventoryUpdate.count !== 1) {
            throw new AppError(ErrorCode.INSUFFICIENT_INVENTORY, 400, "Stock changed before this sale could be completed");
          }

          // (product global quantity update removed)

          await tx.stockMovement.create({
            data: {
              type: MovementType.OUTBOUND,
              quantity: item.quantity,
              productId: item.productId,
              warehouseId: warehouse.id,
              salesId: invoice.id,
              reference: `POS Sale - ${invoice.documentId}`,
              createdById: userId,
            },
          });
        }

        for (const productId of new Set(preparedItems.map((item) => item.productId))) {
          await synchronizeBranchInventory(tx, productId, branchId);
        }

        // Record financial transaction
        await AccountingService.recordSaleTransaction(tx, {
          saleId: invoice.id,
          date: new Date(),
          amountPaid: amountPaid,
          paymentMethod: paymentMethod,
          subtotal: totals.subtotal,
          tax: totals.tax,
          total: totals.total,
          userId: userId,
          branchId: branchId,
        });

        return invoice;
      },
      { timeout: 30000 },
    );
  }

  // =============================
  // Credit Note
  // =============================
  static async createCreditNote(input: {
    invoiceId: string;
    items: {
      productId: string;
      description?: string;
      quantity: number;
      unitPrice: number;
      taxRate?: number;
      discount?: number;
    }[];
    reason?: string;
    branchId: string | null;
    userId: string;
  }) {
    const { invoiceId, items, reason, userId } = input;

    const invoice = await prisma.salesDocument.findUnique({
      where: { id: invoiceId },
      include: { items: true },
    });

    // REQUIREMENT: Credit note must link to an invoice
    if (!invoice || invoice.type !== SalesDocumentType.INVOICE)
      throw new AppError(
        ErrorCode.BAD_REQUEST,
        400,
        "Invalid invoice - credit notes must reference an existing invoice",
      );

    // Admin users in "All Branches" mode have no branchId in their token;
    // fall back to the invoice's own branch so the sequence number is correct.
    const branchId = input.branchId ?? invoice.branchId;

    const documentId = await SequenceService.getNextNumber(
      SalesDocumentType.CREDIT_NOTE,
      branchId,
    );

    const preparedItems = items.map((item) => {
      const totals = calculateItemTotals(item);
      return {
        productId: item.productId,
        description: item.description || "Credit item",
        quantity: -item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate || 0,
        subtotal: -totals.subtotal,
        taxAmount: -totals.taxAmount,
        discount: totals.discount,
        total: -totals.total,
      };
    });

    const totals = calculateDocumentTotals(preparedItems);

    return prisma.salesDocument.create({
      data: {
        documentId,
        type: SalesDocumentType.CREDIT_NOTE,
        status: SalesDocumentStatus.DRAFT,
        branchId,
        customerId: invoice.customerId,
        issueDate: new Date(),
        subtotal: totals.subtotal,
        tax: totals.tax,
        discount: totals.discount,
        total: totals.total,
        balance: totals.total,
        notes: reason || null,
        sourceDocumentId: invoice.id,
        createdById: userId,
        items: { create: preparedItems },
      },
      include: { items: true },
    });
  }

  // =============================
  // Void Document
  // =============================
  static async voidDocument(id: string, reason?: string) {
    return prisma.$transaction(async (tx) => {
      const document = await tx.salesDocument.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!document)
        throw new AppError(ErrorCode.NOT_FOUND, 404, "Document not found");

      // Restore stock only for invoices that actually deducted stock (PAID / PARTIALLY_PAID / SENT)
      const stockWasDeducted = document.type === SalesDocumentType.INVOICE &&
        ([SalesDocumentStatus.PAID, SalesDocumentStatus.PARTIALLY_PAID, SalesDocumentStatus.SENT] as SalesDocumentStatus[]).includes(document.status);

      if (stockWasDeducted) {
        const warehouse = await tx.warehouse.findFirst({
          where: { branchId: document.branchId },
        });

        if (warehouse) {
          for (const item of document.items) {
            // Restore warehouse-level inventory
            await tx.inventory.updateMany({
              where: { productId: item.productId, warehouseId: warehouse.id },
              data: {
                quantity: { increment: item.quantity },
                available: { increment: item.quantity },
              },
            });

            // Create INBOUND movement for audit trail
            await tx.stockMovement.create({
              data: {
                type: MovementType.INBOUND,
                quantity: item.quantity,
                productId: item.productId,
                warehouseId: warehouse.id,
                salesId: document.id,
                reference: `Void of ${document.documentId}`,
                createdById: document.createdById,
              },
            });
          }

          // Re-sync BranchInventory for every affected product
          for (const productId of new Set(document.items.map((i) => i.productId))) {
            await synchronizeBranchInventory(tx, productId, document.branchId);
          }
        }
      }

      // Adjust customer balance if invoice had an outstanding balance
      if (document.customerId && document.type === SalesDocumentType.INVOICE) {
        const outstanding = document.balance || 0;
        if (outstanding > 0) {
          await tx.customer.update({
            where: { id: document.customerId },
            data: { currentBalance: { decrement: outstanding } },
          });
        }
      }

      return tx.salesDocument.update({
        where: { id },
        data: { status: SalesDocumentStatus.VOID, notes: reason || "VOIDED" },
      });
    });
  }

  // =============================
  // List Documents
  // REQUIREMENT 6: Enhanced filtering
  // =============================
  static async listDocuments(query: {
    branchId?: string;
    type?: string;
    status?: string;
    customerId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    limit?: string;
    offset?: string;
  }) {
    const where: any = {};

    if (query.branchId) where.branchId = query.branchId;
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.customerId) where.customerId = query.customerId;

    // Full-text search across documentId and customer name
    if (query.search && query.search.length >= 2) {
      where.OR = [
        { documentId: { contains: query.search, mode: "insensitive" } },
        { customer: { name: { contains: query.search, mode: "insensitive" } } },
      ];
    }

    // Date range filtering on issueDate
    if (query.startDate || query.endDate) {
      where.issueDate = {};
      if (query.startDate) {
        const startDate = new Date(query.startDate);
        startDate.setHours(0, 0, 0, 0);
        where.issueDate.gte = startDate;
      }
      if (query.endDate) {
        const endDate = new Date(query.endDate);
        endDate.setHours(23, 59, 59, 999);
        where.issueDate.lte = endDate;
      }
    }

    const limit = parseInt(query.limit || "50");
    const offset = parseInt(query.offset || "0");

    const [documents, total] = await Promise.all([
      prisma.salesDocument.findMany({
        where,
        include: {
          items: { include: { product: true } },
          customer: true,
          payments: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.salesDocument.count({ where }),
    ]);

    return { data: documents, total, limit, offset };
  }

  // =============================
  // Get Document By ID
  // =============================
  static async getDocumentById(id: string) {
    return prisma.salesDocument.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        customer: true,
        payments: true,
        branch: true,
        createdBy: true,
        approvedBy: true,
      },
    });
  }

  // =============================
  // Get POS Sales
  // =============================
  static async getPOSSales(query: {
    branchId?: string;
    startDate?: string;
    endDate?: string;
    paymentMethod?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {
      type: SalesDocumentType.INVOICE,
      status: SalesDocumentStatus.PAID,
    };

    if (query.branchId) where.branchId = query.branchId;

    // Date range filter
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        const start = new Date(query.startDate);
        start.setHours(0, 0, 0, 0);
        where.createdAt.gte = start;
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // Payment method filter — filter on linked payments
    if (query.paymentMethod) {
      where.payments = {
        some: { method: query.paymentMethod as PaymentMethod },
      };
    }

    const documents = await prisma.salesDocument.findMany({
      where,
      include: { items: true, payments: true, branch: true, createdBy: true },
      orderBy: { createdAt: "desc" },
      take: query.limit || 50,
      skip: query.offset || 0,
    });

    return documents.map((doc) => ({
      id: doc.id,
      invoice_no: doc.documentId,
      status: doc.status,
      payment_method: doc.payments?.[0]?.method || "cash",
      subtotal: doc.subtotal,
      discount: doc.discount,
      tax: doc.tax,
      grand_total: doc.total,
      amount_paid: doc.payments?.reduce((sum, p) => sum + p.amount, 0) || 0,
      change: 0,
      created_date: doc.createdAt,
      createdAt: doc.createdAt,
      branch: { name: doc.branch?.name },
      user: { name: doc.createdBy?.name },
      items: doc.items,
    }));
  }

  // =============================
  // Get POS Sale By ID
  // =============================
  static async getPOSSaleById(id: string) {
    const doc = await prisma.salesDocument.findUnique({
      where: { id },
      include: { 
        items: { include: { product: true } }, 
        payments: true,
        branch: true,
        createdBy: true,
      },
    });

    if (!doc) return null;

    return {
      id: doc.id,
      invoice_no: doc.documentId,
      status: doc.status,
      payment_method: doc.payments?.[0]?.method || "cash",
      subtotal: doc.subtotal,
      discount: doc.discount,
      tax: doc.tax,
      grand_total: doc.total,
      amount_paid: doc.payments?.reduce((sum, p) => sum + p.amount, 0) || 0,
      change: 0,
      created_date: doc.createdAt,
      createdAt: doc.createdAt,
      branch: doc.branch ? {
        id: doc.branch.id,
        name: doc.branch.name,
        code: doc.branch.code,
        address: doc.branch.address,
        phone: doc.branch.phone,
      } : null,
      user: doc.createdBy ? {
        id: doc.createdBy.id,
        name: doc.createdBy.name,
        email: doc.createdBy.email,
      } : null,
      sales_items: doc.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        product: item.product,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        tax_rate: item.taxRate,
        discount: item.discount,
        amount: item.total,
      })),
    };
  }

  // =============================
  // Update Sales Document
  // =============================
  static async updateDocument(
    id: string,
    updates: {
      status?: SalesDocumentStatus;
      notes?: string;
      discount?: number;
    }
  ) {
    const doc = await prisma.salesDocument.findUnique({
      where: { id },
    });

    if (!doc) {
      throw new AppError(ErrorCode.NOT_FOUND, 404, "Document not found");
    }

    return prisma.salesDocument.update({
      where: { id },
      data: updates,
      include: { items: true, branch: true, createdBy: true },
    });
  }

  // =============================
  // Get Daily Summary
  // =============================
  static async getDailySummary(query: {
    branchId?: string;
    date?: string;
  }) {
    const targetDate = query.date ? new Date(query.date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const where: any = {
      type: SalesDocumentType.INVOICE,
      status: SalesDocumentStatus.PAID,
      createdAt: { gte: startOfDay, lte: endOfDay },
    };

    if (query.branchId) {
      where.branchId = query.branchId;
    }

    const sales = await prisma.salesDocument.findMany({
      where,
      include: { 
        items: { include: { product: true } },
        payments: true,
        branch: true,
      },
    });

    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
    const totalTax = sales.reduce((sum, s) => sum + s.tax, 0);
    const totalDiscount = sales.reduce((sum, s) => sum + s.discount, 0);

    const paymentMethods = {
      cash: 0,
      card: 0,
      mpesa: 0,
      cheque: 0,
      bank_transfer: 0,
    };

    for (const sale of sales) {
      for (const payment of sale.payments) {
        const method = payment.method as keyof typeof paymentMethods;
        if (method in paymentMethods) {
          paymentMethods[method] += payment.amount;
        }
      }
    }

    const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const sale of sales) {
      for (const item of sale.items) {
        const existing = productSales.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.total;
        } else {
          productSales.set(item.productId, {
            name: item.product?.name || "Unknown",
            quantity: item.quantity,
            revenue: item.total,
          });
        }
      }
    }

    const topProducts = Array.from(productSales.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        quantitySold: data.quantity,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      date: targetDate.toISOString().slice(0, 10),
      branchId: query.branchId || "all",
      totalSales,
      totalRevenue,
      totalTax,
      totalDiscount,
      paymentMethods,
      topProducts,
    };
  }

  // =============================
  // Generate Receipt
  // =============================
  static async generateReceipt(saleId: string) {
    const sale = await prisma.salesDocument.findUnique({
      where: { id: saleId },
      include: {
        items: { include: { product: true } },
        branch: true,
        createdBy: true,
        payments: true,
      },
    });

    if (!sale) {
      throw new AppError(ErrorCode.NOT_FOUND, 404, "Sale not found");
    }

    const company = {
      name: process.env.COMPANY_NAME || "LUNATECH SYSTEMS LTD",
      address: process.env.COMPANY_ADDRESS || "123 Tech Plaza, Westlands",
      phone: process.env.COMPANY_PHONE || "+254 722 123 456",
      email: process.env.COMPANY_EMAIL || "info@lunatech.co.ke",
      kraPin: process.env.COMPANY_KRA_PIN || "P051472913Q",
    };

    return {
      sale: {
        id: sale.id,
        invoice_no: sale.documentId,
        status: sale.status,
        payment_method: sale.payments?.[0]?.method || "cash",
        subtotal: sale.subtotal,
        discount: sale.discount,
        tax: sale.tax,
        grand_total: sale.total,
        amount_paid: sale.payments?.reduce((sum, p) => sum + p.amount, 0) || 0,
        change: (sale.payments?.reduce((sum, p) => sum + p.amount, 0) || 0) - sale.total,
        created_date: sale.createdAt,
        sales_items: sale.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          product: item.product,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          tax_rate: item.taxRate,
          discount: item.discount,
          amount: item.total,
        })),
      },
      branch: sale.branch ? {
        name: sale.branch.name,
        address: sale.branch.address,
        phone: sale.branch.phone,
        code: sale.branch.code,
      } : null,
      cashier: sale.createdBy ? {
        name: sale.createdBy.name,
        email: sale.createdBy.email,
      } : null,
      company,
    };
  }

  // =============================
  // Approve Discount
  // =============================
  static async approveDiscount(saleId: string, managerId: string, managerPassword: string) {
    const manager = await prisma.user.findUnique({
      where: { id: managerId },
    });

    if (!manager) {
      throw new AppError(ErrorCode.NOT_FOUND, 404, "Manager not found");
    }

    if (!["admin", "super_admin", "manager"].includes(manager.role)) {
      throw new AppError(
        ErrorCode.FORBIDDEN,
        403,
        "Only managers and admins can approve discounts",
      );
    }

    const { verifyPassword } = await import("../../../lib/password");
    const isValid = await verifyPassword(managerPassword, manager.passwordHash);

    if (!isValid) {
      throw new AppError(
        ErrorCode.UNAUTHORIZED,
        401,
        "Invalid manager password",
      );
    }

    const updated = await prisma.salesDocument.update({
      where: { id: saleId },
      data: { notes: `Discount approved by ${manager.name} (${managerId})` },
    });

    logger.info({ saleId, managerId }, "Discount approved");

    return updated;
  }

  // =============================
  // Record Payment
  // =============================
  static async recordPayment(input: {
    documentId: string;
    amount: number;
    paymentMethod: string;
    reference?: string;
    userId: string;
  }) {
    const { documentId, amount, paymentMethod, reference, userId } = input;

    const document = await prisma.salesDocument.findUnique({
      where: { id: documentId },
    });

    if (!document)
      throw new AppError(ErrorCode.NOT_FOUND, 404, "Document not found");
    // Use transaction: create payment, update document, and update customer balance if any
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          salesDocumentId: documentId,
          customerId: document.customerId || null,
          amount,
          method: paymentMethod as PaymentMethod,
          reference: reference || null,
          paymentDate: new Date(),
          createdById: userId,
        },
      });

      // Update document balance
      const newBalance = document.balance - amount;
      const isPaid = newBalance <= 0;

      await tx.salesDocument.update({
        where: { id: documentId },
        data: {
          balance: Math.max(0, newBalance),
          paidAmount: (document.paidAmount || 0) + amount,
          paymentStatus: isPaid
            ? PaymentStatus.PAID
            : PaymentStatus.PARTIALLY_PAID,
          status: isPaid ? SalesDocumentStatus.PAID : document.status,
        },
      });

      // Update customer balance if document linked to a customer
      if (document.customerId) {
        await tx.customer.update({
          where: { id: document.customerId },
          data: { currentBalance: { decrement: amount } },
        });
      }

      return payment;
    });
  }

  // =============================
  // Park Sale (Temporary Hold Without Payment)
  // =============================
  static async parkSale(input: {
    branchId: string;
    userId: string;
    items: {
      productId: string;
      description?: string;
      quantity: number;
      unitPrice: number;
      taxRate?: number;
      discount?: number;
    }[];
    discount?: number;
    paymentMethod?: string;
    customerId?: string;
    notes?: string;
  }) {
    const {
      branchId,
      userId,
      items,
      discount = 0,
      paymentMethod,
      customerId,
      notes,
    } = input;

    // Validate that all products exist
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { id: true },
      });
      if (!product) {
        throw new AppError(
          ErrorCode.NOT_FOUND,
          404,
          `Product with ID ${item.productId} not found`,
        );
      }
    }

    const documentId = await SequenceService.getNextNumber(
      SalesDocumentType.INVOICE,
      branchId,
    );

    const preparedItems = items.map((item) => {
      const totals = calculateItemTotals(item);
      return {
        productId: item.productId,
        description: item.description || "POS item",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate || 0,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        discount: totals.discount,
        total: totals.total,
      };
    });

    const totals = calculateDocumentTotals(preparedItems);

    return prisma.salesDocument.create({
      data: {
        documentId,
        type: SalesDocumentType.INVOICE,
        status: SalesDocumentStatus.PARKED,
        paymentStatus: PaymentStatus.UNPAID,
        branchId,
        customerId: customerId || undefined,
        issueDate: new Date(),
        subtotal: totals.subtotal,
        tax: totals.tax,
        discount: discount,
        total: totals.total + discount,
        balance: totals.total + discount,
        paidAmount: 0,
        notes: notes || null,
        createdById: userId,
        items: { create: preparedItems },
      },
      include: { items: true },
    });
  }

  // =============================
  // Hold Sale (Temporary Hold Without Payment)
  // =============================
  static async holdSale(input: {
    branchId: string;
    userId: string;
    items: {
      productId: string;
      description?: string;
      quantity: number;
      unitPrice: number;
      taxRate?: number;
      discount?: number;
    }[];
    discount?: number;
    paymentMethod?: string;
    customerId?: string;
    notes?: string;
  }) {
    const {
      branchId,
      userId,
      items,
      discount = 0,
      paymentMethod,
      customerId,
      notes,
    } = input;

    // Validate that all products exist
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { id: true },
      });
      if (!product) {
        throw new AppError(
          ErrorCode.NOT_FOUND,
          404,
          `Product with ID ${item.productId} not found`,
        );
      }
    }

    const documentId = await SequenceService.getNextNumber(
      SalesDocumentType.INVOICE,
      branchId,
    );

    const preparedItems = items.map((item) => {
      const totals = calculateItemTotals(item);
      return {
        productId: item.productId,
        description: item.description || "POS item",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate || 0,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        discount: totals.discount,
        total: totals.total,
      };
    });

    const totals = calculateDocumentTotals(preparedItems);

    return prisma.salesDocument.create({
      data: {
        documentId,
        type: SalesDocumentType.INVOICE,
        status: SalesDocumentStatus.HELD,
        paymentStatus: PaymentStatus.UNPAID,
        branchId,
        customerId: customerId || undefined,
        issueDate: new Date(),
        subtotal: totals.subtotal,
        tax: totals.tax,
        discount: discount,
        total: totals.total + discount,
        balance: totals.total + discount,
        paidAmount: 0,
        notes: notes || null,
        createdById: userId,
        items: { create: preparedItems },
      },
      include: { items: true },
    });
  }

  // =============================
  // Approve/Close Credit Note — restores stock
  // =============================
  static async approveCreditNote(id: string, userId: string) {
    const document = await prisma.salesDocument.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!document)
      throw new AppError(ErrorCode.NOT_FOUND, 404, "Credit note not found");
    if (document.type !== SalesDocumentType.CREDIT_NOTE)
      throw new AppError(ErrorCode.BAD_REQUEST, 400, "Document is not a credit note");
    if (document.status !== SalesDocumentStatus.DRAFT)
      throw new AppError(ErrorCode.BAD_REQUEST, 400, `Credit note is already ${document.status.toLowerCase()}`);

    return prisma.$transaction(async (tx) => {
      // Restore stock for each returned item
      // Credit note items have negative quantities (stored as -qty), so we negate them to get the return qty
      const warehouse = await tx.warehouse.findFirst({
        where: { branchId: document.branchId },
      });

      if (warehouse) {
        for (const item of document.items) {
          const returnQty = Math.abs(item.quantity); // credit note quantities are stored negative

          await tx.inventory.updateMany({
            where: { productId: item.productId, warehouseId: warehouse.id },
            data: {
              quantity: { increment: returnQty },
              available: { increment: returnQty },
            },
          });

          await tx.stockMovement.create({
            data: {
              type: MovementType.INBOUND,
              quantity: returnQty,
              productId: item.productId,
              warehouseId: warehouse.id,
              salesId: document.id,
              reference: `Credit Note ${document.documentId} approved`,
              createdById: userId,
            },
          });
        }

        // Sync BranchInventory for all returned products
        for (const productId of new Set(document.items.map((i) => i.productId))) {
          await synchronizeBranchInventory(tx, productId, document.branchId);
        }
      }

      return tx.salesDocument.update({
        where: { id },
        data: { status: SalesDocumentStatus.CLOSED, approvedById: userId },
      });
    });
  }
}
