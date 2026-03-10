import { Prisma, type PrismaClient } from '../../generated';
import { AppError, ErrorCode } from '../../lib/errors';
import { ValuationService } from '../../lib/services/valuation.service';

/**
 * Sales Service - Handles sales order and dispatch operations
 */
export class SalesService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create a new Sales Order
   * @param data - Sales order creation data
   * @returns Created sales order with items
   */
  async createSalesOrder(data: {
    customerId: string;
    branchId: string;
    items: Array<{
      productId: string;
      qtyRequested: number;
      unitPrice: number;
    }>;
    notes?: string;
    createdById: string;
  }): Promise<any> {
    const { customerId, branchId, items, notes, createdById } = data;

    // Validate inputs
    if (!customerId || !branchId || !createdById) {
      throw new AppError(
        ErrorCode.INVALID_INPUT,
        400,
        'Customer, branch, and creator are required'
      );
    }

    if (!items || items.length === 0) {
      throw new AppError(
        ErrorCode.INVALID_INPUT,
        400,
        'Sales order must have at least one item'
      );
    }

    // Verify customer exists
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });
    if (!customer) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        404,
        `Customer with ID ${customerId} not found`
      );
    }

    // Verify branch exists
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true },
    });
    if (!branch) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        404,
        `Branch with ID ${branchId} not found`
      );
    }

    // Calculate totals and verify all products exist
    let subtotal = 0;
    const validatedItems: Array<{
      productId: string;
      qtyRequested: number;
      unitPrice: number;
    }> = [];

    for (const item of items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
        select: { id: true, tax_rate: true },
      });
      if (!product) {
        throw new AppError(
          ErrorCode.NOT_FOUND,
          404,
          `Product with ID ${item.productId} not found`
        );
      }

      const lineSubtotal = item.qtyRequested * item.unitPrice;
      subtotal += lineSubtotal;

      validatedItems.push({
        productId: item.productId,
        qtyRequested: item.qtyRequested,
        unitPrice: item.unitPrice,
      });
    }

    // Assume 16% tax
    const tax = subtotal * 0.16;
    const totalAmount = subtotal + tax;

    // Generate unique SO number
    const soNumber = `SO-${Date.now()}`;

    // Create sales order with items in transaction
    const salesOrder = await this.prisma.$transaction(async (tx: any) => {
      const createdSO = await tx.salesOrder.create({
        data: {
          soNumber,
          customerId,
          branchId,
          subtotal,
          tax,
          totalAmount,
          notes,
          createdById,
          status: 'DRAFT',
        },
      });

      // Create line items
      for (const item of validatedItems) {
        await tx.sOItem.create({
          data: {
            salesOrderId: createdSO.id,
            productId: item.productId,
            qtyRequested: item.qtyRequested,
            qtyDispatched: 0,
            unitPrice: item.unitPrice,
          },
        });
      }

      return createdSO;
    });

    // Fetch complete sales order with items
    return this.getSalesOrderById(salesOrder.id);
  }

  /**
   * Get sales order by ID with full details
   */
  async getSalesOrderById(soId: string): Promise<any> {
    const salesOrder = await this.prisma.salesOrder.findUnique({
      where: { id: soId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
        dispatchNotes: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!salesOrder) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        404,
        `Sales order with ID ${soId} not found`
      );
    }

    return salesOrder;
  }

  /**
   * List sales orders with optional filters
   */
  async listSalesOrders(
    branchId?: string,
    status?: string,
    page: number = 1,
    limit: number = 50
  ): Promise<any> {
    const where: any = {};
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;

    const skip = (page - 1) * limit;

    const [salesOrders, total] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true },
          },
          branch: {
            select: { id: true, name: true },
          },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.salesOrder.count({ where }),
    ]);

    return {
      data: salesOrders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Dispatch goods for a sales order
   * Uses FIFO valuation to calculate precise COGS
   *
   * @param soId - Sales order ID
   * @param warehouseId - Warehouse to dispatch from
   * @param items - Items to dispatch with quantities per SOItem
   * @param dispatchedById - User ID of person dispatching
   * @param notes - Optional dispatch notes
   * @returns Dispatch note with items and COGS details
   */
  async dispatchSalesOrder(data: {
    soId: string;
    warehouseId: string;
    items: Array<{
      soItemId: string;
      qtyToDispatch: number;
    }>;
    dispatchedById: string;
    notes?: string;
  }): Promise<any> {
    const { soId, warehouseId, items, dispatchedById, notes } = data;

    // Validate inputs
    if (!soId || !warehouseId || !dispatchedById) {
      throw new AppError(
        ErrorCode.INVALID_INPUT,
        400,
        'Sales order, warehouse, and dispatcher are required'
      );
    }

    if (!items || items.length === 0) {
      throw new AppError(
        ErrorCode.INVALID_INPUT,
        400,
        'Dispatch must include at least one item'
      );
    }

    // Fetch sales order
    const salesOrder = await this.prisma.salesOrder.findUnique({
      where: { id: soId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!salesOrder) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        404,
        `Sales order with ID ${soId} not found`
      );
    }

    // Verify warehouse exists
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: warehouseId },
      select: { id: true },
    });
    if (!warehouse) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        404,
        `Warehouse with ID ${warehouseId} not found`
      );
    }

    // Wrap dispatch in transaction with FIFO depletion
    const dispatchNote = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Generate unique DN number
        const dnNumber = `DN-${Date.now()}`;

        // Create dispatch note
        const createdDN = await tx.dispatchNote.create({
          data: {
            dnNumber,
            salesOrderId: soId,
            dispatchedById,
          },
        });

        // Process each dispatch item
        let totalCogsSum = new Prisma.Decimal(0);

        for (const dispatchItem of items) {
          // Find the SO item
          const soItem = salesOrder.items.find(
            (item: any) => item.id === dispatchItem.soItemId
          );
          if (!soItem) {
            throw new AppError(
              ErrorCode.NOT_FOUND,
              404,
              `SO item with ID ${dispatchItem.soItemId} not found`
            );
          }

          // Validate dispatch quantity
          const availableToDispatch =
            soItem.qtyRequested - soItem.qtyDispatched;
          if (dispatchItem.qtyToDispatch > availableToDispatch) {
            throw new AppError(
              ErrorCode.INVALID_OPERATION,
              422,
              `Cannot dispatch ${dispatchItem.qtyToDispatch} units of product ${soItem.product.name}. Only ${availableToDispatch} units available to dispatch.`
            );
          }

          // Use FIFO to deplete stock and get COGS
          const fifoResult = await ValuationService.depleteStockFIFO(
            tx,
            soItem.productId,
            warehouseId,
            dispatchItem.qtyToDispatch
          );

          totalCogsSum = totalCogsSum.add(fifoResult.totalCost);

          // Create dispatch item record
          await tx.dispatchItem.create({
            data: {
              dispatchNoteId: createdDN.id,
              soItemId: dispatchItem.soItemId,
              productId: soItem.productId,
              qtyDispatched: dispatchItem.qtyToDispatch,
              totalCogs: fifoResult.totalCost,
            },
          });

          // Update SO item's dispatched quantity
          await tx.sOItem.update({
            where: { id: dispatchItem.soItemId },
            data: {
              qtyDispatched: {
                increment: dispatchItem.qtyToDispatch,
              },
            },
          });
        }

        // Update sales order status based on dispatch progress
        const updatedSOItems = await tx.sOItem.findMany({
          where: { salesOrderId: soId },
        });

        const allDispatched = updatedSOItems.every(
          (item: any) => item.qtyDispatched >= item.qtyRequested
        );

        if (allDispatched) {
          await tx.salesOrder.update({
            where: { id: soId },
            data: { status: 'DISPATCHED' },
          });
        }

        return createdDN;
      }
    );

    // Fetch complete dispatch note with items
    const fullDispatchNote = await this.prisma.dispatchNote.findUnique({
      where: { id: dispatchNote.id },
      include: {
        dispatchedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
            soItem: {
              select: {
                qtyRequested: true,
              },
            },
          },
        },
        salesOrder: {
          include: {
            customer: true,
          },
        },
      },
    });

    return fullDispatchNote;
  }
}

export default SalesService;
