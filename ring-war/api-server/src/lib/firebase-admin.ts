/**
 * Firebase Admin SDK initializer.
 * Set FIREBASE_SERVICE_ACCOUNT (JSON string) and FIREBASE_DATABASE_URL
 * env vars to enable server-side Firebase operations.
 */
import { logger } from "./logger.js";

// Lazy import firebase-admin so the server starts even if it's not installed
let _db: unknown = null;
let _initialized = false;

async function init() {
  if (_initialized) return;
  _initialized = true;

  const serviceAccountStr = process.env["FIREBASE_SERVICE_ACCOUNT"];
  const databaseURL =
    process.env["FIREBASE_DATABASE_URL"] ??
    process.env["VITE_FIREBASE_DATABASE_URL"];

  if (!serviceAccountStr || !databaseURL) {
    logger.warn("Firebase Admin not configured — FIREBASE_SERVICE_ACCOUNT or FIREBASE_DATABASE_URL missing");
    return;
  }

  try {
    const admin = (await import("firebase-admin")).default;
    if (!admin.apps.length) {
      const serviceAccount = JSON.parse(serviceAccountStr) as object;
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL,
      });
    }
    _db = admin.database();
    logger.info("Firebase Admin SDK initialized");
  } catch (err) {
    logger.error({ err }, "Failed to initialize Firebase Admin SDK");
  }
}

// Initialize on module load
await init();

/** Firebase Admin Database reference, or null if not configured. */
export function getDb() {
  return _db as import("firebase-admin/database").Database | null;
}

/** Read a path from RTDB. Returns null if Firebase is not configured or path doesn't exist. */
export async function rtdbGet(path: string): Promise<unknown> {
  const db = getDb();
  if (!db) return null;
  const snap = await db.ref(path).get();
  return snap.exists() ? snap.val() : null;
}

/** Write a value to RTDB. No-op if Firebase is not configured. */
export async function rtdbSet(path: string, value: unknown): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.ref(path).set(value);
}

/** Update a path in RTDB. No-op if Firebase is not configured. */
export async function rtdbUpdate(path: string, value: Record<string, unknown>): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.ref(path).update(value);
}

/** Remove a path from RTDB. No-op if Firebase is not configured. */
export async function rtdbRemove(path: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.ref(path).remove();
}

/** Push a new child to an RTDB list. Returns the generated key. */
export async function rtdbPush(path: string, value: unknown): Promise<string | null> {
  const db = getDb();
  if (!db) return null;
  const ref = await db.ref(path).push(value);
  return ref.key;
}
