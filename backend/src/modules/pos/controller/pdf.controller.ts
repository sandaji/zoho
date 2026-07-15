// backend/src/modules/pos/controller/pdf.controller.ts
import { Request, Response, NextFunction } from "express";
import { SalesService } from "../service/sales.service";
import { PDFGenerator } from "../../../lib/pdf-generator";
import { AppError, ErrorCode } from "../../../lib/errors";
import { getCompanyInfo } from "../../../config/company.config";

/**
 * PDF Controller
 * Handles PDF generation for sales documents
 */
export class PDFController {
  /**
   * Generate PDF for a sales document (Quote or Invoice)
   * Returns HTML that can be converted to PDF on the frontend or backend
   */
  static async generatePDF(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const { format = "html" } = req.query; // 'html' or 'pdf' (future)

      if (!id) {
        throw new AppError(
          ErrorCode.BAD_REQUEST,
          400,
          "Document ID is required",
        );
      }

      // Fetch document with all relations
      const document = await SalesService.getDocumentById(id);

      if (!document) {
        throw new AppError(ErrorCode.NOT_FOUND, 404, "Document not found");
      }



      // Build company info: branch DB fields take priority, env vars are fallback
      const companyInfo = getCompanyInfo(document.branch ?? undefined);

      // Generate HTML based on document type
      let html: string;
      switch (document.type) {
        case "QUOTE":
          html = PDFGenerator.generateQuoteHTML({ document, companyInfo });
          break;
        case "INVOICE":
        case "DRAFT":
        case "CREDIT_NOTE":
        default:
          html = PDFGenerator.generateInvoiceHTML({ document, companyInfo });
          break;
      }

      // Return HTML (frontend can convert to PDF using html2pdf or similar)
      if (format === "html") {
        res.setHeader("Content-Type", "text/html");
        res.send(html);
        return;
      }

      // Future: Convert to PDF on backend using puppeteer or similar
      // For now, just return HTML
      res.setHeader("Content-Type", "text/html");
      res.send(html);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate preview HTML (for testing)
   */
  static async previewDocument(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params as { id: string };

      if (!id) {
        throw new AppError(
          ErrorCode.BAD_REQUEST,
          400,
          "Document ID is required",
        );
      }

      // Fetch document
      const document = await SalesService.getDocumentById(id);

      if (!document) {
        throw new AppError(ErrorCode.NOT_FOUND, 404, "Document not found");
      }

      // Build company info: branch DB fields take priority, env vars are fallback
      const companyInfo = getCompanyInfo(document.branch ?? undefined);

      // Generate HTML based on document type
      let html: string;
      switch (document.type) {
        case "QUOTE":
          html = PDFGenerator.generateQuoteHTML({ document, companyInfo });
          break;
        case "INVOICE":
        case "DRAFT":
        case "CREDIT_NOTE":
        default:
          html = PDFGenerator.generateInvoiceHTML({ document, companyInfo });
          break;
      }

      res.setHeader("Content-Type", "text/html");
      res.send(html);
    } catch (error) {
      next(error);
    }
  }
}
