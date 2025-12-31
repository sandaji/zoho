/**
 * Branch Service
 * API functions for branch management
 */


const API_URL = "http://localhost:5000/v1";

export interface Branch {
  id: string;
  code: string;
  name: string;
  city: string;
  address?: string;
  phone?: string;
  employeeCount?: number;
  warehouseCount?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BranchFormData {
  code: string;
  name: string;
  city: string;
  address?: string;
  phone?: string;
}

export const branchService = {
  /**
   * Get all branches
   */
  async getAllBranches(token: string, filters?: { search?: string; isActive?: boolean }) {
    const params = new URLSearchParams();
    if (filters?.search) params.append("search", filters.search);
    if (filters?.isActive !== undefined) params.append("isActive", String(filters.isActive));

    const response = await fetch(`${API_URL}/branches?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error("Failed to fetch branches");
    return response.json();
  },

  /**
   * Get single branch
   */
  async getBranch(token: string, id: string) {
    const response = await fetch(`${API_URL}/branches/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error("Failed to fetch branch");
    return response.json();
  },

  /**
   * Create branch
   */
  async createBranch(token: string, data: BranchFormData) {
    const response = await fetch(`${API_URL}/branches`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create branch");
    }
    return response.json();
  },

  /**
   * Update branch
   */
  async updateBranch(
    token: string,
    id: string,
    data: Partial<BranchFormData> & { isActive?: boolean }
  ) {
    const response = await fetch(`${API_URL}/branches/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update branch");
    }
    return response.json();
  },

  /**
   * Delete branch
   */
  async deleteBranch(token: string, id: string) {
    const response = await fetch(`${API_URL}/branches/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete branch");
    }
    return response.json();
  },
};
