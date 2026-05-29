import app from "./app.js";
import { logger } from "./lib/logger.js";

// Local/standalone server entry. On Vercel, api/index.ts is the entrypoint
// and this file is NOT executed. PORT defaults to 3000 for local dev.
const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  logger.info({ port }, "Server listening");
});
