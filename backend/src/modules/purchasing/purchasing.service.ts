import { prisma } from "../../lib/db";
import { AppError, ErrorCode } from "../../lib/errors";
import { PurchaseOrderStatus, Prisma } from "../../../src/generated";
import PDFDocument from "pdfkit";

// ============================================================================
// APPROVAL THRESHOLDS (KSH - Kenyan Shilling)
// ============================================================================
enum ApprovalLevel {
  STANDARD = 'standard',        // < KSH 10,000
  HIGH_VALUE = 'high_value',    // KSH 10,000 - 100,000
  EXECUTIVE = 'executive',      // > KSH 100,000
}

const APPROVAL_THRESHOLDS = {
  STANDARD_MAX: 10000,          // KSH 10,000
  HIGH_VALUE_MAX: 100000,       // KSH 100,000
  // Above 100k = executive
};

function getApprovalLevel(poTotal: number): ApprovalLevel {
  if (poTotal < APPROVAL_THRESHOLDS.STANDARD_MAX) {
    return ApprovalLevel.STANDARD;
  } else if (poTotal < APPROVAL_THRESHOLDS.HIGH_VALUE_MAX) {
    return ApprovalLevel.HIGH_VALUE;
  } else {
    return ApprovalLevel.EXECUTIVE;
  }
}

// ============================================================================
// VALID STATE TRANSITIONS (State Machine)
// ============================================================================
const VALID_STATE_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  [PurchaseOrderStatus.DRAFT]: [
    PurchaseOrderStatus.SUBMITTED,
    PurchaseOrderStatus.CANCELLED
  ],
  [PurchaseOrderStatus.SUBMITTED]: [
    PurchaseOrderStatus.APPROVED,
    PurchaseOrderStatus.DRAFT,          // Can revert
    PurchaseOrderStatus.CANCELLED
  ],
  [PurchaseOrderStatus.APPROVED]: [
    PurchaseOrderStatus.PARTIALLY_RECEIVED,
    PurchaseOrderStatus.RECEIVED,
    PurchaseOrderStatus.CANCELLED
  ],
  [PurchaseOrderStatus.PARTIALLY_RECEIVED]: [
    PurchaseOrderStatus.RECEIVED,
    PurchaseOrderStatus.CLOSED
  ],
  [PurchaseOrderStatus.RECEIVED]: [
    PurchaseOrderStatus.CLOSED
  ],
  [PurchaseOrderStatus.CLOSED]: [],       // Terminal state
  [PurchaseOrderStatus.CANCELLED]: []     // Terminal state
};

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
    paymentTerms?: string;
    leadTimeDays?: number;
  }) {
    const existing = await prisma.vendor.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new AppError(ErrorCode.ALREADY_EXISTS, 409, "Vendor with this code already exists");
    }

    return prisma.vendor.create({
      data: {
        code: data.code,
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        taxId: data.taxId,
        website: data.website,
        paymentTerms: data.paymentTerms || "NET_30",
        leadTimeDays: data.leadTimeDays || 7,
      },
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
      const itemsData: Array<{
        productId: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
      }> = [];

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
   * List POs with branch isolation
   */
  async listPurchaseOrders(query: {
    status?: PurchaseOrderStatus;
    vendorId?: string;
    branchId?: string;
    skip?: number;
    take?: number;
    // ✅ NEW: Branch isolation params
    userBranchId?: string;
    userPermissions?: string[];
  }) {
    const {
      status,
      vendorId,
      branchId,
      skip = 0,
      take = 50,
      userBranchId,
      userPermissions = []
    } = query;

    // ✅ NEW: Branch isolation logic
    const hasViewAll = userPermissions.includes('purchasing.order.view_all');
    const filterBranchId = branchId || userBranchId;

    // Prevent viewing other branches without permission
    if (!hasViewAll && filterBranchId !== userBranchId) {
      throw new AppError(
        ErrorCode.FORBIDDEN,
        403,
        'You can only view Purchase Orders from your branch'
      );
    }

    const where: Prisma.PurchaseOrderWhereInput = {
      ...(status && { status }),
      ...(vendorId && { vendorId }),
      ...(filterBranchId && { branchId: filterBranchId }),
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
          approvedBy: true,
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
   * Update PO Status (Submit, Approve, Close, Cancel)
   * 
   * Enforces:
   * - State machine transitions
   * - Segregation of duties (no self-approval)
   * - Approval thresholds (KSH-based)
   * - Vendor active status
   */
  async updateStatus(
    id: string,
    status: PurchaseOrderStatus,
    userId: string,
    userPermissions: string[] = []
  ) {
    const po = await this.getPurchaseOrder(id);

    // ✅ Validate state transition (State Machine)
    if (!this.isValidStateTransition(po.status, status)) {
      throw new AppError(
        ErrorCode.INVALID_STATUS,
        400,
        `Cannot transition from ${po.status} to ${status}. Valid transitions: ${VALID_STATE_TRANSITIONS[po.status]?.join(', ') || 'None'}`
      );
    }

    // ✅ Prevent self-approval (Segregation of Duties)
    if (status === PurchaseOrderStatus.APPROVED) {
      if (po.requestedById === userId) {
        throw new AppError(
          ErrorCode.FORBIDDEN,
          403,
          'Segregation of Duties Violation: You cannot approve your own Purchase Order. A different user must approve this LPO.'
        );
      }

      // ✅ Validate approval threshold
      const approvalLevel = getApprovalLevel(po.total);
      const requiredPermission = `purchasing.order.approve_${approvalLevel}`;

      const hasRequiredPermission = userPermissions.includes(requiredPermission) ||
        userPermissions.includes('purchasing.order.approve_executive');

      if (!hasRequiredPermission) {
        const thresholdInfo =
          approvalLevel === ApprovalLevel.STANDARD
            ? 'KSH 10,000'
            : approvalLevel === ApprovalLevel.HIGH_VALUE
              ? 'between KSH 10,000 - 100,000'
              : 'above KSH 100,000';

        throw new AppError(
          ErrorCode.FORBIDDEN,
          403,
          `Insufficient permission to approve this LPO (Amount: KSH ${po.total.toLocaleString()}). ` +
          `This LPO requires '${requiredPermission}' permission (for amounts ${thresholdInfo}).`
        );
      }

      // ✅ Verify vendor is still active
      const vendor = await prisma.vendor.findUnique({
        where: { id: po.vendorId }
      });
      if (!vendor?.isActive) {
        throw new AppError(
          ErrorCode.BAD_REQUEST,
          400,
          `Cannot approve LPO: Vendor "${vendor?.name || 'Unknown'}" has been deactivated. ` +
          `Please contact the Procurement team to reactivate or select a different vendor.`
        );
      }
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
      include: {
        vendor: true,
        branch: true,
        requestedBy: true,
        approvedBy: true,
        items: { include: { product: true } }
      }
    });
  }

  /**
   * Validates state machine transitions
   */
  private isValidStateTransition(
    currentStatus: PurchaseOrderStatus,
    newStatus: PurchaseOrderStatus
  ): boolean {
    return VALID_STATE_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
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
      allowOverReceive?: boolean;
      notes?: string;
    }
  ) {
    // RBAC: Check warehouse clerk role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: true } },
      },
    });

    const allowedRoles = ["WAREHOUSE_CLERK", "WAREHOUSE_MANAGER", "ADMIN"];
    const hasPermission = user?.roles.some((r) =>
      allowedRoles.includes(r.role.code.toUpperCase())
    );

    if (!hasPermission) {
      throw new AppError(
        ErrorCode.FORBIDDEN,
        403,
        "Only warehouse staff can receive goods"
      );
    }

    return prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id },
        include: { items: { include: { product: true } }, branch: true },
      });

      if (!po) throw new AppError(ErrorCode.NOT_FOUND, 404, "PO not found");
      if (
        po.status !== PurchaseOrderStatus.APPROVED &&
        po.status !== PurchaseOrderStatus.PARTIALLY_RECEIVED
      ) {
        throw new AppError(
          ErrorCode.INVALID_STATUS,
          400,
          "PO must be APPROVED or PARTIALLY_RECEIVED to receive goods"
        );
      }

      // Check warehouse
      const warehouse = await tx.warehouse.findUnique({
        where: { id: data.warehouseId },
      });
      if (!warehouse)
        throw new AppError(ErrorCode.NOT_FOUND, 404, "Warehouse not found");
      if (warehouse.branchId !== po.branchId) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          400,
          "Warehouse must belong to the PO branch"
        );
      }

      // Generate GRN number
      const lastGRN = await tx.goodsReceiptNote.findFirst({
        orderBy: { createdAt: "desc" as const },
        select: { grnNumber: true },
      });

      const grnNumber =
        "GRN-" +
        (lastGRN
          ? (parseInt(lastGRN.grnNumber.split("-")[1]) + 1)
            .toString()
            .padStart(6, "0")
          : "000001");

      // Create GRN
      const grn = await tx.goodsReceiptNote.create({
        data: {
          grnNumber,
          purchaseOrderId: id,
          receivedById: userId,
          notes: data.notes || "",
          status: "COMPLETED",
        },
      });

      const grnItems = [];
      let totalReceivedQty = 0;
      let totalOrderedQty = 0;

      for (const receivedItem of data.items) {
        if (receivedItem.quantity <= 0) continue;

        const poItem = po.items.find(
          (item) => item.productId === receivedItem.productId
        );
        if (!poItem) {
          throw new AppError(
            ErrorCode.VALIDATION_ERROR,
            400,
            `Product ${receivedItem.productId} is not in this PO`
          );
        }

        const remaining = poItem.quantity - poItem.receivedQuantity;
        if (
          receivedItem.quantity > remaining &&
          !data.allowOverReceive
        ) {
          throw new AppError(
            ErrorCode.VALIDATION_ERROR,
            400,
            `Cannot receive ${receivedItem.quantity} of ${poItem.product.name}. Only ${remaining} units remaining.`
          );
        }

        const newReceivedQty = poItem.receivedQuantity + receivedItem.quantity;

        // 1. Update PO Item
        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: { receivedQuantity: newReceivedQty },
        });

        // 2. Create GRN Item
        const grnItem = await tx.grnItem.create({
          data: {
            grnId: grn.id,
            poItemId: poItem.id,
            productId: receivedItem.productId,
            qtyReceived: receivedItem.quantity,
          },
        });

        grnItems.push(grnItem);

        // 3. Update/Create Inventory
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
          },
          update: {
            quantity: {
              increment: receivedItem.quantity,
            },
            updatedAt: new Date(),
          },
        });

        totalReceivedQty += newReceivedQty;
        totalOrderedQty += poItem.quantity;
      }

      // 4. Update PO Status
      const newStatus =
        totalReceivedQty === totalOrderedQty
          ? PurchaseOrderStatus.RECEIVED
          : PurchaseOrderStatus.PARTIALLY_RECEIVED;

      const updatedPO = await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: newStatus,
          updatedAt: new Date(),
        },
        include: {
          items: {
            include: {
              product: true,
              grnItems: { include: { goodsReceiptNote: true } },
            },
          },
          grns: {
            include: {
              receivedBy: { select: { id: true, email: true, name: true } },
              items: { include: { product: true } },
            },
            orderBy: { createdAt: "desc" as const },
          },
        },
      });

      return {
        grn,
        grnItems,
        updatedPO,
      };
    });
  }

  /**
   * Soft-Delete (Deactivate) a Vendor
   * 
   * Prevents deletion if vendor has active Purchase Orders.
   * Uses soft-delete (isActive = false) for audit trail integrity.
   */
  async deleteVendor(vendorId: string): Promise<Vendor> {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    });

    if (!vendor) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        404,
        `Vendor not found with ID: ${vendorId}`
      );
    }

    // Check if vendor has active LPOs
    const activePOs = await prisma.purchaseOrder.count({
      where: {
        vendorId,
        status: {
          in: [
            PurchaseOrderStatus.DRAFT,
            PurchaseOrderStatus.SUBMITTED,
            PurchaseOrderStatus.APPROVED,
            PurchaseOrderStatus.PARTIALLY_RECEIVED
          ]
        }
      }
    });

    if (activePOs > 0) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        `Cannot deactivate vendor "${vendor.name}": ${activePOs} active LPO(s) exist. ` +
        `Please cancel or complete these LPOs before deactivating the vendor.`
      );
    }

    // Soft delete: Set isActive = false (recommended for audit trail)
    return prisma.vendor.update({
      where: { id: vendorId },
      data: { isActive: false },
    });
  }
}

export type Vendor = Awaited<ReturnType<typeof prisma.vendor.findUnique>>;

