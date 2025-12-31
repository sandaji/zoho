"use strict";
/**
 * Optimized Admin Controller
 * Using PostgreSQL-specific optimizations for lightning-fast stats
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const db_js_1 = require("../../lib/db.js");
const logger_js_1 = require("../../lib/logger.js");
class AdminController {
    constructor() {
        this.prisma = db_js_1.prisma;
        // Cache stats for 30 seconds to reduce database load
        this.statsCache = null;
        this.CACHE_TTL = 30000; // 30 seconds
    }
    /**
     * GET /admin/stats - Get dashboard statistics (SUPER OPTIMIZED)
     * Uses a single query with PostgreSQL aggregate functions
     */
    async getStats(_req, res, next) {
        try {
            // Check cache first
            const now = Date.now();
            if (this.statsCache && (now - this.statsCache.timestamp) < this.CACHE_TTL) {
                logger_js_1.logger.debug("Returning cached stats");
                res.json({
                    success: true,
                    data: this.statsCache.data,
                    cached: true,
                });
                return;
            }
            // Single optimized query using LATERAL joins and aggregates
            const result = await this.prisma.$queryRaw `
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
        }
        catch (error) {
            logger_js_1.logger.error(error, "Error fetching stats:");
            next(error);
        }
    }
    /**
     * GET /branches - List all branches
     */
    async listBranches(_req, res, next) {
        try {
            const branches = await this.prisma.branch.findMany({
                orderBy: { name: "asc" },
            });
            res.json({ success: true, data: branches });
        }
        catch (error) {
            logger_js_1.logger.error(error, "Error listing branches:");
            next(error);
        }
    }
    /**
     * GET /warehouses - List all warehouses
     */
    async listWarehouses(_req, res, next) {
        try {
            const warehouses = await this.prisma.warehouse.findMany({
                include: {
                    branch: { select: { name: true, code: true } },
                    _count: { select: { inventory: true } },
                },
                orderBy: { name: "asc" },
            });
            res.json({ success: true, data: warehouses });
        }
        catch (error) {
            logger_js_1.logger.error(error, "Error listing warehouses:");
            next(error);
        }
    }
    /**
     * GET /users - List all users
     */
    async listUsers(_req, res, next) {
        try {
            const users = await this.prisma.user.findMany({
                include: {
                    branch: { select: { name: true, code: true } },
                },
                orderBy: { name: "asc" },
            });
            const sanitized = users.map(({ passwordHash, ...user }) => user);
            res.json({ success: true, data: sanitized });
        }
        catch (error) {
            logger_js_1.logger.error(error, "Error listing users:");
            next(error);
        }
    }
    /**
     * GET /products - List all products
     */
    async listProducts(req, res, next) {
        try {
            const { category, page = 1, limit = 100 } = req.query;
            const where = {};
            if (category)
                where.category = String(category);
            const products = await this.prisma.product.findMany({
                where,
                orderBy: { name: "asc" },
                skip: (Number(page) - 1) * Number(limit),
                take: Number(limit),
            });
            res.json({ success: true, data: products });
        }
        catch (error) {
            logger_js_1.logger.error(error, "Error listing products:");
            next(error);
        }
    }
    /**
     * GET /deliveries - List all deliveries
     */
    async listDeliveries(_req, res, next) {
        try {
            const deliveries = await this.prisma.delivery.findMany({
                include: {
                    driver: { select: { name: true, email: true } },
                    truck: { select: { registration: true, model: true } },
                    sales: { select: { invoice_no: true, grand_total: true } },
                },
                orderBy: { createdAt: "desc" },
                take: 100,
            });
            res.json({ success: true, data: deliveries });
        }
        catch (error) {
            logger_js_1.logger.error(error, "Error listing deliveries:");
            next(error);
        }
    }
    /**
     * GET /trucks - List all trucks
     */
    async listTrucks(_req, res, next) {
        try {
            const trucks = await this.prisma.truck.findMany({
                orderBy: { registration: "asc" },
            });
            res.json({ success: true, data: trucks });
        }
        catch (error) {
            logger_js_1.logger.error(error, "Error listing trucks:");
            next(error);
        }
    }
    /**
     * GET /finance/transactions - List all finance transactions
     */
    async listFinanceTransactions(req, res, next) {
        try {
            const { type, startDate, endDate, limit = 100 } = req.query;
            const where = {};
            if (type)
                where.type = String(type);
            if (startDate || endDate) {
                where.createdAt = {};
                if (startDate)
                    where.createdAt.gte = new Date(String(startDate));
                if (endDate)
                    where.createdAt.lte = new Date(String(endDate));
            }
            const transactions = await this.prisma.financeTransaction.findMany({
                where,
                orderBy: { createdAt: "desc" },
                take: Number(limit),
            });
            res.json({ success: true, data: transactions });
        }
        catch (error) {
            logger_js_1.logger.error(error, "Error listing finance transactions:");
            next(error);
        }
    }
    /**
     * GET /payroll - List all payroll records
     */
    async listPayroll(req, res, next) {
        try {
            const { status, userId, limit = 100 } = req.query;
            const where = {};
            if (status)
                where.status = String(status);
            if (userId)
                where.userId = String(userId);
            const payroll = await this.prisma.payroll.findMany({
                where,
                include: {
                    user: { select: { name: true, email: true } },
                },
                orderBy: { createdAt: "desc" },
                take: Number(limit),
            });
            res.json({ success: true, data: payroll });
        }
        catch (error) {
            logger_js_1.logger.error(error, "Error listing payroll:");
            next(error);
        }
    }
}
exports.AdminController = AdminController;
