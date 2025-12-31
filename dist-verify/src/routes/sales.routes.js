"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/modules/sales/sales.routes.ts
const express_1 = require("express");
const sales_controller_1 = require("../modules/pos/controller/sales.controller");
const pdf_controller_1 = require("../modules/pos/controller/pdf.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const fiscal_period_middleware_1 = require("../middleware/fiscal-period.middleware");
const router = (0, express_1.Router)();
router.post('/documents', auth_middleware_1.authenticate, (0, rbac_middleware_1.requirePermission)('sales.order.create'), (0, fiscal_period_middleware_1.validateFiscalPeriod)('issueDate'), sales_controller_1.SalesController.createDocument);
router.get('/documents', auth_middleware_1.authenticate, (0, rbac_middleware_1.requirePermission)('sales.order.view_all'), sales_controller_1.SalesController.listDocuments);
router.get('/documents/:id', auth_middleware_1.authenticate, (0, rbac_middleware_1.requirePermission)('sales.order.view_all'), sales_controller_1.SalesController.getDocumentById);
router.post('/documents/:id/convert', auth_middleware_1.authenticate, (0, rbac_middleware_1.requirePermission)('sales.order.manage'), (0, fiscal_period_middleware_1.validateFiscalPeriod)(), sales_controller_1.SalesController.convertDocument);
router.post('/documents/:id/void', auth_middleware_1.authenticate, (0, rbac_middleware_1.requirePermission)('sales.order.manage'), sales_controller_1.SalesController.voidDocument);
router.post('/documents/:id/payments', auth_middleware_1.authenticate, (0, rbac_middleware_1.requirePermission)('finance.payment.record'), (0, fiscal_period_middleware_1.validateFiscalPeriod)(), sales_controller_1.SalesController.recordPayment);
// Credit notes
router.post('/invoices/:invoiceId/credit-notes', auth_middleware_1.authenticate, (0, rbac_middleware_1.requirePermission)('sales.order.manage'), (0, fiscal_period_middleware_1.validateFiscalPeriod)(), sales_controller_1.SalesController.createCreditNote);
// POS-specific routes
router.post('/pos/sales', auth_middleware_1.authenticate, (0, rbac_middleware_1.requirePermission)('sales.order.create'), (0, fiscal_period_middleware_1.validateFiscalPeriod)(), sales_controller_1.SalesController.createPOSSale);
router.get('/pos/sales', auth_middleware_1.authenticate, (0, rbac_middleware_1.requirePermission)('sales.order.view_all'), sales_controller_1.SalesController.getPOSSales);
router.get('/pos/sales/:id', auth_middleware_1.authenticate, (0, rbac_middleware_1.requirePermission)('sales.order.view_all'), sales_controller_1.SalesController.getPOSSaleById);
// PDF Generation Routes
router.get('/documents/:id/pdf', auth_middleware_1.authenticate, (0, rbac_middleware_1.requirePermission)('sales.order.view_all'), pdf_controller_1.PDFController.generatePDF);
router.get('/documents/:id/preview', auth_middleware_1.authenticate, (0, rbac_middleware_1.requirePermission)('sales.order.view_all'), pdf_controller_1.PDFController.previewDocument);
exports.default = router;
