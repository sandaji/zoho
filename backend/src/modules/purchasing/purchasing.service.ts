import { prisma } from "../../lib/db";
import { AppError, ErrorCode } from "../../lib/errors";
import { PurchaseOrderStatus, Prisma } from "../../../src/generated/client";
import PDFDocument from "pdfkit";

export class PurchasingService {
  // ... existing methods ...

  /**
   * Generate PO PDF
   */
  async generatePoPdf(id: string): Promise<Buffer> {
    const po = await this.getPurchaseOrder(id);
    
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];
      
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);
      
      // -- HEADER --
      doc.fontSize(24).text("PURCHASE ORDER", { align: "right" });
      doc.moveDown();
      
      doc.fontSize(10).text(`PO Number: ${po.poNumber}`, { align: "right" });
      doc.text(`Date: ${po.createdAt.toDateString()}`, { align: "right" });
      doc.text(`Status: ${po.status}`, { align: "right" });
      doc.moveDown();

      // -- VENDOR & BRANCH INFO --
      const startY = doc.y;
      
      // Vendor (Left)
      doc.fontSize(12).text("Start Vendor:", 50, startY, { underline: true });
      doc.fontSize(10).text(po.vendor.name);
      if (po.vendor.address) doc.text(po.vendor.address);
      if (po.vendor.phone) doc.text(`Phone: ${po.vendor.phone}`);
      if (po.vendor.email) doc.text(`Email: ${po.vendor.email}`);
      if (po.vendor.taxId) doc.text(`Tax ID: ${po.vendor.taxId}`);
      
      // Branch (Right)
      doc.fontSize(12).text("Ship To:", 300, startY, { underline: true });
      doc.fontSize(10).text(po.branch.name);
      if (po.branch.address) doc.text(po.branch.address);
      if (po.branch.phone) doc.text(`Phone: ${po.branch.phone}`);
      
      doc.moveDown(4);
      
      // -- ITEMS TABLE --
      // Headers
      const tableTop = doc.y;
      const itemX = 50;
      const qtyX = 300;
      const priceX = 380;
      const totalX = 460;
      
      doc.fontSize(10).font("Helvetica-Bold");
      doc.text("Item / Description", itemX, tableTop);
      doc.text("Qty", qtyX, tableTop);
      doc.text("Unit Price", priceX, tableTop);
      doc.text("Total", totalX, tableTop);
      
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
      doc.font("Helvetica");
      
      let y = tableTop + 25;
      
      po.items.forEach((item) => {
        const productName = item.product.name;
        const subtotal = item.quantity * item.unitPrice;
        
        doc.text(productName, itemX, y);
        doc.text(item.quantity.toString(), qtyX, y);
        doc.text(item.unitPrice.toFixed(2), priceX, y);
        doc.text(subtotal.toFixed(2), totalX, y);
        
        y += 20;
      });
      
      doc.moveTo(50, y).lineTo(550, y).stroke();
      y += 10;
      
      // -- TOTALS --
      doc.font("Helvetica-Bold");
      doc.text(`Subtotal: ${po.subtotal.toFixed(2)}`, 400, y, { align: "right" });
      y += 15;
      doc.text(`Tax: ${po.tax.toFixed(2)}`, 400, y, { align: "right" });
      y += 15;
      doc.fontSize(12).text(`Total: ${po.total.toFixed(2)}`, 400, y, { align: "right" });
      
      // -- FOOTER --
      doc.fontSize(10).font("Helvetica");
      doc.text("Authorized Signature", 50, 700);
      doc.moveTo(50, 690).lineTo(200, 690).stroke();
      
      if (po.notes) {
        doc.moveDown(4);
        doc.text("Notes:", { underline: true });
        doc.text(po.notes);
      }
      
      doc.end();
    });
  }
  /**
   * Create a new vendor
   */
  async createVendor(data: {
    code: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    taxId?: string;
    website?: string;
  }) {
    const existing = await prisma.vendor.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new AppError(ErrorCode.ALREADY_EXISTS, 409, "Vendor with this code already exists");
    }

    return prisma.vendor.create({
      data,
    });
  }

  /**
   * List vendors
   */
  async listVendors(query: {
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const { search, skip = 0, take = 50 } = query;

    const where: Prisma.VendorWhereInput = {
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { code: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        skip,
        take,
        orderBy: { name: "asc" },
      }),
      prisma.vendor.count({ where }),
    ]);

    return { vendors, total };
  }

  /**
   * Create a Purchase Order
   */
  async createPurchaseOrder(
    userId: string,
    data: {
      vendorId: string;
      branchId: string;
      items: { productId: string; quantity: number; unitPrice: number }[];
      notes?: string;
      expectedDeliveryDate?: string;
    }
  ) {
    return prisma.$transaction(async (tx) => {
      // 1. Validate Vendor
      const vendor = await tx.vendor.findUnique({
        where: { id: data.vendorId },
      });
      if (!vendor || !vendor.isActive) {
        throw new AppError(ErrorCode.BAD_REQUEST, 400, "Invalid vendor");
      }

      // 2. Generate PO Number
      const year = new Date().getFullYear();
      const count = await tx.purchaseOrder.count();
      const poNumber = `PO-${year}-${(count + 1).toString().padStart(5, "0")}`;

      // 3. Calculate Totals
      let subtotal = 0;
      const itemsData = [];

      for (const item of data.items) {
        // Enforce single-vendor logic: Check if product belongs to the PO vendor
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { vendorId: true, name: true }
        });

        if (!product) {
          throw new AppError(ErrorCode.NOT_FOUND, 404, `Product ${item.productId} not found`);
        }

        if (product.vendorId !== data.vendorId) {
          throw new AppError(
            ErrorCode.VALIDATION_ERROR, 
            400, 
            `Product "${product.name}" does not belong to the selected vendor. SAP discipline requires all items in a PO to match the vendor.`
          );
        }

        const itemSubtotal = item.quantity * item.unitPrice;
        subtotal += itemSubtotal;
        
        itemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: itemSubtotal,
        });
      }

      // 4. Create PO
      const po = await tx.purchaseOrder.create({
        data: {
          poNumber,
          vendorId: data.vendorId,
          branchId: data.branchId,
          requestedById: userId,
          status: PurchaseOrderStatus.DRAFT,
          subtotal,
          tax: subtotal * 0.16, 
          total: subtotal * 1.16,
          notes: data.notes,
          expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
          items: {
            create: itemsData,
          },
        },
        include: {
          items: {
            include: { product: true },
          },
          vendor: true,
          requestedBy: true,
        },
      });

      return po;
    });
  }

  /**
   * Get PO by ID
   */
  async getPurchaseOrder(id: string) {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        branch: true,
        requestedBy: true,
        approvedBy: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!po) throw new AppError(ErrorCode.NOT_FOUND, 404, "Purchase Order not found");
    return po;
  }

  /**
   * List POs
   */
  async listPurchaseOrders(query: {
    status?: PurchaseOrderStatus;
    vendorId?: string;
    branchId?: string;
    skip?: number;
    take?: number;
  }) {
    const { status, vendorId, branchId, skip = 0, take = 50 } = query;

    const where: Prisma.PurchaseOrderWhereInput = {
      ...(status && { status }),
      ...(vendorId && { vendorId }),
      ...(branchId && { branchId }),
    };

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          vendor: true,
          requestedBy: true,
          _count: {
            select: { items: true }
          }
        },
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return { orders, total };
  }

  /**
   * Update PO Status (Approve, Submit, Close, Cancel)
   */
  async updateStatus(
    id: string, 
    status: PurchaseOrderStatus, 
    userId: string
  ) {
    const po = await this.getPurchaseOrder(id);

    if (po.status === PurchaseOrderStatus.CLOSED || po.status === PurchaseOrderStatus.CANCELLED) {
      throw new AppError(ErrorCode.INVALID_STATUS, 400, "Cannot change status of a closed or cancelled PO");
    }

    const updateData: Prisma.PurchaseOrderUpdateInput = { status };

    if (status === PurchaseOrderStatus.SUBMITTED) {
      updateData.submittedAt = new Date();
    } else if (status === PurchaseOrderStatus.APPROVED) {
      updateData.approvedBy = { connect: { id: userId } };
      updateData.approvedAt = new Date();
    } else if (status === PurchaseOrderStatus.CLOSED) {
      updateData.closedAt = new Date();
    }

    return prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Receive Goods
   */
  async receiveGoods(
    id: string,
    userId: string,
    data: {
      warehouseId: string;
      items: { productId: string; quantity: number }[];
    }
  ) {
    return prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id },
        include: { items: true, branch: true },
      });

      if (!po) throw new AppError(ErrorCode.NOT_FOUND, 404, "PO not found");
      if (po.status !== PurchaseOrderStatus.APPROVED && po.status !== PurchaseOrderStatus.PARTIALLY_RECEIVED) {
        throw new AppError(ErrorCode.INVALID_STATUS, 400, "PO must be APPROVED or PARTIALLY_RECEIVED to receive goods");
      }

      // Check warehouse
      const warehouse = await tx.warehouse.findUnique({
        where: { id: data.warehouseId },
      });
      if (!warehouse) throw new AppError(ErrorCode.NOT_FOUND, 404, "Warehouse not found");
      if (warehouse.branchId !== po.branchId) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 400, "Warehouse must belong to the PO branch");
      }

      for (const receivedItem of data.items) {
        if (receivedItem.quantity <= 0) continue;

        const poItem = po.items.find((item) => item.productId === receivedItem.productId);
        if (!poItem) {
          throw new AppError(ErrorCode.VALIDATION_ERROR, 400, `Product ${receivedItem.productId} is not in this PO`);
        }

        const newReceivedQty = poItem.receivedQuantity + receivedItem.quantity;
        if (newReceivedQty > poItem.quantity) {
          throw new AppError(ErrorCode.VALIDATION_ERROR, 400, `Cannot receive more than ordered quantity for product ${receivedItem.productId}`);
        }

        // 1. Update PO Item
        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: { receivedQuantity: newReceivedQty },
        });

        // 2. Update/Create Inventory
        await tx.inventory.upsert({
          where: {
            productId_warehouseId: {
              productId: receivedItem.productId,
              warehouseId: data.warehouseId,
            },
          },
          create: {
            productId: receivedItem.productId,
            warehouseId: data.warehouseId,
            quantity: receivedItem.quantity,
            available: receivedItem.quantity, // Assuming no reservations yet
            status: "in_stock",
          },
          update: {
            quantity: { increment: receivedItem.quantity },
            available: { increment: receivedItem.quantity },
          },
        });

        // 3. Create Stock Movement
        await tx.stockMovement.create({
          data: {
            type: "INBOUND",
            quantity: receivedItem.quantity,
            productId: receivedItem.productId,
            warehouseId: data.warehouseId,
            createdById: userId,
            reference: `PO Receive: ${po.poNumber}`,
          },
        });
      }

      // 4. Update PO Status
      const updatedItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: id },
      });
      
      const isEveryItemComplete = updatedItems.every(
        (item) => item.receivedQuantity >= item.quantity
      );

      const newStatus = isEveryItemComplete
        ? PurchaseOrderStatus.RECEIVED
        : PurchaseOrderStatus.PARTIALLY_RECEIVED;
        
      await tx.purchaseOrder.update({
        where: { id },
        data: { 
          status: newStatus,
          updatedAt: new Date()
        },
      });

      return await tx.purchaseOrder.findUnique({
        where: { id },
        include: { items: true },
      });
    });
  }
}
