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

/**
 * Get authentication token from localStorage
 */
const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
};

/**
 * Make authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();

  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: Object.assign({}, defaultHeaders, options.headers),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: "An error occurred",
    }));
    throw new Error(error.error?.message || error.message || `HTTP ${response.status}`);
  }

  return response.json();
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
  const queryParams = new URLSearchParams();

  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.limit) queryParams.append("limit", params.limit.toString());
  if (params?.search) queryParams.append("search", params.search);
  if (params?.category && params.category !== "all")
    queryParams.append("category", params.category);
  if (params?.status && params.status !== "all")
    queryParams.append("status", params.status);
  if (params?.branchId) queryParams.append("branchId", params.branchId);
  if (params?.sortBy) queryParams.append("sortBy", params.sortBy);
  if (params?.sortOrder) queryParams.append("sortOrder", params.sortOrder);

  const queryString = queryParams.toString();
  const endpoint = `/v1/products${queryString ? `?${queryString}` : ""}`;
  const cacheKey = `products:${queryString}`;

  // Return cached response if available (prevents redundant parallel calls)
  const cached = getCached<ApiResponse<PaginatedResponse<Product>>>(cacheKey);
  if (cached) return cached;

  const result = await apiRequest<ApiResponse<PaginatedResponse<Product>>>(endpoint);
  setCache(cacheKey, result);
  return result;
}

/**
 * Get inventory with warehouse and branch data
 */
export async function getInventory(): Promise<
  ApiResponse<{ inventory: InventoryItem[] }>
> {
  return apiRequest<ApiResponse<{ inventory: InventoryItem[] }>>("/v1/inventory");
}

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
 * This replaces the 3 parallel calls that were hammering the rate limiter.
 */
export async function batchFetchInventoryData(): Promise<{
  stats: InventoryStats;
  categories: string[];
}> {
  // One API call instead of three
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
  return apiRequest<ApiResponse<Product>>(`/v1/products/${id}`);
}

/**
 * Create new product
 */
export async function createProduct(
  data: Partial<Product>
): Promise<ApiResponse<Product>> {
  return apiRequest<ApiResponse<Product>>("/v1/products", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Update product
 */
export async function updateProduct(
  id: string,
  data: Partial<Product>
): Promise<ApiResponse<Product>> {
  return apiRequest<ApiResponse<Product>>(`/v1/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Delete product
 */
export async function deleteProduct(id: string): Promise<ApiResponse<void>> {
  return apiRequest<ApiResponse<void>>(`/v1/products/${id}`, {
    method: "DELETE",
  });
}

/**
 * Get unique categories from products
 */
export async function getCategories(): Promise<string[]> {
  const response = await getProducts({ limit: 1000 });
  return extractCategoriesFromProducts(response.data.products);
}

/**
 * Get branches (from branches API)
 */
export async function getBranches(): Promise<
  ApiResponse<{ branches: Array<{ id: string; name: string; code: string }> }>
> {
  return apiRequest<
    ApiResponse<{ branches: Array<{ id: string; name: string; code: string }> }>
  >("/v1/admin/branches");
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
