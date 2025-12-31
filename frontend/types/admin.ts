/**
 * Admin Dashboard Types
 * Based on backend DTOs and Prisma schema
 */

// Branch
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

// Warehouse
export interface Warehouse {
  id: string;
  code: string;
  name: string;
  location: string;
  capacity: number;
  branchId: string;
  branch?: Branch;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  inventoryCount?: number;
  totalStock?: number;
}

// User
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: "cashier" | "warehouse_staff" | "driver" | "manager" | "admin";
  branchId?: string;
  branch?: Branch;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Product
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

// Sales
export interface Sales {
  id: string;
  invoice_no: string;
  status: "draft" | "pending" | "confirmed" | "shipped" | "delivered" | "cancelled" | "returned";
  payment_method: "cash" | "card" | "mpesa" | "cheque" | "bank_transfer";
  branchId: string;
  branch?: Branch;
  userId: string;
  user?: User;
  subtotal: number;
  total_amount: number;
  discount: number;
  discount_approved_by?: string;
  tax: number;
  grand_total: number;
  amount_paid: number;
  change: number;
  created_date: string;
  delivery_date?: string;
  notes?: string;
  items?: SalesItem[];
}

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

// Delivery
export interface Delivery {
  id: string;
  delivery_no: string;
  status: "pending" | "assigned" | "in_transit" | "delivered" | "failed" | "rescheduled";
  salesId: string;
  sales?: Sales;
  driverId: string;
  driver?: User;
  truckId: string;
  truck?: Truck;
  destination: string;
  estimated_km?: number;
  actual_km?: number;
  scheduled_date?: string;
  picked_up_at?: string;
  delivered_at?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Truck {
  id: string;
  registration: string;
  model: string;
  capacity: number;
  license_plate?: string;
  isActive: boolean;
}

// Finance Transaction
export interface FinanceTransaction {
  id: string;
  type: "income" | "expense" | "transfer" | "adjustment";
  reference_no: string;
  description: string;
  amount: number;
  salesId?: string;
  sales?: Sales;
  payrollId?: string;
  payroll?: Payroll;
  payment_method?: string;
  reference_doc?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Payroll
export interface Payroll {
  id: string;
  payroll_no: string;
  status: "draft" | "submitted" | "approved" | "paid" | "reversed";
  userId: string;
  user?: User;
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
}

// Daily Summary (from backend DTO)
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

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  pagination?: {
    total: number;
    page: number;
    limit: number;
  };
}

// Fiscal Period
export interface FiscalPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'open' | 'closed' | 'locked';
  isLocked: boolean;
  lockedAt?: string;
  lockedBy?: {
    id: string;
    name: string;
    email: string;
  };
}
