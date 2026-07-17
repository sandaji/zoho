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
   * Returns HTML or PDF
   */
  static async generatePDF(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const { format = "html" } = req.query; // 'html' or 'pdf'

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

      // Return HTML
      if (format === "html") {
        res.setHeader("Content-Type", "text/html");
        res.send(html);
        return;
      }

      // Return PDF using Puppeteer (if available)
      if (format === "pdf") {
        try {
          // Dynamically import puppeteer (in case it's not fully installed yet)
          const puppeteer = (await import("puppeteer")).default;
          const browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
          });
          const page = await browser.newPage();
          
          // Set content and wait for everything to load
          await page.setContent(html, {
            waitUntil: "domcontentloaded",
          });
          
          // Generate PDF
          const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: {
              top: "20px",
              bottom: "20px",
              left: "20px",
              right: "20px",
            },
          });
          
          await browser.close();
          
          // Send PDF
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="${document.documentId}.pdf"`,
          );
          res.send(pdfBuffer);
          return;
        } catch (err) {
          // If Puppeteer isn't ready, just send HTML instead
          console.warn("Failed to generate PDF with Puppeteer, falling back to HTML:", err);
          res.setHeader("Content-Type", "text/html");
          res.send(html);
          return;
        }
      }

      // Fallback to HTML
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
