/**
 * Match control routes.
 * GET    /api/admin/matches          — list live + recent matches
 * DELETE /api/admin/matches/:code    — forcefully end a 2P match
 * DELETE /api/admin/matches4/:code   — forcefully end a 4P match
 * POST   /api/admin/matches/cleanup  — delete stale rooms (>2h no moves)
 */
import { Router } from "express";
import { adminAuth } from "../../middlewares/admin-auth.js";
import { rtdbGet, rtdbUpdate, rtdbPush, rtdbRemove } from "../../lib/firebase-admin.js";
import { logger } from "../../lib/logger.js";

const STALE_MS = 2 * 60 * 60 * 1000; // 2 hours

const router = Router();

async function log(action: string, admin: string, target: string, details?: string) {
  await rtdbPush("adminLogs", { type: action, admin, target, details: details ?? "", at: Date.now() });
}

/** Delete rooms/rooms4 where lastMoveAt (or createdAt) is older than STALE_MS. */
export async function cleanupStaleRooms(): Promise<{ deleted2p: number; deleted4p: number }> {
  const now = Date.now();
  const [rooms, rooms4] = await Promise.all([rtdbGet("rooms"), rtdbGet("rooms4")]);

  const staleKeys2p: string[] = [];
  const staleKeys4p: string[] = [];

  for (const [code, r] of Object.entries((rooms ?? {}) as Record<string, Record<string, unknown>>)) {
    const last = (r["lastMoveAt"] ?? r["createdAt"] ?? 0) as number;
    if (now - last > STALE_MS) staleKeys2p.push(code);
  }
  for (const [code, r] of Object.entries((rooms4 ?? {}) as Record<string, Record<string, unknown>>)) {
    const last = (r["lastMoveAt"] ?? r["createdAt"] ?? 0) as number;
    if (now - last > STALE_MS) staleKeys4p.push(code);
  }

  await Promise.all([
    ...staleKeys2p.map(code => rtdbRemove(`rooms/${code}`)),
    ...staleKeys4p.map(code => rtdbRemove(`rooms4/${code}`)),
  ]);

  if (staleKeys2p.length || staleKeys4p.length) {
    logger.info({ deleted2p: staleKeys2p.length, deleted4p: staleKeys4p.length }, "Stale rooms cleaned up");
  }
  return { deleted2p: staleKeys2p.length, deleted4p: staleKeys4p.length };
}

// POST /api/admin/matches/cleanup — manual trigger
router.post("/cleanup", adminAuth, async (req, res) => {
  const result = await cleanupStaleRooms();
  await log("cleanup_stale_rooms", req.admin!.username, "rooms", `Deleted ${result.deleted2p} 2P + ${result.deleted4p} 4P stale rooms`);
  res.json({ ok: true, ...result });
});

// GET /api/admin/matches
router.get("/", adminAuth, async (_req, res) => {
  const [rooms, rooms4] = await Promise.all([rtdbGet("rooms"), rtdbGet("rooms4")]);

  const roomsMap = (rooms ?? {}) as Record<string, Record<string, unknown>>;
  const rooms4Map = (rooms4 ?? {}) as Record<string, Record<string, unknown>>;

  const matches2p = Object.entries(roomsMap).map(([code, r]) => ({
    code,
    type: "2p",
    status: r["status"],
    players: r["players"],
    createdAt: r["createdAt"],
    lastMoveAt: r["lastMoveAt"],
  }));

  const matches4p = Object.entries(rooms4Map).map(([code, r]) => ({
    code,
    type: "4p",
    status: r["status"],
    players: r["players"],
    createdAt: r["createdAt"],
    lastMoveAt: r["lastMoveAt"],
  }));

  const all = [...matches2p, ...matches4p].sort(
    (a, b) => ((b.lastMoveAt as number) ?? 0) - ((a.lastMoveAt as number) ?? 0)
  );

  res.json({
    matches: all,
    live2p: matches2p.filter((m) => m.status === "playing").length,
    live4p: matches4p.filter((m) => m.status === "playing").length,
  });
});

// DELETE /api/admin/matches/:code — end 2P match
router.delete("/:code", adminAuth, async (req, res) => {
  const { code } = req.params;
  await rtdbUpdate(`rooms/${code}`, {
    status: "finished",
    endedByAdmin: true,
    adminEndedAt: Date.now(),
  });
  await log("end_match_2p", req.admin!.username, code);
  res.json({ ok: true, code });
});

// DELETE /api/admin/matches4/:code — end 4P match
router.delete("/4p/:code", adminAuth, async (req, res) => {
  const { code } = req.params;
  await rtdbUpdate(`rooms4/${code}`, {
    status: "finished",
    endedByAdmin: true,
    adminEndedAt: Date.now(),
  });
  await log("end_match_4p", req.admin!.username, code);
  res.json({ ok: true, code });
});

export default router;
