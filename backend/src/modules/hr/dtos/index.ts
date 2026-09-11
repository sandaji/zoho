/**
 * HR Module - Data Transfer Objects
 */

export interface CreateUserDTO {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: string;
  branchId?: string;
}

export interface UpdateUserDTO {
  name?: string;
  phone?: string;
  role?: string;
  branchId?: string | null;
  isActive?: boolean;
}

export interface UserResponseDTO {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  branchId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePayrollDTO {
  userId: string;
  base_salary: number;
  allowances?: number;
  deductions?: number;
  period_start: string;
  period_end: string;
  notes?: string;
}

export interface UpdatePayrollDTO {
  status?: string;
  base_salary?: number;
  allowances?: number;
  deductions?: number;
  paid_date?: string;
  notes?: string;
}

export interface PayrollResponseDTO {
  id: string;
  payroll_no: string;
  status: string;
  userId: string;
  base_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  period_start: string;
  period_end: string;
  paid_date?: string;
  notes?: string;
}

export interface PayrollListQueryDTO {
  page?: number;
  limit?: number;
  status?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export interface PayrollCalculationDTO {
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
}
