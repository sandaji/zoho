/**
 * People — employment contracts, salary structures and employee self-service.
 */
import { apiClient } from "./api-client";

export const CONTRACT_TYPES = ["PERMANENT", "FIXED_TERM", "PROBATION", "CASUAL", "INTERNSHIP"] as const;

export interface SalaryComponent {
  id?: string;
  name: string;
  kind: "ALLOWANCE" | "DEDUCTION";
  calc: "FIXED" | "PERCENT_OF_BASE";
  value: number;
}
export interface SalaryStructure {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  minSalary?: number | null;
  maxSalary?: number | null;
  isActive: boolean;
  components: SalaryComponent[];
}
export interface PayBreakdown {
  baseSalary: number;
  allowances: number;
  deductions: number;
  net: number;
  lines: { name: string; kind: string; calc: string; value: number; amount: number }[];
}
export interface Contract {
  id: string;
  contractNumber: string;
  userId: string;
  type: string;
  status: string;
  jobTitle: string;
  startDate: string;
  endDate?: string | null;
  probationEndDate?: string | null;
  noticeDays: number;
  hoursPerWeek: number;
  baseSalary: number;
  salaryStructureId?: string | null;
  notes?: string | null;
  signedAt?: string | null;
  terminatedAt?: string | null;
  terminationReason?: string | null;
  employee?: { id: string; name: string; email: string; employeeCode?: string | null; branch?: { name: string } | null; department?: { name: string } | null } | null;
  structure?: { id: string; code: string; name: string } | null;
  pay?: PayBreakdown;
}
export interface MyProfile {
  user: { id: string; name: string; email: string; phone?: string | null; employeeCode?: string | null; branch?: { name: string } | null; department?: { name: string } | null };
  contract: Contract | null;
  pay: PayBreakdown | null;
  leaveBalances: { leaveTypeId: string; leaveType: string; allocated: number; used: number; pending: number; remaining: number }[];
  leaveRequests: { id: string; leaveType: string; startDate: string; endDate: string; days: number; status: string; reason?: string | null }[];
  benefits: { id: string; name: string; type: string; provider?: string | null; enrolledAt: string }[];
}
export interface Payslip {
  id: string;
  payroll_no: string;
  status: string;
  base_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  period_start: string;
  period_end: string;
  paid_date?: string | null;
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
async function call<T>(path: string, method: Method, body?: unknown) {
  const res = await apiClient.request<T>(path, method as any, body);
  if (!res.success) throw new Error(res.error?.message || "Request failed");
  return res.data as T;
}
const qs = (o: Record<string, string | number | undefined>) => {
  const p = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => v !== undefined && v !== "" && p.set(k, String(v)));
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const peopleService = {
  // self-service
  myProfile: () => call<MyProfile>("/v1/people/self/profile", "GET"),
  updateMyProfile: (d: { phone: string }) => call<MyProfile>("/v1/people/self/profile", "PATCH", d),
  myPayslips: () => call<Payslip[]>("/v1/people/self/payslips", "GET"),
  leaveTypes: () => call<{ id: string; name: string; daysAllowed: number }[]>("/v1/people/self/leave-types", "GET"),
  requestLeave: (d: { leaveTypeId: string; startDate: string; endDate: string; reason?: string }) =>
    call("/v1/people/self/leave", "POST", d),
  cancelLeave: (id: string) => call(`/v1/people/self/leave/${id}/cancel`, "POST"),

  // HR
  structures: () => call<SalaryStructure[]>("/v1/people/salary-structures", "GET"),
  createStructure: (d: Partial<SalaryStructure>) => call<SalaryStructure>("/v1/people/salary-structures", "POST", d),
  saveStructure: (id: string, d: Partial<SalaryStructure>) => call<SalaryStructure>(`/v1/people/salary-structures/${id}`, "PUT", d),
  contracts: (q: { status?: string; search?: string; expiringInDays?: number } = {}) =>
    call<Contract[]>(`/v1/people/contracts${qs(q)}`, "GET"),
  contract: (id: string) => call<Contract>(`/v1/people/contracts/${id}`, "GET"),
  createContract: (d: Record<string, unknown>) => call<Contract>("/v1/people/contracts", "POST", d),
  updateContract: (id: string, d: Record<string, unknown>) => call<Contract>(`/v1/people/contracts/${id}`, "PATCH", d),
  discardContract: (id: string) => call(`/v1/people/contracts/${id}`, "DELETE"),
  activate: (id: string) => call<Contract>(`/v1/people/contracts/${id}/activate`, "POST"),
  terminate: (id: string, d: { reason: string; date?: string }) => call<Contract>(`/v1/people/contracts/${id}/terminate`, "POST", d),
  generatePayroll: (d: { month: number; year: number }) =>
    call<{ created: number; skippedExisting: number; totalNet: number }>("/v1/people/payroll/generate", "POST", d),
};

export const CONTRACT_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  EXPIRED: "bg-amber-100 text-amber-700",
  TERMINATED: "bg-rose-100 text-rose-700",
  SUPERSEDED: "bg-slate-100 text-slate-500",
};
