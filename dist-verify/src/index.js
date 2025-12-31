"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
require("reflect-metadata");
const logger_1 = require("./lib/logger");
const app_1 = require("./app");
const PORT = parseInt(process.env.PORT || "5000", 10);
const NODE_ENV = process.env.NODE_ENV || "development";
async function bootstrap() {
    try {
        logger_1.logger.info("🚀 Starting ERP Backend Server...");
        logger_1.logger.info(`📝 Environment: ${NODE_ENV}`);
        const app = await (0, app_1.createApp)();
        const server = app.listen(PORT, () => {
            logger_1.logger.info(`✅ Server running on http://localhost:${PORT}`);
            logger_1.logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
        });
        const shutdown = () => {
            logger_1.logger.info("\n🛑 Shutting down gracefully...");
            server.close(() => {
                logger_1.logger.info("🔒 Server closed");
                process.exit(0);
            });
        };
        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);
    }
    catch (error) {
        logger_1.logger.fatal(error, "❌ Failed to start server");
        process.exit(1);
    }
}
bootstrap();
