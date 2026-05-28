import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const app: Express = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Lightweight request logger (avoid pino-http worker thread issues on serverless)
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info({ method: req.method, url: req.url.split("?")[0] }, "request");
  next();
});

app.use("/api", router);

// Top-level health for platform probes
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err: err.message, stack: err.stack }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
});

export default app;
