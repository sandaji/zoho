import { prisma } from '@/lib/db';
import { AppError, ErrorCode } from '@/lib/errors';
import { CashierSessionStatus } from '@/types';

/**
 * CashierSessionService
 * Handles all cashier session management operations including:
 * - Opening and closing sessions
 * - Reconciliation with variance detection
 * - Financial summaries and reporting
 * - Atomic transaction management
 */
export class CashierSessionService {
  /**
   * STEP 4.1: Open a new cashier session
   *
   * Creates a new CashierSession record with opening balance.
   * Ensures user has no other OPEN sessions in the branch.
   *
   * @param input.userId - User opening the session
   * @param input.branchId - Branch where session is opened
   * @param input.openingBalance - Initial float amount
   * @param input.notes - Optional opening notes
   * @returns Created CashierSession with all fields
   * @throws AppError if user already has active session
   */
  static async openSession(input: {
    userId: string;
    branchId: string;
    openingBalance: number;
    notes?: string;
  }): Promise<any> {
    // Validate: No duplicate OPEN sessions
    const existingSession = await prisma.cashierSession.findFirst({
      where: {
        userId: input.userId,
        branchId: input.branchId,
        status: 'OPEN',
      },
    });

    if (existingSession) {
      throw new AppError(
        ErrorCode.BAD_REQUEST,
        400,
        `Session ${existingSession.sessionNo} is already open. Close it before opening a new one.`
      );
    }

    // Generate unique sessionNo format: SESS-YYYYMMDD-XXXXX (timestamp-based)
    const timestamp = Date.now().toString().slice(-5);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const sessionNo = `SESS-${dateStr}-${timestamp}`;

    // Create session with atomic transaction
    const session = await prisma.cashierSession.create({
      data: {
        sessionNo,
        userId: input.userId,
        branchId: input.branchId,
        status: 'OPEN' as CashierSessionStatus,
        openingBalance: input.openingBalance,
        notes: input.notes,
        openedAt: new Date(),
        // Initialize totals to 0
        totalSalesCount: 0,
        totalSalesAmount: 0,
        totalCashReceived: 0,
        totalCardReceived: 0,
        totalMpesaReceived: 0,
        totalOtherReceived: 0,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    return session;
  }

  /**
   * STEP 4.2: Close a cashier session
   *
   * Closes an OPEN session and locks it from further sales.
   * Calculates expected cash based on payment methods.
   * Does NOT perform reconciliation - that's a separate step.
   *
   * @param input.sessionId - Session to close
   * @param input.actualCash - Amount of physical cash counted
   * @param input.notes - Optional closing notes
   * @returns Closed CashierSession
   * @throws AppError if session already closed
   */
  static async closeSession(input: {
    sessionId: string;
    actualCash: number;
    closedById?: string;
    notes?: string;
  }): Promise<any> {
    // Fetch session and validate state
    const session = await prisma.cashierSession.findUnique({
      where: { id: input.sessionId },
    });

    if (!session) {
      throw new AppError(ErrorCode.NOT_FOUND, 404, 'Session not found');
    }

    if (session.status !== 'OPEN') {
      throw new AppError(
        ErrorCode.BAD_REQUEST,
        400,
        `Cannot close session in ${session.status} status`
      );
    }

    // Calculate expected cash from payment totals
    const expectedCash = session.totalCashReceived;

    // Calculate variance
    const cashVariance = input.actualCash - expectedCash;

    // Update session to CLOSED
    const closedSession = await prisma.cashierSession.update({
      where: { id: input.sessionId },
      data: {
        status: 'CLOSED' as CashierSessionStatus,
        closingBalance: input.actualCash,
        actualCash: input.actualCash,
        expectedCash,
        cashVariance,
        closedAt: new Date(),
        notes: input.notes,
      },
      include: {
        user: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    return closedSession;
  }

  /**
   * STEP 4.3: Get current active session for a user
   *
   * Finds the OPEN session for the authenticated user in their branch.
   * Returns null if no active session.
   *
   * @param userId - User requesting session
   * @param branchId - User's branch
   * @returns CashierSession or null
   */
  static async getCurrentSession(userId: string, branchId: string): Promise<any> {
    const session = await prisma.cashierSession.findFirst({
      where: {
        userId,
        branchId,
        status: 'OPEN',
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, name: true } },
        sales: {
          select: {
            id: true,
            documentId: true,
            total: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5, // Recent 5 sales
        },
      },
    });

    return session || null;
  }

  /**
   * STEP 4.4: List sessions with filters
   *
   * Returns paginated list of sessions, optionally filtered by:
   * - Status (OPEN, CLOSED, DISCREPANCY, RECONCILED)
   * - Date range
   * - Branch
   * - User
   *
   * @param filters - Optional query filters
   * @returns Paginated list with total count
   */
  static async listSessions(filters?: {
    status?: CashierSessionStatus;
    branchId?: string;
    userId?: string;
    fromDate?: Date;
    toDate?: Date;
    page?: number;
    pageSize?: number;
  }): Promise<{ sessions: any[]; total: number; pages: number }> {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (filters?.status) where.status = filters.status;
    if (filters?.branchId) where.branchId = filters.branchId;
    if (filters?.userId) where.userId = filters.userId;

    if (filters?.fromDate || filters?.toDate) {
      where.openedAt = {};
      if (filters.fromDate) where.openedAt.gte = filters.fromDate;
      if (filters.toDate) where.openedAt.lte = filters.toDate;
    }

    const [sessions, total] = await Promise.all([
      prisma.cashierSession.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          branch: { select: { id: true, name: true } },
        },
        orderBy: { openedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.cashierSession.count({ where }),
    ]);

    return {
      sessions,
      total,
      pages: Math.ceil(total / pageSize),
    };
  }

  /**
   * STEP 4.5: Get detailed session information
   *
   * Fetches complete session with all relations:
   * - User and opener/closer info
   * - Branch details
   * - All linked sales
   * - Financial summary
   *
   * @param sessionId - Session to fetch
   * @returns Full CashierSession with relations
   */
  static async getSessionById(sessionId: string): Promise<any> {
    const session = await prisma.cashierSession.findUnique({
      where: { id: sessionId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
            address: true,
            phone: true,
          },
        },
        sales: {
          select: {
            id: true,
            documentId: true,
            total: true,
            subtotal: true,
            tax: true,
            paidAmount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!session) {
      throw new AppError(ErrorCode.NOT_FOUND, 404, 'Session not found');
    }

    return session;
  }

  /**
   * STEP 4.6: Reconcile a session
   *
   * Marks a CLOSED session as RECONCILED after supervisor approval.
   * Validates that variance is within acceptable limits.
   * Records reconciliation timestamp and approver info.
   *
   * @param input.sessionId - Session to reconcile
   * @param input.reconciledById - Manager/supervisor approving
   * @param input.notes - Reconciliation notes (e.g., reason for variance)
   * @returns Reconciled CashierSession
   * @throws AppError if session not CLOSED or variance too high
   */
  static async reconcileSession(input: {
    sessionId: string;
    reconciledById: string;
    notes?: string;
  }): Promise<any> {
    // Fetch and validate session
    const session = await prisma.cashierSession.findUnique({
      where: { id: input.sessionId },
    });

    if (!session) {
      throw new AppError(ErrorCode.NOT_FOUND, 404, 'Session not found');
    }

    if (session.status !== 'CLOSED') {
      throw new AppError(
        ErrorCode.BAD_REQUEST,
        400,
        'Only CLOSED sessions can be reconciled'
      );
    }

    // Validate variance is within acceptable range (5% or ±500)
    const varianceThreshold = Math.max(
      session.expectedCash! * 0.05, // 5% of expected
      500 // Or 500 KES absolute
    );

    const absoluteVariance = Math.abs(session.cashVariance || 0);

    if (absoluteVariance > varianceThreshold) {
      // HIGH variance - requires escalation
      const reconciled = await prisma.cashierSession.update({
        where: { id: input.sessionId },
        data: {
          status: 'DISCREPANCY' as CashierSessionStatus,
          reconciledAt: new Date(),
        },
        include: {
          user: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
        },
      });

      // Note: DISCREPANCY requires manager escalation workflow (not implemented in this step)
      return reconciled;
    }

    // LOW variance - approve automatically
    const reconciled = await prisma.cashierSession.update({
      where: { id: input.sessionId },
      data: {
        status: 'RECONCILED' as CashierSessionStatus,
        reconciledAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    return reconciled;
  }

  /**
   * STEP 4.7: Get comprehensive session summary
   *
   * Generates financial summary for a session:
   * - Total sales count and amount
   * - Payment method breakdown
   * - Discount and return totals
   * - Cash variance analysis
   *
   * @param sessionId - Session to summarize
   * @returns Summary object with all metrics
   */
  static async getSessionSummary(sessionId: string): Promise<any> {
    const session = await this.getSessionById(sessionId);

    // Calculate totals from sales linked to session
    const salesSummary = session.sales.reduce(
      (acc: any, sale: any) => ({
        count: acc.count + 1,
        subtotal: acc.subtotal + (sale.subtotal || 0),
        tax: acc.tax + (sale.tax || 0),
        total: acc.total + (sale.total || 0),
      }),
      { count: 0, subtotal: 0, tax: 0, total: 0 }
    );



    // Variance analysis
    const variancePercent =
      session.expectedCash && session.expectedCash > 0
        ? ((session.cashVariance || 0) / session.expectedCash) * 100
        : 0;

    return {
      sessionNo: session.sessionNo,
      status: session.status,
      user: session.user,
      branch: session.branch,
      openedAt: session.openedAt,
      closedAt: session.closedAt,
      reconciledAt: session.reconciledAt,

      // Opening/Closing
      openingBalance: session.openingBalance,
      closingBalance: session.closingBalance,

      // Sales Summary
      totalSalesCount: salesSummary.count,
      totalSalesAmount: salesSummary.total,
      subtotal: salesSummary.subtotal,
      tax: salesSummary.tax,

      // Payment Methods
      paymentBreakdown: {
        cash: session.totalCashReceived,
        card: session.totalCardReceived,
        mpesa: session.totalMpesaReceived,
        other: session.totalOtherReceived,
      },

      // Discrepancies
      totalDiscounts: session.totalDiscounts,
      totalReturns: session.totalReturns,

      // Variance Analysis
      expectedCash: session.expectedCash,
      actualCash: session.actualCash,
      cashVariance: session.cashVariance,
      variancePercent: variancePercent.toFixed(2),
      varianceStatus:
        Math.abs(variancePercent) < 1
          ? 'EXCELLENT'
          : Math.abs(variancePercent) < 3
            ? 'ACCEPTABLE'
            : Math.abs(variancePercent) < 5
              ? 'NEEDS_REVIEW'
              : 'CRITICAL',

      // Duration
      durationMinutes: session.closedAt
        ? Math.floor(
          (session.closedAt.getTime() - session.openedAt.getTime()) / 60000
        )
        : null,
    };
  }

  /**
   * STEP 4.8: Calculate cash variance details
   *
   * Performs detailed variance analysis:
   * - Compares expected (by payment method) vs actual
   * - Identifies discrepancies per payment type
   * - Provides variance breakdown for reconciliation
   *
   * @param sessionId - Session to analyze
   * @returns Variance breakdown by payment method
   */
  static async calculateVariance(sessionId: string): Promise<any> {
    const session = await this.getSessionById(sessionId);

    if (!session.actualCash || !session.expectedCash) {
      throw new AppError(
        ErrorCode.BAD_REQUEST,
        400,
        'Session must be CLOSED before calculating variance'
      );
    }

    // Get sales breakdown by payment method
    const paymentBreakdown = session.sales.reduce(
      (acc: any, sale: any) => {
        const method = sale.paymentMethod?.toLowerCase() || 'other';
        if (!acc[method]) {
          acc[method] = { expected: 0, actual: 0, variance: 0 };
        }
        acc[method].expected += sale.total;
        return acc;
      },
      {}
    );

    // For cash method specifically
    const cashExpected = session.totalCashReceived;
    const cashActual = session.actualCash;
    const cashVariance = cashActual - cashExpected;

    return {
      sessionNo: session.sessionNo,
      periodStart: session.openedAt,
      periodEnd: session.closedAt,

      // Overall Variance
      overall: {
        expected: session.expectedCash,
        actual: session.actualCash,
        variance: session.cashVariance,
        variancePercent: ((session.cashVariance / session.expectedCash) * 100).toFixed(2),
      },

      // Cash Method Specific
      cash: {
        expected: cashExpected,
        actual: cashActual,
        variance: cashVariance,
        variancePercent:
          cashExpected > 0 ? ((cashVariance / cashExpected) * 100).toFixed(2) : '0.00',
      },

      // By Payment Method
      byPaymentMethod: paymentBreakdown,

      // Analysis
      analysis: {
        totalSales: session.sales.length,
        largestSale: Math.max(...session.sales.map((s: any) => s.total), 0),
        smallestSale: Math.min(...session.sales.map((s: any) => s.total), 0),
        averageSale:
          session.sales.length > 0
            ? (session.totalSalesAmount / session.sales.length).toFixed(2)
            : '0.00',
      },

      // Variance Assessment
      assessment:
        Math.abs(session.cashVariance || 0) === 0
          ? '✅ PERFECT - No variance'
          : Math.abs(session.cashVariance || 0) < 100
            ? '✅ ACCEPTABLE - Variance under 100'
            : Math.abs(session.cashVariance || 0) < 500
              ? '⚠️ REVIEW - Variance 100-500'
              : '🔴 CRITICAL - Variance over 500',
    };
  }

  /**
   * Helper: Update session totals on new sale
   * Called from SalesService.createPOSSale()
   *
   * @param sessionId - Active session
   * @param saleAmount - Total sale amount
   * @param paymentMethod - How payment was received
   * @returns Updated CashierSession
   */
  static async incrementSessionTotals(
    sessionId: string,
    saleAmount: number,
    paymentMethod: string
  ): Promise<any> {
    const paymentKey = paymentMethod.toLowerCase();

    const updateData: any = {
      totalSalesCount: { increment: 1 },
      totalSalesAmount: { increment: saleAmount },
    };

    switch (paymentKey) {
      case 'cash':
        updateData.totalCashReceived = { increment: saleAmount };
        break;
      case 'card':
        updateData.totalCardReceived = { increment: saleAmount };
        break;
      case 'mpesa':
        updateData.totalMpesaReceived = { increment: saleAmount };
        break;
      default:
        updateData.totalOtherReceived = { increment: saleAmount };
    }

    return prisma.cashierSession.update({
      where: { id: sessionId },
      data: updateData,
    });
  }
}
