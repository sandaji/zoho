import "dotenv/config"; 
import "reflect-metadata";
import chalk from "chalk";
import boxen from "boxen";
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

      // Developer-friendly boxed banner using `chalk` and `boxen`
      const title = chalk.green.bold("🚀 ERP Backend up and running!");
      const body = `${chalk.magenta.bold("• URL:")} ${chalk.cyan(`http://localhost:${PORT}`)}\n${chalk.magenta.bold("• Health:")} ${chalk.cyan(`http://localhost:${PORT}/health`)}\n`;
      const banner = boxen(`${title}\n\n${body}`, {
        padding: 1,
        margin: 1,
        borderStyle: "round",
        borderColor: "green",
      });

      console.log(banner);
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
