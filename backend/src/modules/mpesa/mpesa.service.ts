/**
 * M-Pesa (Safaricom Daraja) STK push: ask the customer's phone to pay, receive the result on a
 * callback, and tie the receipt to the sale so one M-Pesa code can never pay for two sales.
 *
 * Environment:
 *   MPESA_ENV=sandbox|production
 *   MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET
 *   MPESA_SHORTCODE            paybill or till number
 *   MPESA_PASSKEY
 *   MPESA_TXN_TYPE=CustomerPayBillOnline|CustomerBuyGoodsOnline   (default CustomerPayBillOnline)
 *   MPESA_PARTY_B              optional; the till number when buying goods (defaults to the shortcode)
 *   MPESA_CALLBACK_URL         PUBLIC https URL of POST /api/v1/mpesa/callback on this server
 *   MPESA_CALLBACK_TOKEN       long random string; appended to the callback URL as ?token=...
 *
 * Safaricom does not sign callbacks, so the secret token in the URL is what authenticates them.
 */
import { prisma } from "@core/database/db";
import { AppError, ErrorCode } from "@core/errors/errors";
import { logger } from "@core/utils/logger";
import { normalizePhone } from "../messaging/providers";
import { WebhookService } from "../integrations/webhook.service";

const bad = (m: string) => new AppError(ErrorCode.VALIDATION_ERROR, 400, m);
const nf = (m: string) => new AppError(ErrorCode.NOT_FOUND, 404, m);
const env = (k: string) => (process.env[k] ?? "").trim();

const PENDING_TIMEOUT_MS = 5 * 60_000;

export interface MpesaCtx {
  userId: string;
  branchIds?: string[];
  canViewAll: boolean;
}

function configured() {
  return !!(env("MPESA_CONSUMER_KEY") && env("MPESA_CONSUMER_SECRET") && env("MPESA_SHORTCODE") && env("MPESA_PASSKEY") && env("MPESA_CALLBACK_URL") && env("MPESA_CALLBACK_TOKEN"));
}

const base = () => (env("MPESA_ENV").toLowerCase() === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke");

let tokenCache: { token: string; expires: number } | null = null;

async function accessToken(): Promise<string> {
  if (tokenCache && tokenCache.expires > Date.now() + 30_000) return tokenCache.token;
  const basic = Buffer.from(`${env("MPESA_CONSUMER_KEY")}:${env("MPESA_CONSUMER_SECRET")}`).toString("base64");
  const res = await fetch(`${base()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${basic}` },
    signal: AbortSignal.timeout(15000),
  });
  const json: any = await res.json().catch(() => null);
  if (!res.ok || !json?.access_token) throw new AppError(ErrorCode.SERVICE_UNAVAILABLE, 502, "Could not sign in to M-Pesa. Check the consumer key and secret.");
  tokenCache = { token: json.access_token, expires: Date.now() + Number(json.expires_in ?? 3000) * 1000 };
  return tokenCache.token;
}

async function daraja(path: string, body: unknown): Promise<any> {
  const token = await accessToken();
  let res: Response;
  try {
    res = await fetch(`${base()}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new AppError(ErrorCode.SERVICE_UNAVAILABLE, 502, "M-Pesa did not respond. Try again.");
  }
  const json: any = await res.json().catch(() => null);
  return { ok: res.ok, json };
}

function stamp() {
  // Daraja only needs the timestamp to match the one inside the password; use Nairobi time.
  return new Date(Date.now() + 3 * 3600_000).toISOString().replace(/\D/g, "").slice(0, 14);
}
const password = (ts: string) => Buffer.from(`${env("MPESA_SHORTCODE")}${env("MPESA_PASSKEY")}${ts}`).toString("base64");

export class MpesaService {
  static status() {
    return { configured: configured(), environment: env("MPESA_ENV").toLowerCase() === "production" ? "production" : "sandbox", transactionType: env("MPESA_TXN_TYPE") || "CustomerPayBillOnline" };
  }

  // ------------------------------------------------------------ initiate

  static async initiate(ctx: MpesaCtx, d: { phone: string; amount: number; reference?: string; description?: string; branchId?: string }) {
    if (!configured()) throw new AppError(ErrorCode.SERVICE_UNAVAILABLE, 503, "M-Pesa is not set up on this server yet. An administrator must add the Daraja settings.");
    let phone: string;
    try {
      phone = normalizePhone(d.phone).replace(/^\+/, "");
    } catch (e) {
      throw bad(e instanceof Error ? e.message : "Invalid phone number");
    }
    if (!/^254[17]\d{8}$/.test(phone)) throw bad("M-Pesa needs a Kenyan Safaricom number such as 0712 345 678");
    const amount = Math.floor(Number(d.amount));
    if (!(amount >= 1 && amount <= 250000)) throw bad("Amount must be between KSh 1 and KSh 250,000");
    const reference = (d.reference ?? "").replace(/[^\w\- ]/g, "").trim().slice(0, 12) || "PAYMENT";
    const description = (d.description ?? "Payment").slice(0, 13) || "Payment";
    if (d.branchId && ctx.branchIds && !ctx.branchIds.includes(d.branchId)) throw new AppError(ErrorCode.FORBIDDEN, 403, "That branch is not yours");

    // One live prompt per phone and amount stops a double-tap sending two prompts to the customer.
    const recent = await prisma.mpesaRequest.findFirst({
      where: { phone, amount, status: "PENDING", createdAt: { gt: new Date(Date.now() - 90_000) } },
    });
    if (recent) throw bad("A payment request for this number and amount is already waiting for the customer. Give it a minute.");

    const row = await prisma.mpesaRequest.create({
      data: { phone, amount, accountReference: reference, description, branchId: d.branchId ?? ctx.branchIds?.[0] ?? null, createdById: ctx.userId },
    });

    const ts = stamp();
    const callback = `${env("MPESA_CALLBACK_URL")}${env("MPESA_CALLBACK_URL").includes("?") ? "&" : "?"}token=${encodeURIComponent(env("MPESA_CALLBACK_TOKEN"))}`;
    try {
      const { json } = await daraja("/mpesa/stkpush/v1/processrequest", {
        BusinessShortCode: env("MPESA_SHORTCODE"),
        Password: password(ts),
        Timestamp: ts,
        TransactionType: env("MPESA_TXN_TYPE") || "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phone,
        PartyB: env("MPESA_PARTY_B") || env("MPESA_SHORTCODE"),
        PhoneNumber: phone,
        CallBackURL: callback,
        AccountReference: reference,
        TransactionDesc: description,
      });
      if (String(json?.ResponseCode) !== "0") {
        const msg = json?.errorMessage ?? json?.ResponseDescription ?? "M-Pesa rejected the request";
        await prisma.mpesaRequest.update({ where: { id: row.id }, data: { status: "FAILED", resultDesc: String(msg).slice(0, 300) } });
        throw bad(`M-Pesa: ${msg}`);
      }
      return prisma.mpesaRequest.update({
        where: { id: row.id },
        data: { checkoutRequestId: json.CheckoutRequestID, merchantRequestId: json.MerchantRequestID, resultDesc: json.CustomerMessage ?? null },
      });
    } catch (e) {
      // Whatever went wrong, this prompt never reached the customer: do not leave it PENDING.
      await prisma.mpesaRequest
        .update({ where: { id: row.id }, data: { status: "FAILED", resultDesc: (e instanceof Error ? e.message : "Request failed").slice(0, 300) } })
        .catch(() => undefined);
      throw e;
    }
  }

  // ------------------------------------------------------------ callback (public)

  /** Called by Safaricom. Always answers success so Safaricom does not retry; anything odd is logged. */
  static async handleCallback(token: string | undefined, payload: any) {
    const expected = env("MPESA_CALLBACK_TOKEN");
    if (!expected || token !== expected) {
      logger.warn("M-Pesa callback rejected: bad token");
      return false;
    }
    const cb = payload?.Body?.stkCallback;
    const checkoutId: string | undefined = cb?.CheckoutRequestID;
    if (!checkoutId) {
      logger.warn({ payload }, "M-Pesa callback without CheckoutRequestID");
      return true;
    }
    const row = await prisma.mpesaRequest.findUnique({ where: { checkoutRequestId: checkoutId } });
    if (!row) {
      logger.warn({ checkoutId }, "M-Pesa callback for an unknown request");
      return true;
    }
    if (row.status === "SUCCESS" && row.receiptNumber) return true; // duplicate delivery

    const code = Number(cb.ResultCode);
    const items: { Name: string; Value?: unknown }[] = cb.CallbackMetadata?.Item ?? [];
    const meta = (n: string) => items.find((i) => i.Name === n)?.Value;

    if (code === 0) {
      const receipt = meta("MpesaReceiptNumber") ? String(meta("MpesaReceiptNumber")) : null;
      const raw = meta("TransactionDate") ? String(meta("TransactionDate")) : "";
      const txnDate = /^\d{14}$/.test(raw)
        ? new Date(`${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T${raw.slice(8, 10)}:${raw.slice(10, 12)}:${raw.slice(12, 14)}+03:00`)
        : null;
      await prisma.mpesaRequest
        .update({
          where: { id: row.id },
          data: {
            status: "SUCCESS",
            resultCode: 0,
            resultDesc: String(cb.ResultDesc ?? "").slice(0, 300),
            receiptNumber: receipt,
            paidAmount: meta("Amount") != null ? Number(meta("Amount")) : row.amount,
            transactionDate: txnDate,
            callbackRaw: payload,
          },
        })
        .then(() =>
          WebhookService.emit("mpesa.payment_received", {
            requestId: row.id,
            receiptNumber: receipt,
            amount: meta("Amount") != null ? Number(meta("Amount")) : row.amount,
            phone: row.phone,
            reference: row.accountReference,
            transactionDate: txnDate,
          }),
        )
        .catch((err) => logger.error({ err, checkoutId }, "Could not store M-Pesa success"));
    } else {
      await prisma.mpesaRequest.update({
        where: { id: row.id },
        data: {
          status: code === 1032 ? "CANCELLED" : code === 1037 ? "TIMEOUT" : "FAILED",
          resultCode: code,
          resultDesc: String(cb.ResultDesc ?? "").slice(0, 300),
          callbackRaw: payload,
        },
      });
    }
    return true;
  }

  // ------------------------------------------------------------ read / reconcile

  private static scope(ctx: MpesaCtx, row: { createdById: string; branchId: string | null }) {
    if (ctx.canViewAll) {
      if (ctx.branchIds && row.branchId && !ctx.branchIds.includes(row.branchId)) throw nf("Request not found");
      return;
    }
    if (row.createdById !== ctx.userId) throw nf("Request not found");
  }

  static async list(ctx: MpesaCtx, q: { status?: string; search?: string }) {
    const where: any = {};
    if (q.status) where.status = q.status;
    if (q.search) where.OR = [{ phone: { contains: q.search.replace(/\D/g, "") || q.search } }, { receiptNumber: { contains: q.search.toUpperCase() } }, { accountReference: { contains: q.search, mode: "insensitive" } }];
    if (!ctx.canViewAll) where.createdById = ctx.userId;
    else if (ctx.branchIds) where.branchId = { in: ctx.branchIds };
    return prisma.mpesaRequest.findMany({ where, orderBy: { createdAt: "desc" }, take: 150, omit: { callbackRaw: true } });
  }

  static async get(ctx: MpesaCtx, id: string) {
    const row = await prisma.mpesaRequest.findUnique({ where: { id }, omit: { callbackRaw: true } });
    if (!row) throw nf("Request not found");
    MpesaService.scope(ctx, row);
    // Prompt unanswered for too long: stop showing it as pending.
    if (row.status === "PENDING" && Date.now() - row.createdAt.getTime() > PENDING_TIMEOUT_MS) {
      return prisma.mpesaRequest.update({ where: { id }, data: { status: "TIMEOUT", resultDesc: "No response from the customer" }, omit: { callbackRaw: true } });
    }
    return row;
  }

  /** Ask Safaricom directly when a callback never arrived. */
  static async query(ctx: MpesaCtx, id: string) {
    const row = await MpesaService.get(ctx, id);
    if (!["PENDING", "TIMEOUT"].includes(row.status) || !row.checkoutRequestId) return row;
    if (!configured()) throw new AppError(ErrorCode.SERVICE_UNAVAILABLE, 503, "M-Pesa is not set up on this server yet");
    const ts = stamp();
    const { json } = await daraja("/mpesa/stkpushquery/v1/query", {
      BusinessShortCode: env("MPESA_SHORTCODE"),
      Password: password(ts),
      Timestamp: ts,
      CheckoutRequestID: row.checkoutRequestId,
    });
    if (json?.ResultCode === undefined) return row; // still processing / no verdict
    const code = Number(json.ResultCode);
    if (code === 0) {
      // The query does not return the receipt number; it arrives with the callback.
      return prisma.mpesaRequest.update({
        where: { id },
        data: { status: "SUCCESS", resultCode: 0, resultDesc: "Confirmed by query (receipt number will appear when the callback arrives)", paidAmount: row.amount },
        omit: { callbackRaw: true },
      });
    }
    return prisma.mpesaRequest.update({
      where: { id },
      data: { status: code === 1032 ? "CANCELLED" : code === 1037 ? "TIMEOUT" : "FAILED", resultCode: code, resultDesc: String(json.ResultDesc ?? "").slice(0, 300) },
      omit: { callbackRaw: true },
    });
  }

  /** Does this M-Pesa code exist, is it paid, and is it already used on a sale? */
  static async verifyReceipt(code: string) {
    const receipt = code.trim().toUpperCase();
    const r = await prisma.mpesaRequest.findUnique({ where: { receiptNumber: receipt }, omit: { callbackRaw: true } });
    return r
      ? { known: true, status: r.status, amount: r.paidAmount ?? r.amount, phone: r.phone, usedOnSale: !!r.salesDocumentId }
      : { known: false as const };
  }

  // ------------------------------------------------------------ sale hook

  /**
   * Called inside the POS sale transaction when the customer paid by M-Pesa.
   *  - A code from one of our STK pushes is linked to the sale, must be successful, unused,
   *    and for at least the amount applied.
   *  - Any M-Pesa code (STK or typed by hand) already recorded on another payment is refused,
   *    which stops the same code being used for two sales.
   */
  static async claimReceipt(
    tx: any,
    input: { method: string; reference?: string | null; salesDocumentId: string; amount: number },
  ) {
    if (input.method !== "mpesa") return;
    const receipt = (input.reference ?? "").trim().toUpperCase();
    if (!receipt) return;

    const stk = await tx.mpesaRequest.findUnique({ where: { receiptNumber: receipt } });
    if (stk) {
      if (stk.status !== "SUCCESS") throw bad(`M-Pesa code ${receipt} is not a completed payment`);
      if (stk.salesDocumentId && stk.salesDocumentId !== input.salesDocumentId) throw bad(`M-Pesa code ${receipt} has already been used for another sale`);
      const paid = stk.paidAmount ?? stk.amount;
      if (input.amount > paid) throw bad(`M-Pesa code ${receipt} was for KSh ${Math.round(paid).toLocaleString()}, less than the KSh ${Math.round(input.amount).toLocaleString()} applied to this sale`);
      await tx.mpesaRequest.update({ where: { id: stk.id }, data: { salesDocumentId: input.salesDocumentId } });
      return;
    }

    const dup = await tx.payment.findFirst({ where: { method: input.method, reference: { equals: receipt, mode: "insensitive" } }, select: { id: true } });
    if (dup) throw bad(`M-Pesa code ${receipt} has already been recorded on another payment`);
  }
}

export default MpesaService;
