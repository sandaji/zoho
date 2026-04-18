/**
 * API Client
 * Handles all API requests with authentication and token refresh
 */

import { API_BASE_URL } from "./api-config";

const API_URL = API_BASE_URL;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

class ApiClient {
  private isRefreshing = false;
  private refreshQueue: Array<() => void> = [];

  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("auth_token");
  }

  private setToken(token: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", token);
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Refresh the authentication token
   */
  private async refreshToken(): Promise<boolean> {
    try {
      const token = this.getToken();
      if (!token) return false;

      const response = await fetch(`${API_URL}/v1/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (!response.ok) {
        // Token refresh failed - clear auth and redirect to login
        this.clearAuth();
        if (typeof window !== "undefined") {
          window.location.href = "/auth/login?expired=true";
        }
        return false;
      }

      const data = await response.json();
      if (data.success && data.data?.token) {
        this.setToken(data.data.token);
        return true;
      }

      this.clearAuth();
      return false;
    } catch (error) {
      console.error("Token refresh error:", error);
      this.clearAuth();
      return false;
    }
  }

  /**
   * Queue requests while token is being refreshed
   */
  private queueRequest(callback: () => void): void {
    this.refreshQueue.push(callback);
  }

  /**
   * Process all queued requests after token refresh
   */
  private processQueue(): void {
    this.refreshQueue.forEach((callback) => callback());
    this.refreshQueue = [];
  }

  /**
   * Clear authentication data
   */
  private clearAuth(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
    }
  }

  async request<T>(
    endpoint: string,
    method: string,
    body?: unknown,
    retryCount = 0
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_URL}${endpoint}`;

      const options: RequestInit = {
        method,
        headers: this.getHeaders(),
        credentials: "include",
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      // Handle 401 - try to refresh token and retry
      if (response.status === 401 && retryCount === 0) {
        // If already refreshing, queue this request
        if (this.isRefreshing) {
          return new Promise((resolve) => {
            this.queueRequest(async () => {
              const retryResult = await this.request<T>(endpoint, method, body, 1);
              resolve(retryResult);
            });
          });
        }

        // Start refresh
        this.isRefreshing = true;
        const refreshed = await this.refreshToken();
        this.isRefreshing = false;
        this.processQueue();

        if (refreshed) {
          // Retry original request with new token
          return this.request<T>(endpoint, method, body, 1);
        } else {
          // Refresh failed
          return {
            success: false,
            error: {
              code: "SESSION_EXPIRED",
              message: "Your session has expired. Please log in again.",
            },
          };
        }
      }

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || {
            code: "UNKNOWN_ERROR",
            message: "An error occurred",
          },
        };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: error instanceof Error ? error.message : "Network error occurred",
        },
      };
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request("/v1/auth/login", "POST", { email, password });
  }

  async register(email: string, password: string, name: string) {
    return this.request("/v1/auth/register", "POST", {
      email,
      password,
      name,
      role: "user",
    });
  }

  async getMe() {
    return this.request("/v1/auth/me", "GET");
  }

  async updateProfile(data: { name?: string; role?: string }) {
    return this.request("/v1/auth/profile", "PATCH", data);
  }
}

export const apiClient = new ApiClient();
