/**
 * Rate Limiting Middleware
 * backend/src/middleware/rate-limit.middleware.ts
 */

import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { logger, logSecurityEvent } from "../lib/logger"; // Now this works!

// ============================================================================
// GLOBAL RATE LIMITER
// ============================================================================
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per IP
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn(
      { ip: req.ip, endpoint: req.path },
      "Global rate limit exceeded"
    );

    logSecurityEvent("rate_limit_exceeded", "medium", {
      ip: req.ip,
      endpoint: req.path,
    });

    res.status(429).json({
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please try again later.",
        retryAfter: (req as any).rateLimit?.resetTime,
      },
    });
  },
  skip: (req) => req.method === "OPTIONS" || req.url === "/health",
});

// ============================================================================
// AUTH LIMITER (Stricter)
// ============================================================================
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 Login attempts per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failures
  handler: (req: Request, res: Response) => {
    logger.warn(
      { ip: req.ip, email: req.body?.email },
      "Auth rate limit exceeded"
    );

    logSecurityEvent("auth_brute_force_attempt", "high", {
      ip: req.ip,
      email: req.body?.email,
    });

    res.status(429).json({
      success: false,
      error: {
        code: "TOO_MANY_LOGIN_ATTEMPTS",
        message: "Too many login attempts. Please try again later.",
      },
    });
  },
});

// ============================================================================
// USER-BASED RATE LIMITING (Memory Store)
// ============================================================================

// Note: In a cluster/multi-server setup, use Redis instead of this Map.
const userRateLimitStore = new Map<
  string,
  { count: number; resetTime: number }
>();

export const userBasedLimiter =
  (maxRequests: number, windowMs: number) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const userId = (req as any).userId;

    // If middleware is used on a public route by accident, skip logic
    if (!userId) {
      return next();
    }

    const now = Date.now();
    const record = userRateLimitStore.get(userId);

    // Reset or Initialize
    if (!record || record.resetTime < now) {
      userRateLimitStore.set(userId, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    record.count++;

    if (record.count > maxRequests) {
      logger.warn({ userId, endpoint: req.path }, "User rate limit exceeded");

      res.status(429).json({
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "You have exceeded your request limit.",
          retryAfter: new Date(record.resetTime).toISOString(),
        },
      });
      return;
    }

    // Headers
    res.set("X-RateLimit-Limit", maxRequests.toString());
    res.set("X-RateLimit-Remaining", (maxRequests - record.count).toString());

    next();
  };

// Cleanup interval (Every hour)
setInterval(
  () => {
    const now = Date.now();
    for (const [key, val] of userRateLimitStore.entries()) {
      if (val.resetTime < now) userRateLimitStore.delete(key);
    }
  },
  60 * 60 * 1000
);
