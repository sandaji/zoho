import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/db';
import { logger } from '../../lib/logger';
import { inventoryRepository } from '../../repositories/inventory.repository';
import { purchasingRepository } from '../../repositories/purchasing.repository';
import { StatCardBuilder } from '../../utils/stat-card.builder';
import * as bcrypt from 'bcrypt';

/**
 * Controller for admin-related operations.
 */
export class AdminController {
  /**
   * Gets high-level statistics for the admin dashboard using repositories and StatCardBuilder.
   */
  async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const [
        total_branches,
        total_warehouses,
        total_users,
        total_products,
        pending_deliveries,
        low_stock_items,
      ] = await Promise.all([
        prisma.branch.count({ where: { isActive: true } }),
        inventoryRepository.getWarehousesCount(),
        prisma.user.count({ where: { isActive: true } }),
        inventoryRepository.getActiveProductsCount(),
        purchasingRepository.getPendingDeliveriesCount(),
        inventoryRepository.getLowStockItemsCount(),
      ]);

      const cards = {
        branches: StatCardBuilder.create("Total Branches", total_branches).setColor("indigo").build(),
        warehouses: StatCardBuilder.create("Total Warehouses", total_warehouses).setColor("sky").build(),
        users: StatCardBuilder.create("Active Users", total_users).setColor("emerald").build(),
        products: StatCardBuilder.create("Total Products", total_products).setColor("violet").build(),
        deliveries: StatCardBuilder.create("Pending Deliveries", pending_deliveries).setColor("amber").build(),
        lowStock: StatCardBuilder.create("Low Stock Items", low_stock_items).setColor("rose").build(),
      };

      res.status(200).json({
        total_branches,
        total_warehouses,
        total_users,
        total_products,
        pending_deliveries,
        low_stock_items,
        cards,
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
      const roleStr = Array.isArray(role) ? role[0] as string : role as string | undefined;
      const branchIdStr = Array.isArray(branchId) ? branchId[0] as string : branchId as string | undefined;

      const users = await prisma.user.findMany({
        where: {
          isActive: true,
          hasSystemAccess: true, // Only return system users
          ...(roleStr ? { role: roleStr } : {}),
          ...(branchIdStr ? { branchId: branchIdStr } : {}),
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          branchId: true,
          isActive: true,
          hasSystemAccess: true,
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

  // --- New Methods for System Access ---

  async listEligibleEmployees(req: Request, res: Response, next: NextFunction) {
    try {
      // Returns active employees who do NOT have system access yet
      const employees = await prisma.user.findMany({
        where: {
          isActive: true,
          hasSystemAccess: false,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          branchId: true,
        },
        orderBy: { name: 'asc' },
      });
      res.json({
        success: true,
        data: employees,
      });
    } catch (error) {
      next(error);
    }
  }

  async grantSystemAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const { password, role } = req.body;

      if (!password || !role) {
        res.status(400).json({ error: "Password and Role are required to grant access." });
        return;
      }

      // Ensure the user exists and doesn't already have access
      const employee = await prisma.user.findUnique({ where: { id } });
      if (!employee) {
        res.status(404).json({ error: "Employee not found." });
        return;
      }
      if (employee.hasSystemAccess) {
        res.status(400).json({ error: "This employee already has system access." });
        return;
      }

      // Hash the real password
      const passwordHash = await bcrypt.hash(password, 10);

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          hasSystemAccess: true,
          passwordHash,
          role,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          hasSystemAccess: true,
        }
      });

      res.status(200).json({
        success: true,
        data: updatedUser,
        message: "System access granted successfully.",
      });
    } catch (error) {
      next(error);
    }
  }

  async listProducts(_req: Request, res: Response, next: NextFunction) {
    try {
      const products = await prisma.product.findMany({
        where: { isActive: true },
        include: {
          branchInventory: true,
        },
        orderBy: { name: 'asc' },
      });

      // Aggregate quantities across branches for global admin view
      const mappedProducts = products.map((p: any) => {
        const quantity = p.branchInventory?.reduce((sum: number, inv: any) => sum + (inv.quantity || 0), 0) || 0;
        // Use the highest reorder level found among branches as the global reference
        const reorder_level = p.branchInventory?.reduce((max: number, inv: any) => Math.max(max, inv.reorder_level || 10), 0) || 10;
        
        return {
          ...p,
          quantity,
          reorder_level,
        };
      });

      res.json({
        success: true,
        data: mappedProducts,
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
  async listFinanceTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const { branchId, type, limit = '50' } = req.query;
      // FinanceTransaction has no direct branchId — join via Payroll→User→Branch if needed
      const transactions = await prisma.financeTransaction.findMany({
        where: {
          ...(type ? { type: type as any } : {}),
        },
        include: { payroll: { include: { user: { select: { branchId: true } } } } },
        orderBy: { createdAt: 'desc' },
        take: Math.min(parseInt(limit as string), 200),
      });
      res.json({ success: true, data: transactions });
    } catch (error) {
      next(error);
    }
  }

  async listPayroll(req: Request, res: Response, next: NextFunction) {
    try {
      const { branchId, status } = req.query;
      const payrolls = await prisma.payroll.findMany({
        where: {
          ...(status ? { status: status as any } : {}),
          ...(branchId ? { user: { branchId: branchId as string } } : {}),
        },
        include: {
          user: { select: { id: true, name: true, email: true, branchId: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      res.json({ success: true, data: payrolls });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Global financials aggregator
   * NetGlobalRevenue = Σ(BranchSales) - Σ(InternalTransfers) to avoid double-counting
   */
  async getGlobalFinancials(req: Request, res: Response, next: NextFunction) {
    try {
      const { branchId, period = '30' } = req.query;
      const days = Math.min(parseInt(period as string) || 30, 365);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const branchFilter = branchId && branchId !== 'all'
        ? { branchId: branchId as string }
        : {};

      // Aggregate sales per branch from SalesDocument (INVOICE + PAID/PARTIALLY_PAID only)
      const [branchSales, internalTransferTotal, branches] = await Promise.all([
        prisma.salesDocument.groupBy({
          by: ['branchId'],
          where: {
            type: 'INVOICE',
            status: { in: ['PAID', 'PARTIALLY_PAID', 'CLOSED'] },
            issueDate: { gte: since },
            ...branchFilter,
          },
          _sum: { total: true, tax: true, discount: true, subtotal: true },
          _count: { id: true },
        }),
        // Internal transfers — stock movements classified as TRANSFER_OUT to prevent double-count
        prisma.stockTransfer.aggregate({
          where: {
            status: 'RECEIVED',
            createdAt: { gte: since },
          },
          _count: { id: true },
        }),
        prisma.branch.findMany({
          where: { isActive: true },
          select: { id: true, name: true, code: true, city: true },
        }),
      ]);

      // Build branch-keyed map
      const branchMap = Object.fromEntries(branches.map(b => [b.id, b]));

      const branchBreakdown = branchSales.map(s => ({
        branch: branchMap[s.branchId] || { id: s.branchId, name: 'Unknown', code: '-', city: '-' },
        revenue:    s._sum.total    || 0,
        subtotal:   s._sum.subtotal || 0,
        tax:        s._sum.tax      || 0,
        discount:   s._sum.discount || 0,
        orderCount: s._count.id,
      }));

      const grossRevenue      = branchBreakdown.reduce((a, b) => a + b.revenue,  0);
      const totalTax          = branchBreakdown.reduce((a, b) => a + b.tax,      0);
      const totalDiscount     = branchBreakdown.reduce((a, b) => a + b.discount, 0);
      const totalOrders       = branchBreakdown.reduce((a, b) => a + b.orderCount, 0);
      const internalTransfers = internalTransferTotal._count.id;

      // Expense aggregation from FinanceTransaction
      const expenses = await prisma.financeTransaction.aggregate({
        where: { type: 'expense', createdAt: { gte: since } },
        _sum: { amount: true },
      });
      const totalExpenses = expenses._sum.amount || 0;

      res.json({
        success: true,
        data: {
          period_days:        days,
          gross_revenue:      grossRevenue,
          net_global_revenue: grossRevenue, // IBT deduction at product level not applicable in revenue terms
          total_tax:          totalTax,
          total_discount:     totalDiscount,
          total_expenses:     totalExpenses,
          net_profit:         grossRevenue - totalExpenses,
          total_orders:       totalOrders,
          internal_transfers: internalTransfers,
          branch_breakdown:   branchBreakdown,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Inter-Branch Transfer monitor — IN_TRANSIT and PENDING_RECEIPT transfers
   */
  async getIBTMonitor(req: Request, res: Response, next: NextFunction) {
    try {
      const transfers = await prisma.stockTransfer.findMany({
        where: {
          status: { in: ['PENDING', 'IN_TRANSIT', 'PENDING_RECEIPT', 'DISCREPANCY'] },
        },
        include: {
          sourceWarehouse: { include: { branch: { select: { id: true, name: true, code: true } } } },
          targetWarehouse: { include: { branch: { select: { id: true, name: true, code: true } } } },
          items: { include: { product: { select: { id: true, name: true, sku: true } } } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      const summary = {
        pending:         transfers.filter(t => t.status === 'PENDING').length,
        in_transit:      transfers.filter(t => t.status === 'IN_TRANSIT').length,
        pending_receipt: transfers.filter(t => t.status === 'PENDING_RECEIPT').length,
        discrepancy:     transfers.filter(t => t.status === 'DISCREPANCY').length,
      };

      res.json({ success: true, data: { summary, transfers } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * System health snapshot — sessions, deliveries, low stock, pending approvals
   */
  async getSystemHealth(req: Request, res: Response, next: NextFunction) {
    try {
      const [
        openSessions,
        pendingDeliveries,
        lowStockItems,
        pendingApprovals,
        activeUsers,
        activeBranches,
      ] = await Promise.all([
        prisma.cashierSession.count({ where: { status: 'OPEN' } }),
        prisma.delivery.count({ where: { status: { in: ['pending', 'assigned', 'in_transit'] } } }),
        prisma.branchInventory.count({ where: { status: 'low_stock' } }),
        prisma.approvalRequest.count({ where: { status: 'PENDING' } }),
        prisma.user.count({ where: { isActive: true, hasSystemAccess: true } }),
        prisma.branch.count({ where: { isActive: true } }),
      ]);

      // Compute overall health score (0–100)
      const healthScore = Math.max(0, 100
        - (pendingDeliveries > 10 ? 15 : pendingDeliveries > 5 ? 8 : 0)
        - (lowStockItems > 20 ? 20 : lowStockItems > 10 ? 10 : 0)
        - (pendingApprovals > 5 ? 10 : 0)
      );

      res.json({
        success: true,
        data: {
          health_score:      healthScore,
          open_sessions:     openSessions,
          pending_deliveries: pendingDeliveries,
          low_stock_items:   lowStockItems,
          pending_approvals: pendingApprovals,
          active_users:      activeUsers,
          active_branches:   activeBranches,
          api_status:        'operational',
          checked_at:        new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}