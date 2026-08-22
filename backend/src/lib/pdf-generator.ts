// backend/src/lib/pdf-generator.ts
// SalesDocument import removed as it was unused in this file but required in options interface
// which now uses 'any' or could be typed if needed.


/**
 * PDF Generator for Sales Documents
 * Generates HTML that can be converted to PDF using html-pdf or similar libraries
 * Matches the sample PDF design
 */

interface PDFGeneratorOptions {
  document: any; // SalesDocument with items and customer
  companyInfo: {
    name: string;
    address: string;
    phone: string[];
    email: string;
    pin: string;
    bankDetails?: {
      bankName: string;
      accountName: string;
      accountNumber: string;
      bankCode: string;
      branchCode: string;
      paybillNo?: string;
      paybillAccount?: string;
    };
  };
}

// Helper functions
const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatDateTime = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const numberToWords = (num: number): string => {
  const ones = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE"];
  const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];
  const teens = ["TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];

  if (num === 0) return "ZERO";
  
  const numStr = Math.floor(num).toString();
  let result = "";

  if (numStr.length > 6) {
    const millions = Math.floor(num / 1000000);
    result += numberToWords(millions) + " MILLION ";
    num = num % 1000000;
  }

  if (Math.floor(num / 1000) > 0) {
    const thousands = Math.floor(num / 1000);
    result += numberToWords(thousands) + " THOUSAND ";
    num = num % 1000;
  }

  if (Math.floor(num / 100) > 0) {
    result += ones[Math.floor(num / 100)] + " HUNDRED ";
    num = num % 100;
  }

  if (num >= 20) {
    result += tens[Math.floor(num / 10)] + " ";
    num = num % 10;
  } else if (num >= 10) {
    result += teens[num - 10] + " ";
    return result.trim() + " ONLY";
  }

  if (num > 0) {
    result += ones[num] + " ";
  }

  return result.trim() + " ONLY";
};

// Get document type label
const getDocumentTypeLabel = (type: string, status: string) => {
  switch (type) {
    case "QUOTE": return "Sales Quotation";
    case "INVOICE": return "Sales Invoice";
    case "CREDIT_NOTE": return "Credit Note";
    case "DRAFT": return "Draft";
    default: return "Document";
  }
};

export class PDFGenerator {
  /**
   * Generate HTML for a Sales Quote
   */
  static generateQuoteHTML(options: PDFGeneratorOptions): string {
    const { document, companyInfo } = options;
    
    const subtotal = document.subtotal || 0;
    const vat = document.tax || 0;
    const discount = document.discount || 0;
    const grandTotal = document.total || 0;
    const totalInWords = numberToWords(grandTotal);

    return this.generateDocumentHTML(options, "Sales Quotation");
  }

  /**
   * Generate HTML for an Invoice or other document type
   */
  static generateInvoiceHTML(options: PDFGeneratorOptions): string {
    const { document, companyInfo } = options;
    
    const docLabel = getDocumentTypeLabel(document.type, document.status);
    return this.generateDocumentHTML(options, docLabel);
  }

  private static generateDocumentHTML(options: PDFGeneratorOptions, docTitle: string): string {
    const { document, companyInfo } = options;
    
    const subtotal = document.subtotal || 0;
    const vat = document.tax || 0;
    const discount = document.discount || 0;
    const grandTotal = document.total || 0;
    const amountPaid = document.paidAmount || 0;
    const balance = document.balance || 0;
    const totalInWords = numberToWords(grandTotal);
    const paymentMethod = document.payments?.[0]?.method || "CASH";

    // Determine date: use issueDate, else createdAt
    const finalDate = document.issueDate || document.createdAt;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${docTitle} - ${document.documentId}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, sans-serif;
      font-size: 11px;
      line-height: 1.5;
      padding: 25px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .header {
      display: flex;
      justify-content: flex-start;
      align-items: flex-start;
      margin-bottom: 15px;
    }
    
    .header .logo-placeholder {
      width: 180px;
      text-align: center;
      margin-right: 30px;
    }
    
    .header .logo-placeholder h1 {
      color: #d32f2f;
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .header .company-info {
      flex: 1;
    }
    
    .header .company-info .company-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .header .company-info p {
      margin: 2px 0;
    }
    
    .document-title {
      text-align: center;
      font-size: 16px;
      font-weight: bold;
      margin: 20px 0 15px;
      text-decoration: underline;
    }
    
    .customer-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
    }
    
    .customer-box, .document-box {
      border: 1px solid #000;
      padding: 10px;
      border-radius: 4px;
    }
    
    .customer-box {
      width: 60%;
    }
    
    .document-box {
      width: 35%;
    }
    
    .box-title {
      font-weight: bold;
      margin-bottom: 8px;
      text-decoration: underline;
    }
    
    .detail-row {
      display: flex;
      margin: 3px 0;
    }
    
    .detail-label {
      font-weight: bold;
      min-width: 100px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    
    table th {
      background-color: #e0e0e0;
      border: 1px solid #000;
      padding: 8px 6px;
      text-align: left;
      font-weight: bold;
      font-size: 10px;
    }
    
    table td {
      border: 1px solid #000;
      padding: 7px 6px;
      font-size: 10px;
      vertical-align: top;
    }
    
    .text-right {
      text-align: right;
    }
    
    .text-center {
      text-align: center;
    }
    
    .totals-section {
      margin: 20px 0;
      float: right;
      width: 320px;
    }
    
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 10px;
      border-bottom: 1px solid #ccc;
    }
    
    .totals-row.grand-total {
      border: 2px solid #000;
      border-top: none;
      font-weight: bold;
      font-size: 12px;
      background-color: #f5f5f5;
    }
    
    .amount-words {
      clear: both;
      margin: 15px 0;
      padding: 8px 12px;
      border: 1px solid #000;
      background-color: #f8f8f8;
      font-weight: bold;
    }
    
    .bank-details {
      margin: 15px 0;
      padding: 10px;
    }
    
    .bank-details .bank-row {
      margin: 3px 0;
    }
    
    .terms-section {
      margin-top: 20px;
    }
    
    .terms-section h4 {
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 5px;
      text-decoration: underline;
    }
    
    .terms-section ol {
      margin-left: 20px;
    }
    
    .terms-section li {
      margin: 4px 0;
    }
    
    .footer {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    
    .signature-box {
      text-align: center;
      padding: 15px;
      border: 1px solid #000;
      border-radius: 4px;
      min-width: 180px;
    }
    
    .signature-box .label {
      font-weight: bold;
      margin-bottom: 30px;
      display: block;
      text-decoration: underline;
    }
    
    .signature-box .detail {
      font-size: 10px;
    }
    
    .footer-message {
      text-align: center;
      margin-top: 30px;
      padding-top: 10px;
      border-top: 2px solid #000;
    }
    
    .footer-message strong {
      display: block;
      font-size: 12px;
      margin-bottom: 5px;
    }
    
    .clearfix::after {
      content: "";
      display: table;
      clear: both;
    }
  </style>
</head>
<body>
  <!-- Header with Logo & Company Info -->
  <div class="header">
    <div class="logo-placeholder">
      <h1>TRONIC</h1>
    </div>
    <div class="company-info">
      <div class="company-name">${companyInfo.name}</div>
      <p>${companyInfo.address}</p>
      <p>PHONE: ${companyInfo.phone.join(" / ")}</p>
      <p>EMAIL: ${companyInfo.email}</p>
      <p>PIN: ${companyInfo.pin}</p>
    </div>
  </div>
  
  <!-- Document Title -->
  <div class="document-title">${docTitle}</div>
  
  <!-- Customer and Document Details -->
  <div class="customer-section">
    <div class="customer-box">
      <div class="box-title">CUSTOMER</div>
      <div class="detail-row">
        <span class="detail-label">:</span>
        <span>${document.customer?.name || "Counter Customer"}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">ADDRESS:</span>
        <span>${document.customer?.address || ""}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">CONTACT:</span>
        <span>${document.customer?.phone || ""}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">PIN:</span>
        <span>${document.customer?.taxId || ""}</span>
      </div>
    </div>
    
    <div class="document-box">
      <div class="box-title"></div>
      <div class="detail-row">
        <span class="detail-label">${docTitle.toUpperCase().includes("QUOTATION") ? "QUOTATION" : docTitle.toUpperCase().includes("CREDIT") ? "CREDIT NOTE" : "INVOICE"} #:</span>
        <span>${document.documentId}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">DATE:</span>
        <span>${formatDate(finalDate)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">YOUR REF. #:</span>
        <span>${document.referenceNo || ""}</span>
      </div>
    </div>
  </div>
  
  <!-- Items Table -->
  <table>
    <thead>
      <tr>
        <th class="text-center" style="width: 5%;">S. NO</th>
        <th style="width: 15%;">CODE</th>
        <th style="width: 45%;">DESCRIPTION</th>
        <th class="text-center" style="width: 10%;">QUANTITY</th>
        <th class="text-right" style="width: 12%;">PRICE (KES)</th>
        <th class="text-right" style="width: 13%;">AMOUNT (KES)</th>
      </tr>
    </thead>
    <tbody>
      ${document.items
        .map(
          (item: any, index: number) => `
      <tr>
        <td class="text-center">${index + 1}</td>
        <td>${item.product?.sku || ""}</td>
        <td>${item.description || item.product?.name || "Item"}</td>
        <td class="text-center">${Math.abs(item.quantity)}</td>
        <td class="text-right">${item.unitPrice.toFixed(2)}</td>
        <td class="text-right">${Math.abs(item.total).toFixed(2)}</td>
      </tr>
      `
        )
        .join("")}
    </tbody>
  </table>
  
  <!-- Totals -->
  <div class="clearfix">
    <div class="totals-section">
      <div class="totals-row">
        <span>SUB TOTAL</span>
        <span>${subtotal.toFixed(2)}</span>
      </div>
      <div class="totals-row">
        <span>DISCOUNT</span>
        <span>${discount.toFixed(2)}</span>
      </div>
      <div class="totals-row">
        <span>VAT</span>
        <span>${vat.toFixed(2)}</span>
      </div>
      <div class="totals-row grand-total">
        <span>GRAND TOTAL</span>
        <span>${grandTotal.toFixed(2)}</span>
      </div>
      ${(document.type === "INVOICE" || amountPaid > 0) ? `
      <div class="totals-row">
        <span>AMOUNT PAID (${paymentMethod})</span>
        <span>${amountPaid.toFixed(2)}</span>
      </div>
      <div class="totals-row">
        <span>BALANCE</span>
        <span>${balance.toFixed(2)}</span>
      </div>
      ` : ''}
    </div>
  </div>
  
  <!-- Amount in Words -->
  <div class="amount-words">
    (KES) ${totalInWords}
  </div>
  
  <!-- Bank Details (for quotations) -->
  ${
    (docTitle.includes("Quotation") || docTitle.includes("Quote")) && companyInfo.bankDetails
      ? `
  <div class="bank-details">
    <div class="bank-row">
      <strong>ACCOUNT NAME: ${companyInfo.bankDetails.accountName}</strong>
    </div>
    <div class="bank-row">
      ${companyInfo.bankDetails.bankName}, INDUSTRIAL AREA BRANCH: ${companyInfo.bankDetails.accountNumber}
    </div>
    <div class="bank-row">
      BANK CODE: ${companyInfo.bankDetails.bankCode}
    </div>
    <div class="bank-row">
      M-PESA PAYBILL NO: ${companyInfo.bankDetails.paybillNo || ""}
    </div>
    <div class="bank-row">
      ACC NUMBER: ${companyInfo.bankDetails.paybillAccount || ""}
    </div>
  </div>
  `
      : ""
  }
  
  <!-- Terms & Conditions -->
  <div class="terms-section">
    <h4>TERMS & CONDITIONS:</h4>
    <ol>
      <li>INVOICE & GOODS WILL BE PROCESSED AFTER PAYMENT HAS BEEN REFLECTED ON OUR BANK ACCOUNT.</li>
      <li>QUOTATION IS VALID FOR A PERIOD OF 3 DAYS FROM DATE INDICATED ON THE QUOTATION.</li>
    </ol>
  </div>
  
  <!-- Footer with Signatures -->
  <div class="footer">
    <div class="signature-box">
      <span class="label">PREPARED BY</span>
      <div class="detail">${document.createdBy?.name || "SYSTEM"}</div>
      <div class="detail">${formatDateTime(finalDate)}</div>
    </div>
    ${docTitle.includes("Invoice") ? `
    <div></div>
    <div class="signature-box">
      <span class="label">RECEIVED BY</span>
      <div class="detail">Name: __________________</div>
      <div class="detail">Contact: _______________</div>
      <div class="detail">Signature: ____________</div>
    </div>
    ` : ''}
  </div>
  
  <!-- Footer Message -->
  <div class="footer-message">
    ${docTitle.includes("Invoice") ? `
    <strong>GOODS ONCE SOLD ARE NON-REFUNDABLE AND NON-RETURNABLE</strong>
    <small>THANK YOU FOR SHOPPING WITH US</small>
    ` : `
    <strong>THANK YOU FOR SHOPPING WITH US</strong>
    `}
  </div>
</body>
</html>
    `;
  }
}
