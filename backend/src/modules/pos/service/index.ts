import { prisma } from "../../../lib/db";
import { logger } from "../../../lib/logger";
import { verifyPassword } from "../../../lib/password";
import { calculateSubtotal, calculateTax } from "../../../lib/sales-calculator";
import {
  CreateSalesDTO,
  UpdateSalesDTO,
  SalesResponseDTO,
  SalesListQueryDTO,
  DailySummaryDTO,
  DailySummaryResponseDTO,
  ReceiptDTO,
  ProductSearchDTO,
  ApproveDiscountDTO,
} from "../dto";
import { AppError, ErrorCode, validationError } from "../../../lib/errors";

export class PosService {
  private prisma = prisma;

  /**
   * Search product by SKU, barcode, name, or description (100% FIXED - NO MORE NULL QUERIES)
   */
  async searchProduct(dto: ProductSearchDTO) {
    const { search, branchId, combinedStock } = dto;

    if (!search || !search.trim()) {
      throw validationError("Search term is required");
    }

    const searchTerm = search.trim();

    // Step 1: Find products matching the search (NO INCLUDES - clean query)
    const products = await this.prisma.product.findMany({
      where: {
        OR: [
          { sku: { contains: searchTerm, mode: "insensitive" } },
          { barcode: { contains: searchTerm, mode: "insensitive" } },
          { name: { contains: searchTerm, mode: "insensitive" } },
          { description: { contains: searchTerm, mode: "insensitive" } },
        ],
        isActive: true,
      },
      take: 10,
    });

    if (!products || products.length === 0) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        404,
        `No products found matching: ${searchTerm}`,
      );
    }

    // Step 2: Resolve which warehouses' inventory counts toward `available`.
    // combinedStock=true (used by document/draft/quote creation) looks at
    // every active warehouse company-wide. Otherwise, only the requesting
    // branch's own warehouses count (classic POS-till behavior).
    let warehouses: any[] = [];
    let warehouseIds: string[] = [];

    if (combinedStock) {
      warehouses = await this.prisma.warehouse.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      });
      warehouseIds = warehouses.map((w) => w.id);
    } else if (branchId) {
      warehouses = await this.prisma.warehouse.findMany({
        where: {
          branchId,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
        },
      });
      warehouseIds = warehouses.map((w) => w.id);
    }

    // Step 3: Process all products and fetch their inventory
    const results = await Promise.all(
      products.map(async (product) => {
        // Note: Product model doesn't have quantity field, use inventory
        let totalAvailable = 0;
        let inventoryLocations: any[] = [];

        if (warehouseIds.length > 0) {
          // Fetch inventory for this product in branch warehouses
          const inventory = await this.prisma.inventory.findMany({
            where: {
              productId: product.id,
              warehouseId: { in: warehouseIds },
            },
          });

          if (inventory.length > 0) {
            totalAvailable = inventory.reduce(
              (sum, inv) => sum + (inv.available || 0),
              0,
            );

            inventoryLocations = inventory.map((inv) => {
              const warehouse = warehouses.find(
                (w) => w.id === inv.warehouseId,
              );
              return {
                warehouseId: inv.warehouseId,
                warehouseName: warehouse?.name || "Unknown",
                quantity: inv.quantity,
                available: inv.available,
                reserved: inv.reserved,
              };
            });
          }
        }

        return {
          id: product.id,
          sku: product.sku,
          barcode: product.barcode || undefined,
          name: product.name,
          description: product.description || undefined,
          category: product.category || undefined,
          unit_price: product.unit_price,
          tax_rate: product.tax_rate ?? 0.16,
          available: totalAvailable,
          inventoryLocations,
        };
      }),
    );

    // Return array of products for autocomplete
    return results;
  }

  /**
   * Create new sales order with inventory transaction.
   *
   * NOTE ON CONSOLIDATION: this used to be a fully separate implementation
   * of "create a paid POS invoice" — its own item-totals math, its own
   * stock-deduction loop (which never went through FIFO/StockBatch), and
   * its own ad-hoc FinanceTransaction row instead of a real GL posting.
   * It's reachable at `POST /pos/sales` (top-level), a genuinely different
   * live route from `POST /sales-documents/pos/sales` (backed by the
   * canonical `SalesService.createPOSSale`). Rather than maintain two
   * independently-implemented "create a POS sale" code paths, this now
   * delegates the actual sale creation to `SalesService.createPOSSale` and
   * only keeps the one piece of business logic that method doesn't have:
   * the flat document-level discount + manager-approval-over-10% gate.
   *
   * BEHAVIOR CHANGE TO VERIFY: document numbering here previously used
   * `UserPrefixSequencer` (salesman-prefixed invoice numbers, e.g.
   * INV-VIN-0042). `SalesService.createPOSSale` uses the plain
   * `SequenceService` instead (no salesman prefix) — the same scheme used
   * by the canonical `/sales-documents/pos/sales` route. If anything
   * downstream (receipts, reports) depends on this endpoint specifically
   * producing prefixed numbers, flag it and prefix support can be added to
   * the canonical service instead of reintroducing a second numbering path.
   */
  async createSales(dto: CreateSalesDTO): Promise<SalesResponseDTO> {
    const {
      branchId,
      userId,
      items,
      payment_method,
      amount_paid,
      discount = 0,
      discount_approved_by,
      notes,
    } = dto;

    // Basic validations
    if (!branchId || !userId || !items || items.length === 0) {
      throw validationError("Missing required fields: branchId, userId, items");
    }
    if (!payment_method) {
      throw validationError("Payment method is required");
    }

    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!branch)
      throw new AppError(ErrorCode.NOT_FOUND, 404, "Branch not found");

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(ErrorCode.NOT_FOUND, 404, "User not found");

    // Document-level discount approval gate. SalesService.createPOSSale only
    // supports per-item discounts, not a flat document-level one, so this
    // stays here rather than being duplicated into the canonical service.
    const mappedItemsForHelpers = items.map((i) => ({
      quantity: i.quantity,
      unitPrice: i.unit_price,
      taxRate: i.tax_rate,
      discount: i.discount,
    }));

    const subtotal = calculateSubtotal(mappedItemsForHelpers);
    const discountPercent = subtotal > 0 ? (discount / subtotal) * 100 : 0;

    if (discountPercent > 10 && !discount_approved_by) {
      throw new AppError(
        ErrorCode.FORBIDDEN,
        403,
        "Discounts over 10% require manager approval",
      );
    }

    const totalTax = calculateTax(mappedItemsForHelpers);
    const grandTotal = subtotal - discount + totalTax;
    const amountPaid = amount_paid ?? grandTotal;

    // Delegate the actual sale creation — document numbering, item totals,
    // FIFO stock deduction (StockBatch + Inventory ledger + audit trail),
    // and GL posting — to the canonical SalesService.
    const { SalesService } = await import("./sales.service");
    const invoice = await SalesService.createPOSSale({
      branchId,
      userId,
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unit_price,
        taxRate: i.tax_rate,
        discount: i.discount,
      })),
      paymentMethod: payment_method,
      amountPaid,
      notes,
    });

    // Fold the flat document-level discount into the created invoice
    // (per-item discounts are already reflected in SalesService's totals).
    const finalInvoice = discount > 0
      ? await this.prisma.salesDocument.update({
          where: { id: invoice.id },
          data: {
            discount: { increment: discount },
            total: { decrement: discount },
            balance: { decrement: discount },
          },
          include: {
            items: { include: { product: true } },
            branch: true,
            createdBy: true,
          },
        })
      : await this.prisma.salesDocument.findUniqueOrThrow({
          where: { id: invoice.id },
          include: {
            items: { include: { product: true } },
            branch: true,
            createdBy: true,
          },
        });

    logger.info(
      {
        saleId: finalInvoice.id,
        invoice_no: finalInvoice.documentId,
        branchId,
        userId,
        grand_total: finalInvoice.total,
      },
      "Sale created successfully (via canonical SalesService)",
    );

    return this.formatSalesResponse(finalInvoice, finalInvoice.items);
  }

  /**
   * Get sales by ID (full details)
   */
  async getSalesById(id: string): Promise<SalesResponseDTO> {
    const sale = await this.prisma.salesDocument.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        branch: true,
        createdBy: true,
      },
    });

    if (!sale) throw new AppError(ErrorCode.NOT_FOUND, 404, "Sale not found");

    return this.formatSalesResponse(sale, sale.items);
  }

  /**
   * List sales with filters and pagination
   */
  async listSales(query: SalesListQueryDTO) {
    const {
      page = 1,
      limit = 20,
      status,
      branchId,
      startDate,
      endDate,
      payment_method,
    } = query;

    const where: any = {};
    if (status) where.status = status;
    if (branchId) where.branchId = branchId;
    if (payment_method) {
      // where.payment_method = payment_method; // Not supported on SalesDocument
    }
    if (startDate || endDate) {
      where.created_date = {};
      if (startDate) where.created_date.gte = new Date(startDate);
      if (endDate) where.created_date.lte = new Date(endDate);
    }

    const [total, sales] = await Promise.all([
      this.prisma.salesDocument.count({ where }),
      this.prisma.salesDocument.findMany({
        where,
        include: {
          items: { include: { product: true } },
          branch: true,
          createdBy: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: sales.map((s: { items: any[] }) =>
        this.formatSalesResponse(s, s.items),
      ),
      total,
    };
  }

  /**
   * Update sales
   */
  async updateSales(
    id: string,
    dto: UpdateSalesDTO,
  ): Promise<SalesResponseDTO> {
    const existing = await this.prisma.salesDocument.findUnique({
      where: { id },
    });
    if (!existing)
      throw new AppError(ErrorCode.NOT_FOUND, 404, "Sale not found");

    const updated = await this.prisma.salesDocument.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status as any }),
        ...(dto.discount !== undefined && { discount: dto.discount }),
        ...(dto.tax !== undefined && { tax: dto.tax }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        // ...(dto.payment_method && {
        //   payment_method: dto.payment_method as any,
        // }),
      },
      include: { items: { include: { product: true } } },
    });

    return this.formatSalesResponse(updated, updated.items);
  }

  /**
   * Daily summary
   */
  async getDailySummary(
    dto: DailySummaryDTO,
  ): Promise<DailySummaryResponseDTO> {
    // Normalize target date
    const targetDate = dto.date ? new Date(dto.date) : new Date();

    // Compute start/end of day
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Query filter
    const where: any = {
      createdAt: { gte: startOfDay, lte: endOfDay },
      status: { in: ["SENT", "PAID"] },
    };
    if (dto.branchId) where.branchId = dto.branchId;

    // Fetch sales
    const sales = await this.prisma.salesDocument.findMany({
      where,
      include: { branch: true, items: { include: { product: true } } },
    });

    // Aggregations
    const total_sales = sales.length;
    const total_revenue = sales.reduce(
      (sum: any, s: { total: any }) => sum + s.total,
      0,
    );
    const total_tax = sales.reduce(
      (sum: any, s: { tax: any }) => sum + s.tax,
      0,
    );
    const total_discount = sales.reduce(
      (sum: any, s: { discount: any }) => sum + s.discount,
      0,
    );

    const payment_methods = {
      cash: 0,
      card: 0,
      mpesa: 0,
      cheque: 0,
      bank_transfer: 0,
    } as const;

    const paymentsAgg: Record<keyof typeof payment_methods, number> = {
      cash: 0,
      card: 0,
      mpesa: 0,
      cheque: 0,
      bank_transfer: 0,
    };

    for (const s of sales) {
      // const pm = s.payment_method as keyof typeof payment_methods;
      // if (pm in paymentsAgg) paymentsAgg[pm] += s.total;
    }

    const productSales = new Map<
      string,
      { name: string; quantity: number; revenue: number }
    >();
    for (const s of sales) {
      for (const i of s.items) {
        const ex = productSales.get(i.productId);
        if (ex) {
          ex.quantity += i.quantity;
          ex.revenue += i.total;
        } else {
          productSales.set(i.productId, {
            name: i.product.name,
            quantity: i.quantity,
            revenue: i.total,
          });
        }
      }
    }

    const top_products = Array.from(productSales.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        quantity_sold: data.quantity,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Resolve branch name
    const branch = dto.branchId
      ? await this.prisma.branch.findUnique({ where: { id: dto.branchId } })
      : null;

    // Guaranteed string date in YYYY-MM-DD
    const dateStr = new Date(targetDate).toISOString().slice(0, 10);

    return {
      date: dateStr,
      branchId: dto.branchId || "all",
      branchName: branch?.name || "All Branches",
      total_sales,
      total_transactions: total_sales,
      total_revenue,
      total_tax,
      total_discount,
      payment_methods: paymentsAgg,
      top_products,
    };
  }

  /**
   * Generate receipt
   * @deprecated Use DocumentService.generateReceipt (lib/document.service.ts).
   */
  async generateReceipt(saleId: string): Promise<ReceiptDTO> {
    const { DocumentService } = await import("../../../lib/document.service");
    return DocumentService.generateReceipt(saleId) as Promise<ReceiptDTO>;
  }

  /**
   * Approve discount
   */
  async approveDiscount(dto: ApproveDiscountDTO): Promise<void> {
    const { salesId, managerId, managerPassword } = dto;

    const manager = await this.prisma.user.findUnique({
      where: { id: managerId },
    });
    if (!manager)
      throw new AppError(ErrorCode.NOT_FOUND, 404, "Manager not found");
    if (!["manager", "admin"].includes(manager.role)) {
      throw new AppError(
        ErrorCode.FORBIDDEN,
        403,
        "Only managers or admins can approve discounts",
      );
    }

    const isValid = await verifyPassword(managerPassword, manager.passwordHash);
    if (!isValid)
      throw new AppError(
        ErrorCode.UNAUTHORIZED,
        401,
        "Invalid manager password",
      );

    await this.prisma.salesDocument.update({
      where: { id: salesId },
      // data: { discount_approved_by: managerId }, // Field missing
      data: { notes: `Discount approved by ${managerId}` },
    });

    logger.info({ salesId, managerId }, "Discount approved");
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private async generateInvoiceNumber(branchId: string): Promise<string> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });
    const prefix = branch?.code || "INV";
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));

    const count = await this.prisma.salesDocument.count({
      where: { branchId, createdAt: { gte: startOfDay, lte: endOfDay } },
    });
    const seq = String(count + 1).padStart(4, "0");

    return `${prefix}-${year}${month}${day}-${seq}`;
  }

  private calculateSubtotal(
    items: Array<{ quantity: number; unitPrice: number }>,
  ): number {
    // @deprecated — use calculateSubtotal from lib/sales-calculator
    return calculateSubtotal(items);
  }

  private calculateTax(
    items: Array<{
      quantity: number;
      unitPrice: number;
      taxRate?: number;
      discount?: number;
    }>,
  ): number {
    // @deprecated — use calculateTax from lib/sales-calculator
    return calculateTax(items);
  }

  private formatSalesResponse(sale: any, items: any[]): SalesResponseDTO {
    return {
      id: sale.id,
      invoice_no: sale.documentId,
      status: sale.status,
      payment_method: "cash", // Default or fetch from payments
      branchId: sale.branchId,
      userId: sale.createdById,
      subtotal: sale.subtotal,
      total_amount: sale.total,
      discount: sale.discount,
      // discount_approved_by: sale.discount_approved_by || undefined,
      tax: sale.tax,
      grand_total: sale.total,
      amount_paid: sale.paidAmount,
      change: (sale.paidAmount || 0) - (sale.total || 0),
      branch: sale.branch
        ? {
            name: sale.branch.name,
            code: sale.branch.code,
            address: sale.branch.address,
            phone: sale.branch.phone,
          }
        : undefined,
      user: sale.createdBy
        ? {
            name: sale.createdBy.name,
            email: sale.createdBy.email,
          }
        : undefined,
      sales_items: items.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        product: {
          id: item.product?.id,
          name: item.product?.name,
          sku: item.product?.sku,
        },
        quantity: item.quantity,
        unit_price: item.unitPrice,
        tax_rate: item.taxRate,
        discount: item.discount,
        discount_percent: item.discount_percent,
        subtotal: item.subtotal,
        tax_amount: item.taxAmount,
        amount: item.total,
      })),
      created_date: sale.createdAt.toISOString(),
      delivery_date: sale.dueDate?.toISOString(), // Map dueDate or null
      notes: sale.notes || undefined,
    };
  }
}
