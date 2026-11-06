/**
 * API keys for the public API (mobile apps, e-commerce sites, partners).
 *
 * A key is shown ONCE when created. Only its SHA-256 hash is stored, so a database leak does not
 * leak working keys. Each key has scopes, an optional branch restriction, an expiry and a
 * per-minute rate limit.
 */
import { createHash, randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "@core/database/db";
import { AppError, ErrorCode } from "@core/errors/errors";

export const API_SCOPES = ["products:read", "stock:read"] as const;
export type ApiScope = (typeof API_SCOPES)[number];

const bad = (m: string) => new AppError(ErrorCode.VALIDATION_ERROR, 400, m);
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function newKey() {
  const bytes = randomBytes(40);
  let body = "";
  for (let i = 0; i < 40; i++) body += ALPHABET[bytes[i] % ALPHABET.length];
  return `zk_live_${body}`;
}

export interface ApiPrincipal {
  id: string;
  name: string;
  scopes: string[];
  branchId: string | null;
}

export class ApiKeyService {
  static async create(userId: string, d: { name: string; scopes: string[]; branchId?: string | null; expiresAt?: string | null; rateLimitPerMin?: number }) {
    const name = String(d.name ?? "").trim();
    if (name.length < 3) throw bad("Give the key a name, such as the app that will use it");
    const scopes = Array.from(new Set((d.scopes ?? []).map(String)));
    if (scopes.length === 0) throw bad("Pick at least one scope");
    const unknown = scopes.filter((s) => !(API_SCOPES as readonly string[]).includes(s));
    if (unknown.length) throw bad(`Unknown scope: ${unknown.join(", ")}`);
    let expiresAt: Date | null = null;
    if (d.expiresAt) {
      expiresAt = new Date(d.expiresAt);
      if (isNaN(+expiresAt) || expiresAt <= new Date()) throw bad("Expiry must be a future date");
    }
    const limit = Math.floor(Number(d.rateLimitPerMin ?? 60));
    if (!(limit >= 1 && limit <= 6000)) throw bad("Rate limit must be between 1 and 6000 requests a minute");

    const key = newKey();
    const row = await prisma.apiKey.create({
      data: { name, keyPrefix: key.slice(0, 12), keyHash: sha256(key), scopes, branchId: d.branchId || null, expiresAt, rateLimitPerMin: limit, createdById: userId },
      omit: { keyHash: true },
    });
    return { ...row, key }; // the only time the full key is ever visible
  }

  static list() {
    return prisma.apiKey.findMany({ orderBy: { createdAt: "desc" }, omit: { keyHash: true } });
  }

  static async revoke(id: string) {
    const r = await prisma.apiKey.updateMany({ where: { id, revokedAt: null }, data: { isActive: false, revokedAt: new Date() } });
    if (r.count === 0) throw bad("Key not found or already revoked");
    return { ok: true };
  }

  static async authenticate(raw: string): Promise<(ApiPrincipal & { rateLimitPerMin: number }) | null> {
    if (!/^zk_live_[A-Za-z0-9]{40}$/.test(raw)) return null;
    const k = await prisma.apiKey.findUnique({ where: { keyHash: sha256(raw) } });
    if (!k || !k.isActive || k.revokedAt) return null;
    if (k.expiresAt && k.expiresAt <= new Date()) return null;
    touch(k.id);
    return { id: k.id, name: k.name, scopes: k.scopes ?? [], branchId: k.branchId, rateLimitPerMin: k.rateLimitPerMin };
  }
}

// last_used_at is bookkeeping only: write it at most once a minute per key
const lastTouch = new Map<string, number>();
function touch(id: string) {
  const now = Date.now();
  if ((lastTouch.get(id) ?? 0) > now - 60_000) return;
  lastTouch.set(id, now);
  prisma.apiKey.update({ where: { id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
}

// Sliding-window rate limit, per key. Per server process: fine for one instance; use Redis if you scale out.
const hits = new Map<string, number[]>();
function allow(id: string, limit: number) {
  const now = Date.now();
  const recent = (hits.get(id) ?? []).filter((t) => t > now - 60_000);
  if (recent.length >= limit) {
    hits.set(id, recent);
    return { ok: false, remaining: 0, retryAfter: Math.max(1, Math.ceil((recent[0] + 60_000 - now) / 1000)) };
  }
  recent.push(now);
  hits.set(id, recent);
  return { ok: true, remaining: limit - recent.length, retryAfter: 0 };
}

const fail = (res: Response, status: number, message: string) => res.status(status).json({ status: "error", error: { message } });

/** Express middleware: require a valid API key that holds `scope`. */
export function apiKeyAuth(scope: ApiScope) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const header = req.header("x-api-key") ?? (req.header("authorization") ?? "").replace(/^Bearer\s+/i, "");
      const principal = header ? await ApiKeyService.authenticate(header.trim()) : null;
      if (!principal) return fail(res, 401, "Missing or invalid API key");
      if (!principal.scopes.includes(scope)) return fail(res, 403, `This key does not have the ${scope} scope`);
      const rl = allow(principal.id, principal.rateLimitPerMin);
      res.setHeader("X-RateLimit-Limit", String(principal.rateLimitPerMin));
      res.setHeader("X-RateLimit-Remaining", String(rl.remaining));
      if (!rl.ok) {
        res.setHeader("Retry-After", String(rl.retryAfter));
        return fail(res, 429, "Rate limit exceeded");
      }
      (req as any).apiKey = principal as ApiPrincipal;
      next();
    } catch (e) {
      next(e);
    }
  };
}

export default ApiKeyService;
