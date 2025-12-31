"use strict";
/**
 * Comprehensive Finance Service
 * Handles all financial operations for the ERP system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComprehensiveFinanceService = void 0;
const db_1 = require("../../../lib/db");
const logger_1 = require("../../../lib/logger");
const errors_1 = require("../../../lib/errors");
class ComprehensiveFinanceService {
    // ============================================================================
    // 1. FINANCIAL SUMMARY & DASHBOARD
    // ============================================================================
    /**
     * Get comprehensive financial summary with key metrics
     */
    async getFinancialSummary(dateRange) {
        try {
            const { startDate, endDate } = dateRange || this.getCurrentFiscalYear();
            // Run parallel queries for performance
            const [cashBalance, receivables, payables, salesData, expenses, assets, liabilities, equity] = await Promise.all([
                this.getCashBalance(),
                this.getTotalReceivables(),
                this.getTotalPayables(),
                this.getRevenue(startDate, endDate),
                this.getExpenses(startDate, endDate),
                this.getTotalAssets(),
                this.getTotalLiabilities(),
                this.getTotalEquity()
            ]);
            const netIncome = salesData.revenue - expenses.total;
            const grossProfit = salesData.revenue - salesData.cogs;
            const operatingIncome = grossProfit - expenses.operating;
            const ebitda = operatingIncome + expenses.depreciation + expenses.amortization;
            // Calculate financial ratios
            const currentAssets = assets.current;
            const currentLiabilities = liabilities.current;
            const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
            const quickRatio = currentLiabilities > 0
                ? (currentAssets - assets.inventory) / currentLiabilities
                : 0;
            const debtToEquity = equity > 0 ? liabilities.total / equity : 0;
            const returnOnAssets = assets.total > 0 ? (netIncome / assets.total) * 100 : 0;
            const returnOnEquity = equity > 0 ? (netIncome / equity) * 100 : 0;
            return {
                cashBalance,
                accountsReceivable: receivables,
                accountsPayable: payables,
                revenue: salesData.revenue,
                expenses: expenses.total,
                netIncome,
                grossProfit,
                operatingIncome,
                ebitda,
                currentRatio,
                quickRatio,
                debtToEquity,
                returnOnAssets,
                returnOnEquity
            };
        }
        catch (error) {
            logger_1.logger.error({ error: error }, "Error getting financial summary");
            throw new errors_1.AppError(errors_1.ErrorCode.INTERNAL_ERROR, 500, "Failed to get financial summary");
        }
    }
    // ============================================================================
    // 2. INCOME STATEMENT
    // ============================================================================
    /**
     * Generate comprehensive income statement
     */
    async getIncomeStatement(startDate, endDate) {
        try {
            const [revenue, cogs, operatingExpenses, otherIncome, otherExpenses, taxes] = await Promise.all([
                this.getRevenueDetailed(startDate, endDate),
                this.getCostOfGoodsSold(startDate, endDate),
                this.getOperatingExpenses(startDate, endDate),
                this.getOtherIncome(startDate, endDate),
                this.getOtherExpenses(startDate, endDate),
                this.getTaxes(startDate, endDate)
            ]);
            const grossProfit = revenue.total - cogs;
            const operatingIncome = grossProfit - operatingExpenses.total;
            const incomeBeforeTax = operatingIncome + otherIncome - otherExpenses;
            const netIncome = incomeBeforeTax - taxes;
            return {
                revenue: {
                    ...revenue,
                    total: revenue.total
                },
                costOfGoodsSold: cogs,
                grossProfit,
                grossProfitMargin: revenue.total > 0 ? (grossProfit / revenue.total) * 100 : 0,
                operatingExpenses: {
                    ...operatingExpenses,
                    total: operatingExpenses.total
                },
                operatingIncome,
                operatingMargin: revenue.total > 0 ? (operatingIncome / revenue.total) * 100 : 0,
                otherIncome,
                otherExpenses,
                incomeBeforeTax,
                taxes,
                netIncome,
                netProfitMargin: revenue.total > 0 ? (netIncome / revenue.total) * 100 : 0,
                period: {
                    startDate,
                    endDate
                }
            };
        }
        catch (error) {
            logger_1.logger.error({ error: error }, "Error generating income statement");
            throw new errors_1.AppError(errors_1.ErrorCode.INTERNAL_ERROR, 500, "Failed to generate income statement");
        }
    }
    // ============================================================================
    // 3. BALANCE SHEET
    // ============================================================================
    /**
     * Generate balance sheet
     */
    async getBalanceSheet(asOfDate = new Date()) {
        try {
            const [assets, liabilities, equity] = await Promise.all([
                this.getAssetsBreakdown(asOfDate),
                this.getLiabilitiesBreakdown(asOfDate),
                this.getEquityBreakdown(asOfDate)
            ]);
            const totalAssets = assets.current + assets.fixed + assets.other;
            const totalLiabilities = liabilities.current + liabilities.longTerm;
            const totalEquity = equity.capital + equity.retainedEarnings + equity.currentYearEarnings;
            return {
                assets: {
                    currentAssets: assets.currentDetails,
                    fixedAssets: assets.fixedDetails,
                    otherAssets: assets.otherDetails,
                    totalCurrent: assets.current,
                    totalFixed: assets.fixed,
                    totalOther: assets.other,
                    total: totalAssets
                },
                liabilities: {
                    currentLiabilities: liabilities.currentDetails,
                    longTermLiabilities: liabilities.longTermDetails,
                    totalCurrent: liabilities.current,
                    totalLongTerm: liabilities.longTerm,
                    total: totalLiabilities
                },
                equity: {
                    details: equity.details,
                    total: totalEquity
                },
                balanceCheck: {
                    assetsTotal: totalAssets,
                    liabilitiesAndEquityTotal: totalLiabilities + totalEquity,
                    balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
                },
                asOfDate
            };
        }
        catch (error) {
            logger_1.logger.error({ error: error }, "Error generating balance sheet");
            throw new errors_1.AppError(errors_1.ErrorCode.INTERNAL_ERROR, 500, "Failed to generate balance sheet");
        }
    }
    // ============================================================================
    // 4. CASH FLOW STATEMENT
    // ============================================================================
    /**
     * Generate cash flow statement using indirect method
     */
    async getCashFlowStatement(startDate, endDate) {
        try {
            const [operating, investing, financing] = await Promise.all([
                this.getOperatingCashFlow(startDate, endDate),
                this.getInvestingCashFlow(startDate, endDate),
                this.getFinancingCashFlow(startDate, endDate)
            ]);
            const netCashFlow = operating.total + investing.total + financing.total;
            const beginningCash = await this.getCashBalanceAtDate(startDate);
            const endingCash = beginningCash + netCashFlow;
            return {
                operatingActivities: {
                    ...operating,
                    total: operating.total
                },
                investingActivities: {
                    ...investing,
                    total: investing.total
                },
                financingActivities: {
                    ...financing,
                    total: financing.total
                },
                netCashFlow,
                beginningCash,
                endingCash,
                period: {
                    startDate,
                    endDate
                }
            };
        }
        catch (error) {
            logger_1.logger.error({ error: error }, "Error generating cash flow statement");
            throw new errors_1.AppError(errors_1.ErrorCode.INTERNAL_ERROR, 500, "Failed to generate cash flow statement");
        }
    }
    // ============================================================================
    // 5. ACCOUNTS RECEIVABLE & PAYABLE
    // ============================================================================
    /**
     * Get accounts receivable summary with aging analysis
     */
    async getAccountsReceivableSummary() {
        try {
            const [total, aging, byCustomer, overdue] = await Promise.all([
                this.getTotalReceivables(),
                this.getReceivablesAging(),
                this.getReceivablesByCustomer(),
                this.getOverdueReceivables()
            ]);
            return {
                total,
                aging,
                byCustomer,
                overdue,
                averageDaysOutstanding: aging.weightedAverage || 0,
                collectionEffectiveness: this.calculateCollectionEffectiveness(aging)
            };
        }
        catch (error) {
            logger_1.logger.error({ error: error }, "Error getting AR summary");
            throw new errors_1.AppError(errors_1.ErrorCode.INTERNAL_ERROR, 500, "Failed to get AR summary");
        }
    }
    /**
     * Get accounts payable summary with aging analysis
     */
    async getAccountsPayableSummary() {
        try {
            const [total, aging, byVendor, overdue] = await Promise.all([
                this.getTotalPayables(),
                this.getPayablesAging(),
                this.getPayablesByVendor(),
                this.getOverduePayables()
            ]);
            return {
                total,
                aging,
                byVendor,
                overdue,
                averageDaysOutstanding: aging.weightedAverage || 0
            };
        }
        catch (error) {
            logger_1.logger.error({ error: error }, "Error getting AP summary");
            throw new errors_1.AppError(errors_1.ErrorCode.INTERNAL_ERROR, 500, "Failed to get AP summary");
        }
    }
    // ============================================================================
    // 6. BUDGETING & FORECASTING
    // ============================================================================
    /**
     * Get budget vs actual analysis
     */
    async getBudgetAnalysis(fiscalYear) {
        try {
            const budgets = await db_1.prisma.budget.findMany({
                where: {
                    fiscal_year: fiscalYear,
                    status: 'active'
                },
                include: {
                    account: true
                }
            });
            const analysis = budgets.map(budget => {
                const variance = budget.actual_amount - budget.budgeted_amount;
                const variancePercent = budget.budgeted_amount > 0
                    ? (variance / budget.budgeted_amount) * 100
                    : 0;
                return {
                    accountCode: budget.account.account_code,
                    accountName: budget.account.account_name,
                    budgeted: budget.budgeted_amount,
                    actual: budget.actual_amount,
                    variance,
                    variancePercent,
                    status: this.getBudgetStatus(variancePercent)
                };
            });
            const totalBudgeted = budgets.reduce((sum, b) => sum + b.budgeted_amount, 0);
            const totalActual = budgets.reduce((sum, b) => sum + b.actual_amount, 0);
            return {
                budgets: analysis,
                summary: {
                    totalBudgeted,
                    totalActual,
                    totalVariance: totalActual - totalBudgeted,
                    totalVariancePercent: totalBudgeted > 0
                        ? ((totalActual - totalBudgeted) / totalBudgeted) * 100
                        : 0
                },
                fiscalYear
            };
        }
        catch (error) {
            logger_1.logger.error({ error: error }, "Error getting budget analysis");
            throw new errors_1.AppError(errors_1.ErrorCode.INTERNAL_ERROR, 500, "Failed to get budget analysis");
        }
    }
    /**
     * Generate financial forecast using historical data
     */
    async generateForecast(forecastType, periods = 12, method = 'linear') {
        try {
            // Get historical data for the past 24 months
            const endDate = new Date();
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - 24);
            const historicalData = await this.getHistoricalData(forecastType, startDate, endDate);
            // Generate forecast based on method
            let forecastData;
            switch (method) {
                case 'linear':
                    forecastData = this.linearRegression(historicalData, periods);
                    break;
                case 'moving_average':
                    forecastData = this.movingAverage(historicalData, periods);
                    break;
                case 'exponential':
                    forecastData = this.exponentialSmoothing(historicalData, periods);
                    break;
                default:
                    forecastData = this.linearRegression(historicalData, periods);
            }
            // Calculate confidence intervals
            const withConfidence = this.addConfidenceIntervals(forecastData, historicalData);
            return {
                forecastType,
                method,
                periods,
                historical: historicalData,
                forecast: withConfidence,
                accuracy: this.calculateForecastAccuracy(historicalData),
                generatedAt: new Date()
            };
        }
        catch (error) {
            logger_1.logger.error({ error: error }, "Error generating forecast");
            throw new errors_1.AppError(errors_1.ErrorCode.INTERNAL_ERROR, 500, "Failed to generate forecast");
        }
    }
    // ============================================================================
    // 7. FINANCIAL RATIOS & KPIs
    // ============================================================================
    /**
     * Calculate all key financial ratios
     */
    async calculateFinancialRatios(dateRange) {
        try {
            const { startDate, endDate } = dateRange || this.getCurrentFiscalYear();
            const [liquidityRatios, profitabilityRatios, efficiencyRatios, leverageRatios, marketRatios] = await Promise.all([
                this.calculateLiquidityRatios(),
                this.calculateProfitabilityRatios(startDate, endDate),
                this.calculateEfficiencyRatios(startDate, endDate),
                this.calculateLeverageRatios(),
                this.calculateMarketRatios(startDate, endDate)
            ]);
            return {
                liquidity: liquidityRatios,
                profitability: profitabilityRatios,
                efficiency: efficiencyRatios,
                leverage: leverageRatios,
                market: marketRatios,
                period: { startDate, endDate }
            };
        }
        catch (error) {
            logger_1.logger.error({ error: error }, "Error calculating financial ratios");
            throw new errors_1.AppError(errors_1.ErrorCode.INTERNAL_ERROR, 500, "Failed to calculate ratios");
        }
    }
    // ============================================================================
    // 8. TREASURY MANAGEMENT
    // ============================================================================
    /**
     * Get treasury dashboard with bank accounts and cash position
     */
    async getTreasuryDashboard() {
        try {
            const [bankAccounts, cashPosition, upcomingPayments, upcomingReceipts] = await Promise.all([
                this.getBankAccountsSummary(),
                this.getCashPositionForecast(30), // 30-day forecast
                this.getUpcomingPayments(30),
                this.getUpcomingReceipts(30)
            ]);
            return {
                bankAccounts,
                cashPosition,
                upcomingPayments,
                upcomingReceipts,
                netCashFlow: upcomingReceipts.total - upcomingPayments.total,
                projectedBalance: cashPosition.current + (upcomingReceipts.total - upcomingPayments.total)
            };
        }
        catch (error) {
            logger_1.logger.error({ error: error }, "Error getting treasury dashboard");
            throw new errors_1.AppError(errors_1.ErrorCode.INTERNAL_ERROR, 500, "Failed to get treasury data");
        }
    }
    // ============================================================================
    // HELPER METHODS
    // ============================================================================
    getCurrentFiscalYear() {
        const now = new Date();
        const year = now.getFullYear();
        return {
            startDate: new Date(year, 0, 1),
            endDate: new Date(year, 11, 31)
        };
    }
    async getCashBalance() {
        const result = await db_1.prisma.bankAccount.aggregate({
            where: { is_active: true },
            _sum: { current_balance: true }
        });
        return result._sum.current_balance || 0;
    }
    async getTotalReceivables() {
        const result = await db_1.prisma.accountReceivable.aggregate({
            where: { status: { in: ['outstanding', 'partial'] } },
            _sum: { balance: true }
        });
        return result._sum.balance || 0;
    }
    async getTotalPayables() {
        const result = await db_1.prisma.accountPayable.aggregate({
            where: { status: { in: ['outstanding', 'partial'] } },
            _sum: { balance: true }
        });
        return result._sum.balance || 0;
    }
    async getRevenue(startDate, endDate) {
        const sales = await db_1.prisma.sales.aggregate({
            where: {
                created_date: {
                    gte: startDate,
                    lte: endDate
                },
                status: { in: ['confirmed', 'shipped', 'delivered'] }
            },
            _sum: {
                grand_total: true,
                subtotal: true
            }
        });
        return {
            revenue: sales._sum.grand_total || 0,
            cogs: 0 // Calculate separately
        };
    }
    async getExpenses(_startDate, _endDate) {
        // This would query journal entries or expense transactions
        // For now, returning mock data structure
        return {
            total: 0,
            operating: 0,
            depreciation: 0,
            amortization: 0
        };
    }
    async getTotalAssets() {
        // Query chart of accounts for asset accounts
        return {
            current: 0,
            inventory: 0,
            total: 0
        };
    }
    async getTotalLiabilities() {
        return {
            current: 0,
            total: 0
        };
    }
    async getTotalEquity() {
        return 0;
    }
    getBudgetStatus(variancePercent) {
        if (Math.abs(variancePercent) <= 5)
            return 'on_track';
        if (variancePercent > 5)
            return 'over_budget';
        return 'under_budget';
    }
    calculateCollectionEffectiveness(_aging) {
        // Calculate collection effectiveness index
        return 0;
    }
    linearRegression(_data, _periods) {
        // Implement linear regression forecasting
        return [];
    }
    movingAverage(_data, _periods) {
        // Implement moving average forecasting
        return [];
    }
    exponentialSmoothing(_data, _periods) {
        // Implement exponential smoothing
        return [];
    }
    addConfidenceIntervals(forecast, _historical) {
        // Add 95% confidence intervals to forecast
        return forecast;
    }
    calculateForecastAccuracy(_historical) {
        // Calculate MAPE, RMSE, etc.
        return {};
    }
    // Additional helper methods would be implemented here...
    async getRevenueDetailed(_startDate, _endDate) { return { total: 0 }; }
    async getCostOfGoodsSold(_startDate, _endDate) { return 0; }
    async getOperatingExpenses(_startDate, _endDate) { return { total: 0 }; }
    async getOtherIncome(_startDate, _endDate) { return 0; }
    async getOtherExpenses(_startDate, _endDate) { return 0; }
    async getTaxes(_startDate, _endDate) { return 0; }
    async getAssetsBreakdown(_asOfDate) { return { current: 0, fixed: 0, other: 0, currentDetails: {}, fixedDetails: {}, otherDetails: {} }; }
    async getLiabilitiesBreakdown(_asOfDate) { return { current: 0, longTerm: 0, currentDetails: {}, longTermDetails: {} }; }
    async getEquityBreakdown(_asOfDate) { return { capital: 0, retainedEarnings: 0, currentYearEarnings: 0, details: {} }; }
    async getOperatingCashFlow(_startDate, _endDate) { return { total: 0 }; }
    async getInvestingCashFlow(_startDate, _endDate) { return { total: 0 }; }
    async getFinancingCashFlow(_startDate, _endDate) { return { total: 0 }; }
    async getCashBalanceAtDate(_date) { return 0; }
    async getReceivablesAging() { return {}; }
    async getReceivablesByCustomer() { return []; }
    async getOverdueReceivables() { return []; }
    async getPayablesAging() { return {}; }
    async getPayablesByVendor() { return []; }
    async getOverduePayables() { return []; }
    async getHistoricalData(_type, _startDate, _endDate) { return []; }
    async calculateLiquidityRatios() { return {}; }
    async calculateProfitabilityRatios(_startDate, _endDate) { return {}; }
    async calculateEfficiencyRatios(_startDate, _endDate) { return {}; }
    async calculateLeverageRatios() { return {}; }
    async calculateMarketRatios(_startDate, _endDate) { return {}; }
    async getBankAccountsSummary() { return []; }
    async getCashPositionForecast(_days) { return { current: 0 }; }
    async getUpcomingPayments(_days) { return { total: 0 }; }
    async getUpcomingReceipts(_days) { return { total: 0 }; }
}
exports.ComprehensiveFinanceService = ComprehensiveFinanceService;
