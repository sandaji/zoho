/**
 * Messaging: a durable outbox in front of email / SMS / WhatsApp.
 *
 * Callers never talk to a provider. They enqueue a message; a background worker delivers it,
 * retries transient failures with backoff, and gives up on permanent ones. Every attempt leaves
 * a row, so "did the customer get their receipt?" has an answer.
 */
import { prisma } from "@core/database/db";
import { AppError, ErrorCode } from "@core/errors/errors";
import { logger } from "@core/utils/logger";
import { CHANNELS, deliver, normalizeEmail, normalizePhone, PermanentSendError, providerStatus, type Channel } from "./providers";

const bad = (m: string) => new AppError(ErrorCode.VALIDATION_ERROR, 400, m);
const nf = (m: string) => new AppError(ErrorCode.NOT_FOUND, 404, m);

const BACKOFF_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 6 * 60 * 60_000];
const MAX_BODY = { SMS: 640, WHATSAPP: 4000, EMAIL: 20000 } as const;

export const DEFAULT_TEMPLATES: Record<string, { name: string; channel: Channel; subject?: string; body: string }> = {
  SALE_RECEIPT_SMS: {
    name: "Sale receipt (SMS)",
    channel: "SMS",
    body: "Thank you {{customer}}. Receipt {{number}} dated {{date}}: total KSh {{total}}, paid KSh {{paid}}{{balanceLine}}. {{shop}}",
  },
  SALE_RECEIPT_WHATSAPP: {
    name: "Sale receipt (WhatsApp)",
    channel: "WHATSAPP",
    body: "Hello {{customer}}, thank you for shopping with {{shop}}.\nReceipt {{number}} ({{date}})\nTotal: KSh {{total}}\nPaid: KSh {{paid}}{{balanceLine}}",
  },
  SALE_RECEIPT_EMAIL: {
    name: "Sale receipt (Email)",
    channel: "EMAIL",
    subject: "Your receipt {{number}} from {{shop}}",
    body: "Hello {{customer}},\n\nThank you for shopping with {{shop}}.\n\nReceipt: {{number}}\nDate: {{date}}\nTotal: KSh {{total}}\nPaid: KSh {{paid}}{{balanceLine}}\n\nRegards,\n{{shop}}",
  },
  PAYMENT_REMINDER_SMS: {
    name: "Payment reminder (SMS)",
    channel: "SMS",
    body: "Dear {{customer}}, invoice {{number}} has an outstanding balance of KSh {{balance}}. Kindly pay at your earliest convenience. {{shop}}",
  },
  PAYMENT_REMINDER_EMAIL: {
    name: "Payment reminder (Email)",
    channel: "EMAIL",
    subject: "Payment reminder: invoice {{number}}",
    body: "Dear {{customer}},\n\nInvoice {{number}} has an outstanding balance of KSh {{balance}}.\nKindly settle it at your earliest convenience.\n\nRegards,\n{{shop}}",
  },
};

const fmt = (n: number) => Math.round(n).toLocaleString("en-KE");
const isChannel = (c: unknown): c is Channel => CHANNELS.includes(c as Channel);

function fill(text: string, vars: Record<string, unknown>) {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] == null ? "" : String(vars[k])));
}

export interface MessagingCtx {
  userId: string;
  branchIds?: string[];
}

export class MessagingService {
  // ------------------------------------------------------------ templates

  static async listTemplates() {
    const rows = await prisma.messageTemplate.findMany({ orderBy: { code: "asc" } });
    const have = new Set(rows.map((r) => r.code));
    const defaults = Object.entries(DEFAULT_TEMPLATES)
      .filter(([code]) => !have.has(code))
      .map(([code, t]) => ({ id: null, code, name: t.name, channel: t.channel, subject: t.subject ?? null, body: t.body, isActive: true, isDefault: true }));
    return [...rows.map((r) => ({ ...r, isDefault: false })), ...defaults];
  }

  static async saveTemplate(ctx: MessagingCtx, code: string, d: any) {
    if (!/^[A-Z0-9_]{3,60}$/.test(code)) throw bad("Template code must be 3-60 characters: capitals, digits and underscores");
    if (!isChannel(d.channel)) throw bad("Choose a channel");
    const body = String(d.body ?? "").trim();
    if (body.length < 2) throw bad("The message body is empty");
    if (body.length > MAX_BODY[d.channel as Channel]) throw bad(`Too long for ${d.channel}`);
    const data = {
      name: String(d.name ?? code).trim() || code,
      channel: d.channel as string,
      subject: d.channel === "EMAIL" ? String(d.subject ?? "").trim() || null : null,
      body,
      isActive: d.isActive !== false,
      updatedById: ctx.userId,
    };
    return prisma.messageTemplate.upsert({ where: { code }, update: data, create: { code, ...data } });
  }

  private static async render(code: string, vars: Record<string, unknown>) {
    const row = await prisma.messageTemplate.findUnique({ where: { code } });
    const t = row ?? (DEFAULT_TEMPLATES[code] ? { ...DEFAULT_TEMPLATES[code], isActive: true } : null);
    if (!t) throw nf(`Template ${code} not found`);
    if (!t.isActive) throw bad(`Template ${code} is switched off`);
    return { channel: t.channel as Channel, subject: t.subject ? fill(t.subject, vars) : null, body: fill(t.body, vars) };
  }

  // ------------------------------------------------------------ enqueue

  static async enqueue(input: {
    channel?: string;
    to: string;
    subject?: string | null;
    body?: string;
    templateCode?: string;
    vars?: Record<string, unknown>;
    category?: "TRANSACTIONAL" | "MARKETING";
    relatedType?: string;
    relatedId?: string;
    createdById?: string;
  }) {
    let channel = input.channel as Channel | undefined;
    let subject = input.subject ?? null;
    let body = (input.body ?? "").trim();

    if (input.templateCode) {
      const r = await MessagingService.render(input.templateCode, input.vars ?? {});
      if (channel && channel !== r.channel) throw bad(`Template ${input.templateCode} is for ${r.channel}, not ${channel}`);
      channel = r.channel;
      subject = r.subject;
      body = r.body.trim();
    }
    if (!channel || !isChannel(channel)) throw bad("Choose a channel: EMAIL, SMS or WHATSAPP");
    if (!body) throw bad("The message is empty");
    if (body.length > MAX_BODY[channel]) throw bad(`Message is too long for ${channel} (max ${MAX_BODY[channel]} characters)`);

    let recipient: string;
    try {
      recipient = channel === "EMAIL" ? normalizeEmail(input.to) : normalizePhone(input.to);
    } catch (e) {
      throw bad(e instanceof Error ? e.message : "Invalid recipient");
    }

    const category = input.category ?? "TRANSACTIONAL";
    if (category === "MARKETING") {
      const out = await prisma.messageOptOut.findUnique({ where: { recipient_channel: { recipient, channel } } });
      if (out) throw bad("This recipient has opted out of marketing messages on this channel");
    }

    return prisma.messageOutbox.create({
      data: {
        channel,
        category,
        recipient,
        subject: channel === "EMAIL" ? subject || "(no subject)" : null,
        body,
        templateCode: input.templateCode ?? null,
        relatedType: input.relatedType ?? null,
        relatedId: input.relatedId ?? null,
        createdById: input.createdById ?? null,
      },
    });
  }

  /** Receipt for a sale / invoice, sent to the customer on file. */
  static async shareSale(ctx: MessagingCtx, saleId: string, channel: string, to?: string) {
    if (!isChannel(channel)) throw bad("Choose a channel: EMAIL, SMS or WHATSAPP");
    const doc = await prisma.salesDocument.findUnique({ where: { id: saleId }, include: { customer: true } });
    if (!doc) throw nf("Sale not found");
    if (ctx.branchIds && !ctx.branchIds.includes(doc.branchId)) {
      throw new AppError(ErrorCode.FORBIDDEN, 403, "That sale belongs to another branch");
    }
    const target = (to ?? (channel === "EMAIL" ? doc.customer?.email : doc.customer?.phone) ?? "").trim();
    if (!target) throw bad(`No ${channel === "EMAIL" ? "email address" : "phone number"} on file for this customer. Enter one to send to.`);
    const balance = Number(doc.balance ?? 0);
    return MessagingService.enqueue({
      channel,
      to: target,
      templateCode: `SALE_RECEIPT_${channel}`,
      vars: {
        customer: doc.customer?.name ?? "customer",
        number: doc.invoiceNumber ?? doc.documentId,
        date: doc.issueDate.toLocaleDateString("en-KE"),
        total: fmt(doc.total),
        paid: fmt(doc.paidAmount),
        balance: fmt(balance),
        balanceLine: balance > 0 ? `, balance KSh ${fmt(balance)}` : "",
        shop: process.env.SHOP_NAME || "",
      },
      relatedType: "SALES_DOCUMENT",
      relatedId: doc.id,
      createdById: ctx.userId,
    });
  }

  // ------------------------------------------------------------ outbox admin

  static status() {
    return providerStatus();
  }

  static async list(q: { status?: string; channel?: string; search?: string; take?: number }) {
    const where: any = {};
    if (q.status) where.status = q.status;
    if (q.channel) where.channel = q.channel;
    if (q.search) where.OR = [{ recipient: { contains: q.search, mode: "insensitive" } }, { body: { contains: q.search, mode: "insensitive" } }];
    const [rows, counts] = await Promise.all([
      prisma.messageOutbox.findMany({ where, orderBy: { createdAt: "desc" }, take: Math.min(q.take ?? 100, 300) }),
      prisma.messageOutbox.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);
    return { rows, counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])) };
  }

  static async retry(id: string) {
    const m = await prisma.messageOutbox.findUnique({ where: { id } });
    if (!m) throw nf("Message not found");
    if (!["FAILED", "CANCELLED"].includes(m.status)) throw bad("Only failed or cancelled messages can be retried");
    return prisma.messageOutbox.update({ where: { id }, data: { status: "QUEUED", attempts: 0, nextAttemptAt: new Date(), lastError: null } });
  }

  static async cancel(id: string) {
    const r = await prisma.messageOutbox.updateMany({ where: { id, status: "QUEUED" }, data: { status: "CANCELLED" } });
    if (r.count === 0) throw bad("Only queued messages can be cancelled");
    return prisma.messageOutbox.findUnique({ where: { id } });
  }

  static async optOut(recipient: string, channel: string) {
    if (!isChannel(channel)) throw bad("Invalid channel");
    const r = channel === "EMAIL" ? normalizeEmail(recipient) : normalizePhone(recipient);
    return prisma.messageOptOut.upsert({ where: { recipient_channel: { recipient: r, channel } }, update: {}, create: { recipient: r, channel } });
  }

  // ------------------------------------------------------------ worker

  /** Deliver everything that is due. Safe to run from several processes: rows are claimed atomically. */
  static async processDue(limit = 20) {
    // A crash mid-send leaves rows in SENDING; put them back after 5 minutes.
    await prisma.messageOutbox.updateMany({
      where: { status: "SENDING", updatedAt: { lt: new Date(Date.now() - 5 * 60_000) } },
      data: { status: "QUEUED" },
    });

    const due = await prisma.messageOutbox.findMany({
      where: { status: "QUEUED", nextAttemptAt: { lte: new Date() } },
      orderBy: { nextAttemptAt: "asc" },
      take: limit,
    });

    let sent = 0;
    for (const m of due) {
      const claim = await prisma.messageOutbox.updateMany({
        where: { id: m.id, status: "QUEUED" },
        data: { status: "SENDING", attempts: { increment: 1 } },
      });
      if (claim.count === 0) continue;
      const attempt = m.attempts + 1;
      try {
        const r = await deliver(m.channel as Channel, { to: m.recipient, subject: m.subject, body: m.body });
        await prisma.messageOutbox.update({
          where: { id: m.id },
          data: { status: "SENT", sentAt: new Date(), provider: r.provider, providerMessageId: r.messageId ?? null, lastError: null },
        });
        sent += 1;
      } catch (e) {
        const msg = (e instanceof Error ? e.message : "Send failed").slice(0, 500);
        const final = e instanceof PermanentSendError || attempt >= m.maxAttempts;
        await prisma.messageOutbox.update({
          where: { id: m.id },
          data: final
            ? { status: "FAILED", lastError: msg }
            : { status: "QUEUED", lastError: msg, nextAttemptAt: new Date(Date.now() + BACKOFF_MS[Math.min(attempt - 1, BACKOFF_MS.length - 1)]) },
        });
        logger.warn({ id: m.id, channel: m.channel, attempt, final, err: msg }, "Message delivery failed");
      }
    }
    return { due: due.length, sent };
  }
}

let timer: NodeJS.Timeout | null = null;
let busy = false;

/** Start the in-process delivery loop (every 15s). Set MESSAGING_WORKER=off to run it elsewhere. */
export function startMessageWorker() {
  if (timer || (process.env.MESSAGING_WORKER ?? "").toLowerCase() === "off") return;
  timer = setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      await MessagingService.processDue();
    } catch (err) {
      logger.error({ err }, "Message worker tick failed");
    } finally {
      busy = false;
    }
  }, 15_000);
  timer.unref();
  logger.info("📨 Message worker started");
}

export default MessagingService;
