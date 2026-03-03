import { Request, Response, NextFunction } from 'express';
import { CashierSessionService } from '../services/cashier-session.service';
import {
  validateOpenSession,
  validateCloseSession,
  validateReconcileSession,
  validateSessionListQuery,
  validateSessionId,
} from '../validations/session.validation';
import { AppError, ErrorCode } from '@/lib/errors';
import { successResponse } from '@/lib/response';

/**
 * Helper to map database session to a response object with derived fields
 */
const mapToSessionResponse = (session: any) => {
  if (!session) return null;

  // Ensure numeric values are properly converted to numbers with 0 as default for undefined
  const openingBalance = Number(session.openingBalance) || 0;
  const actualCash = session.actualCash ? Number(session.actualCash) : undefined;
  const expectedCash = Number(session.expectedCash) || 0;
  const cashVariance = session.cashVariance ? Number(session.cashVariance) : 0;
  const totalSalesAmount = Number(session.totalSalesAmount) || 0;
  const totalSalesCount = Number(session.totalSalesCount) || 0;

  return {
    id: session.id,
    sessionNumber: session.sessionNo,
    userId: session.userId,
    branchId: session.branchId,
    status: session.status,
    openingBalance,
    actualCash,
    expectedCash,
    variance: cashVariance,
    variancePercentage: expectedCash > 0 ? (cashVariance / expectedCash) * 100 : 0,
    totalSales: totalSalesAmount,
    salesCount: totalSalesCount,
    paymentMethods: {
      cash: Number(session.totalCashReceived) || 0,
      card: Number(session.totalCardReceived) || 0,
      mpesa: Number(session.totalMpesaReceived) || 0,
      other: Number(session.totalOtherReceived) || 0,
    },
    openedAt: session.openedAt,
    closedAt: session.closedAt,
    reconciledAt: session.reconciledAt,
    notes: session.notes,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    user: session.user,
    branch: session.branch,
  };
};

/**
 * CashierSessionController
 *
 * Handles HTTP requests for cashier session operations.
 * All endpoints are protected with authMiddleware and RBAC validation.
 *
 * Endpoints Handled:
 * - POST /cashier/sessions/open
 * - POST /cashier/sessions/:id/close
 * - GET /cashier/sessions/current
 * - GET /cashier/sessions
 * - GET /cashier/sessions/:id
 * - POST /cashier/sessions/:id/reconcile
 * - GET /cashier/reports/daily
 */
export class CashierSessionController {
  /**
   * POST /cashier/sessions/open
   *
   * Opens a new cashier session with opening balance.
   * Requires: cashier.session.open permission
   *
   * @param req.body.openingBalance - Opening float amount
   * @param req.body.notes - Optional opening notes
   * @returns New CashierSession with session details
   */
  async openSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { openingBalance, notes } = req.body;
      const userId = (req as any).user?.userId;
      const branchId = (req as any).user?.branchId;

      // Validate user context
      if (!userId || !branchId) {
        throw new AppError(
          ErrorCode.UNAUTHORIZED,
          401,
          'User context not found. Authentication required.'
        );
      }

      // Validate input
      const validation = validateOpenSession({ openingBalance, notes });
      if (!validation.valid) {
        throw new AppError(
          ErrorCode.BAD_REQUEST,
          400,
          `Validation failed: ${validation.errors.join(', ')}`
        );
      }

      // Call service
      const session = await CashierSessionService.openSession({
        userId,
        branchId,
        openingBalance,
        notes,
      });

      return res.status(201).json(
        successResponse({
          data: mapToSessionResponse(session),
          message: 'Session opened successfully',
          statusCode: 201,
        })
      );
    } catch (error) {
      return next(error);
    }
  }

  /**
   * POST /cashier/sessions/:id/close
   *
   * Closes an open session and calculates variance.
   * Requires: cashier.session.close permission
   *
   * @param req.params.id - Session ID to close
   * @param req.body.actualCash - Physical cash counted
   * @param req.body.notes - Optional closing notes
   * @returns Closed CashierSession with variance details
   */
  async closeSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const { actualCash, notes } = req.body;
      const userId = (req as any).user?.userId;

      // Validate session ID
      const idString = (id as string) || '';
      const idValidation = validateSessionId(idString);
      if (!idValidation.valid) {
        throw new AppError(ErrorCode.BAD_REQUEST, 400, idValidation.errors[0] || 'Invalid session ID');
      }

      // Validate input
      const validation = validateCloseSession({ actualCash, notes });
      if (!validation.valid) {
        throw new AppError(
          ErrorCode.BAD_REQUEST,
          400,
          `Validation failed: ${validation.errors.join(', ')}`
        );
      }

      // Call service
      const session = await CashierSessionService.closeSession({
        sessionId: idString,
        actualCash,
        closedById: userId,
        notes,
      });

      return res.status(200).json(
        successResponse({
          data: mapToSessionResponse(session),
          message: 'Session closed successfully',
          statusCode: 200,
        })
      );
    } catch (error) {
      return next(error);
    }
  }

  /**
   * GET /cashier/sessions/current
   *
   * Retrieves the current active session for the authenticated user.
   * Requires: User must be authenticated
   *
   * @returns Current CashierSession or null if none active
   */
  async getCurrentSession(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId;
      const branchId = (req as any).user?.branchId;

      // Validate user context
      if (!userId) {
        throw new AppError(
          ErrorCode.UNAUTHORIZED,
          401,
          'User context not found. Authentication required.'
        );
      }

      // If user has no branch (e.g. global admin), they can't have a cashier session
      if (!branchId) {
        return res.status(200).json(
          successResponse({
            data: null,
            message: 'No active session (User has no branch assigned)',
            statusCode: 200,
          })
        );
      }

      // Call service
      const session = await CashierSessionService.getCurrentSession(userId, branchId);

      return res.status(200).json(
        successResponse({
          data: mapToSessionResponse(session),
          message: session ? 'Active session found' : 'No active session found',
          statusCode: 200,
        })
      );
    } catch (error) {
      return next(error);
    }
  }

  /**
   * GET /cashier/sessions
   *
   * Lists sessions with optional filters and pagination.
   * Requires: cashier.session.view_own OR cashier.session.view_all permission
   *
   * Query Parameters:
   * - status: Filter by session status (OPEN, CLOSED, DISCREPANCY, RECONCILED)
   * - branchId: Filter by branch (requires view_all)
   * - userId: Filter by user (requires view_all)
   * - fromDate: Filter sessions from this date
   * - toDate: Filter sessions until this date
   * - page: Page number (default 1)
   * - pageSize: Results per page (default 20, max 100)
   *
   * @returns Paginated list of CashierSessions
   */
  async listSessions(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId;
      const userBranchId = (req as any).user?.branchId;
      const userPermissions = (req as any).user?.permissions || [];

      // Parse query parameters
      const {
        status,
        branchId,
        userId: queryUserId,
        fromDate,
        toDate,
        page,
        pageSize,
      } = req.query;

      // Validate query
      const validation = validateSessionListQuery({
        status,
        branchId,
        userId: queryUserId,
        fromDate,
        toDate,
        page: page ? parseInt(page as string) : 1,
        pageSize: pageSize ? parseInt(pageSize as string) : 20,
      });

      if (!validation.valid) {
        throw new AppError(
          ErrorCode.BAD_REQUEST,
          400,
          `Validation failed: ${validation.errors.join(', ')}`
        );
      }

      // Check RBAC: If requesting other user's sessions, need view_all
      if (queryUserId && queryUserId !== userId) {
        const hasViewAll = userPermissions.includes('cashier.session.view_all');
        if (!hasViewAll) {
          throw new AppError(
            ErrorCode.FORBIDDEN,
            403,
            'Permission denied: Cannot view other users sessions without view_all permission'
          );
        }
      }

      // Check RBAC: If requesting different branch, need view_all
      const filterBranchId = branchId || userBranchId;
      if (filterBranchId !== userBranchId) {
        const hasViewAll = userPermissions.includes('cashier.session.view_all');
        if (!hasViewAll) {
          throw new AppError(
            ErrorCode.FORBIDDEN,
            403,
            'Permission denied: Cannot view other branches sessions without view_all permission'
          );
        }
      }

      // Build filters
      const filters: any = {
        status: status as any,
        branchId: filterBranchId,
        userId: queryUserId as string,
        fromDate: fromDate ? new Date(fromDate as string) : undefined,
        toDate: toDate ? new Date(toDate as string) : undefined,
        page: page ? parseInt(page as string) : 1,
        pageSize: pageSize ? parseInt(pageSize as string) : 20,
      };

      // Remove undefined values
      Object.keys(filters).forEach((key) => filters[key] === undefined && delete filters[key]);

      // Call service
      const result = await CashierSessionService.listSessions(filters);

      return res.status(200).json(
        successResponse({
          data: {
            ...result,
            sessions: result.sessions.map((s: any) => mapToSessionResponse(s)),
          },
          message: `Retrieved ${result.sessions.length} sessions`,
          statusCode: 200,
        })
      );
    } catch (error) {
      return next(error);
    }
  }

  /**
   * GET /cashier/sessions/:id
   *
   * Retrieves detailed information for a specific session.
   * Requires: Must have permission to view the session
   *
   * @param req.params.id - Session ID to retrieve
   * @returns Complete CashierSession with all relations
   */
  async getSessionById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const userId = (req as any).user?.userId;
      const userPermissions = (req as any).user?.permissions || [];

      // Validate session ID
      const idString = (id as string) || '';
      const idValidation = validateSessionId(idString);
      if (!idValidation.valid) {
        throw new AppError(ErrorCode.BAD_REQUEST, 400, idValidation.errors[0] || 'Invalid session ID');
      }

      // Call service
      const session = await CashierSessionService.getSessionById(idString);

      // Check RBAC: Can only view own session or need view_all
      if (session.userId !== userId) {
        const hasViewAll = userPermissions.includes('cashier.session.view_all');
        if (!hasViewAll) {
          throw new AppError(
            ErrorCode.FORBIDDEN,
            403,
            'Permission denied: Cannot view other users sessions'
          );
        }
      }

      return res.status(200).json(
        successResponse({
          data: mapToSessionResponse(session),
          message: 'Session retrieved successfully',
          statusCode: 200,
        })
      );
    } catch (error) {
      return next(error);
    }
  }

  /**
   * POST /cashier/sessions/:id/reconcile
   *
   * Reconciles a closed session after variance review.
   * Requires: cashier.variance.approve permission
   *
   * @param req.params.id - Session ID to reconcile
   * @param req.body.notes - Reconciliation notes (reason for variance if applicable)
   * @returns Reconciled CashierSession
   */
  async reconcileSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const { notes } = req.body;
      const userId = (req as any).user?.userId;

      // Validate session ID
      const idString = (id as string) || '';
      const idValidation = validateSessionId(idString);
      if (!idValidation.valid) {
        throw new AppError(ErrorCode.BAD_REQUEST, 400, idValidation.errors[0] || 'Invalid session ID');
      }

      // Validate input
      const validation = validateReconcileSession({ notes });
      if (!validation.valid) {
        throw new AppError(
          ErrorCode.BAD_REQUEST,
          400,
          `Validation failed: ${validation.errors.join(', ')}`
        );
      }

      // Call service
      const session = await CashierSessionService.reconcileSession({
        sessionId: idString,
        reconciledById: userId || '',
        notes,
      });

      return res.status(200).json(
        successResponse({
          data: mapToSessionResponse(session),
          message: `Session reconciled successfully (Status: ${session.status})`,
          statusCode: 200,
        })
      );

    } catch (error) {
      return next(error);
    }
  }

  /**
   * GET /cashier/reports/daily
   *
   * Generates a comprehensive daily summary report for sessions.
   * Can filter by date, branch, user.
   * Requires: At least view_own permission
   *
   * Query Parameters:
   * - date: ISO date (default: today)
   * - branchId: Filter by branch (requires view_all)
   * - format: 'json' or 'csv' (default: json)
   *
   * @returns Daily summary with all sessions, totals, and metrics
   */
  async getDailySummary(req: Request, res: Response, next: NextFunction) {
    try {
      const userBranchId = (req as any).user?.branchId;
      const userPermissions = (req as any).user?.permissions || [];

      // Parse query parameters
      const { date, branchId, format } = req.query;

      // Default to today if no date provided
      const targetDate = date ? new Date(date as string) : new Date();
      const fromDate = new Date(targetDate);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = new Date(targetDate);
      toDate.setHours(23, 59, 59, 999);

      // Check RBAC: If requesting different branch, need view_all
      const filterBranchId = branchId || userBranchId;
      if (filterBranchId !== userBranchId) {
        const hasViewAll = userPermissions.includes('cashier.session.view_all');
        if (!hasViewAll) {
          throw new AppError(
            ErrorCode.FORBIDDEN,
            403,
            'Permission denied: Cannot view other branches reports'
          );
        }
      }

      // Get all sessions for the day
      const { sessions } = await CashierSessionService.listSessions({
        branchId: filterBranchId as string,
        fromDate,
        toDate,
        pageSize: 1000, // Get all sessions for the day
      });

      // Calculate daily totals
      const dailyTotals = {
        totalSessions: sessions.length,
        closedSessions: sessions.filter((s: any) => s.status !== 'OPEN').length,
        openSessions: sessions.filter((s: any) => s.status === 'OPEN').length,
        reconciledSessions: sessions.filter((s: any) => s.status === 'RECONCILED').length,
        discrepancySessions: sessions.filter((s: any) => s.status === 'DISCREPANCY').length,
        totalSales: sessions.reduce((sum: number, s: any) => sum + (s.totalSalesCount || 0), 0),
        totalSalesAmount: sessions.reduce((sum: number, s: any) => sum + (s.totalSalesAmount || 0), 0),
        totalCashReceived: sessions.reduce((sum: number, s: any) => sum + (s.totalCashReceived || 0), 0),
        totalCardReceived: sessions.reduce((sum: number, s: any) => sum + (s.totalCardReceived || 0), 0),
        totalMpesaReceived: sessions.reduce((sum: number, s: any) => sum + (s.totalMpesaReceived || 0), 0),
        totalOtherReceived: sessions.reduce((sum: number, s: any) => sum + (s.totalOtherReceived || 0), 0),
        totalVariance: sessions.reduce((sum: number, s: any) => sum + (s.cashVariance || 0), 0),
        averageVariancePercent:
          sessions.length > 0
            ? (
              (sessions.reduce((sum: number, s: any) => sum + Math.abs(s.cashVariance || 0), 0) /
                sessions.length /
                sessions.reduce((sum: number, s: any) => sum + (s.expectedCash || 1), 0)) *
              100
            ).toFixed(2)
            : '0.00',
      };

      // Prepare response
      const response = {
        date: targetDate.toISOString().split('T')[0],
        branchId: filterBranchId,
        summary: dailyTotals,
        sessions: sessions.map((s: any) => ({
          sessionNo: s.sessionNo,
          status: s.status,
          user: s.user?.name,
          totalSales: s.totalSalesCount,
          totalAmount: s.totalSalesAmount,
          expectedCash: s.expectedCash,
          actualCash: s.actualCash,
          variance: s.cashVariance,
          openedAt: s.openedAt,
          closedAt: s.closedAt,
        })),
      };

      // Return in requested format
      if (format === 'csv') {
        // TODO: Implement CSV export
        return res.status(200).json(
          successResponse({
            data: response,
            message: 'Daily summary generated',
            statusCode: 200,
          })
        );
      }

      return res.status(200).json(
        successResponse({
          data: response,
          message: 'Daily summary generated',
          statusCode: 200,
        })
      );
    } catch (error) {
      return next(error);
    }
  }
}
