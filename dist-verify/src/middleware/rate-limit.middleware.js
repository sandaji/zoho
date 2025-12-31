"use strict";
/**
 * Rate Limiting Middleware
 * backend/src/middleware/rate-limit.middleware.ts
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userBasedLimiter = exports.authLimiter = exports.globalLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const logger_1 = require("../lib/logger"); // Now this works!
// ============================================================================
// GLOBAL RATE LIMITER
// ============================================================================
exports.globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per IP
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger_1.logger.warn({ ip: req.ip, endpoint: req.path }, "Global rate limit exceeded");
        (0, logger_1.logSecurityEvent)("rate_limit_exceeded", "medium", {
            ip: req.ip,
            endpoint: req.path,
        });
        res.status(429).json({
            success: false,
            error: {
                code: "RATE_LIMIT_EXCEEDED",
                message: "Too many requests. Please try again later.",
                retryAfter: req.rateLimit?.resetTime,
            },
        });
    },
    skip: (req) => req.method === "OPTIONS" || req.url === "/health",
});
// ============================================================================
// AUTH LIMITER (Stricter)
// ============================================================================
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5, // 5 Login attempts per 15 mins
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Only count failures
    handler: (req, res) => {
        logger_1.logger.warn({ ip: req.ip, email: req.body?.email }, "Auth rate limit exceeded");
        (0, logger_1.logSecurityEvent)("auth_brute_force_attempt", "high", {
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
const userRateLimitStore = new Map();
const userBasedLimiter = (maxRequests, windowMs) => (req, res, next) => {
    const userId = req.userId;
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
        logger_1.logger.warn({ userId, endpoint: req.path }, "User rate limit exceeded");
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
exports.userBasedLimiter = userBasedLimiter;
// Cleanup interval (Every hour)
setInterval(() => {
    const now = Date.now();
    for (const [key, val] of userRateLimitStore.entries()) {
        if (val.resetTime < now)
            userRateLimitStore.delete(key);
    }
}, 60 * 60 * 1000);
