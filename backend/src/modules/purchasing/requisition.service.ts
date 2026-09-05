import { prisma } from "../../lib/db";
import { AppError, ErrorCode } from "../../lib/errors";
import { PurchaseRequisitionStatus, PurchaseOrderStatus, Prisma } from "../../generated";

// ============================================================================
// APPROVAL THRESHOLDS (KSH) — mirrors purchasing.service.ts's PO thresholds.
// Deliberately duplicated rather than imported: keeping each entity's
// threshold logic self-contained avoids one service reaching into another's
// internals, matching the existing pattern in this codebase (PO thresholds
// are likewise inlined in purchasing.service.ts, not shared from a common
// module). If these ever need to diverge (e.g. different limits for
// requisitions vs. POs) that's a one-file change either way.
// ============================================================================
enum ApprovalLevel {
  STANDARD = "standard", // < KSH 10,000
  HIGH_VALUE = "high_value", // KSH 10,000 - 100,000
  EXECUTIVE = "executive", // > KSH 100,000
}

const APPROVAL_THRESHOLDS = {
  STANDARD_MAX: 10000,
  HIGH_VALUE_MAX: 100000,
};

function getApprovalLevel(total: number): ApprovalLevel {
  if (total < APPROVAL_THRESHOLDS.STANDARD_MAX) return ApprovalLevel.STANDARD;
  if (total < APPROVAL_THRESHOLDS.HIGH_VALUE_MAX) return ApprovalLevel.HIGH_VALUE;
  return ApprovalLevel.EXECUTIVE;
}

// ============================================================================
// VALID STATE TRANSITIONS
// ============================================================================
const VALID_STATE_TRANSITIONS: Record<
  PurchaseRequisitionStatus,
  PurchaseRequisitionStatus[]
> = {
  [PurchaseRequisitionStatus.DRAFT]: [
    PurchaseRequisitionStatus.SUBMITTED,
    PurchaseRequisitionStatus.CANCELLED,
  ],
  [PurchaseRequisitionStatus.SUBMITTED]: [
    PurchaseRequisitionStatus.APPROVED,
    PurchaseRequisitionStatus.REJECTED,
    PurchaseRequisitionStatus.DRAFT, // can revert
    PurchaseRequisitionStatus.CANCELLED,
  ],
  [PurchaseRequisitionStatus.APPROVED]: [
    PurchaseRequisitionStatus.CONVERTED,
    PurchaseRequisitionStatus.CANCELLED,
  ],
  [PurchaseRequisitionStatus.REJECTED]: [
    PurchaseRequisitionStatus.DRAFT, // resubmit after addressing feedback
    PurchaseRequisitionStatus.CANCELLED,
  ],
  [PurchaseRequisitionStatus.CONVERTED]: [], // terminal
  [PurchaseRequisitionStatus.CANCELLED]: [], // terminal
};

export class PurchaseRequisitionService {
  /**
   * Create a Purchase Requisition. Deliberately does NOT require a vendor
   * or a catalog productId per line — see schema.prisma's comment on
   * PurchaseRequisitionItem for why (this is the pre-PO stage; procurement
   * picks the vendor later, at conversion time).
   */
  async createRequisition(
    userId: string,
    data: {
      branchId: string;
      departmentId?: string;
      projectCode?: string;
      items: {
        description: string;
        quantity: number;
        estimatedUnitCost: number;
        productId?: string;
      }[];
      notes?: string;
      // Only DRAFT and SUBMITTED are legal at creation time, same reasoning
      // as PurchaseOrder.createPurchaseOrder — anything further along has
      // to go through updateStatus so approval/segregation rules run.
      status?: PurchaseRequisitionStatus;
    },
  ) {
    const requestedStatus = data.status ?? PurchaseRequisitionStatus.DRAFT;
    if (
      requestedStatus !== PurchaseRequisitionStatus.DRAFT &&
      requestedStatus !== PurchaseRequisitionStatus.SUBMITTED
    ) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        `A Purchase Requisition can only be created as DRAFT or SUBMITTED, not ${requestedStatus}.`,
      );
    }

    if (!data.items || data.items.length === 0) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        "A Purchase Requisition needs at least one line item.",
      );
    }

    return prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      const count = await tx.purchaseRequisition.count();
      const requisitionNumber = `REQ-${year}-${(count + 1).toString().padStart(5, "0")}`;

      let estimatedTotal = 0;
      const itemsData = data.items.map((item) => {
        const estimatedSubtotal = item.quantity * item.estimatedUnitCost;
        estimatedTotal += estimatedSubtotal;
        return {
          description: item.description,
          quantity: item.quantity,
          estimatedUnitCost: item.estimatedUnitCost,
          estimatedSubtotal,
          productId: item.productId,
        };
      });

      return tx.purchaseRequisition.create({
        data: {
          requisitionNumber,
          branchId: data.branchId,
          departmentId: data.departmentId,
          projectCode: data.projectCode,
          requestedById: userId,
          status: requestedStatus,
          submittedAt:
            requestedStatus === PurchaseRequisitionStatus.SUBMITTED ? new Date() : null,
          estimatedTotal,
          notes: data.notes,
          items: { create: itemsData },
        },
        include: {
          items: { include: { product: true } },
          requestedBy: true,
          department: true,
          branch: true,
        },
      });
    });
  }

  /**
   * Update a Requisition (DRAFT only) — same reasoning as
   * PurchasingService.updatePurchaseOrder: once it's left DRAFT it's
   * potentially already been looked at by an approver.
   */
  async updateRequisition(
    id: string,
    data: {
      departmentId?: string;
      projectCode?: string;
      items?: {
        description: string;
        quantity: number;
        estimatedUnitCost: number;
        productId?: string;
      }[];
      notes?: string;
    },
  ) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.purchaseRequisition.findUnique({ where: { id } });
      if (!existing) {
        throw new AppError(ErrorCode.NOT_FOUND, 404, "Purchase Requisition not found");
      }
      if (existing.status !== PurchaseRequisitionStatus.DRAFT) {
        throw new AppError(
          ErrorCode.INVALID_STATUS,
          400,
          `Cannot edit a Requisition once it has left DRAFT status (current status: ${existing.status}).`,
        );
      }

      const updateData: Prisma.PurchaseRequisitionUpdateInput = {
        ...(data.departmentId !== undefined && {
          department: data.departmentId
            ? { connect: { id: data.departmentId } }
            : { disconnect: true },
        }),
        ...(data.projectCode !== undefined && { projectCode: data.projectCode }),
        ...(data.notes !== undefined && { notes: data.notes }),
        updatedAt: new Date(),
      };

      if (data.items) {
        let estimatedTotal = 0;
        const itemsData = data.items.map((item) => {
          const estimatedSubtotal = item.quantity * item.estimatedUnitCost;
          estimatedTotal += estimatedSubtotal;
          return {
            description: item.description,
            quantity: item.quantity,
            estimatedUnitCost: item.estimatedUnitCost,
            estimatedSubtotal,
            productId: item.productId,
          };
        });
        updateData.estimatedTotal = estimatedTotal;
        // DRAFT requisition has nothing downstream depending on old item
        // rows, so replace wholesale — same call made for PO edits.
        updateData.items = { deleteMany: {}, create: itemsData };
      }

      return tx.purchaseRequisition.update({
        where: { id },
        data: updateData,
        include: {
          items: { include: { product: true } },
          requestedBy: true,
          department: true,
          branch: true,
        },
      });
    });
  }

  async getRequisition(id: string) {
    const req = await prisma.purchaseRequisition.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        requestedBy: true,
        approvedBy: true,
        department: true,
        branch: true,
        purchaseOrder: true,
      },
    });
    if (!req) throw new AppError(ErrorCode.NOT_FOUND, 404, "Purchase Requisition not found");
    return req;
  }

  /**
   * List requisitions with branch isolation — same shape as
   * PurchasingService.listPurchaseOrders.
   */
  async listRequisitions(query: {
    status?: PurchaseRequisitionStatus;
    branchId?: string;
    departmentId?: string;
    skip?: number;
    take?: number;
    userBranchId?: string;
    userPermissions?: string[];
  }) {
    const {
      status,
      branchId,
      departmentId,
      skip = 0,
      take = 50,
      userBranchId,
      userPermissions = [],
    } = query;

    const hasViewAll =
      userPermissions.includes("purchasing.requisition.approve_standard") ||
      userPermissions.includes("purchasing.requisition.approve_high_value") ||
      userPermissions.includes("purchasing.requisition.approve_executive") ||
      userPermissions.includes("purchasing.requisition.convert");
    const filterBranchId = branchId || userBranchId;

    if (!hasViewAll && filterBranchId !== userBranchId) {
      throw new AppError(
        ErrorCode.FORBIDDEN,
        403,
        "You can only view Purchase Requisitions from your branch",
      );
    }

    const where: Prisma.PurchaseRequisitionWhereInput = {
      ...(status && { status }),
      ...(departmentId && { departmentId }),
      ...(filterBranchId && { branchId: filterBranchId }),
    };

    const [requisitions, total] = await Promise.all([
      prisma.purchaseRequisition.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          requestedBy: true,
          approvedBy: true,
          department: true,
          _count: { select: { items: true } },
        },
      }),
      prisma.purchaseRequisition.count({ where }),
    ]);

    return { requisitions, total };
  }

  /**
   * Update Requisition Status (Submit, Approve, Reject, Cancel).
   * Enforces the same three protections purchasing.service.ts enforces on
   * POs: valid state-machine transition, no self-approval, and an
   * amount-threshold permission check.
   */
  async updateStatus(
    id: string,
    status: PurchaseRequisitionStatus,
    userId: string,
    userPermissions: string[] = [],
    rejectionReason?: string,
  ) {
    const req = await this.getRequisition(id);

    if (!this.isValidStateTransition(req.status, status)) {
      throw new AppError(
        ErrorCode.INVALID_STATUS,
        400,
        `Cannot transition from ${req.status} to ${status}. Valid transitions: ${VALID_STATE_TRANSITIONS[req.status]?.join(", ") || "None"}`,
      );
    }

    if (status === PurchaseRequisitionStatus.APPROVED) {
      if (req.requestedById === userId) {
        throw new AppError(
          ErrorCode.FORBIDDEN,
          403,
          "Segregation of Duties Violation: You cannot approve your own Purchase Requisition.",
        );
      }

      const approvalLevel = getApprovalLevel(req.estimatedTotal);
      const requiredPermission = `purchasing.requisition.approve_${approvalLevel}`;
      const hasRequiredPermission =
        userPermissions.includes(requiredPermission) ||
        userPermissions.includes("purchasing.requisition.approve_executive");

      if (!hasRequiredPermission) {
        throw new AppError(
          ErrorCode.FORBIDDEN,
          403,
          `Insufficient permission to approve this Requisition (Estimated: KSH ${req.estimatedTotal.toLocaleString()}). Requires '${requiredPermission}'.`,
        );
      }
    }

    if (status === PurchaseRequisitionStatus.REJECTED && !rejectionReason) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        "A rejection reason is required when rejecting a Purchase Requisition.",
      );
    }

    const updateData: Prisma.PurchaseRequisitionUpdateInput = { status };
    if (status === PurchaseRequisitionStatus.SUBMITTED) {
      updateData.submittedAt = new Date();
    } else if (status === PurchaseRequisitionStatus.APPROVED) {
      updateData.approvedBy = { connect: { id: userId } };
      updateData.approvedAt = new Date();
    } else if (status === PurchaseRequisitionStatus.REJECTED) {
      updateData.approvedBy = { connect: { id: userId } };
      updateData.rejectedReason = rejectionReason;
    }

    return prisma.purchaseRequisition.update({
      where: { id },
      data: updateData,
      include: {
        items: { include: { product: true } },
        requestedBy: true,
        approvedBy: true,
        department: true,
        branch: true,
      },
    });
  }

  /**
   * Convert an APPROVED requisition into a real vendor-bound PurchaseOrder.
   * This is where procurement's vendor knowledge gets applied — the
   * requisition itself never had one. Requires
   * 'purchasing.requisition.convert'.
   *
   * Line items must map 1:1 to the requisition's items and each needs a
   * real catalog productId (the requisition item's own productId is
   * optional/advisory — the PO always needs a concrete product since
   * PurchaseOrderItem.productId is required).
   */
  async convertToPurchaseOrder(
    id: string,
    userId: string,
    data: {
      vendorId: string;
      warehouseId?: string;
      items: { requisitionItemId: string; productId: string; unitPrice: number }[];
    },
  ) {
    return prisma.$transaction(
      async (tx) => {
        const req = await tx.purchaseRequisition.findUnique({
          where: { id },
          include: { items: true },
        });
        if (!req) throw new AppError(ErrorCode.NOT_FOUND, 404, "Purchase Requisition not found");
        if (req.status !== PurchaseRequisitionStatus.APPROVED) {
          throw new AppError(
            ErrorCode.INVALID_STATUS,
            400,
            `Requisition must be APPROVED to convert (current status: ${req.status}).`,
          );
        }

        const vendor = await tx.vendor.findUnique({ where: { id: data.vendorId } });
        if (!vendor || !vendor.isActive) {
          throw new AppError(ErrorCode.BAD_REQUEST, 400, "Invalid vendor");
        }

        let resolvedBranchId = req.branchId;
        if (data.warehouseId) {
          const warehouse = await tx.warehouse.findUnique({
            where: { id: data.warehouseId },
            select: { branchId: true },
          });
          if (!warehouse) {
            throw new AppError(ErrorCode.NOT_FOUND, 404, "Target warehouse not found");
          }
          resolvedBranchId = warehouse.branchId;
        }

        let subtotal = 0;
        const itemsData: Array<{
          productId: string;
          quantity: number;
          unitPrice: number;
          subtotal: number;
        }> = [];

        for (const line of data.items) {
          const reqItem = req.items.find((i) => i.id === line.requisitionItemId);
          if (!reqItem) {
            throw new AppError(
              ErrorCode.VALIDATION_ERROR,
              400,
              `Requisition line ${line.requisitionItemId} not found on this requisition`,
            );
          }

          const product = await tx.product.findUnique({
            where: { id: line.productId },
            select: { vendorId: true, name: true },
          });
          if (!product) {
            throw new AppError(ErrorCode.NOT_FOUND, 404, `Product ${line.productId} not found`);
          }
          if (product.vendorId !== data.vendorId) {
            throw new AppError(
              ErrorCode.VALIDATION_ERROR,
              400,
              `Product "${product.name}" does not belong to the selected vendor.`,
            );
          }

          const itemSubtotal = reqItem.quantity * line.unitPrice;
          subtotal += itemSubtotal;
          itemsData.push({
            productId: line.productId,
            quantity: reqItem.quantity,
            unitPrice: line.unitPrice,
            subtotal: itemSubtotal,
          });
        }

        const year = new Date().getFullYear();
        const count = await tx.purchaseOrder.count();
        const poNumber = `PO-${year}-${(count + 1).toString().padStart(5, "0")}`;

        const po = await tx.purchaseOrder.create({
          data: {
            poNumber,
            vendorId: data.vendorId,
            branchId: resolvedBranchId,
            destinationWarehouseId: data.warehouseId || null,
            departmentId: req.departmentId,
            projectCode: req.projectCode,
            sourceRequisitionId: req.id,
            requestedById: req.requestedById,
            status: PurchaseOrderStatus.DRAFT,
            subtotal,
            tax: subtotal * 0.16,
            total: subtotal * 1.16,
            notes: `Converted from requisition ${req.requisitionNumber}`,
            items: { create: itemsData },
          },
          include: { items: { include: { product: true } }, vendor: true },
        });

        await tx.purchaseRequisition.update({
          where: { id },
          data: { status: PurchaseRequisitionStatus.CONVERTED },
        });

        return po;
      },
      { timeout: 30000 },
    );
  }

  private isValidStateTransition(
    currentStatus: PurchaseRequisitionStatus,
    newStatus: PurchaseRequisitionStatus,
  ): boolean {
    return VALID_STATE_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
  }
}
