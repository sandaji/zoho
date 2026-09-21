/**
 * Authentication & Authorization Middleware
 * Protects routes and validates user roles
 */

import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
export { verifyToken };

import { AppError, ErrorCode } from "../errors/errors";
import { logger } from "../utils/logger";
import { asyncContext } from "../async-context";

// TokenPayload and Express Request extension now in types/index.ts

/**
 * Extract token from Authorization header
 */
function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0]?.toLowerCase() !== "bearer" || !parts[1])
    return null;
  return parts[1];
}

/**
 * Middleware to authenticate JWT token
 */
export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  try {
    const token = extractToken(req.headers.authorization);

    if (!token) {
      throw new AppError(
        ErrorCode.UNAUTHORIZED,
        401,
        "Missing or invalid authorization header",
      );
    }

    const payload = verifyToken(token);
    req.user = payload;
    logger.debug({ userId: payload.userId }, "User authenticated");

    // Bind the authenticated user to the async request context that db.ts reads
    // (branch isolation, audit-log user).
    //
    // This has to happen HERE. The global contextMiddleware in app.ts runs before
    // any route authenticates, so it captured an empty user (branch isolation
    // silently never applied), and it also runs before express.json(), where
    // AsyncLocalStorage context is commonly lost across the body-stream callbacks
    // on POST/PATCH requests. authMiddleware runs after body parsing, so a context
    // created here survives into the route handlers and their queries.
    asyncContext.run(
      {
        userId: payload.userId,
        branchId: payload.branchId ?? undefined,
        role: payload.role,
        ipAddress: (req.headers["x-forwarded-for"] as string) || req.ip,
        userAgent: req.headers["user-agent"],
      },
      () => next(),
    );
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(
        new AppError(ErrorCode.UNAUTHORIZED, 401, "Invalid or expired token", {
          originalError: (error as Error).message,
        }),
      );
    }
  }
}

/**
 * Middleware to check user role
 */
export function roleMiddleware(
  allowedRoles: Array<"admin" | "manager" | "branch_manager" | "hr" | "user">,
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AppError(
          ErrorCode.UNAUTHORIZED,
          401,
          "User not authenticated",
        );
      }

      if (!allowedRoles.includes(req.user.role as any)) {
        throw new AppError(
          ErrorCode.FORBIDDEN,
          403,
          "Insufficient permissions for this action",
          { requiredRoles: allowedRoles, userRole: req.user.role },
        );
      }

      logger.debug(
        {
          userId: req.user.userId,
          role: req.user.role,
        },
        "User role authorized",
      );
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to check admin role
 */
export function adminOnly(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  roleMiddleware(["admin"])(req, _res, next);
}

/**
 * Middleware to check manager or admin role
 */
export function managerOrAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  roleMiddleware(["manager", "admin"])(req, _res, next);
}

/**
 * Middleware to check branch manager, manager, or admin role
 */
export function managerAccess(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  roleMiddleware(["branch_manager", "manager", "admin"])(req, _res, next);
}
