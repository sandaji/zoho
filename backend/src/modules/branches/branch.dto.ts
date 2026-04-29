/**
 * Branch DTOs
 * Input validation types for branch operations
 */

export interface CreateBranchDTO {
  code: string;
  name: string;
  city: string;
  address?: string;
  phone?: string;
  managerId?: string;
}

export interface UpdateBranchDTO {
  name?: string;
  city?: string;
  address?: string;
  phone?: string;
  isActive?: boolean;
  managerId?: string;
}

export interface BranchListFilters {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  authorizedBranchIds?: string[];
}
