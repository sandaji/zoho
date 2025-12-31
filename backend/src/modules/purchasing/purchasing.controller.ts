import { Request, Response, NextFunction } from "express";
import { PurchasingService } from "./purchasing.service";
// Removed unused PurchaseOrderStatus import
import { AppError, ErrorCode } from "../../lib/errors";

export class PurchasingController {
  private service = new PurchasingService();

  createVendor = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const vendor = await this.service.createVendor(req.body);
      res.status(201).json({
        success: true,
        data: vendor,
      });
    } catch (error) {
      next(error);
    }
  };

  listVendors = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.listVendors({
        search: req.query.search as string,
        skip: req.query.skip ? parseInt(req.query.skip as string) : undefined,
        take: req.query.take ? parseInt(req.query.take as string) : undefined,
      });
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  createPurchaseOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.userId) throw new AppError(ErrorCode.UNAUTHORIZED, 401, "User not authenticated");
      
      const order = await this.service.createPurchaseOrder(req.user.userId, req.body);
      res.status(201).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  };

  getPurchaseOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.params.id) throw new AppError(ErrorCode.BAD_REQUEST, 400, "Order ID is required");
      const order = await this.service.getPurchaseOrder(req.params.id);
      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  };

  listPurchaseOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.listPurchaseOrders({
        status: req.query.status as any, // Cast to any to avoid enum type issues until generated
        vendorId: req.query.vendorId as string,
        branchId: req.query.branchId as string,
        skip: req.query.skip ? parseInt(req.query.skip as string) : undefined,
        take: req.query.take ? parseInt(req.query.take as string) : undefined,
      });
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.userId) throw new AppError(ErrorCode.UNAUTHORIZED, 401, "User not authenticated");
      
      const { status } = req.body;
      if (!status) throw new AppError(ErrorCode.MISSING_FIELD, 400, "Status is required");

      if (!req.params.id) throw new AppError(ErrorCode.BAD_REQUEST, 400, "Order ID is required");
      const order = await this.service.updateStatus(req.params.id, status as any, req.user.userId);
      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  };

  receiveGoods = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.userId) throw new AppError(ErrorCode.UNAUTHORIZED, 401, "User not authenticated");

      if (!req.params.id) throw new AppError(ErrorCode.BAD_REQUEST, 400, "Order ID is required");
      const order = await this.service.receiveGoods(
        req.params.id,
        req.user.userId,
        req.body // expected: { warehouseId, items: [] }
      );
      
      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  };

  generatePdf = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.params.id) throw new AppError(ErrorCode.BAD_REQUEST, 400, "Order ID is required");
      const pdfBuffer = await this.service.generatePoPdf(req.params.id);
      
      res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=PO-${req.params.id}.pdf`,
        "Content-Length": pdfBuffer.length,
      });

      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  };
}
