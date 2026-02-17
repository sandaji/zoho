/**
 * API Utilities
 * Shared utilities for API operations
 */

/**
 * Build query string from object
 * Filters out undefined and null values
 */
export function buildQueryString(filters?: Record<string, any>): string {
  if (!filters || Object.keys(filters).length === 0) {
    return "";
  }

  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, String(value));
    }
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

/**
 * Get auth headers from localStorage
 * Includes Content-Type header and Authorization if token exists
 */
export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

/**
 * Get auth headers with explicit token
 * Useful when token is provided as parameter
 */
export function getAuthHeadersWithToken(token?: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

/**
 * Parse API response
 * Handles both success and error responses
 */
export async function parseApiResponse<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    const errorMessage = data?.message || data?.error?.message || "Request failed";
    throw new Error(errorMessage);
  }

  // Return data property if it exists, otherwise return the whole response
  return data?.data !== undefined ? data.data : data;
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error) || "An unexpected error occurred";
}

/**
 * Check if response has pagination info
 */
export function isPaginatedResponse<T>(
  response: any
): response is { data: T[]; total: number; page: number; limit: number } {
  return (
    Array.isArray(response?.data) &&
    typeof response?.total === "number" &&
    typeof response?.page === "number" &&
    typeof response?.limit === "number"
  );
}

/**
 * Merge headers with defaults
 */
export function mergeHeaders(
  defaultHeaders: HeadersInit,
  customHeaders?: HeadersInit
): HeadersInit {
  return {
    ...defaultHeaders,
    ...customHeaders,
  };
}
