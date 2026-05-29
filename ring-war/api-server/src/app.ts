import express, { type Express, type Request, type Response, type NextFunction } from "express";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const app: Express = express();

// ---- CORS ------------------------------------------------------------------
// Allowed origins for the admin panel. Add preview/staging origins here.
const allowedOrigins = new Set<string>([
  "https://ringwae-admin.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
]);
// Also allow any Vercel preview deployment of the admin app:
//   https://ringwae-admin-<hash>-<scope>.vercel.app
const allowedOriginPatterns: RegExp[] = [
  /^https:\/\/ringwae-admin(-[a-z0-9-]+)?\.vercel\.app$/i,
];

function resolveAllowedOrigin(origin: string | undefined): string {
  if (!origin) return "https://ringwae-admin.vercel.app";
  if (allowedOrigins.has(origin)) return origin;
  if (allowedOriginPatterns.some((re) => re.test(origin))) return origin;
  return "https://ringwae-admin.vercel.app";
}

function applyCors(req: Request, res: Response) {
  const allow = resolveAllowedOrigin(req.headers.origin);
  res.setHeader("Access-Control-Allow-Origin", allow);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    req.headers["access-control-request-headers"] ||
      "Content-Type, Authorization, X-Requested-With, Accept, Origin",
  );
  res.setHeader("Access-Control-Max-Age", "86400");
}

// Apply CORS headers to EVERY response, including errors and 404s.
app.use((req: Request, res: Response, next: NextFunction) => {
  applyCors(req, res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

// Belt-and-suspenders: explicit preflight handler for all routes.
app.options(/.*/, (req: Request, res: Response) => {
  applyCors(req, res);
  res.status(204).end();
});

// ---- Body parsing ----------------------------------------------------------
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Lightweight request logger (avoid pino-http worker thread issues on serverless)
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info({ method: req.method, url: req.url.split("?")[0] }, "request");
  next();
});

// ---- Routes ----------------------------------------------------------------
app.use("/api", router);

// Top-level health for platform probes
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.get("/", (_req, res) => res.json({ status: "ok", service: "ring-war-api" }));

// 404 (CORS headers were already set by the first middleware)
app.use((req: Request, res: Response) => {
  applyCors(req, res);
  res.status(404).json({ error: "Not found", path: req.url });
});

// Error handler — MUST re-apply CORS headers, since a thrown error
// during route handling can occur after the response headers list is mutated.
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err: err.message, stack: err.stack }, "Unhandled error");
  applyCors(req, res);
  if (res.headersSent) return;
  res.status(500).json({ error: "Internal server error" });
});

export default app;
