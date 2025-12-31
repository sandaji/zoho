"use strict";
/**
 * Authentication & Authorization Middleware
 * Protects routes and validates user roles
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.roleMiddleware = roleMiddleware;
exports.adminOnly = adminOnly;
exports.managerOrAdmin = managerOrAdmin;
exports.managerAccess = managerAccess;
const jwt_1 = require("./jwt");
const errors_1 = require("./errors");
const logger_1 = require("./logger");
// TokenPayload and Express Request extension now in types/index.ts
/**
 * Extract token from Authorization header
 */
function extractToken(authHeader) {
    if (!authHeader)
        return null;
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0]?.toLowerCase() !== "bearer" || !parts[1])
        return null;
    return parts[1];
}
/**
 * Middleware to authenticate JWT token
 */
function authMiddleware(req, _res, next) {
    try {
        const token = extractToken(req.headers.authorization);
        if (!token) {
            throw new errors_1.AppError(errors_1.ErrorCode.UNAUTHORIZED, 401, "Missing or invalid authorization header");
        }
        const payload = (0, jwt_1.verifyToken)(token);
        req.user = payload;
        logger_1.logger.debug({ userId: payload.userId }, "User authenticated");
        next();
    }
    catch (error) {
        if (error instanceof errors_1.AppError) {
            next(error);
        }
        else {
            next(new errors_1.AppError(errors_1.ErrorCode.UNAUTHORIZED, 401, "Invalid or expired token", {
                originalError: error.message,
            }));
        }
    }
}
/**
 * Middleware to check user role
 */
function roleMiddleware(allowedRoles) {
    return (req, _res, next) => {
        try {
            if (!req.user) {
                throw new errors_1.AppError(errors_1.ErrorCode.UNAUTHORIZED, 401, "User not authenticated");
            }
            if (!allowedRoles.includes(req.user.role)) {
                throw new errors_1.AppError(errors_1.ErrorCode.FORBIDDEN, 403, "Insufficient permissions for this action", { requiredRoles: allowedRoles, userRole: req.user.role });
            }
            logger_1.logger.debug({
                userId: req.user.userId,
                role: req.user.role,
            }, "User role authorized");
            next();
        }
        catch (error) {
            next(error);
        }
    };
}
/**
 * Middleware to check admin role
 */
function adminOnly(req, _res, next) {
    roleMiddleware(["admin"])(req, _res, next);
}
/**
 * Middleware to check manager or admin role
 */
function managerOrAdmin(req, _res, next) {
    roleMiddleware(["manager", "admin"])(req, _res, next);
}
/**
 * Middleware to check branch manager, manager, or admin role
 */
function managerAccess(req, _res, next) {
    roleMiddleware(["branch_manager", "manager", "admin"])(req, _res, next);
}
