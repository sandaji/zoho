"use strict";
/**
 * Custom Error Classes for ERP System
 * Provides structured error handling with HTTP status codes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = exports.ErrorCode = void 0;
exports.validationError = validationError;
exports.notFoundError = notFoundError;
exports.conflictError = conflictError;
exports.unauthorizedError = unauthorizedError;
exports.forbiddenError = forbiddenError;
exports.insufficientInventoryError = insufficientInventoryError;
exports.invalidStatusError = invalidStatusError;
exports.databaseError = databaseError;
exports.internalError = internalError;
var ErrorCode;
(function (ErrorCode) {
    // Validation errors (400)
    ErrorCode["BAD_REQUEST"] = "BAD_REQUEST";
    ErrorCode["INVALID_INPUT"] = "INVALID_INPUT";
    ErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorCode["MISSING_FIELD"] = "MISSING_FIELD";
    // Authentication & Authorization errors (401, 403)
    ErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    ErrorCode["FORBIDDEN"] = "FORBIDDEN";
    ErrorCode["TOKEN_EXPIRED"] = "TOKEN_EXPIRED";
    // Resource errors (404, 409)
    ErrorCode["NOT_FOUND"] = "NOT_FOUND";
    ErrorCode["ALREADY_EXISTS"] = "ALREADY_EXISTS";
    ErrorCode["CONFLICT"] = "CONFLICT";
    // Business logic errors (422)
    ErrorCode["INSUFFICIENT_INVENTORY"] = "INSUFFICIENT_INVENTORY";
    ErrorCode["INVALID_STATUS"] = "INVALID_STATUS";
    ErrorCode["OPERATION_NOT_ALLOWED"] = "OPERATION_NOT_ALLOWED";
    // System errors (500)
    ErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
    ErrorCode["DATABASE_ERROR"] = "DATABASE_ERROR";
    ErrorCode["SERVICE_UNAVAILABLE"] = "SERVICE_UNAVAILABLE";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
class AppError extends Error {
    constructor(code, statusCode, message, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.name = "AppError";
        Object.setPrototypeOf(this, AppError.prototype);
    }
    toJSON() {
        return {
            code: this.code,
            message: this.message,
            details: this.details,
            timestamp: new Date().toISOString(),
        };
    }
}
exports.AppError = AppError;
// Factory functions for common errors
function validationError(message, details) {
    return new AppError(ErrorCode.VALIDATION_ERROR, 400, message, details);
}
function notFoundError(resource, id) {
    return new AppError(ErrorCode.NOT_FOUND, 404, `${resource} not found${id ? ` (ID: ${id})` : ""}`);
}
function conflictError(message, details) {
    return new AppError(ErrorCode.CONFLICT, 409, message, details);
}
function unauthorizedError(message = "Unauthorized") {
    return new AppError(ErrorCode.UNAUTHORIZED, 401, message);
}
function forbiddenError(message = "Forbidden") {
    return new AppError(ErrorCode.FORBIDDEN, 403, message);
}
function insufficientInventoryError(productId, required, available) {
    return new AppError(ErrorCode.INSUFFICIENT_INVENTORY, 422, `Insufficient inventory for product ${productId}`, {
        productId,
        required,
        available,
    });
}
function invalidStatusError(currentStatus, attemptedStatus) {
    return new AppError(ErrorCode.INVALID_STATUS, 422, `Cannot transition from ${currentStatus} to ${attemptedStatus}`);
}
function databaseError(details) {
    return new AppError(ErrorCode.DATABASE_ERROR, 500, "A database error occurred", details);
}
function internalError(message = "Internal server error", details) {
    return new AppError(ErrorCode.INTERNAL_ERROR, 500, message, details);
}
