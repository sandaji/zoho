/**
 * DocumentService — SINGLE SOURCE OF TRUTH for all document generation.
 *
 * Wraps PDFGenerator (HTML templates) and the Puppeteer PDF conversion step
 * that were previously duplicated across:
 *   - modules/pos/controller/pdf.controller.ts  (generatePDF + previewDocument)
 *   - modules/pos/service/sales.service.ts       (SalesService.generateReceipt)
 *   - modules/pos/service/index.ts               (PosService.generateReceipt)
 *
 * Rule: every place that needs HTML or PDF output for a SalesDocument must
 * call DocumentService — never call PDFGenerator directly from a controller.
 */

import { prisma } from "./db";
import { AppError, ErrorCode } from "./errors";
import { PDFGenerator } from "./pdf-generator";
import { getCompanyInfo } from "../config/company.config";

// ─── Receipt DTO ─────────────────────────────────────────────────────────────

export interface ReceiptSaleItem {
  id: string;
  productId: string;
  product: {
    id?: string;
    name: string;
    sku: string;
  } | null;
  quantity: number;
  unit_price: number;
  tax_rate: number | null;
  discount: number;
  amount: number;
}

export interface ReceiptDTO {
  sale: {
    id: string;
    invoice_no: string;
    status: string;
    payment_method: string;
    subtotal: number;
    discount: number;
    tax: number;
    grand_total: number;
    amount_paid: number;
    change: number;
    created_date: Date;
    sales_items: ReceiptSaleItem[];
  };
  branch: {
    name: string;
    address: string | null;
    phone: string | null;
    code: string;
  } | null;
  cashier: {
    name: string;
    email: string;
  } | null;
  company: {
    name: string;
    address: string;
    phone: string | string[];
    email: string;
    kra_pin: string;
  };
}

// ─── HTML/PDF output ─────────────────────────────────────────────────────────

export type DocumentFormat = "html" | "pdf";

export interface DocumentOutput {
  format: DocumentFormat;
  content: string | Buffer;
  mimeType: string;
  filename: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class DocumentService {

  // ===========================================================================
  // DOCUMENT FETCH (shared query — used by PDF and receipt endpoints)
  // ===========================================================================

  /**
   * Fetch a SalesDocument with all relations needed for rendering.
   * Throws 404 if not found.
   */
  static async fetchDocument(id: string) {
    const document = await prisma.salesDocument.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        customer: true,
        payments: true,
        branch: true,
        createdBy: true,
      },
    });

    if (!document) {
      throw new AppError(ErrorCode.NOT_FOUND, 404, "Document not found");
    }

    return document;
  }

  // ===========================================================================
  // HTML / PDF GENERATION
  // ===========================================================================

  /**
   * Generate HTML for a document (any type).
   * Callers that previously contained a switch/case over document.type should
   * call this instead.
   */
  static generateHTML(document: any): string {
    const companyInfo = getCompanyInfo(document.branch ?? undefined);

    switch (document.type) {
      case "QUOTE":
        return PDFGenerator.generateQuoteHTML({ document, companyInfo });
      case "INVOICE":
      case "DRAFT":
      case "CREDIT_NOTE":
      default:
        return PDFGenerator.generateInvoiceHTML({ document, companyInfo });
    }
  }

  /**
   * Generate full output (HTML or PDF) for a document ID.
   *
   * For PDF format this uses Puppeteer; if Puppeteer fails it gracefully
   * falls back to HTML so the endpoint never returns a 500 for PDF failures.
   */
  static async generateOutput(
    id: string,
    format: DocumentFormat = "html",
  ): Promise<DocumentOutput> {
    const document = await DocumentService.fetchDocument(id);
    const html = DocumentService.generateHTML(document);

    if (format === "html") {
      return {
        format: "html",
        content: html,
        mimeType: "text/html",
        filename: `${document.documentId}.html`,
      };
    }

    // PDF via Puppeteer — gracefully degrade to HTML on error
    try {
      const puppeteer = (await import("puppeteer")).default;
      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "domcontentloaded" });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" },
      });
      await browser.close();

      return {
        format: "pdf",
        content: Buffer.from(pdfBuffer),
        mimeType: "application/pdf",
        filename: `${document.documentId}.pdf`,
      };
    } catch (err) {
      // Puppeteer not available — fall back to HTML
      return {
        format: "html",
        content: html,
        mimeType: "text/html",
        filename: `${document.documentId}.html`,
      };
    }
  }

  // ===========================================================================
  // RECEIPT GENERATION  (canonical — replaces both generateReceipt duplicates)
  // ===========================================================================

  /**
   * Generate a receipt DTO for a POS sale.
   *
   * Replaces:
   *   - SalesService.generateReceipt (static, pos/service/sales.service.ts)
   *   - PosService.generateReceipt   (instance, pos/service/index.ts)
   *
   * Both implementations were identical — this is the single source.
   */
  static async generateReceipt(saleId: string): Promise<ReceiptDTO> {
    const sale = await prisma.salesDocument.findUnique({
      where: { id: saleId },
      include: {
        items: { include: { product: true } },
        branch: true,
        createdBy: true,
        payments: true,
      },
    });

    if (!sale) {
      throw new AppError(ErrorCode.NOT_FOUND, 404, "Sale not found");
    }

    const company = {
      name: process.env.COMPANY_NAME || "LUNATECH SYSTEMS LTD",
      address: process.env.COMPANY_ADDRESS || "123 Tech Plaza, Westlands",
      phone: process.env.COMPANY_PHONE || "+254 722 123 456",
      email: process.env.COMPANY_EMAIL || "info@lunatech.co.ke",
      kra_pin: process.env.COMPANY_KRA_PIN || "P051472913Q",
    };

    const amountPaid = sale.payments?.reduce((s, p) => s + p.amount, 0) ?? 0;

    return {
      sale: {
        id: sale.id,
        invoice_no: sale.documentId,
        status: sale.status,
        payment_method: (sale.payments?.[0]?.method as string) ?? "cash",
        subtotal: sale.subtotal,
        discount: sale.discount,
        tax: sale.tax,
        grand_total: sale.total,
        amount_paid: amountPaid,
        change: amountPaid - sale.total,
        created_date: sale.createdAt,
        sales_items: (sale.items ?? []).map((item) => ({
          id: item.id,
          productId: item.productId,
          product: item.product
            ? { id: item.product.id, name: item.product.name, sku: item.product.sku }
            : null,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          tax_rate: item.taxRate,
          discount: item.discount,
          amount: item.total,
        })),
      },
      branch: sale.branch
        ? {
            name: sale.branch.name,
            address: sale.branch.address ?? null,
            phone: sale.branch.phone ?? null,
            code: sale.branch.code,
          }
        : null,
      cashier: sale.createdBy
        ? { name: sale.createdBy.name, email: sale.createdBy.email }
        : null,
      company,
    };
  }
}
