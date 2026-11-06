/**
 * Outbound webhooks with signed, retried deliveries.
 *
 * emit() writes delivery rows (an outbox): when called with the sale's transaction the event is
 * recorded atomically with the sale, so an event is never sent for something that rolled back and
 * never lost if the server dies right after commit. A background worker does the HTTP calls.
 *
 * Each request carries:
 *   X-Webhook-Event, X-Webhook-Id (delivery id, use it to de-duplicate), X-Webhook-Timestamp,
 *   X-Webhook-Signature: v1=<hex HMAC-SHA256 of "<timestamp>.<raw body>" with the endpoint secret>
 */
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { prisma } from "@core/database/db";
import { AppError, ErrorCode } from "@core/errors/errors";
import { logger } from "@core/utils/logger";

export const WEBHOOK_EVENTS = ["sale.created", "mpesa.payment_received", "ping"] as const;
const bad = (m: string) => new AppError(ErrorCode.VALIDATION_ERROR, 400, m);
const nf = (m: string) => new AppError(ErrorCode.NOT_FOUND, 404, m);
const BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 3600_000, 12 * 3600_000];
const MAX_ATTEMPTS = 6;

function checkUrl(raw: string) {
  let u: URL;
  try {
    u = new URL(String(raw ?? "").trim());
  } catch {
    throw bad("That is not a valid URL");
  }
  const prod = (process.env.NODE_ENV ?? "development") === "production";
  if (u.protocol !== "https:" && !(u.protocol === "http:" && !prod)) throw bad("The webhook URL must start with https://");
  if (u.username || u.password) throw bad("Do not put a username or password in the URL");
  const h = u.hostname.toLowerCase();
  const privateHost =
    h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) || h === "[::1]" || h.startsWith("[fc") || h.startsWith("[fd") || h.startsWith("[fe80");
  if (prod && privateHost) throw bad("The webhook URL must be a public address");
  if (u.toString().length > 500) throw bad("URL is too long");
  return u.toString();
}

function checkEvents(events: unknown) {
  const list = Array.from(new Set(((events as string[]) ?? []).map(String)));
  if (list.length === 0) throw bad("Pick at least one event");
  const unknown = list.filter((e) => !(WEBHOOK_EVENTS as readonly string[]).includes(e) || e === "ping");
  if (unknown.length) throw bad(`Unknown event: ${unknown.join(", ")}`);
  return list;
}

const newSecret = () => `whsec_${randomBytes(24).toString("hex")}`;
const mask = <T extends { secret: string }>(e: T) => ({ ...e, secret: `••••${e.secret.slice(-4)}` });

export class WebhookService {
  // ------------------------------------------------------------ emit

  /** Queue an event for every active endpoint subscribed to it. Pass `tx` to make it atomic with your change. */
  static async emit(event: string, data: unknown, tx?: any) {
    const db = tx ?? prisma;
    const endpoints = await db.webhookEndpoint.findMany({ where: { isActive: true, events: { has: event } }, select: { id: true } });
    if (endpoints.length === 0) return;
    const body = { id: randomUUID(), event, createdAt: new Date().toISOString(), data };
    await db.webhookDelivery.createMany({ data: endpoints.map((e: { id: string }) => ({ endpointId: e.id, event, payload: body as any })) });
  }

  // ------------------------------------------------------------ admin

  static async listEndpoints() {
    const rows = await prisma.webhookEndpoint.findMany({ orderBy: { createdAt: "desc" } });
    const stats = await prisma.webhookDelivery.groupBy({ by: ["endpointId", "status"], _count: { _all: true } });
    return rows.map((r) => {
      const mine = stats.filter((s) => s.endpointId === r.id);
      const n = (st: string) => mine.find((s) => s.status === st)?._count._all ?? 0;
      return { ...mask(r), sent: n("SENT"), failed: n("FAILED"), pending: n("PENDING") + n("SENDING") };
    });
  }

  static async createEndpoint(userId: string, d: { name: string; url: string; events: string[] }) {
    const name = String(d.name ?? "").trim();
    if (name.length < 3) throw bad("Give the endpoint a name");
    const secret = newSecret();
    const row = await prisma.webhookEndpoint.create({ data: { name, url: checkUrl(d.url), events: checkEvents(d.events), secret, createdById: userId } });
    return { ...row, secret }; // full secret shown once
  }

  static async updateEndpoint(id: string, d: { name?: string; url?: string; events?: string[]; isActive?: boolean }) {
    const cur = await prisma.webhookEndpoint.findUnique({ where: { id } });
    if (!cur) throw nf("Endpoint not found");
    const row = await prisma.webhookEndpoint.update({
      where: { id },
      data: {
        ...(d.name != null ? { name: String(d.name).trim() || cur.name } : {}),
        ...(d.url != null ? { url: checkUrl(d.url) } : {}),
        ...(d.events != null ? { events: checkEvents(d.events) } : {}),
        ...(d.isActive != null ? { isActive: !!d.isActive } : {}),
      },
    });
    return mask(row);
  }

  static async rotateSecret(id: string) {
    const secret = newSecret();
    const r = await prisma.webhookEndpoint.updateMany({ where: { id }, data: { secret } });
    if (r.count === 0) throw nf("Endpoint not found");
    return { id, secret };
  }

  static async deliveries(endpointId?: string, status?: string) {
    return prisma.webhookDelivery.findMany({
      where: { ...(endpointId ? { endpointId } : {}), ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  static async retry(deliveryId: string) {
    const d = await prisma.webhookDelivery.findUnique({ where: { id: deliveryId } });
    if (!d) throw nf("Delivery not found");
    if (d.status !== "FAILED") throw bad("Only failed deliveries can be retried");
    return prisma.webhookDelivery.update({ where: { id: deliveryId }, data: { status: "PENDING", attempts: 0, nextAttemptAt: new Date(), lastError: null } });
  }

  static async test(endpointId: string) {
    const e = await prisma.webhookEndpoint.findUnique({ where: { id: endpointId } });
    if (!e) throw nf("Endpoint not found");
    const body = { id: randomUUID(), event: "ping", createdAt: new Date().toISOString(), data: { message: "Test delivery from the ERP" } };
    return prisma.webhookDelivery.create({ data: { endpointId, event: "ping", payload: body as any } });
  }

  // ------------------------------------------------------------ worker

  static async processDue(limit = 20) {
    await prisma.webhookDelivery.updateMany({ where: { status: "SENDING", updatedAt: { lt: new Date(Date.now() - 5 * 60_000) } }, data: { status: "PENDING" } });
    const due = await prisma.webhookDelivery.findMany({ where: { status: "PENDING", nextAttemptAt: { lte: new Date() } }, orderBy: { nextAttemptAt: "asc" }, take: limit });
    for (const d of due) {
      const claim = await prisma.webhookDelivery.updateMany({ where: { id: d.id, status: "PENDING" }, data: { status: "SENDING", attempts: { increment: 1 } } });
      if (claim.count === 0) continue;
      const attempt = d.attempts + 1;
      const endpoint = await prisma.webhookEndpoint.findUnique({ where: { id: d.endpointId } });
      if (!endpoint || !endpoint.isActive) {
        await prisma.webhookDelivery.update({ where: { id: d.id }, data: { status: "FAILED", lastError: "Endpoint is disabled or deleted" } });
        continue;
      }
      const raw = JSON.stringify(d.payload);
      const ts = Math.floor(Date.now() / 1000).toString();
      const sig = createHmac("sha256", endpoint.secret).update(`${ts}.${raw}`).digest("hex");
      let code: number | null = null;
      let error: string | null = null;
      try {
        const res = await fetch(endpoint.url, {
          method: "POST",
          redirect: "manual", // never follow a redirect to somewhere else
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "ERP-Webhooks/1.0",
            "X-Webhook-Event": d.event,
            "X-Webhook-Id": d.id,
            "X-Webhook-Timestamp": ts,
            "X-Webhook-Signature": `v1=${sig}`,
          },
          body: raw,
          signal: AbortSignal.timeout(10_000),
        });
        code = res.status;
        if (res.status < 200 || res.status >= 300) error = `HTTP ${res.status}`;
      } catch (e) {
        error = e instanceof Error ? e.message.slice(0, 300) : "Request failed";
      }
      if (!error) {
        await prisma.webhookDelivery.update({ where: { id: d.id }, data: { status: "SENT", deliveredAt: new Date(), lastStatusCode: code, lastError: null } });
      } else {
        const final = attempt >= MAX_ATTEMPTS;
        await prisma.webhookDelivery.update({
          where: { id: d.id },
          data: final
            ? { status: "FAILED", lastStatusCode: code, lastError: error }
            : { status: "PENDING", lastStatusCode: code, lastError: error, nextAttemptAt: new Date(Date.now() + BACKOFF_MS[Math.min(attempt - 1, BACKOFF_MS.length - 1)]) },
        });
        logger.warn({ id: d.id, endpoint: endpoint.id, attempt, final, error }, "Webhook delivery failed");
      }
    }
  }
}

let timer: NodeJS.Timeout | null = null;
let busy = false;

export function startWebhookWorker() {
  if (timer || (process.env.WEBHOOK_WORKER ?? "").toLowerCase() === "off") return;
  timer = setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      await WebhookService.processDue();
    } catch (err) {
      logger.error({ err }, "Webhook worker tick failed");
    } finally {
      busy = false;
    }
  }, 10_000);
  timer.unref();
  logger.info("🔔 Webhook worker started");
}

export default WebhookService;
