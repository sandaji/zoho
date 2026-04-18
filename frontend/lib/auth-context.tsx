"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface Branch {
  id: string;
  name: string;
  location: string;
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
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    setUser,
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