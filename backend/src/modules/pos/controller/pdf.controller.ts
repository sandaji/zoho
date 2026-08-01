// backend/src/modules/pos/controller/pdf.controller.ts
import { Request, Response, NextFunction } from "express";
import { AppError, ErrorCode } from "../../../lib/errors";
import { DocumentService } from "../../../lib/document.service";

/**
 * PDF Controller
 * Thin HTTP layer — all document rendering is delegated to DocumentService.
 */
export class PDFController {
  /**
   * Generate HTML or PDF for a SalesDocument (Quote, Invoice, Credit Note…)
   * Query param: ?format=html (default) | ?format=pdf
   */
  static async generatePDF(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const format = (req.query.format === "pdf" ? "pdf" : "html") as "html" | "pdf";

      if (!id) {
        throw new AppError(ErrorCode.BAD_REQUEST, 400, "Document ID is required");
      }

      const output = await DocumentService.generateOutput(id, format);

      res.setHeader("Content-Type", output.mimeType);
      if (output.format === "pdf") {
        res.setHeader("Content-Disposition", `attachment; filename="${output.filename}"`);
      }
      res.send(output.content);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Preview HTML for a document (always returns HTML, no Puppeteer involved).
   */
  static async previewDocument(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params as { id: string };

      if (!id) {
        throw new AppError(ErrorCode.BAD_REQUEST, 400, "Document ID is required");
      }

      const output = await DocumentService.generateOutput(id, "html");
      res.setHeader("Content-Type", "text/html");
      res.send(output.content);
    } catch (error) {
      next(error);
    }
  }
}
