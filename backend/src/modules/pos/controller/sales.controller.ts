// backend/src/modules/sales/sales.controller.ts
import { Request, Response, NextFunction } from 'express';
import {
  createSalesDocumentSchema,
  listDocumentsQuerySchema,
  convertDocumentSchema,
  createPOSSaleSchema
} from '../sales.validation';
import { SalesDocumentStatus } from '../../../generated/enums';
import { SalesService } from '../service/sales.service';
import { AppError, ErrorCode } from '../../../lib/errors';
import { TokenPayload } from '../../../types';

interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
  authorizedBranchIds?: string[];
}

/**
 * The SalesController handles the request/response cycle for sales document endpoints.
 * It validates incoming data and orchestrates calls to the SalesService.
 */
export class SalesController {

  /**
   * Create a new sales document (Draft, Quote, Invoice, Credit Note)
   */
  static async createDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createSalesDocumentSchema.parse(req.body);
      const authReq = req as AuthenticatedRequest;
      const userBranchId = authReq.user?.branchId;
      const userId = authReq.user?.userId;

      const branchId = userBranchId || (input as any).branchId;

      if (!branchId || !userId) {
        res.status(401).json({ success: false, error: 'User context required' });
        return;
      }

      // Record-level isolation: Ensure user can only create for authorized branches
      if (req.authorizedBranchIds && req.authorizedBranchIds.length > 0) {
        if (!req.authorizedBranchIds.includes(branchId)) {
          throw new AppError(ErrorCode.FORBIDDEN, 403, 'Cannot create document for an unauthorized branch');
        }
      }

      // Transform input to match service expectations
      const serviceInput = {
        type: input.type as any,
        status: input.status as SalesDocumentStatus | undefined,
        customerId: input.customerId || undefined,
        issueDate: typeof input.issueDate === 'string' ? new Date(input.issueDate) : input.issueDate,
        dueDate: input.dueDate ? (typeof input.dueDate === 'string' ? new Date(input.dueDate) : input.dueDate) : undefined,
        notes: input.notes,
        items: input.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          discount: item.discount,
        })),
      };

      const document = await SalesService.createDocument(serviceInput, branchId, userId);
      res.status(201).json({ success: true, data: document });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all sales documents with optional filters
   */
  static async listDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = listDocumentsQuerySchema.parse(req.query);
      const authReq = req as AuthenticatedRequest;
      const userBranchId = authReq.user?.branchId;

      let branchIdFilter = query.branchId || userBranchId;

      // Record-level isolation: Enforce authorized branches
      if (authReq.authorizedBranchIds && authReq.authorizedBranchIds.length > 0) {
        // If they requested a specific branch, check if it's authorized
        if (query.branchId && !authReq.authorizedBranchIds.includes(query.branchId)) {
          throw new AppError(ErrorCode.FORBIDDEN, 403, 'Unauthorized branch access');
        }
        // Force the filter to be restricted to authorized branches
        branchIdFilter = query.branchId || authReq.authorizedBranchIds[0]; // Simplification for now, or we could pass the whole array to service if it supported it.
      }

      const documents = await SalesService.listDocuments({
        ...query,
        branchId: (branchIdFilter || undefined) as string | undefined
      });
      res.status(200).json({ success: true, data: documents });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single sales document by ID
   */
  static async getDocumentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      if (!id) {
        res.status(400).json({ success: false, error: 'Document ID is required' });
        return;
      }

      const document = await SalesService.getDocumentById(id);
      if (!document) {
        res.status(404).json({ success: false, error: 'Document not found' });
        return;
      }
      res.status(200).json({ success: true, data: document });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Convert a document from one type to another (e.g., Quote to Invoice)
   */
  static async convertDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      if (!id) {
        res.status(400).json({ success: false, error: 'Document ID is required' });
        return;
      }

      // Parse but ignore the type since convertToInvoice always creates an invoice
      convertDocumentSchema.parse(req.body);
      const authReq = req as AuthenticatedRequest;
      const branchId = authReq.user?.branchId;
      const userId = authReq.user?.userId;

      if (!branchId || !userId) {
        res.status(401).json({ success: false, error: 'User context required' });
        return;
      }

      // Isolation check
      const source = await SalesService.getDocumentById(id);
      if (!source) {
        throw new AppError(ErrorCode.NOT_FOUND, 404, 'Source document not found');
      }

      if (authReq.authorizedBranchIds && authReq.authorizedBranchIds.length > 0) {
        if (!authReq.authorizedBranchIds.includes(source.branchId)) {
          throw new AppError(ErrorCode.FORBIDDEN, 403, 'Cannot convert document from another branch');
        }
      }

      const convertedDocument = await SalesService.convertToInvoice(id, branchId as string, userId);
      res.status(201).json({ success: true, data: convertedDocument });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a POS sale (simplified invoice creation for retail)
   */
  static async createPOSSale(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createPOSSaleSchema.parse(req.body);
      const authReq = req as AuthenticatedRequest;
      const branchId = authReq.user?.branchId || input.branchId;
      const userId = authReq.user?.userId || input.userId;

      if (!branchId || !userId) {
        res.status(401).json({ success: false, error: 'User context required' });
        return;
      }

      // Record-level isolation
      if (authReq.authorizedBranchIds && authReq.authorizedBranchIds.length > 0) {
        if (!authReq.authorizedBranchIds.includes(branchId)) {
          throw new AppError(ErrorCode.FORBIDDEN, 403, 'Cannot create POS sale for an unauthorized branch');
        }
      }

      // Transform input to match service expectations
      const sale = await SalesService.createPOSSale({
        branchId,
        userId,
        items: input.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          taxRate: item.tax_rate,
          discount: item.discount,
        })),
        paymentMethod: input.payment_method,
        amountPaid: input.amount_paid,
        notes: input.notes,
      });

      res.status(201).json({
        success: true,
        data: sale,
        message: 'Sale completed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get POS sales history
   */
  static async getPOSSales(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const { date, payment_method, limit = '50', offset = '0' } = req.query;
      let branchIdFilter = (authReq.user?.branchId as string) || (req.query.branchId as string);

      if (authReq.authorizedBranchIds && authReq.authorizedBranchIds.length > 0) {
        if (req.query.branchId && !authReq.authorizedBranchIds.includes(req.query.branchId as string)) {
          throw new AppError(ErrorCode.FORBIDDEN, 403, 'Unauthorized branch access');
        }
        branchIdFilter = (req.query.branchId as string) || authReq.authorizedBranchIds?.[0] || "";
      }

      if (!branchIdFilter) {
        throw new AppError(ErrorCode.BAD_REQUEST, 400, 'Branch ID is required');
      }

      const sales = await SalesService.getPOSSales({
        branchId: branchIdFilter as string,
        startDate: date as string,
        endDate: date as string,
        paymentMethod: payment_method as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });

      res.status(200).json({ success: true, data: sales });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single POS sale by ID
   */
  static async getPOSSaleById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      if (!id) {
        res.status(400).json({ success: false, error: 'Sale ID is required' });
        return;
      }

      const sale = await SalesService.getPOSSaleById(id);

      if (!sale) {
        res.status(404).json({ success: false, error: 'Sale not found' });
        return;
      }

      res.status(200).json({ success: true, data: sale });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Void/cancel a sales document
   */
  static async voidDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      if (!id) {
        res.status(400).json({ success: false, error: 'Document ID is required' });
        return;
      }

      const { reason } = req.body;

      const document = await SalesService.voidDocument(id, reason);
      res.status(200).json({ success: true, data: document });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a credit note from an invoice
   */
  static async createCreditNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invoiceId = req.params.invoiceId as string;
      if (!invoiceId) {
        res.status(400).json({ success: false, error: 'Invoice ID is required' });
        return;
      }

      const authReq = req as AuthenticatedRequest;
      const items = req.body.items;
      const reason = req.body.reason;
      const branchId = authReq.user?.branchId;
      const userId = authReq.user?.userId;

      if (!branchId || !userId) {
        res.status(401).json({ success: false, error: 'User context required' });
        return;
      }

      const creditNote = await SalesService.createCreditNote({
        invoiceId,
        items: items.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          discount: item.discount,
        })),
        reason,
        branchId,
        userId,
      });

      res.status(201).json({ success: true, data: creditNote });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Record a payment for an invoice
   */
  static async recordPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      if (!id) {
        res.status(400).json({ success: false, error: 'Document ID is required' });
        return;
      }

      const authReq = req as AuthenticatedRequest;
      const { amount, payment_method, reference } = req.body;
      const userId = authReq.user?.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'User context required' });
        return;
      }

      const payment = await SalesService.recordPayment({
        documentId: id,
        amount,
        paymentMethod: payment_method,
        reference,
        userId,
      });

      res.status(201).json({ success: true, data: payment });
    } catch (error) {
      next(error);
    }
  }
}
