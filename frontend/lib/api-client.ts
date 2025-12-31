/**
 * API Client
 * Handles all API requests with authentication
 */

import { API_BASE_URL } from './api-config';

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
  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("auth_token");
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

    async request<T>(endpoint: string, method: string, body?: unknown): Promise<ApiResponse<T>> {

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
