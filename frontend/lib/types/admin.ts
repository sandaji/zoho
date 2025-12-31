/**
 * Admin Dashboard Type Definitions
 * Maps to backend DTOs from backend/src/modules/pos/dto/index.ts
 */

// Branch Types
export interface Branch {
  id: string;
  code: string;
  name: string;
  city: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Warehouse Types
export interface Warehouse {
  id: string;
  code: string;
  name: string;
  location: string;
  capacity: number;
  branchId: string;
  branch?: {
    name: string;
    code: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    inventory: number;
  };
}

// User Types
export type UserRole = "cashier" | "warehouse_staff" | "driver" | "manager" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  branchId?: string;
  branch?: {
    name: string;
    code: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Product Types
export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  category?: string;
  unit_price: number;
  cost_price: number;
  tax_rate: number;
  quantity: number;
  reorder_level: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Sales Types
export type SalesStatus = "draft" | "pending" | "confirmed" | "shipped" | "delivered" | "cancelled" | "returned";
export type PaymentMethod = "cash" | "card" | "mpesa" | "cheque" | "bank_transfer";

export interface SalesItem {
  id: string;
  productId: string;
  productName?: string;
  productSku?: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount: number;
  discount_percent: number;
  subtotal: number;
  tax_amount: number;
  amount: number;
}

export interface Sales {
  id: string;
  invoice_no: string;
  status: SalesStatus;
  payment_method: PaymentMethod;
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
  items: SalesItem[];
  created_date: string;
  delivery_date?: string;
  notes?: string;
  branch?: {
    name: string;
    code: string;
  };
  user?: {
    name: string;
    email: string;
  };
}

// Delivery Types
export type DeliveryStatus = "pending" | "assigned" | "in_transit" | "delivered" | "failed" | "rescheduled";

export interface Delivery {
  id: string;
  delivery_no: string;
  status: DeliveryStatus;
  salesId: string;
  driverId: string;
  truckId: string;
  destination: string;
  estimated_km?: number;
  actual_km?: number;
  scheduled_date?: string;
  picked_up_at?: string;
  delivered_at?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  driver?: {
    name: string;
    email: string;
  };
  truck?: {
    registration: string;
    model: string;
  };
  sales?: {
    invoice_no: string;
    grand_total: number;
  };
}

// Truck Types
export interface Truck {
  id: string;
  registration: string;
  model: string;
  capacity: number;
  license_plate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Finance Types
export type TransactionType = "income" | "expense" | "transfer" | "adjustment";

export interface FinanceTransaction {
  id: string;
  type: TransactionType;
  reference_no: string;
  description: string;
  amount: number;
  salesId?: string;
  payrollId?: string;
  payment_method?: string;
  reference_doc?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Payroll Types
export type PayrollStatus = "draft" | "submitted" | "approved" | "paid" | "reversed";

export interface Payroll {
  id: string;
  payroll_no: string;
  status: PayrollStatus;
  userId: string;
  base_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  period_start: string;
  period_end: string;
  paid_date?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    name: string;
    email: string;
  };
}

// Daily Summary Types (from POS service)
export interface DailySummary {
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

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}
