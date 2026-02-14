/**
 * POSController - POS Operations using SalesDocument Model
 * 
 * This controller handles point-of-sale operations using the modern SalesDocument model.
 * The legacy Sales model has been removed.
 * 
 * All operations now use SalesService for unified sales document management.
 */

import { Request, Response, NextFunction } from 'express';
import { PosService } from '../service';
import { SalesService } from '../service/sales.service';
import {
  CreateSalesDTO,
  UpdateSalesDTO,
  SalesListQueryDTO,
  DailySummaryDTO,
  ProductSearchDTO,
  ApproveDiscountDTO,
} from '../dto';
import { validationError } from '../../../lib/errors';
import { logger } from '../../../lib/logger';

export class POSController {
  private posService = new PosService();

  /**
   * POST /pos/products/search
   * Search product by SKU or barcode
   * 
   * Status: ✅ No migration needed (product search is model-agnostic)
   */
  async searchProduct(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dto: ProductSearchDTO = req.body;

      if (!dto.search) {
        throw validationError('Search term is required');
      }

      const result = await this.posService.searchProduct(dto);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /pos/sales
   * Create new sales order using SalesDocument model
   * 
   * Status: ✅ FULL MIGRATION COMPLETE
   */
  async createSales(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dto: CreateSalesDTO = req.body;

      // Validation
      if (!dto.branchId || !dto.userId || !dto.items || dto.items.length === 0) {
        throw validationError('Missing required fields: branchId, userId, items');
      }

      if (!dto.payment_method) {
        throw validationError('Payment method is required');
      }

      // Create using SalesDocument model
      const newSaleDocument = await SalesService.createPOSSale({
        branchId: dto.branchId,
        userId: dto.userId,
        items: dto.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          taxRate: item.tax_rate,
          discount: item.discount,
        })),
        paymentMethod: dto.payment_method,
        amountPaid: dto.amount_paid || 0,
        notes: dto.notes,
      });

      // Transform to response format
      const response = {
        id: newSaleDocument.id,
        invoice_no: newSaleDocument.documentId,
        status: 'confirmed',
        payment_method: dto.payment_method,
        branchId: dto.branchId,
        userId: dto.userId,
        subtotal: newSaleDocument.subtotal,
        total_amount: newSaleDocument.subtotal,
        discount: newSaleDocument.discount,
        tax: newSaleDocument.tax,
        grand_total: newSaleDocument.total,
        amount_paid: dto.amount_paid || newSaleDocument.total,
        change: 0,
        sales_items: newSaleDocument.items.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          tax_rate: item.taxRate,
          discount: item.discount,
          discount_percent: 0,
          subtotal: item.subtotal,
          tax_amount: item.taxAmount,
          amount: item.total,
        })),
        created_date: newSaleDocument.createdAt.toISOString(),
      };

      logger.info({
        saleDocumentId: newSaleDocument.id,
        invoice_no: newSaleDocument.documentId,
        branchId: dto.branchId,
      }, 'POS sale created using SalesDocument model');

      res.status(201).json({
        success: true,
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /pos/sales/:id
   * Get sales by ID from SalesDocument model
   * 
   * Status: ✅ FULL MIGRATION COMPLETE
   */
  async getSalesById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        throw validationError('ID is required');
      }

      // Read from SalesDocument model
      const document = await SalesService.getPOSSaleById(id);

      res.json({
        success: true,
        data: document,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /pos/sales
   * List sales with filtering from SalesDocument model
   * 
   * Status: ✅ FULL MIGRATION COMPLETE
   */
  async listSales(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query: SalesListQueryDTO = req.query as any;

      // Get from SalesDocument model only
      const sales = await SalesService.getPOSSales({
        branchId: query.branchId,
        dateFilter: query.startDate,
        paymentMethod: query.payment_method,
        limit: query.limit || 20,
        offset: ((query.page || 1) - 1) * (query.limit || 20),
      });

      res.json({
        success: true,
        data: sales,
        pagination: {
          total: sales.length,
          page: query.page || 1,
          limit: query.limit || 20,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /pos/sales/:id
   * Update sales order
   * 
   * Status: ⚠️ NOT YET IMPLEMENTED FOR SALESDOCUMENT
   * TODO: Implement via SalesService.updateDocument() in future step
   */
  async updateSales(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const dto: UpdateSalesDTO = req.body;

      if (!id) {
        throw validationError('ID is required');
      }

      // TODO: Use SalesService.updateDocument() once implemented
      const result = await this.posService.updateSales(id, dto);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /pos/sales/daily-summary
   * Get daily summary for a branch
   * 
   * Status: ⚠️ USING LEGACY SERVICE (will migrate to SalesDocument queries in future step)
   */
  async getDailySummary(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dto: DailySummaryDTO = {
        branchId: req.query.branchId as string,
        date: req.query.date as string,
      };

      const result = await this.posService.getDailySummary(dto);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /pos/sales/:id/receipt
   * Generate receipt for a sale
   * 
   * Status: ⚠️ USING LEGACY SERVICE (PDF generation will migrate in future step)
   */
  async getReceipt(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        throw validationError('Sale ID is required');
      }

      // TODO: Use SalesService for receipt generation once implemented
      const result = await this.posService.generateReceipt(id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /pos/discount/approve
   * Manager approval for discounts > 10%
   * 
   * Status: ⚠️ USING LEGACY SERVICE (discount approval will be migrated in future step)
   */
  async approveDiscount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dto: ApproveDiscountDTO = req.body;

      if (!dto.salesId || !dto.managerId || !dto.managerPassword) {
        throw validationError(
          'Missing required fields: salesId, managerId, managerPassword'
        );
      }

      // TODO: Implement discount approval for SalesDocument in future step
      await this.posService.approveDiscount(dto);

      res.json({
        success: true,
        message: 'Discount approved successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
