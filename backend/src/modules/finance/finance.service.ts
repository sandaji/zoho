/**
 * Finance Service - Database-driven financial analytics
 * Refactored to consume Repositories & DashboardMetricsService without knowing database table names.
 */

import { logger } from '@core/utils/logger';
import { salesRepository, SalesRepository } from "../../repositories/sales.repository";
import { inventoryRepository, InventoryRepository } from "../../repositories/inventory.repository";
import { financeRepository, FinanceRepository } from "../../repositories/finance.repository";
import { dashboardMetricsService, DashboardMetricsService } from "../../services/dashboard-metrics.service";
import { getFinancialYear, getMonthRange, type DateRange } from "../../utils/date";
import { sum, subtract, multiply, percentage, roundCurrency } from "../../utils/money";
import { FinanceAnalyticsService, financeAnalytics } from "./services/finance-analytics.service";

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

      // Revenue / expenses / profit / margins come from the general ledger
      // (FinanceAnalyticsService) so the strip, KPIs, P&L preview, chart and
      // trends all share one source of truth. Cash and AR/AP are also served
      // by it (AR/AP via the same services the detail widgets use). Sales
      // count, inventory and payroll are operational figures, not GL ones.
      const [gl, salesTotals, activeProducts, lowStockProducts, payrollSummary] =
        await Promise.all([
          financeAnalytics.getFinancialSummary(fy),
          this.salesRepo.getSalesTotals({
            startDate: fy.startDate,
            endDate: fy.endDate,
          }),
          this.inventoryRepo.getActiveProductsCount(),
          this.inventoryRepo.getLowStockItemsCount(),
          this.financeRepo.getPayrollSummary({
            startDate: fy.startDate,
            endDate: fy.endDate,
          }),
        ]);

      return {
        cashBalance: roundCurrency(gl.cashBalance),
        accountsReceivable: roundCurrency(gl.accountsReceivable),
        accountsPayable: roundCurrency(gl.accountsPayable),
        revenue: roundCurrency(gl.revenue),
        profit: roundCurrency(gl.netIncome),
        expenses: roundCurrency(gl.expenses),
        // The GL has no COGS account range yet, so gross margin is an estimate
        // (see FinanceAnalyticsService); net margin is the real GL figure.
        grossMargin: roundCurrency(gl.grossMargin),
        netMargin: roundCurrency(gl.netMargin),
        salesCount: salesTotals.count,
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
  async getIncomeStatement(range?: DateRange) {
    try {
      const fy = range ?? getFinancialYear();

      // GL-backed (same source as the summary). Payroll is already inside GL
      // expenses, so it is shown separately for information only and is never
      // added on top.
      const [gl, salesTotals, payrollSummary] = await Promise.all([
        financeAnalytics.getIncomeStatement(fy),
        this.salesRepo.getSalesTotals({
          startDate: fy.startDate,
          endDate: fy.endDate,
        }),
        this.financeRepo.getPayrollSummary({
          startDate: fy.startDate,
          endDate: fy.endDate,
        }),
      ]);

      return {
        revenue: roundCurrency(gl.revenue),
        cogs: roundCurrency(gl.cogs), // estimate until a COGS account range exists
        grossProfit: roundCurrency(gl.grossProfit),
        operatingExpenses: roundCurrency(gl.operatingExpenses),
        payrollExpenses: payrollSummary.netSalary,
        totalExpenses: roundCurrency(gl.operatingExpenses),
        taxes: salesTotals.tax,
        netIncome: roundCurrency(gl.netIncome),
        grossMargin: roundCurrency(gl.grossProfitMargin),
        netMargin: roundCurrency(gl.netProfitMargin),
      };
    } catch (error) {
      logger.error({ error }, "Error fetching income statement");
      throw error;
    }
  }

  /**
   * Get revenue and expense chart data for the Revenue vs Expenses dashboard
   * widget.
   *
   * Previously delegated to DashboardMetricsService.getSalesTrend(), which
   * returns a StandardChartData object ({ labels, datasets, colors, legend })
   * built for a generic chart-config consumer — not the row-shaped
   * { name, revenue, expenses }[] this widget's RevenueExpenseChart component
   * expects. That mismatch reached the frontend un-validated (the API client
   * only does a TS type assertion, no runtime check) and crashed inside
   * Recharts with "chartData.slice is not a function" once BarChart tried to
   * treat the object as an array. getSalesTrend() also only carries revenue,
   * not expenses, so it couldn't have powered this chart correctly even with
   * a reshape.
   *
   * FinanceAnalyticsService.getMonthlyChartData() is the GL-backed source
   * (see that file's header comment) and already returns both revenue and
   * expenses per month, so we map it directly into the shape the frontend
   * declares (ChartData[] = { name, revenue, expenses }[]).
   */
  async getRevenueExpenseChartData() {
    try {
      const analytics = new FinanceAnalyticsService();
      const monthly = await analytics.getMonthlyChartData(new Date().getFullYear());
      return monthly.map((m) => ({
        name: m.monthLabel,
        revenue: m.revenue,
        expenses: m.expenses,
      }));
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
        // currentRatio / quickRatio / salesGrowth were hardcoded placeholders
        // and have been removed. Add them back only when they can be computed
        // from real data (balance-sheet current assets/liabilities, prior-period
        // revenue).
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
