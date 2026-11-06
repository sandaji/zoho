/**
 * Messaging: email / SMS / WhatsApp outbox, templates and receipt sharing.
 */
import { apiClient } from "./api-client";

export type Channel = "EMAIL" | "SMS" | "WHATSAPP";

export interface OutboxMessage {
  id: string;
  channel: Channel;
  category: string;
  recipient: string;
  subject: string | null;
  body: string;
  status: "QUEUED" | "SENDING" | "SENT" | "FAILED" | "CANCELLED";
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: string;
  lastError: string | null;
  provider: string | null;
  templateCode: string | null;
  relatedType: string | null;
  relatedId: string | null;
  sentAt: string | null;
  createdAt: string;
}
export interface MessageTemplate {
  id: string | null;
  code: string;
  name: string;
  channel: Channel;
  subject: string | null;
  body: string;
  isActive: boolean;
  isDefault: boolean;
}
export type ProviderStatus = Record<Channel, { provider: string; live: boolean; note?: string }>;

type Method = "GET" | "POST" | "PUT";
async function call<T>(path: string, method: Method, body?: unknown) {
  const res = await apiClient.request<T>(path, method as any, body);
  if (!res.success) throw new Error(res.error?.message || "Request failed");
  return res.data as T;
}
const qs = (o: Record<string, string | undefined>) => {
  const p = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => v && p.set(k, v));
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const messagingService = {
  status: () => call<ProviderStatus>("/v1/messaging/status", "GET"),
  outbox: (q: { status?: string; channel?: string; search?: string } = {}) =>
    call<{ rows: OutboxMessage[]; counts: Record<string, number> }>(`/v1/messaging/outbox${qs(q)}`, "GET"),
  retry: (id: string) => call<OutboxMessage>(`/v1/messaging/outbox/${id}/retry`, "POST"),
  cancel: (id: string) => call<OutboxMessage>(`/v1/messaging/outbox/${id}/cancel`, "POST"),
  send: (d: { channel?: Channel; to: string; subject?: string; body?: string; templateCode?: string; vars?: Record<string, unknown>; category?: string }) =>
    call<OutboxMessage>("/v1/messaging/send", "POST", d),
  /** Send a sale's receipt to its customer (or to `to`). */
  shareSale: (saleId: string, channel: Channel, to?: string) => call<OutboxMessage>(`/v1/messaging/sales/${saleId}/share`, "POST", { channel, to }),
  templates: () => call<MessageTemplate[]>("/v1/messaging/templates", "GET"),
  saveTemplate: (code: string, d: { name: string; channel: Channel; subject?: string | null; body: string; isActive: boolean }) =>
    call<MessageTemplate>(`/v1/messaging/templates/${code}`, "PUT", d),
};

export const MESSAGE_STATUS_COLORS: Record<string, string> = {
  QUEUED: "bg-sky-100 text-sky-700",
  SENDING: "bg-sky-100 text-sky-700",
  SENT: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-rose-100 text-rose-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};
