import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { SalesService } from './sales.service.js';
import { AppError, ErrorCode } from '../../lib/errors.js';

const prisma = new PrismaClient();
const salesService = new SalesService(prisma);

/**
 * Sales Controller - Handles HTTP requests for sales operations
 */
export class SalesController {
  /**
   * Create a new sales order
   * POST /v1/sales/orders
   */
  static async createSalesOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(
          ErrorCode.UNAUTHORIZED,
          401,
          'User not authenticated'
        );
      }

      const { customerId, branchId, items, notes } = req.body;

      const salesOrder = await salesService.createSalesOrder({
        customerId,
        branchId: branchId || req.user.branchId,
        items,
        notes,
        createdById: req.user.userId,
      });

      res.status(201).json({
        success: true,
        data: salesOrder,
        message: 'Sales order created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List sales orders
   * GET /v1/sales/orders
   */
  static async listSalesOrders(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(
          ErrorCode.UNAUTHORIZED,
          401,
          'User not authenticated'
        );
      }

      const { status, page, limit } = req.query;

      // Use user's branch if branch-scoped (unless admin/global access)
      const branchId =
        req.authorizedBranchIds && req.authorizedBranchIds.length > 0
          ? req.authorizedBranchIds[0]
          : undefined;

      const result = await salesService.listSalesOrders(
        branchId,
        typeof status === 'string' ? status : undefined,
        typeof page === 'string' ? parseInt(page) : 1,
        typeof limit === 'string' ? parseInt(limit) : 50
      );

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a specific sales order
   * GET /v1/sales/orders/:id
   */
  static async getSalesOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(
          ErrorCode.UNAUTHORIZED,
          401,
          'User not authenticated'
        );
      }

      const { id } = req.params;
      const salesOrder = await salesService.getSalesOrderById(id);

      res.json({
        success: true,
        data: salesOrder,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Dispatch goods for a sales order
   * POST /v1/sales/orders/:id/dispatch
   * 
   * RBAC: Only WAREHOUSE_CLERK, WAREHOUSE_MANAGER, or ADMIN
   * 
   * Request body:
   * {
   *   warehouseId: string,
   *   items: [
   *     { soItemId: string, qtyToDispatch: number },
   *     ...
   *   ],
   *   notes?: string
   * }
   */
  static async dispatchSalesOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(
          ErrorCode.UNAUTHORIZED,
          401,
          'User not authenticated'
        );
      }

      const { id } = req.params;
      const { warehouseId, items, notes } = req.body;

      // Validate required fields
      if (!warehouseId || !items || items.length === 0) {
        throw new AppError(
          ErrorCode.INVALID_INPUT,
          400,
          'Warehouse ID and items are required'
        );
      }

      // Validate item structure
      for (const item of items) {
        if (!item.soItemId || typeof item.qtyToDispatch !== 'number') {
          throw new AppError(
            ErrorCode.INVALID_INPUT,
            400,
            'Each item must have soItemId and qtyToDispatch'
          );
        }

        if (item.qtyToDispatch <= 0) {
          throw new AppError(
            ErrorCode.INVALID_INPUT,
            400,
            'Dispatch quantity must be greater than 0'
          );
        }
      }

      const dispatchNote = await salesService.dispatchSalesOrder({
        soId: id,
        warehouseId,
        items,
        dispatchedById: req.user.userId,
        notes,
      });

      res.status(201).json({
        success: true,
        data: dispatchNote,
        message: `Dispatch note ${dispatchNote.dnNumber} created successfully`,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default SalesController;
