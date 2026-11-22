/**
 * API Client
 * The single transport layer for backend requests.
 *
 * - authFetch(): fetch + Authorization header + one transparent retry after
 *   refreshing an expired access token. Everything that talks to the backend
 *   (this client, BaseApiClient, the feature services) goes through it, so
 *   authentication behaves the same on every screen.
 * - apiClient: convenience wrapper on top of authFetch that also normalizes
 *   the backend's response envelopes into { success, data, error }.
 */

import { API_BASE_URL } from "./api-config";

const API_URL = API_BASE_URL;

const TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";
const USER_KEY = "auth_user";

/** Fired on `window` after the access token was refreshed (detail = new token). */
export const TOKEN_REFRESHED_EVENT = "auth:token-refreshed";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

const isBrowser = () => typeof window !== "undefined";

function readToken(): string | null {
  return isBrowser() ? localStorage.getItem(TOKEN_KEY) : null;
}

function readRefreshToken(): string | null {
  return isBrowser() ? localStorage.getItem(REFRESH_TOKEN_KEY) : null;
}

function storeRefreshedTokens(token: string, refreshToken?: string): void {
  if (!isBrowser()) return;
  localStorage.setItem(TOKEN_KEY, token);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  // Keep the cookie the Next.js proxy reads in step with the new token.
  const maxAge = 60 * 60 * 24 * 7;
  document.cookie = `auth_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent(TOKEN_REFRESHED_EVENT, { detail: token }));
}

function clearAuthStorage(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  document.cookie = "auth_token=; path=/; max-age=0; SameSite=Lax";
  document.cookie = "auth_user=; path=/; max-age=0; SameSite=Lax";
}

/** The session can no longer be refreshed: clear it and send the user to login. */
function endSession(): void {
  clearAuthStorage();
  if (isBrowser() && !window.location.pathname.startsWith("/auth/")) {
    window.location.href = "/auth/login?expired=true";
  }
}

/**
 * Auth endpoints answer 401 for *bad credentials* / a bad refresh token, not
 * for an expired session, so they must never trigger the refresh flow.
 */
function isAuthEndpoint(urlOrPath: string): boolean {
  return (
    urlOrPath.includes("/v1/auth/login") ||
    urlOrPath.includes("/v1/auth/refresh")
  );
}

/**
 * Only our own backend gets the access token: absolute URLs under API_URL or
 * same-origin paths such as the /api/* rewrite. Anything else (third-party
 * hosts, blob/data URLs, protocol-relative URLs) is passed through untouched.
 */
function isApiRequest(input: string): boolean {
  return (
    input.startsWith(API_URL) ||
    (input.startsWith("/") && !input.startsWith("//"))
  );
}

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Exchange the stored refresh token for a new access token. Concurrent callers
 * share one request.
 */
export function refreshAccessToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function performRefresh(): Promise<boolean> {
  try {
    const refreshToken = readRefreshToken();
    if (!refreshToken) {
      endSession();
      return false;
    }

    const response = await fetch(`${API_URL}/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      credentials: "include",
    });

    if (!response.ok) {
      endSession();
      return false;
    }

    const data = await response.json();
    if (data.success && data.data?.token) {
      storeRefreshedTokens(data.data.token, data.data.refreshToken);
      return true;
    }

    endSession();
    return false;
  } catch (error) {
    // Network failure: don't log the user out because the server is unreachable.
    console.error("Token refresh error:", error);
    return false;
  }
}

/**
 * fetch() with authentication.
 *
 * - Sends the Authorization header from the caller if one is given, otherwise
 *   the stored access token.
 * - On a 401 (outside the auth endpoints) it retries once with the stored token
 *   if the caller was holding a stale copy, and otherwise refreshes the token
 *   and retries once with the new one.
 * - If the session cannot be refreshed the original 401 response is returned.
 */
export async function authFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  if (!isApiRequest(input)) return fetch(input, init);

  const callerAuth = new Headers(init.headers).get("Authorization");
  const sentToken = callerAuth
    ? callerAuth.replace(/^Bearer\s+/i, "")
    : readToken();

  const send = (token: string | null): Promise<Response> => {
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  };

  let response = await send(sentToken);
  if (response.status !== 401 || isAuthEndpoint(input)) return response;

  // Nobody was signed in, so there is nothing to refresh.
  const storedToken = readToken();
  if (!sentToken && !storedToken) return response;

  // Callers often hold a token captured before an earlier refresh.
  if (storedToken && storedToken !== sentToken) {
    response = await send(storedToken);
    if (response.status !== 401) return response;
  }

  if (!(await refreshAccessToken())) return response;
  return send(readToken());
}

class ApiClient {
  async request<T>(
    endpoint: string,
    method: string,
    body?: unknown,
  ): Promise<ApiResponse<T>> {
    try {
      const options: RequestInit = {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await authFetch(`${API_URL}${endpoint}`, options);

      // authFetch already tried to refresh. A 401 that survives (outside the
      // auth endpoints) means the session is over.
      if (response.status === 401 && !isAuthEndpoint(endpoint)) {
        return {
          success: false,
          error: {
            code: "SESSION_EXPIRED",
            message: "Your session has expired. Please log in again.",
          },
        };
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

      // Normalize response shape: some backend endpoints return
      // { status: "success", data } instead of { success: true, data }.
      // Without this, `result.success` is undefined (falsy) for those
      // responses and every successful call looks like a failure.
      if (typeof (data as any).success === "boolean") {
        return data;
      }
      if ((data as any).status === "success") {
        return { success: true, data: (data as any).data };
      }
      if ((data as any).status === "error") {
        return {
          success: false,
          error: (data as any).error || {
            code: "UNKNOWN_ERROR",
            message: (data as any).message || "An error occurred",
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

  async getMe() {
    return this.request("/v1/auth/me", "GET");
  }

  async updateProfile(data: { name?: string }) {
    return this.request("/v1/auth/profile", "PATCH", data);
  }
}

export const apiClient = new ApiClient();
