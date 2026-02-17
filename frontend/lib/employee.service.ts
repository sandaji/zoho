/**
 * Employee Service
 * API functions for employee management and transfers
 */

export interface Employee {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role:
    | "cashier"
    | "warehouse_staff"
    | "driver"
    | "branch_manager"
    | "hr"
    | "accountant"
    | "manager"
    | "admin"
    | "super_admin";
  branchId?: string;
  branch?: { id: string; name: string; code: string };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeFormData {
  email: string;
  name: string;
  phone?: string;
  password?: string;
  role: string;
  branchId?: string;
}

export interface EmployeeTransfer {
  id: string;
  userId: string;
  fromBranchId?: string;
  fromBranch?: { id: string; name: string };
  toBranchId: string;
  toBranch: { id: string; name: string };
  fromRole?: string;
  toRole: string;
  transferDate: string;
  effectiveDate: string;
  reason?: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
}

const API_URL = "http://localhost:5000/v1";

export const employeeService = {
  /**
   * Get all employees with optional filtering
   */
  async getAllEmployees(
    token: string,
    filters?: {
      search?: string;
      role?: string;
      branchId?: string;
      isActive?: boolean;
    }
  ) {
    const params = new URLSearchParams();
    if (filters?.search) params.append("search", filters.search);
    if (filters?.role) params.append("role", filters.role);
    if (filters?.branchId) params.append("branchId", filters.branchId);
    if (filters?.isActive !== undefined) params.append("isActive", String(filters.isActive));

    const response = await fetch(`${API_URL}/employees?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error("Failed to fetch employees");
    return response.json();
  },

  /**
   * Get single employee with transfer history
   */
  async getEmployee(token: string, id: string) {
    const response = await fetch(`${API_URL}/employees/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error("Failed to fetch employee");
    return response.json();
  },

  /**
   * Create employee
   */
  async createEmployee(token: string, data: EmployeeFormData) {
    const response = await fetch(`${API_URL}/employees`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create employee");
    }
    return response.json();
  },

  /**
   * Update employee
   */
  async updateEmployee(
    token: string,
    id: string,
    data: Partial<EmployeeFormData> & { isActive?: boolean }
  ) {
    // Remove password from update if not provided
    if (data.password === "" || data.password === undefined) {
      delete data.password;
    }

    const response = await fetch(`${API_URL}/employees/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update employee");
    }
    return response.json();
  },

  /**
   * Transfer employee
   */
  async transferEmployee(
    token: string,
    id: string,
    data: {
      toBranchId: string;
      toRole: string;
      effectiveDate?: string;
      reason?: string;
      notes?: string;
      approvedBy?: string;
    }
  ) {
    const response = await fetch(`${API_URL}/employees/${id}/transfer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to transfer employee");
    }
    return response.json();
  },

  /**
   * Get employee transfer history
   */
  async getTransferHistory(token: string, id: string) {
    const response = await fetch(`${API_URL}/employees/${id}/transfers`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error("Failed to fetch transfer history");
    return response.json();
  },

  /**
   * Delete employee
   */
  async deleteEmployee(token: string, id: string) {
    const response = await fetch(`${API_URL}/employees/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete employee");
    }
    return response.json();
  },
};
