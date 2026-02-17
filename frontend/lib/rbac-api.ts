// frontend/lib/rbac-api.ts
import { User } from "./admin-api";
import { API_BASE_URL } from "./api-config";

export interface Permission {
  id: string;
  name: string;
  code: string;
  moduleId: string;
}

export interface Module {
  id: string;
  name: string;
  code: string;
  permissions: Permission[];
}

export interface Role {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isSystem: boolean;
  _count?: {
    permissions: number;
    users: number;
  };
  permissions?: {
    permission: Permission;
  }[];
}

const getAuthHeaders = (token: string) => {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };
};

export const fetchRoles = async (token: string): Promise<Role[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/rbac/roles`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) throw new Error("Failed to fetch roles");
  const { data } = await response.json();
  return data;
};

export const fetchRoleDetails = async (token: string, id: string): Promise<Role> => {
  const response = await fetch(`${API_BASE_URL}/v1/rbac/roles/${id}`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) throw new Error("Failed to fetch role details");
  const { data } = await response.json();
  return data;
};

export const createRole = async (token: string, data: { name: string; code: string; description?: string }): Promise<Role> => {
  const response = await fetch(`${API_BASE_URL}/v1/rbac/roles`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to create role");
  }
  const { data: role } = await response.json();
  return role;
};

export const updateRole = async (token: string, id: string, data: { name?: string; description?: string }): Promise<Role> => {
  const response = await fetch(`${API_BASE_URL}/v1/rbac/roles/${id}`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update role");
  const { data: role } = await response.json();
  return role;
};

export const deleteRole = async (token: string, id: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/v1/rbac/roles/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to delete role");
  }
};

export const fetchPermissions = async (token: string): Promise<Module[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/rbac/permissions`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) throw new Error("Failed to fetch permissions");
  const { data } = await response.json();
  return data;
};

export const syncRolePermissions = async (token: string, roleId: string, permissionIds: string[]): Promise<Role> => {
  const response = await fetch(`${API_BASE_URL}/v1/rbac/roles/${roleId}/permissions`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ permissions: permissionIds }),
  });
  if (!response.ok) throw new Error("Failed to sync permissions");
  const { data } = await response.json();
  return data;
};

export const fetchUserRoles = async (token: string, userId: string): Promise<any[]> => {
  const response = await fetch(`${API_BASE_URL}/v1/rbac/users/${userId}/roles`, {
    headers: getAuthHeaders(token),
  });
  if (!response.ok) throw new Error("Failed to fetch user roles");
  const { data } = await response.json();
  return data;
};

export const assignUserRoles = async (token: string, userId: string, roleIds: string[]): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/v1/rbac/users/${userId}/roles`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ roles: roleIds }),
  });
  if (!response.ok) throw new Error("Failed to assign roles");
  const { data } = await response.json();
  return data;
};
