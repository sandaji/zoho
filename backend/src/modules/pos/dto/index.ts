/**
 * POS Module - Data Transfer Objects
 * backend/src/modules/pos/dto/index.ts
 */

export interface CreateSalesDTO {
  branchId: string;
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
    unit_price: number;
    tax_rate?: number;
    discount?: number;
    discount_percent?: number;
  }>;
  payment_method: "cash" | "card" | "mpesa" | "cheque" | "bank_transfer";
  amount_paid?: number;
  discount?: number;
  discount_approved_by?: string; // Required for discounts > 10%
  tax?: number;
  notes?: string;
}

export interface UpdateSalesDTO {
  status?: string;
  discount?: number;
  tax?: number;
  notes?: string;
  payment_method?: "cash" | "card" | "mpesa" | "cheque" | "bank_transfer";
}

export interface SalesResponseDTO {
  id: string;
  invoice_no: string;
  status: string;
  payment_method: string;
  branchId: string;
  userId: string;
  subtotal: number;
  total_amount: number;
  discount: number;
  discount_approved_by?: string;
  tax: number;
  grand_total: number;
  amount_paid: number;
  change: number;
  branch?: {
    name: string;
    code: string;
    address?: string;
    phone?: string;
  };
  user?: {
    name: string;
    email: string;
  };
  sales_items: Array<{
    id: string;
    productId: string;
    product?: {
      id: string;
      name?: string;
      sku?: string;
    };
    quantity: number;
    unit_price: number;
    tax_rate: number;
    discount: number;
    discount_percent: number;
    subtotal: number;
    tax_amount: number;
    amount: number;
  }>;
  created_date: string;
  delivery_date?: string;
  notes?: string;
}

export interface SalesListQueryDTO {
  page?: number;
  limit?: number;
  status?: string;
  branchId?: string;
  startDate?: string;
  endDate?: string;
  payment_method?: string;
}

export interface DailySummaryDTO {
  branchId?: string;
  date?: string; // ISO date string
}

export interface DailySummaryResponseDTO {
  date: string;
  branchId: string;
  branchName: string;
  total_sales: number;
  total_transactions: number;
  total_revenue: number;
  total_tax: number;
  total_discount: number;
  payment_methods: {
    cash: number;
    card: number;
    mpesa: number;
    cheque: number;
    bank_transfer: number;
  };
  top_products: Array<{
    productId: string;
    productName: string;
    quantity_sold: number;
    revenue: number;
  }>;
}

export interface ReceiptDTO {
  sale: SalesResponseDTO;
  branch: {
    name: string;
    address?: string;
    phone?: string;
    code: string;
  };
  cashier: {
    name: string;
    email: string;
  };
  company: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    kra_pin?: string;
  };
}

export interface ProductSearchDTO {
  search: string; // SKU or barcode
  branchId?: string;
}

export interface ApproveDiscountDTO {
  salesId: string;
  managerId: string;
  managerPassword: string;
}
