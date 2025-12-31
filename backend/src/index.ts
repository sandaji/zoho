import "dotenv/config"; 
import "reflect-metadata";
import { logger } from "./lib/logger";
import { createApp } from "./app";

const PORT = parseInt(process.env.PORT || "5000", 10);
const NODE_ENV = process.env.NODE_ENV || "development";

async function bootstrap(): Promise<void> {
  try {
    logger.info("🚀 Starting ERP Backend Server...");
    logger.info(`📝 Environment: ${NODE_ENV}`);

    const app = await createApp();

    const server = app.listen(PORT, () => {
      logger.info(`✅ Server running on http://localhost:${PORT}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
    });

    const shutdown = () => {
      logger.info("\n🛑 Shutting down gracefully...");
      server.close(() => {
        logger.info("🔒 Server closed");
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    logger.fatal(error, "❌ Failed to start server");
    process.exit(1);
  }
}

bootstrap();
