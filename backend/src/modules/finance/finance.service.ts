/**
 * Finance Service - Database-driven financial analytics
 * Refactored to consume Repositories & DashboardMetricsService without knowing database table names.
 */

import { logger } from "../../lib/logger";
import { salesRepository, SalesRepository } from "../../repositories/sales.repository";
import { inventoryRepository, InventoryRepository } from "../../repositories/inventory.repository";
import { financeRepository, FinanceRepository } from "../../repositories/finance.repository";
import { dashboardMetricsService, DashboardMetricsService } from "../../services/dashboard-metrics.service";
import { getFinancialYear, getMonthRange } from "../../utils/date";
import { sum, subtract, multiply, percentage, roundCurrency } from "../../utils/money";

export class FinanceService {
  private salesRepo: SalesRepository;
  private inventoryRepo: InventoryRepository;
  private financeRepo: FinanceRepository;
  private metricsService: DashboardMetricsService;

  constructor(
    salesRepo: SalesRepository = salesRepository,
    inventoryRepo: InventoryRepository = inventoryRepository,
    financeRepo: FinanceRepository = financeRepository,
    metricsService: DashboardMetricsService = dashboardMetricsService
  ) {
    this.salesRepo = salesRepo;
    this.inventoryRepo = inventoryRepo;
    this.financeRepo = financeRepo;
    this.metricsService = metricsService;
  }

  /**
   * Get comprehensive financial summary using repositories
   */
  async getFinancialSummary() {
    try {
      const fy = getFinancialYear();

      const [salesTotals, totalExpenses, activeProducts, lowStockProducts, cashBalance] =
        await Promise.all([
          this.salesRepo.getSalesTotals({
            startDate: fy.startDate,
            endDate: fy.endDate,
          }),
          this.financeRepo.getExpenses({
            startDate: fy.startDate,
            endDate: fy.endDate,
          }),
          this.inventoryRepo.getActiveProductsCount(),
          this.inventoryRepo.getLowStockItemsCount(),
          this.financeRepo.getCashBalance(),
        ]);

      const revenue = salesTotals.total;
      const salesCount = salesTotals.count;
      const profit = subtract(revenue, totalExpenses);

      const grossMargin = revenue > 0 ? roundCurrency(((revenue - totalExpenses) / revenue) * 100) : 0;
      const netMargin = revenue > 0 ? roundCurrency((profit / revenue) * 100) : 0;

      const payrollSummary = await this.financeRepo.getPayrollSummary({
        startDate: fy.startDate,
        endDate: fy.endDate,
      });

      return {
        cashBalance,
        accountsReceivable: 0,
        accountsPayable: 0,
        revenue,
        profit,
        expenses: totalExpenses,
        grossMargin,
        netMargin,
        salesCount,
        activeProducts,
        lowStockProducts,
        payrollExpenses: payrollSummary.netSalary,
      };
    } catch (error) {
      logger.error({ error }, "Error fetching financial summary");
      throw error;
    }
  }

  /**
   * Get income statement data consuming repositories
   */
  async getIncomeStatement() {
    try {
      const fy = getFinancialYear();

      const [salesTotals, operatingExpenses, payrollSummary] = await Promise.all([
        this.salesRepo.getSalesTotals({
          startDate: fy.startDate,
          endDate: fy.endDate,
        }),
        this.financeRepo.getExpenses({
          startDate: fy.startDate,
          endDate: fy.endDate,
        }),
        this.financeRepo.getPayrollSummary({
          startDate: fy.startDate,
          endDate: fy.endDate,
        }),
      ]);

      const revenue = salesTotals.total;
      const payrollExpenses = payrollSummary.netSalary;
      const totalExpenses = sum(operatingExpenses, payrollExpenses);

      // Estimated COGS (approx 60% of subtotal)
      const cogs = multiply(salesTotals.subtotal, 0.6);
      const grossProfit = subtract(revenue, cogs);
      const netIncome = subtract(grossProfit, totalExpenses);

      return {
        revenue,
        cogs,
        grossProfit,
        operatingExpenses,
        payrollExpenses,
        totalExpenses,
        taxes: salesTotals.tax,
        netIncome,
        grossMargin: revenue > 0 ? roundCurrency((grossProfit / revenue) * 100) : 0,
        netMargin: revenue > 0 ? roundCurrency((netIncome / revenue) * 100) : 0,
      };
    } catch (error) {
      logger.error({ error }, "Error fetching income statement");
      throw error;
    }
  }

  /**
   * Get revenue and expense chart data via DashboardMetricsService
   */
  async getRevenueExpenseChartData() {
    try {
      return this.metricsService.getSalesTrend();
    } catch (error) {
      logger.error({ error }, "Error fetching chart data");
      throw error;
    }
  }

  /**
   * Get top selling products using SalesRepository
   */
  async getTopSellingProducts(limit: number = 10) {
    try {
      return this.salesRepo.getTopProducts({ limit });
    } catch (error) {
      logger.error({ error }, "Error fetching top products");
      throw error;
    }
  }

  /**
   * Get sales breakdown using SalesRepository
   */
  async getSalesByPaymentMethod() {
    try {
      const monthRange = getMonthRange();
      const invoices = await this.salesRepo.getInvoices({
        startDate: monthRange.startDate,
        endDate: monthRange.endDate,
      });

      const methodMap = new Map<string, { total: number; count: number }>();
      invoices.forEach((inv) => {
        const method = inv.paymentStatus || "UNPAID";
        const current = methodMap.get(method) || { total: 0, count: 0 };
        methodMap.set(method, {
          total: sum(current.total, inv.total),
          count: current.count + 1,
        });
      });

      return Array.from(methodMap.entries()).map(([method, data]) => ({
        method,
        total: data.total,
        count: data.count,
      }));
    } catch (error) {
      logger.error({ error }, "Error fetching sales by payment method");
      throw error;
    }
  }

  /**
   * Get financial KPIs
   */
  async getFinancialKPIs() {
    try {
      const summary = await this.getFinancialSummary();
      const incomeStatement = await this.getIncomeStatement();

      return {
        grossProfitMargin: incomeStatement.grossMargin,
        netProfitMargin: incomeStatement.netMargin,
        returnOnSales: summary.netMargin,
        currentRatio: 2.5,
        quickRatio: 1.8,
        salesGrowth: 0,
        expenseRatio: summary.revenue > 0 ? roundCurrency((summary.expenses / summary.revenue) * 100) : 0,
        averageSaleValue: summary.salesCount > 0 ? roundCurrency(summary.revenue / summary.salesCount) : 0,
        cashPosition: summary.cashBalance,
        outstandingReceivables: summary.accountsReceivable,
      };
    } catch (error) {
      logger.error(`Error fetching financial KPIs: ${error}`);
      throw error;
    }
  }
}
