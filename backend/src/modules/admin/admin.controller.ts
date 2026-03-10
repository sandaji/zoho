import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/db';
import { logger } from '../../lib/logger';
import * as bcrypt from 'bcrypt';

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