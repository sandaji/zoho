import { prisma } from "../../../lib/db";
import { logger } from "../../../lib/logger";
import { AppError, ErrorCode } from "../../../lib/errors";

import { PurchaseOrderStatus } from "../../../generated";
import { PermissionService } from "../../auth/service/permission.service";
import { PurchasingService } from "../purchasing.service";
export enum ApprovalLevel {
  STANDARD = "standard",
  HIGH_VALUE = "high_value",
  EXECUTIVE = "executive",
}


  const permissions = await PermissionService.getUserPermissions(approverId);
  return new PurchasingService().updateStatus(
    approvalId,
    PurchaseOrderStatus.APPROVED,
    approverId,
    permissions,
  );
  if (level === ApprovalLevel.HIGH_VALUE) return ApprovalLevel.EXECUTIVE;
  return null;
}

export async function getApproversByLevel(
  level: ApprovalLevel,
): Promise<any[]> {
        : "super_admin";
  const permissions = await PermissionService.getUserPermissions(approverId);
  return new PurchasingService().updateStatus(
    approvalId,
    PurchaseOrderStatus.CANCELLED,
    approverId,
    permissions,
  );
}

export async function getPendingApprovalsForUser(
  userId: string,
): Promise<any[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { branchId: true, role: true },
  });
  if (!user) throw new AppError(ErrorCode.NOT_FOUND, 404, "User not found");

  const orders = await prisma.purchaseOrder.findMany({
    where: {
      status: "SUBMITTED",
      ...(user.role === "super_admin" || !user.branchId
        ? {}
        : { branchId: user.branchId }),
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      poNumber: true,
      total: true,
      createdAt: true,
      vendor: { select: { name: true } },
    },
  });

  return orders.map((order) => ({
    id: order.id,
    purchaseOrderId: order.id,
    poNumber: order.poNumber,
    vendorName: order.vendor.name,
    totalAmount: order.total,
    currentLevel: getApprovalLevel(order.total),
    createdAt: order.createdAt,
    purchaseOrder: {
      poNumber: order.poNumber,
      totalAmount: order.total,
      vendor: order.vendor,
    },
  }));
}

export async function getApprovalHistory(
  purchaseOrderId: string,
): Promise<any[]> {
  return prisma.approvalRequest.findMany({
    where: { referenceId: purchaseOrderId, type: "PO_APPROVAL" },
    orderBy: { createdAt: "asc" },
  });
}

export async function approvePurchaseOrder(
  approvalId: string,
  approverId: string,
  comments?: string,
): Promise<any> {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id: approvalId },
  });
  if (!order)
    throw new AppError(ErrorCode.NOT_FOUND, 404, "Purchase order not found");
  if (order.status !== "SUBMITTED") {
    throw new AppError(
      ErrorCode.OPERATION_NOT_ALLOWED,
      422,
      "Purchase order is no longer pending",
    );
  }
  logger.info({ approvalId, approverId, comments }, "Purchase order approved");
  return prisma.purchaseOrder.update({
    where: { id: approvalId },
    data: {
      status: "APPROVED",
      approvedById: approverId,
      approvedAt: new Date(),
    },
  });
}

export async function rejectPurchaseOrder(
  approvalId: string,
  approverId: string,
  reason: string,
): Promise<any> {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id: approvalId },
  });
  if (!order)
    throw new AppError(ErrorCode.NOT_FOUND, 404, "Purchase order not found");
  if (order.status !== "SUBMITTED") {
    throw new AppError(
      ErrorCode.OPERATION_NOT_ALLOWED,
      422,
      "Purchase order is no longer pending",
    );
  }
  logger.info({ approvalId, approverId, reason }, "Purchase order rejected");
  return prisma.purchaseOrder.update({
    where: { id: approvalId },
    data: { status: "CANCELLED" },
  });
}

export const PurchasingApprovalService = {
  getApprovalLevel,
  getNextApprovalLevel,
  getApproversByLevel,
  getPendingApprovalsForUser,
  getApprovalHistory,
  approvePurchaseOrder,
  rejectPurchaseOrder,
};
