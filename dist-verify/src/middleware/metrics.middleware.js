"use strict";
/**
 * Metrics Middleware
 * Collects and tracks request/response metrics for observability using Prometheus.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordServiceMetric = exports.recordEndpointMetric = exports.recordDBMetric = exports.recordMetric = exports.metricsEndpoint = exports.metricsMiddleware = exports.requestIdMiddleware = exports.register = void 0;
const uuid_1 = require("uuid");
const logger_1 = require("../lib/logger");
const prom_client_1 = require("prom-client");
// ============================================================================
// PROMETHEUS METRICS DEFINITION
// ============================================================================
exports.register = new prom_client_1.Registry();
// HTTP Metrics
const httpRequestDurationMicroseconds = new prom_client_1.Histogram({
    name: "http_request_duration_ms",
    help: "Duration of HTTP requests in ms",
    labelNames: ["method", "route", "code"],
    buckets: [50, 100, 200, 500, 1000, 2500, 5000], // buckets for response time from 50ms to 5s
});
const httpRequestsTotal = new prom_client_1.Counter({
    name: "http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "route", "code"],
});
// Custom Application Metrics
const customMetricGauge = new prom_client_1.Gauge({
    name: "app_custom_metric",
    help: "Custom application metric",
    labelNames: ["metric_name", "unit"],
});
const dbOperationDuration = new prom_client_1.Histogram({
    name: "db_operation_duration_ms",
    help: "Duration of database operations in ms",
    labelNames: ["operation", "status"],
    buckets: [50, 100, 250, 500, 1000],
});
const serviceOperationDuration = new prom_client_1.Histogram({
    name: "service_operation_duration_ms",
    help: "Duration of internal service calls in ms",
    labelNames: ["service", "operation", "status"],
    buckets: [50, 100, 250, 500, 1000],
});
// Register all metrics
exports.register.registerMetric(httpRequestDurationMicroseconds);
exports.register.registerMetric(httpRequestsTotal);
exports.register.registerMetric(customMetricGauge);
exports.register.registerMetric(dbOperationDuration);
exports.register.registerMetric(serviceOperationDuration);
const requestIdMiddleware = (req, _res, next) => {
    req.id = req.get("x-request-id") || (0, uuid_1.v4)();
    req.startTime = Date.now();
    next();
};
exports.requestIdMiddleware = requestIdMiddleware;
// ============================================================================
// METRICS COLLECTION MIDDLEWARE
// ============================================================================
const metricsMiddleware = (req, res, next) => {
    const { startTime } = req;
    const { method } = req;
    // Route is captured on finish to get the final resolved route
    res.on("finish", () => {
        const duration = Date.now() - startTime;
        const route = req.route ? req.route.path : req.path;
        const code = res.statusCode;
        // Record metrics
        httpRequestDurationMicroseconds.labels(method, route, String(code)).observe(duration);
        httpRequestsTotal.labels(method, route, String(code)).inc();
        // Log request
        if (route !== "/metrics") {
            logger_1.logger.info({
                requestId: req.id,
                method,
                url: req.originalUrl,
                statusCode: code,
                duration,
                userId: req.userId,
                userRole: req.userRole,
            }, `HTTP Request: ${method} ${req.originalUrl}`);
        }
    });
    next();
};
exports.metricsMiddleware = metricsMiddleware;
// ============================================================================
// METRICS ENDPOINT
// ============================================================================
const metricsEndpoint = async (_req, res) => {
    res.set("Content-Type", exports.register.contentType);
    res.end(await exports.register.metrics());
};
exports.metricsEndpoint = metricsEndpoint;
// ============================================================================
// CUSTOM METRICS TRACKING
// ============================================================================
const recordMetric = (name, value, unit = "count") => {
    customMetricGauge.labels(name, unit).set(value);
    logger_1.logger.debug({ metric: { name, value, unit } }, `Metric recorded: ${name}=${value}${unit}`);
};
exports.recordMetric = recordMetric;
const recordDBMetric = (operation, duration, success) => {
    dbOperationDuration.labels(operation, success ? "success" : "failure").observe(duration);
};
exports.recordDBMetric = recordDBMetric;
const recordEndpointMetric = (_endpoint, _statusCode, _duration) => {
    // This is now handled automatically by the main metrics middleware
    // but we keep the function for compatibility.
    // In a future refactor, calls to this could be removed.
    logger_1.logger.debug(`recordEndpointMetric for ${endpoint} is deprecated in favor of automated middleware.`);
};
exports.recordEndpointMetric = recordEndpointMetric;
const recordServiceMetric = (service, operation, duration, success) => {
    serviceOperationDuration.labels(service, operation, success ? "success" : "failure").observe(duration);
};
exports.recordServiceMetric = recordServiceMetric;
