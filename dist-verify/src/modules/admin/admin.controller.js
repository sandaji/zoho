"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const db_1 = require("../../lib/db"); // Assuming prisma client path
/**
 * Controller for admin-related operations.
 */
class AdminController {
    /**
     * Gets high-level statistics for the admin dashboard.
     * This method is optimized to run all count queries in parallel.
     */
    async getStats(_req, res, next) {
        try {
            const [total_branches, total_warehouses, total_users, total_products, pending_deliveries, low_stock_items_result,] = await db_1.prisma.$transaction([
                db_1.prisma.branch.count({ where: { isActive: true } }),
                db_1.prisma.warehouse.count({ where: { isActive: true } }),
                db_1.prisma.user.count({ where: { isActive: true } }),
                db_1.prisma.product.count({ where: { isActive: true } }),
                db_1.prisma.delivery.count({ where: { status: { in: ['pending', 'assigned', 'in_transit'] } } }),
                db_1.prisma.$queryRaw `SELECT COUNT(*) as count FROM products WHERE "isActive" = true AND quantity <= reorder_level`,
            ]);
            const low_stock_items = Number(low_stock_items_result[0].count);
            res.status(200).json({
                total_branches,
                total_warehouses,
                total_users,
                total_products,
                pending_deliveries,
                low_stock_items,
            });
        }
        catch (error) {
            next(error);
        }
    }
    // --- Placeholder methods based on routes/index.ts ---
    // In a real scenario, these would have full implementations.
    async listBranches(_req, res, _next) {
        res.json({ message: 'Not implemented' });
    }
    async listWarehouses(_req, res, _next) {
        res.json({ message: 'Not implemented' });
    }
    async listUsers(_req, res, _next) {
        res.json({ message: 'Not implemented' });
    }
    async listProducts(_req, res, _next) {
        res.json({ message: 'Not implemented' });
    }
    async listDeliveries(_req, res, _next) {
        res.json({ message: 'Not implemented' });
    }
    async listFinanceTransactions(_req, res, _next) {
        res.json({ message: 'Not implemented' });
    }
    async listPayroll(_req, res, _next) {
        res.json({ message: 'Not implemented' });
    }
}
exports.AdminController = AdminController;
