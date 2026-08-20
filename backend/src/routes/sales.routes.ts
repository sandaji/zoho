// backend/src/modules/sales/sales.routes.ts
import { Router } from "express";
import { SalesController } from "../modules/pos/controller/sales.controller";
import { PDFController } from "../modules/pos/controller/pdf.controller";
import { authMiddleware } from "../lib/auth";
import { requirePermission } from "../middleware/rbac.middleware";
import { validateFiscalPeriod } from "../middleware/fiscal-period.middleware";
import { PrefixedDocumentController } from "../modules/pos/controller/prefixed-document.controller";
import { SalesPerformanceController } from "../modules/pos/controller/sales-performance.controller";

const router = Router();

// Use authMiddleware (canonical) consistently across all routes
const authenticate = authMiddleware;
const prefixedCtrl = new PrefixedDocumentController();
const performanceCtrl = new SalesPerformanceController();

// Get available document types
router.get(
  "/documents/types",
  authenticate,
  SalesController.getDocumentTypes,
);

router.post(
  "/documents",
  authenticate,
  requirePermission("sales.order.create"),
  validateFiscalPeriod("issueDate"),
  SalesController.createDocument,
);

router.get(
  "/documents",
  authenticate,
  requirePermission("sales.order.view_all"),
  SalesController.listDocuments,
);

router.get(
  "/documents/:id",
  authenticate,
  requirePermission("sales.order.view_all"),
  SalesController.getDocumentById,
);

router.post(
  "/documents/:id/convert",
  authenticate,
  requirePermission("sales.order.manage"),
  validateFiscalPeriod(),
  SalesController.convertDocument,
);

router.post(
  "/documents/:id/void",
  authenticate,
  requirePermission("sales.order.manage"),
  SalesController.voidDocument,
);

router.post(
  "/documents/:id/payments",
  authenticate,
  requirePermission("finance.payment.record"),
  validateFiscalPeriod(),
  SalesController.recordPayment,
);

// Credit notes
router.post(
  "/invoices/:invoiceId/credit-notes",
  authenticate,
  requirePermission("sales.order.manage"),
  validateFiscalPeriod(),
  SalesController.createCreditNote,
);

router.post(
  "/documents/:id/approve",
  authenticate,
  requirePermission("sales.order.manage"),
  validateFiscalPeriod(),
  SalesController.approveCreditNote,
);

// POS-specific routes
router.post(
  "/pos/sales",
  authenticate,
  requirePermission("sales.order.create"),
  validateFiscalPeriod(),
  SalesController.createPOSSale,
);

router.get(
  "/pos/sales",
  authenticate,
  requirePermission("sales.order.view_all"),
  SalesController.getPOSSales,
);

router.get(
  "/pos/sales/:id",
  authenticate,
  requirePermission("sales.order.view_all"),
  SalesController.getPOSSaleById,
);

// Park Sale Route
router.post(
  "/sales/park",
  authenticate,
  requirePermission("sales.order.create"),
  validateFiscalPeriod(),
  SalesController.parkSale,
);

// Hold Sale Route
router.post(
  "/sales/hold",
  authenticate,
  requirePermission("sales.order.create"),
  validateFiscalPeriod(),
  SalesController.holdSale,
);

// PDF Generation Routes
router.get(
  "/documents/:id/pdf",
  authenticate,
  requirePermission("sales.order.view_all"),
  PDFController.generatePDF,
);

router.get(
  "/documents/:id/preview",
  authenticate,
  requirePermission("sales.order.view_all"),
  PDFController.previewDocument,
);

// ── Prefixed document routes ──────────────────────────────────────────────────
// POST /sales-documents/invoices/prefixed — create invoice with user prefix numbering
router.post(
  "/invoices/prefixed",
  authenticate,
  requirePermission("sales.order.create"),
  validateFiscalPeriod("issueDate"),
  (req, res, next) => prefixedCtrl.createPrefixedInvoice(req, res, next),
);

// POST /sales-documents/quotations/prefixed — create quotation with user prefix numbering
router.post(
  "/quotations/prefixed",
  authenticate,
  requirePermission("sales.order.create"),
  validateFiscalPeriod("issueDate"),
  (req, res, next) => prefixedCtrl.createPrefixedQuotation(req, res, next),
);

// GET /sales-documents/invoices/prefixed/preview — preview next invoice ID without consuming it
router.get(
  "/invoices/prefixed/preview",
  authenticate,
  (req, res, next) => prefixedCtrl.previewNextId(req, res, next),
);

// PATCH /sales-documents/users/:userId/prefix — set/update a user's sales prefix
router.patch(
  "/users/:userId/prefix",
  authenticate,
  requirePermission("admin.user.manage"),
  (req, res, next) => prefixedCtrl.setUserPrefix(req, res, next),
);

// ── Sales performance analytics ───────────────────────────────────────────────
// GET /sales-documents/performance — aggregated stats by item, day, salesman
router.get(
  "/performance",
  authenticate,
  requirePermission("sales.order.view_all"),
  (req, res, next) => performanceCtrl.getSalesPerformance(req, res, next),
);

export default router;
