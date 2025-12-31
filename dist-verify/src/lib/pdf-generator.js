"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PDFGenerator = void 0;
class PDFGenerator {
    /**
     * Generate HTML for a Sales Quote
     * Based on Voltage Electricals design
     */
    static generateQuoteHTML(options) {
        const { document, companyInfo } = options;
        // Calculate totals
        const subtotal = document.subtotal || 0;
        const vat = document.tax || 0;
        const discount = document.discount || 0;
        const grandTotal = document.total || 0;
        // Format date
        const formatDate = (date) => {
            const d = new Date(date);
            return d.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            });
        };
        // Format time
        const formatDateTime = (date) => {
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
        // Convert number to words (simplified for KES)
        const numberToWords = (num) => {
            const ones = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE"];
            const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];
            const teens = ["TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
            if (num === 0)
                return "ZERO";
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
            }
            else if (num >= 10) {
                result += teens[num - 10] + " ";
                return result.trim() + " ONLY";
            }
            if (num > 0) {
                result += ones[num] + " ";
            }
            return result.trim() + " ONLY";
        };
        const totalInWords = numberToWords(grandTotal);
        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Sales Quotation - ${document.documentId}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      padding: 20px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
    }
    
    .header h1 {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .header .contact-info {
      font-size: 10px;
      margin: 2px 0;
    }
    
    .document-title {
      text-align: center;
      font-size: 14px;
      font-weight: bold;
      margin: 15px 0;
      text-decoration: underline;
    }
    
    .customer-section {
      display: flex;
      justify-content: space-between;
      margin: 15px 0;
      border: 1px solid #000;
      padding: 10px;
    }
    
    .customer-details {
      flex: 1;
    }
    
    .document-details {
      text-align: right;
      flex: 1;
    }
    
    .detail-row {
      margin: 3px 0;
    }
    
    .detail-label {
      font-weight: bold;
      display: inline-block;
      min-width: 120px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    
    table th {
      background-color: #f0f0f0;
      border: 1px solid #000;
      padding: 8px 5px;
      text-align: left;
      font-weight: bold;
      font-size: 10px;
    }
    
    table td {
      border: 1px solid #000;
      padding: 6px 5px;
      font-size: 10px;
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
      width: 300px;
    }
    
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 10px;
      border-bottom: 1px solid #ddd;
    }
    
    .totals-row.grand-total {
      border: 2px solid #000;
      font-weight: bold;
      font-size: 12px;
      background-color: #f0f0f0;
    }
    
    .amount-words {
      clear: both;
      margin: 20px 0;
      padding: 10px;
      border: 1px solid #000;
      background-color: #f9f9f9;
      font-weight: bold;
    }
    
    .bank-details {
      margin: 20px 0;
      padding: 10px;
      border: 1px solid #000;
      background-color: #f0f0f0;
    }
    
    .bank-details h3 {
      font-size: 12px;
      margin-bottom: 8px;
    }
    
    .bank-row {
      margin: 3px 0;
    }
    
    .terms-section {
      margin: 15px 0;
      padding: 10px;
      border: 1px solid #000;
    }
    
    .terms-section h3 {
      font-size: 12px;
      margin-bottom: 5px;
    }
    
    .terms-section ol {
      margin-left: 20px;
    }
    
    .terms-section li {
      margin: 5px 0;
    }
    
    .footer {
      margin-top: 30px;
      text-align: center;
      border-top: 2px solid #000;
      padding-top: 10px;
    }
    
    .prepared-by {
      margin: 15px 0;
      font-size: 10px;
    }
    
    .clearfix::after {
      content: "";
      display: table;
      clear: both;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <h1>${companyInfo.name}</h1>
    <div class="contact-info">${companyInfo.address}</div>
    <div class="contact-info">
      PHONE: ${companyInfo.phone.join(" | ")}
    </div>
    <div class="contact-info">EMAIL: ${companyInfo.email}</div>
    <div class="contact-info">PIN: ${companyInfo.pin}</div>
  </div>
  
  <!-- Document Title -->
  <div class="document-title">Sales Quotation</div>
  
  <!-- Customer and Document Details -->
  <div class="customer-section">
    <div class="customer-details">
      <div class="detail-row">
        <span class="detail-label">CUSTOMER :</span>
        ${document.customer?.name || "WALK-IN CUSTOMER"}
      </div>
      <div class="detail-row">
        <span class="detail-label">ADDRESS :</span>
        ${document.customer?.address || "N/A"}
      </div>
      <div class="detail-row">
        <span class="detail-label">CONTACT :</span>
        ${document.customer?.phone || "N/A"}
      </div>
      <div class="detail-row">
        <span class="detail-label">PIN :</span>
        ${document.customer?.taxId || "N/A"}
      </div>
    </div>
    
    <div class="document-details">
      <div class="detail-row">
        <span class="detail-label">QUOTATION # :</span>
        ${document.documentId}
      </div>
      <div class="detail-row">
        <span class="detail-label">DATE :</span>
        ${formatDate(document.issueDate)}
      </div>
      <div class="detail-row">
        <span class="detail-label">YOUR REF. # :</span>
        ${document.referenceNo || "N/A"}
      </div>
    </div>
  </div>
  
  <!-- Items Table -->
  <table>
    <thead>
      <tr>
        <th class="text-center" style="width: 40px;">S. NO</th>
        <th style="width: 100px;">CODE</th>
        <th>DESCRIPTION</th>
        <th class="text-center" style="width: 80px;">QUANTITY</th>
        <th class="text-right" style="width: 100px;">PRICE<br/>(KES)</th>
        <th class="text-right" style="width: 120px;">AMOUNT<br/>(KES)</th>
      </tr>
    </thead>
    <tbody>
      ${document.items
            .map((item, index) => `
      <tr>
        <td class="text-center">${index + 1}</td>
        <td>${item.product?.sku || "N/A"}</td>
        <td>${item.description || item.product?.name || "Item"}</td>
        <td class="text-center">${item.quantity}</td>
        <td class="text-right">${item.unitPrice.toFixed(2)}</td>
        <td class="text-right">${item.total.toFixed(2)}</td>
      </tr>
      `)
            .join("")}
    </tbody>
  </table>
  
  <!-- Totals -->
  <div class="clearfix">
    <div class="totals-section">
      <div class="totals-row">
        <span>SUB TOTAL</span>
        <span>(KES) ${subtotal.toFixed(2)}</span>
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
        <span>(KES) ${grandTotal.toFixed(2)}</span>
      </div>
    </div>
  </div>
  
  <!-- Amount in Words -->
  <div class="amount-words">
    ${totalInWords}
  </div>
  
  <!-- Bank Details -->
  ${companyInfo.bankDetails
            ? `
  <div class="bank-details">
    <div class="bank-row">
      <strong>${companyInfo.bankDetails.bankName}</strong>
    </div>
    <div class="bank-row">
      ACCOUNT NAME: ${companyInfo.bankDetails.accountName}
    </div>
    <div class="bank-row">
      ACCOUNT NUMBER: ${companyInfo.bankDetails.accountNumber}
    </div>
    <div class="bank-row">
      BANK CODE: ${companyInfo.bankDetails.bankCode} | BRANCH CODE: ${companyInfo.bankDetails.branchCode}
    </div>
    ${companyInfo.bankDetails.paybillNo
                ? `
    <div class="bank-row">
      M-PESA PAYBILL NO: ${companyInfo.bankDetails.paybillNo}
    </div>
    <div class="bank-row">
      ACC NUMBER: ${companyInfo.bankDetails.paybillAccount}
    </div>
    `
                : ""}
  </div>
  `
            : ""}
  
  <!-- Terms & Conditions -->
  <div class="terms-section">
    <h3>TERMS & CONDITIONS:</h3>
    <ol>
      <li>INVOICE & GOODS WILL BE PROCESSED AFTER PAYMENT HAS BEEN REFLECTED ON OUR BANK ACCOUNT.</li>
      <li>QUOTATION IS VALID FOR A PERIOD OF 3 DAYS FROM DATE INDICATED ON THE QUOTATION.</li>
    </ol>
  </div>
  
  <!-- Prepared By -->
  <div class="prepared-by">
    <strong>PREPARED BY</strong><br/>
    ${document.createdBy?.name || "SYSTEM"}<br/>
    ${formatDateTime(document.createdAt)}
  </div>
  
  <!-- Footer -->
  <div class="footer">
    <strong>THANK YOU FOR SHOPPING WITH US</strong><br/>
    <small>GOODS ONCE SOLD ARE NON-REFUNDABLE AND NON-RETURNABLE</small>
  </div>
</body>
</html>
    `;
    }
    /**
     * Generate HTML for an Invoice
     * Similar to quote but with payment information
     */
    static generateInvoiceHTML(options) {
        const { document, companyInfo } = options;
        const subtotal = document.subtotal || 0;
        const vat = document.tax || 0;
        const discount = document.discount || 0;
        const grandTotal = document.total || 0;
        const amountPaid = document.paidAmount || 0;
        const balance = document.balance || 0;
        const formatDate = (date) => {
            const d = new Date(date);
            return d.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            });
        };
        const formatDateTime = (date) => {
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
        const numberToWords = (num) => {
            const ones = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE"];
            const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];
            const teens = ["TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
            if (num === 0)
                return "ZERO";
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
            }
            else if (num >= 10) {
                result += teens[num - 10] + " ";
                return result.trim() + " ONLY";
            }
            if (num > 0) {
                result += ones[num] + " ";
            }
            return result.trim() + " ONLY";
        };
        const totalInWords = numberToWords(grandTotal);
        const paymentMethod = document.payments?.[0]?.method || "CASH";
        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${document.documentId}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      padding: 20px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
    }
    
    .header h1 {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .header .contact-info {
      font-size: 10px;
      margin: 2px 0;
    }
    
    .document-title {
      text-align: center;
      font-size: 14px;
      font-weight: bold;
      margin: 15px 0;
      text-decoration: underline;
    }
    
    .customer-section {
      display: flex;
      justify-content: space-between;
      margin: 15px 0;
      border: 1px solid #000;
      padding: 10px;
    }
    
    .customer-details {
      flex: 1;
    }
    
    .document-details {
      text-align: right;
      flex: 1;
    }
    
    .detail-row {
      margin: 3px 0;
    }
    
    .detail-label {
      font-weight: bold;
      display: inline-block;
      min-width: 120px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    
    table th {
      background-color: #f0f0f0;
      border: 1px solid #000;
      padding: 8px 5px;
      text-align: left;
      font-weight: bold;
      font-size: 10px;
    }
    
    table td {
      border: 1px solid #000;
      padding: 6px 5px;
      font-size: 10px;
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
      width: 300px;
    }
    
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 10px;
      border-bottom: 1px solid #ddd;
    }
    
    .totals-row.grand-total {
      border: 2px solid #000;
      font-weight: bold;
      font-size: 12px;
      background-color: #f0f0f0;
    }
    
    .totals-row.paid {
      background-color: #d4edda;
      font-weight: bold;
    }
    
    .totals-row.balance {
      background-color: #f8d7da;
      font-weight: bold;
    }
    
    .amount-words {
      clear: both;
      margin: 20px 0;
      padding: 10px;
      border: 1px solid #000;
      background-color: #f9f9f9;
      font-weight: bold;
    }
    
    .payment-info {
      margin: 20px 0;
      padding: 10px;
      border: 1px solid #000;
      background-color: #d4edda;
    }
    
    .payment-info h3 {
      font-size: 12px;
      margin-bottom: 5px;
    }
    
    .footer {
      margin-top: 30px;
      text-align: center;
      border-top: 2px solid #000;
      padding-top: 10px;
    }
    
    .prepared-by {
      margin: 15px 0;
      font-size: 10px;
    }
    
    .clearfix::after {
      content: "";
      display: table;
      clear: both;
    }
    
    .paid-stamp {
      position: absolute;
      top: 200px;
      right: 50px;
      transform: rotate(-15deg);
      border: 5px solid #28a745;
      color: #28a745;
      font-size: 48px;
      font-weight: bold;
      padding: 10px 20px;
      opacity: 0.3;
    }
  </style>
</head>
<body>
  ${balance === 0 ? '<div class="paid-stamp">PAID</div>' : ""}
  
  <!-- Header -->
  <div class="header">
    <h1>${companyInfo.name}</h1>
    <div class="contact-info">${companyInfo.address}</div>
    <div class="contact-info">
      PHONE: ${companyInfo.phone.join(" | ")}
    </div>
    <div class="contact-info">EMAIL: ${companyInfo.email}</div>
    <div class="contact-info">PIN: ${companyInfo.pin}</div>
  </div>
  
  <!-- Document Title -->
  <div class="document-title">INVOICE</div>
  
  <!-- Customer and Document Details -->
  <div class="customer-section">
    <div class="customer-details">
      <div class="detail-row">
        <span class="detail-label">CUSTOMER :</span>
        ${document.customer?.name || "WALK-IN CUSTOMER"}
      </div>
      <div class="detail-row">
        <span class="detail-label">ADDRESS :</span>
        ${document.customer?.address || "N/A"}
      </div>
      <div class="detail-row">
        <span class="detail-label">CONTACT :</span>
        ${document.customer?.phone || "N/A"}
      </div>
      <div class="detail-row">
        <span class="detail-label">PIN :</span>
        ${document.customer?.taxId || "N/A"}
      </div>
    </div>
    
    <div class="document-details">
      <div class="detail-row">
        <span class="detail-label">INVOICE # :</span>
        ${document.documentId}
      </div>
      <div class="detail-row">
        <span class="detail-label">DATE :</span>
        ${formatDate(document.issueDate)}
      </div>
      <div class="detail-row">
        <span class="detail-label">DUE DATE :</span>
        ${document.dueDate ? formatDate(document.dueDate) : "N/A"}
      </div>
    </div>
  </div>
  
  <!-- Items Table -->
  <table>
    <thead>
      <tr>
        <th class="text-center" style="width: 40px;">S. NO</th>
        <th style="width: 100px;">CODE</th>
        <th>DESCRIPTION</th>
        <th class="text-center" style="width: 80px;">QUANTITY</th>
        <th class="text-right" style="width: 100px;">PRICE<br/>(KES)</th>
        <th class="text-right" style="width: 120px;">AMOUNT<br/>(KES)</th>
      </tr>
    </thead>
    <tbody>
      ${document.items
            .map((item, index) => `
      <tr>
        <td class="text-center">${index + 1}</td>
        <td>${item.product?.sku || "N/A"}</td>
        <td>${item.description || item.product?.name || "Item"}</td>
        <td class="text-center">${item.quantity}</td>
        <td class="text-right">${item.unitPrice.toFixed(2)}</td>
        <td class="text-right">${item.total.toFixed(2)}</td>
      </tr>
      `)
            .join("")}
    </tbody>
  </table>
  
  <!-- Totals -->
  <div class="clearfix">
    <div class="totals-section">
      <div class="totals-row">
        <span>SUB TOTAL</span>
        <span>(KES) ${subtotal.toFixed(2)}</span>
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
        <span>(KES) ${grandTotal.toFixed(2)}</span>
      </div>
      <div class="totals-row paid">
        <span>AMOUNT PAID (${paymentMethod})</span>
        <span>(KES) ${amountPaid.toFixed(2)}</span>
      </div>
      <div class="totals-row balance">
        <span>BALANCE DUE</span>
        <span>(KES) ${balance.toFixed(2)}</span>
      </div>
    </div>
  </div>
  
  <!-- Amount in Words -->
  <div class="amount-words">
    ${totalInWords}
  </div>
  
  <!-- Payment Info -->
  ${balance === 0
            ? `
  <div class="payment-info">
    <h3>PAYMENT RECEIVED</h3>
    <div>Payment Method: ${paymentMethod}</div>
    <div>Amount Paid: KES ${amountPaid.toFixed(2)}</div>
    <div>Date: ${formatDate(document.payments?.[0]?.paymentDate || document.issueDate)}</div>
  </div>
  `
            : ""}
  
  <!-- Prepared By -->
  <div class="prepared-by">
    <strong>ISSUED BY</strong><br/>
    ${document.createdBy?.name || "SYSTEM"}<br/>
    ${formatDateTime(document.createdAt)}
  </div>
  
  <!-- Footer -->
  <div class="footer">
    <strong>THANK YOU FOR YOUR BUSINESS</strong><br/>
    <small>GOODS ONCE SOLD ARE NON-REFUNDABLE AND NON-RETURNABLE</small>
  </div>
</body>
</html>
    `;
    }
}
exports.PDFGenerator = PDFGenerator;
