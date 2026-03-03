import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/db';
import { logger } from '../../lib/logger';

/**
 * Controller for admin-related operations.
 */
export class AdminController {
  /**
   * Gets high-level statistics for the admin dashboard.
   * This method is optimized to run all count queries in parallel.
   */
  async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await Promise.all([
        prisma.branch.count({ where: { isActive: true } }),
        prisma.warehouse.count({ where: { isActive: true } }),
        prisma.user.count({ where: { isActive: true } }),
        prisma.product.count({ where: { isActive: true } }),
        prisma.delivery.count({ where: { status: { in: ['pending', 'assigned', 'in_transit'] } } }),
        prisma.branchInventory.count({ where: { status: 'low_stock' } }),
      ]);

      const [
        total_branches,
        total_warehouses,
        total_users,
        total_products,
        pending_deliveries,
        low_stock_items,
      ] = result;

      res.status(200).json({
        total_branches,
        total_warehouses,
        total_users,
        total_products,
        pending_deliveries,
        low_stock_items,
      });
    } catch (error) {
      logger.error(error as Error, 'Error in getStats');
      next(error);
    }
  }

  // --- Placeholder methods based on routes/index.ts ---
  // In a real scenario, these would have full implementations.

  async listBranches(_req: Request, res: Response, next: NextFunction) {
    try {
      const branches = await prisma.branch.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
      res.json({
        success: true,
        data: { branches },
      });
    } catch (error) {
      next(error);
    }
  }

  async listWarehouses(req: Request, res: Response, next: NextFunction) {
    try {
      const { branchId } = req.query;
      const warehouses = await prisma.warehouse.findMany({
        where: {
          isActive: true,
          ...(branchId ? { branchId: branchId as string } : {}),
        },
        include: { branch: { select: { name: true } } },
        orderBy: { name: 'asc' },
      });
      res.json({
        success: true,
        data: warehouses,
      });
    } catch (error) {
      next(error);
    }
  }

  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { role, branchId } = req.query;
      const users = await prisma.user.findMany({
        where: {
          isActive: true,
          ...(role ? { role: role as string } : {}),
          ...(branchId ? { branchId: branchId as string } : {}),
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          branchId: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { name: 'asc' },
      });
      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      next(error);
    }
  }

  async listProducts(_req: Request, res: Response, next: NextFunction) {
    try {
      const products = await prisma.product.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
      res.json({
        success: true,
        data: products,
      });
    } catch (error) {
      next(error);
    }
  }

  async listDeliveries(_req: Request, res: Response, next: NextFunction) {
    try {
      const deliveries = await prisma.delivery.findMany({
        include: {
          truck: { select: { registration: true } },
          driver: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }) as any[];
      res.json({
        success: true,
        data: deliveries,
      });
    } catch (error) {
      next(error);
    }
  }
  async listFinanceTransactions(_req: Request, res: Response, _next: NextFunction) {
    res.json({ message: 'Not implemented' });
  }
  async listPayroll(_req: Request, res: Response, _next: NextFunction) {
    res.json({ message: 'Not implemented' });
  }
} 