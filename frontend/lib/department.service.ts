/**
 * Department Service
 * Minimal client for the departments reference-data endpoint
 * (backend/src/modules/hr/hr.controller.ts's getDepartments), added so
 * expense/requisition forms can offer a real dropdown instead of asking
 * people to type department IDs.
 */

import { apiClient } from "./api-client";

export interface Department {
  id: string;
  name: string;
  prefix: string;
}

class DepartmentService {
  async list() {
    const res = await apiClient.request<Department[]>("/v1/hr/departments", "GET");
    if (!res.success) throw new Error(res.error?.message || "Failed to fetch departments");
    return res.data || [];
  }
}

export const departmentService = new DepartmentService();
