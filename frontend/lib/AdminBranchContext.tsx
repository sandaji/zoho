"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { fetchBranches } from "@/lib/admin-api";
import { resolveGlobalPermissions } from "@/lib/admin-global-api";

// ============================================================================
// TYPES
// ============================================================================

export interface BranchOption {
  id: string;
  name: string;
  code: string;
  city: string;
}

export interface AdminBranchContextType {
  // Branch filter state
  selectedBranchId: string;
  setSelectedBranchId: (branchId: string) => void;

  // Available branches
  branches: BranchOption[];
  loading: boolean;

  // Permissions (permission-first approach)
  permissions: ReturnType<typeof resolveGlobalPermissions>;

  // Helpers
  selectedBranch: BranchOption | null;
  isAllBranchesSelected: boolean;
}

// ============================================================================
// CONTEXT
// ============================================================================

const AdminBranchContext = createContext<AdminBranchContextType | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

interface AdminBranchProviderProps {
  children: ReactNode;
}

export function AdminBranchProvider({ children }: AdminBranchProviderProps) {
  const { user, token } = useAuth();
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Resolve permissions based on role and permissions
  const permissions = resolveGlobalPermissions(user?.role, user?.permissions);

  // Load branches on mount
  useEffect(() => {
    if (!token || !permissions.canViewGlobalStats) {
      setLoading(false);
      return;
    }

    const loadBranches = async () => {
      try {
        const branchData = await fetchBranches(token);
        const branchOptions: BranchOption[] = branchData.map((b) => ({
          id: b.id,
          name: b.name,
          code: b.code,
          city: b.city,
        }));
        setBranches(branchOptions);
      } catch (error) {
        console.error("Failed to load branches:", error);
      } finally {
        setLoading(false);
      }
    };

    loadBranches();
  }, [token, permissions.canViewGlobalStats]);

  // Computed values
  const selectedBranch =
    selectedBranchId === "all" ? null : branches.find((b) => b.id === selectedBranchId) || null;

  const isAllBranchesSelected = selectedBranchId === "all";

  const value: AdminBranchContextType = {
    selectedBranchId,
    setSelectedBranchId,
    branches,
    loading,
    permissions,
    selectedBranch,
    isAllBranchesSelected,
  };

  return <AdminBranchContext.Provider value={value}>{children}</AdminBranchContext.Provider>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useAdminBranch() {
  const context = useContext(AdminBranchContext);
  if (context === undefined) {
    throw new Error("useAdminBranch must be used within an AdminBranchProvider");
  }
  return context;
}
