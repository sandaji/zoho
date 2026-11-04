/**
 * Workflow engine — approvals inbox, history, delegation and designer.
 */
import { apiClient } from "./api-client";

type Person = { id: string; name?: string | null; email: string } | null;

export interface WfStep {
  id: string;
  order: number;
  name: string;
  approverPermission: string;
  branchScoped: boolean;
  status: "WAITING" | "PENDING" | "APPROVED" | "REJECTED" | "SKIPPED" | string;
  dueAt?: string | null;
  escalatedAt?: string | null;
  actedAt?: string | null;
  actedBy?: Person;
  onBehalfOf?: Person;
  comment?: string | null;
}

export interface WfEvent {
  id: string;
  action: string;
  actor?: Person;
  actorId: string;
  onBehalfOf?: Person;
  comment?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  hash: string;
}

export interface WfInstance {
  id: string;
  instanceNumber: string;
  definitionCode: string;
  entityType: string;
  entityId: string;
  title: string;
  summary?: string | null;
  amount?: number | null;
  branchId?: string | null;
  requestedBy?: Person;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | string;
  outcomeApplied: boolean;
  outcomeError?: string | null;
  createdAt: string;
  completedAt?: string | null;
  steps?: WfStep[];
  events?: WfEvent[];
  actionableStepIds?: string[];
  chainIntact?: boolean;
}

export interface WfInboxItem {
  step: WfStep & { instanceId: string };
  instance: WfInstance;
  onBehalfOfId?: string | null;
}

export interface WfStageDef {
  order: number;
  name: string;
  approverPermission: string;
  branchScoped: boolean;
  minAmount?: number | null;
  maxAmount?: number | null;
  escalateAfterHours?: number | null;
  escalateToPermission?: string | null;
}

export interface WfDefinition {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  entityType: string;
  isActive: boolean;
  stages: WfStageDef[];
}

export interface WfDelegation {
  id: string;
  fromUser?: Person;
  toUser?: Person;
  fromUserId: string;
  toUserId: string;
  startsAt: string;
  endsAt: string;
  reason?: string | null;
}

type Method = "GET" | "POST" | "PUT" | "DELETE";

async function call<T>(path: string, method: Method, body?: unknown, fallback = "Request failed") {
  const res = await apiClient.request<T>(path, method as any, body);
  if (!res.success) throw new Error(res.error?.message || fallback);
  return res.data as T;
}

export const workflowService = {
  inbox: () => call<WfInboxItem[]>("/v1/workflow/inbox", "GET"),
  mine: () => call<WfInstance[]>("/v1/workflow/mine", "GET"),
  all: (q: { status?: string; search?: string } = {}) => {
    const p = new URLSearchParams();
    if (q.status) p.set("status", q.status);
    if (q.search) p.set("search", q.search);
    const s = p.toString();
    return call<{ data: WfInstance[]; total: number }>(`/v1/workflow/instances${s ? `?${s}` : ""}`, "GET");
  },
  get: (id: string) => call<WfInstance>(`/v1/workflow/instances/${id}`, "GET"),
  forEntity: (entityType: string, entityId: string) =>
    call<WfInstance[]>(`/v1/workflow/entity/${entityType}/${entityId}`, "GET"),
  decide: (stepId: string, decision: "APPROVE" | "REJECT", comment?: string) =>
    call<WfInstance>(`/v1/workflow/steps/${stepId}/decision`, "POST", { decision, comment }),
  comment: (id: string, comment: string) =>
    call<WfInstance>(`/v1/workflow/instances/${id}/comment`, "POST", { comment }),
  cancel: (id: string, reason: string) =>
    call<WfInstance>(`/v1/workflow/instances/${id}/cancel`, "POST", { reason }),
  retryOutcome: (id: string) => call<WfInstance>(`/v1/workflow/instances/${id}/retry-outcome`, "POST"),

  definitions: () => call<WfDefinition[]>("/v1/workflow/definitions", "GET"),
  saveDefinition: (
    code: string,
    d: { name?: string; description?: string; isActive?: boolean; stages?: WfStageDef[] },
  ) => call<WfDefinition>(`/v1/workflow/definitions/${code}`, "PUT", d),

  delegations: () => call<WfDelegation[]>("/v1/workflow/delegations", "GET"),
  delegate: (d: { toEmail: string; startsAt: string; endsAt: string; reason?: string }) =>
    call<WfDelegation>("/v1/workflow/delegations", "POST", d),
  revokeDelegation: (id: string) => call(`/v1/workflow/delegations/${id}`, "DELETE"),
};

export const WF_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-rose-100 text-rose-700",
  CANCELLED: "bg-slate-100 text-slate-600",
  WAITING: "bg-slate-100 text-slate-500",
  SKIPPED: "bg-slate-100 text-slate-400",
};
