/**
 * Purchasing Approval Workflow Service
 * Handles multi-level approval process for purchase orders using generic ApprovalRequest model
 */

import { prisma } from "../../../lib/db";
import { logger } from "../../../lib/logger";
import { AppError, ErrorCode } from "../../../lib/errors";

export enum ApprovalLevel {
  STANDARD = "standard", // < 10,000 KSH - Manager approval
  HIGH_VALUE = "high_value", // 10k-100k KSH - Director approval
  EXECUTIVE = "executive", // > 100k KSH - Executive/CEO approval
}

/**
 * Determine approval level based on PO total
 */
export function getApprovalLevel(poTotal: number): ApprovalLevel {
  if (poTotal < 10000) {
    return ApprovalLevel.STANDARD;
  } else if (poTotal < 100000) {
    return ApprovalLevel.HIGH_VALUE;
  } else {
    return ApprovalLevel.EXECUTIVE;
  }
}

/**
 * Get the next approval level in the chain
 */
export function getNextApprovalLevel(
  currentLevel: ApprovalLevel,
): ApprovalLevel | null {
  switch (currentLevel) {
    case ApprovalLevel.STANDARD:
      return ApprovalLevel.HIGH_VALUE;
    case ApprovalLevel.HIGH_VALUE:
      return ApprovalLevel.EXECUTIVE;
    case ApprovalLevel.EXECUTIVE:
      return null; // Final approval
  }
}

/**
 * Get required approvers for a specific approval level
 */
export async function getApproversByLevel(
  level: ApprovalLevel,
): Promise<any[]> {
  const roleMap: Record<ApprovalLevel, string> = {
    [ApprovalLevel.STANDARD]: "branch_manager",
    [ApprovalLevel.HIGH_VALUE]: "manager",
    [ApprovalLevel.EXECUTIVE]: "super_admin",
  };

  const role = roleMap[level];
  const approvers = await prisma.user.findMany({
    where: {
      role,
      systemAccessGranted: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  return approvers;
}

/**
 * Get pending approvals for a user based on their role
 */
export async function getPendingApprovalsForUser(
  userId: string,
): Promise<any[]> {
  try {
    // Get user's role
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(ErrorCode.NOT_FOUND, 404, "User not found");
    }

    // Map user role to approval levels they can approve
    const levelMap: Record<string, ApprovalLevel[]> = {
      branch_manager: [ApprovalLevel.STANDARD],
      manager: [ApprovalLevel.STANDARD, ApprovalLevel.HIGH_VALUE],
      super_admin: [
        ApprovalLevel.STANDARD,
        ApprovalLevel.HIGH_VALUE,
        ApprovalLevel.EXECUTIVE,
      ],
    };

    const approvableLevels = levelMap[user.role || ""] || [];

    if (approvableLevels.length === 0) {
      return [];
    }

    // Get pending approvals for purchasing (PO_APPROVAL type)
    const pendingApprovals = await prisma.approvalRequest.findMany({
      where: {
        type: "PO_APPROVAL",
        status: "PENDING",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Filter by level stored in data JSON
    return pendingApprovals.filter((approval) => {
      const data = approval.data as any;
      return data?.level && approvableLevels.includes(data.level);
    });
  } catch (error) {
    logger.error(error, "Error getting pending approvals");
    throw error;
  }
}

/**
 * Get approval history for a PO
 */
export async function getApprovalHistory(
  purchaseOrderId: string,
): Promise<any[]> {
  try {
    const history = await prisma.approvalRequest.findMany({
      where: {
        referenceId: purchaseOrderId,
        type: "PO_APPROVAL",
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return history;
  } catch (error) {
    logger.error(error, "Error getting approval history");
    throw error;
  }
}

/**
 * Approve a purchase order
 */
export async function approvePurchaseOrder(
  approvalRequestId: string,
  approverId: string,
  comments?: string,
): Promise<any> {
  try {
    const approval = await prisma.approvalRequest.findUnique({
      where: { id: approvalRequestId },
    });

    if (!approval) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        404,
        "Approval request not found",
      );
    }

    if (approval.status !== "PENDING") {
      throw new AppError(
        ErrorCode.OPERATION_NOT_ALLOWED,
        422,
        `Cannot approve: current status is ${approval.status}`,
      );
    }

    // Update approval request
    const dataObj =
      typeof approval.data === "string"
        ? JSON.parse(approval.data)
        : approval.data;
    const updated = await prisma.approvalRequest.update({
      where: { id: approvalRequestId },
      data: {
        status: "APPROVED",
        approvedById: approverId,
        data: {
          ...dataObj,
          approvedAt: new Date().toISOString(),
          comments,
        },
      },
    });

    logger.info(
      { approvalId: approvalRequestId, approverId },
      "Purchase order approved",
    );

    return updated;
  } catch (error) {
    logger.error(error, "Error approving purchase order");
    throw error;
  }
}

/**
 * Reject a purchase order
 */
export async function rejectPurchaseOrder(
  approvalRequestId: string,
  approverId: string,
  rejectionReason: string,
): Promise<any> {
  try {
    const approval = await prisma.approvalRequest.findUnique({
      where: { id: approvalRequestId },
    });

    if (!approval) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        404,
        "Approval request not found",
      );
    }

    if (approval.status !== "PENDING") {
      throw new AppError(
        ErrorCode.OPERATION_NOT_ALLOWED,
        422,
        `Cannot reject: current status is ${approval.status}`,
      );
    }

    const dataObj =
      typeof approval.data === "string"
        ? JSON.parse(approval.data)
        : approval.data;
    const updated = await prisma.approvalRequest.update({
      where: { id: approvalRequestId },
      data: {
        status: "REJECTED",
        approvedById: approverId,
        data: {
          ...dataObj,
          rejectedAt: new Date().toISOString(),
          rejectionReason,
        },
      },
    });

    logger.info(
      {
        approvalId: approvalRequestId,
        approverId,
        reason: rejectionReason,
      },
      "Purchase order rejected",
    );

    return updated;
  } catch (error) {
    logger.error(error, "Error rejecting purchase order");
    throw error;
  }
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
