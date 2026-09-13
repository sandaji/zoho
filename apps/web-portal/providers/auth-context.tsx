"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface Branch {
  id:       string;
  name:     string;
  city:     string;
  address:  string | null;
}

export type UserRole = "admin" | "super_admin" | "branch_manager" | "manager" | "accountant" | "hr" | "cashier" | "warehouse_staff" | "driver" | "procurement" | "user";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  roles?: string[]; // Support for multiple roles
  branchId: string | null;
  branch?: {
    id: string;
    name: string;
  };
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
  switchBranch: (branchId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from localStorage on mount, then validate the token against the backend.
  // If the token is stale or has an invalid signature the user is logged out automatically.
  useEffect(() => {
    const storedToken = localStorage.getItem("auth_token");
    const storedUser = localStorage.getItem("auth_user");

    if (!storedToken || !storedUser) {
      setIsLoading(false);
      return;
    }

    // Optimistically restore state so pages render immediately
    try {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    } catch (error) {
      console.error("Failed to restore auth state:", error);
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      setIsLoading(false);
      return;
    }

    // Validate the token with the backend in the background
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

    fetch(`${apiBase}/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${storedToken}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          // Token is invalid/expired — clear everything and force re-login
          console.warn("Stored token rejected by server — logging out.");
          setToken(null);
          setUser(null);
          localStorage.removeItem("auth_token");
          localStorage.removeItem("auth_user");
        }
      })
      .catch(() => {
        // Server unreachable — keep the token so the UI stays usable offline,
        // individual API calls will show their own errors.
        console.warn("Could not validate token: server unreachable.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("auth_token", newToken);
    localStorage.setItem("auth_user", JSON.stringify(newUser));
    // Write cookies so Next.js edge proxy can read them for route protection
    const maxAge = 60 * 60 * 24 * 7; // 7 days — matches typical JWT expiry
    document.cookie = `auth_token=${newToken}; path=/; max-age=${maxAge}; SameSite=Lax`;
    document.cookie = `auth_user=${encodeURIComponent(JSON.stringify(newUser))}; path=/; max-age=${maxAge}; SameSite=Lax`;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    // Clear the auth cookies
    document.cookie = "auth_token=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "auth_user=; path=/; max-age=0; SameSite=Lax";
  };

  /**
   * Switch branch context (admin only).
   * Calls the backend to re-issue a JWT scoped to the target branch,
   * then updates all local state.
   */
  const switchBranch = useCallback(async (branchId: string) => {
    const currentToken = token || localStorage.getItem("auth_token");
    if (!currentToken) throw new Error("Not authenticated");

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const res = await fetch(`${apiBase}/v1/branches/${branchId}/switch`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${currentToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || "Failed to switch branch");
    }

    const { data } = await res.json();
    if (data?.token && data?.user) {
      login(data.token, data.user);
    }
  }, [token, login]);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    setUser,
    switchBranch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}