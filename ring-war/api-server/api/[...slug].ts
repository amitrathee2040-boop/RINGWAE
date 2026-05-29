import type { IncomingMessage, ServerResponse } from "node:http";
import app from "../src/app.js";

// Vercel catch-all serverless function. Routes ALL paths (including
// /api/admin/auth/login) to the Express app while preserving req.url.
export default function handler(req: IncomingMessage, res: ServerResponse) {
  return (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
