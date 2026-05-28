import type { IncomingMessage, ServerResponse } from "node:http";
import app from "../src/app.js";

// Vercel Node.js Serverless Function entrypoint.
// Express app is a (req, res) handler — forward the invocation directly.
export default function handler(req: IncomingMessage, res: ServerResponse) {
  return (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
