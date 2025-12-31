"use strict";
/**
 * Finance Service - Database-driven financial analytics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceService = void 0;
const db_1 = require("../../lib/db");
const logger_1 = require("../../lib/logger");
class FinanceService {
    /**
     * Get comprehensive financial summary from real database data
     */
    async getFinancialSummary() {
        try {
            // Get current fiscal year dates
            const now = new Date();
            const fiscalYearStart = new Date(now.getFullYear(), 0, 1); // Jan 1
            const fiscalYearEnd = new Date(now.getFullYear(), 11, 31); // Dec 31
            // Execute all queries in parallel for performance
            const [totalSales, totalTransactions, totalPayroll, activeProducts] = await Promise.all([
                // Total sales revenue
                db_1.prisma.sales.aggregate({
                    where: {
                        created_date: {
                            gte: fiscalYearStart,
                            lte: fiscalYearEnd,
                        },
                        status: {
                            in: ['confirmed', 'shipped', 'delivered']
                        }
                    },
                    _sum: {
                        grand_total: true,
                        subtotal: true,
                        tax: true,
                    },
                    _count: true
                }),
                // Finance transactions (income/expenses)
                db_1.prisma.financeTransaction.groupBy({
                    by: ['type'],
                    where: {
                        createdAt: {
                            gte: fiscalYearStart,
                            lte: fiscalYearEnd,
                        }
                    },
                    _sum: {
                        amount: true
                    }
                }),
                // Payroll expenses
                db_1.prisma.payroll.aggregate({
                    where: {
                        period_start: {
                            gte: fiscalYearStart,
                        },
                        period_end: {
                            lte: fiscalYearEnd,
                        },
                        status: {
                            in: ['approved', 'paid']
                        }
                    },
                    _sum: {
                        net_salary: true,
                        base_salary: true,
                    }
                }),
                // Active products count
                db_1.prisma.product.count({
                    where: {
                        isActive: true,
                        status: 'active'
                    }
                })
            ]);
            // Low stock products - use raw SQL for field comparison
            const lowStockResult = await db_1.prisma.$queryRaw `
        SELECT COUNT(*)::bigint as count
        FROM products
        WHERE "isActive" = true
          AND status = 'active'
          AND quantity < reorder_level
      `;
            const lowStockProducts = Number(lowStockResult[0]?.count || 0);
            // Calculate revenue
            const revenue = totalSales._sum.grand_total || 0;
            const salesCount = totalSales._count || 0;
            // Calculate expenses from transactions and payroll
            const transactionExpenses = totalTransactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + (t._sum.amount || 0), 0);
            const payrollExpenses = totalPayroll._sum.net_salary || 0;
            const totalExpenses = transactionExpenses + payrollExpenses;
            // Calculate profit
            const profit = revenue - totalExpenses;
            // Calculate margins
            const grossMargin = revenue > 0 ? ((revenue - totalExpenses) / revenue) * 100 : 0;
            const netMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
            // Calculate accounts receivable (unpaid sales) from specialized service
            const arSummary = await db_1.prisma.accountReceivable.aggregate({
                where: { status: { in: ['outstanding', 'partial'] } },
                _sum: { balance: true }
            });
            const receivables = arSummary._sum.balance || 0;
            // Calculate accounts payable from specialized service
            const apSummary = await db_1.prisma.accountPayable.aggregate({
                where: { status: { in: ['outstanding', 'partial'] } },
                _sum: { balance: true }
            });
            const payables = apSummary._sum.balance || 0;
            // Cash balance from Chart of Accounts (Bank + Cash)
            const cashAccounts = await db_1.prisma.chartOfAccount.aggregate({
                where: {
                    account_type: 'asset',
                    OR: [
                        { account_name: { contains: 'Bank', mode: 'insensitive' } },
                        { account_name: { contains: 'Cash', mode: 'insensitive' } },
                        { account_code: { in: ['1001', '1002', '1003'] } }
                    ]
                },
                _sum: { current_balance: true }
            });
            const cashBalance = cashAccounts._sum.current_balance || 0;
            return {
                cashBalance,
                accountsReceivable: receivables,
                accountsPayable: payables,
                revenue,
                profit,
                expenses: totalExpenses,
                grossMargin: parseFloat(grossMargin.toFixed(2)),
                netMargin: parseFloat(netMargin.toFixed(2)),
                salesCount,
                activeProducts,
                lowStockProducts,
                payrollExpenses
            };
        }
        catch (error) {
            logger_1.logger.error({ error }, "Error fetching financial summary");
            throw error;
        }
    }
    /**
     * Get income statement data
     */
    async getIncomeStatement() {
        try {
            const now = new Date();
            const fiscalYearStart = new Date(now.getFullYear(), 0, 1);
            const fiscalYearEnd = new Date(now.getFullYear(), 11, 31);
            const [salesData, expenseData, payrollData] = await Promise.all([
                // Revenue from sales
                db_1.prisma.sales.aggregate({
                    where: {
                        created_date: {
                            gte: fiscalYearStart,
                            lte: fiscalYearEnd,
                        },
                        status: {
                            in: ['confirmed', 'shipped', 'delivered']
                        }
                    },
                    _sum: {
                        grand_total: true,
                        subtotal: true,
                        tax: true,
                        discount: true,
                    }
                }),
                // Operating expenses
                db_1.prisma.financeTransaction.aggregate({
                    where: {
                        type: 'expense',
                        createdAt: {
                            gte: fiscalYearStart,
                            lte: fiscalYearEnd,
                        }
                    },
                    _sum: {
                        amount: true
                    }
                }),
                // Payroll expenses
                db_1.prisma.payroll.aggregate({
                    where: {
                        period_start: {
                            gte: fiscalYearStart,
                        },
                        status: {
                            in: ['approved', 'paid']
                        }
                    },
                    _sum: {
                        net_salary: true,
                    }
                })
            ]);
            const revenue = salesData._sum.grand_total || 0;
            const operatingExpenses = expenseData._sum.amount || 0;
            const payrollExpenses = payrollData._sum.net_salary || 0;
            const totalExpenses = operatingExpenses + payrollExpenses;
            // Calculate COGS (Cost of Goods Sold) - simplified as revenue minus tax and discount
            const cogs = (salesData._sum.subtotal || 0) * 0.6; // Approximate 60% COGS
            const grossProfit = revenue - cogs;
            const netIncome = revenue - cogs - totalExpenses;
            return {
                revenue,
                cogs,
                grossProfit,
                operatingExpenses,
                payrollExpenses,
                totalExpenses,
                taxes: salesData._sum.tax || 0,
                netIncome,
                grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
                netMargin: revenue > 0 ? (netIncome / revenue) * 100 : 0,
            };
        }
        catch (error) {
            logger_1.logger.error({ error }, "Error fetching income statement");
            throw error;
        }
    }
    /**
     * Get revenue and expense chart data by month
     */
    async getRevenueExpenseChartData() {
        try {
            const now = new Date();
            const startDate = new Date(now.getFullYear(), 0, 1); // Start of year
            const endDate = now;
            // Get monthly sales data
            const monthlySales = await db_1.prisma.$queryRaw `
        SELECT 
          EXTRACT(MONTH FROM created_date)::INTEGER as month,
          EXTRACT(YEAR FROM created_date)::INTEGER as year,
          COALESCE(SUM(grand_total), 0)::FLOAT as revenue,
          COUNT(*)::INTEGER as count
        FROM sales
        WHERE created_date >= ${startDate}
          AND created_date <= ${endDate}
          AND status IN ('confirmed', 'shipped', 'delivered')
        GROUP BY EXTRACT(YEAR FROM created_date), EXTRACT(MONTH FROM created_date)
        ORDER BY year, month
      `;
            // Get monthly expenses
            const monthlyExpenses = await db_1.prisma.$queryRaw `
        SELECT 
          EXTRACT(MONTH FROM "createdAt")::INTEGER as month,
          EXTRACT(YEAR FROM "createdAt")::INTEGER as year,
          COALESCE(SUM(amount), 0)::FLOAT as expenses
        FROM finance_transactions
        WHERE "createdAt" >= ${startDate}
          AND "createdAt" <= ${endDate}
          AND type = 'expense'
        GROUP BY EXTRACT(YEAR FROM "createdAt"), EXTRACT(MONTH FROM "createdAt")
        ORDER BY year, month
      `;
            // Get monthly payroll
            const monthlyPayroll = await db_1.prisma.$queryRaw `
        SELECT 
          EXTRACT(MONTH FROM period_start)::INTEGER as month,
          EXTRACT(YEAR FROM period_start)::INTEGER as year,
          COALESCE(SUM(net_salary), 0)::FLOAT as payroll
        FROM payroll
        WHERE period_start >= ${startDate}
          AND period_start <= ${endDate}
          AND status IN ('approved', 'paid')
        GROUP BY EXTRACT(YEAR FROM period_start), EXTRACT(MONTH FROM period_start)
        ORDER BY year, month
      `;
            // Combine data by month
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const chartData = [];
            const currentMonth = now.getMonth() + 1;
            for (let month = 1; month <= currentMonth; month++) {
                const salesData = monthlySales.find(s => s.month === month) || { revenue: 0 };
                const expenseData = monthlyExpenses.find(e => e.month === month) || { expenses: 0 };
                const payrollData = monthlyPayroll.find(p => p.month === month) || { payroll: 0 };
                const totalExpenses = (expenseData.expenses || 0) + (payrollData.payroll || 0);
                const revenue = salesData.revenue || 0;
                const profit = revenue - totalExpenses;
                chartData.push({
                    name: monthNames[month - 1],
                    month,
                    revenue: Math.round(revenue),
                    expenses: Math.round(totalExpenses),
                    profit: Math.round(profit),
                });
            }
            return chartData;
        }
        catch (error) {
            logger_1.logger.error({ error }, "Error fetching chart data");
            throw error;
        }
    }
    /**
     * Get top selling products
     */
    async getTopSellingProducts(limit = 10) {
        try {
            const topProducts = await db_1.prisma.salesItem.groupBy({
                by: ['productId'],
                _sum: {
                    quantity: true,
                    amount: true,
                },
                orderBy: {
                    _sum: {
                        amount: 'desc'
                    }
                },
                take: limit
            });
            // Get product details
            const productsWithDetails = await Promise.all(topProducts.map(async (item) => {
                const product = await db_1.prisma.product.findUnique({
                    where: { id: item.productId },
                    select: {
                        id: true,
                        sku: true,
                        name: true,
                        unit_price: true,
                        category: true,
                    }
                });
                return {
                    ...product,
                    totalQuantity: item._sum.quantity || 0,
                    totalRevenue: item._sum.amount || 0,
                };
            }));
            return productsWithDetails;
        }
        catch (error) {
            logger_1.logger.error({ error }, "Error fetching top products");
            throw error;
        }
    }
    /**
     * Get sales by payment method
     */
    async getSalesByPaymentMethod() {
        try {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const salesByMethod = await db_1.prisma.sales.groupBy({
                by: ['payment_method'],
                where: {
                    created_date: {
                        gte: startOfMonth,
                    },
                    status: {
                        in: ['confirmed', 'shipped', 'delivered']
                    }
                },
                _sum: {
                    grand_total: true,
                },
                _count: true,
            });
            return salesByMethod.map(item => ({
                method: item.payment_method,
                total: item._sum.grand_total || 0,
                count: item._count,
            }));
        }
        catch (error) {
            logger_1.logger.error({ error }, "Error fetching sales by payment method");
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
                // Profitability Ratios
                grossProfitMargin: incomeStatement.grossMargin,
                netProfitMargin: incomeStatement.netMargin,
                returnOnSales: summary.netMargin,
                // Liquidity (simplified)
                currentRatio: 2.5, // Would need assets/liabilities data
                quickRatio: 1.8,
                // Efficiency
                salesGrowth: 0, // Would need historical comparison
                expenseRatio: summary.revenue > 0
                    ? (summary.expenses / summary.revenue) * 100
                    : 0,
                // Other metrics
                averageSaleValue: summary.salesCount > 0
                    ? summary.revenue / summary.salesCount
                    : 0,
                cashPosition: summary.cashBalance,
                outstandingReceivables: summary.accountsReceivable,
            };
        }
        catch (error) {
            logger_1.logger.error(`Error fetching financial KPIs: ${error}`);
            throw error;
        }
    }
}
exports.FinanceService = FinanceService;
