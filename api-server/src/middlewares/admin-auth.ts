/**
 * Express middleware that validates the admin JWT from the Authorization header.
 * Attaches the decoded payload to req.admin.
 */
import { Request, Response, NextFunction } from "express";
import { verifyAdminToken, type AdminPayload } from "../lib/admin-jwt.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AdminPayload;
    }
  }
}

export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers["authorization"];
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized — missing token" });
    return;
  }
  try {
    req.admin = verifyAdminToken(auth.slice(7));
    next();
  } catch (err) {
    res.status(401).json({ error: "Unauthorized — invalid or expired token" });
  }
}
