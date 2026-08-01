/**
 * DashboardMetricsService
 * Centralized Service for computing enterprise KPI metrics without duplicating queries across controllers.
 */

import { SalesRepository, salesRepository } from "../repositories/sales.repository";
import { InventoryRepository, inventoryRepository } from "../repositories/inventory.repository";
import { FinanceRepository, financeRepository } from "../repositories/finance.repository";
import { PurchasingRepository, purchasingRepository } from "../repositories/purchasing.repository";
import { getFinancialYear, getDateRange, DateRange } from "../utils/date";
import { sum, subtract, roundCurrency } from "../utils/money";
import { StatCardBuilder, StatCard } from "../utils/stat-card.builder";
import { ChartBuilder, StandardChartData } from "../utils/chart.builder";

export interface MetricFilterOptions {
  startDate?: Date;
  endDate?: Date;
  branchId?: string;
  period?: string;
  limit?: number;
}

export class DashboardMetricsService {
  private salesRepo: SalesRepository;
  private inventoryRepo: InventoryRepository;
  private financeRepo: FinanceRepository;
  private purchasingRepo: PurchasingRepository;

  constructor(
    salesRepo: SalesRepository = salesRepository,
    inventoryRepo: InventoryRepository = inventoryRepository,
    financeRepo: FinanceRepository = financeRepository,
    purchasingRepo: PurchasingRepository = purchasingRepository
  ) {
    this.salesRepo = salesRepo;
    this.inventoryRepo = inventoryRepo;
    this.financeRepo = financeRepo;
    this.purchasingRepo = purchasingRepo;
  }

  /**
   * Resolves filter options to an explicit DateRange
   */
  private resolveRange(filters?: MetricFilterOptions): DateRange {
    if (filters?.startDate && filters?.endDate) {
      return { startDate: filters.startDate, endDate: filters.endDate };
    }
    if (filters?.period) {
      return getDateRange(filters.period);
    }
    return getFinancialYear();
  }

  /**
   * Get total revenue
   */
  async getRevenue(filters?: MetricFilterOptions): Promise<number> {
    const range = this.resolveRange(filters);
    return this.salesRepo.getRevenue({
      startDate: range.startDate,
      endDate: range.endDate,
      branchId: filters?.branchId,
    });
  }

  /**
   * Get total expenses (operational transactions + payroll)
   */
  async getExpenses(filters?: MetricFilterOptions): Promise<number> {
    const range = this.resolveRange(filters);
    return this.financeRepo.getExpenses({
      startDate: range.startDate,
      endDate: range.endDate,
      branchId: filters?.branchId,
    });
  }

  /**
   * Get net profit (Revenue - Expenses)
   */
  async getProfit(filters?: MetricFilterOptions): Promise<number> {
    const [revenue, expenses] = await Promise.all([
      this.getRevenue(filters),
      this.getExpenses(filters),
    ]);
    return subtract(revenue, expenses);
  }

  /**
   * Get sales trend formatted into StandardChartData
   */
  async getSalesTrend(filters?: MetricFilterOptions): Promise<StandardChartData> {
    const range = this.resolveRange(filters);
    const rawTrend = await this.salesRepo.getSalesTrend({
      startDate: range.startDate,
      endDate: range.endDate,
      branchId: filters?.branchId,
    });

    const labels = rawTrend.map((t) => t.period);
    const data = rawTrend.map((t) => t.amount);

    return ChartBuilder.create()
      .setLabels(labels)
      .addDataset({
        label: "Sales Revenue",
        data,
        backgroundColor: "rgba(16, 185, 129, 0.2)",
        borderColor: "#10b981",
        fill: true,
      })
      .setColors(["#10b981"])
      .build();
  }

  /**
   * Get top customers by total order spend
   */
  async getTopCustomers(filters?: MetricFilterOptions) {
    const range = this.resolveRange(filters);
    return this.salesRepo.getTopCustomers({
      startDate: range.startDate,
      endDate: range.endDate,
      branchId: filters?.branchId,
      limit: filters?.limit || 5,
    });
  }

  /**
   * Get top products by quantity sold
   */
  async getTopProducts(filters?: MetricFilterOptions) {
    const range = this.resolveRange(filters);
    return this.salesRepo.getTopProducts({
      startDate: range.startDate,
      endDate: range.endDate,
      branchId: filters?.branchId,
      limit: filters?.limit || 5,
    });
  }

  /**
   * Get total inventory valuation
   */
  async getInventoryValue(filters?: MetricFilterOptions): Promise<number> {
    return this.inventoryRepo.getInventoryValue({
      branchId: filters?.branchId,
    });
  }

  /**
   * Get total cash balance across bank accounts
   */
  async getCashBalance(filters?: MetricFilterOptions): Promise<number> {
    return this.financeRepo.getCashBalance({
      branchId: filters?.branchId,
    });
  }

  /**
   * Helper to return standardized summary StatCards for executive dashboards
   */
  async getSummaryCards(filters?: MetricFilterOptions): Promise<Record<string, StatCard>> {
    const [revenue, expenses, profit, inventoryVal, cashBal, lowStock] = await Promise.all([
      this.getRevenue(filters),
      this.getExpenses(filters),
      this.getProfit(filters),
      this.getInventoryValue(filters),
      this.getCashBalance(filters),
      this.inventoryRepo.getLowStockItemsCount({ branchId: filters?.branchId }),
    ]);

    return {
      revenueCard: StatCardBuilder.create("Total Revenue", revenue)
        .setIcon("dollar-sign")
        .setColor("emerald")
        .setTooltip("Total sales revenue for the period")
        .build(),
      expensesCard: StatCardBuilder.create("Total Expenses", expenses)
        .setIcon("credit-card")
        .setColor("rose")
        .setTooltip("Operational expenses and payroll")
        .build(),
      profitCard: StatCardBuilder.create("Net Profit", profit)
        .setIcon("trending-up")
        .setColor(profit >= 0 ? "emerald" : "rose")
        .setTooltip("Revenue minus total expenses")
        .build(),
      inventoryCard: StatCardBuilder.create("Inventory Value", inventoryVal)
        .setIcon("package")
        .setColor("sky")
        .setTooltip("Valuation of current non-depleted stock")
        .build(),
      cashCard: StatCardBuilder.create("Cash Balance", cashBal)
        .setIcon("wallet")
        .setColor("amber")
        .setTooltip("Total active liquid cash in bank accounts")
        .build(),
      lowStockCard: StatCardBuilder.create("Low Stock Alerts", lowStock)
        .setIcon("alert-triangle")
        .setColor(lowStock > 0 ? "amber" : "emerald")
        .setTooltip("Products below reorder threshold")
        .build(),
    };
  }
}

export const dashboardMetricsService = new DashboardMetricsService();
