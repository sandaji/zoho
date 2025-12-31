/**
 * ETR/eTIMS Integration Adapter
 * Prepares sales data for Kenya Revenue Authority's electronic Tax Invoice Management System
 * 
 * Note: This is an adapter template. Actual implementation requires:
 * - ETR device registration and configuration
 * - KRA eTIMS API credentials
 * - Fiscal device serial numbers
 * - Certificate-based authentication
 */

export interface eTIMSConfiguration {
  deviceSerialNumber: string;
  cuSerialNumber: string; // Control Unit serial number
  taxpayerPin: string;
  certificatePath?: string;
  apiEndpoint?: string;
  environment: "production" | "sandbox";
}

export interface eTIMSInvoiceRequest {
  invoiceType: "S" | "N"; // S = Sale, N = Normal
  originalInvoiceNumber?: string; // For credit notes
  salesDate: string; // YYYY-MM-DD
  salesTime: string; // HH:mm:ss
  stockReleaseDate?: string;
  currency: string; // KES
  exchangeRate?: number;
  
  // Seller information
  seller: {
    taxpayerPin: string;
    taxpayerName: string;
    businessName: string;
    address: string;
    telephone: string;
    email?: string;
  };
  
  // Buyer information (optional for B2C)
  buyer?: {
    taxpayerPin?: string;
    taxpayerName?: string;
    address?: string;
    telephone?: string;
    email?: string;
  };
  
  // Invoice items
  items: Array<{
    itemSequence: number;
    itemCode: string;
    itemClassCode: string; // Refer to KRA classification
    itemName: string;
    barcode?: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    taxTypeCode: string; // "A" for VAT
    taxRate: number; // 16 for 16%
    taxAmount: number;
    discount?: number;
    discountTaxable?: number;
  }>;
  
  // Totals
  totals: {
    totalTaxable: number;
    totalTax: number;
    totalAmount: number;
    discount?: number;
  };
  
  // Payment information
  payment: {
    paymentMethod: string; // "01" Cash, "02" Card, "03" Mobile, etc.
    amount: number;
  };
  
  // Receipt information
  receipt: {
    counter: number; // Sequential receipt number
    internalData?: string; // Optional internal reference
  };
}

export interface eTIMSInvoiceResponse {
  resultCode: string; // "000" for success
  resultMessage: string;
  resultDate: string; // YYYY-MM-DD HH:mm:ss
  
  // Success response
  data?: {
    invoiceNumber: string;
    internalData: string;
    rcptNo: number; // Receipt counter
    rcptSign: string; // Digital signature
    qrCode: string; // QR code URL
    sdcDate: string; // Sales Data Controller date
  };
  
  // Error response
  error?: {
    code: string;
    message: string;
    field?: string;
  };
}

export class eTIMSAdapter {
  private config: eTIMSConfiguration;
  
  constructor(config: eTIMSConfiguration) {
    this.config = config;
  }
  
  /**
   * Convert POS sale to eTIMS invoice request
   */
  convertSaleToInvoice(sale: any, _branch: any, company: any): eTIMSInvoiceRequest {
    const saleDate = new Date(sale.created_date);
    
    return {
      invoiceType: "S",
      salesDate: saleDate.toISOString().split("T")[0] ?? "",
      salesTime: saleDate.toTimeString().split(" ")[0] ?? "",
      currency: "KES",
      
      seller: {
        taxpayerPin: company.kra_pin || this.config.taxpayerPin,
        taxpayerName: company.name,
        businessName: company.name,
        address: company.address,
        telephone: company.phone,
        email: company.email,
      },
      
      items: sale.items.map((item: any, index: number) => ({
        itemSequence: index + 1,
        itemCode: item.productSku,
        itemClassCode: this.getItemClassCode(item.product?.category),
        itemName: item.productName,
        barcode: item.product?.barcode,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalAmount: item.amount,
        taxTypeCode: "A", // VAT
        taxRate: item.tax_rate * 100, // Convert 0.16 to 16
        taxAmount: item.tax_amount,
        discount: item.discount > 0 ? item.discount : undefined,
        discountTaxable: item.discount > 0 ? item.discount : undefined,
      })),
      
      totals: {
        totalTaxable: sale.subtotal - sale.discount,
        totalTax: sale.tax,
        totalAmount: sale.grand_total,
        discount: sale.discount > 0 ? sale.discount : undefined,
      },
      
      payment: {
        paymentMethod: this.mapPaymentMethod(sale.payment_method),
        amount: sale.amount_paid,
      },
      
      receipt: {
        counter: parseInt(sale.invoice_no.split("-").pop() || "0"),
        internalData: sale.invoice_no,
      },
    };
  }
  
  /**
   * Submit invoice to eTIMS
   * Note: This is a placeholder - actual implementation requires KRA API integration
   */
  async submitInvoice(
    invoice: eTIMSInvoiceRequest
  ): Promise<eTIMSInvoiceResponse> {
    // In production, this would:
    // 1. Sign the request with certificate
    // 2. Send to KRA eTIMS endpoint
    // 3. Handle response and retries
    
    console.log("eTIMS Invoice Request:", JSON.stringify(invoice, null, 2));
    
    // Mock successful response
    return {
      resultCode: "000",
      resultMessage: "Success",
      resultDate: new Date().toISOString().replace("T", " ").split(".")[0] ?? "",
      data: {
        invoiceNumber: invoice.receipt.internalData!,
        internalData: invoice.receipt.internalData!,
        rcptNo: invoice.receipt.counter,
        rcptSign: this.generateMockSignature(invoice),
        qrCode: `https://etims.kra.go.ke/verify?rcpt=${invoice.receipt.internalData}`,
        sdcDate: new Date().toISOString().replace("T", " ").split(".")[0] ?? "",
      },
    };
  }
  
  /**
   * Map item category to KRA classification code
   * Refer to: https://www.kra.go.ke/en/business/vat/item-classification
   */
  private getItemClassCode(category?: string): string {
    const mapping: Record<string, string> = {
      "Computers": "84715000", // Computers and peripherals
      "Peripherals": "84715000",
      "Electronics": "85176200", // Electronic equipment
      "Furniture": "94036000", // Office furniture
      "Stationery": "48201000", // Stationery items
      "Food": "19059000", // Food items
      "Beverages": "22029000", // Beverages
    };
    
    return mapping[category || ""] || "00000000"; // Default classification
  }
  
  /**
   * Map payment method to eTIMS codes
   * Reference: KRA eTIMS Payment Method Codes
   */
  private mapPaymentMethod(method: string): string {
    const mapping: Record<string, string> = {
      cash: "01", // Cash
      card: "02", // Card
      mpesa: "03", // Mobile Money
      cheque: "04", // Cheque
      bank_transfer: "05", // Bank Transfer
    };
    
    return mapping[method] || "01";
  }
  
  /**
   * Generate mock digital signature
   * In production, this uses the ETR device's cryptographic module
   */
  private generateMockSignature(invoice: eTIMSInvoiceRequest): string {
    const data = `${invoice.receipt.internalData}-${invoice.totals.totalAmount}-${invoice.salesDate}`;
    // In production: Use actual cryptographic signing with device certificate
    return Buffer.from(data).toString("base64").substring(0, 32);
  }
  
  /**
   * Validate eTIMS configuration
   */
  validateConfiguration(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!this.config.deviceSerialNumber) {
      errors.push("Device serial number is required");
    }
    
    if (!this.config.cuSerialNumber) {
      errors.push("Control Unit serial number is required");
    }
    
    if (!this.config.taxpayerPin || !/^[AP]\d{9}[A-Z]$/.test(this.config.taxpayerPin)) {
      errors.push("Valid taxpayer PIN is required (e.g., P051472913Q)");
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  /**
   * Get eTIMS receipt data for printing
   */
  getReceiptData(response: eTIMSInvoiceResponse, _sale: any) {
    if (!response.data) {
      throw new Error("Invalid eTIMS response");
    }
    
    return {
      fiscalCode: response.data.invoiceNumber,
      receiptCounter: response.data.rcptNo,
      signature: response.data.rcptSign,
      qrCode: response.data.qrCode,
      deviceSerial: this.config.deviceSerialNumber,
      cuSerial: this.config.cuSerialNumber,
      sdcDate: response.data.sdcDate,
    };
  }
}

/**
 * Example usage:
 * 
 * const config: eTIMSConfiguration = {
 *   deviceSerialNumber: "ETR-2024-001",
 *   cuSerialNumber: "CU-001-2024",
 *   taxpayerPin: "P051472913Q",
 *   environment: "sandbox"
 * };
 * 
 * const adapter = new eTIMSAdapter(config);
 * 
 * // Validate configuration
 * const validation = adapter.validateConfiguration();
 * if (!validation.valid) {
 *   console.error("Configuration errors:", validation.errors);
 * }
 * 
 * // Convert and submit sale
 * const invoice = adapter.convertSaleToInvoice(sale, branch, company);
 * const response = await adapter.submitInvoice(invoice);
 * 
 * // Get receipt data
 * const receiptData = adapter.getReceiptData(response, sale);
 * console.log("Print this on receipt:", receiptData);
 */
