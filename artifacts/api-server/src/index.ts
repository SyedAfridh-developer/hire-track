import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Schedule digest emails — runs daily at 8:00 AM
  import("node-cron").then(({ default: cron }) => {
    import("./services/digest").then(({ runScheduledDigests }) => {
      cron.schedule("0 8 * * *", () => {
        logger.info("Running scheduled digest job");
        runScheduledDigests().catch((err) => logger.error({ err }, "Digest job error"));
      });
      logger.info("Digest scheduler registered (daily at 08:00)");
    });
  });
});
