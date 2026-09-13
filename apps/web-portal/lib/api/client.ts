import { API_BASE_URL } from "../api-config";
import { getAuthToken } from "../api-utils";

/**
 * Standard request options extending fetch RequestInit
 */
export interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
  token?: string;
}

/**
 * Standard API Response envelope
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Base API Client providing standardized request handling
 */
export class BaseApiClient {
  /**
   * Centralized request handler
   */
  protected async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    // 1. Construct URL with query parameters
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        // Filter out null, undefined, or empty values to keep URLs clean
        if (value !== undefined && value !== null && value !== '' && value !== 'all') {
          url.searchParams.append(key, String(value));
        }
      });
    }

    // 2. Prepare headers
    const token = options.token || getAuthToken();
    const headers = new Headers(options.headers);
    
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    // 3. Execute fetch
    try {
      const response = await fetch(url.toString(), {
        ...options,
        headers
      });

      // 4. Handle response errors
      if (!response.ok) {
        let errorData: any;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: `HTTP Error ${response.status}: ${response.statusText}` };
        }
        
        const errorMessage = errorData.error?.message || errorData.message || 'An unexpected error occurred';
        throw new Error(errorMessage);
      }

      // 5. Return JSON payload
      return await response.json();
    } catch (error) {
      // Re-throw or wrap network errors
      if (error instanceof Error) throw error;
      throw new Error('Network error occurred');
    }
  }

  protected get<T>(endpoint: string, params?: Record<string, any>, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'GET', params });
  }

  protected post<T>(endpoint: string, body: any, options?: RequestOptions) {
    return this.request<T>(endpoint, { 
      ...options, 
      method: 'POST', 
      body: JSON.stringify(body) 
    });
  }

  protected put<T>(endpoint: string, body: any, options?: RequestOptions) {
    return this.request<T>(endpoint, { 
      ...options, 
      method: 'PUT', 
      body: JSON.stringify(body) 
    });
  }

  protected delete<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Global default client instance
export const api = new BaseApiClient();
