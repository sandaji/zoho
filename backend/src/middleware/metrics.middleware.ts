/**
 * Metrics Middleware
 * Collects and tracks request/response metrics for observability using Prometheus.
 */

import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../lib/logger";
import { Registry, Counter, Histogram, Gauge } from "prom-client";

// ============================================================================
// PROMETHEUS METRICS DEFINITION
// ============================================================================

export const register = new Registry();

// HTTP Metrics
const httpRequestDurationMicroseconds = new Histogram({
  name: "http_request_duration_ms",
  help: "Duration of HTTP requests in ms",
  labelNames: ["method", "route", "code"],
  buckets: [50, 100, 200, 500, 1000, 2500, 5000], // buckets for response time from 50ms to 5s
});

const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "code"],
});

// Custom Application Metrics
const customMetricGauge = new Gauge({
  name: "app_custom_metric",
  help: "Custom application metric",
  labelNames: ["metric_name", "unit"],
});

const dbOperationDuration = new Histogram({
    name: "db_operation_duration_ms",
    help: "Duration of database operations in ms",
    labelNames: ["operation", "status"],
    buckets: [50, 100, 250, 500, 1000],
});

const serviceOperationDuration = new Histogram({
    name: "service_operation_duration_ms",
    help: "Duration of internal service calls in ms",
    labelNames: ["service", "operation", "status"],
    buckets: [50, 100, 250, 500, 1000],
});

// Register all metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestsTotal);
register.registerMetric(customMetricGauge);
register.registerMetric(dbOperationDuration);
register.registerMetric(serviceOperationDuration);

// ============================================================================
// REQUEST ID TRACKING
// ============================================================================

declare global {
  namespace Express {
    interface Request {
      id: string;
      userId?: string;
      userRole?: string;
      startTime: number;
    }
  }
}

export const requestIdMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  req.id = req.get("x-request-id") || uuidv4();
  req.startTime = Date.now();
  next();
};

// ============================================================================
// METRICS COLLECTION MIDDLEWARE
// ============================================================================

export const metricsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
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
        logger.info({
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

// ============================================================================
// METRICS ENDPOINT
// ============================================================================

export const metricsEndpoint = async (_req: Request, res: Response): Promise<void> => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
};

// ============================================================================
// CUSTOM METRICS TRACKING
// ============================================================================

export const recordMetric = (
  name: string,
  value: number,
  unit: string = "count"
): void => {
  customMetricGauge.labels(name, unit).set(value);
  logger.debug({ metric: { name, value, unit } }, `Metric recorded: ${name}=${value}${unit}`);
};

export const recordDBMetric = (
  operation: string,
  duration: number,
  success: boolean
): void => {
  dbOperationDuration.labels(operation, success ? "success" : "failure").observe(duration);
};

export const recordEndpointMetric = (
  _endpoint: string,
  _statusCode: number,
  _duration: number
): void => {
    // This is now handled automatically by the main metrics middleware
    // but we keep the function for compatibility.
    // In a future refactor, calls to this could be removed.
    logger.debug(`recordEndpointMetric for ${_endpoint} is deprecated in favor of automated middleware.`);
};

export const recordServiceMetric = (
  service: string,
  operation: string,
  duration: number,
  success: boolean
): void => {
  serviceOperationDuration.labels(service, operation, success ? "success" : "failure").observe(duration);
};
