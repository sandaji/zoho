import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/db";
import { verifyToken } from "../../../../../../lib/auth";
import { logAudit } from "../../../../../../lib/audit";

interface ReceiveLineItem {
  poItemId: string;
  qtyReceived: number;
  warehouseId: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: purchaseOrderId } = await params;
    const token = req.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { error: "Missing authorization token" },
        { status: 401 }
      );
    }

    // Verify token and get user
    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // RBAC: Only WAREHOUSE_CLERK, WAREHOUSE_MANAGER, ADMIN can receive goods
    const allowedRoles = ["WAREHOUSE_CLERK", "WAREHOUSE_MANAGER", "ADMIN"];
    const userRoles = await prisma.roleAssignment.findMany({
      where: { userId: user.userId },
      include: { role: true },
    });

    const hasPermission = userRoles.some((ra) =>
      allowedRoles.includes(ra.role.code.toUpperCase())
    );

    if (!hasPermission) {
      return NextResponse.json(
        {
          error: "Insufficient permissions. Only warehouse staff can receive goods.",
        },
        { status: 403 }
      );
    }

    const { lineItems, notes, allowOverReceive } = await req.json();

    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json(
        { error: "Invalid or empty line items" },
        { status: 400 }
      );
    }

    // Validate PO exists
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!po) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    // Validate PO is in receivable status
    if (!["APPROVED", "PARTIALLY_RECEIVED"].includes(po.status)) {
      return NextResponse.json(
        {
          error: `Cannot receive goods for PO in ${po.status} status. Must be APPROVED or PARTIALLY_RECEIVED.`,
        },
        { status: 400 }
      );
    }

    // Validate quantities
    for (const item of lineItems) {
      const poItem = po.items.find((pi) => pi.id === item.poItemId);
      if (!poItem) {
        return NextResponse.json(
          { error: `PO item ${item.poItemId} not found` },
          { status: 400 }
        );
      }

      const remaining = poItem.quantity - poItem.receivedQuantity;
      if (item.qtyReceived > remaining && !allowOverReceive) {
        return NextResponse.json(
          {
            error: `Cannot receive ${item.qtyReceived} units for ${poItem.product.name}. Only ${remaining} units remaining.`,
          },
          { status: 400 }
        );
      }
    }

    // ====================================================================
    // ACID TRANSACTION: Create GRN and update stock atomically
    // ====================================================================
    const result = await prisma.$transaction(async (tx) => {
      // Generate GRN number
      const lastGRN = await tx.goodsReceiptNote.findFirst({
        orderBy: { createdAt: "desc" },
        select: { grnNumber: true },
      });

      const grnNumber =
        "GRN-" +
        (lastGRN
          ? (parseInt(lastGRN.grnNumber.split("-")[1]) + 1)
            .toString()
            .padStart(6, "0")
          : "000001");

      // 1. Create GRN
      const grn = await tx.goodsReceiptNote.create({
        data: {
          grnNumber,
          purchaseOrderId,
          receivedById: user.userId,
          notes,
          status: "COMPLETED",
        },
      });

      // 2. Create GRN Items and update PO Items
      const grnItems: any[] = [];
      let totalReceived = 0;
      let totalExpected = 0;

      for (const item of lineItems) {
        const poItem = po.items.find((pi) => pi.id === item.poItemId);
        if (!poItem) continue;

        // Create GRN Item
        const grnItem = await tx.gRNItem.create({
          data: {
            grnId: grn.id,
            poItemId: item.poItemId,
            productId: poItem.productId,
            qtyReceived: item.qtyReceived,
          },
        });

        grnItems.push(grnItem);

        // Update PO Item received quantity
        const newReceivedQty = poItem.receivedQuantity + item.qtyReceived;
        await tx.purchaseOrderItem.update({
          where: { id: item.poItemId },
          data: { receivedQuantity: newReceivedQty },
        });

        totalReceived += newReceivedQty;
        totalExpected += poItem.quantity;

        // 3. Upsert Inventory
        await tx.inventory.upsert({
          where: {
            productId_warehouseId: {
              productId: poItem.productId,
              warehouseId: item.warehouseId,
            },
          },
          update: {
            quantity: {
              increment: item.qtyReceived,
            },
            updatedAt: new Date(),
          },
          create: {
            productId: poItem.productId,
            warehouseId: item.warehouseId,
            quantity: item.qtyReceived,
          },
        });
      }

      // 4. Update PO status
      let newStatus: "PARTIALLY_RECEIVED" | "RECEIVED" = "PARTIALLY_RECEIVED";
      if (totalReceived === totalExpected) {
        newStatus = "RECEIVED";
      }

      const updatedPO = await tx.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: { status: newStatus },
      });

      return { grn, grnItems, updatedPO };
    });

    // Log audit
    await logAudit({
      entityType: "GoodsReceiptNote",
      entityId: result.grn.id,
      action: "CREATE",
      userId: user.userId,
      changes: {
        grnNumber: result.grn.grnNumber,
        purchaseOrderId,
        itemsReceived: result.grnItems.length,
        newPOStatus: result.updatedPO.status,
      },
    });

    return NextResponse.json(
      {
        success: true,
        grn: result.grn,
        items: result.grnItems,
        updatedPOStatus: result.updatedPO.status,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Receive goods error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to receive goods",
      },
      { status: 500 }
    );
  }
}

// Get PO details with GRN history
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: purchaseOrderId } = await params;
    const token = req.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { error: "Missing authorization token" },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: {
        vendor: true,
        branch: true,
        requestedBy: { select: { id: true, email: true, name: true } },
        approvedBy: { select: { id: true, email: true, name: true } },
        items: {
          include: {
            product: true,
            grnItems: {
              include: { goodsReceiptNote: true },
            },
          },
        },
        grns: {
          include: {
            receivedBy: { select: { id: true, email: true, name: true } },
            items: { include: { product: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!po) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(po);
  } catch (error) {
    console.error("Get PO error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch PO details",
      },
      { status: 500 }
    );
  }
}
