/**
 * Read-only roles. A user whose every assigned role is `auditor` may look at
 * anything their permissions allow but can never change business data, even if a
 * write permission is ticked on the role by mistake. Auditors may still raise findings
 * and maintain the risk register, and sign out / refresh their session.
 */
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { prisma } from "../database/db";
import { AppError, ErrorCode } from "../errors/errors";
import { logger } from "../utils/logger";

const READ_ONLY_ROLE_CODES = ["auditor"];
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
// Paths (relative to the API router) an auditor may still write to.
const ALLOWED_WRITE_PREFIXES = ["/auth", "/audit-findings", "/risk-register", "/notifications"];

const TTL_MS = 60_000;
const cache = new Map<string, { at: number; readOnly: boolean }>();

async function isReadOnlyUser(userId: string): Promise<boolean> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.readOnly;
  const rows = await prisma.roleAssignment.findMany({ where: { userId }, select: { role: { select: { code: true } } } });
  const readOnly = rows.length > 0 && rows.every((r) => READ_ONLY_ROLE_CODES.includes(r.role.code));
  cache.set(userId, { at: Date.now(), readOnly });
  return readOnly;
}

export async function readOnlyRoleGuard(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (SAFE_METHODS.has(req.method)) return next();
  if (ALLOWED_WRITE_PREFIXES.some((p) => req.path === p || req.path.startsWith(`${p}/`))) return next();

  const header = req.headers.authorization;
  const token = header?.toLowerCase().startsWith("bearer ") ? header.slice(7) : null;
  if (!token) return next(); // unauthenticated calls are the route's own business

  try {
    const { userId } = verifyToken(token);
    if (userId && (await isReadOnlyUser(userId))) {
      return next(
        new AppError(ErrorCode.FORBIDDEN, 403, "Auditor accounts are read-only. You can raise findings and update the risk register."),
      );
    }
  } catch (err) {
    // An invalid token is rejected by authMiddleware on the route itself; a failed role lookup must not lock everyone out.
    if (!(err instanceof Error) || !/token|jwt|expired|signature/i.test(err.message)) {
      logger.error({ err }, "Read-only role check failed");
    }
  }
  next();
}
