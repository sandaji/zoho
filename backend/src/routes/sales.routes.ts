// backend/src/modules/sales/sales.routes.ts
import { Router } from 'express';
import { SalesController } from '../modules/pos/controller/sales.controller';
import { PDFController } from '../modules/pos/controller/pdf.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validateFiscalPeriod } from '../middleware/fiscal-period.middleware';

const router = Router();

router.post(
  '/documents',
  authenticate,
  requirePermission('sales.order.create'),
  validateFiscalPeriod('issueDate'),
  SalesController.createDocument
);

router.get(
  '/documents',
  authenticate,
  requirePermission('sales.order.view_all'),
  SalesController.listDocuments
);

router.get(
  '/documents/:id',
  authenticate,
  requirePermission('sales.order.view_all'),
  SalesController.getDocumentById
);

router.post(
  '/documents/:id/convert',
  authenticate,
  requirePermission('sales.order.manage'),
  validateFiscalPeriod(),
  SalesController.convertDocument
);

router.post(
  '/documents/:id/void',
  authenticate,
  requirePermission('sales.order.manage'),
  SalesController.voidDocument
);

router.post(
  '/documents/:id/payments',
  authenticate,
  requirePermission('finance.payment.record'),
  validateFiscalPeriod(),
  SalesController.recordPayment
);

// Credit notes
router.post(
  '/invoices/:invoiceId/credit-notes',
  authenticate,
  requirePermission('sales.order.manage'),
  validateFiscalPeriod(),
  SalesController.createCreditNote
);

// POS-specific routes
router.post(
  '/pos/sales',
  authenticate,
  requirePermission('sales.order.create'),
  validateFiscalPeriod(),
  SalesController.createPOSSale
);

router.get(
  '/pos/sales',
  authenticate,
  requirePermission('sales.order.view_all'),
  SalesController.getPOSSales
);

router.get(
  '/pos/sales/:id',
  authenticate,
  requirePermission('sales.order.view_all'),
  SalesController.getPOSSaleById
);

// PDF Generation Routes
router.get(
  '/documents/:id/pdf',
  authenticate,
  requirePermission('sales.order.view_all'),
  PDFController.generatePDF
);

router.get(
  '/documents/:id/preview',
  authenticate,
  requirePermission('sales.order.view_all'),
  PDFController.previewDocument
);

export default router;
