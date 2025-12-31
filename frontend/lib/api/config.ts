/**
 * API Configuration
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/";

export const API_ENDPOINTS = {
  // Auth
  LOGIN: "/auth/login",
  REGISTER: "/auth/register",
  ME: "/auth/me",

  // Products
  PRODUCTS: "/products",
  PRODUCT_BY_ID: (id: string) => `/products/${id}`,

  // Inventory
  INVENTORY: "/inventory",

  // Branches
  BRANCHES: "/admin/branches",

  // Warehouses
  WAREHOUSES: "/admin/warehouses",

  // POS
  POS_SALES: "/pos/sales",
  POS_DAILY_SUMMARY: "/pos/daily-summary",
} as const;
