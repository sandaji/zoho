import { Router } from 'express';
import { getFinancialReport } from './reports.controller';
import { authMiddleware as authenticate } from '@core/middleware/auth';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

/**
 * Financial Reports Routes
 * Prefix: /v1/reports
 */

// Branch scope is resolved by requirePermission and applied in the report query.
router.get(
  '/financials',
  authenticate,
  requirePermission('finance.reports.view'),
  getFinancialReport
);

export default router;
