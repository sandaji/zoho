/**
 * Audit governance — findings, risk register and per-record change history.
 */
import { apiClient } from "./api-client";

type Person = { id: string; name?: string | null; email: string } | null;

export const FINDING_STATUSES = ["OPEN", "ACKNOWLEDGED", "IN_REMEDIATION", "RESOLVED", "CLOSED", "ACCEPTED_RISK"] as const;
export const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const FINDING_CATEGORIES = ["CONTROL", "COMPLIANCE", "FRAUD_RISK", "DATA_QUALITY", "SEGREGATION_OF_DUTIES", "OTHER"] as const;
export const RISK_CATEGORIES = ["OPERATIONAL", "FINANCIAL", "COMPLIANCE", "STRATEGIC", "TECHNOLOGY", "FRAUD", "OTHER"] as const;
export const RISK_STATUSES = ["OPEN", "MITIGATING", "ACCEPTED", "CLOSED"] as const;

export interface AuditFinding {
  id: string;
  findingNumber: string;
  title: string;
  description: string;
  severity: string;
  category: string;
  status: string;
  entityType?: string | null;
  entityId?: string | null;
  riskId?: string | null;
  raisedBy?: Person;
  owner?: Person;
  closedBy?: Person;
  dueDate?: string | null;
  managementResponse?: string | null;
  resolution?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  events?: { id: string; action: string; actor?: Person; comment?: string | null; createdAt: string }[];
}

export interface RiskEntry {
  id: string;
  riskNumber: string;
  title: string;
  description?: string | null;
  category: string;
  likelihood: number;
  impact: number;
  score: number;
  rating: string;
  status: string;
  owner?: Person;
  mitigation?: string | null;
  reviewDate?: string | null;
  openFindings: number;
}

export interface GovOverview {
  findings: {
    total: number;
    byStatus: Record<string, number>;
    openBySeverity: Record<string, number>;
    overdue: number;
  };
  risks: { open: number; byRating: Record<string, number>; matrix: Record<string, number> };
}

export interface FieldChange {
  field: string;
  from: unknown;
  to: unknown;
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";
async function call<T>(path: string, method: Method, body?: unknown) {
  const res = await apiClient.request<T>(path, method as any, body);
  if (!res.success) throw new Error(res.error?.message || "Request failed");
  return res.data as T;
}
const qs = (o: Record<string, string | boolean | undefined>) => {
  const p = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => v !== undefined && v !== "" && v !== false && p.set(k, String(v)));
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const auditGovService = {
  overview: () => call<GovOverview>("/v1/audit-findings/overview", "GET"),

  findings: (q: { status?: string; severity?: string; mine?: boolean; overdue?: boolean; search?: string } = {}) =>
    call<AuditFinding[]>(`/v1/audit-findings${qs(q)}`, "GET"),
  finding: (id: string) => call<AuditFinding>(`/v1/audit-findings/${id}`, "GET"),
  createFinding: (d: Record<string, unknown>) => call<AuditFinding>("/v1/audit-findings", "POST", d),
  updateFinding: (id: string, d: Record<string, unknown>) => call<AuditFinding>(`/v1/audit-findings/${id}`, "PATCH", d),
  transition: (id: string, d: { status: string; comment?: string; response?: string; resolution?: string }) =>
    call<AuditFinding>(`/v1/audit-findings/${id}/transition`, "POST", d),
  comment: (id: string, comment: string) => call<AuditFinding>(`/v1/audit-findings/${id}/comment`, "POST", { comment }),

  risks: (q: { status?: string; rating?: string } = {}) => call<RiskEntry[]>(`/v1/risk-register${qs(q)}`, "GET"),
  createRisk: (d: Record<string, unknown>) => call<RiskEntry>("/v1/risk-register", "POST", d),
  updateRisk: (id: string, d: Record<string, unknown>) => call<RiskEntry>(`/v1/risk-register/${id}`, "PATCH", d),

  history: (entityType: string, entityId: string) =>
    call<
      {
        id: string;
        action: string;
        timestamp: string;
        user?: Person;
        ipAddress?: string | null;
        fieldChanges: FieldChange[];
      }[]
    >(`/v1/audit-logs/entity/${entityType}/${entityId}`, "GET"),
};

export const SEVERITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-rose-100 text-rose-700",
};

export const FINDING_STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-rose-100 text-rose-700",
  ACKNOWLEDGED: "bg-amber-100 text-amber-700",
  IN_REMEDIATION: "bg-sky-100 text-sky-700",
  RESOLVED: "bg-violet-100 text-violet-700",
  CLOSED: "bg-emerald-100 text-emerald-700",
  ACCEPTED_RISK: "bg-slate-100 text-slate-700",
};
