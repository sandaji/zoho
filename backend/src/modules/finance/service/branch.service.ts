import { prisma } from "../../../lib/db";
import { logger } from "../../../lib/logger";
import { notFoundError } from "../../../lib/errors";
import {
  BranchDashboardDTO,
  BranchKPIResponseDTO,
  BranchSalesMetricsDTO,
  BranchOperationsMetricsDTO,
  BranchPayrollMetricsDTO,
  TopProductDTO,
  SalesCategoryBreakdown,
  DailySalesTrendDTO,
  TopCustomerDTO,
  DepartmentDTO,
  WarehouseCapacityDTO,
  PayrollDepartmentBreakdown,
  SalesActivityDTO,
  DeliveryActivityDTO,
  TransactionActivityDTO,
  AlertDTO,
} from "../dto";

export class BranchService {
  private prisma = prisma;

  /**
   * Get complete branch dashboard with all KPIs and metrics
   */
  async getBranchDashboard(branchId: string): Promise<BranchDashboardDTO> {
    try {
      logger.info({ branchId }, "Fetching branch dashboard");

      // Validate branch exists
      const branch = await this.prisma.branch.findUnique({
        where: { id: branchId },
        include: {
          users: { where: { role: "manager" } },
          warehouses: true,
        },
      });

      if (!branch) {
        throw notFoundError(`Branch not found: ${branchId}`);
      }

      // Get current month and year
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const monthStart = new Date(currentYear, now.getMonth(), 1);
      const monthEnd = new Date(currentYear, now.getMonth() + 1, 0);

      // Fetch all metrics in parallel
      const [
        kpis,
        salesMetrics,
        operationsMetrics,
        payrollMetrics,
        recentSales,
        recentDeliveries,
        recentTransactions,
        alerts,
      ] = await Promise.all([
        this.getBranchKPIs(branchId, monthStart, monthEnd),
        this.getBranchSalesMetrics(branchId, monthStart, monthEnd),
        this.getBranchOperationsMetrics(branchId),
        this.getBranchPayrollMetrics(branchId, currentMonth, currentYear),
        this.getRecentSales(branchId, 5),
        this.getRecentDeliveries(branchId, 5),
        this.getRecentTransactions(branchId, 5),
        this.generateAlerts(branchId),
      ]);

      const dashboard: BranchDashboardDTO = {
        branch_id: branchId,
        branch_name: branch.name,
        branch_code: branch.code || undefined,
        location: branch.city ? `${branch.city}${branch.address ? `, ${branch.address}` : ''}` : undefined,
        manager_name: branch.users?.[0]?.name,
        kpis,
        sales_metrics: salesMetrics,
        operations_metrics: operationsMetrics,
        payroll_metrics: payrollMetrics,
        recent_sales: recentSales,
        recent_deliveries: recentDeliveries,
        recent_transactions: recentTransactions,
        alerts,
      };

      logger.info({ branchId }, "Branch dashboard fetched successfully");
      return dashboard;
    } catch (error) {
      logger.error({ error }, "Error fetching branch dashboard");
      throw error;
    }
  }

  /**
   * Get summaries for all branches for the list view
   */
  async getAllBranchSummaries(): Promise<any[]> {
    try {
      const branches = await this.prisma.branch.findMany({
        include: {
          users: { where: { role: "manager" } },
        },
        orderBy: { name: "asc" },
      });

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const summaries = await Promise.all(
        branches.map(async (branch) => {
          const branchId = branch.id;

          // Basic counts
          const employeeCount = await this.prisma.user.count({ where: { branchId } });
          
          // Revenue
          const revenueAggregate = await this.prisma.sales.aggregate({
            where: { branchId, createdAt: { gte: monthStart, lte: monthEnd } },
            _sum: { grand_total: true }
          });
          const monthRevenue = revenueAggregate._sum.grand_total || 0;

          const totalRevenueAggregate = await this.prisma.sales.aggregate({
            where: { branchId },
            _sum: { grand_total: true }
          });
          const totalRevenue = totalRevenueAggregate._sum.grand_total || 0;

          // Inventory
          const inventoryData = await this.prisma.inventory.findMany({
            where: { warehouse: { branchId } },
            include: { product: true },
          });
          const inventoryValue = inventoryData.reduce((sum, inv) => {
            return sum + (inv.product?.unit_price || 0) * (inv.quantity || 0);
          }, 0);

          // Growth & Margin
          const lastMonthRevenue = await this.getLastMonthRevenue(branchId);
          const salesGrowth = lastMonthRevenue > 0
            ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
            : 0;

          // Expenses for margin
          const expensesAggregate = await this.prisma.financeTransaction.aggregate({
            where: { 
              OR: [{ sales: { branchId } }, { payroll: { user: { branchId } } }],
              type: "expense",
              createdAt: { gte: monthStart, lte: monthEnd }
            },
            _sum: { amount: true }
          });
          const monthExpenses = expensesAggregate._sum.amount || 0;

          // Payroll for margin
          const payrollAggregate = await this.prisma.payroll.aggregate({
            where: { 
              user: { branchId },
              createdAt: { gte: monthStart, lte: monthEnd }
            },
            _sum: { net_salary: true }
          });
          const monthPayroll = payrollAggregate._sum.net_salary || 0;

          const netProfit = monthRevenue - monthExpenses - monthPayroll;
          const profitMargin = monthRevenue > 0 ? (netProfit / monthRevenue) * 100 : 0;

          return {
            id: branch.id,
            name: branch.name,
            code: branch.code,
            location: branch.city ? `${branch.city}${branch.address ? `, ${branch.address}` : ''}` : "Unknown",
            manager_name: branch.users?.[0]?.name || "Unassigned",
            total_revenue: totalRevenue,
            total_employees: employeeCount,
            inventory_value: inventoryValue,
            sales_growth: salesGrowth,
            profit_margin: profitMargin,
          };
        })
      );

      return summaries;
    } catch (error) {
      logger.error({ error }, "Error fetching branch summaries");
      throw error;
    }
  }

  /**
   * Calculate Key Performance Indicators for branch
   */
  private async getBranchKPIs(
    branchId: string,
    monthStart: Date,
    monthEnd: Date
  ): Promise<BranchKPIResponseDTO> {
    try {
      const branch = await this.prisma.branch.findUnique({
        where: { id: branchId },
      });

      if (!branch) {
        throw notFoundError(`Branch not found: ${branchId}`);
      }

      // Sales data
      const allSales: any[] = await this.prisma.sales.findMany({
        where: { branchId },
      });

      const monthSales: any[] = await this.prisma.sales.findMany({
        where: {
          branchId,
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      });

      const totalRevenue = allSales.reduce(
        (sum: number, s: any) => sum + (s.grand_total || 0),
        0
      );
      const monthRevenue = monthSales.reduce(
        (sum: number, s: any) => sum + (s.grand_total || 0),
        0
      );
      const lastMonthRevenue = await this.getLastMonthRevenue(branchId);

      const salesGrowth =
        lastMonthRevenue > 0
          ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
          : 0;

      // Employees
      const employees: any[] = await this.prisma.user.findMany({
        where: { branchId },
      });

      const activeEmployees = employees.filter(
        (e: any) => e.isActive
      ).length;

      // Inventory
      const inventoryData: any[] = await this.prisma.inventory.findMany({
        where: {
          warehouse: {
            branchId,
          },
        },
        include: { product: true },
      });

      const totalInventoryValue = inventoryData.reduce(
        (sum: number, inv: any) => {
          return sum + (inv.product?.unit_price || 0) * (inv.quantity || 0);
        },
        0
      );

      const lowStockItems = inventoryData.filter(
        (inv: any) => (inv.quantity || 0) < 10
      ).length;

      // Fleet
      const trucks: any[] = await this.prisma.truck.findMany({
        where: { deliveries: { some: { sales: { branchId } } } },
      });

      // Deliveries
      const deliveries: any[] = await this.prisma.delivery.findMany({
        where: {
          sales: { branchId },
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      });

      const activeDeliveries = deliveries.filter(
        (d: any) => d.status === "pending" || d.status === "in_transit"
      ).length;

      const successfulDeliveries = deliveries.filter(
        (d: any) => d.status === "delivered"
      ).length;
      const deliverySuccessRate =
        deliveries.length > 0
          ? (successfulDeliveries / deliveries.length) * 100
          : 0;

      // Financial metrics
      const expenses: any[] = await this.prisma.financeTransaction.findMany({
        where: {
          type: "expense",
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      });

      const totalExpenses = expenses.reduce(
        (sum: number, e: any) => sum + (e.amount || 0),
        0
      );

      // Payroll
      const payrolls: any[] = await this.prisma.payroll.findMany({
        where: {
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      });

      const totalPayroll = payrolls.reduce(
        (sum: number, p: any) => sum + (p.net_salary || 0),
        0
      );

      const netProfit = monthRevenue - totalExpenses - totalPayroll;
      const profitMargin =
        monthRevenue > 0 ? (netProfit / monthRevenue) * 100 : 0;

      // Top products
      const topProducts = await this.getTopProducts(branchId, 5);

      return {
        branch_id: branchId,
        branch_name: branch.name,
        branch_code: branch.code || undefined,
        location: branch.city ? `${branch.city}${branch.address ? `, ${branch.address}` : ''}` : undefined,
        total_sales: allSales.length,
        total_revenue: totalRevenue,
        average_order_value:
          allSales.length > 0 ? totalRevenue / allSales.length : 0,
        sales_this_month: monthRevenue,
        sales_growth_percentage: salesGrowth,
        top_selling_products: topProducts,
        total_employees: employees.length,
        active_employees: activeEmployees,
        total_inventory_value: totalInventoryValue,
        low_stock_items: lowStockItems,
        total_trucks: trucks.length,
        active_deliveries: activeDeliveries,
        total_expenses: totalExpenses,
        total_payroll: totalPayroll,
        net_profit: netProfit,
        profit_margin: profitMargin,
        delivery_success_rate: deliverySuccessRate,
        average_delivery_time: this.calculateAverageDeliveryTime(deliveries),
        period_start: monthStart.toISOString(),
        period_end: monthEnd.toISOString(),
        generated_at: new Date().toISOString(),
      };
    } catch (error) {
      logger.error({ error }, "Error calculating branch KPIs");
      throw error;
    }
  }

  /**
   * Get sales metrics for branch
   */
  private async getBranchSalesMetrics(
    branchId: string,
    monthStart: Date,
    monthEnd: Date
  ): Promise<BranchSalesMetricsDTO> {
    try {
      const sales: any[] = await this.prisma.sales.findMany({
        where: {
          branchId,
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      });

      const totalRevenue = sales.reduce(
        (sum: number, s: any) => sum + (s.grand_total || 0),
        0
      );
      const totalSales = sales.length;

      // Category breakdown (Real)
      const salesItems = await this.prisma.salesItem.findMany({
        where: {
          sales: {
            branchId,
            createdAt: { gte: monthStart, lte: monthEnd }
          }
        },
        include: {
          product: true
        }
      });

      const categoryMap = new Map<string, { quantity: number; amount: number }>();
      salesItems.forEach(item => {
        const cat = item.product?.category || "Other";
        const existing = categoryMap.get(cat) || { quantity: 0, amount: 0 };
        categoryMap.set(cat, {
          quantity: existing.quantity + (item.quantity || 0),
          amount: existing.amount + (item.amount || 0)
        });
      });

      const salesByCategory: SalesCategoryBreakdown[] = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        quantity: data.quantity,
        amount: data.amount,
        percentage: totalRevenue > 0 ? (data.amount / totalRevenue) * 100 : 0
      })).sort((a, b) => b.amount - a.amount);

      // Daily trend
      const dailyTrend = this.calculateDailySalesTrend(sales);

      // Top customers
      const topCustomers = await this.getTopCustomers(branchId, 5);

      return {
        branch_id: branchId,
        period: `${monthStart.getFullYear()}-${String(
          monthStart.getMonth() + 1
        ).padStart(2, "0")}`,
        total_sales: totalSales,
        total_revenue: totalRevenue,
        order_count: totalSales,
        average_order_value: totalSales > 0 ? totalRevenue / totalSales : 0,
        sales_by_product_category: salesByCategory,
        daily_sales_trend: dailyTrend,
        top_customers: topCustomers,
      };
    } catch (error) {
      logger.error({ error }, "Error calculating sales metrics");
      throw error;
    }
  }

  /**
   * Get operations metrics
   */
  private async getBranchOperationsMetrics(
    branchId: string
  ): Promise<BranchOperationsMetricsDTO> {
    try {
      // Staff
      const employees: any[] = await this.prisma.user.findMany({
        where: { branchId },
      });

      const activeEmployees = employees.filter(
        (e: any) => e.isActive
      ).length;

      // Inventory
      const inventory: any[] = await this.prisma.inventory.findMany({
        where: { warehouse: { branchId } },
        include: { product: true },
      });

      const totalInventoryValue = inventory.reduce((sum: number, inv: any) => {
        return sum + (inv.product?.unit_price || 0) * (inv.quantity || 0);
      }, 0);

      const lowStockItems = inventory.filter(
        (inv: any) => (inv.quantity || 0) < 10
      ).length;
      const outOfStockItems = inventory.filter(
        (inv: any) => (inv.quantity || 0) === 0
      ).length;

      const totalItems = inventory.reduce(
        (sum: number, inv: any) => sum + (inv.quantity || 0),
        0
      );
      const inventoryTurnover =
        totalItems > 0 ? inventory.length / totalItems : 0;

      // Fleet
      const trucks: any[] = await this.prisma.truck.findMany({
        where: { deliveries: { some: { sales: { branchId } } } },
      });

      const activeTrucks = trucks.filter(
        (t: any) => t.isActive
      ).length;
      const maintenancePending = trucks.filter(
        (t: any) => !t.isActive
      ).length;

      const fuelCost = 0; // fuel_cost not in schema
      const utilizationRate =
        trucks.length > 0 ? (activeTrucks / trucks.length) * 100 : 0;

      // Warehouses
      const warehouses = await this.prisma.warehouse.findMany({
        where: { branchId },
      });

      const warehouseCapacity: WarehouseCapacityDTO[] = warehouses.map(
        (w: any) => ({
          warehouse_id: w.id,
          warehouse_name: w.name,
          total_capacity: w.capacity || 0,
          current_items: inventory.filter(
            (inv: any) => inv.warehouseId === w.id
          ).length,
          utilization_percentage:
            (w.capacity || 1) > 0
              ? (inventory.filter((inv: any) => inv.warehouseId === w.id)
                  .length /
                  (w.capacity || 1)) *
                100
              : 0,
        })
      );

      const now = new Date();

      return {
        branch_id: branchId,
        period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
          2,
          "0"
        )}`,
        total_employees: employees.length,
        active_employees: activeEmployees,
        employee_attendance_rate:
          employees.length > 0 ? (activeEmployees / employees.length) * 100 : 0,
        departments: this.groupEmployeesByDepartment(employees),
        total_inventory_value: totalInventoryValue,
        total_items_in_stock: totalItems,
        low_stock_items: lowStockItems,
        out_of_stock_items: outOfStockItems,
        inventory_turnover_rate: inventoryTurnover,
        total_trucks: trucks.length,
        active_trucks: activeTrucks,
        maintenance_pending: maintenancePending,
        fuel_cost_total: fuelCost,
        utilization_rate: utilizationRate,
        total_warehouses: warehouses.length,
        warehouse_capacity_utilization: warehouseCapacity,
      };
    } catch (error) {
      logger.error({ error }, "Error calculating operations metrics");
      throw error;
    }
  }

  /**
   * Get payroll metrics for branch
   */
  private async getBranchPayrollMetrics(
    branchId: string,
    month: number,
    year: number
  ): Promise<BranchPayrollMetricsDTO> {
    try {
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);

      const payrolls: any[] = await this.prisma.payroll.findMany({
        where: {
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        include: {
          user: { include: { branch: true } },
        },
      });

      const branchPayrolls = payrolls.filter(
        (p: any) => p.user?.branchId === branchId
      );

      const totalCost = branchPayrolls.reduce(
        (sum: number, p: any) => sum + (p.net_salary || 0),
        0
      );
      const totalAllowances = branchPayrolls.reduce(
        (sum: number, p: any) => sum + (p.allowances || 0),
        0
      );
      const totalDeductions = branchPayrolls.reduce(
        (sum: number, p: any) => sum + (p.deductions || 0),
        0
      );

      const totalTaxes = totalCost * 0.1;

      const paidCount = branchPayrolls.filter(
        (p: any) => p.status === "paid"
      ).length;
      const pendingCount = branchPayrolls.filter(
        (p: any) => p.status === "pending"
      ).length;
      const failedCount = branchPayrolls.filter(
        (p: any) => p.status === "failed"
      ).length;

      const salaries = branchPayrolls.map((p: any) => p.net_salary || 0);
      const avgSalary =
        branchPayrolls.length > 0 ? totalCost / branchPayrolls.length : 0;
      const maxSalary = salaries.length > 0 ? Math.max(...salaries) : 0;
      const minSalary =
        salaries.length > 0
          ? Math.min(...salaries.filter((s: number) => s > 0))
          : 0;

      const departmentMap = new Map<
        string,
        { count: number; cost: number; allowances: number; deductions: number }
      >();

      branchPayrolls.forEach((payroll: any) => {
        const dept = payroll.user?.department || "unassigned";
        const existing = departmentMap.get(dept) || {
          count: 0,
          cost: 0,
          allowances: 0,
          deductions: 0,
        };
        departmentMap.set(dept, {
          count: existing.count + 1,
          cost: existing.cost + (payroll.net_salary || 0),
          allowances: existing.allowances + (payroll.allowances || 0),
          deductions: existing.deductions + (payroll.deductions || 0),
        });
      });

      const byDepartment: PayrollDepartmentBreakdown[] = Array.from(
        departmentMap.entries()
      ).map(([dept, data]) => ({
        department: dept,
        employee_count: data.count,
        total_cost: data.cost,
        average_salary: data.cost / data.count,
        allowances: data.allowances,
        deductions: data.deductions,
      }));

      return {
        branch_id: branchId,
        period: `${year}-${String(month).padStart(2, "0")}`,
        month,
        year,
        total_payroll_cost: totalCost,
        total_allowances: totalAllowances,
        total_deductions: totalDeductions,
        total_taxes: totalTaxes,
        total_employees_on_payroll: branchPayrolls.length,
        active_payroll_runs: branchPayrolls.filter(
          (p: any) => p.status === "processed" || p.status === "paid"
        ).length,
        pending_payments: pendingCount,
        average_salary: avgSalary,
        highest_salary: maxSalary,
        lowest_salary: minSalary,
        paid_count: paidCount,
        pending_count: pendingCount,
        failed_count: failedCount,
        by_department: byDepartment,
      };
    } catch (error) {
      logger.error({ error }, "Error calculating payroll metrics");
      throw error;
    }
  }

  /**
   * Get recent sales activity
   */
  private async getRecentSales(
    branchId: string,
    limit: number
  ): Promise<SalesActivityDTO[]> {
    const sales: any[] = await this.prisma.sales.findMany({
      where: { branchId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return sales.map((s: any) => ({
      id: s.id,
      reference_no: s.invoice_no,
      customer_name: "Walking Customer",
      amount: s.grand_total || 0,
      status: s.status,
      created_at: s.createdAt.toISOString(),
    }));
  }

  /**
   * Get recent deliveries
   */
  private async getRecentDeliveries(
    branchId: string,
    limit: number
  ): Promise<DeliveryActivityDTO[]> {
    const deliveries: any[] = await this.prisma.delivery.findMany({
      where: { sales: { branchId } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return deliveries.map((d: any) => ({
      id: d.id,
      delivery_no: d.delivery_no,
      destination: d.destination || "N/A",
      status: d.status,
      expected_delivery: d.expected_delivery?.toISOString() || "",
    }));
  }

  /**
   * Get recent transactions
   */
  private async getRecentTransactions(
    branchId: string,
    limit: number
  ): Promise<TransactionActivityDTO[]> {
    const transactions: any[] = await this.prisma.financeTransaction.findMany({
      where: {
        OR: [
          { sales: { branchId } },
          { payroll: { user: { branchId } } }
        ]
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return transactions.map((t: any) => ({
      id: t.id,
      type: t.type,
      reference_no: t.reference_no,
      amount: t.amount || 0,
      created_at: t.createdAt.toISOString(),
    }));
  }

  /**
   * Generate alerts based on branch metrics
   */
  private async generateAlerts(branchId: string): Promise<AlertDTO[]> {
    const alerts: AlertDTO[] = [];

    try {
      const lowStockItems = await this.prisma.inventory.findMany({
        where: {
          warehouse: { branchId },
          quantity: { lt: 10 },
        },
        take: 1,
      });

      if (lowStockItems.length > 0) {
        alerts.push({
          id: `alert-stock-${branchId}`,
          severity: "warning",
          message: `${lowStockItems.length} items running low on stock`,
          action: "Review Inventory",
          created_at: new Date().toISOString(),
        });
      }

      const pendingDeliveries = await this.prisma.delivery.findMany({
        where: {
          sales: { branchId },
          status: "pending",
        },
        take: 1,
      });

      if (pendingDeliveries.length > 0) {
        alerts.push({
          id: `alert-delivery-${branchId}`,
          severity: "info",
          message: `${pendingDeliveries.length} deliveries pending dispatch`,
          action: "Manage Deliveries",
          created_at: new Date().toISOString(),
        });
      }

      const maintenanceTrucks = await this.prisma.truck.findMany({
        where: {
          deliveries: { some: { sales: { branchId } } },
          isActive: false, // Assuming isActive false means maintenance or similar
        },
        take: 1,
      });

      if (maintenanceTrucks.length > 0) {
        alerts.push({
          id: `alert-truck-${branchId}`,
          severity: "warning",
          message: `${maintenanceTrucks.length} trucks under maintenance`,
          action: "View Fleet Status",
          created_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error({ error }, "Error generating alerts");
    }

    return alerts;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async getTopProducts(
    branchId: string,
    limit: number
  ): Promise<TopProductDTO[]> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const salesByProduct = await this.prisma.salesItem.groupBy({
      by: ['productId'],
      where: {
        sales: {
          branchId,
          createdAt: { gte: monthStart }
        }
      },
      _sum: {
        quantity: true,
        amount: true
      },
      orderBy: {
        _sum: {
          amount: 'desc'
        }
      },
      take: limit
    });

    const productIds = salesByProduct.map(s => s.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } }
    });

    const totalRevenueResult = await this.prisma.sales.aggregate({
      where: { branchId, createdAt: { gte: monthStart } },
      _sum: { grand_total: true }
    });
    const totalRevenue = totalRevenueResult._sum.grand_total || 1;

    return salesByProduct.map(s => {
      const product = products.find(p => p.id === s.productId);
      return {
        product_id: s.productId,
        product_name: product?.name || "Unknown Product",
        quantity_sold: s._sum.quantity || 0,
        revenue: s._sum.amount || 0,
        percentage_of_total: ((s._sum.amount || 0) / totalRevenue) * 100
      };
    });
  }

  private calculateDailySalesTrend(sales: any[]): DailySalesTrendDTO[] {
    const dailyMap = new Map<string, { count: number; revenue: number }>();

    sales.forEach((sale: any) => {
      const date = new Date(sale.createdAt).toISOString().split("T")[0] || "";
      const existing = dailyMap.get(date) || { count: 0, revenue: 0 };
      dailyMap.set(date, {
        count: existing.count + 1,
        revenue: existing.revenue + (sale.grand_total || 0),
      });
    });

    return Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        sales_count: data.count,
        revenue: data.revenue,
        average_order_value: data.count > 0 ? data.revenue / data.count : 0,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30);
  }

  private async getTopCustomers(
    branchId: string,
    limit: number
  ): Promise<TopCustomerDTO[]> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const salesByCustomer = await this.prisma.sales.groupBy({
      by: ['userId'], // Grouping by User as surrogate for customer in POS if not specifically linked
      where: {
        branchId,
        createdAt: { gte: monthStart }
      },
      _sum: {
        grand_total: true
      },
      _count: {
        id: true
      },
      orderBy: {
        _sum: {
          grand_total: 'desc'
        }
      },
      take: limit
    });

    return salesByCustomer.map(s => ({
      customer_id: s.userId || "Unknown",
      customer_name: "Customer",
      total_purchases: s._count.id,
      total_spent: s._sum.grand_total || 0,
      order_count: s._count.id
    }));
  }

  private groupEmployeesByDepartment(employees: any[]): DepartmentDTO[] {
    const deptMap = new Map<string, { count: number; salary: number }>();

    employees.forEach((emp: any) => {
      const dept = emp.department || "unassigned";
      const existing = deptMap.get(dept) || { count: 0, salary: 0 };
      deptMap.set(dept, {
        count: existing.count + 1,
        salary: existing.salary + (emp.salary || 0),
      });
    });

    return Array.from(deptMap.entries()).map(([dept, data]) => ({
      department_name: dept,
      employee_count: data.count,
      total_salary: data.salary,
      average_salary: data.count > 0 ? data.salary / data.count : 0,
    }));
  }

  private calculateAverageDeliveryTime(deliveries: any[]): number {
    const completedDeliveries = deliveries.filter(
      (d: any) => d.status === "delivered" && d.expected_delivery
    );

    if (completedDeliveries.length === 0) return 0;

    const totalTime = completedDeliveries.reduce((sum: number, d: any) => {
      const createdTime = new Date(d.createdAt).getTime();
      const deliveredTime = new Date(
        d.expected_delivery || new Date()
      ).getTime();
      return sum + (deliveredTime - createdTime);
    }, 0);

    return totalTime / (completedDeliveries.length * 3600000);
  }

  private async getLastMonthRevenue(branchId: string): Promise<number> {
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const lastMonthSales: any[] = await this.prisma.sales.findMany({
      where: {
        branchId,
        createdAt: {
          gte: lastMonthStart,
          lte: lastMonthEnd,
        },
      },
    });

    return lastMonthSales.reduce(
      (sum: number, s: any) => sum + (s.grand_total || 0),
      0
    );
  }
}
