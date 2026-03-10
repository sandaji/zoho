import { Router } from 'express';
import { getFinancialReport } from './reports.controller';
import { authMiddleware as authenticate } from '../../lib/auth';
import { hasAnyPermission } from '../../middleware/rbac.middleware';

const router = Router();

/**
 * Financial Reports Routes
 * Prefix: /v1/reports
 */

// Get financial metrics - requires admin or finance.report.aging permission
router.get(
  '/financials',
  authenticate,
  hasAnyPermission(['finance.report.aging', 'admin.user.manage']),
  getFinancialReport
);

export default router;
