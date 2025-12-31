"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasRole = exports.checkJwt = exports.authorize = exports.authenticate = void 0;
const jwt_1 = require("../lib/jwt");
const errors_1 = require("../lib/errors");
/**
 * Middleware to authenticate JWT token from Authorization header
 */
const authenticate = (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            throw new errors_1.AppError(errors_1.ErrorCode.UNAUTHORIZED, 401, 'Authorization header is required');
        }
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0]?.toLowerCase() !== 'bearer') {
            throw new errors_1.AppError(errors_1.ErrorCode.UNAUTHORIZED, 401, 'Invalid authorization format. Use: Bearer <token>');
        }
        const token = parts[1];
        if (!token) {
            throw new errors_1.AppError(errors_1.ErrorCode.UNAUTHORIZED, 401, 'Token is required');
        }
        const payload = (0, jwt_1.verifyToken)(token);
        req.user = payload;
        next();
    }
    catch (error) {
        if (error instanceof errors_1.AppError) {
            next(error);
        }
        else {
            next(new errors_1.AppError(errors_1.ErrorCode.UNAUTHORIZED, 401, 'Invalid or expired token', { originalError: error.message }));
        }
    }
};
exports.authenticate = authenticate;
/**
 * Middleware to check if user has required roles
 * @param requiredRoles - Array of roles that are allowed
 */
const authorize = (requiredRoles) => {
    return (req, _res, next) => {
        if (!req.user) {
            next(new errors_1.AppError(errors_1.ErrorCode.UNAUTHORIZED, 401, 'User not authenticated'));
            return;
        }
        const userRole = req.user.role;
        if (!requiredRoles.includes(userRole)) {
            next(new errors_1.AppError(errors_1.ErrorCode.FORBIDDEN, 403, 'Insufficient permissions', { requiredRoles, userRole }));
            return;
        }
        next();
    };
};
exports.authorize = authorize;
/**
 * Placeholder middleware for legacy code
 * This would normally decode JWT and attach user to req
 */
const checkJwt = (req, _res, next) => {
    // This is replaced by authenticate middleware above
    // Keeping for backward compatibility
    if (!req.user) {
        // Mock user for demonstration purposes only
        req.user = {
            userId: 'user_123',
            email: 'demo@example.com',
            role: 'manager',
            branchId: 'branch_abc',
        };
    }
    next();
};
exports.checkJwt = checkJwt;
/**
 * Middleware to check if user has one of the required roles
 * @param requiredRoles - Array of roles that are allowed
 */
const hasRole = (requiredRoles) => {
    return (req, res, next) => {
        const userRole = req.user?.role;
        if (!userRole || !requiredRoles.includes(userRole)) {
            res.status(403).json({
                error: 'Forbidden: You do not have permission to perform this action.',
            });
            return;
        }
        next();
    };
};
exports.hasRole = hasRole;
