import app from "./app";
import { logger } from "./lib/logger";
import { cleanupStaleRooms } from "./routes/admin/matches.js";

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
(app.listen as any)(port, (err: any) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Run stale-room cleanup once on startup, then every hour
  const runCleanup = () =>
    cleanupStaleRooms().catch((e: unknown) =>
      logger.error({ err: e }, "Stale room cleanup failed")
    );

  runCleanup();
  setInterval(runCleanup, 60 * 1000); // every 1 minute
});
