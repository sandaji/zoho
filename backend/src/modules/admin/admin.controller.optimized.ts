/**
 * Optimized Admin Controller
 * Using PostgreSQL-specific optimizations for lightning-fast stats
 */

import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib/db.js";
import { logger } from "../../lib/logger.js";

export class AdminController {
  private prisma = prisma;

  // Cache stats for 30 seconds to reduce database load
  private statsCache: {
    data: any;
    timestamp: number;
  } | null = null;

  private readonly CACHE_TTL = 30000; // 30 seconds

  /**
   * GET /admin/stats - Get dashboard statistics (SUPER OPTIMIZED)
   * Uses a single query with PostgreSQL aggregate functions
   */
  async getStats(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Check cache first
      const now = Date.now();
      if (this.statsCache && (now - this.statsCache.timestamp) < this.CACHE_TTL) {
        logger.debug("Returning cached stats");
        res.json({
          success: true,
          data: this.statsCache.data,
          cached: true,
        });
        return;
      }

      // Single optimized query using LATERAL joins and aggregates
      const result = await this.prisma.$queryRaw<Array<{
        total_branches: bigint;
        total_warehouses: bigint;
        total_users: bigint;
        total_products: bigint;
        pending_deliveries: bigint;
        low_stock_items: bigint;
      }>>`
        SELECT 
          (SELECT COUNT(*) FROM "branches" WHERE "isActive" = true) as total_branches,
          (SELECT COUNT(*) FROM "warehouses" WHERE "isActive" = true) as total_warehouses,
          (SELECT COUNT(*) FROM "users" WHERE "isActive" = true) as total_users,
          (SELECT COUNT(*) FROM "products" WHERE "isActive" = true) as total_products,
          (SELECT COUNT(*) FROM "deliveries" WHERE "status" IN ('pending', 'assigned', 'in_transit')) as pending_deliveries,
          (SELECT COUNT(*) FROM "products" WHERE "isActive" = true AND "quantity" <= "reorder_level") as low_stock_items
      `;

      // Convert BigInt to Number
      const firstResult = result[0];
      if (!firstResult) {
        res.status(500).json({
          success: false,
          error: "No results returned from database"
        });
        return;
      }

      const stats = {
        totalBranches: Number(firstResult.total_branches),
        totalWarehouses: Number(firstResult.total_warehouses),
        totalUsers: Number(firstResult.total_users),
        totalProducts: Number(firstResult.total_products),
        pendingDeliveries: Number(firstResult.pending_deliveries),
        lowStockItems: Number(firstResult.low_stock_items),
      };

      // Update cache
      this.statsCache = {
        data: stats,
        timestamp: now,
      };

      res.json({
        success: true,
        data: stats,
        cached: false,
      });
    } catch (error) {
      logger.error(error, "Error fetching stats:");
      next(error);
    }
  }

  /**
   * GET /branches - List all branches
   */
  async listBranches(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const branches = await this.prisma.branch.findMany({
        orderBy: { name: "asc" },
      });

      res.json({ success: true, data: branches });
    } catch (error) {
      logger.error(error, "Error listing branches:");
      next(error);
    }
  }

  /**
   * GET /warehouses - List all warehouses
   */
  async listWarehouses(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const warehouses = await this.prisma.warehouse.findMany({
        include: {
          branch: { select: { name: true, code: true } },
          _count: { select: { inventory: true } },
        },
        orderBy: { name: "asc" },
      });

      res.json({ success: true, data: warehouses });
    } catch (error) {
      logger.error(error, "Error listing warehouses:");
      next(error);
    }
  }

  /**
   * GET /users - List all users
   */
  async listUsers(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const users = await this.prisma.user.findMany({
        include: {
          branch: { select: { name: true, code: true } },
        },
        orderBy: { name: "asc" },
      });

      const sanitized = users.map(({ passwordHash, ...user }) => user);

      res.json({ success: true, data: sanitized });
    } catch (error) {
      logger.error(error, "Error listing users:");
      next(error);
    }
  }

  /**
   * GET /products - List all products
   */
  async listProducts(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { category, page = 1, limit = 100 } = req.query;

      const where: any = {};
      if (category) where.category = String(category);

      const products = await this.prisma.product.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      });

      res.json({ success: true, data: products });
    } catch (error) {
      logger.error(error, "Error listing products:");
      next(error);
    }
  }

  /**
   * GET /deliveries - List all deliveries
   */
  async listDeliveries(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const deliveries = await this.prisma.delivery.findMany({
        include: {
          driver: { select: { name: true, email: true } },
          truck: { select: { registration: true, model: true } },
          // salesDocuments: { select: { documentId: true, total: true } }, // No relation in schema
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      res.json({ success: true, data: deliveries });
    } catch (error) {
      logger.error(error, "Error listing deliveries:");
      next(error);
    }
  }

  /**
   * GET /trucks - List all trucks
   */
  async listTrucks(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const trucks = await this.prisma.truck.findMany({
        orderBy: { registration: "asc" },
      });

      res.json({ success: true, data: trucks });
    } catch (error) {
      logger.error(error, "Error listing trucks:");
      next(error);
    }
  }

  /**
   * GET /finance/transactions - List all finance transactions
   */
  async listFinanceTransactions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { type, startDate, endDate, limit = 100 } = req.query;
      const where: any = {};

      if (type) where.type = String(type);

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(String(startDate));
        if (endDate) where.createdAt.lte = new Date(String(endDate));
      }

      const transactions = await this.prisma.financeTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Number(limit),
      });

      res.json({ success: true, data: transactions });
    } catch (error) {
      logger.error(error, "Error listing finance transactions:");
      next(error);
    }
  }

  /**
   * GET /payroll - List all payroll records
   */
  async listPayroll(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { status, userId, limit = 100 } = req.query;
      const where: any = {};

      if (status) where.status = String(status);
      if (userId) where.userId = String(userId);

      const payroll = await this.prisma.payroll.findMany({
        where,
        include: {
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: Number(limit),
      });

      res.json({ success: true, data: payroll });
    } catch (error) {
      logger.error(error, "Error listing payroll:");
      next(error);
    }
  }
}
