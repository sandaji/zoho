"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const logger_1 = require("./lib/logger");
const db_1 = require("./lib/db");
const errors_1 = require("./lib/errors");
const index_1 = __importDefault(require("./routes/index"));
const metrics_middleware_1 = require("./middleware/metrics.middleware");
const validation_middleware_1 = require("./middleware/validation.middleware");
const rate_limit_middleware_1 = require("./middleware/rate-limit.middleware");
const context_middleware_1 = require("./middleware/context.middleware");
async function createApp() {
    const app = (0, express_1.default)();
    // 1. GLOBAL MIDDLEWARE
    app.use((0, cors_1.default)({
        origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
        credentials: true,
    }));
    // Core observability middleware
    app.use(metrics_middleware_1.requestIdMiddleware);
    app.use(metrics_middleware_1.metricsMiddleware);
    app.use(context_middleware_1.contextMiddleware);
    // Body parsers and security
    app.use(express_1.default.json());
    app.use(express_1.default.urlencoded({ extended: true }));
    app.use(validation_middleware_1.sanitizeInputs);
    app.use(rate_limit_middleware_1.globalLimiter);
    // 2. DATABASE CONNECTION CHECK
    try {
        // FIX: Use queryRawUnsafe for simple checks (avoids template literal issues)
        await db_1.prisma.$queryRawUnsafe("SELECT 1");
        logger_1.logger.info("✅ Database connected successfully (Prisma 7 + PgAdapter)");
    }
    catch (error) {
        logger_1.logger.error({ err: error }, "❌ Database connection failed");
        // In dev, we might want to fail fast. In prod, maybe let it retry.
        if (process.env.NODE_ENV === "production")
            process.exit(1);
    }
    // 3. HEALTH & METRICS
    app.get("/health", (_req, res) => {
        res.json({
            status: "ok",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV,
        });
    });
    app.get("/metrics", metrics_middleware_1.metricsEndpoint);
    // 4. API ROUTES
    app.use("/v1", index_1.default);
    // 5. 404 HANDLER
    app.use((req, res) => {
        res.status(404).json({
            success: false,
            error: {
                code: "NOT_FOUND",
                message: `Route ${req.method} ${req.path} not found`,
            },
        });
    });
    // 6. GLOBAL ERROR HANDLER
    app.use((error, req, res, _next) => {
        // Log the error with context
        logger_1.logger.error({ err: error, path: req.path }, "Unhandled Exception");
        if (error instanceof errors_1.AppError) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.toJSON(),
            });
        }
        const isDev = process.env.NODE_ENV === "development";
        return res.status(500).json({
            success: false,
            error: {
                code: "INTERNAL_ERROR",
                message: isDev ? error.message : "An internal error occurred",
                ...(isDev && { stack: error.stack }),
            },
        });
    });
    return app;
}
