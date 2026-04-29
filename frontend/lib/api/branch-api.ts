// frontend/lib/api/branch-api.ts
// Typed API wrappers for all branch endpoints.
// Uses getAuthHeadersWithToken from api-utils (consistent with Task-8 unification).

import { API_BASE_URL } from "@/lib/api-config";
import { getAuthHeadersWithToken } from "@/lib/api-utils";

// ============================================================================
// TYPES
// ============================================================================

export interface BranchSummary {
  id:             string;
  code:           string;
  name:           string;
  city:           string;
  address:        string | null;
  phone:          string | null;
  isActive:       boolean;
  createdAt:      string;
  updatedAt:      string;
  employeeCount:  number;
  warehouseCount: number;
}

export interface BranchDetail extends BranchSummary {
  users: {
    id:       string;
    name:     string;
    email:    string;
    phone:    string | null;
    role:     string;
    isActive: boolean;
  }[];
  warehouses: {
    id:       string;
    name:     string;
    location: string;
    capacity: number;
  }[];
}

export interface CreateBranchPayload {
  code:      string;
  name:      string;
  city:      string;
  address?:  string;
  phone?:    string;
  managerId?: string;
}

export interface UpdateBranchPayload {
  name?:     string;
  city?:     string;
  address?:  string;
  phone?:    string;
  isActive?: boolean;
  managerId?: string;
}

export interface SwitchBranchResult {
  token: string;
  user: {
    id:          string;
    email:       string;
    name:        string;
    role:        string;
    roles:       string[];
    branchId:    string;
    branch:      { id: string; name: string };
    permissions: string[];
  };
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * List all branches with employee + warehouse counts (admin only)
 */
export async function listBranches(token: string): Promise<BranchSummary[]> {
  const res = await fetch(`${API_BASE_URL}/v1/branches`, {
    headers: getAuthHeadersWithToken(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "Failed to fetch branches");
  }
  const { data } = await res.json();
  // Backend returns { data: { branches: [...] } }
  return Array.isArray(data) ? data : (data?.branches ?? []);
}

/**
 * Get single branch with users and warehouses
 */
export async function getBranch(token: string, id: string): Promise<BranchDetail> {
  const res = await fetch(`${API_BASE_URL}/v1/branches/${id}`, {
    headers: getAuthHeadersWithToken(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "Failed to fetch branch");
  }
  const { data } = await res.json();
  return data;
}

/**
 * Create a new branch (admin only)
 */
export async function createBranch(
  token: string,
  payload: CreateBranchPayload
): Promise<BranchSummary> {
  const res = await fetch(`${API_BASE_URL}/v1/branches`, {
    method: "POST",
    headers: getAuthHeadersWithToken(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "Failed to create branch");
  }
  const { data } = await res.json();
  return data;
}

/**
 * Update an existing branch (admin only)
 */
export async function updateBranch(
  token: string,
  id: string,
  payload: UpdateBranchPayload
): Promise<BranchSummary> {
  const res = await fetch(`${API_BASE_URL}/v1/branches/${id}`, {
    method: "PUT",
    headers: getAuthHeadersWithToken(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "Failed to update branch");
  }
  const { data } = await res.json();
  return data;
}

/**
 * Delete a branch — only works if no employees/warehouses/sales are attached
 */
export async function deleteBranch(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/v1/branches/${id}`, {
    method: "DELETE",
    headers: getAuthHeadersWithToken(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "Failed to delete branch");
  }
}

/**
 * Admin branch-context switch — returns a new JWT scoped to the target branch
 */
export async function switchBranch(
  token: string,
  branchId: string
): Promise<SwitchBranchResult> {
  const res = await fetch(`${API_BASE_URL}/v1/branches/${branchId}/switch`, {
    method: "POST",
    headers: getAuthHeadersWithToken(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "Failed to switch branch");
  }
  const { data } = await res.json();
  return data;
}

/**
 * Get branch stats / dashboard data
 */
export async function getBranchStats(token: string, branchId: string) {
  const res = await fetch(
    `${API_BASE_URL}/v1/branches/stats?branchId=${branchId}`,
    { headers: getAuthHeadersWithToken(token) }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "Failed to fetch branch stats");
  }
  const { data } = await res.json();
  return data;
}
