// backend/src/modules/finance/services/alerts.service.ts
import { prisma } from "../../../lib/db";
import { logger } from "../../../lib/logger";

export type AlertSeverity = "critical" | "warning" | "info";
export type AlertType =
  | "overdue_invoice"
  | "upcoming_payment"
  | "low_cash"
  | "locked_period"
  | "reconciliation_pending";

export interface FinancialAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  timestamp: string;
  read: boolean;
}

export interface AlertsResponse {
  alerts: FinancialAlert[];
  totalCount: number;
  criticalCount: number;
  warningCount: number;
}

export class AlertsService {
  private static readonly CASH_WARNING_THRESHOLD = 10000; // Low cash warning if < 10k
  private static readonly UPCOMING_PAYMENT_DAYS = 14; // Show upcoming payments within 14 days

  /**
   * Get all financial alerts
   */
  static async getFinancialAlerts(): Promise<AlertsResponse> {
    try {
      const alerts: FinancialAlert[] = [];

      // Fetch alerts in parallel
      const [
        overdueInvoices,
        upcomingPayments,
        lowCashAlert,
        lockedPeriods,
        reconciliationPending,
      ] = await Promise.allSettled([
        this.getOverdueInvoiceAlerts(),
        this.getUpcomingPaymentAlerts(),
        this.getLowCashAlert(),
        this.getLockedPeriodAlerts(),
        this.getReconciliationPendingAlerts(),
      ]);

      // Collect all alerts (filtering out rejected promises)
      if (overdueInvoices.status === "fulfilled")
        alerts.push(...overdueInvoices.value);
      if (upcomingPayments.status === "fulfilled")
        alerts.push(...upcomingPayments.value);
      if (lowCashAlert.status === "fulfilled" && lowCashAlert.value)
        alerts.push(lowCashAlert.value);
      if (lockedPeriods.status === "fulfilled")
        alerts.push(...lockedPeriods.value);
      if (reconciliationPending.status === "fulfilled")
        alerts.push(...reconciliationPending.value);

      // Sort alerts by severity and timestamp
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      alerts.sort((a, b) => {
        const severityDiff =
          severityOrder[a.severity] - severityOrder[b.severity];
        if (severityDiff !== 0) return severityDiff;
        return (
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      });

      // Count alerts by severity
      const criticalCount = alerts.filter(
        (a) => a.severity === "critical",
      ).length;
      const warningCount = alerts.filter(
        (a) => a.severity === "warning",
      ).length;

      return {
        alerts,
        totalCount: alerts.length,
        criticalCount,
        warningCount,
      };
    } catch (error) {
      logger.error({ error }, "Error fetching financial alerts");
      return {
        alerts: [],
        totalCount: 0,
        criticalCount: 0,
        warningCount: 0,
      };
    }
  }

  /**
   * Get alerts for overdue invoices
   */
  private static async getOverdueInvoiceAlerts(): Promise<FinancialAlert[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueInvoices = await prisma.accountReceivable.findMany({
      where: {
        AND: [
          { due_date: { lt: today } },
          { status: { in: ["outstanding", "partial"] } },
          { balance: { gt: 0 } },
        ],
      },
      orderBy: { due_date: "asc" },
      take: 5, // Limit to top 5
    });

    return overdueInvoices.map((invoice, index) => {
      const daysOverdue = Math.floor(
        (today.getTime() - invoice.due_date.getTime()) / (1000 * 60 * 60 * 24),
      );
      const severity: AlertSeverity =
        daysOverdue > 30 ? "critical" : daysOverdue > 14 ? "warning" : "info";

      return {
        id: `overdue-${invoice.id}`,
        type: "overdue_invoice" as const,
        severity,
        title: `Invoice ${invoice.invoice_no} - ${daysOverdue} days overdue`,
        message: `Customer owes ${invoice.balance} - Invoice was due on ${invoice.due_date.toLocaleDateString()}`,
        actionUrl: `/dashboard/finance/ar/${invoice.id}`,
        actionLabel: "Review & Follow Up",
        timestamp: new Date().toISOString(),
        read: false,
      };
    });
  }

  /**
   * Get alerts for upcoming payments
   */
  private static async getUpcomingPaymentAlerts(): Promise<FinancialAlert[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + this.UPCOMING_PAYMENT_DAYS);

    const upcomingPayables = await prisma.accountPayable.findMany({
      where: {
        AND: [
          { due_date: { gte: today, lte: futureDate } },
          { status: { in: ["outstanding", "partial"] } },
          { balance: { gt: 0 } },
        ],
      },
      orderBy: { due_date: "asc" },
      take: 5, // Limit to top 5
    });

    return upcomingPayables.map((payable) => {
      const daysUntilDue = Math.floor(
        (payable.due_date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
      const severity: AlertSeverity =
        daysUntilDue <= 3 ? "critical" : "warning";

      return {
        id: `upcoming-${payable.id}`,
        type: "upcoming_payment" as const,
        severity,
        title: `Payment due in ${daysUntilDue} days - ${payable.bill_no}`,
        message: `Amount due: ${payable.balance} - Due date: ${payable.due_date.toLocaleDateString()}`,
        actionUrl: `/dashboard/finance/ap/${payable.id}`,
        actionLabel: "Record Payment",
        timestamp: new Date().toISOString(),
        read: false,
      };
    });
  }

  /**
   * Get low cash warning alert
   */
  private static async getLowCashAlert(): Promise<FinancialAlert | null> {
    try {
      // Treasury source of truth: BankAccount.current_balance, not the
      // ChartOfAccount "Cash on Hand"/"Bank" GL control accounts.
      const cashAccounts = await prisma.bankAccount.aggregate({
        where: { is_active: true },
        _sum: { current_balance: true },
      });

      const cashBalance = cashAccounts._sum.current_balance || 0;

      if (cashBalance < this.CASH_WARNING_THRESHOLD) {
        return {
          id: "low-cash-alert",
          type: "low_cash" as const,
          severity: cashBalance < 5000 ? "critical" : "warning",
          title: `Low Cash Position: ${cashBalance}`,
          message: `Your available cash is below the recommended threshold. Consider increasing your cash reserves.`,
          actionUrl: `/dashboard/finance`,
          actionLabel: "View Cash Summary",
          timestamp: new Date().toISOString(),
          read: false,
        };
      }

      return null;
    } catch (error) {
      logger.error({ error }, "Error checking cash balance");
      return null;
    }
  }

  /**
   * Get alerts for locked fiscal periods
   */
  private static async getLockedPeriodAlerts(): Promise<FinancialAlert[]> {
    const lockedPeriods = await prisma.fiscalPeriod.findMany({
      where: { status: "locked" },
      orderBy: { endDate: "desc" },
      take: 3,
    });

    return lockedPeriods.map((period) => {
      return {
        id: `locked-${period.id}`,
        type: "locked_period" as const,
        severity: "info" as const,
        title: `Fiscal Period Locked - ${period.startDate.getFullYear()}`,
        message: `Period from ${period.startDate.toLocaleDateString()} to ${period.endDate.toLocaleDateString()} is locked. No transactions can be posted.`,
        actionUrl: `/dashboard/finance/settings`,
        actionLabel: "View Periods",
        timestamp: new Date().toISOString(),
        read: false,
      };
    });
  }

  /**
   * Get alerts for pending reconciliation
   */
  private static async getReconciliationPendingAlerts(): Promise<
    FinancialAlert[]
  > {
    try {
      // Treasury source of truth: BankAccount / BankTransaction.
      const unreconciled = await prisma.bankTransaction.groupBy({
        by: ["bank_account_id"],
        where: { is_reconciled: false },
        _count: { id: true },
      });

      if (unreconciled.length === 0) return [];

      const accounts = await prisma.bankAccount.findMany({
        where: { id: { in: unreconciled.map((u) => u.bank_account_id) } },
      });
      const accountNameById = new Map(accounts.map((a) => [a.id, a.account_name]));

      return unreconciled
        .filter((u) => u._count.id > 0)
        .slice(0, 5)
        .map((u) => {
          const count = u._count.id;
          const accountName = accountNameById.get(u.bank_account_id) || "Bank Account";
          return {
            id: `recon-${u.bank_account_id}`,
            type: "reconciliation_pending" as const,
            severity: count > 20 ? "warning" : "info",
            title: `Reconciliation Pending - ${accountName}`,
            message: `${count} transactions awaiting reconciliation in ${accountName}`,
            actionUrl: `/dashboard/finance/reconciliation/${u.bank_account_id}`,
            actionLabel: "Reconcile Now",
            timestamp: new Date().toISOString(),
            read: false,
          };
        });
    } catch (error) {
      logger.error({ error }, "Error checking reconciliation status");
      return [];
    }
  }
}
