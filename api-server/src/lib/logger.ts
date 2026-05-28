import pino from "pino";

// Serverless-safe logger: no transports (worker_threads unavailable on Vercel
// serverless functions). Writes structured JSON to stdout.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
});
