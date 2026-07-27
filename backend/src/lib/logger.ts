import pino from "pino";
import type { Request } from "express";
import pc from "picocolors";

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
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
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
            // customColors overrides default level colors for more pop
            customColors: "err:red,warn:yellow,info:cyan,debug:magenta",
            messageKey: "msg",
          },
        },
      }
    : {}),
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
  userId?: string,
) => {
  // Map severities to specific color treatments
  const severityColors: Record<string, (str: string) => string> = {
    low: pc.blue,
    medium: pc.yellow,
    high: pc.red,
    critical: (str: string) => pc.bgRed(pc.white(pc.bold(str))),
  };

  const colorize = severityColors[severity] || pc.white;
  const tag = colorize(`[SECURITY ${severity.toUpperCase()}]`);

  // Force output to production JSON without colors if not in dev,
  // otherwise apply the terminal colors to the message string.
  const msg = isDev
    ? `${tag} ${pc.magenta(event)}`
    : `[SECURITY ${severity.toUpperCase()}] ${event}`;

  logger.warn(
    {
      event,
      severity,
      userId,
      ...details,
      timestamp: new Date().toISOString(),
    },
    msg,
  );
};

export const logQueryMetrics = (
  operation: string,
  duration: number,
  success: boolean,
  error?: Error,
) => {
  const opText = isDev ? pc.cyan(operation) : operation;

  if (success) {
    if (duration > 500 || (isDev && duration > 100)) {
      // Color-code the duration: >500ms is red, otherwise yellow
      const timeText = isDev
        ? duration > 500
          ? pc.red(`${duration}ms`)
          : pc.yellow(`${duration}ms`)
        : `${duration}ms`;

      const msg = isDev
        ? `${pc.green("DB Query OK")} [${timeText}]: ${opText}`
        : `DB Query took ${duration}ms: ${operation}`;

      logger.debug({ operation, duration }, msg);
    }
  } else {
    const timeText = isDev ? pc.red(`${duration}ms`) : `${duration}ms`;
    const failTag = isDev
      ? pc.bgRed(pc.white(" DB Query FAILED "))
      : "DB Query FAILED";

    const msg = isDev
      ? `${failTag} [${timeText}]: ${opText}`
      : `DB Query FAILED: ${operation}`;

    logger.error({ operation, duration, error: error?.message }, msg);
  }
};
