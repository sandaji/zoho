import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import { logger } from "./lib/logger";
import { prisma } from "./lib/db";
import { AppError } from "./lib/errors";
import routes from "./routes/index";

import {
  requestIdMiddleware,
  metricsMiddleware,
  metricsEndpoint,
} from "./middleware/metrics.middleware";
import { sanitizeInputs } from "./middleware/validation.middleware";
import { globalLimiter } from "./middleware/rate-limit.middleware";
import { contextMiddleware } from "./middleware/context.middleware";

export async function createApp(): Promise<Express> {
  const app = express();

  // 1. GLOBAL MIDDLEWARE
  app.use(
    cors({
     origin: ["http://localhost:3000", "http://127.0.0.1:3000"], 
    credentials: true,
    })
  );

  // Core observability middleware
  app.use(requestIdMiddleware);
  app.use(metricsMiddleware);
  app.use(contextMiddleware);

  // Body parsers and security
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(sanitizeInputs);
  app.use(globalLimiter);

  // 2. DATABASE CONNECTION CHECK
  try {
    // FIX: Use queryRawUnsafe for simple checks (avoids template literal issues)
    await prisma.$queryRawUnsafe("SELECT 1");
    logger.info("✅ Database connected successfully (Prisma 7 + PgAdapter)");
  } catch (error: unknown) {
    logger.error({ err: error }, "❌ Database connection failed");
    // In dev, we might want to fail fast. In prod, maybe let it retry.
    if (process.env.NODE_ENV === "production") process.exit(1);
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

  app.get("/metrics", metricsEndpoint);

  // 4. API ROUTES
  app.use("/v1", routes);

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
  app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
    // Log the error with context
    logger.error({ err: error, path: req.path }, "Unhandled Exception");

    if (error instanceof AppError) {
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
