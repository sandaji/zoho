import pino from "pino";
import type { Request } from "express";

const isDev = process.env.NODE_ENV === "development";

if (isDev) {
  // Ensure color output even when the output is piped (helpful in CI or tooling)
  process.env.FORCE_COLOR = process.env.FORCE_COLOR || "1";
}

// 1. Configure Main Logger
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  base: {
    environment: process.env.NODE_ENV,
    version: process.env.APP_VERSION || "1.0.0",
  },
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            levelFirst: true,
            singleLine: false,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      }
    : {
        serializers: {
          err: pino.stdSerializers.err,
        },
      }),
});

// 2. Child Logger for requests
export const createChildLogger = (req: Request) => {
  return logger.child({
    requestId: (req as any).id ?? "unknown",
    userId: (req as any).userId,
    userRole: (req as any).userRole,
  });
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const logSecurityEvent = (
  event: string,
  severity: "low" | "medium" | "high" | "critical",
  details: Record<string, unknown>,
  userId?: string
) => {
  logger.warn(
    {
      event,
      severity,
      userId,
      ...details,
      timestamp: new Date().toISOString(),
    },
    `[SECURITY ${severity.toUpperCase()}] ${event}`
  );
};

export const logQueryMetrics = (
  operation: string,
  duration: number,
  success: boolean,
  error?: Error
) => {
  if (success) {
    // Only log slow queries in production, but all in dev
    if (duration > 500 || (isDev && duration > 100)) {
      logger.debug({ operation, duration }, `DB Query took ${duration}ms: ${operation}`);
    }
  } else {
    logger.error(
      { operation, duration, error: error?.message },
      `DB Query FAILED: ${operation}`
    );
  }
};