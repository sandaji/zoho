// backend/src/modules/pos/controller/pdf.controller.ts
import { Request, Response, NextFunction } from "express";
import { SalesService } from "../service/sales.service";
import { PDFGenerator } from "../../../lib/pdf-generator";
import { AppError, ErrorCode } from "../../../lib/errors";

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
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const { format = "html" } = req.query; // 'html' or 'pdf' (future)

      if (!id) {
        throw new AppError(
          ErrorCode.BAD_REQUEST,
          400,
          "Document ID is required"
        );
      }

      // Fetch document with all relations
      const document = await SalesService.getDocumentById(id);

      if (!document) {
        throw new AppError(
          ErrorCode.NOT_FOUND,
          404,
          "Document not found"
        );
      }

      // Only quotes and invoices can be converted to PDF
      if (document.type !== "QUOTE" && document.type !== "INVOICE") {
        throw new AppError(
          ErrorCode.BAD_REQUEST,
          400,
          "Only quotes and invoices can be generated as PDF"
        );
      }

      // Company information (you should fetch this from settings or config)
      // For now, using default company info
      const companyInfo = {
        name: document.branch?.name || "YOUR COMPANY NAME",
        address: document.branch?.address || "YOUR COMPANY ADDRESS, CITY, COUNTRY",
        phone: [
          document.branch?.phone || "+254 XXX XXX XXX",
          "+254 XXX XXX XXX",
        ],
        email: "info@yourcompany.com",
        pin: "PXXXXXXXXX",
        bankDetails: {
          bankName: "YOUR BANK LIMITED, BRANCH NAME",
          accountName: "YOUR COMPANY NAME",
          accountNumber: "XXXXXXXXXXXX",
          bankCode: "XX",
          branchCode: "XXX",
          paybillNo: "XXXXXX",
          paybillAccount: "XXXXXX",
        },
      };

      // Generate HTML based on document type
      let html: string;
      if (document.type === "QUOTE") {
        html = PDFGenerator.generateQuoteHTML({ document, companyInfo });
      } else {
        html = PDFGenerator.generateInvoiceHTML({ document, companyInfo });
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
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params as { id: string };

      if (!id) {
        throw new AppError(
          ErrorCode.BAD_REQUEST,
          400,
          "Document ID is required"
        );
      }

      // Fetch document
      const document = await SalesService.getDocumentById(id);

      if (!document) {
        throw new AppError(
          ErrorCode.NOT_FOUND,
          404,
          "Document not found"
        );
      }

      // Company info
      const companyInfo = {
        name: document.branch?.name || "YOUR COMPANY NAME",
        address: document.branch?.address || "YOUR COMPANY ADDRESS",
        phone: ["+254 XXX XXX XXX", "+254 XXX XXX XXX"],
        email: "info@yourcompany.com",
        pin: "PXXXXXXXXX",
        bankDetails: {
          bankName: "YOUR BANK LIMITED",
          accountName: "YOUR COMPANY NAME",
          accountNumber: "XXXXXXXXXXXX",
          bankCode: "XX",
          branchCode: "XXX",
          paybillNo: "XXXXXX",
          paybillAccount: "XXXXXX",
        },
      };

      // Generate HTML
      let html: string;
      if (document.type === "QUOTE") {
        html = PDFGenerator.generateQuoteHTML({ document, companyInfo });
      } else if (document.type === "INVOICE") {
        html = PDFGenerator.generateInvoiceHTML({ document, companyInfo });
      } else {
        throw new AppError(
          ErrorCode.BAD_REQUEST,
          400,
          "Cannot preview this document type"
        );
      }

      res.setHeader("Content-Type", "text/html");
      res.send(html);
    } catch (error) {
      next(error);
    }
  }
}
