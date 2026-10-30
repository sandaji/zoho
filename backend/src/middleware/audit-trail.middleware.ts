/**
 * Audit trail — records WHO did WHAT, WHEN and FROM WHERE for every
 * state-changing API request, automatically, so coverage doesn't depend on each
 * feature remembering to call logAudit().
 *
 * One AuditLog row per request that changed (or tried to change) something:
 *   entityType  the resource path, e.g. "purchasing/orders"
 *   entityId    the record's id (from the URL, else from the created record)
 *   action      CREATE (POST) / UPDATE (PATCH, PUT) / DELETE
 *   userId      the authenticated user (null for logins that failed)
 *   ipAddress   caller's IP
 *   changes     { method, path, operation, statusCode, outcome, body (secrets redacted) }
 *
 * Logged: successful requests, plus 401/403 refusals on write routes (an
 * attempt to do something you aren't allowed to is itself worth knowing about).
 * Reads (GET) are not logged.
 */
import { Request, Response, NextFunction } from "express";
import { prisma } from "@core/database/db";
import { logger } from "@core/utils/logger";

const WRITE_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

// High-volume, side-effect-free POSTs that would only add noise.
const SKIP = [
  /^\/v1\/pos\/products\/search/,
  /^\/v1\/notifications/,
  /^\/v1\/auth\/refresh/,
  /^\/v1\/auth\/logout/,
];

const SECRET_KEY = /pass(word)?|token|secret|authorization|otp|pin$|cvv|card_?number/i;
const ID_SEGMENT = /^(c[a-z0-9]{20,}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d+)$/i;
const MAX_BODY_CHARS = 4000;

function redact(value: unknown, depth = 0): unknown {
  if (value === null || typeof value !== "object") return value;
  if (depth > 4) return "[nested]";
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SECRET_KEY.test(k) ? "[redacted]" : redact(v, depth + 1);
  }
  return out;
}

function safeBody(body: unknown): unknown {
  if (!body || typeof body !== "object" || Object.keys(body as object).length === 0) return undefined;
  const clean = redact(body);
  const text = JSON.stringify(clean);
  return text.length > MAX_BODY_CHARS ? { truncated: true, preview: text.slice(0, MAX_BODY_CHARS) } : clean;
}

export function auditTrail(req: Request, res: Response, next: NextFunction) {
  if (!WRITE_METHODS.has(req.method)) return next();

  const path = req.originalUrl.split("?")[0];
  if (SKIP.some((re) => re.test(path))) return next();

  // Capture the response body so a created record's id can be recorded.
  let responseBody: any;
  const originalJson = res.json.bind(res);
  res.json = (body?: any) => {
    responseBody = body;
    return originalJson(body);
  };

  res.on("finish", () => {
    try {
      const status = res.statusCode;
      const isLogin = /^\/v1\/auth\/login/.test(path);
      const refused = status === 401 || status === 403;
      if (status >= 400 && !refused) return;

      const user = (req as any).user as { userId?: string } | undefined;
      let userId: string | null = user?.userId ?? null;
      if (!userId && isLogin && status < 400) {
        userId = responseBody?.data?.user?.id ?? responseBody?.user?.id ?? null;
      }
      // A refused request from nobody (e.g. bad token) has no one to attribute to.
      if (!userId && !isLogin) return;

      // Resource path: segments up to the first id; anything after is the operation.
      const segments = path.replace(/^\/v1\//, "").split("/").filter(Boolean);
      const idIndex = segments.findIndex((s) => ID_SEGMENT.test(s));
      const resourceSegs = idIndex === -1 ? segments : segments.slice(0, idIndex);
      const operation = idIndex === -1 ? null : (segments.slice(idIndex + 1).join("/") || null);
      const entityId =
        (idIndex !== -1 ? segments[idIndex] : null) ??
        responseBody?.data?.id ??
        responseBody?.id ??
        "-";

      const action = req.method === "POST" ? "CREATE" : req.method === "DELETE" ? "DELETE" : "UPDATE";

      void prisma.auditLog
        .create({
          data: {
            entityType: resourceSegs.join("/") || "unknown",
            entityId: String(entityId),
            action,
            ...(userId ? { user: { connect: { id: userId } } } : {}),
            ipAddress: req.ip ?? null,
            changes: {
              method: req.method,
              path,
              operation,
              statusCode: status,
              outcome: refused ? "REFUSED" : "OK",
              ...(isLogin ? { email: (req.body as any)?.email } : { body: safeBody(req.body) }),
              userAgent: req.get("user-agent")?.slice(0, 200),
            } as any,
          },
        })
        .catch((err) => logger.error({ err, path }, "Failed to write audit trail"));
    } catch (err) {
      logger.error({ err }, "Audit trail middleware error");
    }
  });

  next();
}
