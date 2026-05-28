/**
 * Player management routes.
 * GET    /api/admin/players          — list/search players
 * GET    /api/admin/players/:uid     — get player details
 * PATCH  /api/admin/players/:uid/ban — ban or unban
 * PATCH  /api/admin/players/:uid/mute — mute or unmute
 * DELETE /api/admin/players/:uid     — delete player account
 */
import { Router } from "express";
import { adminAuth } from "../../middlewares/admin-auth.js";
import { rtdbGet, rtdbUpdate, rtdbRemove, rtdbPush } from "../../lib/firebase-admin.js";

const router = Router();

/** Log an admin action to the audit trail. */
async function log(action: string, admin: string, target: string, details?: string) {
  await rtdbPush("adminLogs", { type: action, admin, target, details: details ?? "", at: Date.now() });
}

// GET /api/admin/players
router.get("/", adminAuth, async (req, res) => {
  const search = (req.query["search"] as string ?? "").toLowerCase();
  const page = Math.max(1, parseInt(req.query["page"] as string ?? "1", 10));
  const limit = Math.min(50, parseInt(req.query["limit"] as string ?? "20", 10));

  const raw = await rtdbGet("players");
  const playerMap = (raw ?? {}) as Record<string, Record<string, unknown>>;

  let players = Object.entries(playerMap).map(([uid, p]) => ({ uid, ...p }));

  if (search) {
    players = players.filter((p) =>
      ((p["displayName"] as string) ?? "").toLowerCase().includes(search) ||
      p.uid.toLowerCase().includes(search)
    );
  }

  // Sort by createdAt desc (newest first)
  players.sort((a, b) => ((b["createdAt"] as number) ?? 0) - ((a["createdAt"] as number) ?? 0));

  const total = players.length;
  const paginated = players.slice((page - 1) * limit, page * limit);

  res.json({ players: paginated, total, page, limit, pages: Math.ceil(total / limit) });
});

// GET /api/admin/players/:uid
router.get("/:uid", adminAuth, async (req, res) => {
  const data = await rtdbGet(`players/${req.params["uid"]}`);
  if (!data) { res.status(404).json({ error: "Player not found" }); return; }
  res.json({ uid: req.params["uid"], ...(data as object) });
});

// PATCH /api/admin/players/:uid/ban
router.patch("/:uid/ban", adminAuth, async (req, res) => {
  const { uid } = req.params;
  const { banned, reason } = req.body as { banned: boolean; reason?: string };
  await rtdbUpdate(`players/${uid}`, {
    banned: banned ?? true,
    bannedAt: banned ? Date.now() : null,
    banReason: reason ?? "",
  });
  await log(banned ? "ban" : "unban", req.admin!.username, uid, reason);
  res.json({ ok: true, uid, banned });
});

// PATCH /api/admin/players/:uid/mute
router.patch("/:uid/mute", adminAuth, async (req, res) => {
  const { uid } = req.params;
  const { muted } = req.body as { muted: boolean };
  await rtdbUpdate(`players/${uid}`, { muted: muted ?? true, mutedAt: muted ? Date.now() : null });
  await log(muted ? "mute" : "unmute", req.admin!.username, uid);
  res.json({ ok: true, uid, muted });
});

// DELETE /api/admin/players/:uid
router.delete("/:uid", adminAuth, async (req, res) => {
  const { uid } = req.params;
  await rtdbRemove(`players/${uid}`);
  await log("delete_player", req.admin!.username, uid);
  res.json({ ok: true, uid });
});

export default router;
