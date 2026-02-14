import { Router, Request, Response, NextFunction } from 'express';
import { CashierSessionController } from '../controller/session.controller';
import { authenticate as authMiddleware } from '@/middleware/auth.middleware';
import { requirePermission } from '@/middleware/rbac.middleware';

/**
 * Cashier Session Routes
 *
 * All routes are protected with authMiddleware and RBAC validation.
 * Routes are registered under /cashier prefix in main router.
 *
 * Endpoints:
 * POST   /sessions/open              - Open new session (cashier.session.open)
 * POST   /sessions/:id/close         - Close session (cashier.session.close)
 * GET    /sessions/current           - Get active session (auth required)
 * GET    /sessions                   - List sessions (view_own or view_all)
 * GET    /sessions/:id               - Get session details (view permission)
 * POST   /sessions/:id/reconcile     - Reconcile session (variance.approve)
 * GET    /reports/daily              - Daily summary report (view permission)
 */
const router = Router();
const controller = new CashierSessionController();

// ============================================================================
// MIDDLEWARE
// ============================================================================

// All routes require authentication
router.use(authMiddleware);

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /cashier/sessions/open
 * Open a new cashier session with opening balance
 * Permission: cashier.session.open (OWN scope)
 */
router.post(
  '/sessions/open',
  requirePermission('cashier.session.open'),
  (req: Request, res: Response, next: NextFunction) => controller.openSession(req, res, next)
);

/**
 * POST /cashier/sessions/:id/close
 * Close an open session and calculate variance
 * Permission: cashier.session.close (OWN scope)
 */
router.post(
  '/sessions/:id/close',
  requirePermission('cashier.session.close'),
  (req: Request, res: Response, next: NextFunction) => controller.closeSession(req, res, next)
);

/**
 * GET /cashier/sessions/current
 * Get the current active session for authenticated user
 * Permission: None (auth required, user's own session only)
 */
router.get(
  '/sessions/current',
  (req: Request, res: Response, next: NextFunction) => controller.getCurrentSession(req, res, next)
);

/**
 * GET /cashier/sessions
 * List sessions with pagination and filters
 * Permission: cashier.session.view_own OR cashier.session.view_all
 * - view_own: Can only see own sessions
 * - view_all: Can see all sessions in branch
 */
router.get(
  '/sessions',
  (req: Request, res: Response, next: NextFunction) => {
    // Check if user has at least one of the view permissions
    const userPermissions = (req as any).user?.permissions || [];
    const hasViewPermission =
      userPermissions.includes('cashier.session.view_own') ||
      userPermissions.includes('cashier.session.view_all');

    if (!hasViewPermission) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Requires view_own or view_all permission',
        statusCode: 403,
      });
    }

    return controller.listSessions(req, res, next);
  }
);

/**
 * GET /cashier/sessions/:id
 * Get detailed session information
 * Permission: Must have view permission (checked in controller based on ownership)
 */
router.get(
  '/sessions/:id',
  (req: Request, res: Response, next: NextFunction) => {
    const userPermissions = (req as any).user?.permissions || [];
    const hasViewPermission =
      userPermissions.includes('cashier.session.view_own') ||
      userPermissions.includes('cashier.session.view_all');

    if (!hasViewPermission) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Requires view permission',
        statusCode: 403,
      });
    }

    return controller.getSessionById(req, res, next);
  }
);

/**
 * POST /cashier/sessions/:id/reconcile
 * Reconcile a closed session after variance review
 * Permission: cashier.variance.approve (BRANCH scope)
 */
router.post(
  '/sessions/:id/reconcile',
  requirePermission('cashier.variance.approve'),
  (req: Request, res: Response, next: NextFunction) => controller.reconcileSession(req, res, next)
);

/**
 * GET /cashier/reports/daily
 * Generate daily summary report for sessions
 * Permission: cashier.session.view_own OR cashier.session.view_all
 */
router.get(
  '/reports/daily',
  (req: Request, res: Response, next: NextFunction) => {
    const userPermissions = (req as any).user?.permissions || [];
    const hasViewPermission =
      userPermissions.includes('cashier.session.view_own') ||
      userPermissions.includes('cashier.session.view_all');

    if (!hasViewPermission) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Requires view permission',
        statusCode: 403,
      });
    }

    return controller.getDailySummary(req, res, next);
  }
);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// Catch 404 for undefined routes
router.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
    statusCode: 404,
  });
});

export default router;
