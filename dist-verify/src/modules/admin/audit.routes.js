"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const audit_controller_1 = require("./audit.controller");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
const router = (0, express_1.Router)();
const auditController = new audit_controller_1.AuditController();
// Only admins should view audit logs
router.get('/', (0, rbac_middleware_1.requirePermission)('admin.user.manage'), (req, res, next) => auditController.getAuditLogs(req, res, next));
exports.default = router;
