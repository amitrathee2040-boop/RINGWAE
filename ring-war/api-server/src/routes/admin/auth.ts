/**
 * Admin authentication routes.
 * POST /api/admin/auth/login  — validate credentials, return JWT
 * POST /api/admin/auth/logout — client clears token; server logs it
 */
import { Router } from "express";
import { checkCredentials, signAdminToken } from "../../lib/admin-jwt.js";
import { adminAuth } from "../../middlewares/admin-auth.js";
import { rtdbPush } from "../../lib/firebase-admin.js";

const router = Router();

// Simple in-memory rate limiter (resets on restart — good enough for admin panel)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 10; // max 10 attempts per minute
}

router.post("/login", async (req, res) => {
  const ip = req.ip ?? "unknown";
  if (isRateLimited(ip)) {
    res.status(429).json({ error: "Too many login attempts. Try again in a minute." });
    return;
  }

  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  if (!checkCredentials(username, password)) {
    // Log failed attempt
    await rtdbPush("adminLogs", {
      type: "auth_fail",
      username,
      ip,
      at: Date.now(),
    });
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signAdminToken(username, "superadmin");

  await rtdbPush("adminLogs", {
    type: "login",
    username,
    ip,
    at: Date.now(),
  });

  res.json({ token, username, role: "superadmin" });
});

router.post("/logout", adminAuth, async (req, res) => {
  await rtdbPush("adminLogs", {
    type: "logout",
    username: req.admin?.username,
    at: Date.now(),
  });
  res.json({ ok: true });
});

export default router;
