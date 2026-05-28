import type { IncomingMessage, ServerResponse } from "node:http";
import app from "../src/app";

// Vercel Node.js Serverless Function wrapper for the Express app.
// Express app instances are valid (req, res) handlers, so we re-export it.
export default function handler(req: IncomingMessage, res: ServerResponse) {
  return (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
