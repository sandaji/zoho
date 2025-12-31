/**
 * Custom Error Classes for ERP System
 * Provides structured error handling with HTTP status codes
 */

export enum ErrorCode {
  // Validation errors (400)
  BAD_REQUEST = "BAD_REQUEST",
  INVALID_INPUT = "INVALID_INPUT",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  MISSING_FIELD = "MISSING_FIELD",

  // Authentication & Authorization errors (401, 403)
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",

  // Resource errors (404, 409)
  NOT_FOUND = "NOT_FOUND",
  ALREADY_EXISTS = "ALREADY_EXISTS",
  CONFLICT = "CONFLICT",

  // Business logic errors (422)
  INSUFFICIENT_INVENTORY = "INSUFFICIENT_INVENTORY",
  INVALID_STATUS = "INVALID_STATUS",
  OPERATION_NOT_ALLOWED = "OPERATION_NOT_ALLOWED",

  // System errors (500)
  INTERNAL_ERROR = "INTERNAL_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
}

export interface ErrorResponse {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public statusCode: number,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON(): ErrorResponse {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: new Date().toISOString(),
    };
  }
}

// Factory functions for common errors

export function validationError(
  message: string,
  details?: Record<string, unknown>
): AppError {
  return new AppError(ErrorCode.VALIDATION_ERROR, 400, message, details);
}

export function notFoundError(
  resource: string,
  id?: string | number
): AppError {
  return new AppError(
    ErrorCode.NOT_FOUND,
    404,
    `${resource} not found${id ? ` (ID: ${id})` : ""}`
  );
}

export function conflictError(
  message: string,
  details?: Record<string, unknown>
): AppError {
  return new AppError(ErrorCode.CONFLICT, 409, message, details);
}

export function unauthorizedError(message = "Unauthorized"): AppError {
  return new AppError(ErrorCode.UNAUTHORIZED, 401, message);
}

export function forbiddenError(message = "Forbidden"): AppError {
  return new AppError(ErrorCode.FORBIDDEN, 403, message);
}

export function insufficientInventoryError(
  productId: string,
  required: number,
  available: number
): AppError {
  return new AppError(
    ErrorCode.INSUFFICIENT_INVENTORY,
    422,
    `Insufficient inventory for product ${productId}`,
    {
      productId,
      required,
      available,
    }
  );
}

export function invalidStatusError(
  currentStatus: string,
  attemptedStatus: string
): AppError {
  return new AppError(
    ErrorCode.INVALID_STATUS,
    422,
    `Cannot transition from ${currentStatus} to ${attemptedStatus}`
  );
}

export function databaseError(details?: Record<string, unknown>): AppError {
  return new AppError(
    ErrorCode.DATABASE_ERROR,
    500,
    "A database error occurred",
    details
  );
}

export function internalError(
  message = "Internal server error",
  details?: Record<string, unknown>
): AppError {
  return new AppError(ErrorCode.INTERNAL_ERROR, 500, message, details);
}
