import { BaseApiClient, ApiResponse } from "./client";
import { API_ENDPOINTS } from "../api-config";
import { Product, PaginatedResponse } from "./inventory.api";

/**
 * Product-specific API operations
 */
export class ProductClient extends BaseApiClient {
  /**
   * List products with pagination and filtering
   */
  public async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
    branchId?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }): Promise<ApiResponse<PaginatedResponse<Product>>> {
    return this.get<ApiResponse<PaginatedResponse<Product>>>(
      API_ENDPOINTS.PRODUCTS, 
      params
    );
  }

  /**
   * Retrieve a single product by ID
   */
  public async getById(id: string): Promise<ApiResponse<Product>> {
    return this.get<ApiResponse<Product>>(API_ENDPOINTS.PRODUCT_BY_ID(id));
  }

  /**
   * Create a new product
   */
  public async create(data: Partial<Product>): Promise<ApiResponse<Product>> {
    return this.post<ApiResponse<Product>>(API_ENDPOINTS.PRODUCTS, data);
  }

  /**
   * Update an existing product
   */
  public async update(id: string, data: Partial<Product>): Promise<ApiResponse<Product>> {
    return this.put<ApiResponse<Product>>(API_ENDPOINTS.PRODUCT_BY_ID(id), data);
  }

  /**
   * Delete a product
   */
  public async remove(id: string): Promise<ApiResponse<void>> {
    return this.delete<ApiResponse<void>>(API_ENDPOINTS.PRODUCT_BY_ID(id));
  }

  /**
   * Search for products (e.g., for POS)
   */
  public async search(query: string): Promise<ApiResponse<Product[]>> {
    return this.get<ApiResponse<Product[]>>(API_ENDPOINTS.POS_PRODUCTS_SEARCH, { q: query });
  }
}

// Singleton instance for app-wide use
export const productClient = new ProductClient();
