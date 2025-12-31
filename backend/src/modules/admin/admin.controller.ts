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
      const result = await prisma.$transaction([
        prisma.branch.count({ where: { isActive: true } }),
        prisma.warehouse.count({ where: { isActive: true } }),
        prisma.user.count({ where: { isActive: true } }),
        prisma.product.count({ where: { isActive: true } }),
        prisma.delivery.count({ where: { status: { in: ['pending', 'assigned', 'in_transit'] } } }),
        prisma.$queryRaw`SELECT COUNT(*) as count FROM products WHERE "isActive" = true AND quantity <= reorder_level`,
      ]);

      const [
        total_branches,
        total_warehouses,
        total_users,
        total_products,
        pending_deliveries,
        low_stock_items_result,
      ] = result;

      let low_stock_items = 0;
      if (Array.isArray(low_stock_items_result) && low_stock_items_result.length > 0) {
        const row = low_stock_items_result[0] as { count: any };
        low_stock_items = Number(row.count || 0);
      }

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

  async listBranches(_req: Request, res: Response, _next: NextFunction) {
    res.json({ message: 'Not implemented' });
  }
  async listWarehouses(_req: Request, res: Response, _next: NextFunction) {
    res.json({ message: 'Not implemented' });
  }
  async listUsers(_req: Request, res: Response, _next: NextFunction) {
    res.json({ message: 'Not implemented' });
  }
  async listProducts(_req: Request, res: Response, _next: NextFunction) {
    res.json({ message: 'Not implemented' });
  }
  async listDeliveries(_req: Request, res: Response, _next: NextFunction) {
    res.json({ message: 'Not implemented' });
  }
  async listFinanceTransactions(_req: Request, res: Response, _next: NextFunction) {
    res.json({ message: 'Not implemented' });
  }
  async listPayroll(_req: Request, res: Response, _next: NextFunction) {
    res.json({ message: 'Not implemented' });
  }
} 