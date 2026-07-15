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
      items: {
        productId: string;
        description?: string;
        quantity: number;
        unitPrice: number;
        taxRate?: number;
        discount?: number;
      }[];
      allowStockOverride?: boolean; // For admin override
    },
    branchId: string,
    userId: string,
  ) {
    // REQUIREMENT 3: Prevent direct invoice creation
    if (input.type === SalesDocumentType.INVOICE) {
      throw new AppError(
        ErrorCode.BAD_REQUEST,
        400,
        "Invoices cannot be created directly. Convert from Draft or Quote, or use POS Sale.",
      );
    }

    // REQUIREMENT 4: Stock validation for DRAFT (reject if insufficient)
    // Quotes can proceed with admin override
    if (input.type === SalesDocumentType.DRAFT) {
      await StockValidationService.validateOrThrow(
        branchId,
        input.items,
        userId,
        false, // No override allowed for drafts
      );
    }

    if (input.type === SalesDocumentType.QUOTE) {
      // REQUIREMENT 4: Quotes require admin approval if stock is insufficient
      await StockValidationService.validateOrThrow(
        branchId,
        input.items,
        userId,
        input.allowStockOverride || false,
      );
    }

    // Generate document ID
    const documentId = await SequenceService.getNextNumber(
      input.type,
      branchId,
    );

    // Prepare items
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

    // REQUIREMENT: Auto-generate quotation dates
    let finalIssueDate = input.issueDate || new Date();
    let finalDueDate = input.dueDate;

    if (input.type === SalesDocumentType.QUOTE) {
      finalIssueDate = new Date(); // quotation_date = now

      // valid_until = quotation_date + 3 days
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
  }) {
    const {
      branchId,
      userId,
      items,
      paymentMethod,
      amountPaid,
      notes,
      customerId,
    } = input;

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
    limit?: string;
    offset?: string;
  }) {
    const where: any = {};

    if (query.branchId) where.branchId = query.branchId;
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.customerId) where.customerId = query.customerId;

    // REQUIREMENT 6: Date range filtering
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
      include: { items: { include: { product: true } }, payments: true },
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
