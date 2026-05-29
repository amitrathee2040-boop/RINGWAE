/**
 * Admin dashboard stats.
 * GET /api/admin/dashboard — aggregated stats for the overview panel.
 */
import { Router } from "express";
import { adminAuth } from "../../middlewares/admin-auth.js";
import { rtdbGet } from "../../lib/firebase-admin.js";

const router = Router();

router.get("/", adminAuth, async (_req, res) => {
  const [players, presence, rooms, rooms4, bannedData, adminLogs] = await Promise.all([
    rtdbGet("players"),
    rtdbGet("presence"),
    rtdbGet("rooms"),
    rtdbGet("rooms4"),
    rtdbGet("players"),
    rtdbGet("adminLogs"),
  ]);

  const playerMap = (players ?? {}) as Record<string, Record<string, unknown>>;
  const presenceMap = (presence ?? {}) as Record<string, unknown>;
  const roomsMap = (rooms ?? {}) as Record<string, Record<string, unknown>>;
  const rooms4Map = (rooms4 ?? {}) as Record<string, Record<string, unknown>>;
  const logsMap = (adminLogs ?? {}) as Record<string, Record<string, unknown>>;

  const totalPlayers = Object.keys(playerMap).length;
  const onlinePlayers = Object.keys(presenceMap).length;
  const bannedPlayers = Object.values(playerMap).filter((p) => p?.["banned"]).length;
  const mutedPlayers = Object.values(playerMap).filter((p) => p?.["muted"]).length;

  const liveMatches2p = Object.values(roomsMap).filter(
    (r) => r?.["status"] === "playing"
  ).length;
  const liveMatches4p = Object.values(rooms4Map).filter(
    (r) => r?.["status"] === "playing"
  ).length;

  // Recent log entries (last 20)
  const recentLogs = Object.values(logsMap)
    .sort((a, b) => ((b?.["at"] as number) ?? 0) - ((a?.["at"] as number) ?? 0))
    .slice(0, 20);

  // Top players by wins
  const topPlayers = Object.entries(playerMap)
    .map(([uid, p]) => ({ uid, displayName: p?.["displayName"] as string, wins: (p?.["wins"] as number) ?? 0 }))
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 5);

  res.json({
    totalPlayers,
    onlinePlayers,
    bannedPlayers,
    mutedPlayers,
    liveMatches: liveMatches2p + liveMatches4p,
    liveMatches2p,
    liveMatches4p,
    recentLogs,
    topPlayers,
    serverUptime: Math.floor(process.uptime()),
    timestamp: Date.now(),
  });
});

export default router;
