import { prisma } from "../../../lib/db";
import { logger } from "../../../lib/logger";
import { verifyPassword } from "../../../lib/password";
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
    const { search, branchId } = dto;

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
        `No products found matching: ${searchTerm}`
      );
    }

    // Step 2: Get warehouse IDs for this branch (if provided)
    let warehouses: any[] = [];
    let warehouseIds: string[] = [];

    if (branchId) {
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
        let totalAvailable = product.quantity || 0;
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
              0
            );

            inventoryLocations = inventory.map((inv) => {
              const warehouse = warehouses.find(
                (w) => w.id === inv.warehouseId
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
      })
    );

    // Return array of products for autocomplete
    return results;
  }

  /**
   * Create new sales order with inventory transaction
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

    const subtotal = this.calculateSubtotal(items);
    const discountPercent = subtotal > 0 ? (discount / subtotal) * 100 : 0;

    if (discountPercent > 10 && !discount_approved_by) {
      throw new AppError(
        ErrorCode.FORBIDDEN,
        403,
        "Discounts over 10% require manager approval"
      );
    }

    const invoice_no = await this.generateInvoiceNumber(branchId);
    const total_tax = this.calculateTax(items);
    const grand_total = subtotal - discount + total_tax;
    const paid = amount_paid ?? grand_total;
    const change = paid - grand_total;

    return await this.prisma.$transaction(async (tx) => {
      // Create sale
      const sale = await tx.sales.create({
        data: {
          invoice_no,
          status: "confirmed",
          payment_method,
          branchId,
          userId,
          createdById: userId,
          subtotal,
          total_amount: subtotal,
          discount,
          discount_approved_by,
          tax: total_tax,
          grand_total,
          amount_paid: paid,
          change,
          notes,
        },
      });

      // Create items + update inventory/products
      const createdItems: any[] = [];
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });
        if (!product) {
          throw new AppError(
            ErrorCode.NOT_FOUND,
            404,
            `Product not found: ${item.productId}`
          );
        }

        const item_subtotal = item.quantity * item.unit_price;
        const item_discount = item.discount ?? 0;
        const tax_rate = item.tax_rate ?? product.tax_rate ?? 0.16;
        const tax_amount = (item_subtotal - item_discount) * tax_rate;
        const amount = item_subtotal - item_discount + tax_amount;

        const salesItem = await tx.salesItem.create({
          data: {
            salesId: sale.id,
            productId: item.productId,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_rate,
            discount: item_discount,
            discount_percent: item.discount_percent ?? 0,
            subtotal: item_subtotal,
            tax_amount,
            amount,
          },
          include: { product: true },
        });
        createdItems.push(salesItem);

        // Pick inventory from branch warehouses with enough available
        const inventory = await tx.inventory.findFirst({
          where: {
            productId: item.productId,
            warehouse: { branchId, isActive: true },
            available: { gte: item.quantity },
          },
        });

        // If inventory record exists, update it; otherwise use product quantity
        if (inventory) {
          const newAvailable = inventory.available - item.quantity;
          const newQuantity = inventory.quantity - item.quantity;
          const newStatus =
            newAvailable <= 0
              ? "out_of_stock"
              : newAvailable <= product.reorder_level
                ? "low_stock"
                : inventory.status;

          await tx.inventory.update({
            where: { id: inventory.id },
            data: {
              available: newAvailable,
              quantity: newQuantity,
              status: newStatus as any,
            },
          });
        } else {
          // Fallback: Check if product has enough quantity
          if (!product.quantity || product.quantity < item.quantity) {
            throw new AppError(
              ErrorCode.VALIDATION_ERROR,
              400,
              `Insufficient inventory for product: ${product.name} in branch ${branch.name}`
            );
          }
        }

        // Always decrement product quantity
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      // Create finance transaction
      await tx.financeTransaction.create({
        data: {
          type: "income",
          reference_no: `FIN-${invoice_no}`,
          description: `Sales transaction ${invoice_no}`,
          amount: grand_total,
          salesId: sale.id,
          payment_method,
          reference_doc: invoice_no,
        },
      });

      logger.info(
        {
          saleId: sale.id,
          invoice_no,
          branchId,
          userId,
          grand_total,
        },
        "Sale created successfully"
      );

      return this.formatSalesResponse(sale, createdItems);
    });
  }

  /**
   * Get sales by ID (full details)
   */
  async getSalesById(id: string): Promise<SalesResponseDTO> {
    const sale = await this.prisma.sales.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        branch: true,
        user: true,
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
    if (payment_method) where.payment_method = payment_method;
    if (startDate || endDate) {
      where.created_date = {};
      if (startDate) where.created_date.gte = new Date(startDate);
      if (endDate) where.created_date.lte = new Date(endDate);
    }

    const [total, sales] = await Promise.all([
      this.prisma.sales.count({ where }),
      this.prisma.sales.findMany({
        where,
        include: {
          items: { include: { product: true } },
          branch: true,
          user: true,
        },
        orderBy: { created_date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: sales.map((s: { items: any[] }) =>
        this.formatSalesResponse(s, s.items)
      ),
      total,
    };
  }

  /**
   * Update sales
   */
  async updateSales(
    id: string,
    dto: UpdateSalesDTO
  ): Promise<SalesResponseDTO> {
    const existing = await this.prisma.sales.findUnique({ where: { id } });
    if (!existing)
      throw new AppError(ErrorCode.NOT_FOUND, 404, "Sale not found");

    const updated = await this.prisma.sales.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status as any }),
        ...(dto.discount !== undefined && { discount: dto.discount }),
        ...(dto.tax !== undefined && { tax: dto.tax }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.payment_method && {
          payment_method: dto.payment_method as any,
        }),
      },
      include: { items: { include: { product: true } } },
    });

    return this.formatSalesResponse(updated, updated.items);
  }

  /**
   * Daily summary
   */
  async getDailySummary(
    dto: DailySummaryDTO
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
      created_date: { gte: startOfDay, lte: endOfDay },
      status: { in: ["confirmed", "delivered"] },
    };
    if (dto.branchId) where.branchId = dto.branchId;

    // Fetch sales
    const sales = await this.prisma.sales.findMany({
      where,
      include: { branch: true, items: { include: { product: true } } },
    });

    // Aggregations
    const total_sales = sales.length;
    const total_revenue = sales.reduce(
      (sum: any, s: { grand_total: any }) => sum + s.grand_total,
      0
    );
    const total_tax = sales.reduce(
      (sum: any, s: { tax: any }) => sum + s.tax,
      0
    );
    const total_discount = sales.reduce(
      (sum: any, s: { discount: any }) => sum + s.discount,
      0
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
      const pm = s.payment_method as keyof typeof payment_methods;
      if (pm in paymentsAgg) paymentsAgg[pm] += s.grand_total;
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
          ex.revenue += i.amount;
        } else {
          productSales.set(i.productId, {
            name: i.product.name,
            quantity: i.quantity,
            revenue: i.amount,
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
   */
  async generateReceipt(saleId: string): Promise<ReceiptDTO> {
    const sale = await this.prisma.sales.findUnique({
      where: { id: saleId },
      include: {
        items: { include: { product: true } },
        branch: true,
        user: true,
      },
    });

    if (!sale) throw new AppError(ErrorCode.NOT_FOUND, 404, "Sale not found");

    const company = {
      name: process.env.COMPANY_NAME || "LUNATECH SYSTEMS LTD",
      address: process.env.COMPANY_ADDRESS || "123 Tech Plaza, Westlands",
      phone: process.env.COMPANY_PHONE || "+254 722 123 456",
      email: process.env.COMPANY_EMAIL || "info@lunatech.co.ke",
      kra_pin: process.env.COMPANY_KRA_PIN || "P051472913Q",
    };

    return {
      sale: this.formatSalesResponse(sale, sale.items),
      branch: {
        name: sale.branch.name,
        address: sale.branch.address || undefined,
        phone: sale.branch.phone || undefined,
        code: sale.branch.code,
      },
      cashier: {
        name: sale.user.name,
        email: sale.user.email,
      },
      company,
    };
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
        "Only managers or admins can approve discounts"
      );
    }

    const isValid = await verifyPassword(managerPassword, manager.passwordHash);
    if (!isValid)
      throw new AppError(
        ErrorCode.UNAUTHORIZED,
        401,
        "Invalid manager password"
      );

    await this.prisma.sales.update({
      where: { id: salesId },
      data: { discount_approved_by: managerId },
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

    const count = await this.prisma.sales.count({
      where: { branchId, created_date: { gte: startOfDay, lte: endOfDay } },
    });
    const seq = String(count + 1).padStart(4, "0");

    return `${prefix}-${year}${month}${day}-${seq}`;
  }

  private calculateSubtotal(
    items: Array<{ quantity: number; unit_price: number }>
  ): number {
    return items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
  }

  private calculateTax(
    items: Array<{
      quantity: number;
      unit_price: number;
      tax_rate?: number;
      discount?: number;
    }>
  ): number {
    return items.reduce((sum, i) => {
      const sub = i.quantity * i.unit_price;
      const disc = i.discount ?? 0;
      const taxable = sub - disc;
      const rate = i.tax_rate ?? 0.16;
      return sum + taxable * rate;
    }, 0);
  }

  private formatSalesResponse(sale: any, items: any[]): SalesResponseDTO {
    return {
      id: sale.id,
      invoice_no: sale.invoice_no,
      status: sale.status,
      payment_method: sale.payment_method,
      branchId: sale.branchId,
      userId: sale.userId,
      subtotal: sale.subtotal,
      total_amount: sale.total_amount,
      discount: sale.discount,
      discount_approved_by: sale.discount_approved_by || undefined,
      tax: sale.tax,
      grand_total: sale.grand_total,
      amount_paid: sale.amount_paid,
      change: sale.change,
      branch: sale.branch
        ? {
            name: sale.branch.name,
            code: sale.branch.code,
            address: sale.branch.address,
            phone: sale.branch.phone,
          }
        : undefined,
      user: sale.user
        ? {
            name: sale.user.name,
            email: sale.user.email,
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
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        discount: item.discount,
        discount_percent: item.discount_percent,
        subtotal: item.subtotal,
        tax_amount: item.tax_amount,
        amount: item.amount,
      })),
      created_date: sale.created_date.toISOString(),
      delivery_date: sale.delivery_date?.toISOString(),
      notes: sale.notes || undefined,
    };
  }
}
