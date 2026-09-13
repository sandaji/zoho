/**
 * Inventory API Service
 * Centralized API calls for inventory management
 */

import { API_BASE_URL } from "../api-config";

// Types
export interface BranchInventory {
  id: string;
  productId: string;
  branchId: string;
  quantity: number;
  reorder_level: number;
  reorder_quantity: number;
  reserved: number;
  available: number;
  status: "in_stock" | "low_stock" | "out_of_stock" | "discontinued";
  local_price?: number | null;
  bin_location?: string | null;
  last_counted?: string | null;
  branch?: {
    id: string;
    code: string;
    name: string;
  };
}

export interface Product {
  id: string;
  sku: string;
  upc: string | null;
  barcode: string | null;
  name: string;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  product_type: "physical" | "digital" | "service";
  cost_price: number;
  unit_price: number;
  tax_rate: number;
  unit_of_measurement: string;
  weight: number | null;
  weight_unit: string | null;
  length: number | null;
  width: number | null;
  height: number | null;
  dimension_unit: string | null;
  image_url: string | null;
  supplier_name: string | null;
  supplier_part_number: string | null;
  lead_time_days: number | null;
  status: "active" | "inactive" | "discontinued";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Branch inventory - contains branch-specific quantities
  branchInventory?: BranchInventory[];
}

export interface InventoryItem extends Product {
  currentStock: number;
  branch: string;
  warehouse?: string;
  inventoryStatus: "in_stock" | "low_stock" | "out_of_stock";
}

export interface InventoryStats {
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  categoriesCount: number;
  activeProducts: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  products: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// Short-lived response cache to prevent redundant parallel API calls
// ============================================================================
interface CachedResponse<T> {
  data: T;
  timestamp: number;
}

const responseCache = new Map<string, CachedResponse<unknown>>();
const CACHE_TTL_MS = 5000; // 5 seconds — enough to deduplicate concurrent calls

function getCached<T>(key: string): T | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    responseCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  responseCache.set(key, { data, timestamp: Date.now() });
}

/** Clear the response cache (call after mutations) */
export function invalidateInventoryCache(): void {
  responseCache.clear();
}

import { productClient } from "./product-client";
import { api } from "./client";

// ... types ...
// (Keeping existing types for compatibility)

/**
 * Compute stats from a list of products (pure function, no API call)
 */
function computeStatsFromProducts(products: Product[]): InventoryStats {
  return {
    totalItems: products.length,
    totalValue: products.reduce(
      (sum, p) => {
        const qty = p.branchInventory?.reduce((acc, b) => acc + (b.quantity || 0), 0) || 0;
        return sum + qty * p.cost_price;
      },
      0
    ),
    lowStockCount: products.filter((p) => {
      const qty = p.branchInventory?.reduce((acc, b) => acc + (b.quantity || 0), 0) || 0;
      const reorderLevel = p.branchInventory?.reduce((acc, b) => acc + (b.reorder_level || 0), 0) || 0;
      return qty <= reorderLevel;
    }).length,
    outOfStockCount: products.filter((p) => {
      const qty = p.branchInventory?.reduce((acc, b) => acc + (b.quantity || 0), 0) || 0;
      return qty === 0;
    }).length,
    categoriesCount: new Set(products.map((p) => p.category).filter(Boolean))
      .size,
    activeProducts: products.filter((p) => p.status === "active").length,
  };
}

/**
 * Extract unique categories from a list of products (pure function)
 */
function extractCategoriesFromProducts(products: Product[]): string[] {
  const categories = products
    .map((p) => p.category)
    .filter((c): c is string => Boolean(c));
  return [...new Set(categories)].sort();
}

/**
 * Get all products with optional filters
 */
export async function getProducts(params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
  branchId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}): Promise<ApiResponse<PaginatedResponse<Product>>> {
  return productClient.list(params);
}

/**
 * Get inventory with warehouse and branch data
 */
export async function getInventory(): Promise<
  ApiResponse<{ inventory: InventoryItem[] }>
> {
  // @ts-ignore - endpoint mapping
  return api.get<ApiResponse<{ inventory: InventoryItem[] }>>("/v1/inventory");
}

// ... computeStats and extractCategories ...

/**
 * Get inventory statistics
 */
export async function getInventoryStats(): Promise<
  ApiResponse<InventoryStats>
> {
  const response = await getProducts({ limit: 1000 });
  return {
    success: true,
    data: computeStatsFromProducts(response.data.products),
  };
}

/**
 * Batch-fetch products, stats, and categories in a SINGLE API call.
 */
export async function batchFetchInventoryData(): Promise<{
  stats: InventoryStats;
  categories: string[];
}> {
  const response = await getProducts({ limit: 1000 });
  const products = response.data.products;

  return {
    stats: computeStatsFromProducts(products),
    categories: extractCategoriesFromProducts(products),
  };
}

/**
 * Get product by ID
 */
export async function getProductById(
  id: string
): Promise<ApiResponse<Product>> {
  return productClient.getById(id);
}

/**
 * Create new product
 */
export async function createProduct(
  data: Partial<Product>
): Promise<ApiResponse<Product>> {
  return productClient.create(data);
}

/**
 * Update product
 */
export async function updateProduct(
  id: string,
  data: Partial<Product>
): Promise<ApiResponse<Product>> {
  return productClient.update(id, data);
}

/**
 * Delete product
 */
export async function deleteProduct(id: string): Promise<ApiResponse<void>> {
  return productClient.remove(id);
}

/**
 * Get unique categories from products
 */
export async function getCategories(): Promise<string[]> {
  const response = await getProducts({ limit: 1000 });
  return extractCategoriesFromProducts(response.data.products);
}

/**
 * Get branches (from admin API)
 */
export async function getBranches(): Promise<
  ApiResponse<{ branches: Array<{ id: string; name: string; code: string }> }>
> {
  // @ts-ignore - endpoint mapping
  return api.get<ApiResponse<{ branches: Array<{ id: string; name: string; code: string }> }>>("/v1/admin/branches");
}

/**
 * Export inventory data
 */
export function exportInventoryToCSV(items: Product[]) {
  const headers = [
    "SKU",
    "Name",
    "Category",
    "Quantity",
    "Cost Price",
    "Selling Price",
    "Status",
    "Reorder Level",
  ];

  const rows = items.map((item) => {
    const qty = item.branchInventory?.reduce((acc, b) => acc + (b.quantity || 0), 0) || 0;
    const reorderLevel = item.branchInventory?.reduce((acc, b) => acc + (b.reorder_level || 0), 0) || 0;

    return [
      item.sku,
      item.name,
      item.category || "",
      qty,
      item.cost_price,
      item.unit_price,
      item.status,
      reorderLevel,
    ];
  });

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `inventory_${new Date().toISOString().split("T")[0]}.csv`
  );
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
