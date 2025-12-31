// backend/src/modules/pos/service/sales.service.ts
import { prisma } from "../../../lib/db";
import { SalesDocumentType, SalesDocumentStatus, PaymentStatus, PaymentMethod, MovementType } from "../../../generated/enums";
import { SequenceService } from "../../sequences/sequence.service";
import { AccountingService } from "../../finance/services/accounting.service";
import { StockValidationService } from "./stock-validation.service";
import { AppError, ErrorCode } from "../../../lib/errors";

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
  }[]
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
    userId: string
  ) {
    // REQUIREMENT 3: Prevent direct invoice creation
    if (input.type === SalesDocumentType.INVOICE) {
      throw new AppError(
        ErrorCode.BAD_REQUEST,
        400,
        "Invoices cannot be created directly. Convert from Draft or Quote, or use POS Sale."
      );
    }

    // REQUIREMENT 4: Stock validation for DRAFT (reject if insufficient)
    // Quotes can proceed with admin override
    if (input.type === SalesDocumentType.DRAFT) {
      await StockValidationService.validateOrThrow(
        branchId,
        input.items,
        userId,
        false // No override allowed for drafts
      );
    }

    if (input.type === SalesDocumentType.QUOTE) {
      // REQUIREMENT 4: Quotes require admin approval if stock is insufficient
      await StockValidationService.validateOrThrow(
        branchId,
        input.items,
        userId,
        input.allowStockOverride || false
      );
    }

    // Generate document ID
    const documentId = await SequenceService.getNextNumber(
      input.type,
      branchId
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
    userId: string
  ) {
    const source = await prisma.salesDocument.findUnique({
      where: { id: sourceId },
      include: { items: true },
    });

    if (!source) throw new AppError(ErrorCode.NOT_FOUND, 404, "Source document not found");
    if (source.type === SalesDocumentType.INVOICE)
      throw new AppError(ErrorCode.BAD_REQUEST, 400, "Already an invoice");
    if (source.type === SalesDocumentType.CREDIT_NOTE)
      throw new AppError(ErrorCode.BAD_REQUEST, 400, "Cannot convert credit note to invoice");

    // REQUIREMENT 5: Validate stock before converting
    await StockValidationService.validateOrThrow(
      branchId,
      source.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      })),
      userId,
      false // No override on conversion
    );

    const documentId = await SequenceService.getNextNumber(
      SalesDocumentType.INVOICE,
      branchId
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
        throw new AppError(ErrorCode.NOT_FOUND, 404, "No warehouse found for this branch");
      }

      // Update inventory & create stock movements
      for (const item of source.items) {
        // Decrement inventory
        await tx.inventory.updateMany({
          where: {
            productId: item.productId,
            warehouseId: warehouse.id,
          },
          data: {
            quantity: { decrement: item.quantity },
            available: { decrement: item.quantity },
          },
        });

        // Decrement product global quantity
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });

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
  }) {
    const {
      branchId,
      userId,
      items,
      paymentMethod,
      amountPaid,
      notes,
    } = input;

    // Validate stock
    await StockValidationService.validateOrThrow(
      branchId,
      items,
      userId,
      false
    );

    const documentId = await SequenceService.getNextNumber(
      SalesDocumentType.INVOICE,
      branchId
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

    return prisma.$transaction(async (tx) => {
      const invoice = await tx.salesDocument.create({
        data: {
          documentId,
          type: SalesDocumentType.INVOICE,
          status: SalesDocumentStatus.PAID,
          paymentStatus: PaymentStatus.PAID,
          branchId,
          issueDate: new Date(),
          subtotal: totals.subtotal,
          tax: totals.tax,
          discount: totals.discount,
          total: totals.total,
          balance: 0,
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
          amount: amountPaid,
          method: paymentMethod as PaymentMethod,
          paymentDate: new Date(),
          createdById: userId,
        },
      });

      // Resolve warehouse
      const warehouse = await tx.warehouse.findFirst({
        where: { branchId },
      });

      if (!warehouse) {
        throw new AppError(ErrorCode.NOT_FOUND, 404, "No warehouse found for this branch");
      }

      // Update inventory & create stock movements
      for (const item of preparedItems) {
        await tx.inventory.updateMany({
          where: {
            productId: item.productId,
            warehouseId: warehouse.id,
          },
          data: {
            quantity: { decrement: item.quantity },
            available: { decrement: item.quantity },
          },
        });

        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });

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
    });
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
    branchId: string;
    userId: string;
  }) {
    const { invoiceId, items, reason, branchId, userId } = input;

    const invoice = await prisma.salesDocument.findUnique({
      where: { id: invoiceId },
      include: { items: true },
    });

    // REQUIREMENT: Credit note must link to an invoice
    if (!invoice || invoice.type !== SalesDocumentType.INVOICE)
      throw new AppError(ErrorCode.BAD_REQUEST, 400, "Invalid invoice - credit notes must reference an existing invoice");

    const documentId = await SequenceService.getNextNumber(
      SalesDocumentType.CREDIT_NOTE,
      branchId
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
    return prisma.salesDocument.update({
      where: { id },
      data: {
        status: SalesDocumentStatus.VOID,
        notes: reason || "VOIDED",
      },
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
    
    const limit = parseInt(query.limit || '50');
    const offset = parseInt(query.offset || '0');
    
    const [documents, total] = await Promise.all([
      prisma.salesDocument.findMany({
        where,
        include: { 
          items: { include: { product: true } }, 
          customer: true,
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
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
      },
    });
  }

  // =============================
  // Get POS Sales
  // =============================
  static async getPOSSales(query: {
    branchId?: string;
    dateFilter?: string;
    paymentMethod?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {
      type: SalesDocumentType.INVOICE,
      status: SalesDocumentStatus.PAID,
    };
    
    if (query.branchId) where.branchId = query.branchId;
    
    if (query.dateFilter) {
      const date = new Date(query.dateFilter);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));
      where.issueDate = { gte: startOfDay, lte: endOfDay };
    }
    
    const documents = await prisma.salesDocument.findMany({
      where,
      include: { items: true, payments: true },
      orderBy: { createdAt: 'desc' },
      take: query.limit || 50,
      skip: query.offset || 0,
    });
    
    return documents.map(doc => ({
      id: doc.id,
      invoice_no: doc.documentId,
      status: doc.status,
      payment_method: doc.payments?.[0]?.method || 'cash',
      subtotal: doc.subtotal,
      discount: doc.discount,
      tax: doc.tax,
      grand_total: doc.total,
      amount_paid: doc.payments?.reduce((sum, p) => sum + p.amount, 0) || 0,
      change: 0,
      created_date: doc.createdAt,
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
      payment_method: doc.payments?.[0]?.method || 'cash',
      subtotal: doc.subtotal,
      discount: doc.discount,
      tax: doc.tax,
      grand_total: doc.total,
      amount_paid: doc.payments?.reduce((sum, p) => sum + p.amount, 0) || 0,
      change: 0,
      created_date: doc.createdAt,
      sales_items: doc.items.map(item => ({
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
    
    if (!document) throw new AppError(ErrorCode.NOT_FOUND, 404, 'Document not found');
    
    const payment = await prisma.payment.create({
      data: {
        salesDocumentId: documentId,
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
    
    await prisma.salesDocument.update({
      where: { id: documentId },
      data: {
        balance: Math.max(0, newBalance),
        paidAmount: (document.paidAmount || 0) + amount,
        paymentStatus: isPaid ? PaymentStatus.PAID : PaymentStatus.PARTIALLY_PAID,
        status: isPaid ? SalesDocumentStatus.PAID : document.status,
      },
    });
    
    return payment;
  }
}
