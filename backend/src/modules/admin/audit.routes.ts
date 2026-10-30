import { Router } from 'express';
import { AuditController } from './audit.controller';
import { hasAnyPermission } from '../../middleware/rbac.middleware';

const router = Router();
const auditController = new AuditController();

// Auditors, the MD and system admins (audit.log.view) and user administrators
router.get(
  '/',
  hasAnyPermission(['audit.log.view', 'admin.user.manage']),
  (req, res, next) => auditController.getAuditLogs(req, res, next)
);

export default router;
