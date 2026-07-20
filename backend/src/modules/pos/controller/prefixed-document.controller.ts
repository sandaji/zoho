/**
 * PrefixedDocumentController
 *
 * Handles creation of invoices and quotations that embed the salesman's
 * personal prefix in the document number (e.g. INV-VIN-0042).
 *
 * POST /sales-documents/invoices/prefixed
 * POST /sales-documents/quotations/prefixed
 * GET  /sales-documents/invoices/prefixed/preview
 * PATCH /sales-documents/users/:userId/prefix
 */

import { Request, Response, NextFunction } from "express";
import { prisma } from "../../../lib/db";
import { AppError, ErrorCode } from "../../../lib/errors";
import { UserPrefixSequencer } from "../../../lib/sequencer";
import {
  SalesDocumentType,
  SalesDocumentStatus,
  PaymentStatus,
  MovementType,
} from "../../../generated";
import { getCompanyInfo } from "../../../config/company.config";
import { logger } from "../../../lib/logger";

// ── Types ────────────────────────────────────────────────────────────────────

interface LineItemInput {
  productId: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number; // defaults to product's tax_rate (16%)
  discount?: number; // line-level discount amount
}

interface CreatePrefixedDocumentDTO {
  branchId: string;
  customerId?: string;
  issueDate?: string;
  dueDate?: string;
  notes?: string;
  items: LineItemInput[];
  // Invoice-only
  paymentMethod?: string;
  payment_method?: string;
  amountPaid?: number;
  amount_paid?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function calcItemTotals(item: LineItemInput, productTaxRate: number) {
  const taxRate = item.taxRate ?? productTaxRate;
  const subtotal = item.quantity * item.unitPrice;
  const discount = item.discount ?? 0;
  const taxableAmount = Math.max(subtotal - discount, 0);
  const taxAmt = taxableAmount * taxRate;
  const total = subtotal + taxAmt - discount;
  return { subtotal, taxAmount: taxAmt, discount, total, taxRate };
}

function calcDocumentTotals(lines: ReturnType<typeof calcItemTotals>[]) {
  const subtotal = lines.reduce((s, l) => s + l.subtotal, 0);
  const tax = lines.reduce((s, l) => s + l.taxAmount, 0);
  const discount = lines.reduce((s, l) => s + l.discount, 0);
  return { subtotal, tax, discount, total: subtotal + tax - discount };
}

// ── Controller ────────────────────────────────────────────────────────────────

export class PrefixedDocumentController {
  /**
   * POST /sales-documents/invoices/prefixed
   * Create a POS-paid invoice with the salesman's prefix in the document ID.
   * Deducts from BranchInventory (FIFO stock depletion via Inventory table).
   */
  async createPrefixedInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user)
        throw new AppError(ErrorCode.UNAUTHORIZED, 401, "Not authenticated");

      const userId = req.user.userId;
      const body = req.body as CreatePrefixedDocumentDTO;

      const branchId = body.branchId || (body as any).branch_id;
      const paymentMethod = body.paymentMethod || (body as any).payment_method;
      const amountPaid = body.amountPaid ?? (body as any).amount_paid;

      // ── Validate required fields ──
      if (!branchId)
        throw new AppError(
          ErrorCode.INVALID_INPUT,
          400,
          "branchId is required",
        );
      if (!body.items?.length)
        throw new AppError(
          ErrorCode.INVALID_INPUT,
          400,
          "At least one item is required",
        );

      // ── Validate & hydrate items ──
      const hydratedItems = await this._hydrateItems(body.items, branchId);

      // ── Compute totals ──
      const lines = hydratedItems.map((h) =>
        calcItemTotals(h.input, h.product.tax_rate),
      );
      const totals = calcDocumentTotals(lines);

      // ── Generate prefixed document ID ──
      const { documentId, userPrefix } = await UserPrefixSequencer.getNext(
        userId,
        branchId,
        SalesDocumentType.INVOICE,
      );

      // ── Persist inside a single transaction ──
      const invoice = await prisma.$transaction(
        async (tx) => {
          // 1. Create the SalesDocument
          const doc = await tx.salesDocument.create({
            data: {
              documentId,
              type: SalesDocumentType.INVOICE,
              status: SalesDocumentStatus.PAID,
              paymentStatus: PaymentStatus.PAID,
              branchId: body.branchId,
              customerId: body.customerId ?? null,
              createdById: userId,
              issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
              dueDate: body.dueDate ? new Date(body.dueDate) : null,
              subtotal: totals.subtotal,
              tax: totals.tax,
              discount: totals.discount,
              total: totals.total,
              balance: 0,
              paidAmount: amountPaid ?? totals.total,
              notes: body.notes ?? null,
              items: {
                create: hydratedItems.map((h, idx) => ({
                  productId: h.product.id,
                  description: h.input.description ?? h.product.name,
                  quantity: h.input.quantity,
                  unitPrice: h.input.unitPrice,
                  taxRate: lines[idx]!.taxRate,
                  subtotal: lines[idx]!.subtotal,
                  taxAmount: lines[idx]!.taxAmount,
                  discount: lines[idx]!.discount,
                  total: lines[idx]!.total,
                })),
              },
            },
            include: { items: true, customer: true },
          });

          // 2. Record payment
          if (body.paymentMethod) {
            await tx.payment.create({
              data: {
                salesDocumentId: doc.id,
                amount: body.amountPaid ?? totals.total,
                method: body.paymentMethod as any,
                paymentDate: new Date(),
                createdById: userId,
              },
            });
          }

          // 3. Deduct from warehouse inventory using FIFO across stock batches + create stock movements
          // Batched approach to reduce N+1 queries
          const batches = await tx.stockBatch.findMany({
            where: { warehouse: { branchId: body.branchId, isActive: true } },
            orderBy: { receivedAt: "asc" },
            select: {
              id: true,
              productId: true,
              warehouseId: true,
              currentQuantity: true,
              unitCost: true,
            },
          });

          // Collect all batch updates, inventory updates, and stock movements
          const batchUpdates: Array<{ id: string; newQuantity: number; isDepleted: boolean }> = [];
          const inventoryUpdates: Map<string, { quantity: number; available: number }> = new Map();
          const branchInventoryUpdates: Map<string, { quantity: number; available: number }> = new Map();
          const stockMovements: Array<{
            type: MovementType;
            quantity: number;
            productId: string;
            warehouseId: string;
            salesId: string;
            reference: string;
            createdById: string;
          }> = [];

          for (const { product, input } of hydratedItems) {
            let remaining = input.quantity;

            // Filter batches for this product and branch
            const productBatches = batches.filter(
              (b) => b.productId === product.id && b.currentQuantity > 0,
            );

            const candidateBatches =
              productBatches.length > 0
                ? productBatches
                : await tx.stockBatch.findMany({
                    where: {
                      productId: product.id,
                      isDepleted: false,
                      warehouse: { branchId: body.branchId, isActive: true },
                    },
                    orderBy: { receivedAt: "asc" },
                  });

            for (const batch of candidateBatches as any) {
              if (remaining <= 0) break;
              const take = Math.min(remaining, batch.currentQuantity);

              // Collect batch update
              batchUpdates.push({
                id: batch.id,
                newQuantity: batch.currentQuantity - take,
                isDepleted: batch.currentQuantity - take === 0,
              });

              // Collect inventory update
              const invKey = `${product.id}_${batch.warehouseId}`;
              const currentInv = inventoryUpdates.get(invKey);
              if (!currentInv) {
                inventoryUpdates.set(invKey, { quantity: -take, available: -take });
              } else {
                inventoryUpdates.set(invKey, {
                  quantity: currentInv.quantity - take,
                  available: currentInv.available - take,
                });
              }

              // Collect branch inventory update
              const brInvKey = `${product.id}_${body.branchId}`;
              const currentBrInv = branchInventoryUpdates.get(brInvKey);
              if (!currentBrInv) {
                branchInventoryUpdates.set(brInvKey, { quantity: -take, available: -take });
              } else {
                branchInventoryUpdates.set(brInvKey, {
                  quantity: currentBrInv.quantity - take,
                  available: currentBrInv.available - take,
                });
              }

              // Collect stock movement
              stockMovements.push({
                type: MovementType.OUTBOUND,
                quantity: take,
                productId: product.id,
                warehouseId: batch.warehouseId,
                salesId: doc.id,
                reference: `Invoice ${documentId}`,
                createdById: userId,
              });

              remaining -= take;
            }

            if (remaining > 0) {
              throw new AppError(
                ErrorCode.INVALID_OPERATION,
                422,
                `Insufficient stock for product ${product.name}`,
              );
            }
          }

          // Execute batch updates
          // 1. Update stock batches
          for (const update of batchUpdates) {
            await tx.stockBatch.update({
              where: { id: update.id },
              data: {
                currentQuantity: update.newQuantity,
                isDepleted: update.isDepleted,
              },
            });
          }

          // 2. Update inventory records (batch fetch + batch update)
          if (inventoryUpdates.size > 0) {
            const inventoryKeys = Array.from(inventoryUpdates.keys());
            const existingInventories = await tx.inventory.findMany({
              where: {
                OR: inventoryKeys.map((key) => {
                  const [productId, warehouseId] = key.split('_');
                  return { productId, warehouseId };
                }),
              },
              select: { id: true, productId: true, warehouseId: true, quantity: true, available: true },
            });

            for (const inv of existingInventories) {
              const key = `${inv.productId}_${inv.warehouseId}`;
              const update = inventoryUpdates.get(key);
              if (update) {
                await tx.inventory.update({
                  where: { id: inv.id },
                  data: {
                    quantity: inv.quantity + update.quantity,
                    available: inv.available + update.available,
                  },
                });
              }
            }
          }

          // 3. Update branch inventory records (batch fetch + batch update)
          if (branchInventoryUpdates.size > 0) {
            const branchInvKeys = Array.from(branchInventoryUpdates.keys());
            const existingBranchInventories = await tx.branchInventory.findMany({
              where: {
                OR: branchInvKeys.map((key) => {
                  const [productId, branchId] = key.split('_');
                  return { productId, branchId };
                }),
              },
              select: { id: true, productId: true, branchId: true, quantity: true, available: true },
            });

            for (const brInv of existingBranchInventories) {
              const key = `${brInv.productId}_${brInv.branchId}`;
              const update = branchInventoryUpdates.get(key);
              if (update) {
                await tx.branchInventory.update({
                  where: { id: brInv.id },
                  data: {
                    quantity: brInv.quantity + update.quantity,
                    available: brInv.available + update.available,
                  },
                });
              }
            }
          }

          // 4. Create stock movements
          for (const movement of stockMovements) {
            await tx.stockMovement.create({ data: movement });
          }

          return doc;
        },
        { timeout: 20000 },
      );

      logger.info(
        { documentId, userId, branchId: body.branchId, userPrefix },
        "Prefixed invoice created",
      );

      res.status(201).json({ success: true, data: invoice });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /sales-documents/quotations/prefixed
   * Create a quotation with the salesman's prefix in the document ID.
   * Does NOT touch inventory — quotations are non-committing.
   */
  async createPrefixedQuotation(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      if (!req.user)
        throw new AppError(ErrorCode.UNAUTHORIZED, 401, "Not authenticated");

      const userId = req.user.userId;
      const body = req.body as CreatePrefixedDocumentDTO;

      if (!body.branchId)
        throw new AppError(
          ErrorCode.INVALID_INPUT,
          400,
          "branchId is required",
        );
      if (!body.items?.length)
        throw new AppError(
          ErrorCode.INVALID_INPUT,
          400,
          "At least one item is required",
        );

      const hydratedItems = await this._hydrateItems(body.items, body.branchId);
      const lines = hydratedItems.map((h) =>
        calcItemTotals(h.input, h.product.tax_rate),
      );
      const totals = calcDocumentTotals(lines);

      const { documentId, userPrefix } = await UserPrefixSequencer.getNext(
        userId,
        body.branchId,
        SalesDocumentType.QUOTE,
      );

      // Quotation valid for 3 days by default
      const issueDate = body.issueDate ? new Date(body.issueDate) : new Date();
      const dueDate = body.dueDate
        ? new Date(body.dueDate)
        : new Date(issueDate.getTime() + 3 * 24 * 60 * 60 * 1000);

      const quotation = await prisma.salesDocument.create({
        data: {
          documentId,
          type: SalesDocumentType.QUOTE,
          status: SalesDocumentStatus.SENT,
          branchId: body.branchId,
          customerId: body.customerId ?? null,
          createdById: userId,
          issueDate,
          dueDate,
          subtotal: totals.subtotal,
          tax: totals.tax,
          discount: totals.discount,
          total: totals.total,
          balance: totals.total,
          notes: body.notes ?? null,
          items: {
            create: hydratedItems.map((h, idx) => ({
              productId: h.product.id,
              description: h.input.description ?? h.product.name,
              quantity: h.input.quantity,
              unitPrice: h.input.unitPrice,
              taxRate: lines[idx]!.taxRate,
              subtotal: lines[idx]!.subtotal,
              taxAmount: lines[idx]!.taxAmount,
              discount: lines[idx]!.discount,
              total: lines[idx]!.total,
            })),
          },
        },
        include: { items: true, customer: true },
      });

      logger.info(
        { documentId, userId, branchId: body.branchId, userPrefix },
        "Prefixed quotation created",
      );

      res.status(201).json({ success: true, data: quotation });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /sales-documents/invoices/prefixed/preview
   * Returns what the NEXT prefixed ID will look like without consuming it.
   */
  async previewNextId(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user)
        throw new AppError(ErrorCode.UNAUTHORIZED, 401, "Not authenticated");

      const branchId = req.query.branchId as string;
      const typeStr = (req.query.type as string)?.toUpperCase() ?? "INVOICE";

      if (!branchId)
        throw new AppError(
          ErrorCode.INVALID_INPUT,
          400,
          "branchId is required",
        );

      const type = typeStr as SalesDocumentType;
      const preview = await UserPrefixSequencer.preview(
        req.user.userId,
        branchId,
        type,
      );

      res.json({ success: true, data: { preview, type } });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /sales-documents/users/:userId/prefix
   * Admin-only: set or update a user's salesPrefix.
   */
  async setUserPrefix(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user)
        throw new AppError(ErrorCode.UNAUTHORIZED, 401, "Not authenticated");

      const { userId } = req.params as { userId: string };
      const { prefix } = req.body as { prefix: string };

      if (!prefix)
        throw new AppError(ErrorCode.INVALID_INPUT, 400, "prefix is required");

      const clean = UserPrefixSequencer.validatePrefix(prefix);

      // Check uniqueness (Prisma unique constraint also guards this, but give a friendly error)
      const existing = await prisma.user.findFirst({
        where: { salesPrefix: clean, id: { not: userId } },
        select: { name: true },
      });
      if (existing) {
        throw new AppError(
          ErrorCode.ALREADY_EXISTS,
          409,
          `Sales prefix "${clean}" is already in use by ${existing.name}.`,
        );
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { salesPrefix: clean },
        select: { id: true, name: true, email: true, salesPrefix: true },
      });

      logger.info({ userId, prefix: clean }, "Sales prefix updated");

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async _hydrateItems(items: LineItemInput[], branchId: string) {
    const hydrated: {
      input: LineItemInput;
      product: { id: string; name: string; tax_rate: number; sku: string };
    }[] = [];

    for (const item of items) {
      if (!item.productId)
        throw new AppError(
          ErrorCode.INVALID_INPUT,
          400,
          "Each item must have a productId",
        );
      if (item.quantity <= 0)
        throw new AppError(
          ErrorCode.INVALID_INPUT,
          400,
          `Quantity must be > 0 for product ${item.productId}`,
        );
      if (item.unitPrice < 0)
        throw new AppError(
          ErrorCode.INVALID_INPUT,
          400,
          `Unit price must be >= 0 for product ${item.productId}`,
        );

      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: {
          id: true,
          name: true,
          tax_rate: true,
          sku: true,
          status: true,
        },
      });

      if (!product)
        throw new AppError(
          ErrorCode.NOT_FOUND,
          404,
          `Product ${item.productId} not found`,
        );
      if (product.status === "discontinued")
        throw new AppError(
          ErrorCode.OPERATION_NOT_ALLOWED,
          422,
          `Product ${product.name} is discontinued`,
        );

      hydrated.push({ input: item, product });
    }

    return hydrated;
  }
}
