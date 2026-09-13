import { Router } from 'express';
import { AuditController } from './audit.controller';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();
const auditController = new AuditController();

// Only admins should view audit logs
router.get(
  '/',
  requirePermission('admin.user.manage'), 
  (req, res, next) => auditController.getAuditLogs(req, res, next)
);

export default router;
