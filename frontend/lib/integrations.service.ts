/**
 * Integrations: API keys for the public API, and outbound webhooks.
 */
import { apiClient } from "./api-client";

export interface ApiKeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  branchId: string | null;
  rateLimitPerMin: number;
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}
export interface WebhookRow {
  id: string;
  name: string;
  url: string;
  secret: string; // masked except right after create / rotate
  events: string[];
  isActive: boolean;
  createdAt: string;
  sent?: number;
  failed?: number;
  pending?: number;
}
export interface DeliveryRow {
  id: string;
  endpointId: string;
  event: string;
  status: "PENDING" | "SENDING" | "SENT" | "FAILED";
  attempts: number;
  nextAttemptAt: string;
  lastStatusCode: number | null;
  lastError: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

type Method = "GET" | "POST" | "PUT";
async function call<T>(path: string, method: Method, body?: unknown) {
  const res = await apiClient.request<T>(path, method as any, body);
  if (!res.success) throw new Error(res.error?.message || "Request failed");
  return res.data as T;
}

export const integrationsService = {
  meta: () => call<{ scopes: string[]; events: string[] }>("/v1/integrations/meta", "GET"),
  keys: () => call<ApiKeyRow[]>("/v1/integrations/api-keys", "GET"),
  createKey: (d: { name: string; scopes: string[]; expiresAt?: string; rateLimitPerMin?: number }) => call<ApiKeyRow & { key: string }>("/v1/integrations/api-keys", "POST", d),
  revokeKey: (id: string) => call<{ ok: boolean }>(`/v1/integrations/api-keys/${id}/revoke`, "POST"),
  webhooks: () => call<WebhookRow[]>("/v1/integrations/webhooks", "GET"),
  createWebhook: (d: { name: string; url: string; events: string[] }) => call<WebhookRow>("/v1/integrations/webhooks", "POST", d),
  updateWebhook: (id: string, d: Partial<{ name: string; url: string; events: string[]; isActive: boolean }>) => call<WebhookRow>(`/v1/integrations/webhooks/${id}`, "PUT", d),
  rotateSecret: (id: string) => call<{ id: string; secret: string }>(`/v1/integrations/webhooks/${id}/rotate-secret`, "POST"),
  testWebhook: (id: string) => call<DeliveryRow>(`/v1/integrations/webhooks/${id}/test`, "POST"),
  deliveries: (q: { endpointId?: string; status?: string } = {}) => {
    const p = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => v && p.set(k, v));
    const s = p.toString();
    return call<DeliveryRow[]>(`/v1/integrations/deliveries${s ? `?${s}` : ""}`, "GET");
  },
  retryDelivery: (id: string) => call<DeliveryRow>(`/v1/integrations/deliveries/${id}/retry`, "POST"),
};

export const DELIVERY_COLORS: Record<string, string> = {
  PENDING: "bg-sky-100 text-sky-700",
  SENDING: "bg-sky-100 text-sky-700",
  SENT: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-rose-100 text-rose-700",
};
