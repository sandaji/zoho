"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logQueryMetrics = exports.logSecurityEvent = exports.createChildLogger = exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
const isDev = process.env.NODE_ENV === "development";
// 1. Configure Main Logger
exports.logger = (0, pino_1.default)({
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
                    singleLine: false,
                    translateTime: "SYS:standard",
                    ignore: "pid,hostname",
                },
            },
        }
        : {
            serializers: {
                err: pino_1.default.stdSerializers.err,
            },
        }),
});
// 2. Child Logger for requests
const createChildLogger = (req) => {
    return exports.logger.child({
        requestId: req.id ?? "unknown",
        userId: req.userId,
        userRole: req.userRole,
    });
};
exports.createChildLogger = createChildLogger;
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const logSecurityEvent = (event, severity, details, userId) => {
    exports.logger.warn({
        event,
        severity,
        userId,
        ...details,
        timestamp: new Date().toISOString(),
    }, `[SECURITY ${severity.toUpperCase()}] ${event}`);
};
exports.logSecurityEvent = logSecurityEvent;
const logQueryMetrics = (operation, duration, success, error) => {
    if (success) {
        // Only log slow queries in production, but all in dev
        if (duration > 500 || (isDev && duration > 100)) {
            exports.logger.debug({ operation, duration }, `DB Query took ${duration}ms: ${operation}`);
        }
    }
    else {
        exports.logger.error({ operation, duration, error: error?.message }, `DB Query FAILED: ${operation}`);
    }
};
exports.logQueryMetrics = logQueryMetrics;
