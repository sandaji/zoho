import { prisma } from "@core/database/db";
import { ApprovalStatus, ApprovalType } from "../../../generated/index.js";

const purchaseOrderApprovalType = ApprovalType.PO_APPROVAL;

export async function getPendingApprovalsForUser(userId: string) {
  return prisma.approvalRequest.findMany({
    where: {
      type: purchaseOrderApprovalType,
      status: ApprovalStatus.PENDING,
      requestedById: { not: userId },
    },
    include: {
      requestedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function approvePurchaseOrder(
  approvalId: string,
  userId: string,
  comments?: string,
) {
  return prisma.approvalRequest.update({
    where: { id: approvalId },
    data: {
      status: ApprovalStatus.APPROVED,
      approvedById: userId,
      notes: comments,
    },
  });
}

export async function rejectPurchaseOrder(
  approvalId: string,
  userId: string,
  reason: string,
) {
  return prisma.approvalRequest.update({
    where: { id: approvalId },
    data: {
      status: ApprovalStatus.REJECTED,
      approvedById: userId,
      notes: reason,
    },
  });
}

export async function getApprovalHistory(purchaseOrderId: string) {
  return prisma.approvalRequest.findMany({
    where: {
      type: purchaseOrderApprovalType,
      referenceId: purchaseOrderId,
    },
    include: {
      requestedBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
