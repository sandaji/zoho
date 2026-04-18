/**
 * API Response Formatter
 * Ensures all API responses follow a consistent structure
 */

import { Response } from "express";
import { AppError, ErrorCode } from "./errors";

export interface StandardResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
  };
  timestamp: string;
}

/**
 * Send a successful response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
): Response {
  return res.status(statusCode).json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  } as StandardResponse<T>);
}

/**
 * Send an error response
 */
export function sendError(
  res: Response,
  error: AppError | Error,
  defaultStatusCode = 500,
): Response {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    } as StandardResponse);
  }

  return res.status(defaultStatusCode).json({
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: error.message || "An internal error occurred",
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  } as StandardResponse);
}

/**
 * Send a paginated response
 */
export function sendPaginated<T>(
  res: Response,
  items: T[],
  total: number,
  page: number,
  pageSize: number,
  statusCode = 200,
): Response {
  return res.status(statusCode).json({
    success: true,
    data: {
      items,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    },
    timestamp: new Date().toISOString(),
  } as StandardResponse);
}
