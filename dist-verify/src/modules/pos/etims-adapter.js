"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.eTIMSAdapter = void 0;
class eTIMSAdapter {
    constructor(config) {
        this.config = config;
    }
    /**
     * Convert POS sale to eTIMS invoice request
     */
    convertSaleToInvoice(sale, _branch, company) {
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
            items: sale.items.map((item, index) => ({
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
    async submitInvoice(invoice) {
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
                invoiceNumber: invoice.receipt.internalData,
                internalData: invoice.receipt.internalData,
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
    getItemClassCode(category) {
        const mapping = {
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
    mapPaymentMethod(method) {
        const mapping = {
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
    generateMockSignature(invoice) {
        const data = `${invoice.receipt.internalData}-${invoice.totals.totalAmount}-${invoice.salesDate}`;
        // In production: Use actual cryptographic signing with device certificate
        return Buffer.from(data).toString("base64").substring(0, 32);
    }
    /**
     * Validate eTIMS configuration
     */
    validateConfiguration() {
        const errors = [];
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
    getReceiptData(response, _sale) {
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
exports.eTIMSAdapter = eTIMSAdapter;
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
