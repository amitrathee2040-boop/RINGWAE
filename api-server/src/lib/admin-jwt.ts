/**
 * JWT helpers for admin authentication.
 * Sign and verify short-lived tokens used by the admin panel.
 */
import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env["ADMIN_JWT_SECRET"] ?? "change-me-in-production";

export interface AdminPayload {
  username: string;
  role: "superadmin" | "moderator";
  iat: number;
  exp: number;
}

function base64url(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64decode(str: string): string {
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString();
}

/** Sign a JWT token valid for 24 hours. */
export function signAdminToken(username: string, role: "superadmin" | "moderator" = "superadmin"): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(JSON.stringify({ username, role, iat: now, exp: now + 86400 }));
  const sig = createHmac("sha256", SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${sig}`;
}

/** Verify and decode a JWT token. Throws if invalid or expired. */
export function verifyAdminToken(token: string): AdminPayload {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token format");

  const [header, payload, sig] = parts;
  const expectedSig = createHmac("sha256", SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  // Timing-safe comparison
  const sigBuf = Buffer.from(sig, "base64url");
  const expBuf = Buffer.from(expectedSig, "base64url");
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    throw new Error("Invalid token signature");
  }

  const decoded = JSON.parse(b64decode(payload)) as AdminPayload;
  if (decoded.exp < Math.floor(Date.now() / 1000)) throw new Error("Token expired");
  return decoded;
}

/** Timing-safe credential comparison. */
export function checkCredentials(inputUsername: string, inputPassword: string): boolean {
  const adminUsername = process.env["ADMIN_USERNAME"] ?? "";
  const adminPassword = process.env["ADMIN_PASSWORD"] ?? "";
  if (!adminUsername || !adminPassword) return false;

  const uMatch = timingSafeEqual(Buffer.from(inputUsername), Buffer.from(adminUsername));
  const pMatch = timingSafeEqual(Buffer.from(inputPassword), Buffer.from(adminPassword));
  return uMatch && pMatch;
}
