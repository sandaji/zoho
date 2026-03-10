/**
 * API Configuration
 * Centralized API endpoints and base URL
 */

import { frontendEnv } from "./env";

// Backend API base URL
export const API_BASE_URL = frontendEnv.NEXT_PUBLIC_API_URL;

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: "/v1/auth/login",
  AUTH_REGISTER: "/v1/auth/register",
  AUTH_ME: "/v1/auth/me",

  // POS
  POS_PRODUCTS_SEARCH: "/v1/pos/products/search",
  POS_SALES: "/v1/pos/sales",
  POS_SALES_BY_ID: (id: string) => `/v1/pos/sales/${id}`,
  POS_RECEIPT: (id: string) => `/v1/pos/sales/${id}/receipt`,
  POS_DAILY_SUMMARY: "/v1/pos/daily-summary",
  POS_DISCOUNT_APPROVE: "/v1/pos/discount/approve",

  // Sales Documents
  SALES_DOCUMENTS: "/v1/sales-documents/documents",
  SALES_DOCUMENT_BY_ID: (id: string) => `/v1/sales-documents/documents/${id}`,
  SALES_DOCUMENT_CONVERT: (id: string) => `/v1/sales-documents/documents/${id}/convert`,
  SALES_DOCUMENT_VOID: (id: string) => `/v1/sales-documents/documents/${id}/void`,
  SALES_DOCUMENT_PAYMENT: (id: string) => `/v1/sales-documents/documents/${id}/payments`,
  SALES_DOCUMENT_CREDIT_NOTE: (invoiceId: string) => `/v1/sales-documents/invoices/${invoiceId}/credit-notes`,

  // Customers
  CUSTOMERS: "/v1/customers",
  CUSTOMER_BY_ID: (id: string) => `/v1/customers/${id}`,
  CUSTOMERS_SEARCH: "/v1/customers/search",

  // Branches
  BRANCHES: "/v1/branches",
  BRANCH_BY_ID: (id: string) => `/v1/branches/${id}`,
  BRANCH_DASHBOARD: (id: string) => `/v1/branches/${id}/dashboard`,

  // Users
  USERS: "/v1/users",
  USER_BY_ID: (id: string) => `/v1/users/${id}`,

  // Products
  PRODUCTS: "/v1/products",
  PRODUCT_BY_ID: (id: string) => `/v1/products/${id}`,

  // Inventory
  INVENTORY: "/v1/inventory",
  INVENTORY_BY_ID: (id: string) => `/v1/inventory/${id}`,

  // Warehouses
  WAREHOUSES: "/v1/warehouses",
  WAREHOUSE_BY_ID: (id: string) => `/v1/warehouses/${id}`,

  // Sales
  SALES: "/v1/sales",
  SALE_BY_ID: (id: string) => `/v1/sales/${id}`,

  // Deliveries
  DELIVERIES: "/v1/deliveries",
  DELIVERY_BY_ID: (id: string) => `/v1/deliveries/${id}`,

  // Finance
  FINANCE_TRANSACTIONS: "/v1/finance/transactions",
  FINANCE_TRANSACTION_BY_ID: (id: string) => `/v1/finance/transactions/${id}`,

  // Financial Reports
  FINANCE_BALANCE_SHEET: "/v1/finance/reports/balance-sheet",
  FINANCE_PROFIT_LOSS: "/v1/finance/reports/profit-loss",
  FINANCE_CASH_FLOW: "/v1/finance/reports/cash-flow",

  // Bank Reconciliation
  BANK_ACCOUNTS: "/v1/finance/bank/accounts",
  BANK_UPLOAD: "/v1/finance/bank/upload",
  BANK_RECONCILIATION_DATA: (accountId: string) => `/v1/finance/bank/reconciliation/${accountId}`,
  BANK_RECONCILE_ITEM: (id: string) => `/v1/finance/bank/reconcile/${id}`,

  // HR & Leave Management
  LEAVE_TYPES: "/v1/hr/leaves/types",
  LEAVE_BALANCE: "/v1/hr/leaves/my-balance",
  LEAVE_REQUEST: "/v1/hr/leaves/request",
  LEAVE_MY_REQUESTS: "/v1/hr/leaves/my-requests",
  LEAVE_PENDING: "/v1/hr/leaves/pending",
  LEAVE_UPDATE_STATUS: (id: string) => `/v1/hr/leaves/requests/${id}/status`,

  // Warehouse / Inventory
  STOCK_MOVEMENTS: "/v1/warehouse/movements",

  // Payroll
  PAYROLL: "/v1/payroll",
  PAYROLL_BY_ID: (id: string) => `/v1/payroll/${id}`,

  // Trucks
  TRUCKS: "/v1/trucks",
  TRUCK_BY_ID: (id: string) => `/v1/trucks/${id}`,
};

/**
 * Build full API URL
 */
export function getApiUrl(endpoint: string): string {
  return `${API_BASE_URL}${endpoint}`;
}

/**
 * Get auth headers with token
 */
export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}
