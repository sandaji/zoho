/**
 * @deprecated ComprehensiveFinanceService has been retired.
 *
 * All methods previously stubbed here (returning 0 for every figure) now
 * delegate to FinanceAnalyticsService, which is the single source of truth
 * for all financial analytics reading from JournalHeader / JournalLine.
 *
 * Callers should import FinanceAnalyticsService directly.
 */

import { FinanceAnalyticsService, type DateRange } from "../services/finance-analytics.service";

const analytics = new FinanceAnalyticsService();

/** @deprecated Use FinanceAnalyticsService directly */
export class ComprehensiveFinanceService {
  /** @deprecated Use FinanceAnalyticsService.getFinancialSummary() */
  async getFinancialSummary(dateRange?: DateRange) {
    return analytics.getFinancialSummary(dateRange);
  }

  /** @deprecated Use FinanceAnalyticsService.getIncomeStatement() */
  async getIncomeStatement(startDate: Date, endDate: Date) {
    return analytics.getIncomeStatement({ startDate, endDate });
  }

  /** @deprecated Use FinanceAnalyticsService.getBalanceSheet() */
  async getBalanceSheet(asOfDate: Date = new Date()) {
    return analytics.getBalanceSheet(asOfDate);
  }

  /** @deprecated Use FinanceAnalyticsService.getCashFlowStatement() */
  async getCashFlowStatement(startDate: Date, endDate: Date) {
    return analytics.getCashFlowStatement({ startDate, endDate });
  }
}
